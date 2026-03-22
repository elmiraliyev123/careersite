CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 0,
  scraped_job_count INTEGER NOT NULL DEFAULT 0,
  enriched_company_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS raw_jobs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_url TEXT NOT NULL,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  location_text TEXT,
  description_text TEXT,
  posted_at TEXT,
  employment_type TEXT,
  company_site_hint TEXT,
  payload_json TEXT NOT NULL,
  scraped_at TEXT NOT NULL,
  UNIQUE (source_id, source_url),
  FOREIGN KEY (run_id) REFERENCES ingestion_runs(id)
);

CREATE TABLE IF NOT EXISTS raw_companies (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  official_domain TEXT,
  official_website_url TEXT,
  clearbit_logo_url TEXT,
  website_hint TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company_enrichments (
  id TEXT PRIMARY KEY,
  raw_company_id TEXT NOT NULL,
  wikipedia_summary TEXT,
  wikipedia_source_url TEXT,
  ai_category TEXT,
  ai_confidence REAL,
  ai_prompt_json TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (raw_company_id) REFERENCES raw_companies(id)
);

CREATE INDEX IF NOT EXISTS raw_jobs_run_idx ON raw_jobs(run_id);
CREATE INDEX IF NOT EXISTS raw_jobs_company_idx ON raw_jobs(company_name);
CREATE INDEX IF NOT EXISTS raw_companies_domain_idx ON raw_companies(official_domain);
