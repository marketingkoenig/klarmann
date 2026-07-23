// Einmalige Extraktion: zieht die aktuell auf der Seite stehenden Stellen und
// Referenzen aus den HTML-Dateien in eine strukturierte JSON-Datenquelle
// (data/inhalte.json). Diese JSON ist danach die Grundlage für das Google Sheet
// und für die Regenerierung der Seiten.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const rd = f => readFileSync(ROOT + f, 'utf8');
const clean = s => s ? s.replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim() : '';

// ---------- Referenzen ----------
function parseCards(html) {
  const out = {};
  const re = /<a href="[^"]*#projekt-([^"]+)"[^>]*data-branche="([^"]+)" data-slug="[^"]+">([\s\S]*?)<\/a>\s*(?=<a href="[^"]*#projekt-|<\/div>\s*<!--|\s*<\/div>\s*<\/div>\s*<!-- Alle Karten)/g;
  let m;
  while ((m = re.exec(html))) {
    const slug = m[1], branche = m[2], body = m[3];
    const img = (body.match(/<img[^>]*\ssrc="([^"]+\.jpg)"/) || [])[1] || '';
    const alt = (body.match(/<img[^>]*\salt="([^"]+)"/) || [])[1] || '';
    const w = (body.match(/<img[^>]*\swidth="(\d+)"/) || [])[1] || '';
    const h = (body.match(/<img[^>]*\sheight="(\d+)"/) || [])[1] || '';
    const badge = clean((body.match(/rounded-full">([^<]+)<\/span>/) || [])[1]);
    const title = clean((body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1]);
    const desc = clean((body.match(/<p class="font-body font-light text-sm[^"]*">([\s\S]*?)<\/p>/) || [])[1]);
    out[slug] = { slug, branche, img: img.split('/').pop(), imgW: w, imgH: h, alt, badge, title, desc };
  }
  return out;
}

function parseDetails(html, labels) {
  const out = {};
  const re = /<div class="ref-detail hidden" data-slug="([^"]+)">([\s\S]*?)(?=<div class="ref-detail hidden"|<!-- Projekt-Overlay|<!-- Project overlay)/g;
  let m;
  while ((m = re.exec(html))) {
    const slug = m[1], body = m[2];
    const grab = (labelRe) => {
      const mm = body.match(new RegExp(`mb-2\\.5">(?:${labelRe})<\\/p>\\s*<p class="font-body font-light text-zinc-600 leading-relaxed">([\\s\\S]*?)<\\/p>`));
      return clean(mm && mm[1]);
    };
    const aufgabe = grab(labels.aufgabe);
    const loesung = grab(labels.loesung);
    const eck = [];
    const eckRe = /<div class="eck-row"><span[^>]*>([^<]+)<\/span><span[^>]*>([\s\S]*?)<\/span><\/div>/g;
    let e;
    while ((e = eckRe.exec(body))) eck.push([clean(e[1]), clean(e[2])]);
    const leist = [];
    const lRe = /<a href="([^"]+)" class="inline-flex items-center gap-1\.5 border[^"]*">([\s\S]*?)<span class="material-symbols/g;
    let l;
    while ((l = lRe.exec(body))) leist.push({ href: l[1], name: clean(l[2]) });
    out[slug] = { aufgabe, loesung, eck, leist };
  }
  return out;
}

const deHtml = rd('referenzen.html');
const enHtml = rd('en/references.html');
const deCards = parseCards(deHtml), enCards = parseCards(enHtml);
const deDet = parseDetails(deHtml, { aufgabe: 'Die Aufgabe', loesung: 'Unsere Lösung' });
const enDet = parseDetails(enHtml, { aufgabe: 'The challenge', loesung: 'Our solution' });

const referenzen = Object.keys(deCards).map(slug => {
  const dc = deCards[slug], ec = enCards[slug] || {}, dd = deDet[slug] || {}, ed = enDet[slug] || {};
  return {
    slug, branche: dc.branche, bild: dc.img, bildW: dc.imgW, bildH: dc.imgH,
    titel_de: dc.title, titel_en: ec.title || '',
    kurz_de: dc.desc, kurz_en: ec.desc || '',
    alt_de: dc.alt, alt_en: ec.alt || '',
    aufgabe_de: dd.aufgabe || '', aufgabe_en: ed.aufgabe || '',
    loesung_de: dd.loesung || '', loesung_en: ed.loesung || '',
    eck_de: (dd.eck || []).map(x => x[0] + ': ' + x[1]).join('\n'),
    eck_en: (ed.eck || []).map(x => x[0] + ': ' + x[1]).join('\n'),
    leistungen: (dd.leist || []).map(x => x.href.replace(/^\//, '').replace(/^en\//, '')).join(', '),
    status: 'sichtbar',
  };
});

// ---------- Stellen ----------
const kar = rd('karriere.html');
const enCar = rd('en/careers.html');
// EN-Stellentitel als Fallback (falls Karte fehlt)
const enTitel = {
  metallbauer: 'Metalworker (m/f/d)',
  maschinenbediener: 'Machine operator (m/f/d)',
  helfer: 'Production assistant (m/f/d)',
  azubi: 'Metalworker apprentice (m/f/d)',
};
// "Wen wir suchen"-Karten in DOM-Reihenfolge (Karte, Wizard, JSON-LD stehen in
// gleicher Reihenfolge → Verknüpfung über den Index, nicht über den Titel, weil
// der JSON-LD-Titel abweichen kann, z. B. "Auszubildende:r" vs. "Azubi").
function parseJobCards(html) {
  const out = [];
  const re = /<div class="bg-white rounded-sm p-7 md:p-10 flex flex-col gap-4[^"]*">([\s\S]*?)data-stelle="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const body = m[1];
    const badges = [...body.matchAll(/rounded-full[^>]*>([^<]+)<\/span>/g)].map(x => clean(x[1]));
    const title = clean((body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1]);
    const desc = clean((body.match(/<p class="font-body font-light text-zinc-600 leading-relaxed flex-1">([\s\S]*?)<\/p>/) || [])[1]);
    out.push({ key: m[2], badge1: badges[0] || '', badge2: badges[1] || '', title, desc });
  }
  return out;
}
// Wizard-Untertitel aus Schritt 1 (nur Job-Optionen, ohne Initiativbewerbung)
function parseWizardSubs(html) {
  const step1 = html.slice(html.indexOf('data-group="stelle"'), html.indexOf('wz-error-text'));
  const out = [];
  const re = /data-value="([^"]+)">\s*<span class="wz-num">\d+<\/span>\s*<span><span class="wz-opt-title block">([\s\S]*?)<\/span><span class="wz-opt-sub block">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(step1))) out.push({ value: m[1], title: clean(m[2]), sub: clean(m[3]) });
  return out.filter(o => o.value !== 'Initiativbewerbung');
}
const deCardsJob = parseJobCards(kar), enCardsJob = parseJobCards(enCar);
const deWiz = parseWizardSubs(kar), enWiz = parseWizardSubs(enCar);

const jobs = [];
const jpRe = /"@type": "JobPosting",\s*"title": "([^"]+)",\s*"description": "([\s\S]*?)",\s*"datePosted"[\s\S]*?"employmentType": (\[[^\]]*\]|"[^"]*")[\s\S]*?stelle=([a-z]+)/g;
let j, idx = 0;
while ((j = jpRe.exec(kar))) {
  const dc = deCardsJob[idx] || {}, ec = enCardsJob[idx] || {};
  const dw = deWiz[idx] || {}, ew = enWiz[idx] || {};
  jobs.push({
    stelle: j[4],
    titel_de: dc.key || clean(j[1]),             // Karten-/Wizard-Schlüssel (data-stelle/data-value)
    titel_en: ec.title || enTitel[j[4]] || '',
    beschaeftigung: dc.badge1 || 'Vollzeit',     // Sheet-Feld (Vollzeit/Teilzeit/Ausbildung)
    beschreibung_de: dc.desc || '',              // sichtbarer Kartentext
    beschreibung_en: ec.desc || '',
    // Garnitur (nicht im Sheet, für originalgetreue Regenerierung bestehender Stellen):
    zusatz_de: dc.badge2 || '', zusatz_en: ec.badge2 || '',
    sub_de: dw.sub || '', sub_en: ew.sub || '',
    jpTitle: clean(j[1]),                        // formaler Google-for-Jobs-Titel
    jp_de: clean(j[2].replace(/<\/?p>/g, '')),   // längerer Google-for-Jobs-Text
    jpEmp: j[3],                                  // employmentType roh (z. B. "FULL_TIME")
    status: 'offen',
  });
  idx++;
}

mkdirSync(ROOT + 'data', { recursive: true });
const data = { referenzen, stellen: jobs };
writeFileSync(ROOT + 'data/inhalte.json', JSON.stringify(data, null, 2), 'utf8');
console.log(`✓ ${referenzen.length} Referenzen, ${jobs.length} Stellen → data/inhalte.json`);
console.log('  Referenzen ohne Aufgabe:', referenzen.filter(r => !r.aufgabe_de).map(r => r.slug).join(', ') || 'keine');
console.log('  Referenzen ohne EN-Titel:', referenzen.filter(r => !r.titel_en).map(r => r.slug).join(', ') || 'keine');
console.log('  Stellen:', jobs.map(s => s.stelle + '=' + s.titel_de).join(' | '));
