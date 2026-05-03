const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/export function getHomePageData\(\) \{/g, `export async function getHomePageData() {`);
code = code.replace(/return withPublicDataFallback\(\(\) => getEmptyHomePageData\(\), \(\) => \{/g, `return withPublicDataFallback(() => getEmptyHomePageData(), async () => {`);
code = code.replace(/const allJobs = getJobs\(\);/g, `const allJobs = await getJobs();`);
code = code.replace(/const allCompanies = getCompanies\(\);/g, `const allCompanies = await getCompanies();`);
code = code.replace(/const featuredCompanies = getFeaturedCompanyItems\(\);/g, `const featuredCompanies = await getFeaturedCompanyItems();`);

fs.writeFileSync(path, code);

const appPath = './src/app/page.tsx';
if (fs.existsSync(appPath)) {
  let appCode = fs.readFileSync(appPath, 'utf8');
  appCode = appCode.replace(/const \{ stats, featuredJobItems, featuredCompanies, heroCities, availableCities \} = getHomePageData\(\);/g, `const { stats, featuredJobItems, featuredCompanies, heroCities, availableCities } = await getHomePageData();`);
  fs.writeFileSync(appPath, appCode);
}
