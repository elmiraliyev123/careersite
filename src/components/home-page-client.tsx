"use client";

import Link from "next/link";
import {
  ChevronRight,
  Eye,
  MapPin,
  Search,
  Shield,
  Star,
  Users
} from "lucide-react";

import { CompanyLogoImage } from "@/components/company-logo-image";
import { HomeSectionCarousel } from "@/components/home-section-carousel";
import { useI18n } from "@/components/i18n-provider";
import { InlineText } from "@/components/cms/inline-text";
import { InlineList } from "@/components/cms/inline-list";
import { InlineBackground } from "@/components/cms/inline-background";
import { useCms } from "@/components/cms-provider";
import { CompanyNameWithBadge } from "@/components/company-name-with-badge";
import { type Company, jobLevels, type Job, workModels } from "@/data/platform";
import {
  formatLocalizedDate,
  translateCity,
  translateLevel,
  translateSector,
  translateWorkModel
} from "@/lib/i18n";
import { getLocalizedCompany, getLocalizedJob } from "@/lib/platform-localization";
import {
  getDisplaySourceLabel,
  getMeaningfulTaxonomyValue,
  getMeaningfulText,
  getPublicLocationLabel,
  getReadablePublicText,
  isMeaningfulLevel,
  normalizeDisplayTags
} from "@/lib/ui-display";

type HomePageClientProps = {
  stats: {
    totalJobs: number;
    internshipRoles: number;
    traineeRoles: number;
    partnerCompanies: number;
  };
  featuredJobItems: Array<{ job: Job; company: Company }>;
  featuredCompanies: Array<{ company: Company; openRoles: number }>;
  heroCities: string[];
  availableCities: string[];
};

type LocaleCopy = {
  heroEyebrow: string;
  heroTitle: string[];
  heroCopy: string;
  searchPlaceholder: string;
  jobsEyebrow: string;
  jobsTitle: string;
  companiesEyebrow: string;
  companiesTitle: string;
  whyEyebrow: string;
  whyTitle: string;
  featureCards: Array<{ title: string; copy: string }>;
  jobSourceLabel: string;
  deadlineLabel: string;
  companyVacanciesSuffix: string;
  emptyJobs: string;
};

const copyByLocale: Record<"az" | "en" | "ru", LocaleCopy> = {
  az: {
    heroEyebrow: "Vakansiyalar",
    heroTitle: ["Uyğun vakansiyanı", "tap və", "müraciət et"],
    heroCopy:
      "Təcrübə, giriş səviyyəsi və mütəxəssis vakansiyalarını etibarlı mənbələrdən bir yerdə axtar, filtrlə və müqayisə et.",
    searchPlaceholder: "Məsələn: staj, dizayner, analitik",
    jobsEyebrow: "Seçilmiş vakansiyalar",
    jobsTitle: "Gənclər üçün təcrübə elanları",
    companiesEyebrow: "Seçilmiş şirkətlər",
    companiesTitle: "Təsdiqlənmiş işəgötürənlər və seçilmiş komandalar",
    whyEyebrow: "Niyə Stradify",
    whyTitle: "Axtarış daha aydın, seçim daha dəqiq olsun",
    featureCards: [
      {
        title: "Yalnız təsdiqlənmiş elanlar",
        copy: "Hər vakansiya ayrıca yoxlanılır və yalnız etibarlı mənbələrdən gələn linklər aktiv saxlanılır."
      },
      {
        title: "Şəffaf məlumat",
        copy: "İş modeli, kateqoriya, lokasiya və son müraciət tarixi vakansiya kartında açıq göstərilir."
      },
      {
        title: "Azərbaycan bazarına fokus",
        copy: "Yerli işəgötürənlər, regional elan saytları və rəsmi karyera səhifələri eyni axında toplanır."
      },
      {
        title: "Şirkət konteksti",
        copy: "Vakansiyaya keçməzdən əvvəl şirkəti, sahəni və açıq vakansiya sayını görürsən."
      }
    ],
    jobSourceLabel: "Mənbə",
    deadlineLabel: "Son müraciət",
    companyVacanciesSuffix: "aktiv vakansiya",
    emptyJobs: "Bu filtrlərə uyğun vakansiya tapılmadı."
  },
  en: {
    heroEyebrow: "Vacancies",
    heroTitle: ["Filter open roles", "for early-career talent", "and apply with clarity"],
    heroCopy:
      "Use the filters below to see internships, trainee roles, junior openings, and graduate positions in one place.",
    searchPlaceholder: "For example: intern, designer, analyst",
    jobsEyebrow: "Selected roles",
    jobsTitle: "Internship opportunities for young talent",
    companiesEyebrow: "Selected companies",
    companiesTitle: "Verified employers and curated teams",
    whyEyebrow: "Why Stradify",
    whyTitle: "Make search clearer and selection more precise",
    featureCards: [
      {
        title: "Verified listings only",
        copy: "Each vacancy is checked separately and only links from reliable sources remain active."
      },
      {
        title: "Transparent information",
        copy: "Work model, category, location, and deadline are visible directly on the card."
      },
      {
        title: "Focused on Azerbaijan",
        copy: "Local employers, regional job boards, and official career pages are gathered in one stream."
      },
      {
        title: "Better company context",
        copy: "Understand the team, sector, and live opening count before you leave the platform."
      }
    ],
    jobSourceLabel: "Source",
    deadlineLabel: "Deadline",
    companyVacanciesSuffix: "active roles",
    emptyJobs: "There are no matching roles for this view right now."
  },
  ru: {
    heroEyebrow: "Вакансии",
    heroTitle: ["Фильтруй открытые роли", "для молодых специалистов", "и откликайся точнее"],
    heroCopy:
      "Используй фильтры ниже, чтобы видеть стажировки, trainee, junior и роли для выпускников в одном месте.",
    searchPlaceholder: "Например: intern, designer, analyst",
    jobsEyebrow: "Выбранные вакансии",
    jobsTitle: "Стажировки для молодых специалистов",
    companiesEyebrow: "Выбранные компании",
    companiesTitle: "Проверенные работодатели и выбранные команды",
    whyEyebrow: "Почему Stradify",
    whyTitle: "Чтобы поиск был понятнее, а выбор точнее",
    featureCards: [
      {
        title: "Только проверенные вакансии",
        copy: "Каждая вакансия проверяется отдельно, и активными остаются только ссылки из надежных источников."
      },
      {
        title: "Прозрачная информация",
        copy: "Формат работы, категория, локация и дедлайн видны прямо на карточке вакансии."
      },
      {
        title: "Фокус на рынке Азербайджана",
        copy: "Локальные работодатели, региональные job board-платформы и официальные career pages собраны в одном потоке."
      },
      {
        title: "Контекст компании",
        copy: "До перехода наружу проще понять команду, сектор и количество активных вакансий."
      }
    ],
    jobSourceLabel: "Источник",
    deadlineLabel: "Дедлайн",
    companyVacanciesSuffix: "активных вакансий",
    emptyJobs: "Сейчас для этого представления нет подходящих вакансий."
  }
};

export function HomePageClient({
  stats: _stats,
  featuredJobItems,
  featuredCompanies,
  heroCities: _heroCities,
  availableCities
}: HomePageClientProps) {
  const { locale, t } = useI18n();
  const { isEditMode, draftData } = useCms();
  const copy = copyByLocale[locale];
  const heroJobs = featuredJobItems;
  const highlightedCompanies = featuredCompanies.slice(0, 10);

  const cmsCities = draftData?.filters?.cities ?? availableCities;
  const cmsLevels = draftData?.filters?.levels ?? jobLevels;
  const cmsModels = draftData?.filters?.models ?? workModels;
  const filterCities = availableCities;
  const filterLevels = jobLevels;
  const filterModels = workModels;

  return (
    <main className="home-refined">
      <InlineBackground 
        contentKey="home.backgrounds.topImage" 
        as="section" 
        className="home-refined__hero"
        style={{ backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="shell home-refined__shell">
          <InlineText contentKey={`home.${locale}.heroEyebrow`} defaultValue={copy.heroEyebrow} as="p" className="home-refined__eyebrow" />
          <h1 className="home-refined__title">
            <InlineList 
              contentKey={`home.${locale}.heroTitle`} 
              defaultItems={copy.heroTitle}
              containerClassName="home-refined__title-lines-shell"
              listClassName="home-refined__title-lines"
              renderItem={(line, i) => <span key={i}>{line}</span>}
              itemTemplate="Yeni başlıq"
            />
          </h1>
          <InlineText contentKey={`home.${locale}.heroCopy`} defaultValue={copy.heroCopy} as="p" className="home-refined__copy" multiline />
        </div>
      </InlineBackground>

      <section className="home-refined__filters">
        <div className="shell home-refined__shell">
          <form className="home-filter-bar" action="/jobs">
            <label className="home-filter-bar__field home-filter-bar__field--search">
              <span>{t("labels.roleOrSkill")}</span>
              <div className="home-filter-bar__input-wrap">
                <Search size={16} />
                <input name="q" type="text" placeholder={copy.searchPlaceholder} />
              </div>
            </label>

            <label className="home-filter-bar__field">
              <span>{isEditMode ? "Şəhərləri Redaktə Et" : t("labels.city")}</span>
              {isEditMode && (
                <InlineList 
                  contentKey="filters.cities" 
                  defaultItems={availableCities}
                  renderItem={() => null} 
                  itemTemplate="Yeni Şəhər"
                />
              )}
              <select name="city" defaultValue={filterCities[0] ?? "Hamısı"} disabled={isEditMode}>
                {filterCities.map((city: string) => (
                  <option key={city} value={city}>
                    {translateCity(locale, city)}
                  </option>
                ))}
              </select>
            </label>

            <label className="home-filter-bar__field">
              <span>{isEditMode ? "Səviyyələri Redaktə Et" : t("labels.level")}</span>
              {isEditMode && (
                <InlineList 
                  contentKey="filters.levels" 
                  defaultItems={jobLevels}
                  renderItem={() => null} 
                  itemTemplate="Yeni Səviyyə"
                />
              )}
              <select name="level" defaultValue={filterLevels[0]} disabled={isEditMode}>
                {filterLevels.map((level: string) => (
                  <option key={level} value={level}>
                    {translateLevel(locale, level)}
                  </option>
                ))}
              </select>
            </label>

            <label className="home-filter-bar__field">
              <span>{isEditMode ? "İş Modeli Redaktə Et" : t("labels.workModel")}</span>
              {isEditMode && (
                <InlineList 
                  contentKey="filters.models" 
                  defaultItems={workModels}
                  renderItem={() => null} 
                  itemTemplate="Yeni İş Modeli"
                />
              )}
              <select name="workModel" defaultValue={filterModels[0]} disabled={isEditMode}>
                {filterModels.map((model: string) => (
                  <option key={model} value={model}>
                    {translateWorkModel(locale, model)}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="home-filter-bar__submit">
              {t("actions.filter")}
            </button>
          </form>
        </div>
      </section>

      <section className="home-refined__section">
        <div className="shell home-refined__shell">
          <div className="home-refined__heading">
            <InlineText contentKey={`home.${locale}.jobsEyebrow`} defaultValue={copy.jobsEyebrow} as="p" className="home-refined__eyebrow" />
            <InlineText contentKey={`home.${locale}.jobsTitle`} defaultValue={copy.jobsTitle} as="h2" />
          </div>

          {heroJobs.length > 0 ? (
            <HomeSectionCarousel
              ariaLabel={copy.jobsTitle}
              viewportClassName="home-section-carousel__viewport--jobs"
              slides={heroJobs.map(({ job, company }) => {
                const localizedJob = getLocalizedJob(job, locale);
                const localizedCompany = getLocalizedCompany(company, locale);
                const levelLabel = isMeaningfulLevel(job.level) ? translateLevel(locale, localizedJob.level) : null;
                const workModelLabel = getMeaningfulText(translateWorkModel(locale, localizedJob.workModel));
                const roleTags = [levelLabel, workModelLabel].filter(
                  (value): value is string => Boolean(value)
                );
                const visibleTags = normalizeDisplayTags(roleTags, locale).slice(0, 3);
                const companySector = getMeaningfulTaxonomyValue(localizedCompany.sector);
                const summary = getReadablePublicText(localizedJob.summary);
                const cityLabel = getPublicLocationLabel(translateCity(locale, localizedJob.city));
                const categoryLabel = getMeaningfulTaxonomyValue(localizedJob.category);
                const sourceLabel = getDisplaySourceLabel(job);
                const deadlineLabel = getMeaningfulText(formatLocalizedDate(localizedJob.deadline, locale));

                return {
                  key: job.slug,
                  content: (
                    <Link href={`/jobs/${job.slug}`} className="home-job-card">
                      {visibleTags.length > 0 ? (
                        <div className="home-job-card__tags">
                          {visibleTags.map((tag, index) => (
                            <span
                              key={`${job.slug}-${tag}`}
                              className={`home-job-card__tag${index === 0 ? " home-job-card__tag--accent" : ""}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="home-job-card__company-row">
                        <span className="home-job-card__company-brand">
                          <span className="home-job-card__company-logo">
                            <CompanyLogoImage
                              name={localizedCompany.name}
                              website={company.website}
                              logo={company.logo}
                              size={30}
                              className="home-job-card__company-logo-image"
                            />
                          </span>
                          <CompanyNameWithBadge
                            name={localizedCompany.name}
                            verified={localizedCompany.verified}
                            badgeLabel={t("labels.verifiedCompany")}
                            compact
                            nameClassName="home-job-card__company-name"
                          />
                        </span>
                      </div>

                      {companySector ? (
                        <p className="home-job-card__department">
                          {translateSector(locale, companySector)}
                        </p>
                      ) : null}
                      <h3>{localizedJob.title}</h3>
                      {summary ? <p className="home-job-card__summary">{summary}</p> : null}

                      <div className="home-job-card__meta">
                        {cityLabel ? (
                          <span>
                            <MapPin size={13} />
                            {cityLabel}
                          </span>
                        ) : null}
                        {categoryLabel ? <span>{categoryLabel}</span> : null}
                        {sourceLabel ? <span>{copy.jobSourceLabel}: {sourceLabel}</span> : null}
                        {deadlineLabel ? <span>{copy.deadlineLabel}: {deadlineLabel}</span> : null}
                      </div>
                    </Link>
                  )
                };
              })}
            />
          ) : (
            <div className="home-refined__empty">{copy.emptyJobs}</div>
          )}
        </div>
      </section>

      <section className="home-refined__section">
        <div className="shell home-refined__shell">
          <div className="home-refined__heading">
            <InlineText contentKey={`home.${locale}.companiesEyebrow`} defaultValue={copy.companiesEyebrow} as="p" className="home-refined__eyebrow" />
            <InlineText contentKey={`home.${locale}.companiesTitle`} defaultValue={copy.companiesTitle} as="h2" />
          </div>

          <HomeSectionCarousel
            ariaLabel={copy.companiesTitle}
            viewportClassName="home-section-carousel__viewport--companies"
            slides={highlightedCompanies.map(({ company, openRoles }) => {
              const localizedCompany = getLocalizedCompany(company, locale);
              const companySector = getMeaningfulTaxonomyValue(localizedCompany.sector);

              return {
                key: company.slug,
                content: (
                  <Link href={`/companies/${company.slug}`} className="home-company-card">
                    <div className="home-company-card__top">
                      <span className="home-company-card__logo">
                        <CompanyLogoImage
                          name={localizedCompany.name}
                          website={localizedCompany.website}
                          logo={localizedCompany.logo}
                          size={32}
                          className="home-company-card__logo-image"
                        />
                      </span>
                      <div className="home-company-card__name-wrap">
                        <CompanyNameWithBadge
                          name={localizedCompany.name}
                          verified={localizedCompany.verified}
                          badgeLabel={t("labels.verifiedCompany")}
                          compact
                          className="home-company-card__name-wrap"
                          nameClassName="home-company-card__name"
                        />
                      </div>
                    </div>

                    {companySector ? (
                      <p className="home-company-card__sector">
                        {translateSector(locale, companySector)}
                      </p>
                    ) : null}
                    <p className={`home-company-card__roles${openRoles > 0 ? " home-company-card__roles--active" : ""}`}>
                      {openRoles} {copy.companyVacanciesSuffix}
                    </p>
                  </Link>
                )
              };
            })}
          />
        </div>
      </section>

      <InlineBackground 
        contentKey="home.backgrounds.bottomImage" 
        as="section" 
        className="home-refined__section home-refined__section--last"
        style={{ backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="shell home-refined__shell">
          <div className="home-refined__heading">
            <InlineText contentKey={`home.${locale}.whyEyebrow`} defaultValue={copy.whyEyebrow} as="p" className="home-refined__eyebrow" />
            <InlineText contentKey={`home.${locale}.whyTitle`} defaultValue={copy.whyTitle} as="h2" />
          </div>

          <div className="home-feature-grid">
            {[Shield, Eye, Users, Star].map((Icon, index) => (
              <article key={index} className="home-feature-card">
                <span className="home-feature-card__icon">
                  <Icon size={16} />
                </span>
                <div>
                  <InlineText contentKey={`home.${locale}.featureCards.${index}.title`} defaultValue={copy.featureCards[index].title} as="h3" />
                  <InlineText contentKey={`home.${locale}.featureCards.${index}.copy`} defaultValue={copy.featureCards[index].copy} as="p" multiline />
                </div>
                <ChevronRight size={16} className="home-feature-card__arrow" />
              </article>
            ))}
          </div>
        </div>
      </InlineBackground>
    </main>
  );
}
