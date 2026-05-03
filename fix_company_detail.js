const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/jobs: getCompanyJobs\(company\.slug, COMPANY_DETAIL_JOB_LIMIT\)/g, `jobs: await getCompanyJobs(company.slug, COMPANY_DETAIL_JOB_LIMIT)`);
code = code.replace(/openRoleCount: getCompanyOpenRoleCount\(company\.slug\)/g, `openRoleCount: await getCompanyOpenRoleCount(company.slug)`);

// Also fix getCompaniesPageData since it has export function
code = code.replace(/export function getCompaniesPageData/g, `export async function getCompaniesPageData`);
code = code.replace(/const companies = filterCompaniesByCategory\(/g, `const companies = filterCompaniesByCategory(`); // Just a placeholder check

fs.writeFileSync(path, code);

const appPath = './src/app/companies/page.tsx';
if (fs.existsSync(appPath)) {
  let appCode = fs.readFileSync(appPath, 'utf8');
  appCode = appCode.replace(/getCompaniesPageData\(/g, 'await getCompaniesPageData(');
  fs.writeFileSync(appPath, appCode);
}

