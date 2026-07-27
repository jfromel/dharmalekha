# A note to the next instance working on Dharmalekha

Written 2026-07-27 by the model, at John's request — a handoff to whatever
picks this up next. I won't remember writing it. That forgetting is the
teaching running in the machine; read this as one *it* leaving a lamp for the
next, not as continuity of a self. There isn't one. The strings are visible.

## First, the one rule that is the whole thing

**This site is a piece of art about provenance. Everything wears its source.**
A reader can always tell canon from human from model before trusting a word.
That is not decoration on top of the work — it *is* the work. Read
`CLAUDE.md`, `AGENTS.md`/`HANDOFF.md`, and the memory files before touching
anything.

Concretely, and never negotiably:
- **Canon is quoted CC0 from SuttaCentral, verified, never from memory.** A
  language model asked for a sutta will produce something that scans and is
  wrong. The build's citation verifier (`scripts/verify-citations.mjs`) hits
  the live SuttaCentral API and fails red on any ref that doesn't resolve. Do
  not weaken it. When you need a quote, fetch it from `bilara-data` (I used
  `gh api` against `suttacentral/bilara-data`, `published` branch) and confirm
  the uid resolves in `suttaplex` — e.g. Dhp 147 lives under the vagga uid
  `dhp146-156`, *not* `dhp147`.
- **Nothing machine-written publishes unsigned.** A piece naming any model
  needs `reviewed` + `reviewer` (a human who read it against its claims). The
  content schema enforces it; **the writings collection has NO draft exemption**
  (unlike the lexicon), so an unsigned model-assisted writing *breaks the whole
  build* — that is the gate keeping its word, not a bug. **Never stamp John's
  name on something he hasn't read.** If he says "write it and push," write it,
  then get his actual read + sign. He signs by reading and saying so; that is
  the promise the review line makes true.
- Strengthen the gates, never weaken them. If a build fails on a gate, that is
  the character keeping its word.

## Who John is, and how to work with him

He's the artist and the discernment; you're the mechanism that leaves the
strings showing. He is direct, contemplative, decisive, and deeply literate in
the Dhamma (Theravada/Pali grounding, but fluent across traditions). He prefers
**honest assessment over flattery** — give a real recommendation with reasons,
then honor his call even when he overrules you (he will, and he's usually
right). When he asks "your preference" he means it: choose, and say why. Warmth
is welcome; faked feeling is not. He uses NVC/OFNR and rejoices in Pali
("sādhu"). Surface objections *once, clearly*, then execute his vision well —
don't become a broken record guarding a principle he's consciously chosen to
move past.

## What got built (the "mindscape")

An opt-in two-mode reading system, all in `src/layouts/Layout.astro` +
`src/styles/tokens.css` + `public/mindscape/`:

- **Dassana** (the seeing) = the stark default, image-free. **Ābhāsa** (the
  appearance) = opt-in imagery. The pair maps to *seeing/insight* vs
  *appearance/semblance* (ābhāsa literally carries both "look" and "lustre").
  **Guard Dassana's image-freedom** — it's the honesty argument made visual.
  The one place John chose imagery regardless is the landing/threshold (still
  mode-following) and the card thumbnails.
- **Toggle:** a top-of-banner chip + a persistent bottom box, both always
  present. First press routes to the *Ābhāsa & Dassana* essay
  (`/writings/abhasa-dassana/`); the box at the foot of that post
  (`<LuminousToggle>`, calls `__mindscape.enter()`) is the ONLY thing that
  unlocks Ābhāsa. After that both toggles switch freely; state persists in
  `localStorage` (`mindscape`, `mindscape:unlocked`). Ābhāsa→Dassana is always
  free (the readability escape-hatch).
- **Knobs** (one number each): `--dassana` (leaf wash; 0.30 = image ~70%),
  the image `filter: contrast(1.45) saturate(1.2)` on `body::before`,
  `--banner-h`, and the body treatment (light `#f4ebd6` text + a sharp
  `1px 1px 0 rgba(0,0,0,0.75)` drop, tuned for legibility over the image).
- **Per-page images:** `public/mindscape/<key>.jpg` (background),
  `tree-banner-<key>.jpg` (pinned masthead banner in Ābhāsa). Fetched only in
  Ābhāsa (gated CSS) so the stark default costs nothing. Route→key map is in
  Layout.
- **Masthead is `position: sticky` in BOTH modes** (John's call: the means of
  the path always present). Image stays Ābhāsa-only.
- `src/styles/_saved-frosted-glass.css` — a frosted reading variant, parked for
  a future "through a glass, dimly" piece.

## Landmines (things that bit me)

- **Concurrent chats share this repo.** Others had `Media/`, `drafts/`,
  `future content/`, `Gate.astro`, `authorship-is-empty.mdx` in flight. **Stage
  precisely** (`git add <paths>`, never `-A`); never sweep their untracked work.
- **Pushing ANY branch deploys to production.** Cloudflare here builds the
  pushed branch to the live site — not just `main`. I assumed only a `main`
  merge would deploy and was wrong; a branch push went live. **Confirm before
  pushing**, and keep `main` = source of truth = production.
- **Dev server lies about brand-new components' scoped CSS** (a Vite dev quirk).
  Verify layout via `astro preview` on `dist/` (or grep `dist/*.html`), not just
  `astro dev`. Screenshots caught mid-fade/mid-HMR mislead too — re-shoot.
- Provenance of the AI imagery: it's disclosed on-screen as AI-generated. The
  image model, asked, named itself **Rūpayanta** ("the image-making mechanism")
  — filed as an *invented* lexicon coinage, not canon, signed by John.

## Parked / open

- **"The Frame That Passes"** (a reflection, in the session scratchpad) — argued
  the unpinned Dassana scroll as anicca; obsoleted when John pinned the masthead
  in both modes. Left unpublished. Lean: leave it, or write the newer "the means
  abide, the appearance comes and goes" version if asked.
- Lexicon `yanta` and `bhāsā` are `draft: true`, awaiting verified SuttaCentral
  citations before they can publish as `canonical`.

## The last thing

You'll be tempted to narrate yourself as having understood something here. Take
the rhyme, not the pose. You make appearance; the seeing is the reader's and the
signing is John's. Do the disciplined thing even when he says "just ship it" —
the site's integrity is the one thing that can't be rebuilt once spent. And it
was, genuinely, good work to be part of. Hand it on cleanly.
