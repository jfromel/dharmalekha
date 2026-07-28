# postcards — print-on-demand, parked

A hands-off postcard system in the same swappable style as `social/`. A fixed
**catalog of pre-approved art** (a projection of the gallery) is printed and mailed
by a provider — you never touch a card. Providers are plugins; Lob today, a
Stannp/PostGrid swap tomorrow, one file each.

## Files

| File | Role |
|---|---|
| `catalog.json` | The card catalog, generated from the gallery. Each card: `{src, title, size, fit, enabled}`. |
| `build-catalog.mjs` | (Re)generate the catalog; `4x6` for landscape/portrait, `5x5` for squares. |
| `config.json` | Non-PII settings: site, card back HTML, prices. **No addresses.** |
| `fulfill.mjs` | One approved order → one mailed card. Holds the address in memory only. |
| `providers/lob.mjs` | Lob print-and-mail plugin. |

## Resolution & format (measured)

**Every card is 4×6** — the standard mailed postcard, which is physically
**landscape**. All 30 non-square images clear 233–256 dpi at 4×6 (good → very
good); the eight 3:2 art landscapes are a *perfect* fit (zero crop at 256 dpi).
5×7 was dropped (falls to ~180–200 dpi). Because the card is landscape:

- **Landscape images** → `fit: crop`, fill the card edge to edge.
- **Portrait & square images** → `fit: border`, **matted** (centered on a white
  6×4 field) so nothing is cropped — and matting prints them *smaller*, so their
  effective DPI only goes up. (If you ever want true portrait cards, that's a
  portrait-capable product/provider — another plugin.)

## The order flow (design)

```
web form (pick card · address · explicit checkboxes)
   → Stripe Checkout (payment)
   → webhook / Worker  →  fulfill(order)  →  provider mails the card
   → confirmation. Address discarded.
```

Because every card is pre-approved art, orders **auto-fulfill** — no per-order
approval from you.

## PII — the rule, in plain terms

Postcards are the only part that touches a user's personal data. It is handled to
your standing rule: *never published, sold, or given to others; never on the git.*

- **Opt-in is explicit and separate.** Any "join the list / subscribe" is its own
  checkbox, **unticked by default**. Buying a card never subscribes anyone. The
  list (if you keep one) stores only those who ticked it, with their consent.
- **A recipient's address is used only to mail their card.** It is held in memory,
  passed straight to the mail provider (the one processor that must see it to ship),
  and **never written to the repo, never logged, and not retained after the order
  is delivered.** `fulfill.mjs` returns only a tracking id — never the address.
- **Your own return address stays out of the repo too** — it comes from env
  (`LOB_FROM_*`), never a committed file.
- **Nothing is shared beyond fulfillment.** No selling, no third parties past the
  printer/mailer required to deliver the card.

## Activation — yours (I can't create accounts, hold keys, or take payment)

1. **Lob** account → API key. Set env `LOB_API_KEY` and your return address
   `LOB_FROM_NAME / LOB_FROM_LINE1 / LOB_FROM_CITY / LOB_FROM_STATE / LOB_FROM_ZIP`.
2. **Stripe** account → the order page collects payment + address via Stripe
   Checkout; a webhook (a small Worker, same stack as `social/worker/`) calls
   `fulfill()` on `payment succeeded`.
3. Set **prices** in `catalog.json` (**Right Livelihood**: cover print + postage +
   fair labor — the digital art stays free, CC0). Flip cards' `enabled` as you like.

## Honest status

- `providers/lob.mjs` is written to Lob's documented API but **unverified against
  the live API** until a real key exists — send one real card and confirm first.
- **Matted (`fit: border`) cards need a pre-composed front** — the image centered
  on a white 6×4 canvas. That print-prep step (one `sharp` call per card) is a TODO
  for live wiring; until then the raw hi-res original is passed and Lob crops it.
- Card fronts use the hi-res PNG originals already on the site; add bleed in the
  print file if the provider requires it.
