/* ============================================================
   Klarmann Cloud Functions
   Neue Bewerbung in Firestore → E-Mail an bewerbung@klarmann-edelstahl.de
   (inkl. Download-Link für den Lebenslauf, 7 Tage gültig)

   Setup: siehe ../FIREBASE-SETUP.md
   SMTP-Zugangsdaten als Secrets hinterlegen:
     firebase functions:secrets:set SMTP_HOST
     firebase functions:secrets:set SMTP_USER
     firebase functions:secrets:set SMTP_PASS
   ============================================================ */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');

const EMPFAENGER = 'bewerbung@klarmann-edelstahl.de';

exports.neueBewerbung = onDocumentCreated(
  {
    document: 'bewerbungen/{bewerbungId}',
    region: 'europe-west3',
    secrets: [SMTP_HOST, SMTP_USER, SMTP_PASS],
  },
  async (event) => {
    const daten = event.data && event.data.data();
    if (!daten) return;

    /* Lebenslauf: signierte Download-URL erzeugen (7 Tage gültig) */
    let cvLink = null;
    if (daten.cvPath) {
      try {
        const [url] = await admin.storage().bucket()
          .file(daten.cvPath)
          .getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        cvLink = url;
      } catch (err) {
        console.warn('Signierte URL fehlgeschlagen:', err.message);
      }
    }

    const zeilen = [
      `Stelle:    ${daten.stelle || '—'}`,
      `Name:      ${daten.name || '—'}`,
      `Telefon:   ${daten.telefon || '—'}`,
      `E-Mail:    ${daten.email || '—'}`,
      `Start:     ${daten.start || '—'}`,
      '',
      'Aktuelle Tätigkeit / Erfahrung:',
      daten.erfahrung || '—',
      '',
      cvLink ? `Lebenslauf (7 Tage gültig):\n${cvLink}` : 'Kein Lebenslauf hochgeladen.',
      '',
      `Firebase-Dokument: bewerbungen/${event.params.bewerbungId}`,
    ];

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port: 465,
      secure: true,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
    });

    await transporter.sendMail({
      from: `"Klarmann Website" <${SMTP_USER.value()}>`,
      to: EMPFAENGER,
      replyTo: daten.email || undefined,
      subject: `Neue Bewerbung: ${daten.stelle || 'unbekannt'} — ${daten.name || ''}`,
      text: zeilen.join('\n'),
    });

    console.log(`Bewerbung ${event.params.bewerbungId} per Mail zugestellt.`);
  }
);
