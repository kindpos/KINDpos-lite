# Getting Started with KINDpos/lite

**For restaurant owners and operators.** This guide walks you from your finalized menu template all the way to viewing real sales reports. Budget about 20 minutes.

By the end you will have:

- Your menu loaded into the system
- Your store info confirmed
- At least one staff member who can log in
- A handful of orders rung in on the terminal
- Live sales and labor reports showing your activity

> If you are a developer setting KINDpos up for the first time, start with the **Quick Start** in [`README.md`](README.md) to install dependencies and launch the server. This guide picks up once `http://localhost:8000` is running.

---

## Before you begin

You need:

1. Your completed menu Excel template (`.xlsx`) — see [Step 1](#step-1--verify-your-finalized-menu-template) for the required sheets.
2. A modern browser (Chrome, Edge, or Safari).
3. KINDpos running. In local dev this is `http://localhost:8000`; on Fly.io it's your deployed URL.

Two surfaces you will use:

| Surface | URL | Who uses it |
|---|---|---|
| **Overseer** (admin panel) | `http://localhost:8000` | You, for setup and reports |
| **Terminal** (POS) | same URL, touch display view | Servers and managers, for taking orders |

---

## Step 1 — Verify your finalized menu template

KINDpos imports a single Excel workbook with six sheets. **Sheet names are case-sensitive** and must match exactly:

| Sheet | Purpose | Key columns |
|---|---|---|
| `RESTAURANT INFO` | Store identity | `Field Name`, `Value` (rows for name, address, phone, website) |
| `TAX RULES` | Tax rates by category | Rate, applies-to category |
| `CATEGORIES` | Menu sections | Name, display order, color |
| `MODIFIERS` | Add-ons and variants | Group, option name, price delta |
| `ITEMS` | Menu items | Name, price, category, description, active |
| `DISCOUNTS` | Discount rules | Name, type, amount |

**Common problems to check before importing:**

- A sheet is missing or misspelled (`Categories` instead of `CATEGORIES`).
- An item's `category` value doesn't match any name in the `CATEGORIES` sheet.
- A price is blank or non-numeric.
- Leading/trailing spaces in names (the parser trims, but inconsistency still causes duplicates).

If any of these exist the importer will show an error screen with the specific sheet and row — you can fix the file and try again without losing anything.

---

## Step 2 — Import your menu

1. Open Overseer in your browser (`http://localhost:8000`).
2. In the left sidebar, expand **MENU** and click **Import Menu**.
3. Drag your `.xlsx` file onto the drop zone (or click to pick it).
4. Watch the parser work — it walks through restaurant info, categories, items, modifiers, tax, and discounts.
5. Review the **Preview** screen. Expand each section to confirm:
   - Restaurant name and address
   - Category list and colors
   - Item counts and prices
   - Tax rules
   - Modifier groups
   - Discounts
6. Click **Confirm Import**.
7. A success screen shows counts (categories created, items created, etc.).

**What happens under the hood:** each row becomes an event (`store.info_updated`, `menu.category_created`, `menu.item_created`) appended to the local event ledger. Nothing leaves your machine.

> **Re-importing later?** You can run the import again to add new items. Existing items with the same name are updated in place.

---

## Step 3 — Confirm your store info

1. Sidebar → **STORE** → **Store Information**.
2. The form is pre-filled from the `RESTAURANT INFO` sheet. Verify:
   - Restaurant name (appears on receipts)
   - Address
   - Phone
   - Website
3. Edit anything that looks off and click **Save**.

---

## Step 4 — Add your staff

Reports like **Tips by Server** and **Labor Reports** only work once there are staff logging in and clocking in. Add at least one server and one manager now.

1. Sidebar → **EMPLOYEES** → **Staff List**.
2. Click **Add Employee**.
3. Fill in name, role (server or manager), and a 4-digit PIN.
4. Save.

Repeat for each team member. Managers can ring orders and access the Overseer; servers are limited to the terminal.

---

## Step 5 — Printers (optional in demo)

If you're evaluating KINDpos without hardware, you can skip this step — demo mode uses a mock printer that logs to the console. See the **Demo Mode** table in [`README.md`](README.md) for what's stubbed.

When you are ready for real printers:

1. Sidebar → **HARDWARE** → **Printer Setup**.
2. Click **Scan Network** to discover printers on your local subnet.
3. Assign each printer a role (receipt, kitchen, bar).
4. Sidebar → **HARDWARE** → **Receipt Settings** to customize the header/footer.

---

## Step 6 — Ring up a few orders on the terminal

Reports need orders. Ring up a few so the next step shows meaningful data.

1. Open the terminal URL — same `http://localhost:8000` on a touch display, or just another browser tab.
2. At the login screen, enter a staff PIN you created in Step 4.
3. You'll land on the server (or manager) home screen.
4. Start a new check:
   - Pick an order type (dine-in, to-go, bar tab, etc.).
   - Tap categories on the left, then items, to add them to the check.
   - Apply modifiers when prompted.
5. **Send** the order (sends tickets to the kitchen printer — in demo mode this logs to console).
6. Take payment:
   - Tap **Pay** on the check.
   - Choose card or cash. Card payments auto-approve in demo mode.
   - Leave a tip if prompted.
7. Repeat two or three times so reports have a meaningful spread.

> **Tip:** have one staff member also **Clock In** and then **Clock Out** during this step — that populates the Labor Reports.

---

## Step 7 — View your reports

You're ready. Back in Overseer:

1. Sidebar → **REPORTING** → **Sales Reports**.
2. The **Daily Flash** shows today's net sales, tax, tips, order count, guest count, and average check.
3. Drill in for detail:
   - **Sales by Category** — which sections of your menu are driving revenue
   - **Tax Breakdown** — totals by tax rule
   - **Tips by Server** — gratuity distribution
   - **Adjustments** — comps, discounts, voids
4. Use the **date picker** in the header to switch days or pick a date range.
5. Sidebar → **REPORTING** → **Labor Reports** for hours, overtime, and labor cost %.
6. Sidebar → **REPORTING** → **Menu Performance** for item popularity and contribution.

Most charts and tables support CSV export for your accountant or payroll provider.

---

## Troubleshooting

**"No data for this date"**
No orders were rung on that date. Ring up a test order, or change the date picker.

**"Missing sheet: CATEGORIES"** (or similar) during import
A sheet name doesn't match. Sheet names are case-sensitive and must be exactly: `RESTAURANT INFO`, `TAX RULES`, `CATEGORIES`, `MODIFIERS`, `ITEMS`, `DISCOUNTS`.

**Items import but don't appear in a category on the terminal**
The item's `category` value doesn't match any name in the `CATEGORIES` sheet. Fix the mismatch and re-import.

**I want to start completely over**
Stop the server, delete `data/event_ledger.db`, and restart. This wipes **all** events — orders, menu, staff, everything. Use only before go-live.

**Labor Reports are empty**
Staff need to clock in and out at the terminal for hours to accrue. Add employees first (Step 4), then have them use **Clock In** / **Clock Out** on the terminal.

---

## Where to go next

- **Tip-out rules** — Sidebar → EMPLOYEES → **Shift Config**. Set automatic tip-out percentages by role.
- **Card readers** — Sidebar → HARDWARE → **Card Readers** when you're ready for live payments.
- **System health** — Sidebar → SYSTEM → **System Testing** for a diagnostic sweep.
- **Floor plan** — Sidebar → STORE → **Floor Plan** if you use table-based ordering.

Welcome to KINDpos. Nice. Dependable. Yours.
