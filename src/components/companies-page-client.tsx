"use client";

import Link from "next/link";

import { CompanyCard } from "@/components/company-card";
import { useI18n } from "@/components/i18n-provider";
import type { Company } from "@/data/platform";
import { translateSector } from "@/lib/i18n";

type CompaniesPageClientProps = {
  companies: Array<{ company: Company; openRoles: number }>;
  selectedCategory?: string;
};

export function CompaniesPageClient({ companies, selectedCategory = "" }: CompaniesPageClientProps) {
  const { locale, t } = useI18n();
  const hasFilter = Boolean(selectedCategory);

  return (
    <main className="section">
      <div className="shell stack-lg">
        <div className="page-hero">
          <p className="eyebrow">{t("nav.companies")}</p>
          <h1>
            {hasFilter
              ? t("companiesPage.filteredTitle", { category: translateSector(locale, selectedCategory) })
              : t("companiesPage.title")}
          </h1>
          <p>{hasFilter ? t("companiesPage.filteredCopy") : t("companiesPage.copy")}</p>
          {hasFilter ? (
            <div className="chip-row page-hero__actions">
              <span className="chip chip--accent">{translateSector(locale, selectedCategory)}</span>
              <Link href="/companies" className="text-link">
                {t("companiesMenu.allCompanies")}
              </Link>
            </div>
          ) : null}
        </div>

        {companies.length === 0 ? (
          <div className="empty-state empty-state--large">
            <h3>{t("companiesPage.emptyTitle")}</h3>
            <p>{t("companiesPage.emptyCopy")}</p>
          </div>
        ) : (
          <div className="card-grid card-grid--companies">
            {companies.map(({ company, openRoles }) => (
              <CompanyCard key={company.slug} company={company} openRoles={openRoles} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
