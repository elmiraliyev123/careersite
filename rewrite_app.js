const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('./src/app', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let code = fs.readFileSync(filePath, 'utf8');
    let originalCode = code;

    code = code.replace(/getCompanies\(\)/g, 'await getCompanies()');
    code = code.replace(/getAllCompanies\(\)/g, 'await getAllCompanies()');
    code = code.replace(/getJobs\(\)/g, 'await getJobs()');
    code = code.replace(/getAllJobs\(\)/g, 'await getAllJobs()');
    code = code.replace(/getCompanyBySlug\((.*?)\)/g, 'await getCompanyBySlug($1)');
    code = code.replace(/getJobBySlug\((.*?)\)/g, 'await getJobBySlug($1)');
    code = code.replace(/getFeaturedJobs\(\)/g, 'await getFeaturedJobs()');
    code = code.replace(/getFeaturedCompanies\(\)/g, 'await getFeaturedCompanies()');
    code = code.replace(/getCompanyJobs\((.*?)\)/g, 'await getCompanyJobs($1)');
    code = code.replace(/getRelatedJobs\((.*?)\)/g, 'await getRelatedJobs($1)');
    code = code.replace(/getActiveCompanySlugs\(\)/g, 'await getActiveCompanySlugs()');
    code = code.replace(/getActiveJobSlugs\(\)/g, 'await getActiveJobSlugs()');
    code = code.replace(/buildFilterCriteria\(\)/g, 'await buildFilterCriteria()');
    code = code.replace(/searchJobs\((.*?)\)/g, 'await searchJobs($1)');
    code = code.replace(/searchCompanies\((.*?)\)/g, 'await searchCompanies($1)');
    
    // Fix double awaits
    code = code.replace(/await await/g, 'await');
    
    // Convert GET to async if it's not already
    code = code.replace(/export function GET\(/g, 'export async function GET(');
    code = code.replace(/export default function/g, 'export default async function');
    code = code.replace(/export function generateStaticParams/g, 'export async function generateStaticParams');
    code = code.replace(/export function generateMetadata/g, 'export async function generateMetadata');
    code = code.replace(/export function sitemap/g, 'export async function sitemap');
    
    if (code !== originalCode) {
      fs.writeFileSync(filePath, code);
    }
  }
});
