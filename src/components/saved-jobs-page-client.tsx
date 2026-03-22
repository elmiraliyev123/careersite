"use client";

import Link from "next/link";

import { JobCard } from "@/components/job-card";
import { useI18n } from "@/components/i18n-provider";
import type { Company, Job } from "@/data/platform";
import { useCandidateActivity } from "@/hooks/useCandidateActivity";

type SavedJobsPageClientProps = {
  jobs: Job[];
  companies: Company[];
};

export function SavedJobsPageClient({ jobs, companies }: SavedJobsPageClientProps) {
  const { savedItems } = useCandidateActivity();
  const { t } = useI18n();
  const companyMap = new Map(companies.map((company) => [company.slug, company]));
  const savedJobs = savedItems
    .map((item) => {
      const job = jobs.find((candidate) => candidate.slug === item.slug);

      if (!job) {
        return null;
      }

      return {
        job,
        company: companyMap.get(job.companySlug) ?? null
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <main className="section">
      <div className="shell stack-lg">
        <div className="page-hero">
          <p className="eyebrow">{t("nav.saved")}</p>
          <h1>{t("savedPage.title")}</h1>
          <p>{t("savedPage.copy")}</p>
        </div>

        {savedJobs.length === 0 ? (
          <div className="empty-state empty-state--large">
            <h3>{t("savedPage.emptyTitle")}</h3>
            <p>{t("savedPage.emptyCopy")}</p>
            <Link href="/jobs" className="button button--primary">
              {t("actions.viewJobs")}
            </Link>
          </div>
        ) : (
          <div className="card-grid card-grid--jobs mobile-snap-row">
            {savedJobs.map(({ job, company }) => (
              <JobCard key={job.slug} job={job} company={company} sourcePath="/saved" />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
