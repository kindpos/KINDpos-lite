# 3. Shared Card System

Card construction is centralised in `frontend/js/theme-manager.js`. Themes supply colors; geometry and bevel logic live in one place.

## Builders

- `buildCard(opts)` — `theme-manager.js:107`
  Returns `{ wrap, card }`. The outer `wrap` carries the drop-shadow filter; the inner `card` gets the chamfered clip-path, beveled border, background, and padding.
- `applyCardBevel(el, borderColor, width)` — `theme-manager.js:71`
  Full 4-side bevel — top/left lightened 20%, bottom/right darkened 30%.
- `applyCardBevelHalf(el, borderColor, width)` — `theme-manager.js:81`
  Top/left-only bevel for flush grid cards.
- `cardFilter()` / `cardFilterLight()` — `theme-manager.js:55,60`
  Standard `drop-shadow` offset; the default variant adds a mint ambient glow `rgba(135,247,156,0.15)` baked in from Terminal Glow.

## Defaults

| Option | Default |
|--------|---------|
| `borderColor` | `T.numpadChassis` |
| `borderWidth` | `7px` |
| `chamferSize` | `10` |
| `bg` | `T.bg` |
| `padding` | `20px` |
| `glow` | `true` |

`chamfer()` (`tokens.js:185`) generates the 8-sided clip-path polygon reused by every card and every embossed button.

## Color Utilities

- `lightenHex(hex, pct)` — `theme-manager.js:23`
- `darkenHex(hex, pct)` — `theme-manager.js:34`
- `hexToRgba(hex, alpha)` — `theme-manager.js:43`

Bevel edges are derived at call time from whatever `T.numpadChassis` currently is — so every theme automatically re-skins card frames through its `numpadChassis` override without touching card call sites.

## Consumers (10 files)

- `scenes/server-landing-sm2.js`
- `scenes/server-checkout.js`
- `scenes/order-entry.js`
- `scenes/manager-landing-sm2.js`
- `scenes/close-day.js`
- `scenes/checkout-core.js`
- `scenes/clock-in.js`
- `modifier-panel.js`
- `order-summary.js`
- `theme-manager.js` (internal)
