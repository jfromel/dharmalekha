import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Every citation must name its source text, its translator, and its licence.
 * `ref` is a SuttaCentral uid (mn118, sn42.2, dn1, thag1.1 ...) and is checked
 * against the live SuttaCentral API by `npm run verify` before any build.
 */
const citation = z.object({
  ref: z
    .string()
    .regex(
      /^[a-z]{2,4}\d+(\.\d+)*(-\d+(\.\d+)*)?$/,
      'ref must be a SuttaCentral uid, e.g. "mn118", "sn42.2", "an4.184"',
    ),
  translator: z.string(),
  // Licences actually in use across the Pali translation corpus. If a text
  // you want is not one of these, it is almost certainly still in copyright.
  licence: z.enum([
    'CC0-1.0', // SuttaCentral / Bhikkhu Sujato
    'CC-BY-4.0',
    'CC-BY-NC-4.0',
    'free-distribution', // e.g. Thanissaro Bhikkhu — non-commercial, no derivatives
    'public-domain', // pre-1929 translations, e.g. Rhys Davids, Woodward
  ]),
  url: z.string().url().optional(),
});

const writings = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writings' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    published: z.coerce.date(),

    /**
     * The three tiers. This describes the *dominant* register of the piece;
     * individual passages are marked inline with <Canonical>, <Commentary>
     * and <Reflection>.
     *
     *   canonical  — direct quotation of a verified text
     *   commentary — traditional commentary, or a human tradition-holder
     *   reflection — written by, or with, a language model
     */
    tier: z.enum(['canonical', 'commentary', 'reflection']),

    /**
     * Which models touched this text. Non-empty means the piece must carry a
     * visible machine-assistance notice. Silence here is a claim: it asserts
     * no model was involved.
     */
    models: z.array(z.string()).default([]),

    citations: z.array(citation).default([]),

    /**
     * Lexicon terms this piece genuinely uses. Each string is a slug in the
     * `lexicon` collection; the build reads them to weave backlinks — a term's
     * page lists every writing that uses it. Declare only a term the text
     * actually invokes. A false edge is a false claim about what inter-is with
     * what, and the whole point of the weave is that its edges are earned.
     */
    terms: z.array(z.string()).default([]),

    /**
     * Nothing publishes unreviewed. `reviewed` is the date a human read the
     * piece against its sources; `reviewer` is who. The build refuses to ship
     * a model-assisted piece without both.
     */
    // A blank YAML value parses as null. Left raw, `z.coerce.date()` would
    // turn null into 1970-01-01 — a valid-looking date for a review that
    // never happened. Collapse null and empty string to `undefined` so a
    // missing sign-off is genuinely missing, and the refinement below refuses
    // it by name instead of coercing a false claim into the build.
    reviewed: z.preprocess(
      (v) => (v === null || v === '' ? undefined : v),
      z.coerce.date().optional(),
    ),
    reviewer: z.preprocess(
      (v) => (v === null || v === '' ? undefined : v),
      z.string().min(1).optional(),
    ),

    draft: z.boolean().default(false),
  })
    .refine(
      (d) => d.models.length === 0 || (d.reviewed && d.reviewer),
      { message: 'A model-assisted piece needs `reviewed` and `reviewer` before it can publish.' },
    )
    .refine(
      (d) => d.tier !== 'canonical' || d.citations.length > 0,
      { message: 'A piece in the canonical tier must carry at least one citation.' },
    ),
});

/**
 * The Lexicon. Words gathered — legein, not dictare — each wearing where it
 * came from, the same ethic as the writings tiers:
 *
 *   canonical  — a term attested in a source text; must carry a citation,
 *                verified against SuttaCentral before it can publish
 *   commentary — a lexical or etymological reading from scholarship
 *   invented   — coined here (a term of SangBhasa); marked as a coinage,
 *                claims no canon, and so needs no external verification
 *
 * A borrowed term that has not yet been checked against a real source stays
 * `draft: true` — present in the repo, out of the published build — until the
 * verification is done. Invented-and-labelled ships freely; borrowed-and-
 * asserted waits. Same rule as the rest of the site, applied to single words.
 */
const lexicon = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lexicon' }),
  schema: z.object({
    term: z.string(), // headword as written — diacritics and all
    roman: z.string().optional(), // plain-ASCII wordmark, e.g. "SangBhasa"
    language: z.string(), // "Pali", "Sanskrit", "SangBhasa (invented)" ...
    gloss: z.string(), // one line of English sense
    // The weld: how the coinage is built from its roots — the etymology in one
    // line, shown in the machine hand beside the gloss. Optional: a borrowed
    // root has no weld to show, and its caption falls back to the gloss alone.
    weld: z.string().optional(),

    provenance: z.enum(['canonical', 'commentary', 'invented']),
    citations: z.array(citation).default([]),

    /** Earned "see also" edges — slugs of related Lexicon entries. */
    see: z.array(z.string()).default([]),

    models: z.array(z.string()).default([]),
    reviewed: z.preprocess(
      (v) => (v === null || v === '' ? undefined : v),
      z.coerce.date().optional(),
    ),
    reviewer: z.preprocess(
      (v) => (v === null || v === '' ? undefined : v),
      z.string().min(1).optional(),
    ),

    draft: z.boolean().default(false),
  })
    // A published canonical entry must carry a citation — the same gate the
    // writings tier enforces, so a borrowed word cannot wear the brass rule
    // until it has been verified. Drafts are exempt: they do not publish.
    .refine(
      (d) => d.draft || d.provenance !== 'canonical' || d.citations.length > 0,
      { message: 'A published canonical Lexicon entry must carry a citation.' },
    )
    .refine(
      (d) => d.draft || d.models.length === 0 || (d.reviewed && d.reviewer),
      { message: 'A model-assisted Lexicon entry needs `reviewed` and `reviewer` before it publishes.' },
    ),
});

export const collections = { writings, lexicon };
