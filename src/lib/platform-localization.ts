import type { Company, Job } from "@/data/platform";
import type { Locale } from "@/lib/i18n";
import { getLocalizedText, getLocalizedTextList } from "@/lib/localized-content";
import { translateJobDisplayText } from "@/lib/search-normalization";
import { sanitizeText, sanitizeTextList } from "@/lib/text-sanitizer";
import {
  dedupeDisplayTextList,
  getMeaningfulMetadataValue,
  getMeaningfulProfileText,
  normalizeDisplayTags,
  normalizeLocationName,
  normalizeRoleLevel
} from "@/lib/ui-display";

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
    sector: getMeaningfulMetadataValue(company.sector) ?? "",
    location: normalizeLocationName(company.location) ?? "",
    tagline: getMeaningfulProfileText(resolveLocalizedContent(locale, company.tagline, localized?.tagline)) ?? "",
    about:
      getMeaningfulProfileText(resolveLocalizedContent(locale, company.about, localized?.about), {
        multiline: true
      }) ?? "",
    wikipediaSummary: sanitizeText(company.wikipediaSummary, { multiline: true }) || undefined,
    focusAreas: dedupeDisplayTextList(sanitizeTextList(company.focusAreas)),
    youthOffer: dedupeDisplayTextList(sanitizeTextList(company.youthOffer)),
    benefits: dedupeDisplayTextList(sanitizeTextList(company.benefits)),
    industryTags: dedupeDisplayTextList(
      sanitizeTextList(company.industryTags ?? [company.sector]).flatMap((item) => {
        const value = getMeaningfulMetadataValue(item);
        return value ? [value] : [];
      })
    )
  };
}

export function getLocalizedJob(job: Job, locale: Locale): LocalizedJob {
  const title = translateJobDisplayText(getLocalizedText(job.title, locale), locale);
  const summary = translateJobDisplayText(getLocalizedText(job.summary, locale), locale);
  const category = translateJobDisplayText(getLocalizedText(job.category, locale), locale);
  const tags = normalizeDisplayTags(
    getLocalizedTextList(job.tags, locale).map((tag) => translateJobDisplayText(tag, locale)),
    locale
  );

  return {
    ...job,
    title,
    summary,
    category,
    tags,
    city: normalizeLocationName(job.city) ?? "",
    level: normalizeRoleLevel(job.level),
    responsibilities: dedupeDisplayTextList(job.responsibilities, { multiline: true }),
    requirements: dedupeDisplayTextList(job.requirements, { multiline: true }),
    benefits: dedupeDisplayTextList(job.benefits, { multiline: true }),
    applyUrl: job.applyUrl,
    directCompanyUrl: job.directCompanyUrl
  };
}
