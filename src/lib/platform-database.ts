import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { type Company, type Job } from "@/data/platform";
import {
  getAllLocalizedTextValues,
  getPrimaryLocalizedText,
  parseLocalizedText,
  parseLocalizedTextList,
  serializeLocalizedText,
  serializeLocalizedTextList
} from "@/lib/localized-content";
import {
  isPublicJobModerationStatus,
  normalizeJobModerationStatus,
  type JobModerationStatus
} from "@/lib/moderation";
import type { CompanyInput, JobInput } from "@/lib/platform-validation";
import {
  deriveLocationFromEvidence,
  deriveWorkModelFromEvidence,
  getWorkModelDisplayValue,
  getMeaningfulMetadataValue,
  normalizeLocationName,
  normalizeRoleLevel,
  type LocationSource,
  type NormalizedWorkModel
} from "@/lib/ui-display";
import { isVerifiedRedirectTarget } from "@/lib/url-sanitizer";

type CompanyRow = {
  slug: string;
  name: string;
  tagline: string;
  sector: string;
  industry_tags: string | null;
  size: string;
  location: string;
  logo: string;
  cover: string;
  website: string;
  profile_source_url: string | null;
  company_domain: string | null;
  about: string;
  wikipedia_summary: string | null;
  wikipedia_source_url: string | null;
  focus_areas: string;
  youth_offer: string;
  benefits: string;
  featured: number;
  verified: number | null;
  visible: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const LEGACY_SEED_COMPANY_SLUGS = [
  "notion",
  "figma",
  "revolut",
  "shopify",
  "wise",
  "kapital-bank",
  "kapital-bank-life",
  "coca-cola-cci",
  "portbim",
  "pasha-insurance-world",
  "baker-hughes"
] as const;

const RESTRICTED_PROFILE_SOURCE_DOMAINS = [
  "linkedin.com",
  "glassdoor.com",
  "indeed.com"
] as const;

type JobRow = {
  slug: string;
  title: string;
  company_slug: string;
  company_name: string | null;
  city: string;
  location_raw: string | null;
  location_normalized: string | null;
  location_source: LocationSource | null;
  work_model: string;
  level: string;
  category: string;
  posted_at: string;
  deadline: string;
  summary: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  tags: string;
  featured: number;
  source_name: string | null;
  source_kind: string | null;
  source_url: string | null;
  source_listing_url: string | null;
  job_detail_url: string | null;
  apply_action_url: string | null;
  candidate_apply_urls_json: string | null;
  external_apply_url: string | null;
  resolved_apply_url: string | null;
  canonical_apply_url: string | null;
  apply_url: string | null;
  apply_link_status: "valid" | "broken" | "uncertain" | null;
  apply_link_score: number | null;
  apply_link_kind:
    | "external"
    | "ats"
    | "tracking_redirect"
    | "linkedin_easy_apply"
    | "linkedin_offsite"
    | "linkedin_detail_only"
    | "career_page"
    | "job_board_detail"
    | "unknown"
    | null;
  apply_cta_mode: "apply" | "view" | "disabled" | null;
  apply_link_reason: string | null;
  verified_apply: number | null;
  official_source: number | null;
  checked_recently_at: string | null;
  last_checked_at: string | null;
  freshness_status: "hot" | "fresh" | "aging" | "stale" | "expired" | null;
  expires_at: string | null;
  is_expired: number | null;
  trust_badges: string | null;
  trust_score: number | null;
  publishable: number | null;
  validation_status: string | null;
  needs_admin_review: number | null;
  scrape_error: string | null;
  moderation_status: JobModerationStatus | null;
  moderation_notes: string | null;
  moderation_updated_at: string | null;
  internship_confidence: number | null;
  location_confidence: number | null;
  classification_confidence: number | null;
  classification_reason: string | null;
  search_keywords: string | null;
  normalized_keywords: string | null;
  source_language: string | null;
  category_confidence: number | null;
  category_reason: string | null;
  duplicate_risk: number | null;
  logo_url: string | null;
  logo_source: string | null;
  logo_confidence: number | null;
  direct_company_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LegacyPlatformStore = {
  companies?: Company[];
  jobs?: Job[];
};

export type OutboundEventInput = {
  targetUrl: string;
  companyName: string;
  sourcePath?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
};

export type ListCompaniesOptions = {
  limit?: number;
  sector?: string;
  onlyWithPublicJobs?: boolean;
};

export type ListJobsOptions = {
  includeUnpublished?: boolean;
  limit?: number;
  offset?: number;
  companySlug?: string;
  excludeSlug?: string;
  level?: string;
  workModel?: string;
  city?: string;
  category?: string;
};

const bundledDatabaseDirectory = path.join(process.cwd(), "data");
const bundledDatabasePath = path.join(bundledDatabaseDirectory, "careerapple.sqlite");
const databasePath =
  process.env.STRADIFY_SQLITE_PATH?.trim() ||
  process.env.SQLITE_PATH?.trim() ||
  (process.env.VERCEL ? path.join("/tmp", "stradify.sqlite") : bundledDatabasePath);
const databaseDirectory = path.dirname(databasePath);
const legacyStorePath = path.join(bundledDatabaseDirectory, "platform-store.json");

let database: DatabaseSync | null = null;
let initialized = false;

function normalizeLimit(value: number | undefined, fallback?: number) {
  const candidate = value ?? fallback;

  if (!Number.isFinite(candidate)) {
    return undefined;
  }

  return Math.max(1, Math.min(500, Math.floor(candidate as number)));
}

function publicJobPredicates(alias = "jobs") {
  return [
    `COALESCE(${alias}.publishable, 1) = 1`,
    `COALESCE(${alias}.deadline, date('now')) >= date('now')`,
    `COALESCE(${alias}.freshness_status, 'fresh') NOT IN ('stale', 'expired')`,
    `COALESCE(${alias}.is_expired, 0) = 0`,
    `COALESCE(${alias}.validation_status, 'pending') = 'verified'`,
    `COALESCE(${alias}.apply_link_status, 'broken') = 'valid'`,
    `COALESCE(${alias}.canonical_apply_url, ${alias}.resolved_apply_url, ${alias}.apply_url) IS NOT NULL`,
    `trim(COALESCE(${alias}.canonical_apply_url, ${alias}.resolved_apply_url, ${alias}.apply_url)) <> ''`
  ];
}

function logDatabaseTiming(label: string, startedAt: number, detail?: string) {
  if (process.env.NEXT_PUBLIC_DB_TIMING === "0") {
    return;
  }

  const elapsed = Date.now() - startedAt;
  const shouldLog = process.env.NODE_ENV === "development" || elapsed >= 100;

  if (shouldLog) {
    console.info(`[perf:db] ${label} ${elapsed}ms${detail ? ` ${detail}` : ""}`);
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowIsoTimestamp() {
  return new Date().toISOString();
}

function resolveFreshnessStatus(
  postedAt: string,
  deadline: string
): NonNullable<Job["freshnessStatus"]> {
  const now = new Date();
  const postedDate = new Date(postedAt);
  const deadlineDate = new Date(deadline);

  if (Number.isNaN(postedDate.getTime()) || Number.isNaN(deadlineDate.getTime())) {
    return "fresh";
  }

  if (deadlineDate.getTime() < now.getTime()) {
    return "expired";
  }

  const daysSincePosted = Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSincePosted <= 3) {
    return "hot";
  }

  if (daysSincePosted <= 14) {
    return "fresh";
  }

  if (daysSincePosted <= 30) {
    return "aging";
  }

  if (daysSincePosted <= 45) {
    return "stale";
  }

  return "expired";
}

function getDefaultModerationStatus(input: {
  moderationStatus?: JobModerationStatus;
  sourceName?: string;
  sourceUrl?: string;
}) {
  if (input.moderationStatus) {
    return input.moderationStatus;
  }

  return input.sourceName || input.sourceUrl ? "suggested" : "draft";
}

function extractCompanyDomain(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.toLowerCase() || undefined;
  }
}

function getEffectiveJobPublishable(input: {
  moderationStatus: JobModerationStatus;
  hasUsableApplyUrl: boolean;
  freshnessStatus?: Job["freshnessStatus"];
}) {
  if (!isPublicJobModerationStatus(input.moderationStatus)) {
    return false;
  }

  if (!input.hasUsableApplyUrl) {
    return false;
  }

  return input.freshnessStatus !== "stale" && input.freshnessStatus !== "expired";
}

function ensureDatabaseDirectory() {
  if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
  }
}

function prepareRuntimeDatabaseFile() {
  if (databasePath === bundledDatabasePath || fs.existsSync(databasePath) || !fs.existsSync(bundledDatabasePath)) {
    return;
  }

  fs.copyFileSync(bundledDatabasePath, databasePath);

  for (const suffix of ["-wal", "-shm"]) {
    const source = `${bundledDatabasePath}${suffix}`;
    const target = `${databasePath}${suffix}`;

    if (fs.existsSync(source) && !fs.existsSync(target)) {
      fs.copyFileSync(source, target);
    }
  }
}

function getDatabase() {
  ensureDatabaseDirectory();
  prepareRuntimeDatabaseFile();

  if (!database) {
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("PRAGMA synchronous = NORMAL");
    database.exec("PRAGMA busy_timeout = 10000");
    database.exec("PRAGMA foreign_keys = ON");
  }

  if (!initialized) {
    setupDatabase(database);
    initialized = true;
  }

  return database;
}

export function getPlatformDatabase() {
  return getDatabase();
}

function setupDatabase(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      sector TEXT NOT NULL,
      industry_tags TEXT,
      size TEXT NOT NULL,
      location TEXT NOT NULL,
      logo TEXT NOT NULL,
      cover TEXT NOT NULL,
      website TEXT NOT NULL,
      profile_source_url TEXT,
      company_domain TEXT,
      about TEXT NOT NULL,
      wikipedia_summary TEXT,
      wikipedia_source_url TEXT,
      focus_areas TEXT NOT NULL,
      youth_offer TEXT NOT NULL,
      benefits TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 1,
      visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_aliases (
      company_slug TEXT NOT NULL,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL,
      domain_hint TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      PRIMARY KEY (company_slug, normalized_alias),
      FOREIGN KEY (company_slug) REFERENCES companies(slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company_slug TEXT NOT NULL,
      city TEXT NOT NULL,
      work_model TEXT NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      posted_at TEXT NOT NULL,
      deadline TEXT NOT NULL,
      summary TEXT NOT NULL,
      responsibilities TEXT NOT NULL,
      requirements TEXT NOT NULL,
      benefits TEXT NOT NULL,
      tags TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      source_name TEXT,
      source_url TEXT,
      apply_url TEXT,
      direct_company_url TEXT,
      moderation_status TEXT NOT NULL DEFAULT 'published',
      moderation_notes TEXT,
      moderation_updated_at TEXT,
      internship_confidence REAL NOT NULL DEFAULT 0,
      location_confidence REAL NOT NULL DEFAULT 0,
      duplicate_risk REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (company_slug) REFERENCES companies(slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS outbound_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_url TEXT NOT NULL,
      company_name TEXT NOT NULL,
      source_path TEXT,
      referrer TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS jobs_company_slug_idx ON jobs(company_slug);
    CREATE INDEX IF NOT EXISTS jobs_deadline_idx ON jobs(deadline);
    CREATE INDEX IF NOT EXISTS jobs_level_idx ON jobs(level);
    CREATE INDEX IF NOT EXISTS jobs_work_model_idx ON jobs(work_model);
    CREATE INDEX IF NOT EXISTS jobs_city_idx ON jobs(city);
    CREATE INDEX IF NOT EXISTS jobs_category_idx ON jobs(category);
    CREATE INDEX IF NOT EXISTS jobs_posted_created_idx ON jobs(posted_at DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS companies_featured_idx ON companies(featured);
    CREATE INDEX IF NOT EXISTS companies_sector_idx ON companies(sector);
    CREATE INDEX IF NOT EXISTS company_aliases_lookup_idx ON company_aliases(normalized_alias);
    CREATE INDEX IF NOT EXISTS company_aliases_domain_idx ON company_aliases(domain_hint);
    CREATE INDEX IF NOT EXISTS outbound_events_created_at_idx ON outbound_events(created_at);

    CREATE TABLE IF NOT EXISTS cms_documents (
      id TEXT PRIMARY KEY,
      draft_data TEXT NOT NULL,
      published_data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  ensureColumnExists(db, "companies", "wikipedia_summary", "TEXT");
  ensureColumnExists(db, "companies", "wikipedia_source_url", "TEXT");
  ensureColumnExists(db, "companies", "industry_tags", "TEXT");
  ensureColumnExists(db, "companies", "profile_source_url", "TEXT");
  ensureColumnExists(db, "companies", "company_domain", "TEXT");
  ensureColumnExists(db, "companies", "verified", "INTEGER NOT NULL DEFAULT 1");
  ensureColumnExists(db, "companies", "visible", "INTEGER NOT NULL DEFAULT 1");
  ensureColumnExists(db, "jobs", "source_name", "TEXT");
  ensureColumnExists(db, "jobs", "source_kind", "TEXT");
  ensureColumnExists(db, "jobs", "source_url", "TEXT");
  ensureColumnExists(db, "jobs", "source_listing_url", "TEXT");
  ensureColumnExists(db, "jobs", "job_detail_url", "TEXT");
  ensureColumnExists(db, "jobs", "apply_action_url", "TEXT");
  ensureColumnExists(db, "jobs", "candidate_apply_urls_json", "TEXT");
  ensureColumnExists(db, "jobs", "external_apply_url", "TEXT");
  ensureColumnExists(db, "jobs", "resolved_apply_url", "TEXT");
  ensureColumnExists(db, "jobs", "canonical_apply_url", "TEXT");
  ensureColumnExists(db, "jobs", "apply_url", "TEXT");
  ensureColumnExists(db, "jobs", "apply_link_status", "TEXT");
  ensureColumnExists(db, "jobs", "apply_link_score", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "apply_link_kind", "TEXT");
  ensureColumnExists(db, "jobs", "apply_cta_mode", "TEXT");
  ensureColumnExists(db, "jobs", "apply_link_reason", "TEXT");
  ensureColumnExists(db, "jobs", "verified_apply", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "official_source", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "checked_recently_at", "TEXT");
  ensureColumnExists(db, "jobs", "last_checked_at", "TEXT");
  ensureColumnExists(db, "jobs", "freshness_status", "TEXT");
  ensureColumnExists(db, "jobs", "expires_at", "TEXT");
  ensureColumnExists(db, "jobs", "is_expired", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "trust_badges", "TEXT");
  ensureColumnExists(db, "jobs", "trust_score", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "publishable", "INTEGER NOT NULL DEFAULT 1");
  ensureColumnExists(db, "jobs", "validation_status", "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumnExists(db, "jobs", "needs_admin_review", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "scrape_error", "TEXT");
  ensureColumnExists(db, "jobs", "moderation_status", "TEXT NOT NULL DEFAULT 'published'");
  ensureColumnExists(db, "jobs", "moderation_notes", "TEXT");
  ensureColumnExists(db, "jobs", "moderation_updated_at", "TEXT");
  ensureColumnExists(db, "jobs", "location_raw", "TEXT");
  ensureColumnExists(db, "jobs", "location_normalized", "TEXT");
  ensureColumnExists(db, "jobs", "location_source", "TEXT");
  ensureColumnExists(db, "jobs", "internship_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "location_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "classification_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "classification_reason", "TEXT");
  ensureColumnExists(db, "jobs", "search_keywords", "TEXT");
  ensureColumnExists(db, "jobs", "normalized_keywords", "TEXT");
  ensureColumnExists(db, "jobs", "source_language", "TEXT");
  ensureColumnExists(db, "jobs", "category_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "category_reason", "TEXT");
  ensureColumnExists(db, "jobs", "duplicate_risk", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "rejection_reason", "TEXT");
  ensureColumnExists(db, "jobs", "rejection_category", "TEXT");
  ensureColumnExists(db, "jobs", "logo_url", "TEXT");
  ensureColumnExists(db, "jobs", "logo_source", "TEXT");
  ensureColumnExists(db, "jobs", "logo_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "direct_company_url", "TEXT");
  db.exec(
    "CREATE INDEX IF NOT EXISTS jobs_public_active_idx ON jobs(publishable, validation_status, apply_link_status, is_expired, freshness_status, deadline)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS jobs_company_public_idx ON jobs(company_slug, publishable, validation_status, apply_link_status, is_expired, deadline)"
  );
  db.exec("DROP INDEX IF EXISTS jobs_source_url_unique_idx");
  db.exec("CREATE INDEX IF NOT EXISTS jobs_source_url_idx ON jobs(source_url)");
  db.exec("CREATE INDEX IF NOT EXISTS jobs_source_listing_url_idx ON jobs(source_listing_url)");
  db.exec("CREATE INDEX IF NOT EXISTS jobs_job_detail_url_idx ON jobs(job_detail_url)");
  db.exec("CREATE INDEX IF NOT EXISTS jobs_canonical_apply_url_idx ON jobs(canonical_apply_url)");
  purgeLegacySeedData(db);
  migrateLegacyStore(db);
  cleanupSpeculativeApplyUrls(db);
  cleanupMalformedOrphanJobs(db);
  cleanupTemplatedCompanyFields(db);
  cleanupTemplatedCompanyAbout(db);
  cleanupGeneratedCompanyProfileContent(db);
  cleanupCompanyDomainHints(db);
  normalizeStoredJobLevels(db);
  backfillApplyUrls(db);
  backfillCompanyVerificationFromPublicJobs(db);
  backfillCompanySourceProfiles(db);
  refreshJobVisibilityState(db);
}

function ensureColumnExists(db: DatabaseSync, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>;
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function readMetadataValue(db: DatabaseSync, key: string) {
  const row = db.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as { value?: string } | undefined;
  return row?.value ?? null;
}

function writeMetadataValue(db: DatabaseSync, key: string, value: string) {
  db.prepare(
    `INSERT INTO metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

function serializeList(value: string[]) {
  return JSON.stringify(value);
}

function parseList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function isYouthLevel(level: string) {
  return ["internship", "trainee", "junior", "entry_level", "new_graduate"].includes(
    normalizeRoleLevel(level)
  );
}

function mapCompanyRow(row: CompanyRow): Company {
  const sector = getMeaningfulMetadataValue(row.sector) ?? "";

  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    sector,
    industryTags: row.industry_tags ? parseList(row.industry_tags) : sector ? [sector] : [],
    size: row.size,
    location: normalizeLocationName(row.location) ?? "",
    logo: row.logo,
    cover: row.cover,
    website: row.website,
    profileSourceUrl: row.profile_source_url ?? undefined,
    companyDomain: row.company_domain ?? undefined,
    about: row.about,
    wikipediaSummary: row.wikipedia_summary ?? undefined,
    wikipediaSourceUrl: row.wikipedia_source_url ?? undefined,
    focusAreas: parseList(row.focus_areas),
    youthOffer: parseList(row.youth_offer),
    benefits: parseList(row.benefits),
    featured: Boolean(row.featured),
    verified: row.verified === null ? true : Boolean(row.verified),
    visible: row.visible === null ? true : Boolean(row.visible),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

function mapJobRow(row: JobRow): Job {
  const canonicalApplyUrl = row.canonical_apply_url ?? row.resolved_apply_url ?? row.apply_url ?? undefined;
  const finalVerifiedUrl =
    (row.validation_status ?? "pending") === "verified" &&
    (row.apply_link_status ?? "broken") === "valid" &&
    isVerifiedRedirectTarget(canonicalApplyUrl)
      ? canonicalApplyUrl
      : undefined;
  const moderationStatus = normalizeJobModerationStatus(row.moderation_status, "published");
  const ctaDisabled =
    row.apply_cta_mode === "disabled" ||
    row.apply_link_status === "broken" ||
    !finalVerifiedUrl;
  const title = parseLocalizedText(row.title);
  const summary = parseLocalizedText(row.summary);
  const responsibilities = parseList(row.responsibilities);
  const requirements = parseList(row.requirements);
  const benefits = parseList(row.benefits);
  const titleText = getAllLocalizedTextValues(title).join(" ");
  const descriptionText = [
    getAllLocalizedTextValues(summary).join(" "),
    responsibilities.join(" "),
    requirements.join(" "),
    benefits.join(" ")
  ].join(" ");
  const urlText = [
    row.source_url,
    row.source_listing_url,
    row.job_detail_url,
    row.apply_action_url,
    row.external_apply_url
  ]
    .filter(Boolean)
    .join(" ");
  const location = deriveLocationFromEvidence({
    structuredLocation: row.location_normalized ?? row.location_raw ?? row.city,
    title: titleText,
    description: descriptionText,
    url: urlText
  });
  const workModelType: NormalizedWorkModel = deriveWorkModelFromEvidence({
    workModel: row.work_model,
    title: titleText,
    description: descriptionText,
    city: location.city,
    locationText: row.location_normalized ?? row.location_raw ?? row.city
  });
  const workModel = getWorkModelDisplayValue(workModelType) ?? "Hibrid";

  return {
    slug: row.slug,
    title,
    companySlug: row.company_slug,
    companyName: row.company_name ?? undefined,
    city: location.city ?? normalizeLocationName(row.city) ?? "",
    workModel,
    workModelType,
    level: normalizeRoleLevel(row.level),
    category: parseLocalizedText(row.category),
    categoryConfidence:
      typeof row.category_confidence === "number" ? row.category_confidence : undefined,
    categoryReason: row.category_reason ?? undefined,
    postedAt: row.posted_at,
    deadline: row.deadline,
    summary,
    responsibilities,
    requirements,
    benefits,
    tags: parseLocalizedTextList(row.tags),
    featured: Boolean(row.featured),
    sourceName: row.source_name ?? undefined,
    sourcePlatform: row.source_name ?? undefined,
    sourceKind: row.source_kind ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    sourceReferenceUrl: row.source_listing_url ?? row.source_url ?? undefined,
    sourceListingUrl: row.source_listing_url ?? row.source_url ?? undefined,
    jobDetailUrl: row.job_detail_url ?? undefined,
    scrapedDetailUrl: row.job_detail_url ?? undefined,
    applyActionUrl: row.apply_action_url ?? undefined,
    scrapedApplyUrl: row.apply_action_url ?? row.external_apply_url ?? row.apply_url ?? undefined,
    finalVerifiedUrl,
    canonicalApplyUrl: finalVerifiedUrl,
    applyUrl: ctaDisabled ? undefined : finalVerifiedUrl,
    applyLinkStatus: row.apply_link_status ?? undefined,
    applyLinkScore: typeof row.apply_link_score === "number" ? row.apply_link_score : undefined,
    applyLinkKind: row.apply_link_kind ?? undefined,
    applyCtaMode: row.apply_cta_mode ?? undefined,
    verifiedApply: Boolean(row.verified_apply) && Boolean(finalVerifiedUrl),
    officialSource: Boolean(row.official_source),
    checkedRecentlyAt: row.checked_recently_at ?? undefined,
    lastCheckedAt: row.last_checked_at ?? row.checked_recently_at ?? undefined,
    freshnessStatus: row.freshness_status ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    isExpired: Boolean(row.is_expired),
    trustBadges: row.trust_badges ? parseList(row.trust_badges) : [],
    trustScore: typeof row.trust_score === "number" ? row.trust_score : undefined,
    publishable: row.publishable === null ? undefined : Boolean(row.publishable),
    validationStatus:
      row.validation_status === "verified" ||
      row.validation_status === "unresolved" ||
      row.validation_status === "rejected" ||
      row.validation_status === "pending"
        ? row.validation_status
        : undefined,
    validationReason: row.apply_link_reason ?? row.scrape_error ?? undefined,
    moderationStatus,
    moderationNotes: row.moderation_notes ?? undefined,
    moderationUpdatedAt: row.moderation_updated_at ?? undefined,
    internshipConfidence:
      typeof row.internship_confidence === "number" ? row.internship_confidence : undefined,
    classificationConfidence:
      typeof row.classification_confidence === "number" ? row.classification_confidence : undefined,
    classificationReason: row.classification_reason ?? undefined,
    searchKeywords: row.search_keywords ? parseList(row.search_keywords) : undefined,
    normalizedKeywords: row.normalized_keywords ? parseList(row.normalized_keywords) : undefined,
    sourceLanguage: row.source_language ?? undefined,
    rawLocation: row.location_raw ?? undefined,
    normalizedLocation: row.location_normalized ?? undefined,
    normalizedCity: location.city ?? undefined,
    locationSource: row.location_source ?? location.source,
    locationConfidence:
      typeof row.location_confidence === "number"
        ? Math.max(row.location_confidence, location.confidence)
        : location.confidence,
    duplicateRisk: typeof row.duplicate_risk === "number" ? row.duplicate_risk : undefined,
    logoUrl: row.logo_url ?? undefined,
    logoSource: row.logo_source ?? undefined,
    logoConfidence: typeof row.logo_confidence === "number" ? row.logo_confidence : undefined,
    directCompanyUrl: row.direct_company_url ?? undefined,
    firstSeenAt: row.created_at ?? undefined,
    sourcePostedAt: row.posted_at ?? undefined,
    needsReview: Boolean(row.needs_admin_review),
    createdAt: row.created_at ?? undefined
  };
}

function insertCompanyRecord(db: DatabaseSync, company: Company) {
  db.prepare(
    `INSERT INTO companies (
      slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, profile_source_url, company_domain, about,
      wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, verified, visible, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      tagline = excluded.tagline,
      sector = excluded.sector,
      industry_tags = excluded.industry_tags,
      size = excluded.size,
      location = excluded.location,
      logo = excluded.logo,
      cover = excluded.cover,
      website = excluded.website,
      profile_source_url = excluded.profile_source_url,
      company_domain = excluded.company_domain,
      about = excluded.about,
      wikipedia_summary = excluded.wikipedia_summary,
      wikipedia_source_url = excluded.wikipedia_source_url,
      focus_areas = excluded.focus_areas,
      youth_offer = excluded.youth_offer,
      benefits = excluded.benefits,
      featured = excluded.featured,
      verified = excluded.verified,
      visible = excluded.visible,
      updated_at = excluded.updated_at`
  ).run(
    company.slug,
    company.name,
    company.tagline,
    company.sector,
    serializeList(company.industryTags ?? [company.sector]),
    company.size,
    company.location,
    company.logo,
    company.cover,
    company.website,
    company.profileSourceUrl ?? null,
    company.companyDomain ?? extractCompanyDomain(company.website) ?? null,
    company.about,
    company.wikipediaSummary ?? null,
    company.wikipediaSourceUrl ?? null,
    serializeList(company.focusAreas),
    serializeList(company.youthOffer),
    serializeList(company.benefits),
    company.featured ? 1 : 0,
    company.verified === false ? 0 : 1,
    company.visible === false ? 0 : 1,
    company.createdAt ?? todayIsoDate(),
    company.createdAt ?? todayIsoDate()
  );

  registerCompanyAlias(db, {
    companySlug: company.slug,
    alias: company.name,
    domainHint: company.companyDomain ?? company.website,
    isPrimary: true
  });
}

function insertJobRecord(db: DatabaseSync, job: Job) {
  const finalVerifiedUrlCandidate = job.finalVerifiedUrl ?? job.canonicalApplyUrl ?? job.applyUrl ?? null;
  const finalVerifiedUrl =
    (job.verifiedApply === true || Boolean(job.finalVerifiedUrl)) &&
    isVerifiedRedirectTarget(finalVerifiedUrlCandidate)
      ? finalVerifiedUrlCandidate
      : null;
  const rawApplyCandidate = job.applyActionUrl ?? job.applyUrl ?? job.canonicalApplyUrl ?? job.finalVerifiedUrl ?? null;
  const canonicalApplyUrl = finalVerifiedUrl;
  const applyActionUrl = rawApplyCandidate ?? null;
  const sourceListingUrl = job.sourceListingUrl ?? job.sourceUrl ?? null;
  const jobDetailUrl = job.jobDetailUrl ?? null;
  const applyLinkStatus = canonicalApplyUrl ? job.applyLinkStatus ?? "valid" : rawApplyCandidate ? "uncertain" : "broken";
  const applyCtaMode = canonicalApplyUrl ? job.applyCtaMode ?? "apply" : "disabled";
  const applyLinkKind = job.applyLinkKind ?? (canonicalApplyUrl ? "external" : "unknown");
  const validationStatus = canonicalApplyUrl ? "verified" : rawApplyCandidate ? "unresolved" : "rejected";
  const needsAdminReview = canonicalApplyUrl ? 0 : rawApplyCandidate ? 1 : 0;
  const insertColumns = [
    "slug",
    "title",
    "company_slug",
    "city",
    "work_model",
    "level",
    "category",
    "posted_at",
    "deadline",
    "summary",
    "responsibilities",
    "requirements",
    "benefits",
    "tags",
    "featured",
    "source_name",
    "source_kind",
    "source_url",
    "source_listing_url",
    "job_detail_url",
    "apply_action_url",
    "candidate_apply_urls_json",
    "external_apply_url",
    "resolved_apply_url",
    "canonical_apply_url",
    "apply_url",
    "apply_link_status",
    "apply_link_score",
    "apply_link_kind",
    "apply_cta_mode",
    "apply_link_reason",
    "verified_apply",
    "official_source",
    "checked_recently_at",
    "freshness_status",
    "trust_badges",
    "trust_score",
    "publishable",
    "validation_status",
    "needs_admin_review",
    "scrape_error",
    "logo_url",
    "logo_source",
    "logo_confidence",
    "direct_company_url",
    "created_at",
    "updated_at"
  ] as const;
  const insertValues = [
    job.slug,
    serializeLocalizedText(job.title),
    job.companySlug,
    job.city,
    job.workModel,
    job.level,
    serializeLocalizedText(job.category),
    job.postedAt,
    job.deadline,
    serializeLocalizedText(job.summary),
    serializeList(job.responsibilities),
    serializeList(job.requirements),
    serializeList(job.benefits),
    serializeLocalizedTextList(job.tags),
    job.featured ? 1 : 0,
    job.sourceName ?? null,
    job.sourceKind ?? null,
    job.sourceUrl ?? null,
    sourceListingUrl,
    jobDetailUrl,
    applyActionUrl,
    JSON.stringify(rawApplyCandidate ? [rawApplyCandidate] : []),
    rawApplyCandidate,
    finalVerifiedUrl,
    canonicalApplyUrl,
    canonicalApplyUrl,
    applyLinkStatus,
    job.applyLinkScore ?? (canonicalApplyUrl ? 0.84 : 0),
    applyLinkKind,
    applyCtaMode,
    canonicalApplyUrl ? "seed_verified_apply_url" : rawApplyCandidate ? "seed_unverified_apply_url" : "missing_apply_url",
    canonicalApplyUrl ? 1 : 0,
    job.officialSource ? 1 : 0,
    job.checkedRecentlyAt ?? nowIsoTimestamp(),
    job.freshnessStatus ?? "fresh",
    JSON.stringify(canonicalApplyUrl ? job.trustBadges ?? ["verified_apply"] : job.trustBadges ?? []),
    job.trustScore ?? (canonicalApplyUrl ? 0.84 : 0.12),
    job.publishable === false ? 0 : canonicalApplyUrl ? 1 : 0,
    validationStatus,
    needsAdminReview,
    canonicalApplyUrl ? null : rawApplyCandidate ? "seed_unverified_apply_url" : "missing_apply_url",
    job.logoUrl ?? null,
    job.logoSource ?? null,
    job.logoConfidence ?? 0,
    job.directCompanyUrl ?? null,
    job.createdAt ?? todayIsoDate(),
    job.createdAt ?? todayIsoDate()
  ];

  db.prepare(
    `INSERT INTO jobs (
      ${insertColumns.join(", ")}
    ) VALUES (${insertColumns.map(() => "?").join(", ")})
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      company_slug = excluded.company_slug,
      city = excluded.city,
      work_model = excluded.work_model,
      level = excluded.level,
      category = excluded.category,
      posted_at = excluded.posted_at,
      deadline = excluded.deadline,
      summary = excluded.summary,
      responsibilities = excluded.responsibilities,
      requirements = excluded.requirements,
      benefits = excluded.benefits,
      tags = excluded.tags,
      featured = excluded.featured,
      source_name = excluded.source_name,
      source_kind = excluded.source_kind,
      source_url = excluded.source_url,
      source_listing_url = excluded.source_listing_url,
      job_detail_url = excluded.job_detail_url,
      apply_action_url = excluded.apply_action_url,
      candidate_apply_urls_json = excluded.candidate_apply_urls_json,
      external_apply_url = excluded.external_apply_url,
      resolved_apply_url = excluded.resolved_apply_url,
      canonical_apply_url = excluded.canonical_apply_url,
      apply_url = excluded.apply_url,
      apply_link_status = excluded.apply_link_status,
      apply_link_score = excluded.apply_link_score,
      apply_link_kind = excluded.apply_link_kind,
      apply_cta_mode = excluded.apply_cta_mode,
      apply_link_reason = excluded.apply_link_reason,
      verified_apply = excluded.verified_apply,
      official_source = excluded.official_source,
      checked_recently_at = excluded.checked_recently_at,
      freshness_status = excluded.freshness_status,
      trust_badges = excluded.trust_badges,
      trust_score = excluded.trust_score,
      publishable = excluded.publishable,
      validation_status = excluded.validation_status,
      needs_admin_review = excluded.needs_admin_review,
      scrape_error = excluded.scrape_error,
      logo_url = excluded.logo_url,
      logo_source = excluded.logo_source,
      logo_confidence = excluded.logo_confidence,
      direct_company_url = excluded.direct_company_url,
      updated_at = excluded.updated_at`
  ).run(...insertValues);
}

function purgeLegacySeedData(db: DatabaseSync) {
  if (readMetadataValue(db, "legacy_seed_v1_purged") === "1") {
    return;
  }

  const placeholders = Array.from(LEGACY_SEED_COMPANY_SLUGS);
  const placeholderList = placeholders.map(() => "?").join(", ");
  const emptyList = serializeList([]);
  const updatedAt = todayIsoDate();

  db.prepare(
    `DELETE FROM jobs
     WHERE company_slug IN (${placeholderList})
       AND trim(COALESCE(source_name, '')) = ''
       AND trim(COALESCE(source_kind, '')) = ''`
  ).run(...placeholders);

  db.prepare(
    `UPDATE companies
     SET tagline = '',
         about = 'Bu profil yalnız təsdiqlənmiş vakansiya mənbələrinə əsaslanan minimal faktları göstərir.',
         wikipedia_summary = NULL,
         wikipedia_source_url = NULL,
         focus_areas = ?,
         youth_offer = ?,
         benefits = ?,
         featured = 0,
         verified = 0,
         updated_at = ?
     WHERE slug IN (${placeholderList})`
  ).run(emptyList, emptyList, emptyList, updatedAt, ...placeholders);

  db.prepare(
    `DELETE FROM company_aliases
     WHERE company_slug IN (
       SELECT slug
       FROM companies
       WHERE slug IN (${placeholderList})
         AND NOT EXISTS (
           SELECT 1
           FROM jobs
           WHERE jobs.company_slug = companies.slug
         )
     )`
  ).run(...placeholders);

  db.prepare(
    `DELETE FROM companies
     WHERE slug IN (${placeholderList})
       AND NOT EXISTS (
         SELECT 1
         FROM jobs
         WHERE jobs.company_slug = companies.slug
       )`
  ).run(...placeholders);

  writeMetadataValue(db, "legacy_seed_v1_purged", "1");
}

function migrateLegacyStore(db: DatabaseSync) {
  if (readMetadataValue(db, "legacy_store_migrated") === "1") {
    return;
  }

  if (fs.existsSync(legacyStorePath)) {
    try {
      const raw = fs.readFileSync(legacyStorePath, "utf8");
      const parsed = JSON.parse(raw) as LegacyPlatformStore;

      for (const company of parsed.companies ?? []) {
        insertCompanyRecord(db, company);
      }

      for (const job of parsed.jobs ?? []) {
        insertJobRecord(db, {
          ...job,
          featured: Boolean(job.featured)
        });
      }
    } catch {
      // Ignore malformed legacy data and continue with the primary database.
    }
  }

  writeMetadataValue(db, "legacy_store_migrated", "1");
}

function cleanupSpeculativeApplyUrls(db: DatabaseSync) {
  if (readMetadataValue(db, "speculative_apply_cleanup_v1") === "1") {
    return;
  }

  const rows = db.prepare(
    `SELECT slug, source_name, source_kind, source_url, source_listing_url, job_detail_url, apply_action_url, external_apply_url
     FROM jobs
     WHERE COALESCE(validation_status, 'pending') != 'verified'
       AND COALESCE(canonical_apply_url, '') = ''
       AND COALESCE(resolved_apply_url, '') = ''
       AND (
         source_name IN ('LinkedIn', 'HelloJob', 'HelloJob.az')
         OR source_kind IN ('aggregator', 'job-board')
       )`
  ).all() as Array<{
    slug?: string;
    source_name?: string | null;
    source_kind?: string | null;
    source_url?: string | null;
    source_listing_url?: string | null;
    job_detail_url?: string | null;
    apply_action_url?: string | null;
    external_apply_url?: string | null;
  }>;

  for (const row of rows) {
    const slug = row.slug?.trim();
    if (!slug) {
      continue;
    }

    const sourceDomain =
      normalizeDomainLookupValue(row.source_url) ??
      normalizeDomainLookupValue(row.source_listing_url) ??
      normalizeDomainLookupValue(row.job_detail_url);
    const applyDomain =
      normalizeDomainLookupValue(row.apply_action_url) ??
      normalizeDomainLookupValue(row.external_apply_url);

    if (!applyDomain || !sourceDomain) {
      continue;
    }

    const sameSourceDomain =
      applyDomain === sourceDomain ||
      applyDomain.endsWith(`.${sourceDomain}`) ||
      sourceDomain.endsWith(`.${applyDomain}`);

    if (sameSourceDomain) {
      continue;
    }

    db.prepare(
      `UPDATE jobs
       SET apply_action_url = NULL,
           external_apply_url = NULL,
           resolved_apply_url = NULL,
           canonical_apply_url = NULL,
           apply_url = NULL,
           candidate_apply_urls_json = '[]',
           apply_link_status = 'broken',
           apply_link_reason = 'speculative_candidate_removed',
           validation_status = 'unresolved',
           needs_admin_review = 1,
           updated_at = ?
       WHERE slug = ?`
    ).run(todayIsoDate(), slug);
  }

  writeMetadataValue(db, "speculative_apply_cleanup_v1", "1");
}

function cleanupMalformedOrphanJobs(db: DatabaseSync) {
  if (readMetadataValue(db, "malformed_orphan_jobs_cleanup_v1") === "1") {
    return;
  }

  db.exec(`
    DELETE FROM jobs
    WHERE trim(COALESCE(source_name, '')) = ''
      AND trim(COALESCE(source_kind, '')) = ''
      AND trim(COALESCE(source_url, '')) = ''
      AND trim(COALESCE(source_listing_url, '')) = ''
      AND trim(COALESCE(job_detail_url, '')) = ''
      AND trim(COALESCE(canonical_apply_url, '')) = ''
      AND trim(COALESCE(resolved_apply_url, '')) = ''
      AND COALESCE(validation_status, 'pending') != 'verified'
  `);

  writeMetadataValue(db, "malformed_orphan_jobs_cleanup_v1", "1");
}

function cleanupTemplatedCompanyFields(db: DatabaseSync) {
  if (readMetadataValue(db, "templated_company_fields_cleanup_v1") === "1") {
    return;
  }

  const emptyList = serializeList([]);

  db.prepare(
    `UPDATE companies
     SET focus_areas = ?,
         youth_offer = ?,
         benefits = ?,
         updated_at = ?
     WHERE focus_areas = '["Vakansiyalar"]'
        OR youth_offer = '["Mənbə vakansiyası əsasında avtomatik yaradılmış profil"]'
        OR benefits = '["Yalnız yoxlanmış vakansiya və müraciət linkləri aktivləşdirilir"]'`
  ).run(emptyList, emptyList, emptyList, todayIsoDate());

  writeMetadataValue(db, "templated_company_fields_cleanup_v1", "1");
}

function cleanupTemplatedCompanyAbout(db: DatabaseSync) {
  if (readMetadataValue(db, "templated_company_about_cleanup_v1") === "1") {
    return;
  }

  db.prepare(
    `UPDATE companies
     SET about = ?,
         updated_at = ?
     WHERE about LIKE 'Bu şirkət profili avtomatik yaradılıb%'`
  ).run(
    "Bu profil yalnız təsdiqlənmiş vakansiya mənbələrinə əsaslanan minimal faktları göstərir.",
    todayIsoDate()
  );

  writeMetadataValue(db, "templated_company_about_cleanup_v1", "1");
}

function cleanupGeneratedCompanyProfileContent(db: DatabaseSync) {
  if (readMetadataValue(db, "generated_company_profile_content_cleanup_v1") === "1") {
    return;
  }

  db.prepare(
    `UPDATE companies
     SET tagline = CASE
           WHEN tagline LIKE 'Açıq rollar % mənbəsindən toplanır.%' THEN ''
           ELSE tagline
         END,
         about = CASE
           WHEN about LIKE 'Bu profil yalnız təsdiqlənmiş vakansiya mənbələrinə əsaslanan minimal faktları göstərir.%'
             OR about LIKE 'Bu minimal profil yalnız %'
             OR about LIKE 'Bu şirkət profili avtomatik yaradılıb%'
           THEN ''
           ELSE about
         END,
         size = CASE
           WHEN size IN ('Naməlum', 'Unknown', 'unknown') THEN ''
           ELSE size
         END,
         industry_tags = CASE
           WHEN sector IN ('Other', 'Naməlum sektor', 'Unknown sector', '') THEN ?
           ELSE industry_tags
         END,
         updated_at = ?
     WHERE tagline LIKE 'Açıq rollar % mənbəsindən toplanır.%'
        OR about LIKE 'Bu profil yalnız təsdiqlənmiş vakansiya mənbələrinə əsaslanan minimal faktları göstərir.%'
        OR about LIKE 'Bu minimal profil yalnız %'
        OR about LIKE 'Bu şirkət profili avtomatik yaradılıb%'
        OR size IN ('Naməlum', 'Unknown', 'unknown')
        OR sector IN ('Other', 'Naməlum sektor', 'Unknown sector', '')`
  ).run(serializeList([]), todayIsoDate());

  writeMetadataValue(db, "generated_company_profile_content_cleanup_v1", "1");
}

function cleanupCompanyDomainHints(db: DatabaseSync) {
  if (readMetadataValue(db, "company_domain_hint_cleanup_v1") === "1") {
    return;
  }

  db.exec(`
    UPDATE companies
    SET company_domain = NULL,
        updated_at = date('now')
    WHERE company_domain IS NOT NULL
      AND (
        company_domain IN ('greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'smartrecruiters.com', 'recruitee.com', 'jobvite.com', 'glorri.com', 'glorri.az', 'careers-page.com')
        OR company_domain LIKE '%.greenhouse.io'
        OR company_domain LIKE '%.lever.co'
        OR company_domain LIKE '%.myworkdayjobs.com'
        OR company_domain LIKE '%.smartrecruiters.com'
        OR company_domain LIKE '%.recruitee.com'
        OR company_domain LIKE '%.jobvite.com'
        OR company_domain LIKE '%.glorri.com'
        OR company_domain LIKE '%.glorri.az'
      )
  `);

  writeMetadataValue(db, "company_domain_hint_cleanup_v1", "1");
}

function normalizeStoredJobLevels(db: DatabaseSync) {
  db.exec(`
    UPDATE jobs
    SET level = CASE
      WHEN level IN ('internship', 'trainee', 'junior', 'entry_level', 'new_graduate', 'mid', 'senior', 'manager', 'unknown') THEN level
      WHEN level IN ('Təcrübə', 'Internship', 'Intern', 'intern', 'Staj', 'staj', 'Təcrübəçi') THEN 'internship'
      WHEN level IN ('Trainee', 'trainee', 'Management Trainee') THEN 'trainee'
      WHEN level IN ('Junior', 'junior') THEN 'junior'
      WHEN level IN ('Entry level', 'Entry-level', 'entry level', 'Assistant', 'Associate') THEN 'entry_level'
      WHEN level IN ('Yeni məzun', 'New graduate', 'Graduate', 'graduate') THEN 'new_graduate'
      WHEN level IN ('Mid', 'Middle', 'mid') THEN 'mid'
      WHEN level IN ('Senior', 'senior') THEN 'senior'
      WHEN level IN ('Manager', 'Menecer', 'manager') THEN 'manager'
      WHEN level IN ('Naməlum', 'Unknown', 'unknown') THEN 'unknown'
      ELSE 'unknown'
    END
    WHERE level IS NULL
       OR level NOT IN ('internship', 'trainee', 'junior', 'entry_level', 'new_graduate', 'mid', 'senior', 'manager', 'unknown')
  `);
}

function backfillCompanyVerificationFromPublicJobs(db: DatabaseSync) {
  if (readMetadataValue(db, "company_verification_backfill_v1") === "1") {
    return;
  }

  db.exec(`
    UPDATE companies
    SET verified = 1,
        updated_at = date('now')
    WHERE EXISTS (
      SELECT 1
      FROM jobs
      WHERE jobs.company_slug = companies.slug
        AND COALESCE(jobs.publishable, 1) = 1
        AND COALESCE(jobs.is_expired, 0) = 0
        AND COALESCE(jobs.validation_status, 'pending') = 'verified'
        AND COALESCE(jobs.apply_link_status, 'broken') = 'valid'
        AND COALESCE(jobs.official_source, 0) = 1
        AND COALESCE(jobs.canonical_apply_url, jobs.resolved_apply_url, jobs.apply_url) IS NOT NULL
        AND trim(COALESCE(jobs.canonical_apply_url, jobs.resolved_apply_url, jobs.apply_url)) <> ''
    )
  `);

  writeMetadataValue(db, "company_verification_backfill_v1", "1");
}

function backfillCompanySourceProfiles(db: DatabaseSync) {
  if (readMetadataValue(db, "company_profile_source_backfill_v5") === "1") {
    return;
  }

  const rows = db.prepare(
    `SELECT companies.slug, companies.name, companies.sector, companies.location, companies.website, companies.profile_source_url, companies.about,
            jobs.source_url, jobs.source_listing_url, jobs.job_detail_url, jobs.apply_action_url, jobs.direct_company_url
     FROM companies
     INNER JOIN jobs ON jobs.company_slug = companies.slug
     ORDER BY jobs.updated_at DESC, jobs.created_at DESC`
  ).all() as Array<{
    slug?: string;
    name?: string;
    sector?: string;
    location?: string;
    website?: string;
    profile_source_url?: string | null;
    about?: string;
    source_url?: string | null;
    source_listing_url?: string | null;
    job_detail_url?: string | null;
    apply_action_url?: string | null;
    direct_company_url?: string | null;
  }>;

  const seen = new Set<string>();

  for (const row of rows) {
    const slug = row.slug?.trim();
    if (!slug || seen.has(slug)) {
      continue;
    }

    const profileSourceUrl = pickCompanyProfileSourceUrl(
      row.website,
      row.direct_company_url,
      row.source_listing_url,
      row.source_url,
      row.job_detail_url
    );

    if (!profileSourceUrl) {
      continue;
    }

    const inferredSector = inferCompanySectorFromEvidence({
      companyName: row.name ?? slug,
      evidenceUrl: profileSourceUrl,
      sourceName: profileSourceUrl
    });
    const currentSector = getMeaningfulMetadataValue(row.sector);
    const nextSector = currentSector ?? inferredSector;
    const nextWebsite = row.website?.trim() || profileSourceUrl;
    const nextAbout =
      row.about?.trim() && row.about !== "Bu profil yalnız təsdiqlənmiş vakansiya mənbələrinə əsaslanan minimal faktları göstərir."
        ? row.about
        : "Bu profil yalnız təsdiqlənmiş vakansiya mənbələrinə əsaslanan minimal faktları göstərir.";

    const currentProfileSourceUrl = row.profile_source_url?.trim() || "";
    const currentWebsite = row.website?.trim() || "";
    if (currentProfileSourceUrl === profileSourceUrl && currentWebsite === nextWebsite) {
      seen.add(slug);
      continue;
    }

    db.prepare(
      `UPDATE companies
       SET sector = ?,
           industry_tags = ?,
           location = COALESCE(NULLIF(location, ''), ?),
           website = ?,
           profile_source_url = ?,
           company_domain = COALESCE(company_domain, ?),
           about = ?,
           updated_at = ?
       WHERE slug = ?`
    ).run(
      nextSector,
      serializeList(nextSector === "Other" ? [] : [nextSector]),
      row.location?.trim() || "Azərbaycan",
      nextWebsite,
      profileSourceUrl,
      normalizeDomainLookupValue(profileSourceUrl),
      nextAbout,
      todayIsoDate(),
      slug
    );

    seen.add(slug);
  }

  writeMetadataValue(db, "company_profile_source_backfill_v5", "1");
}

function backfillApplyUrls(db: DatabaseSync) {
  void db;
}

export function refreshStoredJobVisibilityState() {
  refreshJobVisibilityState(getDatabase());
}

function refreshJobVisibilityState(db: DatabaseSync) {
  db.exec(`
    UPDATE jobs
    SET source_listing_url = COALESCE(source_listing_url, source_url),
        job_detail_url = CASE
          WHEN COALESCE(job_detail_url, source_url, source_listing_url) LIKE '%linkedin.com/jobs/view/%'
            AND instr(COALESCE(job_detail_url, source_url, source_listing_url), '?') > 0
          THEN substr(
            COALESCE(job_detail_url, source_url, source_listing_url),
            1,
            instr(COALESCE(job_detail_url, source_url, source_listing_url), '?') - 1
          )
          ELSE COALESCE(job_detail_url, source_url, source_listing_url)
        END,
        canonical_apply_url = CASE
          WHEN COALESCE(validation_status, 'pending') = 'verified'
            AND COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NOT NULL
            AND trim(COALESCE(canonical_apply_url, resolved_apply_url, apply_url)) <> ''
            AND NOT (
              (COALESCE(source_url, source_listing_url, job_detail_url, apply_url) LIKE '%linkedin.com/jobs/view/%'
               OR COALESCE(canonical_apply_url, resolved_apply_url, apply_url) LIKE '%linkedin.com/jobs/view/%')
              AND COALESCE(apply_link_kind, '') NOT IN ('linkedin_easy_apply', 'linkedin_offsite')
            )
          THEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url)
          ELSE NULL
        END,
        apply_action_url = COALESCE(apply_action_url, canonical_apply_url, apply_url, job_detail_url, source_url),
        apply_link_kind = CASE
          WHEN apply_link_kind IS NOT NULL AND trim(apply_link_kind) <> '' THEN apply_link_kind
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) LIKE '%linkedin.com/jobs/view/%' THEN 'linkedin_detail_only'
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NOT NULL AND trim(COALESCE(canonical_apply_url, resolved_apply_url, apply_url)) <> '' THEN 'external'
          ELSE apply_link_kind
        END,
        apply_cta_mode = CASE
          WHEN COALESCE(validation_status, 'pending') <> 'verified' THEN 'disabled'
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NULL OR trim(COALESCE(canonical_apply_url, resolved_apply_url, apply_url)) = '' THEN 'disabled'
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) LIKE '%linkedin.com/jobs/view/%'
            AND COALESCE(apply_link_kind, '') NOT IN ('linkedin_easy_apply', 'linkedin_offsite') THEN 'disabled'
          ELSE COALESCE(apply_cta_mode, CASE WHEN COALESCE(verified_apply, 0) = 1 THEN 'apply' ELSE 'view' END)
        END,
        apply_link_status = CASE
          WHEN COALESCE(validation_status, 'pending') <> 'verified' THEN
            CASE
              WHEN COALESCE(apply_action_url, external_apply_url, apply_url) IS NOT NULL
                AND trim(COALESCE(apply_action_url, external_apply_url, apply_url)) <> '' THEN 'uncertain'
              ELSE 'broken'
            END
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NULL OR trim(COALESCE(canonical_apply_url, resolved_apply_url, apply_url)) = '' THEN
            CASE
              WHEN COALESCE(apply_action_url, external_apply_url, apply_url) IS NOT NULL
                AND trim(COALESCE(apply_action_url, external_apply_url, apply_url)) <> '' THEN 'uncertain'
              ELSE 'broken'
            END
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) LIKE '%linkedin.com/jobs/view/%'
            AND COALESCE(apply_link_kind, '') NOT IN ('linkedin_easy_apply', 'linkedin_offsite') THEN 'broken'
          ELSE COALESCE(apply_link_status, 'valid')
        END,
        apply_link_score = CASE
          WHEN COALESCE(validation_status, 'pending') <> 'verified' THEN COALESCE(apply_link_score, 0)
          WHEN (apply_link_score IS NULL OR apply_link_score = 0) AND COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NOT NULL AND trim(COALESCE(canonical_apply_url, resolved_apply_url, apply_url)) <> '' THEN 0.82
          ELSE COALESCE(apply_link_score, 0)
        END,
        verified_apply = CASE
          WHEN COALESCE(validation_status, 'pending') <> 'verified' THEN 0
          ELSE COALESCE(verified_apply, 0)
        END,
        official_source = CASE
          WHEN COALESCE(official_source, 0) = 0 AND (source_kind = 'career-page' OR source_url IS NULL OR source_url = direct_company_url) THEN 1
          ELSE COALESCE(official_source, 0)
        END,
        freshness_status = CASE
          WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) <= 3 THEN 'hot'
          WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) <= 14 THEN 'fresh'
          WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) <= 30 THEN 'aging'
          WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) <= 45 THEN 'stale'
          ELSE 'expired'
        END,
        trust_badges = CASE
          WHEN trust_badges IS NULL OR trim(trust_badges) = '' OR trust_badges = '[]' THEN
            CASE
              WHEN COALESCE(canonical_apply_url, apply_url) IS NOT NULL AND trim(COALESCE(canonical_apply_url, apply_url)) <> '' AND (source_kind = 'career-page' OR source_url IS NULL OR source_url = direct_company_url)
              THEN CASE
                WHEN COALESCE(verified_apply, 0) = 1 THEN '["verified_apply","official_source"]'
                ELSE '["verified_job_page","official_source"]'
              END
              WHEN COALESCE(canonical_apply_url, apply_url) IS NOT NULL AND trim(COALESCE(canonical_apply_url, apply_url)) <> '' THEN
                CASE
                  WHEN COALESCE(apply_link_kind, '') IN ('linkedin_easy_apply', 'linkedin_offsite')
                  THEN '["verified_apply","linkedin_apply"]'
                  WHEN COALESCE(verified_apply, 0) = 1 THEN '["verified_apply"]'
                  ELSE '["verified_job_page"]'
                END
              ELSE '[]'
            END
          ELSE trust_badges
        END,
        logo_url = COALESCE(logo_url, (SELECT companies.logo FROM companies WHERE companies.slug = jobs.company_slug)),
        checked_recently_at = COALESCE(checked_recently_at, updated_at, created_at, posted_at),
        last_checked_at = COALESCE(last_checked_at, checked_recently_at, updated_at, created_at, posted_at),
        is_expired = CASE
          WHEN COALESCE(is_expired, 0) = 1 THEN 1
          WHEN COALESCE(deadline, date('now')) < date('now') THEN 1
          WHEN COALESCE(freshness_status, 'fresh') = 'expired' THEN 1
          ELSE 0
        END,
        expires_at = CASE
          WHEN COALESCE(expires_at, '') <> '' THEN expires_at
          WHEN COALESCE(deadline, date('now')) < date('now') THEN deadline
          WHEN COALESCE(freshness_status, 'fresh') = 'expired' THEN COALESCE(last_checked_at, checked_recently_at, updated_at, created_at, posted_at)
          ELSE NULL
        END,
        publishable = CASE
          WHEN COALESCE(validation_status, 'pending') <> 'verified' THEN 0
          WHEN COALESCE(is_expired, 0) = 1 THEN 0
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NULL OR trim(COALESCE(canonical_apply_url, resolved_apply_url, apply_url)) = '' THEN 0
          WHEN COALESCE(apply_link_status, 'valid') = 'broken' THEN 0
          WHEN COALESCE(apply_cta_mode, 'apply') = 'disabled' THEN 0
          WHEN COALESCE(deadline, date('now')) < date('now') THEN 0
          WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) > 45 THEN 0
          ELSE 1
        END,
        rejection_reason = CASE
          WHEN COALESCE(validation_status, 'pending') <> 'verified' AND COALESCE(apply_action_url, external_apply_url, apply_url) IS NOT NULL AND trim(COALESCE(apply_action_url, external_apply_url, apply_url)) <> '' THEN 'unverified_apply_url'
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NULL OR trim(COALESCE(canonical_apply_url, resolved_apply_url, apply_url)) = '' THEN 'missing_apply_url'
          WHEN COALESCE(apply_link_status, 'valid') = 'broken' THEN 'broken_apply_link'
          WHEN COALESCE(deadline, date('now')) < date('now') OR julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) > 45 THEN 'stale_or_expired'
          ELSE NULL
        END,
        rejection_category = CASE
          WHEN COALESCE(validation_status, 'pending') <> 'verified' AND COALESCE(apply_action_url, external_apply_url, apply_url) IS NOT NULL AND trim(COALESCE(apply_action_url, external_apply_url, apply_url)) <> '' THEN 'apply_link'
          WHEN COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NULL OR trim(COALESCE(canonical_apply_url, resolved_apply_url, apply_url)) = '' OR COALESCE(apply_link_status, 'valid') = 'broken' THEN 'apply_link'
          WHEN COALESCE(deadline, date('now')) < date('now') OR julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) > 45 THEN 'freshness'
          ELSE NULL
        END
  `);
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function nextUniqueSlug(baseValue: string, lookupTable: "companies" | "jobs") {
  const db = getDatabase();
  const baseSlug = createSlug(baseValue) || "item";
  let slug = baseSlug;
  let attempt = 2;

  while (db.prepare(`SELECT 1 FROM ${lookupTable} WHERE slug = ? LIMIT 1`).get(slug)) {
    slug = `${baseSlug}-${attempt}`;
    attempt += 1;
  }

  return slug;
}

function syncCompanyJobFeaturedFlag(companySlug: string, companyFeatured: boolean) {
  const db = getDatabase();

  db.prepare(
    `UPDATE jobs
     SET featured = CASE
       WHEN ? = 1 AND level IN ('internship', 'junior', 'trainee', 'entry_level', 'new_graduate') THEN 1
       ELSE 0
     END
     WHERE company_slug = ?`
  ).run(companyFeatured ? 1 : 0, companySlug);
}

function normalizeCompanyLookupValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\b(llc|ltd|inc|plc|company|group|holdings?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDomainLookupValue(value: string | null | undefined) {
  const domain = extractCompanyDomain(value);
  const normalized =
    domain
      ?.replace(/^careers?\./, "")
      .replace(/^jobs?\./, "")
      .replace(/^job-boards?\./, "")
      .replace(/^boards?\./, "")
      .replace(/^api\./, "") ?? null;

  return normalized && !isKnownAtsDomain(normalized) ? normalized : null;
}

function isKnownAtsDomain(domain: string | null | undefined) {
  if (!domain) {
    return false;
  }

  return [
    "greenhouse.io",
    "lever.co",
    "myworkdayjobs.com",
    "smartrecruiters.com",
    "recruitee.com",
    "jobvite.com",
    "glorri.com",
    "glorri.az",
    "careers-page.com"
  ].some((host) => domain === host || domain.endsWith(`.${host}`));
}

function isRestrictedProfileSourceDomain(domain: string | null | undefined) {
  if (!domain) {
    return false;
  }

  return RESTRICTED_PROFILE_SOURCE_DOMAINS.some((host) => domain === host || domain.endsWith(`.${host}`));
}

function pickCompanyProfileSourceUrl(
  companyWebsite: string | null | undefined,
  ...candidateUrls: Array<string | null | undefined>
) {
  const normalizedWebsite = companyWebsite?.trim() || "";
  const websiteDomain = normalizeDomainLookupValue(normalizedWebsite);
  let firstSafeCandidate = "";

  for (const candidateValue of candidateUrls) {
    const candidate = candidateValue?.trim() || "";
    if (!candidate) {
      continue;
    }

    const candidateDomain = normalizeDomainLookupValue(candidate);
    if (!candidateDomain || isRestrictedProfileSourceDomain(candidateDomain)) {
      continue;
    }

    if (!firstSafeCandidate) {
      firstSafeCandidate = candidate;
    }

    if (
      websiteDomain &&
      (candidateDomain === websiteDomain ||
        candidateDomain.endsWith(`.${websiteDomain}`) ||
        websiteDomain.endsWith(`.${candidateDomain}`) ||
        isKnownAtsDomain(candidateDomain))
    ) {
      return candidate;
    }
  }

  return normalizedWebsite || firstSafeCandidate || "";
}

function inferCompanySectorFromEvidence(input: {
  companyName: string;
  evidenceUrl?: string | null;
  sourceName?: string | null;
}) {
  const haystack = normalizeCompanyLookupValue(
    [input.companyName, input.sourceName, input.evidenceUrl].filter(Boolean).join(" ")
  );

  if (/\b(bank|abb|kapital|accessbank|unibank|yelo|xalq)\b/.test(haystack)) {
    return "Banking";
  }

  if (/\b(sigorta|insurance|hayat|life)\b/.test(haystack)) {
    return "Insurance";
  }

  if (/\b(azercell|bakcell|telekom|telecom|azerconnect)\b/.test(haystack)) {
    return "Telecom";
  }

  if (/\b(bravo|araz|oba|market|supermarket|electronics|bazarstore|retail)\b/.test(haystack)) {
    return "Retail";
  }

  if (/\b(socar|bp|energy|oil|gas)\b/.test(haystack)) {
    return "Energy";
  }

  if (/\b(azerpost|azal|airlines|demir yollari|rail|metro|bakubus|shipyard|silk way|logistics)\b/.test(haystack)) {
    return "Logistics";
  }

  if (/\b(code academy|academy|education|school|universit)\b/.test(haystack)) {
    return "Education";
  }

  if (/\b(avromed|health|medical|pharma|clinic)\b/.test(haystack)) {
    return "Healthcare";
  }

  if (/\b(canonical|figma|microsoft|binance|technology|tech|software)\b/.test(haystack)) {
    return "Technology";
  }

  if (/\b(deloitte|kpmg|pwc|ey|consulting)\b/.test(haystack)) {
    return "Consulting";
  }

  if (/\b(azersun|azergold|azerfloat|akkord|norm|steel|manufactur|factory|zavod)\b/.test(haystack)) {
    return "Manufacturing";
  }

  if (/\b(azcon|azercosmos|government|public)\b/.test(haystack)) {
    return "Government / Public";
  }

  return "Other";
}

function registerCompanyAlias(
  db: DatabaseSync,
  input: { companySlug: string; alias: string; domainHint?: string | null; isPrimary?: boolean }
) {
  const normalizedAlias = normalizeCompanyLookupValue(input.alias);
  if (!normalizedAlias) {
    return;
  }

  db.prepare(
    `INSERT INTO company_aliases (
      company_slug, alias, normalized_alias, domain_hint, is_primary, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(company_slug, normalized_alias) DO UPDATE SET
      alias = excluded.alias,
      domain_hint = COALESCE(excluded.domain_hint, company_aliases.domain_hint),
      is_primary = MAX(company_aliases.is_primary, excluded.is_primary)`
  ).run(
    input.companySlug,
    input.alias.trim(),
    normalizedAlias,
    normalizeDomainLookupValue(input.domainHint) ?? null,
    input.isPrimary ? 1 : 0,
    todayIsoDate()
  );
}

function findCompanyByAlias(companyName: string, evidenceUrl?: string | null) {
  const normalizedAlias = normalizeCompanyLookupValue(companyName);
  if (!normalizedAlias) {
    return null;
  }

  const domainHint = normalizeDomainLookupValue(evidenceUrl);
  const db = getDatabase();
  const row = db.prepare(
    `SELECT companies.slug, companies.name, companies.tagline, companies.sector, companies.industry_tags, companies.size,
            companies.location, companies.logo, companies.cover, companies.website, companies.profile_source_url,
            companies.company_domain, companies.about, companies.wikipedia_summary, companies.wikipedia_source_url,
            companies.focus_areas, companies.youth_offer, companies.benefits, companies.featured, companies.verified, companies.visible,
            companies.created_at, companies.updated_at
     FROM company_aliases
     INNER JOIN companies ON companies.slug = company_aliases.company_slug
     WHERE company_aliases.normalized_alias = ?
       AND (? IS NULL OR company_aliases.domain_hint IS NULL OR company_aliases.domain_hint = ?)
     ORDER BY company_aliases.is_primary DESC, companies.verified DESC, companies.created_at DESC
     LIMIT 1`
  ).get(normalizedAlias, domainHint, domainHint) as CompanyRow | undefined;

  return row ? mapCompanyRow(row) : null;
}

function findCompanyByDomainHint(domainHint: string | null | undefined) {
  const normalizedDomain = normalizeDomainLookupValue(domainHint);
  if (!normalizedDomain || isKnownAtsDomain(normalizedDomain)) {
    return null;
  }

  return (
    listCompanies().find((company) => {
      const companyDomain = normalizeDomainLookupValue(company.companyDomain ?? company.website);
      return Boolean(
        companyDomain &&
          (companyDomain === normalizedDomain ||
            companyDomain.endsWith(`.${normalizedDomain}`) ||
            normalizedDomain.endsWith(`.${companyDomain}`))
      );
    }) ?? null
  );
}

function findCompanyByNormalizedName(companyName: string) {
  const normalizedTarget = normalizeCompanyLookupValue(companyName);

  if (!normalizedTarget) {
    return null;
  }

  return (
    listCompanies().find((company) => normalizeCompanyLookupValue(company.name) === normalizedTarget) ?? null
  );
}

function findCompanyByCanonicalIdentity(input: { companyName: string; evidenceUrl?: string | null }) {
  return (
    findCompanyByNormalizedName(input.companyName) ??
    findCompanyByAlias(input.companyName, input.evidenceUrl) ??
    findCompanyByDomainHint(input.evidenceUrl) ??
    null
  );
}

export function listCompanies(options: ListCompaniesOptions = {}) {
  const db = getDatabase();
  const whereParts: string[] = [];
  const params: Array<string | number> = [];

  if (options.sector) {
    whereParts.push("sector = ?");
    params.push(options.sector);
  }

  if (options.onlyWithPublicJobs) {
    whereParts.push(
      `EXISTS (
        SELECT 1
        FROM jobs
        WHERE jobs.company_slug = companies.slug
          AND ${publicJobPredicates("jobs").join("\n          AND ")}
        LIMIT 1
      )`
    );
  }

  const limit = normalizeLimit(options.limit);
  if (limit) {
    params.push(limit);
  }

  const startedAt = Date.now();
  const rows = db
    .prepare(
      `SELECT slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, profile_source_url, company_domain, about,
              wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, verified, visible, created_at, updated_at
       FROM companies
       ${whereParts.length > 0 ? `WHERE ${whereParts.join("\n         AND ")}` : ""}
       ORDER BY featured DESC, created_at DESC, name ASC
       ${limit ? "LIMIT ?" : ""}`
    )
    .all(...params) as CompanyRow[];
  logDatabaseTiming("listCompanies", startedAt, `rows=${rows.length}${limit ? ` limit=${limit}` : ""}`);

  return rows.map(mapCompanyRow);
}

export function listJobs(options: ListJobsOptions = {}) {
  const db = getDatabase();
  const whereParts = options.includeUnpublished ? [] : publicJobPredicates("jobs");
  const params: Array<string | number> = [];

  if (options.companySlug) {
    whereParts.push("jobs.company_slug = ?");
    params.push(options.companySlug);
  }

  if (options.excludeSlug) {
    whereParts.push("jobs.slug <> ?");
    params.push(options.excludeSlug);
  }

  if (options.level) {
    whereParts.push("jobs.level = ?");
    params.push(options.level);
  }

  if (options.workModel) {
    whereParts.push("jobs.work_model = ?");
    params.push(options.workModel);
  }

  if (options.city) {
    whereParts.push("(jobs.city = ? OR jobs.location_normalized = ? OR jobs.location_raw = ?)");
    params.push(options.city, options.city, options.city);
  }

  if (options.category) {
    whereParts.push("jobs.category = ?");
    params.push(options.category);
  }

  const limit = normalizeLimit(options.limit);
  const offset = Math.max(0, Math.floor(options.offset ?? 0));

  if (limit) {
    params.push(limit);
  }

  if (offset > 0) {
    params.push(offset);
  }

  const startedAt = Date.now();
  const rows = db
    .prepare(
      `SELECT slug, title, company_slug, company_name, city, location_raw, location_normalized, location_source, work_model, level, category, posted_at, deadline,
              summary, responsibilities, requirements, benefits, tags, featured, source_name, source_kind, source_url, source_listing_url, job_detail_url,
              apply_action_url, candidate_apply_urls_json, external_apply_url, resolved_apply_url, canonical_apply_url, apply_url,
              apply_link_status, apply_link_score, apply_link_kind, apply_cta_mode, apply_link_reason, verified_apply, official_source, checked_recently_at, last_checked_at, freshness_status, expires_at, is_expired, trust_badges, trust_score, publishable,
              validation_status, needs_admin_review, scrape_error,
              moderation_status, moderation_notes, moderation_updated_at, internship_confidence, location_confidence, classification_confidence, classification_reason,
              search_keywords, normalized_keywords, source_language, category_confidence, category_reason, duplicate_risk,
              logo_url, logo_source, logo_confidence,
              direct_company_url,
              created_at, updated_at
       FROM jobs
       ${whereParts.length > 0 ? `WHERE ${whereParts.join("\n         AND ")}` : ""}
       ORDER BY posted_at DESC, created_at DESC, title ASC
       ${limit ? "LIMIT ?" : ""}
       ${offset > 0 ? "OFFSET ?" : ""}`
    )
    .all(...params) as JobRow[];
  logDatabaseTiming(
    "listJobs",
    startedAt,
    `rows=${rows.length}${limit ? ` limit=${limit}` : ""}${options.companySlug ? ` company=${options.companySlug}` : ""}`
  );

  return rows.map(mapJobRow);
}

export function findCompanyBySlug(slug: string) {
  const db = getDatabase();
  const startedAt = Date.now();
  const row = db
    .prepare(
      `SELECT slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, profile_source_url, company_domain, about,
              wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, verified, visible, created_at, updated_at
       FROM companies
       WHERE slug = ?`
    )
    .get(slug) as CompanyRow | undefined;
  logDatabaseTiming("findCompanyBySlug", startedAt, `slug=${slug}`);

  return row ? mapCompanyRow(row) : undefined;
}

export function hasPublicJobForCompany(companySlug: string) {
  const db = getDatabase();
  const startedAt = Date.now();
  const row = db
    .prepare(
      `SELECT 1
       FROM jobs
       WHERE company_slug = ?
         AND ${publicJobPredicates("jobs").join("\n         AND ")}
       LIMIT 1`
    )
    .get(companySlug) as { 1?: number } | undefined;
  logDatabaseTiming("hasPublicJobForCompany", startedAt, `company=${companySlug}`);

  return Boolean(row);
}

export function countPublicJobs() {
  const db = getDatabase();
  const startedAt = Date.now();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM jobs
       WHERE ${publicJobPredicates("jobs").join("\n         AND ")}`
    )
    .get() as { count?: number | bigint } | undefined;
  logDatabaseTiming("countPublicJobs", startedAt);

  return Number(row?.count ?? 0);
}

export function countPublicCompanies() {
  const db = getDatabase();
  const startedAt = Date.now();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM companies
       WHERE EXISTS (
         SELECT 1
         FROM jobs
         WHERE jobs.company_slug = companies.slug
           AND ${publicJobPredicates("jobs").join("\n           AND ")}
         LIMIT 1
       )`
    )
    .get() as { count?: number | bigint } | undefined;
  logDatabaseTiming("countPublicCompanies", startedAt);

  return Number(row?.count ?? 0);
}

export function countPublicJobsByCompanySlugs(companySlugs?: string[]) {
  const db = getDatabase();
  const slugs = Array.from(new Set((companySlugs ?? []).filter(Boolean)));
  const params: string[] = [];
  const scopedCompanyClause =
    slugs.length > 0
      ? `AND company_slug IN (${slugs.map(() => "?").join(", ")})`
      : "";

  if (slugs.length > 0) {
    params.push(...slugs);
  }

  const startedAt = Date.now();
  const rows = db
    .prepare(
      `SELECT company_slug, COUNT(*) AS count
       FROM jobs
       WHERE ${publicJobPredicates("jobs").join("\n         AND ")}
         ${scopedCompanyClause}
       GROUP BY company_slug`
    )
    .all(...params) as Array<{ company_slug?: string; count?: number | bigint }>;
  logDatabaseTiming("countPublicJobsByCompanySlugs", startedAt, `rows=${rows.length}`);

  return rows.reduce<Map<string, number>>((index, row) => {
    if (row.company_slug) {
      index.set(row.company_slug, Number(row.count ?? 0));
    }

    return index;
  }, new Map<string, number>());
}

export function ensureSourceDerivedCompany(input: {
  companyName: string;
  evidenceUrl: string;
  location?: string | null;
  sourceName?: string | null;
}) {
  const db = getDatabase();
  const inferredSector = inferCompanySectorFromEvidence({
    companyName: input.companyName,
    evidenceUrl: input.evidenceUrl,
    sourceName: input.sourceName
  });
  const minimalAbout = "";
  const existing = findCompanyByCanonicalIdentity({
    companyName: input.companyName,
    evidenceUrl: input.evidenceUrl
  });

  if (existing) {
    const nextTagline =
      existing.tagline.trim() && !existing.tagline.startsWith("Açıq rollar ")
        ? existing.tagline
        : "";
    const nextSector = getMeaningfulMetadataValue(existing.sector) ?? inferredSector;
    const nextLocation = normalizeLocationName(existing.location) ?? normalizeLocationName(input.location) ?? "Azərbaycan";
    const nextWebsite = existing.website.trim() || input.evidenceUrl;
    const nextProfileSourceUrl = pickCompanyProfileSourceUrl(nextWebsite, input.evidenceUrl);
    const nextCompanyDomain =
      normalizeDomainLookupValue(existing.companyDomain ?? existing.website) ??
      normalizeDomainLookupValue(input.evidenceUrl);
    const nextAbout =
      existing.verified !== false && existing.about.trim()
        ? existing.about
        : minimalAbout;

    db.prepare(
      `UPDATE companies
       SET tagline = ?,
           sector = ?,
           industry_tags = ?,
           location = ?,
           website = ?,
           profile_source_url = ?,
           company_domain = ?,
           about = ?,
           updated_at = ?
       WHERE slug = ?`
    ).run(
      nextTagline,
      nextSector,
      serializeList(nextSector === "Other" ? [] : [nextSector]),
      nextLocation,
      nextWebsite,
      nextProfileSourceUrl,
      nextCompanyDomain,
      nextAbout,
      todayIsoDate(),
      existing.slug
    );

    registerCompanyAlias(db, {
      companySlug: existing.slug,
      alias: input.companyName,
      domainHint: input.evidenceUrl
    });
    return findCompanyBySlug(existing.slug);
  }

  const slug = nextUniqueSlug(input.companyName, "companies");
  const createdAt = todayIsoDate();
  const location = normalizeLocationName(input.location) ?? "Azərbaycan";
  const sector = inferredSector;
  const tagline = "";
  const about = minimalAbout;

  db.prepare(
    `INSERT INTO companies (
      slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, profile_source_url, company_domain, about,
      wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, verified, visible, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    slug,
    input.companyName,
    tagline,
    sector,
    serializeList(sector === "Other" ? [] : [sector]),
    "",
    location,
    "",
    "/hero_bg.webp",
    input.evidenceUrl,
    pickCompanyProfileSourceUrl(input.evidenceUrl, input.evidenceUrl) || null,
    null,
    about,
    null,
    null,
    serializeList([]),
    serializeList([]),
    serializeList([]),
    0,
    0,
    1,
    createdAt,
    createdAt
  );

  registerCompanyAlias(db, {
    companySlug: slug,
    alias: input.companyName,
    domainHint: input.evidenceUrl,
    isPrimary: true
  });

  return findCompanyBySlug(slug);
}

export function findJobBySlug(slug: string, options?: { includeUnpublished?: boolean }) {
  const db = getDatabase();
  const whereClause = options?.includeUnpublished
    ? "WHERE slug = ?"
    : `WHERE slug = ?
       AND ${publicJobPredicates("jobs").join("\n       AND ")}`;
  const startedAt = Date.now();
  const row = db
    .prepare(
      `SELECT slug, title, company_slug, company_name, city, location_raw, location_normalized, location_source, work_model, level, category, posted_at, deadline,
              summary, responsibilities, requirements, benefits, tags, featured, source_name, source_kind, source_url, source_listing_url, job_detail_url,
              apply_action_url, candidate_apply_urls_json, external_apply_url, resolved_apply_url, canonical_apply_url, apply_url,
              apply_link_status, apply_link_score, apply_link_kind, apply_cta_mode, apply_link_reason, verified_apply, official_source, checked_recently_at, last_checked_at, freshness_status, expires_at, is_expired, trust_badges, trust_score, publishable,
              validation_status, needs_admin_review, scrape_error,
              moderation_status, moderation_notes, moderation_updated_at, internship_confidence, location_confidence, classification_confidence, classification_reason,
              search_keywords, normalized_keywords, source_language, category_confidence, category_reason, duplicate_risk,
              logo_url, logo_source, logo_confidence,
              direct_company_url,
              created_at, updated_at
       FROM jobs
       ${whereClause}`
    )
    .get(slug) as JobRow | undefined;
  logDatabaseTiming("findJobBySlug", startedAt, `slug=${slug}`);

  return row ? mapJobRow(row) : undefined;
}

export function createCompany(input: CompanyInput) {
  const db = getDatabase();
  const slug = nextUniqueSlug(input.name, "companies");
  const createdAt = input.createdAt ?? todayIsoDate();

  db.prepare(
    `INSERT INTO companies (
      slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, profile_source_url, company_domain, about,
      wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, verified, visible, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    slug,
    input.name,
    input.tagline,
    input.sector,
    serializeList(input.industryTags ?? [input.sector]),
    input.size,
    input.location,
    input.logo,
    input.cover,
    input.website,
    input.profileSourceUrl ?? null,
    input.companyDomain ?? extractCompanyDomain(input.website) ?? null,
    input.about,
    input.wikipediaSummary ?? null,
    input.wikipediaSourceUrl ?? null,
    serializeList(input.focusAreas),
    serializeList(input.youthOffer),
    serializeList(input.benefits),
    input.featured ? 1 : 0,
    input.verified === false ? 0 : 1,
    input.visible === false ? 0 : 1,
    createdAt,
    createdAt
  );

  registerCompanyAlias(db, {
    companySlug: slug,
    alias: input.name,
    domainHint: input.companyDomain ?? input.website,
    isPrimary: true
  });

  return findCompanyBySlug(slug);
}

export function updateCompany(slug: string, input: CompanyInput) {
  const db = getDatabase();
  const current = findCompanyBySlug(slug);

  if (!current) {
    return null;
  }

  db.prepare(
    `UPDATE companies
     SET name = ?, tagline = ?, sector = ?, industry_tags = ?, size = ?, location = ?, logo = ?, cover = ?,
         website = ?, profile_source_url = ?, company_domain = ?, about = ?, wikipedia_summary = ?, wikipedia_source_url = ?, focus_areas = ?, youth_offer = ?,
         benefits = ?, featured = ?, verified = ?, visible = ?, updated_at = ?
     WHERE slug = ?`
  ).run(
    input.name,
    input.tagline,
    input.sector,
    serializeList(input.industryTags ?? [input.sector]),
    input.size,
    input.location,
    input.logo,
    input.cover,
    input.website,
    input.profileSourceUrl ?? current.profileSourceUrl ?? null,
    input.companyDomain ?? extractCompanyDomain(input.website) ?? null,
    input.about,
    input.wikipediaSummary ?? null,
    input.wikipediaSourceUrl ?? null,
    serializeList(input.focusAreas),
    serializeList(input.youthOffer),
    serializeList(input.benefits),
    input.featured ? 1 : 0,
    input.verified === false ? 0 : 1,
    input.visible === false ? 0 : 1,
    todayIsoDate(),
    slug
  );

  registerCompanyAlias(db, {
    companySlug: slug,
    alias: input.name,
    domainHint: input.companyDomain ?? input.website,
    isPrimary: true
  });

  syncCompanyJobFeaturedFlag(slug, Boolean(input.featured));
  return findCompanyBySlug(slug);
}

export function deleteCompany(slug: string) {
  const db = getDatabase();
  const jobCountRow = db.prepare("SELECT COUNT(*) AS count FROM jobs WHERE company_slug = ?").get(slug) as
    | { count?: number | bigint }
    | undefined;
  const relatedJobCount = Number(jobCountRow?.count ?? 0);
  const result = db.prepare("DELETE FROM companies WHERE slug = ?").run(slug) as { changes?: number };

  return {
    deleted: Number(result.changes ?? 0) > 0,
    relatedJobCount
  };
}

export function createJob(input: JobInput) {
  const db = getDatabase();
  const company = findCompanyBySlug(input.companySlug);

  if (!company) {
    return null;
  }

  const slug = nextUniqueSlug(`${getPrimaryLocalizedText(input.title)}-${input.companySlug}`, "jobs");
  const createdAt = input.createdAt ?? todayIsoDate();
  const featured = Boolean(company.featured) && isYouthLevel(input.level);
  const moderationStatus = getDefaultModerationStatus(input);
  const freshnessStatus = resolveFreshnessStatus(input.postedAt, input.deadline);
  const publishable = getEffectiveJobPublishable({
    moderationStatus,
    hasUsableApplyUrl: false,
    freshnessStatus
  });
  const moderationUpdatedAt = nowIsoTimestamp();
  const checkedRecentlyAt = nowIsoTimestamp();
  const insertColumns = [
    "slug",
    "title",
    "company_slug",
    "city",
    "work_model",
    "level",
    "category",
    "posted_at",
    "deadline",
    "summary",
    "responsibilities",
    "requirements",
    "benefits",
    "tags",
    "featured",
    "source_name",
    "source_url",
    "source_listing_url",
    "job_detail_url",
    "apply_action_url",
    "external_apply_url",
    "resolved_apply_url",
    "canonical_apply_url",
    "apply_url",
    "apply_link_status",
    "apply_link_score",
    "apply_link_kind",
    "apply_cta_mode",
    "apply_link_reason",
    "verified_apply",
    "checked_recently_at",
    "trust_badges",
    "trust_score",
    "publishable",
    "validation_status",
    "needs_admin_review",
    "scrape_error",
    "moderation_status",
    "moderation_notes",
    "moderation_updated_at",
    "direct_company_url",
    "created_at",
    "updated_at"
  ] as const;
  const insertValues = [
    slug,
    serializeLocalizedText(input.title),
    input.companySlug,
    input.city,
    input.workModel,
    input.level,
    serializeLocalizedText(input.category),
    input.postedAt,
    input.deadline,
    serializeLocalizedText(input.summary),
    serializeList(input.responsibilities),
    serializeList(input.requirements),
    serializeList(input.benefits),
    serializeLocalizedTextList(input.tags),
    featured ? 1 : 0,
    input.sourceName ?? null,
    input.sourceUrl ?? null,
    input.sourceUrl ?? null,
    null,
    input.applyUrl ?? null,
    input.applyUrl ?? null,
    null,
    null,
    null,
    input.applyUrl ? "uncertain" : "broken",
    0,
    input.applyUrl ? "unknown" : "unknown",
    "disabled",
    input.applyUrl ? "admin_unverified_apply_url" : "missing_apply_url",
    0,
    checkedRecentlyAt,
    JSON.stringify([]),
    0.12,
    publishable ? 1 : 0,
    input.applyUrl ? "unresolved" : "rejected",
    input.applyUrl ? 1 : 0,
    input.applyUrl ? "admin_unverified_apply_url" : "missing_apply_url",
    moderationStatus,
    input.moderationNotes ?? null,
    moderationUpdatedAt,
    input.directCompanyUrl ?? company.website,
    createdAt,
    createdAt
  ];

  db.prepare(
    `INSERT INTO jobs (
      ${insertColumns.join(", ")}
    ) VALUES (${insertColumns.map(() => "?").join(", ")})`
  ).run(...insertValues);

  return findJobBySlug(slug, { includeUnpublished: true });
}

export function updateJob(slug: string, input: JobInput) {
  const db = getDatabase();
  const current = findJobBySlug(slug, { includeUnpublished: true });

  if (!current) {
    return null;
  }

  const company = findCompanyBySlug(input.companySlug);

  if (!company) {
    return null;
  }

  const featured = Boolean(company.featured) && isYouthLevel(input.level);
  const moderationStatus = input.moderationStatus ?? current.moderationStatus ?? getDefaultModerationStatus(input);
  const freshnessStatus = resolveFreshnessStatus(input.postedAt, input.deadline);
  const publishable = getEffectiveJobPublishable({
    moderationStatus,
    hasUsableApplyUrl: false,
    freshnessStatus
  });
  const moderationNotes = input.moderationNotes ?? current.moderationNotes ?? null;
  const moderationUpdatedAt = nowIsoTimestamp();

  db.prepare(
    `UPDATE jobs
     SET title = ?, company_slug = ?, city = ?, work_model = ?, level = ?, category = ?, posted_at = ?,
         deadline = ?, summary = ?, responsibilities = ?, requirements = ?, benefits = ?, tags = ?,
         featured = ?, source_name = ?, source_url = ?, source_listing_url = ?, job_detail_url = ?, apply_action_url = ?, external_apply_url = ?,
         resolved_apply_url = ?, canonical_apply_url = ?, apply_url = ?, apply_link_status = ?, apply_link_score = ?, apply_link_kind = ?, apply_cta_mode = ?,
         apply_link_reason = ?, verified_apply = ?, checked_recently_at = ?, freshness_status = ?, trust_badges = ?, trust_score = ?, publishable = ?, validation_status = ?, needs_admin_review = ?, scrape_error = ?, moderation_status = ?, moderation_notes = ?, moderation_updated_at = ?, direct_company_url = ?, updated_at = ?
     WHERE slug = ?`
  ).run(
    serializeLocalizedText(input.title),
    input.companySlug,
    input.city,
    input.workModel,
    input.level,
    serializeLocalizedText(input.category),
    input.postedAt,
    input.deadline,
    serializeLocalizedText(input.summary),
    serializeList(input.responsibilities),
    serializeList(input.requirements),
    serializeList(input.benefits),
    serializeLocalizedTextList(input.tags),
    featured ? 1 : 0,
    input.sourceName ?? null,
    input.sourceUrl ?? null,
    input.sourceUrl ?? null,
    null,
    input.applyUrl ?? null,
    input.applyUrl ?? null,
    null,
    null,
    null,
    input.applyUrl ? "uncertain" : "broken",
    0,
    input.applyUrl ? "unknown" : "unknown",
    "disabled",
    input.applyUrl ? "admin_unverified_apply_url" : "missing_apply_url",
    0,
    nowIsoTimestamp(),
    freshnessStatus,
    JSON.stringify([]),
    0.12,
    publishable ? 1 : 0,
    input.applyUrl ? "unresolved" : "rejected",
    input.applyUrl ? 1 : 0,
    input.applyUrl ? "admin_unverified_apply_url" : "missing_apply_url",
    moderationStatus,
    moderationNotes,
    moderationUpdatedAt,
    input.directCompanyUrl ?? company.website,
    todayIsoDate(),
    slug
  );

  return findJobBySlug(slug, { includeUnpublished: true });
}

export function deleteJob(slug: string) {
  const db = getDatabase();
  const result = db.prepare("DELETE FROM jobs WHERE slug = ?").run(slug) as { changes?: number };
  return Number(result.changes ?? 0) > 0;
}

function findJobSlugBySourceUrl(sourceUrl: string) {
  const db = getDatabase();
  const row = db.prepare("SELECT slug FROM jobs WHERE source_url = ? LIMIT 1").get(sourceUrl) as
    | { slug?: string }
    | undefined;
  return row?.slug ?? null;
}

function findJobSlugBySignature(title: JobInput["title"], companySlug: string, postedAt: string) {
  const db = getDatabase();
  const rows = db
    .prepare(
      "SELECT slug, title FROM jobs WHERE company_slug = ? AND posted_at = ? ORDER BY updated_at DESC"
    )
    .all(companySlug, postedAt) as Array<{ slug?: string; title?: string }>;

  const signatureValues = new Set(getAllLocalizedTextValues(title).map((item) => item.toLowerCase()));
  const match = rows.find((row) =>
    getAllLocalizedTextValues(parseLocalizedText(row.title))
      .map((item) => item.toLowerCase())
      .some((item) => signatureValues.has(item))
  );

  return match?.slug ?? null;
}

export function upsertScrapedJob(input: JobInput) {
  const existingSlug =
    (input.sourceUrl ? findJobSlugBySourceUrl(input.sourceUrl) : null) ??
    findJobSlugBySignature(input.title, input.companySlug, input.postedAt);
  const requestedStatus =
    input.moderationStatus && input.moderationStatus !== "draft"
      ? input.moderationStatus
      : undefined;

  if (existingSlug) {
    const current = findJobBySlug(existingSlug, { includeUnpublished: true });
    return {
      action: "updated" as const,
      item: updateJob(existingSlug, {
        ...input,
        moderationStatus: requestedStatus ?? current?.moderationStatus ?? "suggested",
        moderationNotes: input.moderationNotes ?? current?.moderationNotes
      })
    };
  }

  return {
    action: "created" as const,
    item: createJob({
      ...input,
      moderationStatus: requestedStatus ?? "suggested"
    })
  };
}

export function updateJobModerationStatus(
  slug: string,
  moderationStatus: JobModerationStatus,
  moderationNotes?: string
) {
  const db = getDatabase();
  const current = findJobBySlug(slug, { includeUnpublished: true });

  if (!current) {
    return null;
  }

  const freshnessStatus = current.freshnessStatus ?? resolveFreshnessStatus(current.postedAt, current.deadline);
  const publishable = getEffectiveJobPublishable({
    moderationStatus,
    hasUsableApplyUrl: Boolean(current.canonicalApplyUrl ?? current.applyUrl),
    freshnessStatus
  });

  db.prepare(
    `UPDATE jobs
     SET moderation_status = ?, moderation_notes = ?, moderation_updated_at = ?, publishable = ?, updated_at = ?
     WHERE slug = ?`
  ).run(
    moderationStatus,
    moderationNotes ?? current.moderationNotes ?? null,
    nowIsoTimestamp(),
    publishable ? 1 : 0,
    todayIsoDate(),
    slug
  );

  return findJobBySlug(slug, { includeUnpublished: true });
}

export function updateCompanyVerified(slug: string, verified: boolean) {
  const db = getDatabase();
  const current = findCompanyBySlug(slug);

  if (!current) {
    return null;
  }

  db.prepare(
    `UPDATE companies
     SET verified = ?, updated_at = ?
     WHERE slug = ?`
  ).run(verified ? 1 : 0, todayIsoDate(), slug);

  return findCompanyBySlug(slug);
}

export function updateCompanyVisibility(slug: string, visible: boolean) {
  const db = getDatabase();
  const current = findCompanyBySlug(slug);

  if (!current) {
    return null;
  }

  db.prepare(
    `UPDATE companies
     SET visible = ?, updated_at = ?
     WHERE slug = ?`
  ).run(visible ? 1 : 0, todayIsoDate(), slug);

  return findCompanyBySlug(slug);
}

export function recordOutboundEvent(input: OutboundEventInput) {
  const db = getDatabase();

  db.prepare(
    `INSERT INTO outbound_events (
      target_url, company_name, source_path, referrer, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    input.targetUrl,
    input.companyName,
    input.sourcePath ?? null,
    input.referrer ?? null,
    input.userAgent ?? null,
    nowIsoTimestamp()
  );
}

export function getPlatformStorageStatus() {
  const db = getDatabase();
  const companiesRow = db.prepare("SELECT COUNT(*) AS count FROM companies").get() as
    | { count?: number | bigint }
    | undefined;
  const jobsRow = db.prepare("SELECT COUNT(*) AS count FROM jobs").get() as
    | { count?: number | bigint }
    | undefined;

  return {
    databasePath,
    companyCount: Number(companiesRow?.count ?? 0),
    jobCount: Number(jobsRow?.count ?? 0),
    legacyStoreMigrated: readMetadataValue(db, "legacy_store_migrated") === "1",
    seedComplete: readMetadataValue(db, "seed_v1_complete") === "1"
  };
}

export function getCmsDocument(id: string) {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM cms_documents WHERE id = ?").get(id) as {
    id: string;
    draft_data: string;
    published_data: string;
    updated_at: string;
  } | undefined;
  
  if (!row) return null;
  
  let draftData: any = {};
  let publishedData: any = {};
  try { draftData = JSON.parse(row.draft_data); } catch { /* corrupt draft data */ }
  try { publishedData = JSON.parse(row.published_data); } catch { /* corrupt published data */ }

  return {
    id: row.id,
    draftData,
    publishedData,
    updatedAt: row.updated_at
  };
}

export function saveCmsDocument(id: string, draftData: any, publishedData?: any) {
  const db = getDatabase();
  
  const existing = getCmsDocument(id);
  const newPublishedData = publishedData !== undefined ? publishedData : existing?.publishedData ?? {};
  
  db.prepare(`
    INSERT INTO cms_documents (id, draft_data, published_data, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      draft_data = excluded.draft_data,
      published_data = excluded.published_data,
      updated_at = excluded.updated_at
  `).run(id, JSON.stringify(draftData), JSON.stringify(newPublishedData), nowIsoTimestamp());
}
