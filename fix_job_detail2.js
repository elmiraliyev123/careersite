const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/const job = getJobBySlug\(slug\);/g, `const job = await getJobBySlug(slug);`);
code = code.replace(/const company = getCompanyBySlug\(job\.companySlug\) \?\? null;/g, `const company = (await getCompanyBySlug(job.companySlug)) ?? null;`);

fs.writeFileSync(path, code);
