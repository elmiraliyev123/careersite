const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('./src/app/api', (filePath) => {
  if (filePath.endsWith('.ts')) {
    let code = fs.readFileSync(filePath, 'utf8');
    let originalCode = code;

    code = code.replace(/import \{(.*?)\} from "@\/lib\/platform-database"/g, (match, p1) => {
      let parts = p1.split(',').map(s => s.trim());
      let dbImports = [];
      let dbMethods = ['createJob', 'updateJob', 'createCompany', 'updateCompany', 'saveScrapedJobs', 'saveAiEnrichment'];
      
      let newParts = parts.filter(p => {
        if (dbMethods.includes(p)) {
          dbImports.push(p);
          return false;
        }
        return true;
      });
      
      let res = '';
      if (newParts.length > 0) {
        res += `import { ${newParts.join(', ')} } from "@/lib/platform-database";\n`;
      }
      if (dbImports.length > 0) {
        res += `import { ${dbImports.join(', ')} } from "@/lib/db";\n`;
      }
      return res.trim();
    });
    
    // add await to createJob, updateJob, createCompany, updateCompany
    code = code.replace(/createCompany\(/g, 'await createCompany(');
    code = code.replace(/updateCompany\(/g, 'await updateCompany(');
    code = code.replace(/createJob\(/g, 'await createJob(');
    code = code.replace(/updateJob\(/g, 'await updateJob(');

    // Fix double awaits
    code = code.replace(/await await/g, 'await');
    
    if (code !== originalCode) {
      fs.writeFileSync(filePath, code);
    }
  }
});
