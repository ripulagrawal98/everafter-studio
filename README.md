# Everafter Studio — Wedding Website Builder

An independent Cloudflare Pages application for creating customizable wedding websites. It does not reuse, depend on, or modify any existing personal wedding website.

## Features
- Three original themes: Blossom, Royal Heritage, Modern Minimal
- Five curated color palettes plus independent hex/color-picker controls for background, cards, text and accents; live contrast warning
- Custom palettes persist in drafts and published site records (requires Cloudflare D1)
- Custom couple names, invitation messages, and 1–12 events
- Live mobile and desktop invitation previews
- Browser-saved drafts
- Cloudflare D1-backed publishing and updates
- Public /s/<slug> invitation pages with Open Graph metadata
- Private edit keys stored in the owner's browser

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
5. Add a D1 binding called **DB** that points to the new database (production and previews).
6. Redeploy and open the Pages URL.

## API
- `POST /api/sites`: Publish a site; returns URL and edit key
- `GET /api/sites/:slug`: Load public invitation data
- `PATCH /api/sites/:slug`: Edit an existing site using Bearer edit key
- `GET /s/:slug`: Wedding invitation with social metadata

## Limitations
This is an MVP, not a production-ready multi-tenant service. Before public launch add authentication, ownership management, rate limits/Turnstile, image uploads, moderation, account recovery, privacy disclosures, monitoring, and customer-specific WhatsApp preview images. Anyone with a wedding link can see its event details. Losing browser storage also loses the local edit key; there is no account recovery yet.

Run tests: `npm test`.