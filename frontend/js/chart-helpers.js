// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Chart Helpers
//  Shared SVG chart drawing functions
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, applySunkenStyle } from './tokens.js';

// ═══════════════════════════════════════════════════
//  CHART CONSTANTS
// ═══════════════════════════════════════════════════

export var CHART = {
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
//  SVG PRIMITIVES
// ═══════════════════════════════════════════════════

var SVG_NS = 'http://www.w3.org/2000/svg';

export function createSVG(width, height) {
  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  return svg;
}

export function svgEl(tag, attrs) {
  var el = document.createElementNS(SVG_NS, tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// ═══════════════════════════════════════════════════
//  BAR CHART — side-by-side vertical bars
// ═══════════════════════════════════════════════════

export function drawBarChart(svg, data, options) {
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
      svg.appendChild(svgEl('rect', { x: x + gap, y: barY, width: barW, height: barH, fill: color }));
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

// ═══════════════════════════════════════════════════
//  HORIZONTAL BARS
// ═══════════════════════════════════════════════════

export function drawHorizontalBars(svg, data, options) {
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

    svg.appendChild(svgEl('text', { x: padLeft - 4, y: y + rowH / 2 + 4, fill: CHART.mint, 'font-size': '10', 'font-family': 'Courier New', 'text-anchor': 'end' })).textContent = data[i].label;
    svg.appendChild(svgEl('rect', { x: padLeft, y: y + (rowH - barH) / 2, width: barWidth, height: barH, fill: barColor }));

    if (data[i].sublabel) {
      svg.appendChild(svgEl('text', { x: padLeft + barWidth + 4, y: y + rowH / 2 + 4, fill: CHART.axisFill, 'font-size': '9', 'font-family': 'Courier New', 'text-anchor': 'start' })).textContent = data[i].sublabel;
    }
  }
}

// ═══════════════════════════════════════════════════
//  TREND LINE — with 8×8 rect data points
// ═══════════════════════════════════════════════════

export function drawTrendLine(svg, data, options) {
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

// ═══════════════════════════════════════════════════
//  PROGRESS BAR — with threshold markers
// ═══════════════════════════════════════════════════

export function drawProgressBar(svg, value, max, options) {
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

// ═══════════════════════════════════════════════════
//  CHART PANEL — sunken panel with header bar
// ═══════════════════════════════════════════════════

export function buildChartPanel(title, value, contentFn) {
  var panel = document.createElement('div');
  panel.style.cssText = 'display:flex;flex-direction:column;min-height:0;overflow:hidden;';

  // Header bar
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:' + CHART.headerBg + ';flex-shrink:0;';

  var titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:Courier New,monospace;font-size:20px;color:' + CHART.mint + ';font-weight:bold;';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  var valueEl = document.createElement('div');
  valueEl.style.cssText = 'font-family:Courier New,monospace;font-size:20px;color:' + CHART.gold + ';font-weight:bold;';
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
