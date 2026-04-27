"use client";

import { Sparkles, Target, TriangleAlert, type LucideIcon } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { sanitizeText } from "@/lib/text-sanitizer";

type AiJobSummaryCardProps = {
  summary: string;
  requirements: string[];
  benefits: string[];
  responsibilities: string[];
};

function firstMeaningfulLine(values: string[]) {
  return values.map((value) => sanitizeText(value, { multiline: true })).find(Boolean) ?? "";
}

function firstSentence(value: string) {
  const sanitized = sanitizeText(value, { multiline: true });

  if (!sanitized) {
    return "";
  }

  const sentence = sanitized.split(/(?<=[.!?])\s+/)[0]?.trim();
  return sentence || sanitized;
}

export function AiJobSummaryCard({
  summary,
  requirements,
  benefits,
  responsibilities
}: AiJobSummaryCardProps) {
  const { t } = useI18n();

  const mission = firstSentence(summary) || firstMeaningfulLine(responsibilities);
  const dealbreaker = firstMeaningfulLine(requirements);
  const cultureVibe = firstMeaningfulLine(benefits);

  const points = [
    mission
      ? {
          Icon: Target,
          title: t("jobDetail.aiSummaryMission"),
          copy: mission
        }
      : null,
    dealbreaker
      ? {
          Icon: TriangleAlert,
          title: t("jobDetail.aiSummaryDealbreaker"),
          copy: dealbreaker
        }
      : null,
    cultureVibe
      ? {
          Icon: Sparkles,
          title: t("jobDetail.aiSummaryCulture"),
          copy: cultureVibe
        }
      : null
  ].filter((point): point is { Icon: LucideIcon; title: string; copy: string } => Boolean(point));

  if (points.length === 0) {
    return null;
  }

  return (
    <section className="ai-summary-card">
      <span className="ai-summary-card__glow" aria-hidden="true" />

      <div className="ai-summary-card__header">
        <div>
          <p className="eyebrow">{t("jobDetail.aiSummaryEyebrow")}</p>
          <h2>{t("jobDetail.aiSummaryTitle")}</h2>
        </div>
      </div>

      <ul className="ai-summary-card__list">
        {points.map(({ Icon, title, copy }) => (
          <li key={title} className="ai-summary-card__point">
            <span className="ai-summary-card__point-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <div className="ai-summary-card__point-body">
              <p className="ai-summary-card__point-label">{title}</p>
              <p className="ai-summary-card__point-copy">{copy}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
