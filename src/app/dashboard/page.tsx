import { cookies } from "next/headers";

import { AccessGate } from "@/components/access-gate";
import { DashboardClient } from "@/components/dashboard-client";
import { localeCookieName, resolveLocale, translate } from "@/lib/i18n";
import { getCompanies, getJobs } from "@/lib/platform";
import { getSessionRole } from "@/lib/session";

export default async function DashboardPage() {
  const role = await getSessionRole();
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(localeCookieName)?.value);
  const t = (key: string) => translate(locale, key);

  if (!role) {
    return (
      <AccessGate
        eyebrow={t("dashboard.disabledEyebrow")}
        title={t("dashboard.disabledTitle")}
        description={t("dashboard.disabledCopy")}
        actionHref="/jobs"
        actionLabel={t("actions.viewJobs")}
      />
    );
  }

  if (role !== "candidate") {
    return (
      <AccessGate
        eyebrow={t("dashboard.roleMismatchEyebrow")}
        title={t("dashboard.roleMismatchTitle")}
        description={t("dashboard.roleMismatchCopy")}
        actionHref="/jobs"
        actionLabel={t("actions.viewJobs")}
      />
    );
  }

  return (
    <main className="section">
      <div className="shell stack-lg">
        <div className="page-hero">
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>{t("dashboard.title")}</h1>
          <p>{t("dashboard.copy")}</p>
        </div>

        <DashboardClient jobs={getJobs()} companies={getCompanies()} />
      </div>
    </main>
  );
}
