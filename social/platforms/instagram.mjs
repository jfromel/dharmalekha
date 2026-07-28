/*
 * Instagram plugin (Graph Content Publishing API). The fragile one: needs a
 * Business/Creator account, a Meta app, and a long-lived token you refresh
 * ~every 60 days. Captions can't hold a clickable link — the invitation points
 * to the bio. The API requires a public JPEG image_url (not WebP/PNG), so this
 * uses a .jpg variant (generate one alongside the gallery when wiring live).
 *
 * Secrets from env: IG_USER_ID, IG_ACCESS_TOKEN.
 *
 * NOTE: written to the documented Graph API but UNVERIFIED against the live API
 * until real credentials exist — keep disabled / dry-run until proven.
 */
const GRAPH = 'https://graph.facebook.com/v21.0';

export default {
  name: 'instagram',

  // No clickable link in a feed caption — the URL is text; the live link is in bio.
  formatText(cfg) {
    return `${cfg.invitation} ${cfg.emoji}\n${cfg.link.replace(/^https?:\/\//, '')} · link in bio`;
  },

  // Instagram publishes from a public URL, so it takes imageUrl (not bytes).
  async post({ text, imageUrl, cfg, secrets }) {
    const igUserId = secrets.igUserId;
    const token = secrets.igAccessToken;
    if (!igUserId || !token) throw new Error('instagram: set IG_USER_ID and IG_ACCESS_TOKEN');
    const jpegUrl = imageUrl.replace(/\.webp$/, '.jpg'); // requires a JPEG variant on the site

    const create = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_url: jpegUrl, caption: text, access_token: token })
    }).then((r) => r.json());
    if (!create.id) throw new Error('instagram: media create failed: ' + JSON.stringify(create));

    const pub = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: create.id, access_token: token })
    }).then((r) => r.json());
    return { url: pub.id ? `ig:${pub.id}` : null, ok: !!pub.id };
  }
};
