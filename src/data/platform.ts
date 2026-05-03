import { createLocalizedText, type LocalizedContentValue } from "@/lib/localized-content";
import type { JobModerationStatus } from "@/lib/moderation";

export type Company = {
  slug: string;
  name: string;
  tagline: string;
  sector: string;
  industryTags?: string[];
  size: string;
  location: string;
  logo: string;
  cover: string;
  website: string;
  profileSourceUrl?: string;
  companyDomain?: string;
  about: string;
  wikipediaSummary?: string;
  wikipediaSourceUrl?: string;
  focusAreas: string[];
  youthOffer: string[];
  benefits: string[];
  featured?: boolean;
  verified?: boolean;
  visible?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type JobLevel =
  | "internship"
  | "trainee"
  | "junior"
  | "entry_level"
  | "new_graduate"
  | "mid"
  | "senior"
  | "manager"
  | "unknown";

export type Job = {
  slug: string;
  title: LocalizedContentValue;
  companySlug: string;
  companyName?: string;
  city: string;
  workModel: "Ofisdən" | "Hibrid" | "Uzaqdan";
  workModelType?: "onsite" | "hybrid" | "remote" | "unknown";
  level: JobLevel;
  category: LocalizedContentValue;
  categoryConfidence?: number;
  categoryReason?: string;
  salary?: string;
  postedAt: string;
  deadline: string;
  summary: LocalizedContentValue;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  tags: LocalizedContentValue[];
  featured?: boolean;
  sourceName?: string;
  sourcePlatform?: string;
  sourceKind?: string;
  sourceUrl?: string;
  sourceReferenceUrl?: string;
  sourceListingUrl?: string;
  jobDetailUrl?: string;
  scrapedDetailUrl?: string;
  applyActionUrl?: string;
  scrapedApplyUrl?: string;
  finalVerifiedUrl?: string;
  canonicalApplyUrl?: string;
  applyUrl?: string;
  applyLinkStatus?: "valid" | "broken" | "uncertain";
  applyLinkScore?: number;
  applyLinkKind?:
    | "external"
    | "ats"
    | "tracking_redirect"
    | "linkedin_easy_apply"
    | "linkedin_offsite"
    | "linkedin_detail_only"
    | "career_page"
    | "job_board_detail"
    | "unknown";
  applyCtaMode?: "apply" | "view" | "disabled";
  verifiedApply?: boolean;
  officialSource?: boolean;
  checkedRecentlyAt?: string;
  lastCheckedAt?: string;
  freshnessStatus?: "hot" | "fresh" | "aging" | "stale" | "expired";
  expiresAt?: string;
  isExpired?: boolean;
  trustBadges?: string[];
  trustScore?: number;
  publishable?: boolean;
  validationStatus?: "verified" | "unresolved" | "rejected" | "pending";
  validationReason?: string;
  moderationStatus?: JobModerationStatus;
  moderationNotes?: string;
  moderationUpdatedAt?: string;
  internshipConfidence?: number;
  classificationConfidence?: number;
  classificationReason?: string;
  searchKeywords?: string[];
  normalizedKeywords?: string[];
  sourceLanguage?: string;
  rawLocation?: string;
  normalizedLocation?: string;
  normalizedCity?: string;
  locationSource?: "structured" | "title" | "description" | "url" | "company_default" | "unknown";
  locationConfidence?: number;
  duplicateRisk?: number;
  logoUrl?: string;
  logoSource?: string;
  logoConfidence?: number;
  directCompanyUrl?: string;
  firstSeenAt?: string;
  sourcePostedAt?: string;
  needsReview?: boolean;
  createdAt?: string;
};

const localizedCategories = {
  dataAnalytics: createLocalizedText("Data və analitika", "Data & Analytics", "Данные и аналитика"),
  design: createLocalizedText("Dizayn", "Design", "Дизайн"),
  marketing: createLocalizedText("Marketinq", "Marketing", "Маркетинг"),
  operations: createLocalizedText("Əməliyyatlar", "Operations", "Операции"),
  riskCompliance: createLocalizedText("Risk və uyğunluq", "Risk & Compliance", "Риск и комплаенс"),
  productOperations: createLocalizedText(
    "Product operations",
    "Product Operations",
    "Product Operations"
  ),
  research: createLocalizedText("Research", "Research", "Исследования"),
  businessAnalytics: createLocalizedText(
    "Biznes analitika",
    "Business Analytics",
    "Бизнес-аналитика"
  ),
  customerExperience: createLocalizedText(
    "Müştəri təcrübəsi",
    "Customer Experience",
    "Клиентский опыт"
  )
} as const;

export const companies: Company[] = [
  {
    slug: "notion",
    name: "Notion",
    tagline: "Məhsul və məlumat komandalarında erkən karyera üçün açıq imkanlar.",
    sector: "Produktivlik SaaS",
    size: "1.001-5.000 əməkdaş",
    location: "San Fransisko, ABŞ",
    logo: "https://cdn.simpleicons.org/notion/111111",
    cover:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    website: "https://www.notion.so",
    about:
      "Notion, məhsul, data və growth komandalarında gənc mütəxəssislərə real nəticə sahibi olmaq imkanı verən qlobal proqram şirkətidir.",
    wikipediaSummary:
      "Notion Labs Inc. is a software company that develops a collaboration platform for notes, documents, and team planning. The product is widely used by teams to bring writing, planning, and knowledge sharing into one workspace.",
    wikipediaSourceUrl: "https://en.wikipedia.org/wiki/Notion_(productivity_software)",
    focusAreas: ["Data analitikası", "Product operations", "Growth", "Research"],
    youthOffer: [
      "Mentor dəstəkli 12 həftəlik intern proqramı",
      "Yeni məzunlar üçün məhsul analitikası rotasiyası",
      "Portfolio və case review sessiyaları"
    ],
    benefits: ["Hibrid iş modeli", "Wellness büdcəsi", "Təlim krediti", "Komanda mentorluğu"],
    featured: true,
    createdAt: "2026-03-01"
  },
  {
    slug: "figma",
    name: "Figma",
    tagline: "Dizayn, tədqiqat və məhsul əməkdaşlığı üzrə ilk rolunu tapmaq üçün ideal mühit.",
    sector: "Dizayn texnologiyaları",
    size: "1.001-5.000 əməkdaş",
    location: "San Fransisko, ABŞ",
    logo: "https://cdn.simpleicons.org/figma/F24E1E",
    cover:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    website: "https://www.figma.com",
    about:
      "Figma məhsul dizaynı, araşdırma və istifadəçi təcrübəsi sahələrində böyümək istəyən gənclər üçün praktik öyrənmə mədəniyyəti qurur.",
    wikipediaSummary:
      "Figma is a collaborative interface design platform used for product design, prototyping, and developer handoff. It is known for browser-based multiplayer editing and tooling for teams building digital products together.",
    wikipediaSourceUrl: "https://en.wikipedia.org/wiki/Figma",
    focusAreas: ["UI/UX dizayn", "UX research", "Design systems", "Content design"],
    youthOffer: [
      "Junior dizaynerlər üçün dizayn kritikləri",
      "Research assistant təcrübəsi",
      "Trainee proqramında komanda rotasiyası"
    ],
    benefits: ["Uzaqdan əməkdaşlıq", "Mentor sessiyaları", "Konfrans dəstəyi", "Karyera coachinqi"],
    featured: true,
    createdAt: "2026-03-02"
  },
  {
    slug: "revolut",
    name: "Revolut",
    tagline: "Fintex, growth və marketinq komandalarında sürətli öyrənmə ritmi.",
    sector: "Fintex",
    size: "10.000+ əməkdaş",
    location: "London, Birləşmiş Krallıq",
    logo: "https://cdn.simpleicons.org/revolut/111111",
    cover:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
    website: "https://www.revolut.com",
    about:
      "Revolut, rəqəmsal bankçılıq və growth sahəsində gənc istedadlara sürətli öyrənmə və real məsuliyyət verən qlobal fintex platformasıdır.",
    focusAreas: ["Growth marketing", "Risk operations", "CRM", "Business analysis"],
    youthOffer: [
      "Trainee marketinq proqramı",
      "Business analyst üçün junior açılışlar",
      "Ödəniş məhsulları üzrə shadowing"
    ],
    benefits: ["Performans bonusu", "Hibrid komanda", "İngilis dili dəstəyi", "Daxili təlimlər"],
    featured: true,
    createdAt: "2026-03-03"
  },
  {
    slug: "shopify",
    name: "Shopify",
    tagline: "Merchant operations, support və growth sahəsində praktik erkən karyera rolları.",
    sector: "Commerce platform",
    size: "10.000+ əməkdaş",
    location: "Ottava, Kanada",
    logo: "https://cdn.simpleicons.org/shopify/95BF47",
    cover:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
    website: "https://www.shopify.com",
    about:
      "Shopify rəqəmsal commerce məhsulları, merchant support və operations komandalarında gənc istedadlar üçün strukturlaşdırılmış öyrənmə mühiti yaradır.",
    focusAreas: ["Merchant operations", "Customer success", "Growth support", "Commerce analytics"],
    youthOffer: [
      "Operations intern rolları",
      "Customer success onboarding proqramı",
      "Merchant experience layihələrinə qoşulmaq imkanı"
    ],
    benefits: ["Qlobal remote mədəniyyət", "Komanda coaching", "Learning stipend", "Structured onboarding"],
    featured: false,
    createdAt: "2026-03-04"
  },
  {
    slug: "wise",
    name: "Wise",
    tagline: "Maliyyə məhsulları, compliance və data sahəsində gənclərə açıq qapı.",
    sector: "Qlobal ödənişlər",
    size: "5.001-10.000 əməkdaş",
    location: "London, Birləşmiş Krallıq",
    logo: "https://cdn.simpleicons.org/wise/9fe870",
    cover:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
    website: "https://wise.com",
    about:
      "Wise beynəlxalq ödənişlər və compliance məhsullarında gənc mütəxəssislər üçün strukturlaşdırılmış ilk rol imkanları yaradır.",
    focusAreas: ["Compliance", "Data operations", "Fraud review", "Finance support"],
    youthOffer: [
      "Yeni məzunlar üçün rotasiya proqramı",
      "Risk analyst intern rolu",
      "Cross-border payments üzrə shadowing"
    ],
    benefits: ["Qlobal komanda", "Internal mobility", "Learning stipend", "İş-güc balansı"],
    featured: false,
    createdAt: "2026-03-05"
  },
  {
    slug: "kapital-bank",
    name: "Kapital Bank",
    tagline: "Texnologiya, data və product komandalarında gənclər üçün aktiv imkanlar.",
    sector: "Bank və rəqəmsal məhsullar",
    size: "5.001-10.000 əməkdaş",
    location: "Bakı, Azərbaycan",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Kapital_Bank_logo.svg/512px-Kapital_Bank_logo.svg.png",
    cover:
      "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1200&q=80",
    website: "https://kapitalbank.az",
    about:
      "Kapital Bank rəqəmsal məhsul, data və mühəndislik istiqamətlərində gənclər üçün praktiki internship və junior imkanları ilə bazarda aktiv işəgötürənlərdən biridir.",
    focusAreas: ["Data və AI", "Frontend", "Platform development", "Ecosystem analytics"],
    youthOffer: [
      "Mühəndislik üzrə təcrübə proqramları",
      "Data və analytics üzrə gənc istedad proqramları",
      "Məhsul komandaları ilə mentorlu iş təcrübəsi"
    ],
    benefits: ["Hibrid model", "Mentorluq", "Real layihələr", "Daxili təlimlər"],
    featured: true,
    createdAt: "2026-03-06"
  },
  {
    slug: "kapital-bank-life",
    name: "Kapital Bank Life",
    tagline: "Customer experience və ecosystem komandalarında erkən karyera rolları.",
    sector: "Sığorta və müştəri təcrübəsi",
    size: "201-500 əməkdaş",
    location: "Bakı, Azərbaycan",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Kapital_Bank_logo.svg/512px-Kapital_Bank_logo.svg.png",
    cover:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    website: "https://birbank.business",
    about:
      "Kapital Bank Life customer experience və ecosystem istiqamətlərində gənclər üçün intern və analyst rolları açan çevik komandalardan biridir.",
    focusAreas: ["Customer experience", "Ecosystem operations", "Analytics", "Service design"],
    youthOffer: [
      "CX intern rolları",
      "Analitika və ecosystem üzrə early-career imkanlar",
      "Service excellence mentorluğu"
    ],
    benefits: ["Ofis və hibrid miks", "Mentor sessiyaları", "Performance feedback", "Project exposure"],
    featured: false,
    createdAt: "2026-03-07"
  },
  {
    slug: "coca-cola-cci",
    name: "Coca-Cola CCI",
    tagline: "Marketinq, trade və brand komandalarında yay internship ritmi.",
    sector: "FMCG",
    size: "10.000+ əməkdaş",
    location: "Bakı, Azərbaycan",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/512px-Coca-Cola_logo.svg.png",
    cover:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    website: "https://cci.com.tr",
    about:
      "Coca-Cola CCI marketinq, trade marketing və commercial operations sahələrində tələbə və yeni məzunlar üçün öyrənmə sürəti yüksək olan komandalar qurur.",
    focusAreas: ["Brand marketing", "Trade marketing", "Commercial analytics", "Operations"],
    youthOffer: [
      "Marketing intern rolları",
      "Commercial exposure və mentorluq",
      "Regional kampaniya təcrübəsi"
    ],
    benefits: ["Qlobal marka təcrübəsi", "Öyrənmə büdcəsi", "Cross-team layihələr", "Mentorluq"],
    featured: true,
    createdAt: "2026-03-08"
  },
  {
    slug: "portbim",
    name: "PortBIM",
    tagline: "Engineering və software development üçün lokal intern imkanları.",
    sector: "Construction tech",
    size: "51-200 əməkdaş",
    location: "Bakı, Azərbaycan",
    logo: "https://cdn.simpleicons.org/dotnet/512BD4",
    cover:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
    website: "https://portbim.com",
    about:
      "PortBIM mühəndislik məhsulları üzərində çalışan lokal texnologiya komandasıdır və intern developer rolları ilə erkən karyera üçün real texniki təcrübə yaradır.",
    focusAreas: ["C# development", "BIM products", "Design systems", "QA"],
    youthOffer: [
      "Intern developer rolları",
      "Kiçik məhsul komandalarında shadowing",
      "Texniki mentorluq"
    ],
    benefits: ["Ofisdə yaxın mentorluq", "Lokal məhsul təcrübəsi", "Texniki inkişaf", "Komanda görüşləri"],
    featured: false,
    createdAt: "2026-03-09"
  },
  {
    slug: "pasha-insurance-world",
    name: "PASHA Insurance World",
    tagline: "Aktuari, risk və sığorta analitikası üzrə erkən karyera rolları.",
    sector: "Sığorta və risk",
    size: "501-1.000 əməkdaş",
    location: "Bakı, Azərbaycan",
    logo: "/company-logos/pasha-insurance-world.svg",
    cover:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    website: "https://pasha-insurance.az",
    about:
      "PASHA Insurance World aktuari, risk və business analysis istiqamətlərində yeni məzunlar və təcrübəçilər üçün daha strukturlaşdırılmış inkişaf yolu təqdim edir.",
    focusAreas: ["Aktuari", "Risk analysis", "Business support", "Operations"],
    youthOffer: [
      "Aktuari üzrə təcrübəçi rolları",
      "Risk komandasında mentorlu giriş",
      "Analitik inkişaf proqramları"
    ],
    benefits: ["Sektor mentorluğu", "Structured onboarding", "Karyera planlaması", "Komanda daxili təlim"],
    featured: true,
    createdAt: "2026-03-10"
  },
  {
    slug: "baker-hughes",
    name: "Baker Hughes",
    tagline: "Field engineering və industrial operations üçün qlobal intern track.",
    sector: "Enerji texnologiyaları",
    size: "10.000+ əməkdaş",
    location: "Bakı, Azərbaycan",
    logo: "/company-logos/baker-hughes.svg",
    cover:
      "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=1200&q=80",
    website: "https://www.bakerhughes.com",
    about:
      "Baker Hughes field engineering və service operations sahələrində Azərbaycan bazarı üçün internship imkanları açan qlobal enerji texnologiyası işəgötürənidir.",
    focusAreas: ["Field service", "Engineering", "Operations", "Industrial analytics"],
    youthOffer: [
      "Field service engineering intern imkanları",
      "Qlobal təhlükəsizlik və texniki onboarding",
      "Enerji sektorunda erkən karyera exposure"
    ],
    benefits: ["Qlobal komanda", "Texniki təlimlər", "Field mentorluğu", "Sektor exposure"],
    featured: false,
    createdAt: "2026-03-11"
  }
];

export const jobApplyUrlOverrides: Record<string, string> = {
  "product-design-intern-miro": "https://boards.greenhouse.io/miro/jobs/7426153002",
  "data-analyst-intern-notion": "https://boards.greenhouse.io/notion/jobs/7432001002",
  "junior-ui-ux-designer-figma": "https://job-boards.greenhouse.io/figma/jobs/5239012004",
  "marketing-trainee-revolut": "https://www.revolut.com/careers/position/marketing-trainee-8123417002/",
  "operations-intern-shopify": "https://www.shopify.com/careers/operations-intern-2026-4412081",
  "risk-operations-junior-wise": "https://jobs.ashbyhq.com/wise/91d3fd14-8e93-4e64-8a0b-1bde7ca0d101",
  "product-ops-trainee-notion": "https://boards.greenhouse.io/notion/jobs/7432001027",
  "ux-research-assistant-figma": "https://job-boards.greenhouse.io/figma/jobs/5239012198",
  "business-analyst-trainee-revolut": "https://www.revolut.com/careers/position/business-analyst-trainee-8123491044/",
  "customer-success-intern-shopify": "https://www.shopify.com/careers/customer-success-intern-2026-4412194",
};

export const jobs: Job[] = [
  {
    slug: "data-analyst-intern-notion",
    title: createLocalizedText(
      "Data analitiki üzrə təcrübəçi",
      "Data Analyst Intern",
      "Стажер-аналитик данных"
    ),
    companySlug: "notion",
    city: "San Fransisko",
    workModel: "Hibrid",
    level: "internship",
    category: localizedCategories.dataAnalytics,
    salary: "$2,300 / ay",
    postedAt: "2026-03-14",
    deadline: "2026-04-05",
    summary: createLocalizedText(
      "Məhsul istifadəsi və engagement metriklərini analiz edib growth komandası üçün dashboard-lar hazırlayacaqsan.",
      "You will analyze product usage and engagement metrics and build dashboards for the growth team.",
      "Ты будешь анализировать продуктовые метрики и готовить дашборды для growth-команды."
    ),
    applyUrl: jobApplyUrlOverrides["data-analyst-intern-notion"],
    directCompanyUrl: "https://www.notion.so/careers",
    responsibilities: [
      "SQL və spreadsheet ilə performans hesabatları qurmaq",
      "A/B test nəticələrini şərh edib komanda ilə paylaşmaq",
      "Məhsul menecerləri üçün weekly insight note hazırlamaq"
    ],
    requirements: [
      "Statistika, iqtisadiyyat və ya əlaqəli sahədə təhsil",
      "SQL və ya analitik alətlərlə baza tanışlıq",
      "Strukturlaşdırılmış düşüncə və təqdimat bacarığı"
    ],
    benefits: ["Mentor proqramı", "Real layihə ownership", "Hibrid komanda", "Təlim büdcəsi"],
    tags: ["SQL", "Looker", "Intern", "Growth", "A/B test"],
    featured: true
  },
  {
    slug: "junior-ui-ux-designer-figma",
    title: createLocalizedText(
      "Junior UI/UX dizayner",
      "Junior UI/UX Designer",
      "Junior UI/UX дизайнер"
    ),
    companySlug: "figma",
    city: "San Fransisko",
    workModel: "Hibrid",
    level: "junior",
    category: localizedCategories.design,
    salary: "$3,100 / ay",
    postedAt: "2026-03-12",
    deadline: "2026-04-10",
    summary: createLocalizedText(
      "Design systems və əsas istifadəçi ssenariləri üzərində işləyərək problemləri vizual həllərə çevirəcəksən.",
      "You will work on design systems and core user journeys, turning product problems into polished visual solutions.",
      "Ты будешь работать над design systems и ключевыми пользовательскими сценариями, превращая задачи в продуманные визуальные решения."
    ),
    applyUrl: jobApplyUrlOverrides["junior-ui-ux-designer-figma"],
    directCompanyUrl: "https://www.figma.com/careers/",
    responsibilities: [
      "Wireframe və hi-fi ekranlar hazırlamaq",
      "UX researcher ilə birlikdə istifadəçi feedback-lərini vizuallaşdırmaq",
      "Design system komponentlərinə kiçik töhfələr vermək"
    ],
    requirements: [
      "Güclü portfolio və ya tələbə layihələri",
      "Figma ilə rahat işləmək",
      "Feedback qəbul edib iterasiya etmək bacarığı"
    ],
    benefits: ["Dizayn kritikləri", "Portfolio review", "Mentor sessiyaları", "Remote collaboration"],
    tags: ["Figma", "UX", "UI", "Junior", "Design system"],
    featured: true
  },
  {
    slug: "marketing-trainee-revolut",
    title: createLocalizedText(
      "Marketinq üzrə trainee",
      "Marketing Trainee",
      "Trainee по маркетингу"
    ),
    companySlug: "revolut",
    city: "London",
    workModel: "Hibrid",
    level: "trainee",
    category: localizedCategories.marketing,
    salary: "£2,400 / ay",
    postedAt: "2026-03-15",
    deadline: "2026-04-07",
    summary: createLocalizedText(
      "Campaign performance, creator partnership və CRM proqramlarını izləyərək growth komandasına dəstək verəcəksən.",
      "You will support the growth team by tracking campaign performance, creator partnerships, and CRM programs.",
      "Ты будешь помогать growth-команде, отслеживая кампании, creator-партнерства и CRM-программы."
    ),
    applyUrl: jobApplyUrlOverrides["marketing-trainee-revolut"],
    directCompanyUrl: "https://www.revolut.com/careers/",
    responsibilities: [
      "Kampaniya nəticələrini toplamaq və təqdim etmək",
      "Creator və media plan təqvimlərini koordinasiya etmək",
      "CRM mesajlaşmaları üçün test planları hazırlamaq"
    ],
    requirements: [
      "Marketinq və ya biznes sahəsində təhsil",
      "Analitik düşüncə və yaxşı yazılı ünsiyyət",
      "Excel və təqdimat alətlərindən istifadə bacarığı"
    ],
    benefits: ["Growth exposure", "Mentorluq", "Trainee rotasiyası", "Performans bonusu"],
    tags: ["CRM", "Growth", "Trainee", "Campaign", "Marketing"],
    featured: true
  },
  {
    slug: "operations-intern-shopify",
    title: createLocalizedText(
      "Əməliyyatlar üzrə təcrübəçi",
      "Operations Intern",
      "Стажер по операционной деятельности"
    ),
    companySlug: "shopify",
    city: "Dublin",
    workModel: "Ofisdən",
    level: "internship",
    category: localizedCategories.operations,
    salary: "1,200 AZN / ay",
    postedAt: "2026-03-11",
    deadline: "2026-03-30",
    summary: createLocalizedText(
      "Merchant onboarding və əməliyyat keyfiyyət göstəricilərini izləyib commerce operations komandasına gündəlik dəstək verəcəksən.",
      "You will support the commerce operations team by tracking merchant onboarding and day-to-day quality metrics.",
      "Ты будешь поддерживать commerce operations, отслеживая onboarding мерчантов и показатели качества."
    ),
    applyUrl: jobApplyUrlOverrides["operations-intern-shopify"],
    directCompanyUrl: "https://www.shopify.com/careers",
    responsibilities: [
      "Şəhər performans dashboard-larını yeniləmək",
      "Partnyor onboarding checklist-lərini idarə etmək",
      "Əməliyyat problemlərini kateqoriyalara bölmək və eskalasiya etmək"
    ],
    requirements: [
      "Yüksək operativlik və detallara diqqət",
      "Excel və ya Google Sheets bilikləri",
      "Azərbaycan və ingilis dillərində ünsiyyət"
    ],
    benefits: ["Commerce exposure", "On-the-job öyrənmə", "Team lead mentorluğu", "Sürətli qərar mühiti"],
    tags: ["Operations", "Intern", "Merchant", "Dublin", "Excel"]
  },
  {
    slug: "risk-operations-junior-wise",
    title: createLocalizedText(
      "Junior risk əməliyyatları analitiki",
      "Junior Risk Operations Analyst",
      "Junior аналитик по риск-операциям"
    ),
    companySlug: "wise",
    city: "Tallinn",
    workModel: "Uzaqdan",
    level: "junior",
    category: localizedCategories.riskCompliance,
    salary: "€2,100 / ay",
    postedAt: "2026-03-10",
    deadline: "2026-04-08",
    summary: createLocalizedText(
      "Risk nümunələrini və istifadəçi tranzaksiyalarını yoxlayaraq compliance komandasına ilkin analiz təqdim edəcəksən.",
      "You will analyze risk patterns and user transactions and deliver first-pass analysis to the compliance team.",
      "Ты будешь проверять риск-паттерны и транзакции пользователей, передавая команде compliance первичный анализ."
    ),
    applyUrl: jobApplyUrlOverrides["risk-operations-junior-wise"],
    directCompanyUrl: "https://wise.jobs",
    responsibilities: [
      "Gündəlik risk queue-larını idarə etmək",
      "Case nəticələrini sistemdə sənədləşdirmək",
      "Şübhəli nümunələri escalation komandası ilə bölüşmək"
    ],
    requirements: [
      "Maliyyə, hüquq və ya data yönümlü təhsil",
      "Analitik və etik düşüncə tərzi",
      "Detal yönümlü işləmək bacarığı"
    ],
    benefits: ["Remote-first mühit", "Compliance mentorluğu", "Learning stipend", "Global exposure"],
    tags: ["Risk", "Compliance", "Junior", "Remote", "Operations"]
  },
  {
    slug: "product-ops-trainee-notion",
    title: createLocalizedText(
      "Product operations üzrə trainee",
      "Product Operations Trainee",
      "Trainee по product operations"
    ),
    companySlug: "notion",
    city: "Dublin",
    workModel: "Hibrid",
    level: "trainee",
    category: localizedCategories.productOperations,
    salary: "€2,450 / ay",
    postedAt: "2026-03-09",
    deadline: "2026-04-02",
    summary: createLocalizedText(
      "Release plan-ləri, feedback toplama prosesi və daxili knowledge base strukturu üzərində işləyəcəksən.",
      "You will work on release planning, feedback intake, and internal knowledge base structure across product operations.",
      "Ты будешь работать над release-планированием, сбором feedback и структурой внутренней базы знаний."
    ),
    applyUrl: jobApplyUrlOverrides["product-ops-trainee-notion"],
    directCompanyUrl: "https://www.notion.so/careers",
    responsibilities: [
      "Feature launch checklist-lərini yeniləmək",
      "Support və product komandaları arasında məlumat paylaşımını koordinasiya etmək",
      "Daxili knowledge page-lərini strukturlaşdırmaq"
    ],
    requirements: [
      "Çoxkomandalı iş mühitinə maraq",
      "Yazılı sənədləşdirmə bacarığı",
      "Məhsul və istifadəçi düşüncəsinə maraq"
    ],
    benefits: ["Cross-functional exposure", "Mentor check-ins", "Documentation craft", "Trainee track"],
    tags: ["Product Ops", "Trainee", "Launch", "Documentation"]
  },
  {
    slug: "ux-research-assistant-figma",
    title: createLocalizedText(
      "UX research assistant",
      "UX Research Assistant",
      "Ассистент UX-исследований"
    ),
    companySlug: "figma",
    city: "London",
    workModel: "Uzaqdan",
    level: "new_graduate",
    category: localizedCategories.research,
    salary: "£2,000 / ay",
    postedAt: "2026-03-13",
    deadline: "2026-04-04",
    summary: createLocalizedText(
      "İstifadəçi müsahibələrini və usability qeydlərini strukturlaşdıraraq dizayn komandası üçün insight paketləri hazırlayacaqsan.",
      "You will turn interview notes and usability observations into structured insight packs for the design team.",
      "Ты будешь превращать заметки интервью и usability-тестов в структурированные insight-пакеты для дизайн-команды."
    ),
    applyUrl: jobApplyUrlOverrides["ux-research-assistant-figma"],
    directCompanyUrl: "https://www.figma.com/careers/",
    responsibilities: [
      "Research note-ları təmizləyib tematikləşdirmək",
      "Usability test nəticələrindən qısa insight-lar çıxarmaq",
      "Research kitabxanasını yeniləmək"
    ],
    requirements: [
      "Psixologiya, sosiologiya və ya dizayn arxa planı",
      "Qeydləri strukturlaşdırmaq bacarığı",
      "İngilis dilində rahat yazılı ünsiyyət"
    ],
    benefits: ["Research mentorluğu", "Remote setup", "Portfolio materialı", "Yeni məzun proqramı"],
    tags: ["Research", "Assistant", "UX", "Graduate"]
  },
  {
    slug: "business-analyst-trainee-revolut",
    title: createLocalizedText(
      "Biznes analitiki üzrə trainee",
      "Business Analyst Trainee",
      "Trainee бизнес-аналитик"
    ),
    companySlug: "revolut",
    city: "Varşava",
    workModel: "Hibrid",
    level: "trainee",
    category: localizedCategories.businessAnalytics,
    salary: "€2,300 / ay",
    postedAt: "2026-03-08",
    deadline: "2026-04-01",
    summary: createLocalizedText(
      "Bazara çıxış, funnel performansı və komanda KPI-ları üzrə ilkin analiz apararaq qərarverməni sürətləndirəcəksən.",
      "You will run first-pass analysis on go-to-market, funnel performance, and KPI reporting to speed up decisions.",
      "Ты будешь проводить первичный анализ go-to-market, воронки и KPI, чтобы ускорять принятие решений."
    ),
    applyUrl: jobApplyUrlOverrides["business-analyst-trainee-revolut"],
    directCompanyUrl: "https://www.revolut.com/careers/",
    responsibilities: [
      "Həftəlik biznes görüşləri üçün materiallar hazırlamaq",
      "Müxtəlif komandalar üçün KPI izləmə cədvəlləri qurmaq",
      "Təkrarlanan hesabatları avtomatlaşdırmaq"
    ],
    requirements: [
      "Biznes, iqtisadiyyat və ya data yönümlü təhsil",
      "Spreadsheet və presentation bilikləri",
      "Sürətli tempə uyğunlaşmaq bacarığı"
    ],
    benefits: ["Biznes exposure", "Trainee proqramı", "Team shadowing", "KPI mentorluğu"],
    tags: ["Business Analyst", "Trainee", "KPI", "Growth"]
  },
  {
    slug: "customer-success-intern-shopify",
    title: createLocalizedText(
      "Customer success üzrə təcrübəçi",
      "Customer Success Intern",
      "Стажер по customer success"
    ),
    companySlug: "shopify",
    city: "London",
    workModel: "Hibrid",
    level: "internship",
    category: localizedCategories.customerExperience,
    salary: "900 AZN / ay",
    postedAt: "2026-03-16",
    deadline: "2026-04-06",
    summary: createLocalizedText(
      "Merchant sorğularının motivlərini təhlil edib support keyfiyyətinin yaxşılaşdırılması üçün customer success komandası ilə işləyəcəksən.",
      "You will analyze merchant request patterns and help the customer success team improve support quality.",
      "Ты будешь анализировать обращения мерчантов и помогать команде customer success улучшать качество поддержки."
    ),
    applyUrl: jobApplyUrlOverrides["customer-success-intern-shopify"],
    directCompanyUrl: "https://www.shopify.com/careers",
    responsibilities: [
      "Sorğu etiketlərini və trend-ləri izləmək",
      "Müştəri səfərində problem nöqtələrini sənədləşdirmək",
      "Təklif olunan təkmilləşdirmələri komanda ilə paylaşmaq"
    ],
    requirements: [
      "Müştəri mərkəzli düşüncə tərzi",
      "Güclü yazılı və şifahi ünsiyyət",
      "Dəqiq sənədləşdirmə bacarığı"
    ],
    benefits: ["Merchant exposure", "Team mentorship", "Hibrid cədvəl", "Intern track"],
    tags: ["Customer Success", "Intern", "London", "Support"]
  }
];

export const jobLevels = ["all", "internship", "entry_level", "mid", "senior", "manager"] as const;
export const workModels = ["Hamısı", "Ofisdən", "Hibrid", "Uzaqdan"] as const;
export const cities = ["Hamısı", "Bakı"] as const;
