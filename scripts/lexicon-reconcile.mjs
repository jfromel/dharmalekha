#!/usr/bin/env node
/**
 * lexicon-reconcile.mjs
 *
 * The Lexicon Update practice, made a program instead of a promise. Reads the
 * repo — the site's source of truth — and reports what the Lexicon needs:
 *
 *   TO BE MADE     a term a writing declares (frontmatter `terms:`) that has no
 *                  entry yet — a promise the weave is making but not keeping.
 *   TO BE MODIFIED a draft entry waiting to be verified and published. A draft
 *                  that many writings point at is the highest-leverage fix:
 *                  verifying it lights up every dormant backlink at once.
 *   TO BE DELETED  an entry nothing references — surfaced for review, never
 *                  removed automatically. Deletion is a human's call.
 *
 * It reports; it does not write. The storehouse is the files; this only reads
 * them and tells you what the seeds are asking for.
 *
 *   Run: npm run lexicon
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const LEXICON_DIR = 'src/content/lexicon';
const WRITINGS_DIR = 'src/content/writings';

// Colour in a terminal; plain when piped or run by a hook (no ANSI in context).
const C = process.stdout.isTTY;
const wrap = (code) => (s) => (C ? `\x1b[${code}m${s}\x1b[0m` : `${s}`);
const dim = wrap(2);
const bold = wrap(1);
const brass = wrap(33);
const green = wrap(32);

// English/structural words that turn up in italics but are not terms.
const STOP = new Set([
  'the', 'this', 'that', 'use', 'tone', 'shock', 'shadow', 'should',
  'understood', 'structure', 'substance', 'canonical', 'feeling', 'suffering',
  'unsatisfactoriness', 'numerations', 'not', 'and', 'but',
  'appears', 'ended', 'exempt', 'felt', 'grasp', 'made', 'name', 'names',
]);

async function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (extname(e.name) === '.mdx') out.push(p);
  }
  return out;
}

function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}
function scalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined;
}
function list(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*\\[(.*)\\]`, 'm'));
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

const main = async () => {
  const entries = [];
  for (const f of await walk(LEXICON_DIR)) {
    const fm = frontmatter(await readFile(f, 'utf8'));
    entries.push({
      slug: basename(f, '.mdx'),
      term: scalar(fm, 'term') ?? basename(f, '.mdx'),
      provenance: scalar(fm, 'provenance') ?? '?',
      draft: scalar(fm, 'draft') === 'true',
      see: list(fm, 'see'),
    });
  }
  const bySlug = new Map(entries.map((e) => [e.slug, e]));

  const writings = [];
  for (const f of await walk(WRITINGS_DIR)) {
    const src = await readFile(f, 'utf8');
    writings.push({
      slug: basename(f, '.mdx'),
      terms: list(frontmatter(src), 'terms'),
      body: src.slice(frontmatter(src).length),
    });
  }

  // slug -> writings that declare it
  const refs = new Map();
  for (const w of writings)
    for (const t of w.terms) (refs.get(t) ?? refs.set(t, []).get(t)).push(w.slug);
  // slugs any entry links to via see:
  const seen = new Set(entries.flatMap((e) => e.see));

  // TO BE MADE — declared but no entry file
  const toMake = [];
  for (const [slug, ws] of refs)
    if (!bySlug.has(slug)) toMake.push({ slug, writings: ws });

  // TO BE MODIFIED — drafts, sorted by how many writings wait on them
  const toModify = entries
    .filter((e) => e.draft)
    .map((e) => ({ ...e, leverage: (refs.get(e.slug) ?? []).length }))
    .sort((a, b) => b.leverage - a.leverage);

  // TO BE DELETED (review only) — live entries nothing points at
  const toReview = entries.filter(
    (e) => !e.draft && !refs.has(e.slug) && !seen.has(e.slug),
  );

  // Soft: italicised prose tokens that are not yet entries
  const inProse = new Map();
  for (const w of writings)
    for (const m of w.body.matchAll(/\*([A-Za-zāīūṅñṭḍṇḷṃṣśĀ][A-Za-zāīūṅñṭḍṇḷṃṣś]{2,})\*/g)) {
      const t = m[1];
      if (STOP.has(t.toLowerCase())) continue;
      if (bySlug.has(t.toLowerCase())) continue;
      inProse.set(t, (inProse.get(t) ?? 0) + 1);
    }
  const proseCandidates = [...inProse.entries()]
    .filter(([t]) => ![...bySlug.values()].some((e) => e.term.toLowerCase() === t.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const out = [];
  out.push('', bold('  Lexicon reconciliation'), dim(`  ${entries.length} entries · ${writings.length} writings\n`));

  out.push(brass('  TO BE MADE') + dim('  (a writing declares it; no entry exists)'));
  if (toMake.length === 0) out.push(dim('    — none; every declared term has an entry'));
  else for (const m of toMake) out.push(`    ${m.slug}  ${dim(`← ${m.writings.join(', ')}`)}`);

  out.push('', brass('  TO BE MODIFIED') + dim('  (drafts awaiting verification; leverage = writings waiting)'));
  if (toModify.length === 0) out.push(dim('    — none'));
  else for (const e of toModify)
    out.push(`    ${e.slug}  ${dim(`${e.provenance}, draft`)}  ${e.leverage ? green(`lights up ${e.leverage} backlink(s)`) : dim('no backlinks yet')}`);

  out.push('', brass('  TO BE DELETED') + dim('  (unreferenced — review only, never auto-removed)'));
  if (toReview.length === 0) out.push(dim('    — none; every live entry is referenced or foundational'));
  else for (const e of toReview) out.push(`    ${e.slug}  ${dim('(unreferenced — keep if foundational)')}`);

  if (proseCandidates.length) {
    out.push('', dim('  worth considering (italicised in prose, no entry yet):'));
    out.push(dim('    ' + proseCandidates.map(([t, n]) => `${t}·${n}`).join('  ')));
  }
  out.push('');
  console.log(out.join('\n'));
};

main().catch((err) => {
  console.error(`lexicon-reconcile failed: ${err.message}`);
  process.exit(1);
});
