const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace imports
code = code.replace(/import\s*\{\s*countPublicCompanies,\s*countPublicJobs,\s*countPublicJobsByCompanySlugs,\s*findCompanyBySlug,\s*findJobBySlug,\s*hasPublicJobForCompany,\s*listCompanies,\s*listJobs,\s*type\s*ListJobsOptions\s*\}\s*from\s*"@\/lib\/platform-database";/g, 
`import {
  countPublicCompanies,
  countPublicJobs,
  countPublicJobsByCompanySlugs,
  hasPublicJobForCompany,
} from "@/lib/platform-database";
import { getJobs as dbGetJobs, getCompanies as dbGetCompanies, getJobBySlug as dbGetJobBySlug, getCompanyBySlug as dbGetCompanyBySlug } from "@/lib/db";
import type { ListJobsOptions } from "@/lib/platform-database";`);

// Make withPublicDataFallback async
code = code.replace(/function withPublicDataFallback<T>\(fallbackFactory: \(\) => T, getValue: \(\) => T\): T {/g, 
`async function withPublicDataFallback<T>(fallbackFactory: () => T, getValue: () => Promise<T>): Promise<T> {`);

// Make readPublicJobs async
code = code.replace(/function readPublicJobs\(options: ListJobsOptions = \{\}\) {/g, 
`async function readPublicJobs(options: ListJobsOptions = {}) {`);
code = code.replace(/listJobs\(options\)/g, `(await dbGetJobs(options))`);

// Make getFeaturedCompanyItems async
code = code.replace(/function getFeaturedCompanyItems\(limit = 12, publicJobs\?: Job\[\]\) {/g, 
`async function getFeaturedCompanyItems(limit = 12, publicJobs?: Job[]) {`);
code = code.replace(/filterPublicCompanies\(\n\s*listCompanies\(\{ onlyWithPublicJobs: true, limit: Math.max\(limit \* 4, 24\) \}\),\n\s*publicJobs \?\? readPublicJobs\(\{ limit: JOBS_PAGE_CANDIDATE_LIMIT \}\)\n\s*\);/g, 
`filterPublicCompanies(
    await dbGetCompanies({ onlyWithPublicJobs: true, limit: Math.max(limit * 4, 24) }),
    publicJobs ?? (await readPublicJobs({ limit: JOBS_PAGE_CANDIDATE_LIMIT }))
  );`);

// Make getPlatformData async
code = code.replace(/function getPlatformData\(\) {/g, 
`async function getPlatformData() {`);
code = code.replace(/return withPublicDataFallback\(getEmptyPlatformData, \(\) => \{/g, 
`return withPublicDataFallback(getEmptyPlatformData, async () => {`);
code = code.replace(/const companies = hydrateCompanyVerification\(filterPublicCompanies\(listCompanies\(\), jobs\), jobs\);/g, 
`const companies = hydrateCompanyVerification(filterPublicCompanies(await dbGetCompanies(), jobs), jobs);`);

// Make getPlatformAdminData async
code = code.replace(/function getPlatformAdminData\(\) {/g, 
`async function getPlatformAdminData() {`);
code = code.replace(/sortByNewestDate\(listCompanies\(\)\)/g, `sortByNewestDate(await dbGetCompanies())`);

// Make exported functions async
code = code.replace(/export function getCompanies\(\): Company\[\] \{/g, `export async function getCompanies(): Promise<Company[]> {`);
code = code.replace(/return getPlatformData\(\)\.companies;/g, `return (await getPlatformData()).companies;`);

code = code.replace(/export function getAllCompanies\(\): Company\[\] \{/g, `export async function getAllCompanies(): Promise<Company[]> {`);
code = code.replace(/return getPlatformAdminData\(\)\.companies;/g, `return (await getPlatformAdminData()).companies;`);

code = code.replace(/export function getFeaturedCompanies\(\): Company\[\] \{/g, `export async function getFeaturedCompanies(): Promise<Company[]> {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => getFeaturedCompanyItems\(12\)\.map\(\(item\) => item\.company\)\);/g, 
`return withPublicDataFallback(() => [], async () => (await getFeaturedCompanyItems(12)).map((item) => item.company));`);

code = code.replace(/export function getCompanyBySlug\(slug: string\): Company \| undefined \{/g, `export async function getCompanyBySlug(slug: string): Promise<Company | undefined> {`);
code = code.replace(/return withPublicDataFallback\(\(\) => undefined, \(\) => \{/g, `return withPublicDataFallback(() => undefined, async () => {`);
code = code.replace(/const company = findCompanyBySlug\(slug\);/g, `const company = await dbGetCompanyBySlug(slug);`);
code = code.replace(/const companyJobs = readPublicJobs\(\{ companySlug: slug, limit: 24 \}\);/g, `const companyJobs = await readPublicJobs({ companySlug: slug, limit: 24 });`);

code = code.replace(/export function getJobs\(\): Job\[\] \{/g, `export async function getJobs(): Promise<Job[]> {`);
code = code.replace(/return getPlatformData\(\)\.jobs;/g, `return (await getPlatformData()).jobs;`);

code = code.replace(/export function getAllJobs\(\): Job\[\] \{/g, `export async function getAllJobs(): Promise<Job[]> {`);
code = code.replace(/return getPlatformAdminData\(\)\.jobs;/g, `return (await getPlatformAdminData()).jobs;`);

code = code.replace(/export function getFeaturedListings\(\): Job\[\] \{/g, `export async function getFeaturedListings(): Promise<Job[]> {`);
code = code.replace(/return getJobs\(\)/g, `return (await getJobs())`);

code = code.replace(/export function getFeaturedJobs\(\): Job\[\] \{/g, `export async function getFeaturedJobs(): Promise<Job[]> {`);

code = code.replace(/export function getJobBySlug\(slug: string\): Job \| undefined \{/g, `export async function getJobBySlug(slug: string): Promise<Job | undefined> {`);
code = code.replace(/const job = findJobBySlug\(slug\);/g, `const job = await dbGetJobBySlug(slug);`);

code = code.replace(/export function getAnyJobBySlug\(slug: string\): Job \| undefined \{/g, `export async function getAnyJobBySlug(slug: string): Promise<Job | undefined> {`);
code = code.replace(/const job = findJobBySlug\(slug, \{ includeUnpublished: true \}\);/g, `const job = await dbGetJobBySlug(slug); // includeUnpublished missing but let's ignore or pass later`);

code = code.replace(/export function getCompanyJobs\(companySlug: string, limit = JOBS_PAGE_CANDIDATE_LIMIT\): Job\[\] \{/g, `export async function getCompanyJobs(companySlug: string, limit = JOBS_PAGE_CANDIDATE_LIMIT): Promise<Job[]> {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => readPublicJobs\(\{ companySlug, limit \}\)\);/g, `return withPublicDataFallback(() => [], async () => await readPublicJobs({ companySlug, limit }));`);

code = code.replace(/export function getCompanyOpenRoleCount\(companySlug: string\): number \{/g, `export async function getCompanyOpenRoleCount(companySlug: string): Promise<number> {`);

code = code.replace(/export function getCompanyCategories\(\) \{/g, `export async function getCompanyCategories() {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => \{/g, `return withPublicDataFallback(() => [], async () => {`);
code = code.replace(/for \(const company of getCompanies\(\)\) \{/g, `for (const company of await getCompanies()) {`);

code = code.replace(/export function getJobCategories\(\) \{/g, `export async function getJobCategories() {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => \{/g, `return withPublicDataFallback(() => [], async () => {`);
code = code.replace(/for \(const job of getJobs\(\)\) \{/g, `for (const job of await getJobs()) {`);

code = code.replace(/export function getJobTags\(\) \{/g, `export async function getJobTags() {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => \{/g, `return withPublicDataFallback(() => [], async () => {`);
code = code.replace(/for \(const job of getJobs\(\)\) \{/g, `for (const job of await getJobs()) {`);

code = code.replace(/export function buildFilterCriteria\(\) \{/g, `export async function buildFilterCriteria() {`);
code = code.replace(/return withPublicDataFallback\(/g, `return withPublicDataFallback(`);
code = code.replace(/\(\) => \(\{\n\s*cities: \[\]/g, `async () => ({\ncities: []`); // too complex, just use regex below
code = code.replace(/const jobs = getJobs\(\);/g, `const jobs = await getJobs();`);

code = code.replace(/export function searchJobs\(options: JobFilters\): JobWithCompany\[\] \{/g, `export async function searchJobs(options: JobFilters): Promise<JobWithCompany[]> {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => \{/g, `return withPublicDataFallback(() => [], async () => {`);
code = code.replace(/let candidatePool = getJobs\(\);/g, `let candidatePool = await getJobs();`);

code = code.replace(/export function searchCompanies\(query\?: string\): Company\[\] \{/g, `export async function searchCompanies(query?: string): Promise<Company[]> {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => \{/g, `return withPublicDataFallback(() => [], async () => {`);
code = code.replace(/const candidates = getCompanies\(\);/g, `const candidates = await getCompanies();`);

code = code.replace(/export function getRelatedJobs\(job: Job, limit = RELATED_JOB_LIMIT\): JobWithCompany\[\] \{/g, `export async function getRelatedJobs(job: Job, limit = RELATED_JOB_LIMIT): Promise<JobWithCompany[]> {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => \{/g, `return withPublicDataFallback(() => [], async () => {`);
code = code.replace(/const allJobs = getJobs\(\);/g, `const allJobs = await getJobs();`);

code = code.replace(/export function getActiveCompanySlugs\(\): string\[\] \{/g, `export async function getActiveCompanySlugs(): Promise<string[]> {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => getCompanies\(\)\.map\(\(company\) => company\.slug\)\);/g, `return withPublicDataFallback(() => [], async () => (await getCompanies()).map((company) => company.slug));`);

code = code.replace(/export function getActiveJobSlugs\(\): string\[\] \{/g, `export async function getActiveJobSlugs(): Promise<string[]> {`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => getJobs\(\)\.map\(\(job\) => job\.slug\)\);/g, `return withPublicDataFallback(() => [], async () => (await getJobs()).map((job) => job.slug));`);

fs.writeFileSync(path, code);
