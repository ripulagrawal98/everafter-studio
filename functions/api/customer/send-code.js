import {json,error} from '../../../lib/sites.js';
import {normalizedEmail,configured,newCode,codeHash,sendCode,validSameOrigin} from '../../../lib/customer-auth.js';
export async function onRequestPost({request,env}){
 if(!validSameOrigin(request))return error('Invalid origin.',403);
 if(!configured(env))return error('Email sign-in is not configured.',503);
 try{
  if(Number(request.headers.get('content-length')||0)>1024)return error('Invalid request.',413);
  const raw=await request.text();if(raw.length>1024)return error('Invalid request.',413);
  const email=normalizedEmail(JSON.parse(raw).email),now=Math.floor(Date.now()/1000);
  const row=await env.DB.prepare('SELECT next_send_at,sent_today,day_bucket FROM customer_login_codes WHERE email=?').bind(email).first();
  const today=new Date().toISOString().slice(0,10);
  if(row?.next_send_at>now)return error('Please wait a minute before requesting another code.',429);
  const sent=row?.day_bucket===today?row.sent_today:0;
  if(sent>=10)return error('Daily verification code limit reached.',429);
  const code=newCode(),nonce=crypto.randomUUID(),hash=await codeHash(env.AUTH_SECRET,email,nonce,code);
  await env.DB.prepare('INSERT INTO customer_login_codes(email,code_hash,nonce,expires_at,next_send_at,sent_today,day_bucket,attempts) VALUES(?,?,?,?,?,?,?,0) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash,nonce=excluded.nonce,expires_at=excluded.expires_at,next_send_at=excluded.next_send_at,sent_today=excluded.sent_today,day_bucket=excluded.day_bucket,attempts=0 WHERE customer_login_codes.next_send_at<=?')
    .bind(email,hash,nonce,now+600,now+60,sent+1,today,now).run();
  await sendCode(env,email,code,nonce);
  return json({sent:true});
 }catch(e){if(e.message?.includes('valid email'))return error(e.message);console.error('Send OTP failed',e);return error('Unable to send the verification code. Try again.',503);}
}
