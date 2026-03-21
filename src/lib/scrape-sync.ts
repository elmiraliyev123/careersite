import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { Job } from "@/data/platform";
import { createLocalizedText, getPrimaryLocalizedText, normalizeLocalizedText } from "@/lib/localized-content";
import { listCompanies, upsertScrapedJob } from "@/lib/platform-database";
import { scrapeSources, type ScrapeSource } from "@/lib/scrape-config";
import type { JobInput } from "@/lib/platform-validation";

const execFileAsync = promisify(execFile);
const azMonthMap = new Map([
  ["yanvar", 0],
  ["fevral", 1],
  ["mart", 2],
  ["aprel", 3],
  ["may", 4],
  ["iyun", 5],
  ["iyul", 6],
  ["avqust", 7],
  ["sentyabr", 8],
  ["oktyabr", 9],
  ["noyabr", 10],
  ["dekabr", 11]
]);

type ScrapedJobRecord = {
  job_title?: string | null;
  company_name?: string | null;
  job_url?: string | null;
  location?: string | null;
  publication_or_deadline_date?: string | null;
};

type ScrapeRunResult = {
  source: ScrapeSource;
  jobs: ScrapedJobRecord[];
  stdout: string;
};

type UnmatchedCompany = {
  name: string;
  sources: string[];
  sampleTitles: string[];
};

export type ScrapeSyncResult = {
  dryRun: boolean;
  importedCount: number;
  updatedCount: number;
  matchedCount: number;
  totalScraped: number;
  sources: Array<{
    name: string;
    url: string;
    scrapedCount: number;
  }>;
  importedJobs: Array<{
    title: string;
    companyName: string;
    sourceName: string;
    action: "created" | "updated" | "preview";
  }>;
  unmatchedCompanies: UnmatchedCompany[];
  errors: string[];
};

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeCompanyName(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(llc|ltd|inc|plc|company|group)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolvePythonBinary() {
  const candidates = [
    path.join(process.cwd(), ".venv", "bin", "python"),
    "python3",
    "python"
  ];

  const preferred = candidates.find((candidate) => candidate.includes(path.sep) && existsSync(candidate));
  return preferred ?? "python3";
}

async function runPythonScraper(source: ScrapeSource): Promise<ScrapeRunResult> {
  const outputPath = path.join(
    process.cwd(),
    "data",
    `scrape-${source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`
  );

  const pythonBinary = resolvePythonBinary();
  const scriptPath = path.join(process.cwd(), "scrape_youth_jobs.py");
  const { stdout } = await execFileAsync(
    pythonBinary,
    [scriptPath, source.url, "--output", outputPath, "--timeout", "25"],
    {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 8
    }
  );

  const raw = await fs.readFile(outputPath, "utf8");
  const parsed = JSON.parse(raw);

  return {
    source,
    jobs: Array.isArray(parsed) ? (parsed as ScrapedJobRecord[]) : [],
    stdout: stdout.trim()
  };
}

function inferLevel(title: string): Job["level"] {
  const folded = title.toLowerCase();

  if (folded.includes("trainee")) {
    return "Trainee";
  }

  if (folded.includes("yeni məzun")) {
    return "Yeni məzun";
  }

  if (folded.includes("junior") || folded.includes("asistent")) {
    return "Junior";
  }

  return "Təcrübə";
}

function inferCategory(title: string) {
  const folded = title.toLowerCase();

  if (folded.includes("data") || folded.includes("analyst") || folded.includes("analytics")) {
    return createLocalizedText("Data və analitika", "Data & Analytics", "Данные и аналитика");
  }

  if (folded.includes("marketing") || folded.includes("brand")) {
    return createLocalizedText("Marketinq", "Marketing", "Маркетинг");
  }

  if (folded.includes("frontend") || folded.includes("backend") || folded.includes("developer") || folded.includes("engineer")) {
    return createLocalizedText("Mühəndislik", "Engineering", "Инженерия");
  }

  if (folded.includes("sales")) {
    return createLocalizedText("Satış", "Sales", "Продажи");
  }

  if (folded.includes("design")) {
    return createLocalizedText("Dizayn", "Design", "Дизайн");
  }

  if (folded.includes("cx") || folded.includes("customer")) {
    return createLocalizedText("Müştəri təcrübəsi", "Customer Experience", "Клиентский опыт");
  }

  if (folded.includes("risk") || folded.includes("aktuari")) {
    return createLocalizedText("Risk və sığorta", "Risk & Insurance", "Риск и страхование");
  }

  return createLocalizedText("Əməliyyatlar", "Operations", "Операции");
}

function inferWorkModel(title: string, location: string | null | undefined): Job["workModel"] {
  const folded = `${title} ${location ?? ""}`.toLowerCase();

  if (folded.includes("remote") || folded.includes("uzaqdan")) {
    return "Uzaqdan";
  }

  if (folded.includes("hybrid") || folded.includes("hibrid")) {
    return "Hibrid";
  }

  return "Hibrid";
}

function inferCity(location: string | null | undefined) {
  const normalized = normalizeText(location);

  if (!normalized) {
    return "Bakı";
  }

  if (normalized.toLowerCase().includes("baku") || normalized.toLowerCase().includes("bakı")) {
    return "Bakı";
  }

  return normalized.split(",")[0]?.trim() || normalized;
}

function subtractDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function parseRelativeDate(value: string) {
  const folded = value.toLowerCase();
  const match = folded.match(/(\d+)\s+(hour|hours|day|days|week|weeks|month|months)\s+ago/);

  if (!match) {
    if (folded.includes("yesterday")) {
      return subtractDays(1);
    }
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit.startsWith("hour")) {
    return subtractDays(0);
  }

  if (unit.startsWith("day")) {
    return subtractDays(amount);
  }

  if (unit.startsWith("week")) {
    return subtractDays(amount * 7);
  }

  return subtractDays(amount * 30);
}

function parseAbsoluteAzDate(value: string) {
  const match = value.toLowerCase().match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = azMonthMap.get(match[2]);
  const year = Number(match[3]);

  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) {
    return null;
  }

  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function normalizePostedAt(rawValue: string | null | undefined) {
  const value = normalizeText(rawValue);

  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const relative = parseRelativeDate(value);
  if (relative) {
    return relative;
  }

  const absolute = parseAbsoluteAzDate(value);
  if (absolute) {
    return absolute;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

function computeDeadline(postedAt: string) {
  const date = new Date(postedAt);
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function buildSummary(title: string, companyName: string, sourceName: string) {
  return createLocalizedText(
    `${companyName} şirkətində açıq olan ${title} rolu ${sourceName} mənbəsindən sinxronlaşdırılıb və CareerApple youth feed-i üçün uyğunlaşdırılıb.`,
    `The ${title} role at ${companyName} was synced from ${sourceName} and adapted for the CareerApple youth feed.`,
    `Роль ${title} в ${companyName} была синхронизирована из ${sourceName} и адаптирована для ленты CareerApple.`
  );
}

function buildResponsibilities(title: string, category: ReturnType<typeof inferCategory>) {
  const categoryLabel = getPrimaryLocalizedText(category);

  return [
    `${categoryLabel} istiqamətində komanda tapşırıqlarını dəstəkləmək`,
    `${title} roluna uyğun gündəlik koordinasiya və hesabat axınında iştirak etmək`,
    "Mentor və komanda lead-lərdən gələn feedback əsasında işini iterasiya etmək"
  ];
}

function buildRequirements(level: Job["level"], category: ReturnType<typeof inferCategory>) {
  const categoryLabel = getPrimaryLocalizedText(category);

  return [
    `${categoryLabel} və ya əlaqəli sahədə baza bilikləri`,
    `${level} səviyyəsinə uyğun operativ öyrənmə və ünsiyyət bacarığı`,
    "Azərbaycan və ingilis dillərində aydın yazılı və şifahi ünsiyyət"
  ];
}

function buildBenefits(sourceName: string) {
  return [
    "Verified employer profili üzərindən görünürlük",
    "CareerApple-da gənclərə fokuslanan discovery axını",
    `${sourceName} mənbəsi ilə izlənən aktual elan bağlantısı`
  ];
}

function buildTags(title: string, sourceName: string, level: Job["level"], category: ReturnType<typeof inferCategory>) {
  const tags = [sourceName, level, getPrimaryLocalizedText(category), ...title.split(/[\s/()-]+/)];
  return Array.from(
    new Set(
      tags
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6)
    )
  );
}

function findMatchingCompanySlug(companyName: string | null | undefined) {
  const target = normalizeCompanyName(companyName ?? "");

  if (!target) {
    return null;
  }

  const candidates = listCompanies().map((company) => ({
    slug: company.slug,
    name: company.name,
    normalized: normalizeCompanyName(company.name)
  }));

  const exact = candidates.find((candidate) => candidate.normalized === target);
  if (exact) {
    return exact.slug;
  }

  const partialMatches = candidates
    .filter(
      (candidate) =>
        target.includes(candidate.normalized) || candidate.normalized.includes(target)
    )
    .sort((left, right) => right.normalized.length - left.normalized.length);

  return partialMatches[0]?.slug ?? null;
}

function pushUnmatchedCompany(
  registry: Map<string, { displayName: string; sources: Set<string>; titles: Set<string> }>,
  companyName: string,
  sourceName: string,
  title: string
) {
  const key = normalizeCompanyName(companyName) || companyName;
  const current = registry.get(key) ?? {
    displayName: companyName,
    sources: new Set<string>(),
    titles: new Set<string>()
  };
  current.sources.add(sourceName);
  current.titles.add(title);
  registry.set(key, current);
}

export async function syncScrapedJobs(options?: { dryRun?: boolean }): Promise<ScrapeSyncResult> {
  const dryRun = Boolean(options?.dryRun);
  const unmatchedCompanies = new Map<string, { displayName: string; sources: Set<string>; titles: Set<string> }>();
  const errors: string[] = [];
  const importedJobs: ScrapeSyncResult["importedJobs"] = [];
  const sourceSummaries: ScrapeSyncResult["sources"] = [];
  let totalScraped = 0;
  let matchedCount = 0;
  let importedCount = 0;
  let updatedCount = 0;

  for (const source of scrapeSources) {
    let scrapedCount = 0;

    try {
      const result = await runPythonScraper(source);
      scrapedCount = result.jobs.length;

      totalScraped += result.jobs.length;

      for (const job of result.jobs) {
        const title = normalizeText(job.job_title);
        const companyName = normalizeText(job.company_name);
        const sourceUrl = normalizeText(job.job_url);

        if (!title || !companyName || !sourceUrl) {
          continue;
        }

        const companySlug = findMatchingCompanySlug(companyName);

        if (!companySlug) {
          pushUnmatchedCompany(unmatchedCompanies, companyName, source.name, title);
          continue;
        }

        matchedCount += 1;

        const level = inferLevel(title);
        const category = inferCategory(title);
        const postedAt = normalizePostedAt(job.publication_or_deadline_date);
        const input: JobInput = {
          title: normalizeLocalizedText(title, "en"),
          companySlug,
          city: inferCity(job.location),
          workModel: inferWorkModel(title, job.location),
          level,
          category,
          postedAt,
          deadline: computeDeadline(postedAt),
          summary: buildSummary(title, companyName, source.name),
          responsibilities: buildResponsibilities(title, category),
          requirements: buildRequirements(level, category),
          benefits: buildBenefits(source.name),
          tags: buildTags(title, source.name, level, category),
          directCompanyUrl: listCompanies().find((company) => company.slug === companySlug)?.website,
          sourceName: source.name,
          sourceUrl
        };

        if (dryRun) {
          importedJobs.push({
            title,
            companyName,
            sourceName: source.name,
            action: "preview"
          });
          continue;
        }

        const syncResult = upsertScrapedJob(input);
        if (syncResult.item) {
          if (syncResult.action === "created") {
            importedCount += 1;
          } else {
            updatedCount += 1;
          }

          importedJobs.push({
            title,
            companyName,
            sourceName: source.name,
            action: syncResult.action
          });
        }
      }

      sourceSummaries.push({
        name: source.name,
        url: source.url,
        scrapedCount
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Naməlum scraping xətası";
      errors.push(`${source.name}: ${message}`);
      sourceSummaries.push({
        name: source.name,
        url: source.url,
        scrapedCount
      });
    }
  }

  return {
    dryRun,
    importedCount,
    updatedCount,
    matchedCount,
    totalScraped,
    sources: sourceSummaries,
    importedJobs: importedJobs.slice(0, 12),
    unmatchedCompanies: Array.from(unmatchedCompanies.values()).map((entry) => ({
      name: entry.displayName,
      sources: Array.from(entry.sources),
      sampleTitles: Array.from(entry.titles).slice(0, 3)
    })),
    errors
  };
}
