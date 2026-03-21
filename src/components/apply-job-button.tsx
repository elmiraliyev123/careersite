"use client";

import { Check, Send } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { useCandidateActivity } from "@/hooks/useCandidateActivity";

type ApplyJobButtonProps = {
  slug: string;
  href: string;
};

export function ApplyJobButton({ slug, href }: ApplyJobButtonProps) {
  const { isApplied, applyToJob } = useCandidateActivity();
  const { t } = useI18n();
  const applied = isApplied(slug);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`button button--no-wrap ${applied ? "button--success" : "button--primary"}`}
      onClick={() => applyToJob(slug)}
    >
      {applied ? <Check size={16} /> : <Send size={16} />}
      <span>{applied ? t("actions.applied") : t("actions.applyNow")}</span>
    </a>
  );
}
