"use client";

import type { CSSProperties } from "react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { useI18n } from "@/components/i18n-provider";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Company } from "@/data/platform";
import { translateSector } from "@/lib/i18n";
import { getLocalizedCompany } from "@/lib/platform-localization";

type FeaturedCompaniesCarouselProps = {
  items: Array<{ company: Company; openRoles: number }>;
};

export function FeaturedCompaniesCarousel({ items }: FeaturedCompaniesCarouselProps) {
  const { locale, t } = useI18n();

  if (items.length === 0) {
    return null;
  }

  const marqueeStyle = {
    "--marquee-duration": `${Math.max(items.length * 7, 22)}s`
  } as CSSProperties;

  return (
    <div className="companies-marquee marquee" style={marqueeStyle}>
      <div className="marquee__track">
        {[0, 1].map((groupIndex) => (
          <div key={groupIndex} className="marquee__group" aria-hidden={groupIndex === 1}>
            {items.map(({ company, openRoles }) => {
              const localizedCompany = getLocalizedCompany(company, locale);

              return (
                <article key={`${groupIndex}-${company.slug}`} className="featured-company-card">
                  <div className="featured-company-card__logo">
                    <CompanyLogoImage
                      name={company.name}
                      website={company.website}
                      logo={company.logo}
                      size={48}
                    />
                  </div>

                  <div className="featured-company-card__content">
                    <div className="featured-company-card__title-row">
                      <h3>{localizedCompany.name}</h3>
                      {localizedCompany.verified !== false ? (
                        <VerifiedBadge compact label={t("labels.verifiedCompany")} />
                      ) : null}
                    </div>
                    <p className="featured-company-card__industry">
                      {translateSector(locale, company.sector)}
                    </p>
                    <p className="featured-company-card__vacancies">
                      {t("labels.activeVacancies", { count: openRoles })}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
