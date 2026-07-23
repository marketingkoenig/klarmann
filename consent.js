/* ============================================================
   Klarmann Cookie-Consent
   Grundgerüst für Marketing-Tools (Meta Pixel).
   WICHTIG: Der Banner erscheint erst, wenn META_PIXEL_ID gesetzt ist —
   ohne Marketing-Tools braucht die Seite keinen Banner.
   Test ohne Pixel-ID: Seite mit ?consent-test aufrufen.
   ============================================================ */

/* TODO Kampagnenstart: Pixel-ID aus dem Meta Business Manager eintragen
   und den Abschnitt zum Pixel in der Datenschutzerklärung ergänzen. */
const META_PIXEL_ID = '';

(() => {
  const KEY = 'klarmann-consent';
  const testModus = new URLSearchParams(location.search).has('consent-test');
  const bannerNoetig = !!META_PIXEL_ID || testModus;

  function status() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setStatus(wert) { try { localStorage.setItem(KEY, wert); } catch (e) { /* Storage blockiert */ } }

  /* ---------- Meta Pixel erst nach Einwilligung laden ---------- */
  function ladeMarketing() {
    if (!META_PIXEL_ID || window.fbq) return;
    /* Offizieller Pixel-Loader (läuft nur nach Opt-in) */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  /* ---------- Banner ---------- */
  let banner = null;

  function zeigeBanner() {
    if (banner) { banner.hidden = false; return; }
    banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie-Einstellungen');
    banner.innerHTML =
      '<div class="consent-card">' +
      '  <p class="consent-titel">Cookies &amp; Marketing</p>' +
      '  <p class="consent-text">Wir möchten mit Ihrer Einwilligung Marketing-Dienste (Meta&nbsp;Pixel) nutzen, ' +
      'um unsere Anzeigen zu verbessern. Technisch notwendige Funktionen laufen ohne Cookies. ' +
      'Details in der <a href="datenschutz">Datenschutzerklärung</a>.</p>' +
      '  <div class="consent-buttons">' +
      '    <button type="button" class="consent-btn consent-btn--sekundaer" data-consent="essential">Nur notwendige</button>' +
      '    <button type="button" class="consent-btn consent-btn--primaer" data-consent="all">Alle akzeptieren</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(banner);
    banner.addEventListener('click', e => {
      const wahl = e.target.closest('[data-consent]')?.dataset.consent;
      if (!wahl) return;
      setStatus(wahl);
      banner.hidden = true;
      if (wahl === 'all') ladeMarketing();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    /* Footer-Link „Cookie-Einstellungen" öffnet den Banner erneut */
    document.querySelectorAll('[data-consent-open]').forEach(el => {
      if (!bannerNoetig) { el.style.display = 'none'; return; }
      el.addEventListener('click', e => { e.preventDefault(); zeigeBanner(); });
    });

    if (!bannerNoetig) return;
    const s = status();
    if (s === 'all') { ladeMarketing(); return; }
    if (s === 'essential') return;
    zeigeBanner();
  });
})();
