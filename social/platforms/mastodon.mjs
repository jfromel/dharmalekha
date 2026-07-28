/*
 * Mastodon plugin. Open API, per-instance. Secrets from env: MASTODON_TOKEN
 * (an access token from your instance's Development → new application, scope
 * write:statuses write:media). Instance URL comes from config.platforms.mastodon.instance.
 * Accepts WebP. Links are clickable.
 *
 * NOTE: written to the documented Mastodon API but UNVERIFIED against a live
 * instance until real credentials exist — keep disabled / dry-run until proven.
 */
export default {
  name: 'mastodon',

  formatText(cfg) {
    return `${cfg.invitation}\n${cfg.link}`;
  },

  async post({ text, imageBytes, imageMime, altText, cfg, secrets }) {
    const token = secrets.mastodonToken;
    const instance = (cfg.platforms.mastodon.instance || '').replace(/\/$/, '');
    if (!token) throw new Error('mastodon: set MASTODON_TOKEN');
    if (!instance) throw new Error('mastodon: set platforms.mastodon.instance in config.json');
    const auth = { authorization: `Bearer ${token}` };

    const form = new FormData();
    form.append('file', new Blob([imageBytes], { type: imageMime }), 'art' + (imageMime.includes('webp') ? '.webp' : '.jpg'));
    form.append('description', altText);
    const media = await fetch(`${instance}/api/v2/media`, { method: 'POST', headers: auth, body: form }).then((r) => r.json());

    const body = new URLSearchParams({ status: text, 'media_ids[]': media.id });
    const res = await fetch(`${instance}/api/v1/statuses`, { method: 'POST', headers: auth, body }).then((r) => r.json());
    return { url: res.url, ok: !!res.url };
  }
};
