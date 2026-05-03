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
      slug VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      tagline VARCHAR NOT NULL,
      sector VARCHAR NOT NULL,
      industry_tags TEXT,
      size VARCHAR NOT NULL,
      location VARCHAR NOT NULL,
      logo VARCHAR NOT NULL,
      cover VARCHAR NOT NULL,
      website VARCHAR NOT NULL,
      profile_source_url TEXT,
      company_domain VARCHAR,
      about TEXT NOT NULL,
      wikipedia_summary TEXT,
      wikipedia_source_url TEXT,
      focus_areas TEXT NOT NULL,
      youth_offer TEXT NOT NULL,
      benefits TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 1,
      visible INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      slug VARCHAR PRIMARY KEY,
      title TEXT NOT NULL,
      company_slug VARCHAR NOT NULL REFERENCES companies(slug) ON DELETE CASCADE,
      city VARCHAR NOT NULL,
      work_model VARCHAR NOT NULL,
      level VARCHAR NOT NULL,
      category TEXT NOT NULL,
      posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
      deadline TIMESTAMP WITH TIME ZONE NOT NULL,
      summary TEXT NOT NULL,
      responsibilities TEXT NOT NULL,
      requirements TEXT NOT NULL,
      benefits TEXT NOT NULL,
      tags TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      source_name VARCHAR,
      source_url TEXT,
      apply_url TEXT,
      direct_company_url TEXT,
      moderation_status VARCHAR NOT NULL DEFAULT 'published',
      moderation_notes TEXT,
      moderation_updated_at TIMESTAMP WITH TIME ZONE,
      internship_confidence REAL NOT NULL DEFAULT 0,
      location_confidence REAL NOT NULL DEFAULT 0,
      duplicate_risk REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      source_kind VARCHAR,
      source_listing_url TEXT,
      job_detail_url TEXT,
      apply_action_url TEXT,
      candidate_apply_urls_json TEXT,
      external_apply_url TEXT,
      resolved_apply_url TEXT,
      canonical_apply_url TEXT,
      apply_link_status VARCHAR,
      apply_link_score REAL NOT NULL DEFAULT 0,
      apply_link_kind VARCHAR,
      apply_cta_mode VARCHAR,
      apply_link_reason TEXT,
      verified_apply INTEGER NOT NULL DEFAULT 0,
      official_source INTEGER NOT NULL DEFAULT 0,
      checked_recently_at TIMESTAMP WITH TIME ZONE,
      last_checked_at TIMESTAMP WITH TIME ZONE,
      freshness_status VARCHAR,
      expires_at TIMESTAMP WITH TIME ZONE,
      is_expired INTEGER NOT NULL DEFAULT 0,
      trust_badges TEXT,
      trust_score REAL NOT NULL DEFAULT 0,
      publishable INTEGER NOT NULL DEFAULT 1,
      validation_status VARCHAR NOT NULL DEFAULT 'pending',
      needs_admin_review INTEGER NOT NULL DEFAULT 0,
      scrape_error TEXT,
      location_raw TEXT,
      location_normalized TEXT,
      location_source VARCHAR,
      classification_confidence REAL NOT NULL DEFAULT 0,
      classification_reason TEXT,
      search_keywords TEXT,
      normalized_keywords TEXT,
      source_language VARCHAR,
      category_confidence REAL NOT NULL DEFAULT 0,
      category_reason TEXT,
      rejection_reason TEXT,
      rejection_category TEXT,
      logo_url TEXT,
      logo_source VARCHAR,
      logo_confidence REAL NOT NULL DEFAULT 0
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
  `);
}
