"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { usePathname } from "next/navigation";

import { useCandidateActivity } from "@/hooks/useCandidateActivity";

const hiddenPrefixes = ["/admin", "/adminlog", "/dashboard"];

export function SavedJobsDock() {
  const pathname = usePathname();
  const { savedItems } = useCandidateActivity();

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <div className="saved-dock">
      <div className="saved-dock__inner">
        <div className="saved-dock__launcher" data-saved-dock-target="true">
          <Bookmark size={18} />
        </div>

        <div className="saved-dock__items">
          {savedItems.length === 0 ? (
            <div className="saved-dock__empty">
              <span className="saved-dock__ghost" />
              <span className="saved-dock__ghost" />
            </div>
          ) : (
            savedItems.slice(0, 6).map((item) => (
              <Link
                key={item.slug}
                href={`/jobs/${item.slug}`}
                className="saved-dock__item"
                title={item.title}
              >
                {item.companyLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.companyLogo} alt={item.companyName} width={42} height={42} loading="lazy" />
                ) : (
                  <span>{item.companyName.slice(0, 2).toUpperCase()}</span>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
