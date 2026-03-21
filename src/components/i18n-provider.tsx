"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { defaultLocale, type Locale, localeCookieName, resolveLocale, translate } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: React.ReactNode;
  initialLocale?: Locale;
};

export function I18nProvider({
  children,
  initialLocale = defaultLocale
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const storedLocale = resolveLocale(window.localStorage.getItem(localeCookieName));

    setLocaleState((currentLocale) =>
      storedLocale === currentLocale ? currentLocale : storedLocale
    );
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(localeCookieName, locale);
    document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale: setLocaleState,
        t: (key, values) => translate(locale, key, values)
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}
