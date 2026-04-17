/**
 * Deterministic Job Extraction Layer
 *
 * This module is PURELY extractive. It:
 *  - discovers job records from source pages
 *  - collects raw job fields
 *  - collects candidate URLs
 *
 * It does NOT:
 *  - classify jobs (seniority, internship fit, trust, etc.)
 *  - guess or infer missing fields
 *  - invent or fabricate URLs
 *  - create final_verified_url
 *  - use homepage/listing/search URLs as job links
 *
 * If a field cannot be determined from the source, it is returned as null.
 */

import { sanitizeJobUrl, isGenericListingUrl, isPlaceholderUrl, sanitizeJobUrlList } from "@/lib/url-sanitizer";

/* ─── Output Schema ─── */

export type ScrapeStatus = "ok" | "partial" | "error";

export type ExtractedJobRecord = {
  /** Job title, as found on the page */
  title: string;
  /** Company name, as found on the page or from source config override */
  company_name: string;
  /** Location string, raw as extracted — no normalization */
  location: string | null;
  /** First N chars of description, raw HTML stripped — no summarization */
  description_snippet: string | null;
  /** The page where this record was discovered (the listing/search page) */
  source_reference_url: string;
  /** The specific job detail page URL, if a distinct one exists. null if not found. */
  scraped_detail_url: string | null;
  /** An explicit apply/submit URL, only if found in structured data or DOM. null otherwise. */
  scraped_apply_url: string | null;
  /** All candidate URLs discovered for this record, kept separate and unranked */
  candidate_urls: string[];
  /** Which source platform provided this record */
  source_platform: string;
  /** Extraction status: ok = all key fields found, partial = some missing, error = extraction failed */
  scrape_status: ScrapeStatus;
  /** Error description if status is not "ok", null otherwise */
  scrape_error: string | null;
  /** A confidently validated job detail/apply URL, if one was confirmed. */
  final_verified_url?: string | null;
  /** Validation verdict for the candidate URLs attached to this record. */
  validation_status?: "verified" | "unresolved" | "rejected";
  /** Reason for the URL validation verdict. */
  validation_reason?: string | null;
  /** True when the candidate URLs need human review instead of auto-acceptance. */
  needs_admin_review?: boolean;
  /** Raw payload for debugging — adapter name, discovery method, trust tier, raw URLs before sanitization */
  _debug: Record<string, unknown>;
};

export type ExtractionRunResult = {
  source_id: string;
  source_name: string;
  source_url: string;
  adapter: string;
  extracted_at: string;
  records: ExtractedJobRecord[];
  error: string | null;
};

/* ─── HTML Utilities ─── */

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string | null | undefined) {
  return stripHtml(value ?? "");
}

function snippetize(text: string | null | undefined, maxLen = 300): string | null {
  const clean = cleanText(text);
  if (!clean) return null;
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

/* ─── JSON-LD Helpers ─── */

function flattenJsonLd(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenJsonLd(item));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const graph = record["@graph"];

  if (Array.isArray(graph)) {
    return graph.flatMap((item) => flattenJsonLd(item));
  }

  return [record];
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    const block = match[1]?.trim();
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

function absoluteUrl(candidate: string, baseUrl: string): string | null {
  if (!candidate || !candidate.trim()) return null;
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

/* ─── URL Classification (without invention) ─── */

/**
 * Given a raw URL, decides if it is usable as a job detail URL.
 * Returns the sanitized URL or null.
 * NEVER invents or modifies the URL — only validates what was found.
 */
function extractDetailUrl(raw: string | null | undefined, baseUrl: string): string | null {
  if (!raw) return null;

  const absolute = absoluteUrl(raw, baseUrl);
  if (!absolute) return null;

  // Reject generic listing/search/homepage URLs
  const sanitized = sanitizeJobUrl(absolute, { allowGenericListing: false });
  return sanitized;
}

/**
 * Given a raw URL found in an explicit apply context, decides if it is usable.
 * Returns the sanitized URL or null.
 */
function extractApplyUrl(raw: string | null | undefined, baseUrl: string): string | null {
  if (!raw) return null;

  const absolute = absoluteUrl(raw, baseUrl);
  if (!absolute) return null;

  // Apply URLs can be listing pages on ATS platforms, so allow generic with care
  const sanitized = sanitizeJobUrl(absolute, { allowGenericListing: false });
  return sanitized;
}

/**
 * Collect all candidate URLs from various fields without ranking them.
 * Returns deduplicated list of sanitized, absolute URLs.
 */
function collectCandidateUrls(
  rawUrls: (string | null | undefined)[],
  baseUrl: string
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawUrls) {
    if (!raw) continue;
    const absolute = absoluteUrl(raw, baseUrl);
    if (!absolute) continue;
    if (isPlaceholderUrl(absolute)) continue;

    const sanitized = sanitizeJobUrl(absolute, { allowGenericListing: true, stripTracking: false });
    if (!sanitized) continue;
    if (seen.has(sanitized)) continue;

    seen.add(sanitized);
    result.push(sanitized);
  }

  return result;
}

/* ─── Extractors ─── */

/**
 * Extract job records from JSON-LD structured data.
 * This is the most reliable extraction method: the data is machine-readable.
 */
export function extractFromJsonLd(
  html: string,
  sourceUrl: string,
  sourcePlatform: string,
  companyOverride?: string | null
): ExtractedJobRecord[] {
  const records: ExtractedJobRecord[] = [];

  for (const block of extractJsonLdBlocks(html)) {
    let payload: unknown;
    try {
      payload = JSON.parse(block);
    } catch {
      continue;
    }

    for (const node of flattenJsonLd(payload)) {
      const rawType = String(node["@type"] ?? "").toLowerCase();
      if (rawType !== "jobposting") continue;

      const hiringOrg =
        node.hiringOrganization && typeof node.hiringOrganization === "object"
          ? (node.hiringOrganization as Record<string, unknown>)
          : null;

      const title = cleanText(String(node.title ?? ""));
      const companyName = cleanText(String(hiringOrg?.name ?? companyOverride ?? ""));
      const rawJobUrl = String(node.url ?? "");

      if (!title) continue;
      if (!companyName) continue;

      // Location — extract from structured fields, do not interpret
      const jobLocation =
        node.jobLocation && typeof node.jobLocation === "object"
          ? (node.jobLocation as Record<string, unknown>)
          : null;
      const jobAddress =
        jobLocation?.address && typeof jobLocation.address === "object"
          ? (jobLocation.address as Record<string, unknown>)
          : null;
      const location = cleanText(
        [jobAddress?.addressLocality, jobAddress?.addressRegion, jobAddress?.addressCountry]
          .filter(Boolean)
          .join(", ")
      ) || null;

      // Description — snippet only, no summarization
      const descriptionSnippet = snippetize(String(node.description ?? ""));

      // URLs — extract only what is explicitly in the structured data
      const rawDetailUrl = absoluteUrl(rawJobUrl, sourceUrl);
      const scrapedDetailUrl = extractDetailUrl(rawJobUrl, sourceUrl);

      // Apply URL — ONLY from explicit fields, never from the job URL
      const directApplyRaw = node.directApply ? String(node.directApply) : null;
      const applicationContactUrl =
        node.applicationContact && typeof node.applicationContact === "object"
          ? String((node.applicationContact as Record<string, unknown>).url ?? "")
          : null;
      const scrapedApplyUrl = extractApplyUrl(
        directApplyRaw ?? applicationContactUrl,
        sourceUrl
      );

      // Candidate URLs — everything we found, unranked
      const candidateUrls = collectCandidateUrls(
        [rawDetailUrl, directApplyRaw ? absoluteUrl(directApplyRaw, sourceUrl) : null, applicationContactUrl ? absoluteUrl(applicationContactUrl, sourceUrl) : null],
        sourceUrl
      );

      // Determine scrape_status
      const hasDetail = scrapedDetailUrl !== null;
      const hasApply = scrapedApplyUrl !== null;
      const scrapeStatus: ScrapeStatus = hasDetail || hasApply ? "ok" : candidateUrls.length > 0 ? "partial" : "error";
      const scrapeError =
        scrapeStatus === "error"
          ? "no_specific_job_url_found_in_jsonld"
          : scrapeStatus === "partial"
            ? "detail_or_apply_url_missing"
            : null;

      const sourceReferenceUrl = sanitizeJobUrl(sourceUrl, { allowGenericListing: true }) ?? sourceUrl;

      records.push({
        title,
        company_name: companyName,
        location,
        description_snippet: descriptionSnippet,
        source_reference_url: sourceReferenceUrl,
        scraped_detail_url: scrapedDetailUrl,
        scraped_apply_url: scrapedApplyUrl,
        candidate_urls: candidateUrls,
        source_platform: sourcePlatform,
        scrape_status: scrapeStatus,
        scrape_error: scrapeError,
        _debug: {
          extraction_method: "jsonld",
          raw_job_url: rawDetailUrl,
          raw_direct_apply: directApplyRaw,
          raw_application_contact: applicationContactUrl,
          has_hiring_org: hiringOrg !== null,
          has_description: Boolean(node.description),
          date_posted: cleanText(String(node.datePosted ?? "")) || null,
          employment_type: cleanText(String(node.employmentType ?? "")) || null
        }
      });
    }
  }

  return records;
}

/**
 * Extract job records from anchor elements on the page.
 * This is a fallback when no JSON-LD is available.
 * Only collects links that look like job postings (heuristic keyword match).
 */
export function extractFromAnchors(
  html: string,
  sourceUrl: string,
  sourcePlatform: string,
  companyOverride?: string | null
): ExtractedJobRecord[] {
  const JOB_LINK_HINTS = [
    "job",
    "jobs",
    "vacancy",
    "vacancies",
    "vakansiya",
    "vakansiyalar",
    "career",
    "karyera",
    "tecrube",
    "təcrübə",
    "opening",
    "openings",
    "position",
    "positions",
    "opportunity"
  ];
  const NON_JOB_HINTS = [
    "faq",
    "about us",
    "about",
    "contact",
    "privacy",
    "terms",
    "policy",
    "blog",
    "news",
    "press",
    "login",
    "sign in",
    "sign up",
    "register",
    "cabinet"
  ];

  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const records: ExtractedJobRecord[] = [];

  const sourceReferenceUrl = sanitizeJobUrl(sourceUrl, { allowGenericListing: true }) ?? sourceUrl;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]?.trim();
    const text = cleanText(match[2]);

    if (!href || !text) continue;

    const absolute = absoluteUrl(href, sourceUrl);
    if (!absolute) continue;

    // Heuristic: only collect links that look like job postings
    const combined = `${absolute} ${text}`.toLowerCase();
    const looksLikeJob = JOB_LINK_HINTS.some((h) => combined.includes(h));
    const looksLikeNoise = NON_JOB_HINTS.some((h) => combined.includes(h));
    if (!looksLikeJob || looksLikeNoise) continue;

    // Sanitize — reject placeholders and generic listings
    const sanitized = sanitizeJobUrl(absolute, { allowGenericListing: false });
    if (!sanitized) continue;
    if (seen.has(sanitized)) continue;
    seen.add(sanitized);

    // With anchor discovery we have very limited information:
    // title = anchor text, company = override or unknown, no description, no apply URL
    records.push({
      title: text,
      company_name: companyOverride ?? "",
      location: null,
      description_snippet: null,
      source_reference_url: sourceReferenceUrl,
      scraped_detail_url: isGenericListingUrl(sanitized) ? null : sanitized,
      scraped_apply_url: null, // anchors are NOT apply URLs
      candidate_urls: [sanitized],
      source_platform: sourcePlatform,
      scrape_status: "partial",
      scrape_error: "anchor_discovery_limited_data",
      _debug: {
        extraction_method: "anchor_discovery",
        raw_href: href,
        anchor_text: text
      }
    });
  }

  return records;
}

/**
 * Extract job records from Python scraper output.
 * The Python scraper provides structured JSON records, but we still
 * validate and sanitize all URLs deterministically.
 */
export function extractFromScraperOutput(
  records: Array<Record<string, unknown>>,
  sourceUrl: string,
  sourcePlatform: string
): ExtractedJobRecord[] {
  const sourceReferenceUrl = sanitizeJobUrl(sourceUrl, { allowGenericListing: true }) ?? sourceUrl;
  const results: ExtractedJobRecord[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const title = cleanText(String(record.job_title ?? ""));
    const companyName = cleanText(String(record.company_name ?? ""));
    const rawCardUrl = String(record.source_listing_url ?? record.job_url ?? "").trim();
    const rawDetailUrl = String(record.job_detail_url ?? "").trim();
    const rawApplyUrl = String(record.apply_action_url ?? "").trim();
    const rawCandidates = Array.isArray(record.candidate_apply_urls)
      ? (record.candidate_apply_urls as string[])
      : [];
    const location = cleanText(String(record.location ?? "")) || null;
    const descriptionSnippet = snippetize(String(record.job_description ?? record.description ?? ""));
    const dateRaw = cleanText(String(record.publication_or_deadline_date ?? "")) || null;

    if (!title || !companyName) continue;

    // De-duplicate by card URL
    const cardAbsolute = absoluteUrl(rawCardUrl, sourceUrl);
    if (cardAbsolute && seen.has(cardAbsolute)) continue;
    if (cardAbsolute) seen.add(cardAbsolute);

    // Extract detail URL — prefer explicit job_detail_url, fallback to card URL
    const scrapedDetailUrl = extractDetailUrl(rawDetailUrl || rawCardUrl, sourceUrl);

    // Apply URL — only from explicit apply button extraction, never from card URL
    const scrapedApplyUrl = extractApplyUrl(rawApplyUrl, sourceUrl);

    // Candidate URLs — all raw URLs collected, sanitized
    const allRawUrls = [rawCardUrl, rawDetailUrl, rawApplyUrl, ...rawCandidates].filter(Boolean);
    const candidateUrls = collectCandidateUrls(allRawUrls, sourceUrl);

    const hasDetail = scrapedDetailUrl !== null;
    const hasApply = scrapedApplyUrl !== null;
    const scrapeStatus: ScrapeStatus = hasDetail ? "ok" : candidateUrls.length > 0 ? "partial" : "error";
    const scrapeError =
      scrapeStatus === "error"
        ? "no_valid_url_from_scraper"
        : !hasDetail && !hasApply
          ? "detail_url_missing_or_generic"
          : null;

    results.push({
      title,
      company_name: companyName,
      location,
      description_snippet: descriptionSnippet,
      source_reference_url: sourceReferenceUrl,
      scraped_detail_url: scrapedDetailUrl,
      scraped_apply_url: scrapedApplyUrl,
      candidate_urls: candidateUrls,
      source_platform: sourcePlatform,
      scrape_status: scrapeStatus,
      scrape_error: scrapeError,
      _debug: {
        extraction_method: "python_scraper",
        raw_card_url: rawCardUrl,
        raw_detail_url: rawDetailUrl,
        raw_apply_url: rawApplyUrl,
        raw_candidate_count: rawCandidates.length,
        date_raw: dateRaw
      }
    });
  }

  return results;
}

/* ─── Bridge: ExtractedJobRecord → RawIngestedJob ─── */

import type { RawIngestedJob, SourceKind } from "@/lib/job-intelligence";
import { extractDomain } from "@/lib/job-intelligence";

/**
 * Convert an ExtractedJobRecord into a RawIngestedJob for the existing pipeline.
 * This is a one-way bridge — no classification, no inference, just field mapping.
 */
export function toRawIngestedJob(
  record: ExtractedJobRecord,
  sourceKind: SourceKind,
  extra?: {
    postedAt?: string | null;
    employmentType?: string | null;
    companySiteHint?: string | null;
    trustTier?: string;
    adapter?: string;
    sourceId?: string;
  }
): RawIngestedJob {
  const validation =
    record._debug.url_validation && typeof record._debug.url_validation === "object"
      ? (record._debug.url_validation as {
          finalVerifiedUrl?: string | null;
          checks?: Array<{
            sourceField?: string;
            status?: string;
            finalUrl?: string | null;
          }>;
        })
      : null;
  const hasValidatedUrls = Boolean(validation);
  const verifiedDetailUrl =
    validation?.checks?.find(
      (check) => check?.sourceField === "scraped_detail_url" && check?.status === "verified"
    )?.finalUrl ?? null;
  const verifiedApplyUrl =
    validation?.checks?.find(
      (check) => check?.sourceField === "scraped_apply_url" && check?.status === "verified"
    )?.finalUrl ?? null;
  const verifiedCandidateUrls = Array.from(
    new Set([verifiedApplyUrl, verifiedDetailUrl].filter((value): value is string => Boolean(value)))
  );
  const scrapeConfidence =
    record.scrape_status === "ok" ? 0.65
      : record.scrape_status === "partial" ? 0.35
        : 0.1;

  return {
    sourceName: record.source_platform,
    sourceKind,
    sourceListingUrl: record.source_reference_url,
    jobDetailUrl: hasValidatedUrls ? verifiedDetailUrl : record.scraped_detail_url ?? null,
    applyActionUrl: hasValidatedUrls ? verifiedApplyUrl : record.scraped_apply_url ?? null,
    candidateApplyUrls:
      verifiedCandidateUrls.length > 0
        ? verifiedCandidateUrls
        : !hasValidatedUrls && record.candidate_urls.length > 0
          ? record.candidate_urls
          : null,
    externalApplyUrl: null, // never set here — must come from explicit structured data only
    companyName: record.company_name,
    title: record.title,
    locationRaw: record.location,
    postedAt: extra?.postedAt ?? (record._debug.date_posted as string | null) ?? null,
    employmentType: extra?.employmentType ?? (record._debug.employment_type as string | null) ?? null,
    descriptionRaw: record.description_snippet,
    companySiteHint: extra?.companySiteHint ?? extractDomain(record.scraped_detail_url ?? record.source_reference_url) ?? null,
    scrapeConfidence,
    scrapeError: record.scrape_error,
    payload: {
      adapter: extra?.adapter ?? "job-extractor",
      trustTier: extra?.trustTier ?? "unknown",
      sourceId: extra?.sourceId,
      extraction_method: record._debug.extraction_method,
      scrape_status: record.scrape_status,
      candidate_url_count: record.candidate_urls.length,
      final_verified_url: record.final_verified_url ?? validation?.finalVerifiedUrl ?? null,
      validation_status: record.validation_status ?? null,
      validation_reason: record.validation_reason ?? null,
      needs_admin_review: record.needs_admin_review ?? null,
      ...record._debug
    }
  };
}
