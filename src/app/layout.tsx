import type { Metadata } from "next";
import { cookies } from "next/headers";

import { I18nProvider } from "@/components/i18n-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { localeCookieName, resolveLocale } from "@/lib/i18n";
import { getCompanyCategories } from "@/lib/platform";
import { getSessionRole } from "@/lib/session";

import { AdminEditToolbar } from "@/components/admin-edit-toolbar";
import { CmsProvider } from "@/components/cms-provider";
import { getCmsDocument } from "@/lib/platform-database";

import "./globals.css";

export const metadata: Metadata = {
  title: "Stradify | Gənclər üçün təcrübə və ilk iş platforması",
  description:
    "Azərbaycan bazarı üçün qurulan təcrübə, giriş səviyyəsi və mütəxəssis vakansiya platforması.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: "/apple-touch-icon.png"
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await getSessionRole();
  const isAdmin = role === "admin";
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(localeCookieName)?.value);
  const companyCategories = await getCompanyCategories();

  let cmsDoc: ReturnType<typeof getCmsDocument> = null;
  try {
    cmsDoc = getCmsDocument("site-content");
  } catch (error) {
    if (!isAdmin) {
      console.warn("SQLite unavailable, using fallback public data.", error);
    } else {
      throw error;
    }
  }

  const publishedData = cmsDoc?.publishedData || {};
  const draftData = isAdmin ? (cmsDoc?.draftData || publishedData) : {};

  return (
    <html lang={locale}>
      <body>
        <I18nProvider initialLocale={locale}>
          <CmsProvider isAdmin={isAdmin} initialPublishedData={publishedData} initialDraftData={draftData}>
            <div className="app-shell">
              <SiteHeader role={role} companyCategories={companyCategories} />
              <div className="page-content">{children}</div>
              <SiteFooter />
            </div>
            <AdminEditToolbar />
          </CmsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
