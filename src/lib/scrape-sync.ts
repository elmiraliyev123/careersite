import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { buildRawJobIdentity, normalizeCompanyName, nowIsoTimestamp, type RawIngestedJob } from "@/lib/job-intelligence";
import { validateExtractedJobRecords } from "@/lib/candidate-job-url-validator";
import {
  createIngestionRun,
  enqueueRawJobs,
  getIngestionRun,
  previewRawJobs,
  queueDueRevalidations,
  requeueRecoverableFailedCandidates,
  revalidatePublishedJobApplyUrls,
  schedulePipelineProcessing,
  type ScrapePipelineResult
} from "@/lib/job-pipeline";
import { listCompanies, getPlatformDatabase } from "@/lib/platform-database";
import { getEnabledScrapeSources, getScrapeSourceInventory, type ScrapeSource } from "@/lib/scrape-config";
import {
  getSourceComplianceIndex,
  isComplianceStatusAllowed,
  reviewSourceComplianceBatch,
  type SourceComplianceReview
} from "@/lib/source-compliance";
import { runSourceAdapter } from "@/lib/source-adapters";
import {
  extractFromScraperOutput,
  toRawIngestedJob,
  type ExtractionRunResult
} from "@/lib/job-extractor";

const execFileAsync = promisify(execFile);
const azMonthMap = new Map([
  ["yanvar", 0],
  ["fevral", 1],
  ["mart", 2],
  ["aprel", 3],
  ["may", 4],
  ["iyun", 5],
  ["iyul", 6],
  ["avqust", 7],
  ["sentyabr", 8],
  ["oktyabr", 9],
  ["noyabr", 10],
  ["dekabr", 11]
]);

type ScrapeRunResult = {
  source: ScrapeSource;
  jobs: RawIngestedJob[];
  extraction: ExtractionRunResult;
};

type SyncScrapedJobsOptions = {
  dryRun?: boolean;
  sourceIds?: string[];
  revalidateBeforeIngest?: boolean;
};

export type ScrapeSyncResult = ScrapePipelineResult & {
  sources: Array<{
    id: string;
    name: string;
    url: string;
    sourceDomain: string;
    sourceType: string;
    countryOrMarket?: string;
    policy?: string;
    discoveryMethod?: string;
    extractionMethod?: string;
    kind: string;
    adapter: string;
    trustTier: string;
    hasDetailPages: string;
    hasApplyUrls: string;
    supportsJobDetailPages: string;
    supportsApplyLinks: string;
    reliableEnough: boolean;
    extractionReady: boolean;
    reliabilityScore?: number;
    freshnessScore?: number;
    parserStatus?: string;
    lastCheckedAt?: string | null;
    termsUrl?: string | null;
    privacyUrl?: string | null;
    robotsUrl?: string | null;
    legalReviewStatus?: string | null;
    legalReviewNotes?: string | null;
    allowedIngestionMethod?: string | null;
    lastLegalCheckedAt?: string | null;
    restrictedReason?: string;
    scrapedCount: number;
    error?: string | null;
  }>;
};

export type DailySourceCycleResult = {
  reviewedSourceCount: number;
  activeSourceCount: number;
  skippedSourceCount: number;
  skippedSources: Array<{
    id: string;
    name: string;
    reason: string;
    legalReviewStatus: string | null;
    allowedIngestionMethod: string | null;
    lastCheckedAt: string;
  }>;
  ingestion: ScrapeSyncResult;
  revalidation: Awaited<ReturnType<typeof revalidatePublishedJobApplyUrls>>;
};

type SourceHealthRow = {
  source_id: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_scraped_count: number | null;
  parser_status: string | null;
  last_error: string | null;
};

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function resolvePythonBinary() {
  const candidates = [
    path.join(process.cwd(), ".venv", "bin", "python"),
    "python3",
    "python"
  ];

  const preferred = candidates.find((candidate) => candidate.includes(path.sep) && existsSync(candidate));
  return preferred ?? "python3";
}

function subtractDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function parseRelativeDate(value: string) {
  const folded = value.toLowerCase();
  const match = folded.match(/(\d+)\s+(hour|hours|day|days|week|weeks|month|months)\s+ago/);

  if (!match) {
    if (folded.includes("bu gün") || folded.includes("bugün") || folded === "today") {
      return subtractDays(0);
    }
    if (folded.includes("dünən")) {
      return subtractDays(1);
    }
    if (folded.includes("yesterday")) {
      return subtractDays(1);
    }
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit.startsWith("hour")) {
    return subtractDays(0);
  }

  if (unit.startsWith("day")) {
    return subtractDays(amount);
  }

  if (unit.startsWith("week")) {
    return subtractDays(amount * 7);
  }

  return subtractDays(amount * 30);
}

function parseAbsoluteAzDate(value: string) {
  const match = value.toLowerCase().match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = azMonthMap.get(match[2]);
  const year = Number(match[3]);

  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) {
    return null;
  }

  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function parseNumericDate(value: string) {
  const match = value.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    month < 0 ||
    month > 11
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function normalizePostedAt(rawValue: string | null | undefined) {
  const value = normalizeText(rawValue);

  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const relative = parseRelativeDate(value);
  if (relative) {
    return relative;
  }

  const absolute = parseAbsoluteAzDate(value);
  if (absolute) {
    return absolute;
  }

  const numeric = parseNumericDate(value);
  if (numeric) {
    return numeric;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

function findMatchingCompanyName(companyName: string) {
  const normalized = normalizeCompanyName(companyName);

  if (!normalized) {
    return null;
  }

  const companies = listCompanies().map((company) => ({
    name: company.name,
    normalized: normalizeCompanyName(company.name)
  }));

  const exact = companies.find((company) => company.normalized === normalized);
  if (exact) {
    return exact.name;
  }

  return (
    companies
      .filter(
        (company) =>
          normalized.includes(company.normalized) || company.normalized.includes(normalized)
      )
      .sort((left, right) => right.normalized.length - left.normalized.length)[0]?.name ?? null
  );
}

function summarizeDiscovery(rawJobs: RawIngestedJob[]) {
  const unmatchedRegistry = new Map<string, { name: string; sources: Set<string>; sampleTitles: Set<string> }>();
  let matchedCount = 0;

  for (const job of rawJobs) {
    if (findMatchingCompanyName(job.companyName)) {
      matchedCount += 1;
      continue;
    }

    const key = normalizeCompanyName(job.companyName) || job.companyName;
    const current = unmatchedRegistry.get(key) ?? {
      name: job.companyName,
      sources: new Set<string>(),
      sampleTitles: new Set<string>()
    };
    current.sources.add(job.sourceName);
    current.sampleTitles.add(job.title);
    unmatchedRegistry.set(key, current);
  }

  return {
    matchedCount,
    unmatchedCompanies: Array.from(unmatchedRegistry.values()).map((item) => ({
      name: item.name,
      sources: Array.from(item.sources),
      sampleTitles: Array.from(item.sampleTitles).slice(0, 3)
    }))
  };
}

function ensureSourceHealthSchema() {
  const db = getPlatformDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_health (
      source_id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      source_domain TEXT NOT NULL,
      source_type TEXT NOT NULL,
      country_or_market TEXT,
      extraction_method TEXT,
      reliability_score REAL,
      freshness_score REAL,
      supports_job_detail_pages TEXT,
      supports_apply_links TEXT,
      last_checked_at TEXT,
      last_success_at TEXT,
      last_scraped_count INTEGER NOT NULL DEFAULT 0,
      parser_status TEXT,
      last_error TEXT,
      updated_at TEXT NOT NULL
    )
  `);
}

function resolveRuntimeParserStatus(source: ScrapeSource, error: string | null) {
  if (error) {
    if (
      /restricted|403|404|dns|unreachable|forbidden|access[_ ]denied|not_ingestable/i.test(error)
    ) {
      return "blocked";
    }

    return "degraded";
  }

  return source.parserStatus ?? "ready";
}

function recordSourceHealth(source: ScrapeSource, input: { scrapedCount: number; error: string | null }) {
  ensureSourceHealthSchema();
  const db = getPlatformDatabase();
  const checkedAt = nowIsoTimestamp();
  const parserStatus = resolveRuntimeParserStatus(source, input.error);

  db.prepare(
    `INSERT INTO source_health (
      source_id, source_name, source_domain, source_type, country_or_market, extraction_method,
      reliability_score, freshness_score, supports_job_detail_pages, supports_apply_links,
      last_checked_at, last_success_at, last_scraped_count, parser_status, last_error, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_id) DO UPDATE SET
      source_name = excluded.source_name,
      source_domain = excluded.source_domain,
      source_type = excluded.source_type,
      country_or_market = excluded.country_or_market,
      extraction_method = excluded.extraction_method,
      reliability_score = excluded.reliability_score,
      freshness_score = excluded.freshness_score,
      supports_job_detail_pages = excluded.supports_job_detail_pages,
      supports_apply_links = excluded.supports_apply_links,
      last_checked_at = excluded.last_checked_at,
      last_success_at = COALESCE(excluded.last_success_at, source_health.last_success_at),
      last_scraped_count = excluded.last_scraped_count,
      parser_status = excluded.parser_status,
      last_error = excluded.last_error,
      updated_at = excluded.updated_at`
  ).run(
    source.id,
    source.name,
    source.sourceDomain,
    source.sourceType,
    source.countryOrMarket ?? null,
    source.discoveryMethod ?? source.adapter,
    source.reliabilityScore ?? null,
    source.freshnessScore ?? null,
    source.hasDetailPages,
    source.hasApplyUrls,
    checkedAt,
    input.error ? null : checkedAt,
    input.scrapedCount,
    parserStatus,
    input.error,
    checkedAt
  );
}

function getSourceHealthIndex() {
  ensureSourceHealthSchema();
  const db = getPlatformDatabase();
  const rows = db.prepare(
    `SELECT source_id, last_checked_at, last_success_at, last_scraped_count, parser_status, last_error
     FROM source_health`
  ).all() as SourceHealthRow[];

  return new Map(rows.map((row) => [row.source_id, row]));
}

export function getScrapeSourceInventoryWithHealth() {
  const healthIndex = getSourceHealthIndex();
  const complianceIndex = getSourceComplianceIndex();
  return getScrapeSourceInventory().map((source) => {
    const health = healthIndex.get(source.id);
    const compliance = complianceIndex.get(source.id);
    return {
      ...source,
      extractionMethod: source.discoveryMethod ?? source.adapter,
      supportsJobDetailPages: source.hasDetailPages,
      supportsApplyLinks: source.hasApplyUrls,
      lastCheckedAt: health?.last_checked_at ?? null,
      lastSuccessAt: health?.last_success_at ?? null,
      lastScrapedCount: typeof health?.last_scraped_count === "number" ? health.last_scraped_count : 0,
      lastError: health?.last_error ?? null,
      parserStatus: health?.parser_status ?? source.parserStatus ?? null,
      termsUrl: compliance?.termsUrl ?? source.termsUrl ?? null,
      privacyUrl: compliance?.privacyUrl ?? source.privacyUrl ?? null,
      robotsUrl: compliance?.robotsUrl ?? source.robotsUrl ?? null,
      legalReviewStatus: compliance?.legalReviewStatus ?? source.legalReviewStatus ?? null,
      legalReviewNotes: compliance?.legalReviewNotes ?? source.legalReviewNotes ?? null,
      allowedIngestionMethod: compliance?.allowedIngestionMethod ?? source.allowedIngestionMethod ?? null,
      lastLegalCheckedAt: compliance?.lastLegalCheckedAt ?? source.lastLegalCheckedAt ?? null
    };
  });
}

async function runPythonScraper(source: ScrapeSource): Promise<ScrapeRunResult> {
  const outputPath = path.join(
    process.cwd(),
    "data",
    `scrape-${source.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`
  );
  const pythonBinary = resolvePythonBinary();
  const scriptPath = path.join(process.cwd(), "scrape_youth_jobs.py");

  await execFileAsync(
    pythonBinary,
    [scriptPath, source.url, "--output", outputPath, "--timeout", "25", "--filter-mode", "all"],
    {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 8,
      timeout: 120_000,
      killSignal: "SIGKILL"
    }
  );

  const raw = await fs.readFile(outputPath, "utf8");
  const parsed = JSON.parse(raw);
  const scraperRecords = Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];

  // Step 1: Deterministic extraction from scraper output
  const extractedRecords = extractFromScraperOutput(scraperRecords, source.url, source.name);
  const validatedRecords = await validateExtractedJobRecords(extractedRecords);

  const extraction: ExtractionRunResult = {
    source_id: source.id,
    source_name: source.name,
    source_url: source.url,
    adapter: source.adapter,
    extracted_at: new Date().toISOString(),
    records: validatedRecords,
    error: null
  };

  // Step 2: Bridge to RawIngestedJob with date normalization
  const jobs: RawIngestedJob[] = validatedRecords.map((record) => {
    const dateRaw = record._debug.date_raw as string | null;
    return toRawIngestedJob(record, source.kind, {
      postedAt: normalizePostedAt(dateRaw),
      trustTier: source.trustTier,
      adapter: source.adapter,
      sourceId: source.id,
      companySiteHint: source.url
    });
  });

  return { source, jobs, extraction };
}

async function runSource(source: ScrapeSource) {
  if (source.adapter === "html-discovery" || source.adapter === "json-feed") {
    return runSourceAdapter(source, { validateUrls: false });
  }

  return runPythonScraper(source);
}

function selectScrapeSources(sourceIds?: string[]) {
  const enabledSources = getEnabledScrapeSources();

  if (!sourceIds || sourceIds.length === 0) {
    return enabledSources;
  }

  const requestedIds = new Set(sourceIds.map((value) => value.trim()).filter(Boolean));
  if (requestedIds.size === 0) {
    return enabledSources;
  }

  const inventory = getScrapeSourceInventory();
  const selected = inventory.filter((source) => requestedIds.has(source.id));
  const invalid = Array.from(requestedIds).filter((id) => !selected.some((source) => source.id === id));
  const disabled = selected.filter(
    (source) => source.enabled === false || !source.reliableEnough || !source.extractionReady
  );

  if (invalid.length > 0) {
    throw new Error(`unknown_source_ids:${invalid.join(",")}`);
  }

  if (disabled.length > 0) {
    throw new Error(`sources_not_ingestable:${disabled.map((source) => source.id).join(",")}`);
  }

  return enabledSources.filter((source) => requestedIds.has(source.id));
}

export async function syncScrapedJobs(options?: SyncScrapedJobsOptions): Promise<ScrapeSyncResult> {
  const dryRun = Boolean(options?.dryRun);
  const revalidateBeforeIngest = Boolean(options?.revalidateBeforeIngest);
  const requestedSources = selectScrapeSources(options?.sourceIds);
  ensureSourceHealthSchema();
  const rawJobs: RawIngestedJob[] = [];
  const sourceSummaries: ScrapeSyncResult["sources"] = [];
  const errors: string[] = [];
  const complianceReviews = await reviewSourceComplianceBatch(requestedSources);
  const complianceIndex = new Map<string, SourceComplianceReview>(
    complianceReviews.map((review) => [review.sourceId, review])
  );
  const runnableSources = requestedSources.filter((source) => {
    const review = complianceIndex.get(source.id);
    return review ? isComplianceStatusAllowed(review.legalReviewStatus) : false;
  });

  if (revalidateBeforeIngest) {
    try {
      await revalidatePublishedJobApplyUrls();
    } catch (error) {
      errors.push(
        `published-link-revalidation: ${error instanceof Error ? error.message : "revalidation_failed"}`
      );
    }
  }

  for (const source of requestedSources) {
    const compliance = complianceIndex.get(source.id);
    if (!compliance || !isComplianceStatusAllowed(compliance.legalReviewStatus)) {
      const message = compliance
        ? `compliance:${compliance.legalReviewStatus}`
        : "compliance:review_missing";
      errors.push(`${source.name}: ${message}`);
      recordSourceHealth(source, { scrapedCount: 0, error: message });
      sourceSummaries.push({
        id: source.id,
        name: source.name,
        url: source.url,
        sourceDomain: source.sourceDomain,
        sourceType: source.sourceType,
        countryOrMarket: source.countryOrMarket,
        policy: source.policy,
        discoveryMethod: source.discoveryMethod,
        extractionMethod: source.discoveryMethod ?? source.adapter,
        kind: source.kind,
        adapter: source.adapter,
        trustTier: source.trustTier,
        hasDetailPages: source.hasDetailPages,
        hasApplyUrls: source.hasApplyUrls,
        supportsJobDetailPages: source.hasDetailPages,
        supportsApplyLinks: source.hasApplyUrls,
        reliableEnough: source.reliableEnough,
        extractionReady: source.extractionReady,
        reliabilityScore: source.reliabilityScore,
        freshnessScore: source.freshnessScore,
        parserStatus: "blocked",
        lastCheckedAt: nowIsoTimestamp(),
        termsUrl: compliance?.termsUrl ?? null,
        privacyUrl: compliance?.privacyUrl ?? null,
        robotsUrl: compliance?.robotsUrl ?? null,
        legalReviewStatus: compliance?.legalReviewStatus ?? null,
        legalReviewNotes: compliance?.legalReviewNotes ?? "Source skipped because legal review is missing or restrictive.",
        allowedIngestionMethod: compliance?.allowedIngestionMethod ?? null,
        lastLegalCheckedAt: compliance?.lastLegalCheckedAt ?? null,
        restrictedReason: source.restrictedReason,
        scrapedCount: 0,
        error: message
      });
      continue;
    }

    try {
      const result = await runSource(source);
      rawJobs.push(...result.jobs);
      recordSourceHealth(source, { scrapedCount: result.jobs.length, error: null });
      sourceSummaries.push({
        id: source.id,
        name: source.name,
        url: source.url,
        sourceDomain: source.sourceDomain,
        sourceType: source.sourceType,
        countryOrMarket: source.countryOrMarket,
        policy: source.policy,
        discoveryMethod: source.discoveryMethod,
        extractionMethod: source.discoveryMethod ?? source.adapter,
        kind: source.kind,
        adapter: source.adapter,
        trustTier: source.trustTier,
        hasDetailPages: source.hasDetailPages,
        hasApplyUrls: source.hasApplyUrls,
        supportsJobDetailPages: source.hasDetailPages,
        supportsApplyLinks: source.hasApplyUrls,
        reliableEnough: source.reliableEnough,
        extractionReady: source.extractionReady,
        reliabilityScore: source.reliabilityScore,
        freshnessScore: source.freshnessScore,
        parserStatus: source.parserStatus,
        lastCheckedAt: nowIsoTimestamp(),
        termsUrl: compliance.termsUrl,
        privacyUrl: compliance.privacyUrl,
        robotsUrl: compliance.robotsUrl,
        legalReviewStatus: compliance.legalReviewStatus,
        legalReviewNotes: compliance.legalReviewNotes,
        allowedIngestionMethod: compliance.allowedIngestionMethod,
        lastLegalCheckedAt: compliance.lastLegalCheckedAt,
        restrictedReason: source.restrictedReason,
        scrapedCount: result.jobs.length,
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "source_failed";
      errors.push(`${source.name}: ${message}`);
      recordSourceHealth(source, { scrapedCount: 0, error: message });
      sourceSummaries.push({
        id: source.id,
        name: source.name,
        url: source.url,
        sourceDomain: source.sourceDomain,
        sourceType: source.sourceType,
        countryOrMarket: source.countryOrMarket,
        policy: source.policy,
        discoveryMethod: source.discoveryMethod,
        extractionMethod: source.discoveryMethod ?? source.adapter,
        kind: source.kind,
        adapter: source.adapter,
        trustTier: source.trustTier,
        hasDetailPages: source.hasDetailPages,
        hasApplyUrls: source.hasApplyUrls,
        supportsJobDetailPages: source.hasDetailPages,
        supportsApplyLinks: source.hasApplyUrls,
        reliableEnough: source.reliableEnough,
        extractionReady: source.extractionReady,
        reliabilityScore: source.reliabilityScore,
        freshnessScore: source.freshnessScore,
        parserStatus: resolveRuntimeParserStatus(source, message),
        lastCheckedAt: nowIsoTimestamp(),
        termsUrl: compliance.termsUrl,
        privacyUrl: compliance.privacyUrl,
        robotsUrl: compliance.robotsUrl,
        legalReviewStatus: compliance.legalReviewStatus,
        legalReviewNotes: compliance.legalReviewNotes,
        allowedIngestionMethod: compliance.allowedIngestionMethod,
        lastLegalCheckedAt: compliance.lastLegalCheckedAt,
        restrictedReason: source.restrictedReason,
        scrapedCount: 0,
        error: message
      });
    }
  }

  const dedupedRawJobs = Array.from(
    new Map(rawJobs.map((job) => [buildRawJobIdentity(job), job])).values()
  );
  const discovery = summarizeDiscovery(dedupedRawJobs);

  if (dryRun) {
    const preview = await previewRawJobs(dedupedRawJobs);
    return {
      ...preview,
      matchedCount: discovery.matchedCount,
      unmatchedCompanies: discovery.unmatchedCompanies,
      errors: [...preview.errors, ...errors],
      sources: sourceSummaries
    };
  }

  const run = createIngestionRun({
    dryRun: false,
    sourceCount: runnableSources.length,
    notes: {
      sourceIds: runnableSources.map((source) => source.id),
      totalDiscovered: dedupedRawJobs.length
    }
  });

  if (!run) {
    throw new Error("ingestion_run_not_created");
  }

  const db = getPlatformDatabase();
  const enqueueStatement = db.prepare(
    `SELECT COUNT(*) AS total
     FROM job_candidates
     WHERE id = ?`
  );
  const importedJobs = dedupedRawJobs.slice(0, 12).map((job) => {
    const existing = enqueueStatement.get(buildRawJobIdentity(job)) as { total?: number } | undefined;
    return {
      title: job.title,
      companyName: job.companyName,
      sourceName: job.sourceName,
      action: existing?.total ? ("updated" as const) : ("created" as const)
    };
  });

  enqueueRawJobs(run.id, dedupedRawJobs);
  // Keep maintenance work decoupled from the active discovery run.
  // Otherwise a fresh source refresh is polluted by unrelated historical
  // revalidations and failed retries, which delays or blocks publication of
  // newly discovered jobs from the requested sources.
  requeueRecoverableFailedCandidates();
  queueDueRevalidations();
  const worker = schedulePipelineProcessing(run.id);
  await Promise.race([worker, new Promise((resolve) => setTimeout(resolve, 400))]);
  const liveRun = getIngestionRun(run.id) ?? run;

  return {
    message:
      liveRun.status === "completed" || liveRun.status === "completed_with_errors"
        ? "Yeniləmə tamamlandı."
        : "Yeniləmə təhlükəsiz emal növbəsinə alındı.",
    dryRun: false,
    importedCount: liveRun.publishedCount,
    updatedCount: 0,
    matchedCount: discovery.matchedCount,
    totalScraped: dedupedRawJobs.length,
    importedJobs,
    unmatchedCompanies: discovery.unmatchedCompanies,
    errors,
    run: liveRun,
    sources: sourceSummaries
  };
}

export async function runDailySourceCycle(): Promise<DailySourceCycleResult> {
  const inventory = getScrapeSourceInventory();
  const complianceReviews = await reviewSourceComplianceBatch(inventory);
  const complianceIndex = new Map(complianceReviews.map((review) => [review.sourceId, review]));
  const checkedAt = nowIsoTimestamp();

  const activeSources = inventory.filter((source) => {
    const review = complianceIndex.get(source.id);
    return (
      source.enabled !== false &&
      source.reliableEnough &&
      source.extractionReady &&
      Boolean(review && isComplianceStatusAllowed(review.legalReviewStatus))
    );
  });

  const skippedSources = inventory
    .filter((source) => !activeSources.some((candidate) => candidate.id === source.id))
    .map((source) => {
      const review = complianceIndex.get(source.id);
      const reason =
        source.enabled === false
          ? source.disabledReason ?? "disabled"
          : !source.reliableEnough
            ? "reliability_insufficient"
            : !source.extractionReady
              ? "extractor_not_ready"
              : review
                ? `compliance:${review.legalReviewStatus}`
                : "compliance:review_missing";

      recordSourceHealth(source, { scrapedCount: 0, error: reason });

      return {
        id: source.id,
        name: source.name,
        reason,
        legalReviewStatus: review?.legalReviewStatus ?? null,
        allowedIngestionMethod: review?.allowedIngestionMethod ?? null,
        lastCheckedAt: checkedAt
      };
    });

  const ingestion = await syncScrapedJobs({
    sourceIds: activeSources.map((source) => source.id)
  });
  const revalidation = await revalidatePublishedJobApplyUrls({ force: true });

  return {
    reviewedSourceCount: inventory.length,
    activeSourceCount: activeSources.length,
    skippedSourceCount: skippedSources.length,
    skippedSources,
    ingestion,
    revalidation
  };
}
