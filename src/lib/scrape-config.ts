import type { SourceKind } from "@/lib/job-intelligence";

export type ScrapeSourceAdapter = "python-selenium" | "html-discovery" | "json-feed";
export type ScrapeTrustTier = "official" | "trusted-board" | "aggregator" | "restricted";
export type ScrapeFeedProvider = "generic" | "greenhouse" | "lever" | "glorri-embed";
export type ScrapeSourceParserStatus = "ready" | "degraded" | "blocked" | "disabled";
export type ScrapeHtmlParser =
  | "portal-vacancy-list"
  | "unibank-glorri-accordion"
  | "xalqbank-glorri-list"
  | "azerpost-glorri-prop"
  | "jobs2web-search-results"
  | "azercosmos-collapsible"
  | "azergold-table"
  | "yelo-vacancies-list"
  | "akkord-article-list"
  | "azerconnect-vacancies"
  | "bravo-vacancy-list"
  | "glorri-company-vacancies";
export type ScrapeSourceType =
  | "official-api-feed"
  | "local-job-board"
  | "public-ats"
  | "company-career-page"
  | "vacancy-aggregator"
  | "restricted-source";
export type ScrapeSourceCapability = "yes" | "no" | "unknown";
export type ScrapeSourcePolicy = "primary" | "supplemental" | "restricted";
export type ScrapeDiscoveryMethod =
  | "official-api"
  | "official-ats-feed"
  | "company-career-page"
  | "html-discovery"
  | "browser-automation"
  | "restricted-source";

export type ScrapeSource = {
  id: string;
  name: string;
  url: string;
  sourceDomain: string;
  countryOrMarket?: string;
  sourceType: ScrapeSourceType;
  kind: SourceKind;
  adapter: ScrapeSourceAdapter;
  feedProvider?: ScrapeFeedProvider;
  trustTier: ScrapeTrustTier;
  priority: number;
  cadenceMinutes: number;
  hasDetailPages: ScrapeSourceCapability;
  hasApplyUrls: ScrapeSourceCapability;
  reliabilityScore?: number;
  freshnessScore?: number;
  parserStatus?: ScrapeSourceParserStatus;
  maxRecordsPerRun?: number;
  reliableEnough: boolean;
  extractionReady: boolean;
  companyNameOverride?: string;
  enabled?: boolean;
  notes?: string;
  disabledReason?: string;
  feedUrl?: string;
  feedCompanyId?: string;
  crawlUrl?: string;
  htmlParser?: ScrapeHtmlParser;
  policy?: ScrapeSourcePolicy;
  discoveryMethod?: ScrapeDiscoveryMethod;
  restrictedReason?: string;
  termsUrl?: string | null;
  privacyUrl?: string | null;
  robotsUrl?: string | null;
  legalReviewStatus?: "api_allowed" | "feed_allowed" | "html_allowed_low_risk" | "restricted_manual_review" | "blocked_do_not_scrape" | null;
  legalReviewNotes?: string | null;
  allowedIngestionMethod?: "official_api" | "public_feed" | "html_discovery" | "browser_automation" | "manual_review" | "blocked" | null;
  lastLegalCheckedAt?: string | null;
};

function withSourceDefaults(source: ScrapeSource): ScrapeSource {
  return {
    ...source,
    countryOrMarket: source.countryOrMarket ?? "Azerbaijan",
    feedProvider: source.feedProvider ?? "generic",
    reliabilityScore:
      source.reliabilityScore ??
      (source.trustTier === "official"
        ? 0.95
        : source.trustTier === "trusted-board"
          ? 0.82
          : source.trustTier === "aggregator"
            ? 0.62
            : 0.2),
    freshnessScore:
      source.freshnessScore ??
      Math.max(0.25, Math.min(0.98, Number((1 - source.cadenceMinutes / 720).toFixed(2)))),
    parserStatus:
      source.parserStatus ??
      (source.enabled === false
        ? "disabled"
        : source.extractionReady
          ? "ready"
          : source.reliableEnough
            ? "degraded"
            : "blocked"),
    policy:
      source.policy ??
      (source.sourceType === "restricted-source"
        ? "restricted"
        : source.reliableEnough && source.extractionReady
          ? "primary"
          : "supplemental"),
    discoveryMethod:
      source.discoveryMethod ??
      (source.adapter === "json-feed"
        ? source.sourceType === "official-api-feed"
          ? "official-api"
          : "official-ats-feed"
        : source.adapter === "python-selenium"
          ? "browser-automation"
          : source.sourceType === "company-career-page"
            ? "company-career-page"
            : "html-discovery")
  };
}

function sortSources(sources: ScrapeSource[]) {
  return sources.map(withSourceDefaults).sort((left, right) => {
    if (Number(right.reliableEnough) !== Number(left.reliableEnough)) {
      return Number(right.reliableEnough) - Number(left.reliableEnough);
    }

    if (Number(right.extractionReady) !== Number(left.extractionReady)) {
      return Number(right.extractionReady) - Number(left.extractionReady);
    }

    return right.priority - left.priority;
  });
}

function makeStructuredFeedSource(input: {
  id: string;
  name: string;
  url: string;
  sourceDomain: string;
  companyNameOverride: string;
  feedUrl: string;
  feedProvider: ScrapeFeedProvider;
  countryOrMarket: string;
  priority: number;
  cadenceMinutes: number;
  reliabilityScore: number;
  freshnessScore: number;
  maxRecordsPerRun: number;
  notes: string;
}) {
  return withSourceDefaults({
    id: input.id,
    name: input.name,
    url: input.url,
    sourceDomain: input.sourceDomain,
    countryOrMarket: input.countryOrMarket,
    sourceType: "public-ats",
    kind: "career-page",
    adapter: "json-feed",
    feedProvider: input.feedProvider,
    trustTier: "official",
    priority: input.priority,
    cadenceMinutes: input.cadenceMinutes,
    hasDetailPages: "yes",
    hasApplyUrls: input.feedProvider === "lever" ? "yes" : "unknown",
    reliabilityScore: input.reliabilityScore,
    freshnessScore: input.freshnessScore,
    parserStatus: "ready",
    maxRecordsPerRun: input.maxRecordsPerRun,
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: input.companyNameOverride,
    feedUrl: input.feedUrl,
    notes: input.notes
  });
}

export const scrapeSources: ScrapeSource[] = [
  {
    id: "pasha-insurance-jobs",
    name: "PASHA Insurance Jobs",
    url: "https://career.pasha-insurance.az/jobs",
    sourceDomain: "career.pasha-insurance.az",
    sourceType: "public-ats",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 100,
    cadenceMinutes: 60,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "PASHA Insurance",
    notes: "Official Teamtailor careers site with explicit /jobs/{id}-{slug} detail pages."
  },
  {
    id: "pasha-capital-jobs",
    name: "PASHA Capital Jobs",
    url: "https://careers-page.com/pasha-capital-jobs",
    sourceDomain: "careers-page.com",
    sourceType: "public-ats",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 99,
    cadenceMinutes: 75,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "PASHA Capital",
    notes: "Public Manatal careers portal with explicit /job/{id} vacancy pages."
  },
  {
    id: "pasha-holding-vacancies",
    name: "PASHA Holding Vacancies",
    url: "https://pasha-holding.az/en/career/vacancies/",
    sourceDomain: "pasha-holding.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 98,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "PASHA Holding",
    notes: "Official listing page with explicit /en/career/vacancies/{slug}/ detail pages."
  },
  {
    id: "position-az",
    name: "Position.az",
    url: "https://position.az/en",
    sourceDomain: "position.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 96,
    cadenceMinutes: 75,
    hasDetailPages: "yes",
    hasApplyUrls: "unknown",
    reliableEnough: true,
    extractionReady: true,
    notes: "Local board with explicit /en/vacancy/{slug}-{id} detail pages."
  },
  {
    id: "jobsearch-az",
    name: "JobSearch.az",
    url: "https://jobsearch.az/vacancies",
    sourceDomain: "jobsearch.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 95,
    cadenceMinutes: 75,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    notes: "SSR listing with explicit /vacancies/{slug}-{id} detail pages and apply actions on detail pages."
  },
  {
    id: "banker-az-jobs",
    name: "Banker.az Jobs",
    url: "https://banker.az/jobs/",
    sourceDomain: "banker.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 94,
    cadenceMinutes: 75,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    notes: "Archive listing with explicit /jobs/{slug}/ detail pages."
  },
  {
    id: "tapla-az-vakansiyalar",
    name: "Tapla.az Vakansiyalar",
    url: "https://www.tapla.az/vakansiyalar",
    sourceDomain: "www.tapla.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 93,
    cadenceMinutes: 75,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    notes: "Next.js listing with embedded structured vacancy objects and explicit detail URLs."
  },
  {
    id: "hellojob-az",
    name: "HelloJob.az",
    url: "https://www.hellojob.az/vakansiyalar",
    sourceDomain: "www.hellojob.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 92,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "unknown",
    reliableEnough: true,
    extractionReady: true,
    notes: "Local board with server-rendered vacancy cards and detail links."
  },
  {
    id: "boss-az",
    name: "Boss.az",
    url: "https://boss.az/search/vacancies?sort_by=date_desc",
    sourceDomain: "boss.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 91,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "unknown",
    reliableEnough: true,
    extractionReady: true,
    notes: "Local board with vacancy detail pages; GraphQL fallback needed in some sessions."
  },
  {
    id: "jobnet-az",
    name: "Jobnet.az",
    url: "https://jobnet.az/en/vacancies",
    sourceDomain: "jobnet.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 90,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    notes: "Local board with SSR vacancy cards, explicit /en/vacancies/{slug}-{id} detail pages, and apply actions on detail pages."
  },
  {
    id: "smartjob-az",
    name: "SmartJob.az",
    url: "https://smartjob.az/vacancies",
    sourceDomain: "smartjob.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 89,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    notes: "Local board with explicit /vacancy/{id}-{slug} pages and visible apply/contact actions on detail pages."
  },
  {
    id: "jobsite-az",
    name: "Jobsite.az",
    url: "https://jobsite.az/vakansiya-is-elanlari",
    sourceDomain: "jobsite.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 86,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    notes: "Local vacancy board with explicit /vakansiya-is-elani/{slug}-{id} detail pages and contact/apply instructions on detail pages."
  },
  {
    id: "abb-careers",
    name: "ABB Careers",
    url: "https://careers.abb-bank.az/vakansiyalar",
    sourceDomain: "careers.abb-bank.az",
    sourceType: "official-api-feed",
    kind: "career-page",
    adapter: "json-feed",
    trustTier: "official",
    priority: 97,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "unknown",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "ABB",
    feedUrl: "https://careers.abb-bank.az/api/vacancy/v2/get",
    notes: "Official ABB careers API with explicit vacancy detail URLs in the feed."
  },
  makeStructuredFeedSource({
    id: "canonical-greenhouse",
    name: "Canonical Careers",
    url: "https://canonical.com/careers",
    sourceDomain: "canonical.com",
    companyNameOverride: "Canonical",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/canonical/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global Remote / EMEA",
    priority: 96,
    cadenceMinutes: 90,
    reliabilityScore: 0.95,
    freshnessScore: 0.92,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed with explicit hosted job pages and a large EMEA/remote mix."
  }),
  makeStructuredFeedSource({
    id: "figma-greenhouse",
    name: "Figma Careers",
    url: "https://www.figma.com/careers/",
    sourceDomain: "www.figma.com",
    companyNameOverride: "Figma",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global / Remote",
    priority: 95,
    cadenceMinutes: 90,
    reliabilityScore: 0.94,
    freshnessScore: 0.9,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse board with explicit job pages and well-structured location metadata."
  }),
  makeStructuredFeedSource({
    id: "airbnb-greenhouse",
    name: "Airbnb Careers",
    url: "https://careers.airbnb.com/",
    sourceDomain: "careers.airbnb.com",
    companyNameOverride: "Airbnb",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global",
    priority: 88,
    cadenceMinutes: 120,
    reliabilityScore: 0.9,
    freshnessScore: 0.82,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed with explicit position pages on the official Airbnb careers site."
  }),
  makeStructuredFeedSource({
    id: "okta-greenhouse",
    name: "Okta Careers",
    url: "https://www.okta.com/company/careers/",
    sourceDomain: "www.okta.com",
    companyNameOverride: "Okta",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/okta/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global",
    priority: 87,
    cadenceMinutes: 120,
    reliabilityScore: 0.9,
    freshnessScore: 0.82,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed whose detail pages resolve to explicit Okta career opportunity pages."
  }),
  makeStructuredFeedSource({
    id: "appsflyer-greenhouse",
    name: "AppsFlyer Careers",
    url: "https://www.appsflyer.com/company/careers/",
    sourceDomain: "careers.appsflyer.com",
    companyNameOverride: "AppsFlyer",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/appsflyer/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global",
    priority: 85,
    cadenceMinutes: 120,
    reliabilityScore: 0.89,
    freshnessScore: 0.8,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed with explicit hosted detail pages on the AppsFlyer careers site."
  }),
  makeStructuredFeedSource({
    id: "asana-greenhouse",
    name: "Asana Careers",
    url: "https://asana.com/jobs",
    sourceDomain: "asana.com",
    companyNameOverride: "Asana",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/asana/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global / Remote",
    priority: 84,
    cadenceMinutes: 120,
    reliabilityScore: 0.9,
    freshnessScore: 0.82,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed with explicit Asana-hosted application/detail pages and remote-friendly roles."
  }),
  makeStructuredFeedSource({
    id: "discord-greenhouse",
    name: "Discord Careers",
    url: "https://discord.com/jobs",
    sourceDomain: "discord.com",
    companyNameOverride: "Discord",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/discord/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global",
    priority: 83,
    cadenceMinutes: 120,
    reliabilityScore: 0.88,
    freshnessScore: 0.78,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed with explicit job-board detail pages and stable hosted URLs."
  }),
  makeStructuredFeedSource({
    id: "n26-greenhouse",
    name: "N26 Careers",
    url: "https://n26.com/en-eu/careers",
    sourceDomain: "n26.com",
    companyNameOverride: "N26",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/n26/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Europe",
    priority: 82,
    cadenceMinutes: 120,
    reliabilityScore: 0.89,
    freshnessScore: 0.8,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed with explicit N26 career detail pages and Europe-focused roles."
  }),
  makeStructuredFeedSource({
    id: "sumup-greenhouse",
    name: "SumUp Careers",
    url: "https://sumup.com/careers/",
    sourceDomain: "sumup.com",
    companyNameOverride: "SumUp",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/sumup/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Europe / Global",
    priority: 81,
    cadenceMinutes: 120,
    reliabilityScore: 0.88,
    freshnessScore: 0.78,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed with explicit SumUp role pages and a strong Europe footprint."
  }),
  makeStructuredFeedSource({
    id: "postman-greenhouse",
    name: "Postman Careers",
    url: "https://www.postman.com/careers/",
    sourceDomain: "www.postman.com",
    companyNameOverride: "Postman",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/postman/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global / Remote",
    priority: 80,
    cadenceMinutes: 120,
    reliabilityScore: 0.89,
    freshnessScore: 0.8,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed with explicit hosted job pages and remote-friendly EMEA coverage."
  }),
  makeStructuredFeedSource({
    id: "mongodb-greenhouse",
    name: "MongoDB Careers",
    url: "https://www.mongodb.com/careers/jobs",
    sourceDomain: "www.mongodb.com",
    companyNameOverride: "MongoDB",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/mongodb/jobs?content=true",
    feedProvider: "greenhouse",
    countryOrMarket: "Global / EMEA",
    priority: 79,
    cadenceMinutes: 120,
    reliabilityScore: 0.88,
    freshnessScore: 0.8,
    maxRecordsPerRun: 10,
    notes: "Public Greenhouse feed resolving to official MongoDB career pages via Greenhouse job IDs."
  }),
  makeStructuredFeedSource({
    id: "binance-lever",
    name: "Binance Careers",
    url: "https://www.binance.com/en/careers/job-openings",
    sourceDomain: "www.binance.com",
    companyNameOverride: "Binance",
    feedUrl: "https://api.lever.co/v0/postings/binance?mode=json",
    feedProvider: "lever",
    countryOrMarket: "Global / Asia / Remote",
    priority: 78,
    cadenceMinutes: 90,
    reliabilityScore: 0.9,
    freshnessScore: 0.86,
    maxRecordsPerRun: 10,
    notes: "Public Lever feed with explicit hosted and apply URLs on jobs.lever.co."
  }),
  makeStructuredFeedSource({
    id: "xm-lever",
    name: "XM Careers",
    url: "https://www.xm.com/careers",
    sourceDomain: "www.xm.com",
    companyNameOverride: "XM",
    feedUrl: "https://api.eu.lever.co/v0/postings/xm?mode=json",
    feedProvider: "lever",
    countryOrMarket: "Europe / MENA",
    priority: 77,
    cadenceMinutes: 90,
    reliabilityScore: 0.88,
    freshnessScore: 0.84,
    maxRecordsPerRun: 10,
    notes: "Public Lever feed with explicit detail/apply URLs and Europe/MENA regional coverage."
  }),
  {
    id: "bank-of-baku-careers",
    name: "Bank of Baku Careers",
    url: "https://careers.bankofbaku.com/az/vacancies",
    sourceDomain: "careers.bankofbaku.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "portal-vacancy-list",
    trustTier: "official",
    priority: 89,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Bank of Baku",
    maxRecordsPerRun: 24,
    notes: "Official vacancy portal with explicit /az/vacancies/{id} detail pages and visible deadline/location metadata."
  },
  {
    id: "baku-electronics-careers",
    name: "Baku Electronics Careers",
    url: "https://careers.bakuelectronics.az/az/vacancies",
    sourceDomain: "careers.bakuelectronics.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "portal-vacancy-list",
    trustTier: "official",
    priority: 88,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Baku Electronics",
    maxRecordsPerRun: 24,
    notes: "Official vacancy portal with explicit /az/vacancies/{id} detail pages and visible location/deadline labels."
  },
  {
    id: "unibank-careers",
    name: "Unibank Careers",
    url: "https://unibank.az/az/hrsnew/vacanciesHrm/232",
    sourceDomain: "unibank.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "unibank-glorri-accordion",
    trustTier: "official",
    priority: 87,
    cadenceMinutes: 90,
    hasDetailPages: "no",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Unibank",
    maxRecordsPerRun: 36,
    notes: "Official HR page with visible vacancy accordion rows and explicit Glorri apply URLs."
  },
  {
    id: "xalq-bank-careers",
    name: "Xalq Bank Careers",
    url: "https://www.xalqbank.az/az/ferdi/bank/career",
    sourceDomain: "www.xalqbank.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "xalqbank-glorri-list",
    trustTier: "official",
    priority: 86,
    cadenceMinutes: 90,
    hasDetailPages: "no",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Xalq Bank",
    maxRecordsPerRun: 36,
    notes: "Official career page with visible vacancy cards that link directly to Glorri-hosted vacancy pages."
  },
  {
    id: "azerpost-human-resources",
    name: "Azerpost Human Resources",
    url: "https://www.azerpost.az/en/human-resources",
    sourceDomain: "www.azerpost.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "azerpost-glorri-prop",
    trustTier: "official",
    priority: 85,
    cadenceMinutes: 120,
    hasDetailPages: "no",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Azərpoçt MMC",
    maxRecordsPerRun: 12,
    notes: "Official HR page exposing Glorri vacancy URLs in an embedded vacancies prop."
  },
  {
    id: "azersun-careers",
    name: "Azersun Careers",
    url: "https://hr.azersun.com/",
    crawlUrl: "https://hr.azersun.com/search/",
    sourceDomain: "hr.azersun.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "jobs2web-search-results",
    trustTier: "official",
    priority: 84,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Azersun Holding",
    maxRecordsPerRun: 30,
    notes: "Official SAP SuccessFactors Jobs2Web search page with explicit /job/{slug}/{id}/ detail pages and on-site apply actions."
  },
  {
    id: "azercosmos-careers",
    name: "Azercosmos Careers",
    url: "https://azercosmos.az/en/about-us/careers",
    sourceDomain: "azercosmos.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "azercosmos-collapsible",
    trustTier: "official",
    priority: 84,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Azercosmos",
    maxRecordsPerRun: 12,
    notes: "Official careers page with visible open-position blocks and explicit detail/apply links."
  },
  {
    id: "azergold-careers",
    name: "Azergold Careers",
    url: "https://azergold.az/en/karyera",
    crawlUrl: "https://careers.azergold.az",
    sourceDomain: "azergold.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "azergold-table",
    trustTier: "official",
    priority: 83,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Azergold",
    maxRecordsPerRun: 24,
    notes: "Official Azergold careers entry that leads to a dedicated vacancy host with explicit detail URLs and deadline columns."
  },
  {
    id: "yelo-bank-careers",
    name: "Yelo Bank Careers",
    url: "https://www.yelo.az/en/about-bank/career/",
    sourceDomain: "www.yelo.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "yelo-vacancies-list",
    trustTier: "official",
    priority: 82,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "unknown",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Yelo Bank",
    maxRecordsPerRun: 20,
    notes: "Official careers page with explicit vacancy detail anchors using ?vacancy= query parameters."
  },
  {
    id: "akkord-careers",
    name: "Akkord Careers",
    url: "https://www.akkord.az/en/career/",
    sourceDomain: "www.akkord.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "akkord-article-list",
    trustTier: "official",
    priority: 81,
    cadenceMinutes: 180,
    hasDetailPages: "yes",
    hasApplyUrls: "unknown",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Akkord",
    maxRecordsPerRun: 14,
    notes: "Official vacancy list with explicit /en/career/{slug}/ detail pages."
  },
  {
    id: "oba-market-careers",
    name: "OBA Market Careers",
    url: "https://www.obamarket.az/en/haqqimizda/",
    crawlUrl: "https://jobs.glorri.com/companies/oba",
    sourceDomain: "www.obamarket.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "glorri-company-vacancies",
    trustTier: "official",
    priority: 80,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "OBA Market MMC",
    maxRecordsPerRun: 18,
    notes: "Official OBA site links to its Glorri company vacancy page, which exposes explicit vacancy detail URLs."
  },
  {
    id: "bp-azerbaijan-careers",
    name: "BP Azerbaijan Careers",
    url: "https://www.bp.com/en/global/corporate/careers/professionals/locations/azerbaijan.html",
    sourceDomain: "www.bp.com",
    countryOrMarket: "Azerbaijan",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 79,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "BP Azerbaijan",
    notes: "Official Azerbaijan location careers entry, but the page returned access restrictions from this environment and is held for compliance/manual review.",
    disabledReason: "access_restricted_pending_manual_review"
  },
  {
    id: "kapitalbank-career",
    name: "Kapital Bank Career",
    url: "https://kapitalbank.az/career",
    sourceDomain: "kapitalbank.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "python-selenium",
    trustTier: "official",
    priority: 87,
    cadenceMinutes: 90,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Kapital Bank",
    notes: "Official career entry page that redirects to careers.bir.az and exposes vacancy/apply hooks.",
    disabledReason: "custom_careers_app_requires_site_specific_extractor"
  },
  {
    id: "accessbank-vacancies",
    name: "AccessBank Vacancies",
    url: "https://www.accessbank.az/en/our-bank/vacancies/",
    sourceDomain: "www.accessbank.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "json-feed",
    feedProvider: "glorri-embed",
    feedCompanyId: "60826ae53c6e509e53e63297",
    feedUrl: "https://api.glorri.com/integration-service/jobs/company-page?companyId=60826ae53c6e509e53e63297",
    trustTier: "official",
    priority: 84,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "AccessBank",
    maxRecordsPerRun: 24,
    notes: "Official careers page embeds a Glorri vacancy widget; the published embed script exposes a stable public integration API."
  },
  {
    id: "bank-respublika-careers",
    name: "Bank Respublika Careers",
    url: "https://www.bankrespublika.az/en/career",
    sourceDomain: "www.bankrespublika.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "json-feed",
    feedProvider: "glorri-embed",
    feedCompanyId: "63f44b0476b8f18245f3571e",
    feedUrl: "https://api.glorri.com/integration-service/jobs/company-page?companyId=63f44b0476b8f18245f3571e",
    trustTier: "official",
    priority: 83,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Bank Respublika",
    maxRecordsPerRun: 20,
    notes: "Official careers page embeds a Glorri vacancy widget; the published embed script exposes a stable public integration API."
  },
  {
    id: "avromed-vacancies",
    name: "Avromed Vacancies",
    url: "https://www.avromed.az/en/vacancy",
    sourceDomain: "www.avromed.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "json-feed",
    feedProvider: "glorri-embed",
    feedCompanyId: "6523ec4a5b331903932ee36d",
    feedUrl: "https://api.glorri.com/integration-service/jobs/company-page?companyId=6523ec4a5b331903932ee36d",
    trustTier: "official",
    priority: 82,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Avromed Company",
    maxRecordsPerRun: 20,
    notes: "Official Avromed vacancies page embeds a Glorri widget; the published embed script exposes a stable public integration API."
  },
  {
    id: "ejob-az",
    name: "eJob.az",
    url: "https://ejob.az/vakansiyalar/",
    sourceDomain: "ejob.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "python-selenium",
    trustTier: "trusted-board",
    priority: 83,
    cadenceMinutes: 120,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    notes: "Reachable board, but the verified entry point is still a category hub rather than a stable vacancy feed.",
    disabledReason: "requires_category_crawl_before_safe_extraction"
  },
  {
    id: "acb-career",
    name: "ACB Career",
    url: "https://acb.az/en/career",
    sourceDomain: "acb.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 82,
    cadenceMinutes: 120,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Azerbaijan Credit Bank",
    notes: "Official career page is reachable, but verified vacancy detail pages were not exposed in the listing HTML.",
    disabledReason: "no_verified_listing_feed_in_source_html"
  },
  {
    id: "pashabank-az-careers",
    name: "PASHA Bank Azerbaijan Careers",
    url: "https://www.pashabank.az/careers/lang,en/#!/vacancies/",
    sourceDomain: "www.pashabank.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 80,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "PASHA Bank",
    notes: "Discovered from PASHA Holding group careers, but the final careers host returns Access Denied from this environment.",
    disabledReason: "access_denied"
  },
  {
    id: "pashatravel-career",
    name: "PASHA Travel Career",
    url: "https://career.pashatravel.az/",
    sourceDomain: "career.pashatravel.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 78,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "PASHA Travel",
    notes: "Discovered from PASHA Holding group careers, but the host was unreachable from this environment.",
    disabledReason: "unreachable_host"
  },
  {
    id: "socar-careers",
    name: "SOCAR Careers",
    url: "https://careers.socar.az/vacancyInfo?type=1",
    sourceDomain: "careers.socar.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 82,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "SOCAR",
    notes: "Official SOCAR careers entry is reachable and exposes vacancy-type navigation, but a stable public detail/apply extractor is not yet in place.",
    disabledReason: "requires_site_specific_extractor"
  },
  {
    id: "azercell-careers",
    name: "Azercell Careers",
    url: "https://www.azercell.com/en/about-us/career.html",
    sourceDomain: "www.azercell.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 81,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Azercell",
    notes: "Official career URL currently returns a request-rejected page from this environment, so it stays in reviewed/manual mode.",
    disabledReason: "request_rejected_from_source"
  },
  {
    id: "bakcell-vacancies",
    name: "Bakcell Vacancies",
    url: "https://www.bakcell.com/en/vacancies",
    sourceDomain: "www.bakcell.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 80,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Bakcell",
    notes: "Official vacancies page returned a 403 challenge from this environment and is held for manual review instead of brittle scraping.",
    disabledReason: "cloudflare_challenge"
  },
  {
    id: "azerconnect-careers",
    name: "Azerconnect Careers",
    url: "https://www.azerconnect.az/en/careers",
    crawlUrl: "https://www.azerconnect.az/en/vacancies",
    sourceDomain: "www.azerconnect.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "azerconnect-vacancies",
    trustTier: "official",
    priority: 84,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "yes",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Azerconnect Group",
    maxRecordsPerRun: 20,
    notes: "Official vacancies page exposes explicit Oracle candidate-experience share URLs that can be validated as real vacancy/apply targets."
  },
  {
    id: "azertelecom-careers",
    name: "AzerTelecom Careers",
    url: "https://www.azertelecom.az/en/careers",
    sourceDomain: "www.azertelecom.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 79,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "AzerTelecom",
    notes: "Seed URL currently returns 404 from this environment, so the source remains in inventory and daily review only.",
    disabledReason: "seed_url_404"
  },
  {
    id: "veyseloglu-group-careers",
    name: "Veysəloğlu Group Careers",
    url: "https://www.veyseloglu.az/en/career/career-opportunities",
    sourceDomain: "www.veyseloglu.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 78,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Veysəloğlu Group",
    notes: "Corporate careers entry needs a stable vacancy-detail handoff before automated extraction is enabled.",
    disabledReason: "listing_gateway_requires_followup_parser"
  },
  {
    id: "veyseloglu-job-portal",
    name: "Veysəloğlu Job Portal",
    url: "https://job.veyseloglu.az/",
    crawlUrl: "https://job.veyseloglu.az/home/allvacancies?pageIndex=1&pageSize=20",
    sourceDomain: "job.veyseloglu.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 79,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Veysəloğlu Group",
    notes: "Official vacancy portal is reachable, but the sampled listing endpoint did not expose stable vacancy detail anchors yet.",
    disabledReason: "stable_detail_urls_not_exposed"
  },
  {
    id: "bravo-supermarket-careers",
    name: "Bravo Supermarket Careers",
    url: "https://www.bravosupermarket.az/career",
    crawlUrl: "https://www.bravosupermarket.az/career/all-vacancies/",
    sourceDomain: "www.bravosupermarket.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    htmlParser: "bravo-vacancy-list",
    trustTier: "official",
    priority: 83,
    cadenceMinutes: 120,
    hasDetailPages: "yes",
    hasApplyUrls: "unknown",
    reliableEnough: true,
    extractionReady: true,
    companyNameOverride: "Bravo Supermarket",
    maxRecordsPerRun: 24,
    notes: "Official all-vacancies page exposes explicit vacancy detail URLs on the brand domain and works with deterministic anchor extraction."
  },
  {
    id: "araz-supermarket-careers",
    name: "Araz Supermarket Careers",
    url: "https://www.arazmarket.az/career",
    sourceDomain: "www.arazmarket.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 78,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Araz Supermarket",
    notes: "Seed career URL rewrites into a 404 from this environment, so the source remains in daily review but not active ingestion.",
    disabledReason: "seed_url_404"
  },
  {
    id: "pasha-life-careers",
    name: "PASHA Life Careers",
    url: "https://pasha-life.az/en/about/career/",
    sourceDomain: "pasha-life.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 78,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "PASHA Life",
    notes: "Seed career URL currently returns 404 from this environment and stays in reviewed/manual mode.",
    disabledReason: "seed_url_404"
  },
  {
    id: "azal-careers",
    name: "AZAL Careers",
    url: "https://www.azal.az/en/career",
    sourceDomain: "www.azal.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 77,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Azerbaijan Airlines (AZAL)",
    notes: "Official career page is behind a Cloudflare challenge from this environment and is kept out of automated scraping.",
    disabledReason: "cloudflare_challenge"
  },
  {
    id: "aztelekom-careers",
    name: "Aztelekom Careers",
    url: "https://www.aztelekom.az/en/career",
    sourceDomain: "www.aztelekom.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 77,
    cadenceMinutes: 180,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Aztelekom",
    notes: "Official career URL returned 403 from this environment and remains in reviewed/manual mode.",
    disabledReason: "forbidden_from_environment"
  },
  {
    id: "norm-cement-careers",
    name: "Norm Cement Careers",
    url: "https://normcement.az/en/career",
    sourceDomain: "normcement.az",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 76,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Norm",
    notes: "Seed career host failed DNS resolution from this environment and is held in manual review.",
    disabledReason: "dns_failure"
  },
  {
    id: "baku-steel-company-careers",
    name: "Baku Steel Company Careers",
    url: "https://www.bakusteelcompany.com/career",
    sourceDomain: "www.bakusteelcompany.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 76,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Baku Steel Company",
    notes: "Seed host failed DNS resolution from this environment and is held in manual review.",
    disabledReason: "dns_failure"
  },
  {
    id: "microsoft-careers",
    name: "Microsoft Careers",
    url: "https://careers.microsoft.com/",
    sourceDomain: "careers.microsoft.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 72,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Microsoft",
    countryOrMarket: "Global",
    notes: "Official careers home is reachable, but a stable public vacancy listing/detail endpoint still needs a dedicated extractor.",
    disabledReason: "custom_careers_app_requires_site_specific_extractor"
  },
  {
    id: "coca-cola-company-careers",
    name: "The Coca-Cola Company Careers",
    url: "https://jobs.coca-colacompany.com/",
    sourceDomain: "jobs.coca-colacompany.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 71,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "The Coca-Cola Company",
    countryOrMarket: "Global / Azerbaijan-relevant",
    notes: "Official careers host did not resolve from this environment and remains in manual review.",
    disabledReason: "dns_failure"
  },
  {
    id: "pepsico-careers",
    name: "PepsiCo Careers",
    url: "https://www.pepsicojobs.com/",
    crawlUrl: "https://www.pepsicojobs.com/main/jobs",
    sourceDomain: "www.pepsicojobs.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 71,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "PepsiCo",
    countryOrMarket: "Global / Azerbaijan-relevant",
    notes: "Official jobs host is reachable, but sampled pages currently expose category/search navigation rather than stable single-job detail anchors.",
    disabledReason: "search_hub_requires_site_specific_extractor"
  },
  {
    id: "deloitte-azerbaijan-careers",
    name: "Deloitte Azerbaijan Careers",
    url: "https://www2.deloitte.com/az/en/careers.html",
    sourceDomain: "www.deloitte.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 70,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "Deloitte Azerbaijan",
    countryOrMarket: "Azerbaijan",
    notes: "Official Azerbaijan careers page is reachable, but sampled markup did not expose stable job-detail links yet.",
    disabledReason: "detail_pages_not_exposed"
  },
  {
    id: "ey-careers",
    name: "EY Careers",
    url: "https://www.ey.com/en_gl/careers",
    sourceDomain: "www.ey.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 70,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "EY",
    countryOrMarket: "Global / Azerbaijan-relevant",
    notes: "Official careers page is reachable, but stable single-job anchors were not exposed in sampled markup.",
    disabledReason: "detail_pages_not_exposed"
  },
  {
    id: "kpmg-careers",
    name: "KPMG Careers",
    url: "https://home.kpmg/xx/en/home/careers.html",
    crawlUrl: "https://kpmg.com/xx/en/careers/job-search.html",
    sourceDomain: "kpmg.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 70,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "KPMG",
    countryOrMarket: "Global / Azerbaijan-relevant",
    notes: "Official careers/search pages are reachable, but sampled markup did not expose stable job-detail URLs yet.",
    disabledReason: "detail_pages_not_exposed"
  },
  {
    id: "pwc-careers",
    name: "PwC Careers",
    url: "https://www.pwc.com/gx/en/careers.html",
    sourceDomain: "www.pwc.com",
    sourceType: "company-career-page",
    kind: "career-page",
    adapter: "html-discovery",
    trustTier: "official",
    priority: 70,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    companyNameOverride: "PwC",
    countryOrMarket: "Global / Azerbaijan-relevant",
    notes: "Official careers page is reachable, but sampled markup did not expose stable single-job anchors.",
    disabledReason: "detail_pages_not_exposed"
  },
  {
    id: "jobhub-az",
    name: "JobHub.az",
    url: "https://jobhub.az/",
    sourceDomain: "jobhub.az",
    sourceType: "vacancy-aggregator",
    kind: "aggregator",
    adapter: "html-discovery",
    trustTier: "aggregator",
    priority: 60,
    cadenceMinutes: 240,
    hasDetailPages: "yes",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    notes: "Discovered public vacancy pages, but sampled content looked synthetic/demo-like rather than a reliable Azerbaijan job feed.",
    disabledReason: "source_reliability_insufficient"
  },
  {
    id: "linkedin-jobs",
    name: "LinkedIn Jobs",
    url: "https://www.linkedin.com/jobs/",
    sourceDomain: "www.linkedin.com",
    sourceType: "restricted-source",
    kind: "aggregator",
    adapter: "html-discovery",
    trustTier: "restricted",
    priority: 15,
    cadenceMinutes: 0,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    policy: "restricted",
    discoveryMethod: "restricted-source",
    notes: "Restricted anti-bot source. Use only as secondary evidence or manual review, never as a primary scraped feed.",
    disabledReason: "restricted_source_not_primary_ingestion",
    restrictedReason: "anti_bot_and_terms_risk"
  },
  {
    id: "glassdoor-jobs",
    name: "Glassdoor Jobs",
    url: "https://www.glassdoor.com/Job/index.htm",
    sourceDomain: "www.glassdoor.com",
    sourceType: "restricted-source",
    kind: "aggregator",
    adapter: "html-discovery",
    trustTier: "restricted",
    priority: 14,
    cadenceMinutes: 0,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    policy: "restricted",
    discoveryMethod: "restricted-source",
    notes: "Restricted anti-bot source. Keep out of automated primary ingestion and use only as secondary reference if explicitly approved.",
    disabledReason: "restricted_source_not_primary_ingestion",
    restrictedReason: "anti_bot_and_terms_risk"
  },
  {
    id: "primejob-az",
    name: "PrimeJob.az",
    url: "https://primejob.az/",
    sourceDomain: "primejob.az",
    sourceType: "local-job-board",
    kind: "job-board",
    adapter: "html-discovery",
    trustTier: "trusted-board",
    priority: 58,
    cadenceMinutes: 240,
    hasDetailPages: "unknown",
    hasApplyUrls: "unknown",
    reliableEnough: false,
    extractionReady: false,
    enabled: false,
    notes: "Domain was discovered during source expansion, but the host was not reliably reachable from this environment.",
    disabledReason: "unreachable_host_or_dns_failure"
  }
];

export function getScrapeSourceInventory() {
  return sortSources(scrapeSources);
}

export function getEnabledScrapeSources() {
  return sortSources(scrapeSources).filter(
    (source) =>
      source.enabled !== false &&
      source.reliableEnough &&
      source.extractionReady
  );
}
