import type { Company, Job } from "@/data/platform";
import type { Locale } from "@/lib/i18n";
import { getLocalizedText, getLocalizedTextList } from "@/lib/localized-content";
import { translateJobDisplayText } from "@/lib/search-normalization";
import { sanitizeText, sanitizeTextList } from "@/lib/text-sanitizer";

type LocalizedValue = Partial<Record<Locale, string>>;

export type LocalizedCompany = Omit<Company, "tagline" | "about"> & {
  tagline: string;
  about: string;
};

export type LocalizedJob = Omit<Job, "title" | "summary" | "category" | "tags"> & {
  title: string;
  summary: string;
  category: string;
  tags: string[];
};

const localizedCompanyContent: Record<
  string,
  {
    tagline?: LocalizedValue;
    about?: LocalizedValue;
  }
> = {};

function resolveLocalizedContent(
  locale: Locale,
  baseValue: string,
  translations?: LocalizedValue
) {
  if (locale === "az") {
    return baseValue;
  }

  return translations?.[locale] ?? translations?.en ?? baseValue;
}

export function getLocalizedCompany(company: Company, locale: Locale): LocalizedCompany {
  const localized = localizedCompanyContent[company.slug];

  return {
    ...company,
    name: sanitizeText(company.name),
    sector: sanitizeText(company.sector),
    location: sanitizeText(company.location),
    tagline: sanitizeText(resolveLocalizedContent(locale, company.tagline, localized?.tagline)),
    about: sanitizeText(resolveLocalizedContent(locale, company.about, localized?.about), {
      multiline: true
    }),
    wikipediaSummary: sanitizeText(company.wikipediaSummary, { multiline: true }) || undefined,
    focusAreas: sanitizeTextList(company.focusAreas),
    youthOffer: sanitizeTextList(company.youthOffer),
    benefits: sanitizeTextList(company.benefits),
    industryTags: sanitizeTextList(company.industryTags ?? [company.sector])
  };
}

export function getLocalizedJob(job: Job, locale: Locale): LocalizedJob {
  const title = translateJobDisplayText(getLocalizedText(job.title, locale), locale);
  const summary = translateJobDisplayText(getLocalizedText(job.summary, locale), locale);
  const tags = getLocalizedTextList(job.tags, locale).map((tag) =>
    translateJobDisplayText(tag, locale)
  );

  return {
    ...job,
    title,
    summary,
    category: getLocalizedText(job.category, locale),
    tags,
    city: sanitizeText(job.city),
    responsibilities: sanitizeTextList(job.responsibilities, { multiline: true }),
    requirements: sanitizeTextList(job.requirements, { multiline: true }),
    benefits: sanitizeTextList(job.benefits, { multiline: true }),
    applyUrl: job.applyUrl,
    directCompanyUrl: job.directCompanyUrl
  };
}
