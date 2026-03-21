"use client";

import { useState } from "react";

type ScrapeSourceSummary = {
  name: string;
  url: string;
};

type ScrapeSyncPanelProps = {
  sources: ScrapeSourceSummary[];
};

type SyncResult = {
  message: string;
  dryRun: boolean;
  importedCount: number;
  updatedCount: number;
  matchedCount: number;
  totalScraped: number;
  importedJobs: Array<{
    title: string;
    companyName: string;
    sourceName: string;
    action: "created" | "updated" | "preview";
  }>;
  unmatchedCompanies: Array<{
    name: string;
    sources: string[];
    sampleTitles: string[];
  }>;
  errors: string[];
} | null;

export function ScrapeSyncPanel({ sources }: ScrapeSyncPanelProps) {
  const [result, setResult] = useState<SyncResult>(null);
  const [mode, setMode] = useState<"preview" | "sync" | null>(null);

  async function runSync(dryRun: boolean) {
    setMode(dryRun ? "preview" : "sync");

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dryRun })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Scrape əməliyyatı uğursuz oldu.");
      }

      setResult(payload);
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : "Scrape əməliyyatı uğursuz oldu.",
        dryRun,
        importedCount: 0,
        updatedCount: 0,
        matchedCount: 0,
        totalScraped: 0,
        importedJobs: [],
        unmatchedCompanies: [],
        errors: []
      });
    } finally {
      setMode(null);
    }
  }

  return (
    <section className="dashboard-panel admin-section">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Scrape sync</p>
          <h2>LinkedIn və lokal career platformalarından ən yeni elanları çək</h2>
        </div>
      </div>

      <p className="site-footer__copy">
        Sync yalnız mövcud company profili ilə match olan elanları import edir. Match olmayan
        company adları review üçün ayrıca göstərilir.
      </p>

      <div className="dashboard-list">
        {sources.map((source) => (
          <div key={source.name} className="dashboard-item">
            <div>
              <strong>{source.name}</strong>
              <span>{source.url}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cta-panel__actions">
        <button
          type="button"
          className="button button--ghost"
          disabled={mode !== null}
          onClick={() => void runSync(true)}
        >
          {mode === "preview" ? "Preview işləyir..." : "Preview et"}
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={mode !== null}
          onClick={() => void runSync(false)}
        >
          {mode === "sync" ? "Sync işləyir..." : "İmport et"}
        </button>
      </div>

      {result ? (
        <div className="stack-sm">
          <p className={`notice ${result.errors.length > 0 ? "notice--error" : "notice--success"}`}>
            {result.message}
          </p>

          <div className="dashboard-panel--stats">
            <article className="stat-card">
              <div>
                <strong>{result.totalScraped}</strong>
                <span>toplanan elan</span>
              </div>
            </article>
            <article className="stat-card">
              <div>
                <strong>{result.matchedCount}</strong>
                <span>uyğun şirkət</span>
              </div>
            </article>
            <article className="stat-card">
              <div>
                <strong>{result.importedCount + result.updatedCount}</strong>
                <span>{result.dryRun ? "preview nəticə" : "yaradıldı / yeniləndi"}</span>
              </div>
            </article>
          </div>

          {result.importedJobs.length > 0 ? (
            <div className="dashboard-list">
              {result.importedJobs.map((job) => (
                <div key={`${job.sourceName}-${job.title}-${job.companyName}`} className="dashboard-item">
                  <div>
                    <strong>{job.title}</strong>
                    <span>
                      {job.companyName} • {job.sourceName}
                    </span>
                  </div>
                  <span>{job.action}</span>
                </div>
              ))}
            </div>
          ) : null}

          {result.unmatchedCompanies.length > 0 ? (
            <div className="dashboard-list">
              {result.unmatchedCompanies.map((company) => (
                <div key={company.name} className="dashboard-item admin-item">
                  <div>
                    <strong>{company.name}</strong>
                    <span>{company.sources.join(", ")}</span>
                  </div>
                  <span>{company.sampleTitles.join(" • ")}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
