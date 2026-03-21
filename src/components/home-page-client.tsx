"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesCombined,
  GraduationCap,
  Search,
  ShieldCheck,
  Zap
} from "lucide-react";

import { FeaturedCompaniesCarousel } from "@/components/featured-companies-carousel";
import { FeaturedListingsCarousel } from "@/components/featured-listings-carousel";
import { useI18n } from "@/components/i18n-provider";
import { jobLevels, workModels, type Company, type Job } from "@/data/platform";
import { translateCity, translateLevel, translateWorkModel } from "@/lib/i18n";

type HomePageClientProps = {
  stats: {
    totalJobs: number;
    internshipRoles: number;
    traineeRoles: number;
    partnerCompanies: number;
  };
  featuredJobItems: Array<{ job: Job; company: Company }>;
  featuredCompanies: Array<{ company: Company; openRoles: number }>;
  heroCities: string[];
  availableCities: string[];
};

export function HomePageClient({
  stats,
  featuredJobItems,
  featuredCompanies,
  heroCities,
  availableCities
}: HomePageClientProps) {
  const { locale, t } = useI18n();

  return (
    <main>
      <section className="hero-section">
        <div className="shell hero-grid">
          <div>
            <p className="eyebrow">{t("home.eyebrow")}</p>
            <h1 className="hero-title">{t("home.title")}</h1>
            <p className="hero-copy">{t("home.copy")}</p>

            <div className="hero-actions">
              <Link href="/jobs" className="button button--primary">
                {t("actions.viewJobs")}
              </Link>
              <Link href="/info/students/kim-ishe-goturur" className="button button--ghost">
                {t("actions.whoIsHiring")}
              </Link>
            </div>

            <div className="hero-cities">
              {heroCities.map((city) => (
                <span key={city} className="chip">
                  {translateCity(locale, city)}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-search-card">
            <div className="hero-search-card__header">
              <Search size={18} />
              <span>{t("labels.jobSearch")}</span>
            </div>

            <form action="/jobs" className="stack-sm">
              <label className="field">
                <span>{t("labels.roleOrSkill")}</span>
                <input name="q" type="text" placeholder={t("labels.roleExample")} />
              </label>

              <div className="grid-two">
                <label className="field">
                  <span>{t("labels.city")}</span>
                  <select name="city" defaultValue={availableCities[0]}>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {translateCity(locale, city)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{t("labels.level")}</span>
                  <select name="level" defaultValue={jobLevels[0]}>
                    {jobLevels.map((level) => (
                      <option key={level} value={level}>
                        {translateLevel(locale, level)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span>{t("labels.workModel")}</span>
                <select name="workModel" defaultValue={workModels[0]}>
                  {workModels.map((model) => (
                    <option key={model} value={model}>
                      {translateWorkModel(locale, model)}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="button button--primary button--full">
                {t("actions.showMatchingRoles")}
              </button>
            </form>

            <div className="metric-grid">
              <div className="metric-card">
                <strong>{stats.totalJobs}</strong>
                <span>{t("labels.activeRoles")}</span>
              </div>
              <div className="metric-card">
                <strong>{stats.partnerCompanies}</strong>
                <span>{t("labels.verifiedEmployers")}</span>
              </div>
              <div className="metric-card">
                <strong>{stats.internshipRoles}</strong>
                <span>{t("labels.internship")}</span>
              </div>
              <div className="metric-card">
                <strong>{stats.traineeRoles}</strong>
                <span>{t("labels.trainee")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("home.featuredJobsEyebrow")}</p>
              <h2>{t("home.featuredJobsTitle")}</h2>
            </div>
            <Link href="/jobs" className="text-link">
              {t("actions.viewAllJobs")} <ArrowRight size={16} />
            </Link>
          </div>

          <FeaturedListingsCarousel items={featuredJobItems} />
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("home.featuredCompaniesEyebrow")}</p>
              <h2>{t("home.featuredCompaniesTitle")}</h2>
            </div>
          </div>

          <FeaturedCompaniesCarousel items={featuredCompanies} />
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("home.platformSignalsEyebrow")}</p>
              <h2>{t("home.platformSignalsTitle")}</h2>
            </div>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <Search size={20} />
              <h3>{t("home.feature1Title")}</h3>
              <p>{t("home.feature1Copy")}</p>
            </article>
            <article className="feature-card">
              <GraduationCap size={20} />
              <h3>{t("home.feature2Title")}</h3>
              <p>{t("home.feature2Copy")}</p>
            </article>
            <article className="feature-card">
              <ShieldCheck size={20} />
              <h3>{t("home.feature3Title")}</h3>
              <p>{t("home.feature3Copy")}</p>
            </article>
            <article className="feature-card">
              <ChartNoAxesCombined size={20} />
              <h3>{t("home.feature4Title")}</h3>
              <p>{t("home.feature4Copy")}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell cta-panel">
          <div>
            <p className="eyebrow">{t("home.ctaEyebrow")}</p>
            <h2>{t("home.ctaTitle")}</h2>
            <p>{t("home.ctaCopy")}</p>
          </div>
          <div className="cta-panel__actions">
            <Link href="/for-employers" className="button button--primary">
              {t("actions.exploreEmployers")}
            </Link>
            <Link href="/info/employers/demo-isteyi" className="button button--ghost">
              <Zap size={16} />
              {t("actions.requestDemo")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
