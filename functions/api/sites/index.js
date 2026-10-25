import {error} from '../../../lib/sites.js';
// Legacy direct publishing is permanently disabled to prevent bypassing checkout.
export async function onRequestPost() {
  return error('Publishing requires admin approval. Submit a website request.',402);
}
