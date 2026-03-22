"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";

type AiCoverLetterPromptProps = {
  jobTitle: string;
  companyName: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  city: string;
  workModel: string;
};

function buildPrompt({
  jobTitle,
  companyName,
  summary,
  responsibilities,
  requirements,
  benefits,
  city,
  workModel
}: AiCoverLetterPromptProps) {
  const responsibilitySummary = responsibilities.slice(0, 3).join("; ");
  const requirementsSummary = requirements.slice(0, 3).join("; ");
  const benefitsSummary = benefits.slice(0, 2).join("; ");

  return [
    "Act as an expert early-career career coach and cover letter writer.",
    `Write a tailored cover letter for the "${jobTitle}" role at "${companyName}".`,
    "Match the language of the job post and keep the tone sharp, concise, and confident.",
    "",
    "Use this context:",
    `- Job summary: ${summary}`,
    `- Location and work model: ${city}; ${workModel}`,
    `- Core responsibilities: ${responsibilitySummary}`,
    `- Key requirements: ${requirementsSummary}`,
    `- Benefits or team signals: ${benefitsSummary}`,
    "",
    "Instructions:",
    "- Keep it under 220 words.",
    "- Avoid generic filler and empty enthusiasm.",
    "- Mention 2 strengths that map directly to the role.",
    "- End with a clean, high-conviction closing paragraph."
  ].join("\n");
}

export function AiCoverLetterPrompt(props: AiCoverLetterPromptProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const {
    jobTitle,
    companyName,
    summary,
    responsibilities,
    requirements,
    benefits,
    city,
    workModel
  } = props;
  const prompt = useMemo(
    () =>
      buildPrompt({
        jobTitle,
        companyName,
        summary,
        responsibilities,
        requirements,
        benefits,
        city,
        workModel
      }),
    [jobTitle, companyName, summary, responsibilities, requirements, benefits, city, workModel]
  );

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="ai-prompt-card">
      <span className="ai-prompt-card__glow" aria-hidden="true" />

      <div className="ai-prompt-card__header">
        <div>
          <p className="eyebrow">{t("jobDetail.aiPromptEyebrow")}</p>
          <h2>{t("jobDetail.aiPromptTitle")}</h2>
        </div>
      </div>

      <div className="ai-prompt-card__body">
        <p className="ai-prompt-card__copy-text">{t("jobDetail.aiPromptCopy")}</p>

        <div className="ai-prompt-card__prompt-shell">
          <p className="ai-prompt-card__prompt">{prompt}</p>

          <div className="ai-prompt-card__footer">
            <p className="ai-prompt-card__hint">{t("jobDetail.aiPromptHint")}</p>

            <button
              type="button"
              className="ai-prompt-card__copy-pill"
              onClick={handleCopy}
              aria-label={copied ? t("actions.copied") : t("actions.copyPrompt")}
              title={copied ? t("actions.copied") : t("actions.copyPrompt")}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? t("actions.copied") : t("actions.copyPromptCta")}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
