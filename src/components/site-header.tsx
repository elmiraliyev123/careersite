"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { CompaniesMegaMenu } from "@/components/companies-mega-menu";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SessionActions } from "@/components/session-actions";
import { type SessionRole } from "@/lib/session";

type SiteHeaderProps = {
  role: SessionRole | null;
  companyCategories: Array<{ name: string; count: number }>;
};

function getFocusedHeaderState(pathname: string) {
  if (pathname.startsWith("/outbound")) {
    return { hidden: true as const };
  }

  if (/^\/jobs\/[^/]+$/.test(pathname)) {
    return {
      hidden: false as const,
      href: "/jobs",
      eyebrowKey: "nav.jobs" as const
    };
  }

  if (/^\/info\/students\/[^/]+$/.test(pathname)) {
    return {
      hidden: false as const,
      href: "/karyera-meslehetleri",
      eyebrowKey: "nav.careerTips" as const
    };
  }

  return null;
}

export function SiteHeader({ role, companyCategories }: SiteHeaderProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const focusedHeader = getFocusedHeaderState(pathname);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isMobileMenuOpen]);

  if (focusedHeader?.hidden) {
    return null;
  }

  if (focusedHeader) {
    return (
      <header className="focused-header">
        <div className="shell focused-header__inner">
          <Link href={focusedHeader.href} className="focused-header__back">
            <ArrowLeft size={18} />
            <span>{t("actions.goBack")}</span>
          </Link>

          <div className="focused-header__context">
            <p>{t(focusedHeader.eyebrowKey)}</p>
            <Link href="/" className="focused-header__brand">
              <span className="brand__mark">CA</span>
              <span className="brand__text">CareerApple</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const primaryLinks = [
    { href: "/jobs", label: t("nav.jobs") },
    { href: "/companies", label: t("nav.companies") },
    { href: "/karyera-meslehetleri", label: t("nav.careerTips") },
    { href: "/for-employers", label: t("nav.employers") }
  ];

  return (
    <>
      <header className="mobile-header md:hidden">
        <div className="shell mobile-header__inner">
          <Link href="/" className="brand">
            <span className="brand__mark">CA</span>
            <span className="brand__text">CareerApple</span>
          </Link>

          <button
            type="button"
            className={`mobile-header__menu-button${isMobileMenuOpen ? " mobile-header__menu-button--open" : ""}`}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-label={isMobileMenuOpen ? t("actions.goBack") : t("nav.mainNavigation")}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className="mobile-header-spacer md:hidden" aria-hidden="true" />

      <button
        type="button"
        className={`mobile-drawer__overlay md:hidden${isMobileMenuOpen ? " mobile-drawer__overlay--visible" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-label={t("actions.goBack")}
        tabIndex={isMobileMenuOpen ? 0 : -1}
      />

      <aside
        id="mobile-navigation-drawer"
        className={`mobile-drawer md:hidden${isMobileMenuOpen ? " mobile-drawer--open" : ""}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mobile-drawer__panel">
          <div className="mobile-drawer__top">
            <Link href="/" className="brand" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="brand__mark">CA</span>
              <span className="brand__text">CareerApple</span>
            </Link>

            <button
              type="button"
              className="mobile-drawer__close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label={t("actions.goBack")}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="mobile-drawer__nav" aria-label={t("nav.mainNavigation")}>
            {primaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="mobile-drawer__link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mobile-drawer__footer">
            <LanguageSwitcher compact onSelect={() => setIsMobileMenuOpen(false)} />
            <SessionActions role={role} />
          </div>
        </div>
      </aside>

      <header className="site-header hidden md:block">
        <div className="shell site-header__inner">
          <Link href="/" className="brand">
            <span className="brand__mark">CA</span>
            <span className="brand__text">CareerApple</span>
          </Link>

          <nav className="site-nav" aria-label={t("nav.mainNavigation")}>
            <Link href="/jobs">{t("nav.jobs")}</Link>
            <CompaniesMegaMenu categories={companyCategories} />
            <Link href="/info/students/tecrube-proqramlari">{t("nav.students")}</Link>
            <Link href="/karyera-meslehetleri">{t("nav.careerTips")}</Link>
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
    </>
  );
}
