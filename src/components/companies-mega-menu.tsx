"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Flame,
  Fuel,
  Landmark,
  Paintbrush2,
  ShieldCheck,
  ShoppingBag,
  Wallet
} from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { translateSector } from "@/lib/i18n";

type CompanyCategory = {
  name: string;
  count: number;
};

type CompaniesMegaMenuProps = {
  categories: CompanyCategory[];
};

function getSectorIcon(sector: string) {
  const normalized = sector.toLowerCase();

  if (normalized.includes("fintex") || normalized.includes("ödəniş") || normalized.includes("bank")) {
    return Landmark;
  }

  if (normalized.includes("saas")) {
    return Blocks;
  }

  if (normalized.includes("commerce")) {
    return ShoppingBag;
  }

  if (normalized.includes("enerji")) {
    return Fuel;
  }

  if (normalized.includes("dizayn")) {
    return Paintbrush2;
  }

  if (normalized.includes("sığorta") || normalized.includes("risk")) {
    return ShieldCheck;
  }

  if (normalized.includes("fmcg")) {
    return Flame;
  }

  if (normalized.includes("construction")) {
    return BriefcaseBusiness;
  }

  if (normalized.includes("platform")) {
    return Wallet;
  }

  return Building2;
}

function useIsMobileBreakpoint() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 820px)");
    const sync = () => setIsMobile(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  return isMobile;
}

export function CompaniesMegaMenu({ categories }: CompaniesMegaMenuProps) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const isMobile = useIsMobileBreakpoint();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelId = "companies-mega-menu-panel";
  const isMultiColumn = categories.length > 6;

  const localizedCategories = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        label: translateSector(locale, category.name)
      })),
    [categories, locale]
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname, locale]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleTriggerClick() {
    setOpen((current) => !current);
  }

  return (
    <div
      className={`mega-menu${open ? " mega-menu--open" : ""}`}
      ref={containerRef}
      onMouseEnter={() => {
        if (!isMobile) {
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (!isMobile) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="mega-menu__trigger"
        onClick={handleTriggerClick}
        onFocus={() => {
          if (!isMobile) {
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span>{t("nav.companies")}</span>
        <ChevronDown className={`mega-menu__caret${open ? " mega-menu__caret--open" : ""}`} size={16} aria-hidden="true" />
      </button>

      <div
        id={panelId}
        className={`mega-menu__panel${isMultiColumn ? " mega-menu__panel--grid" : ""}`}
        aria-hidden={!open}
      >
        <div className="mega-menu__header">
          <div>
            <p className="mega-menu__eyebrow">{t("nav.companies")}</p>
            <h3>{t("companiesMenu.title")}</h3>
          </div>
          <Link href="/companies" className="mega-menu__all-link" onClick={() => setOpen(false)}>
            {t("companiesMenu.allCompanies")}
          </Link>
        </div>

        <div className={`mega-menu__grid${isMultiColumn ? " mega-menu__grid--two" : ""}`}>
          {localizedCategories.map((category) => {
            const Icon = getSectorIcon(category.name);

            return (
              <Link
                key={category.name}
                href={`/companies?category=${encodeURIComponent(category.name)}`}
                className="mega-menu__item"
                onClick={() => setOpen(false)}
              >
                <span className="mega-menu__icon">
                  <Icon size={16} />
                </span>
                <span className="mega-menu__copy">
                  <strong>{category.label}</strong>
                  <span>{t("labels.activeCompanies", { count: category.count })}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
