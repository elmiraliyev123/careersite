import type { DatabaseSync } from "node:sqlite";

import type { Company } from "@/data/platform";
import { isSafeExternalUrl } from "@/lib/outbound";
import {
  extractDomain,
  isKnownAtsHost,
  normalizeComparableText,
  normalizeCompanyName,
  type ApplyCtaMode,
  type ApplyLinkKind
} from "@/lib/job-intelligence";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const LINKEDIN_APPLY_JOIN_PATTERN = /Join to apply for the/i;
const LINKEDIN_OFFSITE_PATTERN = /apply-link-offsite|offsite-apply-icon|Continue to apply/i;
const REDIRECT_PARAM_NAMES = ["url", "dest", "destination", "target", "redirect", "redirectUrl", "redir", "redirect_uri"];

export type LinkedInApplyType =
  | "external_apply"
  | "tracking_redirect"
  | "linkedin_easy_apply"
  | "linkedin_offsite"
  | "linkedin_detail_only";

export type LinkedInApplyResolution = {
  sourceListingUrl: string;
  jobDetailUrl: string;
  applyActionUrl: string | null;
  resolvedApplyUrl: string | null;
  canonicalApplyUrl: string | null;
  applyType: LinkedInApplyType;
  applyLinkKind: ApplyLinkKind;
  ctaMode: ApplyCtaMode;
  candidateUrls: string[];
  rescueUrl: string | null;
  rescueConfidence: number;
  debug: Record<string, unknown>;
};

type RescueCandidate = {
  url: string;
  score: number;
  source: string;
};

function absoluteUrl(candidate: string, baseUrl: string) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeTrackingFreeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";

    if (isLinkedInJobUrl(parsed.toString())) {
      parsed.search = "";
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function decodePotentialRedirectTarget(url: string) {
  try {
    const parsed = new URL(url);

    for (const name of REDIRECT_PARAM_NAMES) {
      const raw = parsed.searchParams.get(name);
      if (!raw) {
        continue;
      }

      const decoded = decodeURIComponent(raw);
      if (isSafeExternalUrl(decoded)) {
        return decoded;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function extractExternalApplyCandidates(html: string, baseUrl: string) {
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const candidates = new Map<string, { rawUrl: string; source: LinkedInApplyType }>();

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

    const redirected = decodePotentialRedirectTarget(absolute);
    const effective = redirected ?? absolute;
    const domain = extractDomain(effective);

    if (!domain || domain.endsWith("linkedin.com") || domain.endsWith("licdn.com")) {
      continue;
    }

    if (!isSafeExternalUrl(effective)) {
      continue;
    }

    const loweredText = normalizeComparableText(text);
    const kind: LinkedInApplyType =
      redirected || absolute.includes("linkedin.com")
        ? "tracking_redirect"
        : loweredText.includes("apply") || loweredText.includes("müraciət")
          ? "external_apply"
          : isKnownAtsHost(domain)
            ? "external_apply"
            : "external_apply";

    candidates.set(effective, {
      rawUrl: absolute,
      source: kind
    });
  }

  return Array.from(candidates.entries()).map(([url, meta]) => ({
    url,
    rawUrl: meta.rawUrl,
    applyType: meta.source
  }));
}

function detectLinkedInApplyType(html: string): LinkedInApplyType {
  if (LINKEDIN_OFFSITE_PATTERN.test(html)) {
    return "linkedin_offsite";
  }

  if (LINKEDIN_APPLY_JOIN_PATTERN.test(html)) {
    return "linkedin_easy_apply";
  }

  return "linkedin_detail_only";
}

function titleTokenOverlap(left: string, right: string) {
  const leftTokens = new Set(normalizeComparableText(left).split(" ").filter((token) => token.length >= 4));
  const rightTokens = new Set(normalizeComparableText(right).split(" ").filter((token) => token.length >= 4));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function findLinkedInRescueCandidate(
  db: DatabaseSync,
  input: {
    company: Company | null;
    companyName: string;
    normalizedTitle: string;
    title: string;
    city?: string | null;
  }
): RescueCandidate | null {
  const rows = db.prepare(
    `SELECT
       COALESCE(canonical_apply_url, resolved_apply_url, apply_url) AS apply_url,
       company_slug,
       company_name,
       title,
       normalized_title,
       city,
       source_kind,
       official_source,
       trust_score
     FROM jobs
     WHERE COALESCE(canonical_apply_url, resolved_apply_url, apply_url) IS NOT NULL
       AND (
         company_slug = ?
         OR company_name = ?
         OR company_name LIKE ?
       )
     ORDER BY official_source DESC, trust_score DESC, updated_at DESC
     LIMIT 20`
  ).all(
    input.company?.slug ?? null,
    input.company?.name ?? input.companyName,
    `%${input.company?.name ?? input.companyName}%`
  ) as Array<{
    apply_url?: string | null;
    company_slug?: string | null;
    company_name?: string | null;
    title?: string | null;
    normalized_title?: string | null;
    city?: string | null;
    source_kind?: string | null;
    official_source?: number | null;
    trust_score?: number | null;
  }>;

  const normalizedCompanyName = normalizeCompanyName(input.company?.name ?? input.companyName);
  let best: RescueCandidate | null = null;

  for (const row of rows) {
    const url = row.apply_url?.trim();
    if (!url || !isSafeExternalUrl(url) || isLinkedInJobUrl(url)) {
      continue;
    }

    let score = 0;
    const rowCompany = normalizeCompanyName(row.company_name ?? "");
    const rowTitle = row.normalized_title ?? normalizeComparableText(row.title ?? "");
    const overlap = titleTokenOverlap(input.normalizedTitle || input.title, rowTitle);

    if (rowCompany && rowCompany === normalizedCompanyName) {
      score += 0.32;
    }

    if (rowTitle === input.normalizedTitle) {
      score += 0.42;
    } else if (overlap >= 0.72) {
      score += 0.24 + overlap * 0.18;
    }

    if ((row.city ?? "") === (input.city ?? "")) {
      score += 0.12;
    }

    if (row.source_kind === "career-page" || Number(row.official_source ?? 0) === 1) {
      score += 0.12;
    }

    score += Math.min(Number(row.trust_score ?? 0), 1) * 0.06;

    if (!best || score > best.score) {
      best = {
        url,
        score,
        source: row.source_kind === "career-page" || Number(row.official_source ?? 0) === 1 ? "official_job_match" : "historical_job_match"
      };
    }
  }

  return best && best.score >= 0.88 ? best : null;
}

export function isLinkedInJobUrl(value: string | null | undefined) {
  const domain = extractDomain(value);
  if (!domain || !domain.endsWith("linkedin.com")) {
    return false;
  }

  try {
    return new URL(value!).pathname.includes("/jobs/view/");
  } catch {
    return false;
  }
}

export function normalizeLinkedInJobDetailUrl(value: string | null | undefined) {
  if (!isLinkedInJobUrl(value)) {
    return value?.trim() ?? null;
  }

  try {
    const parsed = new URL(value!);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return value?.trim() ?? null;
  }
}

export async function resolveLinkedInApplyFlow(
  db: DatabaseSync,
  input: {
    sourceListingUrl: string;
    jobDetailUrl: string | null;
    company: Company | null;
    companyName: string;
    title: string;
    normalizedTitle: string;
    city?: string | null;
  }
): Promise<LinkedInApplyResolution> {
  const sourceListingUrl = input.sourceListingUrl.trim();
  const jobDetailUrl = normalizeLinkedInJobDetailUrl(input.jobDetailUrl ?? input.sourceListingUrl) ?? sourceListingUrl;
  const debug: Record<string, unknown> = {
    sourceListingUrl,
    jobDetailUrl
  };

  try {
    const response = await fetch(jobDetailUrl, {
      headers: DEFAULT_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });

    const html = await response.text();
    const detectedType = detectLinkedInApplyType(html);
    const externalCandidates = extractExternalApplyCandidates(html, response.url);
    const rescueCandidate = findLinkedInRescueCandidate(db, {
      company: input.company,
      companyName: input.companyName,
      normalizedTitle: input.normalizedTitle,
      title: input.title,
      city: input.city ?? null
    });
    const topExternal = externalCandidates[0] ?? null;

    debug.httpStatus = response.status;
    debug.detectedApplyType = detectedType;
    debug.externalCandidates = externalCandidates;
    debug.rescueCandidate = rescueCandidate;

    if (topExternal) {
      return {
        sourceListingUrl,
        jobDetailUrl,
        applyActionUrl: topExternal.rawUrl,
        resolvedApplyUrl: topExternal.url,
        canonicalApplyUrl: topExternal.url,
        applyType: topExternal.applyType,
        applyLinkKind: topExternal.applyType === "tracking_redirect" ? "tracking_redirect" : isKnownAtsHost(extractDomain(topExternal.url)) ? "ats" : "external",
        ctaMode: "apply",
        candidateUrls: externalCandidates.map((candidate) => candidate.url),
        rescueUrl: rescueCandidate?.url ?? null,
        rescueConfidence: rescueCandidate?.score ?? 0,
        debug
      };
    }

    if (rescueCandidate) {
      return {
        sourceListingUrl,
        jobDetailUrl,
        applyActionUrl: jobDetailUrl,
        resolvedApplyUrl: rescueCandidate.url,
        canonicalApplyUrl: rescueCandidate.url,
        applyType: "external_apply",
        applyLinkKind: isKnownAtsHost(extractDomain(rescueCandidate.url)) ? "ats" : "external",
        ctaMode: "apply",
        candidateUrls: [rescueCandidate.url],
        rescueUrl: rescueCandidate.url,
        rescueConfidence: rescueCandidate.score,
        debug
      };
    }

    if (detectedType === "linkedin_easy_apply" || detectedType === "linkedin_offsite") {
      return {
        sourceListingUrl,
        jobDetailUrl,
        applyActionUrl: jobDetailUrl,
        resolvedApplyUrl: jobDetailUrl,
        canonicalApplyUrl: jobDetailUrl,
        applyType: detectedType,
        applyLinkKind: detectedType === "linkedin_easy_apply" ? "linkedin_easy_apply" : "linkedin_offsite",
        ctaMode: "apply",
        candidateUrls: [jobDetailUrl],
        rescueUrl: null,
        rescueConfidence: 0,
        debug
      };
    }

    return {
      sourceListingUrl,
      jobDetailUrl,
      applyActionUrl: null,
      resolvedApplyUrl: null,
      canonicalApplyUrl: null,
      applyType: "linkedin_detail_only",
      applyLinkKind: "linkedin_detail_only",
      ctaMode: "disabled",
      candidateUrls: [],
      rescueUrl: null,
      rescueConfidence: 0,
      debug
    };
  } catch (error) {
    return {
      sourceListingUrl,
      jobDetailUrl,
      applyActionUrl: null,
      resolvedApplyUrl: null,
      canonicalApplyUrl: null,
      applyType: "linkedin_detail_only",
      applyLinkKind: "linkedin_detail_only",
      ctaMode: "disabled",
      candidateUrls: [],
      rescueUrl: null,
      rescueConfidence: 0,
      debug: {
        ...debug,
        error: error instanceof Error ? error.message : "linkedin_resolution_failed"
      }
    };
  }
}
