# Font Size & Contrast Audit — Changelog

## Summary

Full pass across all frontend scenes to enforce **20px minimum font size** and replace all **low-contrast / opaque text** with readable alternatives. This ensures every element on the 1024x600 POS terminal is legible at arm's length.

---

## Changes by File

### `frontend/js/scenes/order-entry.js`
- Summary row font: 18px `T.dimText` → 20px `T.mutedText`
- PREFIX label: 13px `T.dimText` → 20px `T.mutedText`
- Prefix button text: 18px → 20px
- Group item name: 18px → 20px
- Group price: 16px → 20px
- Individual item name: 16px → 20px
- Individual item price: 15px → 20px
- Separator dashes: 9px → 20px (with overflow:hidden)
- Mod row text: 12px → 20px
- Void reason label: 13px → 20px
- Manager PIN label: 13px → 20px
- Recall overlay title: 14px → 20px
- Empty state "No saved tabs": 13px `#333` → 20px `T.mutedText`
- Recall tab label: 13px → 20px
- Clear ticket confirm: 12px → 20px

### `frontend/js/scenes/payment.js`
- Item summary label: 12px `T.mintDim` (undefined!) → 20px `T.mutedText`
- Item summary rows: 18px → 20px
- Card wait text: 16px `T.mintDim` → 20px `T.mutedText`
- Card status message: 14px `T.mintEdgeD` → 20px `T.mutedText`
- Device info: 10px `#2a3a2a` → 20px `T.mutedText`
- Change due strip: 16px → 20px

### `frontend/js/scenes/receipt-review.js`
- Title "ITEM SUMMARY": 18px `T.mintDim` → 20px `T.mutedText`
- Check ID: 18px → 20px
- Column headers: 13px `T.mintDim` → 20px `T.mutedText`
- Quantity: 16px `T.mintDim` → 20px `T.mutedText`
- Footer small rows: 16px → 20px
- Payment method label: 12px `T.mintDim` → 20px `T.mutedText`
- Prompt text: 16px → 20px
- Card/Cash labels: 14px → 20px
- Cash savings: 13px `#2a4a2a` → 20px `#1a1a1a` (dark on mint bg)

### `frontend/js/scenes/change-due.js`
- "Tap anywhere" hint: 12px `#2a3a2a` → 20px `T.mutedText`

### `frontend/js/scenes/tip-adjustment.js`
- Batch zero button: 16px → 20px
- Summary card lines: 16px → 20px
- Interrupt messages: 18px → 20px
- Interrupt buttons: 18px → 20px
- **Scrollbar hidden** — `scrollbar-width:none` + WebKit pseudo for drag-only scroll

### `frontend/js/scenes/close-day.js`
- Print preview header: 11px → 20px
- Row index numbers: 11px `T.dimText` → 20px `T.mutedText`
- Card titles: 15px → 20px
- Card subtexts: 12px → 20px
- Chevrons: 18px `T.dimText` → 20px `T.mutedText`
- Body row labels: 13px → 20px
- Body row values: 14px → 20px
- Jump button text: 13px → 20px
- Alert header: 13px → 20px
- Alert items: 11px → 20px
- Manager gate label: 9px `#333` → 20px `T.mutedText`
- Batch dialog icon: 10px (16x16) → 20px (24x24)
- Batch title: 13px → 20px
- Close btn text: 11px → 20px
- Info rows: 13px → 20px
- Status text: 13px → 20px
- Progress %: 12px → 20px
- Dialog buttons: 13px → 20px
- Close Day button: 18px → 20px
- Manager approval msg: 16px → 20px
- Manager sub: 12px `T.dimText` → 20px `T.mutedText`
- Approve/Cancel buttons: 16px → 20px
- Receipt SMALL constant: 18px → 20px
- Footer: `T.dimText` → `T.mutedText`

### `frontend/js/scenes/server-checkout.js`
- Print preview header: 11px → 20px
- Row index numbers: 11px `T.dimText` → 20px `T.mutedText`
- Card titles: 15px → 20px
- Card subtexts: 12px → 20px
- Chevrons: 18px `T.dimText` → 20px `T.mutedText`
- Body row labels: 13px → 20px
- Body row values: 14px → 20px
- Jump button text: 13px → 20px
- Tip-out rows: 13px → 20px
- Tip-out badges: 12px → 20px
- One-time row: 13px → 20px
- Inline badge: 12px → 20px
- Info text: 10px `T.dimText` → 20px `T.mutedText`
- Alert header: 13px → 20px
- Alert items: 11px → 20px
- Manager gate: 9px `#333` → 20px `T.mutedText`
- Overlay header: 18px → 20px
- One-time label: 11px `T.dimText` → 20px `T.mutedText`
- Adjust row name: 14px → 20px
- Basis button: 11px → 20px
- % display: 16px → 20px
- Manager approval msg: 16px → 20px
- Manager sub: 12px `T.dimText` → 20px `T.mutedText`
- Approve/Cancel buttons: 16px → 20px
- Footer: `T.dimText` → `T.mutedText`

### `frontend/js/scenes/reporting.js`
- Info line text: 16px → 20px

### `frontend/js/scenes/settings.js`
- All button font sizes: 14px/16px/18px → 20px
- Device name display: 18px → 20px (2 instances)

---

## Color Corrections

| Before | After | Issue |
|--------|-------|-------|
| `T.mintDim` (undefined) | `T.mutedText` (#888) | Token doesn't exist — rendered as no color |
| `T.dimText` (#555) as text | `T.mutedText` (#888) | Too dark on #333/#1a1a1a backgrounds |
| `#2a3a2a` on dark bg | `T.mutedText` (#888) | Nearly invisible on dark panels |
| `#333` on dark bg | `T.mutedText` (#888) | Invisible on #333 background |

## Verification

- `grep -rn 'font-size:[1-9]px\|font-size:1[0-9]px' frontend/js/scenes/` → **0 results**
- `grep -rn "fontSize: '[1-9]px'\|fontSize: '1[0-9]px'" frontend/js/scenes/` → **0 results**
- `grep -rn 'T\.mintDim' frontend/js/` → **0 results**
- 202 backend tests passing
