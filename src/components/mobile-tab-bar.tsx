"use client";

import Link from "next/link";
import { Bookmark, Building2, Home, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { useCandidateActivity } from "@/hooks/useCandidateActivity";

const hiddenPrefixes = ["/admin", "/adminlog", "/login", "/outbound"];

function isHiddenPath(pathname: string) {
  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return /^\/jobs\/[^/]+$/.test(pathname) || /^\/info\/students\/[^/]+$/.test(pathname);
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { savedItems } = useCandidateActivity();

  if (isHiddenPath(pathname)) {
    return null;
  }

  const items = [
    {
      href: "/",
      label: t("nav.home"),
      icon: Home,
      active: pathname === "/"
    },
    {
      href: "/jobs",
      label: t("nav.discover"),
      icon: Search,
      active: pathname === "/jobs"
    },
    {
      href: "/companies",
      label: t("nav.companies"),
      icon: Building2,
      active: pathname.startsWith("/companies")
    },
    {
      href: "/saved",
      label: t("nav.saved"),
      icon: Bookmark,
      active: pathname.startsWith("/saved"),
      badge: savedItems.length > 0 ? Math.min(savedItems.length, 9) : null
    }
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))] md:hidden"
      aria-label={t("nav.mainNavigation")}
    >
      <div className="mx-auto flex w-full max-w-[32rem] items-center justify-between rounded-[28px] border border-white/10 bg-[#0a0a0a]/80 px-3 py-2.5 shadow-[0_24px_64px_rgba(0,0,0,0.36)] backdrop-blur-xl">
        {items.map(({ href, label, icon: Icon, active, badge }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-2 text-[0.72rem] font-semibold tracking-[0.08em] transition ${
              active
                ? "bg-[#32CD32]/14 text-[#32CD32] shadow-[0_0_22px_rgba(50,205,50,0.18)]"
                : "text-white/65 active:scale-[0.98] active:bg-white/5 focus-visible:bg-white/5"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <span className="relative inline-flex items-center justify-center">
              <Icon size={20} />
              {badge ? (
                <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#32CD32] px-1 text-[0.62rem] font-bold leading-none text-[#071007]">
                  {badge}
                </span>
              ) : null}
            </span>
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
