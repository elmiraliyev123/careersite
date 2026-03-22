import type { Company, Job } from "@/data/platform";
import type { Locale } from "@/lib/i18n";
import { getLocalizedText, getLocalizedTextList } from "@/lib/localized-content";

type LocalizedValue = Partial<Record<Locale, string>>;

export type LocalizedCompany = Omit<Company, "tagline" | "about"> & {
  tagline: string;
  about: string;
};

export type LocalizedJob = Omit<Job, "title" | "summary" | "category" | "tags"> & {
  title: string;
  summary: string;
  category: string;
  tags: string[];
};

const localizedCompanyContent: Record<
  string,
  {
    tagline?: LocalizedValue;
    about?: LocalizedValue;
  }
> = {
  notion: {
    tagline: {
      en: "An early-career hiring flow for product, operations, and data teams."
    },
    about: {
      en: "Notion is a global software company where early-career talent can own real outcomes across product, data, and growth teams."
    }
  },
  figma: {
    tagline: {
      en: "A strong environment for first roles across design, research, and product collaboration."
    },
    about: {
      en: "Figma builds a practical learning culture for young professionals who want to grow in product design, research, and user experience."
    }
  },
  revolut: {
    tagline: {
      en: "A fast-learning setup for fintech, growth, and marketing teams."
    },
    about: {
      en: "Revolut is a global fintech platform where early-career talent works with real performance signals across digital banking and growth."
    }
  },
  shopify: {
    tagline: {
      en: "Practical early-career roles in merchant operations, support, and growth."
    },
    about: {
      en: "Shopify creates structured learning opportunities for young talent in digital commerce, merchant support, and operations."
    }
  },
  wise: {
    tagline: {
      en: "An open door for young talent in financial products, compliance, and data work."
    },
    about: {
      en: "Wise creates structured first-role opportunities for young professionals across international payments and compliance products."
    }
  },
  "kapital-bank": {
    tagline: {
      en: "An active internship flow for youth talent across technology, data, and product teams."
    },
    about: {
      en: "Kapital Bank is one of the more active employers in the local market for practical internships and junior openings across digital product, data, and engineering."
    }
  },
  "kapital-bank-life": {
    tagline: {
      en: "Early-career roles across customer experience and ecosystem teams."
    },
    about: {
      en: "Kapital Bank Life is one of the more agile teams opening intern and analyst roles in customer experience and ecosystem flows."
    }
  },
  "coca-cola-cci": {
    tagline: {
      en: "A summer internship rhythm across marketing, trade, and brand teams."
    },
    about: {
      en: "Coca-Cola CCI builds high-learning teams for students and graduates across marketing, trade marketing, and commercial operations."
    }
  },
  portbim: {
    tagline: {
      en: "Local internship opportunities for engineering and software development."
    },
    about: {
      en: "PortBIM is a local technology team building engineering products and opening real technical experience through intern developer roles."
    }
  },
  "pasha-insurance-world": {
    tagline: {
      en: "Early-career roles in actuarial, risk, and insurance analytics."
    },
    about: {
      en: "PASHA Insurance World offers a more structured development path for graduates and interns across actuarial, risk, and business analysis."
    }
  },
  "baker-hughes": {
    tagline: {
      en: "A global internship track for field engineering and industrial operations."
    },
    about: {
      en: "Baker Hughes is a global energy technology employer opening internship opportunities for the Azerbaijan market across field engineering and service operations."
    }
  }
};

function resolveLocalizedContent(
  locale: Locale,
  baseValue: string,
  translations?: LocalizedValue
) {
  if (locale === "az") {
    return baseValue;
  }

  return translations?.[locale] ?? translations?.en ?? baseValue;
}

export function getLocalizedCompany(company: Company, locale: Locale): LocalizedCompany {
  const localized = localizedCompanyContent[company.slug];

  return {
    ...company,
    tagline: resolveLocalizedContent(locale, company.tagline, localized?.tagline),
    about: resolveLocalizedContent(locale, company.about, localized?.about)
  };
}

export function getLocalizedJob(job: Job, locale: Locale): LocalizedJob {
  return {
    ...job,
    title: getLocalizedText(job.title, locale),
    summary: getLocalizedText(job.summary, locale),
    category: getLocalizedText(job.category, locale),
    tags: getLocalizedTextList(job.tags, locale)
  };
}
