"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, ExternalLink, MapPin } from "lucide-react";

import { AiJobSummaryCard } from "@/components/ai-job-summary-card";
import { ApplyJobButton } from "@/components/apply-job-button";
import { CompanyNameWithBadge } from "@/components/company-name-with-badge";
import { JobCard } from "@/components/job-card";
import { SaveJobButton } from "@/components/save-job-button";
import { useI18n } from "@/components/i18n-provider";
import type { Company, Job } from "@/data/platform";
import {
  formatLocalizedDate,
  translateCity,
  translateLevel,
  translateWorkModel
} from "@/lib/i18n";
import { buildOutboundHref, isSafeExternalUrl } from "@/lib/outbound";
import { getLocalizedCompany, getLocalizedJob } from "@/lib/platform-localization";
import {
  getDisplaySourceLabel,
  getMeaningfulTaxonomyValue,
  getMeaningfulText,
  getPublicLocationLabel,
  isMeaningfulLevel,
  normalizeDisplayTags
} from "@/lib/ui-display";

type JobDetailPageClientProps = {
  job: Job;
  company?: Company | null;
  recommendations: Array<{ job: Job; company?: Company | null }>;
};

export function JobDetailPageClient({
  job,
  company,
  recommendations
}: JobDetailPageClientProps) {
  const { locale, t } = useI18n();
  const localizedJob = getLocalizedJob(job, locale);
  const localizedCompany = company ? getLocalizedCompany(company, locale) : null;
  const sourcePath = `/jobs/${job.slug}`;
  const levelChip = isMeaningfulLevel(job.level) ? translateLevel(locale, job.level) : null;
  const workModelChip = getMeaningfulText(translateWorkModel(locale, job.workModel));
  const categoryChip = getMeaningfulTaxonomyValue(localizedJob.category);
  const summary = getMeaningfulText(localizedJob.summary);
  const cityLabel = getPublicLocationLabel(translateCity(locale, job.city));
  const deadlineLabel = getMeaningfulText(formatLocalizedDate(job.deadline, locale));
  const postedLabel = getMeaningfulText(formatLocalizedDate(job.postedAt, locale));
  const sourceLabel = getDisplaySourceLabel(job);
  const matchingTags = localizedJob.tags;
  const heroChips = normalizeDisplayTags(
    [levelChip, workModelChip, categoryChip].filter((value): value is string => Boolean(value)),
    locale
  );
  const hasHeroChips = heroChips.length > 0;
  const showSkillsPanel = matchingTags.length > 0;
  const originalListingTarget = job.jobDetailUrl ?? job.sourceListingUrl ?? job.sourceUrl ?? null;
  const originalListingHref =
    originalListingTarget &&
    originalListingTarget !== job.finalVerifiedUrl &&
    isSafeExternalUrl(originalListingTarget)
      ? buildOutboundHref({
          targetUrl: originalListingTarget,
          companyName: localizedCompany?.name ?? job.companySlug,
          logoUrl: company?.logo,
          sourcePath,
          fallbackHref: sourcePath
        })
      : null;
  const [visibleRecommendationCount, setVisibleRecommendationCount] = useState(3);
  const visibleRecommendations = recommendations.slice(0, visibleRecommendationCount);
  const hasMoreRecommendations = visibleRecommendationCount < recommendations.length;

  return (
    <main className="section job-detail-page">
      <div className="shell stack-lg">
        <div className="breadcrumb">
          <Link href="/">{t("nav.home")}</Link>
          <span>/</span>
          <Link href="/jobs">{t("nav.jobs")}</Link>
          <span>/</span>
          <span>{localizedJob.title}</span>
        </div>

        <section className="detail-hero">
          <div className="detail-hero__content">
            {hasHeroChips ? (
              <div className="chip-row">
                {heroChips.map((chip, index) => (
                  <span key={chip} className={`chip${index === 0 ? " chip--accent" : ""}`}>
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}

            <h1>{localizedJob.title}</h1>
            {localizedCompany?.name ? (
              <div className="detail-hero__company-row">
                <CompanyNameWithBadge
                  name={localizedCompany.name}
                  verified={localizedCompany.verified}
                  badgeLabel={t("labels.verifiedCompany")}
                  compact
                />
              </div>
            ) : null}
            {summary ? <p className="detail-hero__summary">{summary}</p> : null}

            <div className="detail-hero__meta">
              {cityLabel ? (
                <span>
                  <MapPin size={16} />
                  {cityLabel}
                </span>
              ) : null}
              {deadlineLabel ? (
                <span>
                  <CalendarDays size={16} />
                  {t("labels.deadline")}: {deadlineLabel}
                </span>
              ) : null}
              {postedLabel ? (
                <span>
                  <Clock3 size={16} />
                  {t("labels.posted")}: {postedLabel}
                </span>
              ) : null}
              {sourceLabel ? <span>{t("labels.source")}: {sourceLabel}</span> : null}
            </div>
          </div>

          <div className="detail-hero__actions">
            <div className="detail-hero__desktop-apply">
              <ApplyJobButton
                slug={job.slug}
                href={job.finalVerifiedUrl ?? ""}
                companyName={localizedCompany?.name ?? job.companySlug}
                companyLogo={company?.logo}
                sourcePath={sourcePath}
              />
            </div>
            <SaveJobButton job={job} company={company} />
            {originalListingHref ? (
              <Link href={originalListingHref} prefetch={false} className="button button--ghost">
                <ExternalLink size={16} />
                {t("actions.originalListing")}
              </Link>
            ) : null}
          </div>
        </section>

        <AiJobSummaryCard
          summary={localizedJob.summary}
          requirements={localizedJob.requirements}
          benefits={localizedJob.benefits}
          responsibilities={localizedJob.responsibilities}
        />

        <div className="detail-grid">
          {localizedJob.responsibilities.length > 0 ? (
            <section className="detail-panel">
              <p className="eyebrow">{t("labels.responsibilities")}</p>
              <h2>{t("jobDetail.whatYouWillDo")}</h2>
              <ul className="bullet-list">
                {localizedJob.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {localizedJob.requirements.length > 0 ? (
            <section className="detail-panel">
              <p className="eyebrow">{t("labels.requirements")}</p>
              <h2>{t("jobDetail.whatIsExpected")}</h2>
              <ul className="bullet-list">
                {localizedJob.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {localizedJob.benefits.length > 0 ? (
            <section className="detail-panel">
              <p className="eyebrow">{t("labels.benefits")}</p>
              <h2>{t("jobDetail.whatYouGain")}</h2>
              <ul className="bullet-list">
                {localizedJob.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {showSkillsPanel ? (
            <aside className="detail-panel detail-panel--sticky">
              {matchingTags.length > 0 ? (
                <>
                  <p className="eyebrow">{t("labels.skills")}</p>
                  <h2>{t("jobDetail.matchingTags")}</h2>
                  <div className="chip-row">
                    {matchingTags.map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}

            </aside>
          ) : null}
        </div>

        <section className="stack-md">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("labels.similarJobs")}</p>
              <h2>{t("jobDetail.nextRolesTitle")}</h2>
            </div>
            <Link href="/jobs" className="text-link">
              {t("actions.viewAllJobs")} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="card-grid card-grid--jobs recommendations-grid">
            {visibleRecommendations.map((item) => (
              <JobCard
                key={item.job.slug}
                job={item.job}
                company={item.company}
                sourcePath={`/jobs/${job.slug}`}
              />
            ))}
          </div>

          {hasMoreRecommendations ? (
            <div className="load-more-row">
              <button
                type="button"
                className="button button--ghost"
                onClick={() =>
                  setVisibleRecommendationCount((current) =>
                    Math.min(current + 3, recommendations.length)
                  )
                }
              >
                {t("actions.showMore")}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <div className="job-detail__mobile-apply">
        <ApplyJobButton
          slug={job.slug}
          href={job.finalVerifiedUrl ?? ""}
          companyName={localizedCompany?.name ?? job.companySlug}
          companyLogo={company?.logo}
          sourcePath={sourcePath}
          className="button--full job-detail__mobile-apply-button"
        />
      </div>
    </main>
  );
}
