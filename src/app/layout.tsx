import type { Metadata } from "next";
import { cookies } from "next/headers";

import { I18nProvider } from "@/components/i18n-provider";
import { SavedJobsDock } from "@/components/saved-jobs-dock";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { localeCookieName, resolveLocale } from "@/lib/i18n";
import { getCompanyCategories } from "@/lib/platform";
import { getSessionRole } from "@/lib/session";

import "./globals.css";

export const metadata: Metadata = {
  title: "CareerApple | Gənclər üçün təcrübə və ilk iş platforması",
  description:
    "Azərbaycan bazarı üçün qurulan modern təcrübə, trainee və junior vakansiya platforması."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await getSessionRole();
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(localeCookieName)?.value);
  const companyCategories = getCompanyCategories();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider initialLocale={locale}>
          <div className="app-shell">
            <SiteHeader role={role} companyCategories={companyCategories} />
            <div className="page-content">{children}</div>
            <SavedJobsDock />
            <SiteFooter />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
