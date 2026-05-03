import type { MetadataRoute } from "next";

import { getJobs } from "@/lib/platform";
import { getInfoPages } from "@/lib/site-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const generatedAt = new Date();

function getStaticRoutes(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: generatedAt
    },
    {
      url: `${siteUrl}/jobs`,
      lastModified: generatedAt
    },
    {
      url: `${siteUrl}/companies`,
      lastModified: generatedAt
    },
    {
      url: `${siteUrl}/karyera-meslehetleri`,
      lastModified: generatedAt
    },
    {
      url: `${siteUrl}/for-employers`,
      lastModified: generatedAt
    }
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = getStaticRoutes();

  const infoRoutes: MetadataRoute.Sitemap = getInfoPages().map((page) => ({
    url: `${siteUrl}/info/${page.sectionSlug}/${page.slug}`,
    lastModified: generatedAt
  }));

  try {
    const jobRoutes: MetadataRoute.Sitemap = (await getJobs()).map((job) => ({
      url: `${siteUrl}/jobs/${job.slug}`,
      lastModified: new Date(job.createdAt ?? job.postedAt)
    }));

    return [...staticRoutes, ...infoRoutes, ...jobRoutes];
  } catch (error) {
    console.warn("Sitemap generation fell back to static routes.", error);
    return [...staticRoutes, ...infoRoutes];
  }
}
