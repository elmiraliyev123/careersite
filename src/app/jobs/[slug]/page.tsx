import { notFound } from "next/navigation";

import { JobDetailPageClient } from "@/components/job-detail-page-client";
import { getCompanyBySlug, getJobBySlug, getRecommendedJobs } from "@/lib/platform";

type JobDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { slug } = await params;
  const job = getJobBySlug(slug);

  if (!job) {
    notFound();
  }

  const company = getCompanyBySlug(job.companySlug);
  const recommendations = getRecommendedJobs(job).map((item) => ({
    job: item,
    company: getCompanyBySlug(item.companySlug) ?? null
  }));

  return <JobDetailPageClient job={job} company={company} recommendations={recommendations} />;
}
