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

    code = code.replace(/await getFeaturedCompanies\(\)\.length/g, '(await getFeaturedCompanies()).length');
    code = code.replace(/await getFeaturedJobs\(\)\.length/g, '(await getFeaturedJobs()).length');
    code = code.replace(/await getCompanies\(\)\.length/g, '(await getCompanies()).length');
    code = code.replace(/await getJobs\(\)\.length/g, '(await getJobs()).length');
    code = code.replace(/await getAllJobs\(\)\.length/g, '(await getAllJobs()).length');
    code = code.replace(/await getAllCompanies\(\)\.length/g, '(await getAllCompanies()).length');
    code = code.replace(/await getCompanyJobs\(.*?\)\.length/g, (match) => {
       return '(' + match.replace('.length', '') + ').length';
    });

    if (code !== originalCode) {
      fs.writeFileSync(filePath, code);
    }
  }
});
