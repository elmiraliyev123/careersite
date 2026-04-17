/**
 * Source Adapters
 *
 * Bridges source-specific acquisition mechanisms into the deterministic extraction layer.
 * Adapters never invent URLs. They only map source-provided records into ExtractedJobRecord
 * and let the validator decide whether detail/apply URLs are trustworthy.
 */

import type { RawIngestedJob } from "@/lib/job-intelligence";
import type { ScrapeSource } from "@/lib/scrape-config";
import { validateExtractedJobRecords } from "@/lib/candidate-job-url-validator";
import {
  extractFromJsonLd,
  extractFromAnchors,
  toRawIngestedJob,
  type ExtractedJobRecord,
  type ExtractionRunResult
} from "@/lib/job-extractor";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

type ScrapeRunResult = {
  source: ScrapeSource;
  jobs: RawIngestedJob[];
  extraction: ExtractionRunResult;
};

type SourceAdapterRunOptions = {
  validateUrls?: boolean;
};

const AZ_MONTHS: Record<string, string> = {
  yanvar: "01",
  fevral: "02",
  mart: "03",
  aprel: "04",
  may: "05",
  iyun: "06",
  iyul: "07",
  avqust: "08",
  sentyabr: "09",
  oktyabr: "10",
  noyabr: "11",
  dekabr: "12"
};

function makeExtraction(source: ScrapeSource, records: ExtractedJobRecord[], error: string | null): ExtractionRunResult {
  return {
    source_id: source.id,
    source_name: source.name,
    source_url: source.feedUrl ?? source.crawlUrl ?? source.url,
    adapter: source.adapter,
    extracted_at: new Date().toISOString(),
    records,
    error
  };
}

function finalizeValidatedRecords(source: ScrapeSource, records: ExtractedJobRecord[], error: string | null): ScrapeRunResult {
  const extraction = makeExtraction(source, records, error);
  const jobs: RawIngestedJob[] = records.map((record) =>
    toRawIngestedJob(record, source.kind, {
      trustTier: source.trustTier,
      adapter: source.adapter,
      sourceId: source.id,
      companySiteHint: source.url
    })
  );

  return { source, jobs, extraction };
}

function dedupeExtractedRecords(records: ExtractedJobRecord[]) {
  return Array.from(
    new Map(
      records.map((record) => [
        record.scraped_detail_url ?? record.scraped_apply_url ?? `${record.source_reference_url}::${record.title}`,
        record
      ])
    ).values()
  );
}

function safeRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string | null | undefined) {
  return stripHtml(value ?? "");
}

function snippetize(value: string | null | undefined, maxLen = 300) {
  const clean = cleanText(value);
  if (!clean) {
    return null;
  }

  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
}

function absoluteUrl(candidate: string | null | undefined, baseUrl: string) {
  if (!candidate?.trim()) {
    return null;
  }

  try {
    return new URL(decodeHtmlEntities(candidate.trim()), baseUrl).toString();
  } catch {
    return null;
  }
}

function toIsoDateString(value: string | null | undefined) {
  const input = cleanText(value);
  if (!input) {
    return null;
  }

  const numericMatch = input.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (numericMatch) {
    const [, day, month, year] = numericMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const lower = input.toLowerCase();
  const monthMatch = lower.match(/\b(\d{1,2})\s+([a-zəğıöüşç]+)\s+(\d{4})\b/i);
  if (monthMatch) {
    const [, day, monthRaw, year] = monthMatch;
    const month = AZ_MONTHS[monthRaw];
    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function isPastDate(value: string | null | undefined) {
  const iso = toIsoDateString(value);
  if (!iso) {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  return iso < today;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function toIsoDate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = value > 10_000_000_000 ? value : value * 1000;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function extractLocationFromFeed(record: Record<string, unknown>) {
  const locationRecord = safeRecord(record.location);
  const categoriesRecord = safeRecord(record.categories);

  return (
    pickString(
      locationRecord?.name,
      categoriesRecord?.location,
      record.location,
      record.workplace,
      record.city
    ) ?? null
  );
}

function extractEmploymentTypeFromFeed(record: Record<string, unknown>) {
  const categoriesRecord = safeRecord(record.categories);

  return pickString(
    categoriesRecord?.commitment,
    record.commitment,
    record.employment_type,
    record.workType,
    record.type,
    record.term
  );
}

function extractDescriptionFromFeed(record: Record<string, unknown>) {
  return pickString(
    record.descriptionPlain,
    record.description_plain,
    record.description,
    record.content,
    record.additionalPlain,
    record.additional
  );
}

function extractPostedAtFromFeed(record: Record<string, unknown>, source: ScrapeSource) {
  if (source.feedProvider === "lever") {
    return (
      toIsoDate(record.createdAt) ??
      toIsoDate(record.created_at) ??
      toIsoDate(record.updatedAt) ??
      toIsoDate(record.updated_at)
    );
  }

  return (
    toIsoDate(record.updated_at) ??
    toIsoDate(record.updatedAt) ??
    toIsoDate(record.first_published) ??
    toIsoDate(record.createdAt) ??
    toIsoDate(record.postedAt) ??
    toIsoDate(record.created_at) ??
    toIsoDate(record.begin_date)
  );
}

function extractCompanyNameFromFeed(record: Record<string, unknown>, source: ScrapeSource) {
  const categoriesRecord = safeRecord(record.categories);
  return (
    source.companyNameOverride ??
    pickString(
      record.company_name,
      record.company,
      categoriesRecord?.team,
      categoriesRecord?.department
    ) ??
    source.name
  );
}

function sortAndLimitRecords(source: ScrapeSource, records: ExtractedJobRecord[]) {
  const sorted = [...records].sort((left, right) => {
    const rightDate = typeof right._debug.date_posted === "string" ? right._debug.date_posted : "";
    const leftDate = typeof left._debug.date_posted === "string" ? left._debug.date_posted : "";
    return rightDate.localeCompare(leftDate);
  });

  return source.maxRecordsPerRun && source.maxRecordsPerRun > 0
    ? sorted.slice(0, source.maxRecordsPerRun)
    : sorted;
}

function buildRecord(
  source: ScrapeSource,
  extractionMethod: string,
  foundOnUrl: string,
  data: {
    title: string | null;
    companyName?: string | null;
    location?: string | null;
    description?: string | null;
    detailUrl?: string | null;
    applyUrl?: string | null;
    datePosted?: string | null;
    category?: string | null;
    employmentType?: string | null;
    extraDebug?: Record<string, unknown>;
  }
): ExtractedJobRecord | null {
  const title = cleanText(data.title);
  if (!title) {
    return null;
  }

  const detailUrl = absoluteUrl(data.detailUrl, foundOnUrl);
  const applyUrl = absoluteUrl(data.applyUrl, foundOnUrl);
  const candidateUrls = Array.from(new Set([detailUrl, applyUrl].filter((value): value is string => Boolean(value))));

  return {
    title,
    company_name: cleanText(data.companyName) || source.companyNameOverride || source.name,
    location: cleanText(data.location) || null,
    description_snippet: snippetize(data.description),
    source_reference_url: foundOnUrl,
    scraped_detail_url: detailUrl,
    scraped_apply_url: applyUrl,
    candidate_urls: candidateUrls,
    source_platform: source.name,
    scrape_status:
      detailUrl || applyUrl
        ? "ok"
        : "error",
    scrape_error:
      detailUrl || applyUrl
        ? null
        : "source_record_missing_job_urls",
    _debug: {
      extraction_method: extractionMethod,
      date_posted: data.datePosted ?? null,
      category: cleanText(data.category) || null,
      employment_type: cleanText(data.employmentType) || null,
      seed_source_url: source.url,
      crawl_source_url: foundOnUrl,
      ...data.extraDebug
    }
  };
}

function extractPortalVacancyList(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /<a\s+href="([^"]+)"[^>]*>\s*<div class="vacancy-list-block">([\s\S]*?)<\/div>\s*<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const detailUrl = match[1];
    const block = match[2];
    const title = cleanText(
      block.match(/<div class="vacancy-list-block-header">([\s\S]*?)<\/div>/i)?.[1] ?? ""
    );
    const labels = Array.from(
      block.matchAll(/<label[^>]*>\s*(?:<i[^>]*><\/i>)?\s*([\s\S]*?)<\/label>/gi),
      (entry) => cleanText(entry[1])
    ).filter(Boolean);
    const deadlineText = cleanText(
      block.match(/fa-hourglass-end[^>]*><\/i>\s*([\s\S]*?)<\/label>/i)?.[1] ?? ""
    );

    if (deadlineText && isPastDate(deadlineText)) {
      continue;
    }

    const record = buildRecord(source, "portal_vacancy_list", foundOnUrl, {
      title,
      detailUrl,
      location: labels[1] ?? null,
      category: labels[0] ?? null,
      datePosted: toIsoDateString(deadlineText),
      extraDebug: {
        deadline_raw: deadlineText
      }
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractUnibankGlorriAccordion(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /<div class="accordion__header">[\s\S]*?<p class="vacancy__name">([\s\S]*?)<\/p>[\s\S]*?<span class="vacancy__date">([\s\S]*?)<\/span>[\s\S]*?<a href="(https:\/\/glorri\.com\/unibank\/[^"]+)"/gi;

  for (const match of html.matchAll(pattern)) {
    const title = cleanText(match[1]);
    const deadlineText = cleanText(match[2]).replace(/^Son müraciət tarixi:\s*/i, "");
    const applyUrl = match[3];

    if (deadlineText && isPastDate(deadlineText)) {
      continue;
    }

    const record = buildRecord(source, "unibank_glorri_accordion", foundOnUrl, {
      title,
      applyUrl,
      datePosted: toIsoDateString(deadlineText),
      extraDebug: {
        deadline_raw: deadlineText
      }
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractXalqbankGlorriList(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /<a href="(https:\/\/glorri\.com\/xalqbank\/[^"]+)"[^>]*class="vacancies__item"[^>]*>\s*<span class="vacancies__category">([\s\S]*?)<\/span>\s*<h2 class="vacancies__title">([\s\S]*?)<\/h2>\s*<span class="vacancies__location">([\s\S]*?)<\/span>\s*<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const applyUrl = match[1];
    const category = cleanText(match[2]);
    const title = cleanText(match[3]);
    const location = cleanText(match[4]);

    const record = buildRecord(source, "xalqbank_glorri_list", foundOnUrl, {
      title,
      location,
      applyUrl,
      category
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractAzerpostGlorriProp(source: ScrapeSource, html: string, foundOnUrl: string) {
  const payloadMatch = html.match(/:vacancies="([^"]+)"/);
  if (!payloadMatch) {
    return [];
  }

  try {
    const payload = JSON.parse(decodeHtmlEntities(payloadMatch[1])) as Array<Record<string, unknown>>;
    const records: ExtractedJobRecord[] = [];

    for (const item of payload) {
      const record = buildRecord(source, "azerpost_glorri_prop", foundOnUrl, {
        title: pickString(item.title),
        applyUrl: pickString(item.link),
        extraDebug: {
          source_job_id: pickString(item.id),
          embedded_listing_url: pickString(item.url)
        }
      });

      if (record) {
        records.push(record);
      }
    }

    return records;
  } catch {
    return [];
  }
}

function extractJobs2WebSearchResults(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const rowPattern = /<tr class="data-row">([\s\S]*?)<\/tr>/gi;

  for (const match of html.matchAll(rowPattern)) {
    const row = match[1];
    const titleMatch = row.match(/<a href="([^"]+)" class="jobTitle-link">([\s\S]*?)<\/a>/i);
    if (!titleMatch) {
      continue;
    }

    const facility = cleanText(row.match(/<td class="colFacility[^"]*"[^>]*>\s*<span class="jobFacility">([\s\S]*?)<\/span>/i)?.[1] ?? "");
    const department = cleanText(
      row.match(/<td class="colDepartment[^"]*"[^>]*>\s*<span class="jobDepartment">([\s\S]*?)<\/span>/i)?.[1] ?? ""
    );
    const location = cleanText(
      row.match(/<td class="colLocation[^"]*"[^>]*>[\s\S]*?<span class="jobLocation">([\s\S]*?)<\/span>/i)?.[1] ?? ""
    );

    const record = buildRecord(source, "jobs2web_search_results", foundOnUrl, {
      title: titleMatch[2],
      companyName: facility || null,
      detailUrl: titleMatch[1],
      location: location || null,
      category: department || null,
      extraDebug: {
        source_facility: facility || null,
        source_department: department || null
      }
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractAzercosmosCollapsible(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /<div class="collapsible[^"]*">[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<div class="collapser[^"]*"><p>([\s\S]*?)<\/p><a href="([^"]+)"/gi;

  for (const match of html.matchAll(pattern)) {
    const record = buildRecord(source, "azercosmos_collapsible", foundOnUrl, {
      title: match[1],
      description: match[2],
      detailUrl: match[3]
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractAzergoldTable(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const rowPattern =
    /<tr>\s*<td>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/td>\s*<td>\s*<a href="[^"]+">([\s\S]*?)<\/a>\s*<\/td>\s*<td>\s*<a href="[^"]+">([\s\S]*?)<\/a>\s*<\/td>\s*<td>\s*<a href="[^"]+">([\s\S]*?)<\/a>\s*<\/td>\s*<td>\s*<a href="[^"]+">([\s\S]*?)<\/a>\s*<\/td>\s*<\/tr>/gi;

  for (const match of html.matchAll(rowPattern)) {
    const deadlineText = cleanText(match[6]);
    if (deadlineText && isPastDate(deadlineText)) {
      continue;
    }

    const record = buildRecord(source, "azergold_table", foundOnUrl, {
      title: match[2],
      detailUrl: match[1],
      location: match[4],
      datePosted: toIsoDateString(match[5]),
      extraDebug: {
        opening_count_raw: cleanText(match[3]),
        deadline_raw: deadlineText,
        updated_at_raw: cleanText(match[5])
      }
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractYeloVacanciesList(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /<a href="([^"]*\/about-bank\/vacancies\/\?vacancy=[^"]+)" class="vac_item">\s*<b>([\s\S]*?)<\/b>\s*<p>([\s\S]*?)<\/p>\s*<p>([\s\S]*?)<\/p>\s*<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const record = buildRecord(source, "yelo_vacancies_list", foundOnUrl, {
      detailUrl: match[1],
      title: match[2],
      location: match[3],
      employmentType: match[4]
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractAkkordArticleList(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /<article>\s*<h3>([\s\S]*?)<\/h3>\s*<time>([\s\S]*?)<\/time>[\s\S]*?<a href="([^"]+)"[^>]*><\/a>[\s\S]*?<a href="[^"]+" class="full_link"><\/a>\s*<\/article>/gi;

  for (const match of html.matchAll(pattern)) {
    const record = buildRecord(source, "akkord_article_list", foundOnUrl, {
      title: match[1],
      detailUrl: match[3],
      datePosted: toIsoDateString(match[2]),
      extraDebug: {
        listed_at_raw: cleanText(match[2])
      }
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractAzerconnectVacancies(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /<div class="CollapsibleItem_item__[^"]*">[\s\S]*?<div class="CollapsibleItem_toggle__[^"]*">\s*<span>([\s\S]*?)<\/span>[\s\S]*?<div class="CollapsibleItem_content__[^"]*">[\s\S]*?<div class="Vacancy_tableWrapper__[^"]*">([\s\S]*?)<\/div>\s*<a href="([^"]+)"/gi;

  for (const match of html.matchAll(pattern)) {
    const description = match[2];
    const deadlineRaw = cleanText(
      description.match(/(?:Deadline(?:\s+to\s+apply)?|Deadline to apply)\s*:?<\/strong>\s*([^<]+)/i)?.[1] ??
        description.match(/Deadline\s*:\s*([^<\n]+)/i)?.[1] ??
        ""
    );

    if (deadlineRaw && isPastDate(deadlineRaw)) {
      continue;
    }

    const record = buildRecord(source, "azerconnect_vacancies", foundOnUrl, {
      title: match[1],
      description,
      applyUrl: match[3],
      datePosted: toIsoDateString(deadlineRaw),
      extraDebug: {
        deadline_raw: deadlineRaw || null
      }
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractBravoVacancyList(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /<article>\s*<h3>([\s\S]*?)<\/h3>\s*<footer>\s*<p>([\s\S]*?)<\/p>\s*<time>([\s\S]*?)<\/time>\s*<\/footer>\s*<a href="([^"]+)" class="full_link"><\/a>\s*<\/article>/gi;

  for (const match of html.matchAll(pattern)) {
    const title = cleanText(match[1]);
    const location = cleanText(match[2]);

    if (!title || /^(azərbaycan|english|russian)$/i.test(title)) {
      continue;
    }

    const record = buildRecord(source, "bravo_vacancy_list", foundOnUrl, {
      title,
      location: location || null,
      detailUrl: match[4],
      datePosted: toIsoDateString(match[3]),
      extraDebug: {
        listed_at_raw: cleanText(match[3]) || null
      }
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractGlorriCompanyVacancies(source: ScrapeSource, html: string, foundOnUrl: string) {
  const records: ExtractedJobRecord[] = [];
  const pattern =
    /href="(\/vacancies\/oba\/[^"]+)">[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p class="truncate text-sm[^"]*">([\s\S]*?)<\/p>[\s\S]*?<p class="text-sm text-neutral-60">([\d-]+)<\/p>/gi;

  for (const match of html.matchAll(pattern)) {
    const meta = cleanText(match[3]);
    const location = meta.replace(/^OBA Market MMC\s*[●•]?\s*/i, "").trim() || null;

    const record = buildRecord(source, "glorri_company_vacancies", foundOnUrl, {
      title: match[2],
      detailUrl: match[1],
      location,
      datePosted: toIsoDateString(match[4]),
      extraDebug: {
        company_meta_raw: meta,
        listed_at_raw: cleanText(match[4])
      }
    });

    if (record) {
      records.push(record);
    }
  }

  return records;
}

function extractWithSourceHtmlParser(source: ScrapeSource, html: string, foundOnUrl: string) {
  switch (source.htmlParser) {
    case "portal-vacancy-list":
      return extractPortalVacancyList(source, html, foundOnUrl);
    case "unibank-glorri-accordion":
      return extractUnibankGlorriAccordion(source, html, foundOnUrl);
    case "xalqbank-glorri-list":
      return extractXalqbankGlorriList(source, html, foundOnUrl);
    case "azerpost-glorri-prop":
      return extractAzerpostGlorriProp(source, html, foundOnUrl);
    case "jobs2web-search-results":
      return extractJobs2WebSearchResults(source, html, foundOnUrl);
    case "azercosmos-collapsible":
      return extractAzercosmosCollapsible(source, html, foundOnUrl);
    case "azergold-table":
      return extractAzergoldTable(source, html, foundOnUrl);
    case "yelo-vacancies-list":
      return extractYeloVacanciesList(source, html, foundOnUrl);
    case "akkord-article-list":
      return extractAkkordArticleList(source, html, foundOnUrl);
    case "azerconnect-vacancies":
      return extractAzerconnectVacancies(source, html, foundOnUrl);
    case "bravo-vacancy-list":
      return extractBravoVacancyList(source, html, foundOnUrl);
    case "glorri-company-vacancies":
      return extractGlorriCompanyVacancies(source, html, foundOnUrl);
    default:
      return [];
  }
}

function extractRecordsFromOfficialFeed(payload: unknown, source: ScrapeSource): ExtractedJobRecord[] {
  const root = safeRecord(payload);
  const collection = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.jobs)
      ? root.jobs
      : Array.isArray(root?.postings)
        ? root.postings
        : Array.isArray(root?.data)
          ? root.data
        : Array.isArray(root?.results)
          ? root.results
          : [];

  if (!Array.isArray(collection)) {
    return [];
  }

  const records: ExtractedJobRecord[] = [];

  for (const item of collection) {
    const record = safeRecord(item);
    if (!record) {
      continue;
    }

    const title = pickString(record.title, record.text, record.name);
    const scrapedDetailUrl = pickString(record.absolute_url, record.hostedUrl, record.url);
    const scrapedApplyUrl = pickString(record.applyUrl);
    const candidateUrls = [scrapedDetailUrl, scrapedApplyUrl].filter((value): value is string => Boolean(value));

    if (!title) {
      continue;
    }

    records.push({
      title,
      company_name: extractCompanyNameFromFeed(record, source),
      location: extractLocationFromFeed(record),
      description_snippet: extractDescriptionFromFeed(record),
      source_reference_url: source.url,
      scraped_detail_url: scrapedDetailUrl,
      scraped_apply_url: scrapedApplyUrl,
      candidate_urls: candidateUrls,
      source_platform: source.name,
      scrape_status:
        scrapedDetailUrl || scrapedApplyUrl
          ? "ok"
          : candidateUrls.length > 0
            ? "partial"
            : "error",
      scrape_error:
        scrapedDetailUrl || scrapedApplyUrl
          ? null
          : candidateUrls.length > 0
            ? "official_feed_without_direct_detail"
            : "official_feed_missing_job_urls",
      _debug: {
        extraction_method: source.feedProvider === "lever" ? "lever_feed" : source.feedProvider === "greenhouse" ? "greenhouse_feed" : "official_feed",
        date_posted: extractPostedAtFromFeed(record, source),
        employment_type: extractEmploymentTypeFromFeed(record),
        source_job_id: pickString(record.id, record.jobId, record.req_id, record.requisitionId),
        raw_feed_record: record
      }
    });
  }

  return sortAndLimitRecords(source, records);
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      Accept: "application/json,text/plain;q=0.8,*/*;q=0.5"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json();
}

function buildGlorriEmbedDetailUrl(input: {
  companyDomain: string;
  lang: string;
  jobId: string;
  title: string;
}) {
  const encodedTitle = encodeURI(input.title.split("/").join("+"));
  return `https://glorri.com/${input.lang}/${input.companyDomain}/${input.jobId}-${encodedTitle}?source=Company`;
}

async function extractRecordsFromGlorriEmbedFeed(payload: unknown, source: ScrapeSource) {
  const companyId = source.feedCompanyId?.trim();
  if (!companyId) {
    return [];
  }

  const [companyDomainRaw, companyLangRaw] = await Promise.all([
    fetchJson(`https://api.glorri.com/integration-service/companies/${companyId}/slug`),
    fetchJson(`https://api.glorri.com/integration-service/companies/${companyId}/lang`)
  ]);
  const companyDomain =
    typeof companyDomainRaw === "string" ? companyDomainRaw.replace(/^"|"$/g, "").trim() : "";
  const defaultLang =
    typeof companyLangRaw === "string" ? companyLangRaw.replace(/^"|"$/g, "").trim().slice(0, 2) : "";

  if (!companyDomain) {
    return [];
  }

  const collection = Array.isArray(payload) ? payload : [];
  const records: ExtractedJobRecord[] = [];

  for (const item of collection) {
    const record = safeRecord(item);
    if (!record) {
      continue;
    }

    const title = pickString(record.title, record.text, record.name);
    const jobId = pickString(record.id);
    const languageEntries = Array.isArray(record.languages)
      ? record.languages.map((entry) => safeRecord(entry)).filter((entry): entry is Record<string, unknown> => Boolean(entry))
      : [];
    const languageWithPublishedStatus =
      languageEntries.find((entry) => pickString(entry.language) && Number(entry.status) === 2) ?? null;
    const jobLang = pickString(languageWithPublishedStatus?.language, defaultLang, "az");

    if (!title || !jobId || !jobLang) {
      continue;
    }

    const scrapedDetailUrl = buildGlorriEmbedDetailUrl({
      companyDomain,
      lang: jobLang,
      jobId,
      title
    });

    records.push({
      title,
      company_name: source.companyNameOverride ?? source.name,
      location: extractLocationFromFeed(record),
      description_snippet: extractDescriptionFromFeed(record),
      source_reference_url: source.url,
      scraped_detail_url: scrapedDetailUrl,
      scraped_apply_url: null,
      candidate_urls: [scrapedDetailUrl],
      source_platform: source.name,
      scrape_status: "ok",
      scrape_error: null,
      _debug: {
        extraction_method: "glorri_embed_feed",
        date_posted: extractPostedAtFromFeed(record, source),
        employment_type: extractEmploymentTypeFromFeed(record),
        source_job_id: jobId,
        feed_company_id: companyId,
        feed_company_domain: companyDomain,
        detail_url_evidence: "official_glorri_embed_script_template",
        raw_feed_record: record
      }
    });
  }

  return sortAndLimitRecords(source, records);
}

/**
 * Fetch a source URL with HTML discovery and extract job records deterministically.
 * Returns both the raw extraction result (for debugging/inspection) and
 * the converted RawIngestedJob[] for pipeline ingestion.
 */
export async function runHtmlDiscoverySource(
  source: ScrapeSource,
  options?: SourceAdapterRunOptions
): Promise<ScrapeRunResult> {
  const fetchUrl = source.crawlUrl ?? source.url;
  const response = await fetch(fetchUrl, {
    headers: DEFAULT_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const extraction = makeExtraction(source, [], `http_${response.status}`);

    throw Object.assign(
      new Error(`html_discovery_http_${response.status}`),
      { extraction }
    );
  }

  const html = await response.text();
  const parsedRecords = source.htmlParser
    ? extractWithSourceHtmlParser(source, html, fetchUrl)
    : [];

  // Step 1: Deterministic extraction — JSON-LD first, anchors as fallback
  const jsonLdRecords = parsedRecords.length === 0
    ? extractFromJsonLd(html, fetchUrl, source.name, source.companyNameOverride)
    : [];
  const records: ExtractedJobRecord[] =
    parsedRecords.length > 0
      ? parsedRecords
      : jsonLdRecords.length > 0
      ? jsonLdRecords
      : extractFromAnchors(html, fetchUrl, source.name, source.companyNameOverride);

  const deduped = dedupeExtractedRecords(records);
  const outputRecords = options?.validateUrls ? await validateExtractedJobRecords(deduped) : deduped;

  return finalizeValidatedRecords(source, outputRecords, null);
}

export async function runJsonFeedSource(
  source: ScrapeSource,
  options?: SourceAdapterRunOptions
): Promise<ScrapeRunResult> {
  let payload: unknown;
  try {
    payload = await fetchJson(source.feedUrl ?? source.url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid_json_feed";
    const extraction = makeExtraction(source, [], reason);
    throw Object.assign(new Error(reason), { extraction });
  }

  let extractedRecords: ExtractedJobRecord[];
  try {
    extractedRecords =
      source.feedProvider === "glorri-embed"
        ? await extractRecordsFromGlorriEmbedFeed(payload, source)
        : extractRecordsFromOfficialFeed(payload, source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "feed_extraction_failed";
    const extraction = makeExtraction(source, [], reason);
    throw Object.assign(new Error(reason), { extraction });
  }

  const deduped = dedupeExtractedRecords(extractedRecords);
  const outputRecords = options?.validateUrls ? await validateExtractedJobRecords(deduped) : deduped;
  return finalizeValidatedRecords(source, outputRecords, null);
}

export async function runSourceAdapter(
  source: ScrapeSource,
  options?: SourceAdapterRunOptions
): Promise<ScrapeRunResult> {
  if (source.policy === "restricted" || source.sourceType === "restricted-source") {
    throw new Error(source.restrictedReason ?? source.disabledReason ?? "restricted_source");
  }

  if (source.adapter === "json-feed") {
    return runJsonFeedSource(source, options);
  }

  return runHtmlDiscoverySource(source, options);
}
