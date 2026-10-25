// Shared Cloudflare Pages Functions helpers. No browser/client dependencies.
const VALID_THEMES = new Set(['blossom', 'heritage', 'minimal']);
const MAX_BYTES = 14_000;
const SECTION_DESIGNS = {
  hero:['centered','split','framed'], story:['classic','editorial','letter'],
  events:['cards','timeline','rows'], gallery:['grid','mosaic','filmstrip'],
  venue:['cards','list','highlight'], closing:['classic','framed','banner']
};
export const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
export const error = (message, status = 400) => json({error: message}, status);
export const validSlug = (slug) => typeof slug === 'string' && /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/.test(slug);
export const slugify = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'our-wedding';
export function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid wedding details.');
  const required = (value, label, max) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label} is required (maximum ${max} characters).`);
    return value.trim();
  };
  const optional = (value, label, max) => {
    if (value == null) return '';
    if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must contain no more than ${max} characters.`);
    return value.trim();
  };
  if (!VALID_THEMES.has(input.theme)) throw new Error('Please select a valid theme.');
  const partner1 = required(input.partner1, 'First partner name', 70);
  const partner2 = required(input.partner2, 'Second partner name', 70);
  const tagline = optional(input.tagline, 'Tagline', 180);
  const message = optional(input.message, 'Message', 240);
  // Only permit four named six-digit hex colors; never persist arbitrary CSS.
  let colors = null;
  if (input.colors !== undefined && input.colors !== null) {
    if (!input.colors || typeof input.colors !== 'object' || Array.isArray(input.colors) ||
      Object.keys(input.colors).some(key => !['background','surface','text','accent'].includes(key)) ||
      !['background','surface','text','accent'].every(key => typeof input.colors[key] === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.colors[key]))) {
      throw new Error('Colors must use valid six-digit HEX values for background, surface, text, and accent.');
    }
    colors = Object.fromEntries(['background','surface','text','accent'].map(key => [key,input.colors[key].toUpperCase()]));
  }
  const sectionDesignsInput = input.sectionDesigns ?? {};
  if (!sectionDesignsInput || typeof sectionDesignsInput !== 'object' || Array.isArray(sectionDesignsInput) ||
      Object.keys(sectionDesignsInput).some(k => !Object.hasOwn(SECTION_DESIGNS,k)) ||
      Object.entries(sectionDesignsInput).some(([k,v]) => !SECTION_DESIGNS[k].includes(v))) {
    throw new Error('Invalid section design selection.');
  }
  const sectionDesigns = Object.fromEntries(Object.entries(SECTION_DESIGNS).map(([key,variants])=>[
    key, sectionDesignsInput[key] ?? variants[0]
  ]));
  // Audio selections are stored as metadata, not embedded audio blobs.
  const musicInput = input.music ?? {enabled:false};
  if (!musicInput || typeof musicInput !== 'object' || Array.isArray(musicInput) || typeof musicInput.enabled !== 'boolean')
    throw new Error('Invalid music selection.');
  const allowedTunes = ['rose-piano','royal-waltz','morning-bells'];
  let music = {enabled:false,source:'preset',track:'rose-piano',url:''};
  if (musicInput.enabled) {
    if (musicInput.source === 'preset' && allowedTunes.includes(musicInput.track)) {
      music = {enabled:true,source:'preset',track:musicInput.track,url:''};
    } else if (musicInput.source === 'upload' && typeof musicInput.url === 'string' &&
      /^\/api\/music\/[a-z0-9][a-z0-9-]{0,78}[a-z0-9]\/[a-f0-9-]{36}\.(mp3|m4a|ogg|wav)$/.test(musicInput.url)) {
      music = {enabled:true,source:'upload',track:'',url:musicInput.url};
    } else if (musicInput.source === 'upload' && !musicInput.url) {
      // Draft may be submitted with a local-only upload; preserve off until stored on R2.
      music = {enabled:false,source:'upload',track:'',url:''};
    } else throw new Error('Choose a valid music track or upload an audio file.');
  }
  const story = optional(input.story, 'Story', 1200);
  const travelNote = optional(input.travelNote, 'Travel note', 240);
  const sections = {story:input.sections?.story !== false,gallery:input.sections?.gallery !== false,venue:input.sections?.venue !== false};
  const photos = (input.photos ?? []);
  if (!Array.isArray(photos) || photos.length > 6 || photos.some(p=>typeof p !== 'string' || p.length > 2048 || (p.trim() && !/^https:\/\//i.test(p.trim())))) throw new Error('Photos must be up to six HTTPS image URLs.');
  if (!Array.isArray(input.events) || !input.events.length || input.events.length > 12) throw new Error('Please enter 1 to 12 celebrations.');
  const events = input.events.map((ev, i) => {
    if (!ev || typeof ev !== 'object') throw new Error(`Celebration ${i + 1} is invalid.`);
    const name = required(ev.name, `Celebration ${i + 1} name`, 60);
    const venue = required(ev.venue, `Celebration ${i + 1} venue`, 140);
    const date = required(ev.date, `Celebration ${i + 1} date`, 10);
    const time = required(ev.time, `Celebration ${i + 1} time`, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date) throw new Error(`Celebration ${i + 1} needs a valid date.`);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Celebration ${i + 1} needs a valid time.`);
    return {id: typeof ev.id === 'string' ? ev.id.slice(0, 80) : String(i), name, venue, date, time};
  });
  return {theme: input.theme, colors, sectionDesigns, partner1, partner2, tagline, message, story, travelNote, sections, photos:photos.map(p=>p.trim()).filter(Boolean), music, events};
}
export async function parseBody(request, {allowStatus = false} = {}) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error('Submit wedding details as JSON.');
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BYTES) throw new Error('Wedding details are too large.');
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('Wedding details are too large.');
  try {
    const input = JSON.parse(text);
    if (allowStatus && input && typeof input === 'object' && !Array.isArray(input) && Object.hasOwn(input, 'published')) {
      if (Object.keys(input).length !== 1 || typeof input.published !== 'boolean') throw new Error('Invalid publishing status.');
      return {published: input.published};
    }
    return validate(input);
  } catch(e) { if (e instanceof SyntaxError) throw new Error('Invalid JSON request.'); throw e; }
}
export function getDB(env) { return env?.DB || null; }
export function noDb() { return error('Database is not configured. Bind a Cloudflare D1 database named DB.', 503); }
export async function tokenHash(token) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function randomToken() { return [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2,'0')).join(''); }
export function isSitePublished(row) { return JSON.parse(row.data).published !== false; }
export function siteData(row) { const site = JSON.parse(row.data); return {...site, published: site.published !== false, slug: row.slug, updatedAt: row.updated_at}; }
export function protectResponse(res) { res.headers.set('X-Content-Type-Options','nosniff'); res.headers.set('Referrer-Policy','strict-origin-when-cross-origin'); return res; }
export function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  return origin === null || origin === new URL(request.url).origin;
}