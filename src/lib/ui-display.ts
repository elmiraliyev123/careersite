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
export type PublicJobLevel = "internship" | "entry_level" | "mid" | "senior" | "manager" | "unknown";
export type NormalizedWorkModel = "onsite" | "hybrid" | "remote" | "unknown";
export type LocationSource = "structured" | "title" | "description" | "url" | "company_default" | "unknown";

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
  /^ştəri\b/i,
  /^[a-z]\s+(?:performans|dostu|kitabxana|komanda|test|nəzarət|nezaret)\b/i,
  /\b(?:gələn|gelen|olan|edən|eden|üçün|ucun|üzrə|uzre)\s+[a-zəıöüğçş]$/i,
  /^(?:g[oö]rəcəyiniz işlər|rəcəyiniz işlər|goreceyiniz isler|receyiniz isler|tələblər|telebler|requirements|responsibilities|vəzifələr|vezifeler):?$/i
];

export function normalizeComparableValue(value: string) {
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

const AZERBAIJAN_LOCATION_PATTERNS: Array<{
  city: string;
  tokens: string[];
}> = [
  { city: "Sumqayıt", tokens: ["sumqayit", "sumqayıt"] },
  { city: "Gəncə", tokens: ["gence", "gəncə", "ganja", "kepəz", "kepez", "kapaz"] },
  { city: "Lənkəran", tokens: ["lenkeran", "lənkəran", "lankaran"] },
  { city: "Masallı", tokens: ["masalli", "masallı"] },
  { city: "Salyan", tokens: ["salyan"] },
  { city: "Sabirabad", tokens: ["sabirabad"] },
  { city: "Cəlilabad", tokens: ["celilabad", "cəlilabad", "jalilabad"] },
  { city: "Şəki", tokens: ["seki", "şəki", "shaki"] },
  { city: "Şəmkir", tokens: ["semkir", "şəmkir", "shamkir"] },
  { city: "Mingəçevir", tokens: ["mingecevir", "mingəçevir", "mingachevir"] },
  { city: "Naxçıvan", tokens: ["naxcivan", "naxçıvan", "nakhchivan"] },
  { city: "Quba", tokens: ["quba", "guba"] },
  { city: "Qusar", tokens: ["qusar", "gusar"] },
  { city: "Xaçmaz", tokens: ["xacmaz", "xaçmaz", "khachmaz"] },
  { city: "Şirvan", tokens: ["sirvan", "şirvan", "shirvan"] },
  { city: "Bərdə", tokens: ["berde", "bərdə", "barda"] },
  { city: "Ağdaş", tokens: ["agdas", "ağdaş", "agdash"] },
  { city: "Ağcabədi", tokens: ["agcabedi", "ağcabədi", "agjabadi"] },
  { city: "Zaqatala", tokens: ["zaqatala", "zagatala"] },
  { city: "Qəbələ", tokens: ["qebele", "qəbələ", "gabala"] },
  { city: "İsmayıllı", tokens: ["ismayilli", "ismayıllı", "ismailly"] },
  { city: "Göyçay", tokens: ["goycay", "göyçay", "goychay"] },
  { city: "Tovuz", tokens: ["tovuz"] },
  { city: "Şamaxı", tokens: ["samaxi", "şamaxı", "shamakhi"] },
  { city: "Neftçala", tokens: ["neftcala", "neftçala"] },
  { city: "Biləsuvar", tokens: ["bilesuvar", "biləsuvar"] },
  { city: "Beyləqan", tokens: ["beyleqan", "beyləqan"] },
  { city: "Kürdəmir", tokens: ["kurdemir", "kürdəmir"] },
  { city: "Yevlax", tokens: ["yevlax", "yevlakh"] },
  { city: "Xırdalan", tokens: ["xirdalan", "xırdalan", "khirdalan"] },
  { city: "Abşeron", tokens: ["abseron", "abşeron", "absheron"] },
  { city: "Bakı", tokens: ["baki", "bakı", "baku", "baki seheri", "bakı şəhəri"] },
  { city: "Azərbaycan", tokens: ["azerbaycan", "azərbaycan", "azerbaijan", "regional", "regionlar", "regions", "multiple locations"] }
];

const LOCATION_CONTEXT_WORDS = [
  "filial",
  "filiali",
  "filialı",
  "magaza",
  "mağaza",
  "magazasi",
  "mağazası",
  "branch",
  "office",
  "ofis",
  "anbar",
  "warehouse",
  "sobe",
  "şöbə"
];

function findLocationInComparableText(comparable: string) {
  if (!comparable) {
    return null;
  }

  for (const location of AZERBAIJAN_LOCATION_PATTERNS) {
    if (
      location.tokens.some((token) => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|\\s|[(/-])${escaped}(?:$|\\s|[)/,-])`, "i").test(comparable);
      })
    ) {
      return location.city;
    }
  }

  return null;
}

function findLocationInText(value: string | null | undefined) {
  return findLocationInComparableText(normalizeComparableValue(value ?? ""));
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const ROLE_LEVEL_DISPLAY_LABELS: Record<
  Exclude<NormalizedRoleLevel | PublicJobLevel, "unknown">,
  Record<DisplayLocale, string>
> = {
  internship: {
    az: "Təcrübə",
    en: "Internship",
    ru: "Стажировка"
  },
  trainee: {
    az: "Təcrübə",
    en: "Internship",
    ru: "Стажировка"
  },
  junior: {
    az: "Giriş səviyyəsi",
    en: "Entry level",
    ru: "Начальный уровень"
  },
  entry_level: {
    az: "Giriş səviyyəsi",
    en: "Entry level",
    ru: "Начальный уровень"
  },
  new_graduate: {
    az: "Giriş səviyyəsi",
    en: "Entry level",
    ru: "Начальный уровень"
  },
  mid: {
    az: "Mütəxəssis",
    en: "Specialist",
    ru: "Специалист"
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
    /\b(intern|internship|staj|tecrube\w*|tecrubeci\w*|tecrube proqrami|staj proqrami|стажировка|стажер)\b/i.test(
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

  if (/\bmanager\b|\bmenecer\b|\brəhbər\b|\brehber\b|\bmudir\b|\bmüdir\b|\bdirector\b|\bhead\b/.test(comparable)) {
    return "manager";
  }

  if (/\bsenior\b|\baparici\b|\baparıcı\b|\bbas mutexessis\b|\bbaş mütəxəssis\b|\blead\b/.test(comparable)) {
    return "senior";
  }

  if (/\b(mid|middle)\b/.test(comparable)) {
    return "mid";
  }

  if (/\bmutexessis\b|\bmütəxəssis\b|\bspecialist\b/.test(comparable)) {
    return "mid";
  }

  if (UNKNOWN_LABELS.has(comparable) || /\bunknown\b|\bnamelum\b/.test(comparable)) {
    return "unknown";
  }

  return "unknown";
}

export function normalizeJobLevel(
  title?: string | null,
  description?: string | null,
  rawLevel?: string | null
): PublicJobLevel {
  const comparable = normalizeComparableValue(
    [rawLevel, title, description]
      .map((value) => getMeaningfulText(value))
      .filter(Boolean)
      .join(" ")
  );

  if (!comparable || UNKNOWN_LABELS.has(comparable) || /\bunknown\b|\bnamelum\b/.test(comparable)) {
    return "unknown";
  }

  if (/\b(manager|menecer|rehber|mudir|director|head)\b/.test(comparable)) {
    return "manager";
  }

  if (/\b(senior|lead|aparici|bas mutexessis)\b/.test(comparable)) {
    return "senior";
  }

  if (/\b(intern|internship|staj|tecrube\w*|tecrubeci\w*|tecrube proqrami|staj proqrami|trainee|стажировка|стажер)\b/.test(comparable)) {
    return "internship";
  }

  if (/\b(junior|entry level|entrylevel|giris seviyy[eə]si|baslangic seviyy[eə]|yeni mezun|new graduate|new grad|graduate|graduate program|graduate scheme|genc mutexessis|kicik mutexessis)\b/.test(comparable)) {
    return "entry_level";
  }

  if (/\b(specialist|mutexessis|ekspert|expert|officer|associate|mid|middle)\b/.test(comparable)) {
    return "mid";
  }

  const internalLevel = normalizeRoleLevel(rawLevel ?? comparable);
  if (internalLevel === "trainee" || internalLevel === "internship") {
    return "internship";
  }

  if (internalLevel === "junior" || internalLevel === "entry_level" || internalLevel === "new_graduate") {
    return "entry_level";
  }

  if (internalLevel === "mid" || internalLevel === "senior" || internalLevel === "manager") {
    return internalLevel;
  }

  return "unknown";
}

export function normalizeRoleFilterValue(value: string | null | undefined): PublicJobLevel | null {
  if (isAllFilterValue(value)) {
    return null;
  }

  const comparable = normalizeComparableValue(value ?? "");

  if (!comparable) {
    return null;
  }

  return normalizeJobLevel(null, null, value);
}

export function isAllFilterValue(value: string | null | undefined) {
  const comparable = normalizeComparableValue(value ?? "");
  return !comparable || comparable === "all" || comparable === "hamisi" || comparable === "hamısı";
}

export function getRoleLevelDisplayLabel(
  value: string | null | undefined,
  locale: DisplayLocale
) {
  const level = normalizeJobLevel(null, null, value);
  return level === "unknown" ? null : ROLE_LEVEL_DISPLAY_LABELS[level]?.[locale] ?? null;
}

export function normalizeWorkModelValue(value: string | null | undefined): NormalizedWorkModel | null {
  if (isAllFilterValue(value)) {
    return null;
  }

  const comparable = normalizeComparableValue(value ?? "");

  if (!comparable) {
    return null;
  }

  if (/\b(remote|uzaqdan|udalen|udalenn)\b/.test(comparable)) {
    return "remote";
  }

  if (/\b(hybrid|hibrid|gibrid)\b/.test(comparable)) {
    return "hybrid";
  }

  if (/\b(onsite|on site|ofisden|ofisde|office|yerinde|yerində|fiziki)\b/.test(comparable)) {
    return "onsite";
  }

  return comparable === "unknown" || comparable === "namelum" ? "unknown" : null;
}

export function getWorkModelDisplayValue(value: NormalizedWorkModel | null | undefined) {
  if (value === "onsite") {
    return "Ofisdən";
  }

  if (value === "hybrid") {
    return "Hibrid";
  }

  if (value === "remote") {
    return "Uzaqdan";
  }

  return null;
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

export function getReadablePublicText(
  value: string | null | undefined,
  options: TextOptions = {}
) {
  const text = getMeaningfulText(value, options);

  if (!text) {
    return null;
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const comparable = normalizeComparableValue(text);

  if (
    wordCount < 3 ||
    text.length < 18 ||
    /[:;,/-]$/.test(text) ||
    (/[a-zəıöüğçş]$/i.test(text) && /\b(?:gelen|olan|eden|ucun|uzre)\s+[a-z]$/.test(comparable)) ||
    (/^[a-zəıöüğçş]/.test(text) && !/^(?:it|hr|ux|ui|sql|crm|smm)\b/i.test(text))
  ) {
    return null;
  }

  return text;
}

export function dedupeReadablePublicTextList(
  values: string[] | null | undefined,
  options: TextOptions = {}
) {
  const seen = new Set<string>();

  return (values ?? []).flatMap((value) => {
    const text = getReadablePublicText(value, options);

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
  return normalizeJobLevel(null, null, value) !== "unknown";
}

export function getDisplayDomain(value: string | null | undefined) {
  const sanitized = sanitizeText(value);
  return sanitized ? getHostnameLabel(sanitized) ?? getUrlHostnameLabel(sanitized) : null;
}

function normalizeTagKey(value: string, comparable: string) {
  const roleLevel = normalizeJobLevel(null, null, value);

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
  const city = findLocationInComparableText(comparable);

  if (city) {
    return city;
  }

  if (/\b(baki|baku)\b/.test(comparable) || comparable === "baki seheri") {
    return "Bakı";
  }

  if (comparable === "az" || comparable === "azerbaijan" || comparable === "azerbaycan") {
    return "Azərbaycan";
  }

  return text;
}

export function deriveLocationFromEvidence(input: {
  structuredLocation?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  companyLocation?: string | null;
}) {
  const structuredCity = normalizeLocationName(input.structuredLocation);
  const titleCity = findLocationInText(input.title);
  const descriptionCity = findLocationInText(input.description);
  const urlCity = findLocationInText(input.url ? safeDecodeURIComponent(input.url) : "");
  const companyCity = normalizeLocationName(input.companyLocation);
  const nonBakuTitleCity = titleCity && titleCity !== "Bakı" ? titleCity : null;

  if (
    structuredCity &&
    !((structuredCity === "Bakı" || structuredCity === "Azərbaycan") && nonBakuTitleCity)
  ) {
    return {
      city: structuredCity,
      source: "structured" as LocationSource,
      confidence: 0.94
    };
  }

  if (titleCity) {
    return {
      city: titleCity,
      source: "title" as LocationSource,
      confidence: 0.88
    };
  }

  if (descriptionCity) {
    return {
      city: descriptionCity,
      source: "description" as LocationSource,
      confidence: 0.76
    };
  }

  if (urlCity) {
    return {
      city: urlCity,
      source: "url" as LocationSource,
      confidence: 0.7
    };
  }

  if (companyCity) {
    return {
      city: companyCity,
      source: "company_default" as LocationSource,
      confidence: 0.45
    };
  }

  return {
    city: null,
    source: "unknown" as LocationSource,
    confidence: 0
  };
}

export function deriveWorkModelFromEvidence(input: {
  workModel?: string | null;
  title?: string | null;
  description?: string | null;
  city?: string | null;
  locationText?: string | null;
}) {
  const context = normalizeComparableValue(
    [input.title, input.description, input.locationText].filter(Boolean).join(" ")
  );
  const explicitWorkModel = normalizeWorkModelValue(input.workModel);

  if (/\b(remote|uzaqdan|udalen|udalenn)\b/.test(context) || explicitWorkModel === "remote") {
    return "remote" as NormalizedWorkModel;
  }

  if (/\b(hybrid|hibrid|gibrid)\b/.test(context)) {
    return "hybrid" as NormalizedWorkModel;
  }

  if (
    /\b(onsite|on site|ofisden|ofisde|office|yerinde|fiziki|filial|magaza|mağaza|anbar|warehouse|sobe|şöbə|branch)\b/.test(
      context
    ) ||
    LOCATION_CONTEXT_WORDS.some((word) => context.includes(word)) ||
    Boolean(input.city && input.city !== "Azərbaycan")
  ) {
    return "onsite" as NormalizedWorkModel;
  }

  return explicitWorkModel ?? "unknown";
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
