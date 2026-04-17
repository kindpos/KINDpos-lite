# 11. File Reference

## Core

- `frontend/js/tokens.js:7` — `T` object with baseline (Terminal Glow) values.
- `frontend/js/tokens.js:141` — `T.categoryPalette` + `T.catColor` accessor.
- `frontend/js/tokens.js:152` — `T.textPrimary` / `T.textSecondary` defaults.
- `frontend/js/tokens.js:185` — `chamfer(s)` clip-path generator.
- `frontend/js/tokens.js:190` — `bevelEdges(fillColor)` edge color resolver.
- `frontend/js/tokens.js:211` — `shadowColor(fillColor)`.
- `frontend/js/tokens.js:239` — `_EMB_VARIANTS` embossed button table.
- `frontend/js/tokens.js:272` — `_EMB_SIZES` size ramp.
- `frontend/js/tokens.js:297` — `buildStyledButton`.
- `frontend/js/tokens.js:386` — `applySunkenStyle`.
- `frontend/js/tokens.js:395` — `applyRaisedStyle`.
- `frontend/js/tokens.js:431` — `onThemeChange`.
- `frontend/js/tokens.js:435` — `setTheme`.
- `frontend/js/tokens.js:459` — `resetTheme`.
- `frontend/js/tokens.js:479` — `_recomputeEmbossed`.

## Theme construction

- `frontend/js/theme-manager.js:23` — `lightenHex`.
- `frontend/js/theme-manager.js:34` — `darkenHex`.
- `frontend/js/theme-manager.js:43` — `hexToRgba`.
- `frontend/js/theme-manager.js:55` — `cardFilter`.
- `frontend/js/theme-manager.js:60` — `cardFilterLight`.
- `frontend/js/theme-manager.js:71` — `applyCardBevel`.
- `frontend/js/theme-manager.js:81` — `applyCardBevelHalf`.
- `frontend/js/theme-manager.js:107` — `buildCard`.

## Theme registry

- `frontend/js/themes/index.js:21` — `THEMES` catalog for the settings UI.

## Branded theme files

- `frontend/js/themes/sammys-pizza.js` (Pizza Palace)
- `frontend/js/themes/neon-diner.js`
- `frontend/js/themes/steakhouse.js`
- `frontend/js/themes/tiki-bar.js`
- `frontend/js/themes/ramen-shop.js`
- `frontend/js/themes/bbq-pit.js`
- `frontend/js/themes/seafood-shack.js`
- `frontend/js/themes/speakeasy.js`
- `frontend/js/themes/farm-table.js`
- `frontend/js/themes/rooftop-bar.js`
- `frontend/js/themes/atomic-purple.js`
- `frontend/js/themes/rainbow.js`

## Card/theme consumers

- `frontend/js/scenes/server-landing-sm2.js`
- `frontend/js/scenes/server-checkout.js`
- `frontend/js/scenes/order-entry.js`
- `frontend/js/scenes/manager-landing-sm2.js`
- `frontend/js/scenes/close-day.js`
- `frontend/js/scenes/checkout-core.js`
- `frontend/js/scenes/clock-in.js`
- `frontend/js/modifier-panel.js`
- `frontend/js/order-summary.js`
