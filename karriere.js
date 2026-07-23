/* ============================================================
   Klarmann Karriere — mehrstufiger Bewerbungs-Funnel
   Sendet direkt an das Lead-Portal (Kampagne „Bewerbungen — Homepage",
   Endpoint erzeugt via `php artisan setup:klarmann` auf mih-portal.de).
   Der Bewerber bekommt vom Portal eine Eingangsbestätigung per E-Mail.
   ============================================================ */

const PORTAL_ENDPOINT = 'https://mih-portal.de/api/webhooks/c/website/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlcGlkIjo5MywidGlkIjoyMSwia2lkIjoiMTQ2OTVhOGIiLCJpYXQiOjE3ODQ1NjM5MTV9.4IznYwsB81UvlOWngpOyWRTA3Ipm0u_UObRLfeKxDWY';

/* Zweisprachig: Sprache kommt aus <html lang> — dieselbe Datei bedient
   /karriere (de) und /en/careers (en). Die data-value-Werte der Optionen
   bleiben deutsch (Portal-Daten), hier stehen nur sichtbare UI-Texte. */
const IS_EN = document.documentElement.lang === 'en';
const T = IS_EN ? {
  schritt: (n, max) => 'Step ' + n + ' of ' + max,
  senden: 'Submit application',
  sendet: 'Sending …',
  erfolgMitMail: 'You will receive a confirmation email shortly — we usually get back to you by phone within a few working days.',
  erfolgOhneMail: 'We usually get back to you by phone within a few working days.',
  fehler: 'Unfortunately that didn’t work. Please try again — or simply give us a call: +49 4409 9288-0.',
} : {
  schritt: (n, max) => 'Schritt ' + n + ' von ' + max,
  senden: 'Bewerbung absenden',
  sendet: 'Wird gesendet …',
  erfolgMitMail: 'Du bekommst gleich eine Eingangsbestätigung per E-Mail — wir melden uns in der Regel innerhalb weniger Werktage telefonisch.',
  erfolgOhneMail: 'Wir melden uns in der Regel innerhalb weniger Werktage telefonisch bei dir.',
  fehler: 'Das hat leider nicht geklappt. Versuch es gleich nochmal — oder ruf uns einfach an: +49 4409 9288-0.',
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('bewerbung-form');
  if (!form) return;

  const steps = [...form.querySelectorAll('.wz-step')];
  const bar = document.getElementById('wz-bar');
  const label = document.getElementById('wz-label');
  const prozent = document.getElementById('wz-prozent');
  const submitBtn = document.getElementById('f-submit');
  const submitLabel = submitBtn.querySelector('.submit-label');
  const formError = document.getElementById('form-error');
  const erfolg = document.getElementById('bewerbung-erfolg');
  const erfolgHinweis = document.getElementById('erfolg-hinweis');

  /* Antworten des Funnels */
  const antworten = { stelle: '', qualifikation: '', start: '', schweisserfahrung: [] };
  let aktuellerSchritt = 1;

  /* ---------- Fortschritt & Schrittwechsel ---------- */
  function zeigeSchritt(n) {
    aktuellerSchritt = Math.min(Math.max(n, 1), steps.length);
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.step) === aktuellerSchritt));
    const p = Math.round(aktuellerSchritt / steps.length * 100);
    bar.style.width = p + '%';
    label.textContent = T.schritt(aktuellerSchritt, steps.length);
    prozent.textContent = p + ' %';
    const kopf = document.getElementById('bewerben');
    if (kopf && aktuellerSchritt > 1) kopf.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validiereSchritt(n) {
    const step = steps[n - 1];
    let ok = true;
    step.querySelectorAll('.wz-group[data-group]').forEach(g => {
      const key = g.dataset.group;
      if (!antworten[key]) { g.classList.add('is-error'); ok = false; }
    });
    if (n === 5) {
      /* native Validierung nur für Felder dieses Schritts */
      const felder = step.querySelectorAll('input');
      for (const f of felder) {
        if (!f.checkValidity()) { f.reportValidity(); ok = false; break; }
      }
    }
    return ok;
  }

  /* ---------- Auswahlkarten (Einfachauswahl) ---------- */
  form.querySelectorAll('.wz-group[data-group]').forEach(gruppe => {
    const key = gruppe.dataset.group;
    gruppe.querySelectorAll('.wz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        antworten[key] = opt.dataset.value;
        gruppe.classList.remove('is-error');
        gruppe.querySelectorAll('.wz-option').forEach(o => o.classList.toggle('is-selected', o === opt));
        if ('autoadvance' in gruppe.dataset) {
          window.setTimeout(() => zeigeSchritt(aktuellerSchritt + 1), 280);
        }
      });
    });
  });

  /* ---------- Chips (Mehrfachauswahl, optional) ---------- */
  form.querySelectorAll('[data-chips]').forEach(gruppe => {
    const key = gruppe.dataset.chips;
    gruppe.querySelectorAll('.wz-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('is-selected');
        antworten[key] = [...gruppe.querySelectorAll('.wz-chip.is-selected')].map(c => c.dataset.value);
      });
    });
  });

  /* ---------- Weiter / Zurück ---------- */
  form.querySelectorAll('.wz-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validiereSchritt(aktuellerSchritt)) zeigeSchritt(aktuellerSchritt + 1);
    });
  });
  form.querySelectorAll('.wz-back').forEach(btn => {
    btn.addEventListener('click', () => zeigeSchritt(aktuellerSchritt - 1));
  });

  /* ---------- Stellen-Buttons & Deep-Link setzen Stelle + springen zu Schritt 2 ---------- */
  function stelleVorwaehlen(stelle, scrollen) {
    const gruppe = form.querySelector('.wz-group[data-group="stelle"]');
    const opt = [...gruppe.querySelectorAll('.wz-option')].find(o =>
      o.dataset.value.toLowerCase().includes(stelle.toLowerCase()));
    if (!opt) return;
    antworten.stelle = opt.dataset.value;
    gruppe.querySelectorAll('.wz-option').forEach(o => o.classList.toggle('is-selected', o === opt));
    zeigeSchritt(2);
    if (scrollen) document.getElementById('bewerben').scrollIntoView({ behavior: 'smooth' });
  }

  document.querySelectorAll('.job-apply').forEach(btn => {
    btn.addEventListener('click', () => stelleVorwaehlen(btn.dataset.stelle || '', true));
  });

  const paramStelle = new URLSearchParams(location.search).get('stelle');
  if (paramStelle) stelleVorwaehlen(paramStelle, false);

  /* ---------- Sticky-Leiste ausblenden, wenn Formular sichtbar ---------- */
  const sticky = document.getElementById('sticky-apply');
  const bewerbenSection = document.getElementById('bewerben');
  if (sticky && bewerbenSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        sticky.style.transform = entry.isIntersecting ? 'translateY(110%)' : '';
        sticky.style.transition = 'transform 0.35s ease';
      });
    }, { rootMargin: '0px 0px -20% 0px' }).observe(bewerbenSection);
  }

  /* ---------- Absenden ---------- */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    formError.classList.add('hidden');
    if (!validiereSchritt(5)) return;

    /* Honeypot: Bots füllen das versteckte Feld — still "Erfolg" zeigen */
    if (form.firma.value) { showSuccess(); return; }

    /* Feld-Namen = Portal-Mapping: vorname/nachname/telefon/email → Standard-Felder,
       stelle/qualifikation/schweisserfahrung/start → Custom Fields, nachricht → message */
    const payload = {
      vorname: form.vorname.value.trim(),
      nachname: form.nachname.value.trim(),
      telefon: form.telefon.value.trim(),
      email: form.email.value.trim(),
      stelle: antworten.stelle || 'Nicht angegeben',
      qualifikation: antworten.qualifikation || '',
      schweisserfahrung: (antworten.schweisserfahrung || []).join(', '),
      start: antworten.start || '',
      nachricht: form.erfahrung.value.trim(),
    };

    setLoading(true);
    try {
      const res = await fetch(PORTAL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      showSuccess(payload.email ? T.erfolgMitMail : T.erfolgOhneMail);
      /* Conversion-Tracking (Meta Pixel, wird in Schritt 8 eingebunden) */
      if (typeof window.fbq === 'function') window.fbq('track', 'Lead');
    } catch (err) {
      console.error('Bewerbung fehlgeschlagen:', err);
      formError.textContent = T.fehler;
      formError.classList.remove('hidden');
    } finally {
      setLoading(false);
    }
  });

  /* ---------- UI-Zustände ---------- */
  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('opacity-60', loading);
    submitLabel.textContent = loading ? T.sendet : T.senden;
  }

  function showSuccess(hinweis) {
    form.classList.add('hidden');
    document.querySelector('.wz-progress-wrap')?.classList.add('hidden');
    erfolg.classList.remove('hidden');
    if (hinweis) {
      erfolgHinweis.textContent = hinweis;
      erfolgHinweis.classList.remove('hidden');
    }
    erfolg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (sticky) sticky.remove();
  }
});
