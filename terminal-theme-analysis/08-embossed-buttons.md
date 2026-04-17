# 8. Shared Embossed Button System

## Variant table

`tokens.js:239` defines 6 variants, each with `bg`, `label`, `shadow`, `shadowActive`:

| Variant | Bg token | Label token | Typical use |
|---------|----------|-------------|-------------|
| `dark` | `T.embDarkBg` | `T.textPrimary` | default / neutral |
| `gold` | `T.embGoldBg` | `T.embGoldLabel` | decision / pay |
| `mint` | `T.embMintBg` | `T.embMintLabel` | confirm / go |
| `cyan` | `T.embCyanBg` | `T.embCyanLabel` | info / secondary |
| `vermillion` | `T.embVermBg` | `T.embVermLabel` | critical / void |
| `ghost` | `T.embGhostBg` | `T.textPrimary` | low-emphasis |

Themes override `emb*Bg`, `emb*Label`, `emb*Edge` tokens. `_recomputeEmbossed()` (`tokens.js:479`) refreshes the variant table on every `setTheme` / `resetTheme` so live-swap works without rebuilding buttons.

## Entry point

- `buildStyledButton(arg)` — `tokens.js:297`
  Accepts either the new API (`{variant, size, label, onClick, disabled}`) or a legacy fill color. `_fillToVariant()` (`tokens.js:278`) maps legacy colors onto variants.

## Size ramp

Three sizes (`tokens.js:272`):

| Size | Height | Min width | Font size |
|------|--------|-----------|-----------|
| `sm` | `40px` | `110px` | `18px` |
| `md` | `55px` | `220px` | `22px` |
| `lg` | `62px` | `220px` | `31px` |

## Shared interaction behaviour

`buildStyledButton` wires pointer handlers (`tokens.js:352–371`): hover brightens, press scales 0.97 + increases inset shadow, release restores. Every theme inherits the same tactile feel — only the color surface changes.

## Other shared style helpers

- `applySunkenStyle(el)` — `tokens.js:386`: inverted bevel (dark top/left, light bottom/right) for recessed fields like PIN input.
- `applyRaisedStyle(el, fillColor)` — `tokens.js:395`: convex bevel using `bevelEdges(fillColor)` to resolve edge colors.
