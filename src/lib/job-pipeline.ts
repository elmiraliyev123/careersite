import type { DatabaseSync } from "node:sqlite";

import type { Company, Job } from "@/data/platform";
import { maybeEnrichCandidateWithAi } from "@/lib/ai-enrichment";
import { selectBestApplyLink } from "@/lib/apply-link-selection";
import { scheduleCompanyEnrichment } from "@/lib/company-enrichment";
import { validateApplyLink } from "@/lib/job-link-validator";
import { sanitizeJobUrl, isVerifiedRedirectTarget } from "@/lib/url-sanitizer";
import {
  buildCanonicalJobId,
  buildDebugPayload,
  buildRawJobIdentity,
  buildPublishedJobDraft,
  buildTrustBadges,
  classifyInternshipCandidate,
  computeTrustScore,
  detectExpiredJob,
  deriveFreshnessStatus,
  extractDomain,
  guessSourceReliability,
  logPipelineEvent,
  normalizeCompanyName,
  normalizeLocation,
  normalizeTitle,
  nowIsoTimestamp,
  safeParseJson,
  stableHash,
  todayIsoDate,
  type ApplyLinkStatus,
  type ApplyLinkValidationResult,
  type CandidateProcessingStatus,
  type IngestionRunStatus,
  type NormalizedJobCandidate,
  type RawIngestedJob,
  type SourceKind,
  type ValidationStatus
} from "@/lib/job-intelligence";
import {
  getPrimaryLocalizedText,
  parseLocalizedText,
  normalizeLocalizedText,
  serializeLocalizedText,
  serializeLocalizedTextList
} from "@/lib/localized-content";
import { isPublicJobModerationStatus, normalizeJobModerationStatus } from "@/lib/moderation";
import {
  ensureSourceDerivedCompany,
  getPlatformDatabase,
  listCompanies,
  refreshStoredJobVisibilityState
} from "@/lib/platform-database";

type CandidateRow = {
  id: string;
  run_id: string | null;
  source_name: string;
  source_kind: SourceKind;
  source_listing_url: string;
  job_detail_url: string | null;
  apply_action_url: string | null;
  candidate_apply_urls_json: string | null;
  external_apply_url: string | null;
  resolved_apply_url: string | null;
  canonical_apply_url: string | null;
  apply_link_status: ApplyLinkStatus;
  apply_link_score: number;
  apply_link_kind: string | null;
  apply_cta_mode: string | null;
  verified_apply: number;
  apply_link_checked_at: string | null;
  company_name: string;
  company_slug: string | null;
  company_domain: string | null;
  company_site_hint: string | null;
  title: string;
  normalized_title: string;
  location_raw: string | null;
  location_normalized: string | null;
  city: string | null;
  country: string | null;
  work_mode: string;
  description_raw: string | null;
  description_clean: string | null;
  posted_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  employment_type: string | null;
  seniority_level: string | null;
  is_internship: number;
  internship_confidence: number;
  is_baku: number;
  location_confidence: number;
  trust_score: number;
  logo_url: string | null;
  logo_source: string | null;
  logo_confidence: number;
  is_duplicate: number;
  canonical_job_id: string | null;
  publishable: number;
  rejection_reason: string | null;
  rejection_category: string | null;
  processing_status: CandidateProcessingStatus;
  attempt_count: number;
  source_payload_json: string | null;
  validation_debug_json: string | null;
  last_error: string | null;
  needs_admin_review: number;
  scrape_error: string | null;
  validation_status: string | null;
  created_at: string;
  updated_at: string;
};

type IngestionRunRow = {
  id: string;
  status: IngestionRunStatus;
  dry_run: number;
  source_count: number;
  queued_count: number;
  processed_count: number;
  published_count: number;
  rejected_count: number;
  duplicate_count: number;
  error_count: number;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
};

export type IngestionRunSummary = {
  id: string;
  status: IngestionRunStatus;
  dryRun: boolean;
  sourceCount: number;
  queuedCount: number;
  processedCount: number;
  publishedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  errorCount: number;
  startedAt: string;
  finishedAt: string | null;
  notes: Record<string, unknown>;
};

export type PipelineMetrics = {
  totalIngestedJobs: number;
  validApplyRate: number;
  brokenLinkRate: number;
  internshipPrecision: number;
  bakuPrecision: number;
  duplicateRate: number;
  publishableRate: number;
  staleOrExpiredRate: number;
  logoResolutionRate: number;
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  lastCompletedRunAt: string | null;
  sourceStats: Array<{
    sourceName: string;
    total: number;
    publishableRate: number;
    validApplyRate: number;
    staleRate: number;
  }>;
  rejectionReasons: Array<{
    reason: string;
    count: number;
  }>;
};

export type ScrapePipelineResult = {
  message: string;
  dryRun: boolean;
  importedCount: number;
  updatedCount: number;
  matchedCount: number;
  totalScraped: number;
  importedJobs: Array<{
    title: string;
    companyName: string;
    sourceName: string;
    action: "created" | "updated" | "preview";
  }>;
  unmatchedCompanies: Array<{
    name: string;
    sources: string[];
    sampleTitles: string[];
  }>;
  errors: string[];
  run?: IngestionRunSummary;
};

export type CandidateInspectionResult = {
  id: string;
  canonicalJobId: string;
  title: string;
  companyName: string;
  sourceName: string;
  sourceKind: SourceKind;
  validationStatus: ValidationStatus;
  publishable: boolean;
  needsAdminReview: boolean;
  resolvedApplyUrl: string | null;
  canonicalApplyUrl: string | null;
  rejectionReason: string | null;
  rejectionCategory: string | null;
  isDuplicate: boolean;
  duplicateGroupSize: number;
};

type PersistedJobValidationRow = {
  slug: string;
  title: string;
  company_slug: string;
  company_name: string | null;
  company_domain: string | null;
  company_website: string | null;
  source_kind: SourceKind | null;
  apply_link_kind: string | null;
  apply_action_url: string | null;
  external_apply_url: string | null;
  resolved_apply_url: string | null;
  canonical_apply_url: string | null;
  apply_url: string | null;
  validation_status: string | null;
  checked_recently_at: string | null;
  last_checked_at: string | null;
  moderation_status: string | null;
  posted_at: string | null;
  deadline: string | null;
  freshness_status: string | null;
  expires_at: string | null;
  is_expired: number | null;
};

export type PersistedJobRevalidationSummary = {
  checked: number;
  verified: number;
  unresolved: number;
};

const PIPELINE_TRUST_THRESHOLD = 0.68;
const REVALIDATION_INTERVAL_HOURS = 24;
let workerPromise: Promise<void> | null = null;
let workerRerunRequested = false;
let publishedJobRevalidationPromise: Promise<PersistedJobRevalidationSummary> | null = null;

function ensureColumnExists(db: DatabaseSync, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>;
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensurePipelineSchema() {
  const db = getPlatformDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      dry_run INTEGER NOT NULL DEFAULT 0,
      source_count INTEGER NOT NULL DEFAULT 0,
      queued_count INTEGER NOT NULL DEFAULT 0,
      processed_count INTEGER NOT NULL DEFAULT 0,
      published_count INTEGER NOT NULL DEFAULT 0,
      rejected_count INTEGER NOT NULL DEFAULT 0,
      duplicate_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS job_candidates (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      source_name TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      source_listing_url TEXT NOT NULL,
      job_detail_url TEXT,
      apply_action_url TEXT,
      candidate_apply_urls_json TEXT,
      external_apply_url TEXT,
      resolved_apply_url TEXT,
      canonical_apply_url TEXT,
      apply_link_status TEXT NOT NULL DEFAULT 'uncertain',
      apply_link_score REAL NOT NULL DEFAULT 0,
      apply_link_kind TEXT,
      apply_cta_mode TEXT,
      verified_apply INTEGER NOT NULL DEFAULT 0,
      apply_link_checked_at TEXT,
      company_name TEXT NOT NULL,
      company_slug TEXT,
      company_domain TEXT,
      company_site_hint TEXT,
      title TEXT NOT NULL,
      normalized_title TEXT NOT NULL,
      location_raw TEXT,
      location_normalized TEXT,
      city TEXT,
      country TEXT,
      work_mode TEXT NOT NULL DEFAULT 'unknown',
      description_raw TEXT,
      description_clean TEXT,
      posted_at TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      employment_type TEXT,
      seniority_level TEXT,
      is_internship INTEGER NOT NULL DEFAULT 0,
      internship_confidence REAL NOT NULL DEFAULT 0,
      is_baku INTEGER NOT NULL DEFAULT 0,
      location_confidence REAL NOT NULL DEFAULT 0,
      trust_score REAL NOT NULL DEFAULT 0,
      logo_url TEXT,
      logo_source TEXT,
      logo_confidence REAL NOT NULL DEFAULT 0,
      is_duplicate INTEGER NOT NULL DEFAULT 0,
      canonical_job_id TEXT,
      publishable INTEGER NOT NULL DEFAULT 0,
      rejection_reason TEXT,
      rejection_category TEXT,
      processing_status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      source_payload_json TEXT,
      validation_debug_json TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES ingestion_runs(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS job_candidates_run_idx ON job_candidates(run_id);
    CREATE INDEX IF NOT EXISTS job_candidates_processing_idx ON job_candidates(processing_status, updated_at);
    CREATE INDEX IF NOT EXISTS job_candidates_canonical_idx ON job_candidates(canonical_job_id);

    CREATE TABLE IF NOT EXISTS job_link_validation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      url_checked TEXT,
      final_url TEXT,
      http_status INTEGER,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      redirect_chain_json TEXT NOT NULL,
      indicators_json TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      FOREIGN KEY (candidate_id) REFERENCES job_candidates(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS job_link_validation_logs_candidate_idx
      ON job_link_validation_logs(candidate_id, checked_at DESC);

    CREATE TABLE IF NOT EXISTS job_expiry_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_slug TEXT NOT NULL,
      reason TEXT NOT NULL,
      validation_status TEXT,
      previous_url TEXT,
      detected_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      FOREIGN KEY (job_slug) REFERENCES jobs(slug) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS job_expiry_events_job_idx
      ON job_expiry_events(job_slug, detected_at DESC);

    CREATE TABLE IF NOT EXISTS job_variants (
      id TEXT PRIMARY KEY,
      canonical_job_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL UNIQUE,
      source_name TEXT NOT NULL,
      source_listing_url TEXT NOT NULL,
      job_detail_url TEXT,
      external_apply_url TEXT,
      resolved_apply_url TEXT,
      apply_link_status TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      checked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (candidate_id) REFERENCES job_candidates(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS job_variants_canonical_idx ON job_variants(canonical_job_id);
  `);

  ensureColumnExists(db, "job_candidates", "candidate_apply_urls_json", "TEXT");
  ensureColumnExists(db, "job_candidates", "apply_action_url", "TEXT");
  ensureColumnExists(db, "job_candidates", "apply_link_score", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "job_candidates", "canonical_apply_url", "TEXT");
  ensureColumnExists(db, "job_candidates", "apply_link_kind", "TEXT");
  ensureColumnExists(db, "job_candidates", "apply_cta_mode", "TEXT");
  ensureColumnExists(db, "job_candidates", "logo_url", "TEXT");
  ensureColumnExists(db, "job_candidates", "logo_source", "TEXT");
  ensureColumnExists(db, "job_candidates", "logo_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "job_candidates", "needs_admin_review", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "job_candidates", "scrape_error", "TEXT");
  ensureColumnExists(db, "job_candidates", "validation_status", "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumnExists(db, "job_candidates", "last_checked_at", "TEXT");
  ensureColumnExists(db, "job_candidates", "expires_at", "TEXT");
  ensureColumnExists(db, "job_candidates", "is_expired", "INTEGER NOT NULL DEFAULT 0");

  ensureColumnExists(db, "jobs", "id", "TEXT");
  ensureColumnExists(db, "jobs", "source_listing_url", "TEXT");
  ensureColumnExists(db, "jobs", "source_kind", "TEXT");
  ensureColumnExists(db, "jobs", "job_detail_url", "TEXT");
  ensureColumnExists(db, "jobs", "apply_action_url", "TEXT");
  ensureColumnExists(db, "jobs", "candidate_apply_urls_json", "TEXT");
  ensureColumnExists(db, "jobs", "external_apply_url", "TEXT");
  ensureColumnExists(db, "jobs", "resolved_apply_url", "TEXT");
  ensureColumnExists(db, "jobs", "canonical_apply_url", "TEXT");
  ensureColumnExists(db, "jobs", "apply_link_status", "TEXT");
  ensureColumnExists(db, "jobs", "apply_link_score", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "apply_link_kind", "TEXT");
  ensureColumnExists(db, "jobs", "apply_cta_mode", "TEXT");
  ensureColumnExists(db, "jobs", "apply_link_reason", "TEXT");
  ensureColumnExists(db, "jobs", "apply_link_checked_at", "TEXT");
  ensureColumnExists(db, "jobs", "checked_recently_at", "TEXT");
  ensureColumnExists(db, "jobs", "last_checked_at", "TEXT");
  ensureColumnExists(db, "jobs", "verified_apply", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "official_source", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "canonical_job_id", "TEXT");
  ensureColumnExists(db, "jobs", "company_name", "TEXT");
  ensureColumnExists(db, "jobs", "company_domain", "TEXT");
  ensureColumnExists(db, "jobs", "normalized_title", "TEXT");
  ensureColumnExists(db, "jobs", "location_raw", "TEXT");
  ensureColumnExists(db, "jobs", "location_normalized", "TEXT");
  ensureColumnExists(db, "jobs", "country", "TEXT");
  ensureColumnExists(db, "jobs", "description_raw", "TEXT");
  ensureColumnExists(db, "jobs", "description_clean", "TEXT");
  ensureColumnExists(db, "jobs", "first_seen_at", "TEXT");
  ensureColumnExists(db, "jobs", "last_seen_at", "TEXT");
  ensureColumnExists(db, "jobs", "employment_type", "TEXT");
  ensureColumnExists(db, "jobs", "seniority_level", "TEXT");
  ensureColumnExists(db, "jobs", "is_internship", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "internship_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "is_baku", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "location_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "trust_score", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "freshness_status", "TEXT");
  ensureColumnExists(db, "jobs", "expires_at", "TEXT");
  ensureColumnExists(db, "jobs", "is_expired", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "trust_badges", "TEXT");
  ensureColumnExists(db, "jobs", "logo_url", "TEXT");
  ensureColumnExists(db, "jobs", "logo_source", "TEXT");
  ensureColumnExists(db, "jobs", "logo_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "is_duplicate", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "publishable", "INTEGER NOT NULL DEFAULT 1");
  ensureColumnExists(db, "jobs", "rejection_reason", "TEXT");
  ensureColumnExists(db, "jobs", "rejection_category", "TEXT");
  ensureColumnExists(db, "jobs", "validation_debug_json", "TEXT");
  ensureColumnExists(db, "jobs", "needs_admin_review", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "jobs", "scrape_error", "TEXT");
  ensureColumnExists(db, "jobs", "validation_status", "TEXT NOT NULL DEFAULT 'pending'");
  db.exec("DROP INDEX IF EXISTS jobs_source_url_unique_idx");
  db.exec("CREATE INDEX IF NOT EXISTS jobs_source_url_idx ON jobs(source_url)");
  db.exec("CREATE INDEX IF NOT EXISTS jobs_source_listing_url_idx ON jobs(source_listing_url)");
  db.exec("CREATE INDEX IF NOT EXISTS jobs_job_detail_url_idx ON jobs(job_detail_url)");
  db.exec("CREATE INDEX IF NOT EXISTS jobs_canonical_apply_url_idx ON jobs(canonical_apply_url)");
  db.exec("DROP INDEX IF EXISTS job_candidates_source_listing_unique_idx");
  db.exec("CREATE INDEX IF NOT EXISTS job_candidates_source_listing_idx ON job_candidates(source_name, source_listing_url)");
  db.exec("CREATE INDEX IF NOT EXISTS job_candidates_detail_url_idx ON job_candidates(job_detail_url)");

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS jobs_canonical_job_id_unique_idx ON jobs(canonical_job_id) WHERE canonical_job_id IS NOT NULL");

  backfillLegacyJobMetadata(db);
}

function backfillLegacyJobMetadata(db: DatabaseSync) {
  const rows = db.prepare(
    `SELECT jobs.slug, jobs.title, jobs.company_slug, jobs.city, jobs.work_model, jobs.level, jobs.summary,
            jobs.posted_at, jobs.apply_url, jobs.source_url, jobs.direct_company_url, jobs.created_at,
            companies.name AS company_name, companies.website AS company_website, companies.logo AS company_logo
     FROM jobs
     INNER JOIN companies ON companies.slug = jobs.company_slug`
  ).all() as Array<{
    slug: string;
    title: string;
    company_slug: string;
    city: string;
    work_model: string;
    level: string;
    summary: string;
    posted_at: string;
    apply_url: string | null;
    source_url: string | null;
    direct_company_url: string | null;
    created_at: string | null;
    company_name: string;
    company_website: string;
    company_logo: string | null;
  }>;

  const statement = db.prepare(
    `UPDATE jobs
     SET id = COALESCE(id, ?),
         source_listing_url = COALESCE(source_listing_url, source_url, ?),
         source_kind = COALESCE(source_kind, CASE WHEN source_url LIKE '%linkedin%' THEN 'aggregator' WHEN source_url LIKE '%hellojob%' OR source_url LIKE '%boss%' THEN 'job-board' ELSE 'manual' END),
         job_detail_url = COALESCE(job_detail_url, source_url, ?),
         candidate_apply_urls_json = COALESCE(candidate_apply_urls_json, CASE WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN json_array(apply_url) ELSE '[]' END),
         external_apply_url = COALESCE(external_apply_url, apply_url),
         resolved_apply_url = CASE
           WHEN COALESCE(validation_status, 'pending') = 'verified' THEN COALESCE(resolved_apply_url, apply_url)
           ELSE resolved_apply_url
         END,
         apply_link_status = COALESCE(apply_link_status, CASE WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN 'uncertain' ELSE 'broken' END),
         apply_link_score = CASE
           WHEN apply_link_score IS NULL OR apply_link_score = 0 THEN CASE WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN 0.18 ELSE 0 END
           ELSE apply_link_score
         END,
         apply_link_reason = COALESCE(apply_link_reason, CASE WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN 'legacy_unverified' ELSE 'missing_apply_url' END),
         validation_status = COALESCE(NULLIF(validation_status, ''), CASE WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN 'unresolved' ELSE 'rejected' END),
         needs_admin_review = CASE
           WHEN COALESCE(validation_status, 'pending') = 'verified' AND COALESCE(verified_apply, 0) = 1 THEN COALESCE(needs_admin_review, 0)
           WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN 1
           ELSE COALESCE(needs_admin_review, 0)
         END,
         scrape_error = CASE
           WHEN COALESCE(validation_status, 'pending') = 'verified' AND COALESCE(verified_apply, 0) = 1 THEN scrape_error
           WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN COALESCE(scrape_error, 'legacy_unverified_apply_url')
           ELSE COALESCE(scrape_error, 'missing_apply_url')
         END,
         verified_apply = CASE
           WHEN COALESCE(validation_status, 'pending') = 'verified' THEN COALESCE(verified_apply, 0)
           ELSE 0
         END,
        checked_recently_at = CASE
          WHEN checked_recently_at IS NULL OR trim(checked_recently_at) = '' THEN COALESCE(created_at, posted_at, ?)
          ELSE checked_recently_at
        END,
        last_checked_at = COALESCE(last_checked_at, checked_recently_at, created_at, posted_at, ?),
        official_source = CASE
           WHEN official_source IS NULL OR official_source = 0 THEN CASE WHEN source_url IS NULL OR source_url = direct_company_url THEN 1 ELSE 0 END
           ELSE official_source
         END,
         canonical_job_id = COALESCE(canonical_job_id, ?),
         company_name = COALESCE(company_name, ?),
         company_domain = COALESCE(company_domain, ?),
         normalized_title = COALESCE(normalized_title, ?),
         location_raw = COALESCE(location_raw, ?),
         location_normalized = COALESCE(location_normalized, ?),
         country = COALESCE(country, ?),
         description_raw = COALESCE(description_raw, summary),
         description_clean = COALESCE(description_clean, summary),
         first_seen_at = COALESCE(first_seen_at, created_at, ?),
         last_seen_at = COALESCE(last_seen_at, posted_at, created_at, ?),
         employment_type = COALESCE(employment_type, level),
         seniority_level = COALESCE(seniority_level, ?),
         is_internship = CASE
           WHEN is_internship IS NULL OR is_internship = 0 THEN ?
           ELSE is_internship
         END,
         internship_confidence = CASE
           WHEN internship_confidence IS NULL OR internship_confidence = 0 THEN ?
           ELSE internship_confidence
         END,
         is_baku = CASE
           WHEN is_baku IS NULL OR is_baku = 0 THEN ?
           ELSE is_baku
         END,
         location_confidence = CASE
           WHEN location_confidence IS NULL OR location_confidence = 0 THEN ?
           ELSE location_confidence
         END,
         trust_score = CASE
           WHEN trust_score IS NULL OR trust_score = 0 THEN ?
           ELSE trust_score
         END,
        freshness_status = CASE
          WHEN freshness_status IS NULL OR trim(freshness_status) = '' THEN CASE
            WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) <= 3 THEN 'hot'
            WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) <= 14 THEN 'fresh'
            WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) <= 30 THEN 'aging'
            WHEN julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) <= 45 THEN 'stale'
            ELSE 'expired'
          END
          ELSE freshness_status
        END,
        is_expired = CASE
          WHEN COALESCE(is_expired, 0) = 1 THEN 1
          WHEN COALESCE(deadline, date('now')) < date('now') THEN 1
          WHEN COALESCE(freshness_status, '') = 'expired' THEN 1
          ELSE 0
        END,
        expires_at = CASE
          WHEN COALESCE(expires_at, '') <> '' THEN expires_at
          WHEN COALESCE(deadline, date('now')) < date('now') THEN deadline
          WHEN COALESCE(freshness_status, '') = 'expired' THEN COALESCE(last_checked_at, checked_recently_at, created_at, posted_at, ?)
          ELSE NULL
        END,
        trust_badges = CASE
          WHEN trust_badges IS NULL OR trim(trust_badges) = '' OR trust_badges = '[]' THEN '[]'
          ELSE trust_badges
        END,
         logo_url = COALESCE(logo_url, ?),
         logo_source = COALESCE(logo_source, CASE WHEN ? LIKE '%logo.clearbit.com%' THEN 'clearbit' WHEN ? IS NOT NULL AND trim(?) <> '' THEN 'company_profile' END),
         logo_confidence = CASE
           WHEN logo_confidence IS NULL OR logo_confidence = 0 THEN CASE WHEN ? LIKE '%logo.clearbit.com%' THEN 0.58 WHEN ? IS NOT NULL AND trim(?) <> '' THEN 0.82 ELSE 0 END
           ELSE logo_confidence
         END,
        is_duplicate = COALESCE(is_duplicate, 0),
        publishable = CASE
          WHEN COALESCE(validation_status, 'pending') <> 'verified' THEN 0
          WHEN COALESCE(is_expired, 0) = 1 THEN 0
          WHEN (
            apply_url IS NULL OR trim(apply_url) = '' OR
            COALESCE(deadline, date('now')) < date('now') OR
            julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) > 45
           ) THEN 0
           ELSE 1
         END,
         rejection_reason = CASE
           WHEN COALESCE(validation_status, 'pending') <> 'verified' AND apply_url IS NOT NULL AND trim(apply_url) <> '' THEN 'unverified_apply_url'
           WHEN apply_url IS NULL OR trim(apply_url) = '' THEN 'missing_apply_url'
           WHEN COALESCE(deadline, date('now')) < date('now') OR julianday('now') - julianday(COALESCE(posted_at, created_at, date('now'))) > 45 THEN 'stale_or_expired'
           ELSE NULL
         END
     WHERE slug = ?`
  );

  for (const row of rows) {
    const canonicalJobId = row.slug;
    const companyDomain = extractDomain(row.company_website);
    const normalizedTitle = normalizeTitle(row.title);
    const isInternship = row.level === "Təcrübə" || row.level === "Trainee" || row.level === "Yeni məzun";
    statement.run(
      row.slug,
      row.source_url ?? row.direct_company_url ?? null,
      row.source_url ?? row.direct_company_url ?? null,
      row.created_at ?? row.posted_at ?? todayIsoDate(),
      row.created_at ?? row.posted_at ?? todayIsoDate(),
      canonicalJobId,
      row.company_name,
      companyDomain,
      normalizedTitle,
      row.city,
      row.city,
      row.city === "Bakı" ? "Azərbaycan" : null,
      row.created_at ?? row.posted_at ?? todayIsoDate(),
      row.posted_at ?? row.created_at ?? todayIsoDate(),
      row.level,
      isInternship ? 1 : 0,
      isInternship ? 0.88 : 0.54,
      row.city === "Bakı" ? 1 : 0,
      row.city ? 0.86 : 0.3,
      row.apply_url ? 0.84 : 0.22,
      row.created_at ?? row.posted_at ?? todayIsoDate(),
      row.company_logo,
      row.company_logo,
      row.company_logo,
      row.company_logo,
      row.company_logo,
      row.company_logo,
      row.slug
    );
  }
}

function getPersistedJobValidationCandidateUrl(row: PersistedJobValidationRow) {
  return (
    row.canonical_apply_url ??
    row.resolved_apply_url ??
    row.external_apply_url ??
    row.apply_action_url ??
    row.apply_url ??
    null
  );
}

function getPersistedJobDisplayTitle(row: PersistedJobValidationRow) {
  return getPrimaryLocalizedText(parseLocalizedText(row.title)) || row.title;
}

function isPersistedJobDueForRevalidation(row: PersistedJobValidationRow, force = false) {
  if (force) {
    return true;
  }

  if (row.validation_status !== "verified") {
    return true;
  }

  const lastCheckedAtValue = row.last_checked_at ?? row.checked_recently_at;

  if (!lastCheckedAtValue) {
    return true;
  }

  const checkedAt = Date.parse(lastCheckedAtValue);
  if (Number.isNaN(checkedAt)) {
    return true;
  }

  return checkedAt < Date.now() - REVALIDATION_INTERVAL_HOURS * 60 * 60 * 1000;
}

function isTerminalRevalidationFailure(reason: string | null | undefined) {
  if (!reason) {
    return false;
  }

  return /expired|missing|gone_410|http_404|generic_or_non_apply_page|non_html_destination|generic_listing_page/i.test(reason);
}

function getPersistedJobPublishableState(
  row: PersistedJobValidationRow,
  finalVerifiedUrl: string | null,
  isExpired: boolean
) {
  const moderationStatus = normalizeJobModerationStatus(row.moderation_status, "published");
  const freshnessStatus = deriveFreshnessStatus(row.posted_at);
  const publishable =
    Boolean(finalVerifiedUrl) &&
    !isExpired &&
    isPublicJobModerationStatus(moderationStatus) &&
    freshnessStatus !== "stale" &&
    freshnessStatus !== "expired";

  return { moderationStatus, freshnessStatus, publishable };
}

function recordJobExpiryEvent(input: {
  jobSlug: string;
  reason: string;
  validationStatus: string;
  previousUrl: string | null;
  detectedAt: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getPlatformDatabase();
  db.prepare(
    `INSERT INTO job_expiry_events (
      job_slug, reason, validation_status, previous_url, detected_at, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    input.jobSlug,
    input.reason,
    input.validationStatus,
    input.previousUrl,
    input.detectedAt,
    JSON.stringify(input.metadata ?? {})
  );
}

async function revalidatePublishedJobApplyUrlsInternal(options?: {
  force?: boolean;
  slugs?: string[];
}): Promise<PersistedJobRevalidationSummary> {
  const db = getPlatformDatabase();
  const filters = [
    `COALESCE(jobs.apply_action_url, jobs.external_apply_url, jobs.resolved_apply_url, jobs.canonical_apply_url, jobs.apply_url) IS NOT NULL`,
    `trim(COALESCE(jobs.apply_action_url, jobs.external_apply_url, jobs.resolved_apply_url, jobs.canonical_apply_url, jobs.apply_url)) <> ''`,
    `(COALESCE(jobs.publishable, 0) = 1 OR COALESCE(jobs.validation_status, 'pending') <> 'verified' OR COALESCE(jobs.canonical_apply_url, jobs.resolved_apply_url, jobs.apply_url) IS NOT NULL)`
  ];
  const params: Array<string | number> = [];

  if (options?.slugs?.length) {
    filters.push(`jobs.slug IN (${options.slugs.map(() => "?").join(", ")})`);
    params.push(...options.slugs);
  }

  const rows = db.prepare(
    `SELECT jobs.slug, jobs.title, jobs.company_slug, jobs.company_name, jobs.company_domain, companies.website AS company_website,
            jobs.source_kind, jobs.apply_link_kind, jobs.apply_action_url, jobs.external_apply_url, jobs.resolved_apply_url,
            jobs.canonical_apply_url, jobs.apply_url, jobs.validation_status, jobs.checked_recently_at, jobs.last_checked_at,
            jobs.moderation_status, jobs.posted_at, jobs.deadline, jobs.freshness_status, jobs.expires_at, jobs.is_expired
     FROM jobs
     LEFT JOIN companies ON companies.slug = jobs.company_slug
     WHERE ${filters.join(" AND ")}
     ORDER BY jobs.checked_recently_at ASC, jobs.updated_at ASC`
  ).all(...params) as PersistedJobValidationRow[];

  const updateStatement = db.prepare(
    `UPDATE jobs
     SET apply_action_url = ?,
         external_apply_url = ?,
         resolved_apply_url = ?,
         canonical_apply_url = ?,
         apply_url = ?,
         apply_link_status = ?,
         apply_link_score = ?,
         apply_cta_mode = ?,
         verified_apply = ?,
         checked_recently_at = ?,
         last_checked_at = ?,
         freshness_status = ?,
         expires_at = ?,
         is_expired = ?,
         publishable = ?,
         rejection_reason = ?,
         rejection_category = ?,
         validation_status = ?,
         needs_admin_review = ?,
         scrape_error = ?,
         apply_link_reason = ?,
         updated_at = ?
     WHERE slug = ?`
  );

  let checked = 0;
  let verified = 0;
  let unresolved = 0;

  for (const row of rows) {
    if (!isPersistedJobDueForRevalidation(row, options?.force)) {
      continue;
    }

    const candidateUrl = getPersistedJobValidationCandidateUrl(row);
    if (!candidateUrl) {
      continue;
    }

    checked += 1;
    const title = getPersistedJobDisplayTitle(row);
    const expectedCompanyDomain = row.company_domain ?? extractDomain(row.company_website);
    const validation = await validateApplyLink({
      candidateUrl,
      expectedCompanyDomain,
      title,
      allowLinkedInApplyDetail:
        row.apply_link_kind === "linkedin_easy_apply" ||
        row.apply_link_kind === "linkedin_offsite" ||
        row.apply_link_kind === "linkedin_detail_only",
      linkedInApplyType:
        row.apply_link_kind === "linkedin_easy_apply" ||
        row.apply_link_kind === "linkedin_offsite" ||
        row.apply_link_kind === "linkedin_detail_only"
          ? row.apply_link_kind
          : null
    });
    const finalVerifiedUrl =
      validation.status === "valid" &&
      validation.finalUrl &&
      isVerifiedRedirectTarget(validation.finalUrl)
        ? validation.finalUrl
        : null;
    const expiresByFreshness = deriveFreshnessStatus(row.posted_at) === "expired";
    const expiresByDeadline = Boolean(row.deadline && Date.parse(row.deadline) < Date.now());
    const expiresByValidation = !finalVerifiedUrl && isTerminalRevalidationFailure(validation.reason);
    const isExpired = expiresByFreshness || expiresByDeadline || expiresByValidation;
    const expiresAt = isExpired
      ? row.deadline && Date.parse(row.deadline) < Date.now()
        ? row.deadline
        : validation.checkedAt
      : null;
    const { freshnessStatus, publishable } = getPersistedJobPublishableState(row, finalVerifiedUrl, isExpired);
    const rejectionReason = finalVerifiedUrl
      ? publishable
        ? null
        : freshnessStatus === "stale" || freshnessStatus === "expired"
          ? "stale_or_expired"
          : null
      : isExpired
        ? "expired_or_removed"
        : "unverified_apply_url";
    const rejectionCategory = finalVerifiedUrl
      ? rejectionReason === "stale_or_expired"
        ? "freshness"
        : null
      : isExpired
        ? "freshness"
        : "apply_link";
    const validationStatus = finalVerifiedUrl ? "verified" : "unresolved";

    updateStatement.run(
      candidateUrl,
      candidateUrl,
      finalVerifiedUrl,
      finalVerifiedUrl,
      finalVerifiedUrl,
      finalVerifiedUrl ? "valid" : validation.status === "uncertain" ? "uncertain" : "broken",
      finalVerifiedUrl ? 0.84 : 0,
      finalVerifiedUrl ? (validation.verifiedApply ? "apply" : "view") : "disabled",
      finalVerifiedUrl && validation.verifiedApply ? 1 : 0,
      validation.checkedAt,
      validation.checkedAt,
      freshnessStatus,
      expiresAt,
      isExpired ? 1 : 0,
      publishable ? 1 : 0,
      rejectionReason,
      rejectionCategory,
      validationStatus,
      finalVerifiedUrl ? 0 : 1,
      finalVerifiedUrl ? null : `revalidated:${validation.reason}`,
      validation.reason,
      nowIsoTimestamp(),
      row.slug
    );

    if (isExpired && !row.is_expired) {
      recordJobExpiryEvent({
        jobSlug: row.slug,
        reason: validation.reason,
        validationStatus,
        previousUrl: candidateUrl,
        detectedAt: validation.checkedAt,
        metadata: {
          redirectChain: validation.redirectChain,
          finalUrl: validation.finalUrl,
          httpStatus: validation.httpStatus
        }
      });
    }

    if (finalVerifiedUrl) {
      verified += 1;
    } else {
      unresolved += 1;
    }
  }

  if (checked > 0) {
    refreshStoredJobVisibilityState();
  }

  return { checked, verified, unresolved };
}

export async function revalidatePublishedJobApplyUrls(options?: {
  force?: boolean;
  slugs?: string[];
}): Promise<PersistedJobRevalidationSummary> {
  ensurePipelineSchema();

  if (publishedJobRevalidationPromise) {
    return publishedJobRevalidationPromise;
  }

  publishedJobRevalidationPromise = revalidatePublishedJobApplyUrlsInternal(options)
    .catch((error) => {
      logPipelineEvent("published_job_revalidation_failed", {
        error: error instanceof Error ? error.message : "published_job_revalidation_failed"
      });
      throw error;
    })
    .finally(() => {
      publishedJobRevalidationPromise = null;
    });

  return publishedJobRevalidationPromise;
}

function mapRunRow(row: IngestionRunRow): IngestionRunSummary {
  return {
    id: row.id,
    status: row.status,
    dryRun: Boolean(row.dry_run),
    sourceCount: row.source_count,
    queuedCount: row.queued_count,
    processedCount: row.processed_count,
    publishedCount: row.published_count,
    rejectedCount: row.rejected_count,
    duplicateCount: row.duplicate_count,
    errorCount: row.error_count,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    notes: safeParseJson<Record<string, unknown>>(row.notes, {})
  };
}

function buildCandidateId(
  input: Pick<
    RawIngestedJob,
    "sourceName" | "sourceListingUrl" | "jobDetailUrl" | "applyActionUrl" | "companyName" | "title" | "locationRaw"
  >
) {
  return buildRawJobIdentity(input);
}

function createSlug(value: string) {
  return normalizeTitle(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function nextUniqueJobSlug(db: DatabaseSync, baseValue: string) {
  const baseSlug = createSlug(baseValue) || "job";
  let slug = baseSlug;
  let attempt = 2;

  while (db.prepare("SELECT 1 FROM jobs WHERE slug = ? LIMIT 1").get(slug)) {
    slug = `${baseSlug}-${attempt}`;
    attempt += 1;
  }

  return slug;
}

function guessSourceKind(sourceName: string, sourceListingUrl: string, sourceKind?: SourceKind) {
  if (sourceKind) {
    return sourceKind;
  }

  const domain = extractDomain(sourceListingUrl) ?? "";
  const foldedName = normalizeCompanyName(sourceName);

  if (domain.includes("linkedin")) {
    return "aggregator";
  }

  if (domain.includes("hellojob") || domain.includes("boss")) {
    return "job-board";
  }

  if (foldedName.includes("manual")) {
    return "manual";
  }

  return "career-page";
}

function findMatchingCompany(rawCompanyName: string, siteHint: string | null | undefined) {
  const companies = listCompanies();
  const normalizedCompanyName = normalizeCompanyName(rawCompanyName);
  const siteHintDomain = extractDomain(siteHint);

  if (siteHintDomain) {
    const domainMatch = companies.find((company) => {
      const companyDomain =
        company.companyDomain ?? (company.verified === false ? null : extractDomain(company.website));
      return companyDomain === siteHintDomain;
    });
    if (domainMatch) {
      return domainMatch;
    }
  }

  const exact = companies.find((company) => normalizeCompanyName(company.name) === normalizedCompanyName);
  if (exact) {
    return exact;
  }

  return (
    companies
      .filter((company) => {
        const normalized = normalizeCompanyName(company.name);
        return normalizedCompanyName.includes(normalized) || normalized.includes(normalizedCompanyName);
      })
      .sort((left, right) => normalizeCompanyName(right.name).length - normalizeCompanyName(left.name).length)[0] ?? null
  );
}

function buildCandidateRecord(params: {
  candidateId: string;
  input: RawIngestedJob;
  company: Company | null;
  applyValidation: ApplyLinkValidationResult;
  applyActionUrl: string | null;
  candidateApplyUrls: string[];
  resolvedApplyUrl: string | null;
  canonicalApplyUrl: string | null;
  applyLinkScore: number;
  applyLinkKind: NormalizedJobCandidate["applyLinkKind"];
  applyCtaMode: NormalizedJobCandidate["applyCtaMode"];
  selectionDebug?: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
}): NormalizedJobCandidate {
  const descriptionClean = params.input.descriptionRaw ? params.input.descriptionRaw.trim() : null;
  const classification = classifyInternshipCandidate(
    params.input.title,
    descriptionClean ?? "",
    params.input.employmentType
  );
  const location = normalizeLocation(
    params.input.locationRaw,
    descriptionClean ?? "",
    params.company?.location ?? null
  );
  const normalizedTitle = normalizeTitle(params.input.title);
  const canonicalJobId = buildCanonicalJobId(
    params.company?.name ?? params.input.companyName,
    normalizedTitle,
    location.city,
    location.workMode,
    params.input.postedAt ?? null
  );
  const expired = detectExpiredJob({
    postedAt: params.input.postedAt ?? null,
    applyValidationReason: params.applyValidation.reason,
    description: descriptionClean
  });
  const freshnessStatus = deriveFreshnessStatus(params.input.postedAt ?? null);
  const trust = computeTrustScore({
    sourceName: params.input.sourceName,
    sourceKind: params.input.sourceKind,
    applyLinkStatus: params.applyValidation.status,
    applyLinkScore: params.applyLinkScore,
    verifiedApply: params.applyValidation.verifiedApply,
    companyDomain: params.company ? extractDomain(params.company.website) : null,
    resolvedApplyUrl: params.resolvedApplyUrl,
    postedAt: params.input.postedAt ?? null,
    earlyCareerEligible: classification.earlyCareerEligible,
    internshipConfidence: classification.internshipConfidence,
    locationConfidence: location.locationConfidence,
    hasDescription: Boolean(descriptionClean)
  });

  let rejectionReason: string | null = null;
  let rejectionCategory: string | null = classification.rejectionCategory;

  // A publishable outbound URL can be a verified application page or a verified vacancy detail page.
  const hasVerifiedOutboundUrl = Boolean(
    params.resolvedApplyUrl &&
    isVerifiedRedirectTarget(params.resolvedApplyUrl) &&
    params.applyValidation.status === "valid"
  );

  // Keep the narrower apply-page signal for analytics and UI hints.
  const hasVerifiedApplyUrl = Boolean(
    hasVerifiedOutboundUrl &&
    params.applyValidation.verifiedApply
  );

  const hasUnresolvedUrl = !params.resolvedApplyUrl || params.applyValidation.status === "broken";

  if (expired) {
    rejectionReason = "expired_or_archived";
    rejectionCategory = rejectionCategory ?? "freshness";
  } else if (freshnessStatus === "stale") {
    rejectionReason = "stale_or_low_freshness";
    rejectionCategory = rejectionCategory ?? "freshness";
  } else if (hasUnresolvedUrl) {
    // URL unresolved — do not publish, mark for admin review
    rejectionReason = `apply_${params.applyValidation.reason}`;
    rejectionCategory = rejectionCategory ?? "apply_link";
  } else if (params.applyValidation.status === "uncertain") {
    rejectionReason = "unverified_apply_url";
    rejectionCategory = rejectionCategory ?? "apply_link";
  } else if (trust.score < PIPELINE_TRUST_THRESHOLD) {
    rejectionReason = "low_trust_score";
    rejectionCategory = rejectionCategory ?? "trust_score";
  }

  // Determine admin review flag
  const needsAdminReview = Boolean(
    !hasVerifiedOutboundUrl ||
    !params.company ||
    params.applyValidation.status === "uncertain" ||
    trust.score < PIPELINE_TRUST_THRESHOLD ||
    (params.input.scrapeConfidence !== undefined && params.input.scrapeConfidence < 0.4)
  );

  // Determine validation status
  const validationStatus: ValidationStatus = hasVerifiedOutboundUrl
    ? "verified"
    : hasUnresolvedUrl || params.applyValidation.status === "uncertain"
      ? "unresolved"
      : "rejected";

  // Build scrape error message
  const scrapeError = params.input.scrapeError ?? (
    !hasVerifiedOutboundUrl && rejectionReason
      ? `rejected:${rejectionReason}`
      : null
  );

  return {
    id: params.candidateId,
    sourceName: params.input.sourceName,
    sourceKind: params.input.sourceKind,
    sourceListingUrl: params.input.sourceListingUrl,
    // CRITICAL FIX: Do NOT fall back to sourceListingUrl when jobDetailUrl is absent.
    // A null jobDetailUrl means we genuinely don't have a verified detail page URL.
    jobDetailUrl: params.input.jobDetailUrl ?? null,
    applyActionUrl: params.applyActionUrl ?? params.input.applyActionUrl ?? null,
    externalApplyUrl: params.input.externalApplyUrl ?? null,
    candidateApplyUrls: params.candidateApplyUrls,
    resolvedApplyUrl: params.resolvedApplyUrl,
    canonicalApplyUrl: params.canonicalApplyUrl,
    applyLinkStatus: params.applyValidation.status,
    applyLinkScore: params.applyLinkScore,
    applyLinkKind: params.applyLinkKind,
    applyCtaMode: params.applyCtaMode,
    verifiedApply: params.applyValidation.verifiedApply,
    applyLinkCheckedAt: params.applyValidation.checkedAt,
    companyName: params.input.companyName,
    companySlug: params.company?.slug ?? null,
    companyDomain: params.company?.companyDomain ?? (params.company ? extractDomain(params.company.website) : null),
    title: params.input.title,
    normalizedTitle,
    locationRaw: params.input.locationRaw ?? null,
    locationNormalized: location.locationNormalized,
    city: location.city,
    country: location.country,
    workMode: location.workMode,
    descriptionRaw: params.input.descriptionRaw ?? null,
    descriptionClean,
    postedAt: params.input.postedAt ?? null,
    firstSeenAt: params.firstSeenAt,
    lastSeenAt: params.lastSeenAt,
    employmentType: params.input.employmentType ?? null,
    seniorityLevel: classification.seniorityLevel,
    isInternship: classification.isInternship,
    internshipConfidence: classification.internshipConfidence,
    isBaku: location.isBaku,
    locationConfidence: location.locationConfidence,
    trustScore: trust.score,
    logoUrl: params.company?.logo ?? null,
    logoSource:
      params.company?.logo && !params.company.logo.includes("logo.clearbit.com")
        ? "company_profile"
        : params.company?.logo
          ? "clearbit"
          : null,
    logoConfidence:
      params.company?.logo && !params.company.logo.includes("logo.clearbit.com")
        ? 0.82
        : params.company?.logo
          ? 0.58
          : 0,
    isDuplicate: false,
    canonicalJobId,
    // HARD RULE: publishable requires no rejection AND a verified outbound vacancy/apply URL.
    publishable: rejectionReason === null && hasVerifiedOutboundUrl,
    rejectionReason,
    rejectionCategory,
    needsAdminReview,
    scrapeError,
    validationStatus,
    debugFlags: Array.from(
      new Set([
        ...classification.debugFlags,
        ...location.debugFlags,
        ...params.applyValidation.flags,
        ...trust.factors
      ])
    ),
    validationDebug: {
      applyCandidates: params.candidateApplyUrls,
      apply: params.applyValidation,
      applyActionUrl: params.applyActionUrl ?? params.input.applyActionUrl ?? null,
      canonicalApplyUrl: params.canonicalApplyUrl,
      applyLinkKind: params.applyLinkKind,
      applyCtaMode: params.applyCtaMode,
      applyLinkScore: params.applyLinkScore,
      verifiedOutboundUrl: hasVerifiedOutboundUrl,
      freshnessStatus,
      trustFactors: trust.factors,
      sourceReliability: guessSourceReliability(params.input.sourceName, params.input.sourceKind),
      selectionDebug: params.selectionDebug ?? null,
      debugFlags: Array.from(
        new Set([
          ...classification.debugFlags,
          ...location.debugFlags,
          ...params.applyValidation.flags,
          ...trust.factors
        ])
      )
    },
    sourcePayload: params.input.payload ?? null
  };
}

function applyAiReviewToCandidate(
  candidate: NormalizedJobCandidate,
  aiReview: Awaited<ReturnType<typeof maybeEnrichCandidateWithAi>>
) {
  if (!aiReview) {
    return candidate;
  }

  const nextInternshipConfidence =
    typeof aiReview.internshipConfidence === "number"
      ? Math.min(candidate.internshipConfidence, Math.max(0, Math.min(aiReview.internshipConfidence, 1)))
      : candidate.internshipConfidence;
  const nextLocationConfidence =
    typeof aiReview.locationConfidence === "number"
      ? Math.min(candidate.locationConfidence, Math.max(0, Math.min(aiReview.locationConfidence, 1)))
      : candidate.locationConfidence;
  const nextIsInternship = aiReview.isInternship === false ? false : candidate.isInternship;
  const nextIsBaku = aiReview.isBaku === false ? false : candidate.isBaku;
  const trustPenalty =
    (candidate.internshipConfidence - nextInternshipConfidence) * 0.08 +
    (candidate.locationConfidence - nextLocationConfidence) * 0.04;
  const nextTrustScore = Math.max(0, candidate.trustScore - trustPenalty);
  const debugFlags = Array.from(
    new Set([
      ...candidate.debugFlags,
      ...(aiReview.notes ?? []).map((note) => `ai:${note}`),
      "ai_reviewed"
    ])
  );
  const validationDebug = {
    ...candidate.validationDebug,
    aiReview
  };

  return {
    ...candidate,
    isInternship: nextIsInternship,
    internshipConfidence: nextInternshipConfidence,
    isBaku: nextIsBaku,
    locationConfidence: nextLocationConfidence,
    trustScore: nextTrustScore,
    publishable: candidate.publishable,
    rejectionReason: candidate.rejectionReason,
    rejectionCategory: candidate.rejectionCategory ?? aiReview.rejectionCategory ?? null,
    debugFlags,
    validationDebug
  };
}

async function analyzeRawJob(
  db: DatabaseSync,
  input: RawIngestedJob,
  firstSeenAt: string,
  lastSeenAt: string,
  candidateIdOverride?: string
) {
  const company = findMatchingCompany(input.companyName, input.companySiteHint ?? input.jobDetailUrl ?? input.sourceListingUrl);
  const normalizedTitle = normalizeTitle(input.title);
  const locationHint = normalizeLocation(
    input.locationRaw,
    input.descriptionRaw ?? "",
    company?.location ?? null
  );
  const applySelection = await selectBestApplyLink(db, {
    company,
    sourceKind: input.sourceKind,
    sourceListingUrl: input.sourceListingUrl,
    jobDetailUrl: input.jobDetailUrl ?? null,
    applyActionUrl: input.applyActionUrl ?? null,
    externalApplyUrl: input.externalApplyUrl ?? null,
    candidateApplyUrls: input.candidateApplyUrls ?? null,
    normalizedTitle,
    title: input.title,
    city: locationHint.city,
    companyName: input.companyName
  });
  const candidateId = candidateIdOverride ?? buildCandidateId(input);
  const candidate = buildCandidateRecord({
    candidateId,
    input,
    company,
    applyValidation: applySelection.validation,
    applyActionUrl: applySelection.applyActionUrl,
    candidateApplyUrls: applySelection.candidateUrls,
    resolvedApplyUrl: applySelection.selectedUrl,
    canonicalApplyUrl: applySelection.canonicalUrl,
    applyLinkScore: applySelection.selectedScore,
    applyLinkKind: applySelection.selectedKind,
    applyCtaMode: applySelection.ctaMode,
    selectionDebug: applySelection.debug,
    firstSeenAt,
    lastSeenAt
  });
  const aiReview = await maybeEnrichCandidateWithAi({ raw: input, candidate });

  return applyAiReviewToCandidate(candidate, aiReview);
}

function upsertCandidate(db: DatabaseSync, candidate: NormalizedJobCandidate, runId: string | null) {
  const insertColumns = [
    "id",
    "run_id",
    "source_name",
    "source_kind",
    "source_listing_url",
    "job_detail_url",
    "apply_action_url",
    "external_apply_url",
    "candidate_apply_urls_json",
    "resolved_apply_url",
    "canonical_apply_url",
    "apply_link_status",
    "apply_link_score",
    "apply_link_kind",
    "apply_cta_mode",
    "verified_apply",
    "apply_link_checked_at",
    "company_name",
    "company_slug",
    "company_domain",
    "company_site_hint",
    "title",
    "normalized_title",
    "location_raw",
    "location_normalized",
    "city",
    "country",
    "work_mode",
    "description_raw",
    "description_clean",
    "posted_at",
    "first_seen_at",
    "last_seen_at",
    "employment_type",
    "seniority_level",
    "is_internship",
    "internship_confidence",
    "is_baku",
    "location_confidence",
    "trust_score",
    "logo_url",
    "logo_source",
    "logo_confidence",
    "is_duplicate",
    "canonical_job_id",
    "publishable",
    "rejection_reason",
    "rejection_category",
    "needs_admin_review",
    "scrape_error",
    "validation_status",
    "processing_status",
    "attempt_count",
    "source_payload_json",
    "validation_debug_json",
    "last_error",
    "created_at",
    "updated_at"
  ] as const;
  const insertValues = [
    candidate.id,
    runId,
    candidate.sourceName,
    candidate.sourceKind,
    candidate.sourceListingUrl,
    candidate.jobDetailUrl,
    candidate.applyActionUrl,
    candidate.externalApplyUrl,
    JSON.stringify(candidate.candidateApplyUrls),
    candidate.resolvedApplyUrl,
    candidate.canonicalApplyUrl,
    candidate.applyLinkStatus,
    candidate.applyLinkScore,
    candidate.applyLinkKind,
    candidate.applyCtaMode,
    candidate.verifiedApply ? 1 : 0,
    candidate.applyLinkCheckedAt,
    candidate.companyName,
    candidate.companySlug,
    candidate.companyDomain,
    null,
    candidate.title,
    candidate.normalizedTitle,
    candidate.locationRaw,
    candidate.locationNormalized,
    candidate.city,
    candidate.country,
    candidate.workMode,
    candidate.descriptionRaw,
    candidate.descriptionClean,
    candidate.postedAt,
    candidate.firstSeenAt,
    candidate.lastSeenAt,
    candidate.employmentType,
    candidate.seniorityLevel,
    candidate.isInternship ? 1 : 0,
    candidate.internshipConfidence,
    candidate.isBaku ? 1 : 0,
    candidate.locationConfidence,
    candidate.trustScore,
    candidate.logoUrl,
    candidate.logoSource,
    candidate.logoConfidence,
    candidate.isDuplicate ? 1 : 0,
    candidate.canonicalJobId,
    candidate.publishable ? 1 : 0,
    candidate.rejectionReason,
    candidate.rejectionCategory,
    candidate.needsAdminReview ? 1 : 0,
    candidate.scrapeError,
    candidate.validationStatus,
    "processed",
    1,
    JSON.stringify(candidate.sourcePayload ?? {}),
    JSON.stringify(candidate.validationDebug),
    null,
    candidate.firstSeenAt,
    nowIsoTimestamp()
  ];

  db.prepare(
    `INSERT INTO job_candidates (
      ${insertColumns.join(", ")}
    ) VALUES (${insertColumns.map(() => "?").join(", ")})
    ON CONFLICT(id) DO UPDATE SET
      run_id = excluded.run_id,
      source_name = excluded.source_name,
      source_kind = excluded.source_kind,
      source_listing_url = excluded.source_listing_url,
      job_detail_url = excluded.job_detail_url,
      apply_action_url = excluded.apply_action_url,
      external_apply_url = excluded.external_apply_url,
      candidate_apply_urls_json = excluded.candidate_apply_urls_json,
      resolved_apply_url = excluded.resolved_apply_url,
      canonical_apply_url = excluded.canonical_apply_url,
      apply_link_status = excluded.apply_link_status,
      apply_link_score = excluded.apply_link_score,
      apply_link_kind = excluded.apply_link_kind,
      apply_cta_mode = excluded.apply_cta_mode,
      verified_apply = excluded.verified_apply,
      apply_link_checked_at = excluded.apply_link_checked_at,
      company_name = excluded.company_name,
      company_slug = excluded.company_slug,
      company_domain = excluded.company_domain,
      company_site_hint = excluded.company_site_hint,
      title = excluded.title,
      normalized_title = excluded.normalized_title,
      location_raw = excluded.location_raw,
      location_normalized = excluded.location_normalized,
      city = excluded.city,
      country = excluded.country,
      work_mode = excluded.work_mode,
      description_raw = excluded.description_raw,
      description_clean = excluded.description_clean,
      posted_at = excluded.posted_at,
      last_seen_at = excluded.last_seen_at,
      employment_type = excluded.employment_type,
      seniority_level = excluded.seniority_level,
      is_internship = excluded.is_internship,
      internship_confidence = excluded.internship_confidence,
      is_baku = excluded.is_baku,
      location_confidence = excluded.location_confidence,
      trust_score = excluded.trust_score,
      logo_url = excluded.logo_url,
      logo_source = excluded.logo_source,
      logo_confidence = excluded.logo_confidence,
      is_duplicate = excluded.is_duplicate,
      canonical_job_id = excluded.canonical_job_id,
      publishable = excluded.publishable,
      rejection_reason = excluded.rejection_reason,
      rejection_category = excluded.rejection_category,
      needs_admin_review = excluded.needs_admin_review,
      scrape_error = excluded.scrape_error,
      validation_status = excluded.validation_status,
      processing_status = 'processed',
      source_payload_json = excluded.source_payload_json,
      validation_debug_json = excluded.validation_debug_json,
      last_error = NULL,
      updated_at = excluded.updated_at`
  ).run(...insertValues);
}

function recordValidationLog(db: DatabaseSync, candidateId: string, validation: ApplyLinkValidationResult) {
  db.prepare(
    `INSERT INTO job_link_validation_logs (
      candidate_id, url_checked, final_url, http_status, status, reason, redirect_chain_json, indicators_json, checked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    candidateId,
    validation.redirectChain[0] ?? null,
    validation.finalUrl,
    validation.httpStatus,
    validation.status,
    validation.reason,
    JSON.stringify(validation.redirectChain),
    JSON.stringify(validation.flags),
    validation.checkedAt
  );
}

function upsertVariant(db: DatabaseSync, candidate: NormalizedJobCandidate, isPrimary: boolean) {
  db.prepare(
    `INSERT INTO job_variants (
      id, canonical_job_id, candidate_id, source_name, source_listing_url, job_detail_url, external_apply_url,
      resolved_apply_url, apply_link_status, is_primary, checked_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(candidate_id) DO UPDATE SET
      canonical_job_id = excluded.canonical_job_id,
      source_name = excluded.source_name,
      source_listing_url = excluded.source_listing_url,
      job_detail_url = excluded.job_detail_url,
      external_apply_url = excluded.external_apply_url,
      resolved_apply_url = excluded.resolved_apply_url,
      apply_link_status = excluded.apply_link_status,
      is_primary = excluded.is_primary,
      checked_at = excluded.checked_at,
      updated_at = excluded.updated_at`
  ).run(
    candidate.id,
    candidate.canonicalJobId,
    candidate.id,
    candidate.sourceName,
    candidate.sourceListingUrl,
    candidate.jobDetailUrl,
    candidate.externalApplyUrl,
    candidate.resolvedApplyUrl,
    candidate.applyLinkStatus,
    isPrimary ? 1 : 0,
    candidate.applyLinkCheckedAt,
    candidate.firstSeenAt,
    nowIsoTimestamp()
  );
}

function mapCandidateRow(row: CandidateRow): NormalizedJobCandidate {
  const validationDebug = safeParseJson<Record<string, unknown>>(row.validation_debug_json, {});
  const debugFlags = Array.isArray(validationDebug.debugFlags)
    ? validationDebug.debugFlags.filter((flag): flag is string => typeof flag === "string")
    : [];

  return {
    id: row.id,
    sourceName: row.source_name,
    sourceKind: row.source_kind,
    sourceListingUrl: row.source_listing_url,
    jobDetailUrl: row.job_detail_url,
    applyActionUrl: row.apply_action_url,
    externalApplyUrl: row.external_apply_url,
    candidateApplyUrls: safeParseJson<string[]>(row.candidate_apply_urls_json, []),
    resolvedApplyUrl: row.resolved_apply_url,
    canonicalApplyUrl: row.canonical_apply_url,
    applyLinkStatus: row.apply_link_status,
    applyLinkScore: row.apply_link_score,
    applyLinkKind: (row.apply_link_kind ?? "unknown") as NormalizedJobCandidate["applyLinkKind"],
    applyCtaMode: (row.apply_cta_mode ?? "disabled") as NormalizedJobCandidate["applyCtaMode"],
    verifiedApply: Boolean(row.verified_apply),
    applyLinkCheckedAt: row.apply_link_checked_at,
    companyName: row.company_name,
    companySlug: row.company_slug,
    companyDomain: row.company_domain,
    title: row.title,
    normalizedTitle: row.normalized_title,
    locationRaw: row.location_raw,
    locationNormalized: row.location_normalized,
    city: row.city,
    country: row.country,
    workMode: row.work_mode as NormalizedJobCandidate["workMode"],
    descriptionRaw: row.description_raw,
    descriptionClean: row.description_clean,
    postedAt: row.posted_at,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    employmentType: row.employment_type,
    seniorityLevel: (row.seniority_level ?? "unknown") as NormalizedJobCandidate["seniorityLevel"],
    isInternship: Boolean(row.is_internship),
    internshipConfidence: row.internship_confidence,
    isBaku: Boolean(row.is_baku),
    locationConfidence: row.location_confidence,
    trustScore: row.trust_score,
    logoUrl: row.logo_url,
    logoSource: row.logo_source,
    logoConfidence: row.logo_confidence,
    isDuplicate: Boolean(row.is_duplicate),
    canonicalJobId: row.canonical_job_id ?? row.id,
    publishable: Boolean(row.publishable),
    rejectionReason: row.rejection_reason,
    rejectionCategory: row.rejection_category,
    needsAdminReview: Boolean(row.needs_admin_review),
    scrapeError: row.scrape_error ?? null,
    validationStatus: (row.validation_status ?? "pending") as NormalizedJobCandidate["validationStatus"],
    debugFlags,
    validationDebug,
    sourcePayload: safeParseJson<Record<string, unknown> | null>(row.source_payload_json, null)
  };
}

function findPublishedJobByCanonicalId(db: DatabaseSync, canonicalJobId: string) {
  return db.prepare("SELECT slug FROM jobs WHERE canonical_job_id = ? LIMIT 1").get(canonicalJobId) as
    | { slug?: string }
    | undefined;
}

function findPublishedJobBySourceArtifacts(
  db: DatabaseSync,
  candidate: Pick<
    NormalizedJobCandidate,
    "jobDetailUrl" | "canonicalApplyUrl" | "resolvedApplyUrl" | "applyActionUrl"
  >
) {
  const urls = Array.from(
    new Set(
      [
        candidate.jobDetailUrl,
        candidate.canonicalApplyUrl,
        candidate.resolvedApplyUrl,
        candidate.applyActionUrl
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  if (urls.length === 0) {
    return null;
  }

  const placeholders = urls.map(() => "?").join(", ");
  const sql = `
    SELECT slug
    FROM jobs
    WHERE source_url IN (${placeholders})
       OR job_detail_url IN (${placeholders})
       OR canonical_apply_url IN (${placeholders})
       OR resolved_apply_url IN (${placeholders})
       OR apply_url IN (${placeholders})
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const params = [...urls, ...urls, ...urls, ...urls, ...urls];

  return db.prepare(sql).get(...params) as { slug?: string } | undefined;
}

function upsertPublishedJobFromCandidate(db: DatabaseSync, candidate: NormalizedJobCandidate) {
  // HARD PUBLISH GATE: never publish without a verified canonical apply URL
  if (
    !candidate.canonicalApplyUrl ||
    !isVerifiedRedirectTarget(candidate.canonicalApplyUrl) ||
    candidate.applyLinkStatus === "broken" ||
    candidate.validationStatus !== "verified"
  ) {
    logPipelineEvent("publish_blocked", {
      candidateId: candidate.id,
      reason: "unverified_apply_url",
      canonicalApplyUrl: candidate.canonicalApplyUrl,
      applyLinkStatus: candidate.applyLinkStatus,
      validationStatus: candidate.validationStatus
    });
    return null;
  }

  let company = candidate.companySlug
    ? listCompanies().find((item) => item.slug === candidate.companySlug) ?? null
    : null;

  if (!company) {
    const evidenceUrl =
      candidate.jobDetailUrl ??
      candidate.canonicalApplyUrl ??
      candidate.resolvedApplyUrl ??
      candidate.sourceListingUrl;

    if (!evidenceUrl) {
      return null;
    }

    company = ensureSourceDerivedCompany({
      companyName: candidate.companyName,
      evidenceUrl,
      location: candidate.city ?? candidate.locationRaw ?? candidate.country ?? "Azərbaycan",
      sourceName: candidate.sourceName
    }) ?? null;
  }

  if (!company) {
    return null;
  }

  const draft = buildPublishedJobDraft(candidate, company);
  const existing =
    findPublishedJobByCanonicalId(db, candidate.canonicalJobId) ??
    findPublishedJobBySourceArtifacts(db, candidate);
  const now = nowIsoTimestamp();
  const slug = existing?.slug ?? nextUniqueJobSlug(db, `${candidate.title}-${company.slug}`);
  const applyDebug =
    candidate.validationDebug && typeof candidate.validationDebug === "object"
      ? (candidate.validationDebug as Record<string, unknown>)["apply"]
      : null;
  const applyReason =
    applyDebug && typeof applyDebug === "object"
      ? String((applyDebug as Record<string, unknown>).reason ?? "validated")
      : "validated";
  const freshnessStatus = deriveFreshnessStatus(candidate.postedAt);
  const trustBadges = buildTrustBadges(candidate);
  const createdAt = existing?.slug
    ? candidate.firstSeenAt.slice(0, 10)
    : draft.createdAt ?? todayIsoDate();
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
    "apply_url",
    "direct_company_url",
    "created_at",
    "updated_at",
    "id",
    "source_listing_url",
    "source_kind",
    "job_detail_url",
    "apply_action_url",
    "candidate_apply_urls_json",
    "external_apply_url",
    "resolved_apply_url",
    "canonical_apply_url",
    "apply_link_status",
    "apply_link_score",
    "apply_link_kind",
    "apply_cta_mode",
    "apply_link_reason",
    "apply_link_checked_at",
    "checked_recently_at",
    "last_checked_at",
    "verified_apply",
    "official_source",
    "canonical_job_id",
    "company_name",
    "company_domain",
    "normalized_title",
    "location_raw",
    "location_normalized",
    "country",
    "description_raw",
    "description_clean",
    "first_seen_at",
    "last_seen_at",
    "employment_type",
    "seniority_level",
    "is_internship",
    "internship_confidence",
    "is_baku",
    "location_confidence",
    "trust_score",
    "freshness_status",
    "expires_at",
    "is_expired",
    "trust_badges",
    "logo_url",
    "logo_source",
    "logo_confidence",
    "is_duplicate",
    "publishable",
    "rejection_reason",
    "rejection_category",
    "validation_status",
    "needs_admin_review",
    "scrape_error",
    "validation_debug_json"
  ] as const;
  const insertValues = [
    slug,
    serializeLocalizedText(draft.title),
    draft.companySlug,
    draft.city,
    draft.workModel,
    draft.level,
    serializeLocalizedText(draft.category),
    draft.postedAt,
    draft.deadline,
    serializeLocalizedText(draft.summary),
    JSON.stringify(draft.responsibilities),
    JSON.stringify(draft.requirements),
    JSON.stringify(draft.benefits),
    serializeLocalizedTextList(draft.tags),
    0,
    candidate.sourceName,
    candidate.jobDetailUrl ?? candidate.sourceListingUrl,
    candidate.canonicalApplyUrl ?? candidate.resolvedApplyUrl,
    company.verified === false ? null : company.website,
    createdAt,
    now,
    candidate.id,
    candidate.sourceListingUrl,
    candidate.sourceKind,
    candidate.jobDetailUrl,
    candidate.applyActionUrl,
    JSON.stringify(candidate.candidateApplyUrls),
    candidate.externalApplyUrl,
    candidate.resolvedApplyUrl,
    candidate.canonicalApplyUrl,
    candidate.applyLinkStatus,
    candidate.applyLinkScore,
    candidate.applyLinkKind,
    candidate.applyCtaMode,
    applyReason,
    candidate.applyLinkCheckedAt,
    candidate.applyLinkCheckedAt ?? now,
    candidate.applyLinkCheckedAt ?? now,
    candidate.verifiedApply ? 1 : 0,
    candidate.sourceKind === "career-page" ? 1 : 0,
    candidate.canonicalJobId,
    company.name,
    company.companyDomain ?? (company.verified === false ? null : extractDomain(company.website)),
    candidate.normalizedTitle,
    candidate.locationRaw,
    candidate.locationNormalized,
    candidate.country,
    candidate.descriptionRaw,
    candidate.descriptionClean,
    candidate.firstSeenAt,
    candidate.lastSeenAt,
    candidate.employmentType,
    candidate.seniorityLevel,
    candidate.isInternship ? 1 : 0,
    candidate.internshipConfidence,
    candidate.isBaku ? 1 : 0,
    candidate.locationConfidence,
    candidate.trustScore,
    freshnessStatus,
    freshnessStatus === "expired" ? now : null,
    freshnessStatus === "expired" ? 1 : 0,
    JSON.stringify(trustBadges),
    candidate.logoUrl,
    candidate.logoSource,
    candidate.logoConfidence,
    0,
    candidate.publishable ? 1 : 0,
    candidate.rejectionReason,
    candidate.rejectionCategory,
    candidate.validationStatus,
    candidate.needsAdminReview ? 1 : 0,
    candidate.scrapeError,
    JSON.stringify(buildDebugPayload(candidate))
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
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      apply_url = excluded.apply_url,
      direct_company_url = excluded.direct_company_url,
      updated_at = excluded.updated_at,
      id = excluded.id,
      source_listing_url = excluded.source_listing_url,
      source_kind = excluded.source_kind,
      job_detail_url = excluded.job_detail_url,
      apply_action_url = excluded.apply_action_url,
      candidate_apply_urls_json = excluded.candidate_apply_urls_json,
      external_apply_url = excluded.external_apply_url,
      resolved_apply_url = excluded.resolved_apply_url,
      canonical_apply_url = excluded.canonical_apply_url,
      apply_link_status = excluded.apply_link_status,
      apply_link_score = excluded.apply_link_score,
      apply_link_kind = excluded.apply_link_kind,
      apply_cta_mode = excluded.apply_cta_mode,
      apply_link_reason = excluded.apply_link_reason,
      apply_link_checked_at = excluded.apply_link_checked_at,
      checked_recently_at = excluded.checked_recently_at,
      last_checked_at = excluded.last_checked_at,
      verified_apply = excluded.verified_apply,
      official_source = excluded.official_source,
      canonical_job_id = excluded.canonical_job_id,
      company_name = excluded.company_name,
      company_domain = excluded.company_domain,
      normalized_title = excluded.normalized_title,
      location_raw = excluded.location_raw,
      location_normalized = excluded.location_normalized,
      country = excluded.country,
      description_raw = excluded.description_raw,
      description_clean = excluded.description_clean,
      first_seen_at = excluded.first_seen_at,
      last_seen_at = excluded.last_seen_at,
      employment_type = excluded.employment_type,
      seniority_level = excluded.seniority_level,
      is_internship = excluded.is_internship,
      internship_confidence = excluded.internship_confidence,
      is_baku = excluded.is_baku,
      location_confidence = excluded.location_confidence,
      trust_score = excluded.trust_score,
      freshness_status = excluded.freshness_status,
      expires_at = excluded.expires_at,
      is_expired = excluded.is_expired,
      trust_badges = excluded.trust_badges,
      logo_url = excluded.logo_url,
      logo_source = excluded.logo_source,
      logo_confidence = excluded.logo_confidence,
      is_duplicate = 0,
      publishable = excluded.publishable,
      rejection_reason = excluded.rejection_reason,
      rejection_category = excluded.rejection_category,
      validation_status = excluded.validation_status,
      needs_admin_review = excluded.needs_admin_review,
      scrape_error = excluded.scrape_error,
      validation_debug_json = excluded.validation_debug_json`
  ).run(...insertValues);

  return slug;
}

function markCanonicalJobUnpublished(db: DatabaseSync, canonicalJobId: string, reason: string | null, category: string | null) {
  db.prepare(
    `UPDATE jobs
     SET publishable = 0, rejection_reason = ?, rejection_category = ?, updated_at = ?
     WHERE canonical_job_id = ?`
  ).run(reason, category, nowIsoTimestamp(), canonicalJobId);
}

function refreshCanonicalPublication(db: DatabaseSync, canonicalJobId: string) {
  const candidateRows = db.prepare(
    `SELECT *
     FROM job_candidates
     WHERE canonical_job_id = ?
     ORDER BY publishable DESC, trust_score DESC, verified_apply DESC, posted_at DESC, last_seen_at DESC`
  ).all(canonicalJobId) as CandidateRow[];

  const candidates = candidateRows.map(mapCandidateRow);
  const primary = candidates[0] ?? null;

  for (const candidate of candidates) {
    const isPrimary = Boolean(primary) && candidate.id === primary.id;
    db.prepare("UPDATE job_candidates SET is_duplicate = ?, updated_at = ? WHERE id = ?").run(
      isPrimary ? 0 : 1,
      nowIsoTimestamp(),
      candidate.id
    );
    upsertVariant(db, { ...candidate, isDuplicate: !isPrimary }, isPrimary);
  }

  if (!primary) {
    return;
  }

  if (primary.publishable) {
    upsertPublishedJobFromCandidate(db, { ...primary, isDuplicate: false });
    return;
  }

  markCanonicalJobUnpublished(db, canonicalJobId, primary.rejectionReason, primary.rejectionCategory);
}

function compareCandidatesForPrimary(left: NormalizedJobCandidate, right: NormalizedJobCandidate) {
  if (Number(right.publishable) !== Number(left.publishable)) {
    return Number(right.publishable) - Number(left.publishable);
  }

  if (right.trustScore !== left.trustScore) {
    return right.trustScore - left.trustScore;
  }

  if (Number(right.verifiedApply) !== Number(left.verifiedApply)) {
    return Number(right.verifiedApply) - Number(left.verifiedApply);
  }

  const postedComparison = (right.postedAt ?? "").localeCompare(left.postedAt ?? "");
  if (postedComparison !== 0) {
    return postedComparison;
  }

  return right.lastSeenAt.localeCompare(left.lastSeenAt);
}

async function processCandidateRecord(db: DatabaseSync, row: CandidateRow) {
  db.prepare(
    `UPDATE job_candidates
     SET processing_status = 'processing', attempt_count = attempt_count + 1, updated_at = ?
     WHERE id = ?`
  ).run(nowIsoTimestamp(), row.id);

  const sourcePayload = safeParseJson<Record<string, unknown> | null>(row.source_payload_json, null);

  try {
    const candidate = await analyzeRawJob(
      db,
      {
        sourceName: row.source_name,
        sourceKind: row.source_kind,
        sourceListingUrl: row.source_listing_url,
        jobDetailUrl: row.job_detail_url,
        applyActionUrl: row.apply_action_url,
        candidateApplyUrls: safeParseJson<string[]>(row.candidate_apply_urls_json, []),
        externalApplyUrl: row.external_apply_url,
        companyName: row.company_name,
        title: row.title,
        locationRaw: row.location_raw,
        postedAt: row.posted_at,
        employmentType: row.employment_type,
        descriptionRaw: row.description_raw,
        companySiteHint: row.company_site_hint,
        payload: sourcePayload
      },
      row.first_seen_at,
      nowIsoTimestamp(),
      row.id
    );

    upsertCandidate(db, candidate, row.run_id);
    const applyDebug =
      candidate.validationDebug && typeof candidate.validationDebug === "object"
        ? (candidate.validationDebug as Record<string, unknown>)["apply"]
        : null;
    const applyValidation =
      applyDebug && typeof applyDebug === "object" && "status" in applyDebug
        ? (applyDebug as ApplyLinkValidationResult)
        : null;
    if (applyValidation) {
      recordValidationLog(db, row.id, applyValidation);
    }
    refreshCanonicalPublication(db, candidate.canonicalJobId);
    if (candidate.companySlug) {
      void scheduleCompanyEnrichment(candidate.companySlug);
    }
    logPipelineEvent("candidate_processed", buildDebugPayload(candidate));
  } catch (error) {
    const message = error instanceof Error ? error.message : "candidate_processing_failed";
    db.prepare(
      `UPDATE job_candidates
       SET processing_status = 'failed', last_error = ?, updated_at = ?
       WHERE id = ?`
    ).run(message, nowIsoTimestamp(), row.id);
    logPipelineEvent("candidate_failed", {
      candidateId: row.id,
      sourceName: row.source_name,
      sourceListingUrl: row.source_listing_url,
      error: message
    });
  }
}

function updateRunCounters(db: DatabaseSync, runId: string) {
  const counts = db.prepare(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN processing_status = 'processed' THEN 1 ELSE 0 END) AS processed_count,
      SUM(CASE WHEN publishable = 1 THEN 1 ELSE 0 END) AS published_count,
      SUM(CASE WHEN publishable = 0 THEN 1 ELSE 0 END) AS rejected_count,
      SUM(CASE WHEN is_duplicate = 1 THEN 1 ELSE 0 END) AS duplicate_count,
      SUM(CASE WHEN processing_status = 'failed' THEN 1 ELSE 0 END) AS error_count
     FROM job_candidates
     WHERE run_id = ?`
  ).get(runId) as
    | {
        total?: number | bigint;
        processed_count?: number | bigint;
        published_count?: number | bigint;
        rejected_count?: number | bigint;
        duplicate_count?: number | bigint;
        error_count?: number | bigint;
      }
    | undefined;

  db.prepare(
    `UPDATE ingestion_runs
     SET queued_count = ?, processed_count = ?, published_count = ?, rejected_count = ?, duplicate_count = ?, error_count = ?
     WHERE id = ?`
  ).run(
    Number(counts?.total ?? 0),
    Number(counts?.processed_count ?? 0),
    Number(counts?.published_count ?? 0),
    Number(counts?.rejected_count ?? 0),
    Number(counts?.duplicate_count ?? 0),
    Number(counts?.error_count ?? 0),
    runId
  );
}

function finalizeRun(db: DatabaseSync, runId: string) {
  updateRunCounters(db, runId);
  const run = db.prepare("SELECT * FROM ingestion_runs WHERE id = ?").get(runId) as IngestionRunRow | undefined;

  if (!run) {
    return null;
  }

  const nextStatus: IngestionRunStatus =
    run.error_count > 0 ? "completed_with_errors" : "completed";

  db.prepare(
    `UPDATE ingestion_runs
     SET status = ?, finished_at = ?
     WHERE id = ?`
  ).run(nextStatus, nowIsoTimestamp(), runId);

  return getIngestionRun(runId);
}

function resetStalledCandidates(db: DatabaseSync) {
  const stalledThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  db.prepare(
    `UPDATE job_candidates
     SET processing_status = 'pending', updated_at = ?
     WHERE processing_status = 'processing' AND updated_at < ?`
  ).run(nowIsoTimestamp(), stalledThreshold);
}

async function processPendingCandidatesInternal(runId?: string) {
  const db = getPlatformDatabase();
  ensurePipelineSchema();
  resetStalledCandidates(db);

  const runs = runId
    ? [runId]
    : (db.prepare("SELECT id FROM ingestion_runs WHERE status IN ('queued', 'running') ORDER BY started_at ASC").all() as Array<{
        id: string;
      }>).map((row) => row.id);

  for (const currentRunId of runs) {
    db.prepare("UPDATE ingestion_runs SET status = 'running' WHERE id = ?").run(currentRunId);

    while (true) {
      const row = db.prepare(
        `SELECT *
         FROM job_candidates
         WHERE run_id = ? AND processing_status = 'pending'
         ORDER BY created_at ASC
         LIMIT 1`
      ).get(currentRunId) as CandidateRow | undefined;

      if (!row) {
        break;
      }

      await processCandidateRecord(db, row);
      updateRunCounters(db, currentRunId);
    }

    finalizeRun(db, currentRunId);
  }
}

export function getIngestionRun(runId: string) {
  ensurePipelineSchema();
  const db = getPlatformDatabase();
  const row = db.prepare("SELECT * FROM ingestion_runs WHERE id = ?").get(runId) as IngestionRunRow | undefined;
  return row ? mapRunRow(row) : null;
}

export function listRecentIngestionRuns(limit = 5) {
  ensurePipelineSchema();
  const db = getPlatformDatabase();
  const rows = db.prepare("SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT ?").all(limit) as IngestionRunRow[];
  return rows.map(mapRunRow);
}

export function getPipelineMetrics(): PipelineMetrics {
  ensurePipelineSchema();
  const db = getPlatformDatabase();
  const row = db.prepare(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN apply_link_status = 'valid' THEN 1 ELSE 0 END) AS valid_apply,
      SUM(CASE WHEN apply_link_status = 'broken' THEN 1 ELSE 0 END) AS broken_apply,
      SUM(CASE WHEN is_internship = 1 AND internship_confidence >= 0.8 THEN 1 ELSE 0 END) AS high_confidence_internships,
      SUM(CASE WHEN is_baku = 1 AND location_confidence >= 0.8 THEN 1 ELSE 0 END) AS high_confidence_baku,
      SUM(CASE WHEN is_duplicate = 1 THEN 1 ELSE 0 END) AS duplicates,
      SUM(CASE WHEN publishable = 1 THEN 1 ELSE 0 END) AS publishable,
      SUM(CASE WHEN rejection_category = 'freshness' OR rejection_reason IN ('stale_or_low_freshness', 'expired_or_archived', 'stale_or_expired') THEN 1 ELSE 0 END) AS stale_or_expired,
      SUM(CASE WHEN logo_url IS NOT NULL AND logo_confidence >= 0.58 THEN 1 ELSE 0 END) AS resolved_logo,
      SUM(CASE WHEN processing_status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN processing_status = 'processing' THEN 1 ELSE 0 END) AS processing_count,
      SUM(CASE WHEN processing_status = 'failed' THEN 1 ELSE 0 END) AS failed_count
     FROM job_candidates`
  ).get() as
    | {
        total?: number | bigint;
        valid_apply?: number | bigint;
        broken_apply?: number | bigint;
        high_confidence_internships?: number | bigint;
        high_confidence_baku?: number | bigint;
        duplicates?: number | bigint;
        publishable?: number | bigint;
        stale_or_expired?: number | bigint;
        resolved_logo?: number | bigint;
        pending_count?: number | bigint;
        processing_count?: number | bigint;
        failed_count?: number | bigint;
      }
    | undefined;

  const latestRun = db.prepare(
    "SELECT finished_at FROM ingestion_runs WHERE status IN ('completed', 'completed_with_errors') ORDER BY finished_at DESC LIMIT 1"
  ).get() as { finished_at?: string | null } | undefined;
  const sourceStats = db.prepare(
    `SELECT
       source_name,
       COUNT(*) AS total,
       SUM(CASE WHEN publishable = 1 THEN 1 ELSE 0 END) AS publishable,
       SUM(CASE WHEN apply_link_status = 'valid' THEN 1 ELSE 0 END) AS valid_apply,
       SUM(CASE WHEN rejection_category = 'freshness' OR rejection_reason IN ('stale_or_low_freshness', 'expired_or_archived', 'stale_or_expired') THEN 1 ELSE 0 END) AS stale_count
     FROM job_candidates
     GROUP BY source_name
     ORDER BY total DESC, publishable DESC
     LIMIT 10`
  ).all() as Array<{
    source_name: string;
    total?: number | bigint;
    publishable?: number | bigint;
    valid_apply?: number | bigint;
    stale_count?: number | bigint;
  }>;
  const rejectionReasons = db.prepare(
    `SELECT rejection_reason, COUNT(*) AS count
     FROM job_candidates
     WHERE rejection_reason IS NOT NULL
     GROUP BY rejection_reason
     ORDER BY count DESC
     LIMIT 10`
  ).all() as Array<{ rejection_reason: string | null; count?: number | bigint }>;

  const total = Number(row?.total ?? 0);

  return {
    totalIngestedJobs: total,
    validApplyRate: total > 0 ? Number(row?.valid_apply ?? 0) / total : 0,
    brokenLinkRate: total > 0 ? Number(row?.broken_apply ?? 0) / total : 0,
    internshipPrecision: total > 0 ? Number(row?.high_confidence_internships ?? 0) / total : 0,
    bakuPrecision: total > 0 ? Number(row?.high_confidence_baku ?? 0) / total : 0,
    duplicateRate: total > 0 ? Number(row?.duplicates ?? 0) / total : 0,
    publishableRate: total > 0 ? Number(row?.publishable ?? 0) / total : 0,
    staleOrExpiredRate: total > 0 ? Number(row?.stale_or_expired ?? 0) / total : 0,
    logoResolutionRate: total > 0 ? Number(row?.resolved_logo ?? 0) / total : 0,
    pendingCount: Number(row?.pending_count ?? 0),
    processingCount: Number(row?.processing_count ?? 0),
    failedCount: Number(row?.failed_count ?? 0),
    lastCompletedRunAt: latestRun?.finished_at ?? null,
    sourceStats: sourceStats.map((item) => {
      const sourceTotal = Number(item.total ?? 0);
      return {
        sourceName: item.source_name,
        total: sourceTotal,
        publishableRate: sourceTotal > 0 ? Number(item.publishable ?? 0) / sourceTotal : 0,
        validApplyRate: sourceTotal > 0 ? Number(item.valid_apply ?? 0) / sourceTotal : 0,
        staleRate: sourceTotal > 0 ? Number(item.stale_count ?? 0) / sourceTotal : 0
      };
    }),
    rejectionReasons: rejectionReasons.map((item) => ({
      reason: item.rejection_reason ?? "unknown",
      count: Number(item.count ?? 0)
    }))
  };
}

export function createIngestionRun(input: { dryRun: boolean; sourceCount: number; notes?: Record<string, unknown> }) {
  ensurePipelineSchema();
  const db = getPlatformDatabase();
  const id = stableHash(`${nowIsoTimestamp()}|${Math.random()}|${input.sourceCount}`);
  const startedAt = nowIsoTimestamp();

  db.prepare(
    `INSERT INTO ingestion_runs (
      id, status, dry_run, source_count, started_at, notes
    ) VALUES (?, 'queued', ?, ?, ?, ?)`
  ).run(id, input.dryRun ? 1 : 0, input.sourceCount, startedAt, JSON.stringify(input.notes ?? {}));

  return getIngestionRun(id);
}

export function enqueueRawJobs(runId: string, jobs: RawIngestedJob[]) {
  ensurePipelineSchema();
  const db = getPlatformDatabase();
  const now = nowIsoTimestamp();
  const existingFirstSeenStatement = db.prepare("SELECT first_seen_at FROM job_candidates WHERE id = ? LIMIT 1");
  const statement = db.prepare(
    `INSERT INTO job_candidates (
      id, run_id, source_name, source_kind, source_listing_url, job_detail_url, apply_action_url, external_apply_url,
      candidate_apply_urls_json, company_name, company_domain, company_site_hint, title, normalized_title, location_raw, description_raw,
      posted_at, employment_type, first_seen_at, last_seen_at, processing_status, source_payload_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      run_id = excluded.run_id,
      source_name = excluded.source_name,
      source_kind = excluded.source_kind,
      source_listing_url = excluded.source_listing_url,
      job_detail_url = excluded.job_detail_url,
      apply_action_url = COALESCE(excluded.apply_action_url, job_candidates.apply_action_url),
      external_apply_url = COALESCE(excluded.external_apply_url, job_candidates.external_apply_url),
      candidate_apply_urls_json = COALESCE(excluded.candidate_apply_urls_json, job_candidates.candidate_apply_urls_json),
      company_name = excluded.company_name,
      company_domain = excluded.company_domain,
      company_site_hint = excluded.company_site_hint,
      title = excluded.title,
      normalized_title = excluded.normalized_title,
      location_raw = excluded.location_raw,
      description_raw = excluded.description_raw,
      posted_at = COALESCE(excluded.posted_at, job_candidates.posted_at),
      employment_type = COALESCE(excluded.employment_type, job_candidates.employment_type),
      last_seen_at = excluded.last_seen_at,
      processing_status = 'pending',
      source_payload_json = excluded.source_payload_json,
      updated_at = excluded.updated_at`
  );

  for (const job of jobs) {
    const id = buildCandidateId(job);
    const firstSeen = (existingFirstSeenStatement.get(id) as { first_seen_at?: string } | undefined)?.first_seen_at ?? now;

    statement.run(
      id,
      runId,
      job.sourceName,
      guessSourceKind(job.sourceName, job.sourceListingUrl, job.sourceKind),
      job.sourceListingUrl,
      job.jobDetailUrl ?? null,
      job.applyActionUrl ?? null,
      job.externalApplyUrl ?? null,
      JSON.stringify(job.candidateApplyUrls ?? []),
      job.companyName,
      extractDomain(job.companySiteHint),
      job.companySiteHint ?? null,
      job.title,
      normalizeTitle(job.title),
      job.locationRaw ?? null,
      job.descriptionRaw ?? null,
      job.postedAt ?? null,
      job.employmentType ?? null,
      firstSeen,
      now,
      JSON.stringify(job.payload ?? {}),
      firstSeen,
      now
    );
  }

  db.prepare("UPDATE ingestion_runs SET queued_count = ? WHERE id = ?").run(jobs.length, runId);
}

export async function previewRawJobs(jobs: RawIngestedJob[]): Promise<ScrapePipelineResult> {
  ensurePipelineSchema();
  const db = getPlatformDatabase();
  const importedJobs: ScrapePipelineResult["importedJobs"] = [];
  const unmatchedRegistry = new Map<string, { name: string; sources: Set<string>; sampleTitles: Set<string> }>();
  let matchedCount = 0;
  let importedCount = 0;
  let updatedCount = 0;

  for (const job of jobs) {
    const candidate = await analyzeRawJob(db, job, nowIsoTimestamp(), nowIsoTimestamp());
    const existingCanonical = findPublishedJobByCanonicalId(db, candidate.canonicalJobId);

    if (!candidate.companySlug) {
      const key = normalizeCompanyName(candidate.companyName) || candidate.companyName;
      const current = unmatchedRegistry.get(key) ?? {
        name: candidate.companyName,
        sources: new Set<string>(),
        sampleTitles: new Set<string>()
      };
      current.sources.add(candidate.sourceName);
      current.sampleTitles.add(candidate.title);
      unmatchedRegistry.set(key, current);
    } else {
      matchedCount += 1;
    }

    if (candidate.publishable) {
      if (existingCanonical) {
        updatedCount += 1;
      } else {
        importedCount += 1;
      }
    }

    importedJobs.push({
      title: candidate.title,
      companyName: candidate.companyName,
      sourceName: candidate.sourceName,
      action: "preview"
    });
  }

  return {
    message: "Preview hazırdır.",
    dryRun: true,
    importedCount,
    updatedCount,
    matchedCount,
    totalScraped: jobs.length,
    importedJobs: importedJobs.slice(0, 12),
    unmatchedCompanies: Array.from(unmatchedRegistry.values()).map((item) => ({
      name: item.name,
      sources: Array.from(item.sources),
      sampleTitles: Array.from(item.sampleTitles).slice(0, 3)
    })),
    errors: []
  };
}

export async function inspectRawJobs(jobs: RawIngestedJob[]): Promise<CandidateInspectionResult[]> {
  ensurePipelineSchema();
  const db = getPlatformDatabase();
  const now = nowIsoTimestamp();
  const analyzed = await Promise.all(jobs.map((job) => analyzeRawJob(db, job, now, now)));
  const groups = new Map<string, NormalizedJobCandidate[]>();

  for (const candidate of analyzed) {
    const current = groups.get(candidate.canonicalJobId) ?? [];
    current.push(candidate);
    groups.set(candidate.canonicalJobId, current);
  }

  const primaryIds = new Set<string>();
  for (const group of groups.values()) {
    group.sort(compareCandidatesForPrimary);
    const primary = group[0];
    if (primary) {
      primaryIds.add(primary.id);
    }
  }

  return analyzed.map((candidate) => {
    const group = groups.get(candidate.canonicalJobId) ?? [candidate];
    return {
      id: candidate.id,
      canonicalJobId: candidate.canonicalJobId,
      title: candidate.title,
      companyName: candidate.companyName,
      sourceName: candidate.sourceName,
      sourceKind: candidate.sourceKind,
      validationStatus: candidate.validationStatus,
      publishable: candidate.publishable,
      needsAdminReview: candidate.needsAdminReview,
      resolvedApplyUrl: candidate.resolvedApplyUrl,
      canonicalApplyUrl: candidate.canonicalApplyUrl,
      rejectionReason: candidate.rejectionReason,
      rejectionCategory: candidate.rejectionCategory,
      isDuplicate: !primaryIds.has(candidate.id),
      duplicateGroupSize: group.length
    };
  });
}

export async function schedulePipelineProcessing(runId?: string) {
  ensurePipelineSchema();

  if (!workerPromise) {
    workerPromise = (async () => {
      let nextRunId: string | undefined = runId;

      do {
        workerRerunRequested = false;
        await processPendingCandidatesInternal(nextRunId);
        nextRunId = undefined;
      } while (workerRerunRequested);
    })()
      .catch((error) => {
        logPipelineEvent("worker_failed", {
          runId: runId ?? null,
          error: error instanceof Error ? error.message : "pipeline_worker_failed"
        });
      })
      .finally(() => {
        workerPromise = null;
      });
  } else {
    workerRerunRequested = true;
  }

  return workerPromise;
}

export async function waitForPipelineProcessing() {
  if (workerPromise) {
    await workerPromise;
  }
}

export function queueDueRevalidations(runId?: string) {
  ensurePipelineSchema();
  const db = getPlatformDatabase();
  const threshold = new Date(Date.now() - REVALIDATION_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();

  db.prepare(
    `UPDATE job_candidates
     SET run_id = COALESCE(?, run_id),
         processing_status = 'pending',
         updated_at = ?
     WHERE publishable = 1
       AND (apply_link_checked_at IS NULL OR apply_link_checked_at < ?)
       AND processing_status = 'processed'`
  ).run(runId ?? null, nowIsoTimestamp(), threshold);
}

export function requeueRecoverableFailedCandidates(runId?: string) {
  ensurePipelineSchema();
  const db = getPlatformDatabase();

  const result = db.prepare(
    `UPDATE job_candidates
     SET run_id = COALESCE(?, run_id),
         processing_status = 'pending',
         last_error = NULL,
         updated_at = ?
     WHERE processing_status = 'failed'
       AND (
         last_error LIKE 'UNIQUE constraint failed:%'
         OR last_error LIKE 'database is locked%'
         OR last_error LIKE 'SQLITE_BUSY%'
       )`
  ).run(runId ?? null, nowIsoTimestamp()) as { changes?: number };

  return Number(result.changes ?? 0);
}
