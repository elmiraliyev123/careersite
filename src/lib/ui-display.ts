import { getHostnameLabel } from "@/lib/outbound";
import { sanitizeText } from "@/lib/text-sanitizer";

type TextOptions = {
  multiline?: boolean;
};

export type DisplayLocale = "az" | "en" | "ru";
export type NormalizedRoleLevel =
  | "internship"
  | "trainee"
  | "junior"
  | "entry_level"
  | "new_graduate"
  | "mid"
  | "senior"
  | "manager"
  | "unknown";

const UNKNOWN_LABELS = new Set([
  "naməlum",
  "namelum",
  "naməlum sektor",
  "namelum sektor",
  "unknown",
  "unknown sector"
]);

const GENERIC_TAXONOMY_LABELS = new Set([
  "other",
  "digər",
  "diger",
  "другое",
  "general",
  "global"
]);

const TAG_STOPWORDS = new Set([
  "ve",
  "və",
  "and",
  "or",
  "the",
  "for",
  "ile",
  "ilə",
  "bir",
  "job",
  "jobs",
  "role",
  "roles",
  "position",
  "positions",
  "opening",
  "openings",
  "vacancy",
  "vacancies",
  "source"
]);

const BROKEN_DISPLAY_PATTERNS = [
  /&(?:[a-z][a-z0-9]+);?/i,
  /^[a-z]\s+(?:performans|dostu|kitabxana|komanda|test|nəzarət|nezaret)\b/i,
  /^(?:g[oö]rəcəyiniz işlər|rəcəyiniz işlər|goreceyiniz isler|receyiniz isler|tələblər|telebler|requirements|responsibilities|vəzifələr|vezifeler):?$/i
];

function normalizeComparableValue(value: string) {
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
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ROLE_LEVEL_DISPLAY_LABELS: Record<
  Exclude<NormalizedRoleLevel, "unknown">,
  Record<DisplayLocale, string>
> = {
  internship: {
    az: "Təcrübə",
    en: "Internship",
    ru: "Стажировка"
  },
  trainee: {
    az: "Təcrübəçi",
    en: "Trainee",
    ru: "Стажер"
  },
  junior: {
    az: "Junior",
    en: "Junior",
    ru: "Junior"
  },
  entry_level: {
    az: "Başlanğıc səviyyə",
    en: "Entry level",
    ru: "Начальный уровень"
  },
  new_graduate: {
    az: "Yeni məzun",
    en: "New graduate",
    ru: "Выпускник"
  },
  mid: {
    az: "Mid",
    en: "Mid",
    ru: "Mid"
  },
  senior: {
    az: "Senior",
    en: "Senior",
    ru: "Senior"
  },
  manager: {
    az: "Menecer",
    en: "Manager",
    ru: "Менеджер"
  }
};

const TAG_DISPLAY_LABELS: Record<string, Record<DisplayLocale, string>> = {
  ...ROLE_LEVEL_DISPLAY_LABELS,
  baku: {
    az: "Bakı",
    en: "Baku",
    ru: "Баку"
  },
  azerbaijan: {
    az: "Azərbaycan",
    en: "Azerbaijan",
    ru: "Азербайджан"
  },
  onsite: {
    az: "Ofisdən",
    en: "On-site",
    ru: "Офис"
  },
  hybrid: {
    az: "Hibrid",
    en: "Hybrid",
    ru: "Гибрид"
  },
  remote: {
    az: "Uzaqdan",
    en: "Remote",
    ru: "Удаленно"
  }
};

function getUrlHostnameLabel(value: string | null | undefined) {
  const sanitized = sanitizeText(value);

  if (!sanitized) {
    return null;
  }

  try {
    const parsed = new URL(sanitized.includes("://") ? sanitized : `https://${sanitized}`);
    if (!parsed.hostname.includes(".")) {
      return null;
    }

    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeRoleComparable(value: string | null | undefined) {
  return normalizeComparableValue(getMeaningfulText(value) ?? "");
}

export function normalizeRoleLevel(value: string | null | undefined): NormalizedRoleLevel {
  const comparable = normalizeRoleComparable(value);

  if (!comparable) {
    return "unknown";
  }

  if (/\btrainee\b/.test(comparable)) {
    return "trainee";
  }

  if (
    /\b(intern|internship|staj|tecrube|tecrubeci|tecrube proqrami|staj proqrami|стажировка|стажер)\b/i.test(
      comparable
    )
  ) {
    return "internship";
  }

  if (/\b(new graduate|new grad|graduate|graduate program|graduate scheme|yeni mezun|mezun)\b/.test(comparable)) {
    return "new_graduate";
  }

  if (/\b(entry level|entrylevel|baslangic seviyy[eə]|baslangic|assistant|associate)\b/.test(comparable)) {
    return "entry_level";
  }

  if (/\bjunior\b|\bkicik mutexessis\b|\bgenc mutexessis\b/.test(comparable)) {
    return "junior";
  }

  if (/\bmanager\b|\bmenecer\b|\brəhbər\b|\brehber\b/.test(comparable)) {
    return "manager";
  }

  if (/\bsenior\b/.test(comparable)) {
    return "senior";
  }

  if (/\b(mid|middle)\b/.test(comparable)) {
    return "mid";
  }

  if (UNKNOWN_LABELS.has(comparable) || /\bunknown\b|\bnamelum\b/.test(comparable)) {
    return "unknown";
  }

  return "unknown";
}

export function isAllFilterValue(value: string | null | undefined) {
  const comparable = normalizeComparableValue(value ?? "");
  return !comparable || comparable === "all" || comparable === "hamisi" || comparable === "hamısı";
}

export function getRoleLevelDisplayLabel(
  value: string | null | undefined,
  locale: DisplayLocale
) {
  const level = normalizeRoleLevel(value);
  return level === "unknown" ? null : ROLE_LEVEL_DISPLAY_LABELS[level]?.[locale] ?? null;
}

export function getMeaningfulText(
  value: string | null | undefined,
  options: TextOptions = {}
) {
  const sanitized = sanitizeText(value, options);
  if (BROKEN_DISPLAY_PATTERNS.some((pattern) => pattern.test(sanitized))) {
    return null;
  }

  return sanitized || null;
}

export function dedupeDisplayTextList(
  values: string[] | null | undefined,
  options: TextOptions = {}
) {
  const seen = new Set<string>();

  return (values ?? []).flatMap((value) => {
    const text = getMeaningfulText(value, options);

    if (!text) {
      return [];
    }

    const comparable = normalizeComparableValue(text);

    if (!comparable || seen.has(comparable)) {
      return [];
    }

    seen.add(comparable);
    return [text];
  });
}

export function isUnknownValue(value: string | null | undefined) {
  const text = getMeaningfulText(value);

  if (!text) {
    return false;
  }

  return UNKNOWN_LABELS.has(normalizeComparableValue(text));
}

export function isGenericTaxonomyValue(value: string | null | undefined) {
  const text = getMeaningfulText(value);

  if (!text) {
    return false;
  }

  return GENERIC_TAXONOMY_LABELS.has(normalizeComparableValue(text));
}

export function getMeaningfulTaxonomyValue(value: string | null | undefined) {
  const text = getMeaningfulText(value);

  if (!text || isUnknownValue(text) || isGenericTaxonomyValue(text)) {
    return null;
  }

  return text;
}

export function getMeaningfulMetadataValue(value: string | null | undefined) {
  const text = getMeaningfulText(value);

  if (!text || isUnknownValue(text) || isGenericTaxonomyValue(text)) {
    return null;
  }

  return text;
}

export function isTemplateFillerText(value: string | null | undefined) {
  const text = getMeaningfulText(value, { multiline: true });

  if (!text) {
    return false;
  }

  const comparable = normalizeComparableValue(text);
  return (
    /^bu profil yalniz/.test(comparable) ||
    /^bu minimal profil/.test(comparable) ||
    /^aciq rollar .+ menbesinden toplanir/.test(comparable) ||
    /avtomatik yarad/.test(comparable) ||
    /resmi sirket melumati ayrica tesdiqlenmedikce/.test(comparable) ||
    /reserved for a short clear introduction/.test(comparable) ||
    /understand the role in seconds/.test(comparable)
  );
}

export function getMeaningfulProfileText(
  value: string | null | undefined,
  options: TextOptions = {}
) {
  const text = getMeaningfulText(value, options);

  if (!text || isTemplateFillerText(text)) {
    return null;
  }

  return text;
}

function isNoiseTag(value: string, comparable: string) {
  if (!comparable) {
    return true;
  }

  if (UNKNOWN_LABELS.has(comparable) || GENERIC_TAXONOMY_LABELS.has(comparable)) {
    return true;
  }

  if (TAG_STOPWORDS.has(comparable) || comparable.length < 2) {
    return true;
  }

  return /\b(?:career|careers|job|jobs|vacanc(?:y|ies)|opening|openings|position|positions|source)\b/i.test(
    value
  );
}

export function isMeaningfulLevel(value: string | null | undefined) {
  return normalizeRoleLevel(value) !== "unknown";
}

export function getDisplayDomain(value: string | null | undefined) {
  const sanitized = sanitizeText(value);
  return sanitized ? getHostnameLabel(sanitized) ?? getUrlHostnameLabel(sanitized) : null;
}

function normalizeTagKey(value: string, comparable: string) {
  const roleLevel = normalizeRoleLevel(value);

  if (roleLevel !== "unknown") {
    return roleLevel;
  }

  if (/\b(baki|baku|baki seheri)\b/.test(comparable)) {
    return "baku";
  }

  if (comparable === "az" || /\b(azerbaijan|azerbaycan|azerbaycan|azerbaijan)\b/.test(comparable)) {
    return "azerbaijan";
  }

  if (/\b(remote|uzaqdan|удален)\b/i.test(value)) {
    return "remote";
  }

  if (/\b(hybrid|hibrid|гибрид)\b/i.test(value)) {
    return "hybrid";
  }

  if (/\b(onsite|on site|on-site|ofisden|ofisdən|офис)\b/i.test(value)) {
    return "onsite";
  }

  return null;
}

export function normalizeDisplayTags(
  values: string[] | null | undefined,
  locale: DisplayLocale = "az"
) {
  const seen = new Set<string>();

  return (values ?? []).flatMap((value) => {
    const text = getMeaningfulText(value);

    if (!text) {
      return [];
    }

    const comparable = normalizeComparableValue(text);
    const tagKey = normalizeTagKey(text, comparable);
    const dedupeKey = tagKey ?? comparable;

    if ((!tagKey && isNoiseTag(text, comparable)) || seen.has(dedupeKey)) {
      return [];
    }

    seen.add(dedupeKey);
    return [tagKey ? TAG_DISPLAY_LABELS[tagKey]?.[locale] ?? text : text];
  });
}

export function normalizeLocationName(value: string | null | undefined) {
  const text = getMeaningfulMetadataValue(value);

  if (!text) {
    return null;
  }

  const comparable = normalizeComparableValue(text);

  if (/\b(baki|baku)\b/.test(comparable) || comparable === "baki seheri") {
    return "Bakı";
  }

  if (comparable === "az" || comparable === "azerbaijan" || comparable === "azerbaycan") {
    return "Azərbaycan";
  }

  return text;
}

export function getPublicLocationLabel(value: string | null | undefined) {
  const normalized = normalizeLocationName(value);

  if (!normalized) {
    return null;
  }

  const comparable = normalizeComparableValue(normalized);
  const foreignCityLabels = new Set([
    "san fransisko",
    "san francisco",
    "london",
    "tallinn",
    "dublin",
    "warsaw",
    "varsava",
    "istanbul",
    "ankara"
  ]);

  return foreignCityLabels.has(comparable) ? null : normalized;
}

export function getDisplaySourceLabel(input: {
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceListingUrl?: string | null;
  jobDetailUrl?: string | null;
}) {
  const sourceDomain =
    getUrlHostnameLabel(input.sourceListingUrl) ??
    getUrlHostnameLabel(input.sourceUrl) ??
    getUrlHostnameLabel(input.jobDetailUrl);

  if (sourceDomain) {
    return sourceDomain;
  }

  const sourceName = getMeaningfulMetadataValue(input.sourceName);

  if (!sourceName) {
    return null;
  }

  return getUrlHostnameLabel(sourceName) ?? sourceName;
}
