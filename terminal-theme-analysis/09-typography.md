# 9. Typography (Shared — Not Themed)

Fonts and the size ramp live only in `tokens.js:74–90`. **No theme file overrides any of these**, so every theme inherits the same type rhythm.

## Font families

| Token | Value | Role |
|-------|-------|------|
| `T.fh` | `Chakra Petch, sans-serif` | headings |
| `T.fhr` | `Chakra Petch, sans-serif` | heading (regular) |
| `T.fb` | `B612 Mono, monospace` | body / numpad / check text |

## Size ramp

| Token | Value | Use |
|-------|-------|-----|
| `fsNumpad` | `100px` | numpad digits |
| `fsQuick` | `70px` | quick keys |
| `fsHeader` | `70px` | scene headers |
| `fsClr` | `70px` | CLR key |
| `fsMgmt` | `60px` | manager landing tiles |
| `fsDenom` | `42px` | currency denominations |
| `fsMed` | `40px` | medium headings |
| `fsItem` | `35px` | order-summary items |
| `fsMod` | `35px` | modifier panel |
| `fsBtn` | `35px` | standard button labels |
| `fsBtnSm` | `30px` | small button labels |
| `fsSmall` | `25px` | metadata / timestamps |
| `fsCon` | `20px` | console / logs |
| `fsConSm` | `18px` | console small |

## Layout constants (also shared)

`appW: 1024`, `appH: 600`, `headerH: 52`, `scenePad: 20`, `colGap: 20`, `colGapSm: 12`, `pcLeftW: 320`. Themes can technically override these via `setTheme` but no shipped theme does — the app is designed around the 1024×600 terminal viewport.
