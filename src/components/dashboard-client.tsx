"use client";

import Link from "next/link";
import { BriefcaseBusiness, Bookmark, CheckCircle2, Sparkles } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { useCandidateActivity } from "@/hooks/useCandidateActivity";
import type { Company, Job } from "@/data/platform";
import { translateLevel } from "@/lib/i18n";
import { getLocalizedJob } from "@/lib/platform-localization";

type DashboardClientProps = {
  jobs: Job[];
  companies: Company[];
};

export function DashboardClient({ jobs, companies }: DashboardClientProps) {
  const { locale, t } = useI18n();
  const { savedJobs, appliedJobs } = useCandidateActivity();

  const saved = jobs.filter((job) => savedJobs.includes(job.slug));
  const applied = jobs.filter((job) => appliedJobs.includes(job.slug));
  const recommended = jobs.filter(
    (job) => !savedJobs.includes(job.slug) && !appliedJobs.includes(job.slug)
  ).slice(0, 4);

  const companyMap = new Map(companies.map((company) => [company.slug, company]));

  return (
    <div className="dashboard-grid">
      <div className="dashboard-panel dashboard-panel--stats">
        <div className="stat-card">
            <Bookmark size={18} />
            <div>
              <strong>{saved.length}</strong>
              <span>{t("dashboard.savedStat")}</span>
            </div>
          </div>
        <div className="stat-card">
            <CheckCircle2 size={18} />
            <div>
              <strong>{applied.length}</strong>
              <span>{t("dashboard.appliedStat")}</span>
            </div>
          </div>
        <div className="stat-card">
            <BriefcaseBusiness size={18} />
            <div>
              <strong>{jobs.length}</strong>
              <span>{t("dashboard.activeStat")}</span>
            </div>
          </div>
      </div>

      <div className="dashboard-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("dashboard.savedEyebrow")}</p>
            <h2>{t("dashboard.savedTitle")}</h2>
          </div>
          <Link href="/jobs" className="text-link">
            {t("actions.openFreshListings")}
          </Link>
        </div>

        {saved.length === 0 ? (
          <div className="empty-state">
            <p>{t("dashboard.savedEmpty")}</p>
            <Link href="/jobs" className="button button--primary">
              {t("actions.viewJobs")}
            </Link>
          </div>
        ) : (
          <div className="dashboard-list">
            {saved.map((job) => (
              <Link key={job.slug} href={`/jobs/${job.slug}`} className="dashboard-item">
                <div>
                  <strong>{getLocalizedJob(job, locale).title}</strong>
                  <span>{companyMap.get(job.companySlug)?.name}</span>
                </div>
                <span>{job.city}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("dashboard.appliedEyebrow")}</p>
            <h2>{t("dashboard.appliedTitle")}</h2>
          </div>
        </div>

        {applied.length === 0 ? (
          <div className="empty-state">
            <p>{t("dashboard.appliedEmpty")}</p>
            <Link href="/jobs" className="button button--ghost">
              {t("actions.applyNow")}
            </Link>
          </div>
        ) : (
          <div className="dashboard-list">
            {applied.map((job) => (
              <Link key={job.slug} href={`/jobs/${job.slug}`} className="dashboard-item">
                <div>
                  <strong>{getLocalizedJob(job, locale).title}</strong>
                  <span>{companyMap.get(job.companySlug)?.name}</span>
                </div>
                <span>{t("actions.applied")}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("dashboard.recommendationsEyebrow")}</p>
            <h2>{t("dashboard.recommendationsTitle")}</h2>
          </div>
          <Sparkles size={18} className="panel-icon" />
        </div>

        <div className="dashboard-list">
          {recommended.map((job) => (
            <Link key={job.slug} href={`/jobs/${job.slug}`} className="dashboard-item">
              <div>
                <strong>{getLocalizedJob(job, locale).title}</strong>
                <span>{companyMap.get(job.companySlug)?.name}</span>
              </div>
              <span>{translateLevel(locale, job.level)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
