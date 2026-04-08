# KINDpos/lite — Phase 0 Codebase Audit

**Date:** 2026-04-08
**Scope:** Full frontend audit for Scene Manager Layer Stack rebuild
**Status:** REPORT ONLY — zero code modifications

---

## 1. Executive Summary

KINDpos/lite's frontend consists of 12 scene files, 1 scene manager, 1 token system
(acting as theme-manager), and ~10 utility/component files. The current architecture
uses a flat nav-stack model (push/pop/replace) with bolt-on overlay and interrupt tiers.

**High-level assessment:**

- The scene-manager is well-structured but has no concept of layers, gates, or
  working vs transactional separation. It treats all scenes identically in a single
  nav stack.
- Order state is NOT protected. Any `replace()` call destroys it. `change-due.js`
  currently calls `replace('login')` which tears down order-entry entirely.
- Scenes directly call `push`, `pop`, `replace` — there is no centralized flow
  control. Navigation is ad-hoc and scene-driven.
- Token usage is generally good but there are ~15 hardcoded hex values across
  4 scene files.
- Two `border-radius` violations exist (components.js toast, half-placement-overlay.js).
- No localhost references found — all API calls use relative `/api/v1` paths.

**Scope of rebuild:** The scene-manager.js must be rewritten from scratch. Every scene
file must be ported to the new API (registerScene → layer-aware registration, push/pop →
layer-specific mount/open/close). The token system (tokens.js) needs ~6 new tokens for
scrim opacities, layer z-indexes, and frame colors.

---

## 2. Scene-by-Scene Breakdown

### login.js

**LAYER ASSIGNMENT:** Gate
**CURRENT API CALLS:**
- `registerScene('login', { onEnter, onExit, timeoutMs: 0 })`
- `push('landing', { emp })` — on PIN confirm
- `push('settings')` — CONFIGURATION button

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerGate('login', { ... })`
- `push('landing')` → `SceneManager.closeGate('login')` + `SceneManager.mountWorking('order-entry')` (landing is being removed or rethought as part of working layer)
- `push('settings')` → `SceneManager.openTransactional('settings')`

**HARDCODED VALUES:** None. All colors/fonts use T tokens correctly.
**DESIGN VIOLATIONS:** None.
**LOCALHOST REFERENCES:** None.
**NOTES:** Clean scene. Uses buildNumpad with full token parameterization. Version stamp
hardcodes the string 'KINDpos/lite_Vz1.2' but that's content, not style.

---

### landing.js

**LAYER ASSIGNMENT:** Working (or removed — see notes)
**CURRENT API CALLS:**
- `registerScene('landing', { onEnter, onExit, timeoutMs: 0 })`
- `push('order-entry', { ... })` — open/new check
- `push('settings', { pin })` — CONFIGURATION button (manager only)
- `replace('login')` — X button logout
- `clearSceneCache('order-entry')` — on logout

**REQUIRED API CHANGES:**
- Landing sits between login and order-entry as a dashboard. In the new architecture
  it would either become part of the Working layer or a Transactional overlay.
- `replace('login')` → `SceneManager.openGate('login')` (re-open gate)
- `push('order-entry')` → `SceneManager.mountWorking('order-entry')`
- `push('settings')` → `SceneManager.openTransactional('settings')`
- Imports from `reporting.js` for card builders — tight coupling needs review.

**HARDCODED VALUES:** None found. Uses T tokens throughout.
**DESIGN VIOLATIONS:** None.
**LOCALHOST REFERENCES:** None.
**NOTES:** Heavy scene (~500 lines). Imports `fetchReportData`, `buildLeftCard`,
`buildRightCard`, `buildCardWrap`, and chart panel builders directly from reporting.js.
This cross-scene dependency needs to be extracted into a shared utility during Phase 2.

---

### order-entry.js

**LAYER ASSIGNMENT:** Working (Primary)
**CURRENT API CALLS:**
- `registerScene('order-entry', { cache: true, onEnter, onResume, onExit })`
- `push('receipt-review', { ... })` — after PAY flow
- `push('settings')` — (not directly, but reachable)
- `push('server-checkout', { ... })` — SERVER CHECKOUT
- `push('sales-summary', { ... })` — from reporting card
- `push('close-day', { ... })` — from reporting card
- `push('tip-adjustment', { ... })` — from reporting card
- `replace('login')` — X button
- `overlay(name, params)` — used indirectly via pizza-builder-overlay
- `dismissOverlay()` — used indirectly
- `interrupt(name, params)` — void confirm, required mods
- `resolveInterrupt(value)` / `cancelInterrupt()` — interrupt resolution
- `clearSceneCache('order-entry')` — on logout

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerWorking('order-entry', { ... })`
- `cache: true` → working layer is always warm by definition
- `push('receipt-review')` → `SceneManager.openTransactional('receipt-review')`
- `replace('login')` → `SceneManager.openGate('login')`
- All `interrupt()` calls remain similar but use new API signature
- `push('server-checkout')` → `SceneManager.mountWorking('server-checkout')`

**HARDCODED VALUES:**
- `var PAD = 16; var GAP = 16; var TICKET_W = 280; var BTN_H = 50; var OVERLAP = 18;` — layout constants, not in tokens
- `background:' + T.bg5 + '` uses tokens correctly
- `border:7px solid` — the `7px` is not from tokens (T.bevel is 7, should reference it)
- `'#1a1a1a'` used in buildPrefixCard — should be T.bgDark
- `'#fff'` in PREFIXES array textColor — should be a token

**DESIGN VIOLATIONS:**
- Line 431: `background:'#1a1a1a'` — should use T.bgDark
- PREFIXES array uses raw `'#fff'`, `'#1a2a1a'`, `'#001a1a'`, `'#1a1000'`, `'#1a0030'` for textColor — these are contrast colors for button fills, arguable whether they need tokens

**LOCALHOST REFERENCES:** None. Uses `var API = '/api/v1'`.
**NOTES:** Largest scene file (~1200+ lines). Owns order state (ticket array), HexNav
integration, modifier session system, pizza builder flow, combo flow, save/recall tabs.
This is the critical scene — order state MUST survive transactional overlays in the new
architecture. Currently uses `cache: true` which partially achieves this.

---

### payment.js

**LAYER ASSIGNMENT:** Transactional
**CURRENT API CALLS:**
- `registerScene('payment', { onEnter, onExit })`
- `replace('change-due', { ... })` — after successful payment
- `replace('order-entry')` — after cancel (implied by flow)
- `overlay()` / `dismissOverlay()` — not directly used
- `interrupt()` / `resolveInterrupt()` — not directly used
- `clearSceneCache('order-entry')` — on payment complete

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerTransactional('payment', { ... })`
- `replace('change-due')` → `SceneManager.openTransactional('change-due')` (stack on top)
- Payment complete → `SceneManager.closeTransactional('payment')` (return to working)

**HARDCODED VALUES:**
- `var LEFT_W = 340` — layout constant, not in tokens
- Uses `T.scenePad`, `T.colGap` correctly for most spacing

**DESIGN VIOLATIONS:** None significant.
**LOCALHOST REFERENCES:** None.
**NOTES:** Two modes (cash/card). Cash mode uses buildNumpad for tendered amount entry.
Card mode shows animated reader status and calls `/api/v1/payments/process`. The
`clearSceneCache('order-entry')` call on payment complete is DANGEROUS — it destroys
order-entry cache. In the new architecture, transactional close should never touch
working layer state.

---

### receipt-review.js

**LAYER ASSIGNMENT:** Transactional
**CURRENT API CALLS:**
- `registerScene('receipt-review', { onEnter, onExit })`
- `push('payment', { ... })` — card or cash button
- `pop()` — BACK button

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerTransactional('receipt-review', { ... })`
- `push('payment')` → `SceneManager.openTransactional('payment')`
- `pop()` → `SceneManager.closeTransactional('receipt-review')`

**HARDCODED VALUES:** None. All tokens from T.
**DESIGN VIOLATIONS:** None.
**LOCALHOST REFERENCES:** None.
**NOTES:** Clean, stateless display scene. ~285 lines. Receives all data via params.

---

### change-due.js

**LAYER ASSIGNMENT:** Transactional
**CURRENT API CALLS:**
- `registerScene('change-due', { onEnter, onExit })`
- `replace('order-entry')` — NEW ORDER button
- `replace('login')` — LOGOUT button

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerTransactional('change-due', { ... })`
- NEW ORDER → close all transactional layers, working layer resets order state
- LOGOUT → close all transactional layers, open gate

**HARDCODED VALUES:**
- `'background:rgba(0,0,0,0.85)'` — scrim opacity should come from tokens

**DESIGN VIOLATIONS:**
- Scrim opacity hardcoded at 0.85 — should use a layer scrim token

**LOCALHOST REFERENCES:** None.
**NOTES:** Uses `replace()` which destroys the entire nav stack including order-entry.
This is the most dangerous navigation pattern in the current codebase. In the new
architecture, change-due closing should pop all transactional layers and leave the
working layer intact.

---

### server-checkout.js

**LAYER ASSIGNMENT:** Working (swaps with Order Entry)
**CURRENT API CALLS:**
- `registerScene('server-checkout', { onEnter, onExit, cache: false })`
- `push('tip-adjustment', { ... })` — UNADJUSTED button
- `pop()` — BACK button
- `overlay()` / `dismissOverlay()` — one-time tipout overlay
- `interrupt('zero-confirm', { ... })` — $0 ALL confirmation
- `resolveInterrupt()` / `cancelInterrupt()`

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerWorking('server-checkout', { ... })`
- `push('tip-adjustment')` → `SceneManager.openTransactional('tip-adjustment')`
- `pop()` → `SceneManager.mountWorking('order-entry')` (swap back)
- `interrupt()` stays similar

**HARDCODED VALUES:**
- `var RED = '#ff3355'` — not from tokens, should be T.red or a new token
- `'background:#1a1a1a'` (line 224) — should be T.bgDark
- `'color:#1a1a1a'` (line 733) — should be T.bgDark
- `var COL = '#333'; var DIM = '#999'` in receipt builder — should be tokens
- `var BEVEL = 4; var CHAM = 8` — should reference T.bevelBtn, T.chamfer

**DESIGN VIOLATIONS:**
- `RED = '#ff3355'` is close to but not equal to `T.red` (`#da331c`) — inconsistent
- Receipt content uses raw hex colors for print preview styling

**LOCALHOST REFERENCES:** None.
**NOTES:** Complex scene (~600+ lines). 2-column layout with receipt preview and
accordion card grid. Has PIN unlock gate logic for certain actions. The receipt preview
panel uses print-style colors (black on white/mint) which intentionally differ from
theme tokens — this may be acceptable for print preview fidelity.

---

### reporting.js

**LAYER ASSIGNMENT:** Transactional
**CURRENT API CALLS:**
- `registerScene('reporting', { onEnter, onExit })`
- `push('sales-summary', { ... })` — Sales Detail button
- `push('close-day', { ... })` — Close Day button
- `push('tip-adjustment', { ... })` — Tip Adjustment button
- `pop()` — BACK button

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerTransactional('reporting', { ... })`
- All `push()` calls → `SceneManager.openTransactional(...)` for close-day, sales-summary
- `pop()` → `SceneManager.closeTransactional('reporting')`

**HARDCODED VALUES:**
- `var lc = '#33ff99'` (line 385) — LABOR card color, not from tokens
- `var hc = '#33ff99'` (line 406) — HOURS card color, not from tokens

**DESIGN VIOLATIONS:**
- `#33ff99` is not a defined token — should be added to tokens.js or mapped to an existing token

**LOCALHOST REFERENCES:** None.
**NOTES:** Exports many functions consumed by landing.js: `fetchReportData`,
`buildLeftCard`, `buildLeftCardButtons`, `buildRightCard`, `buildCardWrap`,
`buildServerShiftPanels`, `buildServerHoursPanels`, `buildManagerSalesPanels`,
`buildManagerLaborPanels`. This shared code should be extracted to a utility module.

---

### close-day.js

**LAYER ASSIGNMENT:** Transactional
**CURRENT API CALLS:**
- `registerScene('close-day', { onEnter, onExit })`
- `push('tip-adjustment', { ... })` — from tip adjustment actions
- `pop()` — BACK button
- `overlay()` / `dismissOverlay()` — batch settlement overlay
- `interrupt(...)` / `resolveInterrupt()` / `cancelInterrupt()` — close day confirmation

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerTransactional('close-day', { ... })`
- `push('tip-adjustment')` → `SceneManager.openTransactional('tip-adjustment')`
- `pop()` → `SceneManager.closeTransactional('close-day')`

**HARDCODED VALUES:**
- `var RED = '#ff3355'` — same issue as server-checkout
- `'background:#1a1a1a'` (line 244) — should be T.bgDark
- `'color:#1a1a1a'` (line 848) — should be T.bgDark
- `linear-gradient(to right,#1a3a1a,#2a5a2a)` (line 1105) — raw hex gradient

**DESIGN VIOLATIONS:**
- `RED = '#ff3355'` inconsistent with T.red
- Gradient uses raw hex values not from tokens

**LOCALHOST REFERENCES:** None.
**NOTES:** Very similar structure to server-checkout.js (~700+ lines). Shares the same
accordion card grid pattern. Has batch settlement flow and PIN-gated close-day action.

---

### tip-adjustment.js

**LAYER ASSIGNMENT:** Interrupt (as a gate) OR Transactional (see notes)
**CURRENT API CALLS:**
- `registerScene('tip-adjustment', { onEnter, onExit, cache: false })`
- `push('server-checkout', { ... })` — Checkout button
- `pop()` — implicit (via header back)
- `interrupt('confirm-batch-zero', { ... })` — batch zero confirmation
- `interrupt('checkout-gate', { ... })` — unadjusted tips gate
- `interrupt('confirm-reopen', { ... })` — reopen check confirmation
- `resolveInterrupt()` / `cancelInterrupt()`

**REQUIRED API CHANGES:**
- Per spec: "Tip Adjustment gate" is an Interrupt. But the current implementation is a
  full scene with table + numpad, not a simple confirm/cancel modal.
- Options: (a) Keep as Transactional with interrupt sub-modals, or (b) redesign as a
  true interrupt-style blocking overlay.
- Likely: `SceneManager.registerTransactional('tip-adjustment', { ... })` with internal
  interrupts for batch-zero and checkout gates.

**HARDCODED VALUES:** None significant — uses T tokens well.
**DESIGN VIOLATIONS:** None.
**LOCALHOST REFERENCES:** None.
**NOTES:** The Scene Assignment Table lists "Tip Adjustment gate" as Interrupt/Blocking,
but the actual scene is a full interactive UI (table, numpad, filters). The interrupt
designation likely refers to the GATE that blocks checkout until tips are adjusted,
not the scene itself. The scene would be Transactional; the gate condition would be an
Interrupt.

---

### sales-summary.js

**LAYER ASSIGNMENT:** Transactional
**CURRENT API CALLS:**
- `registerScene('sales-summary', { onEnter, onExit, cache: false })`
- `pop()` — BACK button

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerTransactional('sales-summary', { ... })`
- `pop()` → `SceneManager.closeTransactional('sales-summary')`

**HARDCODED VALUES:**
- `var PAD = 16; var GAP = 12; var BTN_H = 50` — layout constants not from tokens
- `'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a'` — raw hex in box-shadow, should use T.bgEdge and T.bgLight

**DESIGN VIOLATIONS:**
- Hardcoded box-shadow inset colors

**LOCALHOST REFERENCES:** None.
**NOTES:** Clean, read-only scene (~232 lines). Fetches from `/api/v1/reporting/sales-summary`. Minimal porting effort.

---

### settings.js

**LAYER ASSIGNMENT:** Transactional
**CURRENT API CALLS:**
- `registerScene('settings', { cache: false, canExit, onEnter, onExit })`
- `pop()` — back/close
- `interrupt(...)` / `resolveInterrupt()` / `cancelInterrupt()` — delete device confirmation

**REQUIRED API CHANGES:**
- Registration → `SceneManager.registerTransactional('settings', { ... })`
- `pop()` → `SceneManager.closeTransactional('settings')`
- `canExit` logic (expanded card → collapse first) remains similar

**HARDCODED VALUES:**
- `'background:#333333'` (line 1164) — should be T.bg

**DESIGN VIOLATIONS:**
- Single hardcoded bg color

**LOCALHOST REFERENCES:** None.
**NOTES:** Complex scene (~800+ lines). Has hardware scanning via EventSource SSE,
device management, terminal identity config. The `canExit` pattern (collapse expanded
card before allowing exit) is a good pattern that should be preserved in the new
architecture.

---

## 3. scene-manager.js — Method Inventory

The current scene-manager.js is 383 lines. Every method is documented below with its
fate in the rebuild.

| Method | Lines | What It Does | Survives? |
|---|---|---|---|
| `init(opts)` | 75-83 | Sets DOM containers + diagnostic fn | **REWRITE** — needs layer container refs |
| `registerScene(name, config)` | 89-101 | Registers scene with lifecycle hooks | **REPLACE** — split into registerGate/registerWorking/registerTransactional |
| `push(name, params)` | 107-174 | Push scene onto flat nav stack, teardown/cache previous | **REPLACE** — becomes layer-specific mount/open |
| `pop()` | 176-219 | Pop scene from nav stack, restore previous | **REPLACE** — becomes layer-specific close |
| `replace(name, params)` | 221-253 | Replace top of stack (no exit guard) | **REMOVE** — dangerous, no equivalent in layer model |
| `overlay(name, params)` | 259-284 | Open overlay with scrim, pause scene beneath | **MERGE** — absorbed into openTransactional |
| `dismissOverlay()` | 286-298 | Close top overlay | **MERGE** — absorbed into closeTransactional |
| `interrupt(name, params)` | 304-327 | Open blocking interrupt (Promise-based) | **KEEP** — signature changes to `{ onConfirm, onCancel }` |
| `resolveInterrupt(value)` | 329-337 | Resolve interrupt promise | **KEEP** — minor signature update |
| `cancelInterrupt()` | 339-347 | Cancel interrupt promise | **KEEP** — minor signature update |
| `onBeforeTransition(fn)` | 67-69 | Register cleanup hook | **KEEP** — still needed for keyboard cleanup |
| `getActiveScene()` | 373 | Return active scene name | **REWRITE** — needs per-layer getters |
| `getStack()` | 374 | Return nav stack copy | **REPLACE** — per-layer stack getters |
| `getOverlayCount()` | 375 | Return overlay stack length | **REPLACE** — `getTransactionalStack().length` |
| `hasInterrupt()` | 376 | Check if interrupt active | **KEEP** |
| `clearSceneCache(name)` | 378-382 | Remove cached scene DOM | **REWRITE** — working layer is always warm, different semantics |

### Internal functions (not exported)

| Function | Fate |
|---|---|
| `_clearUpperTiers()` | **REWRITE** — layer-aware tier clearing |
| `debounceCheck()` | **KEEP** — navigation debounce still needed |
| `startTimeout(name)` | **KEEP** — scene timeout logic unchanged |
| `emit(type, data)` | **KEEP** — diagnostic events still needed |
| `recordInteraction()` | **KEEP** — idle timeout tracking |

### New methods needed

| Method | Purpose |
|---|---|
| `openGate(name)` | Mount gate layer (login), z-index 100 |
| `closeGate(name)` | Close gate, reveal layers beneath |
| `mountWorking(name)` | Mount/swap scene in working layer (z-index 10) |
| `openTransactional(name, params)` | Push onto transactional stack (z-index 20) |
| `closeTransactional(name)` | Pop from transactional stack |
| `closeAllTransactional()` | Clear entire transactional stack |
| `getWorkingScene()` | Return current working scene name |
| `getTransactionalStack()` | Return transactional stack copy |
| `isGateOpen()` | Check if gate is blocking |

---

## 4. tokens.js (theme-manager) — Gap Analysis

### Tokens That Exist (relevant to scene manager)

| Token | Value | Used For |
|---|---|---|
| `T.bg` | `#333333` | Scene background |
| `T.bgDark` | `#1a1a1a` | Dark backgrounds, panels |
| `T.bgEdge` | `#151515` | Bevel dark edge |
| `T.bgLight` | `#5a5a5a` | Bevel light edge |
| `T.mint` | `#C6FFBB` | Structural UI, frame borders |
| `T.gold` | `#fcbe40` | Financial data, decision frames |
| `T.red` | `#da331c` | Critical/destructive |
| `T.border` | `#444444` | General borders |
| `T.bevel` | `7` | Bevel width |
| `T.bevelBtn` | `4` | Button bevel width |
| `T.chamfer` | `8` | Chamfer size |

### Tokens MISSING — Required by New Architecture

| Proposed Token | Value | Purpose |
|---|---|---|
| `T.zGate` | `100` | Gate layer z-index |
| `T.zInterrupt` | `30` | Interrupt layer z-index |
| `T.zTransactional` | `20` | Transactional layer z-index |
| `T.zWorking` | `10` | Working layer z-index |
| `T.scrimGate` | `rgba(0,0,0,1.0)` | Gate scrim (fully opaque) |
| `T.scrimInterrupt` | `rgba(0,0,0,0.85)` | Interrupt scrim opacity |
| `T.scrimTransactional` | `rgba(0,0,0,0.5)` | Transactional scrim opacity |
| `T.frameInterruptDecision` | T.gold | Interrupt frame — decision type |
| `T.frameInterruptCritical` | T.red | Interrupt frame — critical type |
| `T.frameTransactional` | T.mint | Transactional overlay frame |
| `T.frameGate` | `none` | Gate has no visible frame |

**Note:** The current overlay scrim is hardcoded at `rgba(0,0,0,0.5)` in scene-manager.js
line 267. The interrupt scrim is hardcoded at `rgba(0,0,0,0.7)` in scene-manager.js
line 312. Both need to become token-driven.

---

## 5. Utility Gap Analysis

### Utilities That Exist

| Utility | File | Used By | Status |
|---|---|---|---|
| `buildStyledButton(fillColor)` | tokens.js | All scenes | **KEEP** — core button factory |
| `applySunkenStyle(el)` | tokens.js | 8+ scenes | **KEEP** — sunken panel style |
| `applyRaisedStyle(el, fill)` | tokens.js | numpad.js | **KEEP** — raised panel style |
| `chamfer(s)` | tokens.js | All scenes | **KEEP** — clip-path generator |
| `bevelEdges(fillColor)` | tokens.js | tokens.js internal | **KEEP** — edge color lookup |
| `shadowColor(fillColor)` | tokens.js | tokens.js internal | **KEEP** — shadow color lookup |
| `buildButton(label, opts)` | components.js | All scenes | **KEEP** — high-level button builder |
| `showToast(message, opts)` | components.js | 4 scenes | **FIX** — has border-radius violation |
| `buildGap(px)` | components.js | 2 scenes | **KEEP** — spacer utility |
| `buildNumpad(opts)` | numpad.js | login, payment, tip-adj, server-checkout, close-day | **KEEP** — reusable numeric input |
| `showKeyboard(opts)` | keyboard.js | settings.js, order-entry (via overlay) | **KEEP** — QWERTY overlay |
| `hideKeyboard()` | keyboard.js | app.js (transition hook) | **KEEP** |
| `HexNav` | hex-nav.js | order-entry.js | **KEEP** — DO NOT TOUCH |
| `showPizzaBuilderOverlay(item, data)` | pizza-builder-overlay.js | order-entry.js | **FIX** — uses interrupt() directly, should go through SceneManager |
| `showHalfPlacementOverlay(...)` | half-placement-overlay.js | order-entry.js | **FIX** — uses interrupt() directly, has border-radius violation |
| `buildChartGrid(builderFn, cb)` | chart-helpers.js | reporting.js, landing.js | **KEEP** — chart system |
| Chart drawing functions | chart-helpers.js | reporting.js | **KEEP** — SVG chart renderers |
| `DATA` palette | chart-colors.js | chart-helpers.js | **KEEP** — locked v4 palette |
| `PAT`, `GLOW` | chart-patterns.js | chart-helpers.js | **KEEP** — SVG patterns |

### Utilities MISSING — Required by New Architecture

| Utility | Purpose |
|---|---|
| Layer container factory | Create/manage the 4 layer DOM containers with correct z-index stacking |
| Scrim factory | Create scrim elements with token-driven opacity per layer type |
| Frame factory | Create overlay frames with token-driven border colors |
| Event bus | Global pub/sub for cross-layer communication (replaces direct state access) |
| Scene lifecycle manager | Standardized mount/unmount/pause/resume per layer type |

### Dependency Map

```
app.js
  ├── scene-manager.js (init, push, pop, replace, onBeforeTransition, clearSceneCache)
  ├── tokens.js (T, buildStyledButton)
  ├── keyboard.js (hideKeyboard)
  ├── components.js (showToast)
  └── [imports all 12 scene files for self-registration]

tokens.js (NO dependencies — leaf node)
  exports: T, chamfer, bevelEdges, shadowColor, buildStyledButton, applySunkenStyle, applyRaisedStyle

components.js
  └── tokens.js (T, buildStyledButton)

numpad.js
  └── tokens.js (T, chamfer, buildStyledButton, applySunkenStyle, applyRaisedStyle, shadowColor)

keyboard.js
  └── tokens.js (T, buildStyledButton, applySunkenStyle, shadowColor)

hex-nav.js
  └── tokens.js (T)

pizza-builder-overlay.js
  ├── tokens.js (T, buildStyledButton, applySunkenStyle)
  ├── scene-manager.js (interrupt, resolveInterrupt, cancelInterrupt)
  └── hex-nav.js (HexNav)

half-placement-overlay.js
  ├── tokens.js (T, buildStyledButton)
  └── scene-manager.js (interrupt, resolveInterrupt, cancelInterrupt)

chart-helpers.js
  ├── tokens.js (T, applySunkenStyle)
  ├── chart-colors.js (DATA)
  └── chart-patterns.js (injectChartDefs, PAT, GLOW)

Scene files → all depend on:
  ├── tokens.js
  ├── components.js
  ├── scene-manager.js
  └── app.js (setSceneName, setHeaderBack)

Special cross-scene dependency:
  landing.js → reporting.js (imports card builders + fetchReportData)
```

---

## 6. Recommended Build Order (Phase 1 → Phase 2)

### Phase 1 — Scene Manager Engine (no scenes ported)

1. **Add missing tokens** to tokens.js (z-indexes, scrim opacities, frame colors)
2. **Build new scene-manager.js** with layer stack model:
   - Gate layer (open/close)
   - Working layer (mount/swap, always warm)
   - Transactional layer (push/pop stack)
   - Interrupt layer (blocking modal)
   - All 4 DOM containers created in init()
3. **Build event bus** utility for cross-layer communication
4. **Build scrim/frame factories** using new tokens
5. **Update index.html** if layer containers need restructuring
6. **Update app.js** boot sequence: init → openGate('login')

### Phase 2 — Scene Porting (one scene at a time)

Recommended order based on dependency chain and risk:

| Order | Scene | Layer | Risk | Reason |
|---|---|---|---|---|
| 1 | login.js | Gate | Low | Simplest scene, validates gate layer |
| 2 | order-entry.js | Working | **HIGH** | Core scene, validates working layer warmth |
| 3 | receipt-review.js | Transactional | Low | Simple, validates transactional push |
| 4 | payment.js | Transactional | Medium | Validates transactional stack (payment → change-due) |
| 5 | change-due.js | Transactional | Medium | Validates transactional close-all + working layer survival |
| 6 | settings.js | Transactional | Low | Independent, validates canExit pattern |
| 7 | reporting.js | Transactional | Medium | Has shared exports consumed by landing.js |
| 8 | sales-summary.js | Transactional | Low | Simple read-only |
| 9 | tip-adjustment.js | Transactional | Medium | Uses interrupts heavily |
| 10 | server-checkout.js | Working | Medium | Validates working layer swap |
| 11 | close-day.js | Transactional | Medium | Similar to server-checkout |
| 12 | landing.js | Working/Trans. | Medium | Depends on reporting.js refactor |

### Phase 2 also includes:
- Fix `showToast` border-radius violation in components.js
- Fix `half-placement-overlay.js` border-radius violation
- Fix hardcoded hex values in server-checkout.js, close-day.js, reporting.js, settings.js
- Extract shared reporting card builders from reporting.js → new utility module
- Update pizza-builder-overlay.js and half-placement-overlay.js to use new interrupt API

---

## 7. Risk Flags

1. **Order state destruction** — The current `replace()` pattern in change-due.js and
   payment.js can destroy order-entry state. This is the #1 motivation for the layer
   model. Until ported, this remains a live bug risk.

2. **Cross-scene import coupling** — landing.js imports heavily from reporting.js.
   This creates a fragile dependency that will complicate independent porting. Extract
   shared code first.

3. **Overlay vs Transactional ambiguity** — The current overlay system (used by
   pizza-builder and half-placement) is separate from the scene nav stack. In the new
   architecture, these become transactional or interrupt layer operations. The transition
   needs careful handling.

4. **`clearSceneCache('order-entry')` calls** — Found in 4 places (landing.js,
   order-entry.js, payment.js, app.js). In the new architecture, the working layer is
   always warm — these calls become no-ops or explicit order reset actions.

5. **Hardcoded `RED = '#ff3355'`** — Used in both server-checkout.js and close-day.js.
   This is NOT `T.red` (`#da331c`). Either a new token is needed or these should align
   with `T.red`.

6. **Settings EventSource** — settings.js opens an SSE connection for hardware scanning.
   If the scene is now transactional (mounted/unmounted more frequently), the EventSource
   lifecycle needs careful management to avoid leaks.

7. **Timer cleanup** — change-due.js has a countdown timer, payment.js has a dot
   animation timer. Both clean up in onExit. The new layer model must guarantee onExit
   fires when transactional layers close.

---

*End of Phase 0 Audit Report*
