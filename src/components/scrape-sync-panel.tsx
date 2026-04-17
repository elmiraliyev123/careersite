"use client";

import { useEffect, useState } from "react";

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
  run?: {
    id: string;
    status: string;
    queuedCount: number;
    processedCount: number;
    publishedCount: number;
    rejectedCount: number;
    duplicateCount: number;
    errorCount: number;
  } | null;
} | null;

export function ScrapeSyncPanel({ sources }: ScrapeSyncPanelProps) {
  const [result, setResult] = useState<SyncResult>(null);
  const [mode, setMode] = useState<"preview" | "sync" | null>(null);

  useEffect(() => {
    if (!result?.run?.id) {
      return undefined;
    }

    if (!["queued", "running"].includes(result.run.status)) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/scrape?runId=${encodeURIComponent(result.run?.id ?? "")}`, {
            cache: "no-store"
          });
          const payload = await response.json();

          if (!response.ok || !payload.run) {
            return;
          }

          setResult((current) =>
            current
              ? {
                  ...current,
                  run: payload.run,
                  importedCount: payload.run.publishedCount,
                  message:
                    payload.run.status === "completed" || payload.run.status === "completed_with_errors"
                      ? "Yeniləmə tamamlandı."
                      : "Yeniləmə fon emalında davam edir."
                }
              : current
          );
        } catch {
          // Ignore transient polling errors. Manual refresh remains available.
        }
      })();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [result?.run?.id, result?.run?.status]);

  function getActionLabel(action: "created" | "updated" | "preview") {
    if (action === "created") {
      return "yaradıldı";
    }

    if (action === "updated") {
      return "yeniləndi";
    }

    return "öncədən baxış";
  }

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
        throw new Error(payload.message ?? "Yeniləmə əməliyyatı uğursuz oldu.");
      }

      setResult(payload);
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : "Yeniləmə əməliyyatı uğursuz oldu.",
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
          <p className="eyebrow">Məlumat yenilə</p>
          <h2>Seçilmiş platformalardan ən yeni elanları yenilə</h2>
        </div>
      </div>

      <p className="site-footer__copy">
        Yeniləmə yalnız uyğun şirkətlə əlaqələnən elanları əlavə edir. Uyğunlaşmayan şirkət adları
        ayrıca göstərilir ki, komanda onları rahat nəzərdən keçirə bilsin.
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
          {mode === "preview" ? "Öncədən baxış hazırlanır..." : "Öncədən bax"}
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={mode !== null}
          onClick={() => void runSync(false)}
        >
          {mode === "sync" ? "Yenilənir..." : "Yenilə"}
        </button>
      </div>

      {result ? (
        <div className="stack-sm">
          <p className={`notice ${result.errors.length > 0 ? "notice--error" : "notice--success"}`}>
            {result.message}
          </p>

          {result.run ? (
            <p className="site-footer__copy">
              Run status: <strong>{result.run.status}</strong> • {result.run.processedCount}/{result.run.queuedCount} emal olundu
            </p>
          ) : null}

          <div className="dashboard-panel--stats">
            <article className="stat-card">
              <div>
                <strong>{result.totalScraped}</strong>
                <span>tapılan elan</span>
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
                <span>{result.dryRun ? "öncədən baxış" : "yayımlanan elan"}</span>
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
                  <span>{getActionLabel(job.action)}</span>
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
