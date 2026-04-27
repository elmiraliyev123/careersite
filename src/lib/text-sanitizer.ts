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
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  ndash: "-",
  mdash: "-",
  hellip: "...",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  ccedil: "ç",
  Ccedil: "Ç",
  eacute: "é",
  Eacute: "É",
  iacute: "í",
  Iacute: "Í",
  oacute: "ó",
  Oacute: "Ó",
  uacute: "ú",
  Uacute: "Ú",
  scedil: "ş",
  Scedil: "Ş",
  gbreve: "ğ",
  Gbreve: "Ğ"
};
const PLACEHOLDER_VALUE_PATTERNS = [
  /^\{\s*\}$/,
  /^\[\s*\]$/,
  /^\[object\s+object\]$/i,
  /^(?:null|undefined|n\/a|na|none)$/i,
  /^(?:-|--|—)$/
];

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return NAMED_HTML_ENTITIES[entity] ?? match;
  });
}

function stripBrokenHtmlEntities(value: string) {
  return value.replace(
    /&(auml|ouml|uuml|ccedil|eacute|iacute|oacute|uacute|scedil|gbreve|nbsp|quot|apos|amp|lt|gt);?/gi,
    " "
  );
}

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

  const sanitized = normalizeWhitespace(
    stripBrokenHtmlEntities(decodeHtmlEntities(value))
      .replace(CONTROL_CHARACTERS, "")
      .replace(TAG_PATTERN, " ")
      .replace(DANGEROUS_PROTOCOL_PATTERN, ""),
    multiline
  );

  return PLACEHOLDER_VALUE_PATTERNS.some((pattern) => pattern.test(sanitized)) ? "" : sanitized;
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
