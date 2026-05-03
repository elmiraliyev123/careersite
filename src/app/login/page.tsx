import Link from "next/link";
import { cookies } from "next/headers";

import { localeCookieName, resolveLocale, translate } from "@/lib/i18n";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(localeCookieName)?.value);
  const t = (key: string) => translate(locale, key);

  return (
    <main className="section">
      <div className="shell">
        <div className="empty-state empty-state--large">
          <p className="eyebrow">{t("login.disabledEyebrow")}</p>
          <h1>{t("login.disabledTitle")}</h1>
          <p>
            {t("login.disabledCopy")}
          </p>
          <div className="hero-actions">
            <Link href="/jobs" className="button button--primary">
              {t("actions.viewJobs")}
            </Link>
            <Link href="/admin/login" className="button button--ghost">
              {t("login.adminLink")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
