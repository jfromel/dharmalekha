#!/usr/bin/env node
/*
 * build-catalog.mjs — generate postcards/catalog.json from the gallery manifest.
 * Every card is pre-approved art (a projection of the gallery), so orders can
 * auto-fulfill with no per-order approval.
 *
 * All cards are 4x6. The mailed card is physically LANDSCAPE (the standard mail
 * postcard). So:
 *   - landscape images  -> fit 'crop'   (fill the card edge to edge)
 *   - portrait / square -> fit 'border' (matted on the card; nothing cropped)
 * `enabled` and any hand-set `fit` are preserved across re-runs by src.
 * Homage lines ("after Watts", etc.) are dropped here — they stay on the free
 * digital art only, never on a sold card.
 *
 *   node postcards/build-catalog.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const gallery = JSON.parse(readFileSync(join(root, 'src', 'data', 'gallery.json'), 'utf8'));
const catalogPath = join(here, 'catalog.json');

const prior = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf8')) : { cards: [] };
const priorBySrc = new Map((prior.cards || []).map((c) => [c.src, c]));

const cards = [];
for (const sec of gallery.sections) {
  for (const it of sec.items) {
    const m = await sharp(join(root, 'Media', it.src)).metadata();
    const w = m.width, h = m.height;
    const orientation = Math.abs(w - h) / Math.max(w, h) < 0.08 ? 'square' : (w > h ? 'landscape' : 'portrait');
    const p = priorBySrc.get(it.src) || {};
    cards.push({
      src: it.src,
      title: it.title,
      section: sec.id,
      size: '4x6',
      orientation,
      fit: p.fit || (orientation === 'landscape' ? 'crop' : 'border'),
      enabled: p.enabled ?? true
    });
  }
}

writeFileSync(catalogPath, JSON.stringify({
  _note: 'Pre-approved 4x6 postcard catalog, generated from src/data/gallery.json. The mailed card is landscape; portrait/square images are matted (fit: border), landscape images fill it (fit: crop).',
  pricing: 'right-livelihood: cover print + postage + fair labor. Digital art stays free (CC0).',
  price: { currency: 'usd', single: null, set_of_6: null, _indicative: 'e.g. single ~$6, set of 6 ~$28 — set to your real costs.' },
  cards
}, null, 2) + '\n');

const by = (k, v) => cards.filter((c) => c[k] === v).length;
console.log(`catalog.json: ${cards.length} cards, all 4x6 — ${by('orientation', 'landscape')} landscape (crop), ${by('orientation', 'portrait')} portrait + ${by('orientation', 'square')} square (matted)`);
