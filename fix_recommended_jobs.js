const fs = require('fs');

const path = './src/lib/platform.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/export function getRecommendedJobs\(/g, `export async function getRecommendedJobs(`);
code = code.replace(/return withPublicDataFallback\(\(\) => \[\], \(\) => \{/g, `return withPublicDataFallback(() => [], async () => {`);
code = code.replace(/const candidateJobs = readPublicJobs\(/g, `const candidateJobs = await readPublicJobs(`);
code = code.replace(/const recommendationJobs = getRecommendedJobs\(/g, `const recommendationJobs = await getRecommendedJobs(`);

fs.writeFileSync(path, code);
