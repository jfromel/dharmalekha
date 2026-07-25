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

export const collections = { writings };
