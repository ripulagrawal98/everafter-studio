# Everafter Studio — Wedding Website Builder

An independent Cloudflare Pages application for creating customizable wedding websites. It does not reuse, depend on, or modify any existing personal wedding website.

## Features
- Three original themes: Blossom, Royal Heritage, Modern Minimal
- Five curated color palettes plus independent hex/color-picker controls for background, cards, text and accents; live contrast warning
- Custom palettes persist in drafts and published site records (requires Cloudflare D1)
- Six independently selectable section designs (Welcome, Story, Celebrations, Gallery, Venue, Closing), with three layouts per section and instant preview
- Custom couple names, invitation messages, and 1–12 events
- Live mobile and desktop invitation previews
- Browser-saved drafts
- Cloudflare D1-backed publishing, updates, unpublishing and republishing (without losing the same URL)
- Public /s/<slug> invitation pages with Open Graph metadata
- Private edit keys stored in the owner's browser

## Customer accounts and Save & Continue Later

The customer builder supports **email one-time code sign-in**, private cloud drafts, autosave after edits (about 1 second idle), last-step restoration, and returning on a different browser or device. Existing browser-local draft saving remains available when customers are signed out or offline.

**Production setup (Cloudflare Pages only):**
1. Apply migration `migrations/0004_customer_drafts.sql` to the **same D1 database** already bound as `DB`. Apply earlier migrations first.
2. Configure secrets in Cloudflare Pages → Settings → Variables and Secrets:
   - `AUTH_SECRET`: a random secret at least 32 characters (PowerShell: `[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`).
   - `RESEND_API_KEY`: server-side API key from Resend.
   - `AUTH_EMAIL_FROM`: a sender address on a verified email domain, e.g. `Vow & Verse <login@yourdomain.com>`.
3. Redeploy the Cloudflare Pages project. The GitHub Pages preview has no email or D1 backend.
4. Test: Sign in with email → enter six-digit code → customize → wait for **All changes saved to cloud** → reopen on a different device and sign in again → check content and editor step are restored.

**Security and current limits:** Verification codes expire in 10 minutes, are one-time, hashed with a server secret, and allow a maximum of five attempts. Resend requests have a 60-second cooldown and ten codes per email per day. Verified sessions use HttpOnly Secure cookies and expire after 30 days. Requests remain protected by Cloudflare D1 access and server-side session checks. Consider Cloudflare WAF/Turnstile and IP rate-limiting before public launch to protect email sending and D1 write costs. Photos stored as public HTTPS URLs sync, but browser-only image backgrounds and local audio blobs cannot currently sync between devices; these need R2 storage. If a cloud draft exists, signing in loads that draft in preference to the unsigned local draft. Cloud sync uses version conflict detection; do not edit the same draft concurrently on two devices.

## Private Admin Dashboard

The admin dashboard is at `https://YOUR-CLOUDFLARE-DOMAIN/admin/`.
It shows pending/approved requests, full wedding details and contact information,
and provides **Approve & publish website** with the final shareable URL.
It is separate from the public customer builder.

Set the Cloudflare Pages secret `ADMIN_API_TOKEN` to a random value of at least
32 characters (e.g. `openssl rand -hex 32`) under Settings → Variables and Secrets.
Sign in by entering this token. The server checks the token and issues an
8-hour **HttpOnly, Secure, SameSite=Strict** signed session cookie; the token is
not stored in localStorage or in site source. Signing out clears the session.
D1 must be bound as `DB`; apply database migrations 0001–0003.

The /admin/ HTML and assets can be fetched publicly (they are only a sign-in
screen); **customer data and all publishing actions are server-side protected**.
GitHub Pages has no Cloudflare Functions/D1 and cannot provide a functioning
dashboard. Use the Cloudflare-hosted URL, not the GitHub Pages mirror.
A stronger production identity system (Cloudflare Access/SSO with MFA and rate
limiting) is recommended before handling significant volumes of customer data.

## Manual publication requests (payments coming soon)

Customers design and preview their site at no cost. Step 5 now offers **Contact admin to publish** rather than an unfinished payment page.

Set up the separate Cloudflare Pages application and D1 binding `DB`, then apply **all migrations in order**, including `migrations/0003_publication_requests.sql`. No `ADMIN_API_TOKEN` is needed to **collect requests**. Just bind D1 as `DB` and apply migration `0003_publication_requests.sql`. The optional `ADMIN_API_TOKEN` is only for the admin approval API, not reading records directly in Cloudflare D1.

`POST /api/publication-requests` saves the wedding draft privately, plus customer contact details. `GET /api/publication-requests/:id` lets that customer check status using their browser-local private key; the URL is returned only after approval.

Admin endpoints (HTTP Bearer `ADMIN_API_TOKEN`, **never put this secret in frontend code**):
- `GET /api/admin/requests` — list up to 100 recent requests and contacts.
- `POST /api/admin/requests/:id/approve` — approve, activate and return the final wedding URL.

Example using a terminal with your secret loaded into `$ADMIN_API_TOKEN`:

```bash
curl -H "Authorization: Bearer $ADMIN_API_TOKEN" https://YOUR-PAGES-DOMAIN/api/admin/requests
curl -X POST -H "Authorization: Bearer $ADMIN_API_TOKEN" https://YOUR-PAGES-DOMAIN/api/admin/requests/REQUEST_ID/approve
```

No admin dashboard or automated email notifications yet. For now, inspect the `publication_requests` table directly under Cloudflare D1 → Console. For example: `SELECT * FROM publication_requests ORDER BY created_at DESC;`. The protected admin API is optional for reviewing or approving, and is not necessary for request collection. GitHub Pages has no backend; request submission works only after Cloudflare D1 setup. Rate limits, abuse protection, retention/privacy policy and auth should be added before broad public access.

### Payment integration (paused)

The previous Razorpay checkout code is retained for future work, but the checkout creation, verification and webhook routes are now disabled. Do not use the old payment setup until it is deliberately re-enabled and retested.

## Previous Razorpay setup reference (inactive)

Customers design and preview free; **public wedding links are activated only after a captured payment**.

### Setup before accepting a real payment

1. Create a **separate** Cloudflare Pages production project, connected to this repository; add its own D1 binding named `DB`. GitHub Pages is static preview only and **does not collect payments**.
2. Apply `migrations/0001_init.sql` on a fresh database, then apply `migrations/0002_payments.sql`:
   ```sh
   npx wrangler d1 execute everafter-sites --remote --file=migrations/0001_init.sql
   npx wrangler d1 execute everafter-sites --remote --file=migrations/0002_payments.sql
   ```
   If the database already exists, apply **only migration 0002**. Its default `payment_status='paid'` deliberately preserves pre-existing published sites.
3. Create a Razorpay merchant account and obtain API credentials. Start with **Test mode**.
4. In **Cloudflare Pages → project → Settings → Variables and Secrets**, set:
   - `INVITE_PRICE_PAISE`: e.g. `49900` for ₹499 (change to your own price; server decides the charge).
   - `RAZORPAY_KEY_ID`: test or live key ID.
   - `RAZORPAY_KEY_SECRET`: secret; **never store in GitHub or browser**.
   - `RAZORPAY_WEBHOOK_SECRET`: a separately generated webhook signing secret.
5. In Razorpay dashboard, configure the webhook:
   - URL: `https://YOUR-CLOUDFLARE-DOMAIN/api/checkout/webhook`
   - Event: `payment.captured` (and optionally `order.paid`)
   - Webhook secret matching Cloudflare's secret.
6. Redeploy Pages and test purchase, cancellation, verification, webhook delivery, failed capture, refresh, and resuming a pending payment.
7. Switch to live keys **only after** payment account activation, refund policy, terms, and support process are ready.

Security: the browser receives an order ID, public key ID, amount and a private draft edit token. It receives **no wedding URL** until checkout confirmation and provider-side captured-payment verification. Direct `POST /api/sites` is disabled. The server checks signature, provider order ID, currency, amount and captured status before activation. Webhooks are HMAC-validated. The public page and API reject unpaid sites. Completed purchases can unpublish/republish at no additional charge.

**Limitations:** This is an initial checkout integration, not a fully operated storefront. Do not enable live payments before validating Cloudflare deployment, Razorpay webhooks, handling refunds/disputes, access recovery, taxes/receipts and abuse controls. Any uploaded image using browser-local data URLs cannot yet be published; add R2 first.

## Run locally (UI preview only)
```bash
python3 -m http.server 8788 --directory public
```
Open http://localhost:8788. Publishing requires Cloudflare Pages Functions and a D1 binding.

## Deploy to Cloudflare Pages
1. Create a new D1 database, e.g. `everafter-sites`.
2. Apply SQL: `npx wrangler d1 execute everafter-sites --remote --file=migrations/0001_init.sql`.
3. Create a **new, independent** Cloudflare Pages project connected to this repository.
4. Set build command to `exit 0`, output directory to `public`, and repository root to `/`.
5. Add a D1 binding called **DB** that points to the new database (production and previews). Apply migration 0002 and configure Razorpay secrets (above).
6. Redeploy and open the Pages URL.

## API
- `POST /api/sites`: Disabled for unpaid direct publication (HTTP 402)\n- `POST /api/checkout/create`: Create a private unpaid wedding draft and Razorpay order\n- `POST /api/checkout/verify`: Verify signed response AND captured provider payment; activate the website\n- `GET /api/checkout/status`: Authenticated pending-payment recovery\n- `POST /api/checkout/webhook`: Razorpay signed payment.captured event
- `GET /api/sites/:slug`: Load public invitation data; unpublished sites return 404 unless the owner sends a valid Bearer edit key
- `PATCH /api/sites/:slug`: Edit an existing site using the Bearer edit key, or send `{\"published\":false}` to unpublish and `{\"published\":true}` to republish
- `GET /s/:slug`: Wedding invitation with social metadata (404 while unpublished)

Unpublishing preserves the site's data, edit key, and unique URL. New sites must complete payment. Previously published sites remain live after applying migration 0002.

## Limitations
This is an MVP, not a production-ready multi-tenant service. Before public launch add authentication, ownership management, rate limits/Turnstile, image uploads, moderation, account recovery, privacy disclosures, monitoring, and customer-specific WhatsApp preview images. Anyone with a published wedding link can see its event details. Unpublished links return 404; previously shared or cached information cannot be revoked. Losing browser storage also loses the local edit key; there is no account recovery yet.

Run tests: `npm test`.
## Optional wedding background music

In the builder, open **Step 4 → Background music**. Music is off by default. Couples can select one of three built-in original instrumental melodies (synthesized in the browser, not commercial recordings), or choose an MP3, M4A, OGG or WAV song of their own. The invitation displays a Play / Pause control; audio **never autoplay**.

Uploaded songs are limited to **8 MB**. Before a site is approved, an uploaded song is available for a local preview on that device only. After admin approval, reopen the edit link and upload it again so it can be saved for guests. Visitors can only request the chosen song while the wedding site is published.

To enable published uploads, create a Cloudflare R2 bucket (for example `everafter-music`) and bind it to the Pages project with variable name **`MUSIC_BUCKET`** in both relevant deployment environments. Redeploy afterward. The authenticated endpoint `POST /api/music/:slug/` stores uploaded audio, while `GET /api/music/:slug/:file` serves only the currently selected audio of an active invitation. Users must hold the private edit key to upload or update preferences. R2 storage charges may apply.

Only provide music the user owns or has appropriate rights to distribute; the included melodies are generated on the fly and require no third-party recorded audio. The current feature is an MVP: storage quotas, content scanning, abuse protections, file replacement cleanup and improved playback seeking remain recommended before wide public launch.
