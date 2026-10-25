import {json,error,tokenHash,isSameOrigin} from '../../../lib/sites.js';
export async function onRequestGet({request,env}) {
 if(!isSameOrigin(request)) return error('Invalid origin',403);
 if(!env.DB) return error('Database not configured',503);
 const url=new URL(request.url),id=url.searchParams.get('orderId');
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!/^order_[A-Za-z0-9]+$/.test(id||'') || !/^[a-f0-9]{64}$/.test(token))return error('Invalid order credentials.',401);
 const order=await env.DB.prepare('SELECT order_id,slug,status FROM checkout_orders WHERE order_id=?').bind(id).first();
 if(!order)return error('Order not found',404);
 const site=await env.DB.prepare('SELECT edit_token_hash,payment_status FROM sites WHERE slug=?').bind(order.slug).first();
 if(!site || await tokenHash(token)!==site.edit_token_hash)return error('Invalid edit key',403);
 const paid=site.payment_status==='paid' && order.status==='paid';
 return json(paid?{paid:true,slug:order.slug,url:new URL(request.url).origin+'/s/'+order.slug}:{paid:false});
}
