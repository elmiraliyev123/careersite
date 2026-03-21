"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Globe, Users } from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { useI18n } from "@/components/i18n-provider";
import type { Company } from "@/data/platform";
import { VerifiedBadge } from "@/components/verified-badge";
import { translateSector } from "@/lib/i18n";
import { getLocalizedCompany } from "@/lib/platform-localization";

type CompanyCardProps = {
  company: Company;
  openRoles: number;
};

export function CompanyCard({ company, openRoles }: CompanyCardProps) {
  const { locale, t } = useI18n();
  const localizedCompany = getLocalizedCompany(company, locale);

  return (
    <article className="company-card">
      <Link href={`/companies/${company.slug}`} className="company-card__cover">
        <Image src={company.cover} alt={localizedCompany.name} fill sizes="(max-width: 900px) 100vw, 33vw" />
      </Link>

      <div className="company-card__body">
        <Link href={`/companies/${company.slug}`} className="company-card__logo">
          <CompanyLogoImage
            name={localizedCompany.name}
            website={company.website}
            logo={company.logo}
            size={48}
          />
        </Link>

        <div className="chip-row">
          <span className="chip chip--accent">{t("labels.openRoles", { count: openRoles })}</span>
          <span className="chip">{translateSector(locale, company.sector)}</span>
        </div>

        <Link href={`/companies/${company.slug}`} className="company-card__title-row">
          <h3>{localizedCompany.name}</h3>
          <VerifiedBadge compact label={t("labels.verifiedCompany")} />
        </Link>
        <p className="company-card__tagline">{localizedCompany.tagline}</p>

        <div className="company-card__meta">
          <span>
            <Users size={16} />
            {company.size}
          </span>
          <span>
            <Building2 size={16} />
            {company.location}
          </span>
          <span>
            <Globe size={16} />
            {company.website.replace("https://", "")}
          </span>
        </div>

        <a href={company.website} target="_blank" rel="noreferrer" className="company-card__link">
          {t("actions.officialSite")}
        </a>
      </div>
    </article>
  );
}
