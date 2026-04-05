# KINDpos/lite — Chart Audit Report (Phase 0)
## v4 Spec Compliance Audit — 2026-04-05

---

## FILES SCANNED

| File | Contains Chart Rendering |
|------|------------------------|
| `frontend/js/chart-helpers.js` | YES — 8 chart functions + 2 panel/grid builders |
| `frontend/js/scenes/reporting.js` | YES — 4 panel-builder functions (16 chart panels total) |
| `frontend/js/tokens.js` | Color token definitions (source of truth for current palette) |
| `frontend/js/scenes/snapshot.js` | DOES NOT EXIST |
| `frontend/js/chart-colors.js` | DOES NOT EXIST (needs creation) |
| `frontend/js/chart-patterns.js` | DOES NOT EXIST (needs creation) |
| `frontend/js/theme-manager.js` | DOES NOT EXIST |
| `frontend/js/hex-nav.js` | Contains SVG but NOT chart-related |

---

## CURRENT COLOR TOKEN MAP

### From `tokens.js` (lines 7-78)

| Token | Hex | Role |
|-------|-----|------|
| `T.cyan` | `#33ffff` | UI Chrome — should NOT be chart data |
| `T.gold` | `#fcbe40` | UI Chrome — should NOT be chart data |
| `T.lavender` | `#b48efa` | UI Chrome — should NOT be chart data |
| `T.mint` | `#C6FFBB` | UI Chrome — should NOT be chart data |
| `T.mintB` | `#7bed9f` | Used for axis labels inside charts |
| `T.yellow` | `#ffff00` | Warning — OK per spec |
| `T.redB` | `#ff4757` | Critical — close to spec `#ff3355` |

### From `chart-helpers.js` CHART constant (lines 15-41)

| Key | Hex | v4 Violation? |
|-----|-----|---------------|
| `CHART.cyan` | `#33ffff` | **CRITICAL** — UI chrome used as primary data color |
| `CHART.lavender` | `#b48efa` | **CRITICAL** — UI chrome used as compare data color |
| `CHART.gold` | `#fcbe40` | **CRITICAL** — UI chrome used for money/axis labels & bar fills |
| `CHART.axisFill` | `#7bed9f` (mintB) | **CRITICAL** — should be coral `#ff5544` |
| `CHART.mint` | `#7bed9f` | **CRITICAL** — used as text labels inside charts |
| `CHART.orange` | `#ff8c42` | WARNING — close but not v4 orange `#ff8833` |
| `CHART.pink` | `#ff6b9d` | WARNING — not v4 pink `#e84088` |
| `CHART.hotPink` | `#ff2a6d` | **CRITICAL** — not in v4 data palette |
| `CHART.electricBlue` | `#05d9e8` | **CRITICAL** — not in v4 data palette |
| `CHART.neonYellow` | `#d1f700` | **CRITICAL** — not in v4 data palette |
| `CHART.neonPurple` | `#bf40ff` | **CRITICAL** — not in v4 data palette |
| `CHART.limeGreen` | `#39ff14` | **CRITICAL** — not in v4 data palette |
| `CHART.neonOrange` | `#ff6e27` | **CRITICAL** — not in v4 data palette |
| `CHART.teal` | `#00cca3` | **CRITICAL** — not in v4 data palette |
| `CHART.sky` | `#66ccff` | **CRITICAL** — not in v4 data palette |

---

## CHART FUNCTION INVENTORY

### `chart-helpers.js`

#### 1. `drawBarChart()` — Line 74
- **Type:** Side-by-side vertical bars with linearGradient
- **Default Colors:** `CHART.cyan` (#33ffff), `CHART.lavender` (#b48efa)
- **Axis labels:** `CHART.axisFill` (#7bed9f) — line 121
- **X-axis labels:** `CHART.gold` (#fcbe40) — line 152
- **Value callout bg:** `T.bgDark` (#1a1a1a) — line 147
- **Violations:** cyan, lavender, gold, mintB all used as chart data
- **v4 Requirement:** Should be Stacked Column (not side-by-side), pattern fills instead of gradients

#### 2. `drawStackedArea()` — Line 163
- **Type:** Overlapping filled areas with gradient + polyline
- **Default Colors:** `CHART.cyan` (#33ffff), `CHART.lavender` (#b48efa)
- **Axis labels:** `CHART.axisFill` (#7bed9f) — line 205
- **X-axis labels:** `CHART.gold` (#fcbe40) — line 271
- **Violations:** cyan, lavender, gold, mintB
- **v4 Requirement:** Not needed — replaced by Stacked Column + Line, Histogram, Heatmap, Multi-Series Line

#### 3. `drawParetoChart()` — Line 291
- **Type:** Vertical bars + cumulative polyline
- **Default Colors:** `CHART.gold` (#fcbe40) bars, `CHART.cyan` (#33ffff) line
- **Axis labels:** `CHART.axisFill` (#7bed9f) — line 328
- **X-axis labels:** `CHART.gold` (#fcbe40) — line 354
- **Right-axis %:** `lineColor` param — line 375
- **Violations:** gold, cyan, mintB
- **v4 Requirement:** Horizontal bars (not vertical), pattern fills, coral labels

#### 4. `drawHorizontalBars()` — Line 383
- **Type:** Horizontal bars with text labels
- **Default Colors:** `CHART.cyan` (#33ffff)
- **Label text:** `CHART.mint` (#7bed9f) — line 408
- **Violations:** cyan, mintB
- **v4 Requirement:** Not directly mapped to v4 quadrants — may be reusable for Pareto

#### 5. `drawTrendLine()` — Line 421
- **Type:** Line chart with optional shading, thresholds, compare line
- **Default Colors:** `CHART.cyan` (#33ffff), `CHART.lavender` (#b48efa)
- **Axis labels:** `CHART.axisFill` (#7bed9f) — line 484
- **X-axis labels:** `CHART.gold` (#fcbe40) — line 529
- **Square data points:** YES (rect elements) — lines 507, 524 ✓
- **Compare dashed:** YES (8,4) — line 505 ✓
- **Violations:** cyan, lavender, gold, mintB
- **v4 Requirement:** Reusable for Q3 Multi-Series Line with color/pattern changes

#### 6. `drawProgressBar()` — Line 537
- **Type:** Simple progress bar with threshold markers
- **Default Colors:** `CHART.cyan` (#33ffff)
- **Warning/Critical:** `CHART.yellow` (#ffff00), `CHART.red` (#ff4757)
- **Violations:** cyan used as default
- **v4 Requirement:** Not a v4 quadrant chart, but colors inside SVG must comply

#### 7. `buildChartPanel()` — Line 574
- **Type:** DOM wrapper with header bar (not SVG chart data)
- **Title text:** `CHART.mint` (#7bed9f) — line 583
- **Value text:** `CHART.gold` (#fcbe40) — line 604
- **Note:** This is UI chrome (panel header), not chart data. Per spec, mint/gold allowed outside chart rendering areas.

#### 8. `buildChartGrid()` — Line 629
- **Type:** Layout infrastructure — no colors
- **Violations:** None

---

## REPORTING.JS — PANEL BUILDERS vs V4 SPEC

### Manager Sales Panels (`buildManagerSalesPanels`, line 356)

| Quadrant | Current Panel | Current Colors | v4 Required Chart | v4 Required Colors |
|----------|--------------|----------------|-------------------|--------------------|
| Q1 | NET SALES — side-by-side bar | teal `#00cca3` + orange `#ff8c42` | **Stacked Column + Line** (Food/Drink/Other by hour) | orange `#ff8833` dots (food), pink `#e84088` hatch (drink), violet `#8844dd` crosshatch (other), coral `#ff5544` cumulative line |
| Q2 | TOTAL CHECKS — stacked area | hotPink `#ff2a6d` + electricBlue `#05d9e8` | **Heatmap** (Peak Hours by Day-of-Week) | 5 solid heatmap tiers, coral labels |
| Q3 | CHECK AVG — pareto | neonYellow `#d1f700` bars + hotPink `#ff2a6d` line | **Multi-Series Line** (House Today vs Last Week) | orange `#ff8833` today, blue `#4466ff` last week |
| Q4 | CASH/CARD — DOM bar segments | gold `#fcbe40` + sky `#66ccff` | **Pareto Bar** (House Top Revenue Items) | orange `#ff8833` dots (food), pink `#e84088` hatch (drink), coral `#ff5544` labels |

### Manager Labor Panels (`buildManagerLaborPanels`, line 483)

| Quadrant | Current Panel | Current Colors | Notes |
|----------|--------------|----------------|-------|
| Q1 | TOTAL HRS — horizontal bars | cyan `#33ffff` | Not in v4 spec grid — this is the right-card expanded view |
| Q2 | TIP POOL — horizontal bars | gold `#fcbe40` | Not in v4 spec grid |
| Q3 | COB % — trend line | neonPurple `#bf40ff` | Not in v4 spec grid |
| Q4 | OT ALERT — horizontal bars | cyan/yellow/red | Not in v4 spec grid |

**Note:** The v4 spec defines Q1-Q4 for the _primary_ reporting view. Manager Labor panels are a secondary drill-down. Colors inside these charts still must use v4 data palette only.

### Server Shift Panels (`buildServerShiftPanels`, line 584)

| Quadrant | Current Panel | Current Colors | v4 Required Chart | v4 Required Colors |
|----------|--------------|----------------|-------------------|--------------------|
| Q1 | TOTAL GUESTS — bar chart | electricBlue `#05d9e8` | **Stacked Column + Line** (My Sales by Hour Food/Drink) | orange `#ff8833` dots (food), pink `#e84088` hatch (drink), coral `#ff5544` cumulative line |
| Q2 | TOTAL TABLES — horizontal bars | teal `#00cca3` | **Histogram** (My Tip Distribution) | coral `#ff5544` crosshatch bars, orange `#ff8833` count labels |
| Q3 | CHECK AVG — trend line | neonOrange `#ff6e27` + limeGreen `#39ff14` | **Multi-Series Line** (My Today vs Last Week) | orange `#ff8833` today, blue `#4466ff` last week |
| Q4 | TIPS/TIPOUT — DOM text panel | gold `#fcbe40` + red `#ff4757` | **Pareto Bar** (My Top Items Sold) | orange `#ff8833` dots (food), pink `#e84088` hatch (drink), coral `#ff5544` labels |

### Server Hours Panels (`buildServerHoursPanels`, line 672)

| Quadrant | Current Panel | Current Colors | Notes |
|----------|--------------|----------------|-------|
| Q1 | TODAY'S SHIFT — text + progress | cyan `#33ffff` | Not in v4 spec grid — secondary drill-down |
| Q2 | WEEKLY HOURS — bar chart | electricBlue `#05d9e8` | Not in v4 spec grid |
| Q3 | TOTAL HRS — progress bar + table | cyan `#33ffff` | Not in v4 spec grid |
| Q4 | OT ALERT — status box | cyan/yellow/red | Not in v4 spec grid |

**Note:** Same as Manager Labor — secondary drill-down panels still must use v4 data colors only.

---

## FINDINGS — SEVERITY RANKED

### CRITICAL — Wrong color in chart data / Wrong chart type

| # | File | Line(s) | Finding |
|---|------|---------|---------|
| C1 | `chart-helpers.js` | 15-41 | CHART constant defines 13 non-v4 data colors (cyan, lavender, gold, teal, hotPink, electricBlue, neonYellow, neonPurple, limeGreen, neonOrange, sky, orange #ff8c42, pink #ff6b9d) |
| C2 | `chart-helpers.js` | 16, 28 | `CHART.axisFill` and `CHART.mint` = `#7bed9f` used for axis/label text inside SVGs — should be coral `#ff5544` |
| C3 | `chart-helpers.js` | 25, 152, 271, 354, 529 | `CHART.gold` (#fcbe40) used for X-axis labels inside SVGs — should be coral `#ff5544` |
| C4 | `reporting.js` | 378 | Q1 Manager: uses teal+orange bar chart → needs Stacked Column + Line with orange/pink/violet + coral |
| C5 | `reporting.js` | 396 | Q2 Manager: uses hotPink+electricBlue stacked area → needs Heatmap with 5 solid tiers |
| C6 | `reporting.js` | 407 | Q3 Manager: uses neonYellow+hotPink pareto → needs Multi-Series Line orange+blue |
| C7 | `reporting.js` | 412-474 | Q4 Manager: uses gold+sky DOM bars → needs Pareto Bar with orange/pink + coral |
| C8 | `reporting.js` | 604 | Q1 Server: uses electricBlue bar chart → needs Stacked Column + Line with orange/pink + coral |
| C9 | `reporting.js` | 609-625 | Q2 Server: uses teal horizontal bars → needs Histogram with coral crosshatch |
| C10 | `reporting.js` | 640 | Q3 Server: uses neonOrange+limeGreen trend → needs Multi-Series Line orange+blue |
| C11 | `reporting.js` | 644-663 | Q4 Server: uses gold/red DOM text → needs Pareto Bar with orange/pink + coral |
| C12 | `reporting.js` | 499 | Manager Labor Q1: cyan `#33ffff` used as bar data fill |
| C13 | `reporting.js` | 511 | Manager Labor Q2: gold `#fcbe40` used as bar data fill |
| C14 | `reporting.js` | 534 | Manager Labor Q3: neonPurple `#bf40ff` used as line data color |
| C15 | `reporting.js` | 551-554 | Manager Labor Q4: cyan `#33ffff` used as bar default |
| C16 | `reporting.js` | 687-692 | Server Hours Q1: cyan `#33ffff` used as text/progress data |
| C17 | `reporting.js` | 711 | Server Hours Q2: electricBlue `#05d9e8` used as bar data |
| C18 | `reporting.js` | 739, 769-770 | Server Hours Q3: cyan `#33ffff` used as progress/table data |

### WARNING — Missing pattern fills / Missing chart features

| # | File | Line(s) | Finding |
|---|------|---------|---------|
| W1 | `chart-helpers.js` | 100-110 | Bar charts use linearGradient fills — v4 requires SVG pattern fills (dots, hatch, crosshatch) |
| W2 | `chart-helpers.js` | 190-198 | Area charts use linearGradient fills — v4 requires pattern fills |
| W3 | `chart-helpers.js` | 316-321 | Pareto bars use linearGradient fills — v4 requires pattern fills |
| W4 | `chart-helpers.js` | — | No SVG `<pattern>` definitions exist anywhere — all 5 v4 patterns missing |
| W5 | `chart-helpers.js` | — | No glow `<filter>` definitions exist — v4 requires glow on lines and heatmap cells |
| W6 | `chart-helpers.js` | — | No Histogram chart function exists — needs creation for Q2 Server |
| W7 | `chart-helpers.js` | — | No Heatmap chart function exists — needs creation for Q2 Manager |
| W8 | `chart-helpers.js` | — | No Stacked Column chart function exists — drawBarChart is side-by-side, not stacked |
| W9 | `chart-helpers.js` | 130-136 | Bars rendered as `rect` with gradient fill — v4 requires 1.5px stroke in data color |
| W10 | `chart-helpers.js` | 464-477 | Area fills use opacity gradients — v4 requires crosshatch/dotgrid pattern fills with #0a0a0a bg |

### INFO — Style inconsistencies

| # | File | Line(s) | Finding |
|---|------|---------|---------|
| I1 | `chart-helpers.js` | 220, 505 | Compare line stroke-dasharray = `8,4` — matches v4 spec ✓ |
| I2 | `chart-helpers.js` | 507, 524 | Data points use `rect` (square) — matches v4 spec ✓ |
| I3 | `chart-helpers.js` | 233, 522 | Primary line stroke-width = 3.5-4.5 — v4 requires 3px |
| I4 | `chart-helpers.js` | 220, 505 | Compare line stroke-width = 3.5-4 — v4 requires 2.5px |
| I5 | `tokens.js` | 27 | `T.redB` = `#ff4757` — v4 critical is `#ff3355` (minor difference) |
| I6 | `chart-helpers.js` | 604 | `buildChartPanel` value text uses `CHART.gold` — this is UI chrome, technically OK outside SVG |

---

## SUMMARY

| Severity | Count |
|----------|-------|
| CRITICAL | 18 |
| WARNING | 10 |
| INFO | 6 |

### Key Actions Required for Phase 1

1. **Create `chart-colors.js`** — single source of truth with 5 data colors + heatmap tiers + warning/critical
2. **Create `chart-patterns.js`** — SVG `<defs>` for 5 pattern fills + 5 glow filters
3. **Create new chart functions:** `drawStackedColumn()`, `drawHistogram()`, `drawHeatmap()`
4. **Modify existing:** `drawTrendLine()` → use for Q3 Multi-Series Line; `drawParetoChart()` → convert to horizontal bars with pattern fills
5. **Rewrite all 4 panel-builder functions** in `reporting.js` to use correct v4 chart types and colors
6. **Replace all axis/label colors** from mintB/gold to coral `#ff5544`
7. **Replace all gradient fills** with pattern fills on `#0a0a0a` backgrounds
8. **Add glow filters** to lines and heatmap busy/slammed cells
9. **Fix stroke widths:** primary = 3px, compare = 2.5px, bar strokes = 1.5px

---

*Phase 0 complete. Awaiting review before proceeding to Phase 1.*
