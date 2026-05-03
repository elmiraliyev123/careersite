"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { CompanyNameWithBadge } from "@/components/company-name-with-badge";
import { useI18n } from "@/components/i18n-provider";
import type { Company, Job } from "@/data/platform";
import { formatLocalizedDate, translateLevel, translateWorkModel } from "@/lib/i18n";
import { getLocalizedCompany, getLocalizedJob } from "@/lib/platform-localization";
import { getMeaningfulText, getReadablePublicText, isMeaningfulLevel } from "@/lib/ui-display";

type NewInternshipsCarouselProps = {
  items: Array<{ job: Job; company: Company }>;
};

export function NewInternshipsCarousel({ items }: NewInternshipsCarouselProps) {
  const { locale, t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const firstCard = container.querySelector<HTMLElement>("[data-internship-slide='true']");
      const gap = 18;
      const step = (firstCard?.offsetWidth ?? 320) + gap;
      const nextLeft = container.scrollLeft + step;
      const maxScroll = container.scrollWidth - container.clientWidth;

      container.scrollTo({
        left: nextLeft >= maxScroll - 8 ? 0 : nextLeft,
        behavior: "smooth"
      });
    }, 1900);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPaused, items.length]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="internships-carousel"
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {items.map(({ job, company }) => {
        const localizedJob = getLocalizedJob(job, locale);
        const localizedCompany = getLocalizedCompany(company, locale);
        const levelLabel = isMeaningfulLevel(job.level) ? translateLevel(locale, job.level) : null;
        const workModelLabel = getMeaningfulText(translateWorkModel(locale, job.workModel));
        const summary = getReadablePublicText(localizedJob.summary);
        const deadlineLabel = getMeaningfulText(formatLocalizedDate(job.deadline, locale));
        const companyTagline = getMeaningfulText(localizedCompany.tagline);

        return (
          <article key={job.slug} className="internship-card" data-internship-slide="true">
            <div className="internship-card__head">
              <Link href={`/companies/${company.slug}`} className="internship-card__brand">
                <span className="internship-card__logo">
                  <CompanyLogoImage
                    name={company.name}
                    website={company.website}
                    logo={company.logo}
                    size={44}
                  />
                </span>
                <span className="internship-card__brand-copy">
                  <CompanyNameWithBadge
                    name={localizedCompany.name}
                    verified={localizedCompany.verified}
                    badgeLabel={t("labels.verifiedCompany")}
                    compact
                    className="internship-card__company-row"
                  />
                  {companyTagline ? <span>{companyTagline}</span> : null}
                </span>
              </Link>
            </div>

            <div className="internship-card__body">
              <div className="job-pill-row">
                {levelLabel ? (
                  <span className="job-pill job-pill--live">
                    <span className="job-pill__dot" />
                    {levelLabel}
                  </span>
                ) : null}
                {workModelLabel ? (
                  <span className="job-pill">
                    <Sparkles size={14} />
                    {workModelLabel}
                  </span>
                ) : null}
              </div>

              <div className="internship-card__copy">
                <h3>{localizedJob.title}</h3>
                {summary ? <p>{summary}</p> : null}
              </div>
            </div>

            <div className="internship-card__foot">
              {deadlineLabel ? (
                <span>
                  <Clock3 size={14} />
                  {t("labels.deadline")}: {deadlineLabel}
                </span>
              ) : null}

              <Link href={`/jobs/${job.slug}`} className="internship-card__apply">
                <span>{t("actions.viewDetails")}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
