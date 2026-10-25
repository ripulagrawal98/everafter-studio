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

## Manual publication requests (payments coming soon)

Customers design and preview their site at no cost. Step 5 now offers **Contact admin to publish** rather than an unfinished payment page.

Set up the separate Cloudflare Pages application and D1 binding `DB`, then apply **all migrations in order**, including `migrations/0003_publication_requests.sql`. Set Cloudflare secret `ADMIN_API_TOKEN` to a random value of at least 32 characters.

`POST /api/publication-requests` saves the wedding draft privately, plus customer contact details. `GET /api/publication-requests/:id` lets that customer check status using their browser-local private key; the URL is returned only after approval.

Admin endpoints (HTTP Bearer `ADMIN_API_TOKEN`, **never put this secret in frontend code**):
- `GET /api/admin/requests` — list up to 100 recent requests and contacts.
- `POST /api/admin/requests/:id/approve` — approve, activate and return the final wedding URL.

Example using a terminal with your secret loaded into `$ADMIN_API_TOKEN`:

```bash
curl -H "Authorization: Bearer $ADMIN_API_TOKEN" https://YOUR-PAGES-DOMAIN/api/admin/requests
curl -X POST -H "Authorization: Bearer $ADMIN_API_TOKEN" https://YOUR-PAGES-DOMAIN/api/admin/requests/REQUEST_ID/approve
```

No admin dashboard or automated email notifications yet: review the pending requests through the protected API, and send the approved URL to the customer using their submitted email or phone. GitHub Pages has no backend; request submission works only after Cloudflare D1 setup. Rate limits, abuse protection, retention/privacy policy and auth should be added before broad public access.

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