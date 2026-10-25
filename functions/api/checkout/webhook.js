import {error,json} from '../../../lib/sites.js';
import {verifyWebhookSignature,activatePaidOrder,validPaidPayment,razorpayRequest,paymentConfigured} from '../../../lib/payments.js';
export async function onRequestPost({request,env}) {
 if(!env.DB || !paymentConfigured(env) || !env.RAZORPAY_WEBHOOK_SECRET)return error('Webhook not configured.',503);
 const raw=await request.text();
 if(raw.length>200000)return error('Payload too large',413);
 if(!await verifyWebhookSignature(env.RAZORPAY_WEBHOOK_SECRET,raw,request.headers.get('X-Razorpay-Signature')))
  return error('Invalid webhook signature.',403);
 try{
  const event=JSON.parse(raw);
  if(!['payment.captured','order.paid'].includes(event.event))return json({received:true});
  const candidate=event.payload?.payment?.entity;
  // For order.paid with no payment object, lookup is intentionally skipped:
  // payment.captured is the authoritative activation signal.
  if(!candidate?.id || !candidate.order_id)return json({received:true});
  const order=await env.DB.prepare('SELECT * FROM checkout_orders WHERE order_id=?').bind(candidate.order_id).first();
  if(!order)return json({received:true});
  const payment=await razorpayRequest(env,'GET','/payments/'+encodeURIComponent(candidate.id));
  if(!validPaidPayment(payment,order))return error('Payment not captured.',409);
  if(!await activatePaidOrder(env.DB,order,payment.id))return error('Could not record captured payment.',409);
  await env.DB.prepare("UPDATE sites SET data=json_set(data,'$.published',true) WHERE slug=? AND payment_status='paid'").bind(order.slug).run();
  return json({received:true});
 }catch(e){console.error('Webhook failed',e);return error('Webhook processing error.',500);}
}
