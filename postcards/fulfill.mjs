/*
 * fulfill.mjs — turn one approved order into one mailed postcard. The recipient
 * address lives in memory only: validated, passed to the provider, then dropped.
 * It is never logged, never written to disk, never committed. Your own return
 * address comes from env (LOB_FROM_*), also never in the repo.
 *
 *   import { fulfill } from './fulfill.mjs';
 *   await fulfill({ src: 'art-raft-for-crossing-v1.png', to: {...} }, { config, secrets });
 *
 * order.src must name an ENABLED card in catalog.json (pre-approved art only).
 */
import catalog from './catalog.json' with { type: 'json' };
import config from './config.json' with { type: 'json' };
import lob from './providers/lob.mjs';

const providers = { lob };

function fromAddress(secrets) {
  const f = {
    name: secrets.fromName, line1: secrets.fromLine1, city: secrets.fromCity,
    state: secrets.fromState, zip: secrets.fromZip
  };
  if (!f.name || !f.line1 || !f.zip) throw new Error('fulfill: set LOB_FROM_NAME / LINE1 / CITY / STATE / ZIP in env');
  return f;
}

export async function fulfill(order, { secrets, provider = config.provider, dry = false } = {}) {
  const card = catalog.cards.find((c) => c.src === order.src && c.enabled);
  if (!card) throw new Error('fulfill: unknown or disabled card: ' + order.src);

  const to = order.to;
  if (!to || !to.name || !to.line1 || !to.city || !to.zip) throw new Error('fulfill: incomplete recipient address');

  const frontUrl = config.site + config.frontFrom + card.src;   // hi-res original as the card front

  if (dry) {
    // Preview WITHOUT echoing the address — just prove routing.
    return { dry: true, card: card.src, size: card.size, provider, frontUrl, recipient: to.name.split(' ')[0] + ' (address withheld)' };
  }

  const res = await providers[provider].sendPostcard({
    frontUrl, backHtml: config.backHtml, to, from: fromAddress(secrets), size: card.size, secrets
  });
  // Return only non-PII: tracking id + what shipped. `to` goes out of scope here.
  return { ok: res.ok, tracking: res.id, size: card.size, provider };
}
