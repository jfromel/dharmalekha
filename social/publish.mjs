#!/usr/bin/env node
/*
 * publish.mjs — the platform-agnostic publisher. Reads an approved queue (a
 * projection of the gallery) and an invitation, and posts the next item(s) to
 * each enabled platform. Platforms are plugins; adding or dropping one is a
 * config line. The site is the sovereign source — this only points outward.
 *
 *   node social/publish.mjs                 # DRY RUN — preview every platform, touch nothing
 *   node social/publish.mjs --count=3       # preview the next 3 items
 *   node social/publish.mjs --id=<id>       # preview one specific item
 *   node social/publish.mjs --live          # actually post (only to enabled platforms)
 *   node social/publish.mjs --live --platform=bluesky
 *
 * Secrets come from environment variables only (see README) — never the repo.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8'));
const queuePath = join(here, 'queue.json');
const queue = JSON.parse(readFileSync(queuePath, 'utf8'));

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const live = !!args.live;
const only = args.platform;
const count = args.count ? parseInt(args.count, 10) : (cfg.postsPerRun || 1);

// Secrets from the environment only — never a file. The Worker builds the same
// shape from its own env bindings, so the plugins are runtime-agnostic.
const secrets = {
  blueskyHandle: process.env.BLUESKY_HANDLE,
  blueskyAppPassword: process.env.BLUESKY_APP_PASSWORD,
  mastodonToken: process.env.MASTODON_TOKEN,
  igUserId: process.env.IG_USER_ID,
  igAccessToken: process.env.IG_ACCESS_TOKEN
};

const plugins = Object.fromEntries(await Promise.all(
  ['bluesky', 'mastodon', 'instagram'].map(async (n) => [n, (await import(`./platforms/${n}.mjs`)).default])
));

// Pick the work: a specific id, else the next N unposted in queue order.
let picks;
if (args.id) picks = queue.items.filter((i) => i.id === args.id);
else picks = queue.items.filter((i) => !i.posted).slice(0, count);

if (!picks.length) { console.log('nothing to post (all queued items already posted).'); process.exit(0); }

const targets = Object.entries(cfg.platforms)
  .filter(([n, p]) => (live ? p.enabled : true) && (!only || only === n))
  .map(([n]) => n);

console.log(`${live ? 'LIVE' : 'DRY RUN'} · ${picks.length} item(s) · platforms: ${targets.join(', ') || '(none enabled)'}\n`);

for (const item of picks) {
  const imageUrl = cfg.site + item.image;
  console.log(`▪ ${item.id}  [${item.section}]  alt: "${item.alt}"`);
  console.log(`  image: ${imageUrl}`);

  let bytes = null, mime = 'image/webp';
  if (live) {
    const r = await fetch(imageUrl);
    bytes = new Uint8Array(await r.arrayBuffer());
    mime = r.headers.get('content-type') || mime;
  }

  const posted = [];
  for (const name of targets) {
    const p = plugins[name];
    const text = p.formatText(cfg) + (cfg.hashtags.length ? '\n\n' + cfg.hashtags.map((h) => '#' + h).join(' ') : '');
    if (!live) {
      console.log(`  ${name} would post:\n    ${text.replace(/\n/g, '\n    ')}`);
      continue;
    }
    try {
      const res = await p.post({ text, imageUrl, imageBytes: bytes, imageMime: mime, altText: item.alt, cfg, secrets });
      console.log(`  ${name}: ${res.ok ? 'posted ' + (res.url || '') : 'FAILED'}`);
      if (res.ok) posted.push(name);
    } catch (e) {
      console.log(`  ${name}: ERROR ${e.message}`);
    }
  }

  if (live && posted.length) item.posted = { at: new Date().toISOString(), platforms: posted };
  console.log('');
}

if (live) writeFileSync(queuePath, JSON.stringify(queue, null, 2) + '\n');
console.log(live ? 'done (queue updated).' : 'dry run — queue untouched. Add --live to post.');
