import {json} from '../../../lib/sites.js';
import {paymentConfigured, pricePaise} from '../../../lib/payments.js';
export async function onRequestGet({env}) {
  // The public price can be displayed; secret keys and private provider configuration cannot.
  const configured=Boolean(env?.DB && paymentConfigured(env));
  return json({configured,currency:'INR',amount:configured?pricePaise(env):null});
}
