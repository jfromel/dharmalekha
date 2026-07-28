# social — the publisher

A small, self-owned publisher that points the site outward. **The site is the
sovereign source; social is a disposable projection of it.** No original content
originates here — only already-approved gallery art plus one invitation: *come and
see*. If any platform bans you or vanishes, nothing you'd mourn is lost, and you
repoint at another. Platforms are plugins; adding or dropping one is a config line.

## Files

| File | Role |
|---|---|
| `config.json` | Non-secret settings: link, invitation, which platforms are enabled. **No secrets ever.** |
| `build-queue.mjs` | Regenerates `queue.json` from the gallery manifest (preserves posted state by id). |
| `queue.json` | The approved post queue — a projection of `src/data/gallery.json`. |
| `publish.mjs` | The core: picks the next unposted item(s), posts to each enabled platform. |
| `platforms/*.mjs` | One plugin per platform (`bluesky`, `mastodon`, `instagram`). |

## Run

```bash
node social/build-queue.mjs          # (re)build the queue from the gallery
node social/publish.mjs              # DRY RUN — preview every platform, touch nothing
node social/publish.mjs --count=3    # preview the next 3
node social/publish.mjs --live       # actually post (only to enabled platforms)
node social/publish.mjs --live --platform=bluesky
```

Dry run is the default and needs no credentials. Nothing posts until `--live`.

## Secrets — environment variables only, never the repo

```
BLUESKY_HANDLE, BLUESKY_APP_PASSWORD      # bsky.social → Settings → App Passwords
MASTODON_TOKEN                            # your instance → Preferences → Development → new app (write:statuses, write:media)
IG_USER_ID, IG_ACCESS_TOKEN               # Meta app + Business/Creator account (the fragile one)
```

Keep the repo's `.gitignore` free of these — they live in the runtime's secret store
(Cloudflare Worker secrets, or GitHub Actions secrets), not in any file.

## What only you can do (I can't create accounts or hold tokens)

- **Bluesky** *(easiest — start here)*: create the account, generate an App Password. Open API, no review.
- **Mastodon**: pick an instance, create the account, make a Development application, copy its token. Set `platforms.mastodon.instance` in `config.json`.
- **Instagram** *(hardest)*: Business/Creator account → linked Facebook Page → Meta app → long-lived token (refresh ~every 60 days; the Worker can automate the refresh). Also needs a **JPEG** image variant on the site (the plugin maps `.webp` → `.jpg`).

## Runtime — the parked Cloudflare Worker

`social/worker/` holds a Cloudflare Worker with a cron trigger — the *same stack
the site deploys on*, no third-party scheduler, no always-on box. **It is parked:
committed dormant, not deployed, and a no-op even if deployed until a platform is
enabled and its secrets are set.** The same plugins run here and under Node.

When you're ready (Bluesky first):

```bash
cd social/worker
wrangler kv namespace create SOCIAL_KV     # paste the id into wrangler.toml
wrangler secret put BLUESKY_HANDLE          # + BLUESKY_APP_PASSWORD
wrangler secret put TRIGGER_KEY             # any random string
# set platforms.bluesky.enabled = true in ../config.json, then:
wrangler deploy
```

Preview safely once deployed (defaults to dry): `https://<worker-url>/?key=<TRIGGER_KEY>`
— add `&dry=0` to actually post one item now. The daily cron does the rest.

*Fallback if you ever want it off Cloudflare: a scheduled GitHub Action running
`node social/publish.mjs --live` with the same secrets as Actions secrets. (Actions
cron can lag and auto-disables after 60 days of repo inactivity.)*

## Honest status

The plugins' `post()` paths are written to each platform's documented API but are
**unverified against a live API** until real credentials exist. Wire one platform
at a time, run it once for real, confirm, then enable it. Bluesky first: it's the
most open, and its users are the ones who already left the big platforms.
