import type { DatabaseSync } from "node:sqlite";

import { extractDomain, nowIsoTimestamp } from "@/lib/job-intelligence";
import { findCompanyBySlug, getPlatformDatabase } from "@/lib/platform-database";

type CompanyEnrichmentCacheRow = {
  company_slug: string;
  resolved_domain: string | null;
  logo_url: string | null;
  logo_source: string | null;
  logo_confidence: number;
  wikipedia_summary: string | null;
  wikipedia_source_url: string | null;
  checked_at: string;
  last_error: string | null;
};

type CompanyEnrichmentResult = {
  resolvedDomain: string | null;
  logoUrl: string | null;
  logoSource: string | null;
  logoConfidence: number;
  wikipediaSummary: string | null;
  wikipediaSourceUrl: string | null;
  checkedAt: string;
  lastError: string | null;
};

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};
const COMPANY_ENRICHMENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const enrichmentInFlight = new Map<string, Promise<CompanyEnrichmentResult | null>>();

function ensureColumnExists(db: DatabaseSync, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>;
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensureCompanyEnrichmentSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_enrichment_cache (
      company_slug TEXT PRIMARY KEY,
      resolved_domain TEXT,
      logo_url TEXT,
      logo_source TEXT,
      logo_confidence REAL NOT NULL DEFAULT 0,
      wikipedia_summary TEXT,
      wikipedia_source_url TEXT,
      checked_at TEXT NOT NULL,
      last_error TEXT,
      FOREIGN KEY (company_slug) REFERENCES companies(slug) ON DELETE CASCADE
    )
  `);

  ensureColumnExists(db, "companies", "logo_source", "TEXT");
  ensureColumnExists(db, "companies", "logo_confidence", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "companies", "resolved_domain", "TEXT");
  ensureColumnExists(db, "companies", "checked_recently_at", "TEXT");
}

function getCachedEnrichment(db: DatabaseSync, companySlug: string) {
  const row = db.prepare(
    `SELECT company_slug, resolved_domain, logo_url, logo_source, logo_confidence,
            wikipedia_summary, wikipedia_source_url, checked_at, last_error
     FROM company_enrichment_cache
     WHERE company_slug = ?`
  ).get(companySlug) as CompanyEnrichmentCacheRow | undefined;

  if (!row) {
    return null;
  }

  return {
    resolvedDomain: row.resolved_domain,
    logoUrl: row.logo_url,
    logoSource: row.logo_source,
    logoConfidence: row.logo_confidence,
    wikipediaSummary: row.wikipedia_summary,
    wikipediaSourceUrl: row.wikipedia_source_url,
    checkedAt: row.checked_at,
    lastError: row.last_error
  } satisfies CompanyEnrichmentResult;
}

function normalizeAssetUrl(candidate: string, baseUrl: string) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractIconCandidates(html: string, baseUrl: string) {
  const icons: Array<{ url: string; source: string; confidence: number }> = [];
  const pattern = /<link\b[^>]*rel=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(pattern)) {
    const rel = match[1]?.toLowerCase() ?? "";
    const href = match[2]?.trim();

    if (!href) {
      continue;
    }

    const absoluteUrl = normalizeAssetUrl(href, baseUrl);
    if (!absoluteUrl) {
      continue;
    }

    if (rel.includes("apple-touch-icon")) {
      icons.push({ url: absoluteUrl, source: "apple-touch-icon", confidence: 0.95 });
      continue;
    }

    if (rel.includes("shortcut icon")) {
      icons.push({ url: absoluteUrl, source: "shortcut-icon", confidence: 0.88 });
      continue;
    }

    if (rel.includes("icon")) {
      icons.push({ url: absoluteUrl, source: "icon", confidence: 0.84 });
    }
  }

  const favicon = normalizeAssetUrl("/favicon.ico", baseUrl);
  if (favicon) {
    icons.push({ url: favicon, source: "favicon", confidence: 0.72 });
  }

  return Array.from(new Map(icons.map((item) => [item.url, item])).values());
}

async function verifyAssetUrl(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_HEADERS["User-Agent"],
        Accept: "image/*,*/*;q=0.8"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    return response.ok && (contentType.startsWith("image/") || url.endsWith(".ico") || url.endsWith(".svg"));
  } catch {
    return false;
  }
}

async function fetchWikipediaSummary(companyName: string) {
  try {
    const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(companyName)}`;
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };

    if (!payload.extract) {
      return null;
    }

    const sentences = payload.extract
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");

    if (!sentences) {
      return null;
    }

    return {
      summary: sentences,
      sourceUrl: payload.content_urls?.desktop?.page ?? null
    };
  } catch {
    return null;
  }
}

async function resolveOfficialAssets(websiteUrl: string | null) {
  const domain = extractDomain(websiteUrl);

  if (!websiteUrl || !domain) {
    return {
      resolvedDomain: domain,
      logoUrl: null,
      logoSource: null,
      logoConfidence: 0
    };
  }

  try {
    const response = await fetch(websiteUrl, {
      headers: DEFAULT_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      throw new Error(`website_http_${response.status}`);
    }

    const html = await response.text();
    const iconCandidates = extractIconCandidates(html, response.url);

    for (const candidate of iconCandidates) {
      if (await verifyAssetUrl(candidate.url)) {
        return {
          resolvedDomain: domain,
          logoUrl: candidate.url,
          logoSource: candidate.source,
          logoConfidence: candidate.confidence
        };
      }
    }
  } catch {
    // Fall through to derived logo fallback.
  }

  return {
    resolvedDomain: domain,
    logoUrl: `https://logo.clearbit.com/${domain}`,
    logoSource: "clearbit",
    logoConfidence: 0.58
  };
}

async function enrichCompanyInternal(companySlug: string): Promise<CompanyEnrichmentResult | null> {
  const db = getPlatformDatabase();
  ensureCompanyEnrichmentSchema(db);

  const company = findCompanyBySlug(companySlug);
  if (!company) {
    return null;
  }

  const cached = getCachedEnrichment(db, companySlug);
  if (cached) {
    const checkedAge = Date.now() - new Date(cached.checkedAt).getTime();
    if (Number.isFinite(checkedAge) && checkedAge >= 0 && checkedAge < COMPANY_ENRICHMENT_TTL_MS) {
      return cached;
    }
  }

  const checkedAt = nowIsoTimestamp();

  try {
    const assets = await resolveOfficialAssets(company.website);
    const wikipedia = company.wikipediaSummary ? null : await fetchWikipediaSummary(company.name);
    const result: CompanyEnrichmentResult = {
      resolvedDomain: assets.resolvedDomain,
      logoUrl: assets.logoUrl,
      logoSource: assets.logoSource,
      logoConfidence: assets.logoConfidence,
      wikipediaSummary: wikipedia?.summary ?? company.wikipediaSummary ?? null,
      wikipediaSourceUrl: wikipedia?.sourceUrl ?? company.wikipediaSourceUrl ?? null,
      checkedAt,
      lastError: null
    };

    db.prepare(
      `INSERT INTO company_enrichment_cache (
        company_slug, resolved_domain, logo_url, logo_source, logo_confidence,
        wikipedia_summary, wikipedia_source_url, checked_at, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(company_slug) DO UPDATE SET
        resolved_domain = excluded.resolved_domain,
        logo_url = excluded.logo_url,
        logo_source = excluded.logo_source,
        logo_confidence = excluded.logo_confidence,
        wikipedia_summary = excluded.wikipedia_summary,
        wikipedia_source_url = excluded.wikipedia_source_url,
        checked_at = excluded.checked_at,
        last_error = NULL`
    ).run(
      companySlug,
      result.resolvedDomain,
      result.logoUrl,
      result.logoSource,
      result.logoConfidence,
      result.wikipediaSummary,
      result.wikipediaSourceUrl,
      result.checkedAt
    );

    const shouldReplaceLogo =
      (!company.logo || company.logo.includes("logo.clearbit.com")) &&
      Boolean(result.logoUrl) &&
      result.logoConfidence >= 0.58;

    db.prepare(
      `UPDATE companies
       SET logo = CASE WHEN ? = 1 THEN ? ELSE logo END,
           wikipedia_summary = COALESCE(wikipedia_summary, ?),
           wikipedia_source_url = COALESCE(wikipedia_source_url, ?),
           resolved_domain = COALESCE(?, resolved_domain),
           logo_source = COALESCE(?, logo_source),
           logo_confidence = CASE WHEN ? = 1 THEN ? ELSE COALESCE(logo_confidence, 0) END,
           checked_recently_at = ?
       WHERE slug = ?`
    ).run(
      shouldReplaceLogo ? 1 : 0,
      result.logoUrl,
      result.wikipediaSummary,
      result.wikipediaSourceUrl,
      result.resolvedDomain,
      result.logoSource,
      shouldReplaceLogo ? 1 : 0,
      result.logoConfidence,
      checkedAt,
      companySlug
    );

    if (result.logoUrl && result.logoConfidence >= 0.58) {
      db.prepare(
        `UPDATE job_candidates
         SET logo_url = CASE WHEN logo_url IS NULL OR COALESCE(logo_confidence, 0) <= ? THEN ? ELSE logo_url END,
             logo_source = CASE WHEN logo_url IS NULL OR COALESCE(logo_confidence, 0) <= ? THEN ? ELSE logo_source END,
             logo_confidence = CASE WHEN logo_url IS NULL OR COALESCE(logo_confidence, 0) <= ? THEN ? ELSE logo_confidence END,
             company_domain = COALESCE(company_domain, ?),
             updated_at = ?
         WHERE company_slug = ?`
      ).run(
        result.logoConfidence,
        result.logoUrl,
        result.logoConfidence,
        result.logoSource,
        result.logoConfidence,
        result.logoConfidence,
        result.resolvedDomain,
        checkedAt,
        companySlug
      );

      db.prepare(
        `UPDATE jobs
         SET logo_url = CASE WHEN logo_url IS NULL OR COALESCE(logo_confidence, 0) <= ? THEN ? ELSE logo_url END,
             logo_source = CASE WHEN logo_url IS NULL OR COALESCE(logo_confidence, 0) <= ? THEN ? ELSE logo_source END,
             logo_confidence = CASE WHEN logo_url IS NULL OR COALESCE(logo_confidence, 0) <= ? THEN ? ELSE logo_confidence END,
             company_domain = COALESCE(company_domain, ?),
             checked_recently_at = COALESCE(checked_recently_at, ?),
             updated_at = ?
         WHERE company_slug = ?`
      ).run(
        result.logoConfidence,
        result.logoUrl,
        result.logoConfidence,
        result.logoSource,
        result.logoConfidence,
        result.logoConfidence,
        result.resolvedDomain,
        checkedAt,
        checkedAt,
        companySlug
      );
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "company_enrichment_failed";
    db.prepare(
      `INSERT INTO company_enrichment_cache (company_slug, checked_at, last_error)
       VALUES (?, ?, ?)
       ON CONFLICT(company_slug) DO UPDATE SET checked_at = excluded.checked_at, last_error = excluded.last_error`
    ).run(companySlug, checkedAt, message);

    return {
      resolvedDomain: extractDomain(company.website),
      logoUrl: null,
      logoSource: null,
      logoConfidence: 0,
      wikipediaSummary: company.wikipediaSummary ?? null,
      wikipediaSourceUrl: company.wikipediaSourceUrl ?? null,
      checkedAt,
      lastError: message
    };
  }
}

export function scheduleCompanyEnrichment(companySlug: string) {
  if (!companySlug) {
    return Promise.resolve(null);
  }

  const current = enrichmentInFlight.get(companySlug);
  if (current) {
    return current;
  }

  const task = enrichCompanyInternal(companySlug).finally(() => {
    enrichmentInFlight.delete(companySlug);
  });

  enrichmentInFlight.set(companySlug, task);
  return task;
}
