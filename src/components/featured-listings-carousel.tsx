"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { CompanyNameWithBadge } from "@/components/company-name-with-badge";
import type { Company, Job } from "@/data/platform";
import {
  formatLocalizedDate,
  translateCity,
  translateLevel,
  translateSector,
  translateWorkModel
} from "@/lib/i18n";
import { getLocalizedCompany, getLocalizedJob } from "@/lib/platform-localization";
import {
  getDisplaySourceLabel,
  getMeaningfulTaxonomyValue,
  getMeaningfulText,
  getPublicLocationLabel,
  getReadablePublicText,
  isMeaningfulLevel
} from "@/lib/ui-display";

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
              const levelLabel = isMeaningfulLevel(job.level) ? translateLevel(locale, job.level) : null;
              const workModelLabel = getMeaningfulText(translateWorkModel(locale, job.workModel));
              const sectorLabel = getMeaningfulTaxonomyValue(localizedCompany.sector);
              const summary = getReadablePublicText(localizedJob.summary);
              const cityLabel = getPublicLocationLabel(translateCity(locale, job.city));
              const categoryLabel = getMeaningfulTaxonomyValue(localizedJob.category);
              const sourceLabel = getDisplaySourceLabel(job);
              const deadlineLabel = getMeaningfulText(formatLocalizedDate(job.deadline, locale));

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
                        {levelLabel ? <span className="chip chip--accent">{levelLabel}</span> : null}
                        <span className="chip">{localizedCompany.name}</span>
                        {workModelLabel ? <span className="chip">{workModelLabel}</span> : null}
                      </div>

                      <div className="featured-banner__copy">
                        <CompanyNameWithBadge
                          name={localizedCompany.name}
                          verified={localizedCompany.verified}
                          badgeLabel={t("labels.verifiedCompany")}
                          compact
                          className="featured-banner__company-row"
                          nameClassName="featured-banner__company"
                        />
                        {sectorLabel ? (
                          <p className="featured-banner__sector">
                            {translateSector(locale, sectorLabel)}
                          </p>
                        ) : null}
                        <h3>{localizedJob.title}</h3>
                        {summary ? <p>{summary}</p> : null}
                      </div>
                    </div>

                    <div className="featured-banner__meta">
                      {cityLabel ? <span>{cityLabel}</span> : null}
                      {categoryLabel ? <span>{categoryLabel}</span> : null}
                      {sourceLabel ? <span>{t("labels.source")}: {sourceLabel}</span> : null}
                      {deadlineLabel ? <span>{t("labels.deadline")}: {deadlineLabel}</span> : null}
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
