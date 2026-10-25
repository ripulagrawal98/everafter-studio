import {json,error} from '../../../lib/sites.js';
import {normalizedEmail,hasAuthSecret,codeHash,equalHash,makeSession,sessionCookie,validSameOrigin} from '../../../lib/customer-auth.js';
export async function onRequestPost({request,env}){
 if(!validSameOrigin(request))return error('Invalid origin.',403);
 if(!hasAuthSecret(env))return error('Email sign-in is not configured.',503);
 try{
  const raw=await request.text();if(raw.length>1024)return error('Invalid request.',413);
  const input=JSON.parse(raw),email=normalizedEmail(input.email),code=String(input.code||'');
  if(!/^\d{6}$/.test(code))return error('Enter the six-digit verification code.');
  const now=Math.floor(Date.now()/1000);
  const row=await env.DB.prepare('SELECT code_hash,nonce,expires_at,attempts FROM customer_login_codes WHERE email=?').bind(email).first();
  if(!row||row.expires_at<=now||row.attempts>=5)return error('Code expired or too many attempts. Request a new code.',401);
  // Claim exactly one attempt before checking to prevent parallel guesses.
  const claim=await env.DB.prepare('UPDATE customer_login_codes SET attempts=attempts+1 WHERE email=? AND nonce=? AND attempts<5').bind(email,row.nonce).run();
  if(!claim.meta?.changes)return error('Please request a new verification code.',401);
  const candidate=await codeHash(env.AUTH_SECRET,email,row.nonce,code);
  if(!equalHash(row.code_hash,candidate))return error('Incorrect code. Please try again.',401);
  const used=await env.DB.prepare('DELETE FROM customer_login_codes WHERE email=? AND nonce=? AND code_hash=?').bind(email,row.nonce,row.code_hash).run();
  if(!used.meta?.changes)return error('Code already used.',401);
  const token=await makeSession(email,env);
  return new Response(JSON.stringify({authenticated:true,email}),{headers:{
   'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':sessionCookie(token)}});
 }catch(e){if(e.message?.includes('valid email'))return error(e.message);console.error('Verify OTP failed',e);return error('Unable to verify the code.',500);}
}
