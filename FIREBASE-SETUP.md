> **VERALTET (20.07.2026):** Beide Formulare (Kontakt + Bewerbung) senden jetzt direkt
> an das MIH-Leadportal (mih-portal.de) — Endpoints via `php artisan setup:klarmann`,
> URLs in kontakt.html (Inline-Script) bzw. karriere.js (PORTAL_ENDPOINT).
> Firebase wird nur noch als HOSTING genutzt; die Firestore/Storage/Functions-Pipeline
> aus diesem Dokument ist nicht mehr nötig und nicht angebunden.

# Bewerbungsformular scharf schalten — Firebase-Setup

Das Formular auf `/karriere` läuft in zwei Modi:

- **Ohne Konfiguration (Stand jetzt):** Fallback — es öffnet sich eine vorbefüllte
  E-Mail an `bewerbung@klarmann-edelstahl.de`. Funktioniert sofort, aber ohne
  Datei-Upload und mit schlechterer Conversion.
- **Mit Firebase:** Bewerbung + Lebenslauf landen direkt in Firestore/Storage,
  eine Cloud Function schickt automatisch eine E-Mail an die Personalabteilung.

## Einmalige Einrichtung (ca. 15 Minuten)

Projekt: `klarmann-edelstahl-20260706` → [Firebase-Konsole](https://console.firebase.google.com)

1. **Blaze-Plan aktivieren** (Konsole → Zahnrad → Nutzung und Abrechnung).
   Nötig für Cloud Functions. Bei den erwarteten Bewerbungsmengen bleibt das
   praktisch immer im kostenlosen Kontingent (< 1 €/Monat).

2. **Produkte anlegen** (jeweils in der Konsole, Region `europe-west3` wählen):
   - Firestore Database → „Datenbank erstellen" → Produktionsmodus
   - Storage → „Jetzt starten"

3. **Web-App registrieren:** Projekteinstellungen → Allgemein → „Meine Apps"
   → Web-App hinzufügen (Name egal, kein Hosting-Häkchen nötig).
   Die angezeigte **SDK-Konfiguration** (apiKey, projectId, …) in
   [`karriere.js`](karriere.js) oben in `FIREBASE_CONFIG` eintragen.

4. **SMTP-Zugang für den Mailversand hinterlegen** (Postfach des Kunden oder
   z. B. ein `website@klarmann-edelstahl.de`-Konto):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase functions:secrets:set SMTP_HOST   # z.B. smtp.strato.de
   firebase functions:secrets:set SMTP_USER   # z.B. website@klarmann-edelstahl.de
   firebase functions:secrets:set SMTP_PASS
   ```

5. **Deploy:**
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only firestore:rules,storage:rules,functions,hosting
   ```

## Sicherheit (bereits konfiguriert)

- [`firestore.rules`](firestore.rules): Besucher dürfen Bewerbungen **nur anlegen**
  (mit Feld-Validierung) — niemals lesen. Zugriff nur über Konsole/Function.
- [`storage.rules`](storage.rules): Uploads nur unter `bewerbungen/`,
  max. 10 MB, nur PDF/JPG/PNG. Kein öffentliches Lesen.
- Honeypot-Feld im Formular fängt einfache Spam-Bots ab.

## Später (Schritt 8, vor Kampagnenstart)

- Meta Pixel einbinden — **erst nach Cookie-Consent** (DSGVO).
  Der `fbq('track','Lead')`-Aufruf ist in `karriere.js` schon vorbereitet.
- Datenschutzerklärung um Bewerbungsformular + Firebase + Pixel ergänzen.
- DSGVO-Löschkonzept: Bewerbungen nach 6 Monaten löschen (manuell oder
  per geplanter Function).
