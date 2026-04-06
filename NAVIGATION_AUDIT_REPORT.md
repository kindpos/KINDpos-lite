# KINDpos/lite — Navigation & Shortcut Audit Report

> Generated 2026-04-04 | Covers all frontend scenes, backend routes, and cross-cutting systems
> Purpose: Onboarding/training material — surface differentiators vs. Toast, Square, Clover

---

## Summary

| Metric | Count |
|---|---|
| Total scene-to-scene navigation paths | 18 |
| Unique KINDpos differentiators | 10 |
| Role-gated actions | 5 |
| Interrupt (blocking modal) patterns | 7 |
| Overlay (non-blocking modal) patterns | 4 |
| Numpad entry points | 8 |
| Keyboard (QWERTY) entry points | 3 |
| Hardware-triggered flows | 6 |
| Debug/diagnostic entry points | 3 |

---

## Scene Map

```
                          +------------------+
                          |      LOGIN       |
                          |  (PIN numpad)    |
                          +--------+---------+
                         /         |          \
               [manager]      [any role]      [server/manager]
                  |               |                |
           +------+     +---------+------+    +----+--------+
           |SETTINGS|   | ORDER-ENTRY    |    |  REPORTING  |
           |(config)|   | (HexNav menu)  |    |  (stats)    |
           +--------+   +-------+--------+    +--+---+---+--+
                                |                |   |   |
                          [PAY button]           |   |   |
                                |                |   |   |
                     +----------+----------+     |   |   |
                     | RECEIPT-REVIEW       |     |   |   |
                     | (card vs cash pick)  |     |   |   |
                     +----+----------+-----+     |   |   |
                          |          |           |   |   |
                    [CARD]|    [CASH]|           |   |   |
                          |          |           |   |   |
                     +----+----------+-----+     |   |   |
                     |      PAYMENT        |     |   |   |
                     | (numpad / presets)   |     |   |   |
                     +----------+----------+     |   |   |
                                |                |   |   |
                       [replace → back to        |   |   |
                        order-entry]             |   |   |
                                                 |   |   |
                  +------------------------------+   |   |
                  |            +---------+           |   |
                  |            |         +---[manager only]
                  v            v                     v
          +-------+---+ +-----+--------+    +-------+------+
          |    TIP     | |   SERVER     |    |   CLOSE-DAY  |
          | ADJUSTMENT | |  CHECKOUT    |    | (manager)    |
          | (table)    | | (accordion)  |    | (accordion)  |
          +-----+------+ +------+------+    +------+-------+
                |                |                  |
           [checkout gate]  [finalize]        [close day]
                |                |                  |
                +------>  pop() to REPORTING  <-----+
```

---

## Findings by Scene

---

### Scene: LOGIN

**File**: `frontend/js/scenes/login.js`
**Role access**: All users (entry point)

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `login.js` handleAction | Tap "Quick Service" button | `order-entry` (mode: service) | `push()` | Standard | Primary workflow entry after PIN |
| `login.js` handleAction | Tap "Reporting" button | `reporting` | `push()` | Standard | Server/manager access to end-of-day flows |
| `login.js` handleAction | Tap "Configurations" button | `settings` | `push()` | Standard | Manager-only (role gate blocks non-managers silently) |
| `login.js` handleAction | Tap "Clock in/out" button | clock action | N/A | Standard | Clock in/out function |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| Numpad (6-digit, masked) | Digit taps + submit | PIN validation against `/api/v1/servers` employee list | N/A | Enter your PIN; invalid PINs are silently ignored |
| "< Quick Service >" button | pointerup | Navigate to order-entry with employee context | PIN must be valid | Mint color, large 60px font — primary action |
| "Clock in/out" button | pointerup | Clock action | PIN must be valid | Cyan color |
| "Reporting" button | pointerup | Navigate to reporting | role = server or manager | Cyan color |
| "< Configurations >" button | pointerup | Navigate to settings | **Manager-only** — `if (role !== 'manager') return` | Gold color, 60px font |

#### Role-Based Access

| Role | Available Actions |
|---|---|
| Cashier/Server | Quick Service, Clock in/out, Reporting |
| Manager | All above + Configurations |

#### Unique/Differentiator Notes
- **Silent role gating**: Non-managers who tap "Configurations" get no error — the button simply does nothing. This avoids drawing attention to restricted features. Most POS systems show an "Access Denied" dialog.
- **Version label**: Displays `KINDpos_lite // Vz1.0` with color-coded spans in header.

---

### Scene: ORDER-ENTRY

**File**: `frontend/js/scenes/order-entry.js`
**Role access**: All authenticated users

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `order-entry.js` PAY handler | Tap "//PAY//" button | `receipt-review` | `push()` | Standard | Passes orderId, items, subtotal, tax, cardTotal, cashPrice |
| `app.js` header | Tap "<<<" back button | Previous scene | `pop()` | Standard | Red header button, returns to login or reporting |
| `app.js` header | Tap "X" logout button | `login` | `replace()` | Standard | Red header button, full logout |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| HexNav bloom menu | Tap hexagons | 3-level drill: category > subcat > item | Tab must be "items" | **DIFFERENTIATOR**: Hexagonal SVG menu, tap locked hex to go back one level |
| "< items >" tab | pointerup | Switch to items tab, show HexNav + prefix card | N/A | Mint color, 26px; border tracks active tab |
| "< modifiers >" tab | pointerup | Switch to modifiers tab, hide prefix card | N/A | Gold color, 26px |
| Prefix buttons (Add/No/On Side/Extra/Sub) | pointerup | Set active modifier prefix, color-coded | Items tab only | Color-coded selection for modifier workflow |
| "//SEND//" button | pointerup | POST items to kitchen + print ticket | Must have unsent items | Green, 36px — sends order to kitchen printer |
| "//VOID//" button | pointerup | Triggers void interrupt flow (2-step) | Requires manager PIN gate | Red — initiates `interrupt('void-pin')` then `interrupt('void-reason')` |
| "//PAY//" button | pointerup | Navigate to receipt-review | Must have items | Gold — transition to payment flow |
| "//SAVE//" button | pointerup | Save ticket to localStorage with keyboard name entry | N/A | Opens QWERTY keyboard for tab naming (max 20 chars) |
| "//RECALL//" button | pointerup | Show overlay grid of saved tabs | N/A | Opens `overlay('recall')` with 3-column grid |
| "//PRINT//" button | N/A | Disabled | N/A | Cyan, currently disabled |
| "//DISC//" button | N/A | Disabled | N/A | Currently disabled |
| Group card headers | pointerup | Expand/collapse ticket item groups | N/A | Collapsed ticket items can be expanded |
| Instance cards | pointerup | Select item in ticket panel | N/A | Individual line items in the order |

#### Input Patterns

| Type | Component | Options | Training Note |
|---|---|---|---|
| HexNav | `hex-nav.js` | 3-level SVG bloom: CAT_R=80px, SUBCAT_R=80px, ITEM_R=60px | Tap category to see subcats, tap subcat to see items, tap locked hex to go back |
| Numpad (void PIN) | `numpad.js` | 4-digit, masked | Manager PIN required for void operations |
| Keyboard (save tab) | `keyboard.js` | 20 char max, optional | Name your saved tab for later recall |

#### Interrupt/Modal Patterns

| Name | Trigger | Behavior | Unique vs Standard | Training Note |
|---|---|---|---|---|
| `void-pin` | Tap VOID button | Numpad overlay for manager PIN (hardcoded '1234') | **DIFFERENTIATOR**: Two-step gate — PIN first, then reason | Manager must authorize voids with their PIN |
| `void-reason` | After valid void PIN | Reason selection panel (VOID_REASONS array) | **DIFFERENTIATOR**: Structured reason capture, not just confirm | Select why the void is happening — creates audit trail |
| `confirm-clear` | Recall over existing ticket | Confirmation when recalling would overwrite current work | Standard | Prevents accidental loss of in-progress order |
| `recall-action` | Tap a saved tab in recall overlay | Multi-option: RECALL or DELETE | Slightly unique (multi-option vs binary) | Choose to load or permanently remove a saved tab |

#### Overlay Patterns

| Name | Trigger | Behavior | Training Note |
|---|---|---|---|
| `recall` | Tap RECALL button | 3-column grid of saved tabs from localStorage | Browse and select previously saved orders |

---

### Scene: RECEIPT-REVIEW

**File**: `frontend/js/scenes/receipt-review.js`
**Role access**: All authenticated users (reached from order-entry)

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `receipt-review.js` | Tap CARD button | `payment` (paymentMode: card) | `push()` | Standard | Gold button with press animation |
| `receipt-review.js` | Tap CASH button | `payment` (paymentMode: cash) | `push()` | Standard | Mint button with press animation |
| `receipt-review.js` | Tap "BACK" button | Previous scene | `history.go(-1)` | Standard | Gray button, returns to order-entry |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| CARD button | pointerdown/pointerup | Press animation (translate + shadow) then navigate | N/A | Gold, dual-state animation feedback |
| CASH button | pointerdown/pointerup | Press animation then navigate | N/A | Mint, dual-state animation feedback |
| "BACK" button | pointerup | Go back | N/A | Gray |

#### Unique/Differentiator Notes
- **Dual-price display**: Shows both card total and cash price side by side with savings amount highlighted. Most POS systems show one price. KINDpos surfaces the cash discount explicitly so the customer can choose.

---

### Scene: PAYMENT

**File**: `frontend/js/scenes/payment.js`
**Role access**: All authenticated users (reached from receipt-review)

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `payment.js` doReturn | Auto-return after 4000ms OR tap result panel | `order-entry` (or returnScene) | `replace()` | Slightly unique (auto-return) | Uses `replace()` not `push()` — no back-nav to payment after completion |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| Preset cash buttons | pointerup | Set tendered amount ($5, $10, $15, $20, $50, $100) | Cash mode only | 6-button grid for quick cash entry |
| "EXACT $X.XX" button | pointerup | Set tendered to exact cash price | Cash mode only | Gold — one-tap exact change |
| "CHARGE $X.XX" button | pointerup | Initiate card payment | Card mode only | Gold — sends to card reader |
| Numpad (cash) | Digit entry | Custom cash amount (7 digits, $ format) | Cash mode only | Live-updating display, submit when >= cashPrice |
| Result panel | pointerup anywhere | Dismiss result early, return to order-entry | Result state active | Tap anywhere to skip the auto-return countdown |
| Progress bar | Auto-animation | 4000ms countdown to auto-return | Result state active | Visual indicator of remaining time before auto-return |

#### Input Patterns

| Type | Component | Options | Training Note |
|---|---|---|---|
| Numpad (cash) | `numpad.js` | 7 digits max, $ display format, onSubmit when >= cashPrice | Enter custom cash amount; auto-submits when sufficient |

#### Hardware-Triggered Flows

| Trigger | Action | Training Note |
|---|---|---|
| Cash confirm | POST `/api/v1/payments/cash` | Processes cash payment |
| Card confirm | POST `/api/v1/payments/sale` | Sends sale to card reader, shows animated waiting dots |
| Payment success | POST `/api/v1/print/receipt/{orderId}` | Prints customer receipt (+ merchant copy for card) |

#### Unique/Differentiator Notes
- **Auto-return with progress bar**: After payment completes, a 4000ms animated progress bar counts down before automatically returning to order-entry. Tap anywhere to dismiss early. Most POS systems require an explicit "Done" tap.
- **Card reader animated dots**: During card processing, animated dots cycle as status indicator — not a spinner.
- **`replace()` navigation**: Payment uses `replace()` instead of `push()` so the user cannot accidentally navigate back to a completed payment screen.

---

### Scene: CHANGE-DUE

**File**: `frontend/js/scenes/change-due.js`
**Role access**: All authenticated users (reached from payment)

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `change-due.js` doReturn | Auto-return after 4000ms OR tap anywhere | `order-entry` (or returnScene) | `replace()` | Standard | Full-screen result display |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| Entire scene | pointerup anywhere | Dismiss early, return to order-entry | N/A | Tap anywhere to skip auto-return |

#### Unique/Differentiator Notes
- **Mode-dependent display**: Icon and label change based on context — "$" icon for change due, "checkmark" for exact change or card approval. Label text: "CHANGE DUE" / "EXACT CHANGE" / "PAYMENT APPROVED".
- **Full-screen tap target**: The entire viewport is a dismiss button — no need to find a specific "OK" button.

---

### Scene: REPORTING

**File**: `frontend/js/scenes/reporting.js`
**Role access**: Server and Manager (reached from login)

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `reporting.js` | Tap "Tip Adjustment" card | `tip-adjustment` | `push()` | Standard | Passes employeeId, employeeName, role |
| `reporting.js` | Tap "Checkout" card | `server-checkout` | `push()` | Standard | **Server role only** — card not shown for managers |
| `reporting.js` | Tap "Close Day" card | `close-day` | `push()` | Standard | **Manager role only** — card not shown for servers |
| `reporting.js` | Tap "Sales Summary" card | `sales-summary` | `push()` | Standard | Currently placeholder |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| "Tip Adjustment" card | pointerup | Navigate to tip-adjustment | N/A | Mint border/text, 6 info stat lines |
| "Checkout" / "Close Day" card | pointerup | Navigate (role-dependent destination) | **Role-gated**: server sees Checkout, manager sees Close Day | Red border — end-of-shift/day action |
| "Sales Summary" card | pointerup | Navigate to sales-summary | N/A | Mint border |
| Card press animation | pointerdown/pointerup/pointerleave | Transform translate press effect | N/A | Visual feedback on all cards |

#### Role-Based Access

| Role | Cards Shown | Stat Scope |
|---|---|---|
| Server | Tip Adjustment, Checkout, Sales Summary | Filtered by server_id |
| Manager | Tip Adjustment, Close Day, Sales Summary | All servers (unfiltered) |

#### Unique/Differentiator Notes
- **Role-dependent card swap**: The second card physically changes between "Checkout" (server) and "Close Day" (manager). Not a disabled button — entirely different destination.
- **Unadjusted tips text**: Manager sees "all servers" aggregate; server sees their own count only.

---

### Scene: TIP-ADJUSTMENT

**File**: `frontend/js/scenes/tip-adjustment.js`
**Role access**: Server and Manager (reached from reporting)

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `tip-adjustment.js` | Tap "//Checkout//" button (if all tips adjusted) | `server-checkout` | `push()` | Standard | Only navigates if no unadjusted tips remain |
| `tip-adjustment.js` | Tap "//Checkout//" with unadjusted tips | Triggers `interrupt('checkout-gate')` | N/A | **DIFFERENTIATOR** | Gate offers "Set to $0" or "Go Back" — not a simple confirm |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| "ALL" filter button | pointerup | Show all checks in table | N/A | Mint color, toggles filter state |
| "Unadjusted: X" filter button | pointerup | Show only unadjusted checks | N/A | Cyan initially, shows count |
| Tip cells (table) | pointerup | Activate edit mode for that check | Only unadjusted rows (cyan border) | Tap the cyan tip cell to enter a tip amount |
| Numpad (edit mode) | Digit entry | Enter tip amount (6 digits, $ format) | Edit mode active | Auto-advances to next unadjusted check on submit |
| "CANCEL" button | pointerup | Cancel current edit | Edit mode active | Red — exits edit without saving |
| "Set all unadjusted tips to $0?" batch button | pointerup | Triggers `interrupt('confirm-batch-zero')` | Unadjusted tips exist | Batch-zero operation for quick close-out |
| "//Checkout//" button | pointerup | Navigate or gate (see interrupts) | N/A | Mint — primary action |
| "//Print//" button | pointerup | Print receipts | N/A | Gray |

#### Input Patterns

| Type | Component | Options | Training Note |
|---|---|---|---|
| Numpad (tip edit) | `numpad.js` | 6 digits, $ format, onChange/onSubmit | Enter tip; auto-advances to next unadjusted check |

#### Interrupt/Modal Patterns

| Name | Trigger | Behavior | Unique vs Standard | Training Note |
|---|---|---|---|---|
| `confirm-batch-zero` | Tap batch-zero button | Confirm/Cancel: set all unadjusted tips to $0 | Slightly unique (batch operation) | Quick way to zero out all remaining tips at once |
| `checkout-gate` | Tap Checkout with unadjusted tips | **Multi-option gate**: "Set to $0" or "Go Back" | **DIFFERENTIATOR**: Not binary confirm/cancel — offers a resolution path | System helps you resolve the blocker, not just warn about it |

#### Hardware-Triggered Flows

| Trigger | Action | Training Note |
|---|---|---|
| Tip submit | POST `/api/v1/payments/tip-adjust` with retry (3 attempts, 1s/2s backoff) | Retry logic prevents lost tip adjustments on flaky network |
| Retry failure | Red outline on failed rows (syncError flag) | Visual indicator of which tips failed to save |

#### Unique/Differentiator Notes
- **Auto-advance cursor**: After entering a tip, the system automatically moves to the next unadjusted check. No need to manually select each row. Most POS systems require explicit row selection for each tip.
- **Batch-zero gate pattern**: The checkout-gate interrupt doesn't just say "you have unadjusted tips, continue anyway?" — it offers to resolve the problem ("Set to $0") or go back. The system guides the user toward a clean state.
- **Edit mode dimming**: When editing a tip, all other elements drop to 30% opacity with pointerEvents disabled. Focuses attention on the active edit.
- **Network retry with visual feedback**: Tip adjustments retry up to 3 times with exponential backoff. Failed saves show a red outline so the user knows exactly which tips need attention.

---

### Scene: SERVER-CHECKOUT

**File**: `frontend/js/scenes/server-checkout.js`
**Role access**: Server (reached from reporting or tip-adjustment)

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `server-checkout.js` | Tap "Open Checks" jump button | `tip-adjustment` (implied) | `push()` | **DIFFERENTIATOR** | Red jump button appears inside Check Stats card when open checks block checkout |
| `server-checkout.js` | Tap "Tip Adjustment" jump button | `tip-adjustment` | `push()` | **DIFFERENTIATOR** | Yellow jump button in Tips Received card when unadjusted tips block checkout |
| `server-checkout.js` | After successful finalize | Previous scene (reporting) | `pop()` | Standard | Returns to reporting after close-batch |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| Accordion card headers (6 cards) | pointerup | Toggle expand/collapse body | N/A | Chevron rotates: ">" collapsed, "v" expanded. One card open at a time |
| "Open Checks" jump button | pointerup | Navigate to resolve open checks | **Only shown when open checks block checkout** | Red button inside card — direct path to fix the blocker |
| "Tip Adjustment (X remaining)" jump button | pointerup | Navigate to tip-adjustment | **Only shown when unadjusted tips block checkout** | Yellow button — direct path to fix the blocker |
| "Adjust %" button | pointerup | Open tip-out % adjustment overlay | N/A | Gold — in Tip-Out card |
| "//PRINT//" button | pointerup | Print server checkout receipts | N/A | Mint |
| "//FINALIZE//" button | pointerup | Triggers manager-approval interrupt | **Disabled if blockers exist** (dashed outline, no pointer events) | Gold — grayed out with dashed border when blocked |

#### Overlay Patterns

| Name | Trigger | Behavior | Training Note |
|---|---|---|---|
| `adjust-pct` | Tap "Adjust %" | Per-role rows with basis toggle (Net Sales / Liquor Sales), +/- buttons, % display | Adjust tip-out percentages per role; basis toggle switches calculation base |

#### Interrupt/Modal Patterns

| Name | Trigger | Behavior | Unique vs Standard | Training Note |
|---|---|---|---|---|
| `manager-approval` | Tap FINALIZE (when unblocked) | Manager PIN gate: "Approve" / "Cancel" | Standard (PIN gate) | Manager must approve server checkout with their PIN |

#### Unique/Differentiator Notes
- **Contextual blocker system with jump navigation**: Instead of a generic "you can't do this" message, blocked cards show exactly what's wrong (red/yellow border + status dot + warning text) AND provide a direct navigation button to fix it. The user never has to figure out where to go — the system takes them there.
- **Accordion cards with alert panel**: The 6-card accordion layout with color-coded headers (red=blocked, mint=ready) provides at-a-glance status. The alert panel at top summarizes all blockers as a red/green dot list.
- **Finalize disabled state**: When blocked, the FINALIZE button shows dashed outline with no pointer events — visually distinct from a "grayed out" button. It's clear the button exists but isn't available yet.

---

### Scene: CLOSE-DAY

**File**: `frontend/js/scenes/close-day.js`
**Role access**: **Manager only** (reached from reporting)

#### Navigation Paths

| Source | Trigger | Destination | Nav Method | Unique vs Standard | Training Note |
|---|---|---|---|---|---|
| `close-day.js` | After successful close day | Previous scene (reporting) | `pop()` | Standard | Returns to reporting |

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| Accordion card headers (6 cards) | pointerup | Toggle expand/collapse | N/A | Revenue Summary, Payment Breakdown, Category Sales, Check Stats, Daypart Summary, Tips & Gratuity |
| "//PRINT//" button | pointerup | Print end-of-day receipts | N/A | Mint |
| "//SUBMIT BATCH//" button | pointerup | Opens batch settlement overlay | N/A | Cyan — changes to "BATCH SETTLED" after completion |
| "//CLOSE DAY//" button | pointerup | Triggers manager-approval interrupt | **Disabled if open checks exist** (dashed outline) | Gold — final day-close action |

#### Overlay Patterns

| Name | Trigger | Behavior | Unique vs Standard | Training Note |
|---|---|---|---|---|
| `batch-settlement` | Tap SUBMIT BATCH | **Win98-style dialog**: title bar with close button, sunken info panel (transactions, batch total, processor), 26-segment progress bar with opacity animation, cycling status messages | **DIFFERENTIATOR** | Retro-styled batch settlement with animated progress — visually distinctive and informative |

#### Interrupt/Modal Patterns

| Name | Trigger | Behavior | Unique vs Standard | Training Note |
|---|---|---|---|---|
| `manager-approval` | Tap CLOSE DAY (when unblocked) | Manager PIN gate: "Approve" / "Cancel" | Standard (PIN gate) | Manager must approve day close with their PIN |

#### Hardware-Triggered Flows

| Trigger | Action | Training Note |
|---|---|---|
| Batch settlement | POST `/api/v1/orders/close-batch` | Closes remaining open orders in batch |
| Day close | POST `/api/v1/orders/close-day` | Final day-close API call |
| Print | POST `/api/v1/print/receipt/{orderId}?copy_type=itemized` | Prints end-of-day itemized receipts |

#### Unique/Differentiator Notes
- **Win98-style batch settlement dialog**: The batch settlement overlay deliberately evokes a Windows 98 dialog box with title bar, sunken panels, and a segmented progress bar. Status messages cycle through as progress advances. This is both functional (shows real batch progress) and a deliberate design choice.
- **Two-phase close**: Batch settlement and day close are separate actions. The user can settle the batch first, verify totals, then close the day. Most POS systems combine these into one action.

---

### Scene: SETTINGS (Configurations)

**File**: `frontend/js/scenes/settings.js`
**Role access**: **Manager only** (reached from login)

#### Navigation Paths

Settings is self-contained — no scene-to-scene navigation. All navigation is internal tab/step switching.

#### Interactive Elements

| Element | Trigger | Action | Conditional | Training Note |
|---|---|---|---|---|
| "Hardware" tab | pointerup | Switch to hardware configuration | N/A | Gold when active |
| "Terminal" tab | pointerup | Switch to terminal configuration | N/A | Mint when active |
| "//Add Device//" button | pointerup | Start multi-step device add flow | Hardware tab | Enters choose > scan > enter-ip > results > confirm flow |
| "Card Readers" nav button | pointerup | Filter device list to card readers | Hardware tab | |
| "Printers" nav button | pointerup | Filter device list to printers | Hardware tab | |
| "Scan Network" button | pointerup | Start EventSource network scan | Add Device flow | Streams results via SSE |
| "Enter IP Address" button | pointerup | Switch to manual IP entry | Add Device flow | Custom numpad for IP octets |
| IP octet numpad (1-9, 0, clr, submit) | pointerup | Enter IP address manually | Enter-IP step | Custom 3x4 grid for each octet |
| Device list rows (Test/Remove/Add) | pointerup | Test connectivity, remove device, or add new | Hardware tab | Per-device action buttons |
| Type selector (Kitchen/Receipt/Card Reader) | pointerup | Set device type for new device | Add Device confirm step | Shows/hides Register ID field for card readers |
| Device name field | pointerup | Open QWERTY keyboard for name entry | Add Device flow | Max 20 chars |
| Register ID field | pointerup | Open QWERTY keyboard for Register ID | Card reader type only | Required for Dejavoo SPIn |
| Settings value cards | pointerup | Open numpad editor overlay | Terminal tab | Tax rate, cash discount, terminal name |
| "Identity" / "Network" / "Business" nav | pointerup | Switch terminal settings subsection | Terminal tab | |

#### Input Patterns

| Type | Component | Options | Training Note |
|---|---|---|---|
| Custom IP numpad | Custom in settings.js | 1-9 grid + 0 + clr/submit for each octet | Special-purpose numpad for IP address entry |
| Numpad (settings) | `numpad.js` | 6 digits, no mask, in overlay | Edit tax rate, cash discount, etc. |
| Keyboard (device name) | `keyboard.js` | 20 char max | Name your device |
| Keyboard (Register ID) | `keyboard.js` | 20 char max | Enter Dejavoo SPIn Register ID |

#### Overlay Patterns

| Name | Trigger | Behavior | Training Note |
|---|---|---|---|
| `setting-edit` | Tap a settings value card | Numpad editor for numeric values (tax rate, cash discount, terminal name) | Edit system settings with formatted numpad input |

#### Hardware-Triggered Flows

| Trigger | Action | Training Note |
|---|---|---|
| Scan Network | `EventSource` SSE stream from `/api/v1/hardware/scan/stream` | Live device discovery — devices appear as found, no waiting for full sweep |
| Single IP scan | `EventSource` with `?ip=` param | Probe specific IP address |
| Save device | POST `/api/v1/hardware/devices` | Persist device config by MAC address |
| Delete device | DELETE `/api/v1/hardware/devices/{mac}` | Remove saved device |
| Test print | POST `/api/v1/hardware/test-print` | Send ESC/POS test receipt to printer |
| Hot-reload | POST `/api/v1/payments/reload-devices` | Reload payment/printer managers after config change |

#### Unique/Differentiator Notes
- **EventSource-streamed network scanning**: Devices appear in the UI as they're discovered during a network sweep (batches of 20). No loading spinner followed by a list — results stream in real-time. Most POS systems have a static "searching..." then results page.
- **MAC-as-identity**: Devices are identified by MAC address, not IP. IPs can change (DHCP); MACs don't. This means a printer that gets a new IP after a reboot is still recognized.
- **Multi-step device add wizard**: The add-device flow (choose type > scan/enter IP > review results > confirm) guides the user through hardware setup step by step.
- **Auto-detect Dejavoo SPIn**: During scanning, the system automatically probes card readers via SPIn GET to detect RegisterId, serial, and model.

---

## Cross-Cutting Systems

### 1. Three-Tier Navigation Architecture

**File**: `frontend/js/scene-manager.js`

KINDpos uses a three-tier navigation model unlike any mainstream POS:

| Tier | Purpose | Z-Index | Dim Layer | Stacking | Key Feature |
|---|---|---|---|---|---|
| **Scenes** | Full-screen views | Base | None | Stack-based (push/pop/replace) | `canExit()` Promise guard, 200ms debounce, prefetch |
| **Overlays** | Semi-modal dialogs | 100-101 | `rgba(0,0,0,0.5)` | Multiple can stack | Pauses underlying scene, caller builds UI |
| **Interrupts** | Blocking modals | 200-201 | `rgba(0,0,0,0.7)` | One at a time only | Returns Promise — caller `await`s resolution |

**Navigation functions**:
- `push(name, params)` — New scene with exit guard, debounce, cache support, prefetch
- `pop()` — Back to previous scene, respects exit guards
- `replace(name, params)` — Replace current scene (no back-nav, no exit guard)
- `overlay(name, params)` — Semi-modal with dim layer
- `dismissOverlay()` — Pop overlay stack
- `interrupt(name, params)` — Blocking Promise-based modal
- `resolveInterrupt(value)` / `cancelInterrupt()` — Resolve/reject interrupt Promise

**Scene lifecycle hooks**: `onEnter`, `onExit`, `onPause`, `onResume`, `canExit`, `cache`, `prefetch`, `timeoutMs`, `onTimeout`

**Diagnostic events emitted** (via optional `onDiagnostic` callback):
- `NAV.SCENE_PUSH`, `NAV.SCENE_POP`, `NAV.SCENE_REPLACE`
- `NAV.TRANSITION_SLOW` (>500ms)
- `NAV.EXIT_BLOCKED` (canExit returned false)
- `NAV.OVERLAY_OPEN`, `NAV.OVERLAY_DISMISS`
- `NAV.INTERRUPT_TRIGGERED`, `NAV.INTERRUPT_RESOLVED`, `NAV.INTERRUPT_CANCELLED`
- `NAV.TIMEOUT` (idle timeout fired)

### 2. Interrupt System (Promise-Based Gates)

Unlike typical POS "Are you sure?" dialogs, KINDpos interrupts are **Promise-based gates** that:
- Block all interaction below (z-index 200, 70% dim)
- Return structured data via `resolveInterrupt(value)` — not just true/false
- Support multi-option responses (e.g., "Set to $0" / "Go Back" / "Cancel")
- Can chain (void-pin → void-reason) for multi-step authorization
- Are enforced at the navigation layer, not per-scene

**All interrupt patterns in the system**:

| Interrupt | Scene | Purpose | Options |
|---|---|---|---|
| `void-pin` | order-entry | Manager PIN gate for voids | Numpad PIN entry |
| `void-reason` | order-entry | Structured reason capture | Reason selection panel |
| `confirm-clear` | order-entry | Prevent overwrite of existing ticket | Confirm / Cancel |
| `recall-action` | order-entry | Choose action for saved tab | RECALL / DELETE |
| `confirm-batch-zero` | tip-adjustment | Confirm batch zero-out | Confirm / Cancel |
| `checkout-gate` | tip-adjustment | Resolve unadjusted tips before checkout | "Set to $0" / "Go Back" |
| `manager-approval` | server-checkout, close-day | Manager PIN for finalize/close | "Approve" / "Cancel" |

### 3. Design System — Chamfered Buttons with Bevel Press States

**Files**: `frontend/js/tokens.js`, `frontend/css/base.css`

Every interactive element in KINDpos uses a distinctive 3D chamfered design:

- **No border-radius anywhere**: `border-radius: 0 !important` globally enforced. All rounding uses `clip-path: polygon()` with 8px chamfered corners.
- **Bevel edges**: Each button has light edges (top/left) and dark edges (bottom/right) creating a raised 3D effect.
- **Press state**: On `pointerdown`, bevels invert (dark top/left, light bottom/right), shadow becomes transparent, element translates by `(3px, 4px)` — the button physically "pushes in".
- **Release state**: On `pointerup`/`pointerleave`, bevels restore, shadow returns, element translates back to `(0, 0)`.
- **50ms transition**: Press/release animates over 50ms for responsive feel.

**Color-coded bevel lookup table** maps each fill color to appropriate light/dark edge colors:
- Mint buttons: light `#e0ffda` / dark `#1a4012`
- Gold buttons: light `#fde5a0` / dark `#5c3a00`
- Red buttons: light `#f08070` / dark `#4a0e06`
- Cyan buttons: light `#99ffff` / dark `#004d4d`

**Sunken style** (for input displays): Inverted bevel (dark top/left, light bottom/right) creates inset appearance.
**Raised style** (for panels/cards): Standard bevel with 10px chamfer.

### 4. HexNav Bloom Menu

**File**: `frontend/js/hex-nav.js`

The item selection menu in order-entry uses an SVG hexagonal bloom navigation — a 3-level drill-down:

| Level | Content | Hex Radius | Visual State |
|---|---|---|---|
| 0 | Categories | 80px | Honeycomb grid layout |
| 1 | Subcategories | 80px | Chain-bloom from parent with collision avoidance |
| 2 | Items | 60px | Chain-bloom from subcat with gravity sorting |

**Interaction flow**:
1. **Tap unlocked category** → Locks it (solid fill + bevel + shadow), blooms subcategories
2. **Tap unlocked subcategory** → Locks it, blooms items
3. **Tap unlocked item** → Fires `onSelect(itemData)` callback
4. **Tap any locked hex** → Goes back one level (unlocks current, shows previous level)

**Positioning algorithm**: Uses occupied-face avoidance (6 faces per hex), gravity-based sorting (prefer positions closer to ancestor), 4px collision threshold, and `GAP=1.06` spacing factor.

### 5. Input Systems

#### On-Screen Numpad (`numpad.js`)

| Feature | Detail |
|---|---|
| Layout | 3x4 grid: 1-9, clr, 0, >>> (submit) |
| Key size | 88x80px with 14px gap |
| Masked mode | Shows bullets (dots) instead of digits (for PINs) |
| Display format | Custom callback for $ formatting, % formatting, etc. |
| Error state | Display text turns red, auto-clears after 1200ms |
| Public methods | `.clear()`, `.getPin()`, `.setError(msg)` |

#### On-Screen Keyboard (`keyboard.js`)

| Feature | Detail |
|---|---|
| Layout | QWERTY 4-row: letters, SHIFT/BKSP, CLR/SPACE/DONE |
| Slide animation | Slides up from bottom, 150ms ease-out |
| Shift toggle | Caps lock with bevel inversion visual feedback |
| Cursor | Gold "|" character with 500ms blink interval |
| Backdrop dismiss | Tap outside keyboard to dismiss |
| Z-index | 150 (above overlays, below interrupts) |

### 6. Diagnostic / Entomology System

**Files**: `backend/app/services/diagnostic_collector.py`, `backend/app/reports/entomology_report.py`, `backend/app/models/diagnostic_event.py`

KINDpos includes a hash-chained diagnostic event system ("Entomology"):

- **Hash chain**: Every diagnostic event includes a `prev_hash` and `hash` field, creating a tamper-evident chain from a genesis hash. Any modification to historical events breaks the chain.
- **Categories**: SYSTEM, DEVICE, NETWORK, PAYMENT, RECOVERY
- **Severities**: INFO, WARNING, ERROR, CRITICAL
- **Adaptive heartbeat**: Active mode (60s interval) when orders are being processed, off-hours mode (15min interval) after 30min cooldown with no open orders.
- **Reverse correlation**: Can retroactively link recent diagnostic events to a correlation ID for root-cause analysis.
- **Entomology Report**: 3-layer self-contained HTML report:
  - Layer 1: System Health Summary (scorecards, top 5 issues, active/resolved)
  - Layer 2: Pattern Analysis (recurring clusters, peripheral timeline, correlation chains, escalation candidates)
  - Layer 3: Event Timeline (filterable, collapsible heartbeats)
- **Retention**: Automatic archival of events older than retention window to JSON, then deletion from active DB.

### 7. Hardware Integration

**Files**: `backend/app/api/routes/hardware.py`, `backend/app/printing/print_dispatcher.py`, `backend/app/core/adapters/`

| Integration | Protocol | Training Note |
|---|---|---|
| Network device scan | SSE (EventSource) via `/api/v1/hardware/scan/stream` | Devices stream into UI as discovered (batches of 20) |
| Single IP probe | SSE with `?ip=` param | Target a specific IP for faster scan |
| Port fingerprinting | TCP probe on ESC/POS ports (9100-9102), LPD (515), IPP (631), card reader ports (8443, 9443, etc.) | Auto-classifies device type by port |
| MAC identification | ARP cache lookup | Devices identified by MAC, not IP |
| Dejavoo SPIn auto-detect | HTTP GET to SPIn CGI endpoint | Auto-reads RegisterId, serial, model from card reader |
| Test print | Raw ESC/POS over TCP socket | Sends branded test receipt to verify connectivity |
| Hot-reload | POST `/api/v1/payments/reload-devices` | Reloads printer and payment managers after config change — no restart required |
| Kitchen ticket printing | POST `/api/v1/print/ticket/{orderId}` | Sends to kitchen printer on order send |
| Receipt printing | POST `/api/v1/print/receipt/{orderId}?copy_type=` | Customer, merchant, and itemized receipt types |
| System test runner | SSE via `/api/v1/system/run-tests` | Streams pytest output in real-time (for Overseer integration) |

### 8. Console/Debug Access

| Entry Point | File | Access | What It Does |
|---|---|---|---|
| `window._push(sceneName, params)` | `app.js:21` | Browser console | Navigate to any scene directly — bypass login, test any flow |
| `onDiagnostic` callback | `scene-manager.js:54` | Code-level | Hook into all NAV.* events for debugging navigation timing and flow |
| Entomology Report API | `backend/app/reports/entomology_report.py` | API endpoint | Generate full HTML diagnostic report covering last 7 days |

---

## Role-Based Access Matrix

| Scene / Action | Cashier | Server | Manager |
|---|---|---|---|
| Login (PIN entry) | Yes | Yes | Yes |
| Quick Service (order-entry) | Yes | Yes | Yes |
| Order Entry — all features | Yes | Yes | Yes |
| Order Entry — VOID (requires manager PIN) | No (needs manager) | No (needs manager) | **Yes** (PIN gate) |
| Receipt Review / Payment | Yes | Yes | Yes |
| Reporting | No | Yes | Yes |
| Tip Adjustment | No | Yes | Yes |
| Server Checkout | No | **Yes** | No (sees Close Day) |
| Close Day | No | No | **Yes** |
| Settings (Configurations) | No | No | **Yes** |
| Server Checkout — Finalize | No | Yes (needs manager approval) | Yes |
| Close Day — Close | No | No | **Yes** (needs manager approval) |

---

## Top 10 Things Other POS Systems Don't Do

### 1. HexNav Bloom Menu for Item Selection
**Source**: `frontend/js/hex-nav.js`
**What**: Items are selected via a 3-level hexagonal SVG bloom menu — not a flat grid or scrolling list. Categories bloom into subcategories which bloom into items. Tap a locked hex to go back.
**Why it matters**: Faster item discovery for large menus. The spatial layout creates muscle memory — items are always in the same relative position. No scrolling, no pagination, no search box needed.
**Training note**: Think of it like a flower opening — tap the center, petals appear. Tap a petal, more petals appear. Tap the center again to go back.

### 2. Promise-Based Interrupt System (Not "Are You Sure?" Dialogs)
**Source**: `frontend/js/scene-manager.js` (interrupt/resolveInterrupt/cancelInterrupt)
**What**: Blocking modals return Promises with structured data. They can offer multiple options (not just OK/Cancel), chain together (void-pin → void-reason), and are enforced at the navigation layer.
**Why it matters**: Interrupts guide users toward correct actions rather than just blocking them. The checkout-gate offers "Set to $0" — it helps solve the problem, not just report it.
**Training note**: When KINDpos blocks you, it always tells you why AND offers a way forward.

### 3. Dual-Price Display (Card vs. Cash with Savings)
**Source**: `frontend/js/scenes/receipt-review.js`
**What**: Receipt-review shows both card total and cash price side by side, with the savings amount explicitly calculated and displayed.
**Why it matters**: Transparent pricing. The customer sees exactly what they save by paying cash. No hidden fees, no surprise at the register.
**Training note**: Point out the savings amount to the customer — it's right there on the screen.

### 4. Auto-Advance Tip Entry
**Source**: `frontend/js/scenes/tip-adjustment.js`
**What**: After entering a tip amount, the cursor automatically advances to the next unadjusted check. Combined with batch-zero for quick close-out.
**Why it matters**: A server with 30 checks can adjust tips in under a minute by just entering amounts — no tapping between rows. Batch-zero handles the rest.
**Training note**: Just type the tip amount and hit submit — it jumps to the next one automatically. When you're done, batch-zero the rest.

### 5. Contextual Blocker System with Jump Navigation
**Source**: `frontend/js/scenes/server-checkout.js`
**What**: When checkout is blocked (open checks, unadjusted tips), the blocking card turns red/yellow with a jump button that navigates directly to where the user can fix the problem.
**Why it matters**: No hunting through menus to resolve blockers. The system says "you have 3 unadjusted tips" AND provides a button that takes you straight to tip adjustment. One tap to fix.
**Training note**: Red card = blocker. Tap the arrow button inside the card to go fix it. Come back when it's resolved.

### 6. Win98-Style Batch Settlement Dialog
**Source**: `frontend/js/scenes/close-day.js` (overlay: batch-settlement)
**What**: Batch settlement presents a deliberately retro Windows 98-style dialog with title bar, sunken panels, 26-segment progress bar, and cycling status messages.
**Why it matters**: Turns a potentially stressful end-of-day process into something visually engaging and informative. The progress bar shows real batch progress, not an indeterminate spinner.
**Training note**: Watch the progress bar fill and the status messages cycle — it's showing you real batch processing steps.

### 7. EventSource-Streamed Hardware Discovery
**Source**: `frontend/js/scenes/settings.js` + `backend/app/api/routes/hardware.py`
**What**: Network device scanning streams results via Server-Sent Events. Devices appear in the UI as they're found — no loading screen, no "scanning complete" button.
**Why it matters**: A full subnet sweep (254 hosts) takes time. Streaming means the user sees results immediately and can start configuring devices before the scan finishes.
**Training note**: Start a network scan and watch devices pop in as they're found. You can add a device before the scan is even done.

### 8. Chamfered Clip-Path Design System with 3D Bevel Press States
**Source**: `frontend/js/tokens.js`, `frontend/css/base.css`
**What**: Every button uses polygon clip-path chamfered corners (not border-radius) with inverted bevel edges on press. Buttons physically "push in" with translate(3,4) and bevel color flip.
**Why it matters**: Distinctive visual identity. Clear tactile feedback on a touchscreen — the user can feel (see) that their tap registered. No ambiguity about whether a button was pressed.
**Training note**: Every button pushes in when you tap it. If it didn't push in, it didn't register. This is your confirmation.

### 9. Hash-Chained Diagnostic Events (Entomology System)
**Source**: `backend/app/services/diagnostic_collector.py`, `backend/app/reports/entomology_report.py`
**What**: Every system event is recorded with a cryptographic hash chain linking it to the previous event. The Entomology report generates a 3-layer HTML diagnostic with health scorecards, pattern analysis, and timeline.
**Why it matters**: Tamper-evident audit trail. If any event is modified after the fact, the hash chain breaks. The adaptive heartbeat (60s active / 15min idle) provides continuous system health monitoring without wasting resources.
**Training note**: This runs in the background. If something goes wrong, the Entomology report shows exactly what happened and when.

### 10. Three-Tier Navigation with Exit Guards and Prefetch
**Source**: `frontend/js/scene-manager.js`
**What**: Three distinct navigation layers (Scenes/Overlays/Interrupts) with `canExit()` Promise guards that can prevent navigation, scene caching for instant resume, prefetch for pre-building upcoming scenes, and 200ms debounce to prevent nav spam.
**Why it matters**: The exit guard means a scene can block navigation if there's unsaved work. Prefetch means the next likely scene is already built in the background. The debounce prevents double-taps from causing chaos. This is infrastructure-level navigation — not React Router.
**Training note**: If you try to leave a scene with unsaved work, the system will stop you. This is by design — your work is protected.

---

## Appendix: All Backend API Endpoints Referenced by Frontend

| Endpoint | Method | Used By | Purpose |
|---|---|---|---|
| `/api/v1/servers` | GET | login.js | Load employee list for PIN validation |
| `/api/v1/orders` | POST | order-entry.js | Create new order |
| `/api/v1/orders/{id}/items` | POST | order-entry.js | Add line items to order |
| `/api/v1/orders/{id}/send` | POST | order-entry.js | Send order to kitchen |
| `/api/v1/orders/day-summary` | GET | reporting.js, server-checkout.js, close-day.js | Fetch day stats (optional `?server_id=` filter) |
| `/api/v1/orders/close-batch` | POST | server-checkout.js, close-day.js | Close remaining open orders |
| `/api/v1/orders/close-day` | POST | close-day.js | Final day-close |
| `/api/v1/payments/cash` | POST | payment.js | Process cash payment |
| `/api/v1/payments/sale` | POST | payment.js | Process card payment |
| `/api/v1/payments/tip-adjust` | POST | tip-adjustment.js | Adjust tip on closed check |
| `/api/v1/payments/reload-devices` | POST | settings.js | Hot-reload payment/printer managers |
| `/api/v1/print/ticket/{id}` | POST | order-entry.js | Print kitchen ticket |
| `/api/v1/print/receipt/{id}` | POST | payment.js, server-checkout.js, close-day.js | Print receipt (query: `?copy_type=`) |
| `/api/v1/config/store` | GET | server-checkout.js, close-day.js | Load store info (name, terminal ID) |
| `/api/v1/hardware/devices` | GET/POST/DELETE | settings.js | Device CRUD |
| `/api/v1/hardware/scan/stream` | GET (SSE) | settings.js | Stream network scan results |
| `/api/v1/hardware/test-print` | POST | settings.js | Send test receipt to printer |
| `/api/v1/system/run-tests` | POST (SSE) | Overseer | Stream pytest results |
