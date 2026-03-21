export type SupportedLocaleCode = "az" | "en" | "ru";

export type LocalizedText = Partial<Record<SupportedLocaleCode, string>>;

export function createLocalizedText(
  az: string,
  en?: string,
  ru?: string
): LocalizedText {
  return {
    az,
    ...(en ? { en } : {}),
    ...(ru ? { ru } : {})
  };
}

export function isLocalizedText(value: unknown): value is LocalizedText {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return ["az", "en", "ru"].some((locale) => typeof (value as Record<string, unknown>)[locale] === "string");
}

export function normalizeLocalizedText(
  value: string | LocalizedText | null | undefined,
  defaultLocale: SupportedLocaleCode = "az"
): LocalizedText {
  if (isLocalizedText(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return { [defaultLocale]: value.trim() };
  }

  return {};
}

function guessPlainTextLocale(value: string): SupportedLocaleCode {
  if (/[А-Яа-яЁё]/.test(value)) {
    return "ru";
  }

  if (/[ƏəĞğİıÖöŞşÜüÇç]/.test(value)) {
    return "az";
  }

  return "en";
}

export function getLocalizedText(
  value: string | LocalizedText | null | undefined,
  locale: SupportedLocaleCode,
  fallbackOrder: SupportedLocaleCode[] = ["az", "en", "ru"]
) {
  if (typeof value === "string") {
    return value;
  }

  if (!value) {
    return "";
  }

  const directValue = value[locale];

  if (typeof directValue === "string" && directValue.trim()) {
    return directValue;
  }

  for (const fallbackLocale of fallbackOrder) {
    const fallbackValue = value[fallbackLocale];

    if (typeof fallbackValue === "string" && fallbackValue.trim()) {
      return fallbackValue;
    }
  }

  const firstValue = Object.values(value).find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0
  );

  return firstValue ?? "";
}

export function getPrimaryLocalizedText(value: string | LocalizedText | null | undefined) {
  return getLocalizedText(value, "az", ["az", "en", "ru"]);
}

export function getAllLocalizedTextValues(value: string | LocalizedText | null | undefined) {
  if (typeof value === "string") {
    return value ? [value] : [];
  }

  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      (["az", "en", "ru"] as const)
        .map((locale) => value[locale])
        .filter((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0)
    )
  );
}

export function localizedTextIncludes(
  value: string | LocalizedText | null | undefined,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return getAllLocalizedTextValues(value).some((candidate) =>
    candidate.toLowerCase().includes(normalizedQuery)
  );
}

export function serializeLocalizedText(value: string | LocalizedText | null | undefined) {
  const normalized = normalizeLocalizedText(value);
  return JSON.stringify(normalized);
}

export function parseLocalizedText(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (isLocalizedText(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to plain-string normalization.
  }

  return normalizeLocalizedText(value, guessPlainTextLocale(value));
}
