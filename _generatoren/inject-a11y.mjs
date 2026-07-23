// Barrierefreiheits-Markup idempotent in alle Seiten einfügen (BFSG/WCAG 2.1 AA):
//  - Skip-Link direkt nach <body> (WCAG 2.4.1)
//  - <main> als Fokus-Ziel (id="main" tabindex="-1")
//  - Dropdown-Trigger: aria-haspopup + aria-expanded (JS hält den Zustand synchron)
//  - Hamburger-Button: aria-controls + aria-expanded
//  - Overlay-Menü #side-nav: startet mit inert (raus aus Tab-Reihenfolge, bis geöffnet)
// Nach jeder Seitenänderung erneut ausführen — greift nur, wo noch nicht vorhanden.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const files = [
  ...readdirSync(ROOT).filter(f => f.endsWith('.html')),
  ...readdirSync(ROOT + 'en').filter(f => f.endsWith('.html')).map(f => 'en/' + f),
];

let n = 0;
for (const f of files) {
  let html = readFileSync(ROOT + f, 'utf8');
  const en = html.includes('<html lang="en"');
  const before = html;

  // 1) Skip-Link nach dem <body>-Tag
  if (!html.includes('class="skip-link"')) {
    const text = en ? 'Skip to main content' : 'Zum Inhalt springen';
    html = html.replace(/(<body[^>]*>)/, `$1\n  <a class="skip-link" href="#main">${text}</a>`);
  }

  // 2) <main> als Fokus-Ziel des Skip-Links
  if (!/<main[^>]*id="main"/.test(html)) {
    html = html.replace(/<main class="flex-1/, '<main id="main" tabindex="-1" class="flex-1');
  }

  // 3) Dropdown-Trigger (nur die zwei mit data-nav leistungen/branchen im Desktop-Menü)
  html = html.replace(
    /(<a class="nav-link[^"]*" href="[^"]*" data-nav="(?:leistungen|branchen)")>/g,
    '$1 aria-haspopup="true" aria-expanded="false">'
  );

  // 4) Hamburger-Button
  html = html.replace(
    /(data-icon="menu" aria-label="[^"]*")>/,
    '$1 aria-controls="side-nav" aria-expanded="false">'
  );

  // 5) Overlay-Menü startet geschlossen = inert
  html = html.replace(/ id="side-nav">/, ' id="side-nav" inert>');

  if (html !== before) { writeFileSync(ROOT + f, html, 'utf8'); n++; }
}
console.log('✓ inject-a11y:', n, 'von', files.length, 'Seiten aktualisiert');
