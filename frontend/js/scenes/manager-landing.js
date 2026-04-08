// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Manager Landing Scene
//  3-column command center: Sales | Checks | Operations
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { CHART, createSVG, svgEl, drawBarChart, drawTrendLine, buildChartPanel } from '../chart-helpers.js';
import { DATA } from '../chart-colors.js';
import { PAT, GLOW, injectChartDefs } from '../chart-patterns.js';

// ── Module State ──────────────────────────────────
var _el = null;
var _params = null;
var _clockTimer = null;
var _expandedCard = null;
var _expandOrigin = null;
var _drillEl = null;

// Stub data — replaced by API in Chunk 9
var _salesData = null;
var _breakdownData = null;
var _heatmapData = null;

// Heatmap filter state
var _filteredServerId = null;
var _activeTab = 'open';
var _selected = {};
var _allOrders = [];

// Max tables threshold for full-intensity cell (configurable)
var HEATMAP_MAX_TABLES = 5;

// COB% escalation thresholds (configurable)
var COB_WARNING = 30;
var COB_CRITICAL = 35;

// DOM refs for partial re-renders
var _leftCol = null;
var _centerCol = null;
var _rightCol = null;
var _headerLabel = null;
var _heatmapEl = null;
var _centerGrid = null;
var _opsPanel = null;
var _checkHeader = null;

// Server palette — distinct from semantic colors (mint, gold, lime, etc.)
// Uses role colors + category colors that won't collide with UI semantics
var SERVER_PALETTE = [
  T.roles.server,     // #00aaff
  T.roles.busser,     // #cc44ff
  T.roles.bartender,  // #00ddaa
  T.roles.host,       // #ffee00
  T.roles.cook,       // #ff4499
  T.roles.manager,    // #ff8800
  T.catBeverages,     // #70a1ff
  T.catSauces,        // #ffa502
  T.catProteins,      // #ff4757
  T.lavender,         // #b48efa
  T.cyan,             // #33ffff
  T.sage,             // #6bc987
];
var _serverColorMap = {};

// ── Helpers ───────────────────────────────────────

function fmtDateTime() {
  var now = new Date();
  var mm = String(now.getMonth() + 1).padStart(2, '0');
  var dd = String(now.getDate()).padStart(2, '0');
  var yy = String(now.getFullYear()).slice(2);
  var h = now.getHours();
  var ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  var min = String(now.getMinutes()).padStart(2, '0');
  return mm + '/' + dd + '/' + yy + ' // ' + h + ':' + min + ampm;
}

function managerName() {
  if (!_params) return 'Manager';
  var emp = _params.emp || _params;
  return emp.name || emp.employeeName || 'Manager';
}

function updateHeaderLabel() {
  if (_headerLabel) {
    _headerLabel.textContent = fmtDateTime() + ' // ' + managerName();
  }
}

// ── Scene Header Bar ─────────────────────────────

function buildSceneHeader() {
  var bar = document.createElement('div');
  bar.style.cssText = 'height:34px;background:' + T.mint + ';display:flex;align-items:center;justify-content:space-between;padding:0 10px;flex-shrink:0;';
  bar.style.clipPath = chamfer(4);

  // Left: date // time // managerName
  _headerLabel = document.createElement('div');
  _headerLabel.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.bgDark + ';letter-spacing:1px;';
  updateHeaderLabel();
  bar.appendChild(_headerLabel);

  // Right: X button → returns to login
  var xPair = buildStyledButton(T.darkBtn);
  xPair.wrap.style.width = '36px';
  xPair.wrap.style.height = '24px';
  xPair.inner.style.fontFamily = T.fb;
  xPair.inner.style.fontSize = '16px';
  xPair.inner.style.color = T.mint;
  xPair.inner.textContent = 'X';
  xPair.wrap.addEventListener('pointerup', function() {
    SceneManager.closeAllTransactional();
    SceneManager.unmountWorking('manager-landing');
    SceneManager.openGate('login');
  });
  bar.appendChild(xPair.wrap);

  return bar;
}

// ── Stub Data ────────────────────────────────────

function loadStubData() {
  _salesData = {
    net_sales: 4872.50,
    avg_check: 38.25,
    active_checks: 7,
    total_covers: 42,
    labor_cob: 27.4,
  };
  _breakdownData = {
    categories: [
      { name: 'PIZZA', value: 1840.00 },
      { name: 'APPS', value: 920.50 },
      { name: 'SUBS', value: 685.00 },
      { name: 'SIDES', value: 412.00 },
      { name: 'DRINKS', value: 1015.00 },
    ],
    cash: 1462.50,
    card: 3410.00,
    hourly: [
      { label: '11a', value: 320 },
      { label: '12p', value: 780 },
      { label: '1p', value: 920 },
      { label: '2p', value: 640 },
      { label: '3p', value: 410 },
      { label: '4p', value: 520 },
      { label: '5p', value: 690 },
      { label: '6p', value: 592 },
    ],
  };
  _heatmapData = {
    hours: ['11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p'],
    current_hour: 5, // index into hours (4p)
    servers: [
      { id: 's1', name: 'Alex M.', live_tables: 3, cells: [0, 2, 3, 1, 0, 3, 2, 0] },
      { id: 's2', name: 'Jordan K.', live_tables: 2, cells: [1, 1, 2, 4, 3, 2, 0, 0] },
      { id: 's3', name: 'Sam R.', live_tables: 5, cells: [0, 3, 5, 4, 2, 5, 3, 1] },
      { id: 's4', name: 'Casey T.', live_tables: 1, cells: [2, 1, 0, 0, 1, 1, 0, 0] },
      { id: 's5', name: 'Riley W.', live_tables: 0, cells: [1, 2, 1, 0, 0, 0, 0, 0] },
    ],
  };

  // Assign palette colors to servers
  _serverColorMap = {};
  var servers = _heatmapData.servers;
  for (var i = 0; i < servers.length; i++) {
    _serverColorMap[servers[i].id] = SERVER_PALETTE[i % SERVER_PALETTE.length];
  }

  _allOrders = [
    { order_id: 'o1', check_number: 'C-001', server_id: 's1', server_name: 'Alex M.', customer_name: 'Table 4', status: 'open', items: [{name:'Margherita',quantity:2},{name:'Coke',quantity:1}], total: 42.50 },
    { order_id: 'o2', check_number: 'C-002', server_id: 's1', server_name: 'Alex M.', customer_name: 'Table 7', status: 'open', items: [{name:'Pepperoni',quantity:1}], total: 18.00 },
    { order_id: 'o3', check_number: 'C-003', server_id: 's2', server_name: 'Jordan K.', customer_name: 'Bar 1', status: 'open', items: [{name:'Wings',quantity:1},{name:'IPA',quantity:2}], total: 31.00 },
    { order_id: 'o4', check_number: 'C-004', server_id: 's3', server_name: 'Sam R.', customer_name: 'Table 12', status: 'open', items: [{name:'Meatball Sub',quantity:1},{name:'Fries',quantity:1}], total: 22.50 },
    { order_id: 'o5', check_number: 'C-005', server_id: 's3', server_name: 'Sam R.', customer_name: 'Table 9', status: 'open', items: [{name:'Caesar Salad',quantity:2}], total: 26.00 },
    { order_id: 'o6', check_number: 'C-006', server_id: 's2', server_name: 'Jordan K.', customer_name: 'Table 3', status: 'closed', items: [{name:'BBQ Chicken',quantity:1},{name:'Lager',quantity:2}], total: 38.00 },
    { order_id: 'o7', check_number: 'C-007', server_id: 's4', server_name: 'Casey T.', customer_name: 'Table 1', status: 'closed', items: [{name:'Hawaiian',quantity:1}], total: 16.50 },
    { order_id: 'o8', check_number: 'C-008', server_id: 's1', server_name: 'Alex M.', customer_name: 'Table 5', status: 'voided', items: [{name:'Garlic Knots',quantity:1}], total: 8.00 },
  ];
}

// ── Formatting ───────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Card UI Builders ─────────────────────────────

function buildCardHeader(label) {
  var bar = document.createElement('div');
  bar.style.cssText = 'background:' + T.mint + ';padding:5px 10px;flex-shrink:0;';
  bar.style.clipPath = chamfer(4);
  var txt = document.createElement('div');
  txt.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + T.bgDark + ';letter-spacing:2px;';
  txt.textContent = '// ' + label + ' //';
  bar.appendChild(txt);
  return bar;
}

function statRow(label, value, color) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;padding:2px 8px;';
  var l = document.createElement('span');
  l.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.textPrimary + ';';
  l.textContent = label;
  var v = document.createElement('span');
  v.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + color + ';font-weight:bold;';
  v.textContent = value;
  row.appendChild(l);
  row.appendChild(v);
  return row;
}

// ── Server Color Lookup ──────────────────────────

function serverColor(serverId) {
  return _serverColorMap[serverId] || SERVER_PALETTE[0];
}

// ── COB% Escalation ──────────────────────────────

function cobColor(pct) {
  if (pct >= COB_CRITICAL) return T.vermillion;
  if (pct >= COB_WARNING) return T.yellow;
  return T.lime;
}

function cobFrameColor(pct) {
  if (pct >= COB_CRITICAL) return T.vermillion;
  if (pct >= COB_WARNING) return T.yellow;
  return T.mint;
}

// ═══════════════════════════════════════════════════
//  LEFT COLUMN
// ═══════════════════════════════════════════════════

function buildLeftColumn() {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';

  col.appendChild(buildSalesOverviewCard());
  col.appendChild(buildSalesBreakdownCard());

  // ── Action Button ──
  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:auto;';
  actions.appendChild(buildButton('SALES DETAIL', {
    fill: T.darkBtn, color: T.mint, fontSize: '18px', fontFamily: T.fh, height: 36,
    onTap: function() {
      var emp = _params.emp || _params;
      SceneManager.openTransactional('reporting', {
        pin: emp.pin, employeeId: emp.id, employeeName: emp.name, role: 'manager',
      });
    },
  }));
  col.appendChild(actions);

  return col;
}

// ── SALES OVERVIEW Card ──────────────────────────

function buildSalesOverviewCard() {
  var d = _salesData || {};
  var cob = d.labor_cob || 0;
  var frameColor = cobFrameColor(cob);

  var card = document.createElement('div');
  card.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + frameColor + ';display:flex;flex-direction:column;flex:0 0 auto;';
  card.style.clipPath = chamfer(6);
  card.appendChild(buildCardHeader('SALES OVERVIEW'));

  var body = document.createElement('div');
  body.style.cssText = 'padding:6px 0;';
  body.appendChild(statRow('Net Sales:', fmt(d.net_sales), T.gold));
  body.appendChild(statRow('Check Avg:', fmt(d.avg_check), T.gold));
  body.appendChild(statRow('Active Checks:', String(d.active_checks || 0), T.lime));
  body.appendChild(statRow('Total Covers:', String(d.total_covers || 0), T.lime));
  body.appendChild(statRow('Labor COB%:', cob.toFixed(1) + '%', cobColor(cob)));
  card.appendChild(body);

  // >>> drill-down button
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;justify-content:flex-end;padding:4px 8px 2px;';
  btnRow.appendChild(buildButton('>>>', {
    fill: T.darkBtn, color: T.mint, fontSize: '14px', fontFamily: T.fb,
    width: 48, height: 24,
    onTap: function() {
      _expandOrigin = card.getBoundingClientRect();
      _expandedCard = 'sales-overview';
      showDrillDown();
    },
  }));
  card.appendChild(btnRow);

  return card;
}

// ── SALES BREAKDOWN Card ─────────────────────────

function buildSalesBreakdownCard() {
  var bd = _breakdownData || {};
  var cats = bd.categories || [];

  var card = document.createElement('div');
  card.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + T.mint + ';display:flex;flex-direction:column;flex:0 0 auto;';
  card.style.clipPath = chamfer(6);
  card.appendChild(buildCardHeader('SALES BREAKDOWN'));

  var body = document.createElement('div');
  body.style.cssText = 'padding:6px 0;';

  // Category rows — each in its assigned palette color
  for (var i = 0; i < cats.length; i++) {
    var catColor = T.catColor(cats[i].name);
    body.appendChild(statRow(cats[i].name + ':', fmt(cats[i].value), catColor));
  }

  // Divider
  var divider = document.createElement('div');
  divider.style.cssText = 'height:1px;background:' + T.bgDark + ';margin:4px 8px;border-top:1px solid ' + T.border + ';';
  body.appendChild(divider);

  // Tender totals
  body.appendChild(statRow('Cash:', fmt(bd.cash), T.gold));
  body.appendChild(statRow('Card:', fmt(bd.card), T.gold));
  card.appendChild(body);

  // >>> drill-down button
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;justify-content:flex-end;padding:4px 8px 2px;';
  btnRow.appendChild(buildButton('>>>', {
    fill: T.darkBtn, color: T.mint, fontSize: '14px', fontFamily: T.fb,
    width: 48, height: 24,
    onTap: function() {
      _expandOrigin = card.getBoundingClientRect();
      _expandedCard = 'sales-breakdown';
      showDrillDown();
    },
  }));
  card.appendChild(btnRow);

  return card;
}

// ── SVG Donut Chart (tender split) ───────────────

function drawDonutChart(container, slices, size) {
  var w = size || 160;
  var svg = createSVG(w, w);
  injectChartDefs(svg);
  var cx = w / 2, cy = w / 2;
  var outerR = w * 0.42, innerR = w * 0.24;
  var total = 0;
  for (var i = 0; i < slices.length; i++) total += slices[i].value;
  if (total === 0) total = 1;

  var startAngle = -Math.PI / 2;
  for (var i = 0; i < slices.length; i++) {
    var sweep = (slices[i].value / total) * Math.PI * 2;
    var endAngle = startAngle + sweep;
    var largeArc = sweep > Math.PI ? 1 : 0;

    var x1o = cx + outerR * Math.cos(startAngle);
    var y1o = cy + outerR * Math.sin(startAngle);
    var x2o = cx + outerR * Math.cos(endAngle);
    var y2o = cy + outerR * Math.sin(endAngle);
    var x1i = cx + innerR * Math.cos(endAngle);
    var y1i = cy + innerR * Math.sin(endAngle);
    var x2i = cx + innerR * Math.cos(startAngle);
    var y2i = cy + innerR * Math.sin(startAngle);

    var d = 'M' + x1o + ',' + y1o +
      ' A' + outerR + ',' + outerR + ' 0 ' + largeArc + ',1 ' + x2o + ',' + y2o +
      ' L' + x1i + ',' + y1i +
      ' A' + innerR + ',' + innerR + ' 0 ' + largeArc + ',0 ' + x2i + ',' + y2i +
      ' Z';

    svg.appendChild(svgEl('path', {
      d: d,
      fill: slices[i].color,
      stroke: T.bgDark,
      'stroke-width': '2',
    }));

    startAngle = endAngle;
  }

  container.appendChild(svg);
}

// ═══════════════════════════════════════════════════
//  DRILL-DOWN OVERLAY (>>> / <<<)
//  Pure CSS expand/collapse — not SceneManager overlay
// ═══════════════════════════════════════════════════

function buildBreakdownDrillContent(content) {
  var bd = _breakdownData || {};
  var cats = bd.categories || [];
  var hourly = bd.hourly || [];

  // ── Category Bar Chart ──
  var barPanel = buildChartPanel('CATEGORY SALES', fmt((_salesData || {}).net_sales),
    function(body) {
      var chartW = 500, chartH = 180;
      var svg = createSVG(chartW, chartH);
      var barData = cats.map(function(c) {
        return { label: c.name, value: c.value, color: T.catColor(c.name) };
      });
      // Draw bars with category colors, square data points, glow
      injectChartDefs(svg);
      drawCategoryBars(svg, barData, chartW, chartH);
      body.appendChild(svg);
    },
    cats.map(function(c) { return { label: c.name, color: T.catColor(c.name) }; })
  );
  content.appendChild(barPanel);

  // ── Tender Donut Chart ──
  var donutPanel = buildChartPanel('TENDER SPLIT', '',
    function(body) {
      body.style.display = 'flex';
      body.style.alignItems = 'center';
      body.style.justifyContent = 'center';
      body.style.gap = '16px';
      var donutWrap = document.createElement('div');
      drawDonutChart(donutWrap, [
        { label: 'Cash', value: bd.cash || 0, color: T.gold },
        { label: 'Card', value: bd.card || 0, color: T.lime },
      ], 140);
      body.appendChild(donutWrap);
      var legend = document.createElement('div');
      legend.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      legend.appendChild(statRow('Cash:', fmt(bd.cash), T.gold));
      legend.appendChild(statRow('Card:', fmt(bd.card), T.lime));
      body.appendChild(legend);
    },
    [{ label: 'Cash', color: T.gold }, { label: 'Card', color: T.lime }]
  );
  content.appendChild(donutPanel);

  // ── Hourly Revenue Line Chart ──
  var hourlyPanel = buildChartPanel('HOURLY REVENUE', '',
    function(body) {
      var chartW = 500, chartH = 160;
      var svg = createSVG(chartW, chartH);
      drawTrendLine(svg, hourly, {
        color: DATA.orange,
        width: chartW,
        height: chartH,
        shaded: true,
        areaPatternFill: PAT.coral,
      });
      body.appendChild(svg);
    },
    [{ label: 'Revenue', color: DATA.orange }]
  );
  content.appendChild(hourlyPanel);
}

// ── Category Bar Chart (custom per-category colors) ──

function drawCategoryBars(svg, data, w, h) {
  var padLeft = Math.round(70 * w / 500);
  var padRight = 8;
  var padTop = 10;
  var padBottom = Math.round(32 * h / 180);
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;
  var ptSz = Math.round(8 * w / 500);

  var maxVal = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].value > maxVal) maxVal = data[i].value;
  }
  if (maxVal === 0) maxVal = 1;

  var n = data.length;
  var groupW = chartW / n;
  var barW = groupW * 0.6;

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': Math.round(22 * w / 500) + '', 'font-family': CHART.font, 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
  }

  // Bars
  for (var i = 0; i < n; i++) {
    var x = padLeft + i * groupW;
    var barH = (data[i].value / maxVal) * chartH;
    var barY = padTop + chartH - barH;
    var color = data[i].color || DATA.orange;

    svg.appendChild(svgEl('rect', {
      x: x + (groupW - barW) / 2, y: barY, width: barW, height: barH,
      fill: color, stroke: color, 'stroke-width': '1.5',
    }));

    // Square data point at top of bar with glow
    svg.appendChild(svgEl('rect', {
      x: x + groupW / 2 - ptSz / 2, y: barY - ptSz / 2,
      width: ptSz, height: ptSz,
      fill: color, filter: GLOW.orange,
    }));

    // Label
    svg.appendChild(svgEl('text', {
      x: x + groupW / 2, y: h - 3,
      fill: color, 'font-size': Math.round(20 * w / 500) + '',
      'font-family': CHART.font, 'text-anchor': 'middle',
    })).textContent = data[i].label;
  }
}

function showDrillDown() {
  if (_drillEl) _drillEl.remove();
  if (!_el) return;
  var d = _salesData || {};
  var rect = _expandOrigin;
  var parentRect = _el.getBoundingClientRect();

  _drillEl = document.createElement('div');
  _drillEl.style.cssText = 'position:absolute;background:' + T.bgDark + ';border:2px solid ' + T.mint + ';display:flex;flex-direction:column;overflow:hidden;z-index:5;transition:top 220ms ease-out,left 220ms ease-out,width 220ms ease-out,height 220ms ease-out;';
  _drillEl.style.clipPath = chamfer(8);

  // Start at card's position
  if (rect) {
    _drillEl.style.top = (rect.top - parentRect.top) + 'px';
    _drillEl.style.left = (rect.left - parentRect.left) + 'px';
    _drillEl.style.width = rect.width + 'px';
    _drillEl.style.height = rect.height + 'px';
  } else {
    _drillEl.style.top = '0';
    _drillEl.style.left = '0';
    _drillEl.style.width = '100%';
    _drillEl.style.height = '100%';
  }

  // Header
  var headerLabel = _expandedCard === 'sales-overview' ? 'SALES OVERVIEW' : 'SALES BREAKDOWN';
  _drillEl.appendChild(buildCardHeader(headerLabel));

  // Expanded content
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;padding:12px;overflow-y:auto;';

  if (_expandedCard === 'sales-overview') {
    var cob = d.labor_cob || 0;
    content.appendChild(statRow('Net Sales:', fmt(d.net_sales), T.gold));
    content.appendChild(statRow('Check Avg:', fmt(d.avg_check), T.gold));
    content.appendChild(statRow('Active Checks:', String(d.active_checks || 0), T.lime));
    content.appendChild(statRow('Total Covers:', String(d.total_covers || 0), T.lime));
    content.appendChild(statRow('Labor COB%:', cob.toFixed(1) + '%', cobColor(cob)));
    // Expanded detail rows
    content.appendChild(statRow('Gross Sales:', fmt(d.gross_sales || 0), T.gold));
    content.appendChild(statRow('Cash Sales:', fmt(d.cash_total || 0), T.gold));
    content.appendChild(statRow('Card Sales:', fmt(d.card_total || 0), T.gold));
    content.appendChild(statRow('Discounts:', fmt(d.discount_total || 0), T.vermillion));
    content.appendChild(statRow('Voids:', fmt(d.void_total || 0), T.vermillion));
    content.appendChild(statRow('Tax:', fmt(d.tax_total || 0), T.gold));
  } else if (_expandedCard === 'sales-breakdown') {
    buildBreakdownDrillContent(content);
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

// ── Check Helpers ────────────────────────────────

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
  var orders = _allOrders.filter(function(o) {
    if (tab === 'open') return o.status === 'open';
    if (tab === 'closed') return o.status === 'closed' || o.status === 'paid';
    if (tab === 'void') return o.status === 'voided';
    return false;
  });
  // Apply heatmap server filter
  if (_filteredServerId && tab === 'open') {
    orders = orders.filter(function(o) { return o.server_id === _filteredServerId; });
  }
  return orders;
}

// ═══════════════════════════════════════════════════
//  CENTER COLUMN — Heatmap + Check Grid
// ═══════════════════════════════════════════════════

function buildCenterColumn() {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;gap:8px;';

  _heatmapEl = buildHeatmapPanel();
  col.appendChild(_heatmapEl);

  // ── Check grid container ──
  var checkWrap = document.createElement('div');
  checkWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;border:1px solid ' + T.mint + ';background:' + T.bgDark + ';';
  checkWrap.style.clipPath = chamfer(6);

  // Header: "// ALL CHECKS //" or "// {SERVER NAME} //"
  _checkHeader = document.createElement('div');
  _checkHeader.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.mint + ';letter-spacing:2px;padding:6px 10px;flex-shrink:0;';
  updateCheckHeader();
  checkWrap.appendChild(_checkHeader);

  // ── Tab Bar ──
  var tabKeys = ['open', 'closed', 'void'];
  var tabLabels = ['OPEN', 'CLOSED', 'VOID'];
  var tabEls = [];
  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;flex-shrink:0;border-bottom:1px solid ' + T.border + ';';

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
        renderGrid();
        renderOpsPanel();
      });
      tabEls.push(tab);
      tabBar.appendChild(tab);
    })(tabKeys[t], tabLabels[t]);
  }
  checkWrap.appendChild(tabBar);

  // ── Check Grid ──
  _centerGrid = document.createElement('div');
  _centerGrid.style.cssText = 'flex:1;overflow-y:auto;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;';
  checkWrap.appendChild(_centerGrid);

  // ── CHECK OPERATION Panel (placeholder for Chunk 6) ──
  _opsPanel = document.createElement('div');
  _opsPanel.style.cssText = 'flex-shrink:0;border-top:1px solid ' + T.border + ';background:' + T.bg + ';';
  checkWrap.appendChild(_opsPanel);

  col.appendChild(checkWrap);

  renderGrid();
  renderOpsPanel();
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

function updateCheckHeader() {
  if (!_checkHeader) return;
  if (_filteredServerId && _heatmapData) {
    var srv = (_heatmapData.servers || []).find(function(s) { return s.id === _filteredServerId; });
    _checkHeader.textContent = '// ' + (srv ? srv.name.toUpperCase() : 'SERVER') + ' //';
  } else {
    _checkHeader.textContent = '// ALL CHECKS //';
  }
}

// ── Grid Rendering ───────────────────────────────

function renderGrid() {
  if (!_centerGrid) return;
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
    _centerGrid.appendChild(buildCheckTile(orders[i]));
  }

  // + NEW CHECK tile (OPEN tab only)
  if (_activeTab === 'open') {
    var newTile = document.createElement('div');
    newTile.style.cssText = 'border:2px dashed ' + T.mint + ';display:flex;align-items:center;justify-content:center;min-height:90px;cursor:pointer;user-select:none;';
    newTile.style.clipPath = chamfer(6);
    var plus = document.createElement('div');
    plus.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';';
    plus.textContent = '+';
    newTile.appendChild(plus);
    newTile.addEventListener('pointerup', function() {
      var emp = _params.emp || _params;
      SceneManager.mountWorking('order-entry', {
        mode: 'service', pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
      });
    });
    _centerGrid.appendChild(newTile);
  }
}

// ── Check Tile — Manager Variant ─────────────────

function buildCheckTile(order) {
  var isOpen = _activeTab === 'open';
  var isClosed = _activeTab === 'closed';
  var isVoid = _activeTab === 'void';
  var sColor = serverColor(order.server_id);

  var tile = document.createElement('div');
  // Border = server's heatmap palette color (not mint)
  tile.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + sColor + ';padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-height:86px;cursor:pointer;user-select:none;box-sizing:border-box;';
  tile.style.clipPath = chamfer(6);
  if (isClosed) tile.style.opacity = '0.7';
  if (isVoid) { tile.style.opacity = '0.5'; tile.style.cursor = 'default'; }

  // C-00# line — mint for open, electricPink for closed, vermillion for void
  var numColor = isOpen ? T.mint : (isClosed ? T.electricPink : T.vermillion);
  var num = document.createElement('div');
  num.style.cssText = 'font-family:' + T.fh + ';font-size:22px;color:' + numColor + ';';
  num.textContent = checkNum(order);
  num.dataset.role = 'num';
  tile.appendChild(num);

  // Server name — always shown in manager view
  var srvName = document.createElement('div');
  srvName.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + sColor + ';';
  srvName.textContent = order.server_name || '';
  srvName.dataset.role = 'server';
  tile.appendChild(srvName);

  // Customer name
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
    if (_selected[order.order_id]) applyMgrTileSelected(tile, sColor, true);
    tile.addEventListener('pointerup', function() {
      var id = order.order_id;
      if (_selected[id]) {
        delete _selected[id];
        applyMgrTileSelected(tile, sColor, false);
      } else {
        _selected[id] = order;
        applyMgrTileSelected(tile, sColor, true);
      }
      renderOpsPanel();
    });
  } else if (isClosed) {
    tile.addEventListener('pointerup', function() {
      SceneManager.interrupt('sl-reopen-confirm', {
        onConfirm: function() {
          writeAuditEvent('reopen', order.order_id, order.server_id);
          fetch('/api/v1/orders/' + order.order_id + '/reopen', { method: 'POST' })
            .then(function(r) {
              if (r.ok) { showToast('Check reopened', { bg: T.goGreen }); renderGrid(); }
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

function applyMgrTileSelected(tile, sColor, selected) {
  if (selected) {
    tile.style.background = T.mint;
    // All text dark, border stays server palette color
    tile.style.borderColor = sColor;
    for (var i = 0; i < tile.children.length; i++) tile.children[i].style.color = T.bgDark;
  } else {
    tile.style.background = T.bgDark;
    tile.style.borderColor = sColor;
    for (var i = 0; i < tile.children.length; i++) {
      var child = tile.children[i];
      var role = child.dataset.role;
      if (role === 'num') child.style.color = T.mint;
      else if (role === 'server') child.style.color = sColor;
      else if (role === 'name') child.style.color = T.mutedText;
      else if (role === 'count') child.style.color = T.textPrimary;
      else if (role === 'total') child.style.color = T.gold;
    }
  }
}

// ── Manager Audit Event ──────────────────────────

function writeAuditEvent(action, checkId, originalServerId) {
  var emp = _params ? (_params.emp || _params) : {};
  var evt = {
    manager_id: emp.id || 'unknown',
    action: action,
    timestamp: new Date().toISOString(),
    original_server_id: originalServerId || null,
    check_id: checkId || null,
  };
  console.log('[MANAGER AUDIT]', evt);
  // TODO (Chunk 9): POST to /api/v1/audit/manager
  return evt;
}

// ── Operations Panel ─────────────────────────────

function renderOpsPanel() {
  if (!_opsPanel) return;
  _opsPanel.innerHTML = '';
  var header = document.createElement('div');
  header.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.mint + ';letter-spacing:2px;padding:6px 10px;';
  header.textContent = '// CHECK OPERATION //';
  _opsPanel.appendChild(header);

  if (_activeTab !== 'open') return;
  var ids = Object.keys(_selected);
  if (ids.length === 0) return;

  var emp = _params ? (_params.emp || _params) : {};
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px 10px 8px;';
  var isSingle = ids.length === 1;

  if (isSingle) {
    var order = _selected[ids[0]];

    // EDIT
    grid.appendChild(buildButton('EDIT', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        writeAuditEvent('edit', order.order_id, order.server_id);
        SceneManager.mountWorking('order-entry', {
          mode: 'service', pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
          recallOrderId: order.order_id,
        });
      },
    }));

    // PRINT
    grid.appendChild(buildButton('PRINT', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        writeAuditEvent('print', order.order_id, order.server_id);
        fetch('/api/v1/print/receipt/' + order.order_id, { method: 'POST' })
          .then(function() { showToast('Print sent', { bg: T.goGreen }); })
          .catch(function() { showToast('Print failed', { bg: T.red }); });
      },
    }));

    // TRANSFER
    grid.appendChild(buildButton('TRANSFER', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        writeAuditEvent('transfer', order.order_id, order.server_id);
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

    // VOID — red outline gate
    var voidBtn = buildButton('VOID', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-void-gate', {
          onConfirm: function() {
            writeAuditEvent('void', order.order_id, order.server_id);
            fetch('/api/v1/orders/' + order.order_id + '/void', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'Voided by manager', approved_by: emp.id || 'manager' }),
            }).then(function(r) {
              if (r.ok) { showToast('Check voided', { bg: T.goGreen }); _selected = {}; renderGrid(); renderOpsPanel(); }
              else { showToast('Void failed', { bg: T.red }); }
            }).catch(function() { showToast('Void failed', { bg: T.red }); });
          },
          onCancel: function() {},
          params: { message: 'Void ' + checkNum(order) + '? This is destructive.' },
        });
      },
    });
    voidBtn.style.border = '2px solid ' + T.vermillion;
    grid.appendChild(voidBtn);

  } else {
    // ── Multi-check selected ──

    // MERGE
    grid.appendChild(buildButton('MERGE', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        ids.forEach(function(id) { writeAuditEvent('merge', id, (_selected[id] || {}).server_id); });
        SceneManager.interrupt('sl-merge-choice', {
          onConfirm: function(mode) {
            showToast('Merge (' + mode + ') — not yet wired', { bg: T.gold });
          },
          onCancel: function() {},
          params: { count: ids.length },
        });
      },
    }));

    // PRINT ALL
    grid.appendChild(buildButton('PRINT ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        ids.forEach(function(id) {
          writeAuditEvent('print', id, (_selected[id] || {}).server_id);
          fetch('/api/v1/print/receipt/' + id, { method: 'POST' }).catch(function() {});
        });
        showToast('Print sent for ' + ids.length + ' checks', { bg: T.goGreen });
      },
    }));

    // TRANSFER ALL
    grid.appendChild(buildButton('TRANSFER ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        ids.forEach(function(id) { writeAuditEvent('transfer', id, (_selected[id] || {}).server_id); });
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

    // VOID ALL — double-gated (void gate → confirmation)
    var voidAllBtn = buildButton('VOID ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        // Gate 1: void gate confirmation
        SceneManager.interrupt('sl-void-gate', {
          onConfirm: function() {
            // Gate 2: second confirmation for batch void
            SceneManager.interrupt('sl-void-gate', {
              onConfirm: function() {
                ids.forEach(function(id) { writeAuditEvent('void', id, (_selected[id] || {}).server_id); });
                Promise.all(ids.map(function(id) {
                  return fetch('/api/v1/orders/' + id + '/void', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: 'Batch voided by manager', approved_by: emp.id || 'manager' }),
                  });
                })).then(function() {
                  showToast(ids.length + ' checks voided', { bg: T.goGreen });
                  _selected = {};
                  renderGrid();
                  renderOpsPanel();
                }).catch(function() { showToast('Void failed', { bg: T.red }); });
              },
              onCancel: function() {},
              params: { message: 'CONFIRM: Void ' + ids.length + ' checks? This cannot be undone.' },
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

// ── Server Workload Heatmap ──────────────────────

function buildHeatmapPanel() {
  var hm = _heatmapData || {};
  var hours = hm.hours || [];
  var servers = hm.servers || [];
  var curHour = hm.current_hour != null ? hm.current_hour : -1;

  // Filter out servers with no activity at all
  var active = servers.filter(function(s) {
    for (var i = 0; i < s.cells.length; i++) { if (s.cells[i] > 0) return true; }
    return s.live_tables > 0;
  });
  if (active.length === 0) return document.createElement('div');

  var panel = document.createElement('div');
  panel.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + T.mint + ';display:flex;flex-direction:column;flex-shrink:0;';
  panel.style.clipPath = chamfer(6);
  panel.appendChild(buildCardHeader('SERVER WORKLOAD'));

  // Grid: server names (left) | hour columns | live count (right)
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:auto repeat(' + hours.length + ', 1fr) auto;gap:1px;padding:4px 6px 6px;';

  // Header row: empty corner + hour labels + empty corner
  var corner = document.createElement('div');
  corner.style.cssText = 'padding:2px 4px;';
  grid.appendChild(corner);
  for (var h = 0; h < hours.length; h++) {
    var hLabel = document.createElement('div');
    hLabel.style.cssText = 'font-family:' + T.fb + ';font-size:11px;color:' + T.mutedText + ';text-align:center;padding:2px 0;';
    if (h === curHour) hLabel.style.color = T.lime;
    hLabel.textContent = hours[h];
    grid.appendChild(hLabel);
  }
  var cornerR = document.createElement('div');
  cornerR.style.cssText = 'padding:2px 4px;font-family:' + T.fb + ';font-size:11px;color:' + T.mutedText + ';text-align:right;';
  cornerR.textContent = 'NOW';
  grid.appendChild(cornerR);

  // Server rows
  for (var s = 0; s < active.length; s++) {
    (function(srv) {
      var sColor = serverColor(srv.id);
      var isFiltered = _filteredServerId === srv.id;

      // Server name cell
      var nameCell = document.createElement('div');
      nameCell.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.textPrimary + ';padding:3px 6px 3px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;cursor:pointer;user-select:none;display:flex;align-items:center;';
      if (isFiltered) {
        nameCell.style.borderLeft = '2px solid ' + T.mint;
        nameCell.style.paddingLeft = '2px';
      }
      nameCell.textContent = srv.name;
      nameCell.addEventListener('pointerup', function() {
        if (_filteredServerId === srv.id) {
          _filteredServerId = null;
        } else {
          _filteredServerId = srv.id;
        }
        rerenderHeatmap();
      });
      grid.appendChild(nameCell);

      // Hour cells
      for (var c = 0; c < srv.cells.length; c++) {
        var cell = document.createElement('div');
        var count = srv.cells[c];
        var cellStyle = 'min-height:18px;';

        // Current hour column: lime left border
        if (c === curHour) cellStyle += 'border-left:2px solid ' + T.lime + ';';

        // Intensity by table count
        if (count === 0) {
          cellStyle += 'background:' + T.bgDark + ';';
        } else if (count <= 2) {
          cellStyle += 'background:' + hexWithAlpha(sColor, 0.25) + ';';
        } else if (count <= 4) {
          cellStyle += 'background:' + hexWithAlpha(sColor, 0.60) + ';';
        } else {
          cellStyle += 'background:' + sColor + ';box-shadow:0 0 8px ' + sColor + '88;';
        }

        cell.style.cssText = cellStyle;
        grid.appendChild(cell);
      }

      // Live table count
      var liveCell = document.createElement('div');
      liveCell.style.cssText = 'font-family:' + T.fb + ';font-size:13px;color:' + sColor + ';text-align:right;padding:3px 4px;font-weight:bold;';
      liveCell.textContent = String(srv.live_tables);
      grid.appendChild(liveCell);
    })(active[s]);
  }

  panel.appendChild(grid);
  return panel;
}

function rerenderHeatmap() {
  if (!_heatmapEl || !_centerCol) return;
  var newPanel = buildHeatmapPanel();
  _centerCol.replaceChild(newPanel, _heatmapEl);
  _heatmapEl = newPanel;
  updateCheckHeader();
  renderGrid();
}

// ── Hex to RGBA helper ───────────────────────────

function hexWithAlpha(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// ═══════════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════════

function renderScene() {
  if (!_el || !_params) return;

  _el.innerHTML = '';
  _el.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;background:' + T.bgDark + ';';

  // ── Scene header bar (34px, mint) ──
  _el.appendChild(buildSceneHeader());

  // ── 3-column grid ──
  var grid = document.createElement('div');
  grid.style.cssText = 'flex:1;display:grid;grid-template-columns:22% 50% 28%;gap:' + T.colGap + 'px;padding:' + T.scenePad + 'px;box-sizing:border-box;overflow:hidden;';

  _leftCol = buildLeftColumn();
  _centerCol = buildCenterColumn();

  _rightCol = document.createElement('div');
  _rightCol.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';

  grid.appendChild(_leftCol);
  grid.appendChild(_centerCol);
  grid.appendChild(_rightCol);
  _el.appendChild(grid);

  // Start clock updates
  if (_clockTimer) clearInterval(_clockTimer);
  _clockTimer = setInterval(updateHeaderLabel, 30000);
}

// ═══════════════════════════════════════════════════
//  SCENE REGISTRATION
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'manager-landing',

  mount: function(container, params) {
    _el = container;
    _params = params;

    loadStubData();

    var emp = params.emp || params;
    setSceneName(emp.name || emp.employeeName || 'Manager');
    setHeaderBack({
      x: true,
      onClose: function() {
        SceneManager.closeAllTransactional();
        SceneManager.unmountWorking('manager-landing');
        SceneManager.openGate('login');
      },
    });

    renderScene();
  },

  unmount: function() {
    if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null; }
    if (_drillEl) { _drillEl.remove(); _drillEl = null; }
    _el = null;
    _params = null;
    _salesData = null;
    _breakdownData = null;
    _heatmapData = null;
    _filteredServerId = null;
    _serverColorMap = {};
    _activeTab = 'open';
    _selected = {};
    _allOrders = [];
    _expandedCard = null;
    _expandOrigin = null;
    _leftCol = null;
    _centerCol = null;
    _rightCol = null;
    _headerLabel = null;
    _heatmapEl = null;
    _centerGrid = null;
    _opsPanel = null;
    _checkHeader = null;
  },
});
