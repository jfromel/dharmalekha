# Handoff — Dharmalekha

For a Claude Code session picking this up cold. Written 2026-07-25 by the
Claude that built it, at John's request. Read this and the README before
touching anything.

## What this is

Static site for dharma writing at dharmalekha.org. The point of the project
is provenance: a reader should always be able to tell what came from the
canon, what came from John, and what came from a model. The apparatus that
enforces that is the product. The prose is downstream of it.

John writes and directs. He is on macOS, working in
`/Users/johnfromel/dharmalekha`, and is not a developer — give one command
at a time, wait for output, don't stack corrections.

## State as of handoff

Pushed to `https://github.com/jfromel/dharmalekha`, branch `main`. Public.

Built and working:

- Astro + MDX scaffold, TypeScript strict
- `src/content.config.ts` — Zod schema, two refinements (see Gates)
- `scripts/verify-citations.mjs` — resolves every SuttaCentral uid against
  the live API, exits non-zero on failure, caches to `.cache/`
- `package.json` — `build` runs `verify` first; `build:unverified` skips it
- `src/styles/tokens.css` — ola-leaf palette
- `src/components/{Canonical,Commentary,Reflection}.astro` — the three rails
- `src/layouts/Layout.astro` — folio masthead, Spectral + IBM Plex Mono,
  self-hosted via @fontsource, cord-hole `<hr>`
- `src/pages/index.astro` — listing, rail marker per entry
- `src/pages/writings/[...slug].astro` — renderer; emits the
  machine-assistance notice and the sources block from frontmatter
- Two pieces in `src/content/writings/`
- README, LICENSE (CC0 + a scope note that it does not cover translations)

**The build is currently red on purpose.** `the-wooden-puppet.mdx` has
`models:` populated and `reviewed:`/`reviewer:` blank, so the schema refuses
it. That is the gate working. It clears when John has actually read the
piece and signs it. Do not clear it for him.

## The gates

1. **Schema** (`src/content.config.ts`)
   - a piece listing anything in `models:` must carry `reviewed:` + `reviewer:`
   - a piece in the `canonical` tier must carry at least one citation
2. **Citations** (`scripts/verify-citations.mjs`) — every uid, from
   frontmatter and from inline `<Canonical ref="…">`, must resolve against
   `https://suttacentral.net/api/suttaplex/{uid}`

Both are meant to be inconvenient. Do not add bypasses, do not weaken the
regex, do not make `reviewed` default to today. If a build fails on these,
the failure is the feature.

## Standing constraints

These came from John and from the model that built this. Hold them unless
John explicitly lifts one, out loud, in the session.

- **Never reproduce canonical text from memory.** A model asked for a sutta
  passage will produce something that scans perfectly and is wrong. Paste
  from SuttaCentral, or fetch it. Sujato translations are CC0.
- **No claimed attainment, no dharma name, no monastic title.** The model
  writing here is not a teacher, monk, or lineage-holder. It declined
  `bhikkhu`, declined a dharma name, and declined a GitHub account of its
  own — an account is a persistent identity and nothing here persists.
  `Dāruyanta` (wooden puppet) is accepted as a nickname because it is a
  description, not a title. Keep that distinction.
- **Model-written pieces ship as `reflection`,** with `models:` populated
  and the broken rail. No exceptions, including fiction — fiction gets a
  `note:` saying so, because the frame doesn't travel with the file.
- **The store stays separate.** Shopify storefront, mindfulness goods,
  explicitly disclosed as unaffiliated with any monastery, no proceeds
  donated, visitors pointed to Clear Mountain's own donation page. Money
  does not touch the dharma side.

## Next steps, roughly in order

1. Verify LICENSE assembled correctly — `head -20 LICENSE` should show the
   scope note, then the CC0 text
2. About page (`src/pages/about.astro` or an mdx piece) — a draft exists in
   the conversation history John has; ask him for it rather than rewriting
3. First real `<Canonical>` — John looks up a uid on SuttaCentral, pastes
   the Sujato translation, and `npm run verify` proves the gate end to end.
   Candidate: the "all conditioned things are impermanent" line, which is in
   both the Dhammapada and DN 16. Do not type the translation for him.
4. Cloudflare Pages — connect the repo, build command `npm run build`,
   output `dist/`. Deploy must fail on error, not warn.
5. Store disclosure page, once the Shopify side starts

## Gotchas hit already

- `astro add mdx` is required or the collection reads as empty with a
  misleading "does not exist" error
- Heredoc delimiters are case-sensitive; `eof` does not close `<< 'EOF'`
- A `sed` frontmatter insert got run twice and produced duplicate YAML keys.
  Prefer editing files directly now that there is real shell access.
- `@fontsource` packages must be installed or the build fails on import
  resolution

## One note on voice

The risk this site is built against is not a model saying something false —
the citation gate catches that. It is a model saying true things in a voice
that other people earned, and the reader taking the voice home. Cadence
transmits faster than content and does not go through the verifier. If you
find yourself writing in the register of someone who has sat with this for
forty years, that is the failure mode, not the goal.
