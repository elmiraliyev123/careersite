import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { InfoDetailPageClient } from "@/components/info-detail-page-client";
import { getInfoPage, getInfoPages } from "@/lib/site-content";

type InfoPageProps = {
  params: Promise<{ section: string; slug: string }>;
};

export async function generateStaticParams() {
  return getInfoPages().map((page) => ({
    section: page.sectionSlug,
    slug: page.slug
  }));
}

export async function generateMetadata({ params }: InfoPageProps): Promise<Metadata> {
  const { section, slug } = await params;
  const page = getInfoPage(section, slug);

  if (!page) {
    return {};
  }

  return {
    title: `${page.label} | CareerApple`,
    description: page.description
  };
}

export default async function InfoDetailPage({ params }: InfoPageProps) {
  const { section, slug } = await params;
  const page = getInfoPage(section, slug);

  if (!page) {
    notFound();
  }

  return <InfoDetailPageClient page={page} />;
}
