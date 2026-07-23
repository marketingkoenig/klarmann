// EINMALIGE MIGRATION: wrappt jedes <img> auf ein lokales assets/img/*.jpg in
// <picture><source type="image/webp">…<img …></picture>. Der Browser nimmt WebP,
// fällt auf JPG zurück, wenn WebP nicht unterstützt wird. Idempotent auf Datei-Ebene:
// Seiten, die bereits ein <source type="image/webp"> enthalten, werden übersprungen.
// Neue Bilder später manuell wrappen (oder diese Datei gezielt erneut laufen lassen).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const files = [
  ...readdirSync(ROOT).filter(f => f.endsWith('.html')),
  ...readdirSync(ROOT + 'en').filter(f => f.endsWith('.html')).map(f => 'en/' + f),
];

// nur wrappen, wenn die passende .webp-Datei wirklich existiert
function webpExists(rel) {
  const clean = rel.replace(/^\//, '');
  return existsSync(ROOT + clean);
}

function wrap(imgTag) {
  const srcM = imgTag.match(/\ssrc="([^"]+\.jpg)"/i);
  if (!srcM) return imgTag;
  const src = srcM[1];
  if (!/assets\/img\//.test(src)) return imgTag;
  const webpSrc = src.replace(/\.jpg$/i, '.webp');
  if (!webpExists(webpSrc)) return imgTag;

  const srcsetM = imgTag.match(/\ssrcset="([^"]+)"/i);
  const sizesM = imgTag.match(/\ssizes="([^"]+)"/i);
  const sourceSrcset = srcsetM
    ? srcsetM[1].replace(/\.jpg(\s|,|$)/gi, '.webp$1')
    : webpSrc;
  const sizesAttr = sizesM ? ` sizes="${sizesM[1]}"` : '';
  return `<picture><source type="image/webp" srcset="${sourceSrcset}"${sizesAttr} />${imgTag}</picture>`;
}

let pages = 0, imgs = 0, skipped = 0;
for (const f of files) {
  let html = readFileSync(ROOT + f, 'utf8');
  if (html.includes('<source type="image/webp"')) { skipped++; continue; }
  let count = 0;
  html = html.replace(/<img\b[^>]*?>/gi, m => {
    const w = wrap(m);
    if (w !== m) count++;
    return w;
  });
  if (count) { writeFileSync(ROOT + f, html, 'utf8'); pages++; imgs += count; }
}
console.log(`✓ migrate-webp: ${imgs} Bilder auf ${pages} Seiten gewrappt (${skipped} bereits erledigt)`);
