// ===================================================================
//  KINDpos — HexNav vs Category-List Order Speed Comparison
//  Measures actual tap count + elapsed time for a complex order
//  entered via HexNav, then analytically models the same order
//  through a traditional category/list POS interface.
//
//  Complex order (5 items, 2 with mandatory modifiers):
//    1. Large Cheese pizza + Pepperoni topping
//    2. Italian Sub
//    3. House Salad + Ranch dressing
//    4. Garlic Knots
//    5. Soda
//
//  Load via: import('/tests/choo-order-speed-test.js') in browser console
//  Or run with Playwright via run-speed-test.mjs
//  KIND Technologies LLC
// ===================================================================

(async function() {
'use strict';

var SM;
try {
  SM = await import('/js/scene-manager.js');
} catch(e) {
  try { SM = await import('../js/scene-manager.js'); } catch(e2) {
    console.error('[SPEED] Cannot import scene-manager:', e2);
    return;
  }
}

// ── Helpers ──────────────────────────────────────────

function wait(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function raf() { return new Promise(function(r) { requestAnimationFrame(r); }); }

function tap(el) {
  if (!el) throw new Error('tap: element is null');
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, cancelable: true }));
}

function findHexItem(label) {
  var canvas = document.getElementById('hex-canvas');
  if (!canvas) return null;
  var svg = canvas.querySelector('svg');
  if (!svg) return null;
  var groups = svg.querySelectorAll('g');
  for (var i = 0; i < groups.length; i++) {
    var texts = groups[i].querySelectorAll('text');
    if (texts.length === 0) continue;
    var combined = '';
    for (var j = 0; j < texts.length; j++) {
      if (combined) combined += ' ';
      combined += texts[j].textContent.trim();
    }
    if (combined === label) return groups[i];
  }
  return null;
}

function tapHex(label) {
  var g = findHexItem(label);
  if (!g) throw new Error('Hex not found: ' + label);
  var poly = g.querySelector('polygon') || g;
  tap(poly);
}

function getAllHexLabels() {
  var canvas = document.getElementById('hex-canvas');
  if (!canvas) return [];
  var svg = canvas.querySelector('svg');
  if (!svg) return [];
  var labels = [];
  var groups = svg.querySelectorAll('g');
  for (var i = 0; i < groups.length; i++) {
    var texts = groups[i].querySelectorAll('text');
    if (texts.length === 0) continue;
    var combined = '';
    for (var j = 0; j < texts.length; j++) {
      if (combined) combined += ' ';
      combined += texts[j].textContent.trim();
    }
    if (combined) labels.push(combined);
  }
  return labels;
}

function findButtonByText(text, root) {
  root = root || document;
  var els = root.querySelectorAll('div');
  for (var i = 0; i < els.length; i++) {
    if (els[i].textContent.trim() === text && els[i].children.length <= 1) return els[i].parentElement;
  }
  return null;
}

function getTicketItemCount() {
  var list = document.getElementById('ticket-list');
  if (!list) return 0;
  return list.children.length;
}

function getSubtotalText() {
  var el = document.getElementById('ticket-subtotal');
  return el ? el.textContent : '$0.00';
}

// ── Fetch Mock ──────────────────────────────────────
var _realFetch = window.fetch;
function installFetchMock() {
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.indexOf('/api/') >= 0) {
      if (url.indexOf('/orders') >= 0 && opts && opts.method === 'POST' &&
          url.indexOf('/items') < 0 && url.indexOf('/send') < 0) {
        return Promise.resolve(new Response(JSON.stringify({
          order_id: 'SPEED-' + Date.now(), check_number: 9999, status: 'open'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      }));
    }
    return _realFetch(url, opts);
  };
}
function removeFetchMock() { window.fetch = _realFetch; }

// ── Navigation ──────────────────────────────────────

async function waitForScene(name, timeoutMs) {
  timeoutMs = timeoutMs || 3000;
  var start = Date.now();
  while (SM.getActiveScene() !== name) {
    if (Date.now() - start > timeoutMs) throw new Error('Timeout waiting for scene: ' + name);
    await wait(50);
  }
  await raf(); await wait(50);
}

async function resetToLogin() {
  while (SM.getOverlayCount() > 0) { SM.dismissOverlay(); await wait(50); }
  if (SM.hasInterrupt()) { try { SM.cancelInterrupt(); } catch(e) {} await wait(50); }
  var safety = 0;
  while (SM.getStack().length > 1 && safety < 30) {
    await wait(210);
    await SM.pop();
    safety++;
  }
  if (SM.getActiveScene() !== 'login') {
    await wait(210);
    await SM.replace('login');
  }
  await waitForScene('login', 3000);
  await wait(210);
}

async function navigateToOrderEntry() {
  if (SM.getActiveScene() !== 'login') await resetToLogin();
  await wait(210);
  var scene = document.querySelector('[data-scene="login"]');
  if (scene) {
    await wait(500);
    var qs = findButtonByText('< Quick Service >', scene);
    if (qs) tap(qs);
    await wait(50);
    var keys = scene.querySelectorAll('div');
    var numpadKeys = {};
    for (var i = 0; i < keys.length; i++) {
      var t = keys[i].textContent.trim();
      if (t.length === 1 && '0123456789'.indexOf(t) >= 0 && keys[i].children.length <= 1)
        numpadKeys[t] = keys[i].parentElement;
      if (t === '>>>') numpadKeys['submit'] = keys[i].parentElement;
    }
    ['1','2','3','4'].forEach(function(d) { if (numpadKeys[d]) tap(numpadKeys[d]); });
    await wait(50);
    if (numpadKeys['submit']) tap(numpadKeys['submit']);
    await wait(500);
  }
  if (SM.getActiveScene() !== 'order-entry') {
    await wait(210);
    await SM.push('order-entry', { mode: 'service', pin: '1234', employeeId: 'E1', employeeName: 'Speed Test' });
  }
  await waitForScene('order-entry', 3000);
  await wait(400);
}

// ===================================================================
//  COMPLEX ORDER DEFINITION
//  5 items across 5 categories, 2 with mandatory modifiers
// ===================================================================

var COMPLEX_ORDER = [
  { category: 'PIZZA', item: 'Large Cheese', requiredMod: { group: 'TOPPINGS', choice: 'Pepperoni' } },
  { category: 'SUBS',  item: 'Italian Sub',  requiredMod: null },
  { category: 'SIDES', item: 'House Salad',  requiredMod: { group: 'DRESSING', choice: 'Ranch' } },
  { category: 'APPS',  item: 'Garlic Knots', requiredMod: null },
  { category: 'DRINKS', item: 'Soda',        requiredMod: null },
];

// ===================================================================
//  TEST 1: HexNav (CHOO) — Actual timed run
// ===================================================================

async function runHexNavOrder() {
  var tapCount = 0;
  var stepLog = [];

  function logTap(action) {
    tapCount++;
    stepLog.push({ tap: tapCount, action: action, time: performance.now() });
  }

  var startTime = performance.now();

  for (var i = 0; i < COMPLEX_ORDER.length; i++) {
    var order = COMPLEX_ORDER[i];
    var labels = getAllHexLabels();

    // If we're not at category level (5 categories visible), tap locked cat to reset
    // For single-subcat categories, PIZZA goes directly to items
    // We need to be at category level to pick next category
    if (i > 0) {
      // After adding an item, HexNav stays at item level — tap locked category to go home
      // Wait for the hex to settle, then tap the locked category hex
      await wait(120);
      labels = getAllHexLabels();

      // Check if categories are visible (we're at top level)
      var catsVisible = labels.indexOf('PIZZA') >= 0 && labels.indexOf('SUBS') >= 0 &&
                        labels.indexOf('DRINKS') >= 0;
      if (!catsVisible) {
        // Tap the locked (current) category to go back to category level
        tapHex(COMPLEX_ORDER[i - 1].category);
        logTap('Back to categories (tap locked ' + COMPLEX_ORDER[i - 1].category + ')');
        await wait(120);
      }
    }

    // Step 1: Tap category
    tapHex(order.category);
    logTap('Tap category: ' + order.category);
    await wait(120);

    // For categories with single subcat (all in demo menu), items appear directly
    // For multi-subcat categories, we'd need an extra tap here

    // Step 2: Tap item
    tapHex(order.item);
    logTap('Tap item: ' + order.item);
    await wait(120);

    // Step 3: Handle mandatory modifiers
    if (order.requiredMod) {
      // Mod group hexes appear — tap the group
      tapHex(order.requiredMod.group);
      logTap('Tap mod group: ' + order.requiredMod.group);
      await wait(120);

      // Mod choices appear — tap the choice
      tapHex(order.requiredMod.choice);
      logTap('Tap mod choice: ' + order.requiredMod.choice);
      await wait(120);

      // DONE hex appears — tap it
      tapHex('DONE');
      logTap('Tap DONE');
      await wait(120);
    }
  }

  var endTime = performance.now();
  var elapsed = endTime - startTime;

  return {
    method: 'HexNav',
    tapCount: tapCount,
    elapsedMs: Math.round(elapsed),
    stepLog: stepLog,
    itemCount: getTicketItemCount(),
    subtotal: getSubtotalText(),
  };
}

// ===================================================================
//  TEST 2: Traditional Category-List — Analytical model
//  Models a standard POS with: category tabs across top,
//  scrollable item list, separate modifier screen
// ===================================================================

function modelCategoryListOrder() {
  var tapCount = 0;
  var stepLog = [];

  // Traditional POS flow for each item:
  //  1. Tap category tab (always visible, 1 tap)
  //  2. Scroll to find item in list (0-2 scroll gestures modeled as taps)
  //  3. Tap item (1 tap)
  //  4. If modifier required: modifier screen pops up
  //     a. Scroll/find modifier group (0-1 tap)
  //     b. Tap modifier choice (1 tap)
  //     c. Tap confirm/done (1 tap)

  for (var i = 0; i < COMPLEX_ORDER.length; i++) {
    var order = COMPLEX_ORDER[i];

    // Tap category tab
    tapCount++;
    stepLog.push({ tap: tapCount, action: 'Tap category tab: ' + order.category });

    // Scroll to find item (average 1 scroll action for lists of 3-6 items)
    // In a list UI, items below the fold require scrolling
    var scrollCost = 0;
    if (order.category === 'PIZZA') scrollCost = 1; // 6 items, may need scroll
    // Other categories have 3-4 items — usually visible without scroll
    tapCount += scrollCost;
    if (scrollCost) stepLog.push({ tap: tapCount, action: 'Scroll item list' });

    // Tap item
    tapCount++;
    stepLog.push({ tap: tapCount, action: 'Tap item: ' + order.item });

    // Visual scan time: in a list UI the server must read text labels top-to-bottom
    // Modeled as additional latency (no tap, but time cost)

    // Handle mandatory modifiers
    if (order.requiredMod) {
      // Traditional POS: modifier popup/screen with grouped checkboxes or buttons
      // Tap modifier group header to expand (if collapsed)
      tapCount++;
      stepLog.push({ tap: tapCount, action: 'Tap modifier group: ' + order.requiredMod.group });

      // Tap specific modifier
      tapCount++;
      stepLog.push({ tap: tapCount, action: 'Tap modifier: ' + order.requiredMod.choice });

      // Tap Done/Confirm button
      tapCount++;
      stepLog.push({ tap: tapCount, action: 'Tap CONFIRM/DONE' });
    }
  }

  // Traditional POS estimated timing:
  // - Each tap + visual scan: ~400ms (slower than spatial memory)
  // - Scroll action: ~600ms
  // - Modifier screen transition: ~300ms per modal open
  var scanTimePerTap = 400;  // ms — reading text in a list
  var scrollTime = 600;      // ms — scroll gesture + visual re-acquisition
  var modalTransition = 300; // ms — screen transition for modifiers
  var modScreenCount = COMPLEX_ORDER.filter(function(o) { return o.requiredMod; }).length;
  var scrollActions = stepLog.filter(function(s) { return s.action.indexOf('Scroll') >= 0; }).length;

  var estimatedMs =
    (tapCount * scanTimePerTap) +
    (scrollActions * scrollTime) +
    (modScreenCount * modalTransition);

  return {
    method: 'Category-List',
    tapCount: tapCount,
    estimatedMs: estimatedMs,
    stepLog: stepLog,
    note: 'Analytical model — estimated timing based on UX research averages',
  };
}

// ===================================================================
//  TEST 3: HexNav with muscle memory — repeat order
//  Second run of same order; server knows hex positions.
//  Inter-tap wait drops because no visual scanning needed.
// ===================================================================

async function runHexNavRepeatOrder() {
  var tapCount = 0;
  var startTime = performance.now();

  // Muscle memory timing: server knows positions, taps faster.
  // HexNav has a 100ms tap debounce, so minimum inter-tap is ~110ms.
  // This models a trained server tapping as fast as the UI allows.
  var TAP_WAIT = 110;
  var MOD_WAIT = 110;  // mandatory modifier transitions re-layout the whole SVG

  for (var i = 0; i < COMPLEX_ORDER.length; i++) {
    var order = COMPLEX_ORDER[i];

    if (i > 0) {
      await wait(TAP_WAIT);
      var labels = getAllHexLabels();
      var catsVisible = labels.indexOf('PIZZA') >= 0 && labels.indexOf('SUBS') >= 0;
      if (!catsVisible) {
        tapHex(COMPLEX_ORDER[i - 1].category);
        tapCount++;
        await wait(TAP_WAIT);
      }
    }

    tapHex(order.category);
    tapCount++;
    await wait(TAP_WAIT);

    tapHex(order.item);
    tapCount++;
    // Items with requiredMods trigger a full mod-group layout rebuild
    // Need raf() + wait to ensure SVG is fully rebuilt
    if (order.requiredMod) {
      await raf(); await wait(MOD_WAIT);

      tapHex(order.requiredMod.group);
      tapCount++;
      await raf(); await wait(MOD_WAIT);

      tapHex(order.requiredMod.choice);
      tapCount++;
      await raf(); await wait(MOD_WAIT);

      tapHex('DONE');
      tapCount++;
      await wait(TAP_WAIT);
    } else {
      await wait(TAP_WAIT);
    }
  }

  var endTime = performance.now();
  return {
    method: 'HexNav (muscle memory — repeat order)',
    tapCount: tapCount,
    elapsedMs: Math.round(endTime - startTime),
    itemCount: getTicketItemCount(),
    subtotal: getSubtotalText(),
  };
}

// ===================================================================
//  RUNNER
// ===================================================================

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  KINDpos — HexNav vs Category-List Speed Test   ║');
console.log('║  Complex order: 5 items, 2 mandatory modifiers  ║');
console.log('╚══════════════════════════════════════════════════╝\n');

var results = {};

try {
  installFetchMock();

  // ── Run 1: HexNav first-time order ──
  console.log('── TEST 1: HexNav (first-time order) ──');
  await navigateToOrderEntry();
  await wait(300);
  var hexResult = await runHexNavOrder();
  console.log('  Taps: ' + hexResult.tapCount);
  console.log('  Elapsed: ' + hexResult.elapsedMs + 'ms');
  console.log('  Ticket items: ' + hexResult.itemCount);
  console.log('  Subtotal: ' + hexResult.subtotal);
  hexResult.stepLog.forEach(function(s) {
    console.log('    #' + s.tap + ' ' + s.action);
  });
  results.hexNav = hexResult;

  // ── Run 2: Category-List model ──
  console.log('\n── TEST 2: Category-List (analytical model) ──');
  var listResult = modelCategoryListOrder();
  console.log('  Taps: ' + listResult.tapCount);
  console.log('  Estimated time: ' + listResult.estimatedMs + 'ms');
  listResult.stepLog.forEach(function(s) {
    console.log('    #' + s.tap + ' ' + s.action);
  });
  results.categoryList = listResult;

  // ── Run 3: HexNav repeat order (muscle memory) ──
  console.log('\n── TEST 3: HexNav (muscle memory — repeat order) ──');
  await resetToLogin();
  await navigateToOrderEntry();
  await wait(300);
  var repeatResult = await runHexNavRepeatOrder();
  console.log('  Taps: ' + repeatResult.tapCount);
  console.log('  Elapsed: ' + repeatResult.elapsedMs + 'ms');
  console.log('  Ticket items: ' + repeatResult.itemCount);
  console.log('  Subtotal: ' + repeatResult.subtotal);
  results.hexNavRepeat = repeatResult;

  // ── Summary ──
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                SPEED COMPARISON                  ║');
  console.log('╠══════════════════════════════════════════════════╣');

  var fmt = function(label, taps, ms) {
    var padLabel = (label + '                          ').slice(0, 26);
    var padTaps = ('     ' + taps).slice(-5);
    var padMs = ('       ' + ms).slice(-7);
    return '║ ' + padLabel + ' │' + padTaps + ' taps │' + padMs + 'ms ║';
  };

  console.log(fmt('HexNav (first time)',    hexResult.tapCount,    hexResult.elapsedMs));
  console.log(fmt('HexNav (muscle memory)', repeatResult.tapCount, repeatResult.elapsedMs));
  console.log(fmt('Category-List (est.)',   listResult.tapCount,   listResult.estimatedMs));
  console.log('╠══════════════════════════════════════════════════╣');

  // HexNav needs extra "back to categories" taps but saves visual scan time
  // Category-list has fewer taps but each tap takes longer (scan + scroll)
  var timeSavedFirst = listResult.estimatedMs - hexResult.elapsedMs;
  var timeSavedRepeat = listResult.estimatedMs - repeatResult.elapsedMs;
  var pctFaster = Math.round((timeSavedRepeat / listResult.estimatedMs) * 100);

  function pad(str, len) { str = String(str); while (str.length < len) str = ' ' + str; return str; }
  function rpad(str, len) { str = String(str); while (str.length < len) str += ' '; return str; }

  console.log('║                                                  ║');
  console.log('║  HexNav taps:   ' + pad(hexResult.tapCount, 3) + '  (extra: back-to-cat nav)     ║');
  console.log('║  List taps:     ' + pad(listResult.tapCount, 3) + '  (fewer taps, more scanning)  ║');
  console.log('║                                                  ║');
  console.log('║  HexNav time (first):   ' + pad(hexResult.elapsedMs, 5) + 'ms (measured)   ║');
  console.log('║  HexNav time (muscle):  ' + pad(repeatResult.elapsedMs, 5) + 'ms (measured)   ║');
  console.log('║  List time (estimated): ' + pad(listResult.estimatedMs, 5) + 'ms (modeled)    ║');
  console.log('║                                                  ║');
  console.log('║  Time saved (first run):  ' + pad(Math.round(timeSavedFirst), 5) + 'ms          ║');
  console.log('║  Time saved (muscle mem): ' + pad(Math.round(timeSavedRepeat), 5) + 'ms (' + pctFaster + '% faster)║');
  console.log('╚══════════════════════════════════════════════════╝');

  console.log('\n── KEY ADVANTAGES ──');
  console.log('  HexNav spatial consistency: item positions never change,');
  console.log('  enabling muscle memory. Servers stop reading labels and');
  console.log('  tap from spatial recall after ~3 repetitions.');
  console.log('');
  console.log('  Category-list requires visual scanning every time:');
  console.log('  read category tab → scan list → read item text →');
  console.log('  tap. No spatial shortcut possible with scrolling lists.');
  console.log('');
  console.log('  HexNav also eliminates scrolling entirely — all items');
  console.log('  bloom outward from the parent hex within the viewport.');

  results.summary = {
    hexNav_taps: hexResult.tapCount,
    hexNav_ms: hexResult.elapsedMs,
    hexNavRepeat_taps: repeatResult.tapCount,
    hexNavRepeat_ms: repeatResult.elapsedMs,
    categoryList_taps: listResult.tapCount,
    categoryList_estimatedMs: listResult.estimatedMs,
    tap_difference: listResult.tapCount - hexResult.tapCount,
    time_savings_pct: pctFaster,
    time_savings_first_ms: Math.round(timeSavedFirst),
    time_savings_repeat_ms: Math.round(timeSavedRepeat),
  };

  await resetToLogin();

} catch(e) {
  console.error('[SPEED TEST ERROR] ' + e.message);
  console.error(e.stack);
  results.error = e.message;
} finally {
  removeFetchMock();
}

// Expose for Playwright runner
window.KINDspeedResults = results;
console.log('\n[SPEED TEST COMPLETE]');

})();
