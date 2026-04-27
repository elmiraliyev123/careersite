"use client";

import type { CSSProperties } from "react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { CompanyNameWithBadge } from "@/components/company-name-with-badge";
import { useI18n } from "@/components/i18n-provider";
import type { Company } from "@/data/platform";
import { translateSector } from "@/lib/i18n";
import { getLocalizedCompany } from "@/lib/platform-localization";
import { getMeaningfulTaxonomyValue } from "@/lib/ui-display";

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
              const sectorLabel = getMeaningfulTaxonomyValue(localizedCompany.sector);

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
                    <CompanyNameWithBadge
                      name={localizedCompany.name}
                      verified={localizedCompany.verified}
                      badgeLabel={t("labels.verifiedCompany")}
                      compact
                      className="featured-company-card__title-row"
                    />
                    {sectorLabel ? (
                      <p className="featured-company-card__industry">
                        {translateSector(locale, sectorLabel)}
                      </p>
                    ) : null}
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
