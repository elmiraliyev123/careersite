import type {
  LocalizedContentValue,
  LocalizedText,
  SupportedLocaleCode
} from "@/lib/localized-content";

type SanitizeTextOptions = {
  multiline?: boolean;
};

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const TAG_PATTERN = /<[^>]*>/g;
const DANGEROUS_PROTOCOL_PATTERN = /\b(?:javascript|vbscript|data)\s*:/gi;

function normalizeWhitespace(value: string, multiline: boolean) {
  if (!multiline) {
    return value.replace(/\s+/g, " ").trim();
  }

  return value
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeText(value: string | null | undefined, options: SanitizeTextOptions = {}) {
  if (typeof value !== "string") {
    return "";
  }

  const multiline = Boolean(options.multiline);

  return normalizeWhitespace(
    value
      .replace(CONTROL_CHARACTERS, "")
      .replace(TAG_PATTERN, " ")
      .replace(DANGEROUS_PROTOCOL_PATTERN, ""),
    multiline
  );
}

export function sanitizeTextList(values: string[] | null | undefined, options: SanitizeTextOptions = {}) {
  return (values ?? [])
    .map((value) => sanitizeText(value, options))
    .filter(Boolean);
}

export function sanitizeLocalizedText(
  value: LocalizedText | null | undefined,
  options: SanitizeTextOptions = {}
) {
  if (!value) {
    return {};
  }

  return (["az", "en", "ru"] as SupportedLocaleCode[]).reduce<LocalizedText>((accumulator, locale) => {
    const sanitized = sanitizeText(value[locale], options);

    if (sanitized) {
      accumulator[locale] = sanitized;
    }

    return accumulator;
  }, {});
}

export function sanitizeLocalizedContentValue(
  value: LocalizedContentValue | null | undefined,
  options: SanitizeTextOptions = {}
): LocalizedContentValue {
  if (typeof value === "string") {
    return sanitizeText(value, options);
  }

  return sanitizeLocalizedText(value, options);
}

export function sanitizeLocalizedContentList(
  values: LocalizedContentValue[] | null | undefined,
  options: SanitizeTextOptions = {}
) {
  return (values ?? [])
    .map((value) => sanitizeLocalizedContentValue(value, options))
    .filter((value) =>
      typeof value === "string"
        ? Boolean(value)
        : Object.values(value).some((candidate) => typeof candidate === "string" && candidate.length > 0)
    );
}
