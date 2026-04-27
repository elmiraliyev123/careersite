"use client";

import { memo } from "react";
import Link from "next/link";
import { Building2, Globe, Users } from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { CompanyNameWithBadge } from "@/components/company-name-with-badge";
import { useI18n } from "@/components/i18n-provider";
import type { Company } from "@/data/platform";
import { translateSector } from "@/lib/i18n";
import { buildOutboundHref } from "@/lib/outbound";
import { getLocalizedCompany } from "@/lib/platform-localization";
import {
  getDisplayDomain,
  getMeaningfulMetadataValue,
  getMeaningfulTaxonomyValue,
  getMeaningfulText,
  getPublicLocationLabel
} from "@/lib/ui-display";

type CompanyCardProps = {
  company: Company;
  openRoles: number;
  priority?: boolean;
};

function CompanyCardComponent({ company, openRoles, priority = false }: CompanyCardProps) {
  void priority;
  const { locale, t } = useI18n();
  const localizedCompany = getLocalizedCompany(company, locale);
  const sectorLabel = getMeaningfulTaxonomyValue(localizedCompany.sector);
  const websiteDomain = getDisplayDomain(company.website);
  const sizeLabel = getMeaningfulMetadataValue(company.size);
  const locationLabel = getPublicLocationLabel(localizedCompany.location);
  const tagline = getMeaningfulText(localizedCompany.tagline);
  const outboundWebsiteHref = buildOutboundHref({
    targetUrl: company.website,
    companyName: localizedCompany.name,
    logoUrl: company.logo,
    sourcePath: "/companies",
    fallbackHref: `/companies/${company.slug}`
  });
  const primaryLinkLabel =
    localizedCompany.verified === false ? t("labels.source") : t("actions.officialSite");

  return (
    <article className="company-card">
      <div className="company-card__body">
        <Link href={`/companies/${company.slug}`} className="company-card__head">
          <span className="company-card__logo">
            <CompanyLogoImage
              name={localizedCompany.name}
              website={company.website}
              logo={company.logo}
              size={48}
            />
          </span>
          <span className="company-card__identity">
            <CompanyNameWithBadge
              name={localizedCompany.name}
              verified={localizedCompany.verified}
              badgeLabel={t("labels.verifiedCompany")}
              compact
              className="company-card__title-row"
            />
            <span className="company-card__role-count">
              {t("labels.openRoles", { count: openRoles })}
            </span>
          </span>
        </Link>

        {sectorLabel ? (
          <div className="chip-row">
            <span className="chip">{translateSector(locale, sectorLabel)}</span>
          </div>
        ) : null}
        {tagline ? <p className="company-card__tagline">{tagline}</p> : null}

        {sizeLabel || locationLabel || websiteDomain ? (
          <div className="company-card__meta">
            {sizeLabel ? (
              <span>
                <Users size={16} />
                {sizeLabel}
              </span>
            ) : null}
            {locationLabel ? (
              <span>
                <Building2 size={16} />
                {locationLabel}
              </span>
            ) : null}
            {websiteDomain ? (
              <span>
                <Globe size={16} />
                {websiteDomain}
              </span>
            ) : null}
          </div>
        ) : null}

        <Link href={outboundWebsiteHref} prefetch={false} className="company-card__link">
          {primaryLinkLabel}
        </Link>
      </div>
    </article>
  );
}

export const CompanyCard = memo(CompanyCardComponent);
