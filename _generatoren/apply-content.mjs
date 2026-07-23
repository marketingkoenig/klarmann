// Erzeugt die Referenz-Karten + Detail-Overlays (DE & EN) aus data/inhalte.json und
// spleißt sie exakt zwischen die bestehenden Marker in referenzen.html / en/references.html.
// Nur die datengetriebenen Regionen werden ersetzt — Kopf, Filter, Dialog, Skript,
// Footer bleiben unberührt. Bild-Maße werden aus der echten Datei gelesen.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const data = JSON.parse(readFileSync(ROOT + 'data/inhalte.json', 'utf8'));
const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Leistungs-Lookup: Schlüssel → { de:{href,name}, en:{href,name} }
const LEIST = {
  behaelterbau:    { de: ['behaelterbau', 'Behälterbau'],      en: ['/en/tank-construction', 'Tank construction'] },
  molkereitechnik: { de: ['molkereitechnik', 'Molkereitechnik'], en: ['/en/dairy-technology', 'Dairy technology'] },
  sonderanlagen:   { de: ['sonderanlagen', 'Sonderanlagen'],   en: ['/en/custom-machinery', 'Custom machinery'] },
  schweissen:      { de: ['schweissen', 'Schweißen'],          en: ['/en/welding', 'Welding'] },
  schleifen:       { de: ['schleifen', 'Schleifen'],           en: ['/en/grinding-polishing', 'Grinding &amp; polishing'] },
  laserschneiden:  { de: ['laserschneiden', 'Laserschneiden'], en: ['/en/laser-cutting', 'Laser cutting'] },
  umformen:        { de: ['umformen', 'Umformen'],             en: ['/en/forming', 'Forming'] },
  zuschnitt:       { de: ['zuschnitt', 'Zuschnitt &amp; Sägen'], en: ['/en/cutting-sawing', 'Cutting &amp; sawing'] },
  lohnbeizen:      { de: ['lohnbeizen', 'Lohnbeizen'],         en: ['/en/pickling', 'Pickling'] },
};
const BADGE = {
  lebensmittel: ['Lebensmittel', 'Food'], pharma: ['Pharma', 'Pharma'],
  kosmetik: ['Kosmetik', 'Cosmetics'], chemie: ['Chemie', 'Chemicals'],
};
const T = {
  de: { hrefBase: 'referenzen', imgBase: 'assets/img', ansehen: 'Projekt ansehen', aufgabe: 'Die Aufgabe', loesung: 'Unsere Lösung', eckdaten: 'Eckdaten', leistungen: 'Eingesetzte Leistungen', cta: 'Ähnliches Projekt anfragen', kontakt: 'kontakt', li: 0 },
  en: { hrefBase: '/en/references', imgBase: '/assets/img', ansehen: 'View project', aufgabe: 'The challenge', loesung: 'Our solution', eckdaten: 'Key data', leistungen: 'Services involved', cta: 'Request a similar project', kontakt: '/en/contact', li: 1 },
};

function imgDims(bild) {
  const p = ROOT + 'assets/img/' + bild;
  if (!existsSync(p)) return null;
  const buf = readFileSync(p);
  // JPEG: SOF-Marker suchen
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function card(r, lang) {
  const t = T[lang], li = t.li;
  const badge = BADGE[r.branche][li];
  const fbk = BADGE[r.branche][0]; // Platzhalter-Label immer deutsch (wie im Original)
  const title = li ? r.titel_en : r.titel_de;
  const desc = li ? r.kurz_en : r.kurz_de;
  const alt = li ? (r.alt_en || title) : (r.alt_de || title);
  const webp = r.bild.replace(/\.jpg$/i, '.webp');
  const d = imgDims(r.bild) || { w: r.bildW || '', h: r.bildH || '' };
  return `          <a href="${t.hrefBase}#projekt-${r.slug}" class="ref-card group block bg-white rounded-sm overflow-hidden border border-ink/5 hover:border-stahl/40 transition-colors" data-branche="${r.branche}" data-slug="${r.slug}">
            <div class="aspect-[4/3] overflow-hidden bg-zinc-200">
              <picture><source type="image/webp" srcset="${t.imgBase}/${webp}" /><img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="${esc(alt)}" data-fbk="${fbk}" src="${t.imgBase}/${r.bild}" loading="lazy" width="${d.w}" height="${d.h}" /></picture>
            </div>
            <div class="p-6 md:p-7">
              <span class="inline-block font-label text-[9px] uppercase tracking-[0.16em] bg-stahl/10 text-stahl px-3 py-1.5 rounded-full">${badge}</span>
              <h2 class="font-headline text-xl md:text-2xl text-ink mt-4 leading-tight group-hover:text-stahl transition-colors">${esc(title)}</h2>
              <p class="font-body font-light text-sm text-zinc-600 mt-2.5 leading-relaxed">${esc(desc)}</p>
              <span class="inline-flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-stahl mt-5 group-hover:gap-3.5 transition-all">${t.ansehen} <span class="material-symbols-outlined text-xs">east</span></span>
            </div>
          </a>`;
}

function eckRows(eckStr) {
  return (eckStr || '').split('\n').filter(Boolean).map(line => {
    const idx = line.indexOf(': ');
    const label = idx >= 0 ? line.slice(0, idx) : line;
    const value = idx >= 0 ? line.slice(idx + 2) : '';
    return `            <div class="eck-row"><span class="font-bold text-xs uppercase tracking-widest text-ink">${esc(label)}</span><span class="font-body font-light text-sm text-zinc-600">${esc(value)}</span></div>`;
  }).join('\n');
}

function chips(leistStr, lang) {
  const li = T[lang].li;
  return (leistStr || '').split(',').map(s => s.trim()).filter(Boolean).map(key => {
    const l = LEIST[key]; if (!l) return '';
    const [href, name] = l[lang === 'en' ? 'en' : 'de'];
    return `              <a href="${href}" class="inline-flex items-center gap-1.5 border border-ink/15 hover:border-stahl px-4 py-2 font-label text-[10px] uppercase tracking-[0.16em] text-zinc-600 hover:text-stahl transition-colors">${name} <span class="material-symbols-outlined text-xs">east</span></a>`;
  }).filter(Boolean).join('\n');
}

function detail(r, lang) {
  const t = T[lang], li = t.li;
  const badge = BADGE[r.branche][li];
  const title = li ? r.titel_en : r.titel_de;
  const alt = li ? (r.alt_en || title) : (r.alt_de || title);
  const aufgabe = li ? r.aufgabe_en : r.aufgabe_de;
  const loesung = li ? r.loesung_en : r.loesung_de;
  const eck = li ? r.eck_en : r.eck_de;
  const webp = r.bild.replace(/\.jpg$/i, '.webp');
  const d = imgDims(r.bild) || { w: r.bildW || '', h: r.bildH || '' };
  return `      <div class="ref-detail hidden" data-slug="${r.slug}">
        <div class="aspect-[21/9] overflow-hidden bg-zinc-200">
          <picture><source type="image/webp" srcset="${t.imgBase}/${webp}" /><img class="w-full h-full object-cover" alt="${esc(alt)}" src="${t.imgBase}/${r.bild}" loading="lazy" width="${d.w}" height="${d.h}" /></picture>
        </div>
        <div class="p-6 md:p-10">
          <span class="inline-block font-label text-[9px] uppercase tracking-[0.16em] bg-stahl/10 text-stahl px-3 py-1.5 rounded-full">${badge}</span>
          <h2 class="font-headline text-3xl md:text-4xl text-ink mt-4 leading-tight">${esc(title)}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mt-7">
            <div>
              <p class="font-label text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2.5">${t.aufgabe}</p>
              <p class="font-body font-light text-zinc-600 leading-relaxed">${esc(aufgabe)}</p>
            </div>
            <div>
              <p class="font-label text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2.5">${t.loesung}</p>
              <p class="font-body font-light text-zinc-600 leading-relaxed">${esc(loesung)}</p>
            </div>
          </div>
          <div class="mt-8">
            <p class="font-label text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2">${t.eckdaten}</p>
${eckRows(eck)}
          </div>
          <div class="mt-8">
            <p class="font-label text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-3">${t.leistungen}</p>
            <div class="flex flex-wrap gap-2.5">
${chips(r.leistungen, lang)}
            </div>
          </div>
          <div class="mt-9 pt-7 border-t border-ink/10 flex flex-col sm:flex-row gap-3">
            <a href="${t.kontakt}" class="btn-primary font-label justify-center">
              ${t.cta}
              <span class="material-symbols-outlined text-sm">east</span>
            </a>
            <a href="tel:+4944092880" class="btn-secondary font-label justify-center">+49 4409 9288-0</a>
          </div>
        </div>
      </div>`;
}

function splice(html, startMarker, endMarker, content) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  if (s < 0 || e < 0) throw new Error('Marker nicht gefunden: ' + startMarker.slice(0, 40));
  return html.slice(0, s + startMarker.length) + '\n' + content + html.slice(e);
}

const MARK = {
  de: { cardsEnd: '\n        </div>\n        <!-- Alle Karten', detailsEnd: '\n    </div>\n\n    <!-- Projekt-Overlay -->' },
  en: { cardsEnd: '\n        </div>\n        <!-- All cards', detailsEnd: '\n    </div>\n\n    <!-- Project overlay -->' },
};
// Sichtbare Referenzen = nicht 'versteckt' UND Bild vorhanden. Sicherheitsnetz:
// fehlt das Bild (Dateiname vertippt oder noch nicht im Ordner), wird die Referenz
// übersprungen statt mit kaputtem Bild veröffentlicht.
const visible = data.referenzen.filter(r => {
  if (r.status === 'versteckt') return false;
  if (!existsSync(ROOT + 'assets/img/' + r.bild)) {
    console.warn('⚠ Referenz übersprungen (Bild fehlt): ' + r.slug + ' → ' + r.bild);
    return false;
  }
  return true;
});
for (const lang of ['de', 'en']) {
  const file = lang === 'de' ? 'referenzen.html' : 'en/references.html';
  let html = readFileSync(ROOT + file, 'utf8');
  const cards = visible.map(r => card(r, lang)).join('\n');
  const details = visible.map(r => detail(r, lang)).join('\n');

  html = splice(html,
    '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" id="ref-grid">',
    MARK[lang].cardsEnd, cards);
  html = splice(html,
    '<div class="hidden" aria-hidden="true">',
    MARK[lang].detailsEnd, details);
  writeFileSync(ROOT + file, html, 'utf8');
}
console.log('✓ apply-content: Referenzen (Karten + Details) DE & EN regeneriert —', visible.length, 'sichtbar');

// ============================ Stellen ============================
// Drei Regionen: JobPosting-JSON-LD (nur DE), "Wen wir suchen"-Karten (DE+EN),
// Wizard-Schritt-1 (DE+EN). Garnitur (Zusatz-Badge, Wizard-Untertitel, Google-Text)
// kommt für bestehende Stellen aus den Daten, für neue Stellen aus sinnvollen Defaults.
const JT = {
  de: { emp: { Vollzeit: 'Vollzeit', Teilzeit: 'Teilzeit', Ausbildung: 'Ausbildung' }, apply: 'Jetzt bewerben',
        initTitle: 'Initiativbewerbung', initSub: 'Zeig uns, was du kannst',
        zusatz: b => b === 'Ausbildung' ? 'Sehr gute Übernahmechance' : 'Ab sofort',
        sub: b => b === 'Ausbildung' ? 'Ausbildung mit sehr guter Übernahmechance' : 'Vollzeit · ab sofort' },
  en: { emp: { Vollzeit: 'Full-time', Teilzeit: 'Part-time', Ausbildung: 'Apprenticeship' }, apply: 'Apply now',
        initTitle: 'Open application', initSub: 'Show us what you can do',
        zusatz: b => b === 'Ausbildung' ? 'Very good chance of staying on' : 'Immediate start',
        sub: b => b === 'Ausbildung' ? 'Apprenticeship with a very good chance of staying on' : 'Full-time · immediate start' },
};
const openJobs = (data.stellen || []).filter(s => s.status !== 'geschlossen');

function jobCard(s, lang) {
  const t = JT[lang];
  const title = lang === 'en' ? s.titel_en : s.titel_de;
  const desc = lang === 'en' ? s.beschreibung_en : s.beschreibung_de;
  const empLabel = t.emp[s.beschaeftigung] || s.beschaeftigung;
  const zus = (lang === 'en' ? s.zusatz_en : s.zusatz_de) || t.zusatz(s.beschaeftigung);
  const b1 = s.beschaeftigung === 'Ausbildung'
    ? `<span class="font-label text-[9px] uppercase tracking-[0.16em] bg-stahl/10 text-stahl px-3 py-1.5 rounded-full">${esc(empLabel)}</span>`
    : `<span class="font-label text-[9px] uppercase tracking-[0.16em] bg-mist px-3 py-1.5 rounded-full text-zinc-600">${esc(empLabel)}</span>`;
  const b2 = `<span class="font-label text-[9px] uppercase tracking-[0.16em] bg-mist px-3 py-1.5 rounded-full text-zinc-600">${esc(zus)}</span>`;
  return `          <div class="bg-white rounded-sm p-7 md:p-10 flex flex-col gap-4 border border-ink/5 hover:border-stahl/40 transition-colors group">
            <div class="flex flex-wrap gap-2">
              ${b1}
              ${b2}
            </div>
            <h3 class="font-headline text-2xl md:text-3xl text-ink">${esc(title)}</h3>
            <p class="font-body font-light text-zinc-600 leading-relaxed flex-1">
              ${esc(desc)}
            </p>
            <button type="button" data-stelle="${esc(s.titel_de)}" class="job-apply btn-primary font-label self-start">
              ${t.apply}
              <span class="material-symbols-outlined text-sm">east</span>
            </button>
          </div>`;
}

function wizOption(s, lang, n) {
  const t = JT[lang];
  const title = lang === 'en' ? s.titel_en : s.titel_de;
  const sub = (lang === 'en' ? s.sub_en : s.sub_de) || t.sub(s.beschaeftigung);
  return `              <button type="button" class="wz-option" data-value="${esc(s.titel_de)}">
                <span class="wz-num">${n}</span>
                <span><span class="wz-opt-title block">${esc(title)}</span><span class="wz-opt-sub block">${esc(sub)}</span></span>
              </button>`;
}
function wizInit(lang, n) {
  const t = JT[lang];
  return `              <button type="button" class="wz-option" data-value="Initiativbewerbung">
                <span class="wz-num">${n}</span>
                <span><span class="wz-opt-title block">${t.initTitle}</span><span class="wz-opt-sub block">${t.initSub}</span></span>
              </button>`;
}

function jobPosting(s) {
  const emp = s.jpEmp || (s.beschaeftigung === 'Teilzeit' ? '"PART_TIME"' : '"FULL_TIME"');
  const desc = s.jp_de || `${s.beschreibung_de} ${s.beschaeftigung}, ab sofort, bei Klarmann Edelstahlverarbeitung in Westerstede-Ocholt. Bewerbung in 2 Minuten ohne Anschreiben.`;
  return `    {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": "${s.jpTitle || s.titel_de}",
      "description": "<p>${desc}</p>",
      "datePosted": "2026-07-20",
      "validThrough": "2026-12-31T23:59",
      "employmentType": ${emp},
      "directApply": true,
      "hiringOrganization": {
        "@type": "Organization",
        "name": "Klarmann Edelstahlverarbeitung GmbH",
        "sameAs": "https://klarmann-edelstahl.de",
        "logo": "https://klarmann-edelstahl.de/assets/klarmann-logo.png"
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Willerfang 2",
          "addressLocality": "Westerstede",
          "postalCode": "26655",
          "addressRegion": "Niedersachsen",
          "addressCountry": "DE"
        }
      },
      "url": "https://klarmann-edelstahl.de/karriere?stelle=${s.stelle}"
    }`;
}

// exakter Splice ohne zusätzlichen Zeilenumbruch (Whitespace steckt komplett im content)
function spliceRaw(html, startMarker, endMarker, content) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  if (s < 0 || e < 0) throw new Error('Job-Marker nicht gefunden: ' + startMarker.slice(0, 50));
  return html.slice(0, s + startMarker.length) + content + html.slice(e);
}

const CARDS_START = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">';
const CARDS_END = '\n\n        </div>\n        <p class="font-body font-light text-zinc-600 mt-8">';
const WIZ_START = '<div class="wz-group flex flex-col gap-3 mt-7" data-group="stelle" data-autoadvance>';
const WIZ_END = '\n            </div>\n            <p class="wz-error-text';

// DE: karriere.html — JSON-LD + Karten + Wizard
{
  let html = readFileSync(ROOT + 'karriere.html', 'utf8');
  html = spliceRaw(html,
    '<!-- Google for Jobs: Stellenanzeigen als strukturierte Daten -->\n  <!-- TODO: validThrough bei Bedarf verlängern; Stellen aktuell halten -->\n  <script type="application/ld+json">\n  [',
    '\n  ]\n  </script>\n  <!-- FAQ als strukturierte Daten -->',
    '\n' + openJobs.map(jobPosting).join(',\n'));
  html = spliceRaw(html, CARDS_START, CARDS_END, '\n\n' + openJobs.map(s => jobCard(s, 'de')).join('\n\n'));
  html = spliceRaw(html, WIZ_START, WIZ_END,
    '\n' + openJobs.map((s, i) => wizOption(s, 'de', i + 1)).join('\n') + '\n' + wizInit('de', openJobs.length + 1));
  writeFileSync(ROOT + 'karriere.html', html, 'utf8');
}
// EN: en/careers.html — Karten + Wizard (kein JSON-LD auf EN)
{
  let html = readFileSync(ROOT + 'en/careers.html', 'utf8');
  html = spliceRaw(html, CARDS_START, CARDS_END, '\n\n' + openJobs.map(s => jobCard(s, 'en')).join('\n\n'));
  html = spliceRaw(html, WIZ_START, WIZ_END,
    '\n' + openJobs.map((s, i) => wizOption(s, 'en', i + 1)).join('\n') + '\n' + wizInit('en', openJobs.length + 1));
  writeFileSync(ROOT + 'en/careers.html', html, 'utf8');
}
console.log('✓ apply-content: Stellen (JSON-LD + Karten + Wizard) DE & EN —', openJobs.length, 'offen');
