"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { useI18n } from "@/components/i18n-provider";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Company } from "@/data/platform";
import { translateSector } from "@/lib/i18n";
import { getLocalizedCompany } from "@/lib/platform-localization";

type FeaturedEmployersCloudProps = {
  items: Array<{ company: Company; openRoles: number }>;
};

export function FeaturedEmployersCloud({ items }: FeaturedEmployersCloudProps) {
  const { locale, t } = useI18n();

  if (items.length === 0) {
    return null;
  }

  const marqueeStyle = {
    "--marquee-duration": `${Math.max(items.length * 6, 20)}s`
  } as CSSProperties;

  return (
    <div className="logo-cloud marquee" style={marqueeStyle}>
      <div className="marquee__track">
        {[0, 1].map((groupIndex) => (
          <div key={groupIndex} className="marquee__group" aria-hidden={groupIndex === 1}>
            {items.map(({ company, openRoles }) => {
              const localizedCompany = getLocalizedCompany(company, locale);

              return (
                <Link
                  key={`${groupIndex}-${company.slug}`}
                  href={`/companies/${company.slug}`}
                  className="logo-cloud__item"
                  tabIndex={groupIndex === 1 ? -1 : undefined}
                >
                  <span className="logo-cloud__orb">
                    <CompanyLogoImage
                      name={company.name}
                      website={company.website}
                      logo={company.logo}
                      size={42}
                    />
                  </span>
                  <span className="logo-cloud__copy">
                    <span className="logo-cloud__name">
                      {localizedCompany.name}
                      {localizedCompany.verified !== false ? (
                        <VerifiedBadge compact label={t("labels.verifiedCompany")} />
                      ) : null}
                    </span>
                    <span>{translateSector(locale, company.sector)}</span>
                    <span className="logo-cloud__vacancies">
                      {t("labels.activeVacancies", { count: openRoles })}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
