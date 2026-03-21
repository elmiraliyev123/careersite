"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { translateFooterPage, translateFooterSection } from "@/lib/i18n";
import { getFooterSections } from "@/lib/site-content";

export function SiteFooter() {
  const sections = getFooterSections();
  const { locale, t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="shell site-footer__grid">
        <div className="site-footer__intro">
          <p className="eyebrow">{t("footer.eyebrow")}</p>
          <h3>{t("footer.introTitle")}</h3>
          <p className="site-footer__copy">{t("footer.introCopy")}</p>
          <div className="site-footer__quicklinks">
            <Link href="/jobs">{t("footer.quickLinks.jobs")}</Link>
            <Link href="/for-employers">{t("footer.quickLinks.employers")}</Link>
            <Link href="/info/company/haqqimizda">{t("footer.quickLinks.about")}</Link>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.slug}>
            <p className="site-footer__title">{translateFooterSection(locale, section.slug)}</p>
            <div className="site-footer__links">
              {section.pages.map((page) => (
                <Link key={page.href} href={page.href}>
                  {translateFooterPage(locale, page.href.split("/").pop() ?? page.label)}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
