# 4. Shared Font Color Tokens

Two canonical text slots are honoured by every theme:

| Token | Role | Default (`tokens.js:152`) |
|-------|------|----------|
| `T.textPrimary` | Body / headings | `#f5f0e8` |
| `T.textSecondary` | Muted / captions | `#b0a898` |

## Per-theme values

Every branded theme lands `textPrimary` in the near-white family, warmed or cooled to match its surface tone. **Pizza Palace** is the only inversion — dark ink on a cream surface.

| Theme | textPrimary | textSecondary | Note |
|-------|-------------|---------------|------|
| pizza-palace | `#1e1e1e` | `#5a4a3a` | dark on cream — inverted |
| neon-diner | `#eeeeff` | `#a0a0cc` | cool white |
| steakhouse | `#e8d5a3` | `#b0986a` | parchment |
| tiki-bar | `#ffe8cc` | `#c0a070` | warm sand |
| ramen-shop | `#e8e8ff` | `#a0a0c8` | paper white |
| bbq-pit | `#f0dcc0` | `#a08a68` | warm parchment |
| seafood-shack | `#e8f0f2` | `#8ab0c0` | cool white-blue |
| speakeasy | `#ede8f5` | `#a090c0` | soft lavender |
| farm-table | `#f0e8d8` | `#b0a080` | warm cream |
| rooftop-bar | `#f5eef8` | `#b898d0` | warm white-pink |
| atomic-purple | `#e8e8f0` | `#9898b0` | cool silver-white |
| rainbow | `#f0f0ff` | `#b0b0cc` | near white |

## Tertiary text ladder

Shared dimmer tier via the surface section (not the typography section):

- `dimText` — deepest (axis labels, disabled hints)
- `subtleText` — mid
- `mutedText` — lightest of the dim tier

These aren't named as "typography" tokens even though they're text colors. Relocating them would make the role obvious.

## Embossed labels (per-variant)

Separate from body text, so button face contrast can be tuned independently:

- `embGoldLabel`
- `embMintLabel`
- `embCyanLabel` (default only — most themes don't override)
- `embVermLabel`

`ghost` and `dark` variants reuse `T.textPrimary`.
