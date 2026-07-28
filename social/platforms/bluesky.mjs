/*
 * Bluesky plugin (AT Protocol). Open, honest API — no app review, no caprice.
 * Secrets from env: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD (an app password, not
 * your login). Accepts WebP directly. Links are clickable via a facet.
 *
 * NOTE: the post() path is written to the documented AT Protocol but is
 * UNVERIFIED against the live API until real credentials exist — keep the
 * platform disabled / dry-run until you have run it once for real.
 */
const PDS = 'https://bsky.social';

export default {
  name: 'bluesky',

  // Clickable link, so the URL rides in the text.
  formatText(cfg) {
    return `${cfg.invitation}\n${cfg.link}`;
  },

  async post({ text, imageBytes, imageMime, altText, cfg, secrets }) {
    const handle = secrets.blueskyHandle;
    const pass = secrets.blueskyAppPassword;
    if (!handle || !pass) throw new Error('bluesky: set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD');

    const sess = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: pass })
    }).then((r) => r.json());
    const auth = { authorization: `Bearer ${sess.accessJwt}` };

    const blob = await fetch(`${PDS}/xrpc/com.atproto.repo.uploadBlob`, {
      method: 'POST', headers: { ...auth, 'content-type': imageMime }, body: imageBytes
    }).then((r) => r.json());

    // Facet so the URL is a real, tappable link.
    const enc = new TextEncoder();
    const byteStart = enc.encode(text.slice(0, text.indexOf(cfg.link))).length;
    const facets = [{
      index: { byteStart, byteEnd: byteStart + enc.encode(cfg.link).length },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: cfg.link }]
    }];

    const record = {
      $type: 'app.bsky.feed.post', text, facets, createdAt: new Date().toISOString(),
      embed: { $type: 'app.bsky.embed.images', images: [{ alt: altText, image: blob.blob }] }
    };
    const res = await fetch(`${PDS}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ repo: sess.did, collection: 'app.bsky.feed.post', record })
    }).then((r) => r.json());
    return { url: res.uri, ok: !!res.uri };
  }
};
