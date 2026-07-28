/*
 * Lob provider — print-and-mail a postcard via API (lob.com). Purpose-built for
 * postcards; you're a paying customer, so it's a stable, swappable dependency
 * (drop in a Stannp/PostGrid plugin the same way). Secret from env/Worker:
 * LOB_API_KEY.
 *
 * PII rule: the recipient address is passed straight to Lob to mail the one card
 * and is NOT returned, logged, or persisted here. The caller must not store it
 * either (see fulfill.mjs / README).
 *
 * NOTE: written to Lob's documented API but UNVERIFIED against the live API until
 * a real key exists — run once for real before trusting.
 */
const API = 'https://api.lob.com/v1/postcards';

// All cards are 4x6 — Lob's standard LANDSCAPE mail postcard. front/back accept
// a public image URL or HTML. Landscape images (fit 'crop') fill it directly;
// portrait/square images (fit 'border') must be supplied as a pre-matted front
// (image centered on a white 6x4 canvas) — that print-prep step is a TODO for
// live wiring; the raw hi-res original is passed for now.

export default {
  name: 'lob',

  async sendPostcard({ frontUrl, backUrl, backHtml, to, from, size, secrets }) {
    const key = secrets.lobApiKey;
    if (!key) throw new Error('lob: set LOB_API_KEY');
    const auth = 'Basic ' + Buffer.from(key + ':').toString('base64');

    const body = new URLSearchParams();
    body.set('to[name]', to.name);
    body.set('to[address_line1]', to.line1);
    if (to.line2) body.set('to[address_line2]', to.line2);
    body.set('to[address_city]', to.city);
    body.set('to[address_state]', to.state);
    body.set('to[address_zip]', to.zip);
    body.set('to[address_country]', to.country || 'US');
    body.set('from[name]', from.name);
    body.set('from[address_line1]', from.line1);
    body.set('from[address_city]', from.city);
    body.set('from[address_state]', from.state);
    body.set('from[address_zip]', from.zip);
    body.set('front', frontUrl);
    body.set('back', backUrl || backHtml || '<html><body></body></html>');
    body.set('size', '4x6');

    const res = await fetch(API, {
      method: 'POST', headers: { authorization: auth, 'content-type': 'application/x-www-form-urlencoded' }, body
    }).then((r) => r.json());
    if (!res.id) throw new Error('lob: send failed: ' + JSON.stringify(res).slice(0, 200));
    return { id: res.id, expectedDelivery: res.expected_delivery_date, ok: true };
    // NOTE: `res` intentionally not logged upstream — it echoes the address.
  }
};
