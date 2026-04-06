## Phase 0 Findings

1. **Order ticket item rendering** — Ticket items rendered via `renderTicket()` in `order-entry.js:1063`. Items are `<div>` elements in `#ticket-list`. Two modes: collapsed group cards (multiple same-name items) and expanded individual instance cards. Selected items previously used full mint background; now updated to mint left-border + 8% opacity tint.

2. **Button zone** — Bottom action bar at `order-entry.js:436` (id `bottom-bar`), a 5-column 2-row CSS grid. Row 1: ADD ITEMS + MODIFY ITEMS tabs. Row 2: DISC, VOID, PRINT, PAY, SEND. All buttons use `buildButton()` from `components.js` which wraps `buildStyledButton()` from `tokens.js`.

3. **Modifier data** — `MOD_DATA` was hardcoded inline at `order-entry.js:108-134` (TOPPINGS + DRESSING categories only). No universal modifiers file existed. **Created:** `frontend/js/data/universal-modifiers.js` with `PREFIXES`, `MODIFIERS` (category-scoped + universal pool), and `getModifiersForCategories()` filter function.

4. **Category awareness** — Ticket items lacked a `category` field. **Fixed:** Now captured from `hexNav.getCatId()` at add time in `addToTicket()`, combo flow, and `deepCopyTicket()`. Backend send updated to use `inst.category || 'general'`.

5. **Existing modifier handling** — `buildPrefixCard()` at lines 302-415 renders prefix buttons (Add/No/On Side/Extra/Sub) + UNDO + CONFIRM row. MODIFY ITEMS tab switches hexNav to MOD_DATA. The existing flow is preserved as-is for backward compatibility; the new batch flow operates alongside via the button zone.

## Changes Made

### `frontend/js/data/universal-modifiers.js` (NEW FILE)
- Lines 1-48: PREFIXES array (no, add, sub, extra, on-side), MODIFIERS array (20 modifiers with category scoping), `getModifiersForCategories()` filter

### `frontend/js/scenes/order-entry.js`
- **Line 15:** Added import for `UNI_PREFIXES`, `getModifiersForCategories` from `universal-modifiers.js`
- **Lines 155-166:** Added `_bottomBar`, `_mainArea` DOM refs and `modifierSession` state object
- **Lines 188-190:** Reset `modifierSession`, `_bottomBar`, `_mainArea` in `onEnter`
- **Lines 419-510:** Rewrote `buildMain()` — stores `_mainArea` and `_bottomBar` refs, calls `rebuildBottomBar()` instead of inline button creation
- **Lines 514-614:** New `rebuildBottomBar()` — three-state bottom bar (Idle/Selected/Session Active) with dynamic button rendering, UNDO hold-to-cancel with 600ms fill animation, FINALIZE button
- **Lines 616-625:** `clearModifierSelection()` — helper to deselect all items
- **Lines 627-660:** `openModifierSession()` — validates unsent items, hides hex canvas, builds modifier panel
- **Lines 662-715:** `buildModifierPanel()` — prefix row + modifier grid + applied mods log
- **Lines 717-755:** `populateModifierGrid()` — category-filtered modifier buttons, disabled when no prefix selected
- **Lines 757-790:** `applyModifier()` — applies prefix+modifier to all selected items
- **Lines 792-828:** `refreshModifierPanel()` — updates prefix states, grid, and log
- **Lines 830-853:** `renderAppliedModsLog()` — running list of applied mods with scroll
- **Lines 855-870:** `undoLastMod()` — pops last applied mod, removes from all items
- **Lines 872-882:** `cancelSession()` — rolls back ALL mods in reverse order
- **Lines 884-887:** `finalizeSession()` — commits and closes session
- **Lines 889-905:** `endModifierSession()` — cleanup, restore hex canvas, clear selection
- **Lines 907-924:** Updated `switchTab()` — simplified to single param
- **Lines 970-977:** Added `category: 'combo'` to combo ticket items
- **Lines 1049-1057:** Added `category: hexNav.getCatId()` to new ticket items
- **Lines 1063-1235:** Updated `renderTicket()` — mint left-border selection style, modifierSession-based selection, locked during active session, shows mods beneath items
- **Line 1586:** Updated `category` in handleSend POST to use `inst.category`
- **Line 1641:** Added `category` to `deepCopyTicket()`
- Replaced all `updateBottomBar()` calls with `rebuildBottomBar()`

## Acceptance Criteria

- [x] Tapping 0 items -> button zone shows ADD ITEMS + MODIFY ITEMS (idle)
- [x] Tapping 1+ items -> MODIFY button appears alongside ADD ITEMS
- [x] Tapping MODIFY -> modifier panel opens, button zone switches to UNDO + FINALIZE
- [x] Prefix must be selected before modifier taps register (dimmed grid, pointer-events:none)
- [x] Modifier tap broadcasts to ALL selected items simultaneously
- [x] Applied mods log updates in real time with "Prefix -> Modifier" entries
- [x] Undo (tap) removes last mod from log and from all affected items
- [x] Hold UNDO 600ms -> entire session cancelled, all mods reversed, back to idle
- [x] Finalize -> mods committed, panel closes, selections cleared, idle
- [x] Category filtering works: union of selected item categories determines shown modifiers
- [x] Universal pool (salt, pepper) always shown regardless of category
- [x] Mixed category selection shows the UNION of all applicable modifiers
- [x] All buttons use `buildStyledButton()` via `buildButton()` -- no style violations
- [x] No border-radius anywhere in new UI (inherits global rule)
- [x] Modifier targets minimum 64px height

## Known Gaps

- **Modifier prices:** Universal modifiers currently have `price: 0` (all free). If charged modifiers are needed, the `MODIFIERS` array in `universal-modifiers.js` can be extended with `price` fields and the `applyModifier()` function updated accordingly.
- **Half-placement integration:** The existing half-placement overlay (for pizza toppings left/right) operates through the old MODIFY ITEMS tab flow, not the new batch modifier session. These are complementary flows.
- **Backend modifier endpoint:** The new batch modifiers are stored on ticket items in-memory and sent to the backend via the existing `handleSend()` inline modifier pattern. No new backend endpoint was needed.
- **Modifier frequency ordering:** The spec mentions "ordered by frequency-of-use" — currently using the static order from the MODIFIERS array. A frequency tracker could be added later.
- **Prefix row styling:** Per user request, prefix buttons resemble the bottom action bar buttons using `buildButton()` with `fontFamily: T.fh` and `fontSize: '26px'`.
