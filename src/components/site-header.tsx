"use client";

import Link from "next/link";

import { CompaniesMegaMenu } from "@/components/companies-mega-menu";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SessionActions } from "@/components/session-actions";
import { type SessionRole } from "@/lib/session";

type SiteHeaderProps = {
  role: SessionRole | null;
  companyCategories: Array<{ name: string; count: number }>;
};

export function SiteHeader({ role, companyCategories }: SiteHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link href="/" className="brand">
          <span className="brand__mark">CA</span>
          <span className="brand__text">CareerApple</span>
        </Link>

        <nav className="site-nav" aria-label={t("nav.mainNavigation")}>
          <Link href="/jobs">{t("nav.jobs")}</Link>
          <CompaniesMegaMenu categories={companyCategories} />
          <Link href="/info/students/tecrube-proqramlari">{t("nav.students")}</Link>
          <Link href="/info/students/karyera-meslehetleri">{t("nav.careerTips")}</Link>
        </nav>

        <div className="site-header__actions">
          <LanguageSwitcher />
          <Link href="/for-employers" className="button button--ghost">
            {t("nav.employers")}
          </Link>
          <SessionActions role={role} />
        </div>
      </div>
    </header>
  );
}
