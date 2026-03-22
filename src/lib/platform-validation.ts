import type { Company, Job } from "@/data/platform";
import { normalizeLocalizedText, normalizeLocalizedTextList } from "@/lib/localized-content";
import { sanitizeText, sanitizeTextList } from "@/lib/text-sanitizer";

export type CompanyInput = Omit<Company, "slug">;
export type JobInput = Omit<Job, "slug" | "featured">;

type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

type ValidationFailure = {
  ok: false;
  message: string;
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const jobLevels = new Set<Job["level"]>(["Təcrübə", "Junior", "Trainee", "Yeni məzun"]);
const workModels = new Set<Job["workModel"]>(["Ofisdən", "Hibrid", "Uzaqdan"]);

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? sanitizeText(value, { multiline: false }) : "";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return sanitizeTextList(
      value.map((item) => getTrimmedString(item)),
      { multiline: false }
    );
  }

  if (typeof value === "string") {
    return sanitizeText(value, { multiline: true })
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function requiredString(value: unknown, label: string) {
  const normalized = getTrimmedString(value);

  if (!normalized) {
    return `${label} boş ola bilməz.`;
  }

  return normalized;
}

function requiredLocalizedText(
  value: unknown,
  label: string,
  defaultLocale: "az" | "en" | "ru" = "az"
) {
  const normalized = normalizeLocalizedText(
    typeof value === "string" || (value && typeof value === "object") ? (value as string | Record<string, string>) : "",
    defaultLocale
  );

  if (Object.values(normalized).every((item) => typeof item !== "string" || item.trim().length === 0)) {
    return `${label} boş ola bilməz.`;
  }

  return normalized;
}

function requiredList(value: unknown, label: string) {
  const normalized = normalizeList(value);

  if (normalized.length === 0) {
    return `${label} üçün ən azı bir dəyər daxil edilməlidir.`;
  }

  return normalized;
}

function requiredLocalizedList(
  value: unknown,
  label: string,
  defaultLocale: "az" | "en" | "ru" = "az"
) {
  const normalized = normalizeLocalizedTextList(value, defaultLocale);

  if (normalized.length === 0) {
    return `${label} üçün ən azı bir dəyər daxil edilməlidir.`;
  }

  return normalized;
}

function normalizedCreatedAt(value: unknown) {
  const normalized = getTrimmedString(value);

  if (!normalized) {
    return new Date().toISOString().slice(0, 10);
  }

  return isIsoDate(normalized) ? normalized : new Date().toISOString().slice(0, 10);
}

export function validateCompanyInput(payload: unknown): ValidationResult<CompanyInput> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Şirkət payload formatı yanlışdır." };
  }

  const record = payload as Record<string, unknown>;
  const name = requiredString(record.name, "Şirkət adı");
  if (typeof name !== "string") return { ok: false, message: name };

  const tagline = requiredString(record.tagline, "Tagline");
  if (typeof tagline !== "string") return { ok: false, message: tagline };

  const sector = requiredString(record.sector, "Sektor");
  if (typeof sector !== "string") return { ok: false, message: sector };

  const size = requiredString(record.size, "Komanda ölçüsü");
  if (typeof size !== "string") return { ok: false, message: size };

  const location = requiredString(record.location, "Lokasiya");
  if (typeof location !== "string") return { ok: false, message: location };

  const logo = requiredString(record.logo, "Logo URL");
  if (typeof logo !== "string") return { ok: false, message: logo };

  const cover = requiredString(record.cover, "Cover URL");
  if (typeof cover !== "string") return { ok: false, message: cover };

  const website = requiredString(record.website, "Website");
  if (typeof website !== "string") return { ok: false, message: website };

  const about = requiredString(record.about, "Haqqında");
  if (typeof about !== "string") return { ok: false, message: about };

  const wikipediaSummary = getTrimmedString(record.wikipediaSummary) || undefined;
  const wikipediaSourceUrl = getTrimmedString(record.wikipediaSourceUrl) || undefined;

  const focusAreas = requiredList(record.focusAreas, "Fokus sahələri");
  if (!Array.isArray(focusAreas)) return { ok: false, message: focusAreas };

  const youthOffer = requiredList(record.youthOffer, "Gənclər üçün təklif");
  if (!Array.isArray(youthOffer)) return { ok: false, message: youthOffer };

  const benefits = requiredList(record.benefits, "Üstünlüklər");
  if (!Array.isArray(benefits)) return { ok: false, message: benefits };
  const industryTags = normalizeList(record.industryTags);

  if (!isHttpUrl(logo) || !isHttpUrl(cover) || !isHttpUrl(website)) {
    return { ok: false, message: "Logo, cover və website sahələri keçərli URL olmalıdır." };
  }

  if (wikipediaSourceUrl && !isHttpUrl(wikipediaSourceUrl)) {
    return { ok: false, message: "Wikipedia mənbə linki keçərli URL olmalıdır." };
  }

  return {
    ok: true,
    data: {
      name,
      tagline,
      sector,
      size,
      location,
      logo,
      cover,
      website,
      about,
      wikipediaSummary,
      wikipediaSourceUrl,
      focusAreas,
      youthOffer,
      benefits,
      industryTags: industryTags.length > 0 ? industryTags : [sector],
      featured: Boolean(record.featured),
      createdAt: normalizedCreatedAt(record.createdAt)
    }
  };
}

export function validateJobInput(payload: unknown): ValidationResult<JobInput> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Vakansiya payload formatı yanlışdır." };
  }

  const record = payload as Record<string, unknown>;
  const title = requiredLocalizedText(record.title, "Vakansiya adı", "az");
  if (typeof title === "string") return { ok: false, message: title };

  const companySlug = requiredString(record.companySlug, "Şirkət seçimi");
  if (typeof companySlug !== "string") return { ok: false, message: companySlug };

  const city = requiredString(record.city, "Şəhər");
  if (typeof city !== "string") return { ok: false, message: city };

  const workModel = requiredString(record.workModel, "İş modeli");
  if (typeof workModel !== "string") return { ok: false, message: workModel };

  const level = requiredString(record.level, "Səviyyə");
  if (typeof level !== "string") return { ok: false, message: level };

  const category = requiredLocalizedText(record.category, "Kateqoriya", "az");
  if (typeof category === "string") return { ok: false, message: category };

  const postedAt = requiredString(record.postedAt, "Paylaşılma tarixi");
  if (typeof postedAt !== "string") return { ok: false, message: postedAt };

  const deadline = requiredString(record.deadline, "Son müraciət tarixi");
  if (typeof deadline !== "string") return { ok: false, message: deadline };

  const summary = requiredLocalizedText(record.summary, "Qısa xülasə", "az");
  if (typeof summary === "string") return { ok: false, message: summary };

  const responsibilities = requiredList(record.responsibilities, "Məsuliyyətlər");
  if (!Array.isArray(responsibilities)) return { ok: false, message: responsibilities };

  const requirements = requiredList(record.requirements, "Tələblər");
  if (!Array.isArray(requirements)) return { ok: false, message: requirements };

  const benefits = requiredList(record.benefits, "Üstünlüklər");
  if (!Array.isArray(benefits)) return { ok: false, message: benefits };

  const tags = requiredLocalizedList(record.tags, "Tag-lər", "az");
  if (!Array.isArray(tags)) return { ok: false, message: tags };

  if (!workModels.has(workModel as Job["workModel"])) {
    return { ok: false, message: "İş modeli yalnız Ofisdən, Hibrid və ya Uzaqdan ola bilər." };
  }

  if (!jobLevels.has(level as Job["level"])) {
    return { ok: false, message: "Səviyyə yalnız Təcrübə, Junior, Trainee və ya Yeni məzun ola bilər." };
  }

  if (!isIsoDate(postedAt) || !isIsoDate(deadline)) {
    return { ok: false, message: "Tarixlər YYYY-MM-DD formatında olmalıdır." };
  }

  if (deadline < postedAt) {
    return { ok: false, message: "Son müraciət tarixi paylaşılma tarixindən əvvəl ola bilməz." };
  }

  return {
    ok: true,
    data: {
      title,
      companySlug,
      city,
      workModel: workModel as Job["workModel"],
      level: level as Job["level"],
      category,
      postedAt,
      deadline,
      summary,
      responsibilities,
      requirements,
      benefits,
      tags,
      applyUrl:
        typeof record.applyUrl === "string" && isHttpUrl(record.applyUrl)
          ? record.applyUrl.trim()
          : undefined,
      directCompanyUrl:
        typeof record.directCompanyUrl === "string" && isHttpUrl(record.directCompanyUrl)
          ? record.directCompanyUrl.trim()
          : undefined,
      sourceName: getTrimmedString(record.sourceName) || undefined,
      sourceUrl:
        typeof record.sourceUrl === "string" && isHttpUrl(record.sourceUrl)
          ? record.sourceUrl.trim()
          : undefined,
      createdAt: normalizedCreatedAt(record.createdAt)
    }
  };
}
