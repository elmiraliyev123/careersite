"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Company, Job } from "@/data/platform";
import {
  formatLocalizedDate,
  translateCity,
  translateLevel,
  translateSector,
  translateWorkModel
} from "@/lib/i18n";
import { getLocalizedCompany, getLocalizedJob } from "@/lib/platform-localization";

type FeaturedListingsCarouselProps = {
  items: Array<{ job: Job; company: Company }>;
};

export function FeaturedListingsCarousel({ items }: FeaturedListingsCarouselProps) {
  const { locale, t } = useI18n();

  if (items.length === 0) {
    return null;
  }

  const marqueeStyle = {
    "--marquee-duration": `${Math.max(items.length * 8, 26)}s`
  } as CSSProperties;

  return (
    <div className="featured-carousel marquee" style={marqueeStyle}>
      <div className="marquee__track">
        {[0, 1].map((groupIndex) => (
          <div key={groupIndex} className="marquee__group" aria-hidden={groupIndex === 1}>
            {items.map(({ job, company }) => {
              const localizedJob = getLocalizedJob(job, locale);
              const localizedCompany = getLocalizedCompany(company, locale);

              return (
                <Link
                  key={`${groupIndex}-${job.slug}`}
                  href={`/jobs/${job.slug}`}
                  className="featured-banner"
                  tabIndex={groupIndex === 1 ? -1 : undefined}
                >
                  <div className="featured-banner__media">
                    <Image
                      src={company.cover}
                      alt={localizedJob.title}
                      fill
                      sizes="(max-width: 900px) 92vw, 40vw"
                    />
                  </div>

                  <div className="featured-banner__shade" />

                  <div className="featured-banner__content">
                    <div className="featured-banner__lead">
                      <div className="chip-row">
                        <span className="chip chip--accent">{translateLevel(locale, job.level)}</span>
                        <span className="chip">{localizedCompany.name}</span>
                        <span className="chip">{translateWorkModel(locale, job.workModel)}</span>
                      </div>

                      <div className="featured-banner__copy">
                        <div className="featured-banner__company-row">
                          <p className="featured-banner__company">{localizedCompany.name}</p>
                          <VerifiedBadge compact label={t("labels.verifiedCompany")} />
                        </div>
                        <p className="featured-banner__sector">
                          {translateSector(locale, company.sector)}
                        </p>
                        <h3>{localizedJob.title}</h3>
                        <p>{localizedJob.summary}</p>
                      </div>
                    </div>

                    <div className="featured-banner__meta">
                      <span>{translateCity(locale, job.city)}</span>
                      <span>{localizedJob.category}</span>
                      {job.sourceName ? (
                        <span>
                          {t("labels.source")}: {job.sourceName}
                        </span>
                      ) : null}
                      <span>
                        {t("labels.deadline")}: {formatLocalizedDate(job.deadline, locale)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
