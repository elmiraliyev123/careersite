import { createHash } from "node:crypto";

import type { Company, Job } from "@/data/platform";
import {
  createLocalizedText,
  normalizeLocalizedText,
  type LocalizedContentValue,
  type LocalizedText,
  type SupportedLocaleCode
} from "@/lib/localized-content";
import { sanitizeText } from "@/lib/text-sanitizer";

export type ApplyLinkStatus = "valid" | "broken" | "uncertain";
export type ApplyLinkKind =
  | "external"
  | "ats"
  | "tracking_redirect"
  | "linkedin_easy_apply"
  | "linkedin_offsite"
  | "linkedin_detail_only"
  | "career_page"
  | "job_board_detail"
  | "unknown";
export type ApplyCtaMode = "apply" | "view" | "disabled";
export type IngestionRunStatus = "queued" | "running" | "completed" | "completed_with_errors" | "failed";
export type CandidateProcessingStatus = "pending" | "processing" | "processed" | "failed";
export type SourceKind = "job-board" | "aggregator" | "career-page" | "manual";
export type NormalizedWorkMode = "onsite" | "hybrid" | "remote" | "unknown";
export type EarlyCareerLevel =
  | "internship"
  | "trainee"
  | "junior"
  | "graduate"
  | "assistant"
  | "mid"
  | "senior"
  | "manager"
  | "unknown";

export type RawIngestedJob = {
  sourceName: string;
  sourceKind: SourceKind;
  sourceListingUrl: string;
  jobDetailUrl?: string | null;
  applyActionUrl?: string | null;
  candidateApplyUrls?: string[] | null;
  externalApplyUrl?: string | null;
  companyName: string;
  title: string;
  locationRaw?: string | null;
  postedAt?: string | null;
  employmentType?: string | null;
  descriptionRaw?: string | null;
  companySiteHint?: string | null;
  scrapeConfidence?: number;
  scrapeError?: string | null;
  payload?: Record<string, unknown> | null;
};

export type InternshipClassification = {
  isInternship: boolean;
  internshipConfidence: number;
  seniorityLevel: EarlyCareerLevel;
  earlyCareerEligible: boolean;
  rejectionCategory: string | null;
  debugFlags: string[];
};

export type LocationNormalizationResult = {
  locationNormalized: string | null;
  city: string | null;
  country: string | null;
  workMode: NormalizedWorkMode;
  isBaku: boolean;
  locationConfidence: number;
  debugFlags: string[];
};

export type TrustScoreBreakdown = {
  score: number;
  factors: string[];
};

export type FreshnessStatus = "hot" | "fresh" | "aging" | "stale" | "expired";

export type ApplyLinkValidationResult = {
  status: ApplyLinkStatus;
  checkedAt: string;
  httpStatus: number | null;
  finalUrl: string | null;
  reason: string;
  verifiedApply: boolean;
  redirectChain: string[];
  flags: string[];
};

export type ValidationStatus = "verified" | "unresolved" | "rejected" | "pending";

export type NormalizedJobCandidate = {
  id: string;
  sourceName: string;
  sourceKind: SourceKind;
  sourceListingUrl: string;
  jobDetailUrl: string | null;
  applyActionUrl: string | null;
  externalApplyUrl: string | null;
  candidateApplyUrls: string[];
  resolvedApplyUrl: string | null;
  canonicalApplyUrl: string | null;
  applyLinkStatus: ApplyLinkStatus;
  applyLinkScore: number;
  applyLinkKind: ApplyLinkKind;
  applyCtaMode: ApplyCtaMode;
  verifiedApply: boolean;
  applyLinkCheckedAt: string | null;
  companyName: string;
  companySlug: string | null;
  companyDomain: string | null;
  title: string;
  normalizedTitle: string;
  locationRaw: string | null;
  locationNormalized: string | null;
  city: string | null;
  country: string | null;
  workMode: NormalizedWorkMode;
  descriptionRaw: string | null;
  descriptionClean: string | null;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  employmentType: string | null;
  seniorityLevel: EarlyCareerLevel;
  isInternship: boolean;
  internshipConfidence: number;
  isBaku: boolean;
  locationConfidence: number;
  trustScore: number;
  logoUrl: string | null;
  logoSource: string | null;
  logoConfidence: number;
  isDuplicate: boolean;
  canonicalJobId: string;
  publishable: boolean;
  rejectionReason: string | null;
  rejectionCategory: string | null;
  needsAdminReview: boolean;
  scrapeError: string | null;
  validationStatus: ValidationStatus;
  debugFlags: string[];
  validationDebug: Record<string, unknown>;
  sourcePayload: Record<string, unknown> | null;
};

type LocationPattern = {
  city: string;
  country: string;
  tokens: string[];
};

const SOURCE_RELIABILITY: Record<string, number> = {
  linkedin: 0.58,
  hellojob: 0.64,
  "hellojob.az": 0.64,
  "boss.az": 0.61,
  boss: 0.61,
  banker: 0.67,
  "banker.az": 0.67,
  tapla: 0.63,
  "tapla.az": 0.63,
  jobsearch: 0.66,
  "jobsearch.az": 0.66,
  position: 0.68,
  "position.az": 0.68,
  figma: 0.95,
  notion: 0.95,
  revolut: 0.95,
  shopify: 0.95,
  wise: 0.95,
  abb: 0.95,
  "abb bank": 0.95,
  "pasha holding": 0.95,
  "pasha capital": 0.94,
  "kapitalbank": 0.95,
  "kapital bank": 0.95,
  "birbank business": 0.93,
  "pasha insurance": 0.93,
  accessbank: 0.94,
  "baker hughes": 0.92,
  "portbim": 0.92,
  "cocacola cci": 0.9
};

const ATS_HOST_PATTERNS = [
  "greenhouse.io",
  "job-boards.greenhouse.io",
  "boards.greenhouse.io",
  "ashbyhq.com",
  "glorri.com",
  "glorri.az",
  "jobs.glorri.com",
  "jobs.glorri.az",
  "lever.co",
  "oraclecloud.com",
  "ocs.oraclecloud.com",
  "myworkdayjobs.com",
  "smartrecruiters.com",
  "recruitee.com",
  "jobvite.com"
];

const POSITIVE_INTERNSHIP_PATTERNS = [
  /\bintern(?:ship)?\b/i,
  /\btrainee\b/i,
  /\bjunior\b/i,
  /\bmanagement trainee\b/i,
  /\bnew grad(?:uate)?\b/i,
  /\bgraduate scheme\b/i,
  /\bgraduate program\b/i,
  /\bearly careers?\b/i,
  /\bentry[-\s]?level\b/i,
  /\bassistant\b/i,
  /\btəcrübə(?:çi)?\b/i,
  /\btəcrübə proqramı\b/i,
  /\bstaj\b/i,
  /\byeni\s+məzun\b/i,
  /\bассистент\b/i,
  /\bстаж[её]р\b/i,
  /\bмладший\b/i
];

const NEGATIVE_INTERNSHIP_PATTERNS = [
  /\bsenior\b/i,
  /\bmiddle\b/i,
  /\bmid[-\s]?level\b/i,
  /\blead\b/i,
  /\bprincipal\b/i,
  /\bhead of\b/i,
  /\bmanager\b/i,
  /\bdirector\b/i,
  /\bvp\b/i,
  /\b2\+?\s+years\b/i,
  /\b5\+?\s+years\b/i,
  /\b3\+?\s+years\b/i,
  /\bteam lead\b/i,
  /\bsupervisor\b/i,
  /\brəhbər\b/i,
  /\bmenecer\b/i
];

const TRAINING_AD_PATTERNS = [
  /\bbootcamp\b/i,
  /\bcourse\b/i,
  /\btraining\b/i,
  /\bseminar\b/i,
  /\bwebinar\b/i,
  /\bmasterclass\b/i,
  /\bkurs\b/i,
  /\btəlim\b/i,
  /\bкурс\b/i,
  /\bобучени[ея]\b/i
];

const REMOTE_PATTERNS = [/\bremote\b/i, /\buzaqdan\b/i, /\bудален/i];
const HYBRID_PATTERNS = [/\bhybrid\b/i, /\bhibrid\b/i, /\bгибрид/i];
const ONSITE_PATTERNS = [/\bonsite\b/i, /\bon-site\b/i, /\bofisdən\b/i, /\bofis\b/i];
const AZERBAIJAN_PATTERNS = [
  /\bazerbaijan\b/i,
  /\bazərbaycan\b/i,
  /\bazerbaycan\b/i,
  /\bазербайджан\b/i
];
const NON_BAKU_AZ_PATTERNS = [
  /\bganja\b/i,
  /\bgence\b/i,
  /\bgəncə\b/i,
  /\bsumqayit\b/i,
  /\bsumqayıt\b/i,
  /\blankaran\b/i,
  /\blənkəran\b/i,
  /\bmingachevir\b/i,
  /\bmingəçevir\b/i
];

const LOCATION_PATTERNS: LocationPattern[] = [
  { city: "Bakı", country: "Azərbaycan", tokens: ["baku", "bakı", "baki", "baku economic zone"] },
  { city: "London", country: "Birləşmiş Krallıq", tokens: ["london", "londra"] },
  { city: "San Fransisko", country: "ABŞ", tokens: ["san francisco", "san fransisko"] },
  { city: "Dublin", country: "İrlandiya", tokens: ["dublin"] },
  { city: "Tallinn", country: "Estoniya", tokens: ["tallinn"] },
  { city: "Varşava", country: "Polşa", tokens: ["warsaw", "varşava"] },
  { city: "Ottava", country: "Kanada", tokens: ["ottawa", "ottava"] }
];

const DESCRIPTION_STOPWORDS = new Set([
  "and",
  "with",
  "for",
  "the",
  "your",
  "you",
  "this",
  "that",
  "from",
  "into",
  "bakı",
  "baku",
  "role",
  "team",
  "intern",
  "internship",
  "junior",
  "trainee",
  "new",
  "grad",
  "developer",
  "engineer"
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function nowIsoTimestamp() {
  return new Date().toISOString();
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToIsoDate(value: string, days: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return todayIsoDate();
  }

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stableHash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

export function normalizeComparableText(value: string | null | undefined) {
  return sanitizeText(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTitle(value: string) {
  return normalizeComparableText(value)
    .replace(/\b(remote|hybrid|onsite|on site|baku|bakı|azerbaijan)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCompanyName(value: string | null | undefined) {
  return normalizeComparableText(value)
    .replace(/\b(llc|ltd|inc|plc|company|group|holdings?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractDomain(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function buildRawJobIdentity(
  input: Pick<
    RawIngestedJob,
    "sourceName" | "sourceListingUrl" | "jobDetailUrl" | "applyActionUrl" | "companyName" | "title" | "locationRaw"
  >
) {
  const specificUrl = input.jobDetailUrl?.trim() || input.applyActionUrl?.trim() || null;

  if (specificUrl) {
    return stableHash(`${normalizeComparableText(input.sourceName)}|${specificUrl}`);
  }

  return stableHash(
    [
      normalizeComparableText(input.sourceName),
      input.sourceListingUrl.trim(),
      normalizeCompanyName(input.companyName),
      normalizeTitle(input.title),
      normalizeComparableText(input.locationRaw ?? "")
    ].join("|")
  );
}

export function isKnownAtsHost(domain: string | null | undefined) {
  if (!domain) {
    return false;
  }

  return ATS_HOST_PATTERNS.some((pattern) => domain === pattern || domain.endsWith(`.${pattern}`));
}

export function guessSourceReliability(sourceName: string, sourceKind: SourceKind) {
  if (sourceKind === "career-page") {
    return 0.95;
  }

  if (sourceKind === "manual") {
    return 0.92;
  }

  const key = normalizeComparableText(sourceName).replace(/\s+/g, "");
  return SOURCE_RELIABILITY[key] ?? 0.57;
}

function detectTextLocale(value: string): SupportedLocaleCode {
  if (/[А-Яа-яЁё]/.test(value)) {
    return "ru";
  }

  if (/[ƏəĞğİıÖöŞşÜüÇç]/.test(value)) {
    return "az";
  }

  return "en";
}

export function toLocalizedText(value: string): LocalizedText {
  return normalizeLocalizedText(value, detectTextLocale(value));
}

function extractSentences(value: string, limit: number) {
  return sanitizeText(value, { multiline: true })
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function collectDescriptionTokens(description: string) {
  return Array.from(
    new Set(
      normalizeComparableText(description)
        .split(" ")
        .filter((token) => token.length >= 4 && !DESCRIPTION_STOPWORDS.has(token))
        .slice(0, 12)
    )
  );
}

export function buildCanonicalJobId(
  companyName: string,
  normalizedTitle: string,
  city: string | null,
  workMode: string,
  postedAt?: string | null
) {
  const postedBucket =
    typeof postedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(postedAt)
      ? postedAt.slice(0, 7)
      : "unknown";

  return stableHash(
    [normalizeCompanyName(companyName), normalizedTitle, city ?? "unknown", workMode, postedBucket].join("|")
  );
}

export function inferEarlyCareerLevel(title: string, description: string, employmentType: string | null | undefined): EarlyCareerLevel {
  const haystack = `${title}\n${description}\n${employmentType ?? ""}`;

  if (/\b(?:intern|internship|təcrübəçi|staj|стаж(?:ер|ировка)?)\b/i.test(haystack)) {
    return "internship";
  }

  if (/\b(?:trainee|management trainee|accelerator program)\b/i.test(haystack)) {
    return "trainee";
  }

  if (
    /\b(?:new grad(?:uate)?|graduate program|graduate scheme)\b/i.test(haystack) ||
    /\byeni\s+məzun\b/i.test(haystack)
  ) {
    return "graduate";
  }

  if (
    /\b(?:assistant|entry[-\s]?level|associate)\b/i.test(haystack) ||
    /\bасистент\b/i.test(haystack)
  ) {
    return "assistant";
  }

  if (
    /\bjunior\b/i.test(haystack) ||
    /\bkiçik\s+mütəxəssis\b/i.test(haystack) ||
    /\bмладш/i.test(haystack)
  ) {
    return "junior";
  }

  if (
    /\bmanager\b/i.test(haystack) ||
    /\blead\b/i.test(haystack) ||
    /\bdirector\b/i.test(haystack) ||
    /\bhead of\b/i.test(haystack) ||
    /\bmenecer\b/i.test(haystack)
  ) {
    return "manager";
  }

  if (/\bsenior\b/i.test(haystack) || /\bprincipal\b/i.test(haystack)) {
    return "senior";
  }

  if (/\bmid(?:dle)?\b/i.test(haystack)) {
    return "mid";
  }

  return "unknown";
}

export function classifyInternshipCandidate(
  title: string,
  description: string,
  employmentType: string | null | undefined
): InternshipClassification {
  const haystack = `${title}\n${description}\n${employmentType ?? ""}`;
  const debugFlags: string[] = [];
  const seniorityLevel = inferEarlyCareerLevel(title, description, employmentType);
  let score = 0.18;

  for (const pattern of POSITIVE_INTERNSHIP_PATTERNS) {
    if (pattern.test(haystack)) {
      score += title.match(pattern) ? 0.26 : 0.12;
      debugFlags.push(`positive:${pattern.source}`);
      break;
    }
  }

  for (const pattern of NEGATIVE_INTERNSHIP_PATTERNS) {
    if (pattern.test(haystack)) {
      score -= 0.55;
      debugFlags.push(`negative:${pattern.source}`);
      break;
    }
  }

  let rejectionCategory: string | null = null;

  for (const pattern of TRAINING_AD_PATTERNS) {
    if (pattern.test(haystack)) {
      score -= 0.42;
      rejectionCategory = "training_ad";
      debugFlags.push(`training:${pattern.source}`);
      break;
    }
  }

  if (["internship", "trainee", "graduate"].includes(seniorityLevel)) {
    score += 0.22;
    debugFlags.push(`seniority:${seniorityLevel}`);
  } else if (["junior", "assistant"].includes(seniorityLevel)) {
    score += 0.11;
    debugFlags.push(`seniority:${seniorityLevel}`);
  } else if (["mid", "senior", "manager"].includes(seniorityLevel)) {
    score -= 0.35;
    rejectionCategory = rejectionCategory ?? "unsupported_seniority";
    debugFlags.push(`seniority:${seniorityLevel}`);
  }

  if (/\b(full[-\s]?time|tam ştat)\b/i.test(haystack) && seniorityLevel === "unknown") {
    score -= 0.18;
    debugFlags.push("employment:full_time_unknown_level");
  }

  const internshipConfidence = clamp(score, 0, 1);
  const earlyCareerEligible = ["internship", "trainee", "graduate", "junior", "assistant"].includes(seniorityLevel);
  const explicitInternshipLevel = ["internship", "trainee", "graduate"].includes(seniorityLevel);

  return {
    isInternship: explicitInternshipLevel && internshipConfidence >= 0.24,
    internshipConfidence,
    seniorityLevel,
    earlyCareerEligible,
    rejectionCategory,
    debugFlags
  };
}

export function normalizeWorkMode(title: string, location: string | null | undefined, description: string) {
  const haystack = `${title}\n${location ?? ""}\n${description}`;

  if (REMOTE_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return "remote" as const;
  }

  if (HYBRID_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return "hybrid" as const;
  }

  if (ONSITE_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return "onsite" as const;
  }

  return "unknown" as const;
}

export function normalizeLocation(
  locationRaw: string | null | undefined,
  description: string,
  companyLocationHint?: string | null
): LocationNormalizationResult {
  const raw = sanitizeText(locationRaw ?? "");
  const haystack = `${raw}\n${description}\n${companyLocationHint ?? ""}`;
  const folded = normalizeComparableText(haystack);
  const workMode = normalizeWorkMode("", raw, description);
  const debugFlags: string[] = [];
  let city: string | null = null;
  let country: string | null = null;
  let locationConfidence = 0.2;

  for (const pattern of LOCATION_PATTERNS) {
    if (pattern.tokens.some((token) => folded.includes(token))) {
      city = pattern.city;
      country = pattern.country;
      locationConfidence = raw ? 0.94 : 0.74;
      debugFlags.push(`city:${pattern.city}`);
      break;
    }
  }

  if (!country && AZERBAIJAN_PATTERNS.some((pattern) => pattern.test(haystack))) {
    country = "Azərbaycan";
    locationConfidence = Math.max(locationConfidence, raw ? 0.7 : 0.56);
    debugFlags.push("country:azerbaijan");
  }

  if (!city && companyLocationHint) {
    const hinted = normalizeLocation(companyLocationHint, "", null);
    if (hinted.city) {
      city = hinted.city;
      country = hinted.country;
      locationConfidence = 0.46;
      debugFlags.push("company_location_fallback");
    }
  }

  if (workMode === "remote" && !city && country) {
    locationConfidence = 0.44;
  }

  if (!city && NON_BAKU_AZ_PATTERNS.some((pattern) => pattern.test(haystack))) {
    country = country ?? "Azərbaycan";
    locationConfidence = Math.max(locationConfidence, 0.76);
    debugFlags.push("city:azerbaijan_non_baku");
  }

  const isRemoteAzRelevant =
    !city && country === "Azərbaycan" && (workMode === "remote" || workMode === "hybrid");
  const isBaku = city === "Bakı" || isRemoteAzRelevant;

  if (isRemoteAzRelevant) {
    debugFlags.push(`location:${workMode}_azerbaijan`);
    locationConfidence = Math.max(locationConfidence, 0.66);
  }

  return {
    locationNormalized: raw || city || null,
    city,
    country,
    workMode,
    isBaku,
    locationConfidence: clamp(locationConfidence, 0, 1),
    debugFlags
  };
}

function inferCategoryLabel(title: string, description: string, isInternship = false) {
  const haystack = normalizeComparableText(`${title} ${description}`);

  if (isInternship || /\b(intern(?:ship)?|trainee|staj|təcrübə(?:çi)?|təcrübə proqramı|staj proqramı|yeni məzun)\b/.test(haystack)) {
    return createLocalizedText("Təcrübə", "Internship", "Стажировка");
  }

  if (/\b(data|analyst|analytics|insight|sql|bi|reporting|analitik|hesabat)\b/.test(haystack)) {
    return createLocalizedText("Data və analitika", "Data & Analytics", "Данные и аналитика");
  }

  if (/\b(design|designer|ux|ui|research|figma|dizayn|motion|grafik)\b/.test(haystack)) {
    return createLocalizedText("Dizayn", "Design", "Дизайн");
  }

  if (/\b(marketing|brand|crm|growth|campaign|marketinq|kommunikasiya|communication|pr|smm|content)\b/.test(haystack)) {
    return createLocalizedText("Marketinq", "Marketing", "Маркетинг");
  }

  if (/\b(frontend|backend|engineer|developer|software|software engineer|software developer|qa|platform|devops|it\b|sistem administrator|proqram(?:çı|ci| muhendis| mühəndisi)|informasiya texnologiyaları)\b/.test(haystack)) {
    return createLocalizedText("İT / Proqram təminatı", "IT / Software", "ИТ / Разработка");
  }

  if (/\b(product|məhsul)\b/.test(haystack)) {
    return createLocalizedText("Məhsul", "Product", "Продукт");
  }

  if (/\b(finance|financial|bank|bankçılıq|bankciliq|credit|loan|treasury|account|accountant|accounting|audit|maliyy|mühasib|muhasib|xəzin|kredit|büdcə|budget)\b/.test(haystack)) {
    return createLocalizedText("Maliyyə / Mühasibat", "Finance / Accounting", "Финансы / Бухгалтерия");
  }

  if (/\b(hr|human resources|recruit|talent|işə qəbul|ise qebul|insan resurs|recruiting)\b/.test(haystack)) {
    return createLocalizedText("HR / İşə qəbul", "HR / Recruiting", "HR / Рекрутинг");
  }

  if (/\b(customer|support|success|service|call center|contact center|müştəri|musteri|xidmət|xidmet|operator)\b/.test(haystack)) {
    return createLocalizedText("Müştəri dəstəyi", "Customer Support", "Поддержка клиентов");
  }

  if (/\b(sales|sale|business development|satış|satis|merchant)\b/.test(haystack)) {
    return createLocalizedText("Satış", "Sales", "Продажи");
  }

  if (/\b(logistic|warehouse|anbar|supply|təchizat|techizat|stok|stock|courier)\b/.test(haystack)) {
    return createLocalizedText("Logistika", "Logistics", "Логистика");
  }

  if (/\b(retail|store|shop|supermarket|mağaza|magaza|cashier|kasir|satış məsləhətçisi|satis meslehetcisi|merchandiser)\b/.test(haystack)) {
    return createLocalizedText("Pərakəndə satış", "Retail", "Розница");
  }

  if (/\b(legal|lawyer|jurist|hüquq|huquq)\b/.test(haystack)) {
    return createLocalizedText("Hüquq", "Legal", "Юриспруденция");
  }

  if (/\b(engineer|engineering|mühəndis|muhendis|technician|maintenance)\b/.test(haystack)) {
    return createLocalizedText("Mühəndislik", "Engineering", "Инженерия");
  }

  if (/\b(teacher|instructor|education|academy|trainer|tədris|tedris|müəllim|muellim)\b/.test(haystack)) {
    return createLocalizedText("Təhsil", "Education", "Образование");
  }

  if (/\b(medical|doctor|nurse|health|healthcare|pharma|əczaçı|eczaci|həkim|hekim)\b/.test(haystack)) {
    return createLocalizedText("Səhiyyə", "Healthcare", "Здравоохранение");
  }

  if (/\b(risk|compliance|fraud|insurance|actuar)\b/.test(haystack)) {
    return createLocalizedText("Risk və uyğunluq", "Risk & Compliance", "Риск и комплаенс");
  }

  if (/\b(operation|operations|admin|administrative|coordinator|assistant|əməliyyat|emeliyyat|administrativ|koordinator|köməkçi|koməkçi|komekci)\b/.test(haystack)) {
    return createLocalizedText("Əməliyyatlar / Admin", "Operations / Admin", "Операции / Админ");
  }

  return createLocalizedText("Digər", "Other", "Другое");
}

function toUiWorkModel(workMode: NormalizedWorkMode): Job["workModel"] {
  if (workMode === "remote") {
    return "Uzaqdan";
  }

  if (workMode === "onsite") {
    return "Ofisdən";
  }

  return "Hibrid";
}

function toUiLevel(level: EarlyCareerLevel): Job["level"] {
  switch (level) {
    case "mid":
      return "Mid";
    case "senior":
      return "Senior";
    case "manager":
      return "Manager";
    case "trainee":
      return "Trainee";
    case "graduate":
      return "Yeni məzun";
    case "junior":
    case "assistant":
      return "Junior";
    case "unknown":
      return "Naməlum";
    default:
      return "Təcrübə";
  }
}

function buildSummaryText(candidate: Pick<NormalizedJobCandidate, "companyName" | "title" | "descriptionClean">) {
  const description = candidate.descriptionClean ? extractSentences(candidate.descriptionClean, 1)[0] : "";

  return description || "";
}

function buildListFromDescription(description: string | null) {
  if (!description) {
    return [];
  }

  const items = sanitizeText(description, { multiline: true })
    .split(/\n|•|;|(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 16)
    .slice(0, 3);

  return items;
}

function buildTags(
  candidate: Pick<NormalizedJobCandidate, "sourceName" | "title" | "isInternship" | "seniorityLevel" | "city" | "workMode">
) {
  const seniorityTag =
    candidate.isInternship
      ? "Internship"
      : candidate.seniorityLevel === "trainee"
        ? "Trainee"
        : candidate.seniorityLevel === "graduate"
          ? "Graduate"
          : candidate.seniorityLevel === "junior"
            ? "Junior"
            : candidate.seniorityLevel === "assistant"
              ? "Assistant"
              : candidate.seniorityLevel === "mid"
                ? "Mid"
                : candidate.seniorityLevel === "senior"
                  ? "Senior"
                  : candidate.seniorityLevel === "manager"
                    ? "Manager"
                    : "General";
  const tokens = [
    candidate.sourceName,
    seniorityTag,
    candidate.city ?? "Global",
    candidate.workMode,
    ...candidate.title.split(/[\s/()-]+/)
  ];

  return Array.from(
    new Set(
      tokens
        .map((item) => sanitizeText(item))
        .filter((item) => item.length >= 2)
        .slice(0, 6)
    )
  );
}

export function buildPublishedJobDraft(
  candidate: NormalizedJobCandidate,
  company: Company
): Omit<Job, "slug" | "featured"> {
  const level = toUiLevel(candidate.seniorityLevel);
  const summaryText = buildSummaryText(candidate);
  const category = inferCategoryLabel(candidate.title, candidate.descriptionClean ?? "", candidate.isInternship);

  return {
    title: toLocalizedText(candidate.title),
    companySlug: company.slug,
    city: candidate.city ?? company.location.split(",")[0]?.trim() ?? "Bakı",
    workModel: toUiWorkModel(candidate.workMode),
    level,
    category,
    postedAt: candidate.postedAt ?? todayIsoDate(),
    deadline: addDaysToIsoDate(candidate.postedAt ?? todayIsoDate(), 30),
    summary: toLocalizedText(summaryText),
    responsibilities: buildListFromDescription(candidate.descriptionClean),
    requirements: buildListFromDescription(candidate.descriptionClean),
    benefits: [],
    tags: buildTags(candidate).map((tag) => normalizeLocalizedText(tag, "en")),
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceListingUrl,
    applyUrl: candidate.canonicalApplyUrl ?? undefined,
    directCompanyUrl: company.website,
    createdAt: candidate.firstSeenAt.slice(0, 10)
  };
}

function computeFreshnessScore(postedAt: string | null) {
  if (!postedAt) {
    return 0.38;
  }

  const ageMs = Date.now() - new Date(postedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 0.4;
  }

  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 3) {
    return 1;
  }

  if (ageDays <= 14) {
    return 0.9;
  }

  if (ageDays <= 30) {
    return 0.68;
  }

  if (ageDays <= 45) {
    return 0.36;
  }

  return 0.04;
}

export function deriveFreshnessStatus(postedAt: string | null): FreshnessStatus {
  if (!postedAt) {
    return "aging";
  }

  const ageMs = Date.now() - new Date(postedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return "aging";
  }

  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 3) {
    return "hot";
  }

  if (ageDays <= 14) {
    return "fresh";
  }

  if (ageDays <= 30) {
    return "aging";
  }

  if (ageDays <= 45) {
    return "stale";
  }

  return "expired";
}

export function buildTrustBadges(candidate: Pick<
  NormalizedJobCandidate,
  "verifiedApply" | "sourceKind" | "isInternship" | "isBaku" | "applyLinkCheckedAt" | "applyLinkScore" | "applyLinkKind"
>) {
  const badges: string[] = [];

  if (candidate.verifiedApply) {
    badges.push("verified_apply");
  }

  if (candidate.sourceKind === "career-page") {
    badges.push("official_source");
  }

  if (candidate.isInternship) {
    badges.push("internship");
  }

  if (candidate.isBaku) {
    badges.push("baku_relevant");
  }

  if (candidate.applyLinkCheckedAt) {
    badges.push("checked_recently");
  }

  if (candidate.applyLinkScore >= 0.82) {
    badges.push("strong_apply_link");
  }

  if (candidate.applyLinkKind === "linkedin_easy_apply" || candidate.applyLinkKind === "linkedin_offsite") {
    badges.push("linkedin_apply");
  }

  return badges;
}

export function computeTrustScore(input: {
  sourceName: string;
  sourceKind: SourceKind;
  applyLinkStatus: ApplyLinkStatus;
  applyLinkScore: number;
  verifiedApply: boolean;
  companyDomain: string | null;
  resolvedApplyUrl: string | null;
  postedAt: string | null;
  earlyCareerEligible: boolean;
  internshipConfidence: number;
  locationConfidence: number;
  hasDescription: boolean;
}): TrustScoreBreakdown {
  const factors: string[] = [];
  let score = 0;

  const sourceReliability = guessSourceReliability(input.sourceName, input.sourceKind);
  score += sourceReliability * 0.18;
  factors.push(`source:${sourceReliability.toFixed(2)}`);

  if (input.applyLinkStatus === "valid") {
    score += 0.26;
    factors.push("apply:valid");
  } else if (input.applyLinkStatus === "uncertain") {
    score += 0.04;
    factors.push("apply:uncertain");
  } else {
    factors.push("apply:broken");
  }

  score += clamp(input.applyLinkScore, 0, 1) * 0.16;
  factors.push(`apply-score:${input.applyLinkScore.toFixed(2)}`);

  if (input.verifiedApply) {
    score += 0.12;
    factors.push("apply:verified");
  }

  const finalApplyDomain = extractDomain(input.resolvedApplyUrl);
  if (
    input.companyDomain &&
    finalApplyDomain &&
    (finalApplyDomain === input.companyDomain ||
      finalApplyDomain.endsWith(`.${input.companyDomain}`) ||
      isKnownAtsHost(finalApplyDomain))
  ) {
    score += 0.08;
    factors.push("domain:matched");
  }

  const freshness = computeFreshnessScore(input.postedAt);
  score += freshness * 0.12;
  factors.push(`freshness:${freshness.toFixed(2)}`);

  if (input.earlyCareerEligible) {
    score += 0.02;
    factors.push("classification:early-career");
  }

  score += clamp(input.internshipConfidence, 0, 1) * 0.02;
  factors.push(`classification:${input.internshipConfidence.toFixed(2)}`);

  score += clamp(input.locationConfidence, 0, 1) * 0.06;
  factors.push(`location:${input.locationConfidence.toFixed(2)}`);

  if (input.hasDescription) {
    score += 0.06;
    factors.push("description:present");
  }

  return {
    score: clamp(score, 0, 1),
    factors
  };
}

export function detectExpiredJob(input: {
  postedAt: string | null;
  applyValidationReason: string;
  description: string | null;
}) {
  const haystack = `${input.applyValidationReason}\n${input.description ?? ""}`;

  if (/(expired|closed|archived|filled|no longer available|tapılmadı|müddəti bitib)/i.test(haystack)) {
    return true;
  }

  return deriveFreshnessStatus(input.postedAt) === "expired";
}

export function buildDebugPayload(candidate: NormalizedJobCandidate) {
  return {
    sourceName: candidate.sourceName,
    sourceKind: candidate.sourceKind,
    canonicalJobId: candidate.canonicalJobId,
    sourceListingUrl: candidate.sourceListingUrl,
    jobDetailUrl: candidate.jobDetailUrl,
    applyActionUrl: candidate.applyActionUrl,
    resolvedApplyUrl: candidate.resolvedApplyUrl,
    canonicalApplyUrl: candidate.canonicalApplyUrl,
    applyLinkStatus: candidate.applyLinkStatus,
    applyLinkScore: candidate.applyLinkScore,
    applyLinkKind: candidate.applyLinkKind,
    applyCtaMode: candidate.applyCtaMode,
    verifiedApply: candidate.verifiedApply,
    seniorityLevel: candidate.seniorityLevel,
    isInternship: candidate.isInternship,
    internshipConfidence: candidate.internshipConfidence,
    isBaku: candidate.isBaku,
    locationConfidence: candidate.locationConfidence,
    trustScore: candidate.trustScore,
    publishable: candidate.publishable,
    rejectionReason: candidate.rejectionReason,
    rejectionCategory: candidate.rejectionCategory,
    debugFlags: candidate.debugFlags
  };
}

export function logPipelineEvent(event: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      scope: "job_intelligence",
      event,
      timestamp: nowIsoTimestamp(),
      ...payload
    })
  );
}
