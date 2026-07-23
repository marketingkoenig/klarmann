// Hängt an die veränderlichen CSS/JS-Referenzen eine Versions-Query (?v=…), damit
// Änderungen bei wiederkehrenden Besuchern SOFORT ankommen (statt bis zu 1 h / bei
// /assets/** sogar 1 Jahr im Browser-Cache zu hängen). Die Version ist ein Hash aus
// dem INHALT der Quell-Dateien — gleiche Inhalte ergeben dieselbe Version (egal wann
// oder wo gebaut), nur echte Datei-Änderungen erzeugen eine neue. Das ist wichtig für
// die Cloud-Automatik: ein frischer Checkout (neue Zeitstempel) darf NICHT jedes Mal
// eine neue Version und damit einen unnötigen Deploy auslösen. IMMER als LETZTER
// Schritt vor dem Deploy ausführen (nach CSS/JS-Änderungen + `npm run css`).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = new URL('..', import.meta.url).pathname;
const ASSETS = ['style.css', 'assets/tailwind.css', 'script.js', 'consent.js', 'karriere.js'];

// Version = Inhalts-Hash der veränderlichen Dateien (deterministisch, checkout-unabhängig)
const hash = createHash('sha1');
for (const a of ASSETS) {
  try { hash.update(readFileSync(ROOT + a)); } catch { /* Datei optional */ }
}
const version = hash.digest('hex').slice(0, 10);

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
