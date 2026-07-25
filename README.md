# Dharmalekha

*dhamma + lekhā* — dharma writing. A static site for freely-given dharma
writing, built so a reader can always tell what came from the canon, what
came from a person, and what came from a machine.

## Run it

```bash
npm install
npm run dev          # http://localhost:4321
npm run verify       # check every citation against SuttaCentral
npm run build        # verify, then build — build fails on a bad citation
```

`npm run build:unverified` skips the network check. Use it only offline.

## The three tiers

Passages are wrapped in one of three components. The left rail tells the
reader which is which before they read a word.

| Component      | Rail            | Means                                   |
| -------------- | --------------- | --------------------------------------- |
| `<Canonical>`  | solid brass 3px | verified quotation, `ref` required      |
| `<Commentary>` | thin solid      | traditional commentary, or John speaking |
| `<Reflection>` | broken hairline | a model wrote this                      |

```mdx
<Canonical ref="an3.65" translator="Bhikkhu Sujato" licence="CC0-1.0">
  <p>…</p>
</Canonical>
```

You cannot mark something canonical without naming the text. That is the point.

## The gates

Two things will stop a publish, both by design:

1. **Schema** (`src/content.config.ts`) — a piece listing any model in
   `models:` must also carry `reviewed:` and `reviewer:`. A piece in the
   `canonical` tier must carry at least one citation. Astro fails the build.
2. **Citations** (`scripts/verify-citations.mjs`) — every SuttaCentral uid,
   from frontmatter and from inline `<Canonical ref="…">`, is resolved against
   `https://suttacentral.net/api/suttaplex/{uid}`. Anything that does not
   resolve is a typo or an invention, and the build goes red.

Results cache to `.cache/suttacentral.json`, so repeat builds are cheap.
Delete it to force a re-check.

## Who wrote what

The site's code, layout and tooling were written by Claude (Anthropic),
prompted and directed by John. Pieces in the `reflection` tier were also
written by a model; each names it in `models:` and carries a visible notice.
Nothing model-assisted publishes without `reviewed:` and `reviewer:` — a
person's name against the claim that it was read against its sources.

Canonical text is never reproduced from model memory. It is pasted from
SuttaCentral, with a uid the build can check. A model asked for a sutta
passage will produce something that scans correctly and is wrong.

## Licences

Site text is CC0. Translation licences vary and the schema makes you declare
one per citation:

- **CC0-1.0** — SuttaCentral / Bhikkhu Sujato. Quote freely.
- **free-distribution** — e.g. Thanissaro Bhikkhu. Non-commercial, no derivatives.
- **public-domain** — pre-1929, e.g. Rhys Davids, Woodward.
- **Still in copyright** — Bhikkhu Bodhi / Wisdom Publications. Do not paste.

## Design notes

The reference is the ola palm-leaf manuscript: text incised with a stylus and
rubbed with soot, so letters sit *in* the leaf. Three things borrowed and
nothing else — the ground colour of a leaf rubbing, the wide folio band of the
masthead, and the two cord holes used as the section mark. Type is Spectral
with IBM Plex Mono for citations, both chosen for full Latin Extended coverage
so Pali diacritics (ā ī ū ṭ ḍ ṇ ṅ ñ ṃ ḷ) render properly. Most display faces
fail on ṃ and ḷ.

## Deploy

Static output in `dist/`. Cloudflare Pages, free tier, build command
`npm run build`. Set the deploy to fail on error so a bad citation blocks it
rather than warning about it.
