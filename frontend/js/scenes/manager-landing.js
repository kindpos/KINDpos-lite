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

// COB% escalation thresholds (configurable)
var COB_WARNING = 30;
var COB_CRITICAL = 35;

// DOM refs for partial re-renders
var _leftCol = null;
var _centerCol = null;
var _rightCol = null;
var _headerLabel = null;

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

  _centerCol = document.createElement('div');
  _centerCol.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;';

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
    _expandedCard = null;
    _expandOrigin = null;
    _leftCol = null;
    _centerCol = null;
    _rightCol = null;
    _headerLabel = null;
  },
});
