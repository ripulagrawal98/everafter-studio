import {json,error,getDB,noDb,validSlug,tokenHash,isSitePublished,isSameOrigin} from '../../../../lib/sites.js';
const max=8*1024*1024;
const allowed={'audio/mpeg':'mp3','audio/mp3':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/ogg':'ogg','audio/wav':'wav','audio/x-wav':'wav'};
async function owned({params,env,request}){
  if(!validSlug(params.slug))return {response:error('Website not found.',404)};
  if(!isSameOrigin(request))return {response:error('Invalid origin.',403)};
  const db=getDB(env);if(!db)return {response:noDb()};
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!/^[a-f0-9]{64}$/.test(token))return {response:error('Private edit key required.',401)};
  const row=await db.prepare('SELECT edit_token_hash,payment_status,data FROM sites WHERE slug=?').bind(params.slug).first();
  if(!row || (await tokenHash(token))!==row.edit_token_hash)return {response:error('Website not found or edit key incorrect.',403)};
  if(!['paid','approved'].includes(row.payment_status))return {response:error('Publication must be approved before uploading music.',402)};
  return {row};
}
export async function onRequestPost(context){
  const {params,env,request}=context;
  const owner=await owned(context);if(owner.response)return owner.response;
  if(!env.MUSIC_BUCKET)return error('Music storage is not configured. Bind R2 as MUSIC_BUCKET.',503);
  const mime=(request.headers.get('content-type')||'').split(';')[0].toLowerCase();
  const ext=allowed[mime];if(!ext)return error('Upload an MP3, M4A, OGG or WAV audio file.');
  if(Number(request.headers.get('content-length')||0)>max)return error('Song must be 8 MB or smaller.',413);
  const bytes=await request.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>max)return error('Song must be 8 MB or smaller.',413);
  const id=crypto.randomUUID(), key='music/'+params.slug+'/'+id+'.'+ext;
  await env.MUSIC_BUCKET.put(key,bytes,{httpMetadata:{contentType:mime},customMetadata:{slug:params.slug}});
  return json({url:'/api/music/'+params.slug+'/'+id+'.'+ext});
}
