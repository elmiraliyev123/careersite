import { notFound } from "next/navigation";

import { JobDetailPageClient } from "@/components/job-detail-page-client";
import { getJobDetailPageData } from "@/lib/platform";

type JobDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { slug } = await params;
  const data = getJobDetailPageData(slug);

  if (!data) {
    notFound();
  }

  return <JobDetailPageClient job={data.job} company={data.company} recommendations={data.recommendations} />;
}
