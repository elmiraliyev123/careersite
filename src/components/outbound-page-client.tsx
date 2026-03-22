"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { useI18n } from "@/components/i18n-provider";
import type { ParsedOutboundState } from "@/lib/outbound";

export function OutboundPageClient({
  targetUrl,
  companyName,
  logoUrl,
  sourcePath,
  hostnameLabel
}: ParsedOutboundState) {
  const { t } = useI18n();

  useEffect(() => {
    if (!targetUrl) {
      return;
    }

    void fetch("/api/outbound/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        targetUrl,
        companyName,
        sourcePath,
        referrer: typeof document !== "undefined" ? document.referrer : undefined
      }),
      keepalive: true
    }).catch(() => {
      // Redirect should not be blocked by analytics failures.
    });

    const timeoutId = window.setTimeout(() => {
      window.location.replace(targetUrl);
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [companyName, sourcePath, targetUrl]);

  if (!targetUrl) {
    return (
      <main className="outbound-screen outbound-screen--invalid">
        <div className="outbound-shell">
          <section className="outbound-card">
            <div className="outbound-card__copy stack-sm">
              <p className="eyebrow">{t("outbound.invalidEyebrow")}</p>
              <h1>{t("outbound.invalidTitle")}</h1>
              <p className="outbound-copy">{t("outbound.invalidCopy")}</p>
            </div>

            <div className="outbound-actions">
              <Link href="/jobs" className="button button--primary">
                {t("actions.backToJobs")}
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="outbound-screen">
      <div className="outbound-shell">
        <section className="outbound-card">
          <div className="outbound-card__visual">
            <div className="outbound-node outbound-node--platform" aria-label="CareerApple">
              <span className="outbound-node__mark">CA</span>
              <span className="outbound-node__label">CareerApple</span>
            </div>

            <div className="outbound-connector" aria-hidden="true">
              <span className="outbound-connector__track" />
              <span className="outbound-connector__pulse" />
            </div>

            <div className="outbound-node outbound-node--company" aria-label={companyName}>
              <span className="outbound-node__logo">
                <CompanyLogoImage
                  name={companyName}
                  website={targetUrl}
                  logo={logoUrl ?? undefined}
                  size={58}
                  preferWebsiteLogo
                />
              </span>
              <span className="outbound-node__label">{companyName}</span>
            </div>
          </div>

          <div className="outbound-card__copy stack-sm">
            <p className="eyebrow">{t("outbound.eyebrow")}</p>
            <h1>{t("outbound.title", { company: companyName })}</h1>
            <p className="outbound-copy">{t("outbound.copy")}</p>
            <div className="outbound-pill">
              <ShieldCheck size={16} />
              <span>
                {t("outbound.secureHint")}
                {hostnameLabel ? ` ${hostnameLabel}` : ""}
              </span>
            </div>
          </div>

          <div className="outbound-progress" aria-hidden="true">
            <span className="outbound-progress__bar" />
          </div>

          <div className="outbound-actions">
            <a href={targetUrl} className="text-link">
              {t("outbound.fallbackCta")} <ArrowUpRight size={15} />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
