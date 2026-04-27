/**
 * CompanyNameWithBadge — shared inline component for consistent name + verified badge rendering.
 *
 * Rules:
 * - Always inline-flex, align-items center, gap 6px
 * - Name text: visible, wraps if needed (overflow-wrap anywhere)
 * - Badge: flex-shrink 0, always directly beside the last visible character of the name
 * - No visible sr-only text rendered in DOM flow
 * - Never shows ellipsis after the badge
 * - Never renders badge on a separate line
 */

import type { HTMLAttributes } from "react";
import { VerifiedBadge } from "@/components/verified-badge";

type CompanyNameWithBadgeProps = {
  /** The company name text */
  name: string;
  /** Whether the company is verified. Pass false to hide the badge. */
  verified?: boolean | null;
  /** Aria-label for the verified badge (e.g. translated string) */
  badgeLabel?: string;
  /** Use compact (smaller) badge variant */
  compact?: boolean;
  /** Use profile (larger) badge variant */
  profile?: boolean;
  /** Optional className for the wrapper span */
  className?: string;
  /** Optional className for the name text span */
  nameClassName?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

export function CompanyNameWithBadge({
  name,
  verified,
  badgeLabel = "Verified",
  compact = true,
  profile = false,
  className,
  nameClassName,
  ...rest
}: CompanyNameWithBadgeProps) {
  const showBadge = verified !== false && verified !== null && verified !== undefined;

  return (
    <span
      className={`company-name-with-badge${className ? ` ${className}` : ""}`}
      style={{
        display: "inline-flex",
        minWidth: 0,
        maxWidth: "100%",
        alignItems: "center",
        gap: "6px"
      }}
      {...rest}
    >
      <span
        className={`company-name-with-badge__text${nameClassName ? ` ${nameClassName}` : ""}`}
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {name}
      </span>
      {showBadge ? (
        <VerifiedBadge compact={compact} profile={profile} label={badgeLabel} className="shrink-0" />
      ) : null}
    </span>
  );
}
