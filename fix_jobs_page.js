const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/export function getJobsPageData\(/g, `export async function getJobsPageData(`);
code = code.replace(/const filteredJobs = filterJobs\(/g, `const filteredJobs = await filterJobs(`);

fs.writeFileSync(path, code);

const path2 = './src/app/jobs/page.tsx';
if (fs.existsSync(path2)) {
  let code2 = fs.readFileSync(path2, 'utf8');
  code2 = code2.replace(/const \{ jobItems, availableCities, featuredEmployers, newestInternships \} = getJobsPageData/g, `const { jobItems, availableCities, featuredEmployers, newestInternships } = await getJobsPageData`);
  fs.writeFileSync(path2, code2);
}

