#!/usr/bin/env python3
"""Holt fehlende Referenzbilder aus dem Drive-Ordner „Referenzbilder" und erzeugt
optimierte Varianten (sauberes JPG + WebP) — für die Automatik. Nutzt denselben
Service-Account wie fetch-sheet (GOOGLE_APPLICATION_CREDENTIALS). Der Ordner muss
mit der Dienstkonto-E-Mail (Betrachter) geteilt sein.

Läuft NACH merge-sheet.py (braucht data/inhalte.json). Bereits vorhandene Bilder
werden nicht erneut geladen. Ein neues/geändertes Bild bitte mit NEUEM Dateinamen
hochladen, damit es erkannt wird.
"""
import os, io, json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")) + "/"
IMG_DIR = ROOT + "assets/img/"
FOLDER_ID = os.environ.get("REFERENZBILDER_FOLDER_ID") or "1f2jIQwwmm2ZcBLnd1g4D6_Mgc0Kt98T7"
MAX_W = 2000        # sehr große Uploads herunterskalieren
JPEG_Q = 86
WEBP_Q = 80

data = json.load(open(ROOT + "data/inhalte.json"))
needed = [r["bild"] for r in data.get("referenzen", [])
          if r.get("status") != "versteckt" and r.get("bild")]
missing = sorted({b for b in needed if not os.path.exists(IMG_DIR + b)})

if not missing:
    print("✓ fetch-images: alle Referenzbilder bereits vorhanden")
    raise SystemExit(0)

creds = service_account.Credentials.from_service_account_file(
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"],
    scopes=["https://www.googleapis.com/auth/drive.readonly"],
)
drive = build("drive", "v3", credentials=creds)


def find_in_folder(name):
    safe = name.replace("\\", "\\\\").replace("'", "\\'")
    q = f"'{FOLDER_ID}' in parents and name = '{safe}' and trashed = false"
    res = drive.files().list(q=q, fields="files(id,name)", pageSize=5).execute()
    return (res.get("files") or [None])[0]


def download(file_id, dest):
    buf = io.FileIO(dest, "wb")
    dl = MediaIoBaseDownload(buf, drive.files().get_media(fileId=file_id))
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.close()


os.makedirs(IMG_DIR, exist_ok=True)
got, problems = [], []
for name in missing:
    f = find_in_folder(name)
    if not f:
        problems.append(f"{name} (nicht im Ordner)")
        continue
    dest = IMG_DIR + name
    try:
        download(f["id"], dest)
        im = Image.open(dest).convert("RGB")            # Format normalisieren (auch falls PNG-Inhalt)
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)))
        im.save(dest, "JPEG", quality=JPEG_Q, optimize=True)
        im.save(os.path.splitext(dest)[0] + ".webp", "WEBP", quality=WEBP_Q, method=6)
        got.append(name)
    except Exception as e:
        problems.append(f"{name} (Bildfehler: {e})")
        for p in (dest, os.path.splitext(dest)[0] + ".webp"):
            if os.path.exists(p):
                os.remove(p)

print(f"✓ fetch-images: {len(got)} neu geladen+optimiert" + (" — " + ", ".join(got) if got else ""))
if problems:
    # Kein Abbruch: betroffene Referenzen werden von apply-content sauber übersprungen.
    print("⚠ fetch-images: übersprungen (Referenz erscheint noch nicht): " + "; ".join(problems))
