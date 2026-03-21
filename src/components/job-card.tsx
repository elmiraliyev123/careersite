"use client";

import type { MouseEvent, RefObject } from "react";
import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, MapPin, Sparkles, Zap } from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { useI18n } from "@/components/i18n-provider";
import { SaveJobButton } from "@/components/save-job-button";
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

type JobCardProps = {
  job: Job;
  company?: Company | null;
};

function setSpotlightPosition(event: MouseEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
}

function getWorkModelIcon(workModel: Job["workModel"]) {
  if (workModel === "Hibrid") {
    return <Zap size={14} />;
  }

  return <Sparkles size={14} />;
}

export function JobCard({ job, company }: JobCardProps) {
  const { locale, t } = useI18n();
  const localizedJob = getLocalizedJob(job, locale);
  const localizedCompany = company ? getLocalizedCompany(company, locale) : null;
  const companyLinkRef = useRef<HTMLAnchorElement | null>(null);
  const applyHref = job.directCompanyUrl ?? company?.website ?? job.sourceUrl ?? `/jobs/${job.slug}`;

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
        <div className="job-pill-row">
          <span className="job-pill job-pill--live">
            <span className="job-pill__dot" />
            {t("labels.activeStatus")}
          </span>
          <span className="job-pill">
            <GraduationCap size={14} />
            {translateLevel(locale, job.level)}
          </span>
          <span className="job-pill">
            {getWorkModelIcon(job.workModel)}
            {translateWorkModel(locale, job.workModel)}
          </span>
        </div>

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
            <span className="job-card__company-name-row">
              <strong>{localizedCompany.name}</strong>
              <VerifiedBadge compact label={t("labels.verifiedCompany")} />
            </span>
            <span>{translateSector(locale, localizedCompany.sector)}</span>
          </span>
        </Link>
      ) : null}

      <div className="job-card__body">
        <h3>{localizedJob.title}</h3>
        <p className="job-card__summary">{localizedJob.summary}</p>
      </div>

      <div className="job-card__meta">
        <span>
          <MapPin size={16} />
          {translateCity(locale, job.city)}
        </span>
        <span>
          <Sparkles size={16} />
          {localizedJob.category}
        </span>
        <span>{t("labels.deadline")}: {formatLocalizedDate(job.deadline, locale)}</span>
      </div>

      <div className="job-card__bottom">
        <Link href={`/jobs/${job.slug}`} className="job-card__detail-link">
          {t("actions.viewDetails")}
        </Link>

        <a
          href={applyHref}
          target="_blank"
          rel="noreferrer"
          className="job-card__apply"
        >
          <span className="job-card__apply-icon">⚡</span>
          <span className="job-card__apply-label">{t("actions.applyNow")}</span>
          <ArrowUpRight size={16} />
        </a>
      </div>
    </article>
  );
}
