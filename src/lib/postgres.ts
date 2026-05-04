import { Pool } from "pg";

let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function initPostgres() {
  const p = getPgPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      tagline TEXT DEFAULT '',
      description TEXT,
      sector TEXT DEFAULT '',
      industry_tags TEXT,
      size TEXT DEFAULT '',
      location TEXT DEFAULT '',
      country_city TEXT,
      logo TEXT DEFAULT '',
      logo_url TEXT,
      cover TEXT DEFAULT '',
      cover_image_url TEXT,
      website TEXT DEFAULT '',
      profile_source_url TEXT,
      source_url TEXT,
      company_domain TEXT,
      domain TEXT,
      about TEXT DEFAULT '',
      wikipedia_summary TEXT,
      wikipedia_source_url TEXT,
      focus_areas TEXT DEFAULT '[]',
      youth_offer TEXT DEFAULT '[]',
      benefits TEXT DEFAULT '[]',
      featured INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 1,
      visible INTEGER DEFAULT 1,
      hidden INTEGER DEFAULT 0,
      visibility TEXT DEFAULT 'visible',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
      company_slug TEXT,
      company_name TEXT,
      company_domain TEXT,
      city TEXT DEFAULT '',
      location TEXT,
      location_raw TEXT,
      location_normalized TEXT,
      location_source TEXT,
      work_model TEXT DEFAULT '',
      level TEXT DEFAULT 'unknown',
      experience_level TEXT,
      category TEXT DEFAULT '',
      employment_type TEXT,
      posted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      published_at TIMESTAMPTZ,
      deadline TIMESTAMPTZ,
      summary TEXT DEFAULT '',
      description TEXT,
      responsibilities TEXT DEFAULT '[]',
      requirements TEXT DEFAULT '[]',
      benefits TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      featured INTEGER DEFAULT 0,
      source_name TEXT,
      source_kind TEXT,
      source_url TEXT,
      source_domain TEXT,
      source_listing_url TEXT,
      job_detail_url TEXT,
      apply_action_url TEXT,
      candidate_apply_urls_json TEXT,
      external_apply_url TEXT,
      resolved_apply_url TEXT,
      canonical_apply_url TEXT,
      apply_url TEXT,
      apply_link_status TEXT,
      apply_link_score REAL DEFAULT 0,
      apply_link_kind TEXT,
      apply_cta_mode TEXT,
      apply_link_reason TEXT,
      verified_apply INTEGER DEFAULT 0,
      official_source INTEGER DEFAULT 0,
      checked_recently_at TIMESTAMPTZ,
      last_checked_at TIMESTAMPTZ,
      freshness_status TEXT,
      expires_at TIMESTAMPTZ,
      is_expired INTEGER DEFAULT 0,
      trust_badges TEXT,
      trust_score REAL DEFAULT 0,
      publishable INTEGER DEFAULT 1,
      status TEXT DEFAULT 'published',
      published INTEGER DEFAULT 1,
      archived INTEGER DEFAULT 0,
      hidden INTEGER DEFAULT 0,
      validation_status TEXT DEFAULT 'pending',
      needs_admin_review INTEGER DEFAULT 0,
      scrape_error TEXT,
      direct_company_url TEXT,
      moderation_status TEXT DEFAULT 'published',
      moderation_notes TEXT,
      moderation_updated_at TIMESTAMPTZ,
      internship_confidence REAL DEFAULT 0,
      location_confidence REAL DEFAULT 0,
      classification_confidence REAL DEFAULT 0,
      classification_reason TEXT,
      search_keywords TEXT,
      normalized_keywords TEXT,
      source_language TEXT,
      category_confidence REAL DEFAULT 0,
      category_reason TEXT,
      duplicate_risk REAL DEFAULT 0,
      rejection_reason TEXT,
      rejection_category TEXT,
      ai_summary TEXT,
      ai_tags TEXT,
      ai_level TEXT,
      logo_url TEXT,
      logo_source TEXT,
      logo_confidence REAL DEFAULT 0,
      first_seen_at TIMESTAMPTZ,
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title VARCHAR NOT NULL,
      content TEXT NOT NULL,
      slug VARCHAR UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR UNIQUE NOT NULL,
      password_hash VARCHAR NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_aliases (
      company_slug TEXT NOT NULL,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL,
      domain_hint TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (company_slug, normalized_alias)
    );

    CREATE TABLE IF NOT EXISTS outbound_events (
      id BIGSERIAL PRIMARY KEY,
      target_url TEXT NOT NULL,
      company_name TEXT NOT NULL,
      source_path TEXT,
      referrer TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cms_documents (
      id TEXT PRIMARY KEY,
      draft_data TEXT NOT NULL,
      published_data TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE companies ADD COLUMN IF NOT EXISTS id BIGSERIAL;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS country_city TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_url TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS domain TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS hidden INTEGER DEFAULT 0;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'visible';

    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS id BIGSERIAL;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id BIGINT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_name TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_domain TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_domain TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published INTEGER DEFAULT 1;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS archived INTEGER DEFAULT 0;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hidden INTEGER DEFAULT 0;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_summary TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_tags TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_level TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS jobs_company_slug_idx ON jobs(company_slug);
    CREATE INDEX IF NOT EXISTS jobs_public_active_idx ON jobs(publishable, validation_status, apply_link_status, is_expired, deadline);
    CREATE INDEX IF NOT EXISTS jobs_moderation_status_idx ON jobs(moderation_status);
    CREATE INDEX IF NOT EXISTS jobs_deadline_idx ON jobs(deadline);
    CREATE INDEX IF NOT EXISTS jobs_posted_created_idx ON jobs(posted_at DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS companies_visible_featured_idx ON companies(visible, featured);
    CREATE INDEX IF NOT EXISTS companies_sector_idx ON companies(sector);
  `);
}
