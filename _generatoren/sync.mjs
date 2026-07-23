// Publish-Pipeline: nimmt die Inhalts-Daten (data/inhalte.json), regeneriert die
// betroffenen Seiten, prüft die Integrität und deployt. Wird nach jeder Sheet-
// Übernahme ausgeführt. Ablauf: apply-content → inject-lang → cache-bust → CSS → check → deploy.
import { execSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const run = (cmd, opts = {}) => {
  console.log('▸ ' + cmd);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
};

try {
  run('node _generatoren/apply-content.mjs');   // Referenzen (+ später Stellen) aus Daten
  run('node _generatoren/inject-lang.mjs');      // hreflang + Sprachumschalter frisch
  run('npm run css');                            // Tailwind (falls neue Klassen)
  run('node _generatoren/bust-cache.mjs');       // Cache-Version bumpen
  run('node _generatoren/check-site.mjs');       // Integrität — bricht bei Fehler ab
  if (process.argv.includes('--deploy')) {
    run('npx firebase-tools deploy --only hosting');
    console.log('\n✓ Veröffentlicht: https://klarmann-edelstahl.web.app');
  } else {
    console.log('\n✓ Lokal regeneriert & geprüft (ohne Deploy). Mit --deploy live schalten.');
  }
} catch (e) {
  console.error('\n✗ Sync abgebrochen — Seite NICHT verändert/deployt. Prüfe die Meldung oben.');
  process.exit(1);
}
