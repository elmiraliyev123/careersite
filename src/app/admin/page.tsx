import { AlertTriangle, CalendarClock, DatabaseZap, ShieldCheck } from "lucide-react";

import { AccessGate } from "@/components/access-gate";
import { AdminPanelClient } from "@/components/admin-panel-client";
import { CompanyCard } from "@/components/company-card";
import { FeaturedListingsCarousel } from "@/components/featured-listings-carousel";
import { getPrimaryLocalizedText } from "@/lib/localized-content";
import { getPlatformStorageStatus } from "@/lib/platform-database";
import { ScrapeSyncPanel } from "@/components/scrape-sync-panel";
import {
  formatAzerbaijaniDate,
  getAvailableCities,
  getCompanies,
  getCompanyBySlug,
  getCompanyOpenRoleCount,
  getFeaturedCompanies,
  getFeaturedListings,
  getJobs
} from "@/lib/platform";
import { scrapeSources } from "@/lib/scrape-config";
import { getSessionRole } from "@/lib/session";

export default async function AdminPage() {
  const role = await getSessionRole();

  if (!role) {
    return (
      <AccessGate
        eyebrow="Giriş tələb olunur"
        title="Admin bölməsi yalnız girişdən sonra görünür"
        description="Admin hissəsi ayrıca giriş ünvanından idarə olunur."
        actionHref="/adminlog"
        actionLabel="Admin kimi daxil ol"
      />
    );
  }

  if (role !== "admin") {
    return (
      <AccessGate
        eyebrow="Giriş rolu uyğun deyil"
        title="Bu səhifə yalnız admin üçündür"
        description="Bu keçid ayrıca admin idarəetməsi üçün ayrılıb. İctimai namizəd paneli bu mərhələdə aktiv deyil."
        actionHref="/jobs"
        actionLabel="Vakansiyalara bax"
      />
    );
  }

  const jobs = getJobs();
  const companies = getCompanies();
  const availableCities = getAvailableCities();
  const storage = getPlatformStorageStatus();
  const allFeaturedCompanies = getFeaturedCompanies();
  const featuredCompanies = allFeaturedCompanies.slice(0, 3);
  const allFeaturedListings = getFeaturedListings();
  const featuredListings = allFeaturedListings.slice(0, 4);
  const featuredListingItems = featuredListings
    .map((job) => {
      const company = getCompanyBySlug(job.companySlug);
      return company ? { job, company } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const urgentJobs = [...jobs]
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);

  return (
    <main className="section">
      <div className="shell stack-lg">
        <div className="page-hero">
          <p className="eyebrow">Admin paneli</p>
          <h1>Featured companies və fresh internship listings idarəsi</h1>
          <p>
            Admin bu səhifədən şirkət profili yarada, şirkəti featured edə və gənclər üçün
            fresh vakansiya əlavə edə bilər. Featured şirkət üçün yaradılan youth-role listing
            ana səhifəyə avtomatik düşür.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <DatabaseZap size={20} />
            <h3>{storage.jobCount} aktiv vakansiya</h3>
            <p>Vakansiyalar artıq SQLite storage üzərində saxlanılır və freshness əsasında sıralanır.</p>
          </article>
          <article className="feature-card">
            <ShieldCheck size={20} />
            <h3>{allFeaturedCompanies.length} featured şirkət</h3>
            <p>Adminin yaratdığı və featured etdiyi şirkətlər home page-in yuxarı hissəsində görünür.</p>
          </article>
          <article className="feature-card">
            <AlertTriangle size={20} />
            <h3>{allFeaturedListings.length} featured listing</h3>
            <p>Yalnız internship, trainee, junior və yeni məzun rolları featured axına daxil olur.</p>
          </article>
        </div>

        <AdminPanelClient companies={companies} jobs={jobs} availableCities={availableCities} />
        <ScrapeSyncPanel sources={scrapeSources} />

        <section className="dashboard-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Featured şirkətlər</p>
              <h2>Hazırda ana səhifədə görünən company profilləri</h2>
            </div>
          </div>

          <div className="card-grid card-grid--companies">
            {featuredCompanies.map((company) => (
              <CompanyCard
                key={company.slug}
                company={company}
                openRoles={getCompanyOpenRoleCount(company.slug)}
              />
            ))}
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Fresh featured listings</p>
              <h2>Featured şirkətlərdən gələn ən yeni youth-role vakansiyalar</h2>
            </div>
          </div>

          <FeaturedListingsCarousel items={featuredListingItems} />
        </section>

        <section className="dashboard-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Təcili baxılacaq elanlar</p>
              <h2>Deadline-a yaxın rollar</h2>
            </div>
          </div>

          <div className="dashboard-list">
            {urgentJobs.map((job) => (
              <div key={job.slug} className="dashboard-item">
                <div>
                  <strong>{getPrimaryLocalizedText(job.title)}</strong>
                  <span>
                    {job.level} • {job.city}
                  </span>
                </div>
                <span>{formatAzerbaijaniDate(job.deadline)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">İngest statusu</p>
              <h2>Scraper və admin tərəfindən gələn data eyni axında işləyir</h2>
            </div>
            <CalendarClock size={18} className="panel-icon" />
          </div>

          <ul className="bullet-list">
            <li>Python scraper faylı ayrıca saxlanılıb və ingest üçün ayrıca istifadə oluna bilər.</li>
            <li>Admin CRUD əməliyyatları SQLite storage və signed session ilə qorunur.</li>
            <li>Home page featured blokunda yalnız fresh və featured company listing-ləri göstərilir.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
