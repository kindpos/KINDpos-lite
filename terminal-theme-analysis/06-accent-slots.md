# 6. Shared Structural Accent Slots

Two slots carry visual meaning across all themes despite legacy naming:

## `mint` — primary structural accent

Terminal Glow value: `#C6FFBB` (actual mint). In branded themes, this is the "brand hero" — not a literal mint color:

| Theme | `mint` value | Intent |
|-------|--------------|--------|
| pizza-palace | `#CC2200` | Sammy's red |
| neon-diner | `#ff2d78` | hot pink |
| steakhouse | `#c9943a` | brass |
| tiki-bar | `#5cff8f` | palm green |
| ramen-shop | `#ff3a3a` | lantern red |
| bbq-pit | `#ff6b1a` | ember orange |
| seafood-shack | `#00cfcf` | teal |
| speakeasy | `#b39ddb` | velvet purple |
| farm-table | `#d4a84b` | wheat gold-amber |
| rooftop-bar | `#ff7eb3` | rose |
| atomic-purple | `#9b59ff` | atomic purple |
| rainbow | `#ff3333` | red band |

Used for: numpad chassis edge, card bevel base (via `T.numpadChassis` which tracks `mint` for most themes), `frameTransactional` overlay, `cardFilter` ambient glow (hardcoded mint — see gap in `10-observations.md`).

## `cyan` — secondary / card accent

Default: `#33ffff`. Varies by theme — Steakhouse muted olive, Tiki neon teal, etc. Used where a cool counterpoint to the hero accent is needed (card highlight, secondary data series, etc.).

## Gotcha

The names are legacy and do **not** describe the actual color. Renaming to `accentPrimary` / `accentSecondary` would match usage but is a cross-cutting change — 10+ scene files and the modifier / order-summary modules read `T.mint` / `T.cyan` directly.
