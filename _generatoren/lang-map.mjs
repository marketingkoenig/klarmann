// Zentrale DE↔EN-Zuordnung — einzige Quelle der Wahrheit für Sprachumschalter,
// hreflang-Links und die Sitemap. Neue Seiten hier eintragen, dann
// `node _generatoren/inject-lang.mjs && node _generatoren/gen-sitemap.mjs` ausführen.
export const DOMAIN = 'https://klarmann-edelstahl.de';

// DE-Datei (ohne .html) → EN-Pfad unter en/ (ohne .html)
export const MAP = {
  'index': 'index',
  'leistungen': 'services',
  'schweissen': 'welding',
  'schleifen': 'grinding-polishing',
  'laserschneiden': 'laser-cutting',
  'umformen': 'forming',
  'zuschnitt': 'cutting-sawing',
  'lohnbeizen': 'pickling',
  'behaelterbau': 'tank-construction',
  'molkereitechnik': 'dairy-technology',
  'sonderanlagen': 'custom-machinery',
  'branchen': 'industries',
  'referenzen': 'references',
  'zertifikate': 'certificates',
  'ueber-uns': 'about-us',
  'karriere': 'careers',
  'kontakt': 'contact',
  'impressum': 'imprint',
  'datenschutz': 'privacy',
};

export function deUrl(deSlug) {
  return deSlug === 'index' ? DOMAIN + '/' : DOMAIN + '/' + deSlug;
}
export function enUrl(deSlug) {
  const en = MAP[deSlug];
  return en === 'index' ? DOMAIN + '/en/' : DOMAIN + '/en/' + en;
}
