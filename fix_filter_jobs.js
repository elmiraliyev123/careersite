const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/export function filterJobs\(/g, `export async function filterJobs(`);

fs.writeFileSync(path, code);

const path2 = './src/app/api/jobs/route.ts';
if (fs.existsSync(path2)) {
  let code2 = fs.readFileSync(path2, 'utf8');
  code2 = code2.replace(/const filtered = filterJobs/g, `const filtered = await filterJobs`);
  fs.writeFileSync(path2, code2);
}

const path3 = './src/app/vacancies/page.tsx';
if (fs.existsSync(path3)) {
  let code3 = fs.readFileSync(path3, 'utf8');
  code3 = code3.replace(/const filteredJobs = filterJobs/g, `const filteredJobs = await filterJobs`);
  fs.writeFileSync(path3, code3);
}

