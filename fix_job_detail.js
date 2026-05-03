const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/export function getJobDetailPageData\(slug: string\) \{/g, `export async function getJobDetailPageData(slug: string) {`);
code = code.replace(/const job = getAnyJobBySlug\(slug\);/g, `const job = await getAnyJobBySlug(slug);`);
code = code.replace(/const company = getCompanyBySlug\(job\.companySlug\);/g, `const company = await getCompanyBySlug(job.companySlug);`);
code = code.replace(/const recommendations = getRelatedJobs\(job\);/g, `const recommendations = await getRelatedJobs(job);`);

fs.writeFileSync(path, code);

const appPath = './src/app/jobs/[slug]/page.tsx';
if (fs.existsSync(appPath)) {
  let appCode = fs.readFileSync(appPath, 'utf8');
  appCode = appCode.replace(/const data = getJobDetailPageData/g, 'const data = await getJobDetailPageData');
  fs.writeFileSync(appPath, appCode);
}

