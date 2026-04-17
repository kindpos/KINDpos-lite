# 5. Shared Category Palette Contract

Every theme defines `categoryPalette` with the same five keys:

- `PIZZA`
- `APPS`
- `SUBS`
- `SIDES`
- `DRINKS`

Defined in `tokens.js:141`. Accessed via `T.catColor(category)` (`tokens.js:149`), which uppercase-normalises and falls back to `T.mint` if the key isn't present.

## Per-theme palettes

| Theme | PIZZA | APPS | SUBS | SIDES | DRINKS |
|-------|-------|------|------|-------|--------|
| terminal-glow | `#ff4757` | `#ffd93d` | `#C6FFBB` | `#70a1ff` | `#ffa502` |
| pizza-palace | `#CC2200` | `#fbb03b` | `#5a9a30` | `#2288aa` | `#cc8800` |
| neon-diner | `#ff2d78` | `#00f5ff` | `#7b2fff` | `#ffd700` | `#00f5ff` |
| steakhouse | `#8b1a1a` | `#c9943a` | `#6a8a6a` | `#a07030` | `#8b5a2a` |
| tiki-bar | `#ff8c42` | `#5cff8f` | `#00b4d8` | `#ffdd44` | `#ff8c42` |
| ramen-shop | `#ff3a3a` | `#3a8eff` | `#ffaa00` | `#e8e8ff` | `#3a8eff` |
| bbq-pit | `#ff6b1a` | `#ffd166` | `#8b4513` | `#ff8c4a` | `#c0a040` |
| seafood-shack | `#ff6b6b` | `#00cfcf` | `#f7c948` | `#3a9fbf` | `#00a8a8` |
| speakeasy | `#e84393` | `#b39ddb` | `#f8c94a` | `#6c5ce7` | `#a29bfe` |
| farm-table | `#c0392b` | `#d4a84b` | `#8fcc5c` | `#7f5a3c` | `#b87333` |
| rooftop-bar | `#ff7eb3` | `#ff9a3c` | `#5c3fa8` | `#ffe066` | `#c070ff` |
| atomic-purple | `#ff6e1a` | `#9b59ff` | `#87f79c` | `#fbb03b` | `#7040cc` |
| rainbow | `#ff3333` | `#ff9933` | `#33cc33` | `#3399ff` | `#cc66ff` |

## Notes

- Palette is **deep-merged** in `setTheme` (`tokens.js:440`), so a theme that omits a key retains the default for that slot.
- Fixed to five keys. Any new top-level menu category needs a simultaneous edit across 13 themes — or it falls back to `T.mint`.
