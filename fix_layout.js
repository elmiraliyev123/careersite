const fs = require('fs');

const path = './src/app/layout.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/const companyCategories = getCompanyCategories\(\);/g, `const companyCategories = await getCompanyCategories();`);
  fs.writeFileSync(path, code);
}
