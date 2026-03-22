"use client";

import Link from "next/link";
import { Check, Send } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { useCandidateActivity } from "@/hooks/useCandidateActivity";
import { buildOutboundHref, isSafeExternalUrl } from "@/lib/outbound";

type ApplyJobButtonProps = {
  slug: string;
  href: string;
  companyName?: string;
  companyLogo?: string;
  sourcePath?: string;
  className?: string;
};

export function ApplyJobButton({
  slug,
  href,
  companyName,
  companyLogo,
  sourcePath,
  className
}: ApplyJobButtonProps) {
  const { isApplied, applyToJob } = useCandidateActivity();
  const { t } = useI18n();
  const applied = isApplied(slug);
  const safeApplyUrl = isSafeExternalUrl(href?.trim() ?? "") ? href.trim() : "";
  const hasApplyUrl = Boolean(safeApplyUrl);
  const outboundHref = hasApplyUrl
    ? buildOutboundHref({
        targetUrl: safeApplyUrl,
        companyName,
        logoUrl: companyLogo,
        sourcePath,
        fallbackHref: sourcePath ?? "/jobs"
      })
    : "";

  if (!hasApplyUrl) {
    return (
      <span
        className={`button button--ghost button--disabled ${className ?? ""}`.trim()}
        aria-disabled="true"
      >
        <span>{t("actions.applyLinkInactive")}</span>
      </span>
    );
  }

  return (
    <Link
      href={outboundHref}
      prefetch={false}
      target="_blank"
      rel="noopener noreferrer"
      className={`button button--no-wrap ${applied ? "button--success" : "button--primary"} ${className ?? ""}`.trim()}
      onClick={() => applyToJob(slug)}
    >
      {applied ? <Check size={16} /> : <Send size={16} />}
      <span>{applied ? t("actions.applied") : t("actions.applyNow")}</span>
    </Link>
  );
}
