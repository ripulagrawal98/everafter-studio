import {json,error,isSameOrigin,tokenHash} from '../../../lib/sites.js';
import {verifyCheckoutSignature,razorpayRequest,validPaidPayment,activatePaidOrder,paymentConfigured} from '../../../lib/payments.js';
export async function onRequestPost({request,env}) {
 if(!isSameOrigin(request)) return error('Invalid origin',403);
 if(!env.DB||!paymentConfigured(env)) return error('Checkout is not configured.',503);
 try {
  const body=await request.json();
  if(!body||typeof body!=='object') return error('Invalid payment response');
  const {orderId,paymentId,signature,editToken}=body;
  if(!/^[a-f0-9]{64}$/.test(editToken||'')) return error('Private edit key is missing.',401);
  if(!await verifyCheckoutSignature(env.RAZORPAY_KEY_SECRET,orderId,paymentId,signature)) return error('Payment signature verification failed.',403);
  const order=await env.DB.prepare('SELECT * FROM checkout_orders WHERE order_id=?').bind(orderId).first();
  if(!order) return error('Payment order not found.',404);
  const site=await env.DB.prepare('SELECT edit_token_hash FROM sites WHERE slug=?').bind(order.slug).first();
  if(!site || await tokenHash(editToken)!==site.edit_token_hash) return error('Private edit key is incorrect.',403);
  const payment=await razorpayRequest(env,'GET','/payments/'+encodeURIComponent(paymentId));
  if(!validPaidPayment(payment,order)) return error('Payment has not been captured yet. Please retry verification shortly.',409);
  if(!await activatePaidOrder(env.DB,order,paymentId)) return error('Could not activate payment.',409);
  // Reveal the public URL only once payment is verified as captured.
  await env.DB.prepare("UPDATE sites SET data=json_set(data,'$.published',true) WHERE slug=? AND payment_status='paid'").bind(order.slug).run();
  return json({published:true,slug:order.slug,url:new URL(request.url).origin+'/s/'+order.slug});
 } catch(e) {console.error('Verify checkout:',e);return error('Unable to confirm payment. Please try again using the same order.',500);}
}
