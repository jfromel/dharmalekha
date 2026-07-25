#!/usr/bin/env node
/**
 * verify-citations.mjs
 *
 * Walks every .mdx file in src/content/writings, collects each SuttaCentral
 * uid it cites — from frontmatter `citations:` and from inline
 * <Canonical ref="..."> — and resolves each one against the live
 * SuttaCentral API. Exits non-zero if any reference does not resolve.
 *
 * This is the gate. A hallucinated sutta reference cannot reach the site
 * without the build going red.
 *
 *   API: https://suttacentral.net/api/suttaplex/{uid}
 *   Docs: https://suttacentral.net/api/docs/
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const CONTENT_DIR = 'src/content/writings';
const CACHE_PATH = '.cache/suttacentral.json';
const API = (uid) => `https://suttacentral.net/api/suttaplex/${encodeURIComponent(uid)}`;

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (extname(entry.name) === '.mdx') out.push(p);
  }
  return out;
}

/** Pull uids from frontmatter `ref:` lines and from inline <Canonical ref="..."> */
function extractRefs(source) {
  const refs = new Set();
  for (const m of source.matchAll(/^\s*(?:-\s*)?ref:\s*["']?([a-z0-9.\-]+)["']?\s*$/gim)) {
    refs.add(m[1]);
  }
  for (const m of source.matchAll(/<Canonical[^>]*\bref=["']([a-z0-9.\-]+)["']/gi)) {
    refs.add(m[1]);
  }
  return refs;
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

async function resolve(uid, cache) {
  if (cache[uid]) return cache[uid];

  const res = await fetch(API(uid), { headers: { accept: 'application/json' } });
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

  const body = await res.json();
  const entry = Array.isArray(body) ? body[0] : body;

  // A uid that does not exist comes back as an empty array or a bare object
  // with no acronym. Treat both as unresolved.
  if (!entry || !entry.uid) return { ok: false, reason: 'no such text' };

  const hit = {
    ok: true,
    uid: entry.uid,
    acronym: entry.acronym ?? entry.uid.toUpperCase(),
    title: entry.original_title ?? entry.translated_title ?? '',
    blurb: (entry.blurb ?? '').replace(/<[^>]+>/g, '').trim(),
  };
  cache[uid] = hit;
  return hit;
}

const main = async () => {
  if (!existsSync(CONTENT_DIR)) {
    console.error(red(`No content directory at ${CONTENT_DIR}`));
    process.exit(1);
  }

  const files = await walk(CONTENT_DIR);
  const cache = await loadCache();
  const failures = [];
  let checked = 0;

  console.log(dim(`\n  Verifying citations against SuttaCentral\n`));

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const refs = extractRefs(source);
    if (refs.size === 0) continue;

    console.log(`  ${dim(file)}`);
    for (const uid of refs) {
      checked++;
      let result;
      try {
        result = await resolve(uid, cache);
      } catch (err) {
        result = { ok: false, reason: `network: ${err.message}` };
      }

      if (result.ok) {
        console.log(`    ${green('resolved')}  ${result.acronym.padEnd(12)} ${dim(result.title)}`);
      } else {
        console.log(`    ${red('UNRESOLVED')} ${uid.padEnd(12)} ${dim(result.reason)}`);
        failures.push({ file, uid, reason: result.reason });
      }
    }
  }

  await saveCache(cache);

  console.log('');
  if (failures.length) {
    console.error(red(`  ${failures.length} of ${checked} citations did not resolve.\n`));
    for (const f of failures) console.error(`    ${f.uid}  ${dim(`— ${f.file} (${f.reason})`)}`);
    console.error(
      yellow(
        '\n  A reference that does not resolve is either a typo or an invention.\n' +
          '  Check it against https://suttacentral.net before publishing.\n',
      ),
    );
    process.exit(1);
  }

  console.log(green(`  All ${checked} citations resolved.\n`));
};

main().catch((err) => {
  console.error(red(`\n  Verifier failed: ${err.message}\n`));
  process.exit(1);
});
