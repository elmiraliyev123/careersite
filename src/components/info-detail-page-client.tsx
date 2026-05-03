"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import type { InfoPage } from "@/lib/site-content";
import { translateFooterPage, translateFooterSection } from "@/lib/i18n";

type InfoDetailPageClientProps = {
  page: InfoPage;
};

function getPrimaryActionLabel(page: InfoPage, locale: string, t: (key: string, values?: Record<string, string | number>) => string) {
  if (page.ctaHref === "/jobs") {
    return t("actions.viewJobs");
  }

  if (page.ctaHref === "/for-employers") {
    return t("nav.employers");
  }

  if (page.ctaHref === "/") {
    return t("actions.backHome");
  }

  if (page.ctaHref.includes("demo-isteyi")) {
    return t("actions.requestDemo");
  }

  return locale === "az" ? page.ctaLabel : t("actions.learnMore");
}

export function InfoDetailPageClient({ page }: InfoDetailPageClientProps) {
  const { locale, t } = useI18n();
  const sectionLabel = translateFooterSection(locale, page.sectionSlug);
  const pageLabel = translateFooterPage(locale, page.slug);
  const displayPage =
    locale === "az"
      ? page
      : {
          ...page,
          title: t("info.localizedPageTitle", { label: pageLabel }),
          description: t("info.localizedPageDescription", { label: pageLabel }),
          intro: t("info.localizedPageIntro", { section: sectionLabel, label: pageLabel }),
          highlights: [
            t("info.localizedPageHighlight1"),
            t("info.localizedPageHighlight2"),
            t("info.localizedPageHighlight3")
          ],
          usefulness: t("info.localizedPageUsefulness")
        };

  return (
    <main className="section info-page">
      <div className="shell stack-lg">
        <div className="breadcrumb">
          <Link href="/">{t("info.home")}</Link>
          <span>/</span>
          <span>{sectionLabel}</span>
          <span>/</span>
          <span>{pageLabel}</span>
        </div>

        <section className="detail-hero">
          <div className="detail-hero__content">
            <p className="eyebrow">{sectionLabel}</p>
            <h1>{displayPage.title}</h1>
            <p className="detail-hero__summary">{displayPage.description}</p>
          </div>

          <div className="detail-hero__actions">
            <Link href={page.ctaHref} className="button button--primary">
              {getPrimaryActionLabel(page, locale, t)}
            </Link>
            <Link href="/jobs" className="button button--ghost">
              {t("actions.backToJobs")}
            </Link>
          </div>
        </section>

        <div className="detail-grid detail-grid--company">
          <section className="detail-panel">
            <p className="eyebrow">{t("info.quickOverviewEyebrow")}</p>
            <h2>{t("info.quickOverviewTitle")}</h2>
            <p className="info-copy">{displayPage.intro}</p>
          </section>

          <section className="detail-panel">
            <p className="eyebrow">{t("info.keyPointsEyebrow")}</p>
            <h2>{t("info.keyPointsTitle")}</h2>
            <ul className="bullet-list">
              {displayPage.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="detail-panel">
            <p className="eyebrow">{t("info.platformFlowEyebrow")}</p>
            <h2>{t("info.platformFlowTitle")}</h2>
            <div className="stack-sm">
              <p className="info-copy">{displayPage.usefulness ?? t("info.platformFlowCopy1")}</p>
              {!displayPage.usefulness ? <p className="info-copy">{t("info.platformFlowCopy2")}</p> : null}
            </div>
          </section>
        </div>

        <section className="cta-panel">
          <div>
            <p className="eyebrow">{t("info.nextStepEyebrow")}</p>
            <h2>{t("info.nextStepTitle", { label: pageLabel })}</h2>
            <p>{t("info.nextStepCopy")}</p>
          </div>
          <div className="cta-panel__actions">
            <Link href={page.ctaHref} className="button button--primary">
              {getPrimaryActionLabel(page, locale, t)}
            </Link>
            <Link href="/" className="button button--ghost">
              <Sparkles size={16} />
              {t("actions.backHome")}
            </Link>
            <Link href="/jobs" className="text-link">
              {t("actions.openFreshListings")} <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
