# Deploying dharmalekha

The site is a static Astro build. It is hosted on Cloudflare Pages, connected
to this GitHub repo. Connecting the repo, owning the domain, and pressing
deploy are John's — no account credentials live in this repo.

## Cloudflare Pages settings

Set these in the Pages project (Settings → Builds & deployments):

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(repo root — leave default)* |
| Node.js version | pinned by `.nvmrc` (`22.16.0`) |

Node must be pinned in the file. Cloudflare's v3 build system ignores
`package.json` → `engines` and would otherwise use its own default. `.nvmrc`
(and `.node-version`, and a `NODE_VERSION` env var) are what it actually
reads. `22.16.0` satisfies this project's `>=22.12.0` requirement.

## Why `npm run build`, and never `build:unverified`

`npm run build` runs `verify && astro build`:

1. `verify` resolves every SuttaCentral uid against the live API.
2. `astro build` runs the content schema — which refuses any model-assisted
   piece that is not signed (`reviewed` + `reviewer`), and any canonical-tier
   piece with no citation.

If either step fails, the command exits non-zero. **Cloudflare marks any
build with a non-zero exit code as failed and does not deploy it.** So a
hallucinated citation or an unsigned model piece cannot reach the world — the
gate holds in production exactly as it holds locally.

`build:unverified` exists to skip the citation check for local iteration. It
must **never** be the Cloudflare build command. Pointing production at it
removes the gate.

## The gate guards previews too

The same command runs on branch and pull-request deployments, so preview URLs
are held to the same standard as production. There is no side door.

## A red build is the site refusing to lie

The first deploy will *fail on purpose* while any model-assisted piece is
unsigned. Right now `the-wooden-puppet.mdx` carries `models:` and a blank
`reviewed:`/`reviewer:` — so `npm run build` exits non-zero and Cloudflare
will decline to publish. That is not a problem to fix in the deploy config. It
is the launch gate working. It clears when John reads the piece and signs it,
or marks it `draft: true` to hold it back. It is not cleared by weakening the
gate.

## What stays John's

- Connecting this repo to a Cloudflare Pages project.
- The `dharmalekha.org` domain and its DNS.
- Reading and signing (or holding) any unsigned piece before the first green
  build.
- Pressing deploy.
