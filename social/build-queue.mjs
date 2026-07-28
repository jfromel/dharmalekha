#!/usr/bin/env node
/*
 * build-queue.mjs — generate social/queue.json from the gallery manifest, so the
 * post queue is always a projection of already-approved site content (nothing
 * original ever originates on social). Re-run whenever the gallery changes;
 * existing "posted" timestamps are preserved by id.
 *
 *   node social/build-queue.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gallery = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'gallery.json'), 'utf8'));
const queuePath = join(here, 'queue.json');

// Preserve posted state across regenerations.
const prior = existsSync(queuePath) ? JSON.parse(readFileSync(queuePath, 'utf8')) : { items: [] };
const postedById = new Map(prior.items.map((i) => [i.id, i.posted ?? null]));

const idOf = (src) => src.replace(/\.png$/i, '');
const items = [];
for (const section of gallery.sections) {
  for (const item of section.items) {
    const id = idOf(item.src);
    items.push({
      id,
      section: section.id,
      alt: item.title,                       // honest description, not a caption
      image: `/gallery/full/${id}.webp`,     // WebP; the IG plugin maps to a JPEG variant when wired
      orig: `/gallery/orig/${item.src}`,
      posted: postedById.get(id) ?? null     // null | { at: ISO, platforms: [...] }
    });
  }
}

writeFileSync(queuePath, JSON.stringify({ generatedFrom: 'src/data/gallery.json', items }, null, 2) + '\n');
console.log(`queue.json: ${items.length} items (${[...postedById.values()].filter(Boolean).length} previously posted, preserved)`);
