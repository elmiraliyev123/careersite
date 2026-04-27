"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <main className="section">
      <div className="shell">
        <div className="empty-state empty-state--large">
          <p className="eyebrow">404</p>
          <h1>{t("notFound.title")}</h1>
          <p>{t("notFound.copy")}</p>
          <Link href="/" className="button button--primary">
            {t("actions.backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
