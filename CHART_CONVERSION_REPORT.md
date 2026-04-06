# KINDpos/lite — Chart Conversion Report (Phase 1)
## v4 Spec Color Conversion — 2026-04-05

---

## FILES CREATED

### `frontend/js/chart-colors.js`
Single source of truth for all chart data colors:
- `DATA.orange` (#ff8833) — Food / Today / Primary
- `DATA.coral` (#ff5544) — Money / Axes / Cumulative / Tips
- `DATA.pink` (#e84088) — Drink / Secondary
- `DATA.violet` (#8844dd) — Other / Tertiary
- `DATA.blue` (#4466ff) — Last Week / Reference
- 5 heatmap tier colors
- Warning (#ffff00) / Critical (#ff3355)
- Pattern background (#0a0a0a)

### `frontend/js/chart-patterns.js`
SVG pattern definitions and glow filters:
- 7 pattern fills (orange dots, coral crosshatch, pink hatch, violet crosshatch, blue dots, warning, critical)
- 5 glow filters (orange, coral, pink, violet, blue)
- `injectChartDefs(svg)` — injects all defs into any SVG
- `PAT` object — pattern fill URL strings
- `GLOW` object — glow filter URL strings

---

## FILES MODIFIED

### `frontend/js/chart-helpers.js`

#### CHART constant (line 15)
| Old Key | Old Value | New Key | New Value |
|---------|-----------|---------|-----------|
| `CHART.axisFill` | `#7bed9f` (mintB) | `CHART.axisFill` | `DATA.coral` (#ff5544) |
| `CHART.cyan` | `#33ffff` | REMOVED | — |
| `CHART.lavender` | `#b48efa` | REMOVED | — |
| `CHART.gold` | `#fcbe40` | Kept for UI chrome only | — |
| `CHART.orange` | `#ff8c42` | `CHART.orange` | `DATA.orange` (#ff8833) |
| `CHART.pink` | `#ff6b9d` | `CHART.pink` | `DATA.pink` (#e84088) |
| `CHART.teal` | `#00cca3` | REMOVED | — |
| `CHART.sky` | `#66ccff` | REMOVED | — |
| `CHART.hotPink` | `#ff2a6d` | REMOVED | — |
| `CHART.electricBlue` | `#05d9e8` | REMOVED | — |
| `CHART.neonYellow` | `#d1f700` | REMOVED | — |
| `CHART.neonPurple` | `#bf40ff` | REMOVED | — |
| `CHART.limeGreen` | `#39ff14` | REMOVED | — |
| `CHART.neonOrange` | `#ff6e27` | REMOVED | — |
| `CHART.yellow` | `#ffff00` | `CHART.yellow` | `DATA.warning` (#ffff00) |
| `CHART.red` | `#ff4757` | `CHART.red` | `DATA.critical` (#ff3355) |
| — | — | `CHART.coral` | `DATA.coral` (#ff5544) NEW |
| — | — | `CHART.violet` | `DATA.violet` (#8844dd) NEW |
| — | — | `CHART.blue` | `DATA.blue` (#4466ff) NEW |
| — | — | 5 heatmap tiers | NEW |

#### drawBarChart (line 74)
- Default color: `CHART.cyan` → `DATA.orange`
- Default compare: `CHART.lavender` → `DATA.blue`
- Gradient fills → pattern fills with 1.5px stroke
- X-axis labels: `CHART.gold` → `DATA.coral`

#### drawStackedArea (line 163)
- Default color: `CHART.cyan` → `DATA.orange`
- Default compare: `CHART.lavender` → `DATA.blue`
- Gradient fills → pattern fills
- Line widths: 4.5px → 3px (primary), 4px → 2.5px (compare)
- Added glow filters on lines

#### drawParetoChart (line 291)
- Default bar: `CHART.gold` → `DATA.orange`
- Default line: `CHART.cyan` → `DATA.coral`
- Gradient fills → pattern fills with 1.5px stroke
- X-axis labels: `CHART.gold` → `DATA.coral`

#### drawHorizontalBars (line 383)
- Default color: `CHART.cyan` → `DATA.orange`
- Label text: `CHART.mint` → `DATA.coral`

#### drawTrendLine (line 421)
- Default color: `CHART.cyan` → `DATA.orange`
- Default compare: `CHART.lavender` → `DATA.blue`
- Gradient area fills → pattern fills
- Line widths: 3.5px → 3px (primary), 3.5px → 2.5px (compare)
- Added glow filters on lines

#### drawProgressBar (line 537)
- Default color: `CHART.cyan` → `DATA.orange`

#### NEW: drawStackedColumn (line 550)
- Stacked bars bottom-up with pattern fills
- Cumulative line overlay in coral, dashed 5,3
- Square data points on cumulative line

#### NEW: drawHistogram (line 620)
- Coral crosshatch bars
- Orange count labels inside/above bars
- Summary stat (AVG) in coral

#### NEW: drawHeatmap (line 670)
- 7 rows × N columns grid
- 5 solid gradient tiers (dead → slammed)
- Glow filter on busy + slammed cells
- Legend row below chart

#### NEW: drawParetoHBar (line 750)
- Horizontal bars descending by value
- Per-item pattern fills (food=orange dots, drink=pink hatch)
- Dollar labels with glow in coral
- Cumulative % line in coral, dashed 5,3

---

### `frontend/js/scenes/reporting.js`

#### Manager Sales Panels (buildManagerSalesPanels)
| Panel | Old Chart | Old Colors | New Chart | New Colors |
|-------|-----------|-----------|-----------|------------|
| Q1 | Bar (teal+orange) | `#00cca3`, `#ff8c42` | Stacked Column + Line | orange dots, pink hatch, violet crosshatch, coral cumulative |
| Q2 | Stacked Area (hotPink+electricBlue) | `#ff2a6d`, `#05d9e8` | Heatmap | 5 solid tiers, coral labels |
| Q3 | Pareto (neonYellow+hotPink) | `#d1f700`, `#ff2a6d` | Multi-Series Line | orange today, blue last week |
| Q4 | DOM bar (gold+sky) | `#fcbe40`, `#66ccff` | Pareto HBar | orange dots food, pink hatch drink, coral labels |

#### Manager Labor Panels (buildManagerLaborPanels)
| Panel | Old Color | New Color |
|-------|-----------|-----------|
| TOTAL HRS bars | `CHART.cyan` (#33ffff) | `DATA.orange` (#ff8833) |
| TIP POOL bars | `CHART.gold` (#fcbe40) | `DATA.coral` (#ff5544) |
| TIP POOL text | `CHART.mint`/`CHART.gold` | `DATA.coral` |
| COB % line | `CHART.neonPurple` (#bf40ff) | `DATA.orange` (#ff8833) |
| COB % thresholds | `CHART.yellow`/`CHART.red` | `DATA.warning`/`DATA.critical` |
| OT ALERT bars | `CHART.cyan` (#33ffff) | `DATA.orange` (#ff8833) |
| OT ALERT status | `CHART.yellow`/`CHART.cyan` | `DATA.warning`/`DATA.orange` |

#### Server Shift Panels (buildServerShiftPanels)
| Panel | Old Chart | Old Colors | New Chart | New Colors |
|-------|-----------|-----------|-----------|------------|
| Q1 | Bar (electricBlue) | `#05d9e8` | Stacked Column + Line | orange dots food, pink hatch drink, coral cumulative |
| Q2 | HBar (teal) | `#00cca3` | Histogram | coral crosshatch, orange labels |
| Q3 | TrendLine (neonOrange+limeGreen) | `#ff6e27`, `#39ff14` | Multi-Series Line | orange today, blue last week |
| Q4 | DOM text (gold/red) | `#fcbe40`, `#ff4757` | Pareto HBar | orange dots food, pink hatch drink, coral labels |

#### Server Hours Panels (buildServerHoursPanels)
| Panel | Old Color | New Color |
|-------|-----------|-----------|
| TODAY'S SHIFT text | `CHART.cyan`/`CHART.mint` | `DATA.orange`/`DATA.coral` |
| Progress bar | `CHART.cyan` | `DATA.orange` |
| WEEKLY HOURS bars | `CHART.electricBlue` (#05d9e8) | `DATA.orange` + orange dot pattern |
| Scheduled outlines | `CHART.electricBlue` | `DATA.orange` |
| TOTAL HRS progress | `CHART.cyan` | `DATA.orange` |
| Table day labels | `CHART.mint` | `DATA.coral` |
| Table hrs values | `CHART.cyan` | `DATA.orange` |
| OT ALERT status | `CHART.yellow`/`CHART.red`/`CHART.cyan` | `DATA.warning`/`DATA.critical`/`DATA.orange` |
| OT breakdown text | `CHART.mint`/`CHART.cyan`/`CHART.yellow` | `DATA.coral`/`DATA.orange`/`DATA.warning` |
