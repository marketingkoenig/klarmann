# Sicherung & Wiederherstellung

Seit dem Umzug auf GitHub ist die Website **mehrfach und automatisch gesichert**.
Es gibt keinen Einzelpunkt mehr, an dem alles verloren gehen könnte.

## Was jetzt automatisch gesichert ist

| Kopie | Was drin ist | Historie? |
|-------|--------------|-----------|
| **GitHub-Repo** (marketingkoenig/klarmann) | kompletter Website-Stand: Seiten, Inhalte (`inhalte.json`), Bilder | ✅ jede Änderung ein Wiederherstellungspunkt (Git-Historie) |
| **Lokaler Mac** (`~/Downloads/Klarmann`) | vollständige Kopie des Repos | ✅ (Git) |
| **Firebase Hosting** | die aktuell live geschaltete Version + letzte Releases | ✅ Release-Verlauf, 1-Klick-Rollback |
| **Google-Sheet** | die Inhalts-Quelle (Stellen/Referenzen) | ✅ Google-Versionsverlauf + Papierkorb |
| **Referenzbilder-Ordner (Drive)** | Originalfotos | ✅ Drive-Papierkorb |

Zusätzlich: Jeder automatische Veröffentlichungslauf **committet den erzeugten Stand
zurück ins Repo** – die komplette Änderungshistorie ist also nachvollziehbar.

## Im Notfall wiederherstellen

**Fall 1 – Falsche Inhalts-Änderung ist live gegangen**
Einfach im **Google-Sheet korrigieren** – der nächste Lauf (≤15 Min) stellt den
richtigen Stand automatisch wieder her. Das Sheet ist die „Wahrheit".
→ Muss es *sofort* weg: Firebase Console → Hosting → beim vorigen Release
`⋮ → Rollback`. Die Live-Seite springt sofort zurück.

**Fall 2 – Aus Versehen Zeilen im Sheet gelöscht/zerschossen**
Google-Sheet → *Datei → Versionsverlauf → frühere Version wiederherstellen*.
(Notfalls steht der letzte gute Datenstand auch als `data/inhalte.json` im Repo.)

**Fall 3 – Eine Code-/Vorlagen-Änderung hat etwas kaputt gemacht**
Im Repo den betreffenden Commit rückgängig machen:
```bash
cd ~/Downloads/Klarmann
git revert <commit-id>     # oder: git checkout <guter-commit> -- <datei>
git push
```
Die Sicherheitsprüfung (`check-site.mjs`) verhindert ohnehin, dass ein fehlerhafter
Stand deployt wird – bei einem Fehler bricht der Lauf ab, die Live-Seite bleibt unberührt.

**Fall 4 – GitHub-Konto/Repo verloren**
Es existieren weitere vollständige Kopien: der **lokale Mac** (`git push` in ein neues
Repo genügt) und der **letzte Live-Stand auf Firebase**.

## Das eine, was du noch tun solltest 🔐

Das GitHub-Konto **`marketingkoenig`** hält jetzt die gesamte Automatik **und** den
Deploy-Schlüssel. Deshalb: **Zwei-Faktor-Authentifizierung (2FA) aktivieren.**
→ GitHub → *Settings → Password and authentication → Two-factor authentication → Enable*.

Optional sinnvoll: eine zweite Person / die Organisation als Mitbesitzer des Repos
hinzufügen, damit der Zugang nicht an einem einzelnen Konto hängt.
