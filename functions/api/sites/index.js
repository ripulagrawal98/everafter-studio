import {error} from '../../../lib/sites.js';
// Legacy direct publishing is permanently disabled to prevent bypassing checkout.
export async function onRequestPost() {
  return error('Payment is required before publishing. Use checkout to create an invitation.',402);
}
