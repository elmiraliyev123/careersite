"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, Sparkles } from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { useI18n } from "@/components/i18n-provider";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Company, Job } from "@/data/platform";
import { formatLocalizedDate, translateLevel, translateWorkModel } from "@/lib/i18n";
import { buildOutboundHref } from "@/lib/outbound";
import { getLocalizedCompany, getLocalizedJob } from "@/lib/platform-localization";

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
        const applyHref = buildOutboundHref({
          targetUrl: job.directCompanyUrl ?? company.website ?? job.sourceUrl ?? `/jobs/${job.slug}`,
          companyName: localizedCompany.name,
          logoUrl: company.logo,
          sourcePath: "/jobs",
          fallbackHref: `/jobs/${job.slug}`
        });

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
                  <span className="internship-card__company-row">
                    <strong>{localizedCompany.name}</strong>
                    <VerifiedBadge compact label={t("labels.verifiedCompany")} />
                  </span>
                  <span>{localizedCompany.tagline}</span>
                </span>
              </Link>
            </div>

            <div className="internship-card__body">
              <div className="job-pill-row">
                <span className="job-pill job-pill--live">
                  <span className="job-pill__dot" />
                  {translateLevel(locale, job.level)}
                </span>
                <span className="job-pill">
                  <Sparkles size={14} />
                  {translateWorkModel(locale, job.workModel)}
                </span>
              </div>

              <h3>{localizedJob.title}</h3>
              <p>{localizedJob.summary}</p>
            </div>

            <div className="internship-card__foot">
              <span>
                <Clock3 size={14} />
                {t("labels.deadline")}: {formatLocalizedDate(job.deadline, locale)}
              </span>

              <Link href={applyHref} prefetch={false} className="internship-card__apply">
                <span>{t("actions.applyNow")}</span>
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
