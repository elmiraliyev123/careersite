"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Cloud,
  Clock3,
  Code2,
  Coffee,
  Database,
  Globe2,
  House,
  KanbanSquare,
  Laptop,
  MessageSquare,
  Orbit,
  PenTool,
  ShieldCheck,
  Sparkles,
  Workflow
} from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import type { Company } from "@/data/platform";
import {
  getLocalizedCompanyVibeProfile,
  type CompanyPerkIconKey,
  type CompanyTechIconKey
} from "@/lib/company-vibes";

const techIcons: Record<CompanyTechIconKey, LucideIcon> = {
  figma: PenTool,
  board: KanbanSquare,
  react: Orbit,
  message: MessageSquare,
  database: Database,
  code: Code2,
  cloud: Cloud,
  chart: BarChart3,
  shield: ShieldCheck,
  workflow: Workflow,
  sparkles: Sparkles
};

const perkIcons: Record<CompanyPerkIconKey, LucideIcon> = {
  laptop: Laptop,
  home: House,
  coffee: Coffee,
  book: BookOpen,
  globe: Globe2,
  clock: Clock3,
  sparkles: Sparkles,
  shield: ShieldCheck
};

type CompanyVibeGridProps = {
  company: Company;
};

export function CompanyVibeGrid({ company }: CompanyVibeGridProps) {
  const { locale, t } = useI18n();
  const profile = getLocalizedCompanyVibeProfile(company, locale);

  return (
    <section className="stack-md">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">{t("companyPage.vibeSectionEyebrow")}</p>
          <h2>{t("companyPage.vibeSectionTitle")}</h2>
        </div>
      </div>

      <div className="company-vibe-grid">
        <article className="company-bento company-bento--stack">
          <div className="company-bento__head">
            <div>
              <p className="company-bento__eyebrow">{t("companyPage.techStackEyebrow")}</p>
              <h3>{t("companyPage.techStackTitle")}</h3>
            </div>
          </div>

          <div className="company-tech-list">
            {profile.techStack.map((item) => {
              const Icon = techIcons[item.icon];

              return (
                <div key={`${company.slug}-${item.label}`} className="company-tech-item">
                  <span className="company-tech-item__icon">
                    <Icon size={16} />
                  </span>
                  <strong>{item.label}</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className="company-bento company-bento--vibe">
          <div className="company-bento__head">
            <div>
              <p className="company-bento__eyebrow">{t("companyPage.vibeEyebrow")}</p>
              <h3>{t("companyPage.vibeTitle")}</h3>
            </div>
          </div>

          <div className="company-vibe-row" aria-label={t("companyPage.vibeTitle")}>
            {profile.vibe.map((emoji, index) => (
              <span key={`${company.slug}-vibe-${index}`} className="company-vibe-emoji">
                {emoji}
              </span>
            ))}
          </div>
        </article>

        <article className="company-bento company-bento--perks">
          <div className="company-bento__head">
            <div>
              <p className="company-bento__eyebrow">{t("companyPage.cultureEyebrow")}</p>
              <h3>{t("companyPage.cultureTitle")}</h3>
            </div>
          </div>

          <ul className="company-perks-list">
            {profile.perks.map((perk) => {
              const Icon = perkIcons[perk.icon];

              return (
                <li key={`${company.slug}-${perk.label}`}>
                  <span className="company-perks-list__icon">
                    <Icon size={16} />
                  </span>
                  <span>{perk.label}</span>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
