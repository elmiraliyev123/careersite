"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import type { Company, Job } from "@/data/platform";
import { getPrimaryLocalizedText } from "@/lib/localized-content";
import { type JobModerationStatus } from "@/lib/moderation";

type AdminPanelClientProps = {
  companies: Company[];
  jobs: Job[];
};

type AdminMessage = {
  kind: "success" | "error";
  text: string;
} | null;

type DrawerState =
  | { type: "job"; mode: "create" | "edit"; slug?: string }
  | { type: "company"; mode: "create" | "edit"; slug?: string }
  | null;

type AdminSection =
  | "dashboard"
  | "review-queue"
  | "jobs"
  | "companies"
  | "new-job"
  | "new-company"
  | "archived";

type JobFormState = {
  title: string;
  companySlug: string;
  city: string;
  workModel: Job["workModel"];
  level: NormalizedLevelLabel;
  category: string;
  postedAt: string;
  deadline: string;
  summary: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  tags: string;
  applyUrl: string;
  sourceName: string;
  sourceUrl: string;
  moderationStatus: JobModerationStatus;
  moderationNotes: string;
};

type NormalizedLevelLabel =
  | "internship"
  | "entry_level"
  | "mid"
  | "senior"
  | "manager"
  | "unknown";

type CompanyFormState = {
  name: string;
  tagline: string;
  sector: string;
  industryTags: string;
  size: string;
  location: string;
  website: string;
  sourceUrl: string;
  companyDomain: string;
  logo: string;
  cover: string;
  about: string;
  focusAreas: string;
  youthOffer: string;
  benefits: string;
  verified: boolean;
  featured: boolean;
  wikipediaSummary: string;
  wikipediaSourceUrl: string;
  visible: boolean;
};

type JobFilters = {
  search: string;
  status: "all" | JobModerationStatus;
  companySlug: "all" | string;
  level: "all" | NormalizedLevelLabel;
  location: "all" | string;
  applyStatus: "all" | "valid" | "missing" | "broken" | "unknown";
};

type CompanyFilters = {
  search: string;
  verified: "all" | "verified" | "not_verified";
  visibility: "all" | "visible" | "hidden";
  sector: "all" | string;
};

const normalizedLevelOptions: NormalizedLevelLabel[] = [
  "internship",
  "entry_level",
  "mid",
  "senior",
  "manager",
  "unknown"
];
const workModelOptions: Job["workModel"][] = ["Ofisdən", "Hibrid", "Uzaqdan"];
const reviewQueueStatuses: JobModerationStatus[] = ["suggested", "needs_review", "draft"];

const perPage = 25;

const adminText = {
  en: {
    moderationDashboard: "Moderation dashboard",
    dashboardDescription: "Clean review flow for jobs and companies with compact actions.",
    dashboard: "Dashboard",
    reviewQueue: "Review queue",
    allJobs: "All jobs",
    companies: "Companies",
    newJob: "New job",
    newCompany: "New company",
    archived: "Archived",
    logout: "Logout",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    needsReview: "Needs review",
    publishedJobs: "Published jobs",
    archivedJobs: "Archived jobs",
    brokenApplyLinks: "Broken apply links",
    hiddenCompanies: "Hidden companies",
    dashboardOverview: "Dashboard overview",
    dashboardOverviewCopy: "Quick snapshot and fast actions.",
    viewAllJobs: "View all jobs",
    goToReviewQueue: "Go to review queue",
    recentJobs: "Recent jobs",
    company: "Company",
    status: "Status",
    updated: "Updated",
    action: "Action",
    actions: "Actions",
    reviewQueuePreview: "Review queue preview",
    emptyReviewTitle: "There are no jobs to review right now.",
    emptyReviewText: "Jobs from new sources will appear here.",
    reviewQueueCopy: "Suggested jobs remain internal until approved.",
    title: "Title",
    location: "Location",
    source: "Source",
    signals: "Signals",
    manual: "Manual",
    trust: "Trust",
    apply: "Apply",
    review: "Review",
    approve: "Approve",
    reject: "Reject",
    jobs: "Jobs",
    jobsCopy: "Compact moderation table with status and apply health.",
    searchJobs: "Search by title or company",
    allStatuses: "All statuses",
    allCompanies: "All companies",
    allLevels: "All levels",
    allLocations: "All locations",
    allApplyStatuses: "All apply statuses",
    resetFilters: "Reset filters",
    vacancy: "Vacancy",
    level: "Level",
    workModel: "Work model",
    deadline: "Deadline",
    applyLink: "Apply link",
    more: "More",
    edit: "Edit",
    viewPublicPage: "View public page",
    unpublish: "Unpublish",
    publish: "Publish",
    duplicate: "Duplicate",
    openApplyLink: "Open apply link",
    archive: "Archive",
    delete: "Delete",
    previous: "Previous",
    next: "Next",
    showing: "Showing",
    of: "of",
    companiesCopy: "Verification and visibility are shown as separate columns.",
    searchCompanies: "Search by company or domain",
    allVerification: "All verification",
    verified: "Verified",
    notVerified: "Not verified",
    allVisibility: "All visibility",
    visible: "Visible",
    hidden: "Hidden",
    allSectors: "All sectors",
    sector: "Sector",
    openJobs: "Open jobs",
    visibility: "Visibility",
    verification: "Verification",
    domain: "Domain",
    verify: "Verify",
    unverify: "Unverify",
    show: "Show",
    hide: "Hide",
    archivedCopy: "Archived jobs are listed here. Company archive action is pending backend support.",
    emptyArchivedTitle: "No archived jobs yet.",
    emptyArchivedText: "Archived content will appear here.",
    moveToDraft: "Move to draft",
    closeEditor: "Close editor",
    close: "Close",
    editJob: "Edit job",
    editCompany: "Edit company",
    drawerJobCopy: "Grouped form for clean moderation and publishing.",
    drawerCompanyCopy: "Clean company profile form with clear status controls.",
    basicInfo: "Basic info",
    selectCompany: "Select company",
    category: "Sector / category",
    sourceAndApply: "Source and apply",
    sourceUrl: "Source URL",
    applyUrl: "Apply URL",
    sourceDomain: "Source domain",
    applyLinkStatus: "Apply link status",
    dates: "Dates",
    publishedDate: "Published date",
    content: "Content",
    description: "Description",
    responsibilities: "Responsibilities",
    requirements: "Requirements",
    tags: "Tags",
    aiEnrichment: "AI enrichment",
    generateSummary: "Generate summary",
    normalizeLevel: "Normalize level",
    extractTags: "Extract tags",
    regenerateDetails: "Regenerate details",
    jobStatus: "Job status",
    notes: "Notes",
    save: "Save",
    draft: "Draft",
    saveCompany: "Save company",
    name: "Name",
    tagline: "Tagline",
    industryTags: "Industry tags",
    companySize: "Company size",
    countryCity: "Country / city",
    brandLogo: "Brand/logo",
    logoUrl: "Logo URL",
    uploadLogo: "Upload logo",
    noLogo: "No logo",
    officialWebsite: "Official website",
    coverImageUrl: "Cover image URL",
    featured: "Featured"
  },
  az: {
    moderationDashboard: "Moderasiya paneli",
    dashboardDescription: "Vakansiya və şirkətlər üçün səliqəli yoxlama axını və kompakt əməliyyatlar.",
    dashboard: "Panel",
    reviewQueue: "Yoxlama növbəsi",
    allJobs: "Bütün vakansiyalar",
    companies: "Şirkətlər",
    newJob: "Yeni vakansiya",
    newCompany: "Yeni şirkət",
    archived: "Arxiv",
    logout: "Çıxış",
    collapseSidebar: "Yan paneli yığ",
    expandSidebar: "Yan paneli aç",
    needsReview: "Yoxlama lazımdır",
    publishedJobs: "Yayımda olan vakansiyalar",
    archivedJobs: "Arxiv vakansiyaları",
    brokenApplyLinks: "İşləməyən müraciət linkləri",
    hiddenCompanies: "Gizli şirkətlər",
    dashboardOverview: "Panel xülasəsi",
    dashboardOverviewCopy: "Qısa göstəricilər və sürətli əməliyyatlar.",
    viewAllJobs: "Bütün vakansiyalara bax",
    goToReviewQueue: "Yoxlama növbəsinə keç",
    recentJobs: "Son vakansiyalar",
    company: "Şirkət",
    status: "Status",
    updated: "Yenilənib",
    action: "Əməliyyat",
    actions: "Əməliyyatlar",
    reviewQueuePreview: "Yoxlama növbəsi",
    emptyReviewTitle: "Hazırda yoxlanılacaq vakansiya yoxdur.",
    emptyReviewText: "Yeni mənbələrdən vakansiyalar gələndə burada görünəcək.",
    reviewQueueCopy: "Təklif olunan vakansiyalar təsdiqlənənə qədər daxildə qalır.",
    title: "Başlıq",
    location: "Lokasiya",
    source: "Mənbə",
    signals: "Siqnallar",
    manual: "Əl ilə",
    trust: "Etibar",
    apply: "Müraciət",
    review: "Yoxla",
    approve: "Təsdiqlə",
    reject: "Rədd et",
    jobs: "Vakansiyalar",
    jobsCopy: "Status və müraciət sağlamlığı ilə kompakt moderasiya cədvəli.",
    searchJobs: "Başlıq və ya şirkət üzrə axtar",
    allStatuses: "Bütün statuslar",
    allCompanies: "Bütün şirkətlər",
    allLevels: "Bütün səviyyələr",
    allLocations: "Bütün lokasiyalar",
    allApplyStatuses: "Bütün müraciət statusları",
    resetFilters: "Filtrləri sıfırla",
    vacancy: "Vakansiya",
    level: "Səviyyə",
    workModel: "İş modeli",
    deadline: "Son tarix",
    applyLink: "Müraciət linki",
    more: "Daha çox",
    edit: "Redaktə et",
    viewPublicPage: "İctimai səhifəyə bax",
    unpublish: "Yayımdan çıxar",
    publish: "Yayımla",
    duplicate: "Kopyala",
    openApplyLink: "Müraciət linkini aç",
    archive: "Arxivlə",
    delete: "Sil",
    previous: "Əvvəlki",
    next: "Növbəti",
    showing: "Göstərilir",
    of: "/",
    companiesCopy: "Təsdiq və görünürlük ayrı sütunlarda göstərilir.",
    searchCompanies: "Şirkət və ya domen üzrə axtar",
    allVerification: "Bütün təsdiq statusları",
    verified: "Təsdiqlənib",
    notVerified: "Təsdiqlənməyib",
    allVisibility: "Bütün görünürlük statusları",
    visible: "Görünür",
    hidden: "Gizli",
    allSectors: "Bütün sektorlar",
    sector: "Sektor",
    openJobs: "Açıq vakansiyalar",
    visibility: "Görünürlük",
    verification: "Təsdiq",
    domain: "Domen",
    verify: "Təsdiqlə",
    unverify: "Təsdiqi sil",
    show: "Göstər",
    hide: "Gizlət",
    archivedCopy: "Arxiv vakansiyaları burada göstərilir. Şirkət arxivi üçün backend dəstəyi hələ yoxdur.",
    emptyArchivedTitle: "Hələ arxiv vakansiyası yoxdur.",
    emptyArchivedText: "Arxivlənən məzmun burada görünəcək.",
    moveToDraft: "Qaralamaya keçir",
    closeEditor: "Redaktoru bağla",
    close: "Bağla",
    editJob: "Vakansiyanı redaktə et",
    editCompany: "Şirkəti redaktə et",
    drawerJobCopy: "Moderasiya və yayım üçün qruplaşdırılmış forma.",
    drawerCompanyCopy: "Aydın status nəzarətləri olan şirkət profili forması.",
    basicInfo: "Əsas məlumat",
    selectCompany: "Şirkət seç",
    category: "Sektor / kateqoriya",
    sourceAndApply: "Mənbə və müraciət",
    sourceUrl: "Mənbə linki",
    applyUrl: "Müraciət linki",
    sourceDomain: "Mənbə domeni",
    applyLinkStatus: "Müraciət linki statusu",
    dates: "Tarixlər",
    publishedDate: "Yayım tarixi",
    content: "Məzmun",
    description: "Təsvir",
    responsibilities: "Məsuliyyətlər",
    requirements: "Tələblər",
    tags: "Teqlər",
    aiEnrichment: "AI zənginləşdirmə",
    generateSummary: "Xülasə yarat",
    normalizeLevel: "Səviyyəni normallaşdır",
    extractTags: "Teqləri çıxar",
    regenerateDetails: "Detalları yenilə",
    jobStatus: "Vakansiya statusu",
    notes: "Qeydlər",
    save: "Yadda saxla",
    draft: "Qaralama",
    saveCompany: "Şirkəti yadda saxla",
    name: "Ad",
    tagline: "Qısa təqdimat",
    industryTags: "Sahə teqləri",
    companySize: "Şirkət ölçüsü",
    countryCity: "Ölkə / şəhər",
    brandLogo: "Brend/logo",
    logoUrl: "Logo linki",
    uploadLogo: "Logo yüklə",
    noLogo: "Logo yoxdur",
    officialWebsite: "Rəsmi sayt",
    coverImageUrl: "Cover şəkil linki",
    featured: "Seçilmiş"
  },
  ru: {
    moderationDashboard: "Панель модерации",
    dashboardDescription: "Чистый поток проверки вакансий и компаний с компактными действиями.",
    dashboard: "Панель",
    reviewQueue: "Очередь проверки",
    allJobs: "Все вакансии",
    companies: "Компании",
    newJob: "Новая вакансия",
    newCompany: "Новая компания",
    archived: "Архив",
    logout: "Выйти",
    collapseSidebar: "Свернуть меню",
    expandSidebar: "Развернуть меню",
    needsReview: "Нужна проверка",
    publishedJobs: "Опубликованные вакансии",
    archivedJobs: "Архивные вакансии",
    brokenApplyLinks: "Нерабочие ссылки",
    hiddenCompanies: "Скрытые компании",
    dashboardOverview: "Обзор панели",
    dashboardOverviewCopy: "Краткие показатели и быстрые действия.",
    viewAllJobs: "Смотреть все вакансии",
    goToReviewQueue: "Перейти к очереди",
    recentJobs: "Недавние вакансии",
    company: "Компания",
    status: "Статус",
    updated: "Обновлено",
    action: "Действие",
    actions: "Действия",
    reviewQueuePreview: "Очередь проверки",
    emptyReviewTitle: "Сейчас нет вакансий для проверки.",
    emptyReviewText: "Вакансии из новых источников появятся здесь.",
    reviewQueueCopy: "Предложенные вакансии остаются внутренними до одобрения.",
    title: "Название",
    location: "Локация",
    source: "Источник",
    signals: "Сигналы",
    manual: "Вручную",
    trust: "Доверие",
    apply: "Отклик",
    review: "Проверить",
    approve: "Одобрить",
    reject: "Отклонить",
    jobs: "Вакансии",
    jobsCopy: "Компактная таблица модерации со статусом и состоянием ссылки.",
    searchJobs: "Искать по названию или компании",
    allStatuses: "Все статусы",
    allCompanies: "Все компании",
    allLevels: "Все уровни",
    allLocations: "Все локации",
    allApplyStatuses: "Все статусы отклика",
    resetFilters: "Сбросить фильтры",
    vacancy: "Вакансия",
    level: "Уровень",
    workModel: "Формат работы",
    deadline: "Дедлайн",
    applyLink: "Ссылка отклика",
    more: "Еще",
    edit: "Редактировать",
    viewPublicPage: "Открыть публичную страницу",
    unpublish: "Снять с публикации",
    publish: "Опубликовать",
    duplicate: "Дублировать",
    openApplyLink: "Открыть ссылку отклика",
    archive: "В архив",
    delete: "Удалить",
    previous: "Назад",
    next: "Вперед",
    showing: "Показано",
    of: "из",
    companiesCopy: "Проверка и видимость показаны в отдельных колонках.",
    searchCompanies: "Искать по компании или домену",
    allVerification: "Любая проверка",
    verified: "Проверена",
    notVerified: "Не проверена",
    allVisibility: "Любая видимость",
    visible: "Видима",
    hidden: "Скрыта",
    allSectors: "Все секторы",
    sector: "Сектор",
    openJobs: "Открытые вакансии",
    visibility: "Видимость",
    verification: "Проверка",
    domain: "Домен",
    verify: "Проверить",
    unverify: "Снять проверку",
    show: "Показать",
    hide: "Скрыть",
    archivedCopy: "Архивные вакансии показаны здесь. Архив компаний пока требует backend-поддержки.",
    emptyArchivedTitle: "Архивных вакансий пока нет.",
    emptyArchivedText: "Архивный контент появится здесь.",
    moveToDraft: "Перенести в черновик",
    closeEditor: "Закрыть редактор",
    close: "Закрыть",
    editJob: "Редактировать вакансию",
    editCompany: "Редактировать компанию",
    drawerJobCopy: "Сгруппированная форма для чистой модерации и публикации.",
    drawerCompanyCopy: "Чистая форма профиля компании с понятными статусами.",
    basicInfo: "Основная информация",
    selectCompany: "Выбрать компанию",
    category: "Сектор / категория",
    sourceAndApply: "Источник и отклик",
    sourceUrl: "Ссылка источника",
    applyUrl: "Ссылка отклика",
    sourceDomain: "Домен источника",
    applyLinkStatus: "Статус ссылки отклика",
    dates: "Даты",
    publishedDate: "Дата публикации",
    content: "Контент",
    description: "Описание",
    responsibilities: "Обязанности",
    requirements: "Требования",
    tags: "Теги",
    aiEnrichment: "AI-обогащение",
    generateSummary: "Создать краткое описание",
    normalizeLevel: "Нормализовать уровень",
    extractTags: "Извлечь теги",
    regenerateDetails: "Обновить детали",
    jobStatus: "Статус вакансии",
    notes: "Заметки",
    save: "Сохранить",
    draft: "Черновик",
    saveCompany: "Сохранить компанию",
    name: "Название",
    tagline: "Короткое описание",
    industryTags: "Отраслевые теги",
    companySize: "Размер компании",
    countryCity: "Страна / город",
    brandLogo: "Бренд/logo",
    logoUrl: "Ссылка на логотип",
    uploadLogo: "Загрузить логотип",
    noLogo: "Нет логотипа",
    officialWebsite: "Официальный сайт",
    coverImageUrl: "Ссылка на обложку",
    featured: "Избранная"
  }
} as const;

function normalizeLevelForDisplay(value: string | null | undefined): NormalizedLevelLabel {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");

  if (
    ["internship", "intern", "trainee", "staj", "təcrübəçi", "təcrübə", "tecrube"].includes(normalized)
  ) {
    return "internship";
  }

  if (
    [
      "junior",
      "entry level",
      "entrylevel",
      "new graduate",
      "newgraduate",
      "graduate",
      "yeni məzun",
      "yeni mezun"
    ].includes(normalized)
  ) {
    return "entry_level";
  }

  if (
    ["mid", "orta səviyyə", "orta seviyye", "specialist", "mütəxəssis", "expert", "associate", "officer"].includes(
      normalized
    )
  ) {
    return "mid";
  }

  if (["senior", "lead", "baş mütəxəssis", "bas mutexessis"].includes(normalized)) {
    return "senior";
  }

  if (["manager", "menecer", "head", "rəhbər", "rehber"].includes(normalized)) {
    return "manager";
  }

  return "unknown";
}

function normalizeLevelForSave(level: NormalizedLevelLabel): Job["level"] {
  return level;
}

function formatAdminLevel(locale: "az" | "en" | "ru", level: NormalizedLevelLabel) {
  const labels: Record<NormalizedLevelLabel, Record<"az" | "en" | "ru", string>> = {
    internship: { az: "Təcrübə", en: "Internship", ru: "Стажировка" },
    entry_level: { az: "Giriş səviyyəsi", en: "Entry level", ru: "Начальный уровень" },
    mid: { az: "Mütəxəssis", en: "Specialist", ru: "Специалист" },
    senior: { az: "Senior", en: "Senior", ru: "Senior" },
    manager: { az: "Menecer", en: "Manager", ru: "Менеджер" },
    unknown: { az: "Seçilməyib", en: "Not selected", ru: "Не выбрано" }
  };

  return labels[level][locale];
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDeadlineValue() {
  const date = new Date();
  date.setDate(date.getDate() + 21);
  return date.toISOString().slice(0, 10);
}

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[] | undefined) {
  return (values ?? []).join("\n");
}

function createEmptyJobForm(companySlug = ""): JobFormState {
  return {
    title: "",
    companySlug,
    city: "Bakı",
    workModel: "Hibrid",
    level: "unknown",
    category: "",
    postedAt: todayValue(),
    deadline: defaultDeadlineValue(),
    summary: "",
    responsibilities: "",
    requirements: "",
    benefits: "",
    tags: "",
    applyUrl: "",
    sourceName: "",
    sourceUrl: "",
    moderationStatus: "draft",
    moderationNotes: ""
  };
}

function createEmptyCompanyForm(): CompanyFormState {
  return {
    name: "",
    tagline: "Stradify company profile",
    sector: "General",
    industryTags: "General",
    size: "Unknown",
    location: "Baku, Azerbaijan",
    website: "",
    sourceUrl: "",
    companyDomain: "",
    logo: "",
    cover: "/hero_bg.webp",
    about: "Add a brief description about the company.",
    focusAreas: "",
    youthOffer: "",
    benefits: "",
    verified: true,
    featured: false,
    wikipediaSummary: "",
    wikipediaSourceUrl: "",
    visible: true
  };
}

function mapJobToForm(job: Job): JobFormState {
  return {
    title: getPrimaryLocalizedText(job.title),
    companySlug: job.companySlug,
    city: job.city,
    workModel: job.workModel,
    level: normalizeLevelForDisplay(job.level),
    category: getPrimaryLocalizedText(job.category),
    postedAt: job.postedAt,
    deadline: job.deadline,
    summary: getPrimaryLocalizedText(job.summary),
    responsibilities: joinLines(job.responsibilities),
    requirements: joinLines(job.requirements),
    benefits: joinLines(job.benefits),
    tags: (job.tags ?? []).map((tag) => getPrimaryLocalizedText(tag)).join("\n"),
    applyUrl: job.applyActionUrl ?? job.finalVerifiedUrl ?? job.canonicalApplyUrl ?? job.applyUrl ?? "",
    sourceName: job.sourceName ?? "",
    sourceUrl: job.sourceUrl ?? job.sourceListingUrl ?? "",
    moderationStatus: job.moderationStatus ?? "draft",
    moderationNotes: job.moderationNotes ?? ""
  };
}

function mapCompanyToForm(company: Company): CompanyFormState {
  return {
    name: company.name,
    tagline: company.tagline,
    sector: company.sector,
    industryTags: joinLines(company.industryTags ?? [company.sector]),
    size: company.size,
    location: company.location,
    website: company.website,
    sourceUrl: company.profileSourceUrl ?? company.wikipediaSourceUrl ?? "",
    companyDomain: company.companyDomain ?? "",
    logo: company.logo ?? "",
    cover: company.cover ?? "",
    about: company.about,
    focusAreas: joinLines(company.focusAreas),
    youthOffer: joinLines(company.youthOffer),
    benefits: joinLines(company.benefits),
    verified: company.verified !== false,
    featured: Boolean(company.featured),
    wikipediaSummary: company.wikipediaSummary ?? "",
    wikipediaSourceUrl: company.wikipediaSourceUrl ?? "",
    visible: company.visible !== false
  };
}

function shortUrl(value: string | undefined | null) {
  if (!value) {
    return "—";
  }
  return value.replace(/^https?:\/\//, "").replace(/^www\./, "").slice(0, 40);
}

function extractDomain(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || null;
  }
}

function formatScore(value?: number) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

function getApplyStatus(job: Job): "valid" | "missing" | "broken" | "unknown" {
  if (!job.finalVerifiedUrl && !job.canonicalApplyUrl && !job.applyUrl && !job.applyActionUrl) {
    return "missing";
  }
  if (job.applyLinkStatus === "valid") {
    return "valid";
  }
  if (job.applyLinkStatus === "broken") {
    return "broken";
  }
  return "unknown";
}

function statusLabel(locale: "az" | "en" | "ru", status: JobModerationStatus | undefined) {
  const labels: Record<string, Record<"az" | "en" | "ru", string>> = {
    published: { az: "Yayımdadır", en: "Published", ru: "Опубликовано" },
    approved: { az: "Qaralama", en: "Draft", ru: "Черновик" },
    suggested: { az: "Yoxlama lazımdır", en: "Needs review", ru: "Нужна проверка" },
    needs_review: { az: "Yoxlama lazımdır", en: "Needs review", ru: "Нужна проверка" },
    rejected: { az: "Rədd edilib", en: "Rejected", ru: "Отклонено" },
    archived: { az: "Arxivdədir", en: "Archived", ru: "В архиве" },
    draft: { az: "Qaralama", en: "Draft", ru: "Черновик" }
  };

  return labels[status ?? "draft"]?.[locale] ?? labels.draft[locale];
}

function applyStatusLabel(locale: "az" | "en" | "ru", status: ReturnType<typeof getApplyStatus>) {
  const labels: Record<ReturnType<typeof getApplyStatus>, Record<"az" | "en" | "ru", string>> = {
    valid: { az: "Keçərlidir", en: "Valid", ru: "Действительна" },
    missing: { az: "Link yoxdur", en: "Missing link", ru: "Нет ссылки" },
    broken: { az: "Link işləmir", en: "Broken link", ru: "Ссылка не работает" },
    unknown: { az: "Naməlum", en: "Unknown", ru: "Неизвестно" }
  };

  return labels[status][locale];
}

function StatusBadge({
  tone,
  label
}: {
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  label: string;
}) {
  return <span className={`admin-v2-badge admin-v2-badge--${tone}`}>{label}</span>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="admin-v2-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="admin-v2-empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`admin-v2-form-section admin-v2-form-section--collapsible${open ? " admin-v2-form-section--open" : ""}`}>
      <button
        type="button"
        className="admin-v2-form-section__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h3>{title}</h3>
        <span className="admin-v2-form-section__chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open ? <div className="admin-v2-form-section__body">{children}</div> : null}
    </section>
  );
}

export function AdminPanelClient({ companies: initialCompanies, jobs: initialJobs }: AdminPanelClientProps) {
  const router = useRouter();
  const { locale: _siteLocale } = useI18n();
  const locale = "en" as const; // Admin panel always uses English
  const [companies, setCompanies] = useState(initialCompanies);
  const [jobs, setJobs] = useState(initialJobs);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [jobForm, setJobForm] = useState<JobFormState>(createEmptyJobForm(initialCompanies[0]?.slug ?? ""));
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(createEmptyCompanyForm());
  const [message, setMessage] = useState<AdminMessage>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((msg: AdminMessage) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage(msg);
    if (msg?.kind === "success") {
      messageTimerRef.current = setTimeout(() => setMessage(null), 4000);
    }
  }, []);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [jobFilters, setJobFilters] = useState<JobFilters>({
    search: "",
    status: "all",
    companySlug: "all",
    level: "all",
    location: "all",
    applyStatus: "all"
  });
  const [companyFilters, setCompanyFilters] = useState<CompanyFilters>({
    search: "",
    verified: "all",
    visibility: "all",
    sector: "all"
  });
  const [jobsPage, setJobsPage] = useState(1);
  const [aiPreview, setAiPreview] = useState<{ field: string; label: string; value: string } | null>(null);

  useEffect(() => {
    if (!selectedLogoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedLogoFile);
    setLogoPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedLogoFile]);

  const reviewJobs = useMemo(
    () => jobs.filter((job) => reviewQueueStatuses.includes(job.moderationStatus ?? "draft")),
    [jobs]
  );

  const publishedJobs = useMemo(
    () => jobs.filter((job) => job.moderationStatus === "published"),
    [jobs]
  );

  const archivedJobs = useMemo(
    () => jobs.filter((job) => job.moderationStatus === "archived"),
    [jobs]
  );

  const hiddenCompanies = useMemo(
    () => companies.filter((company) => company.visible === false),
    [companies]
  );

  const brokenApplyJobs = useMemo(
    () => jobs.filter((job) => getApplyStatus(job) === "broken"),
    [jobs]
  );

  const companyJobCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      counts.set(job.companySlug, (counts.get(job.companySlug) ?? 0) + 1);
    }
    return counts;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const title = getPrimaryLocalizedText(job.title).toLowerCase();
      const company = companies.find((item) => item.slug === job.companySlug)?.name.toLowerCase() ?? "";
      const bySearch =
        !jobFilters.search ||
        title.includes(jobFilters.search.toLowerCase()) ||
        company.includes(jobFilters.search.toLowerCase());
      const byStatus =
        jobFilters.status === "all" || (job.moderationStatus ?? "draft") === jobFilters.status;
      const byCompany = jobFilters.companySlug === "all" || job.companySlug === jobFilters.companySlug;
      const byLevel =
        jobFilters.level === "all" || normalizeLevelForDisplay(job.level) === jobFilters.level;
      const byLocation = jobFilters.location === "all" || job.city === jobFilters.location;
      const byApply = jobFilters.applyStatus === "all" || getApplyStatus(job) === jobFilters.applyStatus;
      return bySearch && byStatus && byCompany && byLevel && byLocation && byApply;
    });
  }, [jobs, companies, jobFilters]);

  const paginatedJobs = useMemo(() => {
    const start = (jobsPage - 1) * perPage;
    return filteredJobs.slice(start, start + perPage);
  }, [filteredJobs, jobsPage]);

  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / perPage));

  useEffect(() => {
    setJobsPage(1);
  }, [jobFilters]);

  useEffect(() => {
    if (jobsPage > totalJobPages) {
      setJobsPage(totalJobPages);
    }
  }, [jobsPage, totalJobPages]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const companyDomain = extractDomain(company.website) ?? company.companyDomain ?? "";
      const bySearch =
        !companyFilters.search ||
        company.name.toLowerCase().includes(companyFilters.search.toLowerCase()) ||
        companyDomain.toLowerCase().includes(companyFilters.search.toLowerCase());
      const byVerified =
        companyFilters.verified === "all" ||
        (companyFilters.verified === "verified"
          ? company.verified !== false
          : company.verified === false);
      const visibility = company.visible === false ? "hidden" : "visible";
      const byVisibility =
        companyFilters.visibility === "all" || companyFilters.visibility === visibility;
      const bySector = companyFilters.sector === "all" || company.sector === companyFilters.sector;
      return bySearch && byVerified && byVisibility && bySector;
    });
  }, [companies, companyFilters]);

  function closeDrawer() {
    setDrawer(null);
    setSelectedLogoFile(null);
    setLogoPreviewUrl(null);
  }

  function openJobEditor(job?: Job) {
    showMessage(null);
    if (job) {
      setJobForm(mapJobToForm(job));
      setDrawer({ type: "job", mode: "edit", slug: job.slug });
      return;
    }
    setJobForm(createEmptyJobForm(companies[0]?.slug ?? ""));
    setDrawer({ type: "job", mode: "create" });
  }

  function openCompanyEditor(company?: Company) {
    showMessage(null);
    setSelectedLogoFile(null);
    if (company) {
      setCompanyForm(mapCompanyToForm(company));
      setDrawer({ type: "company", mode: "edit", slug: company.slug });
      return;
    }
    setCompanyForm(createEmptyCompanyForm());
    setDrawer({ type: "company", mode: "create" });
  }

  function duplicateJob(job: Job) {
    const sourceForm = mapJobToForm(job);
    setJobForm({
      ...sourceForm,
      title: `${sourceForm.title} (Copy)`,
      moderationStatus: "draft"
    });
    setDrawer({ type: "job", mode: "create" });
  }

  function updateJobInState(nextJob: Job) {
    setJobs((current) => {
      const existingIndex = current.findIndex((item) => item.slug === nextJob.slug);
      if (existingIndex === -1) {
        return [nextJob, ...current];
      }
      const clone = [...current];
      clone[existingIndex] = nextJob;
      return clone;
    });
  }

  function updateCompanyInState(nextCompany: Company) {
    setCompanies((current) => {
      const existingIndex = current.findIndex((item) => item.slug === nextCompany.slug);
      if (existingIndex === -1) {
        return [nextCompany, ...current];
      }
      const clone = [...current];
      clone[existingIndex] = nextCompany;
      return clone;
    });
  }

  async function submitJob(statusOverride?: JobModerationStatus) {
    setIsSavingJob(true);
    showMessage(null);
    const endpoint =
      drawer?.type === "job" && drawer.mode === "edit" && drawer.slug
        ? `/api/jobs/${drawer.slug}`
        : "/api/jobs";
    const method = drawer?.type === "job" && drawer.mode === "edit" ? "PUT" : "POST";
    const moderationStatus = statusOverride ?? jobForm.moderationStatus;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobForm.title,
          companySlug: jobForm.companySlug,
          city: jobForm.city,
          workModel: jobForm.workModel,
          category: jobForm.category,
          postedAt: jobForm.postedAt,
          deadline: jobForm.deadline,
          summary: jobForm.summary,
          responsibilities: splitLines(jobForm.responsibilities),
          requirements: splitLines(jobForm.requirements),
          benefits: splitLines(jobForm.benefits),
          tags: splitLines(jobForm.tags),
          applyUrl: jobForm.applyUrl,
          sourceName: jobForm.sourceName,
          sourceUrl: jobForm.sourceUrl,
          directCompanyUrl: jobForm.sourceUrl,
          level: normalizeLevelForSave(jobForm.level),
          moderationStatus,
          moderationNotes: jobForm.moderationNotes
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Job was not saved.");
      }
      updateJobInState(result.item);
      showMessage({ kind: "success", text: result.message ?? "Job saved." });
      router.refresh();
      closeDrawer();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Job was not saved."
      });
    } finally {
      setIsSavingJob(false);
    }
  }

  async function uploadLogoIfNeeded() {
    if (!selectedLogoFile) {
      return companyForm.logo;
    }
    const body = new FormData();
    body.append("file", selectedLogoFile);
    const response = await fetch("/api/admin/uploads/logo", { method: "POST", body });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message ?? "Logo upload failed.");
    }
    return result.url as string;
  }

  async function submitCompany() {
    setIsSavingCompany(true);
    showMessage(null);
    const endpoint =
      drawer?.type === "company" && drawer.mode === "edit" && drawer.slug
        ? `/api/companies/${drawer.slug}`
        : "/api/companies";
    const method = drawer?.type === "company" && drawer.mode === "edit" ? "PUT" : "POST";

    try {
      const logo = await uploadLogoIfNeeded();
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyForm.name,
          tagline: companyForm.tagline,
          sector: companyForm.sector,
          industryTags: splitLines(companyForm.industryTags),
          size: companyForm.size,
          location: companyForm.location,
          website: companyForm.website,
          profileSourceUrl: companyForm.sourceUrl,
          companyDomain: companyForm.companyDomain,
          logo,
          cover: companyForm.cover,
          about: companyForm.about,
          focusAreas: splitLines(companyForm.focusAreas),
          youthOffer: splitLines(companyForm.youthOffer),
          benefits: splitLines(companyForm.benefits),
          verified: companyForm.verified,
          featured: companyForm.featured,
          wikipediaSummary: companyForm.wikipediaSummary,
          wikipediaSourceUrl: companyForm.wikipediaSourceUrl,
          visible: companyForm.visible
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Company was not saved.");
      }
      updateCompanyInState(result.item);
      showMessage({ kind: "success", text: result.message ?? "Company saved." });
      router.refresh();
      closeDrawer();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Company was not saved."
      });
    } finally {
      setIsSavingCompany(false);
    }
  }

  async function updateJobStatus(job: Job, moderationStatus: JobModerationStatus) {
    showMessage(null);
    try {
      const response = await fetch(`/api/admin/jobs/${job.slug}/moderation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationStatus })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Status was not updated.");
      }
      updateJobInState(result.item);
      showMessage({ kind: "success", text: result.message ?? "Status updated." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Status was not updated."
      });
    }
  }

  async function toggleVerified(company: Company) {
    showMessage(null);
    try {
      const response = await fetch(`/api/admin/companies/${company.slug}/verified`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: company.verified === false })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Verification state was not updated.");
      }
      updateCompanyInState(result.item);
      showMessage({ kind: "success", text: result.message ?? "Verification state updated." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Verification state was not updated."
      });
    }
  }

  async function toggleVisibility(company: Company) {
    showMessage(null);
    try {
      const response = await fetch(`/api/admin/companies/${company.slug}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: company.visible === false })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Visibility was not updated.");
      }
      updateCompanyInState(result.item);
      showMessage({ kind: "success", text: result.message ?? "Visibility updated." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Visibility was not updated."
      });
    }
  }

  async function deleteJob(job: Job) {
    if (!window.confirm(`Delete "${getPrimaryLocalizedText(job.title)}"?`)) {
      return;
    }
    showMessage(null);
    try {
      const response = await fetch(`/api/jobs/${job.slug}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Job was not deleted.");
      }
      setJobs((current) => current.filter((item) => item.slug !== job.slug));
      showMessage({ kind: "success", text: result.message ?? "Job deleted." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Job was not deleted."
      });
    }
  }

  async function deleteCompany(company: Company) {
    if (!window.confirm(`Delete company "${company.name}"?`)) {
      return;
    }
    showMessage(null);
    try {
      const response = await fetch(`/api/companies/${company.slug}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Company was not deleted.");
      }
      setCompanies((current) => current.filter((item) => item.slug !== company.slug));
      showMessage({ kind: "success", text: result.message ?? "Company deleted." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Company was not deleted."
      });
    }
  }

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  function resetJobFilters() {
    setJobFilters({
      search: "",
      status: "all",
      companySlug: "all",
      level: "all",
      location: "all",
      applyStatus: "all"
    });
    setJobsPage(1);
  }

  function resetCompanyFilters() {
    setCompanyFilters({
      search: "",
      verified: "all",
      visibility: "all",
      sector: "all"
    });
  }

  function maybeConfirmAction(messageText: string) {
    return window.confirm(messageText);
  }

  function runJobAiAction(action: "summary" | "normalize-level" | "extract-tags" | "regenerate") {
    if (action === "summary") {
      const seed = [jobForm.title, jobForm.category, jobForm.city].filter(Boolean).join(" · ");
      const generated = `Role overview: ${seed || "Early-career role with verified responsibilities and growth potential."}`;
      setAiPreview({ field: "summary", label: "Generated summary", value: generated });
      return;
    }

    if (action === "normalize-level") {
      const title = jobForm.title.toLowerCase();
      const nextLevel: NormalizedLevelLabel = title.includes("intern")
        ? "internship"
        : title.includes("junior") || title.includes("entry")
          ? "entry_level"
          : title.includes("manager")
            ? "manager"
            : title.includes("senior")
              ? "senior"
              : jobForm.level;
      setAiPreview({ field: "level", label: "Normalized level", value: formatAdminLevel(locale, nextLevel) + ` (${nextLevel})` });
      return;
    }

    if (action === "extract-tags") {
      const pool = `${jobForm.title}\n${jobForm.summary}\n${jobForm.requirements}`.toLowerCase();
      const inferred = ["internship", "junior", "remote", "hybrid", "data", "marketing", "design", "product"]
        .filter((candidate) => pool.includes(candidate))
        .slice(0, 6)
        .join("\n");
      if (inferred) {
        setAiPreview({ field: "tags", label: "Extracted tags", value: inferred });
      } else {
        showMessage({ kind: "error", text: "Could not extract any tags from the current content." });
      }
      return;
    }

    const nextSummary = jobForm.summary.trim() || `Role: ${jobForm.title}.`;
    const details = splitLines(jobForm.requirements);
    const generated = `Summary: ${nextSummary}\n\nResponsibilities:\n${details.join("\n") || "(none detected)"}`;
    setAiPreview({ field: "regenerate", label: "Regenerated details", value: generated });
  }

  function applyAiPreview() {
    if (!aiPreview) return;
    if (aiPreview.field === "summary") {
      setJobForm((current) => ({ ...current, summary: aiPreview.value }));
    } else if (aiPreview.field === "level") {
      const levelMatch = aiPreview.value.match(/\((\w+)\)$/);
      if (levelMatch) {
        setJobForm((current) => ({ ...current, level: levelMatch[1] as NormalizedLevelLabel }));
      }
    } else if (aiPreview.field === "tags") {
      setJobForm((current) => ({ ...current, tags: aiPreview.value }));
    } else if (aiPreview.field === "regenerate") {
      const nextSummary = jobForm.summary.trim() || `Role: ${jobForm.title}.`;
      const details = splitLines(jobForm.requirements);
      setJobForm((current) => ({
        ...current,
        summary: nextSummary,
        responsibilities: current.responsibilities || details.join("\n")
      }));
    }
    setAiPreview(null);
    showMessage({ kind: "success", text: "AI suggestion applied." });
  }

  const navItems: Array<{ id: AdminSection; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "review-queue", label: "Review queue" },
    { id: "jobs", label: "All jobs" },
    { id: "companies", label: "Companies" },
    { id: "new-job", label: "New job" },
    { id: "new-company", label: "New company" },
    { id: "archived", label: "Archived" }
  ];

  const sectorOptions = Array.from(new Set(companies.map((company) => company.sector))).sort();
  const cityOptions = Array.from(new Set(jobs.map((job) => job.city))).sort();

  return (
    <div className={`admin-v2 ${sidebarCollapsed ? "admin-v2--sidebar-collapsed" : ""}`}>
      <aside className="admin-v2-sidebar">
        <div className="admin-v2-brand">
          <img src="/stradify-logo.png" alt="" />
          <div>
            <strong>Admin</strong>
            <span>Moderation dashboard</span>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="admin-v2-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-v2-nav__item${activeSection === item.id ? " is-active" : ""}`}
              onClick={() => {
                if (item.id === "new-job") {
                  openJobEditor();
                } else if (item.id === "new-company") {
                  openCompanyEditor();
                } else {
                  setActiveSection(item.id);
                }
              }}
            >
              {item.label}
            </button>
          ))}
          <button type="button" className="admin-v2-nav__item admin-v2-nav__item--disabled" disabled>
            Settings
          </button>
        </nav>

        <div className="admin-v2-sidebar__footer">
          <button
            type="button"
            className="admin-v2-button admin-v2-button--ghost"
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </button>
          <button type="button" className="admin-v2-button admin-v2-button--danger" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-v2-main">
        <header className="admin-v2-header">
          <div>
            <h1>Moderation dashboard</h1>
            <p>Clean review flow for jobs and companies with compact actions.</p>
          </div>
          <div className="admin-v2-header__actions">
            <LanguageSwitcher compact className="admin-v2-language" />
            <button type="button" className="admin-v2-button" onClick={() => openJobEditor()}>
              New job
            </button>
            <button type="button" className="admin-v2-button" onClick={() => openCompanyEditor()}>
              New company
            </button>
          </div>
        </header>

        {message ? (
          <div className={`admin-v2-banner admin-v2-banner--${message.kind}`}>{message.text}</div>
        ) : null}

        <section className="admin-v2-stats">
          <StatCard label="Needs review" value={reviewJobs.length} />
          <StatCard label="Published jobs" value={publishedJobs.length} />
          <StatCard label="Companies" value={companies.length} />
          <StatCard label="Archived jobs" value={archivedJobs.length} />
          <StatCard label="Broken apply links" value={brokenApplyJobs.length} />
          <StatCard label="Hidden companies" value={hiddenCompanies.length} />
        </section>

        {activeSection === "dashboard" && (
          <section className="admin-v2-section">
            <div className="admin-v2-section__header">
              <div>
                <h2>Dashboard overview</h2>
                <p>Quick snapshot and fast actions.</p>
              </div>
              <button
                type="button"
                className="admin-v2-button admin-v2-button--primary"
                onClick={() => setActiveSection("jobs")}
              >
                View all jobs
              </button>
            </div>
            <div className="admin-v2-inline-actions">
              <button type="button" className="admin-v2-button" onClick={() => setActiveSection("review-queue")}>
                Go to review queue
              </button>
              <button type="button" className="admin-v2-button" onClick={() => openJobEditor()}>
                New job
              </button>
              <button type="button" className="admin-v2-button" onClick={() => openCompanyEditor()}>
                New company
              </button>
            </div>
            <div className="admin-v2-table-wrap">
              <table className="admin-v2-table">
                <thead>
                  <tr>
                    <th>Recent jobs</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.slice(0, 5).map((job) => {
                    const company = companies.find((item) => item.slug === job.companySlug);
                    return (
                      <tr key={job.slug}>
                        <td>{getPrimaryLocalizedText(job.title)}</td>
                        <td>{company?.name ?? job.companySlug}</td>
                        <td>
                          <StatusBadge tone="neutral" label={statusLabel(locale, job.moderationStatus)} />
                        </td>
                        <td>{job.postedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="admin-v2-table-wrap">
              <table className="admin-v2-table">
                <thead>
                  <tr>
                    <th>Review queue preview</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewJobs.slice(0, 5).map((job) => {
                    const company = companies.find((item) => item.slug === job.companySlug);
                    return (
                      <tr key={`preview-${job.slug}`}>
                        <td>{getPrimaryLocalizedText(job.title)}</td>
                        <td>{company?.name ?? job.companySlug}</td>
                        <td>
                          <StatusBadge tone="warning" label={statusLabel(locale, job.moderationStatus)} />
                        </td>
                        <td>
                          <button type="button" className="admin-v2-button" onClick={() => setActiveSection("review-queue")}>
                            Open queue
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {reviewJobs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="admin-v2-muted">
                        There are no jobs to review right now.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(activeSection === "review-queue") && (
          <section className="admin-v2-section">
            <div className="admin-v2-section__header">
              <div>
                <h2>Review queue</h2>
                <p>Suggested jobs remain internal until approved.</p>
              </div>
            </div>
            {reviewJobs.length === 0 ? (
              <EmptyState
                title="There are no jobs to review right now."
                text="Jobs from new sources will appear here."
              />
            ) : (
              <div className="admin-v2-table-wrap">
                <table className="admin-v2-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Company</th>
                      <th>Location</th>
                      <th>Source</th>
                      <th>Signals</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewJobs.map((job) => {
                      const company = companies.find((item) => item.slug === job.companySlug);
                      const status = job.moderationStatus ?? "draft";
                      return (
                        <tr key={job.slug}>
                          <td>
                            <strong>{getPrimaryLocalizedText(job.title)}</strong>
                          </td>
                          <td>{company?.name ?? job.companySlug}</td>
                          <td>{job.city}</td>
                          <td>
                            {job.sourceUrl ? (
                              <a
                                href={job.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-v2-link"
                              >
                                {job.sourceName ?? "Source"}
                              </a>
                            ) : (
                              <span className="admin-v2-muted">Manual</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-v2-signals">
                              <span>Trust: {formatScore(job.trustScore)}</span>
                              <span>Apply: {applyStatusLabel(locale, getApplyStatus(job))}</span>
                            </div>
                          </td>
                          <td>
                            <StatusBadge tone="warning" label={statusLabel(locale, status)} />
                          </td>
                          <td>
                            <div className="admin-v2-inline-actions">
                              <button type="button" className="admin-v2-button" onClick={() => openJobEditor(job)}>
                                Review
                              </button>
                              <button
                                type="button"
                                className="admin-v2-button admin-v2-button--primary"
                                onClick={() => void updateJobStatus(job, "approved")}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="admin-v2-button admin-v2-button--danger"
                                onClick={() => {
                                  if (maybeConfirmAction("Reject this job?")) {
                                    void updateJobStatus(job, "rejected");
                                  }
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeSection === "jobs" && (
          <section className="admin-v2-section">
            <div className="admin-v2-section__header">
              <div>
                <h2>Jobs</h2>
                <p>Compact moderation table with status and apply health.</p>
              </div>
            </div>
            <div className="admin-v2-filters">
              <input
                placeholder="Search by title or company"
                value={jobFilters.search}
                onChange={(event) =>
                  setJobFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
              <select
                value={jobFilters.status}
                onChange={(event) =>
                  setJobFilters((current) => ({
                    ...current,
                    status: event.target.value as JobFilters["status"]
                  }))
                }
              >
                <option value="all">All statuses</option>
                <option value="needs_review">Needs review</option>
                <option value="published">Published</option>
                <option value="approved">Draft</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={jobFilters.companySlug}
                onChange={(event) =>
                  setJobFilters((current) => ({ ...current, companySlug: event.target.value }))
                }
              >
                <option value="all">All companies</option>
                {companies.map((company) => (
                  <option key={company.slug} value={company.slug}>
                    {company.name}
                  </option>
                ))}
              </select>
              <select
                value={jobFilters.level}
                onChange={(event) =>
                  setJobFilters((current) => ({
                    ...current,
                    level: event.target.value as JobFilters["level"]
                  }))
                }
              >
                <option value="all">All levels</option>
                {normalizedLevelOptions.map((item) => (
                  <option key={item} value={item}>
                    {formatAdminLevel(locale, item)}
                  </option>
                ))}
              </select>
              <select
                value={jobFilters.location}
                onChange={(event) =>
                  setJobFilters((current) => ({ ...current, location: event.target.value }))
                }
              >
                <option value="all">All locations</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <select
                value={jobFilters.applyStatus}
                onChange={(event) =>
                  setJobFilters((current) => ({
                    ...current,
                    applyStatus: event.target.value as JobFilters["applyStatus"]
                  }))
                }
              >
                <option value="all">All apply statuses</option>
                <option value="valid">Valid</option>
                <option value="missing">Missing link</option>
                <option value="broken">Broken link</option>
                <option value="unknown">Unknown</option>
              </select>
              <button type="button" className="admin-v2-button" onClick={resetJobFilters}>
                Reset filters
              </button>
            </div>
            <div className="admin-v2-table-wrap">
              <table className="admin-v2-table">
                <thead>
                  <tr>
                    <th>Vacancy</th>
                    <th>Company</th>
                    <th>Level</th>
                    <th>Location</th>
                    <th>Work model</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Apply link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map((job) => {
                    const company = companies.find((item) => item.slug === job.companySlug);
                    const moderationStatus = job.moderationStatus ?? "draft";
                    const applyStatus = getApplyStatus(job);
                    const applyHref =
                      job.finalVerifiedUrl ?? job.canonicalApplyUrl ?? job.applyActionUrl ?? job.applyUrl ?? null;
                    return (
                      <tr key={job.slug}>
                        <td>
                          <strong>{getPrimaryLocalizedText(job.title)}</strong>
                          <div className="admin-v2-muted">{job.sourceName ?? "Manual"} · {job.postedAt}</div>
                        </td>
                        <td>{company?.name ?? job.companySlug}</td>
                        <td>{formatAdminLevel(locale, normalizeLevelForDisplay(job.level))}</td>
                        <td>{job.city}</td>
                        <td>{job.workModel}</td>
                        <td>{job.deadline}</td>
                        <td>
                          <StatusBadge
                            tone={
                              moderationStatus === "published"
                                ? "success"
                                : moderationStatus === "rejected"
                                  ? "danger"
                                  : moderationStatus === "archived"
                                    ? "neutral"
                                    : "warning"
                            }
                            label={statusLabel(locale, moderationStatus)}
                          />
                        </td>
                        <td>
                          <StatusBadge
                            tone={
                              applyStatus === "valid"
                                ? "success"
                                : applyStatus === "broken"
                                  ? "danger"
                                  : applyStatus === "missing"
                                    ? "warning"
                                    : "info"
                            }
                            label={applyStatusLabel(locale, applyStatus)}
                          />
                        </td>
                        <td>
                          <div className="admin-v2-table-actions">
                            <button type="button" className="admin-v2-button admin-v2-button--primary" onClick={() => openJobEditor(job)}>
                              Edit
                            </button>
                            <details className="admin-v2-action-menu">
                              <summary>More</summary>
                              <div>
                                <Link href={`/jobs/${job.slug}`} target="_blank">
                                  View public page
                                </Link>
                                {moderationStatus === "published" ? (
                                  <button type="button" onClick={() => void updateJobStatus(job, "approved")}>
                                    Unpublish
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => void updateJobStatus(job, "published")}>
                                    Publish
                                  </button>
                                )}
                                <button type="button" onClick={() => duplicateJob(job)}>
                                  Duplicate
                                </button>
                                {applyHref ? (
                                  <a href={applyHref} target="_blank" rel="noopener noreferrer">
                                    Open apply link
                                  </a>
                                ) : null}
                                {moderationStatus !== "archived" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (maybeConfirmAction("Archive this job?")) {
                                        void updateJobStatus(job, "archived");
                                      }
                                    }}
                                  >
                                    Archive
                                  </button>
                                ) : null}
                                {moderationStatus !== "rejected" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (maybeConfirmAction("Reject this job?")) {
                                        void updateJobStatus(job, "rejected");
                                      }
                                    }}
                                  >
                                    Reject
                                  </button>
                                ) : null}
                                <button type="button" onClick={() => void deleteJob(job)}>
                                  Delete
                                </button>
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="admin-v2-pagination">
              <span>
                Showing {filteredJobs.length === 0 ? 0 : (jobsPage - 1) * perPage + 1}-
                {Math.min(jobsPage * perPage, filteredJobs.length)} of {filteredJobs.length}
              </span>
              <div className="admin-v2-inline-actions">
                <button
                  type="button"
                  className="admin-v2-button"
                  disabled={jobsPage <= 1}
                  onClick={() => setJobsPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="admin-v2-button"
                  disabled={jobsPage >= totalJobPages}
                  onClick={() => setJobsPage((page) => Math.min(totalJobPages, page + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {activeSection === "companies" && (
          <section className="admin-v2-section">
            <div className="admin-v2-section__header">
              <div>
                <h2>Companies</h2>
                <p>Verification and visibility are shown as separate columns.</p>
              </div>
            </div>
            <div className="admin-v2-filters">
              <input
                placeholder="Search by company or domain"
                value={companyFilters.search}
                onChange={(event) =>
                  setCompanyFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
              <select
                value={companyFilters.verified}
                onChange={(event) =>
                  setCompanyFilters((current) => ({
                    ...current,
                    verified: event.target.value as CompanyFilters["verified"]
                  }))
                }
              >
                <option value="all">All verification</option>
                <option value="verified">Verified</option>
                <option value="not_verified">Not verified</option>
              </select>
              <select
                value={companyFilters.visibility}
                onChange={(event) =>
                  setCompanyFilters((current) => ({
                    ...current,
                    visibility: event.target.value as CompanyFilters["visibility"]
                  }))
                }
              >
                <option value="all">All visibility</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
              <select
                value={companyFilters.sector}
                onChange={(event) =>
                  setCompanyFilters((current) => ({ ...current, sector: event.target.value }))
                }
              >
                <option value="all">All sectors</option>
                {sectorOptions.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              <button type="button" className="admin-v2-button" onClick={resetCompanyFilters}>
                Reset filters
              </button>
            </div>
            <div className="admin-v2-table-wrap">
              <table className="admin-v2-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Sector</th>
                    <th>Open jobs</th>
                    <th>Visibility</th>
                    <th>Verification</th>
                    <th>Domain</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => {
                    const domain = company.companyDomain ?? extractDomain(company.website) ?? "—";
                    const sourceUrl = company.profileSourceUrl ?? company.website;
                    const visibilityLabel = company.visible === false ? "Hidden" : "Visible";
                    const verificationLabel = company.verified === false ? "Not verified" : "Verified";
                    return (
                      <tr key={company.slug}>
                        <td>
                          <div className="admin-v2-company-cell">
                            <div className="admin-v2-company-cell__logo">
                              {company.logo ? (
                                <img src={company.logo} alt={company.name} />
                              ) : (
                                <span>{company.name[0]}</span>
                              )}
                            </div>
                            <div className="admin-v2-company-cell__copy">
                              <strong>{company.name}</strong>
                              <span>{shortUrl(sourceUrl)}</span>
                            </div>
                          </div>
                        </td>
                        <td>{company.sector || "—"}</td>
                        <td>{companyJobCounts.get(company.slug) ?? 0}</td>
                        <td>
                          <StatusBadge tone={visibilityLabel === "Visible" ? "success" : "warning"} label={visibilityLabel} />
                        </td>
                        <td>
                          <StatusBadge tone={verificationLabel === "Verified" ? "success" : "neutral"} label={verificationLabel} />
                        </td>
                        <td title={domain}>
                          <span className="admin-v2-truncate">{domain}</span>
                        </td>
                        <td>
                          {sourceUrl ? (
                            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="admin-v2-link">
                              Source
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="admin-v2-table-actions">
                            <button type="button" className="admin-v2-button admin-v2-button--primary" onClick={() => openCompanyEditor(company)}>
                              Edit
                            </button>
                            <details className="admin-v2-action-menu">
                              <summary>More</summary>
                              <div>
                                <button type="button" onClick={() => setActiveSection("jobs")}>
                                  View jobs
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      maybeConfirmAction(
                                        company.verified === false
                                          ? "Mark company as verified?"
                                          : "Mark company as not verified?"
                                      )
                                    ) {
                                      void toggleVerified(company);
                                    }
                                  }}
                                >
                                  {company.verified === false ? "Verify" : "Unverify"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      maybeConfirmAction(
                                        company.visible === false
                                          ? "Show this company in listings?"
                                          : "Hide this company from listings?"
                                      )
                                    ) {
                                      void toggleVisibility(company);
                                    }
                                  }}
                                >
                                  {company.visible === false ? "Show" : "Hide"}
                                </button>
                                <button type="button" disabled title="TODO: company archive API is not supported yet">
                                  Archive (TODO)
                                </button>
                                <button type="button" onClick={() => void deleteCompany(company)}>
                                  Delete
                                </button>
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection === "archived" && (
          <section className="admin-v2-section">
            <div className="admin-v2-section__header">
              <div>
                <h2>Archived</h2>
                <p>Archived jobs are listed here. Company archive action is pending backend support.</p>
              </div>
            </div>
            {archivedJobs.length === 0 ? (
              <EmptyState title="No archived jobs yet." text="Archived content will appear here." />
            ) : (
              <div className="admin-v2-table-wrap">
                <table className="admin-v2-table">
                  <thead>
                    <tr>
                      <th>Vacancy</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedJobs.map((job) => {
                      const company = companies.find((item) => item.slug === job.companySlug);
                      return (
                        <tr key={job.slug}>
                          <td>{getPrimaryLocalizedText(job.title)}</td>
                          <td>{company?.name ?? job.companySlug}</td>
                          <td>
                            <StatusBadge tone="neutral" label="Archived" />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-v2-button"
                              onClick={() => void updateJobStatus(job, "approved")}
                            >
                              Move to draft
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {drawer ? (
        <div className="admin-v2-drawer" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-v2-drawer__backdrop"
            onClick={closeDrawer}
            aria-label="Close editor"
          />
          <div className="admin-v2-drawer__panel">
            <header className="admin-v2-drawer__header">
              <div>
                <p className="admin-v2-drawer__breadcrumb">
                  {drawer.type === "job" ? "Jobs" : "Companies"} / {drawer.mode === "edit" ? "Edit" : "New"}
                </p>
                <h2>
                  {drawer.type === "job"
                    ? drawer.mode === "edit"
                      ? "Edit job"
                      : "New job"
                    : drawer.mode === "edit"
                      ? "Edit company"
                      : "New company"}
                </h2>
                {drawer.type === "job" && drawer.mode === "edit" && jobForm.title ? (
                  <div className="admin-v2-drawer__context">
                    <strong>{jobForm.title}</strong>
                    <span>{companies.find((c) => c.slug === jobForm.companySlug)?.name ?? jobForm.companySlug}</span>
                    <StatusBadge
                      tone={jobForm.moderationStatus === "published" ? "success" : jobForm.moderationStatus === "rejected" ? "danger" : "warning"}
                      label={statusLabel(locale, jobForm.moderationStatus)}
                    />
                  </div>
                ) : null}
                {drawer.type === "company" && drawer.mode === "edit" && companyForm.name ? (
                  <div className="admin-v2-drawer__context">
                    {companyForm.logo ? (
                      <img src={companyForm.logo} alt="" className="admin-v2-drawer__context-logo" />
                    ) : (
                      <span className="admin-v2-drawer__context-initial">{companyForm.name[0]}</span>
                    )}
                    <strong>{companyForm.name}</strong>
                    <StatusBadge tone={companyForm.visible ? "success" : "warning"} label={companyForm.visible ? "Visible" : "Hidden"} />
                    <StatusBadge tone={companyForm.verified ? "success" : "neutral"} label={companyForm.verified ? "Verified" : "Not verified"} />
                  </div>
                ) : null}
              </div>
              <button type="button" className="admin-v2-button" onClick={closeDrawer}>
                Close
              </button>
            </header>

            {drawer.type === "job" ? (
              <form
                className="admin-v2-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitJob();
                }}
              >
                <CollapsibleSection title="Basic info" defaultOpen>
                  <div className="admin-v2-form-grid">
                    <label>
                      <span>Title</span>
                      <input
                        value={jobForm.title}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Company</span>
                      <select
                        value={jobForm.companySlug}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, companySlug: event.target.value }))
                        }
                      >
                        <option value="">Select company</option>
                        {companies.map((company) => (
                          <option key={company.slug} value={company.slug}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Level</span>
                      <select
                        value={jobForm.level}
                        onChange={(event) =>
                          setJobForm((current) => ({
                            ...current,
                            level: event.target.value as NormalizedLevelLabel
                          }))
                        }
                      >
                        {normalizedLevelOptions.map((item) => (
                          <option key={item} value={item}>
                            {formatAdminLevel(locale, item)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Location</span>
                      <input
                        value={jobForm.city}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, city: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Work model</span>
                      <select
                        value={jobForm.workModel}
                        onChange={(event) =>
                          setJobForm((current) => ({
                            ...current,
                            workModel: event.target.value as Job["workModel"]
                          }))
                        }
                      >
                        {workModelOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Sector / category</span>
                      <input
                        value={jobForm.category}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, category: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Source and apply">
                  <div className="admin-v2-form-grid">
                    <label>
                      <span>Source URL</span>
                      <div className="admin-v2-url-field">
                        <input
                          value={jobForm.sourceUrl}
                          onChange={(event) => {
                            const url = event.target.value;
                            setJobForm((current) => {
                              const next = { ...current, sourceUrl: url };
                              if (!current.sourceName && url) {
                                const domain = extractDomain(url);
                                if (domain) next.sourceName = domain;
                              }
                              return next;
                            });
                          }}
                        />
                        {jobForm.sourceUrl ? (
                          <a href={jobForm.sourceUrl} target="_blank" rel="noopener noreferrer" className="admin-v2-url-field__open" title="Open source link">↗</a>
                        ) : null}
                      </div>
                    </label>
                    <label>
                      <span>Apply URL</span>
                      <div className="admin-v2-url-field">
                        <input
                          value={jobForm.applyUrl}
                          onChange={(event) =>
                            setJobForm((current) => ({ ...current, applyUrl: event.target.value }))
                          }
                        />
                        {jobForm.applyUrl ? (
                          <a href={jobForm.applyUrl} target="_blank" rel="noopener noreferrer" className="admin-v2-url-field__open" title="Open apply link">↗</a>
                        ) : null}
                      </div>
                    </label>
                    <label>
                      <span>Source domain</span>
                      <input
                        value={jobForm.sourceName}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, sourceName: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Apply link status</span>
                      <input value={applyStatusLabel(locale, getApplyStatus({ ...jobForm, tags: [] } as unknown as Job))} readOnly />
                    </label>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Dates">
                  <div className="admin-v2-form-grid">
                    <label>
                      <span>Published date</span>
                      <input
                        type="date"
                        value={jobForm.postedAt}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, postedAt: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Deadline</span>
                      <input
                        type="date"
                        value={jobForm.deadline}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, deadline: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Content">
                  <div className="admin-v2-form-grid">
                    <label className="admin-v2-form-grid__full">
                      <span>Description</span>
                      <textarea
                        rows={4}
                        value={jobForm.summary}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, summary: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-v2-form-grid__full">
                      <span>Responsibilities</span>
                      <textarea
                        rows={3}
                        value={jobForm.responsibilities}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, responsibilities: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-v2-form-grid__full">
                      <span>Requirements</span>
                      <textarea
                        rows={3}
                        value={jobForm.requirements}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, requirements: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-v2-form-grid__full">
                      <span>Tags</span>
                      <textarea
                        rows={2}
                        value={jobForm.tags}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, tags: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="AI enrichment">
                  <div className="admin-v2-inline-actions">
                    <button type="button" className="admin-v2-button" onClick={() => runJobAiAction("summary")}>
                      Generate summary
                    </button>
                    <button type="button" className="admin-v2-button" onClick={() => runJobAiAction("normalize-level")}>
                      Normalize level
                    </button>
                    <button type="button" className="admin-v2-button" onClick={() => runJobAiAction("extract-tags")}>
                      Extract tags
                    </button>
                    <button type="button" className="admin-v2-button" onClick={() => runJobAiAction("regenerate")}>
                      Regenerate details
                    </button>
                  </div>
                  {aiPreview ? (
                    <div className="admin-v2-ai-preview">
                      <div className="admin-v2-ai-preview__header">
                        <strong>{aiPreview.label}</strong>
                      </div>
                      <pre className="admin-v2-ai-preview__content">{aiPreview.value}</pre>
                      <div className="admin-v2-ai-preview__actions">
                        <button type="button" className="admin-v2-button admin-v2-button--primary" onClick={applyAiPreview}>
                          Apply
                        </button>
                        <button type="button" className="admin-v2-button" onClick={() => setAiPreview(null)}>
                          Discard
                        </button>
                      </div>
                    </div>
                  ) : null}
                </CollapsibleSection>

                <CollapsibleSection title="Status">
                  <div className="admin-v2-form-grid">
                    <label>
                      <span>Job status</span>
                      <select
                        value={jobForm.moderationStatus}
                        onChange={(event) =>
                          setJobForm((current) => ({
                            ...current,
                            moderationStatus: event.target.value as JobModerationStatus
                          }))
                        }
                      >
                        <option value="published">Published</option>
                        <option value="approved">Draft</option>
                        <option value="rejected">Rejected</option>
                        <option value="archived">Archived</option>
                        <option value="needs_review">Needs review</option>
                      </select>
                    </label>
                    <label>
                      <span>Apply link status</span>
                      <input
                        value={applyStatusLabel(
                          locale,
                          getApplyStatus({
                            ...jobForm,
                            slug: "",
                            title: jobForm.title,
                            category: jobForm.category,
                            responsibilities: [],
                            requirements: [],
                            benefits: [],
                            tags: [],
                            companySlug: jobForm.companySlug
                          } as unknown as Job)
                        )}
                        readOnly
                      />
                    </label>
                    <label className="admin-v2-form-grid__full">
                      <span>Notes</span>
                      <textarea
                        rows={3}
                        value={jobForm.moderationNotes}
                        onChange={(event) =>
                          setJobForm((current) => ({ ...current, moderationNotes: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </CollapsibleSection>

                <footer className="admin-v2-drawer__actions">
                  <button type="submit" className="admin-v2-button admin-v2-button--primary" disabled={isSavingJob}>
                    {isSavingJob ? "Saving\u2026" : "Save changes"}
                  </button>
                  <button type="button" className="admin-v2-button" onClick={closeDrawer} disabled={isSavingJob}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-v2-button admin-v2-button--primary"
                    disabled={isSavingJob}
                    onClick={() => void submitJob("published")}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    className="admin-v2-button"
                    disabled={isSavingJob}
                    onClick={() => void submitJob("approved")}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    className="admin-v2-button admin-v2-button--danger"
                    disabled={isSavingJob}
                    onClick={() => {
                      if (maybeConfirmAction("Reject this job?")) {
                        void submitJob("rejected");
                      }
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="admin-v2-button"
                    disabled={isSavingJob}
                    onClick={() => {
                      if (maybeConfirmAction("Archive this job?")) {
                        void submitJob("archived");
                      }
                    }}
                  >
                    Archive
                  </button>
                </footer>
              </form>
            ) : (
              <form
                className="admin-v2-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitCompany();
                }}
              >
                <CollapsibleSection title="Basic info" defaultOpen>
                  <div className="admin-v2-form-grid">
                    <label>
                      <span>Name</span>
                      <input
                        value={companyForm.name}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Tagline</span>
                      <input
                        value={companyForm.tagline}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, tagline: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Sector</span>
                      <input
                        value={companyForm.sector}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, sector: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Industry tags</span>
                      <input
                        value={companyForm.industryTags}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, industryTags: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Company size</span>
                      <input
                        value={companyForm.size}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, size: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Country / city</span>
                      <input
                        value={companyForm.location}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, location: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-v2-form-grid__full">
                      <span>Description</span>
                      <textarea
                        rows={3}
                        value={companyForm.about}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, about: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Brand / Logo">
                  <div className="admin-v2-form-grid">
                    <label className="admin-v2-form-grid__full">
                      <span>Logo URL</span>
                      <input
                        value={companyForm.logo}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, logo: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Upload logo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedLogoFile(file);
                        }}
                      />
                    </label>
                    <div className="admin-v2-logo-preview">
                      {logoPreviewUrl || companyForm.logo ? (
                        <>
                          <img src={logoPreviewUrl ?? companyForm.logo} alt="Company logo preview" />
                          <button
                            type="button"
                            className="admin-v2-button admin-v2-button--danger admin-v2-logo-preview__remove"
                            onClick={() => {
                              setSelectedLogoFile(null);
                              setLogoPreviewUrl(null);
                              setCompanyForm((current) => ({ ...current, logo: "" }));
                            }}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="admin-v2-logo-preview__fallback">{companyForm.name ? companyForm.name[0] : "?"}</span>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Source & links">
                  <div className="admin-v2-form-grid">
                    <label>
                      <span>Domain</span>
                      <input
                        value={companyForm.companyDomain}
                        onChange={(event) =>
                          setCompanyForm((current) => ({
                            ...current,
                            companyDomain: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Official website</span>
                      <input
                        value={companyForm.website}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, website: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Source URL</span>
                      <input
                        value={companyForm.sourceUrl}
                        onChange={(event) =>
                          setCompanyForm((current) => ({
                            ...current,
                            sourceUrl: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Cover image URL</span>
                      <input
                        value={companyForm.cover}
                        onChange={(event) =>
                          setCompanyForm((current) => ({ ...current, cover: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-v2-form-grid__full">
                      <span>Notes</span>
                      <textarea
                        rows={2}
                        value={companyForm.wikipediaSummary}
                        onChange={(event) =>
                          setCompanyForm((current) => ({
                            ...current,
                            wikipediaSummary: event.target.value
                          }))
                        }
                      />
                    </label>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Status" defaultOpen>
                  <div className="admin-v2-inline-actions">
                    <label className="admin-v2-switch">
                      <input
                        type="checkbox"
                        checked={companyForm.verified}
                        onChange={(event) =>
                          setCompanyForm((current) => ({
                            ...current,
                            verified: event.target.checked
                          }))
                        }
                      />
                      <span>Verified</span>
                    </label>
                    <label className="admin-v2-switch">
                      <input
                        type="checkbox"
                        checked={!companyForm.visible}
                        onChange={(event) =>
                          setCompanyForm((current) => ({
                            ...current,
                            visible: !event.target.checked
                          }))
                        }
                      />
                      <span>Hidden</span>
                    </label>
                    <label className="admin-v2-switch">
                      <input
                        type="checkbox"
                        checked={companyForm.featured}
                        onChange={(event) =>
                          setCompanyForm((current) => ({
                            ...current,
                            featured: event.target.checked
                          }))
                        }
                      />
                      <span>Featured</span>
                    </label>
                  </div>
                </CollapsibleSection>

                <footer className="admin-v2-drawer__actions">
                  <button type="submit" className="admin-v2-button admin-v2-button--primary" disabled={isSavingCompany}>
                    {isSavingCompany ? "Saving…" : "Save company"}
                  </button>
                  <button type="button" className="admin-v2-button" onClick={closeDrawer} disabled={isSavingCompany}>
                    Cancel
                  </button>
                </footer>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
