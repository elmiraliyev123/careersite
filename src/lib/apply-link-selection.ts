import type { DatabaseSync } from "node:sqlite";

import type { Company } from "@/data/platform";
import {
  extractDomain,
  isKnownAtsHost,
  normalizeComparableText,
  type ApplyCtaMode,
  type ApplyLinkKind,
  type ApplyLinkValidationResult,
  type SourceKind
} from "@/lib/job-intelligence";
import { validateApplyLink } from "@/lib/job-link-validator";
import { isLinkedInJobUrl, normalizeLinkedInJobDetailUrl, resolveLinkedInApplyFlow } from "@/lib/linkedin-apply-resolution";
import { sanitizeJobUrl } from "@/lib/url-sanitizer";

export type ApplyLinkCandidate = {
  url: string;
  source: string;
  preScore: number;
  reasons: string[];
  kind?: ApplyLinkKind;
  applyActionUrl?: string | null;
  allowLinkedInApplyDetail?: boolean;
};

export type ScoredApplyLinkCandidate = ApplyLinkCandidate & {
  validation: ApplyLinkValidationResult;
  finalScore: number;
};

export type ApplyLinkSelectionResult = {
  candidateUrls: string[];
  candidates: ScoredApplyLinkCandidate[];
  applyActionUrl: string | null;
  selectedUrl: string | null;
  canonicalUrl: string | null;
  selectedScore: number;
  selectedKind: ApplyLinkKind;
  ctaMode: ApplyCtaMode;
  validation: ApplyLinkValidationResult;
  debug: Record<string, unknown>;
};

const PAGE_FETCH_CACHE = new Map<string, Promise<string[]>>();
const TRACKING_PARAM_NAMES = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "ref",
  "refid",
  "trackingid",
  "trk",
  "source",
  "campaign"
]);
const JOB_PATH_HINTS = ["job", "jobs", "vacancy", "vacancies", "position", "roles", "careers"];
const APPLY_TEXT_HINTS = ["apply", "application", "müraciət", "quick apply", "submit", "candidate", "vacancy"];
const DISCOVERY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function looksGenericCareerHomepage(url: URL) {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  return ["/", "/jobs", "/job", "/careers", "/career", "/vacancies", "/vacancy", "/en/jobs", "/en/careers"].includes(
    pathname
  );
}

function looksTrackingOnly(url: URL) {
  if (!url.search) {
    return false;
  }

  const names = Array.from(url.searchParams.keys());
  return names.length > 0 && names.every((name) => TRACKING_PARAM_NAMES.has(name.toLowerCase()));
}

function matchesJobSpecificPath(url: URL, title: string) {
  const normalizedPath = normalizeComparableText(url.pathname);
  const titleTokens = normalizeComparableText(title)
    .split(" ")
    .filter((token) => token.length >= 4)
    .slice(0, 5);
  const titleMatches = titleTokens.filter((token) => normalizedPath.includes(token)).length;
  const hasJobHint = JOB_PATH_HINTS.some((hint) => normalizedPath.includes(hint));
  const hasIdHint = /\b\d{4,}\b/.test(url.pathname) || /\/[a-z0-9-]{8,}$/.test(url.pathname);

  return hasJobHint || titleMatches >= 2 || hasIdHint;
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(candidate: string, baseUrl: string) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function looksLikeApplyAnchor(text: string, url: string, title: string) {
  const normalized = normalizeComparableText(`${text} ${url}`);

  if (APPLY_TEXT_HINTS.some((hint) => normalized.includes(hint))) {
    return true;
  }

  if (JOB_PATH_HINTS.some((hint) => normalized.includes(hint)) && matchesJobSpecificPath(new URL(url), title)) {
    return true;
  }

  return false;
}

function extractCandidateUrlsFromHtml(html: string, baseUrl: string, companyDomain: string | null, title: string) {
  const candidates = new Map<string, string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const formPattern = /<form\b[^>]*action=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]?.trim();
    const text = stripHtml(match[2] ?? "");

    if (!href) {
      continue;
    }

    const absolute = absoluteUrl(href, baseUrl);
    if (!absolute) {
      continue;
    }

    const domain = extractDomain(absolute);
    if (
      companyDomain &&
      domain &&
      domain !== companyDomain &&
      !domain.endsWith(`.${companyDomain}`) &&
      !isKnownAtsHost(domain)
    ) {
      continue;
    }

    if (!looksLikeApplyAnchor(text, absolute, title) && !isKnownAtsHost(domain)) {
      continue;
    }

    candidates.set(absolute, text);
  }

  for (const match of html.matchAll(formPattern)) {
    const action = match[1]?.trim();

    if (!action) {
      continue;
    }

    const absolute = absoluteUrl(action, baseUrl);
    if (!absolute) {
      continue;
    }

    const domain = extractDomain(absolute);
    if (
      companyDomain &&
      domain &&
      domain !== companyDomain &&
      !domain.endsWith(`.${companyDomain}`) &&
      !isKnownAtsHost(domain)
    ) {
      continue;
    }

    if (isKnownAtsHost(domain) || looksLikeApplyAnchor("apply", absolute, title)) {
      candidates.set(absolute, "form_action");
    }
  }

  return Array.from(candidates.keys()).slice(0, 10);
}

async function fetchDerivedApplyCandidates(seedUrl: string | null, companyDomain: string | null, title: string) {
  const normalizedSeed = seedUrl?.trim();
  if (!normalizedSeed) {
    return [];
  }

  const current = PAGE_FETCH_CACHE.get(normalizedSeed);
  if (current) {
    return current;
  }

  const task = (async () => {
    try {
      const response = await fetch(normalizedSeed, {
        headers: DISCOVERY_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        return [];
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        return [];
      }

      const html = await response.text();
      return extractCandidateUrlsFromHtml(html, response.url, companyDomain, title);
    } catch {
      return [];
    }
  })();

  PAGE_FETCH_CACHE.set(normalizedSeed, task);
  return task;
}

/**
 * REMOVED: buildDerivedCareerUrls
 *
 * This function used to fabricate URLs like company.com/careers, /jobs, etc.
 * from the company homepage, violating the no-hallucination rule.
 * Speculative URL construction is forbidden — every URL must be discovered
 * from an actual data source (HTML, JSON-LD, API, or manual entry).
 */

function pushCandidate(
  registry: Map<string, ApplyLinkCandidate>,
  input: {
    url: string | null | undefined;
    source: string;
    baseScore: number;
    title: string;
    companyDomain: string | null;
    kind?: ApplyLinkKind;
    applyActionUrl?: string | null;
    allowLinkedInApplyDetail?: boolean;
  }
) {
  const rawUrl = input.url?.trim();
  if (!rawUrl) {
    return;
  }

  // Sanitize URL before registering — reject invalid/placeholder/generic URLs
  const sanitized = sanitizeJobUrl(rawUrl);
  if (!sanitized) {
    return;
  }

  let parsed: URL;

  try {
    parsed = new URL(sanitized);
  } catch {
    return;
  }

  const url = parsed.toString();
  const current = registry.get(url);
  const reasons = current?.reasons ? [...current.reasons] : [];
  let score = current?.preScore ?? 0;
  score = Math.max(score, input.baseScore);

  if (looksTrackingOnly(parsed)) {
    score -= 0.12;
    reasons.push("tracking_only_params");
  }

  const domain = extractDomain(url);
  if (input.companyDomain && domain) {
    if (domain === input.companyDomain || domain.endsWith(`.${input.companyDomain}`)) {
      score += 0.18;
      reasons.push("official_domain_match");
    } else if (isKnownAtsHost(domain)) {
      score += 0.22;
      reasons.push("trusted_ats_domain");
    } else {
      score -= 0.14;
      reasons.push("domain_mismatch");
    }
  } else if (domain && isKnownAtsHost(domain)) {
    score += 0.2;
    reasons.push("trusted_ats_domain");
  }

  if (looksGenericCareerHomepage(parsed)) {
    score -= 0.26;
    reasons.push("generic_career_homepage");
  }

  if (matchesJobSpecificPath(parsed, input.title)) {
    score += 0.16;
    reasons.push("job_specific_path");
  } else {
    score -= 0.08;
    reasons.push("path_not_job_specific");
  }

  registry.set(url, {
    url,
    source: input.source,
    preScore: clamp(score, 0, 1),
    reasons: Array.from(new Set(reasons)),
    kind: input.kind ?? current?.kind ?? "unknown",
    applyActionUrl: input.applyActionUrl ?? current?.applyActionUrl ?? url,
    allowLinkedInApplyDetail: input.allowLinkedInApplyDetail ?? current?.allowLinkedInApplyDetail ?? false
  });
}

function lookupHistoricalApplyUrls(
  db: DatabaseSync,
  input: {
    sourceListingUrl: string;
    jobDetailUrl: string | null;
    company: Company | null;
    normalizedTitle: string;
  }
) {
  const rows = db.prepare(
    `SELECT COALESCE(canonical_apply_url, resolved_apply_url, external_apply_url, apply_url) AS apply_url
     FROM jobs
     WHERE source_url = ? OR source_listing_url = ? OR job_detail_url = ?
        OR (company_slug = ? AND normalized_title = ?)
     ORDER BY publishable DESC, verified_apply DESC, trust_score DESC, updated_at DESC
     LIMIT 5`
  ).all(
    input.sourceListingUrl,
    input.sourceListingUrl,
    input.jobDetailUrl ?? input.sourceListingUrl,
    input.company?.slug ?? null,
    input.normalizedTitle
  ) as Array<{ apply_url?: string | null }>;

  return rows
    .map((row) => row.apply_url?.trim() ?? "")
    .filter(Boolean);
}

export async function selectBestApplyLink(
  db: DatabaseSync,
  input: {
    company: Company | null;
    sourceKind: SourceKind;
    sourceListingUrl: string;
    jobDetailUrl: string | null;
    applyActionUrl?: string | null;
    externalApplyUrl: string | null;
    candidateApplyUrls?: string[] | null;
    normalizedTitle: string;
    title: string;
    city?: string | null;
    companyName?: string;
  }
): Promise<ApplyLinkSelectionResult> {
  const companyDomain = input.company ? extractDomain(input.company.website) : null;
  const linkedInOrigin = isLinkedInJobUrl(input.sourceListingUrl) || isLinkedInJobUrl(input.jobDetailUrl);
  const normalizedJobDetailUrl = linkedInOrigin
    ? normalizeLinkedInJobDetailUrl(input.jobDetailUrl ?? input.sourceListingUrl)
    : input.jobDetailUrl ?? input.sourceListingUrl;
  const registry = new Map<string, ApplyLinkCandidate>();
  const linkedInResolution = linkedInOrigin
    ? await resolveLinkedInApplyFlow(db, {
        sourceListingUrl: input.sourceListingUrl,
        jobDetailUrl: normalizedJobDetailUrl,
        company: input.company,
        companyName: input.companyName ?? input.company?.name ?? "",
        title: input.title,
        normalizedTitle: input.normalizedTitle,
        city: input.city ?? null
      })
    : null;
  const extractedPageCandidates = [
    ...(await fetchDerivedApplyCandidates(normalizedJobDetailUrl ?? null, companyDomain, input.title)).map((url) => ({
      url,
      source: "job_detail_page_extracted",
      baseScore: 0.74,
      kind: isKnownAtsHost(extractDomain(url)) ? ("ats" as const) : ("external" as const)
    })),
    ...(await fetchDerivedApplyCandidates(input.sourceListingUrl, companyDomain, input.title)).map((url) => ({
      url,
      source: "source_listing_page_extracted",
      baseScore: 0.42,
      kind: isKnownAtsHost(extractDomain(url)) ? ("ats" as const) : ("external" as const)
    }))
  ];

  if (linkedInResolution) {
    for (const url of linkedInResolution.candidateUrls) {
      pushCandidate(registry, {
        url,
        source: `linkedin:${linkedInResolution.applyType}`,
        baseScore:
          linkedInResolution.applyType === "tracking_redirect"
            ? 0.92
            : linkedInResolution.applyType === "external_apply"
              ? 0.88
              : 0.62,
        title: input.title,
        companyDomain,
        kind: linkedInResolution.applyLinkKind,
        applyActionUrl: linkedInResolution.applyActionUrl,
        allowLinkedInApplyDetail:
          linkedInResolution.applyLinkKind === "linkedin_easy_apply" ||
          linkedInResolution.applyLinkKind === "linkedin_offsite"
      });
    }

    if (
      linkedInResolution.canonicalApplyUrl &&
      (linkedInResolution.applyLinkKind === "linkedin_easy_apply" ||
        linkedInResolution.applyLinkKind === "linkedin_offsite")
    ) {
      pushCandidate(registry, {
        url: linkedInResolution.canonicalApplyUrl,
        source: `linkedin:${linkedInResolution.applyType}:detail_fallback`,
        baseScore: linkedInResolution.applyLinkKind === "linkedin_easy_apply" ? 0.71 : 0.64,
        title: input.title,
        companyDomain,
        kind: linkedInResolution.applyLinkKind,
        applyActionUrl: linkedInResolution.applyActionUrl,
        allowLinkedInApplyDetail: true
      });
    }
  }

  pushCandidate(registry, {
    url: input.applyActionUrl,
    source: "apply_action_url",
    baseScore: 0.9,
    title: input.title,
    companyDomain,
    kind: isKnownAtsHost(extractDomain(input.applyActionUrl)) ? "ats" : "external",
    applyActionUrl: input.applyActionUrl ?? null
  });

  pushCandidate(registry, {
    url: input.externalApplyUrl,
    source: "external_apply_url",
    baseScore: 0.72,
    title: input.title,
    companyDomain,
    kind: isKnownAtsHost(extractDomain(input.externalApplyUrl)) ? "ats" : "external",
    applyActionUrl: input.applyActionUrl ?? input.externalApplyUrl ?? null
  });

  pushCandidate(registry, {
    url: normalizedJobDetailUrl,
    source: "job_detail_url",
    baseScore: input.sourceKind === "career-page" ? 0.68 : 0.56,
    title: input.title,
    companyDomain,
    kind:
      linkedInResolution?.applyLinkKind ??
      (input.sourceKind === "career-page" ? "career_page" : linkedInOrigin ? "linkedin_detail_only" : "job_board_detail"),
    applyActionUrl: input.applyActionUrl ?? normalizedJobDetailUrl ?? null,
    allowLinkedInApplyDetail: Boolean(
      linkedInResolution &&
        (linkedInResolution.applyLinkKind === "linkedin_easy_apply" || linkedInResolution.applyLinkKind === "linkedin_offsite")
    )
  });

  pushCandidate(registry, {
    url: input.sourceListingUrl,
    source: "source_listing_url",
    baseScore: input.sourceKind === "job-board" ? 0.44 : 0.32,
    title: input.title,
    companyDomain,
    kind: linkedInOrigin ? "linkedin_detail_only" : input.sourceKind === "job-board" ? "job_board_detail" : "unknown",
    applyActionUrl: input.applyActionUrl ?? input.sourceListingUrl
  });

  for (const url of input.candidateApplyUrls ?? []) {
    pushCandidate(registry, {
      url,
      source: "extracted_candidate_url",
      baseScore: 0.64,
      title: input.title,
      companyDomain,
      kind: isKnownAtsHost(extractDomain(url)) ? "ats" : "external",
      applyActionUrl: input.applyActionUrl ?? url
    });
  }

  for (const candidate of extractedPageCandidates) {
    pushCandidate(registry, {
      url: candidate.url,
      source: candidate.source,
      baseScore: candidate.baseScore,
      title: input.title,
      companyDomain,
      kind: candidate.kind,
      applyActionUrl: candidate.url
    });
  }

  // REMOVED: buildDerivedCareerUrls usage — no speculative URL construction

  for (const url of lookupHistoricalApplyUrls(db, input)) {
    // Validate historical URLs before using them
    const sanitizedHistorical = sanitizeJobUrl(url);
    if (!sanitizedHistorical) {
      continue;
    }
    pushCandidate(registry, {
      url: sanitizedHistorical,
      source: "historical_apply_url",
      baseScore: 0.63,
      title: input.title,
      companyDomain,
      kind: isKnownAtsHost(extractDomain(url)) ? "ats" : "external",
      applyActionUrl: url
    });
  }

  const sortedCandidates = Array.from(registry.values())
    .sort((left, right) => right.preScore - left.preScore)
    .slice(0, 5);
  const scoredCandidates: ScoredApplyLinkCandidate[] = [];

  for (const candidate of sortedCandidates) {
    const validation = await validateApplyLink({
      candidateUrl: candidate.url,
      expectedCompanyDomain: companyDomain,
      title: input.title,
      allowLinkedInApplyDetail: candidate.allowLinkedInApplyDetail,
      linkedInApplyType:
        candidate.kind === "linkedin_easy_apply"
          ? "linkedin_easy_apply"
          : candidate.kind === "linkedin_offsite"
            ? "linkedin_offsite"
            : candidate.kind === "linkedin_detail_only"
              ? "linkedin_detail_only"
              : null
    });

    let finalScore = candidate.preScore;

    if (validation.status === "valid") {
      finalScore += 0.32;
    } else if (validation.status === "uncertain") {
      finalScore -= 0.12;
    } else {
      finalScore -= 0.65;
    }

    if (validation.verifiedApply) {
      finalScore += 0.08;
    }

    if (validation.flags.includes("generic_path")) {
      finalScore -= 0.16;
    }

    if (validation.flags.includes("domain_mismatch")) {
      finalScore -= 0.18;
    }

    if (validation.flags.includes("title_mismatch")) {
      finalScore -= 0.12;
    }

    if (validation.flags.includes("login_wall") || validation.flags.includes("expired")) {
      finalScore -= 0.35;
    }

    scoredCandidates.push({
      ...candidate,
      validation,
      finalScore: clamp(finalScore, 0, 1)
    });
  }

  const selected = scoredCandidates
    .filter((candidate) => candidate.validation.status === "valid")
    .sort((left, right) => right.finalScore - left.finalScore)[0];

  if (!selected || selected.finalScore < 0.72) {
    return {
      candidateUrls: sortedCandidates.map((candidate) => candidate.url),
      candidates: scoredCandidates,
      applyActionUrl: linkedInResolution?.applyActionUrl ?? input.applyActionUrl ?? input.externalApplyUrl ?? null,
      selectedUrl: null,
      canonicalUrl: null,
      selectedScore: 0,
      selectedKind: linkedInResolution?.applyLinkKind ?? "unknown",
      ctaMode: linkedInResolution?.ctaMode ?? "disabled",
      validation: selected?.validation ?? {
        status: "broken",
        checkedAt: new Date().toISOString(),
        httpStatus: null,
        finalUrl: null,
        reason: "no_valid_apply_candidate",
        verifiedApply: false,
        redirectChain: [],
        flags: ["no_valid_apply_candidate"]
      },
      debug: {
        linkedInResolution: linkedInResolution?.debug ?? null,
        candidateSources: sortedCandidates.map((candidate) => ({
          url: candidate.url,
          source: candidate.source,
          preScore: candidate.preScore,
          kind: candidate.kind ?? "unknown",
          reasons: candidate.reasons
        })),
        rejectedCandidates: scoredCandidates.map((candidate) => ({
          url: candidate.url,
          source: candidate.source,
          kind: candidate.kind ?? "unknown",
          finalScore: candidate.finalScore,
          validationStatus: candidate.validation.status,
          validationReason: candidate.validation.reason,
          validationFlags: candidate.validation.flags
        }))
      }
    };
  }

  return {
    candidateUrls: sortedCandidates.map((candidate) => candidate.url),
    candidates: scoredCandidates,
    applyActionUrl: selected.applyActionUrl ?? linkedInResolution?.applyActionUrl ?? selected.url,
    selectedUrl: selected.validation.finalUrl ?? selected.url,
    canonicalUrl: selected.validation.finalUrl ?? selected.url,
    selectedScore: selected.finalScore,
    selectedKind: selected.kind ?? "unknown",
    ctaMode: "apply",
    validation: selected.validation,
    debug: {
      linkedInResolution: linkedInResolution?.debug ?? null,
      selected: {
        url: selected.url,
        source: selected.source,
        kind: selected.kind ?? "unknown",
        applyActionUrl: selected.applyActionUrl ?? null,
        finalScore: selected.finalScore,
        validationReason: selected.validation.reason
      },
      rejectedCandidates: scoredCandidates
        .filter((candidate) => candidate.url !== selected.url)
        .map((candidate) => ({
          url: candidate.url,
          source: candidate.source,
          kind: candidate.kind ?? "unknown",
          finalScore: candidate.finalScore,
          validationStatus: candidate.validation.status,
          validationReason: candidate.validation.reason,
          validationFlags: candidate.validation.flags
        }))
    }
  };
}
