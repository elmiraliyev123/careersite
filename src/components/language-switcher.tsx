"use client";

import { supportedLocales } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="language-switcher" aria-label="Language switcher">
      {supportedLocales.map((item) => (
        <button
          key={item}
          type="button"
          className={`language-switcher__button${locale === item ? " language-switcher__button--active" : ""}`}
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
          aria-label={t(`languages.${item}`)}
        >
          {t(`languages.${item}`)}
        </button>
      ))}
    </div>
  );
}
