// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Close Day Scene
//  2-column: Receipt preview left | Card grid + banner + action bar right
//  One blocker: open checks
//  Buttons: PRINT / SUBMIT BATCH / CLOSE DAY
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { registerScene, push, pop, overlay, dismissOverlay, interrupt, resolveInterrupt, cancelInterrupt } from '../scene-manager.js';
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
  var COL    = '#1a1a1a';
  var DIM    = '#447744';

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
  wrap.appendChild(row('Total Tips (CC)', fmt(state.totalTips)));
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
  wrap.appendChild(row('Total Tips (CC)', fmt(state.totalTips)));
  wrap.appendChild(row('Total Tip-Out',   '− ' + fmt(state.totalTipOut)));
  wrap.appendChild(divider());

  var footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;margin-top:8px;font-size:' + SMALL + ';color:' + T.mutedText + ';';
  footer.textContent = '** MANAGER REPORT — CONFIDENTIAL **';
  wrap.appendChild(footer);

  return wrap;
}

function buildReceiptPanel(state) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:' + RECEIPT_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'background:#1a1a1a;',
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
    push('tip-adjustment', { filter: 'unadjusted' });
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

  interrupt('zero-confirm', {
    reason: 'zero-all-tips',
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '16px';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + RED + ';padding:28px 36px;text-align:center;max-width:420px;clip-path:' + chamfer(10) + ';';

      var msg = document.createElement('div');
      msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:12px;';
      msg.textContent = 'Zero out all ' + count + ' unadjusted tips?';
      card.appendChild(msg);

      var sub = document.createElement('div');
      sub.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-bottom:20px;';
      sub.textContent = 'This will set all unadjusted card tips to $0.00';
      card.appendChild(sub);

      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';

      btns.appendChild(buildButton('CONFIRM', {
        fill: T.red, color: '#fff', fontSize: '27px',
        width: 140, height: 44,
        onTap: function() {
          resolveInterrupt(true);
        },
      }));

      btns.appendChild(buildButton('CANCEL', {
        fill: T.darkBtn, color: T.mint, fontSize: '27px',
        width: 120, height: 44,
        onTap: function() { cancelInterrupt(); },
      }));

      card.appendChild(btns);
      el.appendChild(card);
    },
  }).then(function() {
    fetch('/api/v1/payments/zero-unadjusted', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function() { refreshScene(); })
      .catch(function(err) { console.error('[KINDpos] Zero all failed:', err); });
  }).catch(function() {});
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
  if (!_state || !_gridContainer) return;
  _expandedIdx = idx;
  _gridContainer.innerHTML = '';
  _gridContainer.appendChild(buildExpandedView(_state, idx));
}

function collapseToGrid() {
  if (!_state || !_gridContainer) return;
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
    if (state.closedOrders && state.closedOrders.length) {
      state.closedOrders.forEach(function(oid) {
        fetch('/api/v1/print/receipt/' + oid + '?copy_type=itemized', { method: 'POST' })
          .catch(function(err) { console.warn('[KINDpos] Print failed:', err); });
      });
    }
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
  interrupt('manager-pin', {
    reason: 'manager-pin',
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '16px';
      el.style.alignItems = 'center';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.gold + ';padding:24px 32px;text-align:center;clip-path:' + chamfer(10) + ';';

      var msg = document.createElement('div');
      msg.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-bottom:4px;';
      msg.textContent = 'Manager PIN Required';
      card.appendChild(msg);

      var sub = document.createElement('div');
      sub.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-bottom:16px;';
      sub.textContent = 'Enter 4-digit manager PIN';
      card.appendChild(sub);

      var pad = buildNumpad({
        maxDigits: 4,
        masked: true,
        onSubmit: function(pin) {
          fetch('/api/v1/config/employees').then(function(r) { return r.json(); }).then(function(emps) {
            var match = emps.some(function(e) {
              var roles = e.role_ids || [e.role_id];
              return e.pin === pin && roles.indexOf('manager') !== -1 && e.active !== false;
            });
            if (match) {
              resolveInterrupt(true);
            } else {
              pad.setError('WRONG PIN');
            }
          }).catch(function() {
            pad.setError('ERROR');
          });
        },
      });
      card.appendChild(pad);

      var cancelBtn = buildButton('Cancel', {
        fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall,
        width: 120, height: 40,
        onTap: function() { cancelInterrupt(); },
      });
      cancelBtn.style.marginTop = '12px';
      card.appendChild(cancelBtn);

      el.appendChild(card);
    },
  }).then(function() {
    if (onSuccess) onSuccess();
  }).catch(function() {});
}

// ─────────────────────────────────────────────────
//  CLOSE DAY ACTION
// ─────────────────────────────────────────────────

function doCloseDay(state) {
  fetch('/api/v1/orders/close-day', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      console.log('[KINDpos] Day closed:', data);
      pop();
    })
    .catch(function(err) {
      console.error('[KINDpos] Close day failed:', err);
      pop();
    });
}

// ─────────────────────────────────────────────────
//  BATCH SETTLEMENT OVERLAY (Win98 style)
// ─────────────────────────────────────────────────

function openBatchOverlay(state, onSettled) {
  overlay('batch-settlement', {
    onBuild: function(el) {
      el.style.flexDirection = 'column';

      var frame = document.createElement('div');
      frame.style.cssText = 'background:' + T.gold + ';padding:7px;clip-path:' + chamfer(12) + ';filter:drop-shadow(4px 6px 0px rgba(0,0,0,0.7));';

      var dialog = document.createElement('div');
      dialog.style.cssText = 'background:' + T.bg + ';width:480px;border-top:2px solid ' + T.bgLight + ';border-left:2px solid ' + T.bgLight + ';border-bottom:2px solid ' + T.bgEdge + ';border-right:2px solid ' + T.bgEdge + ';font-family:' + T.fb + ';';

      // Title bar
      var titleBar = document.createElement('div');
      titleBar.style.cssText = 'background:linear-gradient(to right,' + T.bgDark + ',' + T.bg3 + ');padding:5px 8px;display:flex;align-items:center;justify-content:space-between;';

      var titleLeft = document.createElement('div');
      titleLeft.style.cssText = 'display:flex;align-items:center;gap:8px;';
      var icon = document.createElement('div');
      icon.style.cssText = 'width:24px;height:24px;background:' + T.gold + ';display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:bold;color:' + T.bgDark + ';clip-path:' + chamfer(3) + ';';
      icon.textContent = '$';
      var titleText = document.createElement('span');
      titleText.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';font-weight:bold;letter-spacing:0.05em;';
      titleText.textContent = 'Batch Settlement — KINDpos/lite';
      var closeBtn = document.createElement('div');
      closeBtn.style.cssText = 'width:18px;height:16px;background:' + T.red + ';border-top:1px solid ' + T.redL + ';border-left:1px solid ' + T.redL + ';border-bottom:1px solid ' + T.redD + ';border-right:1px solid ' + T.redD + ';display:flex;align-items:center;justify-content:center;font-size:40px;color:' + T.mint + ';cursor:pointer;font-weight:bold;clip-path:' + chamfer(3) + ';';
      closeBtn.textContent = '✕';

      titleLeft.appendChild(icon);
      titleLeft.appendChild(titleText);
      titleBar.appendChild(titleLeft);
      titleBar.appendChild(closeBtn);
      dialog.appendChild(titleBar);

      // Body
      var body = document.createElement('div');
      body.style.cssText = 'padding:16px 20px 14px;display:flex;flex-direction:column;gap:12px;';

      var infoPanel = document.createElement('div');
      infoPanel.style.cssText = 'background:' + T.bgDark + ';border-top:2px solid ' + T.bgEdge + ';border-left:2px solid ' + T.bgEdge + ';border-bottom:2px solid ' + T.bgLight + ';border-right:2px solid ' + T.bgLight + ';padding:10px 14px;display:flex;flex-direction:column;gap:6px;';

      function infoRow(label, value) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:40px;';
        var l = document.createElement('span'); l.style.color = T.mint; l.textContent = label;
        var v = document.createElement('span'); v.style.cssText = 'font-weight:bold;color:' + T.gold + ';'; v.textContent = value;
        row.appendChild(l); row.appendChild(v);
        return row;
      }

      infoPanel.appendChild(infoRow('Transactions:', String(state.batchTransactions)));
      infoPanel.appendChild(infoRow('Batch Total:', fmt(state.batchTotal)));
      infoPanel.appendChild(infoRow('Processor:', 'Dejavoo SPIN'));
      body.appendChild(infoPanel);

      var statusEl = document.createElement('div');
      statusEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';min-height:20px;';
      statusEl.textContent = 'Ready to submit batch to processor.';
      body.appendChild(statusEl);

      // Progress bar
      var progContainer = document.createElement('div');
      progContainer.style.cssText = 'border-top:2px solid ' + T.bgEdge + ';border-left:2px solid ' + T.bgEdge + ';border-bottom:2px solid ' + T.bgLight + ';border-right:2px solid ' + T.bgLight + ';height:26px;background:' + T.bgDark + ';padding:3px;overflow:hidden;';
      var progFill = document.createElement('div');
      progFill.style.cssText = 'height:100%;display:flex;gap:2px;align-items:stretch;';

      var TOTAL_SEGS = 26;
      var segments = [];
      for (var i = 0; i < TOTAL_SEGS; i++) {
        var seg = document.createElement('div');
        seg.style.cssText = 'width:14px;flex-shrink:0;background:' + T.mint + ';opacity:0;transition:opacity 0.05s;';
        progFill.appendChild(seg);
        segments.push(seg);
      }
      progContainer.appendChild(progFill);

      var pctEl = document.createElement('div');
      pctEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';text-align:right;margin-top:2px;';
      pctEl.textContent = '0%';

      var progWrap = document.createElement('div');
      progWrap.appendChild(progContainer);
      progWrap.appendChild(pctEl);
      body.appendChild(progWrap);

      // Buttons
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;justify-content:center;gap:8px;margin-top:4px;';

      function makeDialogBtn(label, fill, textColor) {
        var pair = buildStyledButton(fill);
        pair.wrap.style.width = '100px';
        pair.wrap.style.height = '36px';
        pair.inner.style.fontFamily = T.fb;
        pair.inner.style.fontSize = T.fsBtn;
        pair.inner.style.color = textColor;
        pair.inner.textContent = label;
        return pair;
      }

      var submitPair = makeDialogBtn('Submit', T.bg, T.mint);
      var cancelPair = makeDialogBtn('Cancel', T.bgDark, T.mint);
      var okPair     = makeDialogBtn('OK', T.goGreen, '#fff');
      okPair.wrap.style.display = 'none';

      btnRow.appendChild(submitPair.wrap);
      btnRow.appendChild(cancelPair.wrap);
      btnRow.appendChild(okPair.wrap);
      body.appendChild(btnRow);
      dialog.appendChild(body);
      frame.appendChild(dialog);
      el.appendChild(frame);

      var running = false;
      var statusMessages = [
        'Connecting to Dejavoo SPIN...',
        'Authenticating with processor...',
        'Sending transaction batch...',
        'Processing ' + state.batchTransactions + ' transactions...',
        'Verifying totals...',
        'Awaiting processor confirmation...',
        'Finalizing settlement...',
        'Settlement complete.',
      ];

      submitPair.wrap.addEventListener('pointerup', function() {
        if (running) return;
        running = true;
        var currentSeg = 0;
        submitPair.wrap.style.display = 'none';
        cancelPair.wrap.style.display = 'none';

        var msgIdx = 0;
        statusEl.textContent = statusMessages[0];

        var animTimer = setInterval(function() {
          currentSeg++;
          for (var j = 0; j < TOTAL_SEGS; j++) {
            segments[j].style.opacity = j < currentSeg ? '1' : '0';
          }
          pctEl.textContent = Math.round((currentSeg / TOTAL_SEGS) * 100) + '%';

          var newMsgIdx = Math.floor((currentSeg / TOTAL_SEGS) * (statusMessages.length - 1));
          if (newMsgIdx !== msgIdx) { msgIdx = newMsgIdx; statusEl.textContent = statusMessages[msgIdx]; }

          if (currentSeg >= TOTAL_SEGS) {
            clearInterval(animTimer);
            fetch('/api/v1/orders/close-batch', { method: 'POST' })
              .then(function(r) { return r.json(); })
              .then(function(data) {
                running = false;
                _batchSettled = true;
                statusEl.textContent = '✓  Batch settled. ' + fmt(data.batch_total || state.batchTotal || 0) + ' submitted.';
                statusEl.style.color = T.mint;
                pctEl.textContent = '100%';
                titleBar.style.background = 'linear-gradient(to right,#1a3a1a,#2a5a2a)';
                titleText.textContent = 'Batch Settlement — Complete';
                okPair.wrap.style.display = '';
              })
              .catch(function(err) {
                running = false;
                statusEl.textContent = '✗  Settlement failed: ' + (err.message || 'unknown error');
                statusEl.style.color = T.red;
                submitPair.wrap.style.display = '';
                cancelPair.wrap.style.display = '';
              });
          }
        }, 80);
      });

      cancelPair.wrap.addEventListener('pointerup', function() { if (!running) dismissOverlay(); });
      closeBtn.addEventListener('pointerup', function() { if (!running) dismissOverlay(); });
      okPair.wrap.addEventListener('pointerup', function() { dismissOverlay(); if (onSettled) onSettled(); });
    },
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

registerScene('close-day', {
  onEnter: function(el, params) {
    setSceneName('Close Day');
    setHeaderBack({ back: true, x: true });
    buildScene(el, params);
  },
  onExit: function() {
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
