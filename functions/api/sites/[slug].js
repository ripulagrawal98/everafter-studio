import {json, error, parseBody, getDB, noDb, validSlug, tokenHash, siteData, isSameOrigin} from '../../../lib/sites.js';

export async function onRequestGet({params, env}) {
  if (!validSlug(params.slug)) return error('Wedding website not found.', 404);
  const db = getDB(env);
  if (!db) return noDb();
  const row = await db.prepare('SELECT slug, data, updated_at FROM sites WHERE slug = ?').bind(params.slug).first();
  if (!row) return error('Wedding website not found.', 404);
  return json(siteData(row));
}
export async function onRequestPatch({params, env, request}) {
  if (!validSlug(params.slug)) return error('Wedding website not found.', 404);
  if (!isSameOrigin(request)) return error('Cross-site editing is not allowed.', 403);
  const db = getDB(env);
  if (!db) return noDb();
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[a-f0-9]{64}$/.test(token)) return error('A valid private edit key is required.', 401);
  const row = await db.prepare('SELECT edit_token_hash FROM sites WHERE slug = ?').bind(params.slug).first();
  if (!row) return error('Wedding website not found.', 404);
  if ((await tokenHash(token)) !== row.edit_token_hash) return error('Your private edit key is incorrect.', 403);
  try {
    const details = await parseBody(request);
    const now = new Date().toISOString();
    await db.prepare('UPDATE sites SET data = ?, updated_at = ? WHERE slug = ?').bind(JSON.stringify(details), now, params.slug).run();
    return json({slug: params.slug, url: `${new URL(request.url).origin}/s/${params.slug}`, updatedAt: now});
  } catch (err) {
    if (err instanceof Error && /required|valid|too large|maximum|must contain|submit|Invalid|Please enter|JSON|Celebration/.test(err.message)) return error(err.message);
    console.error('Update site failed', err);
    return error('Unable to update right now.', 500);
  }
}