// Hängt an die veränderlichen CSS/JS-Referenzen eine Versions-Query (?v=…), damit
// Änderungen bei wiederkehrenden Besuchern SOFORT ankommen (statt bis zu 1 h / bei
// /assets/** sogar 1 Jahr im Browser-Cache zu hängen). Die Version leitet sich aus
// der jüngsten Änderungszeit der Quell-Dateien ab — ändert sich automatisch, sobald
// eine davon angefasst wird. IMMER als LETZTER Schritt vor dem Deploy ausführen
// (nach CSS/JS-Änderungen + `npm run css`).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const ASSETS = ['style.css', 'assets/tailwind.css', 'script.js', 'consent.js', 'karriere.js'];

// Version = jüngste mtime der veränderlichen Dateien, base36-kodiert
const version = Math.max(...ASSETS.map(a => {
  try { return Math.floor(statSync(ROOT + a).mtimeMs); } catch { return 0; }
})).toString(36);

const files = [
  ...readdirSync(ROOT).filter(f => f.endsWith('.html')),
  ...readdirSync(ROOT + 'en').filter(f => f.endsWith('.html')).map(f => 'en/' + f),
];

let n = 0;
for (const f of files) {
  let html = readFileSync(ROOT + f, 'utf8');
  const before = html;
  for (const a of ASSETS) {
    for (const path of [a, '/' + a]) {                    // relativ (DE) + absolut (EN)
      const esc = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(
        new RegExp(`((?:href|src)="${esc})(?:\\?v=[^"]*)?"`, 'g'),
        `$1?v=${version}"`
      );
    }
  }
  if (html !== before) { writeFileSync(ROOT + f, html, 'utf8'); n++; }
}
console.log(`✓ cache-bust: v=${version} auf ${n} Seiten`);
