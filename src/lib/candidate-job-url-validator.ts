import {
  extractDomain,
  isKnownAtsHost,
  normalizeComparableText,
  normalizeCompanyName
} from "@/lib/job-intelligence";
import { isGenericListingUrl, isPlaceholderUrl, sanitizeJobUrl } from "@/lib/url-sanitizer";
import type { ExtractedJobRecord } from "@/lib/job-extractor";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const GENERIC_PATHS = new Set([
  "/",
  "/jobs",
  "/job",
  "/careers",
  "/career",
  "/vacancies",
  "/vacancy",
  "/search",
  "/en",
  "/az",
  "/ru",
  "/en/jobs",
  "/en/careers",
  "/az/jobs",
  "/az/careers",
  "/ru/jobs",
  "/ru/careers"
]);
const GENERIC_SEGMENTS = new Set([
  "jobs",
  "job",
  "careers",
  "career",
  "vacancies",
  "vacancy",
  "search",
  "openings",
  "opening",
  "positions",
  "position",
  "roles",
  "role",
  "opportunities",
  "opportunity",
  "all",
  "en",
  "az",
  "ru"
]);
const TITLE_STOPWORDS = new Set([
  "with",
  "from",
  "this",
  "that",
  "role",
  "position",
  "remote",
  "hybrid",
  "onsite",
  "baku",
  "baki",
  "azerbaijan"
]);
const COMPANY_STOPWORDS = new Set([
  "company",
  "group",
  "holding",
  "holdings",
  "services",
  "solutions"
]);
const EXPIRED_PATTERNS = [
  /\b404\b/i,
  /\bnot found\b/i,
  /\bpage cannot be found\b/i,
  /\bjob (?:is )?no longer available\b/i,
  /\bposition (?:has been )?filled\b/i,
  /\bapplication(?:s)? closed\b/i,
  /\bjob expired\b/i,
  /\barchived\b/i,
  /\bsəhifə tapılmadı\b/i,
  /\bmüraciət müddəti bitib\b/i,
  /\bno longer accepting applications\b/i,
  /\bthis posting has expired\b/i,
  /\bvakansiya bağlanıb\b/i
];
const ACCESS_DENIED_PATTERNS = [
  /\baccess denied\b/i,
  /\bforbidden\b/i,
  /\bcaptcha\b/i,
  /\bplease verify you are (a )?human\b/i,
  /\bbot detection\b/i
];
const LOGIN_WALL_PATTERNS = [
  /\bsign in\b/i,
  /\blog in\b/i,
  /\bgiriş et\b/i,
  /\bjoin linkedin\b/i,
  /\bcontinue with google\b/i,
  /\bcontinue with linkedin\b/i,
  /\bauth required\b/i
];

export type CandidateUrlField = "scraped_detail_url" | "scraped_apply_url";
export type CandidateUrlValidationStatus = "verified" | "unresolved" | "rejected";

export type CandidateJobUrlCheck = {
  sourceField: CandidateUrlField;
  inputUrl: string;
  finalUrl: string | null;
  status: CandidateUrlValidationStatus;
  reason: string;
  httpStatus: number | null;
  redirectChain: string[];
  titleMatch: boolean;
  companyMatch: boolean;
  finalDomain: string | null;
};

export type CandidateJobUrlValidationResult = {
  finalVerifiedUrl: string | null;
  validationStatus: CandidateUrlValidationStatus;
  validationReason: string;
  needsAdminReview: boolean;
  final_verified_url: string | null;
  validation_status: CandidateUrlValidationStatus;
  validation_reason: string;
  needs_review: boolean;
  checks: CandidateJobUrlCheck[];
};

type CandidateJobUrlInput = {
  title?: string | null;
  companyName?: string | null;
  sourceReferenceUrl?: string | null;
  scrapedDetailUrl?: string | null;
  scrapedApplyUrl?: string | null;
};

type FetchResult = {
  response: Response;
  finalUrl: string;
  redirectChain: string[];
};

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagContent(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function tokenize(
  value: string | null | undefined,
  options: { minLength: number; maxCount: number; stopwords?: Set<string> }
) {
  return Array.from(
    new Set(
      normalizeComparableText(value)
        .split(" ")
        .filter((token) => token.length >= options.minLength)
        .filter((token) => !options.stopwords?.has(token))
        .slice(0, options.maxCount)
    )
  );
}

function buildTitleEvidence(title: string | null | undefined) {
  const normalizedTitle = normalizeComparableText(title);
  const titleTokens = tokenize(title, { minLength: 4, maxCount: 8, stopwords: TITLE_STOPWORDS });
  return { normalizedTitle, titleTokens };
}

function buildCompanyEvidence(companyName: string | null | undefined) {
  const normalizedCompany = normalizeCompanyName(companyName);
  const companyTokens = tokenize(normalizedCompany, { minLength: 3, maxCount: 4, stopwords: COMPANY_STOPWORDS });
  return { normalizedCompany, companyTokens };
}

function countMatchingTokens(text: string, tokens: string[]) {
  return tokens.filter((token) => text.includes(token)).length;
}

function isStrongTitleMatch(text: string, title: string | null | undefined) {
  const { normalizedTitle, titleTokens } = buildTitleEvidence(title);

  if (!normalizedTitle) {
    return false;
  }

  if (text.includes(normalizedTitle)) {
    return true;
  }

  if (titleTokens.length === 0) {
    return false;
  }

  const requiredMatches =
    titleTokens.length <= 2 ? titleTokens.length : Math.min(4, Math.max(2, Math.ceil(titleTokens.length * 0.6)));

  return countMatchingTokens(text, titleTokens) >= requiredMatches;
}

function isStrongCompanyMatch(text: string, companyName: string | null | undefined) {
  const { normalizedCompany, companyTokens } = buildCompanyEvidence(companyName);

  if (!normalizedCompany) {
    return false;
  }

  if (text.includes(normalizedCompany)) {
    return true;
  }

  if (companyTokens.length === 0) {
    return false;
  }

  const requiredMatches = companyTokens.length === 1 ? 1 : Math.min(2, companyTokens.length);
  return countMatchingTokens(text, companyTokens) >= requiredMatches;
}

function looksGenericLandingPage(url: URL) {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const hasSpecificQuery =
    url.searchParams.has("id") ||
    url.searchParams.has("jobId") ||
    url.searchParams.has("job_id") ||
    url.searchParams.has("vacancy_id") ||
    url.searchParams.has("vacancy") ||
    url.searchParams.has("gh_jid") ||
    url.searchParams.has("requisitionId");

  if (hasSpecificQuery) {
    return false;
  }

  if (GENERIC_PATHS.has(pathname.toLowerCase())) {
    return true;
  }

  const segments = pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean);
  const segmentTokens = segments.flatMap((segment) => segment.split(/[-_]+/)).filter(Boolean);

  return (
    segments.length > 0 &&
    segments.length <= 4 &&
    segmentTokens.length > 0 &&
    segmentTokens.every((token) => GENERIC_SEGMENTS.has(token))
  );
}

function looksJobSpecificPath(url: URL) {
  const normalizedPath = normalizeComparableText(`${url.pathname} ${url.search}`);
  const hasJobHint =
    normalizedPath.includes("job") ||
    normalizedPath.includes("career") ||
    normalizedPath.includes("vacancy") ||
    normalizedPath.includes("position") ||
    normalizedPath.includes("role");
  const hasIdHint =
    /\b\d{4,}\b/.test(url.pathname) ||
    /\b(jobid|gh_jid|lever|requisition|opening|vacancy_id)\b/i.test(url.search) ||
    /\/[a-z0-9-]{10,}$/.test(url.pathname);

  return hasJobHint || hasIdHint;
}

async function fetchWithRedirects(url: string, maxRedirects = 5): Promise<FetchResult> {
  const redirectChain = [url];
  let currentUrl = url;

  for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
    const response = await fetch(currentUrl, {
      headers: DEFAULT_HEADERS,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");

      if (!location) {
        return { response, finalUrl: currentUrl, redirectChain };
      }

      currentUrl = new URL(location, currentUrl).toString();
      redirectChain.push(currentUrl);
      continue;
    }

    return { response, finalUrl: currentUrl, redirectChain };
  }

  throw new Error("redirect_limit_exceeded");
}

function rejectedCheck(
  sourceField: CandidateUrlField,
  inputUrl: string,
  reason: string,
  override?: Partial<CandidateJobUrlCheck>
): CandidateJobUrlCheck {
  return {
    sourceField,
    inputUrl,
    finalUrl: override?.finalUrl ?? null,
    status: "rejected",
    reason,
    httpStatus: override?.httpStatus ?? null,
    redirectChain: override?.redirectChain ?? [],
    titleMatch: override?.titleMatch ?? false,
    companyMatch: override?.companyMatch ?? false,
    finalDomain: override?.finalDomain ?? null
  };
}

function unresolvedCheck(
  sourceField: CandidateUrlField,
  inputUrl: string,
  reason: string,
  override?: Partial<CandidateJobUrlCheck>
): CandidateJobUrlCheck {
  return {
    sourceField,
    inputUrl,
    finalUrl: override?.finalUrl ?? null,
    status: "unresolved",
    reason,
    httpStatus: override?.httpStatus ?? null,
    redirectChain: override?.redirectChain ?? [],
    titleMatch: override?.titleMatch ?? false,
    companyMatch: override?.companyMatch ?? false,
    finalDomain: override?.finalDomain ?? null
  };
}

function buildValidationResult(input: {
  finalVerifiedUrl: string | null;
  validationStatus: CandidateUrlValidationStatus;
  validationReason: string;
  needsReview: boolean;
  checks: CandidateJobUrlCheck[];
}): CandidateJobUrlValidationResult {
  return {
    finalVerifiedUrl: input.finalVerifiedUrl,
    validationStatus: input.validationStatus,
    validationReason: input.validationReason,
    needsAdminReview: input.needsReview,
    final_verified_url: input.finalVerifiedUrl,
    validation_status: input.validationStatus,
    validation_reason: input.validationReason,
    needs_review: input.needsReview,
    checks: input.checks
  };
}

async function validateSingleCandidateUrl(
  sourceField: CandidateUrlField,
  inputUrl: string,
  context: Pick<CandidateJobUrlInput, "title" | "companyName" | "sourceReferenceUrl">
): Promise<CandidateJobUrlCheck> {
  const trimmed = inputUrl.trim();

  if (isPlaceholderUrl(trimmed)) {
    return rejectedCheck(sourceField, trimmed, "placeholder_url");
  }

  const sanitized = sanitizeJobUrl(trimmed, {
    baseUrl: context.sourceReferenceUrl ?? undefined,
    allowGenericListing: false,
    stripTracking: false
  });

  if (!sanitized) {
    try {
      const resolved = new URL(trimmed, context.sourceReferenceUrl ?? undefined).toString();
      return isGenericListingUrl(resolved)
        ? rejectedCheck(sourceField, trimmed, "generic_listing_page")
        : rejectedCheck(sourceField, trimmed, "invalid_candidate_url");
    } catch {
      return rejectedCheck(sourceField, trimmed, "invalid_candidate_url");
    }
  }

  let fetchResult: FetchResult;

  try {
    fetchResult = await fetchWithRedirects(sanitized);
  } catch (error) {
    return unresolvedCheck(sourceField, sanitized, error instanceof Error ? error.message : "request_failed", {
      finalUrl: sanitized,
      redirectChain: [sanitized]
    });
  }

  const { response, finalUrl, redirectChain } = fetchResult;
  const finalDomain = extractDomain(finalUrl);

  if (response.status === 401) {
    return unresolvedCheck(sourceField, sanitized, "login_required", {
      finalUrl,
      httpStatus: 401,
      redirectChain,
      finalDomain
    });
  }

  if (response.status === 403 || response.status === 429) {
    return unresolvedCheck(sourceField, sanitized, response.status === 403 ? "access_denied" : "rate_limited", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      finalDomain
    });
  }

  if (response.status === 404 || response.status === 410) {
    return rejectedCheck(sourceField, sanitized, response.status === 404 ? "http_404" : "gone_410", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      finalDomain
    });
  }

  if (response.status < 200 || response.status >= 300) {
    const statusReason = `http_${response.status}`;
    const statusKind = response.status >= 500 ? "unresolved" : "rejected";
    return statusKind === "unresolved"
      ? unresolvedCheck(sourceField, sanitized, statusReason, {
          finalUrl,
          httpStatus: response.status,
          redirectChain,
          finalDomain
        })
      : rejectedCheck(sourceField, sanitized, statusReason, {
          finalUrl,
          httpStatus: response.status,
          redirectChain,
          finalDomain
        });
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    return rejectedCheck(sourceField, sanitized, "non_html_destination", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      finalDomain
    });
  }

  const html = await response.text();
  const plainText = stripHtml(html).slice(0, 64000);
  const pageTitle = extractTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitle = extractTagContent(
    html,
    /<meta[^>]+(?:property|name)=["'](?:og:title|twitter:title)["'][^>]+content=["']([^"]+)["'][^>]*>/i
  );
  const pageHeading = extractTagContent(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const comparableText = normalizeComparableText([pageTitle, ogTitle, pageHeading, plainText].join(" "));
  const authSignalText = normalizeComparableText([pageTitle, ogTitle, pageHeading, finalUrl].join(" "));
  const hasPasswordField = /<input[^>]+type=["']password["']/i.test(html);
  const titleMatch = isStrongTitleMatch(comparableText, context.title);
  const companyMatch = isStrongCompanyMatch(comparableText, context.companyName);
  const finalParsedUrl = new URL(finalUrl);
  const genericLanding = looksGenericLandingPage(finalParsedUrl) || isGenericListingUrl(finalUrl);
  const jobSpecificPath = looksJobSpecificPath(finalParsedUrl);
  const sourceDomain = extractDomain(context.sourceReferenceUrl);
  const sameOfficialDomain = Boolean(
    sourceDomain &&
    finalDomain &&
    (finalDomain === sourceDomain ||
      finalDomain.endsWith(`.${sourceDomain}`) ||
      sourceDomain.endsWith(`.${finalDomain}`))
  );
  const unrelatedDomainRedirect = Boolean(
    sourceDomain &&
    finalDomain &&
    finalDomain !== sourceDomain &&
    !finalDomain.endsWith(`.${sourceDomain}`) &&
    !sourceDomain.endsWith(`.${finalDomain}`) &&
    !isKnownAtsHost(finalDomain)
  );

  if (ACCESS_DENIED_PATTERNS.some((pattern) => pattern.test(plainText))) {
    return unresolvedCheck(sourceField, sanitized, "access_denied_or_captcha", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    });
  }

  if (
    LOGIN_WALL_PATTERNS.some((pattern) => pattern.test(authSignalText)) ||
    (hasPasswordField && LOGIN_WALL_PATTERNS.some((pattern) => pattern.test(plainText.slice(0, 8000))))
  ) {
    return unresolvedCheck(sourceField, sanitized, "login_wall", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    });
  }

  if (EXPIRED_PATTERNS.some((pattern) => pattern.test(plainText) || pattern.test(finalUrl))) {
    return rejectedCheck(sourceField, sanitized, "expired_or_missing", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    });
  }

  if (titleMatch && companyMatch && !genericLanding) {
    return {
      sourceField,
      inputUrl: sanitized,
      finalUrl,
      status: "verified",
      reason: sourceField === "scraped_apply_url" ? "verified_apply_page" : "verified_detail_page",
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    };
  }

  if (titleMatch && sameOfficialDomain && !genericLanding && (jobSpecificPath || sourceField === "scraped_apply_url")) {
    return {
      sourceField,
      inputUrl: sanitized,
      finalUrl,
      status: "verified",
      reason: sourceField === "scraped_apply_url" ? "verified_apply_page" : "verified_detail_page",
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch: true,
      finalDomain
    };
  }

  if (genericLanding) {
    return rejectedCheck(sourceField, sanitized, "generic_landing_page", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    });
  }

  if (unrelatedDomainRedirect && !titleMatch && !companyMatch) {
    return rejectedCheck(sourceField, sanitized, "redirected_to_unrelated_domain", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    });
  }

  if (titleMatch && !companyMatch) {
    return unresolvedCheck(sourceField, sanitized, "title_match_without_company_match", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    });
  }

  if (!titleMatch && companyMatch) {
    return unresolvedCheck(sourceField, sanitized, "company_match_without_title_match", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    });
  }

  if (jobSpecificPath || isKnownAtsHost(finalDomain)) {
    return unresolvedCheck(sourceField, sanitized, "job_like_page_without_strong_match", {
      finalUrl,
      httpStatus: response.status,
      redirectChain,
      titleMatch,
      companyMatch,
      finalDomain
    });
  }

  return rejectedCheck(sourceField, sanitized, "generic_or_unrelated_page", {
    finalUrl,
    httpStatus: response.status,
    redirectChain,
    titleMatch,
    companyMatch,
    finalDomain
  });
}

export async function validateCandidateJobUrls(input: CandidateJobUrlInput): Promise<CandidateJobUrlValidationResult> {
  const checks: CandidateJobUrlCheck[] = [];
  const candidates: Array<[CandidateUrlField, string | null | undefined]> = [
    ["scraped_detail_url", input.scrapedDetailUrl],
    ["scraped_apply_url", input.scrapedApplyUrl]
  ];

  for (const [sourceField, candidateUrl] of candidates) {
    if (!candidateUrl) {
      continue;
    }

    const check = await validateSingleCandidateUrl(sourceField, candidateUrl, input);
    checks.push(check);

    if (check.status === "verified" && check.finalUrl) {
      return buildValidationResult({
        finalVerifiedUrl: check.finalUrl,
        validationStatus: "verified",
        validationReason: check.reason,
        needsReview: false,
        checks
      });
    }
  }

  if (checks.length === 0) {
    return buildValidationResult({
      finalVerifiedUrl: null,
      validationStatus: "unresolved",
      validationReason: "missing_candidate_urls",
      needsReview: true,
      checks: []
    });
  }

  const unresolved = checks.find((check) => check.status === "unresolved");
  if (unresolved) {
    return buildValidationResult({
      finalVerifiedUrl: null,
      validationStatus: "unresolved",
      validationReason: unresolved.reason,
      needsReview: true,
      checks
    });
  }

  return buildValidationResult({
    finalVerifiedUrl: null,
    validationStatus: "rejected",
    validationReason: checks[0]?.reason ?? "candidate_urls_rejected",
    needsReview: false,
    checks
  });
}

export async function validateExtractedJobRecord(record: ExtractedJobRecord): Promise<ExtractedJobRecord> {
  const validation = await validateCandidateJobUrls({
    title: record.title,
    companyName: record.company_name,
    sourceReferenceUrl: record.source_reference_url,
    scrapedDetailUrl: record.scraped_detail_url,
    scrapedApplyUrl: record.scraped_apply_url
  });

  return {
    ...record,
    final_verified_url: validation.finalVerifiedUrl,
    validation_status: validation.validationStatus,
    validation_reason: validation.validationReason,
    needs_admin_review: validation.needsAdminReview,
    _debug: {
      ...record._debug,
      url_validation: validation
    }
  };
}

export async function validateExtractedJobRecords(records: ExtractedJobRecord[], concurrency = 4) {
  if (records.length === 0) {
    return [];
  }

  const results = new Array<ExtractedJobRecord>(records.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;

      if (current >= records.length) {
        return;
      }

      results[current] = await validateExtractedJobRecord(records[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, records.length) }, () => worker()));
  return results;
}
