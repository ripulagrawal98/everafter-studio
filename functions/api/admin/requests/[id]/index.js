import {json,error} from '../../../../../lib/sites.js';
import {adminAuthorized} from '../../../../../lib/manual-publishing.js';
export async function onRequestGet({request,env,params}){
 if(!await adminAuthorized(request,env))return error('Unauthorized.',401);
 if(!env.DB)return error('D1 database is not configured.',503);
 if(!/^[a-f0-9-]{36}$/.test(params.id||''))return error('Request not found.',404);
 const row=await env.DB.prepare(
  'SELECT r.id,r.slug,r.contact_name,r.email,r.phone,r.message,r.status,r.created_at,r.reviewed_at,s.data,s.payment_status FROM publication_requests r JOIN sites s ON s.slug=r.slug WHERE r.id=?'
 ).bind(params.id).first();
 if(!row)return error('Request not found.',404);
 let wedding;
 try{wedding=JSON.parse(row.data)}catch{return error('Wedding data is unavailable.',500);}
 const {data,...metadata}=row;
 return json({...metadata,wedding});
}
