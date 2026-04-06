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
2. Item hex locks (filled). Mod-group hexes bloom off the item
3. User taps a mod-group hex -> it locks, individual modifier choice hexes bloom off it, plus a **DONE** hex
4. User taps modifier choices (each attaches to the pending item). Tapping a selected modifier again deselects it
5. User taps the **DONE** hex to confirm that mod group and return to the mod-group level
6. If more required mod groups remain, they stay visible for selection
7. Once all required groups have at least one choice, `onSelect` fires with the item data plus a `selectedMods` array

### Modifier Choice + DONE Hex Styling

- Modifier choice hexes and the DONE hex both use **mint** (`T.mint`) with dark text (`#1a1a1a`)
- This makes mandatory mod choices visually distinct from the mod-group parent hex
- Selected modifier hexes become **locked** (filled mint)
- DONE hex label: `DONE`
- Tapping DONE:
  - If the current mod group has at least one selection -> lock that group as satisfied, return to mod-group level
  - If no selection yet -> show toast "Pick at least one"
- When all required mod groups are satisfied after a DONE tap, auto-fire `onSelect`

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

When implementing mandatory modifiers:

1. [ ] Add `requiredMods` data to menu items (ribs, sandwiches get sauce choice)
2. [ ] Add level 3 (mod-group) and level 4 (modifier) handling in `onHexTap`
3. [ ] Track pending mod state: `state.pendingItem`, `state.selectedMods`, `state.currentModGroup`
4. [ ] Render DONE hex in mod-choice bloom (mint color, type `'done'`)
5. [ ] On DONE tap: validate >= 1 selection, lock group, check if all groups done
6. [ ] On all groups done: fire `onSelect` with `selectedMods` attached to item data
7. [ ] In `order-entry.js` `addToTicket`: read `item.selectedMods` and push as ticket mods
