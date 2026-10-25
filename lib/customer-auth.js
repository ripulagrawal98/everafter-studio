// Cloudflare Pages customer sign-in. Only hashes are persisted in D1.
import {tokenHash,randomToken} from './sites.js';
const COOKIE='vv_customer_session';
export const SESSION_SECONDS=30*24*60*60;
const encoder=new TextEncoder();
export function normalizedEmail(value){
  const email=typeof value==='string'?value.trim().toLowerCase():'';
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');
  return email;
}
export function configured(env){
  return Boolean(env?.DB && typeof env?.AUTH_SECRET==='string' && env.AUTH_SECRET.length>=32
    && typeof env.RESEND_API_KEY==='string' && env.RESEND_API_KEY.length>=12
    && typeof env.AUTH_EMAIL_FROM==='string' && env.AUTH_EMAIL_FROM.includes('@'));
}
export function hasAuthSecret(env){return Boolean(env?.DB && typeof env?.AUTH_SECRET==='string' && env.AUTH_SECRET.length>=32);}
export function newCode(){return String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');}
export async function codeHash(secret,email,nonce,code){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const payload=email+'|'+nonce+'|'+code;
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode(payload));
  return Array.from(new Uint8Array(signature),n=>n.toString(16).padStart(2,'0')).join('');
}
export function equalHash(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;
  let diff=0;for(let i=0;i<64;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
export function sessionCookie(token,age=SESSION_SECONDS){
  return COOKIE+'='+token+'; Path=/; Max-Age='+age+'; HttpOnly; Secure; SameSite=Lax';
}
export function clearCookie(){return sessionCookie('',0);}
export function cookieToken(request){
  const found=(request.headers.get('cookie')||'').match(/(?:^|;\s*)vv_customer_session=([a-f0-9]{64})(?:;|$)/);
  return found?found[1]:null;
}
export async function customerFromSession(request,env){
  if(!env?.DB)return null;
  const token=cookieToken(request);if(!token)return null;
  const hash=await tokenHash(token),now=Math.floor(Date.now()/1000);
  const row=await env.DB.prepare('SELECT email FROM customer_sessions WHERE session_hash=? AND expires_at>?').bind(hash,now).first();
  return row?.email||null;
}
export async function makeSession(email,env){
  const token=randomToken(),now=Math.floor(Date.now()/1000);
  await env.DB.prepare('INSERT INTO customer_sessions(session_hash,email,expires_at,created_at) VALUES(?,?,?,?)')
    .bind(await tokenHash(token),email,now+SESSION_SECONDS,now).run();
  return token;
}
export async function sendCode(env,email,code,nonce){
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{'Authorization':'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'vv-'+nonce},
    body:JSON.stringify({from:env.AUTH_EMAIL_FROM,to:[email],subject:'Your Vow & Verse sign-in code',
      text:'Your Vow & Verse verification code is '+code+'. It expires in 10 minutes. Do not share it with anyone.'})
  });
  if(!response.ok)throw new Error('Email provider could not deliver your code.');
}
export function validSameOrigin(request){
  const origin=request.headers.get('origin');
  return origin===null || origin===new URL(request.url).origin;
}
