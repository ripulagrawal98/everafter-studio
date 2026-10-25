import {json,error} from '../../../lib/sites.js';
import {customerFromSession,cookieToken,clearCookie,validSameOrigin} from '../../../lib/customer-auth.js';
import {tokenHash} from '../../../lib/sites.js';
export async function onRequestGet({request,env}){
 const email=await customerFromSession(request,env);
 return email?json({authenticated:true,email}):json({authenticated:false});
}
export async function onRequestDelete({request,env}){
 if(!validSameOrigin(request))return error('Invalid origin.',403);
 const token=cookieToken(request);
 if(token&&env.DB)await env.DB.prepare('DELETE FROM customer_sessions WHERE session_hash=?').bind(await tokenHash(token)).run();
 return new Response(JSON.stringify({authenticated:false}),{headers:{
  'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':clearCookie()}});
}
