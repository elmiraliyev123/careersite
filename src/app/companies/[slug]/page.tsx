import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CompanyDetailPageClient } from "@/components/company-detail-page-client";
import { getCompanyBySlug, getCompanyJobs } from "@/lib/platform";

type CompanyDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CompanyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);

  if (!company) {
    return {};
  }

  return {
    title: `${company.name} | CareerApple`,
    description: company.about
  };
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  const jobs = getCompanyJobs(company.slug);

  return <CompanyDetailPageClient company={company} jobs={jobs} />;
}
