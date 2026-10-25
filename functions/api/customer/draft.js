import {json,error} from '../../../lib/sites.js';
import {customerFromSession,validSameOrigin} from '../../../lib/customer-auth.js';
import {validate} from '../../../lib/sites.js';
export async function onRequestGet({request,env}){
 const email=await customerFromSession(request,env);if(!email)return error('Sign in to continue.',401);
 const row=await env.DB.prepare('SELECT data,last_step,version,updated_at FROM customer_drafts WHERE email=?').bind(email).first();
 return json(row?{exists:true,draft:JSON.parse(row.data),step:row.last_step,version:row.version,updatedAt:row.updated_at}:{exists:false});
}
export async function onRequestPut({request,env}){
 if(!validSameOrigin(request))return error('Invalid origin.',403);
 const email=await customerFromSession(request,env);if(!email)return error('Sign in to save.',401);
 try{
  const raw=await request.text();if(new TextEncoder().encode(raw).length>16000)return error('Draft too large.',413);
  const input=JSON.parse(raw),step=input.step,version=input.version;
  if(!Number.isInteger(step)||step<0||step>4||!Number.isInteger(version)||version<0)return error('Invalid draft version or step.');
  const d=input.draft;
  if(!d||typeof d!=='object'||Array.isArray(d))return error('Invalid draft.');
  // Do not store local data URL images; use R2 for future hosted media.
  if(d.background?.image?.startsWith('data:'))return error('Background image is local-only. Upload it to cloud storage before syncing.');
  // In-progress drafts may have incomplete event and couple details. Strict size limits still apply.
  const text=(v,max)=>typeof v==='string'&&v.length<=max;
  if(!['blossom','heritage','minimal'].includes(d.theme)||!text(d.partner1,70)||!text(d.partner2,70)||
   !Array.isArray(d.events)||d.events.length>12||JSON.stringify(d).length>14500)return error('Draft details are invalid.');
  for(const event of d.events){
   if(!event||!text(event.name,60)||!text(event.venue,140)||!text(event.date,10)||!text(event.time,5))return error('Invalid event details.');
  }
  const sanitized=structuredClone(d);
  if(sanitized.music?.url?.startsWith('blob:'))sanitized.music.url='';
  const now=new Date().toISOString(),payload=JSON.stringify(sanitized);
  const result=await env.DB.prepare('UPDATE customer_drafts SET data=?,last_step=?,version=version+1,updated_at=? WHERE email=? AND version=?')
    .bind(payload,step,now,email,version).run();
  if(result.meta?.changes)return json({saved:true,version:version+1,updatedAt:now});
  if(version!==0){
   const current=await env.DB.prepare('SELECT version FROM customer_drafts WHERE email=?').bind(email).first();
   return error('Your draft was updated elsewhere. Reload your cloud draft before saving.',409);
  }
  const inserted=await env.DB.prepare('INSERT INTO customer_drafts(email,data,last_step,version,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING')
    .bind(email,payload,step,1,now,now).run();
  return inserted.meta?.changes?json({saved:true,version:1,updatedAt:now}):error('Cloud draft already exists. Reload before saving.',409);
 }catch(e){if(e instanceof SyntaxError)return error('Invalid JSON.');console.error('Save draft failed',e);return error('Cloud save unavailable. Your local copy is retained.',503);}
}
