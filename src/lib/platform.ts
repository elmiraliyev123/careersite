import { unstable_noStore as noStore } from "next/cache";

import { cities, type Company, type Job } from "@/data/platform";
import {
  getAllLocalizedTextValues,
  getAllLocalizedTextValuesFromList,
  localizedTextIncludes
} from "@/lib/localized-content";
import { formatLocalizedDate } from "@/lib/i18n";
import { findCompanyBySlug, findJobBySlug, listCompanies, listJobs } from "@/lib/platform-database";

type JobFilters = {
  query?: string;
  city?: string;
  level?: string;
  workModel?: string;
};

const youthLevels = new Set<Job["level"]>(["Təcrübə", "Junior", "Trainee", "Yeni məzun"]);

function stripSalary(job: Job): Job {
  const { salary: _salary, ...rest } = job;
  return rest;
}

function sortByNewestDate<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
}

function sortJobsByFreshness(items: Job[]) {
  return [...items].sort((left, right) => {
    const postedComparison = right.postedAt.localeCompare(left.postedAt);

    if (postedComparison !== 0) {
      return postedComparison;
    }

    return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
  });
}

function getPlatformData() {
  noStore();

  return {
    companies: sortByNewestDate(listCompanies()).sort((left, right) => {
      if (left.featured === right.featured) {
        return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
      }

      return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
    }),
    jobs: sortJobsByFreshness(listJobs().map(stripSalary))
  };
}

export function isYouthRole(job: Job) {
  return youthLevels.has(job.level);
}

export function getCompanies(): Company[] {
  return getPlatformData().companies;
}

export function getFeaturedCompanies(): Company[] {
  return getCompanies().filter((company) => company.featured);
}

export function getCompanyBySlug(slug: string): Company | undefined {
  noStore();
  return findCompanyBySlug(slug);
}

export function getJobs(): Job[] {
  return getPlatformData().jobs;
}

export function getFeaturedListings(): Job[] {
  const featuredCompanies = new Set(getFeaturedCompanies().map((company) => company.slug));

  return getJobs()
    .filter((job) => featuredCompanies.has(job.companySlug) && isYouthRole(job))
    .slice(0, 6);
}

export function getFeaturedJobs(): Job[] {
  return getFeaturedListings();
}

export function getJobBySlug(slug: string): Job | undefined {
  noStore();
  const job = findJobBySlug(slug);
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

    const matchesQuery =
      !query ||
      localizedTextIncludes(job.title, query) ||
      localizedTextIncludes(job.summary, query) ||
      localizedTextIncludes(job.category, query) ||
      company?.name.toLowerCase().includes(query) ||
      getAllLocalizedTextValuesFromList(job.tags).some((tag) => tag.toLowerCase().includes(query));

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
  const internshipRoles = allJobs.filter((job) => job.level === "Təcrübə").length;
  const traineeRoles = allJobs.filter((job) => job.level === "Trainee").length;
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
  const baseCities = cities.filter((city) => city !== "Hamısı");
  const liveCities = getJobs().map((job) => job.city);

  return ["Hamısı", ...Array.from(new Set([...baseCities, ...liveCities]))];
}

export function getHeroCities() {
  return getAvailableCities().filter((city) => city !== "Hamısı").slice(0, 4);
}

export function formatAzerbaijaniDate(value: string) {
  return formatLocalizedDate(value, "az");
}
