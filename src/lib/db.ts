import { getPgPool } from "./postgres";
import * as sqliteDb from "./platform-database";
import type { Company, Job } from "@/data/platform";
import { type CompanyInput, type JobInput } from "./platform-validation";

const isPg = !!process.env.DATABASE_URL;

if (isPg) {
  console.log("PostgreSQL adapter active");
} else if (process.env.NODE_ENV === "production") {
  console.warn("WARNING: DATABASE_URL is missing in production. SQLite fallback is disabled.");
} else {
  console.log("SQLite adapter active");
}

function shouldUseSqlite() {
  return !isPg && process.env.NODE_ENV !== "production";
}

// Re-export specific SQLite mapping logic we need for PG
import {
  parseLocalizedText,
  parseLocalizedTextList,
  getAllLocalizedTextValues,
} from "./localized-content";
import {
  deriveLocationFromEvidence,
  deriveWorkModelFromEvidence,
  getWorkModelDisplayValue,
  normalizeLocationName,
  normalizeRoleLevel,
} from "./ui-display";
import { isVerifiedRedirectTarget } from "./url-sanitizer";
import { normalizeJobModerationStatus } from "./moderation";

function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapPgCompanyRow(row: any): Company {
  const sector = row.sector || "";
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
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

function mapPgJobRow(row: any): Job {
  const canonicalApplyUrl = row.canonical_apply_url ?? row.resolved_apply_url ?? row.apply_url ?? undefined;
  const finalVerifiedUrl =
    (row.validation_status ?? "pending") === "verified" &&
    (row.apply_link_status ?? "broken") === "valid" &&
    isVerifiedRedirectTarget(canonicalApplyUrl)
      ? canonicalApplyUrl
      : undefined;
  const moderationStatus = normalizeJobModerationStatus(row.moderation_status, "published");
  const ctaDisabled = row.apply_cta_mode === "disabled" || row.apply_link_status === "broken" || !finalVerifiedUrl;
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
  const urlText = [row.source_url, row.source_listing_url, row.job_detail_url, row.apply_action_url, row.external_apply_url].filter(Boolean).join(" ");
  const location = deriveLocationFromEvidence({
    structuredLocation: row.location_normalized ?? row.location_raw ?? row.city,
    title: titleText,
    description: descriptionText,
    url: urlText
  });
  const workModelType = deriveWorkModelFromEvidence({
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
    categoryConfidence: typeof row.category_confidence === "number" ? row.category_confidence : undefined,
    categoryReason: row.category_reason ?? undefined,
    postedAt: row.posted_at ? new Date(row.posted_at).toISOString() : "",
    deadline: row.deadline ? new Date(row.deadline).toISOString() : "",
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
    checkedRecentlyAt: row.checked_recently_at ? new Date(row.checked_recently_at).toISOString() : undefined,
    lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at).toISOString() : (row.checked_recently_at ? new Date(row.checked_recently_at).toISOString() : undefined),
    freshnessStatus: row.freshness_status ?? undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
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
    moderationUpdatedAt: row.moderation_updated_at ? new Date(row.moderation_updated_at).toISOString() : undefined,
    internshipConfidence: typeof row.internship_confidence === "number" ? row.internship_confidence : undefined,
    classificationConfidence: typeof row.classification_confidence === "number" ? row.classification_confidence : undefined,
    classificationReason: row.classification_reason ?? undefined,
    searchKeywords: row.search_keywords ? parseList(row.search_keywords) : undefined,
    normalizedKeywords: row.normalized_keywords ? parseList(row.normalized_keywords) : undefined,
    sourceLanguage: row.source_language ?? undefined,
    rawLocation: row.location_raw ?? undefined,
    normalizedLocation: row.location_normalized ?? undefined,
    normalizedCity: location.city ?? undefined,
    locationSource: row.location_source ?? location.source,
    locationConfidence: typeof row.location_confidence === "number" ? Math.max(row.location_confidence, location.confidence) : location.confidence,
    duplicateRisk: typeof row.duplicate_risk === "number" ? row.duplicate_risk : undefined,
    logoUrl: row.logo_url ?? undefined,
    logoSource: row.logo_source ?? undefined,
    logoConfidence: typeof row.logo_confidence === "number" ? row.logo_confidence : undefined,
    directCompanyUrl: row.direct_company_url ?? undefined,
    firstSeenAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    sourcePostedAt: row.posted_at ? new Date(row.posted_at).toISOString() : undefined,
    needsReview: Boolean(row.needs_admin_review),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined
  };
}

export async function getJobs(options?: sqliteDb.ListJobsOptions): Promise<Job[]> {
  if (isPg) {
    const p = getPgPool();
    let query = "SELECT * FROM jobs WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if (!options?.includeUnpublished) {
       query += " AND publishable = 1 AND is_expired = 0";
    }
    if (options?.companySlug) {
      query += ` AND company_slug = $\${idx++}`;
      params.push(options.companySlug);
    }
    
    query += " ORDER BY posted_at DESC";
    if (options?.limit) {
       query += ` LIMIT $\${idx++}`;
       params.push(options.limit);
    }

    try {
      const { rows } = await p.query(query, params);
      return rows.map(mapPgJobRow);
    } catch (error) {
      console.error("PostgreSQL getJobs error:", error);
      return [];
    }
  }
  if (shouldUseSqlite()) {
    return Promise.resolve(sqliteDb.listJobs(options));
  }
  return Promise.resolve([]);
}

export async function getCompanies(options?: sqliteDb.ListCompaniesOptions): Promise<Company[]> {
  if (isPg) {
    const p = getPgPool();
    let query = "SELECT * FROM companies WHERE visible = 1 ORDER BY featured DESC, created_at DESC";
    const params: any[] = [];
    if (options?.limit) {
      query += " LIMIT $1";
      params.push(options.limit);
    }
    try {
      const { rows } = await p.query(query, params);
      return rows.map(mapPgCompanyRow);
    } catch (error) {
      console.error("PostgreSQL getCompanies error:", error);
      return [];
    }
  }
  if (shouldUseSqlite()) {
    return Promise.resolve(sqliteDb.listCompanies(options));
  }
  return Promise.resolve([]);
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  if (isPg) {
    const p = getPgPool();
    try {
      const { rows } = await p.query("SELECT * FROM jobs WHERE slug = $1", [slug]);
      return rows.length > 0 ? mapPgJobRow(rows[0]) : null;
    } catch (error) {
      console.error("PostgreSQL getJobBySlug error:", error);
      return null;
    }
  }
  if (shouldUseSqlite()) {
    return Promise.resolve(sqliteDb.findJobBySlug(slug) || null);
  }
  return Promise.resolve(null);
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  if (isPg) {
    const p = getPgPool();
    try {
      const { rows } = await p.query("SELECT * FROM companies WHERE slug = $1", [slug]);
      return rows.length > 0 ? mapPgCompanyRow(rows[0]) : null;
    } catch (error) {
      console.error("PostgreSQL getCompanyBySlug error:", error);
      return null;
    }
  }
  if (shouldUseSqlite()) {
    return Promise.resolve(sqliteDb.findCompanyBySlug(slug) || null);
  }
  return Promise.resolve(null);
}

export async function createJob(input: JobInput): Promise<any> {
  if (isPg) {
    const p = getPgPool();
    const titleObj = input.title as any;
    const titleText = typeof input.title === 'string' ? input.title : (titleObj?.en || titleObj?.az || '');
    const slug = titleText.toLowerCase().replace(/\\s+/g, '-') + '-' + Date.now().toString().slice(-4);
    await p.query(
      `INSERT INTO jobs (slug, title, company_slug, city, work_model, level, category, posted_at, deadline, summary, responsibilities, requirements, benefits, tags, apply_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        slug,
        JSON.stringify(input.title),
        input.companySlug,
        input.city,
        input.workModel,
        input.level,
        JSON.stringify(input.category),
        input.postedAt || new Date().toISOString(),
        input.deadline || new Date().toISOString(),
        JSON.stringify(input.summary),
        JSON.stringify(input.responsibilities || []),
        JSON.stringify(input.requirements || []),
        JSON.stringify(input.benefits || []),
        JSON.stringify(input.tags || []),
        input.applyUrl || ""
      ]
    );
    const { rows } = await p.query("SELECT * FROM jobs WHERE slug = $1", [slug]);
    return mapPgJobRow(rows[0]);
  }
  if (shouldUseSqlite()) {
    return Promise.resolve(sqliteDb.createJob(input));
  }
  throw new Error("DATABASE_URL is missing. Cannot write to database in production.");
}

export async function updateJob(slug: string, input: JobInput): Promise<any> {
  if (isPg) {
    const p = getPgPool();
    await p.query(
      `UPDATE jobs SET 
        title = $2, company_slug = $3, city = $4, work_model = $5, level = $6, category = $7, posted_at = $8, deadline = $9, summary = $10, responsibilities = $11, requirements = $12, benefits = $13, tags = $14, apply_url = $15, updated_at = CURRENT_TIMESTAMP
       WHERE slug = $1`,
      [
        slug,
        JSON.stringify(input.title),
        input.companySlug,
        input.city,
        input.workModel,
        input.level,
        JSON.stringify(input.category),
        input.postedAt,
        input.deadline,
        JSON.stringify(input.summary),
        JSON.stringify(input.responsibilities || []),
        JSON.stringify(input.requirements || []),
        JSON.stringify(input.benefits || []),
        JSON.stringify(input.tags || []),
        input.applyUrl || ""
      ]
    );
    const { rows } = await p.query("SELECT * FROM jobs WHERE slug = $1", [slug]);
    return mapPgJobRow(rows[0]);
  }
  if (shouldUseSqlite()) {
    return Promise.resolve(sqliteDb.updateJob(slug, input));
  }
  throw new Error("DATABASE_URL is missing. Cannot write to database in production.");
}

export async function createCompany(input: CompanyInput): Promise<any> {
  if (isPg) {
    const p = getPgPool();
    const slug = input.name.toLowerCase().replace(/\s+/g, '-');
    await p.query(
      `INSERT INTO companies (slug, name, tagline, sector, size, location, logo, cover, website, about, focus_areas, youth_offer, benefits, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        slug,
        input.name,
        input.tagline,
        input.sector,
        input.size,
        input.location,
        input.logo,
        input.cover || "",
        input.website,
        input.about,
        JSON.stringify(input.focusAreas || []),
        JSON.stringify(input.youthOffer || []),
        JSON.stringify(input.benefits || []),
        input.featured ? 1 : 0
      ]
    );
    const { rows } = await p.query("SELECT * FROM companies WHERE slug = $1", [slug]);
    return mapPgCompanyRow(rows[0]);
  }
  if (shouldUseSqlite()) {
    return Promise.resolve(sqliteDb.createCompany(input));
  }
  throw new Error("DATABASE_URL is missing. Cannot write to database in production.");
}

export async function updateCompany(slug: string, input: CompanyInput): Promise<any> {
  if (isPg) {
    const p = getPgPool();
    await p.query(
      `UPDATE companies SET 
        name = $2, tagline = $3, sector = $4, size = $5, location = $6, logo = $7, cover = $8, website = $9, about = $10, focus_areas = $11, youth_offer = $12, benefits = $13, featured = $14, updated_at = CURRENT_TIMESTAMP
       WHERE slug = $1`,
      [
        slug,
        input.name,
        input.tagline,
        input.sector,
        input.size,
        input.location,
        input.logo,
        input.cover || "",
        input.website,
        input.about,
        JSON.stringify(input.focusAreas || []),
        JSON.stringify(input.youthOffer || []),
        JSON.stringify(input.benefits || []),
        input.featured ? 1 : 0
      ]
    );
    const { rows } = await p.query("SELECT * FROM companies WHERE slug = $1", [slug]);
    return mapPgCompanyRow(rows[0]);
  }
  if (shouldUseSqlite()) {
    return Promise.resolve(sqliteDb.updateCompany(slug, input));
  }
  throw new Error("DATABASE_URL is missing. Cannot write to database in production.");
}

export async function saveScrapedJobs(jobs: any[]): Promise<void> {
  if (isPg) {
    // Basic implementation for saving scraped jobs to Postgres
    const p = getPgPool();
    for (const job of jobs) {
      await p.query(
        `INSERT INTO jobs (slug, title, company_slug, city, work_model, level, category, posted_at, deadline, summary, responsibilities, requirements, benefits, tags, apply_url, source_name, source_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (slug) DO NOTHING`,
        [
          job.slug || job.id,
          JSON.stringify(job.title || job.normalizedTitle),
          job.companySlug || 'unknown',
          job.city || 'Bakı',
          job.workModel || 'Hibrid',
          job.level || 'junior',
          JSON.stringify({ az: "Digər" }),
          new Date().toISOString(),
          new Date(Date.now() + 30 * 86400000).toISOString(),
          JSON.stringify({ az: job.description_raw || "" }),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          job.applyUrl || job.sourceListingUrl || "",
          job.sourceName || "",
          job.sourceListingUrl || ""
        ]
      );
    }
    return;
  }
  if (shouldUseSqlite()) {
    // Pipeline logic handles sqlite writes directly elsewhere, but if called here it would be a no-op
  }
  return Promise.resolve();
}

export async function saveAiEnrichment(jobSlug: string, enrichmentData: any): Promise<void> {
  if (isPg) {
    const p = getPgPool();
    await p.query(
      `UPDATE jobs SET 
        internship_confidence = $2, 
        location_confidence = $3, 
        rejection_category = $4
       WHERE slug = $1`,
      [
        jobSlug,
        enrichmentData.internshipConfidence || 0,
        enrichmentData.locationConfidence || 0,
        enrichmentData.rejectionCategory || null
      ]
    );
    return;
  }
  return Promise.resolve();
}
