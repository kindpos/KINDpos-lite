# KINDpos HexNav Skill

## Overview

HexNav is the hexagonal bloom navigation component for KINDpos order entry.
Items, subcategories, and modifiers are represented as SVG hex tiles that
bloom outward from their parent. Tapping a locked (filled) hex navigates back.

**File**: `frontend/js/hex-nav.js`
**Consumer**: `frontend/js/scenes/order-entry.js`

---

## Navigation Levels

| Level | Type | Hex Size | Behavior on Tap |
|-------|------|----------|-----------------|
| 0 | Category | CAT_R (80) | Bloom subcats (or skip to items if only 1 subcat) |
| 1 | Subcategory | SUBCAT_R (70) | Bloom item hexes |
| 2 | Item | ITEM_R (48) | If item has `requiredMods` -> bloom mod-group hexes. Otherwise -> fire `onSelect` |
| 3 | Mod Group | SUBCAT_R | Bloom individual modifier choices + a DONE hex |
| 4 | Modifier | ITEM_R | Attach modifier to pending item. Return to mod-group level. When all required groups satisfied, auto-fire `onSelect` |

### Back Navigation

Tapping a **locked** (filled) hex goes back one level:
- Locked **cat** -> back to all categories
- Locked **subcat** -> back to subcats for that category
- Locked **item** (during mod flow) -> cancel mod flow, return to items

---

## Mandatory Modifiers

Items can declare `requiredMods` — an array of modifier groups the server
must choose before the item is added to the ticket.

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
        { label: 'Vinegar', price: 0 },
        { label: 'Mustard', price: 0 },
      ]
    }
  ]
}
```

### Flow

1. User taps an item hex that has `requiredMods`
2. Item hex locks (filled). Mod-group hexes bloom off the item — **pulsating** to indicate they need a selection
3. User taps a mod-group hex -> it locks, individual modifier choice hexes bloom off it (mint, pulsating)
4. User taps a modifier choice -> **single-select**: that choice is picked, auto-returns to mod-group level
5. The satisfied mod-group hex **stops pulsating**, locks (filled), and its **label changes** to the selected modifier (e.g. `SAUCE` -> `Hot`)
6. Tapping a satisfied (locked) mod-group re-opens its choices to change the selection
7. Once **all** required groups have a selection, a **DONE** hex appears at the mod-group level
8. Tapping DONE fires `onSelect` with the item data plus a `selectedMods` array

### Visual Behavior

| Element | Unsatisfied | Satisfied |
|---------|------------|-----------|
| Mod-group hex | **Mint** (`T.mint`), pulsating stroke, shows group name (`SAUCE`) | Locked (filled) in **cat color**, label = selected choice (`Hot`) |
| Modifier choice hex | Mint (`T.mint`), pulsating | N/A (auto-returns on tap) |
| DONE hex | Hidden | Appears in **cat color** (filled), label `DONE` |

### Placement

All hex placement uses two strategies to avoid corner-jamming:
1. **Center-facing**: `getChildPositions()` starts from the hex face pointing toward
   the viewport center, so children bloom inward rather than into edges.
2. **Look-ahead scoring**: `placeChain()` scores each candidate position by how many
   child slots it opens up (phantom hex + future `getChildPositions` check). The
   position with the most available child slots wins. This ensures parents "plan"
   where to land so their children have room to bloom.

### Pulse Animation

Unsatisfied mod-group hexes and unselected modifier choices pulsate via an SVG `<animate>` on `stroke-opacity` (`1 -> 0.3 -> 1`, 1.5s loop). Set `h.pulse = true` on hex data to enable.

### onSelect Payload with Modifiers

```javascript
{
  label: 'Half Rack',
  price: 12.00,
  selectedMods: [
    { group: 'sauce', label: 'Hot', price: 0 }
  ]
}
```

---

## Combo Flow (Existing)

Combo items trigger a special guided flow managed by `order-entry.js`:
1. Select combo item -> pick SIDES -> pick SODA
2. Nav is locked during this flow (`hexNav.lockNav()`)
3. Uses `showPickList()` for each step

This is separate from mandatory modifiers. Combos use the pick-list pattern;
mandatory modifiers use the bloom-off-item pattern.

---

## Placement Rules

- `placeChain()` places child hexes around a parent using 6-face hex geometry
- Fallback 1: try 12 directions from all placed hexes
- Fallback 2: grid scan across entire viewport for nearest open position
- Fallback 3: extend SVG viewBox height (no item is ever silently dropped)
- `adaptiveR()` shrinks hex radius when item count exceeds viewport capacity (min 28px)

---

## Implementation Checklist

1. [x] Add `requiredMods` data to menu items (ribs, sandwiches get sauce choice)
2. [x] Add level 3 (mod-group) and level 4 (modifier) handling in `onHexTap`
3. [x] Track pending mod state via `modState` object in hex-nav.js
4. [x] Pulse animation on unsatisfied mod-group and unselected choice hexes
5. [x] Single-select per group: tapping choice auto-returns to mod-group level
6. [x] Label swap on satisfied groups (group name -> selected choice name)
7. [x] DONE hex appears only when all groups satisfied, in item/cat color
8. [x] On DONE tap: fire `onSelect` with `selectedMods` attached to item data
9. [x] In `order-entry.js` `addToTicket`: read `item.selectedMods` and push as ticket mods
10. [x] Tapping locked (satisfied) mod-group re-opens choices to change selection
