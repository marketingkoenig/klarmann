// Qualitätsprüfung über beide Sprachversionen: interne Links (relativ + absolut),
// JSON-LD-Parsing, alt-Attribute, hreflang-Paare, Sprachumschalter-Ziele sowie
// SEO-Metadaten (Title/Description-Pflicht, -Länge und -Duplikate, Canonical,
// og:title-Konsistenz, genau ein H1, Heading-Hierarchie).
// Nach jeder Änderung ausführen: node _generatoren/check-site.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { MAP, deUrl, enUrl } from './lang-map.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
let fehler = 0;
const meld = (f, msg) => { fehler++; console.log('✗', f, '—', msg); };

function resolveTarget(u) {
  u = u.split('#')[0].split('?')[0];
  if (!u || u === '/' || u === '/en/') return true;
  let p = u.startsWith('/') ? u.slice(1) : u;
  return existsSync(ROOT + p) || existsSync(ROOT + p + '.html') || existsSync(ROOT + p.replace(/\/$/, '') + '/index.html');
}

const alle = [
  ...readdirSync(ROOT).filter(f => f.endsWith('.html')).map(f => ({ f, rel: f })),
  ...readdirSync(ROOT + 'en').filter(f => f.endsWith('.html')).map(f => ({ f: 'en/' + f, rel: 'en/' + f })),
];

let ld = 0, links = 0;
for (const { f } of alle) {
  const html = readFileSync(ROOT + f, 'utf8');
  const istEn = f.startsWith('en/');

  // Sprach-Attribut
  if (istEn && !html.includes('<html lang="en"')) meld(f, 'lang="en" fehlt');
  if (!istEn && !html.includes('<html lang="de"')) meld(f, 'lang="de" fehlt');

  // JSON-LD
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    ld++;
    try { JSON.parse(m[1]); } catch (e) { meld(f, 'JSON-LD kaputt: ' + e.message.slice(0, 60)); }
  }

  // Links/Assets
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(u)) continue;
    links++;
    // Relative Links in EN-Seiten sind verboten (lösen unter /en/ falsch auf)
    if (istEn && !u.startsWith('/')) { meld(f, 'relativer Pfad in EN-Seite: ' + u); continue; }
    if (!resolveTarget(istEn ? u : u)) meld(f, 'kaputtes Ziel: ' + u);
  }

  // img ohne alt
  const ohneAlt = [...html.matchAll(/<img[^>]*>/g)].filter(t => !/alt="[^"]*"/.test(t[0])).length;
  if (ohneAlt) meld(f, ohneAlt + ' img ohne alt');
}

// ---------- SEO-Metadaten (nur indexierbare Seiten) ----------
const titles = new Map(); // title → [dateien]
const descs = new Map();
for (const { f } of alle) {
  const html = readFileSync(ROOT + f, 'utf8');
  if (f === '404.html' || html.includes('name="robots" content="noindex"')) continue;

  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  const ogTitle = (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1];
  const ogUrl = (html.match(/<meta property="og:url" content="([^"]*)"/) || [])[1];
  const ogLocale = (html.match(/<meta property="og:locale" content="([^"]*)"/) || [])[1];

  if (!title) meld(f, 'Title fehlt');
  else {
    if (title.length > 75) meld(f, 'Title sehr lang (' + title.length + '): ' + title.slice(0, 50) + '…');
    titles.set(title, [...(titles.get(title) || []), f]);
  }
  if (!desc) meld(f, 'Meta-Description fehlt');
  else {
    if (desc.length < 70) meld(f, 'Meta-Description sehr kurz (' + desc.length + ')');
    if (desc.length > 175) meld(f, 'Meta-Description sehr lang (' + desc.length + ')');
    descs.set(desc, [...(descs.get(desc) || []), f]);
  }
  if (!canonical) meld(f, 'Canonical fehlt');
  else {
    const erwartet = f === 'index.html' ? 'https://klarmann-edelstahl.de/'
      : f === 'en/index.html' ? 'https://klarmann-edelstahl.de/en/'
      : 'https://klarmann-edelstahl.de/' + f.replace(/\.html$/, '');
    if (canonical !== erwartet) meld(f, 'Canonical abweichend: ' + canonical);
  }
  if (ogTitle && title && ogTitle !== title) meld(f, 'og:title ≠ title');
  if (canonical && ogUrl && ogUrl !== canonical) meld(f, 'og:url ≠ canonical');
  const erwLocale = f.startsWith('en/') ? 'en_US' : 'de_DE';
  if (ogLocale && ogLocale !== erwLocale) meld(f, 'og:locale falsch: ' + ogLocale);

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) meld(f, h1s + ' H1-Elemente (erwartet: 1)');
  const hs = [...html.matchAll(/<h([1-6])[\s>]/g)].map(m => +m[1]);
  let prev = 0, skip = false;
  for (const h of hs) { if (h > prev + 1 && prev !== 0) { skip = true; break; } prev = Math.max(prev, h); }
  if (skip) meld(f, 'Heading-Hierarchie mit Sprung');
}
for (const [t, fs] of titles) if (fs.length > 1) meld(fs.join(' + '), 'doppelter Title: ' + t.slice(0, 55));
for (const [d, fs] of descs) if (fs.length > 1) meld(fs.join(' + '), 'doppelte Description');

// hreflang-Paare + Sprachumschalter je Sprachpaar
for (const [deSlug, enSlug] of Object.entries(MAP)) {
  const deP = ROOT + deSlug + '.html';
  const enP = ROOT + 'en/' + enSlug + '.html';
  if (!existsSync(enP)) { meld('en/' + enSlug + '.html', 'EN-Seite fehlt'); continue; }
  const de = readFileSync(deP, 'utf8');
  const en = readFileSync(enP, 'utf8');
  const noindex = s => s.includes('name="robots" content="noindex"');

  if (!noindex(de)) {
    if (!de.includes(`hreflang="en" href="${enUrl(deSlug)}"`)) meld(deSlug + '.html', 'hreflang en fehlt/falsch');
    if (!de.includes(`hreflang="x-default" href="${deUrl(deSlug)}"`)) meld(deSlug + '.html', 'x-default fehlt/falsch');
  }
  if (!noindex(en)) {
    if (!en.includes(`hreflang="de" href="${deUrl(deSlug)}"`)) meld('en/' + enSlug + '.html', 'hreflang de fehlt/falsch');
  }
  const enHref = enSlug === 'index' ? '/en/' : '/en/' + enSlug;
  const deHref = deSlug === 'index' ? '/' : '/' + deSlug;
  if (!de.includes(`class="lang-link" href="${enHref}"`)) meld(deSlug + '.html', 'Sprachumschalter EN-Ziel fehlt/falsch (' + enHref + ')');
  if (!en.includes(`class="lang-link" href="${deHref}"`)) meld('en/' + enSlug + '.html', 'Sprachumschalter DE-Ziel fehlt/falsch (' + deHref + ')');
}

console.log(`Geprüft: ${alle.length} Seiten, ${ld} JSON-LD-Blöcke, ${links} interne Verweise — ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
