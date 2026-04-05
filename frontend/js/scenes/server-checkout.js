// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Server Checkout Scene
//  2-column: Receipt preview left | Card grid + banner + action bar right
//  Two blockers: open checks + unadjusted tips
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { registerScene, push, pop, overlay, dismissOverlay, interrupt, resolveInterrupt, cancelInterrupt } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';

// ── Layout ────────────────────────────────────────
var RECEIPT_W   = 280;
var COL_GAP     = 20;
var SCENE_PAD   = 13;
var CARD_GAP    = 8;
var STRIP_H     = 28;
var ACTION_H    = 48;
var BANNER_H    = 36;
var BEVEL       = 4;
var CHAM        = 8;
var RED         = '#ff3355';

// ── Scene state ──────────────────────────────────
var _state         = null;
var _expandedIdx   = null;
var _gridContainer = null;
var _bannerEl      = null;
var _receiptScroll = null;
var _rightCol      = null;
var _pinUnlocked   = false;

// ─────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function isBlocked(state) {
  return state.openChecks > 0 || state.unadjustedTips > 0;
}

function recalcTipOut(state) {
  var total = 0;
  state.tipOutRoles.forEach(function(r) {
    var basis = r.basis === 'Liquor Sales' ? state.liquorSales : state.netSales;
    r.basisAmt = basis;
    r.amount   = parseFloat((basis * r.percent / 100).toFixed(2));
    total += r.amount;
  });
  if (state.oneTimeRole && state.oneTimeRole.percent > 0) {
    var otb = state.oneTimeRole.basis === 'Liquor Sales' ? state.liquorSales : state.netSales;
    state.oneTimeRole.basisAmt = otb;
    state.oneTimeRole.amount   = parseFloat((otb * state.oneTimeRole.percent / 100).toFixed(2));
    total += state.oneTimeRole.amount;
  }
  state.tipOutTotal = parseFloat(total.toFixed(2));
  state.takeHome    = parseFloat((state.cardTips - state.tipOutTotal).toFixed(2));
}

// ─────────────────────────────────────────────────
//  FETCH STATE from day-summary API (filtered by server)
// ─────────────────────────────────────────────────

function fetchServerState(params) {
  var summaryUrl = '/api/v1/orders/day-summary';
  if (params.employeeId) summaryUrl += '?server_id=' + encodeURIComponent(params.employeeId);
  var tipoutUrl = '/api/v1/config/tipout';

  return Promise.all([
    fetch(summaryUrl).then(function(r) { return r.json(); }),
    fetch(tipoutUrl).then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/v1/config/store').then(function(r) { return r.json(); }).catch(function() { return {}; }),
  ]).then(function(results) {
    var d = results[0];
    var rules = results[1];
    var store = results[2];
    var today = new Date();

    // Map TipoutRule {role_from, role_to, percentage, calculation_base} to UI format
    var tipOutRoles = [];
    if (Array.isArray(rules)) {
      tipOutRoles = rules.map(function(r) {
        return {
          label: r.role_to || r.role_from || 'Tipout',
          percent: r.percentage || 0,
          basis: r.calculation_base || 'Net Sales',
        };
      });
    }

    var state = {
      employeeId:    params.employeeId   || '',
      employeeName:  params.employeeName || '',
      date: (today.getMonth()+1) + '/' + today.getDate() + '/' + String(today.getFullYear()).slice(2),
      netSales:      d.net_sales    || 0,
      liquorSales:   0,
      cashSales:     d.cash_total   || 0,
      cardSales:     d.card_total   || 0,
      totalChecks:   d.total_checks || 0,
      avgCheck:      d.avg_check    || 0,
      openChecks:    d.open_orders  || 0,
      cardTips:      d.card_tips    || 0,
      cashTips:      d.cash_tips    || 0,
      unadjustedTips: d.unadjusted_tips || 0,
      tipOutRoles:   tipOutRoles,
      oneTimeRole:   null,
      tipOutTotal:   0,
      takeHome:      d.card_tips    || 0,
      cashReceived:  parseFloat(((d.cash_total || 0) + (d.cash_tips || 0)).toFixed(2)),
      cashExpected:  parseFloat(((d.cash_total || 0) + (d.cash_tips || 0)).toFixed(2)),
      closedOrders:  d.closed_order_ids || [],
      restaurantName: (store.info && store.info.restaurant_name) || 'KINDpos',
      terminalId: '',
    };
    recalcTipOut(state);
    return state;
  });
}

// ─────────────────────────────────────────────────
//  RECEIPT PANEL (left)
// ─────────────────────────────────────────────────

function buildReceiptContent(state) {
  var BASE   = T.fsBtn;
  var HEADER = T.fsBtn;
  var SMALL  = T.fsSmall;
  var COL    = '#1a1a1a';
  var DIM    = '#447744';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 14px;font-family:' + T.fb + ';color:' + COL + ';display:flex;flex-direction:column;gap:0;';

  function sectionHeader(text) {
    var el = document.createElement('div');
    el.style.cssText = 'font-size:' + HEADER + ';font-weight:bold;margin-top:8px;margin-bottom:2px;';
    el.textContent = text;
    return el;
  }

  function row(label, value) {
    var el = document.createElement('div');
    el.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-size:' + BASE + ';padding:1px 0;';
    var l = document.createElement('span'); l.textContent = label;
    var v = document.createElement('span'); v.style.fontWeight = 'bold'; v.textContent = value;
    el.appendChild(l); el.appendChild(v);
    return el;
  }

  function divider() {
    var el = document.createElement('div');
    el.style.cssText = 'border-top:1px dashed ' + DIM + ';margin:6px 0;';
    return el;
  }

  // Header
  var id = document.createElement('div');
  id.style.cssText = 'text-align:center;margin-bottom:8px;';
  var r1 = document.createElement('div');
  r1.style.cssText = 'font-size:' + HEADER + ';font-weight:bold;';
  r1.textContent = state.restaurantName;
  var r2 = document.createElement('div');
  r2.style.cssText = 'font-size:' + BASE + ';font-weight:bold;';
  r2.textContent = 'SERVER CHECKOUT';
  id.appendChild(r1); id.appendChild(r2);
  wrap.appendChild(id);

  wrap.appendChild(row('Server:', state.employeeName));
  wrap.appendChild(row('Date:', state.date));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('SALES'));
  wrap.appendChild(row('Checks Closed', String(state.totalChecks)));
  wrap.appendChild(row('Net Sales', fmt(state.netSales)));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('TIPS'));
  wrap.appendChild(row('Card Tips', fmt(state.cardTips)));
  wrap.appendChild(row('Cash Tips', fmt(state.cashTips)));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('TIP-OUT'));
  state.tipOutRoles.forEach(function(r) {
    wrap.appendChild(row(r.label + ' ' + r.percent + '%', fmt(r.amount)));
  });
  if (state.oneTimeRole && state.oneTimeRole.percent > 0) {
    var ot = state.oneTimeRole;
    wrap.appendChild(row((ot.label || 'One-Time') + ' ' + ot.percent + '%', fmt(ot.amount)));
  }
  wrap.appendChild(row('Tip-Out Total', fmt(state.tipOutTotal)));
  wrap.appendChild(divider());

  // Take-home
  var thRow = row('TAKE-HOME', fmt(state.takeHome));
  thRow.querySelector('span:last-child').style.color = T.cyan;
  thRow.querySelector('span:last-child').style.fontSize = T.fsBtn;
  wrap.appendChild(thRow);
  wrap.appendChild(divider());

  // Cash expected
  var ceRow = row('CASH EXPECTED', fmt(state.cashExpected));
  ceRow.querySelector('span:last-child').style.color = T.gold;
  ceRow.querySelector('span:last-child').style.fontSize = T.fsBtn;
  wrap.appendChild(ceRow);
  wrap.appendChild(divider());

  var footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;margin-top:6px;font-size:' + SMALL + ';color:' + T.mutedText + ';';
  footer.textContent = '** CONFIDENTIAL **';
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
  _receiptScroll.style.cssText = 'flex:1;overflow-y:auto;background:' + T.mint + ';';
  _receiptScroll.appendChild(buildReceiptContent(state));
  panel.appendChild(_receiptScroll);

  return panel;
}

// ─────────────────────────────────────────────────
//  DETAIL ROW HELPERS
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
  row.appendChild(lbl); row.appendChild(val);
  return row;
}

function detailDivider() {
  var el = document.createElement('div');
  el.style.cssText = 'border-top:1px solid #333;margin:4px 0;';
  return el;
}

// ─────────────────────────────────────────────────
//  SHORTCUT BUTTONS (UNADJUSTED + $0 ALL)
// ─────────────────────────────────────────────────

function buildShortcutRow(state) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;';

  var uPair = buildStyledButton(T.darkBtn);
  uPair.wrap.style.cssText = 'flex:1;height:34px;';
  uPair.inner.style.fontFamily = T.fb;
  uPair.inner.style.fontSize = T.fsSmall;
  uPair.inner.style.color = T.lavender;
  uPair.inner.textContent = 'UNADJUSTED';
  uPair.wrap.addEventListener('pointerup', function() {
    push('tip-adjustment', { filter: 'unadjusted', employeeId: state.employeeId, employeeName: state.employeeName });
  });
  row.appendChild(uPair.wrap);

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
        onTap: function() { resolveInterrupt(true); },
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
    var url = '/api/v1/payments/zero-unadjusted';
    if (state.employeeId) url += '?server_id=' + encodeURIComponent(state.employeeId);
    fetch(url, { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function() { refreshScene(); })
      .catch(function(err) { console.error('[KINDpos] Zero all failed:', err); });
  }).catch(function() {});
}

// ─────────────────────────────────────────────────
//  CARD DEFINITIONS — 4 cards in 2×2 grid
// ─────────────────────────────────────────────────

function getCardDefs(state) {
  return [
    {
      title: 'Sales Summary',
      hero: fmt(state.netSales),
      heroColor: T.gold,
      subtitle: state.totalChecks + ' checks • ' + fmt(state.avgCheck) + ' avg',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Net Sales',    fmt(state.netSales)));
        el.appendChild(detailRow('Cash Sales',   fmt(state.cashSales)));
        el.appendChild(detailRow('Card Sales',   fmt(state.cardSales)));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Total Checks', String(state.totalChecks), T.mint));
        el.appendChild(detailRow('Avg Check',    fmt(state.avgCheck)));
        if (state.openChecks > 0) {
          el.appendChild(detailRow('Open Checks', String(state.openChecks), RED));
        }
      },
    },
    {
      title: 'Tip Summary',
      hero: fmt(state.cardTips + state.cashTips),
      heroColor: T.gold,
      subtitle: 'card tips • cash tips',
      border: T.border,
      statusColor: state.unadjustedTips > 0 ? T.yellow : null,
      hasShortcuts: true,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Card Tips',    fmt(state.cardTips)));
        el.appendChild(detailRow('Cash Tips',    fmt(state.cashTips)));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Total Tips',   fmt(state.cardTips + state.cashTips), T.gold));
        if (state.unadjustedTips > 0) {
          el.appendChild(detailRow('Unadjusted', String(state.unadjustedTips), T.yellow));
        }
        el.appendChild(buildGap(8));
        el.appendChild(buildShortcutRow(state));
      },
    },
    {
      title: 'Tip-Out Calc',
      hero: '−' + fmt(state.tipOutTotal),
      heroColor: RED,
      subtitle: (state.tipOutRoles.length ? state.tipOutRoles[0].percent + '% rate' : '0%') + ' • editable',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        state.tipOutRoles.forEach(function(r) {
          el.appendChild(detailRow(r.label + ' (' + r.percent + '% ' + r.basis + ')', fmt(r.amount)));
        });
        if (state.oneTimeRole && state.oneTimeRole.percent > 0) {
          var ot = state.oneTimeRole;
          el.appendChild(detailRow((ot.label || 'One-Time') + ' ' + ot.percent + '%', fmt(ot.amount)));
        }
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Total Tip-Out', fmt(state.tipOutTotal)));

        // Adjust % button
        var adjPair = buildStyledButton(T.gold);
        adjPair.wrap.style.cssText = 'width:100%;height:36px;margin-top:8px;';
        adjPair.inner.style.fontFamily = T.fb;
        adjPair.inner.style.fontSize = T.fsSmall;
        adjPair.inner.style.color = '#1a1a1a';
        adjPair.inner.textContent = 'Adjust %';
        adjPair.wrap.addEventListener('pointerup', function() {
          openAdjustOverlay(state);
        });
        el.appendChild(adjPair.wrap);
      },
    },
    {
      title: 'Take-Home',
      hero: fmt(state.takeHome),
      heroColor: T.gold,
      subtitle: 'tips − tipout + cash',
      border: T.gold,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Card Tips',    fmt(state.cardTips)));
        el.appendChild(detailRow('Tip-Out',      '− ' + fmt(state.tipOutTotal), RED));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Take-Home',    fmt(state.takeHome), T.gold));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Cash Expected', fmt(state.cashExpected)));
      },
    },
  ];
}

// ─────────────────────────────────────────────────
//  CARD TILE (collapsed view in grid)
// ─────────────────────────────────────────────────

function buildCardTile(def, idx) {
  var pair = buildStyledButton(T.darkBtn);
  var wrap = pair.wrap;
  var inner = pair.inner;

  inner.style.borderWidth = BEVEL + 'px';
  inner.style.clipPath = chamfer(CHAM);
  inner.style.flexDirection = 'column';
  inner.style.alignItems = 'stretch';
  inner.style.justifyContent = 'flex-start';
  inner.style.padding = '10px 12px';
  inner.style.position = 'relative';
  inner.style.gap = '2px';

  if (def.border && def.border !== T.border) {
    inner.style.borderColor = def.border;
  }

  var title = document.createElement('div');
  title.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';font-weight:bold;text-align:center;';
  title.textContent = def.title;
  inner.appendChild(title);

  var hr = document.createElement('div');
  hr.style.cssText = 'height:1px;background:' + T.border + ';margin:4px 0;';
  inner.appendChild(hr);

  var hero = document.createElement('div');
  hero.style.cssText = 'font-family:' + T.fb + ';font-size:45px;color:' + (def.heroColor || T.gold) + ';font-weight:bold;text-align:center;flex:1;display:flex;align-items:center;justify-content:center;';
  hero.textContent = def.hero;
  inner.appendChild(hero);

  var sub = document.createElement('div');
  sub.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';text-align:center;';
  sub.textContent = def.subtitle;
  inner.appendChild(sub);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';text-align:center;margin-top:2px;';
  hint.textContent = '▸';
  inner.appendChild(hint);

  var dot = document.createElement('div');
  dot.style.cssText = 'position:absolute;bottom:8px;right:8px;width:8px;height:8px;clip-path:circle(50%);background:' + (def.statusColor || T.cyan) + ';opacity:' + (def.statusColor ? '1' : '0.4') + ';';
  inner.appendChild(dot);

  if (def.hasShortcuts && _state) {
    var shortcuts = buildShortcutRow(_state);
    shortcuts.style.marginTop = '4px';
    inner.appendChild(shortcuts);
  }

  wrap.addEventListener('pointerup', function(e) {
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

  strip.addEventListener('pointerup', function() { expandCard(idx); });

  return strip;
}

// ─────────────────────────────────────────────────
//  GRID VIEW (2×2 card grid)
// ─────────────────────────────────────────────────

function buildGridView(state) {
  var defs = getCardDefs(state);
  var grid = document.createElement('div');
  grid.style.cssText = [
    'flex:1;',
    'display:grid;',
    'grid-template-columns:repeat(2,1fr);',
    'grid-template-rows:repeat(2,1fr);',
    'gap:' + CARD_GAP + 'px;',
  ].join('');

  defs.forEach(function(def, i) { grid.appendChild(buildCardTile(def, i)); });

  return grid;
}

// ─────────────────────────────────────────────────
//  EXPANDED VIEW
// ─────────────────────────────────────────────────

function buildExpandedView(state, idx) {
  var defs = getCardDefs(state);
  var wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;overflow:hidden;';

  for (var i = 0; i < idx; i++) { wrap.appendChild(buildCardStrip(defs[i], i)); }

  var expanded = document.createElement('div');
  expanded.style.cssText = [
    'flex:1;',
    'background:' + T.bgDark + ';',
    'border:2px solid ' + (defs[idx].border || T.border) + ';',
    'clip-path:' + chamfer(CHAM) + ';',
    'display:flex;flex-direction:column;',
    'overflow:hidden;',
  ].join('');

  var hdr = document.createElement('div');
  hdr.style.cssText = 'flex-shrink:0;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;background:' + T.bg3 + ';cursor:pointer;user-select:none;-webkit-user-select:none;';
  var hTitle = document.createElement('span');
  hTitle.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';font-weight:bold;';
  hTitle.textContent = defs[idx].title;
  var hHint = document.createElement('span');
  hHint.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';';
  hHint.textContent = '▾';
  hdr.appendChild(hTitle); hdr.appendChild(hHint);
  hdr.addEventListener('pointerup', function() { collapseToGrid(); });
  expanded.appendChild(hdr);

  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:4px;';
  defs[idx].buildExpanded(content);
  expanded.appendChild(content);

  wrap.appendChild(expanded);

  for (var j = idx + 1; j < defs.length; j++) { wrap.appendChild(buildCardStrip(defs[j], j)); }

  return wrap;
}

// ─────────────────────────────────────────────────
//  EXPAND / COLLAPSE STATE
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
//  BLOCKER / CLEAR BANNER
// ─────────────────────────────────────────────────

function buildBlockerBanner(state) {
  var el = document.createElement('div');
  el.style.cssText = [
    'flex-shrink:0;height:' + BANNER_H + 'px;',
    'display:flex;align-items:center;justify-content:center;',
    'font-family:' + T.fb + ';font-size:40px;',
    'clip-path:' + chamfer(4) + ';',
  ].join('');

  var blocked = isBlocked(state);
  if (blocked) {
    el.style.background = 'rgba(255,51,85,0.1)';
    el.style.border = '1px solid ' + RED;
    el.style.color = RED;
    var msgs = [];
    if (state.openChecks > 0) msgs.push(state.openChecks + ' open check' + (state.openChecks > 1 ? 's' : ''));
    if (state.unadjustedTips > 0) msgs.push(state.unadjustedTips + ' unadjusted tip' + (state.unadjustedTips > 1 ? 's' : ''));
    el.textContent = '⚠ RESOLVE: ' + msgs.join(' + ');
  } else {
    el.style.background = 'rgba(51,255,255,0.08)';
    el.style.border = '1px solid ' + T.cyan;
    el.style.color = T.cyan;
    el.textContent = '✓ ALL CLEAR — ready to finalize';
  }

  _bannerEl = el;
  return el;
}

// ─────────────────────────────────────────────────
//  ACTION BAR (PRINT → FINALIZE)
// ─────────────────────────────────────────────────

function buildActionBar(state) {
  var bar = document.createElement('div');
  bar.style.cssText = 'flex-shrink:0;height:' + ACTION_H + 'px;display:flex;align-items:stretch;gap:8px;';

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
    fetch('/api/v1/print/server-checkout/' + encodeURIComponent(state.employeeId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server_name: state.employeeName || '' }),
    }).catch(function(err) { console.warn('[KINDpos] Print failed:', err); });
  });
  bar.appendChild(printPair.wrap);
  bar.appendChild(arrow());

  // FINALIZE
  var blocked = isBlocked(state);
  var finPair = buildStyledButton(T.darkBtn);
  finPair.wrap.style.cssText = 'flex:1;height:100%;';

  if (blocked) {
    finPair.inner.style.fontFamily = T.fb;
    finPair.inner.style.fontSize = T.fsSmall;
    finPair.inner.style.color = '#555';
    finPair.inner.textContent = '🔒 //FINALIZE//';
    finPair.wrap.style.pointerEvents = 'none';
    finPair.wrap.style.opacity = '0.5';
  } else if (!_pinUnlocked) {
    finPair.inner.style.fontFamily = T.fb;
    finPair.inner.style.fontSize = T.fsSmall;
    finPair.inner.style.color = '#888';
    finPair.inner.textContent = '🔒 //FINALIZE//';
    finPair.wrap.addEventListener('pointerup', function() {
      openPinGate(function() {
        _pinUnlocked = true;
        if (bar.parentNode) {
          var newBar = buildActionBar(state);
          bar.parentNode.replaceChild(newBar, bar);
        }
      });
    });
  } else {
    finPair.inner.style.fontFamily = T.fb;
    finPair.inner.style.fontSize = T.fsSmall;
    finPair.inner.style.color = '#1a1a1a';
    finPair.inner.textContent = '//FINALIZE//';
    finPair.wrap.addEventListener('pointerup', function() {
      doFinalize(state);
    });
  }
  bar.appendChild(finPair.wrap);

  return bar;
}

// ─────────────────────────────────────────────────
//  MANAGER PIN GATE
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
//  ADJUST % OVERLAY
// ─────────────────────────────────────────────────

function openAdjustOverlay(state) {
  var workingRoles = state.tipOutRoles.map(function(r) {
    return { label: r.label, percent: r.percent, basis: r.basis };
  });
  var workingOneTime = state.oneTimeRole
    ? { label: state.oneTimeRole.label, percent: state.oneTimeRole.percent, basis: state.oneTimeRole.basis }
    : { label: 'One-Time', percent: 0, basis: 'Net Sales' };

  overlay('adjust-pct', {
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '0';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.gold + ';padding:0;width:520px;clip-path:' + chamfer(12) + ';display:flex;flex-direction:column;overflow:hidden;';

      var ovHdr = document.createElement('div');
      ovHdr.style.cssText = 'background:' + T.gold + ';padding:12px 20px;font-family:' + T.fb + ';font-size:40px;color:#1a1a1a;font-weight:bold;text-align:center;';
      ovHdr.textContent = 'Adjust Tip-Out %';
      card.appendChild(ovHdr);

      var body = document.createElement('div');
      body.style.cssText = 'padding:16px 20px;display:flex;flex-direction:column;gap:12px;';

      workingRoles.forEach(function(r) { body.appendChild(buildAdjustRow(r)); });

      var sep = document.createElement('div');
      sep.style.cssText = 'border-top:1px solid ' + T.border + ';';
      body.appendChild(sep);

      var otLabel = document.createElement('div');
      otLabel.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';';
      otLabel.textContent = 'ONE-TIME (this checkout only)';
      body.appendChild(otLabel);
      body.appendChild(buildAdjustRow(workingOneTime));

      card.appendChild(body);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:0;border-top:2px solid ' + T.border + ';';

      var cancelPair = buildStyledButton(T.bgDark);
      cancelPair.wrap.style.flex = '1';
      cancelPair.wrap.style.height = '52px';
      cancelPair.inner.style.fontFamily = T.fb;
      cancelPair.inner.style.fontSize = '16px';
      cancelPair.inner.style.color = T.mint;
      cancelPair.inner.textContent = 'CANCEL';
      cancelPair.wrap.addEventListener('pointerup', function() { dismissOverlay(); });

      var confirmPair = buildStyledButton(T.gold);
      confirmPair.wrap.style.flex = '1';
      confirmPair.wrap.style.height = '52px';
      confirmPair.inner.style.fontFamily = T.fb;
      confirmPair.inner.style.fontSize = '16px';
      confirmPair.inner.style.color = '#1a1a1a';
      confirmPair.inner.textContent = 'CONFIRM';
      confirmPair.wrap.addEventListener('pointerup', function() {
        workingRoles.forEach(function(r, i) { state.tipOutRoles[i].percent = r.percent; });
        state.oneTimeRole = workingOneTime.percent > 0 ? {
          label: workingOneTime.label, percent: workingOneTime.percent,
          basis: workingOneTime.basis, basisAmt: 0, amount: 0,
        } : null;
        recalcTipOut(state);
        dismissOverlay();
        refreshAfterAdjust(state);
      });

      btnRow.appendChild(cancelPair.wrap);
      btnRow.appendChild(confirmPair.wrap);
      card.appendChild(btnRow);
      el.appendChild(card);
    },
  });
}

function buildAdjustRow(role) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:10px;font-family:' + T.fb + ';';

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-size:40px;color:' + T.mint + ';min-width:80px;';
  nameEl.textContent = role.label;

  var basisBtn = document.createElement('div');
  basisBtn.style.cssText = 'font-size:40px;color:' + T.mint + ';cursor:pointer;min-width:90px;padding:4px 6px;border:1px solid ' + T.border + ';text-align:center;';
  basisBtn.textContent = role.basis;
  basisBtn.addEventListener('pointerup', function() {
    role.basis = role.basis === 'Net Sales' ? 'Liquor Sales' : 'Net Sales';
    basisBtn.textContent = role.basis;
  });

  var decBtn = buildStyledButton(T.bgDark);
  decBtn.wrap.style.width = '36px'; decBtn.wrap.style.height = '36px';
  decBtn.inner.style.fontFamily = T.fb; decBtn.inner.style.fontSize = T.fsBtn; decBtn.inner.style.color = T.mint;
  decBtn.inner.textContent = '−';
  decBtn.wrap.addEventListener('pointerup', function() {
    if (role.percent > 0) { role.percent = parseFloat((role.percent - 0.5).toFixed(1)); pctEl.textContent = role.percent + '%'; }
  });

  var pctEl = document.createElement('div');
  pctEl.style.cssText = 'min-width:48px;text-align:center;font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';border:2px solid ' + T.gold + ';padding:4px 6px;';
  pctEl.textContent = role.percent + '%';

  var incBtn = buildStyledButton(T.bgDark);
  incBtn.wrap.style.width = '36px'; incBtn.wrap.style.height = '36px';
  incBtn.inner.style.fontFamily = T.fb; incBtn.inner.style.fontSize = T.fsBtn; incBtn.inner.style.color = T.mint;
  incBtn.inner.textContent = '+';
  incBtn.wrap.addEventListener('pointerup', function() {
    if (role.percent < 20) { role.percent = parseFloat((role.percent + 0.5).toFixed(1)); pctEl.textContent = role.percent + '%'; }
  });

  row.appendChild(nameEl);
  row.appendChild(decBtn.wrap);
  row.appendChild(pctEl);
  row.appendChild(incBtn.wrap);
  row.appendChild(basisBtn);
  return row;
}

function refreshAfterAdjust(state) {
  if (_receiptScroll) {
    _receiptScroll.innerHTML = '';
    _receiptScroll.appendChild(buildReceiptContent(state));
  }
  if (_rightCol) {
    _rightCol.innerHTML = '';
    _gridContainer = document.createElement('div');
    _gridContainer.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
    _gridContainer.appendChild(buildGridView(state));
    _rightCol.appendChild(_gridContainer);
    _rightCol.appendChild(buildBlockerBanner(state));
    _rightCol.appendChild(buildActionBar(state));
  }
}

// ─────────────────────────────────────────────────
//  FINALIZE ACTION
// ─────────────────────────────────────────────────

function completeFinalizeAfterTips(state) {
  fetch('/api/v1/orders/close-batch', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      console.log('[KINDpos] Server checkout finalized:', data);
      pop();
    })
    .catch(function(err) {
      console.error('[KINDpos] Finalize failed:', err);
      pop();
    });
}

function showCashTipDeclaration(state) {
  var tipValue = '';

  interrupt('cash-tip-declare', {
    reason: 'declare-cash-tips',
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '16px';
      el.style.alignItems = 'center';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.gold + ';padding:28px 36px;text-align:center;max-width:420px;clip-path:' + chamfer(10) + ';';

      var msg = document.createElement('div');
      msg.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-bottom:4px;';
      msg.textContent = 'Declare Cash Tips';
      card.appendChild(msg);

      var sub = document.createElement('div');
      sub.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:16px;';
      sub.textContent = 'Enter cash tips received (optional)';
      card.appendChild(sub);

      var display = document.createElement('div');
      display.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';background:' + T.darkBtn + ';padding:12px 24px;margin-bottom:16px;clip-path:' + chamfer(6) + ';min-width:180px;';
      display.textContent = '$0.00';
      card.appendChild(display);

      var padWrap = document.createElement('div');
      padWrap.style.cssText = 'margin-bottom:16px;';
      var pad = buildNumpad({
        width: 240,
        onInput: function(val) {
          tipValue = val;
          var cents = parseInt(val, 10) || 0;
          display.textContent = '$' + (cents / 100).toFixed(2);
        },
      });
      padWrap.appendChild(pad);
      card.appendChild(padWrap);

      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';

      btns.appendChild(buildButton('Submit', {
        fill: T.gold, color: '#1a1a1a', fontSize: '27px',
        width: 130, height: 44,
        onTap: function() {
          var cents = parseInt(tipValue, 10) || 0;
          resolveInterrupt(cents / 100);
        },
      }));

      btns.appendChild(buildButton('Skip', {
        fill: T.darkBtn, color: T.mint, fontSize: '27px',
        width: 100, height: 44,
        onTap: function() { resolveInterrupt(null); },
      }));

      card.appendChild(btns);
      el.appendChild(card);
    },
  }).then(function(amount) {
    if (amount != null && amount > 0) {
      fetch('/api/v1/servers/declare-cash-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_id: state.employeeId, amount: amount }),
      }).then(function() { completeFinalizeAfterTips(state); })
        .catch(function() { completeFinalizeAfterTips(state); });
    } else {
      completeFinalizeAfterTips(state);
    }
  }).catch(function() {
    completeFinalizeAfterTips(state);
  });
}

function doFinalize(state) {
  showCashTipDeclaration(state);
}

// ─────────────────────────────────────────────────
//  REFRESH SCENE
// ─────────────────────────────────────────────────

function refreshScene() {
  if (!_rightCol || !_state) return;
  fetchServerState({ employeeId: _state.employeeId, employeeName: _state.employeeName }).then(function(newState) {
    newState.restaurantName = _state.restaurantName;
    newState.terminalId = _state.terminalId;
    _state = newState;
    _expandedIdx = null;

    if (_receiptScroll) {
      _receiptScroll.innerHTML = '';
      _receiptScroll.appendChild(buildReceiptContent(_state));
    }
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
  _pinUnlocked = false;
  _expandedIdx = null;

  el.style.cssText = [
    'width:100%;height:100%;',
    'display:flex;gap:' + COL_GAP + 'px;',
    'padding:' + SCENE_PAD + 'px;',
    'box-sizing:border-box;overflow:hidden;',
  ].join('');

  fetchServerState(params).then(function(state) {
    _state = state;

    el.appendChild(buildReceiptPanel(_state));

    _rightCol = document.createElement('div');
    _rightCol.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:8px;overflow:hidden;';

    _gridContainer = document.createElement('div');
    _gridContainer.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
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

registerScene('server-checkout', {
  onEnter: function(el, params) {
    setSceneName('Checkout: ' + (params.employeeName || ''));
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
    _pinUnlocked   = false;
  },
  cache: false,
  timeoutMs: 0,
});
