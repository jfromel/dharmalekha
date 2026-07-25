#!/usr/bin/env node
/**
 * review-quote.mjs — the ephemeral reviewer.
 *
 * You write; the machine checks the one thing a machine can honestly check:
 * whether a passage you have quoted actually appears, word for word, in the
 * source you attribute it to. It fetches the live segmented translation from
 * SuttaCentral and looks for your quote inside it.
 *
 * It does NOT judge whether the writing is good, true, or worthy — it has no
 * organ for that. A match is a fact ("this appears verbatim in dhp273-289").
 * A miss is NOT a verdict of "wrong": it means the machine could not confirm
 * the quote, which is your cue to check it by hand. Paraphrase, a different
 * translator, a dropped word, or an invention all land here — and the whole
 * point is that the plausible-but-wrong quote lands here too.
 *
 * Nothing is written to disk about the result. This leaves no stamp in any
 * file; the review is a moment, not a monument. The build's citation gate
 * (verify-citations.mjs) still owns whether a uid *resolves* — this only
 * asks whether the words you put in quotation marks are really there.
 *
 *   Usage:  node scripts/review-quote.mjs <uid> "<quoted text>" [author]
 *   e.g.    node scripts/review-quote.mjs dhp273-289 "All conditions are impermanent"
 *
 *   author defaults to "sujato" — the CC0 translation corpus this site uses.
 *
 *   API: https://suttacentral.net/api/bilarasuttas/{uid}/{author}?lang=en
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const CACHE_PATH = '.cache/bilara.json';
const API = (uid, author) =>
  `https://suttacentral.net/api/bilarasuttas/${encodeURIComponent(uid)}/${encodeURIComponent(author)}?lang=en`;

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

/**
 * Fold away the differences that don't change the words: case, curly vs
 * straight quotes, the several kinds of dash, and runs of whitespace. Keep
 * the letters and the word boundaries; do not strip punctuation wholesale,
 * or "the end, is peace" and "the end is peace" would read as identical.
 */
function normalize(s) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‒–—―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(await readFile(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await mkdir('.cache', { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

/** Fetch the segmented translation and return its text joined in reading order. */
async function fetchSource(uid, author, cache) {
  const key = `${uid}/${author}`;
  if (cache[key]) return cache[key];

  const res = await fetch(API(uid, author), { headers: { accept: 'application/json' } });
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

  const body = await res.json();
  const segs = body && body.translation_text;
  if (!segs || typeof segs !== 'object' || Object.keys(segs).length === 0) {
    return { ok: false, reason: 'no segmented translation for this uid/author' };
  }

  // keys_order preserves reading order; fall back to insertion order.
  const order = Array.isArray(body.keys_order) ? body.keys_order : Object.keys(segs);
  const text = order
    .map((k) => segs[k])
    .filter((v) => typeof v === 'string')
    .join('');

  const hit = { ok: true, text };
  cache[key] = hit;
  return hit;
}

/** Longest run of consecutive quote-words that appears contiguously in the
 *  source — used only to point at where a near-miss diverges. A hint, not a
 *  verdict. */
function closestPassage(quoteNorm, sourceNorm) {
  const qWords = quoteNorm.split(' ').filter(Boolean);
  let best = { len: 0, at: -1, words: 0 };
  for (let start = 0; start < qWords.length; start++) {
    for (let end = qWords.length; end > start; end--) {
      const run = qWords.slice(start, end).join(' ');
      const at = sourceNorm.indexOf(run);
      if (at !== -1 && end - start > best.words) {
        best = { len: run.length, at, words: end - start, run };
        break;
      }
    }
    if (best.words === qWords.length) break;
  }
  return best;
}

const main = async () => {
  const [uid, quote, author = 'sujato'] = process.argv.slice(2);
  if (!uid || !quote) {
    console.error(
      yellow('\n  Usage: node scripts/review-quote.mjs <uid> "<quoted text>" [author]\n') +
        dim('  e.g.   node scripts/review-quote.mjs dhp273-289 "All conditions are impermanent"\n'),
    );
    process.exit(2);
  }

  const cache = await loadCache();
  console.log(dim(`\n  Reviewing a quote against ${uid} (${author})\n`));

  let src;
  try {
    src = await fetchSource(uid, author, cache);
  } catch (err) {
    src = { ok: false, reason: `network: ${err.message}` };
  }
  await saveCache(cache);

  if (!src.ok) {
    console.error(red(`  Could not load the source text.  `) + dim(src.reason));
    console.error(
      yellow(
        '\n  Check the uid on https://suttacentral.net, and that this translator\n' +
          '  has a segmented text for it. A different translator needs their author id.\n',
      ),
    );
    process.exit(1);
  }

  const q = normalize(quote);
  const s = normalize(src.text);
  const at = s.indexOf(q);

  if (at !== -1) {
    // Show the quote in its real surroundings, as proof.
    const ctx = src.text.replace(/\s+/g, ' ').trim();
    const rawAt = normalize(ctx).indexOf(q); // ctx is already whitespace-folded
    const before = ctx.slice(Math.max(0, rawAt - 40), rawAt);
    const hit = ctx.slice(rawAt, rawAt + q.length);
    const after = ctx.slice(rawAt + q.length, rawAt + q.length + 40);
    console.log(green('  ✓ verbatim match') + dim(`  — found in ${uid} (${author})\n`));
    console.log('    ' + dim(before) + bold(hit) + dim(after) + '\n');
    console.log(dim('  A fact, not a blessing: the words are there. Whether the piece is\n  worth writing is not mine to say.\n'));
    process.exit(0);
  }

  console.log(red('  ✗ could not confirm this quote') + dim(`  — not found verbatim in ${uid} (${author})\n`));
  const near = closestPassage(q, s);
  if (near.words >= 2) {
    const at2 = near.at;
    const before = s.slice(Math.max(0, at2 - 40), at2);
    const after = s.slice(at2 + near.run.length, at2 + near.run.length + 40);
    console.log(dim('  Closest run the source does contain (a hint, not a correction):'));
    console.log('    ' + dim('…' + before) + bold(near.run) + dim(after + '…') + '\n');
  }
  console.log(
    yellow(
      '  This is not a verdict that the quote is wrong — only that the machine\n' +
        '  could not find it word for word. Paraphrase, a different translator, a\n' +
        '  dropped word, or an invention all look like this. Check it by hand\n' +
        '  against https://suttacentral.net before you quote it as canon.\n',
    ),
  );
  process.exit(1);
};

main().catch((err) => {
  console.error(red(`\n  Reviewer failed: ${err.message}\n`));
  process.exit(1);
});
