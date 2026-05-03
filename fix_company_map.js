const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/function getCompanyMapForJobs\(/g, `async function getCompanyMapForJobs(`);
code = code.replace(/const company = findCompanyBySlug\(companySlug\);/g, `const company = await dbGetCompanyBySlug(companySlug);`);

// Callers of getCompanyMapForJobs
code = code.replace(/const companyMap = getCompanyMapForJobs\(jobs\);/g, `const companyMap = await getCompanyMapForJobs(jobs);`);
code = code.replace(/const companiesBySlug = getCompanyMapForJobs\(candidateJobs\);/g, `const companiesBySlug = await getCompanyMapForJobs(candidateJobs);`);
code = code.replace(/const companiesBySlug = getCompanyMapForJobs\(allJobs\);/g, `const companiesBySlug = await getCompanyMapForJobs(allJobs);`);
code = code.replace(/const statsCompaniesBySlug = getCompanyMapForJobs\(statsJobs\);/g, `const statsCompaniesBySlug = await getCompanyMapForJobs(statsJobs);`);
code = code.replace(/const cityCompaniesBySlug = getCompanyMapForJobs\(cityJobs\);/g, `const cityCompaniesBySlug = await getCompanyMapForJobs(cityJobs);`);

// toJobItems needs to be async
code = code.replace(/function toJobItems\(jobs: Job\[\]\): JobWithCompany\[\] \{/g, `async function toJobItems(jobs: Job[]): Promise<JobWithCompany[]> {`);
code = code.replace(/const items = toJobItems\(candidateJobs\.slice\(0, Math\.max\(6, Math\.floor\(requestedLimit \/ 2\)\)\)\);/g, `const items = await toJobItems(candidateJobs.slice(0, Math.max(6, Math.floor(requestedLimit / 2))));`);
code = code.replace(/const jobItems = toJobItems\(filteredJobs\.slice\(0, 250\)\);/g, `const jobItems = await toJobItems(filteredJobs.slice(0, 250));`);
code = code.replace(/recommendations: toJobItems\(recommendationJobs\)/g, `recommendations: await toJobItems(recommendationJobs)`);
code = code.replace(/featuredJobItems: toJobItems\(await getFeaturedListings\(\)\)/g, `featuredJobItems: await toJobItems(await getFeaturedListings())`);

// getEmptyHomePageData isn't using toJobItems? Let's check
code = code.replace(/newestInternships: toJobItems\(/g, `newestInternships: await toJobItems(`);


fs.writeFileSync(path, code);
