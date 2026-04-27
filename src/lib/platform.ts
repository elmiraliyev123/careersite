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
import {
  getMeaningfulMetadataValue,
  isAllFilterValue,
  normalizeLocationName,
  normalizeRoleLevel
} from "@/lib/ui-display";

type JobFilters = {
  query?: string;
  city?: string;
  level?: string;
  workModel?: string;
};

const youthLevels = new Set<Job["level"]>([
  "internship",
  "trainee",
  "junior",
  "entry_level",
  "new_graduate"
]);
const strictInternshipLevels = new Set<Job["level"]>(["internship", "trainee", "new_graduate"]);
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
const earlyCareerExclusionPatterns = [
  /\b(?:senior|lead|principal|head of|director)\b/i,
  /\b(?:manager|menecer|rəhbər|rehber)\b/i,
  /\bjunior\b.{0,80}\bmentor/i,
  /\bmentor(?:luq|ing)?\b.{0,80}\bjunior\b/i,
  /\bcode review\b/i
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
  void company;

  return [
    getAllLocalizedTextValues(job.title).join(" "),
    getAllLocalizedTextValues(job.summary).join(" "),
    job.responsibilities.join(" "),
    job.requirements.join(" "),
    job.benefits.join(" ")
  ].join(" ");
}

function hasStrongEarlyCareerSignal(job: Job, company?: Company | null) {
  const haystack = buildYouthSignalHaystack(job, company);
  if (earlyCareerExclusionPatterns.some((pattern) => pattern.test(haystack))) {
    return false;
  }

  return earlyCareerSignalPatterns.some((pattern) => pattern.test(haystack));
}

function isAzerbaijanRelevantCity(city: string) {
  return azerbaijanCitySet.has(city);
}

function normalizeCityForFilter(city: string) {
  return normalizeLocationName(city);
}

function isPublicJobForAzerbaijan(job: Job) {
  const normalizedCity = normalizeCityForFilter(job.city);

  if (normalizedCity && isAzerbaijanRelevantCity(normalizedCity)) {
    return true;
  }

  return (
    job.workModel === "Uzaqdan" &&
    (job.trustBadges?.includes("azerbaijan_relevant") ||
      job.trustBadges?.includes("baku_relevant") ||
      /(?:\.az\b|azerbaijan|azərbaycan|baku|bakı)/i.test(
        [job.sourceUrl, job.sourceListingUrl, job.jobDetailUrl, job.sourceName, job.companyName]
          .filter(Boolean)
          .join(" ")
      ))
  );
}

function normalizeDomainIdentity(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const hostname = url.hostname
      .replace(/^www\./, "")
      .replace(/^careers?\./, "")
      .replace(/^jobs?\./, "")
      .replace(/^job-boards?\./, "")
      .replace(/^boards?\./, "")
      .replace(/^api\./, "")
      .toLowerCase();

    const atsDomains = [
      "greenhouse.io",
      "lever.co",
      "myworkdayjobs.com",
      "smartrecruiters.com",
      "recruitee.com",
      "jobvite.com",
      "glorri.com",
      "glorri.az",
      "careers-page.com"
    ];

    if (atsDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return null;
    }

    return hostname.includes(".") ? hostname : null;
  } catch {
    return null;
  }
}

function normalizeCompanyNameIdentity(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\b(llc|ltd|inc|plc|company|group|holdings?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCompanyCanonicalKey(company: Company) {
  return (
    normalizeDomainIdentity(company.companyDomain) ??
    normalizeDomainIdentity(company.website) ??
    normalizeDomainIdentity(company.profileSourceUrl) ??
    normalizeCompanyNameIdentity(company.name)
  );
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
  const roleCounts = getCompanyRoleCountIndex(jobs);
  const byCanonicalKey = new Map<string, Company>();

  for (const company of companies) {
    if (!activeCompanySlugs.has(company.slug)) {
      continue;
    }

    const canonicalKey = getCompanyCanonicalKey(company) || company.slug;
    const current = byCanonicalKey.get(canonicalKey);

    if (!current) {
      byCanonicalKey.set(canonicalKey, company);
      continue;
    }

    const currentRoles = roleCounts.get(current.slug) ?? 0;
    const nextRoles = roleCounts.get(company.slug) ?? 0;
    const currentHasSector = Boolean(getMeaningfulMetadataValue(current.sector));
    const nextHasSector = Boolean(getMeaningfulMetadataValue(company.sector));
    const shouldReplace =
      Number(company.verified !== false) > Number(current.verified !== false) ||
      (company.verified === current.verified && nextRoles > currentRoles) ||
      (company.verified === current.verified && nextRoles === currentRoles && nextHasSector && !currentHasSector);

    if (shouldReplace) {
      byCanonicalKey.set(canonicalKey, company);
    }
  }

  return Array.from(byCanonicalKey.values());
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

  const jobs = sortJobsByFreshness(listJobs().map(stripSalary).filter(isPublicJobForAzerbaijan));
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
  const hasHighSourceBackedConfidence = confidence >= 0.72;

  if (strictInternshipLevels.has(job.level)) {
    return (hasSignal && confidence >= 0.38) || hasHighSourceBackedConfidence;
  }

  return (hasSignal && confidence >= 0.34) || hasHighSourceBackedConfidence;
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
    const sector = getMeaningfulMetadataValue(company.sector);

    if (!sector) {
      continue;
    }

    categoryMap.set(sector, (categoryMap.get(sector) ?? 0) + 1);
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
  const requestedCity = isAllFilterValue(filters.city) ? null : normalizeCityForFilter(filters.city ?? "");
  const requestedLevel = isAllFilterValue(filters.level) ? null : normalizeRoleLevel(filters.level);

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

    const matchesCity = !requestedCity || normalizeCityForFilter(job.city) === requestedCity;
    const matchesLevel = !requestedLevel || requestedLevel === "unknown" || job.level === requestedLevel;
    const matchesWorkModel =
      !filters.workModel ||
      filters.workModel === "Hamısı" ||
      filters.workModel === "all" ||
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
    .slice(0, 12);
}

export function getHomeStats() {
  const allJobs = getJobs();
  const allCompanies = getCompanies();
  const internshipRoles = allJobs.filter((job) => strictInternshipLevels.has(job.level) && isYouthRole(job)).length;
  const traineeRoles = allJobs.filter((job) => job.level === "trainee" && isYouthRole(job)).length;
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
