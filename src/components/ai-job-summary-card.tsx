"use client";

import { Sparkles } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { sanitizeText } from "@/lib/text-sanitizer";

type AiJobSummaryCardProps = {
  companyName: string;
  summary: string;
  requirements: string[];
  benefits: string[];
  responsibilities: string[];
  workModel: string;
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
  companyName,
  summary,
  requirements,
  benefits,
  responsibilities,
  workModel
}: AiJobSummaryCardProps) {
  const { t } = useI18n();

  const mission = firstSentence(summary) || firstMeaningfulLine(responsibilities);
  const dealbreaker = firstMeaningfulLine(requirements);
  const cultureVibe =
    firstMeaningfulLine(benefits) ||
    t("jobDetail.aiSummaryCultureFallback", { company: companyName, workModel });

  const points = [
    {
      emoji: "🎯",
      title: t("jobDetail.aiSummaryMission"),
      copy: mission
    },
    {
      emoji: "⚠️",
      title: t("jobDetail.aiSummaryDealbreaker"),
      copy: dealbreaker
    },
    {
      emoji: "💡",
      title: t("jobDetail.aiSummaryCulture"),
      copy: cultureVibe
    }
  ];

  return (
    <section className="ai-summary-card">
      <span className="ai-summary-card__glow" aria-hidden="true" />

      <div className="ai-summary-card__header">
        <span className="ai-summary-card__icon">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="eyebrow">{t("jobDetail.aiSummaryEyebrow")}</p>
          <h2>{t("jobDetail.aiSummaryTitle")}</h2>
          <p className="ai-summary-card__intro">{t("jobDetail.aiSummaryCopy")}</p>
        </div>
      </div>

      <div className="ai-summary-card__grid">
        {points.map((point) => (
          <article key={point.title} className="ai-summary-card__item">
            <p className="ai-summary-card__item-label">
              <span>{point.emoji}</span>
              <span>{point.title}</span>
            </p>
            <p className="ai-summary-card__item-copy">{point.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
