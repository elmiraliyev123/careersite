import { JobsPageClient } from "@/components/jobs-page-client";
import {
  filterJobs,
  getAvailableCities,
  getCompanyBySlug,
  getCompanyOpenRoleCount,
  getFeaturedCompanies,
  getJobs,
  isYouthRole
} from "@/lib/platform";

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;

  const query = getStringValue(params.q) ?? "";
  const city = getStringValue(params.city) ?? "Hamısı";
  const level = getStringValue(params.level) ?? "Hamısı";
  const workModel = getStringValue(params.workModel) ?? "Hamısı";

  const jobs = filterJobs({ query, city, level, workModel });
  const availableCities = getAvailableCities();
  const jobItems = jobs.map((job) => ({
    job,
    company: getCompanyBySlug(job.companySlug) ?? null
  }));
  const featuredEmployers = getFeaturedCompanies().map((company) => ({
    company,
    openRoles: getCompanyOpenRoleCount(company.slug)
  }));
  const newestInternships = getJobs()
    .filter((job) => isYouthRole(job))
    .slice(0, 8)
    .map((job) => {
      const company = getCompanyBySlug(job.companySlug);
      return company ? { job, company } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <JobsPageClient
      jobs={jobItems}
      query={query}
      city={city}
      level={level}
      workModel={workModel}
      availableCities={availableCities}
      featuredEmployers={featuredEmployers}
      newestInternships={newestInternships}
    />
  );
}
