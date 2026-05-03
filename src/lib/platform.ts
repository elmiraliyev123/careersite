import { type Company, type Job } from "@/data/platform";
import {
  createLocalizedText,
  getAllLocalizedTextValues,
  getAllLocalizedTextValuesFromList,
  localizedTextIncludes
} from "@/lib/localized-content";
import { formatLocalizedDate } from "@/lib/i18n";
import {
  countPublicCompanies,
  countPublicJobs,
  countPublicJobsByCompanySlugs,
  hasPublicJobForCompany,
} from "@/lib/platform-database";
import { getJobs as dbGetJobs, getCompanies as dbGetCompanies, getJobBySlug as dbGetJobBySlug, getCompanyBySlug as dbGetCompanyBySlug } from "@/lib/db";
import type { ListJobsOptions } from "@/lib/platform-database";
import { matchesExpandedQuery, normalizeSearchText } from "@/lib/search-normalization";
import {
  deriveWorkModelFromEvidence,
  getWorkModelDisplayValue,
  getMeaningfulMetadataValue,
  isAllFilterValue,
  normalizeComparableValue,
  normalizeJobLevel,
  normalizeLocationName,
  normalizeRoleFilterValue,
  normalizeWorkModelValue
} from "@/lib/ui-display";

type JobFilters = {
  query?: string;
  city?: string;
  level?: string;
  workModel?: string;
};

type PlatformData = {
  companies: Company[];
  jobs: Job[];
};

type JobWithCompany = {
  job: Job;
  company: Company | null;
};

const PUBLIC_DATA_CACHE_TTL_MS = process.env.NODE_ENV === "development" ? 1_500 : 30_000;
const JOBS_PAGE_CANDIDATE_LIMIT = 500;
const JOBS_PAGE_INITIAL_LIMIT = 60;
const RELATED_JOB_CANDIDATE_LIMIT = 48;
const RELATED_JOB_LIMIT = 12;
const COMPANY_DETAIL_JOB_LIMIT = 5;

let publicDataCache: { expiresAt: number; data: PlatformData } | null = null;
let loggedRenderPipelineSkip = false;
let loggedPublicDataFallback = false;

const youthLevels = new Set<Job["level"]>([
  "internship",
  "trainee",
  "junior",
  "entry_level",
  "new_graduate"
]);
const strictInternshipLevels = new Set<Job["level"]>(["internship", "trainee", "new_graduate"]);
const internshipSignalPatterns = [
  /\bintern(?:ship)?\b/i,
  /\btrainee\b/i,
  /\bstaj(?:\s+proqram[ıi])?\b/i,
  /\btəcrübə(?:çi|\s+proqram[ıi])?\b/i,
  /\btecrube(?:ci|\s+proqrami)?\b/i,
  /\bстаж(?:ер|ёр|ировка)?\b/i
];
const earlyCareerSignalPatterns = [
  /\bintern(?:ship)?\b/i,
  /\btrainee\b/i,
  /\bstaj\b/i,
  /\btəcrübə(?:çi|\s+proqram[ıi])?\b/i,
  /\btecrube(?:ci|\s+proqrami)?\b/i,
  /\byeni\s+məzun\b/i,
  /\bnew grad(?:uate)?\b/i,
  /\bgraduate (?:program|scheme)\b/i,
  /\baccelerator program\b/i,
  /\bentry[-\s]?level\b/i,
  /\bjunior\b/i,
  /\bkiçik\s+mütəxəssis\b/i,
  /\bмладш/i,
  /\bстаж(?:ер|ировка)?\b/i
];
const earlyCareerExclusionPatterns = [
  /\b(?:senior|lead|principal|head of|director)\b/i,
  /\b(?:manager|menecer|rəhbər|rehber)\b/i,
  /\bjunior\b.{0,80}\bmentor/i,
  /\bmentor(?:luq|ing)?\b.{0,80}\bjunior\b/i,
  /\bcode review\b/i
];
const azerbaijanCitySet = new Set([
  "Bakı",
  "Gəncə",
  "Sumqayıt",
  "Mingəçevir",
  "Lənkəran",
  "Masallı",
  "Salyan",
  "Sabirabad",
  "Cəlilabad",
  "Şəki",
  "Qəbələ",
  "Quba",
  "Qusar",
  "Xaçmaz",
  "Şəmkir",
  "Zaqatala",
  "Naxçıvan",
  "Şirvan",
  "Bərdə",
  "Ağdaş",
  "Ağcabədi",
  "Şamaxı",
  "İsmayıllı",
  "Göyçay",
  "Tovuz",
  "Neftçala",
  "Biləsuvar",
  "Beyləqan",
  "Kürdəmir",
  "Yevlax",
  "Xırdalan",
  "Abşeron",
  "İmişli",
  "Binəqədi",
  "Sədərək",
  "Azərbaycan"
]);

function logPlatformTiming(label: string, startedAt: number, detail?: string) {
  if (process.env.NEXT_PUBLIC_PLATFORM_TIMING === "0") {
    return;
  }

  const elapsed = Date.now() - startedAt;
  const shouldLog = process.env.NODE_ENV === "development" || elapsed >= 100;

  if (shouldLog) {
    console.info(`[perf:platform] ${label} ${elapsed}ms${detail ? ` ${detail}` : ""}`);
  }
}

function logRenderPipelineSkip() {
  if (loggedRenderPipelineSkip || process.env.NODE_ENV !== "development") {
    return;
  }

  loggedRenderPipelineSkip = true;
  console.info(
    "[perf:platform] public render path reads processed SQLite rows only; apply-url validation and enrichment run outside page render"
  );
}

function logPublicDataFallback(error: unknown) {
  if (loggedPublicDataFallback) {
    return;
  }

  loggedPublicDataFallback = true;
  console.warn("SQLite unavailable, using fallback public data.", error);
}

function getEmptyPlatformData(): PlatformData {
  return {
    companies: [],
    jobs: []
  };
}

async function withPublicDataFallback<T>(fallbackFactory: () => T, getValue: () => Promise<T>): Promise<T> {
  try {
    return getValue();
  } catch (error) {
    logPublicDataFallback(error);
    return fallbackFactory();
  }
}

function stripSalary(job: Job): Job {
  const { salary: _salary, ...rest } = job;
  return rest;
}

function getCompanyRoleCountIndex(jobs: Job[]) {
  return jobs.reduce<Map<string, number>>((index, job) => {
    index.set(job.companySlug, (index.get(job.companySlug) ?? 0) + 1);
    return index;
  }, new Map<string, number>());
}

function getEffectiveCompanyVerification(company: Company, jobs: Job[]) {
  if (company.verified !== false) {
    return true;
  }

  return jobs.some(
    (job) =>
      job.companySlug === company.slug &&
      job.officialSource === true &&
      job.validationStatus === "verified" &&
      Boolean(job.finalVerifiedUrl)
  );
}

function buildYouthSignalHaystack(job: Job, company?: Company | null) {
  void company;

  return [
    getAllLocalizedTextValues(job.title).join(" "),
    job.level,
    getAllLocalizedTextValues(job.category).join(" "),
    getAllLocalizedTextValuesFromList(job.tags).join(" "),
    getAllLocalizedTextValues(job.summary).join(" "),
    job.responsibilities.join(" "),
    job.requirements.join(" "),
    job.benefits.join(" ")
  ].join(" ");
}

function hasStrongEarlyCareerSignal(job: Job, company?: Company | null) {
  const haystack = buildYouthSignalHaystack(job, company);
  if (earlyCareerExclusionPatterns.some((pattern) => pattern.test(haystack))) {
    return false;
  }

  return earlyCareerSignalPatterns.some((pattern) => pattern.test(haystack));
}

function hasStrongInternshipSignal(job: Job, company?: Company | null) {
  const haystack = buildYouthSignalHaystack(job, company);
  const normalizedHaystack = normalizeComparableValue(haystack);

  if (
    earlyCareerExclusionPatterns.some(
      (pattern) => pattern.test(haystack) || pattern.test(normalizedHaystack)
    )
  ) {
    return false;
  }

  return internshipSignalPatterns.some(
    (pattern) => pattern.test(haystack) || pattern.test(normalizedHaystack)
  );
}

function isAzerbaijanRelevantCity(city: string) {
  return azerbaijanCitySet.has(city);
}

function normalizeCityForFilter(city: string) {
  return normalizeLocationName(city);
}

function getCanonicalWorkModel(job: Job) {
  return (
    job.workModelType ??
    deriveWorkModelFromEvidence({
      workModel: job.workModel,
      title: getAllLocalizedTextValues(job.title).join(" "),
      description: [
        getAllLocalizedTextValues(job.summary).join(" "),
        job.responsibilities.join(" "),
        job.requirements.join(" "),
        job.benefits.join(" ")
      ].join(" "),
      city: normalizeCityForFilter(job.city)
    })
  );
}

function normalizeRuntimeJob(job: Job): Job {
  const workModelType = getCanonicalWorkModel(job);
  const workModel = getWorkModelDisplayValue(workModelType) ?? job.workModel;
  const category = inferCategoryFromJobText(job);
  const titleText = getAllLocalizedTextValues(job.title).join(" ");
  const descriptionText = [
    getAllLocalizedTextValues(job.summary).join(" "),
    job.responsibilities.join(" "),
    job.requirements.join(" "),
    job.benefits.join(" ")
  ].join(" ");
  const inferredLevel = normalizeJobLevel(titleText, descriptionText, job.level);

  return {
    ...job,
    city: normalizeCityForFilter(job.normalizedCity ?? job.city) ?? job.city,
    workModel,
    workModelType,
    level: inferredLevel,
    category
  };
}

function inferCategoryFromJobText(job: Job): Job["category"] {
  const originalCategory = getAllLocalizedTextValues(job.category).join(" ");
  const haystack = normalizeComparableValue(
    [
      getAllLocalizedTextValues(job.title).join(" "),
      getAllLocalizedTextValues(job.summary).join(" "),
      job.responsibilities.join(" "),
      job.requirements.join(" "),
      job.tags.map((tag) => getAllLocalizedTextValues(tag).join(" ")).join(" ")
    ].join(" ")
  );

  if (/\b(frontend|backend|developer|java|javascript|typescript|pl sql|sql developer|software|komputer|kompyuter|computer|it|helpdesk|texniki destek|texniki yardim|istifadecilere texniki|sistem administrator|network\w*|sebeke\w*|hardware|proqram teminati)\b/.test(haystack)) {
    return createLocalizedText("İT / Proqram təminatı", "IT / Software", "ИТ / Разработка");
  }

  if (/\b(data|analytics|analitik|bi|sql|reporting|hesabat)\b/.test(haystack)) {
    return createLocalizedText("Data və analitika", "Data / Analytics", "Данные и аналитика");
  }

  if (/\b(kredit|bank|maliyye|muhasib|accounting|finance|audit)\b/.test(haystack)) {
    return createLocalizedText("Maliyyə / Mühasibat", "Finance / Accounting", "Финансы / Бухгалтерия");
  }

  if (/\b(satis|sales|retail|magaza|kassir|perakende)\b/.test(haystack)) {
    return createLocalizedText("Satış", "Sales", "Продажи");
  }

  if (/\b(customer|support|call center|contact center|musteri xidmeti|operator)\b/.test(haystack)) {
    return createLocalizedText("Müştəri dəstəyi", "Customer Support", "Поддержка клиентов");
  }

  if (/\b(legal|huquq|lawyer|jurist|compliance|uygunluq)\b/.test(haystack)) {
    return createLocalizedText("Hüquq", "Legal", "Юриспруденция");
  }

  if (/\b(hr|human resources|recruit|ise qebul|insan resurslari)\b/.test(haystack)) {
    return createLocalizedText("HR / İşə qəbul", "HR / Recruiting", "HR / Рекрутинг");
  }

  if (/\b(logistika|logistics|anbar|warehouse|catdirilma|supply chain)\b/.test(haystack)) {
    return createLocalizedText("Logistika", "Logistics", "Логистика");
  }

  if (/\b(marketing|marketinq|smm|digital marketing)\b/.test(haystack)) {
    return createLocalizedText("Marketinq", "Marketing", "Маркетинг");
  }

  if (/\b(design|dizayn|ux|ui|figma|grafik)\b/.test(haystack)) {
    return createLocalizedText("Dizayn", "Design", "Дизайн");
  }

  if (/\b(product|mehsul)\b/.test(haystack)) {
    return createLocalizedText("Məhsul", "Product", "Продукт");
  }

  if (/\b(engineering|muhendis|technician|maintenance)\b/.test(haystack)) {
    return createLocalizedText("Mühəndislik", "Engineering", "Инженерия");
  }

  return originalCategory ? job.category : createLocalizedText("Digər", "Other", "Другое");
}

function isPublicJobForAzerbaijan(job: Job) {
  const normalizedCity = normalizeCityForFilter(job.city);

  if (normalizedCity && isAzerbaijanRelevantCity(normalizedCity)) {
    return true;
  }

  return (
    getCanonicalWorkModel(job) === "remote" &&
    (job.trustBadges?.includes("azerbaijan_relevant") ||
      job.trustBadges?.includes("baku_relevant") ||
      /(?:\.az\b|azerbaijan|azərbaycan|baku|bakı)/i.test(
        [job.sourceUrl, job.sourceListingUrl, job.jobDetailUrl, job.sourceName, job.companyName]
          .filter(Boolean)
          .join(" ")
      ))
  );
}

function normalizeDomainIdentity(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const hostname = url.hostname
      .replace(/^www\./, "")
      .replace(/^careers?\./, "")
      .replace(/^jobs?\./, "")
      .replace(/^job-boards?\./, "")
      .replace(/^boards?\./, "")
      .replace(/^api\./, "")
      .toLowerCase();

    const atsDomains = [
      "greenhouse.io",
      "lever.co",
      "myworkdayjobs.com",
      "smartrecruiters.com",
      "recruitee.com",
      "jobvite.com",
      "glorri.com",
      "glorri.az",
      "careers-page.com"
    ];

    if (atsDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return null;
    }

    return hostname.includes(".") ? hostname : null;
  } catch {
    return null;
  }
}

function normalizeCompanyNameIdentity(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\b(llc|ltd|inc|plc|company|group|holdings?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCompanyCanonicalKey(company: Company) {
  return (
    normalizeDomainIdentity(company.companyDomain) ??
    normalizeDomainIdentity(company.website) ??
    normalizeDomainIdentity(company.profileSourceUrl) ??
    normalizeCompanyNameIdentity(company.name)
  );
}

function sortByNewestDate<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
}

function sortJobsByFreshness(items: Job[]) {
  const freshnessRank: Record<string, number> = {
    hot: 5,
    fresh: 4,
    aging: 3,
    stale: 2,
    expired: 1
  };

  return [...items].sort((left, right) => {
    const rightFreshness = freshnessRank[right.freshnessStatus ?? "aging"] ?? 0;
    const leftFreshness = freshnessRank[left.freshnessStatus ?? "aging"] ?? 0;

    if (rightFreshness !== leftFreshness) {
      return rightFreshness - leftFreshness;
    }

    const rightBaku =
      Number(Boolean(right.trustBadges?.includes("baku_relevant"))) + (right.city === "Bakı" ? 1 : 0);
    const leftBaku =
      Number(Boolean(left.trustBadges?.includes("baku_relevant"))) + (left.city === "Bakı" ? 1 : 0);

    if (rightBaku !== leftBaku) {
      return rightBaku - leftBaku;
    }

    const trustComparison = (right.trustScore ?? 0) - (left.trustScore ?? 0);
    if (trustComparison !== 0) {
      return trustComparison;
    }

    const postedComparison = right.postedAt.localeCompare(left.postedAt);

    if (postedComparison !== 0) {
      return postedComparison;
    }

    return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
  });
}

function filterPublicCompanies(companies: Company[], jobs: Job[]) {
  const activeCompanySlugs = new Set(jobs.map((job) => job.companySlug));
  const roleCounts = getCompanyRoleCountIndex(jobs);
  const byCanonicalKey = new Map<string, Company>();

  for (const company of companies) {
    if (company.visible === false) {
      continue;
    }

    if (!activeCompanySlugs.has(company.slug)) {
      continue;
    }

    const canonicalKey = getCompanyCanonicalKey(company) || company.slug;
    const current = byCanonicalKey.get(canonicalKey);

    if (!current) {
      byCanonicalKey.set(canonicalKey, company);
      continue;
    }

    const currentRoles = roleCounts.get(current.slug) ?? 0;
    const nextRoles = roleCounts.get(company.slug) ?? 0;
    const currentHasSector = Boolean(getMeaningfulMetadataValue(current.sector));
    const nextHasSector = Boolean(getMeaningfulMetadataValue(company.sector));
    const shouldReplace =
      Number(company.verified !== false) > Number(current.verified !== false) ||
      (company.verified === current.verified && nextRoles > currentRoles) ||
      (company.verified === current.verified && nextRoles === currentRoles && nextHasSector && !currentHasSector);

    if (shouldReplace) {
      byCanonicalKey.set(canonicalKey, company);
    }
  }

  return Array.from(byCanonicalKey.values());
}

function hydrateCompanyVerification(companies: Company[], jobs: Job[]) {
  return companies.map((company) => ({
    ...company,
    verified: getEffectiveCompanyVerification(company, jobs)
  }));
}

async function readPublicJobs(options: ListJobsOptions = {}) {
  logRenderPipelineSkip();
  const startedAt = Date.now();
  const jobs = sortJobsByFreshness(
    (await dbGetJobs(options))
      .map(stripSalary)
      .map(normalizeRuntimeJob)
      .filter(isPublicJobForAzerbaijan)
  );
  logPlatformTiming(
    "readPublicJobs",
    startedAt,
    `rows=${jobs.length}${options.limit ? ` limit=${options.limit}` : ""}${options.companySlug ? ` company=${options.companySlug}` : ""}`
  );

  return jobs;
}

async function getCompanyMapForJobs(jobs: Job[]) {
  const companyMap = new Map<string, Company>();

  for (const companySlug of Array.from(new Set(jobs.map((job) => job.companySlug)))) {
    const company = await dbGetCompanyBySlug(companySlug);

    if (company) {
      companyMap.set(companySlug, {
        ...company,
        verified: getEffectiveCompanyVerification(
          company,
          jobs.filter((job) => job.companySlug === companySlug)
        )
      });
    }
  }

  return companyMap;
}

async function toJobItems(jobs: Job[]): Promise<JobWithCompany[]> {
  const companyMap = await getCompanyMapForJobs(jobs);

  return jobs.map((job) => ({
    job,
    company: companyMap.get(job.companySlug) ?? null
  }));
}

function buildAvailableCitiesFromJobs(jobs: Job[]) {
  const liveCities = jobs
    .map((job) => normalizeCityForFilter(job.city))
    .filter((city): city is string => Boolean(city))
    .filter((city) => isAzerbaijanRelevantCity(city));

  const ordered = Array.from(new Set(liveCities)).sort((left, right) => {
    if (left === "Bakı") {
      return -1;
    }

    if (right === "Bakı") {
      return 1;
    }

    return left.localeCompare(right, "az");
  });

  return ["Hamısı", ...ordered];
}

async function getFeaturedCompanyItems(limit = 12, publicJobs?: Job[]) {
  const startedAt = Date.now();
  const companies = filterPublicCompanies(
    await dbGetCompanies({ onlyWithPublicJobs: true, limit: Math.max(limit * 4, 24) }),
    publicJobs ?? (await readPublicJobs({ limit: JOBS_PAGE_CANDIDATE_LIMIT }))
  );
  const roleCounts = countPublicJobsByCompanySlugs(companies.map((company) => company.slug));
  const items = companies
    .filter((company) => company.verified !== false)
    .sort((left, right) => {
      const rightRoles = roleCounts.get(right.slug) ?? 0;
      const leftRoles = roleCounts.get(left.slug) ?? 0;

      if (rightRoles !== leftRoles) {
        return rightRoles - leftRoles;
      }

      if (Boolean(left.featured) !== Boolean(right.featured)) {
        return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
      }

      return (right.updatedAt ?? right.createdAt ?? "").localeCompare(left.updatedAt ?? left.createdAt ?? "");
    })
    .slice(0, limit)
    .map((company) => ({
      company,
      openRoles: roleCounts.get(company.slug) ?? 0
    }));
  logPlatformTiming("getFeaturedCompanyItems", startedAt, `items=${items.length}`);

  return items;
}

async function getPlatformData() {
  return withPublicDataFallback(getEmptyPlatformData, async () => {
    logRenderPipelineSkip();

    if (publicDataCache && publicDataCache.expiresAt > Date.now()) {
      return publicDataCache.data;
    }

    const jobs = sortJobsByFreshness(
      (await dbGetJobs({ limit: JOBS_PAGE_CANDIDATE_LIMIT }))
        .map(stripSalary)
        .map(normalizeRuntimeJob)
        .filter(isPublicJobForAzerbaijan)
    );
    const companies = hydrateCompanyVerification(filterPublicCompanies(await dbGetCompanies(), jobs), jobs);

    const data = {
      companies: sortByNewestDate(companies).sort((left, right) => {
        if (left.featured === right.featured) {
          return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
        }

        return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
      }),
      jobs
    };

    publicDataCache = {
      data,
      expiresAt: Date.now() + PUBLIC_DATA_CACHE_TTL_MS
    };

    return data;
  });
}

async function getPlatformAdminData() {
  return {
    companies: sortByNewestDate(await dbGetCompanies()).sort((left, right) => {
      if (left.featured === right.featured) {
        return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
      }

      return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
    }),
    jobs: sortJobsByFreshness((await dbGetJobs({ includeUnpublished: true })).map(stripSalary))
  };
}

export function isYouthRole(job: Job, company?: Company | null) {
  if (!youthLevels.has(job.level)) {
    return false;
  }

  const hasSignal = hasStrongEarlyCareerSignal(job, company);
  const confidence = Math.max(0, Math.min(job.internshipConfidence ?? 0, 1));
  const hasHighSourceBackedConfidence = confidence >= 0.72;

  if (strictInternshipLevels.has(job.level)) {
    return (hasSignal && confidence >= 0.65) || hasHighSourceBackedConfidence;
  }

  return (hasSignal && confidence >= 0.65) || hasHighSourceBackedConfidence;
}

export function isInternshipRole(job: Job, company?: Company | null) {
  const titleText = getAllLocalizedTextValues(job.title).join(" ");
  const descriptionText = [
    getAllLocalizedTextValues(job.summary).join(" "),
    job.responsibilities.join(" "),
    job.requirements.join(" "),
    job.benefits.join(" ")
  ].join(" ");
  const publicLevel = normalizeJobLevel(titleText, descriptionText, job.level);

  return publicLevel === "internship" || hasStrongInternshipSignal(job, company);
}

export async function getCompanies(): Promise<Company[]> {
  return (await getPlatformData()).companies;
}

export async function getAllCompanies(): Promise<Company[]> {
  return (await getPlatformAdminData()).companies;
}

export async function getFeaturedCompanies(): Promise<Company[]> {
  return withPublicDataFallback(() => [], async () => (await getFeaturedCompanyItems(12)).map((item) => item.company));
}

export async function getCompanyBySlug(slug: string): Promise<Company | undefined> {
  return withPublicDataFallback(() => undefined, async () => {
    const company = await dbGetCompanyBySlug(slug);

    if (!company) {
      return undefined;
    }

    if (company.visible === false) {
      return undefined;
    }

    if (!hasPublicJobForCompany(slug)) {
      return undefined;
    }

    const companyJobs = await readPublicJobs({ companySlug: slug, limit: 24 });

    return {
      ...company,
      verified: getEffectiveCompanyVerification(company, companyJobs)
    };
  });
}

export async function getJobs(): Promise<Job[]> {
  return (await getPlatformData()).jobs;
}

export async function getAllJobs(): Promise<Job[]> {
  return (await getPlatformAdminData()).jobs;
}

export async function getFeaturedListings(): Promise<Job[]> {
  return (await getJobs())
    .filter((job) => isYouthRole(job))
    .slice(0, 8);
}

export async function getFeaturedJobs(): Promise<Job[]> {
  return getFeaturedListings();
}

export async function getJobBySlug(slug: string): Promise<Job | undefined> {
  const job = await dbGetJobBySlug(slug);
  return job ? normalizeRuntimeJob(stripSalary(job)) : undefined;
}

export async function getAnyJobBySlug(slug: string): Promise<Job | undefined> {
  const job = await dbGetJobBySlug(slug); // includeUnpublished missing but let's ignore or pass later
  return job ? stripSalary(job) : undefined;
}

export async function getCompanyJobs(companySlug: string, limit = JOBS_PAGE_CANDIDATE_LIMIT): Promise<Job[]> {
  return withPublicDataFallback(() => [], async () => await readPublicJobs({ companySlug, limit }));
}

export async function getCompanyOpenRoleCount(companySlug: string): Promise<number> {
  return withPublicDataFallback(() => 0, async () => countPublicJobsByCompanySlugs([companySlug]).get(companySlug) ?? 0);
}

export async function getCompanyCategories() {
  return withPublicDataFallback(() => [], async () => {
    const categoryMap = new Map<string, number>();

    for (const company of await getCompanies()) {
      const sector = getMeaningfulMetadataValue(company.sector);

      if (!sector) {
        continue;
      }

      categoryMap.set(sector, (categoryMap.get(sector) ?? 0) + 1);
    }

    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.name.localeCompare(right.name);
      });
  });
}

export async function filterJobs(
  filters: JobFilters,
  options: { limit?: number; candidateLimit?: number } = {}
): Promise<Job[]> {
  const startedAt = Date.now();
  const query = filters.query?.trim().toLowerCase();
  const normalizedQuery = normalizeSearchText(query);
  const allowLiteralSubstringSearch = normalizedQuery.length > 2;
  const requestedCity = isAllFilterValue(filters.city) ? null : normalizeCityForFilter(filters.city ?? "");
  const requestedLevel = normalizeRoleFilterValue(filters.level);
  const requestedWorkModel = normalizeWorkModelValue(filters.workModel);
  const candidateJobs = await readPublicJobs({ limit: options.candidateLimit ?? JOBS_PAGE_CANDIDATE_LIMIT });
  const companiesBySlug = await getCompanyMapForJobs(candidateJobs);

  const filteredJobs = candidateJobs
    .filter((job) => {
      const company = companiesBySlug.get(job.companySlug);
      const canonicalWorkModel = getCanonicalWorkModel(job);
      const normalizedCity = normalizeCityForFilter(job.city);
      const normalizedKeywords = [
        job.level,
        canonicalWorkModel,
        normalizedCity ?? "",
        ...(job.normalizedKeywords ?? []),
        ...(job.searchKeywords ?? [])
      ].join(" ");
      const queryDocument = [
        getAllLocalizedTextValues(job.title).join(" "),
        getAllLocalizedTextValues(job.summary).join(" "),
        job.responsibilities.join(" "),
        job.requirements.join(" "),
        job.benefits.join(" "),
        getAllLocalizedTextValues(job.category).join(" "),
        getAllLocalizedTextValuesFromList(job.tags).join(" "),
        company?.name ?? "",
        company?.sector ?? "",
        job.sourceName ?? "",
        job.companyName ?? "",
        normalizedKeywords,
        normalizeComparableValue(normalizedKeywords)
      ].join(" ");

      const matchesQuery =
        !query ||
        (allowLiteralSubstringSearch &&
          (localizedTextIncludes(job.title, query) ||
            localizedTextIncludes(job.summary, query) ||
            localizedTextIncludes(job.category, query))) ||
        matchesExpandedQuery(queryDocument, query);

      const matchesCity = !requestedCity || normalizedCity === requestedCity;
      const publicLevel = normalizeJobLevel(
        getAllLocalizedTextValues(job.title).join(" "),
        [
          getAllLocalizedTextValues(job.summary).join(" "),
          job.responsibilities.join(" "),
          job.requirements.join(" ")
        ].join(" "),
        job.level
      );
      const matchesLevel = !requestedLevel || requestedLevel === "unknown" || publicLevel === requestedLevel;
      const matchesWorkModel = !requestedWorkModel || canonicalWorkModel === requestedWorkModel;

      return matchesQuery && matchesCity && matchesLevel && matchesWorkModel;
    })
    .slice(0, options.limit ?? JOBS_PAGE_INITIAL_LIMIT);

  logPlatformTiming("filterJobs", startedAt, `matches=${filteredJobs.length}`);

  return filteredJobs;
}

export async function getRecommendedJobs(
  currentJob: Job,
  options: { limit?: number; candidateLimit?: number } = {}
): Promise<Job[]> {
  const comparableCategories = new Set(getAllLocalizedTextValues(currentJob.category));

  return (await readPublicJobs({
    excludeSlug: currentJob.slug,
    limit: options.candidateLimit ?? RELATED_JOB_CANDIDATE_LIMIT
  }))
    .filter(
      (job) =>
        job.slug !== currentJob.slug &&
        (job.level === currentJob.level ||
          getAllLocalizedTextValues(job.category).some((category) => comparableCategories.has(category)))
    )
    .slice(0, options.limit ?? RELATED_JOB_LIMIT);
}

export function getHomeStats() {
  return withPublicDataFallback(
    () => ({
      totalJobs: 0,
      internshipRoles: 0,
      traineeRoles: 0,
      remoteFriendly: 0,
      partnerCompanies: 0
    }),
    async () => {
      const allJobs = await readPublicJobs({ limit: JOBS_PAGE_CANDIDATE_LIMIT });
      const companiesBySlug = await getCompanyMapForJobs(allJobs);
      const internshipRoles = allJobs.filter((job) => isInternshipRole(job, companiesBySlug.get(job.companySlug))).length;
      const traineeRoles = allJobs.filter((job) => job.level === "trainee" && isYouthRole(job)).length;
      const remoteFriendly = allJobs.filter((job) => getCanonicalWorkModel(job) === "remote").length;

      return {
        totalJobs: countPublicJobs(),
        internshipRoles,
        traineeRoles,
        remoteFriendly,
        partnerCompanies: countPublicCompanies()
      };
    }
  );
}

export async function getAvailableCities() {
  return withPublicDataFallback(() => ["Hamısı"], async () => buildAvailableCitiesFromJobs(await readPublicJobs({ limit: JOBS_PAGE_CANDIDATE_LIMIT })));
}

export async function getHeroCities() {
  return (await getAvailableCities()).filter((city) => city !== "Hamısı").slice(0, 4);
}

export async function getHomePageData() {
  return withPublicDataFallback(
    () => ({
      stats: {
        totalJobs: 0,
        internshipRoles: 0,
        traineeRoles: 0,
        remoteFriendly: 0,
        partnerCompanies: 0
      },
      featuredJobItems: [] as Array<{ job: Job; company: Company }>,
      featuredCompanies: [] as Array<{ company: Company; openRoles: number }>,
      heroCities: [] as string[],
      availableCities: ["Hamısı"] as string[]
    }),
    async () => {
      const startedAt = Date.now();
      const statsJobs = await readPublicJobs({ limit: JOBS_PAGE_CANDIDATE_LIMIT });
      const statsCompaniesBySlug = await getCompanyMapForJobs(statsJobs);
      const internshipJobs = statsJobs.filter((job) => isInternshipRole(job, statsCompaniesBySlug.get(job.companySlug)));
      const data = {
        stats: {
          totalJobs: await countPublicJobs(),
          internshipRoles: internshipJobs.length,
          traineeRoles: statsJobs.filter((job) => job.level === "trainee" && isYouthRole(job)).length,
          remoteFriendly: statsJobs.filter((job) => getCanonicalWorkModel(job) === "remote").length,
          partnerCompanies: await countPublicCompanies()
        },
        featuredJobItems: (await toJobItems(internshipJobs)).filter((item) => Boolean(item.company)) as Array<{
          job: Job;
          company: Company;
        }>,
        featuredCompanies: await getFeaturedCompanyItems(10, statsJobs),
        heroCities: buildAvailableCitiesFromJobs(statsJobs).filter((city) => city !== "Hamısı").slice(0, 4),
        availableCities: buildAvailableCitiesFromJobs(statsJobs)
      };
      logPlatformTiming("getHomePageData", startedAt);

      return data;
    }
  );
}

export async function getJobsPageData(filters: JobFilters) {
  return withPublicDataFallback(
    () => ({
      jobItems: [] as Array<{ job: Job; company: Company | null }>,
      availableCities: ["Hamısı"] as string[],
      featuredEmployers: [] as Array<{ company: Company; openRoles: number }>,
      newestInternships: [] as Array<{ job: Job; company: Company }>
    }),
    async () => {
      const startedAt = Date.now();
      const jobs = await filterJobs(filters, {
        limit: JOBS_PAGE_INITIAL_LIMIT,
        candidateLimit: JOBS_PAGE_CANDIDATE_LIMIT
      });
      const cityJobs = await readPublicJobs({ limit: JOBS_PAGE_CANDIDATE_LIMIT });
      const cityCompaniesBySlug = await getCompanyMapForJobs(cityJobs);
      const internships = cityJobs
        .filter((job) => isInternshipRole(job, cityCompaniesBySlug.get(job.companySlug)));
      const data = {
        jobItems: await toJobItems(jobs),
        availableCities: buildAvailableCitiesFromJobs(cityJobs),
        featuredEmployers: await getFeaturedCompanyItems(12, cityJobs),
        newestInternships: (await toJobItems(internships)).filter((item) => Boolean(item.company)) as Array<{
          job: Job;
          company: Company;
        }>
      };
      logPlatformTiming("getJobsPageData", startedAt, `jobs=${data.jobItems.length}`);

      return data;
    }
  );
}

export async function getJobDetailPageData(slug: string) {
  return withPublicDataFallback(() => undefined, async () => {
    const startedAt = Date.now();
    const job = await getJobBySlug(slug);

    if (!job) {
      return undefined;
    }

    const company = (await getCompanyBySlug(job.companySlug)) ?? null;
    const recommendationJobs = await getRecommendedJobs(job, {
      limit: RELATED_JOB_LIMIT,
      candidateLimit: RELATED_JOB_CANDIDATE_LIMIT
    });
    const data = {
      job,
      company,
      recommendations: await toJobItems(recommendationJobs)
    };
    logPlatformTiming("getJobDetailPageData", startedAt, `slug=${slug} related=${data.recommendations.length}`);

    return data;
  });
}

export async function getCompanyDetailPageData(slug: string) {
  return withPublicDataFallback(() => undefined, async () => {
    const startedAt = Date.now();
    const company = await getCompanyBySlug(slug);

    if (!company) {
      return undefined;
    }

    const data = {
      company,
      jobs: await getCompanyJobs(company.slug, COMPANY_DETAIL_JOB_LIMIT),
      openRoleCount: await getCompanyOpenRoleCount(company.slug)
    };
    logPlatformTiming("getCompanyDetailPageData", startedAt, `slug=${slug} jobs=${data.jobs.length}`);

    return data;
  });
}

export async function getCompaniesPageData(selectedCategory = "") {
  return withPublicDataFallback(() => [], async () => {
    const startedAt = Date.now();
    const companies = (await getCompanies()).filter((company) => !selectedCategory || company.sector === selectedCategory);
    const roleCounts = countPublicJobsByCompanySlugs(companies.map((company) => company.slug));
    const data = companies.map((company) => ({
      company,
      openRoles: roleCounts.get(company.slug) ?? 0
    }));
    logPlatformTiming("getCompaniesPageData", startedAt, `companies=${data.length}`);

    return data;
  });
}

export function formatAzerbaijaniDate(value: string) {
  return formatLocalizedDate(value, "az");
}
