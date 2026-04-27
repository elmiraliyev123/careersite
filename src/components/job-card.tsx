"use client";

import type { MouseEvent, RefObject } from "react";
import { memo, useRef } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { CompanyNameWithBadge } from "@/components/company-name-with-badge";
import { useI18n } from "@/components/i18n-provider";
import { SaveJobButton } from "@/components/save-job-button";
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
  getMeaningfulTaxonomyValue,
  getMeaningfulText,
  getPublicLocationLabel,
  isMeaningfulLevel
} from "@/lib/ui-display";

type JobCardProps = {
  job: Job;
  company?: Company | null;
  sourcePath?: string;
};

function setSpotlightPosition(event: MouseEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
}

function JobCardComponent({ job, company }: JobCardProps) {
  const { locale, t } = useI18n();
  const localizedJob = getLocalizedJob(job, locale);
  const localizedCompany = company ? getLocalizedCompany(company, locale) : null;
  const companyLinkRef = useRef<HTMLAnchorElement | null>(null);
  const levelLabel = isMeaningfulLevel(job.level) ? translateLevel(locale, job.level) : null;
  const workModelLabel = getMeaningfulText(translateWorkModel(locale, job.workModel));
  const visibleTags = (localizedJob.tags.length > 0
    ? localizedJob.tags
    : [levelLabel, workModelLabel].filter((value): value is string => Boolean(value))
  ).slice(0, 3);
  const companySector = localizedCompany
    ? getMeaningfulTaxonomyValue(localizedCompany.sector)
    : null;
  const summary = getMeaningfulText(localizedJob.summary);
  const cityLabel = getPublicLocationLabel(translateCity(locale, job.city));
  const deadlineLabel = getMeaningfulText(formatLocalizedDate(job.deadline, locale));
  const hasMeta = Boolean(cityLabel || workModelLabel || deadlineLabel);

  return (
    <article
      className="job-card job-card--magnetic"
      onMouseMove={setSpotlightPosition}
      onMouseLeave={(event) => {
        event.currentTarget.style.removeProperty("--pointer-x");
        event.currentTarget.style.removeProperty("--pointer-y");
      }}
    >
      <span className="job-card__spotlight" aria-hidden="true" />

      <div className="job-card__top">
        {visibleTags.length > 0 ? (
          <div className="job-card__tags job-card__tags--top" aria-label={t("jobDetail.matchingTags")}>
            {visibleTags.map((tag) => (
              <span key={`${job.slug}-${tag}`} className="job-card__tag">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <span aria-hidden="true" />
        )}

        <SaveJobButton
          job={job}
          company={company}
          flyFromRef={companyLinkRef as RefObject<HTMLElement | null>}
        />
      </div>

      {localizedCompany ? (
        <Link href={`/companies/${localizedCompany.slug}`} className="job-card__brand" ref={companyLinkRef}>
          <span className="job-card__logo">
            <CompanyLogoImage
              name={localizedCompany.name}
              website={localizedCompany.website}
              logo={localizedCompany.logo}
              size={40}
            />
          </span>
          <span className="job-card__brand-copy">
            <CompanyNameWithBadge
              name={localizedCompany.name}
              verified={localizedCompany.verified}
              badgeLabel={t("labels.verifiedCompany")}
              compact
              className="job-card__company-name-row"
            />
            {companySector ? <span>{translateSector(locale, companySector)}</span> : null}
          </span>
        </Link>
      ) : null}

      <div className="job-card__body">
        <h3>{localizedJob.title}</h3>
        {summary ? <p className="job-card__summary">{summary}</p> : null}
      </div>

      {hasMeta ? (
        <div className="job-card__meta">
          {cityLabel ? (
            <span>
              <MapPin size={16} />
              {cityLabel}
            </span>
          ) : null}
          {workModelLabel ? (
            <span>
              <Sparkles size={16} />
              {workModelLabel}
            </span>
          ) : null}
          {deadlineLabel ? (
            <span>
              <CalendarDays size={16} />
              {t("labels.deadline")}: {deadlineLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="job-card__bottom">
        <Link href={`/jobs/${job.slug}`} className="job-card__detail-link">
          {t("actions.viewDetails")}
        </Link>
      </div>
    </article>
  );
}

export const JobCard = memo(JobCardComponent);
