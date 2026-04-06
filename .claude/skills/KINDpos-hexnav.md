# KINDpos HexNav Skill

## Overview

HexNav is the hexagonal navigation component for KINDpos order entry.
Categories, items, and modifiers are flat-top SVG hex tiles arranged in
a benzene-style honeycomb using **axial coordinates**. Tapping a hex
drills down; tapping a locked (filled) ancestor in the breadcrumb trail
navigates back.

**File**: `frontend/js/hex-nav.js`
**Consumer**: `frontend/js/scenes/order-entry.js`

---

## Hex Geometry

- **Flat-top orientation**: vertices at 0°, 60°, 120°, 180°, 240°, 300°
  (flat edges top and bottom, not points)
- **Axial coordinates** `(q, r)`: no columns or rows — pure hex geometry
- **Pixel conversion**: `x = size * 1.5 * q`, `y = size * sqrt(3) * (r + q/2)`
- Adjacent hexes share flat edges (benzene-style tessellation)

---

## Size Cascade

Each drill-down level uses progressively smaller hexes:

| Constant | Radius | Used For |
|----------|--------|----------|
| `CAT_R` | 80 | Categories (COMBO, RIBS, SIDES...) |
| `SUBCAT_R` | 70 | Subcategories, direct items |
| `ITEM_R` | 48 | Items, mandatory mod groups |
| `MOD_R` | 40 | Modifier choices (Sweet, Hot...) |

`adaptiveR()` shrinks further if too many items to fit (min 28px).

---

## Gap Multipliers

Padding between hexes is controlled per level in the `GAPS` array:

```javascript
var GAPS = [1.12, 1.21, 1.19, 1.17, 1.17];
//          cats  subcats items mods  choices
```

`1.0` = edges touching. Higher = more breathing room.
Adjust at `frontend/js/hex-nav.js` line 13.

---

## Navigation Levels

| Level | Type | Hex Size | Behavior on Tap |
|-------|------|----------|-----------------|
| 0 | Category | CAT_R (80) | Drill to subcats (or skip to items if only 1 subcat) |
| 1 | Subcategory | SUBCAT_R (70) | Drill to item hexes |
| 2 | Item | SUBCAT_R (70) | If `requiredMods` → show mod-groups. Otherwise → fire `onSelect` |
| 3 | Mod Group | ITEM_R (48) | Show modifier choices + DONE hex when all satisfied |
| 4 | Modifier | MOD_R (40) | Single-select, auto-return to mod-group level |

### Back Navigation (Breadcrumb Trail)

Locked (filled) hexes form a visible breadcrumb trail. Tapping any
ancestor goes back to that level:

- Locked **cat** → back to all categories
- Locked **subcat** → back to subcats for that category
- Locked **item** (during mod flow) → cancel mod flow, return to items
- Locked **modgroup** at level 4 → back to mod-group level
- Locked **modgroup** at level 3 → re-open its choices to change pick

---

## Placement System

### `honeycombLayout(items, r, gap)`
Used for top-level categories. Generates a hex spiral centered in the
viewport using axial coordinates. All hexes are uniform size.

### `gridSlotsAround(cx, cy, r, count, gap, childR)`
Used for all drill-downs. Generates axial grid slots centered on the
parent hex position. Returns slots sorted by:
1. **Primary**: distance to parent (nearest first — tight cluster)
2. **Tiebreaker**: distance to viewport center (bias toward open space)

### `buildGrid(lockedHexes, childItems, childR, childType)`
Orchestrates placement:
1. Uses `(parentR + childR) / 2` as grid radius for mixed-size tiling
2. Generates axial grid slots around the parent
3. Filters slots that overlap **any locked ancestor** (entire breadcrumb trail)
4. Places children in nearest available slots
5. Auto-extends viewport height if needed

### Key Rules
- Locked hexes **keep their position** — they never move
- Children tile around the parent using the same axial math as categories
- Overlap filter uses `(lh.r + r) * 0.85` to prevent body overlap while
  allowing edge proximity
- Children use their own radius, not the parent's (size cascade)

---

## Mandatory Modifiers

Items can declare `requiredMods` — modifier groups the server must choose
before the item is added to the ticket.

### Data Shape

```javascript
{
  label: 'Half Rack',
  price: 12.00,
  requiredMods: [
    {
      id: 'sauce',
      label: 'SAUCE',
      color: '#cc3333',
      textColor: '#fff',
      choices: [
        { label: 'Sweet', price: 0 },
        { label: 'Hot', price: 0 },
        { label: 'Mild', price: 0 },
      ]
    }
  ]
}
```

### Flow

1. User taps an item hex that has `requiredMods`
2. Item hex locks (filled). Mod-group hexes appear — **mint, pulsating**
3. User taps a mod-group → it locks, modifier choice hexes appear (mint, pulsating)
4. User taps a choice → **single-select**, auto-returns to mod-group level
5. Satisfied mod-group **stops pulsating**, locks in **cat color**, label changes
   to selected choice (e.g. `SAUCE` → `Hot`)
6. Tapping a satisfied (locked) mod-group re-opens its choices
7. Once **all** groups satisfied → **DONE** hex appears in cat color
8. Tapping DONE fires `onSelect` with `selectedMods` array

### Visual Behavior

| Element | Unsatisfied | Satisfied |
|---------|------------|-----------|
| Mod-group hex | Mint, pulsating, shows group name | Cat color (filled), label = choice |
| Modifier choice | Mint, pulsating | N/A (auto-returns on tap) |
| DONE hex | Hidden | Cat color (filled), label `DONE` |

### Pulse Animation

SVG `<animate>` on `stroke-opacity` (`1 → 0.3 → 1`, 1.5s loop).
Set `h.pulse = true` on hex data to enable.

### onSelect Payload

```javascript
{
  label: 'Half Rack',
  price: 12.00,
  selectedMods: [
    { group: 'sauce', label: 'Hot', price: 0 }
  ]
}
```

### Guards
- Empty `choices` arrays are filtered out in `showModGroups`
- If no valid groups remain, mod flow is skipped
- `setData()` and `reset()` call `resetModState()` to clear stale state
- Combo items apply `selectedMods` to ticket mods if present

---

## Combo Flow

Combo items trigger a guided pick flow managed by `order-entry.js`:
1. Select combo item → pick SIDES → pick SODA
2. Nav is locked during this flow (`hexNav.lockNav()`)
3. Uses `showPickList()` for each step (centered parent hex)

Separate from mandatory modifiers — combos use the pick-list pattern.

---

## Universal Modifier Tab

The "MODIFY ITEMS" tab calls `hexNav.setData(MOD_DATA)` which triggers
`showCats()` with the modifier categories (SAUCE, EXTRAS). Same hex nav
system — same axial math, gaps, and sizing apply. Switching back to
"ADD ITEMS" calls `hexNav.setData(MENU_DATA)`.
