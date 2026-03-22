"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { getLocalizedPlaybookArticles } from "@/lib/playbook";

export function PlaybookPageClient() {
  const { locale, t } = useI18n();
  const articles = getLocalizedPlaybookArticles(locale);

  return (
    <main className="section">
      <div className="shell stack-lg">
        <div className="page-hero playbook-hero">
          <p className="eyebrow">{t("playbook.eyebrow")}</p>
          <h1>{t("playbook.title")}</h1>
          <p>{t("playbook.copy")}</p>
        </div>

        <section className="stack-md">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">{t("playbook.gridEyebrow")}</p>
              <h2>{t("playbook.gridTitle")}</h2>
            </div>

            <Link href="/jobs" className="text-link">
              {t("actions.viewJobs")} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="playbook-grid">
            {articles.map((article) => {
              const mediaStyle = {
                "--playbook-gradient": article.gradient
              } as CSSProperties;

              return (
                <article
                  key={article.slug}
                  className={`playbook-card playbook-card--${article.layout}`}
                >
                  <div className="playbook-card__meta">
                    <span className="playbook-card__tag">#{article.tag}</span>
                    <span className="playbook-card__reading-time">
                      <Clock3 size={14} />
                      {t("playbook.readTime", { minutes: article.readTime })}
                    </span>
                  </div>

                  <div className="playbook-card__copy">
                    <h2>{article.title}</h2>
                    <p>{article.excerpt}</p>
                  </div>

                  <div className="playbook-card__media" style={mediaStyle}>
                    <span className="playbook-card__visual">{article.visualLabel}</span>
                    <span className="playbook-card__orb" aria-hidden="true" />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="cta-panel">
          <div>
            <p className="eyebrow">{t("playbook.ctaEyebrow")}</p>
            <h2>{t("playbook.ctaTitle")}</h2>
            <p>{t("playbook.ctaCopy")}</p>
          </div>

          <div className="cta-panel__actions">
            <Link href="/jobs" className="button button--primary">
              {t("actions.viewJobs")}
            </Link>
            <Link href="/companies" className="button button--ghost">
              {t("nav.companies")}
            </Link>
            <Link href="/" className="text-link">
              <Sparkles size={16} />
              {t("actions.backHome")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
