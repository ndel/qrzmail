# QRZMail

Next.js interface for qrzmail.com mailbox signup and login verification.

## Setup

Create `.env` from `.env.example` and set a mailcow API key:

```bash
cp .env.example .env
```

The API key must be created in mailcow as read/write and restricted to the web
server IP where this app runs.

## Run

```bash
npm install
npm run dev
```

Signup creates a mailbox through mailcow's server-side API. Login verifies the
mailbox password over IMAP and then links the user to SOGo webmail.

## Deploy notes

Do not expose `MAILCOW_API_KEY` to the browser. It must only exist in the
server environment used by Next.js.

If this runs on the same VPS as mailcow, keep Next.js on an internal port such
as `127.0.0.1:3000` and reverse proxy `qrzmail.com` to it. Mailcow already uses
ports 80 and 443 for `mail.qrzmail.com`, so a second public web server should
not bind those ports directly.

Public mailbox signup is abuse-sensitive. The signup API currently includes a
small per-IP rate limit, but production should also add CAPTCHA, email/phone
verification, invite codes, admin approval, or another anti-abuse step before
opening registration broadly.
