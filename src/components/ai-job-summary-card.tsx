"use client";

import { Target, TriangleAlert, UserCheck, type LucideIcon } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { sanitizeText } from "@/lib/text-sanitizer";

type AiJobSummaryCardProps = {
  summary: string;
  requirements: string[];
  benefits: string[];
  responsibilities: string[];
};

const LOW_VALUE_SUMMARY_PATTERNS = [
  /^(?:company|function|working schedule|deadline|son müraciət|paylaşılıb|mənbə)\s*:/i,
  /^ştəri\b/i,
  /\b(?:gələn|gelen|olan|edən|eden|üçün|ucun|üzrə|uzre)\s+[a-zəıöüğçş]$/i,
  /\b(?:understand the role|culture vibe|team vibe|salary|benefit package)\b/i,
  /(?:^|\s)(?:null|undefined|\{\}|\[object object\])(?:\s|$)/i,
  /&[a-z][a-z0-9]+;?/i
];

function cleanSupportedPoint(value: string) {
  const sanitized = sanitizeText(value, { multiline: true })
    .replace(/\b(?:Company|Function|Working schedule|Deadline to apply|Deadline|Posted|Listed via)\s*:\s*[^.。\n]+/gi, " ")
    .replace(/\b(?:Şirkət|Funksiya|İş qrafiki|Son müraciət|Paylaşılıb|Mənbə)\s*:\s*[^.。\n]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized || LOW_VALUE_SUMMARY_PATTERNS.some((pattern) => pattern.test(sanitized))) {
    return "";
  }

  const sentence = sanitized.split(/(?<=[.!?])\s+/)[0]?.trim() || sanitized;
  const wordCount = sentence.split(/\s+/).filter(Boolean).length;

  if (
    wordCount < 4 ||
    sentence.length < 24 ||
    sentence.length > 220 ||
    /[:;,/-]$/.test(sentence) ||
    /^[a-z]/.test(sentence)
  ) {
    return "";
  }

  return sentence;
}

function firstMeaningfulLine(values: string[], used = new Set<string>()) {
  for (const value of values) {
    const point = cleanSupportedPoint(value);
    const key = point.toLocaleLowerCase("az");

    if (point && !used.has(key)) {
      used.add(key);
      return point;
    }
  }

  return "";
}

export function AiJobSummaryCard({
  summary,
  requirements,
  benefits,
  responsibilities
}: AiJobSummaryCardProps) {
  const { t } = useI18n();
  void benefits;
  const usedPoints = new Set<string>();

  const mission = firstMeaningfulLine(responsibilities, usedPoints) || firstMeaningfulLine([summary], usedPoints);
  const keySkill = firstMeaningfulLine(requirements, usedPoints);
  const suitableCandidate = firstMeaningfulLine(requirements.slice(1), usedPoints);

  const points = [
    mission
      ? {
          Icon: Target,
          title: t("jobDetail.aiSummaryMission"),
          copy: mission
        }
      : null,
    keySkill
      ? {
          Icon: TriangleAlert,
          title: t("jobDetail.aiSummaryDealbreaker"),
          copy: keySkill
        }
      : null,
    suitableCandidate
      ? {
          Icon: UserCheck,
          title: t("jobDetail.aiSummaryCulture"),
          copy: suitableCandidate
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
