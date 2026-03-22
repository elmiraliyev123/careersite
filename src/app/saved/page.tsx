import { SavedJobsPageClient } from "@/components/saved-jobs-page-client";
import { getCompanies, getJobs } from "@/lib/platform";

export default function SavedPage() {
  return <SavedJobsPageClient jobs={getJobs()} companies={getCompanies()} />;
}
