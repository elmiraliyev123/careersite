"use client";

import Link from "next/link";
import { BarChart3, ShieldCheck, UserRoundPlus } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";

export function EmployersPageClient() {
  const { t } = useI18n();

  return (
    <main className="section employers-page">
      <div className="shell stack-lg">
        <div className="page-hero">
          <p className="eyebrow">{t("employersPage.eyebrow")}</p>
          <h1>{t("employersPage.title")}</h1>
          <p>{t("employersPage.copy")}</p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <UserRoundPlus size={20} />
            <h3>{t("employersPage.feature1Title")}</h3>
            <p>{t("employersPage.feature1Copy")}</p>
          </article>
          <article className="feature-card">
            <BarChart3 size={20} />
            <h3>{t("employersPage.feature2Title")}</h3>
            <p>{t("employersPage.feature2Copy")}</p>
          </article>
          <article className="feature-card">
            <ShieldCheck size={20} />
            <h3>{t("employersPage.feature3Title")}</h3>
            <p>{t("employersPage.feature3Copy")}</p>
          </article>
        </div>

        <div className="cta-panel">
          <div>
            <p className="eyebrow">{t("employersPage.ctaEyebrow")}</p>
            <h2>{t("employersPage.ctaTitle")}</h2>
            <p>{t("employersPage.ctaCopy")}</p>
          </div>
          <div className="cta-panel__actions">
            <Link href="/info/employers/demo-isteyi" className="button button--primary">
              {t("actions.requestDemo")}
            </Link>
            <Link href="/jobs" className="button button--ghost">
              {t("employersPage.ctaSecondary")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
