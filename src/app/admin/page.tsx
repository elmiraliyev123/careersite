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
          description="İdarəetmə bölməsi ayrıca girişlə qorunur."
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
          description="Bu keçid yalnız idarəetmə üçün ayrılıb. Namizəd tərəfi burada göstərilmir."
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
      <div className="shell admin-shell">
        <aside className="detail-panel admin-sidebar-panel">
          <p className="eyebrow">İdarəetmə</p>
          <h2>CareerApple paneli</h2>
          <p className="info-copy">
            Vakansiyalar, şirkət profilləri, birbaşa müraciət linkləri və yenilənən elanlar
            buradan idarə olunur.
          </p>

          <nav className="admin-sidebar-nav" aria-label="Admin sections">
            <a href="#admin-dashboard" className="admin-sidebar-nav__link">
              Dashboard
            </a>
            <a href="#admin-companies" className="admin-sidebar-nav__link">
              Companies
            </a>
            <a href="#admin-jobs" className="admin-sidebar-nav__link">
              Jobs
            </a>
            <a href="#admin-logs" className="admin-sidebar-nav__link">
              Yeniləmə qeydləri
            </a>
          </nav>
        </aside>

        <div className="admin-workspace stack-lg">
          <div className="page-hero">
            <p className="eyebrow">Admin paneli</p>
            <h1>Şirkət və vakansiya idarəetməsi bir paneldə</h1>
            <p>
              Seçilmiş şirkətlər, yeni vakansiyalar, manual override-lar və yenilənən elanlar
              eyni idarə panelində toplanır. Buradakı dəyişikliklər platformada görünən təcrübəyə
              birbaşa təsir edir.
            </p>
          </div>

          <section id="admin-dashboard" className="stack-md">
            <div className="feature-grid">
              <article className="feature-card">
                <DatabaseZap size={20} />
                <h3>{storage.jobCount} aktiv vakansiya</h3>
                <p>Vakansiyalar bir paneldən yenilənir və son görünən elanları izləməyi asanlaşdırır.</p>
              </article>
              <article className="feature-card">
                <ShieldCheck size={20} />
                <h3>{allFeaturedCompanies.length} featured şirkət</h3>
                <p>Seçilmiş profillər və erkən karyera rolları ana səhifədə önə çıxır.</p>
              </article>
              <article className="feature-card">
                <AlertTriangle size={20} />
                <h3>{allFeaturedListings.length} featured listing</h3>
                <p>Yalnız internship, trainee, junior və yeni məzun rolları seçilmiş bloklarda görünür.</p>
              </article>
            </div>

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
                  <p className="eyebrow">Seçilmiş elanlar</p>
                  <h2>Seçilmiş şirkətlərdən görünən ən yeni vakansiyalar</h2>
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
                  <p className="eyebrow">Etibar və nəzarət</p>
                  <h2>Məzmun keyfiyyəti və təhlükəsizlik eyni paneldə izlənir</h2>
                </div>
                <CalendarClock size={18} className="panel-icon" />
              </div>

              <ul className="bullet-list">
                <li>Dəyişikliklər yalnız qorunan girişlə edilir.</li>
                <li>Şirkət təsvirləri, Wikipedia mətnləri və vakansiya copy-si göstərilməzdən əvvəl sanitizasiya olunur.</li>
                <li>Birbaşa müraciət linkləri istəyə uyğun yenilənə bilir.</li>
              </ul>
            </section>
          </section>

          <AdminPanelClient companies={companies} jobs={jobs} availableCities={availableCities} />

          <section id="admin-logs" className="stack-md">
            <ScrapeSyncPanel sources={scrapeSources} />
          </section>
        </div>
      </div>
    </main>
  );
}
