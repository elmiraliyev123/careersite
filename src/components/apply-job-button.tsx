"use client";

import Link from "next/link";
import { Check, Send } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { useCandidateActivity } from "@/hooks/useCandidateActivity";
import { buildOutboundHref } from "@/lib/outbound";

type ApplyJobButtonProps = {
  slug: string;
  href: string;
  companyName?: string;
  companyLogo?: string;
  sourcePath?: string;
};

export function ApplyJobButton({ slug, href, companyName, companyLogo, sourcePath }: ApplyJobButtonProps) {
  const { isApplied, applyToJob } = useCandidateActivity();
  const { t } = useI18n();
  const applied = isApplied(slug);
  const outboundHref = buildOutboundHref({
    targetUrl: href,
    companyName,
    logoUrl: companyLogo,
    sourcePath,
    fallbackHref: `/jobs/${slug}`
  });

  return (
    <Link
      href={outboundHref}
      prefetch={false}
      className={`button button--no-wrap ${applied ? "button--success" : "button--primary"}`}
      onClick={() => applyToJob(slug)}
    >
      {applied ? <Check size={16} /> : <Send size={16} />}
      <span>{applied ? t("actions.applied") : t("actions.applyNow")}</span>
    </Link>
  );
}
