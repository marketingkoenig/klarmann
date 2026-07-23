# Automatische Veröffentlichung aus dem Google-Sheet

Der Kunde pflegt Stellen & Referenzen im Google-Sheet. Ein GitHub-Actions-Workflow
prüft das Sheet **alle 15 Minuten**, baut die Seiten neu und schaltet Änderungen
automatisch auf Firebase live – ohne dass jemand etwas anfassen muss.

```
Google-Sheet  →  fetch-sheet.py  →  merge-sheet.py  →  sync.mjs (Seiten bauen + prüfen)  →  firebase deploy
   (Drive)        (lädt Sheet)      (→ inhalte.json)     (apply-content, css, check-site)      (nur bei Änderung)
```

Der Workflow liegt in `.github/workflows/publish.yml`. Beim späteren **Host-Wechsel**
muss nur der eine Schritt „Auf Firebase veröffentlichen" ausgetauscht werden – alles
davor bleibt gleich.

---

## Einmalige Einrichtung (ca. 20–30 Min)

### 1. GitHub-Repo anlegen und Projekt hochladen
Privates Repo auf github.com anlegen (z. B. `klarmann-website`), dann lokal:

```bash
cd ~/Downloads/Klarmann
git remote add origin https://github.com/MarketingKoenigGmbH/klarmann.git
git branch -M main
git push -u origin main
```
(Das Repo ist lokal bereits mit einem ersten Commit vorbereitet.)

### 2. Service-Account in Google Cloud anlegen
Ein einziger Schlüssel erledigt **beides** – Sheet lesen **und** auf Firebase deployen.

1. Google Cloud Console → Projekt **klarmann-edelstahl** auswählen
   (console.cloud.google.com, oben das Firebase-Projekt wählen).
2. **APIs aktivieren:** „APIs & Dienste" → aktiviere **Google Drive API** und
   **Firebase Hosting API**.
3. **IAM & Verwaltung → Dienstkonten → „Dienstkonto erstellen":**
   - Name: z. B. `sheet-publish`
   - Rolle zuweisen: **Firebase Hosting Admin**
   - Fertigstellen.
4. Beim erstellten Dienstkonto → **Schlüssel → Schlüssel hinzufügen → JSON** →
   Datei wird heruntergeladen. **Diese Datei ist geheim** – niemals ins Repo legen.
5. Notiere die **E-Mail des Dienstkontos** (endet auf `…iam.gserviceaccount.com`).

### 3. Sheet für das Dienstkonto freigeben
Das Google-Sheet **„Klarmann-Website-Inhalte"** öffnen → **Teilen** → die
Dienstkonto-E-Mail aus Schritt 2.5 als **Betrachter** hinzufügen.
(So darf der Automatik-Dienst das Sheet lesen.)

### 4. GitHub-Secret hinterlegen
Im GitHub-Repo → **Settings → Secrets and variables → Actions → New repository secret:**
- **Name:** `GCP_SA_KEY`
- **Wert:** den **kompletten Inhalt** der JSON-Datei aus Schritt 2.4 einfügen.

*(Optional, nur falls sich die Sheet-Datei-ID mal ändert: unter „Variables" eine
Variable `SHEET_FILE_ID` mit der neuen ID anlegen. Sonst wird die aktuelle ID
automatisch verwendet.)*

### 5. Testen
Im Repo → **Actions → „Website aus Google-Sheet veröffentlichen" → „Run workflow".**
- Läuft er grün durch und es gab keine Änderung → „Keine Seitenänderung".
- Ändere testweise im Sheet eine Zeile (z. B. Status `geschlossen`) und starte erneut →
  der Workflow deployt und der Kunde sieht es kurz darauf live.

Danach läuft alles von selbst alle 15 Minuten.

---

## So veröffentlicht der Kunde künftig
1. Zeile im Google-Sheet ändern (Status, Text, neue Stelle/Referenz, Bild in den
   Ordner „Referenzbilder").
2. **Nichts weiter tun.** Innerhalb von ~15 Minuten ist es live.

## Sicherheits-Netz
- Findet die Prüfung (`check-site.mjs`) einen Fehler, **bricht der Workflow ab und
  deployt NICHT** – die Live-Seite bleibt unverändert.
- Der Workflow schreibt die neu erzeugten Seiten ins Repo zurück (Verlauf/Historie).

## Host-Wechsel später
Im Workflow nur den Schritt **„Auf Firebase veröffentlichen"** durch den Upload des
neuen Hosters ersetzen (z. B. `rsync`, `git push`, provider-eigene Action). Der Rest
der Automatik bleibt unverändert.
