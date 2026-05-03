const fs = require('fs');

const robotsPath = './src/app/robots.ts';
if (fs.existsSync(robotsPath)) {
  let code = fs.readFileSync(robotsPath, 'utf8');
  code = code.replace(/export default async function robots\(\): MetadataRoute\.Robots \{/g, `export default async function robots(): Promise<MetadataRoute.Robots> {`);
  fs.writeFileSync(robotsPath, code);
}

const sitemapPath = './src/app/sitemap.ts';
if (fs.existsSync(sitemapPath)) {
  let code = fs.readFileSync(sitemapPath, 'utf8');
  code = code.replace(/export default async function sitemap\(\): MetadataRoute\.Sitemap \{/g, `export default async function sitemap(): Promise<MetadataRoute.Sitemap> {`);
  fs.writeFileSync(sitemapPath, code);
}
