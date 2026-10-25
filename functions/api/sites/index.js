import {json, error, parseBody, getDB, noDb, isSameOrigin, slugify, randomToken, tokenHash} from '../../../lib/sites.js';

export async function onRequestPost({request, env}) {
  if (!isSameOrigin(request)) return error('Cross-site publishing is not allowed.', 403);
  const db = getDB(env);
  if (!db) return noDb();
  try {
    const details = await parseBody(request);
    const base = slugify(`${details.partner1}-${details.partner2}`);
    const token = randomToken();
    const hashed = await tokenHash(token);
    const now = new Date().toISOString();
    let slug;
    for (let attempt = 0; attempt < 4; attempt++) {
      slug = attempt ? `${base}-${crypto.randomUUID().slice(0, 6)}` : base;
      const existing = await db.prepare('SELECT slug FROM sites WHERE slug = ?').bind(slug).first();
      if (existing) continue;
      try {
        await db.prepare('INSERT INTO sites (slug, data, edit_token_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind(slug, JSON.stringify({...details, published: true}), hashed, now, now).run();
        return json({slug, url: `${new URL(request.url).origin}/s/${slug}`, editToken: token, published: true}, 201);
      } catch (err) {
        if (!String(err.message || '').includes('UNIQUE constraint failed')) throw err;
      }
    }
    return error('Unable to reserve a unique website address. Please try again.', 409);
  } catch (err) {
    if (err instanceof Error && /required|valid|too large|maximum|must contain|submit|Invalid|Please enter|JSON|Celebration/.test(err.message)) return error(err.message);
    console.error('Create site failed', err);
    return error('Unable to publish right now.', 500);
  }
}