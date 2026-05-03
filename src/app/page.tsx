import { HomePageClient } from "@/components/home-page-client";
import { getHomePageData } from "@/lib/platform";

export default async function HomePage() {
  const { stats, featuredJobItems, featuredCompanies, heroCities, availableCities } = await getHomePageData();

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
