"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, ExternalLink, MapPin } from "lucide-react";

import { AiJobSummaryCard } from "@/components/ai-job-summary-card";
import { ApplyJobButton } from "@/components/apply-job-button";
import { JobCard } from "@/components/job-card";
import { SaveJobButton } from "@/components/save-job-button";
import { useI18n } from "@/components/i18n-provider";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Company, Job } from "@/data/platform";
import {
  formatLocalizedDate,
  translateCity,
  translateLevel,
  translateWorkModel
} from "@/lib/i18n";
import { buildOutboundHref } from "@/lib/outbound";
import { getLocalizedCompany, getLocalizedJob } from "@/lib/platform-localization";

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
  const originalListingHref = job.sourceUrl
    ? buildOutboundHref({
        targetUrl: job.sourceUrl,
        companyName: localizedCompany?.name ?? job.companySlug,
        logoUrl: company?.logo,
        sourcePath,
        fallbackHref: sourcePath
      })
    : null;

  return (
    <main className="section">
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
            <div className="chip-row">
              <span className="chip chip--accent">{translateLevel(locale, job.level)}</span>
              <span className="chip">{translateWorkModel(locale, job.workModel)}</span>
              <span className="chip">{localizedJob.category}</span>
            </div>

            <h1>{localizedJob.title}</h1>
            <div className="detail-hero__company-row">
              <p className="detail-hero__company">{localizedCompany?.name}</p>
              {localizedCompany ? (
                <VerifiedBadge compact label={t("labels.verifiedCompany")} />
              ) : null}
            </div>
            <p className="detail-hero__summary">{localizedJob.summary}</p>

            <div className="detail-hero__meta">
              <span>
                <MapPin size={16} />
                {translateCity(locale, job.city)}
              </span>
              <span>
                <CalendarDays size={16} />
                {t("labels.deadline")}: {formatLocalizedDate(job.deadline, locale)}
              </span>
              <span>
                <Clock3 size={16} />
                {t("labels.posted")}: {formatLocalizedDate(job.postedAt, locale)}
              </span>
              {job.sourceName ? (
                <span>
                  {t("labels.source")}: {job.sourceName}
                </span>
              ) : null}
            </div>
          </div>

          <div className="detail-hero__actions">
            <div className="detail-hero__desktop-apply">
              <ApplyJobButton
                slug={job.slug}
                href={job.applyUrl ?? ""}
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

        <div className="job-detail__mobile-apply">
          <ApplyJobButton
            slug={job.slug}
            href={job.applyUrl ?? ""}
            companyName={localizedCompany?.name ?? job.companySlug}
            companyLogo={company?.logo}
            sourcePath={sourcePath}
            className="button--full"
          />
        </div>

        <AiJobSummaryCard
          companyName={localizedCompany?.name ?? job.companySlug}
          summary={localizedJob.summary}
          requirements={localizedJob.requirements}
          benefits={localizedJob.benefits}
          responsibilities={localizedJob.responsibilities}
          workModel={translateWorkModel(locale, job.workModel)}
        />

        <div className="detail-grid">
          <section className="detail-panel">
            <p className="eyebrow">{t("labels.responsibilities")}</p>
            <h2>{t("jobDetail.whatYouWillDo")}</h2>
            <ul className="bullet-list">
              {localizedJob.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="detail-panel">
            <p className="eyebrow">{t("labels.requirements")}</p>
            <h2>{t("jobDetail.whatIsExpected")}</h2>
            <ul className="bullet-list">
              {localizedJob.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="detail-panel">
            <p className="eyebrow">{t("labels.benefits")}</p>
            <h2>{t("jobDetail.whatYouGain")}</h2>
            <ul className="bullet-list">
              {localizedJob.benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <aside className="detail-panel detail-panel--sticky">
            <p className="eyebrow">{t("labels.skills")}</p>
            <h2>{t("jobDetail.matchingTags")}</h2>
            <div className="chip-row">
              {localizedJob.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>

            {localizedCompany ? (
              <div className="company-mini">
                <div className="company-mini__title">
                  <h3>{localizedCompany.name}</h3>
                  <VerifiedBadge compact label={t("labels.verifiedCompany")} />
                </div>
                <p>{localizedCompany.about}</p>
              </div>
            ) : null}
          </aside>
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

          <div className="card-grid card-grid--jobs mobile-snap-row">
            {recommendations.map((item) => (
              <JobCard
                key={item.job.slug}
                job={item.job}
                company={item.company}
                sourcePath={`/jobs/${job.slug}`}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
