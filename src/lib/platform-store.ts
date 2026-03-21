import fs from "node:fs";
import path from "node:path";

import type { Company, Job } from "@/data/platform";

type PlatformStore = {
  companies: Company[];
  jobs: Job[];
};

type CreateCompanyInput = Omit<Company, "slug">;
type CreateJobInput = Omit<Job, "slug" | "featured">;

const storePath = path.join(process.cwd(), "data", "platform-store.json");

const emptyStore: PlatformStore = {
  companies: [],
  jobs: []
};

function ensureStore() {
  const directory = path.dirname(storePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(emptyStore, null, 2));
  }
}

export function readPlatformStore(): PlatformStore {
  ensureStore();

  try {
    const value = fs.readFileSync(storePath, "utf8");
    const parsed = JSON.parse(value) as Partial<PlatformStore>;

    return {
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : []
    };
  } catch {
    return emptyStore;
  }
}

function writePlatformStore(store: PlatformStore) {
  ensureStore();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

export function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function nextUniqueSlug(baseValue: string, existingSlugs: string[]) {
  const baseSlug = createSlug(baseValue) || "item";

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let attempt = 2;

  while (existingSlugs.includes(`${baseSlug}-${attempt}`)) {
    attempt += 1;
  }

  return `${baseSlug}-${attempt}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function addCompany(input: CreateCompanyInput, existingCompanies: Company[]) {
  const store = readPlatformStore();
  const slug = nextUniqueSlug(input.name, existingCompanies.map((company) => company.slug));

  const company: Company = {
    ...input,
    slug,
    createdAt: input.createdAt ?? todayIsoDate()
  };

  store.companies = [company, ...store.companies];
  writePlatformStore(store);

  return company;
}

export function addJob(input: CreateJobInput, existingJobs: Job[], companyIsFeatured: boolean) {
  const store = readPlatformStore();
  const { salary: _salary, ...jobInput } = input;
  const slug = nextUniqueSlug(
    `${jobInput.title}-${jobInput.companySlug}`,
    existingJobs.map((job) => job.slug)
  );

  const job: Job = {
    ...jobInput,
    slug,
    featured: companyIsFeatured,
    createdAt: jobInput.createdAt ?? todayIsoDate()
  };

  store.jobs = [job, ...store.jobs];
  writePlatformStore(store);

  return job;
}
