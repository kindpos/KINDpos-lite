# Prompt: Persistent Summary Panel Refactor

Read `PERSISTENT-SUMMARY-REFACTOR.md` in the repo root — it contains the full architectural spec for this task.

## Context

KINDpos-lite is a 1024x600 touchscreen POS terminal built with vanilla JS, no frameworks. The app uses a 4-layer scene stack (Gate/Working/Transactional/Interrupt) managed by `scene-manager.js`.

We just condensed a 3-screen payment flow (receipt-review → payment → change-due) into a single `payment-console.js` scene. During that work we noticed: the left column (order summary with items, subtotals, prices) is identical in both `order-entry.js` and `payment-console.js` — same 280px width, same position, same data. It rebuilds on every scene transition for no reason.

## The Task

Extract the order summary into a **persistent base layer** that stays fixed on the left side of the screen. All scenes (order-entry, payment-console, and any future scenes) only render into the **right two columns**. The summary never unmounts or moves.

Follow the spec in `PERSISTENT-SUMMARY-REFACTOR.md` step by step:

1. Add `#order-summary` container to `index.html` with z-index 25
2. Shift layer containers right in `base.css` (left: 292px), gate override stays full-width
3. Create `order-summary.js` — persistent panel with `show/hide/update/updateSplit` API
4. Simplify `payment-console.js` — remove `buildReceiptPanel()`, become 2-column layout
5. Simplify `order-entry.js` — remove `buildTicket()`, use `OrderSummary.show/update` API
6. Wire `app.js` — import order-summary, hide panel on login gate

## Pending UI Fixes (do these during the refactor)

- **Button inversion on select**: Cash/Card/GC toggle buttons should invert when active (colored fill, dark text) not just outline. Same for Split when active.
- **Background bleed-through**: No previous screen should be visible behind the payment console. Scene backgrounds must be opaque.
- **Theme-compliant borders**: All card/panel borders must use `applySunkenStyle()` or `applyRaisedStyle()` beveled depth — no flat borders. Run the `kindpos-theme` skill to audit when done.
- **Discount row**: Only show when discount > 0 (already implemented, verify it carries over).

## Important Constraints

- Use the `kindpos-theme` skill (`.claude/skills/kindpos-theme.skill`) for all styling decisions. It documents every color token, font, numpad geometry, button variant, and scene architecture rule.
- `tokens.js` is the single source of truth — add tokens, never hardcode colors/fonts/sizes.
- `scene-manager.js` is on the do-not-touch list. Adjust CSS positioning only, not the JS layer engine.
- All buttons must use `buildStyledButton` / `buildButton` from the embossed button system.
- Zero `border-radius` anywhere except buttons (5px via `.embossed-btn` class). All corners use `chamfer()` clip-path.

## Test & Ship

- Run `pytest` (603 backend tests should pass — frontend changes don't affect them)
- Verify the full flow in browser: login → add items → tap pay → denomination/numpad entry → ent → change-due → new order
- Commit to `main` and push
