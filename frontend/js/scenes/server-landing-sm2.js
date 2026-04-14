// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Server Landing Scene (SM2)
//  3-column shift command center: Sales | Checks | Tips+Checkout
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { defineScene } from '../scene-manager-2.js';
import { buildCard, cardFilter } from '../theme-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';
import { showKeyboard, hideKeyboard } from '../keyboard.js';
import { createSVG, svgEl, CHART } from '../chart-helpers.js';
import './check-overview.js';
import { injectChartDefs, PAT } from '../chart-patterns.js';
import { DATA } from '../chart-colors.js';

// ── Constants ────────────────────────────────────
var CHROME = T.numpadChassis;

// ── Pure Helpers ─────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function checkNum(order) {
  return order.check_number || ('C-' + String(order.order_id).slice(0, 3).toUpperCase());
}

function itemCount(order) {
  var items = order.items || [];
  var total = 0;
  for (var i = 0; i < items.length; i++) total += (items[i].quantity || 1);
  return total;
}

var SL_TAX_RATE = 0.08;
var SL_CASH_DISCOUNT = 0.03;

function orderTotals(order) {
  var items = order.items || [];
  var subtotal = 0;
  var itemList = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var qty = it.quantity || 1;
    var price = it.price || 0;
    subtotal += qty * price;
    itemList.push({ name: it.name, qty: qty, unitPrice: price });
  }
  var tax = Math.round(subtotal * SL_TAX_RATE * 100) / 100;
  var cardTotal = Math.round((subtotal + tax) * 100) / 100;
  var cashPrice = Math.round(cardTotal * (1 - SL_CASH_DISCOUNT) * 100) / 100;
  return { items: itemList, subtotal: subtotal, tax: tax, cardTotal: cardTotal, cashPrice: cashPrice };
}

function fmtClockIn(clockedInAt) {
  if (!clockedInAt) return '--';
  var d = new Date(clockedInAt);
  var h = d.getHours(), ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return h + ':' + String(d.getMinutes()).padStart(2, '0') + ampm;
}

function fmtHours(clockedInAt) {
  if (!clockedInAt) return '--';
  var ms = Date.now() - new Date(clockedInAt).getTime();
  return Math.floor(ms / 3600000) + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm';
}

function ordersByTab(state) {
  var tab = state.activeTab;
  return (state.allOrders || []).filter(function(o) {
    if (tab === 'open') return o.status === 'open';
    if (tab === 'closed') return o.status === 'closed' || o.status === 'paid';
    if (tab === 'void') return o.status === 'voided';
    return false;
  });
}

// ── Shared UI Builders ──────────────────────────

function buildCardHeader(label) {
  var bar = document.createElement('div');
  bar.style.cssText = 'background:' + CHROME + ';padding:5px 10px;flex-shrink:0;';
  var txt = document.createElement('div');
  txt.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + T.bgDark + ';letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  txt.textContent = label;
  bar.appendChild(txt);
  return bar;
}

function statRow(label, value, color) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;padding:4px 12px;min-width:0;';
  var l = document.createElement('span');
  l.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + T.textPrimary + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex-shrink:1;';
  l.textContent = label;
  var v = document.createElement('span');
  v.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + color + ';font-weight:bold;white-space:nowrap;flex-shrink:0;';
  v.textContent = value;
  row.appendChild(l);
  row.appendChild(v);
  return row;
}

// ── Module ref for event handler access to state ─
var _state = null;

// ── Data Fetching ────────────────────────────────

function fetchAllData(state) {
  var emp = state.params.emp || state.params;
  var sid = encodeURIComponent(emp.id || '');
  return Promise.all([
    fetch('/api/v1/orders/day-summary?server_id=' + sid)
      .then(function(r) { return r.json(); }).catch(function() { return {}; }),
    fetch('/api/v1/orders?server_id=' + sid)
      .then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/v1/servers/clocked-in')
      .then(function(r) { return r.json(); }).catch(function() { return { staff: [] }; }),
    fetch('/api/v1/config/tipout')
      .then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/v1/server/shift/sales-by-category?server_id=' + sid)
      .then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/v1/server/shift/table-stats?server_id=' + sid)
      .then(function(r) { return r.json(); }).catch(function() { return null; }),
    fetch('/api/v1/server/shift/checkout-status?server_id=' + sid)
      .then(function(r) { return r.json(); }).catch(function() { return { openChecks: 0, unadjustedTips: 0 }; }),
  ]).then(function(results) {
    state.salesData = results[0] || {};
    state.allOrders = Array.isArray(results[1]) ? results[1] : [];
    var staff = ((results[2] || {}).staff || []);
    var emp2 = state.params.emp || state.params;
    for (var i = 0; i < staff.length; i++) {
      if (staff[i].employee_id === emp2.id) {
        state.clockedInAt = staff[i].clocked_in_at;
        break;
      }
    }
    var rules = Array.isArray(results[3]) ? results[3] : [];
    state.tipoutRate = rules.reduce(function(sum, r) { return sum + (r.percentage || 0); }, 0) / 100;
    state.salesByCategory = Array.isArray(results[4]) ? results[4] : [];
    state.tableStats = results[5] || { guestCount: 0, tableCount: 0, checkAvg: 0, avgTurnMinutes: 0, byPartySize: [] };
    state.checkoutStatus = results[6] || { openChecks: 0, unadjustedTips: 0 };
  });
}

function refreshData(state) {
  if (state._refreshing || !state.el) return;
  state._refreshing = true;
  fetchAllData(state).then(function() {
    state._refreshing = false;
    if (state.el) renderLayout(state);
  }).catch(function() { state._refreshing = false; });
}

// ═══════════════════════════════════════════════════
//  PARETO CHART — Horizontal category bars + cumulative %
// ═══════════════════════════════════════════════════

function drawParetoChart(container, data, opts) {
  var W = 300;
  var H = 180;
  var padL = 6;                     // minimal left margin
  var padR = 42;                    // right label area for revenue values
  var padT = T.chartPadT;           // top margin (10)
  var padB = T.chartPadT;           // bottom margin (10)
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;
  var n = data.length;
  if (n === 0) {
    var emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mutedText + ';text-align:center;padding:20px;';
    emptyEl.textContent = 'No sales data';
    container.appendChild(emptyEl);
    return;
  }

  var svg = createSVG(W, H);
  injectChartDefs(svg);

  var maxRev = 0;
  var grandTotal = 0;
  for (var i = 0; i < n; i++) {
    var tot = (data[i].cash || 0) + (data[i].card || 0);
    if (tot > maxRev) maxRev = tot;
    grandTotal += tot;
  }
  if (maxRev === 0) maxRev = 1;

  var barH = Math.max(12, Math.floor(chartH / n) - 4);
  var gap = Math.max(2, Math.floor((chartH - barH * n) / (n + 1)));
  var cumulative = 0;
  var linePoints = [];

  for (var i = 0; i < n; i++) {
    var d = data[i];
    var cash = d.cash || 0;
    var card = d.card || 0;
    var tot = cash + card;
    var catColor = T.catColor((d.category || '').toUpperCase());
    var y = padT + gap + i * (barH + gap);
    var barW = (tot / maxRev) * chartW;
    var cashW = tot > 0 ? (cash / tot) * barW : 0;
    var cardW = barW - cashW;

    // CASH segment — pattern fill with stroke
    if (cashW > 0) {
      svg.appendChild(svgEl('rect', { x: padL, y: y, width: cashW, height: barH, fill: PAT.orange, stroke: catColor, 'stroke-width': '1.5' }));
    }

    // Divider between CASH and CARD
    if (cashW > 0 && cardW > 0) {
      svg.appendChild(svgEl('line', { x1: padL + cashW, y1: y, x2: padL + cashW, y2: y + barH, stroke: CHART.panelBg, 'stroke-width': '1.5' }));
    }

    // CARD segment — solid catColor with stroke
    if (cardW > 0) {
      svg.appendChild(svgEl('rect', { x: padL + cashW, y: y, width: cardW, height: barH, fill: catColor, stroke: catColor, 'stroke-width': '1.5' }));
    }

    // Category label — inside bar if wide enough, else outside
    var labelText = d.category || '';
    var lblW = labelText.length * 9 + 8;
    if (barW > lblW + 8) {
      svg.appendChild(svgEl('rect', { x: padL + 2, y: y + barH / 2 - 10, width: lblW, height: 20, fill: CHART.calloutBg, opacity: '0.82' }));
      var lbl = svgEl('text', { x: padL + 4, y: y + barH / 2 + 6, fill: CHART.axisFill, 'font-size': '14', 'font-family': CHART.dataFont, 'font-weight': 'bold' });
      lbl.textContent = labelText;
      svg.appendChild(lbl);
    } else {
      var lbl = svgEl('text', { x: padL + barW + 3, y: y + barH / 2 + 6, fill: catColor, 'font-size': '13', 'font-family': CHART.dataFont, 'font-weight': 'bold' });
      lbl.textContent = labelText;
      svg.appendChild(lbl);
    }

    // Revenue value — right-aligned
    var revLabel = svgEl('text', { x: W - 2, y: y + barH / 2 + 5, fill: T.gold, 'font-size': '14', 'font-family': CHART.dataFont, 'font-weight': 'bold', 'text-anchor': 'end' });
    revLabel.textContent = fmt(tot);
    svg.appendChild(revLabel);

    // Cumulative % point
    cumulative += tot;
    var pct = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;
    linePoints.push({ x: padL + (pct / 100) * chartW, y: y + barH, pct: pct });
  }

  // Cumulative % line (gold — stands out against category bars)
  if (linePoints.length > 1) {
    var pathD = 'M ' + padL + ' ' + (padT + gap);
    for (var i = 0; i < linePoints.length; i++) {
      pathD += ' L ' + linePoints[i].x + ' ' + linePoints[i].y;
    }
    svg.appendChild(svgEl('path', { d: pathD, fill: 'none', stroke: T.gold, 'stroke-width': '2.5', 'stroke-linejoin': 'round' }));
    for (var i = 0; i < linePoints.length; i++) {
      var pt = linePoints[i];
      svg.appendChild(svgEl('circle', { cx: pt.x, cy: pt.y, r: '4', fill: T.gold, stroke: T.bgDark, 'stroke-width': '1.5' }));
      if (i === linePoints.length - 1 || Math.abs(pt.pct - (linePoints[i - 1] || { pct: 0 }).pct) > 12) {
        var pctLbl = svgEl('text', { x: pt.x + 7, y: pt.y - 4, fill: T.gold, 'font-size': '12', 'font-family': CHART.dataFont, 'font-weight': 'bold' });
        pctLbl.textContent = Math.round(pt.pct) + '%';
        svg.appendChild(pctLbl);
      }
    }
  }

  container.appendChild(svg);
}

// ═══════════════════════════════════════════════════
//  TABLE HISTOGRAM — Horizontal bars by party size
// ═══════════════════════════════════════════════════

function drawTableHistogram(container, ts) {
  if (!ts || !ts.byPartySize || ts.byPartySize.length === 0) {
    var emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mutedText + ';text-align:center;padding:20px;';
    emptyEl.textContent = 'No table data';
    container.appendChild(emptyEl);
    return;
  }

  var data = ts.byPartySize;
  var W = 300;
  var H = 150;
  var padL = 30;                    // y-axis labels (party size)
  var padR = 42;                    // right label area for avg check values
  var padT = 8;                     // top margin
  var padB = 20;                    // bottom axis labels
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;
  var n = data.length;

  var svg = createSVG(W, H);
  injectChartDefs(svg);

  var maxAvg = 0;
  for (var i = 0; i < n; i++) {
    if (data[i].avgCheck > maxAvg) maxAvg = data[i].avgCheck;
  }
  maxAvg = maxAvg * 1.2 || 10;

  var barH = Math.max(14, Math.floor(chartH / n) - 4);
  var gap = Math.max(2, Math.floor((chartH - barH * n) / (n + 1)));

  // Grid lines
  var gridSteps = 4;
  for (var g = 0; g <= gridSteps; g++) {
    var gx = padL + (g / gridSteps) * chartW;
    svg.appendChild(svgEl('line', { x1: gx, y1: padT, x2: gx, y2: H - padB, stroke: CHART.gridStroke, 'stroke-width': '1', 'stroke-dasharray': '3,3' }));
    if (g > 0) {
      var gVal = svgEl('text', { x: gx, y: H - 4, fill: CHART.money, 'font-size': '14', 'font-family': CHART.dataFont, 'text-anchor': 'middle' });
      gVal.textContent = '$' + Math.round(maxAvg * g / gridSteps);
      svg.appendChild(gVal);
    }
  }

  for (var i = 0; i < n; i++) {
    var d = data[i];
    var y = padT + gap + i * (barH + gap);
    var barW = (d.avgCheck / maxAvg) * chartW;

    // Y-axis label — party size
    var sizeLabel = d.size >= 4 ? '4+' : String(d.size);
    svg.appendChild(svgEl('text', { x: padL - 6, y: y + barH / 2 + 6, fill: CHART.axisFill, 'font-size': '17', 'font-family': CHART.dataFont, 'font-weight': 'bold', 'text-anchor': 'end' })).textContent = sizeLabel;

    // Bar — v4 pattern fill with stroke
    svg.appendChild(svgEl('rect', { x: padL, y: y, width: Math.max(barW, 2), height: barH, fill: PAT.orange, stroke: DATA.orange, 'stroke-width': '1.5' }));

    // Count badge inside bar
    if (barW > 30) {
      var badgeW = d.tableCount.toString().length * 8 + 16;
      svg.appendChild(svgEl('rect', { x: padL + 3, y: y + barH / 2 - 9, width: badgeW + 4, height: 18, fill: CHART.calloutBg, opacity: '0.85' }));
      svg.appendChild(svgEl('text', { x: padL + 6, y: y + barH / 2 + 5, fill: CHART.axisFill, 'font-size': '15', 'font-family': CHART.dataFont })).textContent = '\u00d7' + d.tableCount;
    }

    // Avg value — right of bar
    svg.appendChild(svgEl('text', { x: padL + Math.max(barW, 2) + 4, y: y + barH / 2 + 6, fill: CHART.money, 'font-size': '16', 'font-family': CHART.dataFont, 'font-weight': 'bold' })).textContent = fmt(d.avgCheck);
  }

  // Axis labels
  svg.appendChild(svgEl('text', { x: 6, y: H / 2, fill: CHART.axisFill, 'font-size': '13', 'font-family': CHART.labelFont, transform: 'rotate(-90,' + 6 + ',' + H / 2 + ')', 'text-anchor': 'middle' })).textContent = 'PARTY SIZE';
  svg.appendChild(svgEl('text', { x: padL + chartW / 2, y: H - 1, fill: CHART.money, 'font-size': '13', 'font-family': CHART.labelFont, 'text-anchor': 'middle' })).textContent = 'AVG CHECK';

  container.appendChild(svg);
}

// ═══════════════════════════════════════════════════
//  NUMPAD INTERRUPT BUILDER (shared by tip/tipout)
// ═══════════════════════════════════════════════════

function buildNumpadInterrupt(container, params, titlePrefix) {
  var pair = buildCard({ bg: T.bgDark, padding: '24px 32px', chamferSize: 10, borderWidth: 7, glow: true });
  pair.card.style.maxWidth = '360px';
  pair.card.style.width = '90%';
  pair.card.style.textAlign = 'center';

  var title = document.createElement('div');
  title.style.cssText = 'font-family:' + T.fh + ';font-size:22px;color:' + T.mint + ';margin-bottom:8px;letter-spacing:1px;';
  title.textContent = params.title || titlePrefix || 'ENTER AMOUNT';
  pair.card.appendChild(title);

  if (params.checkAmount) {
    var chkAmt = document.createElement('div');
    chkAmt.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.gold + ';margin-bottom:12px;';
    chkAmt.textContent = 'Check: ' + fmt(params.checkAmount);
    pair.card.appendChild(chkAmt);
  }

  var display = document.createElement('div');
  display.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';background:' + T.bgDark + ';padding:10px;margin-bottom:12px;min-height:52px;';
  display.textContent = '$0.00';
  pair.card.appendChild(display);

  var buffer = '';
  function updateDisplay() {
    var cents = parseInt(buffer || '0', 10);
    display.textContent = '$' + (cents / 100).toFixed(2);
  }

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;';
  var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];
  for (var k = 0; k < keys.length; k++) {
    (function(key) {
      grid.appendChild(buildButton(key, {
        fill: T.darkBtn,
        color: key === 'CLR' ? T.vermillion : (key === 'DEL' ? T.gold : T.mint),
        fontSize: '22px', fontFamily: T.fb, height: 44,
        onTap: function() {
          if (key === 'CLR') { buffer = ''; }
          else if (key === 'DEL') { buffer = buffer.slice(0, -1); }
          else { if (buffer.length < 8) buffer += key; }
          updateDisplay();
        },
      }));
    })(keys[k]);
  }
  pair.card.appendChild(grid);

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';
  btns.appendChild(buildButton('CONFIRM', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
    onTap: function() {
      var cents = parseInt(buffer || '0', 10);
      params.onConfirm(cents / 100);
    },
  }));
  btns.appendChild(buildButton('CANCEL', {
    fill: T.darkBtn, color: T.mutedText, fontSize: T.fsBtn, width: 130, height: 44,
    onTap: function() { params.onCancel(); },
  }));
  pair.card.appendChild(btns);
  container.appendChild(pair.wrap);
}

// ═══════════════════════════════════════════════════
//  SCENE DEFINITION
// ═══════════════════════════════════════════════════

defineScene({
  name: 'server-landing',

  state: {
    el: null,
    params: null,
    // API data
    salesData: null,
    allOrders: [],
    clockedInAt: null,
    tipoutRate: 0,
    salesByCategory: [],
    tableStats: null,
    checkoutStatus: null,
    // UI interaction
    activeTab: 'open',
    selected: {},
    // Drill-down
    expandedCard: null,
    drillEl: null,
    // DOM refs
    centerGrid: null,
    opsPanel: null,
  },

  render: function(el, params, state) {
    _state = state;
    state.el = el;
    state.params = params;

    var emp = params.emp || params;
    setSceneName(emp.name || emp.employeeName || 'Server');
    setHeaderBack({
      x: true,
      onClose: function() {
        SceneManager.closeAllTransactional();
        SceneManager.unmountWorking('server-landing');
        SceneManager.openGate('login');
      },
    });

    el.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:' + T.bgDark + ';';
    var loading = document.createElement('div');
    loading.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';';
    loading.textContent = 'Loading...';
    el.appendChild(loading);

    fetchAllData(state).then(function() { renderLayout(state); });
  },

  unmount: function(state) {
    if (state.drillEl) { state.drillEl.remove(); state.drillEl = null; }
  },

  events: {
    'transactional:closed': function(e) {
      if (e && (e.sceneName === 'sc-tip-adjust' || e.sceneName === 'cd-tip-adjust') && _state) {
        refreshData(_state);
      }
    },
    'payment:complete': function() {
      if (_state) {
        _state.selected = {};
        refreshData(_state);
      }
    },
  },

  interrupts: {
    'sl-reopen-confirm': {
      render: function(container, params) {
        var pair = buildCard({ bg: T.bgDark, padding: '24px 32px', chamferSize: 10, borderWidth: 7, glow: true });
        pair.card.style.maxWidth = '420px';
        pair.card.style.textAlign = 'center';

        var msg = document.createElement('div');
        msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
        msg.textContent = 'Reopen ' + (params.checkLabel || 'check') + '? Requires manager approval.';
        pair.card.appendChild(msg);

        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
        btns.appendChild(buildButton('CONFIRM', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44, onTap: function() { params.onConfirm(); } }));
        btns.appendChild(buildButton('CANCEL', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44, onTap: function() { params.onCancel(); } }));
        pair.card.appendChild(btns);
        container.appendChild(pair.wrap);
      },
    },

    'sl-void-gate': {
      render: function(container, params) {
        var pair = buildCard({ bg: T.bgDark, padding: '24px 32px', chamferSize: 10, borderWidth: 7, glow: true });
        pair.card.style.maxWidth = '420px';
        pair.card.style.textAlign = 'center';

        var msg = document.createElement('div');
        msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
        msg.textContent = params.message || 'Void requires manager approval.';
        pair.card.appendChild(msg);

        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
        btns.appendChild(buildButton('CONFIRM', { fill: T.darkBtn, color: T.vermillion, fontSize: T.fsBtn, width: 130, height: 44, onTap: function() { params.onConfirm(); } }));
        btns.appendChild(buildButton('CANCEL', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44, onTap: function() { params.onCancel(); } }));
        pair.card.appendChild(btns);
        container.appendChild(pair.wrap);
      },
    },

    'sl-checkout-gate': {
      render: function(container, params) {
        var isWarning = !!(params.warning);
        var pair = buildCard({ bg: T.bgDark, padding: '24px 32px', chamferSize: 10, borderWidth: 7, glow: true });
        pair.card.style.maxWidth = '420px';
        pair.card.style.textAlign = 'center';

        var msg = document.createElement('div');
        msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:12px;';
        msg.textContent = isWarning ? 'Warning:' : 'Cannot checkout:';
        pair.card.appendChild(msg);

        var reasons = params.reasons || [];
        for (var i = 0; i < reasons.length; i++) {
          var line = document.createElement('div');
          line.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + (isWarning ? '#ffdd44' : T.vermillion) + ';margin-bottom:4px;';
          line.textContent = '\u2022 ' + reasons[i];
          pair.card.appendChild(line);
        }

        var sp = document.createElement('div'); sp.style.height = '16px'; pair.card.appendChild(sp);
        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';
        if (isWarning) {
          btns.appendChild(buildButton('PROCEED', { fill: T.darkBtn, color: T.gold, fontSize: T.fsBtn, width: 140, height: 44, onTap: function() { params.onConfirm(); } }));
        }
        btns.appendChild(buildButton(isWarning ? 'CANCEL' : 'OK', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 44, onTap: function() { params.onCancel(); } }));
        pair.card.appendChild(btns);
        container.appendChild(pair.wrap);
      },
    },

    'sl-manager-gate': {
      render: function(container, params) {
        var pair = buildCard({ bg: T.bgDark, padding: '24px 32px', chamferSize: 10, borderWidth: 7, glow: true });
        pair.card.style.maxWidth = '420px';
        pair.card.style.textAlign = 'center';

        var msg = document.createElement('div');
        msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
        msg.textContent = params.message || 'This action requires manager approval.';
        pair.card.appendChild(msg);

        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
        btns.appendChild(buildButton('CONFIRM', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44, onTap: function() { params.onConfirm(); } }));
        btns.appendChild(buildButton('CANCEL', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44, onTap: function() { params.onCancel(); } }));
        pair.card.appendChild(btns);
        container.appendChild(pair.wrap);
      },
    },

    'sl-transfer-choice': {
      render: function(container, params) {
        var pair = buildCard({ bg: T.bgDark, padding: '24px 32px', chamferSize: 10, borderWidth: 7, glow: true });
        pair.card.style.maxWidth = '420px';
        pair.card.style.textAlign = 'center';

        var msg = document.createElement('div');
        msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
        msg.textContent = 'Transfer type:';
        pair.card.appendChild(msg);

        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
        btns.appendChild(buildButton('INTERNAL', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 140, height: 44, onTap: function() { params.onConfirm('internal'); } }));
        btns.appendChild(buildButton('EXTERNAL', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 140, height: 44, onTap: function() { params.onConfirm('external'); } }));
        pair.card.appendChild(btns);

        var cancelRow = document.createElement('div');
        cancelRow.style.cssText = 'margin-top:12px;';
        cancelRow.appendChild(buildButton('CANCEL', { fill: T.darkBtn, color: T.mutedText, fontSize: T.fsBtnSm, width: 100, height: 34, onTap: function() { params.onCancel(); } }));
        pair.card.appendChild(cancelRow);
        container.appendChild(pair.wrap);
      },
    },

    'sl-merge-choice': {
      render: function(container, params) {
        var pair = buildCard({ bg: T.bgDark, padding: '24px 32px', chamferSize: 10, borderWidth: 7, glow: true });
        pair.card.style.maxWidth = '420px';
        pair.card.style.textAlign = 'center';

        var msg = document.createElement('div');
        msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:8px;';
        msg.textContent = 'Merge ' + (params.count || 0) + ' checks:';
        pair.card.appendChild(msg);

        var hint = document.createElement('div');
        hint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';margin-bottom:16px;';
        hint.textContent = 'Source check numbers will be retired.';
        pair.card.appendChild(hint);

        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';
        btns.appendChild(buildButton('AS ONE', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtnSm, width: 160, height: 44, onTap: function() { params.onConfirm('as_one'); } }));
        btns.appendChild(buildButton('AS SEPARATE SEATS', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtnSm, width: 160, height: 44, onTap: function() { params.onConfirm('as_separate'); } }));
        pair.card.appendChild(btns);

        var cancelRow = document.createElement('div');
        cancelRow.style.cssText = 'margin-top:12px;';
        cancelRow.appendChild(buildButton('CANCEL', { fill: T.darkBtn, color: T.mutedText, fontSize: T.fsBtnSm, width: 100, height: 34, onTap: function() { params.onCancel(); } }));
        pair.card.appendChild(cancelRow);
        container.appendChild(pair.wrap);
      },
    },

    'sl-tip-numpad': {
      render: function(container, params) { buildNumpadInterrupt(container, params, 'ENTER TIP'); },
    },

    'sl-tipout-numpad': {
      render: function(container, params) { buildNumpadInterrupt(container, params, 'TIP OUT AMOUNT'); },
    },

    'void-pin': {
      render: function(container, params) {
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
    },

    'sl-name-input': {
      render: function(container, params) {
        showKeyboard({
          placeholder: 'Enter name',
          initialValue: params.currentName || '',
          maxLength: 40,
          onDone: function(val) {
            params.onConfirm(val.trim());
          },
          onDismiss: function() {
            params.onCancel();
          },
          dismissOnDone: true,
        });
      },
      unmount: function() { hideKeyboard(); },
    },

    'sl-server-picker': {
      render: function(container, params) {
        params = params || {};
        var excludeId = (params.params || {}).excludeId || null;

        container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';

        var panel = document.createElement('div');
        panel.style.cssText = 'background:' + T.bgDark + ';border:4px solid ' + T.mint + ';border-radius:5px;padding:16px;min-width:320px;max-width:440px;max-height:460px;display:flex;flex-direction:column;gap:8px;';

        var title = document.createElement('div');
        title.style.cssText = 'font-family:' + T.fh + ';font-size:11px;letter-spacing:3px;color:' + T.mint + ';text-transform:uppercase;text-align:center;padding:4px 0 8px;';
        title.textContent = 'TRANSFER TO SERVER';
        panel.appendChild(title);

        var list = document.createElement('div');
        list.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;';

        var loading = document.createElement('div');
        loading.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.mutedText + ';text-align:center;padding:20px 0;';
        loading.textContent = 'Loading...';
        list.appendChild(loading);
        panel.appendChild(list);

        var cancelBtn = buildStyledButton({ label: 'CANCEL', variant: 'vermillion', size: 'sm', onClick: function() { params.onCancel(); } });
        cancelBtn.wrap.style.alignSelf = 'center';
        panel.appendChild(cancelBtn.wrap);

        container.appendChild(panel);

        fetch('/api/v1/servers/clocked-in')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            list.innerHTML = '';
            var staff = (data.staff || []).filter(function(s) { return s.employee_id !== excludeId; });

            if (staff.length === 0) {
              var empty = document.createElement('div');
              empty.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.mutedText + ';text-align:center;padding:20px 0;';
              empty.textContent = 'No other servers clocked in';
              list.appendChild(empty);
              return;
            }

            for (var i = 0; i < staff.length; i++) {
              (function(srv) {
                var btn = buildStyledButton({ label: srv.employee_name, variant: 'dark', size: 'md', onClick: function() { params.onConfirm({ employee_id: srv.employee_id, employee_name: srv.employee_name }); } });
                btn.wrap.style.width = '100%';
                list.appendChild(btn.wrap);
              })(staff[i]);
            }
          })
          .catch(function() {
            list.innerHTML = '';
            var err = document.createElement('div');
            err.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.red + ';text-align:center;padding:20px 0;';
            err.textContent = 'Failed to load servers';
            list.appendChild(err);
          });
      },
    },
  },

  transactionals: {
    'sl-internal-transfer': {
      render: function(container, params) {
        container.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;padding:' + T.scenePad + 'px;box-sizing:border-box;';
        container.appendChild(buildCardHeader('INTERNAL TRANSFER'));

        var body = document.createElement('div');
        body.style.cssText = 'flex:1;display:flex;gap:10px;overflow-x:auto;padding:10px 0;';

        var checks = params.checks || [];
        for (var i = 0; i < checks.length; i++) {
          var order = checks[i];
          var col = document.createElement('div');
          col.style.cssText = 'flex:1;min-width:180px;background:' + T.bgDark + ';display:flex;flex-direction:column;overflow-y:auto;border:2px solid ' + T.mint + ';clip-path:' + chamfer(6) + ';';

          var colHeader = document.createElement('div');
          colHeader.style.cssText = 'font-family:' + T.fh + ';font-size:18px;color:' + CHROME + ';padding:6px 8px;border-bottom:1px solid ' + T.border + ';';
          colHeader.textContent = checkNum(order);
          col.appendChild(colHeader);

          var items = order.items || [];
          for (var j = 0; j < items.length; j++) {
            var row = document.createElement('div');
            row.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.textPrimary + ';padding:4px 8px;cursor:pointer;';
            row.textContent = items[j].name + ' — ' + fmt(items[j].price || 0);
            col.appendChild(row);
          }
          body.appendChild(col);
        }

        var newCol = document.createElement('div');
        newCol.style.cssText = 'flex:1;min-width:180px;border:2px dashed ' + CHROME + ';display:flex;align-items:center;justify-content:center;clip-path:' + chamfer(6) + ';';
        var newLabel = document.createElement('div');
        newLabel.style.cssText = 'font-family:' + T.fb + ';font-size:30px;color:' + CHROME + ';';
        newLabel.textContent = '+ NEW CHECK';
        newCol.appendChild(newLabel);
        body.appendChild(newCol);
        container.appendChild(body);

        var actionBar = document.createElement('div');
        actionBar.style.cssText = 'flex-shrink:0;display:flex;gap:10px;justify-content:flex-end;padding-top:8px;';
        actionBar.appendChild(buildButton('CANCEL', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 40, onTap: function() { SceneManager.closeTransactional('sl-internal-transfer'); } }));
        actionBar.appendChild(buildButton('CONFIRM', { fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 40, onTap: function() { showToast('Transfer — not yet wired to backend', { bg: T.gold }); SceneManager.closeTransactional('sl-internal-transfer'); } }));
        container.appendChild(actionBar);
      },
    },
  },
});

// ═══════════════════════════════════════════════════
//  LAYOUT
// ═══════════════════════════════════════════════════

function renderLayout(state) {
  var el = state.el;
  if (!el) return;

  el.innerHTML = '';
  el.style.cssText = 'width:100%;height:100%;background:' + T.bg
    + ';display:grid;grid-template-columns:30fr 40fr 30fr;gap:4px;padding:10px 4px;box-sizing:border-box;position:relative;overflow:hidden;';

  el.appendChild(buildLeftColumn(state));
  el.appendChild(buildCenterColumn(state));
  el.appendChild(buildRightColumn(state));
}

// ═══════════════════════════════════════════════════
//  LEFT COLUMN — Sales Overview + Table Statistics
// ═══════════════════════════════════════════════════

function buildLeftColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:8px;overflow:hidden;';

  col.appendChild(buildSalesOverviewCard(state));
  col.appendChild(buildTableStatsCard(state));

  return col;
}

function buildSalesOverviewCard(state) {
  var d = state.salesData || {};

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.overflow = 'hidden';
  card.style.flex = '1';

  card.appendChild(buildCardHeader('SALES OVERVIEW'));

  var chartWrap = document.createElement('div');
  chartWrap.style.cssText = 'flex:1;min-height:0;overflow:hidden;background:' + T.bgDark + ';padding:4px;';
  drawParetoChart(chartWrap, state.salesByCategory, { width: T.chartW, height: T.chartH });
  card.appendChild(chartWrap);

  // ── KPI row ──
  var kpiRow = document.createElement('div');
  kpiRow.style.cssText = 'display:flex;justify-content:space-between;padding:6px 10px 8px;flex-shrink:0;';
  var netLabel = document.createElement('span');
  netLabel.style.cssText = 'font-family:' + T.fh + ';font-size:26px;color:' + T.textPrimary + ';font-weight:bold;';
  netLabel.textContent = 'Net ';
  var netVal = document.createElement('span');
  netVal.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + T.gold + ';font-weight:bold;';
  netVal.textContent = fmt(d.net_sales);
  var avgLabel = document.createElement('span');
  avgLabel.style.cssText = 'font-family:' + T.fh + ';font-size:26px;color:' + T.textPrimary + ';font-weight:bold;';
  avgLabel.textContent = 'Avg ';
  var avgVal = document.createElement('span');
  avgVal.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + T.gold + ';font-weight:bold;';
  avgVal.textContent = fmt(d.avg_check);
  var netWrap = document.createElement('span');
  netWrap.appendChild(netLabel);
  netWrap.appendChild(netVal);
  var avgWrap = document.createElement('span');
  avgWrap.appendChild(avgLabel);
  avgWrap.appendChild(avgVal);
  kpiRow.appendChild(netWrap);
  kpiRow.appendChild(avgWrap);
  card.appendChild(kpiRow);

  // Tap to expand
  card.style.cursor = 'pointer';
  card.addEventListener('pointerup', function() { showDrillDown(state, 'sales'); });

  return pair.wrap;
}

function buildTableStatsCard(state) {
  var ts = state.tableStats || {};

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.overflow = 'hidden';
  card.style.flex = '1';

  card.appendChild(buildCardHeader('TABLE STATISTICS'));

  // Stat row above chart
  var statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:flex;justify-content:space-around;padding:6px 8px;flex-shrink:0;';
  var statItems = [
    { label: 'GUESTS', value: String(ts.guestCount || 0), color: '#ffffff' },
    { label: 'TABLES', value: String(ts.tableCount || 0), color: '#ffffff' },
    { label: 'CHK AVG', value: fmt(ts.checkAvg || 0), color: T.gold },
    { label: 'AVG TURN', value: (ts.avgTurnMinutes || 0) + 'm', color: T.lime },
  ];
  for (var s = 0; s < statItems.length; s++) {
    var si = statItems[s];
    var sc = document.createElement('div');
    sc.style.cssText = 'text-align:center;';
    var sv = document.createElement('div');
    sv.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + si.color + ';font-weight:bold;';
    sv.textContent = si.value;
    var sl = document.createElement('div');
    sl.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.mutedText + ';letter-spacing:1px;';
    sl.textContent = si.label;
    sc.appendChild(sv);
    sc.appendChild(sl);
    statsRow.appendChild(sc);
  }
  card.appendChild(statsRow);

  var rule = document.createElement('div');
  rule.style.cssText = 'height:1px;background:' + T.mint + ';margin:0 6px;flex-shrink:0;';
  card.appendChild(rule);

  var histChart = document.createElement('div');
  histChart.style.cssText = 'flex:1;min-height:0;overflow:hidden;background:' + T.bgDark + ';padding:4px;';
  drawTableHistogram(histChart, state.tableStats);
  card.appendChild(histChart);

  // Tap to expand
  card.style.cursor = 'pointer';
  card.addEventListener('pointerup', function() { showDrillDown(state, 'tables'); });

  return pair.wrap;
}

// ═══════════════════════════════════════════════════
//  CENTER COLUMN — Tabs + Check Grid + Ops Panel
// ═══════════════════════════════════════════════════

function buildCenterColumn(state) {
  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.overflow = 'hidden';

  // Tab bar (above grid — matches manager layout)
  var tabKeys = ['open', 'closed', 'void'];
  var tabLabels = ['OPEN', 'CLOSED', 'VOID'];
  var tabEls = [];

  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;flex-shrink:0;border-bottom:1px solid ' + T.border + ';';

  for (var t = 0; t < tabKeys.length; t++) {
    (function(key, label) {
      var tab = document.createElement('div');
      tab.style.cssText = 'flex:1;text-align:center;padding:6px 0;cursor:pointer;font-family:' + T.fh + ';font-size:16px;letter-spacing:2px;user-select:none;font-weight:bold;';
      applyTabStyle(tab, key === state.activeTab);
      tab.textContent = label;
      tab.addEventListener('pointerup', function() {
        if (key === state.activeTab) return;
        state.activeTab = key;
        state.selected = {};
        for (var i = 0; i < tabEls.length; i++) applyTabStyle(tabEls[i], tabKeys[i] === state.activeTab);
        renderCheckGrid(state);
        renderOpsPanel(state);
      });
      tabEls.push(tab);
      tabBar.appendChild(tab);
    })(tabKeys[t], tabLabels[t]);
  }
  card.appendChild(tabBar);

  // Check grid (scrollable)
  state.centerGrid = document.createElement('div');
  state.centerGrid.style.cssText = 'flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;box-sizing:border-box;';
  card.appendChild(state.centerGrid);

  // Operations panel
  state.opsPanel = document.createElement('div');
  state.opsPanel.style.cssText = 'flex-shrink:0;border-top:1px solid ' + T.border + ';background:' + T.bg + ';';
  card.appendChild(state.opsPanel);

  renderCheckGrid(state);
  renderOpsPanel(state);
  return pair.wrap;
}

function applyTabStyle(el, active) {
  el.style.background = active ? T.mint : T.bgDark;
  el.style.color = active ? T.bgDark : T.mutedText;
}

// ── Check Grid Rendering ────────────────────────

function renderCheckGrid(state) {
  if (!state.centerGrid) return;
  if (state._holdTimers) {
    for (var ht = 0; ht < state._holdTimers.length; ht++) clearTimeout(state._holdTimers[ht]);
  }
  state._holdTimers = [];
  state.centerGrid.innerHTML = '';
  var orders = ordersByTab(state);
  var emp = state.params ? (state.params.emp || state.params) : {};

  if (orders.length === 0 && state.activeTab !== 'open') {
    var empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px 0;font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';';
    empty.textContent = state.activeTab === 'closed' ? 'No closed checks' : 'No voided checks';
    state.centerGrid.appendChild(empty);
    return;
  }

  for (var i = 0; i < orders.length; i++) {
    state.centerGrid.appendChild(buildCheckTile(state, orders[i]));
  }

  // + NEW CHECK tile (open tab only)
  if (state.activeTab === 'open') {
    var newTile = document.createElement('div');
    newTile.style.cssText = 'border:2px dashed ' + CHROME + ';display:flex;align-items:center;justify-content:center;min-height:60px;cursor:pointer;user-select:none;box-sizing:border-box;';
    var plus = document.createElement('div');
    plus.style.cssText = 'font-family:' + T.fb + ';font-size:32px;color:' + CHROME + ';';
    plus.textContent = '+';
    newTile.appendChild(plus);
    newTile.addEventListener('pointerup', function() {
      SceneManager.mountWorking('check-overview', {
        pin: emp.pin, employeeId: emp.id, employeeName: emp.name, returnLanding: 'server-landing',
      });
    });
    state.centerGrid.appendChild(newTile);
  }
}

// ── Check Tile ──────────────────────────────────

function buildCheckTile(state, order) {
  var isOpen = state.activeTab === 'open';
  var isClosed = state.activeTab === 'closed';
  var isVoid = state.activeTab === 'void';
  var emp = state.params ? (state.params.emp || state.params) : {};

  var tile = document.createElement('div');
  tile.style.cssText = 'background:' + T.bgDark + ';border:2px solid ' + T.mint + ';padding:6px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:60px;cursor:pointer;user-select:none;box-sizing:border-box;clip-path:' + chamfer(6) + ';';
  if (isClosed) tile.style.opacity = '0.7';
  if (isVoid) { tile.style.opacity = '0.5'; tile.style.cursor = 'default'; }

  var numColor = isOpen ? T.mint : (isClosed ? T.electricPink : T.vermillion);
  var num = document.createElement('div');
  num.style.cssText = 'font-family:' + T.fh + ';font-size:22px;color:' + numColor + ';';
  num.textContent = checkNum(order);
  num.dataset.role = 'num';
  tile.appendChild(num);

  if (order.customer_name) {
    var name = document.createElement('div');
    name.style.cssText = 'font-family:' + T.fh + ';font-size:16px;font-weight:bold;color:' + T.mint + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    name.textContent = order.customer_name;
    name.dataset.role = 'name';
    tile.appendChild(name);
  }

  var count = document.createElement('div');
  count.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.textPrimary + ';';
  count.textContent = 'x' + itemCount(order);
  count.dataset.role = 'count';
  tile.appendChild(count);

  var total = document.createElement('div');
  total.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.gold + ';font-weight:bold;';
  total.textContent = fmt(order.total || order.subtotal || 0);
  total.dataset.role = 'total';
  tile.appendChild(total);

  if (isOpen) {
    if (state.selected[order.order_id]) applyTileSelected(tile, true);
    // Short tap = toggle selection, long hold = open check directly
    var _holdTimer = null;
    var _didHold = false;
    tile.addEventListener('pointerdown', function() {
      _didHold = false;
      _holdTimer = setTimeout(function() {
        _didHold = true;
        SceneManager.mountWorking('check-overview', {
          checkId: order.order_id, tableId: order.table_id,
          pin: emp.pin, employeeId: emp.id, employeeName: emp.name, returnLanding: 'server-landing',
        });
      }, 400);
      if (state._holdTimers) state._holdTimers.push(_holdTimer);
    });
    tile.addEventListener('pointerup', function() {
      clearTimeout(_holdTimer);
      if (_didHold) return;
      if (state.selected[order.order_id]) {
        delete state.selected[order.order_id];
        applyTileSelected(tile, false);
      } else {
        state.selected[order.order_id] = order;
        applyTileSelected(tile, true);
      }
      renderOpsPanel(state);
    });
    tile.addEventListener('pointerleave', function() {
      clearTimeout(_holdTimer);
    });
  } else if (isClosed) {
    tile.addEventListener('pointerup', function() {
      SceneManager.interrupt('sl-reopen-confirm', {
        onConfirm: function() {
          fetch('/api/v1/orders/' + order.order_id + '/reopen', { method: 'POST' })
            .then(function(r) {
              if (r.ok) { showToast('Check reopened', { bg: T.goGreen }); refreshData(state); }
              else { showToast('Reopen failed', { bg: T.red }); }
            }).catch(function() { showToast('Reopen failed', { bg: T.red }); });
        },
        onCancel: function() {},
        params: { checkLabel: checkNum(order) },
      });
    });
  }
  return tile;
}

function applyTileSelected(tile, selected) {
  if (selected) {
    tile.style.background = T.mint;
    for (var i = 0; i < tile.children.length; i++) tile.children[i].style.color = T.bgDark;
  } else {
    tile.style.background = T.bgDark;
    var roleColors = { num: T.mint, name: T.mint, count: T.textPrimary, total: T.gold };
    for (var i = 0; i < tile.children.length; i++) {
      var role = tile.children[i].dataset.role;
      if (roleColors[role]) tile.children[i].style.color = roleColors[role];
    }
  }
}

// ── Operations Panel ────────────────────────────

function renderOpsPanel(state) {
  if (!state.opsPanel) return;
  state.opsPanel.innerHTML = '';
  state.opsPanel.appendChild(buildCardHeader('CHECK OPERATION'));

  if (state.activeTab !== 'open') return;
  var ids = Object.keys(state.selected);
  if (ids.length === 0) return;

  var emp = state.params ? (state.params.emp || state.params) : {};
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:6px 10px 8px;';
  var isSingle = ids.length === 1;
  var btnStyle = { fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34 };

  // Row 1: EDIT (single) or MERGE (multi) | PRINT | RSND
  if (isSingle) {
    var order = state.selected[ids[0]];
    grid.appendChild(buildButton('EDIT', Object.assign({}, btnStyle, { onTap: function() {
      SceneManager.mountWorking('check-overview', { checkId: order.order_id, tableId: order.table_id, pin: emp.pin, employeeId: emp.id, employeeName: emp.name, returnLanding: 'server-landing' });
    }})));
  } else {
    grid.appendChild(buildButton('MERGE', Object.assign({}, btnStyle, { onTap: function() {
      SceneManager.interrupt('sl-merge-choice', { onConfirm: function(mode) { showToast('Merge (' + mode + ') — not yet wired', { bg: T.gold }); }, onCancel: function() {}, params: { count: ids.length } });
    }})));
  }

  grid.appendChild(buildButton('PRINT', Object.assign({}, btnStyle, { onTap: function() {
    ids.forEach(function(id) { fetch('/api/v1/print/receipt/' + id, { method: 'POST' }).catch(function() {}); });
    showToast('Print sent' + (ids.length > 1 ? ' for ' + ids.length + ' checks' : ''), { bg: T.goGreen });
  }})));

  grid.appendChild(buildButton('RSND', Object.assign({}, btnStyle, { onTap: function() {
    ids.forEach(function(id) { fetch('/api/v1/orders/' + id + '/send', { method: 'POST' }).catch(function() {}); });
    showToast('Sent to kitchen' + (ids.length > 1 ? ' (' + ids.length + ' checks)' : ''), { bg: T.goGreen });
  }})));

  // Row 2: PAY | DISC | VOID
  grid.appendChild(buildButton('PAY', Object.assign({}, btnStyle, { onTap: function() {
    if (ids.length > 1) { showToast('Select one check to pay', { bg: T.gold }); return; }
    var payOrder = state.selected[ids[0]];
    var totals = orderTotals(payOrder);
    SceneManager.openTransactional('payment-console', {
      orderId: payOrder.order_id,
      checkId: payOrder.check_number || checkNum(payOrder),
      items: totals.items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      cardTotal: totals.cardTotal,
      cashPrice: totals.cashPrice,
      discount: 0,
      returnScene: 'server-landing',
    });
  }})));

  grid.appendChild(buildButton('DISC', Object.assign({}, btnStyle, { onTap: function() {
    SceneManager.interrupt('disc-pin', {
      onConfirm: function(pin) {
        SceneManager.interrupt('disc-select', {
          onConfirm: function(opt) {
            var pct = opt === 'Comp (100%)' ? 1.0 : parseFloat(opt) / 100;
            var pending = ids.length;
            var failed = 0;
            ids.forEach(function(id) {
              var discOrder = state.selected[id];
              var subtotal = 0;
              (discOrder.items || []).forEach(function(it) { subtotal += (it.quantity || 1) * (it.price || 0); });
              var amount = Math.round(subtotal * pct * 100) / 100;
              fetch('/api/v1/orders/' + id + '/discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discount_type: opt, amount: amount, approved_by: pin }),
              }).then(function(r) { if (!r.ok) failed++; if (--pending === 0) finishDisc(); })
                .catch(function() { failed++; if (--pending === 0) finishDisc(); });
            });
            function finishDisc() {
              if (failed > 0) showToast(failed + ' discount(s) failed', { bg: T.red });
              else showToast('Discount applied: ' + opt, { bg: T.goGreen });
              refreshData(state);
            }
          },
          onCancel: function() {},
        });
      },
      onCancel: function() {},
    });
  }})));

  var voidBtn = buildButton('VOID', Object.assign({}, btnStyle, { onTap: function() {
    var voidMsg = isSingle
      ? 'Void ' + checkNum(state.selected[ids[0]]) + '? This is destructive.'
      : 'Void ' + ids.length + ' checks? This is destructive.';
    SceneManager.interrupt('sl-void-gate', {
      onConfirm: function() {
        SceneManager.interrupt('void-pin', {
          onConfirm: function(mgr) {
            Promise.all(ids.map(function(id) {
              return fetch('/api/v1/orders/' + id + '/void', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: isSingle ? 'Voided from server landing' : 'Batch voided', approved_by: mgr.id || 'manager' }),
              });
            })).then(function() {
              showToast((isSingle ? 'Check' : ids.length + ' checks') + ' voided', { bg: T.goGreen });
              state.selected = {};
              refreshData(state);
            }).catch(function() { showToast('Void failed', { bg: T.red }); });
          },
          onCancel: function() {},
        });
      },
      onCancel: function() {},
      params: { message: voidMsg },
    });
  }}));
  voidBtn.style.border = '2px solid ' + T.vermillion;
  grid.appendChild(voidBtn);

  // Row 3: NAME | TRANSFER
  if (isSingle) {
    var nameOrder = state.selected[ids[0]];
    grid.appendChild(buildButton('NAME', Object.assign({}, btnStyle, { onTap: function() {
      SceneManager.interrupt('sl-name-input', {
        onConfirm: function(name) {
          fetch('/api/v1/orders/' + nameOrder.order_id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_name: name }),
          }).then(function(r) {
            if (r.ok) {
              showToast(name ? 'Named: ' + name : 'Name cleared', { bg: T.goGreen });
              state.selected = {};
              refreshData(state);
            } else { showToast('Name update failed', { bg: T.red }); }
          }).catch(function() { showToast('Name update failed', { bg: T.red }); });
        },
        onCancel: function() {},
        checkLabel: checkNum(nameOrder),
        currentName: nameOrder.customer_name || '',
      });
    }})));
  }

  grid.appendChild(buildButton('TRANSFER', Object.assign({}, btnStyle, { onTap: function() {
    SceneManager.interrupt('sl-server-picker', {
      onConfirm: function(server) {
        var pending = ids.length;
        var failed = 0;
        ids.forEach(function(id) {
          fetch('/api/v1/orders/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ server_id: server.employee_id, server_name: server.employee_name }),
          }).then(function(r) { if (!r.ok) failed++; if (--pending === 0) finishTransfer(); })
            .catch(function() { failed++; if (--pending === 0) finishTransfer(); });
        });
        function finishTransfer() {
          if (failed > 0) showToast(failed + ' transfer(s) failed', { bg: T.red });
          else showToast((ids.length > 1 ? ids.length + ' checks transferred' : 'Transferred') + ' to ' + server.employee_name, { bg: T.goGreen });
          state.selected = {};
          refreshData(state);
        }
      },
      onCancel: function() {},
      params: { excludeId: emp.id },
    });
  }})));

  state.opsPanel.appendChild(grid);
}

// ═══════════════════════════════════════════════════
//  RIGHT COLUMN — Tips Panel (top) + Checkout Panel (bottom)
// ═══════════════════════════════════════════════════

function getUnadjustedChecks(state) {
  return ((state.salesData || {}).checks || []).filter(function(c) {
    return (c.status === 'closed') && !c.adjusted;
  });
}

function getClosedChecks(state) {
  return ((state.salesData || {}).checks || []).filter(function(c) {
    return c.status === 'closed';
  });
}

function buildRightColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:8px;overflow:hidden;';

  col.appendChild(buildTipsCard(state));
  col.appendChild(buildCheckoutCard(state));

  return col;
}

function buildTipsCard(state) {
  var d = state.salesData || {};
  var emp = state.params ? (state.params.emp || state.params) : {};

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.overflow = 'hidden';
  card.style.flex = '1';
  card.style.minHeight = '0';

  card.appendChild(buildCardHeader('TIPS'));

  var tipsBody = document.createElement('div');
  tipsBody.style.cssText = 'display:flex;flex-direction:column;justify-content:center;flex:1;min-height:0;padding:4px 0;';

  tipsBody.appendChild(statRow('Total Tips:', fmt(d.total_tips || 0), T.gold));

  // Tip Out row — tap triggers manager PIN gate
  var tipOut = (d.total_tips || 0) * state.tipoutRate;
  var tipOutRow = statRow('Tip Out:', fmt(tipOut), T.gold);
  tipOutRow.style.cursor = 'pointer';
  tipOutRow.addEventListener('pointerup', function() {
    SceneManager.interrupt('sl-manager-gate', {
      onConfirm: function() {
        SceneManager.interrupt('sl-tipout-numpad', {
          onConfirm: function(val) {
            fetch('/api/v1/server/shift/tipout?server_id=' + encodeURIComponent(emp.id), {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: val }),
            }).then(function() { showToast('Tip out updated', { bg: T.goGreen }); refreshData(state); })
              .catch(function() { showToast('Tip out update failed', { bg: T.red }); });
          },
          onCancel: function() {},
          params: { title: 'TIP OUT AMOUNT' },
        });
      },
      onCancel: function() {},
      params: { message: 'Edit Tip Out requires manager approval.' },
    });
  });
  tipsBody.appendChild(tipOutRow);

  var tipRule = document.createElement('div');
  tipRule.style.cssText = 'height:1px;background:' + T.mint + ';margin:4px 8px;flex-shrink:0;';
  tipsBody.appendChild(tipRule);

  // Unadjusted check list
  var unadjChecks = getUnadjustedChecks(state);
  var checkList = document.createElement('div');
  checkList.style.cssText = 'flex:1;min-height:0;overflow-y:auto;padding:2px 8px;';

  if (unadjChecks.length === 0) {
    var noChecks = document.createElement('div');
    noChecks.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mutedText + ';text-align:center;padding:10px;';
    noChecks.textContent = 'All tips adjusted';
    checkList.appendChild(noChecks);
  } else {
    for (var i = 0; i < unadjChecks.length; i++) {
      (function(check) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;padding:5px 4px;cursor:pointer;';
        var chkLabel = document.createElement('span');
        chkLabel.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';';
        chkLabel.textContent = check.checkLabel || 'CHK';
        var amtLabel = document.createElement('span');
        amtLabel.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.gold + ';font-weight:bold;';
        amtLabel.textContent = fmt(check.amount || 0);
        row.appendChild(chkLabel);
        row.appendChild(amtLabel);

        row.addEventListener('pointerup', function() {
          SceneManager.interrupt('sl-tip-numpad', {
            onConfirm: function(tipVal) {
              if (!check.paymentId) { showToast('No card payment to adjust', { bg: T.gold }); return; }
              fetch('/api/v1/orders/' + check.checkId + '/adjust-tip', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_id: check.paymentId, tip_amount: tipVal }),
              }).then(function(r) {
                if (r.ok) { showToast('Tip adjusted', { bg: T.goGreen }); refreshData(state); }
                else { showToast('Tip adjust failed', { bg: T.red }); }
              }).catch(function() { showToast('Tip adjust failed', { bg: T.red }); });
            },
            onCancel: function() {},
            params: { title: 'TIP — ' + (check.checkLabel || ''), checkAmount: check.amount },
          });
        });
        checkList.appendChild(row);
      })(unadjChecks[i]);
    }
  }
  tipsBody.appendChild(checkList);
  card.appendChild(tipsBody);

  // Tap to expand tips drill-down
  card.style.cursor = 'pointer';
  card.addEventListener('pointerup', function(e) {
    if (e.target.closest && e.target.closest('[data-role="tip-row"]')) return;
    showDrillDown(state, 'tips');
  });

  return pair.wrap;
}

function buildCheckoutCard(state) {
  var cs = state.checkoutStatus || {};
  var emp = state.params ? (state.params.emp || state.params) : {};

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.flex = '1';

  card.appendChild(buildCardHeader('CHECKOUT'));

  var coBody = document.createElement('div');
  coBody.style.cssText = 'flex:1;padding:10px 12px;display:flex;flex-direction:column;justify-content:center;gap:8px;';

  // Open checks status
  var openCount = cs.openChecks || 0;
  var openRow = document.createElement('div');
  openRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid ' + (openCount > 0 ? T.vermillion : T.bgDark) + ';';
  var openIcon = document.createElement('span');
  openIcon.style.cssText = 'font-size:18px;color:' + (openCount > 0 ? T.vermillion : T.goGreen) + ';';
  openIcon.textContent = openCount > 0 ? '\u2716' : '\u2714';
  var openLabel = document.createElement('span');
  openLabel.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + (openCount > 0 ? T.vermillion : T.textPrimary) + ';';
  openLabel.textContent = openCount + ' OPEN CHECK' + (openCount !== 1 ? 'S' : '');
  openRow.appendChild(openIcon);
  openRow.appendChild(openLabel);
  coBody.appendChild(openRow);

  // Unadjusted tips status
  var unadjCount = cs.unadjustedTips || 0;
  var unadjColor = unadjCount > 0 ? '#ffdd44' : T.textPrimary;
  var unadjRow = document.createElement('div');
  unadjRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid ' + (unadjCount > 0 ? '#ffdd44' : T.bgDark) + ';';
  var unadjIcon = document.createElement('span');
  unadjIcon.style.cssText = 'font-size:18px;color:' + (unadjCount > 0 ? '#ffdd44' : T.goGreen) + ';';
  unadjIcon.textContent = unadjCount > 0 ? '\u26a0' : '\u2714';
  var unadjLabel = document.createElement('span');
  unadjLabel.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + unadjColor + ';';
  unadjLabel.textContent = unadjCount + ' UNADJUSTED TIP' + (unadjCount !== 1 ? 'S' : '');
  unadjRow.appendChild(unadjIcon);
  unadjRow.appendChild(unadjLabel);
  coBody.appendChild(unadjRow);

  // CHECKOUT button
  var hasBlockers = openCount > 0;
  var hasWarnings = unadjCount > 0;
  var coBtnVariant = hasBlockers ? 'vermillion' : (hasWarnings ? 'gold' : 'mint');

  var coPair = buildStyledButton({ variant: coBtnVariant, size: 'lg', label: 'CHECKOUT', disabled: hasBlockers, onClick: function() {
    if (hasBlockers) return;
    if (hasWarnings) {
      SceneManager.interrupt('sl-checkout-gate', {
        onConfirm: function() {
          SceneManager.mountWorking('server-checkout', { pin: emp.pin, employeeId: emp.id, employeeName: emp.name });
        },
        onCancel: function() {},
        params: { warning: true, reasons: [unadjCount + ' unadjusted tip' + (unadjCount !== 1 ? 's' : '')] },
      });
    } else {
      SceneManager.mountWorking('server-checkout', { pin: emp.pin, employeeId: emp.id, employeeName: emp.name });
    }
  }});
  coPair.wrap.style.width = '100%';
  coBody.appendChild(coPair.wrap);

  card.appendChild(coBody);
  return pair.wrap;
}

// ═══════════════════════════════════════════════════
//  DRILL-DOWN OVERLAY (SM2-style absolute overlay)
// ═══════════════════════════════════════════════════

function showDrillDown(state, cardName) {
  hideDrillDown(state);
  if (!state.el) return;
  var emp = state.params ? (state.params.emp || state.params) : {};

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:' + T.bgDark
    + ';display:flex;flex-direction:column;z-index:5;overflow:hidden;clip-path:' + chamfer(8) + ';';

  var headerLabels = { sales: 'SALES OVERVIEW', tables: 'TABLE STATISTICS', tips: 'TIPS' };
  var header = buildCardHeader(headerLabels[cardName] || 'DETAIL');
  header.style.cursor = 'pointer';
  header.addEventListener('pointerup', function() { hideDrillDown(state); });
  overlay.appendChild(header);

  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow-y:auto;padding:12px;-ms-overflow-style:none;scrollbar-width:none;';

  if (cardName === 'sales') {
    buildSalesDrillContent(state, content);
  } else if (cardName === 'tables') {
    buildTablesDrillContent(state, content);
  } else if (cardName === 'tips') {
    buildTipsDrillContent(state, content, emp);
  }

  overlay.appendChild(content);
  state.el.style.position = 'relative';
  state.el.appendChild(overlay);
  state.drillEl = overlay;
}

function hideDrillDown(state) {
  if (state.drillEl) {
    state.drillEl.remove();
    state.drillEl = null;
  }
}

// ── Sales Drill-Down ────────────────────────────

function buildSalesDrillContent(state, content) {
  var d = state.salesData || {};

  // Expanded Pareto chart
  var chartWrap = document.createElement('div');
  chartWrap.style.cssText = 'width:100%;';
  drawParetoChart(chartWrap, state.salesByCategory, { width: T.chartFullW, height: T.chartFullH });
  content.appendChild(chartWrap);

  // Summary stats
  content.appendChild(statRow('Net Sales:', fmt(d.net_sales || 0), T.gold));
  content.appendChild(statRow('Cash Sales:', fmt(d.cash_total || 0), T.gold));
  content.appendChild(statRow('Card Sales:', fmt(d.card_total || 0), T.gold));
  content.appendChild(statRow('Discounts:', fmt(d.discount_total || 0), T.vermillion));
}

// ── Tables Drill-Down ───────────────────────────

function buildTablesDrillContent(state, content) {
  var allChecks = ((state.salesData || {}).checks || []).filter(function(c) { return c.status === 'closed'; });

  // Column header
  var colHeader = document.createElement('div');
  colHeader.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:6px 8px;background:' + T.mint + ';margin-bottom:4px;';
  var colLabels = ['CHK#', 'GUESTS', 'TOTAL', 'TURN'];
  for (var c = 0; c < colLabels.length; c++) {
    var cl = document.createElement('div');
    cl.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.bgDark + ';letter-spacing:1px;';
    cl.textContent = colLabels[c];
    colHeader.appendChild(cl);
  }
  content.appendChild(colHeader);

  for (var i = 0; i < allChecks.length; i++) {
    var chk = allChecks[i];
    var row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 8px;background:' + (i % 2 === 0 ? T.bgDark : T.bg3) + ';';

    var chkNum = document.createElement('div');
    chkNum.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.mint + ';';
    chkNum.textContent = chk.checkLabel || '--';
    row.appendChild(chkNum);

    var guests = document.createElement('div');
    guests.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:#ffffff;';
    guests.textContent = '--';
    row.appendChild(guests);

    var total = document.createElement('div');
    total.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.gold + ';';
    total.textContent = fmt(chk.amount || 0);
    row.appendChild(total);

    var turn = document.createElement('div');
    turn.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.lime + ';';
    turn.textContent = chk.time || '--';
    row.appendChild(turn);

    content.appendChild(row);
  }

  if (allChecks.length === 0) {
    var noData = document.createElement('div');
    noData.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mutedText + ';text-align:center;padding:20px;';
    noData.textContent = 'No closed checks';
    content.appendChild(noData);
  }
}

// ── Tips Drill-Down (with side numpad) ──────────

function buildTipsDrillContent(state, content, emp) {
  content.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;padding:0;';

  var allChecks = getClosedChecks(state);
  var unadjChecks = allChecks.filter(function(c) { return !c.adjusted; });
  var adjChecks = allChecks.filter(function(c) { return c.adjusted; });
  var totalTips = adjChecks.reduce(function(s, c) { return s + (c.tip || 0); }, 0);

  // Stat strip
  var strip = document.createElement('div');
  strip.style.cssText = 'display:flex;gap:2px;padding:8px;flex-shrink:0;';
  strip.dataset.tipsstrip = '1';
  var stripItems = [
    { label: 'UNADJ TIPS', value: '' + unadjChecks.length, color: T.mint },
    { label: 'TOTAL TIPS', value: fmt(totalTips), color: T.gold },
  ];
  for (var si = 0; si < stripItems.length; si++) {
    var box = document.createElement('div');
    box.style.cssText = 'flex:1;background:' + T.bgDark + ';padding:6px 4px;text-align:center;overflow:hidden;min-width:0;';
    var sLbl = document.createElement('div');
    sLbl.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.mutedText + ';letter-spacing:1px;margin-bottom:2px;white-space:nowrap;';
    sLbl.textContent = stripItems[si].label;
    box.appendChild(sLbl);
    var sVal = document.createElement('div');
    sVal.style.cssText = 'font-family:' + T.fb + ';font-size:24px;font-weight:bold;color:' + stripItems[si].color + ';white-space:nowrap;';
    sVal.textContent = stripItems[si].value;
    box.appendChild(sVal);
    strip.appendChild(box);
  }
  content.appendChild(strip);

  // Main row: scrollable cards + side numpad
  var tipsMainRow = document.createElement('div');
  tipsMainRow.style.cssText = 'display:flex;gap:12px;flex:1;min-height:0;overflow:hidden;transition:all 0.3s ease;';

  var tipsContentPanel = document.createElement('div');
  tipsContentPanel.style.cssText = 'flex:1;overflow-y:auto;scrollbar-width:none;padding:8px;transition:max-width 0.3s ease,flex 0.3s ease;';

  var tipsNumpadSide = null;

  function closeTipsSideNumpad() {
    if (tipsNumpadSide && tipsNumpadSide.parentNode) tipsNumpadSide.parentNode.removeChild(tipsNumpadSide);
    tipsNumpadSide = null;
    tipsContentPanel.style.maxWidth = '';
    tipsContentPanel.style.flex = '1';
  }

  function openTipsSideNumpad(chk) {
    if (tipsNumpadSide) closeTipsSideNumpad();
    tipsContentPanel.style.maxWidth = '480px';
    tipsContentPanel.style.flex = '0 0 480px';

    var side = document.createElement('div');
    side.style.cssText = 'flex:0 0 380px;background:' + T.bgDark + ';padding:16px;display:flex;flex-direction:column;align-items:center;gap:10px;'
      + 'border-top:7px solid ' + T.numpadChassisL + ';border-left:7px solid ' + T.numpadChassisL + ';'
      + 'border-bottom:7px solid ' + T.numpadChassisD + ';border-right:7px solid ' + T.numpadChassisD + ';'
      + 'clip-path:' + chamfer(10) + ';filter:' + cardFilter() + ';align-self:flex-start;';

    var header = document.createElement('div');
    header.style.cssText = 'font-family:' + T.fb + ';font-size:22px;color:' + T.gold + ';letter-spacing:2px;text-align:center;';
    header.textContent = 'ENTER TIP AMOUNT';
    side.appendChild(header);

    var numpad = buildNumpad({
      maxDigits: 6,
      masked: false,
      displayFormat: function(digits) {
        var cents = parseInt(digits || '0', 10);
        return '$' + (cents / 100).toFixed(2);
      },
      displayColor: T.gold,
      chassisColor: T.numpadChassis,
      digitColor: T.digitColor,
      displayH: 60,
      gap: 16,
      keyH: 84,
      keyGap: 12,
      cardPad: 18,
      chassisChamfer: 6,
      chassisBevel: 5,
      onSubmit: function(digits) {
        var cents = parseInt(digits || '0', 10);
        var tipVal = cents / 100;
        closeTipsSideNumpad();
        if (!chk.paymentId) { showToast('No card payment to adjust', { bg: T.gold }); return; }
        fetch('/api/v1/orders/' + chk.checkId + '/adjust-tip', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: chk.paymentId, tip_amount: tipVal }),
        }).then(function(r) {
          if (r.ok) { showToast('Tip adjusted', { bg: T.goGreen }); refreshData(state); }
          else { showToast('Tip adjust failed', { bg: T.red }); }
        }).catch(function() { showToast('Tip adjust failed', { bg: T.red }); });
      },
      onCancel: function() { closeTipsSideNumpad(); },
    });
    side.appendChild(numpad);

    tipsNumpadSide = side;
    tipsMainRow.appendChild(side);
  }

  function renderTipsCards() {
    tipsContentPanel.innerHTML = '';
    var allClosed = getClosedChecks(state);
    var unadj = allClosed.filter(function(c) { return !c.adjusted; });
    var adj = allClosed.filter(function(c) { return c.adjusted; });

    // Unadjusted section
    if (unadj.length > 0) {
      var uLabel = document.createElement('div');
      uLabel.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';letter-spacing:2px;margin-bottom:6px;';
      uLabel.textContent = 'UNADJUSTED TIPS';
      tipsContentPanel.appendChild(uLabel);

      for (var i = 0; i < unadj.length; i++) {
        tipsContentPanel.appendChild(buildTipCheckCard(unadj[i], openTipsSideNumpad));
      }

      // Adjust Remaining to $0.00
      var zeroBtn = document.createElement('div');
      zeroBtn.style.cssText = 'font-family:' + T.fb + ';font-size:18px;letter-spacing:1px;text-align:center;padding:8px;cursor:pointer;margin-bottom:8px;color:' + T.gold + ';border:2px solid ' + T.gold + ';background:#1a1400;';
      zeroBtn.textContent = 'ADJUST REMAINING TO $0.00';
      zeroBtn.addEventListener('pointerup', function(e) {
        e.stopPropagation();
        SceneManager.interrupt('sl-manager-gate', {
          onConfirm: function() {
            var empId = emp.id || emp.employeeId;
            var zeroUrl = '/api/v1/payments/zero-unadjusted';
            if (empId) zeroUrl += '?server_id=' + encodeURIComponent(empId);
            fetch(zeroUrl, { method: 'POST' })
              .then(function() { showToast('Remaining tips set to $0.00', { bg: T.gold, duration: 2000 }); refreshData(state); })
              .catch(function() { showToast('Zero-all failed', { bg: T.red }); });
          },
          onCancel: function() {},
          params: { message: 'Zero all remaining tips? This cannot be undone.' },
        });
      });
      tipsContentPanel.appendChild(zeroBtn);
    }

    // Adjusted section
    if (adj.length > 0) {
      var aLabel = document.createElement('div');
      aLabel.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.green + ';letter-spacing:2px;margin:12px 0 6px;';
      aLabel.textContent = 'ADJUSTED';
      tipsContentPanel.appendChild(aLabel);

      for (var j = 0; j < adj.length; j++) {
        tipsContentPanel.appendChild(buildTipCheckCard(adj[j], openTipsSideNumpad));
      }
    }

    // Empty state
    if (allClosed.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mutedText + ';text-align:center;padding:40px 0;';
      empty.textContent = 'No card checks to adjust';
      tipsContentPanel.appendChild(empty);
    } else if (unadj.length === 0) {
      var allDone = document.createElement('div');
      allDone.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.green + ';text-align:center;padding:20px 0;';
      allDone.textContent = '\u2713 All tips adjusted';
      tipsContentPanel.insertBefore(allDone, tipsContentPanel.firstChild);
    }

    // Update stat strip
    var stripEl = content.querySelector('[data-tipsstrip]');
    if (stripEl) {
      var newUnadj = getClosedChecks(state).filter(function(c) { return !c.adjusted; });
      var newAdj = getClosedChecks(state).filter(function(c) { return c.adjusted; });
      var newTotal = newAdj.reduce(function(s, c) { return s + (c.tip || 0); }, 0);
      var cells = stripEl.children;
      if (cells[0]) cells[0].children[1].textContent = '' + newUnadj.length;
      if (cells[1]) cells[1].children[1].textContent = fmt(newTotal);
    }
  }

  renderTipsCards();
  tipsMainRow.appendChild(tipsContentPanel);
  content.appendChild(tipsMainRow);
}

function buildTipCheckCard(chk, onTapUnadjusted) {
  var unadj = !chk.adjusted;
  var borderColor = unadj ? T.mint : T.green;

  var card = document.createElement('div');
  card.style.cssText = 'background:#111;border:3px solid ' + borderColor + ';padding:10px 12px;margin-bottom:8px;font-family:' + T.fb + ';' + (unadj ? 'cursor:pointer;' : '');

  // Row 1: Check # + time
  var r1 = document.createElement('div');
  r1.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;white-space:nowrap;';
  var chkLabel = document.createElement('span');
  chkLabel.style.cssText = 'font-size:20px;color:#ffffff;font-weight:bold;';
  chkLabel.textContent = chk.checkLabel || 'CHK';
  r1.appendChild(chkLabel);
  var timeEl = document.createElement('span');
  timeEl.style.cssText = 'font-size:18px;color:#aaaaaa;';
  timeEl.textContent = chk.time || '';
  r1.appendChild(timeEl);
  card.appendChild(r1);

  // Row 2: Check Total
  var r2 = document.createElement('div');
  r2.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;white-space:nowrap;';
  var totalLabel = document.createElement('span');
  totalLabel.style.cssText = 'font-size:18px;color:#ffffff;';
  totalLabel.textContent = 'Check Total';
  r2.appendChild(totalLabel);
  var amtEl = document.createElement('span');
  amtEl.style.cssText = 'font-size:20px;color:' + T.gold + ';font-weight:bold;';
  amtEl.textContent = fmt(chk.amount || 0);
  r2.appendChild(amtEl);
  card.appendChild(r2);

  if (!unadj) {
    // Tip row
    var r3 = document.createElement('div');
    r3.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:2px;white-space:nowrap;';
    var tipLabel = document.createElement('span');
    tipLabel.style.cssText = 'font-size:18px;color:#ffffff;';
    tipLabel.textContent = 'Tip';
    r3.appendChild(tipLabel);
    var tipVal = document.createElement('span');
    tipVal.style.cssText = 'font-size:20px;color:' + T.green + ';font-weight:bold;';
    tipVal.textContent = fmt(chk.tip || 0);
    r3.appendChild(tipVal);
    card.appendChild(r3);

    // Final Total
    var r4 = document.createElement('div');
    r4.style.cssText = 'display:flex;justify-content:space-between;border-top:1px solid #333;padding-top:4px;white-space:nowrap;';
    var ftLabel = document.createElement('span');
    ftLabel.style.cssText = 'font-size:18px;color:#ffffff;font-weight:bold;';
    ftLabel.textContent = 'Final Total';
    r4.appendChild(ftLabel);
    var ftVal = document.createElement('span');
    ftVal.style.cssText = 'font-size:22px;color:' + T.gold + ';font-weight:bold;';
    ftVal.textContent = fmt((chk.amount || 0) + (chk.tip || 0));
    r4.appendChild(ftVal);
    card.appendChild(r4);
  } else {
    var prompt = document.createElement('div');
    prompt.style.cssText = 'font-size:18px;color:' + T.mint + ';text-align:center;margin-top:4px;';
    prompt.textContent = '\u26A0 TAP TO ADJUST TIP';
    card.appendChild(prompt);

    card.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      if (onTapUnadjusted) onTapUnadjusted(chk);
    });
  }

  return card;
}
