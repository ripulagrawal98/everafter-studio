import {validSlug, isSitePublished} from '../../lib/sites.js';
const escape = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function onRequestGet({params, env, request}) {
  if (!validSlug(params.slug)) return new Response('Invitation not found', {status:404});
  if (!env.DB) return new Response('Wedding database not configured', {status:503});
  const row = await env.DB.prepare('SELECT data, payment_status FROM sites WHERE slug = ?').bind(params.slug).first();
  if (!row || !['paid','approved'].includes(row.payment_status) || !isSitePublished(row)) return new Response('Invitation not found', {status:404, headers:{'Cache-Control':'no-store', 'X-Robots-Tag':'noindex'}});
  const data = JSON.parse(row.data);
  const title = `${data.partner1} & ${data.partner2} — Wedding Invitation`;
  const description = data.tagline || 'You are invited to celebrate with us.';
  const canonical = new URL(request.url).origin + '/s/' + params.slug;
  const assetResponse = await env.ASSETS.fetch(new URL('/index.html', request.url));
  if (!assetResponse.ok) return new Response('Invitation application unavailable', {status:503});
  const html = (await assetResponse.text())
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
    .replace('</head>', `<meta property="og:type" content="website" /><meta property="og:title" content="${escape(title)}" /><meta property="og:description" content="${escape(description)}" /><meta property="og:url" content="${escape(canonical)}" /><meta name="twitter:card" content="summary" /><link rel="canonical" href="${escape(canonical)}" /></head>`);
  return new Response(html, {headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin'}});
}