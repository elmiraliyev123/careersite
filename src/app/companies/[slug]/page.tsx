import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CompanyDetailPageClient } from "@/components/company-detail-page-client";
import { findCompanyBySlug } from "@/lib/platform-database";
import { getCompanyDetailPageData } from "@/lib/platform";

type CompanyDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CompanyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const company = findCompanyBySlug(slug);

  if (!company) {
    return {};
  }

  return {
    title: `${company.name} | Stradify`,
    description: company.about
  };
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { slug } = await params;
  const data = getCompanyDetailPageData(slug);

  if (!data) {
    notFound();
  }

  return (
    <CompanyDetailPageClient
      company={data.company}
      jobs={data.jobs}
      openRoleCount={data.openRoleCount}
    />
  );
}
