import az from "../../locales/az.json";
import en from "../../locales/en.json";
import ru from "../../locales/ru.json";

export const supportedLocales = ["az", "en", "ru"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "az";
export const localeCookieName = "careerapple_locale";

const dictionaries = { az, en, ru } as const;

const localizedMonthNames: Record<Locale, string[]> = {
  az: [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avqust",
    "sentyabr",
    "oktyabr",
    "noyabr",
    "dekabr"
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ],
  ru: [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря"
  ]
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

function parseIsoDateParts(value: string) {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return {
      year: Number(year),
      monthIndex: Number(month) - 1,
      day: Number(day)
    };
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    year: parsedDate.getUTCFullYear(),
    monthIndex: parsedDate.getUTCMonth(),
    day: parsedDate.getUTCDate()
  };
}

export function formatLocalizedDate(value: string, locale: Locale) {
  const dateParts = parseIsoDateParts(value);

  if (!dateParts) {
    return value;
  }

  const monthName = localizedMonthNames[locale][dateParts.monthIndex];

  if (!monthName) {
    return value;
  }

  if (locale === "en") {
    return `${monthName} ${dateParts.day}, ${dateParts.year}`;
  }

  return `${dateParts.day} ${monthName} ${dateParts.year}`;
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
