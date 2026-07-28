#!/usr/bin/env node
/*
 * gallery-assets.mjs — derive the gallery's deployable images from the hi-res
 * originals in Media/ (the art thread's gitignored folder — read only, never
 * committed). For each manifest entry this writes:
 *   public/gallery/thumb/<id>.webp  — display thumbnail (lazy grid)
 *   public/gallery/full/<id>.webp   — optimized full-resolution WebP (a download)
 *   public/gallery/orig/<src>       — the untouched PNG original (a download)
 * The two download forms are the "both" the human chose: light + exact.
 *
 * Usage:  node scripts/gallery-assets.mjs           (thumb + full only)
 *         node scripts/gallery-assets.mjs --orig     (also copy PNG originals)
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = join(root, 'Media');
const OUT = join(root, 'public', 'gallery');
const withOrig = process.argv.includes('--orig');

const manifest = JSON.parse(readFileSync(join(root, 'src', 'data', 'gallery.json'), 'utf8'));
for (const d of ['thumb', 'full', 'orig']) mkdirSync(join(OUT, d), { recursive: true });

const kb = (p) => Math.round(statSync(p).size / 1024);
let made = 0, missing = 0, thumbBytes = 0, fullBytes = 0, origBytes = 0;

for (const section of manifest.sections) {
  for (const item of section.items) {
    const srcPath = join(MEDIA, item.src);
    const id = basename(item.src).replace(/\.png$/i, '');
    if (!existsSync(srcPath)) { console.warn(`  MISSING  ${item.src}`); missing++; continue; }

    const thumbPath = join(OUT, 'thumb', `${id}.webp`);
    const fullPath = join(OUT, 'full', `${id}.webp`);
    await sharp(srcPath).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 72 }).toFile(thumbPath);
    await sharp(srcPath).webp({ quality: 82 }).toFile(fullPath);
    thumbBytes += statSync(thumbPath).size;
    fullBytes += statSync(fullPath).size;

    if (withOrig) {
      const origPath = join(OUT, 'orig', item.src);
      copyFileSync(srcPath, origPath);
      origBytes += statSync(origPath).size;
    }
    made++;
    process.stdout.write(`  ${section.id.padEnd(13)} ${id.padEnd(44)} thumb ${String(kb(thumbPath)).padStart(4)}KB  full ${String(kb(fullPath)).padStart(4)}KB\n`);
  }
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);
console.log(`\n  ${made} images  (${missing} missing)`);
console.log(`  thumbs: ${mb(thumbBytes)}MB   full-webp: ${mb(fullBytes)}MB${withOrig ? `   originals: ${mb(origBytes)}MB` : '   (originals skipped — pass --orig to copy)'}`);
