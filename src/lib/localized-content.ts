export type SupportedLocaleCode = "az" | "en" | "ru";

import { sanitizeText, sanitizeLocalizedText } from "@/lib/text-sanitizer";

export type LocalizedText = Partial<Record<SupportedLocaleCode, string>>;
export type LocalizedContentValue = string | LocalizedText;

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
    return sanitizeLocalizedText(value);
  }

  if (typeof value === "string" && value.trim()) {
    const sanitized = sanitizeText(value);
    return sanitized ? { [defaultLocale]: sanitized } : {};
  }

  return {};
}

function hasLocalizedTextEntries(value: LocalizedText) {
  return Object.values(value).some((item) => typeof item === "string" && item.trim().length > 0);
}

function normalizeLocalizedContentEntry(
  value: unknown,
  defaultLocale: SupportedLocaleCode = "az"
): LocalizedContentValue | null {
  if (typeof value === "string") {
    const trimmedValue = sanitizeText(value);
    return trimmedValue ? trimmedValue : null;
  }

  if (value && typeof value === "object") {
    const normalized = normalizeLocalizedText(value as LocalizedText, defaultLocale);
    return hasLocalizedTextEntries(normalized) ? normalized : null;
  }

  return null;
}

export function normalizeLocalizedTextList(
  value: unknown,
  defaultLocale: SupportedLocaleCode = "az"
): LocalizedContentValue[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeLocalizedContentEntry(item, defaultLocale))
      .filter((item): item is LocalizedContentValue => item !== null);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
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
  value: LocalizedContentValue | null | undefined,
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
    return sanitizeText(directValue);
  }

  for (const fallbackLocale of fallbackOrder) {
    const fallbackValue = value[fallbackLocale];

    if (typeof fallbackValue === "string" && fallbackValue.trim()) {
      return sanitizeText(fallbackValue);
    }
  }

  const firstValue = Object.values(value).find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0
  );

  return sanitizeText(firstValue ?? "");
}

export function getPrimaryLocalizedText(value: LocalizedContentValue | null | undefined) {
  return getLocalizedText(value, "az", ["az", "en", "ru"]);
}

export function getAllLocalizedTextValues(value: LocalizedContentValue | null | undefined) {
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

export function getLocalizedTextList(
  values: LocalizedContentValue[] | null | undefined,
  locale: SupportedLocaleCode,
  fallbackOrder: SupportedLocaleCode[] = ["az", "en", "ru"]
) {
  if (!values || values.length === 0) {
    return [];
  }

  return values
    .map((value) => getLocalizedText(value, locale, fallbackOrder))
    .filter((value) => value.trim().length > 0);
}

export function getAllLocalizedTextValuesFromList(values: LocalizedContentValue[] | null | undefined) {
  if (!values || values.length === 0) {
    return [];
  }

  return Array.from(new Set(values.flatMap((value) => getAllLocalizedTextValues(value))));
}

export function localizedTextIncludes(
  value: LocalizedContentValue | null | undefined,
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

export function serializeLocalizedText(value: LocalizedContentValue | null | undefined) {
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

export function serializeLocalizedTextList(values: LocalizedContentValue[] | null | undefined) {
  const normalizedValues = (values ?? [])
    .map((value) => normalizeLocalizedContentEntry(value))
    .filter((value): value is LocalizedContentValue => value !== null);

  return JSON.stringify(normalizedValues);
}

export function parseLocalizedTextList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return normalizeLocalizedTextList(parsed);
    }
  } catch {
    // Fall through to plain-string normalization.
  }

  return normalizeLocalizedTextList(value);
}
