"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe, MapPin, Users } from "lucide-react";

import { CompanyVibeGrid } from "@/components/company-vibe-grid";
import { CompanyLogoImage } from "@/components/company-logo-image";
import { JobCard } from "@/components/job-card";
import { useI18n } from "@/components/i18n-provider";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Company, Job } from "@/data/platform";
import { translateSector } from "@/lib/i18n";
import { buildOutboundHref } from "@/lib/outbound";
import { getLocalizedCompany } from "@/lib/platform-localization";

type CompanyDetailPageClientProps = {
  company: Company;
  jobs: Job[];
};

export function CompanyDetailPageClient({ company, jobs }: CompanyDetailPageClientProps) {
  const { locale, t } = useI18n();
  const localizedCompany = getLocalizedCompany(company, locale);
  const officialSiteHref = buildOutboundHref({
    targetUrl: company.website,
    companyName: localizedCompany.name,
    logoUrl: company.logo,
    sourcePath: `/companies/${company.slug}`,
    fallbackHref: `/companies/${company.slug}`
  });

  return (
    <main className="section">
      <div className="shell stack-lg company-detail-shell">
        <div className="breadcrumb">
          <Link href="/">{t("nav.home")}</Link>
          <span>/</span>
          <Link href="/jobs">{t("nav.jobs")}</Link>
          <span>/</span>
          <Link href="/companies">{t("nav.companies")}</Link>
          <span>/</span>
          <span>{localizedCompany.name}</span>
        </div>

        <section className="detail-hero">
          <div className="detail-hero__content">
            <div className="company-profile__brand">
              <span className="company-profile__logo">
                <CompanyLogoImage
                  name={localizedCompany.name}
                  website={localizedCompany.website}
                  logo={localizedCompany.logo}
                  size={56}
                />
              </span>
              <div className="stack-sm">
                <div className="company-profile__title">
                  <h1>{localizedCompany.name}</h1>
                  <VerifiedBadge compact label={t("labels.verifiedCompany")} />
                </div>
                <p className="detail-hero__summary">{localizedCompany.tagline}</p>
              </div>
            </div>

            <div className="detail-hero__meta">
              <span>
                <Users size={16} />
                {company.size}
              </span>
              <span>
                <MapPin size={16} />
                {company.location}
              </span>
              <span>
                <Globe size={16} />
                {company.website.replace("https://", "")}
              </span>
            </div>

            <div className="company-detail__actions-row">
              <Link href={officialSiteHref} prefetch={false} className="button button--primary">
                <Globe size={16} />
                {t("actions.officialSite")}
              </Link>
              <Link href="/jobs" className="button button--ghost">
                <ArrowLeft size={16} />
                {t("actions.backToJobs")}
              </Link>
            </div>

            <div className="chip-row company-detail__hero-tags hide-scrollbar">
              <span className="chip chip--accent">{t("labels.openRoles", { count: jobs.length })}</span>
              <span className="chip">{translateSector(locale, company.sector)}</span>
              {(localizedCompany.industryTags ?? []).map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
              {localizedCompany.benefits.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="stack-md company-detail-jobs-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("companyPage.jobsEyebrow")}</p>
              <h2>{t("companyPage.jobsTitle", { name: localizedCompany.name })}</h2>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="empty-state empty-state--large">
              <h3>{t("companyPage.emptyTitle")}</h3>
              <p>{t("companyPage.emptyCopy")}</p>
            </div>
          ) : (
            <div className="card-grid card-grid--jobs company-detail-jobs-grid hide-scrollbar">
              {jobs.map((job) => (
                <JobCard
                  key={job.slug}
                  job={job}
                  company={company}
                  sourcePath={`/companies/${company.slug}`}
                />
              ))}
            </div>
          )}
        </section>

        <div className="company-detail-vibe-section">
          <CompanyVibeGrid company={company} />
        </div>

        <div className="detail-grid company-detail-info-grid">
          <section className="detail-panel">
            <p className="eyebrow">{t("companyPage.aboutEyebrow")}</p>
            <h2>{t("companyPage.aboutTitle")}</h2>
            <p className="info-copy">{localizedCompany.about}</p>
          </section>

          <section className="detail-panel">
            <p className="eyebrow">{t("jobDetail.companyOverview")}</p>
            <h2>{t("companyPage.overviewTitle")}</h2>
            <div className="stack-sm">
              <p className="info-copy">
                {localizedCompany.wikipediaSummary ?? t("companyPage.overviewPlaceholder")}
              </p>
              {company.wikipediaSourceUrl ? (
                <a
                  href={company.wikipediaSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  {t("companyPage.wikipediaSource")} <ExternalLink size={15} />
                </a>
              ) : null}
            </div>
          </section>

          <section className="detail-panel">
            <p className="eyebrow">{t("companyPage.focusEyebrow")}</p>
            <h2>{t("companyPage.focusTitle")}</h2>
            <ul className="bullet-list">
              {localizedCompany.focusAreas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="detail-panel">
            <p className="eyebrow">{t("companyPage.youthOfferEyebrow")}</p>
            <h2>{t("companyPage.youthOfferTitle")}</h2>
            <ul className="bullet-list">
              {localizedCompany.youthOffer.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <aside className="detail-panel detail-panel--sticky company-detail__role-summary">
            <p className="eyebrow">{t("companyPage.openRolesEyebrow")}</p>
            <h2>{t("labels.openRoles", { count: jobs.length })}</h2>
            <div className="chip-row">
              <span className="chip chip--accent">{translateSector(locale, company.sector)}</span>
              {(localizedCompany.industryTags ?? []).map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
              {localizedCompany.benefits.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
