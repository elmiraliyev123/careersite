"use client";

import { useState } from "react";
import { ChevronDown, Globe } from "lucide-react";

import { supportedLocales } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";

type LanguageSwitcherProps = {
  compact?: boolean;
  className?: string;
  onSelect?: () => void;
};

export function LanguageSwitcher({
  compact = false,
  className,
  onSelect
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const availableLocales = supportedLocales.filter((item) => item !== locale);

  return (
    <div
      className={`language-switcher${compact ? " language-switcher--compact" : " language-switcher--dropdown"} ${className ?? ""}`.trim()}
      aria-label="Language switcher"
    >
      <button
        type="button"
        className={`language-switcher__trigger${isOpen ? " language-switcher__trigger--open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="language-switcher__trigger-copy">
          <Globe size={16} />
          <span>{t(`languages.${locale}`)}</span>
        </span>
        <ChevronDown size={16} className={`language-switcher__caret${isOpen ? " language-switcher__caret--open" : ""}`} />
      </button>

      {isOpen ? (
        <div className="language-switcher__menu">
          {availableLocales.map((item) => (
            <button
              key={item}
              type="button"
              className="language-switcher__menu-item"
              onClick={() => {
                setLocale(item);
                setIsOpen(false);
                onSelect?.();
              }}
            >
              <span className="language-switcher__menu-item-copy">
                <Globe size={15} />
                <span>{t(`languages.${item}`)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
