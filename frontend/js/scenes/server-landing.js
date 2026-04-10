// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Server Landing Scene
//  3-column shift command center: Sales | Checks | Tips+Checkout
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── SVG Namespace ────────────────────────────────
var SVG_NS = 'http://www.w3.org/2000/svg';

function svgCreate(w, h) {
  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  return svg;
}

function svgEl(tag, attrs) {
  var el = document.createElementNS(SVG_NS, tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// ── Module State ──────────────────────────────────
var _el = null;
var _params = null;
var _activeTab = 'open';
var _selected = {};
var _allOrders = [];
var _salesData = null;
var _clockedInAt = null;
var _expandedCard = null;
var _expandOrigin = null;
var _tipoutRate = 0;

// New panel data
var _salesByCategory = [];
var _tableStats = null;
var _checkoutStatus = null;
var _drillCategory = null;  // for item-level drill in pareto
var _tipsFilter = 'unadjusted'; // 'all' | 'adjusted' | 'unadjusted'

// DOM refs for partial re-renders
var _centerGrid = null;
var _opsPanel = null;
var _drillEl = null;

// ── Helpers ───────────────────────────────────────

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

function ordersByTab(tab) {
  return _allOrders.filter(function(o) {
    if (tab === 'open') return o.status === 'open';
    if (tab === 'closed') return o.status === 'closed' || o.status === 'paid';
    if (tab === 'void') return o.status === 'voided';
    return false;
  });
}

function computeTopSeller() {
  var counts = {};
  _allOrders.forEach(function(o) {
    (o.items || []).forEach(function(item) {
      var n = item.name || 'Unknown';
      counts[n] = (counts[n] || 0) + (item.quantity || 1);
    });
  });
  var best = '--', bestN = 0;
  Object.keys(counts).forEach(function(k) {
    if (counts[k] > bestN) { best = k; bestN = counts[k]; }
  });
  return best;
}

function fmtClockIn() {
  if (!_clockedInAt) return '--';
  var d = new Date(_clockedInAt);
  var h = d.getHours(), ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return h + ':' + String(d.getMinutes()).padStart(2, '0') + ampm;
}

function fmtHours() {
  if (!_clockedInAt) return '--';
  var ms = Date.now() - new Date(_clockedInAt).getTime();
  return Math.floor(ms / 3600000) + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm';
}

// ── Card UI Builders ──────────────────────────────

var CHROME = T.numpadChassis;
var CARD_SHADOW = 'inset 0 2px 0 rgba(255,255,255,0.08),inset 0 -2px 0 rgba(0,0,0,0.50),inset 2px 0 0 rgba(255,255,255,0.04),inset -2px 0 0 rgba(0,0,0,0.25),inset 0 4px 8px rgba(0,0,0,0.40),0 2px 8px rgba(0,0,0,0.50)';

function applyCardStyle(el) {
  el.style.cssText = 'background:' + T.bgDark + ';border:5px solid ' + CHROME + ';display:flex;flex-direction:column;flex:0 0 auto;box-shadow:' + CARD_SHADOW + ';';
}

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
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;padding:2px 8px;min-width:0;';
  var l = document.createElement('span');
  l.style.cssText = 'font-family:' + T.fb + ';font-size:22px;color:' + T.textPrimary + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex-shrink:1;';
  l.textContent = label;
  var v = document.createElement('span');
  v.style.cssText = 'font-family:' + T.fb + ';font-size:22px;color:' + color + ';font-weight:bold;white-space:nowrap;flex-shrink:0;';
  v.textContent = value;
  row.appendChild(l);
  row.appendChild(v);
  return row;
}

function expandBtn(cardKey, cardEl) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:flex-end;padding:4px 8px 2px;';
  row.appendChild(buildButton('>>>', {
    fill: T.darkBtn, color: T.mint, fontSize: '14px', fontFamily: T.fb,
    width: 48, height: 24,
    onTap: function() {
      _expandOrigin = cardEl.getBoundingClientRect();
      _expandedCard = cardKey;
      showDrillDown();
    },
  }));
  return row;
}

// ── Data Fetching ─────────────────────────────────

function fetchAllData(emp) {
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
    _salesData = results[0];
    _allOrders = Array.isArray(results[1]) ? results[1] : [];
    var staff = (results[2].staff || []);
    for (var i = 0; i < staff.length; i++) {
      if (staff[i].employee_id === emp.id) {
        _clockedInAt = staff[i].clocked_in_at;
        break;
      }
    }
    var rules = Array.isArray(results[3]) ? results[3] : [];
    _tipoutRate = rules.reduce(function(sum, r) { return sum + (r.percentage || 0); }, 0) / 100;
    _salesByCategory = Array.isArray(results[4]) ? results[4] : [];
    _tableStats = results[5] || { guestCount: 0, tableCount: 0, checkAvg: 0, avgTurnMinutes: 0, byPartySize: [] };
    _checkoutStatus = results[6] || { openChecks: 0, unadjustedTips: 0 };
  });
}

function refreshData(emp) {
  fetchAllData(emp).then(function() { if (_el) renderScene(); });
}

var _onTransactionalClosed = null;

// ═══════════════════════════════════════════════════
//  WIN98 DITHER PATTERN (SVG)
//  Top band: white checkerboard 55% opacity, 25% of bar height
//  Bottom band: black checkerboard 55% opacity, 25% of bar height
// ═══════════════════════════════════════════════════

function injectDitherDefs(svg) {
  var defs = svg.querySelector('defs') || svgEl('defs', {});
  if (!svg.querySelector('defs')) svg.appendChild(defs);

  // White checkerboard highlight
  if (!svg.getElementById('dither-hi')) {
    var phi = svgEl('pattern', { id: 'dither-hi', patternUnits: 'userSpaceOnUse', width: '2', height: '2' });
    phi.appendChild(svgEl('rect', { width: '2', height: '2', fill: 'transparent' }));
    phi.appendChild(svgEl('rect', { x: '0', y: '0', width: '1', height: '1', fill: 'white', opacity: '0.55' }));
    phi.appendChild(svgEl('rect', { x: '1', y: '1', width: '1', height: '1', fill: 'white', opacity: '0.55' }));
    defs.appendChild(phi);
  }

  // Black checkerboard shadow
  if (!svg.getElementById('dither-lo')) {
    var plo = svgEl('pattern', { id: 'dither-lo', patternUnits: 'userSpaceOnUse', width: '2', height: '2' });
    plo.appendChild(svgEl('rect', { width: '2', height: '2', fill: 'transparent' }));
    plo.appendChild(svgEl('rect', { x: '0', y: '0', width: '1', height: '1', fill: 'black', opacity: '0.55' }));
    plo.appendChild(svgEl('rect', { x: '1', y: '1', width: '1', height: '1', fill: 'black', opacity: '0.55' }));
    defs.appendChild(plo);
  }
}

// ═══════════════════════════════════════════════════
//  SALES OVERVIEW — Horizontal Pareto Chart
// ═══════════════════════════════════════════════════

function drawParetoChart(container, data, opts) {
  var W = opts.width || 280;
  var H = opts.height || 180;
  var padL = 6, padR = 55, padT = 6, padB = 6;
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

  var svg = svgCreate(W, H);
  injectDitherDefs(svg);

  // Max revenue
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
    var catColor = d.color || T.mint;

    var y = padT + gap + i * (barH + gap);
    var trackW = chartW;
    var barW = (tot / maxRev) * trackW;
    var cashW = tot > 0 ? (cash / tot) * barW : 0;
    var cardW = barW - cashW;

    // CASH segment with dither
    if (cashW > 0) {
      // Solid base
      svg.appendChild(svgEl('rect', { x: padL, y: y, width: cashW, height: barH, fill: catColor }));
      // Dither highlight band (top 25%)
      var hiH = Math.round(barH * 0.25);
      svg.appendChild(svgEl('rect', { x: padL, y: y, width: cashW, height: hiH, fill: 'url(#dither-hi)' }));
      // Dither shadow band (bottom 25%)
      svg.appendChild(svgEl('rect', { x: padL, y: y + barH - hiH, width: cashW, height: hiH, fill: 'url(#dither-lo)' }));
    }

    // Divider between CASH and CARD
    if (cashW > 0 && cardW > 0) {
      svg.appendChild(svgEl('line', { x1: padL + cashW, y1: y, x2: padL + cashW, y2: y + barH, stroke: T.bgDark, 'stroke-width': '1.5' }));
    }

    // CARD segment — solid, no dither
    if (cardW > 0) {
      svg.appendChild(svgEl('rect', { x: padL + cashW, y: y, width: cardW, height: barH, fill: catColor }));
    }

    // Category label inside bar
    var labelText = d.category || '';
    var labelFits = barW > 60;
    if (labelFits) {
      // Dark bg box inside bar
      var lbl = svgEl('text', { x: padL + 4, y: y + barH / 2 + 5, fill: '#ffffff', 'font-size': '12', 'font-family': T.fb, 'font-weight': 'bold' });
      lbl.textContent = labelText;
      // Background rect
      svg.appendChild(svgEl('rect', { x: padL + 2, y: y + barH / 2 - 8, width: labelText.length * 7 + 6, height: 16, fill: T.bgDark, opacity: '0.82' }));
      svg.appendChild(lbl);
    } else {
      // Float label outside
      var lbl = svgEl('text', { x: padL + barW + 3, y: y + barH / 2 + 5, fill: catColor, 'font-size': '11', 'font-family': T.fb, 'font-weight': 'bold' });
      lbl.textContent = labelText;
      svg.appendChild(lbl);
    }

    // Revenue value — gold, right-aligned
    var revLabel = svgEl('text', { x: W - 4, y: y + barH / 2 + 5, fill: T.gold, 'font-size': '12', 'font-family': T.fb, 'font-weight': 'bold', 'text-anchor': 'end' });
    revLabel.textContent = fmt(tot);
    svg.appendChild(revLabel);

    // Cumulative % point
    cumulative += tot;
    var pct = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;
    var ptX = padL + (pct / 100) * trackW;
    var ptY = y + barH;
    linePoints.push({ x: ptX, y: ptY, pct: pct });
  }

  // Gold cumulative % line
  if (linePoints.length > 1) {
    var pathD = 'M ' + padL + ' ' + (padT + gap);
    for (var i = 0; i < linePoints.length; i++) {
      pathD += ' L ' + linePoints[i].x + ' ' + linePoints[i].y;
    }
    svg.appendChild(svgEl('path', { d: pathD, fill: 'none', stroke: T.gold, 'stroke-width': '1.5' }));

    // Square data points + % labels
    for (var i = 0; i < linePoints.length; i++) {
      var pt = linePoints[i];
      svg.appendChild(svgEl('rect', { x: pt.x - 3, y: pt.y - 3, width: 6, height: 6, fill: T.gold }));
      if (i === linePoints.length - 1 || Math.abs(pt.pct - (linePoints[i - 1] || { pct: 0 }).pct) > 8) {
        var pctLbl = svgEl('text', { x: pt.x + 6, y: pt.y + 4, fill: T.gold, 'font-size': '10', 'font-family': T.fb });
        pctLbl.textContent = Math.round(pt.pct) + '%';
        svg.appendChild(pctLbl);
      }
    }
  }

  container.appendChild(svg);
}

// ═══════════════════════════════════════════════════
//  TABLE STATISTICS — Horizontal Histogram
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
  var W = 280, H = 130;
  var padL = 36, padR = 50, padT = 6, padB = 20;
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;
  var n = data.length;

  var svg = svgCreate(W, H);
  injectDitherDefs(svg);

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
    svg.appendChild(svgEl('line', { x1: gx, y1: padT, x2: gx, y2: H - padB, stroke: T.bg3, 'stroke-width': '1', 'stroke-dasharray': '3,3' }));
    if (g > 0) {
      var gVal = svgEl('text', { x: gx, y: H - 4, fill: T.gold, 'font-size': '10', 'font-family': T.fb, 'text-anchor': 'middle' });
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
    svg.appendChild(svgEl('text', { x: padL - 6, y: y + barH / 2 + 5, fill: '#ffffff', 'font-size': '13', 'font-family': T.fb, 'font-weight': 'bold', 'text-anchor': 'end' })).textContent = sizeLabel;

    // Bar
    svg.appendChild(svgEl('rect', { x: padL, y: y, width: Math.max(barW, 2), height: barH, fill: T.lime }));

    // Dither highlight + shadow
    var hiH = Math.round(barH * 0.25);
    svg.appendChild(svgEl('rect', { x: padL, y: y, width: Math.max(barW, 2), height: hiH, fill: 'url(#dither-hi)' }));
    svg.appendChild(svgEl('rect', { x: padL, y: y + barH - hiH, width: Math.max(barW, 2), height: hiH, fill: 'url(#dither-lo)' }));

    // Bevel: white top edge, black bottom edge
    svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: padL + barW, y2: y, stroke: 'white', 'stroke-width': '1', opacity: '0.4' }));
    svg.appendChild(svgEl('line', { x1: padL, y1: y + barH, x2: padL + barW, y2: y + barH, stroke: 'black', 'stroke-width': '1', opacity: '0.6' }));

    // Count badge inside bar
    if (barW > 30) {
      var badgeW = d.tableCount.toString().length * 8 + 16;
      svg.appendChild(svgEl('rect', { x: padL + 3, y: y + barH / 2 - 7, width: badgeW, height: 14, fill: T.bgDark, opacity: '0.85' }));
      svg.appendChild(svgEl('text', { x: padL + 6, y: y + barH / 2 + 4, fill: '#ffffff', 'font-size': '11', 'font-family': T.fb })).textContent = '\u00d7' + d.tableCount;
    }

    // Avg value — gold, right of bar
    svg.appendChild(svgEl('text', { x: padL + Math.max(barW, 2) + 4, y: y + barH / 2 + 5, fill: T.gold, 'font-size': '12', 'font-family': T.fb, 'font-weight': 'bold' })).textContent = fmt(d.avgCheck);
  }

  // Axis labels
  svg.appendChild(svgEl('text', { x: 3, y: H / 2, fill: '#ffffff', 'font-size': '9', 'font-family': T.fb, transform: 'rotate(-90,' + 3 + ',' + H / 2 + ')', 'text-anchor': 'middle' })).textContent = 'PARTY SIZE';
  svg.appendChild(svgEl('text', { x: padL + chartW / 2, y: H - 1, fill: T.gold, 'font-size': '9', 'font-family': T.fb, 'text-anchor': 'middle' })).textContent = 'AVG CHECK';

  container.appendChild(svg);
}

// ═══════════════════════════════════════════════════
//  LEFT COLUMN — Sales Overview + Table Statistics
// ═══════════════════════════════════════════════════

function buildLeftColumn(emp) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';

  // ── SALES OVERVIEW card ──
  var salesCard = document.createElement('div');
  applyCardStyle(salesCard);
  salesCard.style.flex = '1';
  salesCard.style.minHeight = '0';
  salesCard.appendChild(buildCardHeader('SALES OVERVIEW'));

  var salesChart = document.createElement('div');
  salesChart.style.cssText = 'flex:1;min-height:0;overflow:hidden;background:' + T.bgDark + ';padding:4px;';
  drawParetoChart(salesChart, _salesByCategory, { width: 280, height: 180 });
  salesCard.appendChild(salesChart);
  salesCard.appendChild(expandBtn('sales', salesCard));
  col.appendChild(salesCard);

  // ── TABLE STATISTICS card ──
  var tablesCard = document.createElement('div');
  applyCardStyle(tablesCard);
  tablesCard.style.flex = '1';
  tablesCard.style.minHeight = '0';
  tablesCard.appendChild(buildCardHeader('TABLE STATISTICS'));

  // Stat row above chart
  var ts = _tableStats || {};
  var statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:flex;justify-content:space-around;padding:4px 6px;flex-shrink:0;';
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
    sv.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + si.color + ';font-weight:bold;';
    sv.textContent = si.value;
    var sl = document.createElement('div');
    sl.style.cssText = 'font-family:' + T.fb + ';font-size:10px;color:' + T.mutedText + ';letter-spacing:1px;';
    sl.textContent = si.label;
    sc.appendChild(sv);
    sc.appendChild(sl);
    statsRow.appendChild(sc);
  }
  tablesCard.appendChild(statsRow);

  // Mint rule
  var rule = document.createElement('div');
  rule.style.cssText = 'height:1px;background:' + T.mint + ';margin:0 6px;flex-shrink:0;';
  tablesCard.appendChild(rule);

  // Histogram
  var histChart = document.createElement('div');
  histChart.style.cssText = 'flex:1;min-height:0;overflow:hidden;background:' + T.bgDark + ';padding:4px;';
  drawTableHistogram(histChart, _tableStats);
  tablesCard.appendChild(histChart);
  tablesCard.appendChild(expandBtn('tables', tablesCard));
  col.appendChild(tablesCard);

  return col;
}

// ═══════════════════════════════════════════════════
//  CENTER COLUMN — Tabs + Check Grid + Ops Panel
// ═══════════════════════════════════════════════════

function buildCenterColumn(emp) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;background:' + T.bgDark + ';border:5px solid ' + CHROME + ';box-shadow:' + CARD_SHADOW + ';';

  // ── Check Grid ──
  var gridFrame = document.createElement('div');
  gridFrame.style.cssText = 'flex:1;overflow:hidden;margin:8px;border:2px solid ' + CHROME + ';';
  _centerGrid = document.createElement('div');
  _centerGrid.style.cssText = 'width:100%;height:100%;overflow-y:auto;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;box-sizing:border-box;';
  gridFrame.appendChild(_centerGrid);
  col.appendChild(gridFrame);

  // ── Tab Bar (below grid) ──
  var tabKeys = ['open', 'closed', 'void'];
  var tabLabels = ['OPEN', 'CLOSED', 'VOID'];
  var tabEls = [];

  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;flex-shrink:0;border-top:1px solid ' + T.border + ';';

  for (var t = 0; t < tabKeys.length; t++) {
    (function(key, label) {
      var tab = document.createElement('div');
      tab.style.cssText = 'flex:1;text-align:center;padding:6px 0;cursor:pointer;font-family:' + T.fh + ';font-size:16px;letter-spacing:2px;user-select:none;';
      applyTabStyle(tab, key === _activeTab);
      tab.textContent = label;
      tab.addEventListener('pointerup', function() {
        if (key === _activeTab) return;
        _activeTab = key;
        _selected = {};
        for (var i = 0; i < tabEls.length; i++) applyTabStyle(tabEls[i], tabKeys[i] === _activeTab);
        renderGrid(emp);
        renderOpsPanel(emp);
      });
      tabEls.push(tab);
      tabBar.appendChild(tab);
    })(tabKeys[t], tabLabels[t]);
  }
  col.appendChild(tabBar);

  // ── CHECK OPERATION Panel ──
  _opsPanel = document.createElement('div');
  _opsPanel.style.cssText = 'flex-shrink:0;border-top:1px solid ' + T.border + ';background:' + T.bg + ';';
  col.appendChild(_opsPanel);

  renderGrid(emp);
  renderOpsPanel(emp);
  return col;
}

function applyTabStyle(el, active) {
  if (active) {
    el.style.background = T.mint;
    el.style.color = T.bgDark;
  } else {
    el.style.background = T.bgDark;
    el.style.color = T.mutedText;
  }
}

// ── Grid Rendering ────────────────────────────────

function renderGrid(emp) {
  _centerGrid.innerHTML = '';
  var orders = ordersByTab(_activeTab);

  if (orders.length === 0 && _activeTab !== 'open') {
    var empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px 0;font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';';
    empty.textContent = _activeTab === 'closed' ? 'No closed checks' : 'No voided checks';
    _centerGrid.appendChild(empty);
    return;
  }

  for (var i = 0; i < orders.length; i++) {
    _centerGrid.appendChild(buildCheckTile(orders[i], emp));
  }

  // + NEW CHECK tile (OPEN tab only)
  if (_activeTab === 'open') {
    var newTile = document.createElement('div');
    newTile.style.cssText = 'border:2px dashed ' + CHROME + ';display:flex;align-items:center;justify-content:center;min-height:86px;cursor:pointer;user-select:none;box-sizing:border-box;';
    var plus = document.createElement('div');
    plus.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + CHROME + ';';
    plus.textContent = '+';
    newTile.appendChild(plus);
    newTile.addEventListener('pointerup', function() {
      SceneManager.mountWorking('order-entry', {
        mode: 'service', pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
      });
    });
    _centerGrid.appendChild(newTile);
  }
}

// ── Check Tile ────────────────────────────────────

function buildCheckTile(order, emp) {
  var isOpen = _activeTab === 'open';
  var isClosed = _activeTab === 'closed';
  var isVoid = _activeTab === 'void';

  var tile = document.createElement('div');
  tile.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + CHROME + ';padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-height:86px;cursor:pointer;user-select:none;box-sizing:border-box;';
  if (isClosed) tile.style.opacity = '0.7';
  if (isVoid) { tile.style.opacity = '0.5'; tile.style.cursor = 'default'; }

  // C-00# line
  var numColor = isOpen ? T.mint : (isClosed ? T.electricPink : T.vermillion);
  var num = document.createElement('div');
  num.style.cssText = 'font-family:' + T.fh + ';font-size:22px;color:' + numColor + ';';
  num.textContent = checkNum(order);
  num.dataset.role = 'num';
  tile.appendChild(num);

  // Customer name (hide if absent)
  if (order.customer_name) {
    var name = document.createElement('div');
    name.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';';
    name.textContent = order.customer_name;
    name.dataset.role = 'name';
    tile.appendChild(name);
  }

  // Item count
  var count = document.createElement('div');
  count.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.textPrimary + ';';
  count.textContent = 'x' + itemCount(order);
  count.dataset.role = 'count';
  tile.appendChild(count);

  // Total
  var total = document.createElement('div');
  total.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.gold + ';font-weight:bold;';
  total.textContent = fmt(order.total || order.subtotal || 0);
  total.dataset.role = 'total';
  tile.appendChild(total);

  // ── Interaction by tab ──
  if (isOpen) {
    if (_selected[order.order_id]) applyTileSelected(tile, true);
    tile.addEventListener('pointerup', function() {
      var id = order.order_id;
      if (_selected[id]) {
        delete _selected[id];
        applyTileSelected(tile, false);
      } else {
        _selected[id] = order;
        applyTileSelected(tile, true);
      }
      renderOpsPanel(emp);
    });
  } else if (isClosed) {
    tile.addEventListener('pointerup', function() {
      SceneManager.interrupt('sl-reopen-confirm', {
        onConfirm: function() {
          fetch('/api/v1/orders/' + order.order_id + '/reopen', { method: 'POST' })
            .then(function(r) {
              if (r.ok) { showToast('Check reopened', { bg: T.goGreen }); refreshData(emp); }
              else { showToast('Reopen failed', { bg: T.red }); }
            }).catch(function() { showToast('Reopen failed', { bg: T.red }); });
        },
        onCancel: function() {},
        params: { checkLabel: checkNum(order) },
      });
    });
  }
  // Void tab: read-only — no listener
  return tile;
}

function applyTileSelected(tile, selected) {
  if (selected) {
    tile.style.background = T.mint;
    for (var i = 0; i < tile.children.length; i++) tile.children[i].style.color = T.bgDark;
  } else {
    tile.style.background = T.bgDark;
    for (var i = 0; i < tile.children.length; i++) {
      var child = tile.children[i];
      var role = child.dataset.role;
      if (role === 'num') child.style.color = T.mint;
      else if (role === 'name') child.style.color = T.mutedText;
      else if (role === 'count') child.style.color = T.textPrimary;
      else if (role === 'total') child.style.color = T.gold;
    }
  }
}

// ── Operations Panel ──────────────────────────────

function renderOpsPanel(emp) {
  _opsPanel.innerHTML = '';
  _opsPanel.appendChild(buildCardHeader('CHECK OPERATION'));

  if (_activeTab !== 'open') return;
  var ids = Object.keys(_selected);
  if (ids.length === 0) return;

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px 10px 8px;';
  var isSingle = ids.length === 1;

  if (isSingle) {
    var order = _selected[ids[0]];
    grid.appendChild(buildButton('EDIT', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.mountWorking('order-entry', {
          mode: 'service', pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
          recallOrderId: order.order_id,
        });
      },
    }));
    grid.appendChild(buildButton('PRINT', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        fetch('/api/v1/print/receipt/' + order.order_id, { method: 'POST' })
          .then(function() { showToast('Print sent', { bg: T.goGreen }); })
          .catch(function() { showToast('Print failed', { bg: T.red }); });
      },
    }));
    grid.appendChild(buildButton('TRANSFER', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-transfer-choice', {
          onConfirm: function(choice) {
            if (choice === 'internal') {
              SceneManager.openTransactional('sl-internal-transfer', { checks: [order], emp: emp });
            } else {
              showToast('External transfer — not yet wired', { bg: T.gold });
            }
          },
          onCancel: function() {},
        });
      },
    }));
    var voidBtn = buildButton('VOID', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-void-gate', {
          onConfirm: function() {
            SceneManager.interrupt('void-pin', {
              onConfirm: function(mgr) {
                fetch('/api/v1/orders/' + order.order_id + '/void', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason: 'Voided from server landing', approved_by: mgr.id || 'manager' }),
                }).then(function(r) {
                  if (r.ok) { showToast('Check voided', { bg: T.goGreen }); _selected = {}; refreshData(emp); }
                  else { showToast('Void failed', { bg: T.red }); }
                }).catch(function() { showToast('Void failed', { bg: T.red }); });
              },
              onCancel: function() {},
            });
          },
          onCancel: function() {},
          params: { message: 'Void ' + checkNum(order) + '? This is destructive.' },
        });
      },
    });
    voidBtn.style.border = '2px solid ' + T.vermillion;
    grid.appendChild(voidBtn);
  } else {
    // Multi-select buttons
    grid.appendChild(buildButton('MERGE', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-merge-choice', {
          onConfirm: function(mode) {
            showToast('Merge (' + mode + ') — not yet wired', { bg: T.gold });
          },
          onCancel: function() {},
          params: { count: ids.length },
        });
      },
    }));
    grid.appendChild(buildButton('PRINT ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        ids.forEach(function(id) { fetch('/api/v1/print/receipt/' + id, { method: 'POST' }).catch(function() {}); });
        showToast('Print sent for ' + ids.length + ' checks', { bg: T.goGreen });
      },
    }));
    grid.appendChild(buildButton('TRANSFER ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        var selectedOrders = ids.map(function(id) { return _selected[id]; });
        SceneManager.interrupt('sl-transfer-choice', {
          onConfirm: function(choice) {
            if (choice === 'internal') {
              SceneManager.openTransactional('sl-internal-transfer', { checks: selectedOrders, emp: emp });
            } else {
              showToast('External transfer — not yet wired', { bg: T.gold });
            }
          },
          onCancel: function() {},
        });
      },
    }));
    var voidAllBtn = buildButton('VOID ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-void-gate', {
          onConfirm: function() {
            SceneManager.interrupt('void-pin', {
              onConfirm: function(mgr) {
                Promise.all(ids.map(function(id) {
                  return fetch('/api/v1/orders/' + id + '/void', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: 'Batch voided', approved_by: mgr.id || 'manager' }),
                  });
                })).then(function() {
                  showToast(ids.length + ' checks voided', { bg: T.goGreen }); _selected = {}; refreshData(emp);
                }).catch(function() { showToast('Void failed', { bg: T.red }); });
              },
              onCancel: function() {},
            });
          },
          onCancel: function() {},
          params: { message: 'Void ' + ids.length + ' checks? This is destructive.' },
        });
      },
    });
    voidAllBtn.style.border = '2px solid ' + T.vermillion;
    grid.appendChild(voidAllBtn);
  }
  _opsPanel.appendChild(grid);
}

// ═══════════════════════════════════════════════════
//  RIGHT COLUMN — Tips Panel (top) + Checkout Panel (bottom)
// ═══════════════════════════════════════════════════

function getUnadjustedChecks() {
  return (_salesData && _salesData.checks || []).filter(function(c) {
    return (c.status === 'closed') && !c.adjusted;
  });
}

function getClosedChecks() {
  return (_salesData && _salesData.checks || []).filter(function(c) {
    return c.status === 'closed';
  });
}

function buildRightColumn(emp) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';
  var d = _salesData || {};
  var cs = _checkoutStatus || {};

  // ═══ TIPS PANEL (top) ═══
  var tipsCard = document.createElement('div');
  applyCardStyle(tipsCard);
  tipsCard.style.flex = '1';
  tipsCard.style.minHeight = '0';
  tipsCard.appendChild(buildCardHeader('TIPS'));

  var tipsBody = document.createElement('div');
  tipsBody.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0;padding:4px 0;';

  // Stat rows
  tipsBody.appendChild(statRow('Total Tips:', fmt(d.total_tips || 0), T.gold));

  // Tip Out row — tap triggers manager PIN gate
  var tipOut = (d.total_tips || 0) * _tipoutRate;
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
            }).then(function() {
              showToast('Tip out updated', { bg: T.goGreen });
              refreshData(emp);
            }).catch(function() {
              showToast('Tip out update failed', { bg: T.red });
            });
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

  // Thin mint rule
  var tipRule = document.createElement('div');
  tipRule.style.cssText = 'height:1px;background:' + T.mint + ';margin:4px 8px;flex-shrink:0;';
  tipsBody.appendChild(tipRule);

  // Unadjusted check list — scrollable
  var unadjChecks = getUnadjustedChecks();
  var checkList = document.createElement('div');
  checkList.style.cssText = 'flex:1;min-height:0;overflow-y:auto;padding:2px 8px;';

  if (unadjChecks.length === 0) {
    var noChecks = document.createElement('div');
    noChecks.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.mutedText + ';text-align:center;padding:10px;';
    noChecks.textContent = 'All tips adjusted';
    checkList.appendChild(noChecks);
  } else {
    for (var i = 0; i < unadjChecks.length; i++) {
      (function(check) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;padding:3px 0;cursor:pointer;';
        var chkLabel = document.createElement('span');
        chkLabel.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mint + ';';
        chkLabel.textContent = check.checkLabel || 'CHK';
        var amtLabel = document.createElement('span');
        amtLabel.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';font-weight:bold;';
        amtLabel.textContent = fmt(check.amount || 0);
        row.appendChild(chkLabel);
        row.appendChild(amtLabel);

        // Tap → numpad interrupt for tip amount
        row.addEventListener('pointerup', function() {
          SceneManager.interrupt('sl-tip-numpad', {
            onConfirm: function(tipVal) {
              if (!check.paymentId) {
                showToast('No card payment to adjust', { bg: T.gold });
                return;
              }
              fetch('/api/v1/orders/' + check.checkId + '/adjust-tip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_id: check.paymentId, tip_amount: tipVal }),
              }).then(function(r) {
                if (r.ok) { showToast('Tip adjusted', { bg: T.goGreen }); refreshData(emp); }
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
  tipsCard.appendChild(tipsBody);
  tipsCard.appendChild(expandBtn('tips', tipsCard));
  col.appendChild(tipsCard);

  // ═══ CHECKOUT PANEL (bottom) ═══
  var coCard = document.createElement('div');
  applyCardStyle(coCard);
  coCard.style.flexShrink = '0';
  coCard.appendChild(buildCardHeader('CHECKOUT'));

  var coBody = document.createElement('div');
  coBody.style.cssText = 'padding:8px;display:flex;flex-direction:column;gap:6px;';

  // Status: OPEN CHECKS
  var openCount = cs.openChecks || 0;
  var openRow = document.createElement('div');
  openRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid ' + (openCount > 0 ? T.vermillion : T.bgDark) + ';';
  var openIcon = document.createElement('span');
  openIcon.style.cssText = 'font-size:14px;';
  openIcon.textContent = openCount > 0 ? '\u2716' : '\u2714';
  openIcon.style.color = openCount > 0 ? T.vermillion : T.goGreen;
  var openLabel = document.createElement('span');
  openLabel.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + (openCount > 0 ? T.vermillion : T.textPrimary) + ';';
  openLabel.textContent = openCount + ' OPEN CHECK' + (openCount !== 1 ? 'S' : '');
  openRow.appendChild(openIcon);
  openRow.appendChild(openLabel);
  coBody.appendChild(openRow);

  // Status: UNADJUSTED TIPS
  var unadjCount = cs.unadjustedTips || 0;
  var unadjColor = unadjCount > 0 ? '#ffdd44' : T.textPrimary;
  var unadjRow = document.createElement('div');
  unadjRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid ' + (unadjCount > 0 ? '#ffdd44' : T.bgDark) + ';';
  var unadjIcon = document.createElement('span');
  unadjIcon.style.cssText = 'font-size:14px;';
  unadjIcon.textContent = unadjCount > 0 ? '\u26a0' : '\u2714';
  unadjIcon.style.color = unadjCount > 0 ? '#ffdd44' : T.goGreen;
  var unadjLabel = document.createElement('span');
  unadjLabel.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + unadjColor + ';';
  unadjLabel.textContent = unadjCount + ' UNADJUSTED TIP' + (unadjCount !== 1 ? 'S' : '');
  unadjRow.appendChild(unadjIcon);
  unadjRow.appendChild(unadjLabel);
  coBody.appendChild(unadjRow);

  // CHECKOUT button — Style D via buildStyledButton
  var hasBlockers = openCount > 0;
  var hasWarnings = unadjCount > 0;
  var coBtnVariant = hasBlockers ? 'vermillion' : (hasWarnings ? 'gold' : 'mint');

  var coPair = buildStyledButton({ variant: coBtnVariant, size: 'lg', label: 'CHECKOUT', disabled: hasBlockers, onClick: function() {
    if (hasBlockers) return;
    if (hasWarnings) {
      SceneManager.interrupt('sl-checkout-gate', {
        onConfirm: function() {
          SceneManager.mountWorking('server-checkout', {
            pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
          });
        },
        onCancel: function() {},
        params: { reasons: [unadjCount + ' unadjusted tip' + (unadjCount !== 1 ? 's' : '')] },
      });
    } else {
      SceneManager.mountWorking('server-checkout', {
        pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
      });
    }
  }});
  coPair.wrap.style.width = '100%';
  coBody.appendChild(coPair.wrap);

  coCard.appendChild(coBody);
  col.appendChild(coCard);
  return col;
}

// ═══════════════════════════════════════════════════
//  DRILL-DOWN OVERLAY (>>> / <<<)
//  Pure CSS expand/collapse — not SceneManager overlay
// ═══════════════════════════════════════════════════

function showDrillDown() {
  if (_drillEl) _drillEl.remove();
  if (!_el) return;
  var d = _salesData || {};
  var rect = _expandOrigin;
  var parentRect = _el.getBoundingClientRect();
  var emp = (_params || {}).emp || _params || {};

  _drillEl = document.createElement('div');
  _drillEl.style.cssText = 'position:absolute;background:' + T.bgDark + ';border:5px solid ' + CHROME + ';display:flex;flex-direction:column;overflow:hidden;z-index:5;transition:top 220ms ease-out,left 220ms ease-out,width 220ms ease-out,height 220ms ease-out;box-shadow:' + CARD_SHADOW + ';';

  // Start at card's position
  if (rect) {
    _drillEl.style.top = (rect.top - parentRect.top) + 'px';
    _drillEl.style.left = (rect.left - parentRect.left) + 'px';
    _drillEl.style.width = rect.width + 'px';
    _drillEl.style.height = rect.height + 'px';
  } else {
    _drillEl.style.top = '0'; _drillEl.style.left = '0';
    _drillEl.style.width = '100%'; _drillEl.style.height = '100%';
  }

  // Header
  var headerLabel = _expandedCard === 'sales' ? 'SALES OVERVIEW'
    : _expandedCard === 'tables' ? 'TABLE STATISTICS' : 'TIPS';
  _drillEl.appendChild(buildCardHeader(headerLabel));

  // Expanded content
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;padding:12px;overflow-y:auto;';

  if (_expandedCard === 'sales') {
    // Expanded Pareto — larger canvas, tap for drill
    var chartWrap = document.createElement('div');
    chartWrap.style.cssText = 'width:100%;';
    drawParetoChart(chartWrap, _salesByCategory, { width: 600, height: 350 });
    content.appendChild(chartWrap);

    // Summary stats below
    content.appendChild(statRow('Net Sales:', fmt(d.net_sales || 0), T.gold));
    content.appendChild(statRow('Cash Sales:', fmt(d.cash_total || 0), T.gold));
    content.appendChild(statRow('Card Sales:', fmt(d.card_total || 0), T.gold));
    content.appendChild(statRow('Discounts:', fmt(d.discount_total || 0), T.vermillion));

  } else if (_expandedCard === 'tables') {
    // Full check list: CHK# · GUESTS · TOTAL · TURN TIME
    var allChecks = (_salesData && _salesData.checks || []).filter(function(c) { return c.status === 'closed'; });

    // Column header bar
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

  } else if (_expandedCard === 'tips') {
    // Filter tabs: ALL / ADJUSTED / UNADJUSTED
    var tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;margin-bottom:8px;flex-shrink:0;';
    var tabs = ['ALL', 'ADJUSTED', 'UNADJUSTED'];
    var tabKeys = ['all', 'adjusted', 'unadjusted'];

    function renderTipsList(filterKey) {
      var listEl = _drillEl.querySelector('[data-tiplist]');
      if (listEl) listEl.innerHTML = '';
      else return;
      var allChecks = getClosedChecks();
      var filtered = allChecks;
      if (filterKey === 'adjusted') filtered = allChecks.filter(function(c) { return c.adjusted; });
      if (filterKey === 'unadjusted') filtered = allChecks.filter(function(c) { return !c.adjusted; });

      for (var i = 0; i < filtered.length; i++) {
        (function(chk) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;cursor:pointer;border-bottom:1px solid ' + T.bg3 + ';';
          var lbl = document.createElement('span');
          lbl.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mint + ';';
          lbl.textContent = chk.checkLabel || 'CHK';
          var amt = document.createElement('span');
          amt.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';font-weight:bold;';
          amt.textContent = fmt(chk.amount || 0);
          var tip = document.createElement('span');
          tip.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + (chk.adjusted ? T.gold : T.mutedText) + ';';
          tip.textContent = chk.adjusted ? fmt(chk.tip || 0) : 'unadj';
          row.appendChild(lbl);
          row.appendChild(amt);
          row.appendChild(tip);

          if (!chk.adjusted) {
            row.addEventListener('pointerup', function() {
              SceneManager.interrupt('sl-tip-numpad', {
                onConfirm: function(tipVal) {
                  if (!chk.paymentId) { showToast('No card payment to adjust', { bg: T.gold }); return; }
                  fetch('/api/v1/orders/' + chk.checkId + '/adjust-tip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payment_id: chk.paymentId, tip_amount: tipVal }),
                  }).then(function(r) {
                    if (r.ok) { showToast('Tip adjusted', { bg: T.goGreen }); refreshData(emp); hideDrillDown(); }
                    else { showToast('Tip adjust failed', { bg: T.red }); }
                  }).catch(function() { showToast('Tip adjust failed', { bg: T.red }); });
                },
                onCancel: function() {},
                params: { title: 'TIP — ' + (chk.checkLabel || ''), checkAmount: chk.amount },
              });
            });
          }
          listEl.appendChild(row);
        })(filtered[i]);
      }
      if (filtered.length === 0) {
        var noData = document.createElement('div');
        noData.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mutedText + ';text-align:center;padding:20px;';
        noData.textContent = 'No checks';
        listEl.appendChild(noData);
      }
    }

    for (var t = 0; t < tabs.length; t++) {
      (function(idx) {
        var tab = document.createElement('div');
        tab.style.cssText = 'flex:1;text-align:center;padding:6px 0;cursor:pointer;font-family:' + T.fh + ';font-size:14px;letter-spacing:1px;';
        tab.textContent = tabs[idx];
        if (tabKeys[idx] === _tipsFilter) {
          tab.style.color = T.bgDark;
          tab.style.background = T.mint;
        } else {
          tab.style.color = T.mutedText;
          tab.style.background = T.bgDark;
        }
        tab.addEventListener('pointerup', function() {
          _tipsFilter = tabKeys[idx];
          // Re-style tabs
          var allTabs = tabBar.children;
          for (var j = 0; j < allTabs.length; j++) {
            if (j === idx) { allTabs[j].style.color = T.bgDark; allTabs[j].style.background = T.mint; }
            else { allTabs[j].style.color = T.mutedText; allTabs[j].style.background = T.bgDark; }
          }
          renderTipsList(tabKeys[idx]);
        });
        tabBar.appendChild(tab);
      })(t);
    }
    content.appendChild(tabBar);

    var listContainer = document.createElement('div');
    listContainer.dataset.tiplist = '1';
    content.appendChild(listContainer);

    // Initial render after DOM is in place
    setTimeout(function() { renderTipsList(_tipsFilter); }, 0);
  }

  _drillEl.appendChild(content);

  // <<< close button
  var closeRow = document.createElement('div');
  closeRow.style.cssText = 'display:flex;justify-content:flex-end;padding:6px 10px;flex-shrink:0;';
  closeRow.appendChild(buildButton('<<<', {
    fill: T.darkBtn, color: T.mint, fontSize: '14px', fontFamily: T.fb,
    width: 48, height: 24,
    onTap: function() { hideDrillDown(); },
  }));
  _drillEl.appendChild(closeRow);

  _el.appendChild(_drillEl);

  // Animate to full viewport on next frame
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      _drillEl.style.top = '0';
      _drillEl.style.left = '0';
      _drillEl.style.width = '100%';
      _drillEl.style.height = '100%';
    });
  });
}

function hideDrillDown() {
  if (!_drillEl) return;
  var el = _drillEl;

  if (_expandOrigin && _el) {
    var parentRect = _el.getBoundingClientRect();
    el.style.transition = 'top 220ms ease-in,left 220ms ease-in,width 220ms ease-in,height 220ms ease-in';
    el.style.top = (_expandOrigin.top - parentRect.top) + 'px';
    el.style.left = (_expandOrigin.left - parentRect.left) + 'px';
    el.style.width = _expandOrigin.width + 'px';
    el.style.height = _expandOrigin.height + 'px';
    el.addEventListener('transitionend', function() { el.remove(); }, { once: true });
  } else {
    el.remove();
  }
  _drillEl = null;
  _expandedCard = null;
  _expandOrigin = null;
}

// ═══════════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════════

function renderScene() {
  if (!_el || !_params) return;
  var emp = _params.emp || _params;

  _el.innerHTML = '';
  _el.style.cssText = 'width:100%;height:100%;background:' + T.bg + ';display:grid;grid-template-columns:25fr 50fr 25fr;gap:' + T.colGap + 'px;padding:' + T.scenePad + 'px;box-sizing:border-box;position:relative;';

  _el.appendChild(buildLeftColumn(emp));
  _el.appendChild(buildCenterColumn(emp));
  _el.appendChild(buildRightColumn(emp));
}

// ═══════════════════════════════════════════════════
//  SCENE REGISTRATION
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'server-landing',

  mount: function(container, params) {
    _el = container;
    _params = params;
    _activeTab = 'open';
    _selected = {};
    _allOrders = [];
    _salesData = null;
    _clockedInAt = null;
    _expandedCard = null;
    _drillEl = null;
    _tipoutRate = 0;

    var emp = params.emp || params;
    setSceneName(emp.name || 'Server');
    setHeaderBack({
      x: true,
      onClose: function() {
        SceneManager.closeAllTransactional();
        SceneManager.unmountWorking('server-landing');
        SceneManager.openGate('login');
      },
    });

    // Loading state
    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
    var loading = document.createElement('div');
    loading.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';';
    loading.textContent = 'Loading...';
    container.appendChild(loading);

    fetchAllData(emp).then(function() { renderScene(); });

    _onTransactionalClosed = function(e) {
      if (e && e.sceneName === 'tip-adjustment') refreshData(emp);
    };
    SceneManager.on('transactional:closed', _onTransactionalClosed);
  },

  unmount: function() {
    if (_onTransactionalClosed) {
      SceneManager.off('transactional:closed', _onTransactionalClosed);
      _onTransactionalClosed = null;
    }
    if (_drillEl) { _drillEl.remove(); _drillEl = null; }
    _el = null;
    _params = null;
    _selected = {};
    _allOrders = [];
    _salesData = null;
    _clockedInAt = null;
    _expandedCard = null;
    _tipoutRate = 0;
    _salesByCategory = [];
    _tableStats = null;
    _checkoutStatus = null;
    _drillCategory = null;
    _tipsFilter = 'unadjusted';
  },
});

// ═══════════════════════════════════════════════════
//  INTERRUPT SCENES
// ═══════════════════════════════════════════════════

// ── Reopen Confirmation ───────────────────────────

SceneManager.register({
  name: 'sl-reopen-confirm',
  mount: function(container, params) {
    var card = document.createElement('div');
    card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.frameInterruptDecision + ';padding:24px 32px;text-align:center;max-width:400px;';
    card.style.clipPath = chamfer(10);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
    msg.textContent = 'Reopen ' + (params.checkLabel || 'check') + '? Requires manager approval.';
    card.appendChild(msg);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
    btns.appendChild(buildButton('CONFIRM', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onConfirm(); },
    }));
    btns.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});

// ── Void Gate ─────────────────────────────────────

SceneManager.register({
  name: 'sl-void-gate',
  mount: function(container, params) {
    var card = document.createElement('div');
    card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.frameInterruptCritical + ';padding:24px 32px;text-align:center;max-width:420px;';
    card.style.clipPath = chamfer(10);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
    msg.textContent = params.message || 'Void requires manager approval.';
    card.appendChild(msg);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
    btns.appendChild(buildButton('CONFIRM', {
      fill: T.darkBtn, color: T.vermillion, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onConfirm(); },
    }));
    btns.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});

// ── Checkout Gate ─────────────────────────────────

SceneManager.register({
  name: 'sl-checkout-gate',
  mount: function(container, params) {
    var isWarning = !!(params.onConfirm); // warning mode allows proceeding
    var frameColor = isWarning ? T.frameInterruptDecision : T.frameInterruptCritical;

    var card = document.createElement('div');
    card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + frameColor + ';padding:24px 32px;text-align:center;max-width:420px;';
    card.style.clipPath = chamfer(10);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:12px;';
    msg.textContent = isWarning ? 'Warning:' : 'Cannot checkout:';
    card.appendChild(msg);

    var reasons = params.reasons || [];
    for (var i = 0; i < reasons.length; i++) {
      var line = document.createElement('div');
      line.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + (isWarning ? '#ffdd44' : T.vermillion) + ';margin-bottom:4px;';
      line.textContent = '\u2022 ' + reasons[i];
      card.appendChild(line);
    }

    var sp = document.createElement('div'); sp.style.height = '16px'; card.appendChild(sp);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';
    if (isWarning) {
      btns.appendChild(buildButton('PROCEED', {
        fill: T.darkBtn, color: T.gold, fontSize: T.fsBtn, width: 140, height: 44,
        onTap: function() { params.onConfirm(); },
      }));
    }
    btns.appendChild(buildButton(isWarning ? 'CANCEL' : 'OK', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});

// ── Manager Gate (Close Day) ──────────────────────

SceneManager.register({
  name: 'sl-manager-gate',
  mount: function(container, params) {
    var card = document.createElement('div');
    card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.frameInterruptDecision + ';padding:24px 32px;text-align:center;max-width:400px;';
    card.style.clipPath = chamfer(10);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
    msg.textContent = params.message || 'This action requires manager approval.';
    card.appendChild(msg);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
    btns.appendChild(buildButton('CONFIRM', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onConfirm(); },
    }));
    btns.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});

// ── Transfer Choice (Internal / External) ─────────

SceneManager.register({
  name: 'sl-transfer-choice',
  mount: function(container, params) {
    var card = document.createElement('div');
    card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.frameInterruptDecision + ';padding:24px 32px;text-align:center;max-width:400px;';
    card.style.clipPath = chamfer(10);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
    msg.textContent = 'Transfer type:';
    card.appendChild(msg);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
    btns.appendChild(buildButton('INTERNAL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 140, height: 44,
      onTap: function() { params.onConfirm('internal'); },
    }));
    btns.appendChild(buildButton('EXTERNAL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 140, height: 44,
      onTap: function() { params.onConfirm('external'); },
    }));
    card.appendChild(btns);

    var cancelRow = document.createElement('div');
    cancelRow.style.cssText = 'margin-top:12px;';
    cancelRow.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mutedText, fontSize: T.fsBtnSm, width: 100, height: 34,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(cancelRow);
    container.appendChild(card);
  },
  unmount: function() {},
});

// ── Merge Choice (As One / As Separate Seats) ─────

SceneManager.register({
  name: 'sl-merge-choice',
  mount: function(container, params) {
    var card = document.createElement('div');
    card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.frameInterruptDecision + ';padding:24px 32px;text-align:center;max-width:420px;';
    card.style.clipPath = chamfer(10);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:8px;';
    msg.textContent = 'Merge ' + (params.count || 0) + ' checks:';
    card.appendChild(msg);

    var hint = document.createElement('div');
    hint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';margin-bottom:16px;';
    hint.textContent = 'Source check numbers will be retired.';
    card.appendChild(hint);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';
    btns.appendChild(buildButton('AS ONE', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtnSm, width: 160, height: 44,
      onTap: function() { params.onConfirm('as_one'); },
    }));
    btns.appendChild(buildButton('AS SEPARATE SEATS', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtnSm, width: 160, height: 44,
      onTap: function() { params.onConfirm('as_separate'); },
    }));
    card.appendChild(btns);

    var cancelRow = document.createElement('div');
    cancelRow.style.cssText = 'margin-top:12px;';
    cancelRow.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mutedText, fontSize: T.fsBtnSm, width: 100, height: 34,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(cancelRow);
    container.appendChild(card);
  },
  unmount: function() {},
});

// ── Internal Transfer (Transactional stub) ────────

SceneManager.register({
  name: 'sl-internal-transfer',
  mount: function(container, params) {
    container.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;padding:' + T.scenePad + 'px;box-sizing:border-box;';

    // Header
    container.appendChild(buildCardHeader('INTERNAL TRANSFER'));

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;display:flex;gap:10px;overflow-x:auto;padding:10px 0;';

    // Render each source check as a column
    var checks = params.checks || [];
    for (var i = 0; i < checks.length; i++) {
      var order = checks[i];
      var col = document.createElement('div');
      col.style.cssText = 'flex:1;min-width:180px;background:' + T.bgDark + ';border:1px solid ' + CHROME + ';display:flex;flex-direction:column;overflow-y:auto;';
      col.style.clipPath = chamfer(6);

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

    // + NEW CHECK destination column
    var newCol = document.createElement('div');
    newCol.style.cssText = 'flex:1;min-width:180px;border:2px dashed ' + CHROME + ';display:flex;align-items:center;justify-content:center;';
    newCol.style.clipPath = chamfer(6);
    var newLabel = document.createElement('div');
    newLabel.style.cssText = 'font-family:' + T.fb + ';font-size:30px;color:' + CHROME + ';';
    newLabel.textContent = '+ NEW CHECK';
    newCol.appendChild(newLabel);
    body.appendChild(newCol);

    container.appendChild(body);

    // Bottom action bar
    var actionBar = document.createElement('div');
    actionBar.style.cssText = 'flex-shrink:0;display:flex;gap:10px;justify-content:flex-end;padding-top:8px;';
    actionBar.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 40,
      onTap: function() { SceneManager.closeTransactional('sl-internal-transfer'); },
    }));
    actionBar.appendChild(buildButton('CONFIRM', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 40,
      onTap: function() {
        showToast('Transfer — not yet wired to backend', { bg: T.gold });
        SceneManager.closeTransactional('sl-internal-transfer');
      },
    }));
    container.appendChild(actionBar);
  },
  unmount: function() {},
});

// ── Tip Numpad Interrupt ─────────────────────────
// Full-screen numpad for entering tip amount on a check
// Frame color: gold (decision)

function buildNumpadInterrupt(container, params, titlePrefix) {
  var card = document.createElement('div');
  card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.frameInterruptDecision + ';padding:20px 24px;text-align:center;max-width:360px;width:90%;';
  card.style.clipPath = chamfer(10);

  var title = document.createElement('div');
  title.style.cssText = 'font-family:' + T.fh + ';font-size:22px;color:' + T.mint + ';margin-bottom:8px;letter-spacing:1px;';
  title.textContent = params.title || titlePrefix || 'ENTER AMOUNT';
  card.appendChild(title);

  if (params.checkAmount) {
    var chkAmt = document.createElement('div');
    chkAmt.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.gold + ';margin-bottom:12px;';
    chkAmt.textContent = 'Check: ' + fmt(params.checkAmount);
    card.appendChild(chkAmt);
  }

  // Display
  var display = document.createElement('div');
  display.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';background:' + T.bgDark + ';padding:10px;margin-bottom:12px;min-height:52px;';
  display.textContent = '$0.00';
  card.appendChild(display);

  var buffer = '';
  function updateDisplay() {
    var cents = parseInt(buffer || '0', 10);
    var dollars = (cents / 100).toFixed(2);
    display.textContent = '$' + dollars;
  }

  // Numpad grid
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;';
  var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];
  for (var k = 0; k < keys.length; k++) {
    (function(key) {
      var btn = buildButton(key, {
        fill: key === 'CLR' ? T.darkBtn : T.darkBtn,
        color: key === 'CLR' ? T.vermillion : (key === 'DEL' ? T.gold : T.mint),
        fontSize: '22px', fontFamily: T.fb, height: 44,
        onTap: function() {
          if (key === 'CLR') { buffer = ''; }
          else if (key === 'DEL') { buffer = buffer.slice(0, -1); }
          else { if (buffer.length < 8) buffer += key; }
          updateDisplay();
        },
      });
      grid.appendChild(btn);
    })(keys[k]);
  }
  card.appendChild(grid);

  // Action buttons
  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';
  btns.appendChild(buildButton('CONFIRM', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
    onTap: function() {
      var cents = parseInt(buffer || '0', 10);
      var val = cents / 100;
      params.onConfirm(val);
    },
  }));
  btns.appendChild(buildButton('CANCEL', {
    fill: T.darkBtn, color: T.mutedText, fontSize: T.fsBtn, width: 130, height: 44,
    onTap: function() { params.onCancel(); },
  }));
  card.appendChild(btns);
  container.appendChild(card);
}

SceneManager.register({
  name: 'sl-tip-numpad',
  mount: function(container, params) {
    buildNumpadInterrupt(container, params, 'ENTER TIP');
  },
  unmount: function() {},
});

SceneManager.register({
  name: 'sl-tipout-numpad',
  mount: function(container, params) {
    buildNumpadInterrupt(container, params, 'TIP OUT AMOUNT');
  },
  unmount: function() {},
});
