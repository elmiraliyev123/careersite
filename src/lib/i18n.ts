import az from "../../locales/az.json";
import en from "../../locales/en.json";
import ru from "../../locales/ru.json";

export const supportedLocales = ["az", "en", "ru"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "az";
export const localeCookieName = "careerapple_locale";

const dictionaries = { az, en, ru } as const;

const localeFormats: Record<Locale, string> = {
  az: "az-AZ",
  en: "en-US",
  ru: "ru-RU"
};

const levelKeyMap: Record<string, string> = {
  Hamısı: "all",
  Təcrübə: "internship",
  Junior: "junior",
  Trainee: "trainee",
  "Yeni məzun": "graduate"
};

const workModelKeyMap: Record<string, string> = {
  Hamısı: "all",
  Ofisdən: "onsite",
  Hibrid: "hybrid",
  Uzaqdan: "remote"
};

const cityKeyMap: Record<string, string> = {
  Hamısı: "all",
  Bakı: "baku",
  "San Fransisko": "sanFrancisco",
  London: "london",
  Tallinn: "tallinn",
  Dublin: "dublin",
  Varşava: "warsaw"
};

const categoryKeyMap: Record<string, string> = {
  "Data və analitika": "dataAnalytics",
  "Data & Analytics": "dataAnalytics",
  Dizayn: "design",
  Design: "design",
  Marketinq: "marketing",
  Marketing: "marketing",
  "Əməliyyatlar": "operations",
  Operations: "operations",
  "Risk və uyğunluq": "riskCompliance",
  "Risk & Compliance": "riskCompliance",
  "Risk və sığorta": "riskInsurance",
  "Risk & Insurance": "riskInsurance",
  "Product operations": "productOperations",
  "Product Operations": "productOperations",
  Research: "research",
  "Biznes analitika": "businessAnalytics",
  "Business Analytics": "businessAnalytics",
  "Müştəri təcrübəsi": "customerExperience",
  "Customer Experience": "customerExperience",
  Mühəndislik: "engineering",
  Engineering: "engineering",
  Satış: "sales",
  Sales: "sales"
};

const sectorKeyMap: Record<string, string> = {
  "Produktivlik SaaS": "productivitySaas",
  "Dizayn texnologiyaları": "designTechnology",
  Fintex: "fintech",
  "Commerce platform": "commercePlatform",
  "Qlobal ödənişlər": "globalPayments",
  "Bank və rəqəmsal məhsullar": "digitalBanking",
  "Sığorta və müştəri təcrübəsi": "insuranceExperience",
  FMCG: "fmcg",
  "Construction tech": "constructionTech",
  "Sığorta və risk": "insuranceRisk",
  "Enerji texnologiyaları": "energyTechnology"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readDictionaryValue(dictionary: unknown, key: string): string | null {
  const segments = key.split(".");
  let current: unknown = dictionary;

  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return null;
    }

    current = current[segment];
  }

  return typeof current === "string" ? current : null;
}

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, token) => {
    const value = values[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value ? supportedLocales.includes(value as Locale) : false;
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isSupportedLocale(value?.toLowerCase()) ? (value!.toLowerCase() as Locale) : defaultLocale;
}

export function translate(locale: Locale, key: string, values?: Record<string, string | number>) {
  const localized =
    readDictionaryValue(dictionaries[locale], key) ??
    readDictionaryValue(dictionaries.en, key) ??
    readDictionaryValue(dictionaries.az, key) ??
    key;

  return interpolate(localized, values);
}

export function formatLocalizedDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeFormats[locale], {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function translateMappedValue(
  locale: Locale,
  keyPrefix: string,
  mapping: Record<string, string>,
  value: string
) {
  const key = mapping[value];
  return key ? translate(locale, `${keyPrefix}.${key}`) : value;
}

export function translateLevel(locale: Locale, value: string) {
  return translateMappedValue(locale, "dynamic.levels", levelKeyMap, value);
}

export function translateWorkModel(locale: Locale, value: string) {
  return translateMappedValue(locale, "dynamic.workModels", workModelKeyMap, value);
}

export function translateCity(locale: Locale, value: string) {
  return translateMappedValue(locale, "dynamic.cities", cityKeyMap, value);
}

export function translateCategory(locale: Locale, value: string) {
  return translateMappedValue(locale, "dynamic.categories", categoryKeyMap, value);
}

export function translateSector(locale: Locale, value: string) {
  return translateMappedValue(locale, "dynamic.sectors", sectorKeyMap, value);
}

export function translateFooterSection(locale: Locale, slug: string) {
  return translate(locale, `footer.sections.${slug}`);
}

export function translateFooterPage(locale: Locale, slug: string) {
  return translate(locale, `footer.pages.${slug}`);
}
