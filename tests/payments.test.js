import test from 'node:test';
import assert from 'node:assert/strict';
import {hmacHex,safeEqualHex,verifyCheckoutSignature,validPaidPayment,pricePaise,paymentConfigured} from '../lib/payments.js';

test('configured server price is authoritative and secrets required',()=>{
 const env={INVITE_PRICE_PAISE:'49900',RAZORPAY_KEY_ID:'rzp_test_demo',RAZORPAY_KEY_SECRET:'private'};
 assert.equal(pricePaise(env),49900);
 assert.equal(paymentConfigured(env),true);
 assert.equal(paymentConfigured({INVITE_PRICE_PAISE:'49900'}),false);
 assert.equal(pricePaise({INVITE_PRICE_PAISE:'0'}),null);
 assert.equal(pricePaise({INVITE_PRICE_PAISE:'notanumber'}),null);
});
test('validates provider HMAC signatures, and rejects forged callbacks', async()=>{
 const digest=await hmacHex('secret','order_123|pay_456');
 assert.equal(digest.length,64);
 assert.equal(await verifyCheckoutSignature('secret','order_123','pay_456',digest),true);
 assert.equal(await verifyCheckoutSignature('secret','order_123','pay_789',digest),false);
 assert.equal(await verifyCheckoutSignature('secret','order_123','pay_456','invalid'),false);
 assert.equal(safeEqualHex(digest,digest),true);
 assert.equal(safeEqualHex(digest,digest.slice(0,62)+'aa'),false);
});
test('requires captured payment matching server order amount and currency',()=>{
 const order={order_id:'order_123',amount_paise:49900,currency:'INR'};
 const captured={id:'pay_123',order_id:'order_123',status:'captured',amount:49900,currency:'INR'};
 assert.equal(validPaidPayment(captured,order),true);
 assert.equal(validPaidPayment({...captured,status:'authorized'},order),false);
 assert.equal(validPaidPayment({...captured,amount:100},order),false);
 assert.equal(validPaidPayment({...captured,order_id:'order_wrong'},order),false);
});
test('direct publication is disabled and unpaid sites require payment',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert.match(read('functions/api/sites/index.js'),/402/);
 assert.match(read('functions/api/sites/[slug].js'),/approved/);
 assert.match(read('functions/s/[slug].js'),/approved/);
 assert.match(read('functions/api/checkout/verify.js'),/503/);
 assert.match(read('functions/api/checkout/create.js'),/503/);
});
