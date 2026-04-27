"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe, MapPin, Users } from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { CompanyNameWithBadge } from "@/components/company-name-with-badge";
import { JobCard } from "@/components/job-card";
import { useI18n } from "@/components/i18n-provider";
import type { Company, Job } from "@/data/platform";
import { translateSector } from "@/lib/i18n";
import { buildOutboundHref } from "@/lib/outbound";
import { getLocalizedCompany } from "@/lib/platform-localization";
import {
  dedupeDisplayTextList,
  getDisplayDomain,
  getMeaningfulMetadataValue,
  getMeaningfulTaxonomyValue,
  getMeaningfulText,
  getPublicLocationLabel,
  isGenericTaxonomyValue,
  isUnknownValue
} from "@/lib/ui-display";

const INITIAL_ROLES = 3;
const ROLES_BATCH = 3;

type CompanyDetailPageClientProps = {
  company: Company;
  jobs: Job[];
};

export function CompanyDetailPageClient({ company, jobs }: CompanyDetailPageClientProps) {
  const { locale, t } = useI18n();
  const [visibleRoleCount, setVisibleRoleCount] = useState(INITIAL_ROLES);

  const localizedCompany = getLocalizedCompany(company, locale);
  const companyLinkTarget = company.profileSourceUrl ?? company.website;
  const companyLinkHref = buildOutboundHref({
    targetUrl: companyLinkTarget,
    companyName: localizedCompany.name,
    logoUrl: company.logo,
    sourcePath: `/companies/${company.slug}`,
    fallbackHref: `/companies/${company.slug}`
  });
  const primaryLinkLabel = localizedCompany.verified === false ? t("labels.source") : t("actions.officialSite");
  const hasSourceBackedSummary = Boolean(company.wikipediaSourceUrl && localizedCompany.wikipediaSummary);
  const sectorLabel = getMeaningfulTaxonomyValue(localizedCompany.sector);
  const evidenceTags = dedupeDisplayTextList(localizedCompany.industryTags ?? []).filter(
    (item) =>
      !isUnknownValue(item) &&
      !isGenericTaxonomyValue(item) &&
      item.toLowerCase() !== sectorLabel?.toLowerCase()
  );
  const websiteDomain = getDisplayDomain(companyLinkTarget);
  const sizeLabel = getMeaningfulMetadataValue(company.size);
  const locationLabel = getPublicLocationLabel(localizedCompany.location);
  const tagline = getMeaningfulText(localizedCompany.tagline);

  const visibleJobs = jobs.slice(0, visibleRoleCount);
  const hasMoreJobs = visibleRoleCount < jobs.length;

  function loadMoreJobs() {
    setVisibleRoleCount((prev) => Math.min(prev + ROLES_BATCH, jobs.length));
  }

  return (
    <main className="section company-detail-page">
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

        {/* HERO / IDENTITY */}
        <section className="detail-hero">
          <div className="detail-hero__content">
            {/* Brand row: logo + name + badge */}
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
                {/* CompanyNameWithBadge: badge is always directly beside the name, never floats */}
                <CompanyNameWithBadge
                  name={localizedCompany.name}
                  verified={localizedCompany.verified}
                  badgeLabel={t("labels.verifiedCompany")}
                  profile
                  compact
                  className="company-profile__title"
                />
                {tagline ? <p className="detail-hero__summary">{tagline}</p> : null}
              </div>
            </div>

            {/* Meta: size, location, website */}
            <div className="detail-hero__meta">
              {sizeLabel ? (
                <span>
                  <Users size={16} />
                  {sizeLabel}
                </span>
              ) : null}
              {locationLabel ? (
                <span>
                  <MapPin size={16} />
                  {locationLabel}
                </span>
              ) : null}
              {websiteDomain ? (
                <span>
                  <Globe size={16} />
                  {websiteDomain}
                </span>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="company-detail__actions-row">
              <Link href={companyLinkHref} prefetch={false} className="button button--primary">
                <Globe size={16} />
                {primaryLinkLabel}
              </Link>
              <Link href="/jobs" className="button button--ghost">
                <ArrowLeft size={16} />
                {t("actions.backToJobs")}
              </Link>
            </div>

            {/* Role count + sector chips — centered on mobile */}
            <div className="chip-row company-detail__hero-tags hide-scrollbar company-detail__chips-centered">
              <span className="chip chip--accent">{t("labels.openRoles", { count: jobs.length })}</span>
              {sectorLabel ? <span className="chip">{translateSector(locale, sectorLabel)}</span> : null}
              {evidenceTags.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>

            {/* Wikipedia short note — appears directly below actions/chips */}
            {hasSourceBackedSummary ? (
              <div className="company-detail__short-note">
                <p className="eyebrow">{t("jobDetail.companyOverview")}</p>
                <p className="info-copy company-detail__short-note-text">
                  {localizedCompany.wikipediaSummary}
                </p>
                <a
                  href={company.wikipediaSourceUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  {t("companyPage.wikipediaSource")} <ExternalLink size={15} />
                </a>
              </div>
            ) : null}
          </div>
        </section>

        {/* OPEN ROLES SECTION — with load-more */}
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
            <>
              <div className="card-grid card-grid--jobs company-detail-jobs-grid hide-scrollbar">
                {visibleJobs.map((job) => (
                  <JobCard
                    key={job.slug}
                    job={job}
                    company={company}
                    sourcePath={`/companies/${company.slug}`}
                  />
                ))}
              </div>

              {hasMoreJobs ? (
                <div className="load-more-row">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={loadMoreJobs}
                  >
                    {t("actions.showMore")}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>

        {/* SIDEBAR INFO PANEL (desktop) */}
        <div className="detail-grid company-detail-info-grid">
          <aside className="detail-panel detail-panel--sticky company-detail__role-summary">
            <p className="eyebrow">
              {localizedCompany.verified === false ? t("labels.source") : t("companyPage.openRolesEyebrow")}
            </p>
            <h2>{t("labels.openRoles", { count: jobs.length })}</h2>
            <div className="chip-row company-detail__sidebar-chips">
              {sectorLabel ? (
                <span className="chip chip--accent">{translateSector(locale, sectorLabel)}</span>
              ) : null}
              {evidenceTags.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
            <div className="stack-sm">
              <Link href={companyLinkHref} prefetch={false} className="text-link">
                {primaryLinkLabel} <ExternalLink size={15} />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
