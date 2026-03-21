"use client";

import { JobCard } from "@/components/job-card";
import { FeaturedEmployersCloud } from "@/components/featured-employers-cloud";
import { useI18n } from "@/components/i18n-provider";
import { NewInternshipsCarousel } from "@/components/new-internships-carousel";
import { jobLevels, workModels, type Company, type Job } from "@/data/platform";
import { translateCity, translateLevel, translateWorkModel } from "@/lib/i18n";

type JobsPageClientProps = {
  jobs: Array<{ job: Job; company?: Company | null }>;
  query: string;
  city: string;
  level: string;
  workModel: string;
  availableCities: string[];
  featuredEmployers: Array<{ company: Company; openRoles: number }>;
  newestInternships: Array<{ job: Job; company: Company }>;
};

export function JobsPageClient({
  jobs,
  query,
  city,
  level,
  workModel,
  availableCities,
  featuredEmployers,
  newestInternships
}: JobsPageClientProps) {
  const { locale, t } = useI18n();

  return (
    <main className="section">
      <div className="shell stack-lg">
        <div className="page-hero">
          <p className="eyebrow">{t("jobsPage.eyebrow")}</p>
          <h1>{t("jobsPage.title")}</h1>
          <p>{t("jobsPage.copy")}</p>
        </div>

        <form className="filters-panel" action="/jobs">
          <label className="field">
            <span>{t("labels.roleOrSkill")}</span>
            <input defaultValue={query} name="q" type="text" placeholder={t("labels.roleExample")} />
          </label>

          <label className="field">
            <span>{t("labels.city")}</span>
            <select name="city" defaultValue={city}>
              {availableCities.map((item) => (
                <option key={item} value={item}>
                  {translateCity(locale, item)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("labels.level")}</span>
            <select name="level" defaultValue={level}>
              {jobLevels.map((item) => (
                <option key={item} value={item}>
                  {translateLevel(locale, item)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("labels.workModel")}</span>
            <select name="workModel" defaultValue={workModel}>
              {workModels.map((item) => (
                <option key={item} value={item}>
                  {translateWorkModel(locale, item)}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="button button--primary">
            {t("actions.filter")}
          </button>
        </form>

        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("labels.results")}</p>
            <h2>{t("jobsPage.matchingRolesTitle", { count: jobs.length })}</h2>
          </div>
        </div>

        {newestInternships.length > 0 ? (
          <section className="stack-sm">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("jobsPage.newInternshipsEyebrow")}</p>
                <h2>{t("jobsPage.newInternshipsTitle")}</h2>
              </div>
            </div>

            <NewInternshipsCarousel items={newestInternships} />
          </section>
        ) : null}

        {jobs.length === 0 ? (
          <div className="empty-state empty-state--large">
            <h3>{t("jobsPage.emptyTitle")}</h3>
            <p>{t("jobsPage.emptyCopy")}</p>
          </div>
        ) : (
          <div className="card-grid card-grid--jobs">
            {jobs.map(({ job, company }) => (
              <JobCard key={job.slug} job={job} company={company} />
            ))}
          </div>
        )}

        <section className="stack-md jobs-page__featured-employers">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("jobsPage.featuredEmployersEyebrow")}</p>
              <h2>{t("jobsPage.featuredEmployersTitle")}</h2>
            </div>
          </div>

          <FeaturedEmployersCloud items={featuredEmployers} />
        </section>
      </div>
    </main>
  );
}
