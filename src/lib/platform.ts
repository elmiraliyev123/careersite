import { unstable_noStore as noStore } from "next/cache";

import { type Company, type Job } from "@/data/platform";
import { revalidatePublishedJobApplyUrls } from "@/lib/job-pipeline";
import {
  getAllLocalizedTextValues,
  getAllLocalizedTextValuesFromList,
  localizedTextIncludes
} from "@/lib/localized-content";
import { formatLocalizedDate } from "@/lib/i18n";
import {
  findCompanyBySlug,
  findJobBySlug,
  hasPublicJobForCompany,
  listCompanies,
  listJobs
} from "@/lib/platform-database";
import { matchesExpandedQuery } from "@/lib/search-normalization";

type JobFilters = {
  query?: string;
  city?: string;
  level?: string;
  workModel?: string;
};

const youthLevels = new Set<Job["level"]>(["Təcrübə", "Junior", "Trainee", "Yeni məzun"]);
const strictInternshipLevels = new Set<Job["level"]>(["Təcrübə", "Trainee", "Yeni məzun"]);
const youthFriendlyCompanySlugs = new Set([
  "kapital-bank",
  "abb",
  "accessbank",
  "unibank",
  "pasha-bank",
  "azercell",
  "bakcell",
  "bravo-supermarket",
  "araz-supermarket",
  "baku-electronics",
  "veys-loglu-group",
  "azersun-holding",
  "deloitte-azerbaijan",
  "ey-azerbaijan",
  "kpmg-azerbaijan",
  "pwc-azerbaijan",
  "bp-azerbaijan",
  "bank-of-baku",
  "yelo-bank"
]);
const earlyCareerSignalPatterns = [
  /\bintern(?:ship)?\b/i,
  /\btrainee\b/i,
  /\bstaj\b/i,
  /\btəcrübə(?:çi)?\b/i,
  /\byeni\s+məzun\b/i,
  /\bnew grad(?:uate)?\b/i,
  /\bgraduate (?:program|scheme)\b/i,
  /\baccelerator program\b/i,
  /\bentry[-\s]?level\b/i,
  /\bjunior\b/i,
  /\bkiçik\s+mütəxəssis\b/i,
  /\bмладш/i,
  /\bстаж(?:ер|ировка)?\b/i
];
const azerbaijanCitySet = new Set([
  "Bakı",
  "Gəncə",
  "Sumqayıt",
  "Mingəçevir",
  "Lənkəran",
  "Şəki",
  "Qəbələ",
  "Quba",
  "Xaçmaz",
  "Şəmkir",
  "Zaqatala",
  "Masallı",
  "Salyan",
  "Cəlilabad",
  "Sabirabad",
  "Bərdə",
  "Şamaxı",
  "İmişli",
  "Binəqədi",
  "Sədərək",
  "Azərbaycan"
]);

function stripSalary(job: Job): Job {
  const { salary: _salary, ...rest } = job;
  return rest;
}

function getCompanyRoleCountIndex(jobs: Job[]) {
  return jobs.reduce<Map<string, number>>((index, job) => {
    index.set(job.companySlug, (index.get(job.companySlug) ?? 0) + 1);
    return index;
  }, new Map<string, number>());
}

function getEffectiveCompanyVerification(company: Company, jobs: Job[]) {
  if (company.verified !== false) {
    return true;
  }

  return jobs.some(
    (job) =>
      job.companySlug === company.slug &&
      job.officialSource === true &&
      job.validationStatus === "verified" &&
      Boolean(job.finalVerifiedUrl)
  );
}

function buildYouthSignalHaystack(job: Job, company?: Company | null) {
  return [
    getAllLocalizedTextValues(job.title).join(" "),
    getAllLocalizedTextValues(job.summary).join(" "),
    getAllLocalizedTextValues(job.category).join(" "),
    getAllLocalizedTextValuesFromList(job.tags).join(" "),
    job.companyName ?? "",
    company?.name ?? "",
    company?.sector ?? "",
    job.sourceName ?? ""
  ].join(" ");
}

function hasStrongEarlyCareerSignal(job: Job, company?: Company | null) {
  const haystack = buildYouthSignalHaystack(job, company);
  return earlyCareerSignalPatterns.some((pattern) => pattern.test(haystack));
}

function isAzerbaijanRelevantCity(city: string) {
  return azerbaijanCitySet.has(city);
}

function normalizeCityForFilter(city: string) {
  const trimmed = city.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();
  if (["baku", "bakı", "bakı şəhəri", "baki", "az"].includes(lowered)) {
    return "Bakı";
  }

  return trimmed;
}

function sortByNewestDate<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
}

function sortJobsByFreshness(items: Job[]) {
  const freshnessRank: Record<string, number> = {
    hot: 5,
    fresh: 4,
    aging: 3,
    stale: 2,
    expired: 1
  };

  return [...items].sort((left, right) => {
    const rightFreshness = freshnessRank[right.freshnessStatus ?? "aging"] ?? 0;
    const leftFreshness = freshnessRank[left.freshnessStatus ?? "aging"] ?? 0;

    if (rightFreshness !== leftFreshness) {
      return rightFreshness - leftFreshness;
    }

    const rightBaku =
      Number(Boolean(right.trustBadges?.includes("baku_relevant"))) + (right.city === "Bakı" ? 1 : 0);
    const leftBaku =
      Number(Boolean(left.trustBadges?.includes("baku_relevant"))) + (left.city === "Bakı" ? 1 : 0);

    if (rightBaku !== leftBaku) {
      return rightBaku - leftBaku;
    }

    const trustComparison = (right.trustScore ?? 0) - (left.trustScore ?? 0);
    if (trustComparison !== 0) {
      return trustComparison;
    }

    const postedComparison = right.postedAt.localeCompare(left.postedAt);

    if (postedComparison !== 0) {
      return postedComparison;
    }

    return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
  });
}

function filterPublicCompanies(companies: Company[], jobs: Job[]) {
  const activeCompanySlugs = new Set(jobs.map((job) => job.companySlug));
  return companies.filter((company) => activeCompanySlugs.has(company.slug));
}

function hydrateCompanyVerification(companies: Company[], jobs: Job[]) {
  return companies.map((company) => ({
    ...company,
    verified: getEffectiveCompanyVerification(company, jobs)
  }));
}

function getPlatformData() {
  noStore();
  void revalidatePublishedJobApplyUrls().catch(() => null);

  const jobs = sortJobsByFreshness(listJobs().map(stripSalary));
  const companies = hydrateCompanyVerification(filterPublicCompanies(listCompanies(), jobs), jobs);

  return {
    companies: sortByNewestDate(companies).sort((left, right) => {
      if (left.featured === right.featured) {
        return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
      }

      return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
    }),
    jobs
  };
}

function getPlatformAdminData() {
  noStore();
  void revalidatePublishedJobApplyUrls().catch(() => null);

  return {
    companies: sortByNewestDate(listCompanies()).sort((left, right) => {
      if (left.featured === right.featured) {
        return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
      }

      return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
    }),
    jobs: sortJobsByFreshness(listJobs({ includeUnpublished: true }).map(stripSalary))
  };
}

export function isYouthRole(job: Job) {
  if (!youthLevels.has(job.level)) {
    return false;
  }

  const company = getCompanyBySlug(job.companySlug);
  const hasSignal = hasStrongEarlyCareerSignal(job, company);
  const confidence = Math.max(0, Math.min(job.internshipConfidence ?? 0, 1));
  const youthPoolBoost = company && youthFriendlyCompanySlugs.has(company.slug) ? 0.08 : 0;
  const combinedConfidence = confidence + youthPoolBoost;

  if (strictInternshipLevels.has(job.level)) {
    return hasSignal && combinedConfidence >= 0.38;
  }

  return hasSignal && combinedConfidence >= 0.26;
}

export function getCompanies(): Company[] {
  return getPlatformData().companies;
}

export function getFeaturedCompanies(): Company[] {
  const jobs = getJobs();
  const companies = getCompanies();
  const roleCounts = getCompanyRoleCountIndex(jobs);

  return companies
    .filter((company) => getEffectiveCompanyVerification(company, jobs))
    .sort((left, right) => {
      const rightRoles = roleCounts.get(right.slug) ?? 0;
      const leftRoles = roleCounts.get(left.slug) ?? 0;

      if (rightRoles !== leftRoles) {
        return rightRoles - leftRoles;
      }

      if (Boolean(right.featured) !== Boolean(left.featured)) {
        return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
      }

      return (right.updatedAt ?? right.createdAt ?? "").localeCompare(left.updatedAt ?? left.createdAt ?? "");
    })
    .slice(0, 12);
}

export function getCompanyBySlug(slug: string): Company | undefined {
  noStore();
  const company = findCompanyBySlug(slug);

  if (!company) {
    return undefined;
  }

  if (!hasPublicJobForCompany(slug)) {
    return undefined;
  }

  return {
    ...company,
    verified: getEffectiveCompanyVerification(company, getJobs().filter((job) => job.companySlug === slug))
  };
}

export function getJobs(): Job[] {
  return getPlatformData().jobs;
}

export function getAllJobs(): Job[] {
  return getPlatformAdminData().jobs;
}

export function getFeaturedListings(): Job[] {
  return getJobs()
    .filter((job) => isYouthRole(job))
    .slice(0, 8);
}

export function getFeaturedJobs(): Job[] {
  return getFeaturedListings();
}

export function getJobBySlug(slug: string): Job | undefined {
  noStore();
  const job = findJobBySlug(slug);
  return job ? stripSalary(job) : undefined;
}

export function getAnyJobBySlug(slug: string): Job | undefined {
  noStore();
  const job = findJobBySlug(slug, { includeUnpublished: true });
  return job ? stripSalary(job) : undefined;
}

export function getCompanyJobs(companySlug: string): Job[] {
  return getJobs().filter((job) => job.companySlug === companySlug);
}

export function getCompanyOpenRoleCount(companySlug: string): number {
  return getCompanyJobs(companySlug).length;
}

export function getCompanyCategories() {
  const categoryMap = new Map<string, number>();

  for (const company of getCompanies()) {
    categoryMap.set(company.sector, (categoryMap.get(company.sector) ?? 0) + 1);
  }

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name);
    });
}

export function filterJobs(filters: JobFilters): Job[] {
  const query = filters.query?.trim().toLowerCase();

  return getJobs().filter((job) => {
    const company = getCompanyBySlug(job.companySlug);
    const queryDocument = [
      getAllLocalizedTextValues(job.title).join(" "),
      getAllLocalizedTextValues(job.summary).join(" "),
      getAllLocalizedTextValues(job.category).join(" "),
      getAllLocalizedTextValuesFromList(job.tags).join(" "),
      company?.name ?? "",
      company?.sector ?? "",
      job.sourceName ?? "",
      job.companyName ?? ""
    ].join(" ");

    const matchesQuery =
      !query ||
      localizedTextIncludes(job.title, query) ||
      localizedTextIncludes(job.summary, query) ||
      localizedTextIncludes(job.category, query) ||
      matchesExpandedQuery(queryDocument, query);

    const matchesCity = !filters.city || filters.city === "Hamısı" || job.city === filters.city;
    const matchesLevel = !filters.level || filters.level === "Hamısı" || job.level === filters.level;
    const matchesWorkModel =
      !filters.workModel ||
      filters.workModel === "Hamısı" ||
      job.workModel === filters.workModel;

    return matchesQuery && matchesCity && matchesLevel && matchesWorkModel;
  });
}

export function getRecommendedJobs(currentJob: Job): Job[] {
  const comparableCategories = new Set(getAllLocalizedTextValues(currentJob.category));

  return getJobs()
    .filter(
      (job) =>
        job.slug !== currentJob.slug &&
        (job.level === currentJob.level ||
          getAllLocalizedTextValues(job.category).some((category) => comparableCategories.has(category)))
    )
    .slice(0, 3);
}

export function getHomeStats() {
  const allJobs = getJobs();
  const allCompanies = getCompanies();
  const internshipRoles = allJobs.filter((job) => strictInternshipLevels.has(job.level) && isYouthRole(job)).length;
  const traineeRoles = allJobs.filter((job) => job.level === "Trainee" && isYouthRole(job)).length;
  const remoteFriendly = allJobs.filter((job) => job.workModel === "Uzaqdan").length;

  return {
    totalJobs: allJobs.length,
    internshipRoles,
    traineeRoles,
    remoteFriendly,
    partnerCompanies: allCompanies.length
  };
}

export function getAvailableCities() {
  const liveCities = getJobs()
    .map((job) => normalizeCityForFilter(job.city))
    .filter((city): city is string => Boolean(city))
    .filter((city) => isAzerbaijanRelevantCity(city));

  const ordered = Array.from(new Set(liveCities)).sort((left, right) => {
    if (left === "Bakı") {
      return -1;
    }

    if (right === "Bakı") {
      return 1;
    }

    return left.localeCompare(right, "az");
  });

  return ["Hamısı", ...ordered];
}

export function getHeroCities() {
  return getAvailableCities().filter((city) => city !== "Hamısı").slice(0, 4);
}

export function formatAzerbaijaniDate(value: string) {
  return formatLocalizedDate(value, "az");
}
