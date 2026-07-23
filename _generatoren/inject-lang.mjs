// Verknüpft DE- und EN-Seiten: hreflang-Links (de/en/x-default) und aktiver
// Sprachumschalter in der Navigation — auf Basis von lang-map.mjs. Idempotent:
// kann nach jeder Seitenänderung erneut laufen.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { MAP, deUrl, enUrl } from './lang-map.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
let patched = 0;

function setHreflang(html, deSlug) {
  // Alte hreflang-Zeilen entfernen, dann frisch vor </head> einsetzen
  html = html.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*"[^>]*\/>\n?/g, '');
  const block = `  <link rel="alternate" hreflang="de" href="${deUrl(deSlug)}" />\n`
    + `  <link rel="alternate" hreflang="en" href="${enUrl(deSlug)}" />\n`
    + `  <link rel="alternate" hreflang="x-default" href="${deUrl(deSlug)}" />\n`;
  return html.replace('</head>', block + '</head>');
}

// Sichtbarer DE/EN-Umschalter direkt in der mobilen Kopfzeile — neben dem
// Hamburger-Button, immer sichtbar (kein Scrollen ins Menü nötig). Idempotent:
// entfernt frühere Menü-Umschalter/Text-Varianten und einen bestehenden Header-
// Wrapper, bevor frisch gebaut wird.
function injectHeaderToggle(html, isEN, enHref, deHref) {
  // Alt-Varianten aus dem Overlay-Menü entfernen (früherer Pill-Toggle + Textzeile)
  html = html.replace(/\n?[ \t]*<div class="lang-toggle-mobile[\s\S]*?<\/div>/, '');
  html = html.replace(/\n?[ \t]*<div class="mt-6 font-label text-xs uppercase tracking-\[0\.2em\] text-zinc-500">\s*<a[^>]*hreflang="de"[\s\S]*?<\/div>/, '');

  // Hamburger-Button extrahieren (matcht standalone ODER bereits im Wrapper)
  const btnMatch = html.match(/<button class="xl:hidden flex items-center gap-3 group hover:opacity-60 transition-opacity" data-icon="menu"[\s\S]*?<\/button>/);
  if (!btnMatch) return html;
  const btn = btnMatch[0];
  // bestehenden Header-Wrapper (Re-Run) auf den nackten Button zurückführen
  html = html.replace(/[ \t]*<div class="mobile-nav-controls[\s\S]*?<\/button>\s*<\/div>/, '      ' + btn);

  const label = isEN ? 'Language' : 'Sprache';
  const pills = isEN
    ? `<a class="lm-pill" href="${deHref}" hreflang="de">DE</a>\n            <span class="lm-pill lm-pill--active" aria-current="true">EN</span>`
    : `<span class="lm-pill lm-pill--active" aria-current="true">DE</span>\n            <a class="lm-pill" href="${enHref}" hreflang="en">EN</a>`;
  const wrapper = `<div class="mobile-nav-controls xl:hidden flex items-center gap-3 sm:gap-4">\n`
    + `          <span class="lm-switch flex items-center gap-1.5" aria-label="${label}">\n`
    + `            ${pills}\n`
    + `          </span>\n`
    + `          ${btn}\n`
    + `        </div>`;
  return html.replace(btn, wrapper);
}

for (const [deSlug, enSlug] of Object.entries(MAP)) {
  const dePath = ROOT + deSlug + '.html';
  const enPath = ROOT + 'en/' + enSlug + '.html';

  // ---------- DE-Seite ----------
  if (existsSync(dePath)) {
    let html = readFileSync(dePath, 'utf8');
    const enHref = enSlug === 'index' ? '/en/' : '/en/' + enSlug;
    // Platzhalter-Span ("folgt in Kürze") → aktiver Link; bestehende Links aktualisieren
    html = html.replace(
      /<span class="lang-soon"[^>]*>EN<\/span>/,
      `<a class="lang-link" href="${enHref}" hreflang="en" title="English version">EN</a>`
    );
    html = html.replace(
      /<a class="lang-link" href="[^"]*" hreflang="en"[^>]*>EN<\/a>/,
      `<a class="lang-link" href="${enHref}" hreflang="en" title="English version">EN</a>`
    );
    html = injectHeaderToggle(html, false, enHref, null);
    if (!html.includes('name="robots" content="noindex"')) {
      html = setHreflang(html, deSlug);
    }
    writeFileSync(dePath, html, 'utf8');
    patched++;
  }

  // ---------- EN-Seite ----------
  if (existsSync(enPath)) {
    let html = readFileSync(enPath, 'utf8');
    const deHref = deSlug === 'index' ? '/' : '/' + deSlug;
    // DE-Link im Switch erzwingen (Sicherheitsnetz, falls eine Seite abweicht)
    html = html.replace(
      /<a class="lang-link" href="[^"]*" hreflang="de"[^>]*>DE<\/a>/,
      `<a class="lang-link" href="${deHref}" hreflang="de" title="Deutsche Version">DE</a>`
    );
    html = injectHeaderToggle(html, true, null, deHref);
    if (!html.includes('name="robots" content="noindex"')) {
      html = setHreflang(html, deSlug);
    }
    writeFileSync(enPath, html, 'utf8');
    patched++;
  } else {
    console.log('! fehlt noch: en/' + enSlug + '.html');
  }
}
console.log('✓ inject-lang:', patched, 'Seiten verknüpft');
