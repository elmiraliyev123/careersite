import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  companies as seedCompanies,
  jobApplyUrlOverrides,
  jobs as seedJobs,
  type Company,
  type Job
} from "@/data/platform";
import {
  getAllLocalizedTextValues,
  getPrimaryLocalizedText,
  parseLocalizedText,
  parseLocalizedTextList,
  serializeLocalizedText,
  serializeLocalizedTextList
} from "@/lib/localized-content";
import type { CompanyInput, JobInput } from "@/lib/platform-validation";

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
  about: string;
  wikipedia_summary: string | null;
  wikipedia_source_url: string | null;
  focus_areas: string;
  youth_offer: string;
  benefits: string;
  featured: number;
  created_at: string | null;
  updated_at: string | null;
};

type JobRow = {
  slug: string;
  title: string;
  company_slug: string;
  city: string;
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
  source_url: string | null;
  apply_url: string | null;
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

const databaseDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(databaseDirectory, "careerapple.sqlite");
const legacyStorePath = path.join(databaseDirectory, "platform-store.json");

let database: DatabaseSync | null = null;
let initialized = false;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowIsoTimestamp() {
  return new Date().toISOString();
}

function ensureDatabaseDirectory() {
  if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
  }
}

function getDatabase() {
  ensureDatabaseDirectory();

  if (!database) {
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON");
  }

  if (!initialized) {
    setupDatabase(database);
    initialized = true;
  }

  return database;
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
      about TEXT NOT NULL,
      wikipedia_summary TEXT,
      wikipedia_source_url TEXT,
      focus_areas TEXT NOT NULL,
      youth_offer TEXT NOT NULL,
      benefits TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
    CREATE INDEX IF NOT EXISTS companies_featured_idx ON companies(featured);
    CREATE INDEX IF NOT EXISTS outbound_events_created_at_idx ON outbound_events(created_at);
  `);

  ensureColumnExists(db, "companies", "wikipedia_summary", "TEXT");
  ensureColumnExists(db, "companies", "wikipedia_source_url", "TEXT");
  ensureColumnExists(db, "companies", "industry_tags", "TEXT");
  ensureColumnExists(db, "jobs", "source_name", "TEXT");
  ensureColumnExists(db, "jobs", "source_url", "TEXT");
  ensureColumnExists(db, "jobs", "apply_url", "TEXT");
  ensureColumnExists(db, "jobs", "direct_company_url", "TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_url_unique_idx ON jobs(source_url) WHERE source_url IS NOT NULL");
  seedBaseData(db);
  migrateLegacyStore(db);
  backfillApplyUrls(db);
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
  return ["Təcrübə", "Junior", "Trainee", "Yeni məzun"].includes(level);
}

function mapCompanyRow(row: CompanyRow): Company {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    sector: row.sector,
    industryTags: row.industry_tags ? parseList(row.industry_tags) : [row.sector],
    size: row.size,
    location: row.location,
    logo: row.logo,
    cover: row.cover,
    website: row.website,
    about: row.about,
    wikipediaSummary: row.wikipedia_summary ?? undefined,
    wikipediaSourceUrl: row.wikipedia_source_url ?? undefined,
    focusAreas: parseList(row.focus_areas),
    youthOffer: parseList(row.youth_offer),
    benefits: parseList(row.benefits),
    featured: Boolean(row.featured),
    createdAt: row.created_at ?? undefined
  };
}

function mapJobRow(row: JobRow): Job {
  return {
    slug: row.slug,
    title: parseLocalizedText(row.title),
    companySlug: row.company_slug,
    city: row.city,
    workModel: row.work_model as Job["workModel"],
    level: row.level as Job["level"],
    category: parseLocalizedText(row.category),
    postedAt: row.posted_at,
    deadline: row.deadline,
    summary: parseLocalizedText(row.summary),
    responsibilities: parseList(row.responsibilities),
    requirements: parseList(row.requirements),
    benefits: parseList(row.benefits),
    tags: parseLocalizedTextList(row.tags),
    featured: Boolean(row.featured),
    sourceName: row.source_name ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    applyUrl: row.apply_url ?? undefined,
    directCompanyUrl: row.direct_company_url ?? undefined,
    createdAt: row.created_at ?? undefined
  };
}

function insertCompanyRecord(db: DatabaseSync, company: Company) {
  db.prepare(
    `INSERT INTO companies (
      slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, about,
      wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      about = excluded.about,
      wikipedia_summary = excluded.wikipedia_summary,
      wikipedia_source_url = excluded.wikipedia_source_url,
      focus_areas = excluded.focus_areas,
      youth_offer = excluded.youth_offer,
      benefits = excluded.benefits,
      featured = excluded.featured,
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
    company.about,
    company.wikipediaSummary ?? null,
    company.wikipediaSourceUrl ?? null,
    serializeList(company.focusAreas),
    serializeList(company.youthOffer),
    serializeList(company.benefits),
    company.featured ? 1 : 0,
    company.createdAt ?? todayIsoDate(),
    company.createdAt ?? todayIsoDate()
  );
}

function insertJobRecord(db: DatabaseSync, job: Job) {
  db.prepare(
    `INSERT INTO jobs (
      slug, title, company_slug, city, work_model, level, category,
      posted_at, deadline, summary, responsibilities, requirements,
      benefits, tags, featured, source_name, source_url, apply_url, direct_company_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      source_url = excluded.source_url,
      apply_url = excluded.apply_url,
      direct_company_url = excluded.direct_company_url,
      updated_at = excluded.updated_at`
  ).run(
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
    job.sourceUrl ?? null,
    job.applyUrl ?? null,
    job.directCompanyUrl ?? null,
    job.createdAt ?? todayIsoDate(),
    job.createdAt ?? todayIsoDate()
  );
}

function seedBaseData(db: DatabaseSync) {
  for (const company of seedCompanies) {
    insertCompanyRecord(db, company);
  }

  for (const job of seedJobs) {
    insertJobRecord(db, {
      ...job,
      featured: Boolean(job.featured)
    });
  }

  if (readMetadataValue(db, "seed_v1_complete") !== "1") {
    writeMetadataValue(db, "seed_v1_complete", "1");
  }
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

function backfillApplyUrls(db: DatabaseSync) {
  const statement = db.prepare(
    `UPDATE jobs
     SET apply_url = ?, updated_at = ?
     WHERE slug = ? AND (apply_url IS NULL OR trim(apply_url) = '')`
  );

  for (const [slug, applyUrl] of Object.entries(jobApplyUrlOverrides)) {
    statement.run(applyUrl, nowIsoTimestamp(), slug);
  }
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
       WHEN ? = 1 AND level IN ('Təcrübə', 'Junior', 'Trainee', 'Yeni məzun') THEN 1
       ELSE 0
     END
     WHERE company_slug = ?`
  ).run(companyFeatured ? 1 : 0, companySlug);
}

export function listCompanies() {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, about,
              wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, created_at, updated_at
       FROM companies
       ORDER BY featured DESC, created_at DESC, name ASC`
    )
    .all() as CompanyRow[];

  return rows.map(mapCompanyRow);
}

export function listJobs() {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT slug, title, company_slug, city, work_model, level, category, posted_at, deadline,
              summary, responsibilities, requirements, benefits, tags, featured, source_name, source_url, apply_url,
              direct_company_url,
              created_at, updated_at
       FROM jobs
       ORDER BY posted_at DESC, created_at DESC, title ASC`
    )
    .all() as JobRow[];

  return rows.map(mapJobRow);
}

export function findCompanyBySlug(slug: string) {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, about,
              wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, created_at, updated_at
       FROM companies
       WHERE slug = ?`
    )
    .get(slug) as CompanyRow | undefined;

  return row ? mapCompanyRow(row) : undefined;
}

export function findJobBySlug(slug: string) {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT slug, title, company_slug, city, work_model, level, category, posted_at, deadline,
              summary, responsibilities, requirements, benefits, tags, featured, source_name, source_url, apply_url,
              direct_company_url,
              created_at, updated_at
       FROM jobs
       WHERE slug = ?`
    )
    .get(slug) as JobRow | undefined;

  return row ? mapJobRow(row) : undefined;
}

export function createCompany(input: CompanyInput) {
  const db = getDatabase();
  const slug = nextUniqueSlug(input.name, "companies");
  const createdAt = input.createdAt ?? todayIsoDate();

  db.prepare(
    `INSERT INTO companies (
      slug, name, tagline, sector, industry_tags, size, location, logo, cover, website, about,
      wikipedia_summary, wikipedia_source_url, focus_areas, youth_offer, benefits, featured, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    input.about,
    input.wikipediaSummary ?? null,
    input.wikipediaSourceUrl ?? null,
    serializeList(input.focusAreas),
    serializeList(input.youthOffer),
    serializeList(input.benefits),
    input.featured ? 1 : 0,
    createdAt,
    createdAt
  );

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
         website = ?, about = ?, wikipedia_summary = ?, wikipedia_source_url = ?, focus_areas = ?, youth_offer = ?,
         benefits = ?, featured = ?, updated_at = ?
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
    input.about,
    input.wikipediaSummary ?? null,
    input.wikipediaSourceUrl ?? null,
    serializeList(input.focusAreas),
    serializeList(input.youthOffer),
    serializeList(input.benefits),
    input.featured ? 1 : 0,
    todayIsoDate(),
    slug
  );

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

  db.prepare(
    `INSERT INTO jobs (
      slug, title, company_slug, city, work_model, level, category, posted_at, deadline,
      summary, responsibilities, requirements, benefits, tags, featured, source_name, source_url,
      apply_url, direct_company_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
    input.applyUrl ?? null,
    input.directCompanyUrl ?? company.website,
    createdAt,
    createdAt
  );

  return findJobBySlug(slug);
}

export function updateJob(slug: string, input: JobInput) {
  const db = getDatabase();
  const current = findJobBySlug(slug);

  if (!current) {
    return null;
  }

  const company = findCompanyBySlug(input.companySlug);

  if (!company) {
    return null;
  }

  const featured = Boolean(company.featured) && isYouthLevel(input.level);

  db.prepare(
    `UPDATE jobs
     SET title = ?, company_slug = ?, city = ?, work_model = ?, level = ?, category = ?, posted_at = ?,
         deadline = ?, summary = ?, responsibilities = ?, requirements = ?, benefits = ?, tags = ?,
         featured = ?, source_name = ?, source_url = ?, apply_url = ?, direct_company_url = ?, updated_at = ?
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
    input.applyUrl ?? null,
    input.directCompanyUrl ?? company.website,
    todayIsoDate(),
    slug
  );

  return findJobBySlug(slug);
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

  if (existingSlug) {
    return {
      action: "updated" as const,
      item: updateJob(existingSlug, input)
    };
  }

  return {
    action: "created" as const,
    item: createJob(input)
  };
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
