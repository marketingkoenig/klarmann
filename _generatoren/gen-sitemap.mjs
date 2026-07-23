// Erzeugt sitemap.xml über beide Sprachversionen (DE Root + /en/) und robots.txt.
// noindex-Seiten (Rechtsseiten-Platzhalter) und 404 bleiben draußen.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { DOMAIN, MAP } from './lang-map.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const heute = new Date().toISOString().slice(0, 10);
const urls = [];

function add(file, url, prio) {
  if (!existsSync(file)) return;
  const html = readFileSync(file, 'utf8');
  if (html.includes('name="robots" content="noindex"')) return;
  urls.push({ url, prio });
}

const prioDe = s => s === 'index' ? '1.0' : (s === 'karriere' || s === 'leistungen') ? '0.9' : '0.7';
const prioEn = s => s === 'index' ? '0.8' : (s === 'karriere' || s === 'leistungen') ? '0.7' : '0.6';

for (const [deSlug, enSlug] of Object.entries(MAP)) {
  add(ROOT + deSlug + '.html', deSlug === 'index' ? DOMAIN + '/' : DOMAIN + '/' + deSlug, prioDe(deSlug));
  add(ROOT + 'en/' + enSlug + '.html', enSlug === 'index' ? DOMAIN + '/en/' : DOMAIN + '/en/' + enSlug, prioEn(deSlug));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.sort((a, b) => a.url.localeCompare(b.url)).map(u => `  <url><loc>${u.url}</loc><lastmod>${heute}</lastmod><priority>${u.prio}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(ROOT + 'sitemap.xml', sitemap, 'utf8');
console.log('✓ sitemap.xml —', urls.length, 'URLs (DE + EN)');

writeFileSync(ROOT + 'robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`, 'utf8');
console.log('✓ robots.txt');
