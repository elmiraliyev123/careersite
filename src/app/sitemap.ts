import type { MetadataRoute } from "next";

import { getJobs } from "@/lib/platform";
import { getInfoPages } from "@/lib/site-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date()
    },
    {
      url: `${siteUrl}/jobs`,
      lastModified: new Date()
    },
    {
      url: `${siteUrl}/for-employers`,
      lastModified: new Date()
    }
  ];

  const infoRoutes: MetadataRoute.Sitemap = getInfoPages().map((page) => ({
    url: `${siteUrl}/info/${page.sectionSlug}/${page.slug}`,
    lastModified: new Date()
  }));

  const jobRoutes: MetadataRoute.Sitemap = getJobs().map((job) => ({
    url: `${siteUrl}/jobs/${job.slug}`,
    lastModified: new Date(job.createdAt ?? job.postedAt)
  }));

  return [...staticRoutes, ...infoRoutes, ...jobRoutes];
}
