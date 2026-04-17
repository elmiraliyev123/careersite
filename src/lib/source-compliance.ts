import { getPlatformDatabase } from "@/lib/platform-database";
import type { ScrapeSource, ScrapeSourceAdapter } from "@/lib/scrape-config";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const REVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TERMS_LINK_PATTERNS = [
  /terms/i,
  /conditions/i,
  /legal/i,
  /istifad[eə]\s+qayd/i,
  /qaydalar/i
];
const PRIVACY_LINK_PATTERNS = [
  /privacy/i,
  /confidentiality/i,
  /m[əe]xfili/i,
  /gizlilik/i
];
const RESTRICTED_TERMS_PATTERNS = [
  /\bno (?:robot|robots|scrap|scraping|crawler|crawlers|bot|bots)\b/i,
  /\bmust not use .*?(?:scraper|crawler|spider|robot|bot)\b/i,
  /\byou may not .*?(?:scrape|crawl|harvest|data mining|automated access)\b/i,
  /\bprohibit(?:ed|s)? .*?(?:scrap|crawl|automated|bot)\b/i,
  /\bwithout .*?written consent .*?(?:scrape|crawl|automated)\b/i,
  /\bno automated means\b/i,
  /\bautomated means .*?prohibited\b/i,
  /\bspider(?:s)?\b/i,
  /\bcrawler(?:s)?\b/i,
  /\bdata mining\b/i
];
const AMBIGUOUS_TERMS_PATTERNS = [
  /\bautomated access\b/i,
  /\bautomated means\b/i,
  /\bprogrammatic access\b/i,
  /\bexcessive requests\b/i,
  /\baccess restrictions\b/i,
  /\bprior written consent\b/i
];

export type SourceLegalReviewStatus =
  | "api_allowed"
  | "feed_allowed"
  | "html_allowed_low_risk"
  | "restricted_manual_review"
  | "blocked_do_not_scrape";

export type AllowedIngestionMethod =
  | "official_api"
  | "public_feed"
  | "html_discovery"
  | "browser_automation"
  | "manual_review"
  | "blocked";

export type SourceComplianceReview = {
  sourceId: string;
  sourceName: string;
  sourceDomain: string;
  sourceType: string;
  termsUrl: string | null;
  privacyUrl: string | null;
  robotsUrl: string | null;
  legalReviewStatus: SourceLegalReviewStatus;
  legalReviewNotes: string;
  allowedIngestionMethod: AllowedIngestionMethod;
  lastLegalCheckedAt: string;
};

type ComplianceRow = {
  source_id: string;
  source_name: string;
  source_domain: string;
  source_type: string;
  terms_url: string | null;
  privacy_url: string | null;
  robots_url: string | null;
  legal_review_status: SourceLegalReviewStatus;
  legal_review_notes: string;
  allowed_ingestion_method: AllowedIngestionMethod;
  last_legal_checked_at: string;
};

type FetchTextResult = {
  url: string | null;
  status: number | null;
  text: string | null;
};

type RobotsReview = {
  url: string;
  status: number | null;
  text: string | null;
  disallowsAll: boolean;
  disallowsTarget: boolean;
};

function nowIsoTimestamp() {
  return new Date().toISOString();
}

function ensureSourceComplianceSchema() {
  const db = getPlatformDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_compliance_reviews (
      source_id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      source_domain TEXT NOT NULL,
      source_type TEXT NOT NULL,
      terms_url TEXT,
      privacy_url TEXT,
      robots_url TEXT,
      legal_review_status TEXT NOT NULL,
      legal_review_notes TEXT NOT NULL,
      allowed_ingestion_method TEXT NOT NULL,
      last_legal_checked_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function extractPathname(url: string | null | undefined) {
  try {
    return url ? new URL(url).pathname || "/" : "/";
  } catch {
    return "/";
  }
}

function parseReviewRow(row: ComplianceRow | undefined): SourceComplianceReview | null {
  if (!row) {
    return null;
  }

  return {
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceDomain: row.source_domain,
    sourceType: row.source_type,
    termsUrl: row.terms_url,
    privacyUrl: row.privacy_url,
    robotsUrl: row.robots_url,
    legalReviewStatus: row.legal_review_status,
    legalReviewNotes: row.legal_review_notes,
    allowedIngestionMethod: row.allowed_ingestion_method,
    lastLegalCheckedAt: row.last_legal_checked_at
  };
}

function getCachedComplianceReview(sourceId: string) {
  ensureSourceComplianceSchema();
  const db = getPlatformDatabase();
  const row = db.prepare(
    `SELECT source_id, source_name, source_domain, source_type, terms_url, privacy_url, robots_url,
            legal_review_status, legal_review_notes, allowed_ingestion_method, last_legal_checked_at
     FROM source_compliance_reviews
     WHERE source_id = ?`
  ).get(sourceId) as ComplianceRow | undefined;

  return parseReviewRow(row);
}

function persistComplianceReview(review: SourceComplianceReview) {
  ensureSourceComplianceSchema();
  const db = getPlatformDatabase();
  db.prepare(
    `INSERT INTO source_compliance_reviews (
      source_id, source_name, source_domain, source_type, terms_url, privacy_url, robots_url,
      legal_review_status, legal_review_notes, allowed_ingestion_method, last_legal_checked_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_id) DO UPDATE SET
      source_name = excluded.source_name,
      source_domain = excluded.source_domain,
      source_type = excluded.source_type,
      terms_url = excluded.terms_url,
      privacy_url = excluded.privacy_url,
      robots_url = excluded.robots_url,
      legal_review_status = excluded.legal_review_status,
      legal_review_notes = excluded.legal_review_notes,
      allowed_ingestion_method = excluded.allowed_ingestion_method,
      last_legal_checked_at = excluded.last_legal_checked_at,
      updated_at = excluded.updated_at`
  ).run(
    review.sourceId,
    review.sourceName,
    review.sourceDomain,
    review.sourceType,
    review.termsUrl,
    review.privacyUrl,
    review.robotsUrl,
    review.legalReviewStatus,
    review.legalReviewNotes,
    review.allowedIngestionMethod,
    review.lastLegalCheckedAt,
    review.lastLegalCheckedAt
  );
}

async function fetchText(url: string | null | undefined): Promise<FetchTextResult> {
  if (!url) {
    return { url: null, status: null, text: null };
  }

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(12000)
    });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const body = contentType.includes("text/html") || contentType.includes("text/plain")
      ? (await response.text()).slice(0, 120000)
      : null;

    return {
      url: response.url,
      status: response.status,
      text: body
    };
  } catch {
    return { url, status: null, text: null };
  }
}

function buildDiscoveryCandidates(origin: string, kind: "terms" | "privacy") {
  const common = kind === "terms"
    ? [
        "/terms",
        "/terms-of-use",
        "/terms-and-conditions",
        "/legal/terms",
        "/en/terms",
        "/en/terms-of-use"
      ]
    : [
        "/privacy",
        "/privacy-policy",
        "/privacy-notice",
        "/legal/privacy",
        "/en/privacy-policy",
        "/en/privacy-notice"
      ];

  return common.map((candidate) => `${origin}${candidate}`);
}

function extractLinkedPolicyUrl(html: string | null, baseUrl: string | null, patterns: RegExp[]) {
  if (!html || !baseUrl) {
    return null;
  }

  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]?.trim();
    const text = stripHtml(match[2] ?? "");
    if (!href || !text) {
      continue;
    }
    if (!patterns.some((pattern) => pattern.test(text) || pattern.test(href))) {
      continue;
    }
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
  }

  return null;
}

async function resolvePolicyUrl(sourceUrl: string, kind: "terms" | "privacy") {
  const page = await fetchText(sourceUrl);
  const origin = extractOrigin(page.url ?? sourceUrl);
  const patterns = kind === "terms" ? TERMS_LINK_PATTERNS : PRIVACY_LINK_PATTERNS;
  const linkedUrl = extractLinkedPolicyUrl(page.text, page.url ?? sourceUrl, patterns);

  if (linkedUrl) {
    const fetched = await fetchText(linkedUrl);
    if (fetched.status && fetched.status >= 200 && fetched.status < 400) {
      return fetched;
    }
  }

  if (!origin) {
    return { url: null, status: null, text: null };
  }

  for (const candidate of buildDiscoveryCandidates(origin, kind)) {
    const fetched = await fetchText(candidate);
    if (fetched.status && fetched.status >= 200 && fetched.status < 400 && fetched.text) {
      return fetched;
    }
  }

  return { url: null, status: null, text: null };
}

function isRobotsGroupRelevant(groupAgent: string) {
  return groupAgent === "*" || groupAgent.includes("googlebot") || groupAgent.includes("bingbot");
}

function pathMatchesRule(pathname: string, rule: string) {
  if (!rule) {
    return false;
  }
  if (rule === "/") {
    return true;
  }
  return pathname.startsWith(rule);
}

function reviewRobotsText(url: string, text: string | null, targetPath: string) {
  if (!text) {
    return {
      url,
      status: null,
      text,
      disallowsAll: false,
      disallowsTarget: false
    } satisfies RobotsReview;
  }

  let currentRelevant = false;
  const disallowRules: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]?.trim();
    if (!line) {
      continue;
    }

    const userAgentMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (userAgentMatch) {
      currentRelevant = isRobotsGroupRelevant(userAgentMatch[1].trim().toLowerCase());
      continue;
    }

    if (!currentRelevant) {
      continue;
    }

    const disallowMatch = line.match(/^disallow:\s*(.*)$/i);
    if (disallowMatch) {
      disallowRules.push(disallowMatch[1].trim());
    }
  }

  return {
    url,
    status: 200,
    text,
    disallowsAll: disallowRules.some((rule) => rule === "/"),
    disallowsTarget: disallowRules.some((rule) => pathMatchesRule(targetPath, rule))
  } satisfies RobotsReview;
}

async function fetchRobotsReview(sourceUrl: string) {
  const origin = extractOrigin(sourceUrl);
  if (!origin) {
    return null;
  }

  const robotsUrl = `${origin}/robots.txt`;
  const fetched = await fetchText(robotsUrl);
  return reviewRobotsText(fetched.url ?? robotsUrl, fetched.text, extractPathname(sourceUrl));
}

function inferAllowedMethodFromAdapter(adapter: ScrapeSourceAdapter): AllowedIngestionMethod {
  if (adapter === "json-feed") {
    return "public_feed";
  }
  if (adapter === "python-selenium") {
    return "browser_automation";
  }
  return "html_discovery";
}

function determineAllowedMethod(source: ScrapeSource, status: SourceLegalReviewStatus): AllowedIngestionMethod {
  if (status === "blocked_do_not_scrape") {
    return "blocked";
  }
  if (status === "restricted_manual_review") {
    return "manual_review";
  }
  if (status === "api_allowed") {
    return "official_api";
  }
  if (status === "feed_allowed") {
    return "public_feed";
  }
  return inferAllowedMethodFromAdapter(source.adapter);
}

function determineStructuredSourceStatus(source: ScrapeSource, policySignals: {
  termsText: string | null;
  privacyText: string | null;
  robots: RobotsReview | null;
}) {
  const combined = [policySignals.termsText, policySignals.privacyText].filter(Boolean).join(" ");

  if (RESTRICTED_TERMS_PATTERNS.some((pattern) => pattern.test(combined))) {
    return {
      status: "blocked_do_not_scrape" as const,
      notes: "Structured source blocked by explicit anti-automation language in policy text."
    };
  }

  if (policySignals.robots?.disallowsAll || policySignals.robots?.disallowsTarget) {
    return {
      status: "restricted_manual_review" as const,
      notes: "Structured endpoint available, but robots.txt restricts the reviewed path."
    };
  }

  return {
    status: source.sourceType === "official-api-feed" ? ("api_allowed" as const) : ("feed_allowed" as const),
    notes:
      source.sourceType === "official-api-feed"
        ? "Public structured endpoint classified as official API access."
        : "Public structured endpoint classified as feed-backed ATS access."
  };
}

function determineHtmlSourceStatus(source: ScrapeSource, policySignals: {
  termsText: string | null;
  privacyText: string | null;
  robots: RobotsReview | null;
}) {
  const combined = [policySignals.termsText, policySignals.privacyText].filter(Boolean).join(" ");
  const hasExplicitRestriction = RESTRICTED_TERMS_PATTERNS.some((pattern) => pattern.test(combined));
  const hasAmbiguousRestriction = AMBIGUOUS_TERMS_PATTERNS.some((pattern) => pattern.test(combined));
  const robotsBlocked = Boolean(policySignals.robots?.disallowsAll || policySignals.robots?.disallowsTarget);

  if (hasExplicitRestriction) {
    return {
      status: "blocked_do_not_scrape" as const,
      notes: "Explicit anti-scraping or anti-bot restriction detected in source policy."
    };
  }

  if (robotsBlocked) {
    return {
      status: "restricted_manual_review" as const,
      notes: "robots.txt restricts the reviewed source path."
    };
  }

  if (hasAmbiguousRestriction) {
    return {
      status: "restricted_manual_review" as const,
      notes: "Policy language mentions automated access restrictions and requires manual review."
    };
  }

  return {
    status: "html_allowed_low_risk" as const,
    notes: "No explicit anti-automation restriction detected; HTML collection limited to the reviewed public career path."
  };
}

export function isComplianceStatusAllowed(status: SourceLegalReviewStatus) {
  return status === "api_allowed" || status === "feed_allowed" || status === "html_allowed_low_risk";
}

export async function reviewSourceCompliance(source: ScrapeSource, options?: { force?: boolean }) {
  const cached = getCachedComplianceReview(source.id);
  if (!options?.force && cached) {
    const ageMs = Date.now() - Date.parse(cached.lastLegalCheckedAt);
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < REVIEW_TTL_MS) {
      return cached;
    }
  }

  const checkedAt = nowIsoTimestamp();

  if (source.sourceType === "restricted-source") {
    const review: SourceComplianceReview = {
      sourceId: source.id,
      sourceName: source.name,
      sourceDomain: source.sourceDomain,
      sourceType: source.sourceType,
      termsUrl: null,
      privacyUrl: null,
      robotsUrl: extractOrigin(source.url) ? `${extractOrigin(source.url)}/robots.txt` : null,
      legalReviewStatus: "blocked_do_not_scrape",
      legalReviewNotes: source.restrictedReason ?? "Known restricted source; keep out of automated primary ingestion.",
      allowedIngestionMethod: "blocked",
      lastLegalCheckedAt: checkedAt
    };
    persistComplianceReview(review);
    return review;
  }

  const [sourcePage, termsPage, privacyPage, robotsReview] = await Promise.all([
    fetchText(source.url),
    resolvePolicyUrl(source.url, "terms"),
    resolvePolicyUrl(source.url, "privacy"),
    fetchRobotsReview(source.url)
  ]);

  const policySignals = {
    termsText: termsPage.text ? stripHtml(termsPage.text).slice(0, 60000) : null,
    privacyText: privacyPage.text ? stripHtml(privacyPage.text).slice(0, 60000) : null,
    robots: robotsReview
  };

  let reviewDecision =
    source.adapter === "json-feed"
      ? determineStructuredSourceStatus(source, policySignals)
      : determineHtmlSourceStatus(source, policySignals);

  if ([401, 403, 429].includes(sourcePage.status ?? 0)) {
    reviewDecision = {
      status: "restricted_manual_review",
      notes: `Source page returned access restriction (${sourcePage.status}); defaulting to manual review instead of automated collection.`
    };
  } else if (!sourcePage.status || [404, 410].includes(sourcePage.status) || (sourcePage.status ?? 0) >= 500) {
    reviewDecision = {
      status: "restricted_manual_review",
      notes: sourcePage.status
        ? `Source page returned ${sourcePage.status}; keep the source in review until a stable public entry point is confirmed.`
        : "Source page was unreachable from this environment; keep the source in review until connectivity is confirmed."
    };
  }

  const notes = [
    reviewDecision.notes,
    sourcePage.status ? `source_status:${sourcePage.status}` : "source_status:unreachable",
    termsPage.url ? `terms:${termsPage.url}` : "terms:not_found",
    privacyPage.url ? `privacy:${privacyPage.url}` : "privacy:not_found",
    robotsReview?.url ? `robots:${robotsReview.url}` : "robots:not_found"
  ].join(" | ");

  const review: SourceComplianceReview = {
    sourceId: source.id,
    sourceName: source.name,
    sourceDomain: source.sourceDomain,
    sourceType: source.sourceType,
    termsUrl: termsPage.url,
    privacyUrl: privacyPage.url,
    robotsUrl: robotsReview?.url ?? null,
    legalReviewStatus: reviewDecision.status,
    legalReviewNotes: notes,
    allowedIngestionMethod: determineAllowedMethod(source, reviewDecision.status),
    lastLegalCheckedAt: checkedAt
  };
  persistComplianceReview(review);
  return review;
}

export async function reviewSourceComplianceBatch(sources: ScrapeSource[], options?: { force?: boolean }) {
  const results = new Array<SourceComplianceReview>(sources.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= sources.length) {
        return;
      }
      results[current] = await reviewSourceCompliance(sources[current], options);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(4, sources.length) }, () => worker())
  );

  return results;
}

export function getSourceComplianceIndex() {
  ensureSourceComplianceSchema();
  const db = getPlatformDatabase();
  const rows = db.prepare(
    `SELECT source_id, source_name, source_domain, source_type, terms_url, privacy_url, robots_url,
            legal_review_status, legal_review_notes, allowed_ingestion_method, last_legal_checked_at
     FROM source_compliance_reviews`
  ).all() as ComplianceRow[];

  return new Map(rows.map((row) => [row.source_id, parseReviewRow(row)!]));
}
