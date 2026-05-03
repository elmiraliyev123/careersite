"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SessionActions } from "@/components/session-actions";
import { InlineImage } from "@/components/cms/inline-image";
import { InlineList } from "@/components/cms/inline-list";
import { useCms } from "@/components/cms-provider";
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
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/adminlog");
  const { draftData } = useCms();
  void companyCategories;

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

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  if (isAdminRoute) {
    return null;
  }

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
            <Link href="/" className="focused-header__brand" aria-label="Stradify">
              <InlineImage contentKey="site.logo" defaultSrc="/stradify-logo.png" className="brand__logo-img" width={64} height={36} />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const defaultPrimaryLinks = [
    { href: "/jobs", label: t("nav.jobs") },
    { href: "/companies", label: t("nav.companies") },
    { href: "/karyera-meslehetleri", label: t("nav.careerTips") },
    { href: "/for-employers", label: t("nav.employers") }
  ];
  const primaryLinks = (draftData?.site?.primaryLinks ?? defaultPrimaryLinks) as Array<{
    href: string;
    label: string;
  }>;

  return (
    <>
      <header className="mobile-header">
        <div className="shell mobile-header__inner">
          <Link href="/" className="brand brand--refined" aria-label="Stradify">
            <InlineImage contentKey="site.logo" defaultSrc="/stradify-logo.png" className="brand__logo-img" width={64} height={36} />
          </Link>

          <button
            type="button"
            className={`mobile-header__menu-button${isMobileMenuOpen ? " mobile-header__menu-button--open" : ""}`}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-label={isMobileMenuOpen ? t("actions.closeMenu") : t("nav.mainNavigation")}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className="mobile-header-spacer" aria-hidden="true" />

      {isMobileMenuOpen ? (
        <div
          id="mobile-navigation-drawer"
          className="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.mainNavigation")}
        >
          <div
            className="mobile-drawer__backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="mobile-drawer__inner">
            <div className="mobile-drawer__top">
              <Link
                href="/"
                className="brand brand--refined mobile-drawer__brand"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Stradify"
              >
                <InlineImage contentKey="site.logo" defaultSrc="/stradify-logo.png" className="brand__logo-img" width={64} height={36} />
              </Link>
              <button
                type="button"
                className="mobile-drawer__close"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label={t("actions.closeMenu")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-drawer__body">
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

              <div className="mobile-drawer__section mobile-drawer__section--language">
                <LanguageSwitcher compact onSelect={() => setIsMobileMenuOpen(false)} />
              </div>
            </div>

            <div className="mobile-drawer__footer">
              <SessionActions role={role} />
            </div>
          </div>
        </div>
      ) : null}

      <header className="site-header site-header--refined">
        <div className="shell site-header__inner">
          <Link href="/" className="brand brand--refined" aria-label="Stradify">
            <InlineImage contentKey="site.logo" defaultSrc="/stradify-logo.png" className="brand__logo-img" width={64} height={36} />
          </Link>

          <InlineList
            contentKey="site.primaryLinks"
            defaultItems={defaultPrimaryLinks}
            listClassName="site-nav site-nav--refined"
            itemTemplate={{ href: "/new-link", label: "New Link" }}
            renderItem={(item, i) => (
              <Link key={i} href={item.href} className="site-nav__link">
                {item.label}
              </Link>
            )}
          />

          <div className="site-header__actions site-header__actions--refined">
            <LanguageSwitcher className="language-switcher--refined" />
            <Link href="/for-employers" className="site-header__employer-link">
              {t("nav.employers")}
            </Link>
            <SessionActions role={role} />
          </div>
        </div>
      </header>
    </>
  );
}
