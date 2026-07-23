// Einmalige Reparatur/Assemblierung von en/references.html:
// Kopf+Karten+CTA+Details 1–3 (vorhanden, Zeilen 1–523) + übersetztes Fragment
// (Details 4–20 aus en/_details-fragment.html) + Dialog + Skript (EN) +
// Footer/Overlay aus en/welding.html. Danach kann das Fragment gelöscht werden.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const kopf = readFileSync(ROOT + 'en/references.html', 'utf8').split('\n').slice(0, 523).join('\n');
const fragment = readFileSync(ROOT + 'en/_details-fragment.html', 'utf8').trimEnd();

const ref = readFileSync(ROOT + 'en/welding.html', 'utf8');
let footer = ref.slice(ref.indexOf('  <!-- ============ Footer'), ref.indexOf('  <script src="/assets/vendor/'));
let overlayNav = ''; // Overlay-Menü steckt im Footer-Slice? Nein — separat extrahieren:
const ovStart = ref.indexOf('  <!-- ============ Overlay menu');
if (ovStart === -1) throw new Error('Overlay-Marker nicht gefunden');
// Footer-Slice endet vor dem Overlay? Reihenfolge in welding: Footer → Overlay → Scripts.
// Also: alles von Footer-Beginn bis zu den Vendor-Scripts nehmen (enthält Footer + Overlay).
footer = ref.slice(ref.indexOf('  <!-- ============ Footer'), ref.indexOf('  <script src="/assets/vendor/'));
// Sprachumschalter-Ziel der Referenzseite:
footer = footer.replaceAll('href="/schweissen"', 'href="/referenzen"');

const schluss = `
    </div>

    <!-- Project overlay -->
    <dialog id="ref-dialog" class="ref-dialog" aria-label="Project details">
      <button type="button" class="ref-dialog-close" data-dialog-close aria-label="Close">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div class="ref-dialog-scroll" id="ref-dialog-inhalt"></div>
    </dialog>
  </main>

  <script>
    /* Industry filter + project overlay with deep links */
    document.addEventListener('DOMContentLoaded', () => {
      /* ---------- Filter ---------- */
      const buttons = document.querySelectorAll('#ref-filter .filter-btn');
      const cards = document.querySelectorAll('.ref-card');
      buttons.forEach(btn => {
        const f = btn.dataset.filter;
        const n = f === 'alle' ? cards.length : document.querySelectorAll('.ref-card[data-branche="' + f + '"]').length;
        btn.querySelector('.count').textContent = '(' + n + ')';
      });
      let aktiverFilter = 'alle';
      /* "Show more": only part of the cards initially — cards stay in the DOM,
         we only toggle visibility */
      const MEHR_SCHRITT = 9;
      let sichtbarLimit = MEHR_SCHRITT;
      const mehrWrap = document.getElementById('ref-mehr-wrap');
      const mehrBtn = document.getElementById('ref-mehr');
      function applyFilter(f, push) {
        aktiverFilter = f;
        buttons.forEach(b => b.classList.toggle('is-active', b.dataset.filter === f));
        let treffer = 0;
        cards.forEach(c => {
          const passt = f === 'alle' || c.dataset.branche === f;
          const zeigen = passt && treffer < sichtbarLimit;
          if (passt) treffer++;
          c.classList.toggle('is-hidden', !zeigen);
        });
        const rest = Math.max(0, treffer - sichtbarLimit);
        mehrWrap.hidden = rest === 0;
        if (rest > 0) mehrBtn.textContent = rest === 1 ? 'Show 1 more project' : 'Show ' + rest + ' more projects';
        if (push) history.replaceState(null, '', f === 'alle' ? location.pathname : '?branche=' + f);
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      }
      buttons.forEach(b => b.addEventListener('click', () => { sichtbarLimit = MEHR_SCHRITT; applyFilter(b.dataset.filter, true); }));
      mehrBtn.addEventListener('click', () => { sichtbarLimit += MEHR_SCHRITT; applyFilter(aktiverFilter, false); });
      const startFilter = (new URLSearchParams(location.search).get('branche') || 'alle').toLowerCase();
      applyFilter(['pharma','kosmetik','chemie','lebensmittel'].includes(startFilter) ? startFilter : 'alle', false);

      /* ---------- Project overlay ---------- */
      const dialog = document.getElementById('ref-dialog');
      const inhalt = document.getElementById('ref-dialog-inhalt');

      function urlOhneProjekt() {
        return location.pathname + (aktiverFilter !== 'alle' ? '?branche=' + aktiverFilter : '');
      }
      function openProjekt(slug, push) {
        const detail = document.querySelector('.ref-detail[data-slug="' + slug + '"]');
        if (!detail || !dialog.showModal) return;
        inhalt.innerHTML = detail.innerHTML;
        inhalt.scrollTop = 0;
        dialog.showModal();
        if (push !== false) history.replaceState(null, '', urlOhneProjekt() + '#projekt-' + slug);
      }
      function hashAufraeumen() {
        if (location.hash.startsWith('#projekt-')) history.replaceState(null, '', urlOhneProjekt());
      }
      function closeProjekt() {
        if (dialog.open) dialog.close();
        hashAufraeumen();
      }
      /* Clean the hash on every close path — deliberately not only via the
         close event, as some environments do not fire it reliably */
      dialog.addEventListener('close', hashAufraeumen);
      dialog.addEventListener('cancel', hashAufraeumen);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProjekt(); });
      dialog.addEventListener('click', e => { if (e.target === dialog) closeProjekt(); });
      dialog.querySelector('[data-dialog-close]').addEventListener('click', closeProjekt);

      cards.forEach(card => {
        card.addEventListener('click', e => {
          e.preventDefault();
          openProjekt(card.dataset.slug);
        });
      });

      /* Deep link: references#projekt-… opens the overlay directly */
      if (location.hash.startsWith('#projekt-')) {
        openProjekt(location.hash.replace('#projekt-', ''), false);
      }
      /* Also react to hash changes without a reload (e.g. back button) */
      window.addEventListener('hashchange', () => {
        if (location.hash.startsWith('#projekt-')) {
          openProjekt(location.hash.replace('#projekt-', ''), false);
        } else if (dialog.open) {
          dialog.close();
        }
      });
    });
  </script>
${footer}
  <script src="/assets/vendor/gsap.min.js"></script>
  <script src="/assets/vendor/ScrollTrigger.min.js"></script>
</body>

</html>
`;

writeFileSync(ROOT + 'en/references.html', kopf + '\n' + fragment + '\n' + schluss, 'utf8');
unlinkSync(ROOT + 'en/_details-fragment.html');
console.log('✓ en/references.html assembliert');
