// ═══════════════════════════════════════════════════
//  KINDpos/lite — Full Transaction Walkthrough (E2E)
//  Validates the complete server flow: login → order → payment → change due
//  Runs against the demo branch with stubbed payments.
// ═══════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');

// Demo seed: Blanche D. (server) PIN 5678
const SERVER_PIN = '5678';

// Helper: click a numpad digit by its visible label text
async function tapDigit(page, digit) {
  // Numpad digits are inside .embossed-btn-inner elements
  const btn = page.locator('.embossed-btn-inner', { hasText: new RegExp('^' + digit + '$') }).first();
  await btn.click();
}

// Helper: enter a full PIN via numpad
async function enterPin(page, pin) {
  for (const d of pin.split('')) {
    await tapDigit(page, d);
    await page.waitForTimeout(80);
  }
}

// Helper: click a button by its visible text label (case-insensitive partial match)
async function tapButton(page, label) {
  await page.locator('.embossed-btn-inner', { hasText: label }).first().click();
}

// Helper: click a hex-nav item by name (SVG text inside <g> groups)
async function tapHexItem(page, name) {
  // HexNav renders items as SVG text elements inside <g> groups.
  // The text has pointer-events:none, so target the parent <g>.
  const textEl = page.locator('svg text', { hasText: name }).first();
  await textEl.click({ force: true });
}

test('Full transaction: login → add items → send → pay cash → change due → return', async ({ page }) => {
  // ── 1. Navigate to app ──
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // ── 2. Login as server (Blanche, PIN 5678) ──
  // Gate layer should be visible with the numpad
  const gate = page.locator('#layer-gate');
  await expect(gate).toBeVisible();

  // Enter PIN
  await enterPin(page, SERVER_PIN);

  // Click NEW ORDER button
  await tapButton(page, 'NEW');
  await page.waitForTimeout(500);

  // If clock-in transactional appears, close it
  const clockInVisible = await page.locator('text=CLOCK IN').isVisible().catch(() => false);
  if (clockInVisible) {
    // Auto-clock-in: select role and proceed
    const serverBtn = page.locator('.embossed-btn-inner', { hasText: /server/i }).first();
    if (await serverBtn.isVisible()) {
      await serverBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // ── 3. Order entry — add 2 items ──
  // Wait for order-entry scene to mount (HexNav renders menu categories)
  await page.waitForSelector('svg', { timeout: 10000 });
  await page.waitForTimeout(500);

  // The HexNav first shows categories. Items might be directly visible
  // or we may need to tap a category first. Try clicking an item directly.
  // Garlic Knots ($5.00) — in Apps category
  const garlic = page.locator('svg text', { hasText: 'Garlic' }).first();
  const garlicVisible = await garlic.isVisible().catch(() => false);

  if (garlicVisible) {
    await garlic.click({ force: true });
  } else {
    // Navigate to Apps category first
    await tapHexItem(page, 'APPS');
    await page.waitForTimeout(300);
    await tapHexItem(page, 'Garlic');
  }
  await page.waitForTimeout(300);

  // Fries ($4.50) — in Sides category
  const fries = page.locator('svg text', { hasText: 'Fries' }).first();
  const friesVisible = await fries.isVisible().catch(() => false);

  if (friesVisible) {
    await fries.click({ force: true });
  } else {
    // Navigate to Sides category first — tap center/back hex to go to categories
    const backHex = page.locator('svg text', { hasText: /MENU|BACK|KIND/i }).first();
    if (await backHex.isVisible()) {
      await backHex.click({ force: true });
      await page.waitForTimeout(300);
    }
    await tapHexItem(page, 'SIDES');
    await page.waitForTimeout(300);
    await tapHexItem(page, 'Fries');
  }
  await page.waitForTimeout(300);

  // ── 4. Send to kitchen ──
  const sendBtn = page.locator('.embossed-btn-inner', { hasText: /SEND/i }).first();
  await expect(sendBtn).toBeVisible({ timeout: 5000 });
  await sendBtn.click();
  await page.waitForTimeout(1000);

  // ── 5. Navigate to payment ──
  // After SEND, we should see a PAY button or be on check-overview
  const payBtn = page.locator('.embossed-btn-inner', { hasText: /PAY/i }).first();
  await expect(payBtn).toBeVisible({ timeout: 5000 });
  await payBtn.click();
  await page.waitForTimeout(500);

  // ── 6. Payment console — select Cash and enter amount ──
  // Payment console should be open as transactional
  const cashBtn = page.locator('.embossed-btn-inner', { hasText: /^Cash$/i }).first();
  await expect(cashBtn).toBeVisible({ timeout: 5000 });
  await cashBtn.click();
  await page.waitForTimeout(200);

  // Use $20 denomination button (covers $9.50 + tax ≈ $10.17)
  const twentyBtn = page.locator('.embossed-btn-inner', { hasText: /^\$20$/i }).first();
  await expect(twentyBtn).toBeVisible({ timeout: 3000 });
  await twentyBtn.click();
  await page.waitForTimeout(200);

  // ── 7. Click CHARGE ──
  const chargeBtn = page.locator('.embossed-btn-inner', { hasText: /CHARGE/i }).first();
  await expect(chargeBtn).toBeVisible({ timeout: 3000 });
  await chargeBtn.click();
  await page.waitForTimeout(1500);

  // ── 8. Verify change-due screen ──
  // Should show either "CHANGE DUE" with amount or "PAYMENT APPROVED"
  const changeDue = page.locator('text=/CHANGE|APPROVED|EXACT/i').first();
  await expect(changeDue).toBeVisible({ timeout: 10000 });

  // ── 9. Return to order entry ──
  const newOrderBtn = page.locator('.embossed-btn-inner', { hasText: /NEW ORDER/i }).first();
  await expect(newOrderBtn).toBeVisible({ timeout: 5000 });
  await newOrderBtn.click();
  await page.waitForTimeout(500);

  // Verify we're back — HexNav SVG should be visible again
  await expect(page.locator('svg').first()).toBeVisible({ timeout: 5000 });
});
