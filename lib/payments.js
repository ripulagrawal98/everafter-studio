// Razorpay integration shared across Cloudflare Pages Functions.
// Secret and quoted price are exclusively server-side. Fail closed if missing.
export function pricePaise(env) {
  const raw = String(env?.INVITE_PRICE_PAISE || '');
  if (!/^[1-9][0-9]{2,7}$/.test(raw)) return null;
  const amount = Number(raw);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function paymentConfigured(env) {
  return Boolean(pricePaise(env) && env?.RAZORPAY_KEY_ID && env?.RAZORPAY_KEY_SECRET);
}

export async function hmacHex(secret, text) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(text));
  return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
}
export function safeEqualHex(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  let result=0;
  for(let i=0;i<64;i++) result|=a.toLowerCase().charCodeAt(i)^b.toLowerCase().charCodeAt(i);
  return result===0;
}

export async function verifyCheckoutSignature(secret,orderId,paymentId,signature) {
  if (!/^order_[A-Za-z0-9]+$/.test(orderId||'') || !/^pay_[A-Za-z0-9]+$/.test(paymentId||'')) return false;
  return safeEqualHex(await hmacHex(secret,orderId+'|'+paymentId),signature);
}
export async function verifyWebhookSignature(secret,rawBody,signature) {
  return safeEqualHex(await hmacHex(secret,rawBody),signature);
}

export async function razorpayRequest(env, method, path, data) {
  const auth=btoa(env.RAZORPAY_KEY_ID+':'+env.RAZORPAY_KEY_SECRET);
  const response=await fetch('https://api.razorpay.com/v1'+path,{
    method,
    headers:{'Authorization':'Basic '+auth,'Content-Type':'application/json'},
    ...(data?{body:JSON.stringify(data)}:{})
  });
  if (!response.ok) throw new Error('Razorpay request failed ('+response.status+').');
  return response.json();
}

export function validPaidPayment(payment,order) {
  return Boolean(payment && order &&
    payment.status==='captured' &&
    payment.order_id===order.order_id &&
    payment.id && /^pay_[A-Za-z0-9]+$/.test(payment.id) &&
    Number(payment.amount)===Number(order.amount_paise) &&
    payment.currency===order.currency
  );
}

export async function activatePaidOrder(db,order,paymentId) {
  const now=new Date().toISOString();
  // Idempotent: payment_id can be recorded just once, and the site is never
  // activated without the linked provider order being verified as captured.
  await db.batch([
    db.prepare("UPDATE checkout_orders SET status = 'paid', payment_id = ?, paid_at = COALESCE(paid_at, ?) WHERE order_id = ? AND status IN ('created','paid') AND (payment_id IS NULL OR payment_id = ?)")
      .bind(paymentId,now,order.order_id,paymentId),
    db.prepare("UPDATE sites SET payment_status = 'paid', updated_at = ? WHERE slug = ? AND EXISTS (SELECT 1 FROM checkout_orders WHERE order_id = ? AND status = 'paid' AND payment_id = ?)")
      .bind(now,order.slug,order.order_id,paymentId)
  ]);
  const row=await db.prepare('SELECT status, payment_id FROM checkout_orders WHERE order_id = ?').bind(order.order_id).first();
  return row?.status==='paid' && row?.payment_id===paymentId;
}
