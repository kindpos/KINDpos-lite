# Persistent Summary Panel Refactor

## Goal
Extract the order summary (left column) into a persistent base layer so it stays fixed across the entire order and payment flow. Scenes only render into the right two columns.

## Current State (as of this commit)
- **payment-console.js** replaces the old 3-screen flow (receipt-review + payment + change-due) with a single condensed screen
- Both order-entry and payment-console build their own 280px left column with identical summary data
- The summary rebuilds on every scene transition even though it doesn't move

## Architecture Change

### 1. HTML — Add persistent summary container
```html
<!-- index.html: add between #header and #layer-working -->
<div id="order-summary"></div>
```

### 2. CSS — Shift layer containers right
```css
/* base.css: persistent summary panel */
#order-summary {
  position: absolute;
  top: 52px;
  left: 0;
  width: 280px;
  height: calc(100% - 52px);
  z-index: 25; /* above transactional (20), below interrupt (30), below gate (100) */
  pointer-events: auto;
  display: none; /* hidden until order is active */
}

/* Shift all scene layers to start after the summary panel */
#layer-working,
#layer-transactional,
#layer-interrupt,
#layer-gate {
  left: 292px;        /* 280px panel + 12px gap */
  width: calc(100% - 292px);
}

/* Gate (login) still needs full width — override */
#layer-gate {
  left: 0;
  width: 100%;
}
```

### 3. New module — `frontend/js/order-summary.js`
Shared persistent panel with public API:
```js
export const OrderSummary = {
  show(params),    // mount panel with order data, make visible
  hide(),          // hide panel (logout, login screen)
  update(params),  // update totals, items, split progress
  updateSplit({ totalPaid, remaining }),  // show paid/remaining rows
  getElement(),    // return DOM ref
};
```

Panel contents (always visible during order flow):
- ORDER RECAP header + check ID
- ITEM | QTY | PRICE column headers
- Scrollable item list
- Summary box (Subtotal, Discount when >0, Tax) with sunken border
- Split button (next to summary box, per mockup layout)
- Prices box (Card Price, Cash Price) with sunken border
- Dynamic Paid/Remaining rows (shown during split payments)

### 4. Modify `order-entry.js`
- Remove `buildTicket()` and `TICKET_W` constant
- On mount: call `OrderSummary.show({ checkId, items, totals })`
- On ticket change: call `OrderSummary.update({ items, totals })`
- Scene layout only builds the right content (menu grid, category nav, modifiers)
- Container uses full available width (no left column spacer needed — layers already shifted)

### 5. Modify `payment-console.js`
- Remove `buildReceiptPanel()` entirely
- Remove `LEFT_W`, `footerRow()`, all receipt DOM code
- Scene becomes 2-column: center (denominations + exact + cash/card/gc) + right (numpad)
- Split button tap calls `showSplitPopup()` — handler stays in payment-console
- On partial payment: call `OrderSummary.updateSplit({ totalPaid, remaining })`
- On mount: summary panel is already visible from order-entry

### 6. Modify `app.js`
- Import order-summary.js
- On gate open (login): call `OrderSummary.hide()`
- On working mount (order-entry): summary shows via order-entry's mount

### 7. Wire Split button
Split button lives in the summary panel but its handler is in payment-console. Options:
- Summary panel emits a `split:tap` event via SceneManager event bus
- Payment-console listens for it and opens the split-select interrupt
- OR: summary panel accepts an `onSplitTap` callback when shown

## Pending UI Fixes (apply during this refactor)

### Button inversion on select
Cash/Card/GC toggle buttons should **invert** when selected:
- **Inactive:** dark fill, colored text
- **Active:** colored fill, dark text (e.g., Card active = cyan fill, dark text)

Same for Split when active (vermillion fill, dark text).

### Background bleed-through
Payment-console transactional overlay currently shows dimmed order-entry underneath. After this refactor, the transactional layer only covers the right portion, so no bleed-through of the left column. For the right side, ensure the scene background is opaque (T.bg) so no scrim/previous content shows through.

### Theme compliance
- All card/panel borders must use `applySunkenStyle()` (beveled inset) or `applyRaisedStyle()` (beveled outset)
- No flat borders — always beveled depth per kindpos-theme Section 4b
- Summary box border: `applySunkenStyle` (inset bevel)
- Prices box border: `applySunkenStyle` (inset bevel)

## Files Touched
| File | Change |
|------|--------|
| `frontend/index.html` | Add `#order-summary` div |
| `frontend/css/base.css` | Summary panel styles, shift layers right, gate override |
| `frontend/js/order-summary.js` | **NEW** — persistent summary component |
| `frontend/js/app.js` | Import order-summary, hide on login |
| `frontend/js/scenes/order-entry.js` | Remove ticket panel, use OrderSummary API |
| `frontend/js/scenes/payment-console.js` | Remove receipt panel, 2-column layout only |
| `frontend/js/tokens.js` | Add `T.summaryW: 280` token if not already present (`T.pcLeftW`) |

## Token Reference
- `T.pcLeftW` = 280 (summary panel width, already exists)
- `T.colGapSm` = 12 (gap between summary and scene area, already exists)
- `T.zTransactional` = 20, summary z-index = 25, `T.zInterrupt` = 30, `T.zGate` = 100

## Order of Operations
1. Add HTML + CSS for `#order-summary` container
2. Create `order-summary.js` with show/hide/update API
3. Modify payment-console.js (simpler — remove left column, 2-col layout)
4. Modify order-entry.js (larger — extract ticket panel logic to OrderSummary)
5. Wire app.js imports and login hide
6. Button inversion + theme border audit
7. Test full flow: login → order → payment → change-due → new order
