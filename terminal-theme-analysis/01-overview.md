# 1. Theme System Overview

The terminal ships **13 selectable themes** registered in `frontend/js/themes/index.js:21`:

| # | ID | Label | File |
|---|----|-------|------|
| 0 | `terminal-glow` | Terminal Glow (default) | `tokens.js` baseline |
| 1 | `pizza-palace` | Pizza Palace | `sammys-pizza.js` |
| 2 | `neon-diner` | Neon Diner | `neon-diner.js` |
| 3 | `steakhouse` | Steakhouse | `steakhouse.js` |
| 4 | `tiki-bar` | Tiki Bar | `tiki-bar.js` |
| 5 | `ramen-shop` | Ramen Shop | `ramen-shop.js` |
| 6 | `bbq-pit` | BBQ Pit | `bbq-pit.js` |
| 7 | `seafood-shack` | Seafood Shack | `seafood-shack.js` |
| 8 | `speakeasy` | Speakeasy | `speakeasy.js` |
| 9 | `farm-table` | Farm Table | `farm-table.js` |
| 10 | `rooftop-bar` | Rooftop Bar | `rooftop-bar.js` |
| 11 | `atomic-purple` | Atomic Purple | `atomic-purple.js` |
| 12 | `rainbow` | Rainbow | `rainbow.js` |

## Runtime Machinery

- `tokens.js:435` — `setTheme(overrides)`: merges overrides onto `T`, deep-merges object values (e.g. `categoryPalette`, `roles`), recomputes embossed variants, notifies listeners.
- `tokens.js:459` — `resetTheme()`: restores the defaults snapshot captured at load time (`_defaults` + `_defaultObjects`).
- `tokens.js:431` — `onThemeChange(fn)`: listener registration. SceneManager re-applies geometry on each fire.
- `tokens.js:479` — `_recomputeEmbossed()`: refreshes the embossed button variant table so themes that override `emb*Bg` / `emb*Label` take effect without rebuilding buttons.
