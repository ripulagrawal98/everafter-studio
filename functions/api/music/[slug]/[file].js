import {validSlug,error,isSitePublished,getDB} from '../../../../lib/sites.js';
export async function onRequestGet({params,env}){
  if(!validSlug(params.slug) || !/^[a-f0-9-]{36}\.(mp3|m4a|ogg|wav)$/.test(params.file))return error('Audio not found.',404);
  if(!env.MUSIC_BUCKET)return error('Music storage is not configured.',503);
  const db=getDB(env);if(!db)return error('Audio not found.',404);
  const row=await db.prepare('SELECT data,payment_status FROM sites WHERE slug=?').bind(params.slug).first();
  if(!row || !['paid','approved'].includes(row.payment_status) || !isSitePublished(row))return error('Audio not found.',404);
  const data=JSON.parse(row.data);
  const expected='/api/music/'+params.slug+'/'+params.file;
  if(!data.music?.enabled||data.music.source!=='upload'||data.music.url!==expected)return error('Audio not found.',404);
  const object=await env.MUSIC_BUCKET.get('music/'+params.slug+'/'+params.file);
  if(!object)return error('Audio not found.',404);
  const headers=new Headers({'Content-Type':object.httpMetadata?.contentType||'audio/mpeg','Cache-Control':'private,max-age=3600','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
  return new Response(object.body,{headers});
}
