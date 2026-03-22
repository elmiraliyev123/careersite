import type { Company } from "@/data/platform";
import type { Locale } from "@/lib/i18n";
import { createLocalizedText, getLocalizedText, type LocalizedContentValue } from "@/lib/localized-content";

export type CompanyTechIconKey =
  | "figma"
  | "board"
  | "react"
  | "message"
  | "database"
  | "code"
  | "cloud"
  | "chart"
  | "shield"
  | "workflow"
  | "sparkles";

export type CompanyPerkIconKey =
  | "laptop"
  | "home"
  | "coffee"
  | "book"
  | "globe"
  | "clock"
  | "sparkles"
  | "shield";

type CompanyTechSignal = {
  label: string;
  icon: CompanyTechIconKey;
};

type CompanyPerkSignal = {
  label: LocalizedContentValue;
  icon: CompanyPerkIconKey;
};

type CompanyVibeProfile = {
  techStack: CompanyTechSignal[];
  perks: CompanyPerkSignal[];
  vibe: string[];
};

const perkLabels = {
  macbook: createLocalizedText("MacBook verilir", "MacBook provided", "Выдают MacBook"),
  hybrid: createLocalizedText("Hibrid iş ritmi", "Hybrid work rhythm", "Гибридный ритм работы"),
  coffee: createLocalizedText("Qəhvə və fokus zonaları", "Coffee and focus zones", "Кофе и зоны для фокуса"),
  learning: createLocalizedText("Öyrənmə büdcəsi və review sessiyaları", "Learning budget and review sessions", "Бюджет на обучение и review-сессии"),
  global: createLocalizedText("Qlobal komanda overlap-ı", "Global team overlap", "Пересечение с глобальной командой"),
  flexible: createLocalizedText("Elastik fokus saatları", "Flexible focus hours", "Гибкие часы для фокуса"),
  secure: createLocalizedText("Strukturlaşdırılmış onboarding və mentorluq", "Structured onboarding and mentoring", "Структурированный онбординг и менторство"),
  calm: createLocalizedText("Sakit, yüksək-konsentrasiya iş axını", "Calm, high-focus work cadence", "Спокойный ритм с высокой концентрацией")
} as const;

const defaultProfile: CompanyVibeProfile = {
  techStack: [
    { label: "Figma", icon: "figma" },
    { label: "Jira", icon: "board" },
    { label: "React", icon: "react" },
    { label: "SQL", icon: "database" },
    { label: "Slack", icon: "message" }
  ],
  perks: [
    { label: perkLabels.macbook, icon: "laptop" },
    { label: perkLabels.hybrid, icon: "home" },
    { label: perkLabels.learning, icon: "book" },
    { label: perkLabels.coffee, icon: "coffee" }
  ],
  vibe: ["🚀", "🧠", "🤝"]
};

const sectorProfiles: Partial<Record<Company["sector"], CompanyVibeProfile>> = {
  "Produktivlik SaaS": {
    techStack: [
      { label: "Notion", icon: "workflow" },
      { label: "Amplitude", icon: "chart" },
      { label: "React", icon: "react" },
      { label: "SQL", icon: "database" },
      { label: "Slack", icon: "message" }
    ],
    perks: [
      { label: perkLabels.macbook, icon: "laptop" },
      { label: perkLabels.hybrid, icon: "home" },
      { label: perkLabels.learning, icon: "book" },
      { label: perkLabels.calm, icon: "clock" }
    ],
    vibe: ["🧩", "🌿", "🧠"]
  },
  "Dizayn texnologiyaları": {
    techStack: [
      { label: "Figma", icon: "figma" },
      { label: "FigJam", icon: "sparkles" },
      { label: "Jira", icon: "board" },
      { label: "React", icon: "react" },
      { label: "Maze", icon: "workflow" }
    ],
    perks: [
      { label: perkLabels.macbook, icon: "laptop" },
      { label: perkLabels.global, icon: "globe" },
      { label: perkLabels.learning, icon: "book" },
      { label: perkLabels.flexible, icon: "clock" }
    ],
    vibe: ["🎨", "⚡", "🫶"]
  },
  Fintex: {
    techStack: [
      { label: "React", icon: "react" },
      { label: "Looker", icon: "chart" },
      { label: "Jira", icon: "board" },
      { label: "SQL", icon: "database" },
      { label: "Miro", icon: "workflow" }
    ],
    perks: [
      { label: perkLabels.macbook, icon: "laptop" },
      { label: perkLabels.hybrid, icon: "home" },
      { label: perkLabels.global, icon: "globe" },
      { label: perkLabels.flexible, icon: "clock" }
    ],
    vibe: ["⚡", "📈", "🧠"]
  },
  "Commerce platform": {
    techStack: [
      { label: "React", icon: "react" },
      { label: "Zendesk", icon: "message" },
      { label: "Looker", icon: "chart" },
      { label: "Jira", icon: "board" },
      { label: "SQL", icon: "database" }
    ],
    perks: [
      { label: perkLabels.global, icon: "globe" },
      { label: perkLabels.learning, icon: "book" },
      { label: perkLabels.flexible, icon: "clock" },
      { label: perkLabels.coffee, icon: "coffee" }
    ],
    vibe: ["🛍️", "🌍", "🤝"]
  },
  "Qlobal ödənişlər": {
    techStack: [
      { label: "SQL", icon: "database" },
      { label: "Python", icon: "code" },
      { label: "Jira", icon: "board" },
      { label: "React", icon: "react" },
      { label: "Slack", icon: "message" }
    ],
    perks: [
      { label: perkLabels.hybrid, icon: "home" },
      { label: perkLabels.global, icon: "globe" },
      { label: perkLabels.learning, icon: "book" },
      { label: perkLabels.calm, icon: "clock" }
    ],
    vibe: ["💸", "🧠", "🌐"]
  },
  "Bank və rəqəmsal məhsullar": {
    techStack: [
      { label: "React", icon: "react" },
      { label: "Jira", icon: "board" },
      { label: "SQL", icon: "database" },
      { label: "Figma", icon: "figma" },
      { label: "Azure", icon: "cloud" }
    ],
    perks: [
      { label: perkLabels.macbook, icon: "laptop" },
      { label: perkLabels.hybrid, icon: "home" },
      { label: perkLabels.secure, icon: "shield" },
      { label: perkLabels.coffee, icon: "coffee" }
    ],
    vibe: ["🏦", "🚀", "🤝"]
  },
  "Sığorta və müştəri təcrübəsi": {
    techStack: [
      { label: "Jira", icon: "board" },
      { label: "Miro", icon: "workflow" },
      { label: "Looker", icon: "chart" },
      { label: "Slack", icon: "message" },
      { label: "SQL", icon: "database" }
    ],
    perks: [
      { label: perkLabels.hybrid, icon: "home" },
      { label: perkLabels.secure, icon: "shield" },
      { label: perkLabels.coffee, icon: "coffee" },
      { label: perkLabels.learning, icon: "book" }
    ],
    vibe: ["🤝", "📊", "🌱"]
  },
  FMCG: {
    techStack: [
      { label: "Nielsen", icon: "chart" },
      { label: "Power BI", icon: "chart" },
      { label: "Jira", icon: "board" },
      { label: "Slack", icon: "message" },
      { label: "Excel", icon: "database" }
    ],
    perks: [
      { label: perkLabels.hybrid, icon: "home" },
      { label: perkLabels.global, icon: "globe" },
      { label: perkLabels.coffee, icon: "coffee" },
      { label: perkLabels.learning, icon: "book" }
    ],
    vibe: ["🥤", "📣", "⚡"]
  },
  "Construction tech": {
    techStack: [
      { label: ".NET", icon: "code" },
      { label: "React", icon: "react" },
      { label: "Jira", icon: "board" },
      { label: "SQL", icon: "database" },
      { label: "Figma", icon: "figma" }
    ],
    perks: [
      { label: perkLabels.macbook, icon: "laptop" },
      { label: perkLabels.secure, icon: "shield" },
      { label: perkLabels.coffee, icon: "coffee" },
      { label: perkLabels.calm, icon: "clock" }
    ],
    vibe: ["🏗️", "🛠️", "🧠"]
  },
  "Sığorta və risk": {
    techStack: [
      { label: "SQL", icon: "database" },
      { label: "Power BI", icon: "chart" },
      { label: "Jira", icon: "board" },
      { label: "Slack", icon: "message" },
      { label: "Python", icon: "code" }
    ],
    perks: [
      { label: perkLabels.hybrid, icon: "home" },
      { label: perkLabels.secure, icon: "shield" },
      { label: perkLabels.learning, icon: "book" },
      { label: perkLabels.coffee, icon: "coffee" }
    ],
    vibe: ["🛡️", "📈", "🧘"]
  },
  "Enerji texnologiyaları": {
    techStack: [
      { label: "Azure", icon: "cloud" },
      { label: "SCADA", icon: "shield" },
      { label: "Jira", icon: "board" },
      { label: "SQL", icon: "database" },
      { label: "Power BI", icon: "chart" }
    ],
    perks: [
      { label: perkLabels.secure, icon: "shield" },
      { label: perkLabels.global, icon: "globe" },
      { label: perkLabels.learning, icon: "book" },
      { label: perkLabels.flexible, icon: "clock" }
    ],
    vibe: ["⚙️", "🌍", "🧠"]
  }
};

const companyOverrides: Partial<Record<Company["slug"], Partial<CompanyVibeProfile>>> = {
  figma: {
    techStack: [
      { label: "Figma", icon: "figma" },
      { label: "FigJam", icon: "sparkles" },
      { label: "React", icon: "react" },
      { label: "Jira", icon: "board" },
      { label: "Maze", icon: "workflow" }
    ],
    vibe: ["🎯", "🎨", "⚡"]
  },
  notion: {
    techStack: [
      { label: "Notion", icon: "workflow" },
      { label: "Amplitude", icon: "chart" },
      { label: "React", icon: "react" },
      { label: "SQL", icon: "database" },
      { label: "Slack", icon: "message" }
    ],
    vibe: ["🧩", "📚", "🌿"]
  },
  "kapital-bank": {
    techStack: [
      { label: "React", icon: "react" },
      { label: "Kotlin", icon: "code" },
      { label: "SQL", icon: "database" },
      { label: "Jira", icon: "board" },
      { label: "Figma", icon: "figma" }
    ],
    vibe: ["🏦", "⚡", "🧠"]
  }
};

function mergeProfile(base: CompanyVibeProfile, override?: Partial<CompanyVibeProfile>): CompanyVibeProfile {
  return {
    techStack: override?.techStack ?? base.techStack,
    perks: override?.perks ?? base.perks,
    vibe: override?.vibe ?? base.vibe
  };
}

export function getLocalizedCompanyVibeProfile(company: Company, locale: Locale) {
  const mergedProfile = mergeProfile(
    sectorProfiles[company.sector] ?? defaultProfile,
    companyOverrides[company.slug]
  );

  return {
    techStack: mergedProfile.techStack,
    perks: mergedProfile.perks.map((perk) => ({
      ...perk,
      label: getLocalizedText(perk.label, locale)
    })),
    vibe: mergedProfile.vibe
  };
}
