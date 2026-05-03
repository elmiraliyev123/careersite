import { JobsPageClient } from "@/components/jobs-page-client";
import { getJobsPageData } from "@/lib/platform";
import {
  getWorkModelDisplayValue,
  isAllFilterValue,
  normalizeLocationName,
  normalizeRoleFilterValue,
  normalizeWorkModelValue
} from "@/lib/ui-display";

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;

  const query = getStringValue(params.q) ?? "";
  const rawCity = getStringValue(params.city);
  const rawLevel = getStringValue(params.level);
  const city = isAllFilterValue(rawCity) ? "Hamısı" : normalizeLocationName(rawCity) ?? "Hamısı";
  const level = normalizeRoleFilterValue(rawLevel) ?? "all";
  const workModel = getWorkModelDisplayValue(normalizeWorkModelValue(getStringValue(params.workModel))) ?? "Hamısı";

  const { jobItems, availableCities, featuredEmployers, newestInternships } = getJobsPageData({
    query,
    city,
    level,
    workModel
  });

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
