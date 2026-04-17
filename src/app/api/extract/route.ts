import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/session";
import { getEnabledScrapeSources, type ScrapeSource } from "@/lib/scrape-config";
import { type ExtractionRunResult } from "@/lib/job-extractor";
import { runSourceAdapter } from "@/lib/source-adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/extract
 *
 * Deterministic extraction preview.
 * Fetches source pages, extracts job records, and returns the raw
 * extraction result WITHOUT pipeline processing, classification, or
 * URL verification.
 *
 * Query params:
 *   sourceId — optional, extract from a single source
 *   limit — max records per source (default 50)
 */
export async function GET(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json(
      { message: "Admin session required." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const sourceId = url.searchParams.get("sourceId");
  const limit = Math.min(
    Number(url.searchParams.get("limit") ?? 50),
    200
  );

  const sources = getEnabledScrapeSources().filter((s) =>
    (s.adapter === "html-discovery" || s.adapter === "json-feed") && (!sourceId || s.id === sourceId)
  );

  if (sources.length === 0) {
    return NextResponse.json(
      {
        message: sourceId
          ? `No preview-capable source found with id "${sourceId}".`
          : "No preview-capable discovery sources enabled.",
        available_sources: getEnabledScrapeSources().map((s) => ({
          id: s.id,
          name: s.name,
          adapter: s.adapter
        }))
      },
      { status: 404 }
    );
  }

  const results: ExtractionRunResult[] = [];

  for (const source of sources) {
    try {
      const run = await extractSingleSource(source, limit);
      results.push(run);
    } catch (error) {
      results.push({
        source_id: source.id,
        source_name: source.name,
        source_url: source.url,
        adapter: source.adapter,
        extracted_at: new Date().toISOString(),
        records: [],
        error: error instanceof Error ? error.message : "extraction_failed"
      });
    }
  }

  const totalRecords = results.reduce((sum, r) => sum + r.records.length, 0);
  const statusBreakdown = {
    ok: 0,
    partial: 0,
    error: 0
  };

  for (const run of results) {
    for (const record of run.records) {
      statusBreakdown[record.scrape_status] += 1;
    }
  }

  return NextResponse.json({
    extracted_at: new Date().toISOString(),
    source_count: results.length,
    total_records: totalRecords,
    status_breakdown: statusBreakdown,
    results
  });
}

async function extractSingleSource(
  source: ScrapeSource,
  limit: number
): Promise<ExtractionRunResult> {
  const result = await runSourceAdapter(source);
  return {
    ...result.extraction,
    records: result.extraction.records.slice(0, limit)
  };
}
