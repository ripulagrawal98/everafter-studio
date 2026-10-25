// Short-lived, signed admin session. Cookie is HttpOnly and never readable by browser JS.
const NAME='vv_admin_session';
const TTL=8*60*60;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function mac(secret,payload){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload))));
}
function secureEqual(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
export async function createAdminSession(secret){
 if(typeof secret!=='string'||secret.length<32)throw Error('Admin secret not configured');
 const exp=Math.floor(Date.now()/1000)+TTL;
 const nonce=hex(crypto.getRandomValues(new Uint8Array(16)));
 const content='v1.'+exp+'.'+nonce;
 return content+'.'+await mac(secret,content);
}
export function sessionCookie(value){
 return NAME+'='+value+'; Path=/; Max-Age='+TTL+'; HttpOnly; Secure; SameSite=Strict';
}
export function expireSessionCookie(){
 return NAME+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict';
}
export async function validAdminSession(request,secret){
 if(typeof secret!=='string'||secret.length<32)return false;
 const cookie=request.headers.get('Cookie')||'';
 const m=cookie.match(new RegExp('(?:^|;\\s*)'+NAME+'=([^;]+)'));
 if(!m)return false;
 const v=m[1],p=v.split('.');
 if(p.length!==4||p[0]!=='v1'||!/^[0-9]{10}$/.test(p[1])||
    !/^[a-f0-9]{32}$/.test(p[2])||!/^[a-f0-9]{64}$/.test(p[3]))return false;
 const exp=Number(p[1]),now=Math.floor(Date.now()/1000);
 if(exp<=now||exp>now+TTL)return false;
 return secureEqual(await mac(secret,p.slice(0,3).join('.')),p[3]);
}
