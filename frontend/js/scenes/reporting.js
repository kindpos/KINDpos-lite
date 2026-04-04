// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Reporting Scene
//  Role-driven two-card dashboard with drill-down charts
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle, bevelEdges, shadowColor } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { registerScene, push, pop } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── Module state ────────────────────────────────────
var expandedCard = null;
var currentParams = null;
var currentEl = null;
var salesData = null;
var laborData = null;

function fmt(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// ═══════════════════════════════════════════════════
//  CHART CONSTANTS
// ═══════════════════════════════════════════════════

var CHART = {
  axisFill:    T.dimText,
  axisStroke:  T.border,
  gridStroke:  T.bg,
  axisFont:    '10px Courier New',
  labelFont:   '11px Courier New',
  valueFont:   '12px Courier New',
  cyan:        T.cyan,
  lavender:    T.lavender,
  gold:        T.gold,
  yellow:      T.yellow,
  red:         T.redB,
  mint:        T.mintB,
  panelBg:     T.bgDark,
  headerBg:    T.bg3,
};

// ═══════════════════════════════════════════════════
//  SVG + CHART HELPERS
// ═══════════════════════════════════════════════════

var SVG_NS = 'http://www.w3.org/2000/svg';

function createSVG(width, height) {
  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
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

function drawBarChart(svg, data, options) {
  var color = options.color || CHART.cyan;
  var compareColor = options.compareColor || CHART.lavender;
  var w = options.width || 300;
  var h = options.height || 150;
  var showLabels = options.showLabels !== false;
  var showValueAbove = options.showValueAbove || false;
  var hasCompare = false;
  for (var i = 0; i < data.length; i++) {
    if (data[i].compareValue !== undefined && data[i].compareValue !== null) { hasCompare = true; break; }
  }

  var padLeft = 35;
  var padRight = 5;
  var padTop = showValueAbove ? 16 : 8;
  var padBottom = showLabels ? 18 : 8;
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  var maxVal = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].value > maxVal) maxVal = data[i].value;
    if (hasCompare && data[i].compareValue > maxVal) maxVal = data[i].compareValue;
  }
  if (maxVal === 0) maxVal = 1;

  var n = data.length;
  var groupW = chartW / n;
  var barW = hasCompare ? groupW * 0.35 : groupW * 0.6;
  var gap = hasCompare ? groupW * 0.05 : 0;

  // Y-axis gridlines
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': '9', 'font-family': 'Courier New', 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
  }

  for (var i = 0; i < n; i++) {
    var x = padLeft + i * groupW;
    var barH = (data[i].value / maxVal) * chartH;
    var barY = padTop + chartH - barH;

    if (hasCompare) {
      // Primary bar
      svg.appendChild(svgEl('rect', { x: x + gap, y: barY, width: barW, height: barH, fill: color }));
      // Compare bar
      var cH = ((data[i].compareValue || 0) / maxVal) * chartH;
      var cY = padTop + chartH - cH;
      svg.appendChild(svgEl('rect', { x: x + barW + gap * 2, y: cY, width: barW, height: cH, fill: compareColor }));
    } else {
      svg.appendChild(svgEl('rect', { x: x + (groupW - barW) / 2, y: barY, width: barW, height: barH, fill: color }));
    }

    if (showValueAbove) {
      svg.appendChild(svgEl('text', { x: x + groupW / 2, y: barY - 3, fill: color, 'font-size': '9', 'font-family': 'Courier New', 'text-anchor': 'middle' })).textContent = data[i].value;
    }

    if (showLabels) {
      svg.appendChild(svgEl('text', { x: x + groupW / 2, y: h - 3, fill: CHART.axisFill, 'font-size': '9', 'font-family': 'Courier New', 'text-anchor': 'middle' })).textContent = data[i].label;
    }
  }
}

function drawHorizontalBars(svg, data, options) {
  var w = options.width || 300;
  var h = options.height || 150;
  var padLeft = options.labelWidth || 60;
  var padRight = 10;
  var padTop = 5;
  var padBottom = 5;
  var chartW = w - padLeft - padRight;
  var n = data.length;
  if (n === 0) return;
  var rowH = (h - padTop - padBottom) / n;
  var barH = Math.min(rowH * 0.7, 20);

  var maxVal = 0;
  for (var i = 0; i < n; i++) {
    var mv = data[i].maxValue || data[i].value;
    if (mv > maxVal) maxVal = mv;
  }
  if (maxVal === 0) maxVal = 1;

  for (var i = 0; i < n; i++) {
    var y = padTop + i * rowH;
    var barColor = data[i].color || options.color || CHART.cyan;
    var barWidth = (data[i].value / maxVal) * chartW;

    // Label
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: y + rowH / 2 + 4, fill: CHART.mint, 'font-size': '10', 'font-family': 'Courier New', 'text-anchor': 'end' })).textContent = data[i].label;

    // Bar
    svg.appendChild(svgEl('rect', { x: padLeft, y: y + (rowH - barH) / 2, width: barWidth, height: barH, fill: barColor }));

    // Sublabel
    if (data[i].sublabel) {
      svg.appendChild(svgEl('text', { x: padLeft + barWidth + 4, y: y + rowH / 2 + 4, fill: CHART.axisFill, 'font-size': '9', 'font-family': 'Courier New', 'text-anchor': 'start' })).textContent = data[i].sublabel;
    }
  }
}

function drawTrendLine(svg, data, options) {
  var color = options.color || CHART.cyan;
  var w = options.width || 300;
  var h = options.height || 150;
  var compareData = options.compareData || null;
  var compareColor = options.compareColor || CHART.lavender;
  var thresholds = options.thresholds || [];

  var padLeft = 35;
  var padRight = 10;
  var padTop = 10;
  var padBottom = 18;
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  var maxVal = 0;
  var minVal = Infinity;
  for (var i = 0; i < data.length; i++) {
    if (data[i].value > maxVal) maxVal = data[i].value;
    if (data[i].value < minVal) minVal = data[i].value;
  }
  if (compareData) {
    for (var i = 0; i < compareData.length; i++) {
      if (compareData[i].value > maxVal) maxVal = compareData[i].value;
      if (compareData[i].value < minVal) minVal = compareData[i].value;
    }
  }
  for (var t = 0; t < thresholds.length; t++) {
    if (thresholds[t].value > maxVal) maxVal = thresholds[t].value;
  }
  var range = maxVal - minVal;
  if (range === 0) range = 1;
  var yMin = minVal - range * 0.1;
  var yMax = maxVal + range * 0.1;
  var yRange = yMax - yMin;

  function toX(i) { return padLeft + (i / (data.length - 1)) * chartW; }
  function toY(v) { return padTop + chartH - ((v - yMin) / yRange) * chartH; }

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gv = yMin + (g / 4) * yRange;
    var gy = toY(gv);
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': '9', 'font-family': 'Courier New', 'text-anchor': 'end' })).textContent = gv.toFixed(1);
  }

  // Threshold lines
  for (var t = 0; t < thresholds.length; t++) {
    var ty = toY(thresholds[t].value);
    svg.appendChild(svgEl('line', { x1: padLeft, y1: ty, x2: w - padRight, y2: ty, stroke: thresholds[t].color, 'stroke-width': 1, 'stroke-dasharray': '4,3' }));
  }

  // Comparison line (dashed)
  if (compareData && compareData.length > 0) {
    var cPoints = [];
    for (var i = 0; i < compareData.length; i++) {
      cPoints.push(toX(i) + ',' + toY(compareData[i].value));
    }
    svg.appendChild(svgEl('polyline', { points: cPoints.join(' '), fill: 'none', stroke: compareColor, 'stroke-width': 2, 'stroke-dasharray': '5,3' }));
    for (var i = 0; i < compareData.length; i++) {
      svg.appendChild(svgEl('rect', { x: toX(i) - 4, y: toY(compareData[i].value) - 4, width: 8, height: 8, fill: compareColor }));
    }
  }

  // Primary line (solid)
  var points = [];
  for (var i = 0; i < data.length; i++) {
    points.push(toX(i) + ',' + toY(data[i].value));
  }
  svg.appendChild(svgEl('polyline', { points: points.join(' '), fill: 'none', stroke: color, 'stroke-width': 2 }));
  for (var i = 0; i < data.length; i++) {
    svg.appendChild(svgEl('rect', { x: toX(i) - 4, y: toY(data[i].value) - 4, width: 8, height: 8, fill: color }));
  }

  // X labels
  for (var i = 0; i < data.length; i++) {
    svg.appendChild(svgEl('text', { x: toX(i), y: h - 3, fill: CHART.axisFill, 'font-size': '9', 'font-family': 'Courier New', 'text-anchor': 'middle' })).textContent = data[i].label;
  }
}

function drawProgressBar(svg, value, max, options) {
  var w = options.width || 300;
  var h = options.height || 30;
  var warnAt = options.warnAt;
  var critAt = options.critAt;
  var color = options.color || CHART.cyan;

  var padX = 10;
  var barH = Math.min(h - 10, 16);
  var barY = (h - barH) / 2;
  var barW = w - padX * 2;

  // Background
  svg.appendChild(svgEl('rect', { x: padX, y: barY, width: barW, height: barH, fill: T.bg }));

  // Fill
  var fillW = Math.min(value / max, 1) * barW;
  var fillColor = color;
  if (critAt && value >= critAt) fillColor = CHART.red;
  else if (warnAt && value >= warnAt) fillColor = CHART.yellow;
  svg.appendChild(svgEl('rect', { x: padX, y: barY, width: fillW, height: barH, fill: fillColor }));

  // Threshold markers
  if (warnAt) {
    var wx = padX + (warnAt / max) * barW;
    svg.appendChild(svgEl('line', { x1: wx, y1: barY - 3, x2: wx, y2: barY + barH + 3, stroke: CHART.yellow, 'stroke-width': 2, 'stroke-dasharray': '3,2' }));
  }
  if (critAt) {
    var cx = padX + (critAt / max) * barW;
    svg.appendChild(svgEl('line', { x1: cx, y1: barY - 3, x2: cx, y2: barY + barH + 3, stroke: CHART.red, 'stroke-width': 2, 'stroke-dasharray': '3,2' }));
  }
}

function buildChartPanel(title, value, contentFn) {
  var panel = document.createElement('div');
  panel.style.cssText = 'display:flex;flex-direction:column;min-height:0;overflow:hidden;';

  // Header bar
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:' + CHART.headerBg + ';flex-shrink:0;';

  var titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:Courier New,monospace;font-size:11px;color:' + CHART.mint + ';font-weight:bold;';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  var valueEl = document.createElement('div');
  valueEl.style.cssText = 'font-family:Courier New,monospace;font-size:11px;color:' + CHART.gold + ';font-weight:bold;';
  valueEl.textContent = value;
  header.appendChild(valueEl);

  panel.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'flex:1;min-height:0;background:' + CHART.panelBg + ';overflow:hidden;position:relative;';
  applySunkenStyle(body);

  if (contentFn) {
    contentFn(body);
  }

  panel.appendChild(body);
  return panel;
}

// ═══════════════════════════════════════════════════
//  FETCH DATA
// ═══════════════════════════════════════════════════

function fetchData(params) {
  var today = new Date().toISOString().slice(0, 10);
  var salesUrl = '/api/v1/reports/sales-summary?date=' + today;
  var laborUrl = '/api/v1/reports/labor-summary?date=' + today;

  if (params.role === 'server' && params.employeeId) {
    salesUrl += '&server_id=' + encodeURIComponent(params.employeeId);
    laborUrl += '&server_id=' + encodeURIComponent(params.employeeId);
  }

  return Promise.all([
    fetch(salesUrl).then(function(r) { return r.json(); }).catch(function() { return null; }),
    fetch(laborUrl).then(function(r) { return r.json(); }).catch(function() { return null; }),
  ]).then(function(results) {
    return { sales: results[0], labor: results[1] };
  });
}

// ═══════════════════════════════════════════════════
//  BUILD COLLAPSED CARDS
// ═══════════════════════════════════════════════════

function buildCollapsedView(el, params, sales, labor) {
  el.innerHTML = '';
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:20px;';

  // Outer frame — mint border
  var frame = document.createElement('div');
  frame.style.cssText = 'flex:1;display:flex;gap:0;border:3px solid ' + T.mint + ';box-sizing:border-box;min-height:0;';

  var leftCard = buildLeftCard(params, sales, labor);
  var rightCard = buildRightCard(params, sales, labor);

  leftCard.style.flex = '1';
  rightCard.style.flex = '1';

  leftCard.addEventListener('pointerup', function() {
    expandedCard = 'left';
    renderCurrentState();
  });

  rightCard.addEventListener('pointerup', function() {
    expandedCard = 'right';
    renderCurrentState();
  });

  frame.appendChild(leftCard);
  frame.appendChild(rightCard);
  el.appendChild(frame);
}

// ── LEFT CARD: SALES (manager) or SHIFT (server) ──

function buildLeftCard(params, sales, labor) {
  var card = document.createElement('div');
  card.style.cssText = 'display:flex;flex-direction:column;background:' + T.bgDark + ';cursor:pointer;user-select:none;-webkit-user-select:none;padding:20px;gap:8px;border-right:2px solid ' + T.border + ';';

  var s = sales;

  if (params.role === 'manager') {
    // SALES card
    var title = document.createElement('div');
    title.style.cssText = 'font-family:Impact,sans-serif;font-size:36px;font-weight:bold;font-style:italic;color:' + T.gold + ';';
    title.textContent = 'SALES';
    card.appendChild(title);

    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:12px;font-family:Courier New,monospace;font-size:20px;color:' + T.mint + ';';
    kpis.innerHTML =
      '<div>Net: ' + (s ? fmt(s.net_sales) : '--') + '</div>' +
      '<div>Checks: ' + (s ? s.total_checks : '--') + '</div>' +
      '<div>Avg: ' + (s ? fmt(s.check_avg) : '--') + '</div>' +
      '<div>Cash: ' + (s ? fmt(s.cash_total) : '--') + ' / Card: ' + (s ? fmt(s.card_total) : '--') + '</div>';
    card.appendChild(kpis);
  } else {
    // SHIFT card
    var title = document.createElement('div');
    title.style.cssText = 'font-family:Impact,sans-serif;font-size:36px;font-weight:bold;font-style:italic;color:' + T.gold + ';';
    title.textContent = 'SHIFT';
    card.appendChild(title);

    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:12px;font-family:Courier New,monospace;font-size:20px;color:' + T.mint + ';';
    kpis.innerHTML =
      '<div>Guests: ' + (s ? (s.total_guests || '--') : '--') + '</div>' +
      '<div>Tables: ' + (s ? (s.total_tables || '--') : '--') + '</div>' +
      '<div>Check Avg: ' + (s ? fmt(s.check_avg) : '--') + '</div>' +
      '<div>Tips: ' + (s ? fmt(s.tips_collected || 0) : '--') + ' / Tipout: ' + (s ? fmt(s.tipout_amount || 0) : '--') + '</div>';
    card.appendChild(kpis);
  }

  return card;
}

// ── RIGHT CARD: LABOR (manager) or HOURS (server) ──

function buildRightCard(params, sales, labor) {
  var card = document.createElement('div');
  card.style.cssText = 'display:flex;background:' + T.bgDark + ';cursor:pointer;user-select:none;-webkit-user-select:none;padding:20px;gap:12px;';

  var l = labor;

  if (params.role === 'manager') {
    // LABOR card — vertical cyan rail + KPIs
    var rail = document.createElement('div');
    rail.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;font-family:Impact,sans-serif;font-size:36px;font-weight:bold;color:' + T.cyan + ';display:flex;align-items:center;justify-content:center;';
    rail.textContent = 'LABOR';
    card.appendChild(rail);

    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex:1;font-family:Courier New,monospace;font-size:20px;color:' + T.mint + ';justify-content:center;';

    var otAlert = '--';
    if (l && l.ot_alerts && l.ot_alerts.length > 0) {
      otAlert = l.ot_alerts.length + ' warning(s)';
    } else if (l) {
      otAlert = 'All clear';
    }

    kpis.innerHTML =
      '<div>Total Hrs: ' + (l ? l.total_hours : '--') + '</div>' +
      '<div>Tip Pool: ' + (l ? fmt(l.tip_pool) : '--') + '</div>' +
      '<div>COB: ' + (l ? l.cob_percent + '%' : '--') + '</div>' +
      '<div style="color:' + T.gold + '">OT: ' + otAlert + '</div>';
    card.appendChild(kpis);
  } else {
    // HOURS card — vertical cyan rail + KPIs
    var rail = document.createElement('div');
    rail.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;font-family:Impact,sans-serif;font-size:36px;font-weight:bold;color:' + T.cyan + ';display:flex;align-items:center;justify-content:center;';
    rail.textContent = 'HOURS';
    card.appendChild(rail);

    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex:1;font-family:Courier New,monospace;font-size:20px;color:' + T.mint + ';justify-content:center;';

    var otAlert = '--';
    if (l) {
      if (l.ot_status === 'warning') otAlert = 'Warning';
      else if (l.ot_status === 'over') otAlert = 'OVERTIME';
      else otAlert = 'All clear';
    }

    kpis.innerHTML =
      '<div>In: ' + (l ? l.clock_in : '--') + '</div>' +
      '<div>Out: ' + (l ? (l.clock_out || 'active') : '--') + '</div>' +
      '<div>Today: ' + (l ? l.today_hours + 'h' : '--') + '</div>' +
      '<div>Week: ' + (l ? l.weekly_hours + 'h' : '--') + '</div>' +
      '<div style="color:' + T.gold + '">OT: ' + otAlert + '</div>';
    card.appendChild(kpis);
  }

  return card;
}

// ═══════════════════════════════════════════════════
//  EXPANDED VIEW — 2×2 sunken panel grid
// ═══════════════════════════════════════════════════

function getCardName(params, side) {
  if (params.role === 'manager') return side === 'left' ? 'Sales' : 'Labor';
  return side === 'left' ? 'Shift' : 'Hours';
}

function buildExpandedView(el, params, sales, labor) {
  el.innerHTML = '';
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:20px;';

  var cardName = getCardName(params, expandedCard);
  setSceneName('Reporting // ' + cardName);

  // Full-width frame
  var frame = document.createElement('div');
  frame.style.cssText = 'flex:1;display:flex;flex-direction:column;border:3px solid ' + T.mint + ';box-sizing:border-box;min-height:0;background:' + T.bgDark + ';';

  var isRightCard = expandedCard === 'right';

  // Header area
  if (isRightCard) {
    // Right card has vertical text rail on left side
    var headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;flex:1;min-height:0;';

    var rail = document.createElement('div');
    rail.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;font-family:Impact,sans-serif;font-size:36px;font-weight:bold;color:' + T.cyan + ';display:flex;align-items:center;justify-content:center;padding:0 12px;flex-shrink:0;';
    rail.textContent = params.role === 'manager' ? 'LABOR' : 'HOURS';
    headerRow.appendChild(rail);

    var gridWrap = document.createElement('div');
    gridWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;padding:12px;';
    gridWrap.appendChild(buildPanelGrid(params, sales, labor));
    headerRow.appendChild(gridWrap);

    frame.appendChild(headerRow);
  } else {
    // Left card has title at top
    var titleBar = document.createElement('div');
    titleBar.style.cssText = 'font-family:Impact,sans-serif;font-size:36px;font-weight:bold;font-style:italic;color:' + T.gold + ';padding:12px 16px 0;flex-shrink:0;';
    titleBar.textContent = params.role === 'manager' ? 'SALES' : 'SHIFT';
    frame.appendChild(titleBar);

    var gridWrap = document.createElement('div');
    gridWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;padding:12px;';
    gridWrap.appendChild(buildPanelGrid(params, sales, labor));
    frame.appendChild(gridWrap);
  }

  el.appendChild(frame);
}

function buildPanelGrid(params, sales, labor) {
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;flex:1;min-height:0;';

  var panelNames = getPanelNames(params, expandedCard);

  for (var i = 0; i < 4; i++) {
    var panel = document.createElement('div');
    panel.style.cssText = 'background:' + T.bgDark + ';display:flex;align-items:center;justify-content:center;font-family:Courier New,monospace;font-size:20px;color:' + T.mint + ';';
    applySunkenStyle(panel);
    panel.textContent = 'Chart: ' + panelNames[i];
    grid.appendChild(panel);
  }

  return grid;
}

function getPanelNames(params, side) {
  if (params.role === 'manager' && side === 'left')  return ['NET SALES', 'TOTAL CHECKS', 'CHECK AVG', 'CASH / CARD'];
  if (params.role === 'manager' && side === 'right') return ['TOTAL HRS', 'TIP POOL', 'COB %', 'OT ALERT'];
  if (params.role === 'server'  && side === 'left')  return ['TOTAL GUESTS', 'TOTAL TABLES', 'CHECK AVG', 'TIPS / TIPOUT'];
  return ['TODAY\'S SHIFT', 'WEEKLY HOURS', 'TOTAL HRS', 'OT ALERT'];
}

// ═══════════════════════════════════════════════════
//  RENDER STATE MACHINE
// ═══════════════════════════════════════════════════

function renderCurrentState() {
  if (!currentEl || !currentParams) return;
  if (expandedCard) {
    buildExpandedView(currentEl, currentParams, salesData, laborData);
  } else {
    setSceneName('Reporting');
    buildCollapsedView(currentEl, currentParams, salesData, laborData);
  }
}

// ═══════════════════════════════════════════════════
//  BUILD SCENE
// ═══════════════════════════════════════════════════

function buildScene(el, params) {
  currentEl = el;
  currentParams = params;

  fetchData(params).then(function(data) {
    salesData = data.sales;
    laborData = data.labor;
    renderCurrentState();
  });
}

// ═══════════════════════════════════════════════════
//  REGISTRATION
// ═══════════════════════════════════════════════════

registerScene('reporting', {
  onEnter: function(el, params) {
    setSceneName('Reporting');
    setHeaderBack(true);
    expandedCard = null;
    buildScene(el, params);
  },
  onExit: function() {},
  canExit: function() {
    if (expandedCard) {
      expandedCard = null;
      renderCurrentState();
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  },
  cache: false,
  timeoutMs: 0,
});
