#!/usr/bin/env python3
"""Lädt das Redaktions-Sheet aus Google Drive herunter (als .xlsx) — für die
unbeaufsichtigte Automatik (GitHub Actions). Nutzt einen Google-Service-Account;
die Zugangsdaten kommen aus der Datei in GOOGLE_APPLICATION_CREDENTIALS.

Voraussetzung: Das Sheet ist mit der Service-Account-E-Mail (als „Betrachter")
geteilt und die Drive-API ist im Projekt aktiviert.

Aufruf:  python3 _generatoren/fetch-sheet.py [<file_id>] [<zielpfad>]
Default-File-ID: das Klarmann-Sheet; per Umgebungsvariable SHEET_FILE_ID überschreibbar.
"""
import os, sys, io
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")) + "/"
# os.environ.get(..., default) liefert bei GESETZTER, aber LEERER Variable "" statt
# des Defaults — daher `or`, damit eine leere SHEET_FILE_ID auf die Standard-ID fällt.
FILE_ID = (sys.argv[1] if len(sys.argv) > 1
           else os.environ.get("SHEET_FILE_ID") or "1WzebQaYVGuqtmMsxuz1UmPWgrpcjgNeP")
OUT = sys.argv[2] if len(sys.argv) > 2 else ROOT + "data/sheet-export.xlsx"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

creds = service_account.Credentials.from_service_account_file(
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"],
    scopes=["https://www.googleapis.com/auth/drive.readonly"],
)
drive = build("drive", "v3", credentials=creds)

meta = drive.files().get(fileId=FILE_ID, fields="mimeType,name").execute()
if meta["mimeType"] == "application/vnd.google-apps.spreadsheet":
    req = drive.files().export_media(fileId=FILE_ID, mimeType=XLSX)   # natives Google-Sheet → als xlsx exportieren
else:
    req = drive.files().get_media(fileId=FILE_ID)                     # bereits xlsx → direkt herunterladen

os.makedirs(os.path.dirname(OUT), exist_ok=True)
buf = io.FileIO(OUT, "wb")
downloader = MediaIoBaseDownload(buf, req)
done = False
while not done:
    _, done = downloader.next_chunk()
buf.close()
print(f"✓ fetch-sheet: '{meta['name']}' → {OUT}")
