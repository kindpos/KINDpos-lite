// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Close Day Scene
//  2-column: Receipt preview left | Card grid + banner + action bar right
//  One blocker: open checks
//  Buttons: PRINT / SUBMIT BATCH / CLOSE DAY
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, buildGap, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';

// ── Layout ────────────────────────────────────────
var RECEIPT_W  = 280;
var COL_GAP    = 20;
var SCENE_PAD  = 13;
var CARD_GAP   = 8;
var STRIP_H    = 28;
var ACTION_H   = 48;
var BANNER_H   = 36;
var BEVEL      = 4;
var CHAM       = 8;
var RED        = '#ff3355';

// ── Scene state ───────────────────────────────────
var _state         = null;
var _expandedIdx   = null;
var _gridContainer = null;
var _bannerEl      = null;
var _accordionCooldown = false;
var _receiptScroll = null;
var _rightCol      = null;
var _batchSettled  = false;
var _pinUnlocked   = false;

// ─────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function isBlocked(state) {
  return state.openChecks > 0;
}

// ─────────────────────────────────────────────────
//  FETCH STATE from day-summary API
// ─────────────────────────────────────────────────

function fetchDayState(params) {
  return Promise.all([
    fetch('/api/v1/orders/day-summary').then(function(r) { return r.json(); }),
    fetch('/api/v1/config/tipout').then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/v1/config/store').then(function(r) { return r.json(); }).catch(function() { return {}; }),
  ]).then(function(results) {
    var d = results[0];
    var rules = results[1];
    var store = results[2];
    var today = new Date();

    // Calculate total tipout from rules
    var totalTipOut = 0;
    var cardTips = d.card_tips || 0;
    var netSales = d.net_sales || 0;
    if (Array.isArray(rules)) {
      rules.forEach(function(r) {
        var basis = r.calculation_base === 'Net Sales' ? netSales : cardTips;
        totalTipOut += basis * (r.percentage || 0) / 100;
      });
    }
    totalTipOut = parseFloat(totalTipOut.toFixed(2));

    return {
      date: (today.getMonth()+1) + '/' + today.getDate() + '/' + String(today.getFullYear()).slice(2),
      restaurantName: (store.info && store.info.restaurant_name) || 'KINDpos',
      terminalId: '',
      printedBy:  params.managerName || 'Manager',

      // Revenue
      grossSales:    d.gross_sales   || 0,
      voidsTotal:    d.void_total    || 0,  voidsCount: d.void_count || 0,
      discTotal:     d.discount_total || 0, discCount:  d.discount_count || 0,
      netSales:      netSales,
      taxCollected:  d.tax_total     || 0,

      // Payments
      cashSales:     d.cash_total  || 0, cashCount: d.cash_count || 0,
      cardSales:     d.card_total  || 0, cardCount: d.card_count || 0,
      totalPayments: (d.cash_total || 0) + (d.card_total || 0),
      totalTips:     d.total_tips  || 0,
      cardTips:      cardTips,
      cashTips:      d.cash_tips   || 0,

      // Categories
      categories:    d.categories || [],

      // Check stats
      totalChecks:   d.total_checks || 0,
      avgCheck:      d.avg_check    || 0,
      covers:        d.guest_count || 0,
      openChecks:    d.open_orders || 0,

      // Dayparts
      dayparts:      d.dayparts || [],

      // Tips
      totalTipOut:   totalTipOut,
      unadjustedTips: d.unadjusted_tips || 0,

      // Batch
      batchTransactions: (d.cash_count || 0) + (d.card_count || 0),
      batchTotal:    (d.cash_total || 0) + (d.card_total || 0),

      // Order IDs for printing
      closedOrders:  d.closed_order_ids || [],
    };
  });
}

// ─────────────────────────────────────────────────
//  RECEIPT CONTENT (mirrors SalesRecapTemplate)
// ─────────────────────────────────────────────────

function buildReceiptContent(state) {
  var BASE   = '28px';
  var HEADER = T.fsBtn;
  var SMALL  = T.fsSmall;
  var COL    = '#333';
  var DIM    = '#999';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 14px;font-family:' + T.fb + ';color:' + COL + ';display:flex;flex-direction:column;gap:0;';

  function sectionHeader(text) {
    var el = document.createElement('div');
    el.style.cssText = 'font-size:' + HEADER + ';font-weight:bold;margin-top:10px;margin-bottom:2px;';
    el.textContent = text;
    return el;
  }

  function row(label, value, valueColor) {
    var el = document.createElement('div');
    el.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-size:' + BASE + ';padding:1px 0;';
    var l = document.createElement('span');
    l.textContent = label;
    var v = document.createElement('span');
    v.style.fontWeight = 'bold';
    if (valueColor) v.style.color = valueColor;
    v.textContent = value;
    el.appendChild(l);
    el.appendChild(v);
    return el;
  }

  function divider() {
    var el = document.createElement('div');
    el.style.cssText = 'border-top:1px dashed ' + DIM + ';margin:6px 0;';
    return el;
  }

  // Identity
  var id = document.createElement('div');
  id.style.cssText = 'text-align:center;margin-bottom:10px;';
  var r1 = document.createElement('div');
  r1.style.cssText = 'font-size:' + HEADER + ';font-weight:bold;';
  r1.textContent = state.restaurantName;
  var r2 = document.createElement('div');
  r2.style.cssText = 'font-size:' + BASE + ';font-weight:bold;';
  r2.textContent = 'SALES RECAP';
  id.appendChild(r1);
  id.appendChild(r2);
  wrap.appendChild(id);

  wrap.appendChild(row('Date:', state.date));
  wrap.appendChild(row('Printed by:', state.printedBy));
  wrap.appendChild(divider());

  // Revenue
  wrap.appendChild(sectionHeader('REVENUE'));
  wrap.appendChild(row('Gross Sales',  fmt(state.grossSales)));
  wrap.appendChild(row('Voids (' + state.voidsCount + ')',  '− ' + fmt(state.voidsTotal)));

  wrap.appendChild(row('Discounts (' + state.discCount + ')', '− ' + fmt(state.discTotal)));
  wrap.appendChild(divider());
  wrap.appendChild(row('NET SALES',    fmt(state.netSales)));
  wrap.appendChild(row('Tax Collected', fmt(state.taxCollected)));
  wrap.appendChild(divider());

  // Payments
  wrap.appendChild(sectionHeader('PAYMENTS'));
  wrap.appendChild(row('Cash (' + state.cashCount + ')',  fmt(state.cashSales)));
  wrap.appendChild(row('Card (' + state.cardCount + ')',  fmt(state.cardSales)));
  wrap.appendChild(divider());
  wrap.appendChild(row('Total Payments', fmt(state.totalPayments)));
  wrap.appendChild(row('Cash Expected',  fmt(state.cashSales + state.cashTips)));
  wrap.appendChild(divider());

  // Categories
  wrap.appendChild(sectionHeader('BY CATEGORY'));
  state.categories.forEach(function(c) {
    wrap.appendChild(row(c.name + ' (' + c.count + ')', fmt(c.total)));
  });
  wrap.appendChild(divider());

  // Check stats
  wrap.appendChild(sectionHeader('CHECK STATS'));
  wrap.appendChild(row('Total Checks', String(state.totalChecks)));
  wrap.appendChild(row('Average Check', fmt(state.avgCheck)));
  wrap.appendChild(row('Covers', String(state.covers)));
  wrap.appendChild(divider());

  // Dayparts
  wrap.appendChild(sectionHeader('DAYPART'));
  state.dayparts.forEach(function(d) {
    wrap.appendChild(row(d.name + ' (' + d.checks + ' chk)', fmt(d.sales)));
  });
  wrap.appendChild(divider());

  // Tips
  wrap.appendChild(sectionHeader('TIPS'));
  wrap.appendChild(row('Tip Total',       fmt(state.totalTips)));
  wrap.appendChild(row('Card Tips',       fmt(state.cardTips)));
  wrap.appendChild(row('Cash Tips',       fmt(state.cashTips)));
  wrap.appendChild(row('Total Tip-Out',   '− ' + fmt(state.totalTipOut)));
  wrap.appendChild(divider());

  var footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;margin-top:8px;font-size:' + SMALL + ';color:' + COL + ';';
  footer.textContent = '** MANAGER REPORT — CONFIDENTIAL **';
  wrap.appendChild(footer);

  return wrap;
}

function buildReceiptPanel(state) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:' + RECEIPT_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'background:' + T.bgDark + ';',
    'overflow:hidden;',
  ].join('');
  applySunkenStyle(panel);

  var header = document.createElement('div');
  header.style.cssText = [
    'flex-shrink:0;padding:6px 12px;',
    'background:' + T.bgEdge + ';',
    'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';',
    'letter-spacing:0.1em;text-align:center;',
  ].join('');
  header.textContent = 'PRINT PREVIEW';
  panel.appendChild(header);

  _receiptScroll = document.createElement('div');
  _receiptScroll.id = 'receipt-scroll';
  _receiptScroll.style.cssText = 'flex:1;overflow-y:auto;background:' + T.mint + ';scrollbar-width:none;-ms-overflow-style:none;';
  _receiptScroll.appendChild(buildReceiptContent(state));
  panel.appendChild(_receiptScroll);

  return panel;
}

// ─────────────────────────────────────────────────
//  CARD DEFINITIONS — 6 cards in 3×2 grid
// ─────────────────────────────────────────────────

function getCardDefs(state) {
  var blocked = state.openChecks > 0;
  return [
    {
      title: 'Revenue Summary',
      hero: fmt(state.netSales),
      heroColor: T.gold,
      subtitle: 'Gross / Voids / Disc / Net',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Gross Sales',  fmt(state.grossSales)));
        el.appendChild(detailRow('Voids (' + state.voidsCount + ')', '− ' + fmt(state.voidsTotal), RED));
        el.appendChild(detailRow('Discounts (' + state.discCount + ')', '− ' + fmt(state.discTotal), RED));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Net Sales',    fmt(state.netSales), T.gold));
        el.appendChild(detailRow('Tax Collected', fmt(state.taxCollected), T.mint));
      },
    },
    {
      title: 'Payment Breakdown',
      hero: fmt(state.cardSales),
      heroColor: T.gold,
      subtitle: 'Cash / Card / Tips',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Cash (' + state.cashCount + ')', fmt(state.cashSales)));
        el.appendChild(detailRow('Card (' + state.cardCount + ')', fmt(state.cardSales)));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Total Payments', fmt(state.totalPayments), T.gold));
        el.appendChild(detailRow('Total Tips (CC)', fmt(state.totalTips)));
        // Cash/card mix bar
        var total = state.cashSales + state.cardSales;
        if (total > 0) {
          var pct = Math.round((state.cardSales / total) * 100);
          el.appendChild(buildMixBar(100 - pct, pct));
        }
      },
    },
    {
      title: 'Category Sales',
      hero: fmt(state.netSales),
      heroColor: T.gold,
      subtitle: 'by menu category',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        state.categories.forEach(function(c) {
          el.appendChild(detailRow(c.name + ' (' + c.count + ')', fmt(c.total)));
        });
        if (!state.categories.length) {
          el.appendChild(detailRow('No categories', '—', T.mint));
        }
      },
    },
    {
      title: 'Check Stats',
      hero: blocked ? '⚠ ' + state.openChecks : String(state.totalChecks),
      heroColor: blocked ? RED : T.cyan,
      subtitle: blocked ? 'open — must close' : state.totalChecks + ' checks · ' + fmt(state.avgCheck) + ' avg',
      border: blocked ? RED : T.border,
      statusColor: blocked ? RED : null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Total Checks', String(state.totalChecks), T.mint));
        el.appendChild(detailRow('Average Check', fmt(state.avgCheck)));
        el.appendChild(detailRow('Covers', String(state.covers), T.mint));
        if (blocked) {
          el.appendChild(detailRow('Open Checks', String(state.openChecks), RED));
        }
      },
    },
    {
      title: 'Daypart Summary',
      hero: fmt(state.netSales),
      heroColor: T.gold,
      subtitle: 'AM / PM / Late split',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        state.dayparts.forEach(function(d) {
          el.appendChild(detailRow(d.name + ' (' + d.checks + ' chk)', fmt(d.sales)));
        });
        if (!state.dayparts.length) {
          el.appendChild(detailRow('No daypart data', '—', T.mint));
        }
      },
    },
    {
      title: 'Tips & Gratuity',
      hero: fmt(state.totalTips),
      heroColor: T.gold,
      subtitle: 'collected • tip-out paid',
      border: T.border,
      statusColor: null,
      hasShortcuts: true,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Total Tips (CC)', fmt(state.totalTips)));
        el.appendChild(detailRow('Total Tip-Out',   '− ' + fmt(state.totalTipOut), RED));
        el.appendChild(detailDivider());
        var net = parseFloat((state.totalTips - state.totalTipOut).toFixed(2));
        el.appendChild(detailRow('Server Net Tips', fmt(net), T.gold));
        if (state.unadjustedTips > 0) {
          el.appendChild(detailRow('Unadjusted', String(state.unadjustedTips), T.yellow));
        }
        // Shortcut buttons
        el.appendChild(buildGap(8));
        el.appendChild(buildShortcutRow(state));
      },
    },
  ];
}

// ─────────────────────────────────────────────────
//  DETAIL ROW HELPERS (used in expanded cards)
// ─────────────────────────────────────────────────

function detailRow(label, value, valueColor) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-family:' + T.fb + ';padding:2px 0;';
  var lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:40px;color:' + T.mint + ';';
  lbl.textContent = label;
  var val = document.createElement('span');
  val.style.cssText = 'font-size:40px;color:' + (valueColor || T.gold) + ';font-weight:bold;';
  val.textContent = value;
  row.appendChild(lbl);
  row.appendChild(val);
  return row;
}

function detailDivider() {
  var el = document.createElement('div');
  el.style.cssText = 'border-top:1px solid #333;margin:4px 0;';
  return el;
}

function buildMixBar(cashPct, cardPct) {
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;height:16px;margin-top:8px;clip-path:' + chamfer(4) + ';overflow:hidden;';
  var cashSeg = document.createElement('div');
  cashSeg.style.cssText = 'width:' + cashPct + '%;background:' + T.mint + ';';
  var cardSeg = document.createElement('div');
  cardSeg.style.cssText = 'width:' + cardPct + '%;background:' + T.cyan + ';';
  bar.appendChild(cashSeg);
  bar.appendChild(cardSeg);
  var labels = document.createElement('div');
  labels.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-top:2px;';
  labels.innerHTML = '<span>Cash ' + cashPct + '%</span><span>Card ' + cardPct + '%</span>';
  var wrap = document.createElement('div');
  wrap.appendChild(bar);
  wrap.appendChild(labels);
  return wrap;
}

// ─────────────────────────────────────────────────
//  SHORTCUT BUTTONS (UNADJUSTED + $0 ALL)
// ─────────────────────────────────────────────────

function buildShortcutRow(state) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;';

  // UNADJUSTED button
  var uPair = buildStyledButton(T.darkBtn);
  uPair.wrap.style.cssText = 'flex:1;height:34px;';
  uPair.inner.style.fontFamily = T.fb;
  uPair.inner.style.fontSize = T.fsSmall;
  uPair.inner.style.color = T.lavender;
  uPair.inner.textContent = 'UNADJUSTED';
  uPair.wrap.addEventListener('pointerup', function() {
    SceneManager.openTransactional('tip-adjustment', { filter: 'unadjusted' });
  });
  row.appendChild(uPair.wrap);

  // $0 ALL button
  var zPair = buildStyledButton(T.darkBtn);
  zPair.wrap.style.cssText = 'flex:1;height:34px;';
  zPair.inner.style.fontFamily = T.fb;
  zPair.inner.style.fontSize = T.fsSmall;
  zPair.inner.style.color = RED;
  zPair.inner.textContent = '$0 ALL';
  zPair.wrap.addEventListener('pointerup', function() {
    doZeroAll(state);
  });
  row.appendChild(zPair.wrap);

  return row;
}

// ─────────────────────────────────────────────────
//  $0 ALL ACTION
// ─────────────────────────────────────────────────

function doZeroAll(state) {
  var count = state.unadjustedTips || 0;
  if (count === 0) return;

  SceneManager.interrupt('closeday-zero-confirm', {
    onConfirm: function() {
      fetch('/api/v1/payments/zero-unadjusted', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function() { refreshScene(); })
        .catch(function(err) {
          console.error('[KINDpos] Zero all failed:', err);
          showToast('Zero-all failed — check connection');
        });
    },
    onCancel: function() {},
    params: { count: count },
  });
}

// ─────────────────────────────────────────────────
//  CARD TILE (collapsed view in grid)
// ─────────────────────────────────────────────────

function buildCardTile(def, idx) {
  var pair = buildStyledButton(T.darkBtn);
  var wrap = pair.wrap;
  var inner = pair.inner;

  // Override to Style D bevel: 4px
  inner.style.borderWidth = BEVEL + 'px';
  inner.style.clipPath = chamfer(CHAM);
  inner.style.flexDirection = 'column';
  inner.style.alignItems = 'stretch';
  inner.style.justifyContent = 'flex-start';
  inner.style.padding = '6px 8px';
  inner.style.position = 'relative';
  inner.style.gap = '1px';

  // Border override for special cards
  if (def.border && def.border !== T.border) {
    inner.style.borderColor = def.border;
  }

  // Title
  var title = document.createElement('div');
  title.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';font-weight:bold;text-align:center;';
  title.textContent = def.title;
  inner.appendChild(title);

  // Divider
  var hr = document.createElement('div');
  hr.style.cssText = 'height:1px;background:' + T.border + ';margin:4px 0;';
  inner.appendChild(hr);

  // Hero number
  var hero = document.createElement('div');
  hero.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + (def.heroColor || T.gold) + ';font-weight:bold;text-align:center;flex:1;display:flex;align-items:center;justify-content:center;';
  hero.textContent = def.hero;
  inner.appendChild(hero);

  // Subtitle
  var sub = document.createElement('div');
  sub.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;';
  sub.textContent = def.subtitle;
  inner.appendChild(sub);

  // Hint
  var hint = document.createElement('div');
  hint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;margin-top:1px;';
  hint.textContent = '▸';
  inner.appendChild(hint);

  // Status dot (bottom-right)
  var dot = document.createElement('div');
  dot.style.cssText = 'position:absolute;bottom:8px;right:8px;width:8px;height:8px;clip-path:circle(50%);background:' + (def.statusColor || T.cyan) + ';opacity:' + (def.statusColor ? '1' : '0.4') + ';';
  inner.appendChild(dot);

  // Shortcut buttons below card for Tips & Gratuity
  if (def.hasShortcuts && _state) {
    var shortcuts = buildShortcutRow(_state);
    shortcuts.style.marginTop = '4px';
    inner.appendChild(shortcuts);
  }

  // Tap handler
  wrap.addEventListener('pointerup', function(e) {
    // Don't expand if tapping a shortcut button
    if (e.target.closest && e.target.closest('[data-shortcut]')) return;
    expandCard(idx);
  });

  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD STRIP (thin label for collapsed siblings)
// ─────────────────────────────────────────────────

function buildCardStrip(def, idx) {
  var strip = document.createElement('div');
  strip.style.cssText = [
    'height:' + STRIP_H + 'px;',
    'display:flex;align-items:center;justify-content:space-between;',
    'padding:0 12px;cursor:pointer;',
    'background:' + T.bgDark + ';',
    'border:1px solid ' + T.border + ';',
    'clip-path:' + chamfer(4) + ';',
    'font-family:' + T.fb + ';',
    'user-select:none;-webkit-user-select:none;',
  ].join('');

  var lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:40px;color:' + T.mint + ';';
  lbl.textContent = def.title;
  strip.appendChild(lbl);

  var val = document.createElement('span');
  val.style.cssText = 'font-size:40px;color:' + T.cyan + ';';
  val.textContent = def.hero;
  strip.appendChild(val);

  strip.addEventListener('pointerup', function() {
    expandCard(idx);
  });

  return strip;
}

// ─────────────────────────────────────────────────
//  GRID VIEW (3×2 card grid)
// ─────────────────────────────────────────────────

function buildGridView(state) {
  var defs = getCardDefs(state);
  var grid = document.createElement('div');
  grid.style.cssText = [
    'flex:1;',
    'display:grid;',
    'grid-template-columns:repeat(3,1fr);',
    'grid-template-rows:repeat(2,1fr);',
    'gap:' + CARD_GAP + 'px;',
  ].join('');

  defs.forEach(function(def, i) {
    grid.appendChild(buildCardTile(def, i));
  });

  return grid;
}

// ─────────────────────────────────────────────────
//  EXPANDED VIEW (one card fills area, siblings as strips)
// ─────────────────────────────────────────────────

function buildExpandedView(state, idx) {
  var defs = getCardDefs(state);
  var wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;overflow:hidden;';

  // Strips above
  for (var i = 0; i < idx; i++) {
    wrap.appendChild(buildCardStrip(defs[i], i));
  }

  // Expanded card
  var expanded = document.createElement('div');
  expanded.style.cssText = [
    'flex:1;',
    'background:' + T.bgDark + ';',
    'border:2px solid ' + (defs[idx].border || T.border) + ';',
    'clip-path:' + chamfer(CHAM) + ';',
    'display:flex;flex-direction:column;',
    'overflow:hidden;',
  ].join('');

  // Header bar
  var hdr = document.createElement('div');
  hdr.style.cssText = [
    'flex-shrink:0;padding:8px 14px;',
    'display:flex;justify-content:space-between;align-items:center;',
    'background:' + T.bg3 + ';cursor:pointer;',
    'user-select:none;-webkit-user-select:none;',
  ].join('');
  var hTitle = document.createElement('span');
  hTitle.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';font-weight:bold;';
  hTitle.textContent = defs[idx].title;
  var hHint = document.createElement('span');
  hHint.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';';
  hHint.textContent = '▾';
  hdr.appendChild(hTitle);
  hdr.appendChild(hHint);
  hdr.addEventListener('pointerup', function() { collapseToGrid(); });
  expanded.appendChild(hdr);

  // Detail content (scrollable)
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:4px;';
  defs[idx].buildExpanded(content);
  expanded.appendChild(content);

  wrap.appendChild(expanded);

  // Strips below
  for (var j = idx + 1; j < defs.length; j++) {
    wrap.appendChild(buildCardStrip(defs[j], j));
  }

  return wrap;
}

// ─────────────────────────────────────────────────
//  EXPAND / COLLAPSE STATE MANAGEMENT
// ─────────────────────────────────────────────────

function expandCard(idx) {
  if (!_state || !_gridContainer || _accordionCooldown) return;
  _accordionCooldown = true;
  setTimeout(function() { _accordionCooldown = false; }, 150);
  _expandedIdx = idx;
  _gridContainer.innerHTML = '';
  _gridContainer.appendChild(buildExpandedView(_state, idx));
}

function collapseToGrid() {
  if (!_state || !_gridContainer || _accordionCooldown) return;
  _accordionCooldown = true;
  setTimeout(function() { _accordionCooldown = false; }, 150);
  _expandedIdx = null;
  _gridContainer.innerHTML = '';
  _gridContainer.appendChild(buildGridView(_state));
}

// ─────────────────────────────────────────────────
//  BLOCKER BANNER
// ─────────────────────────────────────────────────

function buildBlockerBanner(state) {
  var el = document.createElement('div');
  el.style.cssText = [
    'flex-shrink:0;height:' + BANNER_H + 'px;',
    'display:flex;align-items:center;justify-content:center;',
    'font-family:' + T.fb + ';font-size:40px;',
    'clip-path:' + chamfer(4) + ';',
  ].join('');

  if (isBlocked(state)) {
    el.style.background = 'rgba(255,51,85,0.1)';
    el.style.border = '1px solid ' + RED;
    el.style.color = RED;
    el.textContent = '⚠ RESOLVE: ' + state.openChecks + ' open check' + (state.openChecks > 1 ? 's' : '') + ' must close before finalizing';
  } else {
    el.style.display = 'none';
  }

  _bannerEl = el;
  return el;
}

// ─────────────────────────────────────────────────
//  ACTION BAR (PRINT → SUBMIT BATCH → CLOSE DAY)
// ─────────────────────────────────────────────────

function buildActionBar(state) {
  var bar = document.createElement('div');
  bar.style.cssText = [
    'flex-shrink:0;height:' + ACTION_H + 'px;',
    'display:flex;align-items:stretch;gap:8px;',
  ].join('');

  // Arrow separator helper
  function arrow() {
    var el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';flex-shrink:0;';
    el.textContent = '→';
    return el;
  }

  // PRINT
  var printPair = buildStyledButton(T.darkBtn);
  printPair.wrap.style.cssText = 'flex:1;height:100%;';
  printPair.inner.style.fontFamily = T.fb;
  printPair.inner.style.fontSize = '27px';
  printPair.inner.style.color = T.cyan;
  printPair.inner.textContent = '//PRINT//';
  printPair.wrap.addEventListener('pointerup', function() {
    fetch('/api/v1/print/sales-recap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printed_by: state.printedBy || 'Manager' }),
    }).catch(function(err) { console.warn('[KINDpos] Print failed:', err); });
  });
  bar.appendChild(printPair.wrap);
  bar.appendChild(arrow());

  // SUBMIT BATCH
  var batchPair = buildStyledButton(T.darkBtn);
  batchPair.wrap.style.cssText = 'flex:1;height:100%;';
  batchPair.inner.style.fontFamily = T.fb;
  batchPair.inner.style.fontSize = T.fsSmall;
  batchPair.inner.style.color = T.gold;
  batchPair.inner.textContent = _batchSettled ? '✓ SETTLED' : '//SUBMIT BATCH//';
  if (_batchSettled) {
    batchPair.wrap.style.pointerEvents = 'none';
    batchPair.inner.style.color = T.mint;
  } else {
    batchPair.wrap.addEventListener('pointerup', function() {
      openBatchOverlay(state, function() {
        _batchSettled = true;
        batchPair.inner.textContent = '✓ SETTLED';
        batchPair.inner.style.color = T.mint;
        batchPair.wrap.style.pointerEvents = 'none';
      });
    });
  }
  bar.appendChild(batchPair.wrap);
  bar.appendChild(arrow());

  // CLOSE DAY
  var blocked = isBlocked(state);
  var closePair = buildStyledButton(T.darkBtn);
  closePair.wrap.style.cssText = 'flex:1;height:100%;';

  if (blocked) {
    closePair.inner.style.fontFamily = T.fb;
    closePair.inner.style.fontSize = T.fsSmall;
    closePair.inner.style.color = '#555';
    closePair.inner.textContent = '🔒 //CLOSE DAY//';
    closePair.wrap.style.pointerEvents = 'none';
    closePair.wrap.style.opacity = '0.5';
  } else if (!_pinUnlocked) {
    closePair.inner.style.fontFamily = T.fb;
    closePair.inner.style.fontSize = T.fsSmall;
    closePair.inner.style.color = '#888';
    closePair.inner.textContent = '🔒 //CLOSE DAY//';
    closePair.wrap.addEventListener('pointerup', function() {
      openPinGate(function() {
        _pinUnlocked = true;
        // Rebuild action bar to show unlocked state
        if (bar.parentNode) {
          var newBar = buildActionBar(state);
          bar.parentNode.replaceChild(newBar, bar);
        }
      });
    });
  } else {
    closePair.inner.style.fontFamily = T.fb;
    closePair.inner.style.fontSize = T.fsSmall;
    closePair.inner.style.color = '#1a1a1a';
    closePair.inner.textContent = '//CLOSE DAY//';
    closePair.wrap.addEventListener('pointerup', function() {
      if (isBlocked(state)) return;
      doCloseDay(state);
    });
  }
  bar.appendChild(closePair.wrap);

  return bar;
}

// ─────────────────────────────────────────────────
//  MANAGER PIN GATE (numpad interrupt)
// ─────────────────────────────────────────────────

function openPinGate(onSuccess) {
  SceneManager.interrupt('closeday-manager-pin', {
    onConfirm: function() {
      if (onSuccess) onSuccess();
    },
    onCancel: function() {},
    params: {},
  });
}

// ─────────────────────────────────────────────────
//  CLOSE DAY ACTION
// ─────────────────────────────────────────────────

var _closeDayRunning = false;

function doCloseDay(state) {
  if (_closeDayRunning) return;
  _closeDayRunning = true;
  fetch('/api/v1/orders/close-day', { method: 'POST' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      _closeDayRunning = false;
      console.log('[KINDpos] Day closed:', data);
      SceneManager.closeTransactional('close-day');
    })
    .catch(function(err) {
      _closeDayRunning = false;
      console.error('[KINDpos] Close day failed:', err);
      showToast('Close day failed — check connection');
    });
}

// ─────────────────────────────────────────────────
//  BATCH SETTLEMENT OVERLAY (Win98 style)
// ─────────────────────────────────────────────────

function openBatchOverlay(state, onSettled) {
  SceneManager.openTransactional('batch-settlement', {
    batchTransactions: state.batchTransactions,
    batchTotal: state.batchTotal,
    onSettled: onSettled,
  });
}

// ─────────────────────────────────────────────────
//  REFRESH SCENE (after $0 ALL or data change)
// ─────────────────────────────────────────────────

function refreshScene() {
  if (!_rightCol || !_state) return;
  fetchDayState({ managerName: _state.printedBy }).then(function(newState) {
    newState.terminalId = _state.terminalId || '';
    _state = newState;
    _expandedIdx = null;

    // Rebuild receipt
    if (_receiptScroll) {
      _receiptScroll.innerHTML = '';
      _receiptScroll.appendChild(buildReceiptContent(_state));
    }
    // Rebuild right column
    _rightCol.innerHTML = '';
    _gridContainer = document.createElement('div');
    _gridContainer.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
    _gridContainer.appendChild(buildGridView(_state));
    _rightCol.appendChild(_gridContainer);
    _rightCol.appendChild(buildBlockerBanner(_state));
    _rightCol.appendChild(buildActionBar(_state));
  });
}

// ─────────────────────────────────────────────────
//  BUILD SCENE
// ─────────────────────────────────────────────────

function buildScene(el, params) {
  _batchSettled = false;
  _pinUnlocked = false;
  _expandedIdx = null;

  el.style.cssText = [
    'width:100%;height:100%;',
    'display:flex;gap:' + COL_GAP + 'px;',
    'padding:' + SCENE_PAD + 'px;',
    'box-sizing:border-box;overflow:hidden;',
  ].join('');

  fetchDayState(params).then(function(state) {
    _state = state;

    // Left column: receipt
    el.appendChild(buildReceiptPanel(_state));

    // Right column: grid + banner + action bar
    _rightCol = document.createElement('div');
    _rightCol.id = 'closeday-right';
    _rightCol.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:8px;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;-ms-overflow-style:none;';

    _gridContainer = document.createElement('div');
    _gridContainer.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:visible;';
    _gridContainer.appendChild(buildGridView(_state));
    _rightCol.appendChild(_gridContainer);

    _rightCol.appendChild(buildBlockerBanner(_state));
    _rightCol.appendChild(buildActionBar(_state));

    el.appendChild(_rightCol);
  });
}

// ─────────────────────────────────────────────────
//  REGISTRATION
// ─────────────────────────────────────────────────

SceneManager.register({
  name: 'close-day',
  mount: function(container, params) {
    setSceneName('Close Day');
    setHeaderBack({ back: true, x: true, onBack: function() { SceneManager.closeTransactional('close-day'); } });
    buildScene(container, params);
  },
  unmount: function() {
    _state         = null;
    _expandedIdx   = null;
    _gridContainer = null;
    _bannerEl      = null;
    _receiptScroll = null;
    _rightCol      = null;
    _batchSettled  = false;
    _pinUnlocked   = false;
  },
  cache: false,
  timeoutMs: 0,
});

// ═══════════════════════════════════════════════════
//  INLINE INTERRUPT / OVERLAY SCENE REGISTRATIONS
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'closeday-zero-confirm',
  mount: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + RED + ';padding:20px;min-width:280px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + RED + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// ZERO ALL TIPS //';
    panel.appendChild(lbl);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;';
    msg.textContent = 'Set ' + (params.count || 0) + ' unadjusted tip(s) to $0.00?';
    panel.appendChild(msg);

    var confirmBtn = buildButton('CONFIRM', {
      fill: T.darkBtn, color: RED, fontSize: '26px', height: 44,
      onTap: function() { params.onConfirm(); },
    });
    confirmBtn.style.width = '240px';
    panel.appendChild(confirmBtn);

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 40,
      onTap: function() { params.onCancel(); },
    });
    cancelBtn.style.width = '240px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});

SceneManager.register({
  name: 'closeday-manager-pin',
  mount: function(container, params) {
    container.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    var numpad = buildNumpad({
      maxDigits: 4,
      masked: true,
      onSubmit: function(pin) {
        fetch('/api/v1/auth/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin }),
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.valid) {
              params.onConfirm(data);
            } else {
              numpad.setError('Invalid PIN');
            }
          })
          .catch(function() { numpad.setError('PIN check failed'); });
      },
      onCancel: function() { params.onCancel(); },
    });
    container.appendChild(numpad);
  },
  unmount: function() {},
});

SceneManager.register({
  name: 'batch-settlement',
  mount: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';padding:20px;min-width:300px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// SUBMIT BATCH //';
    panel.appendChild(lbl);

    var info = document.createElement('div');
    info.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;';
    info.textContent = (params.batchTransactions || 0) + ' transactions — ' + fmt(params.batchTotal || 0);
    panel.appendChild(info);

    var submitBtn = buildButton('SETTLE', {
      fill: T.darkBtn, color: T.gold, fontSize: '26px', height: 44,
      onTap: function() {
        fetch('/api/v1/payments/batch-settle', { method: 'POST' })
          .then(function(r) { return r.json(); })
          .then(function() {
            if (params.onSettled) params.onSettled();
            SceneManager.closeTransactional('batch-settlement');
          })
          .catch(function(err) {
            console.error('[KINDpos] Batch settle failed:', err);
            showToast('Batch settle failed');
          });
      },
    });
    submitBtn.style.width = '240px';
    panel.appendChild(submitBtn);

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 40,
      onTap: function() { SceneManager.closeTransactional('batch-settlement'); },
    });
    cancelBtn.style.width = '240px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});
