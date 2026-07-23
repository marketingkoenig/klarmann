# Zertifikats-PDFs — Ablage

Die Kunden-PDFs hier ablegen, exakt mit diesen Dateinamen:

- `ad-2000.pdf` — AD 2000 (HP 0 / HP 100R)
- `asme-u-stamp.pdf` — ASME U-Stamp
- `din-en-iso-3834-3.pdf` — DIN EN ISO 3834-3
- `din-en-1090-2.pdf` — DIN EN 1090-2
- `whg-fachbetrieb.pdf` — WHG-Fachbetrieb § 62 AwSV

Danach den Generator `gen-unternehmen.mjs` (Scratchpad) sowie `inject-seo.mjs` und
`patch-img-dims.mjs` erneut ausführen — die Karten auf zertifikate.html wechseln dann
automatisch von „Zertifikat als PDF anfragen" auf einen direkten
„Zertifikat ansehen (PDF, Größe)"-Button. Fehlt eine Datei, bleibt für dieses
Zertifikat der Anfrage-Link stehen.

Diese Datei (`.md`) wird vom Firebase-Hosting ignoriert und nicht veröffentlicht.
