import { SavedJobsPageClient } from "@/components/saved-jobs-page-client";
import { getCompanies, getJobs } from "@/lib/platform";

export default async function SavedPage() {
  return <SavedJobsPageClient jobs={await getJobs()} companies={await getCompanies()} />;
}
