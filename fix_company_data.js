const fs = require('fs');

const path1 = './src/app/companies/[slug]/page.tsx';
let code1 = fs.readFileSync(path1, 'utf8');

code1 = code1.replace(/import \{ findCompanyBySlug \} from "@\/lib\/platform-database";/g, `import { getCompanyBySlug } from "@/lib/db";`);
code1 = code1.replace(/const company = findCompanyBySlug\(slug\);/g, `const company = await getCompanyBySlug(slug);`);
code1 = code1.replace(/const data = getCompanyDetailPageData\(slug\);/g, `const data = await getCompanyDetailPageData(slug);`);

fs.writeFileSync(path1, code1);

const path2 = './src/lib/platform.ts';
let code2 = fs.readFileSync(path2, 'utf8');
code2 = code2.replace(/export function getCompanyDetailPageData\(slug: string\) \{/g, `export async function getCompanyDetailPageData(slug: string) {`);
code2 = code2.replace(/return withPublicDataFallback\(\(\) => undefined, \(\) => \{/g, `return withPublicDataFallback(() => undefined, async () => {`);
code2 = code2.replace(/const company = getCompanyBySlug\(slug\);/g, `const company = await getCompanyBySlug(slug);`);
code2 = code2.replace(/const jobs = getCompanyJobs\(slug\);/g, `const jobs = await getCompanyJobs(slug);`);
code2 = code2.replace(/const openRoleCount = getCompanyOpenRoleCount\(slug\);/g, `const openRoleCount = await getCompanyOpenRoleCount(slug);`);

fs.writeFileSync(path2, code2);
