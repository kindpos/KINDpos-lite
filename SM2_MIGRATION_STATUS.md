# SM2 Migration Status

Last updated: 2026-04-13 (session 2)

## What is SM2?

`scene-manager-2.js` (`defineScene`) is a higher-level API wrapper over the v3 scene manager (`scene-manager.js`). It provides:
- Auto-managed state and event cleanup
- Inline `interrupts` and `transactionals` sub-scene definitions
- Cleaner scene definition with `render`/`unmount`/`events` sections

Old style uses `SceneManager.register({ name, mount, unmount })`.
SM2 style uses `defineScene({ name, state, render, unmount, events, interrupts, transactionals })`.

## Completed SM2 Conversions

| File | Scene(s) | Notes |
|---|---|---|
| `login.js` | `login` | Pure SM2 |
| `clock-in.js` | `clock-in` | Pure SM2 |
| `column-editor.js` | `column-editor` | Pure SM2 |
| `manager-landing-sm2.js` | `manager-landing` + 2 interrupts | Pure SM2, replaced old `manager-landing.js` |
| `server-landing-sm2.js` | `server-landing` + 9 interrupts, 1 transactional | Pure SM2, replaced old `server-landing.js`. `void-pin` interrupt added. |
| `order-entry.js` | `order-entry` | Pure SM2 |
| `check-overview.js` | `check-overview` + `server-picker` interrupt | SM2 main scene + interrupt. `disc-pin` and `disc-select` remain as old-style `SceneManager.register` at bottom (functional alongside SM2). |
| `payment-console.js` | `payment-console` + `split-select` interrupt + `pc-card-processing`, `pc-change-due` transactionals | Fully SM2. Absorbs old `payment.js`, `receipt-review.js`, `change-due.js`. |
| `server-checkout.js` | `server-checkout` + `adjust-pct`, `cash-tip-declare` | Fully SM2. Uses `checkout-core.js` shared builders + `OrderSummary.showCheckout()`. Old sub-scenes (`zero-confirm`, `manager-pin`, `sc-tip-adjust`) replaced by shared `co-*` scenes. |
| `close-day.js` | `close-day` + `batch-settlement` | Fully SM2. Uses `checkout-core.js` shared builders + `OrderSummary.showCheckout()`. Old sub-scenes replaced by shared `co-*` scenes. |
| `checkout-core.js` | `co-zero-confirm`, `co-manager-pin`, `co-tip-adjust` | Shared module: card grid/accordion builders, blocker banner, and 3 shared SM2 sub-scenes for both checkout + close-day. |

## Dead Files Removed (this session)

| File | Lines | Replaced by |
|---|---|---|
| `manager-landing.js` | 1,719 | `manager-landing-sm2.js` |
| `server-landing.js` | 1,959 | `server-landing-sm2.js` |
| `payment.js` | 858 | `payment-console.js` |
| `receipt-review.js` | 309 | `payment-console.js` |
| `change-due.js` | 178 | inlined in `payment-console.js` as `pc-change-due` |
| `sales-summary.js` | 232 | SM2 landings cover this |
| `dashboard-charts.js` | 1,851 | SM2 landings have own charts |
| `landing.js` | 502 | Login routes to SM2 landings directly |
| `tip-adjustment.js` | 605 | inlined as `sc-tip-adjust` / `cd-tip-adjust` |
| `server-picker.js` | 143 | interrupt in `check-overview.js` |

### `modifier-panel.js` — 2 interrupt scenes (converted to SM2)
- `special-customize` (interrupt — long-press special customization)
- `allergen-select` (interrupt — allergen selection from action bar)

Note: `ModifierPanel` itself is a component, not a scene — it overlays on `order-entry`.

## Remaining — Not Yet Converted to SM2

### `settings.js` — 2 scenes (all old-style)
- `settings` (main scene)
- `confirm-delete-device` (interrupt)

## Other Notes

- `check-overview.js` has `disc-pin` and `disc-select` as old-style registrations alongside the SM2 main scene. These work fine but could be moved into the `defineScene` interrupts section for consistency.
- SM2 landings listen for `transactional:closed` events to refresh data.
- `checkout-core.js` provides shared `co-zero-confirm`, `co-manager-pin`, `co-tip-adjust` sub-scenes used by both `server-checkout.js` and `close-day.js`.
- `OrderSummary` extended with `showCheckout()`/`updateCheckout()` for checkout/close-day left panel (check list + CC Sales/Tips/Cash Expected hero).
- `payment-console.js` respects `params.paymentMode` for initial mode selection (card/cash/gc).
- The `void-pin` interrupt in `server-landing-sm2.js` uses `buildNumpad` with `onCancel` for the X dismiss button (no separate cancel button).
- `disc-pin` in `check-overview.js` was updated to use `buildNumpad`'s built-in X button instead of a separate CANCEL button below.
