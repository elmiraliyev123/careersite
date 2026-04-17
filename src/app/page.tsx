import { HomePageClient } from "@/components/home-page-client";
import {
  getAvailableCities,
  getCompanyBySlug,
  getCompanyOpenRoleCount,
  getFeaturedCompanies,
  getJobs,
  getHeroCities,
  getHomeStats,
  isYouthRole
} from "@/lib/platform";

export default async function HomePage() {
  const stats = getHomeStats();
  const jobs = getJobs();
  const youthJobs = jobs.filter(isYouthRole);
  const featuredJobs = youthJobs.slice(0, 8);
  const featuredJobItems = featuredJobs
    .map((job) => {
      const company = getCompanyBySlug(job.companySlug);
      return company ? { job, company } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const featuredCompanies = getFeaturedCompanies().map((company) => ({
    company,
    openRoles: getCompanyOpenRoleCount(company.slug)
  }));
  const heroCities = getHeroCities();
  const availableCities = getAvailableCities();

  return (
    <HomePageClient
      stats={stats}
      featuredJobItems={featuredJobItems}
      featuredCompanies={featuredCompanies}
      heroCities={heroCities}
      availableCities={availableCities}
    />
  );
}
