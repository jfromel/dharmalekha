/*
 * Cloudflare Worker — the parked runtime for the publisher. Same stack the site
 * deploys on; no third-party scheduler, no always-on box. A cron trigger fires
 * on schedule and posts the next queued item to each ENABLED platform. Posted
 * state lives in KV (survives across runs). Secrets are Worker secrets.
 *
 * PARKED: committed dormant. It does nothing until you (1) deploy it, (2) enable
 * a platform in ../config.json, and (3) set that platform's secrets. Until then
 * every run is a no-op ("(none enabled)").
 *
 * The same plugins run here and under Node — they take secrets as an argument,
 * so nothing platform-specific depends on the runtime.
 */
import config from '../config.json' with { type: 'json' };
import queue from '../queue.json' with { type: 'json' };
import bluesky from '../platforms/bluesky.mjs';
import mastodon from '../platforms/mastodon.mjs';
import instagram from '../platforms/instagram.mjs';

const plugins = { bluesky, mastodon, instagram };

const secretsFrom = (env) => ({
  blueskyHandle: env.BLUESKY_HANDLE,
  blueskyAppPassword: env.BLUESKY_APP_PASSWORD,
  mastodonToken: env.MASTODON_TOKEN,
  igUserId: env.IG_USER_ID,
  igAccessToken: env.IG_ACCESS_TOKEN
});

async function run(env, { dry = false } = {}) {
  const out = [];
  const log = (s) => out.push(s);

  const postedRaw = env.SOCIAL_KV ? await env.SOCIAL_KV.get('posted') : null;
  const posted = new Set(postedRaw ? JSON.parse(postedRaw) : []);
  const item = queue.items.find((i) => !posted.has(i.id));
  if (!item) { log('queue exhausted — nothing to post.'); return out.join('\n'); }

  const targets = Object.entries(config.platforms).filter(([, p]) => p.enabled).map(([n]) => n);
  const imageUrl = config.site + item.image;
  log(`${dry ? 'DRY' : 'LIVE'} · ${item.id} → ${targets.join(', ') || '(none enabled)'}`);

  const secrets = secretsFrom(env);
  let bytes = null, mime = 'image/webp';
  if (!dry && targets.some((t) => t !== 'instagram')) {
    const r = await fetch(imageUrl);
    bytes = new Uint8Array(await r.arrayBuffer());
    mime = r.headers.get('content-type') || mime;
  }

  const done = [];
  for (const name of targets) {
    const p = plugins[name];
    const text = p.formatText(config) + (config.hashtags.length ? '\n\n' + config.hashtags.map((h) => '#' + h).join(' ') : '');
    if (dry) { log(`  ${name}:\n    ${text.replace(/\n/g, '\n    ')}`); continue; }
    try {
      const res = await p.post({ text, imageUrl, imageBytes: bytes, imageMime: mime, altText: item.alt, cfg: config, secrets });
      log(`  ${name}: ${res.ok ? 'posted ' + (res.url || '') : 'FAILED'}`);
      if (res.ok) done.push(name);
    } catch (e) { log(`  ${name}: ERROR ${e.message}`); }
  }

  if (!dry && done.length && env.SOCIAL_KV) {
    posted.add(item.id);
    await env.SOCIAL_KV.put('posted', JSON.stringify([...posted]));
    log(`  marked posted (${done.join(', ')}).`);
  }
  return out.join('\n');
}

export default {
  // Cron trigger — the scheduled publish.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env, { dry: false }));
  },

  // Manual endpoint, guarded by ?key=<TRIGGER_KEY>. Defaults to a safe DRY preview;
  // add &dry=0 to actually post one item now.
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!env.TRIGGER_KEY || url.searchParams.get('key') !== env.TRIGGER_KEY) {
      return new Response('forbidden\n', { status: 403 });
    }
    const dry = url.searchParams.get('dry') !== '0';
    const body = await run(env, { dry });
    return new Response(body + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
};
