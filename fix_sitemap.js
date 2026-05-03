const fs = require('fs');

const path = './src/app/sitemap.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/await getJobs\(\)\.map/g, `(await getJobs()).map`);
code = code.replace(/await getCompanies\(\)\.map/g, `(await getCompanies()).map`);

fs.writeFileSync(path, code);
