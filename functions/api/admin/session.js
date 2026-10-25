import {json,error,isSameOrigin} from '../../../lib/sites.js';
import {adminAuthorized} from '../../../lib/manual-publishing.js';
import {createAdminSession,sessionCookie,expireSessionCookie} from '../../../lib/admin-session.js';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function onRequestGet({request,env}){
 if(!await adminAuthorized(request,env))return error('Not signed in.',401);
 return json({authenticated:true});
}
export async function onRequestPost({request,env}){
 if(!isSameOrigin(request))return error('Invalid origin.',403);
 if(typeof env?.ADMIN_API_TOKEN!=='string'||env.ADMIN_API_TOKEN.length<32)
   return error('Admin login is not configured. Add ADMIN_API_TOKEN to Cloudflare secrets.',503);
 if(!request.headers.get('content-type')?.includes('application/json'))
   return error('Expected JSON.',400);
 try{
  const body=await request.text();
  if(body.length>512)return error('Invalid request.',400);
  const {token}=JSON.parse(body);
  if(typeof token!=='string'||token.length<32||token.length>256)return error('Invalid access key.',401);
  const check=new Request(request.url,{headers:{Authorization:'Bearer '+token}});
  if(!await adminAuthorized(check,env))return error('Invalid access key.',401);
  const signed=await createAdminSession(env.ADMIN_API_TOKEN);
  return new Response(JSON.stringify({authenticated:true}),{status:200,headers:{...headers,
    'Content-Type':'application/json','Set-Cookie':sessionCookie(signed)}});
 }catch(e){return error('Invalid login request.',400);}
}
export async function onRequestDelete({request}){
 if(!isSameOrigin(request))return error('Invalid origin.',403);
 return new Response(JSON.stringify({authenticated:false}),{headers:{...headers,
    'Content-Type':'application/json','Set-Cookie':expireSessionCookie()}});
}
