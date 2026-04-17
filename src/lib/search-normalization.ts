const SYNONYM_GROUPS = [
  [
    "intern",
    "internship",
    "staj",
    "təcrübə",
    "təcrübəçi",
    "staj proqramı",
    "təcrübə proqramı",
    "trainee",
    "стажировка",
    "стажер"
  ],
  ["junior", "kiçik mütəxəssis", "gənc mütəxəssis", "entry level", "entry-level", "младший специалист"],
  ["new graduate", "graduate", "yeni məzun", "выпускник", "graduate program", "graduate scheme"],
  ["finance", "financial", "maliyyə"],
  ["accountant", "accounting", "mühasib", "mühasibat", "бухгалтер", "бухгалтерия"],
  [
    "software engineer",
    "software developer",
    "developer",
    "engineer",
    "proqram mühəndisi",
    "proqramçı",
    "it",
    "software",
    "инженер-программист",
    "разработчик"
  ],
  [
    "customer support",
    "support",
    "call center",
    "contact center",
    "müştəri dəstəyi",
    "məlumat mərkəzi",
    "operator",
    "поддержка клиентов",
    "колл-центр"
  ],
  ["marketing", "marketinq"],
  ["sales", "satış"],
  ["hr", "human resources", "recruiting", "işə qəbul", "insan resursları", "hr", "рекрутинг"],
  ["legal", "lawyer", "jurist", "hüquq", "hüquqşünas", "юрист", "юридический"],
  ["data", "analytics", "analyst", "analitika", "analitik", "данные", "аналитика", "аналитик"],
  ["product", "məhsul", "продукт"]
];

const EN_TO_AZ_DISPLAY_TERMS: Array<[string, string]> = [
  ["software engineer", "proqram mühəndisi"],
  ["software developer", "proqramçı"],
  ["customer support", "müştəri dəstəyi"],
  ["call center", "məlumat mərkəzi"],
  ["contact center", "əlaqə mərkəzi"],
  ["human resources", "insan resursları"],
  ["recruiting", "işə qəbul"],
  ["accounting", "mühasibat"],
  ["accountant", "mühasib"],
  ["internship", "təcrübə proqramı"],
  ["intern", "təcrübəçi"],
  ["trainee", "təcrübəçi"],
  ["junior", "junior"],
  ["finance", "maliyyə"],
  ["financial", "maliyyə"],
  ["marketing", "marketinq"],
  ["sales", "satış"],
  ["legal", "hüquq"],
  ["lawyer", "hüquqşünas"],
  ["jurist", "hüquqşünas"],
  ["analytics", "analitika"],
  ["analyst", "analitik"],
  ["product", "məhsul"]
];

const AZ_TO_EN_DISPLAY_TERMS: Array<[string, string]> = [
  ["proqram mühəndisi", "software engineer"],
  ["proqramçı", "software developer"],
  ["müştəri dəstəyi", "customer support"],
  ["məlumat mərkəzi", "call center"],
  ["əlaqə mərkəzi", "contact center"],
  ["insan resursları", "human resources"],
  ["işə qəbul", "recruiting"],
  ["mühasibat", "accounting"],
  ["mühasib", "accountant"],
  ["təcrübə proqramı", "internship"],
  ["staj proqramı", "internship"],
  ["təcrübəçi", "intern"],
  ["staj", "intern"],
  ["maliyyə", "finance"],
  ["marketinq", "marketing"],
  ["satış", "sales"],
  ["hüquqşünas", "lawyer"],
  ["hüquq", "legal"],
  ["analitika", "analytics"],
  ["analitik", "analyst"],
  ["məhsul", "product"]
];

const EN_TO_RU_DISPLAY_TERMS: Array<[string, string]> = [
  ["software engineer", "инженер-программист"],
  ["software developer", "разработчик ПО"],
  ["customer support", "поддержка клиентов"],
  ["call center", "колл-центр"],
  ["contact center", "контакт-центр"],
  ["human resources", "HR"],
  ["recruiting", "рекрутинг"],
  ["accounting", "бухгалтерия"],
  ["accountant", "бухгалтер"],
  ["internship", "стажировка"],
  ["intern", "стажер"],
  ["trainee", "стажер"],
  ["new graduate", "выпускник"],
  ["graduate", "выпускник"],
  ["entry level", "начальный уровень"],
  ["junior", "junior"],
  ["finance", "финансы"],
  ["financial", "финансы"],
  ["marketing", "маркетинг"],
  ["sales", "продажи"],
  ["legal", "юридическое направление"],
  ["lawyer", "юрист"],
  ["jurist", "юрист"],
  ["analytics", "аналитика"],
  ["analyst", "аналитик"],
  ["product", "продукт"]
];

const AZ_TO_RU_DISPLAY_TERMS: Array<[string, string]> = [
  ["proqram mühəndisi", "инженер-программист"],
  ["proqramçı", "разработчик ПО"],
  ["müştəri dəstəyi", "поддержка клиентов"],
  ["məlumat mərkəzi", "колл-центр"],
  ["əlaqə mərkəzi", "контакт-центр"],
  ["insan resursları", "HR"],
  ["işə qəbul", "рекрутинг"],
  ["mühasibat", "бухгалтерия"],
  ["mühasib", "бухгалтер"],
  ["təcrübə proqramı", "стажировка"],
  ["staj proqramı", "стажировка"],
  ["təcrübəçi", "стажер"],
  ["staj", "стажировка"],
  ["yeni məzun", "выпускник"],
  ["maliyyə", "финансы"],
  ["marketinq", "маркетинг"],
  ["satış", "продажи"],
  ["hüquqşünas", "юрист"],
  ["hüquq", "юридическое направление"],
  ["analitika", "аналитика"],
  ["analitik", "аналитик"],
  ["məhsul", "продукт"]
];

function normalizeValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0259\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSynonymIndex() {
  const index = new Map<string, Set<string>>();

  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = Array.from(new Set(group.map(normalizeValue).filter(Boolean)));
    for (const term of normalizedGroup) {
      const bucket = index.get(term) ?? new Set<string>();
      for (const sibling of normalizedGroup) {
        bucket.add(sibling);
      }
      index.set(term, bucket);
    }
  }

  return index;
}

const synonymIndex = buildSynonymIndex();

export function normalizeSearchText(value: string | null | undefined) {
  return normalizeValue(value ?? "");
}

export function expandSearchQuery(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const expanded = new Set<string>([normalizedQuery]);
  for (const entry of synonymIndex.entries()) {
    const [term, siblings] = entry;
    if (normalizedQuery.includes(term) || term.includes(normalizedQuery)) {
      siblings.forEach((sibling) => expanded.add(sibling));
    }
  }

  return Array.from(expanded);
}

export function matchesExpandedQuery(haystack: string, query: string) {
  const normalizedHaystack = normalizeSearchText(haystack);
  if (!normalizedHaystack) {
    return false;
  }

  return expandSearchQuery(query).some((term) => normalizedHaystack.includes(term));
}

function replaceDisplayTerms(value: string, replacements: Array<[string, string]>) {
  return replacements.reduce((current, [from, to]) => {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return current.replace(new RegExp(`\\b${escaped}\\b`, "gi"), to);
  }, value);
}

export function translateJobDisplayText(
  value: string | null | undefined,
  targetLocale: "az" | "en" | "ru"
) {
  const text = (value ?? "").trim();

  if (!text) {
    return "";
  }

  if (targetLocale === "az") {
    return replaceDisplayTerms(text, EN_TO_AZ_DISPLAY_TERMS);
  }

  if (targetLocale === "en") {
    return replaceDisplayTerms(text, AZ_TO_EN_DISPLAY_TERMS);
  }

  if (targetLocale === "ru") {
    return replaceDisplayTerms(replaceDisplayTerms(text, AZ_TO_RU_DISPLAY_TERMS), EN_TO_RU_DISPLAY_TERMS);
  }

  return text;
}
