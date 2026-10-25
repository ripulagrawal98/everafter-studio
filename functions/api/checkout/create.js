import {json,error,parseBody,slugify,randomToken,tokenHash,isSameOrigin} from '../../../lib/sites.js';
import {paymentConfigured,pricePaise,razorpayRequest} from '../../../lib/payments.js';
export async function onRequestPost({request,env}) {
 if(!isSameOrigin(request)) return error('Invalid origin',403);
 if(!env.DB||!paymentConfigured(env)) return error('Checkout is not configured yet.',503);
 try {
  const details=await parseBody(request), now=new Date().toISOString();
  // Create a private, unpaid draft, without an externally usable URL.
  const token=randomToken(), hash=await tokenHash(token);
  let slug;
  for(let i=0;i<5;i++){
   slug=slugify(details.partner1+'-'+details.partner2)+(i?'-'+crypto.randomUUID().slice(0,8):'');
   const existing=await env.DB.prepare('SELECT slug FROM sites WHERE slug = ?').bind(slug).first();
   if(!existing) break;
  }
  const order=await razorpayRequest(env,'POST','/orders',{
   amount:pricePaise(env),currency:'INR',receipt:crypto.randomUUID().slice(0,36),notes:{product:'everafter_wedding_site'}
  });
  if(!/^order_[A-Za-z0-9]+$/.test(order.id||'') || Number(order.amount)!==pricePaise(env) || order.currency!=='INR') throw Error('Invalid payment order');
  await env.DB.batch([
   env.DB.prepare('INSERT INTO sites (slug,data,edit_token_hash,created_at,updated_at,payment_status) VALUES (?,?,?,?,?,?)')
    .bind(slug,JSON.stringify({...details,published:false}),hash,now,now,'pending'),
   env.DB.prepare('INSERT INTO checkout_orders (order_id,slug,amount_paise,currency,status,created_at) VALUES (?,?,?,?,?,?)')
    .bind(order.id,slug,pricePaise(env),'INR','created',now)
  ]);
  return json({orderId:order.id,amount:pricePaise(env),currency:'INR',keyId:env.RAZORPAY_KEY_ID,slug,editToken:token},201);
 } catch(e) {
  if(/required|valid|too large|Invalid|Celebration|Please enter|maximum|HEX/.test(e.message||'')) return error(e.message);
  console.error('Create checkout:',e); return error('Could not start checkout.',500);
 }
}
