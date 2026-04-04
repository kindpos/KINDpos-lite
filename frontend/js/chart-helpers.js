// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Chart Helpers
//  Shared SVG chart drawing functions
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, applySunkenStyle } from './tokens.js';

// ═══════════════════════════════════════════════════
//  CHART CONSTANTS
// ═══════════════════════════════════════════════════

var FONT = T.fb;

export var CHART = {
  axisFill:    T.mintB,
  axisStroke:  '#666666',
  gridStroke:  '#444444',
  font:        FONT,
  axisFont:    '10px ' + FONT,
  labelFont:   '11px ' + FONT,
  valueFont:   '12px ' + FONT,
  cyan:        T.cyan,
  lavender:    T.lavender,
  gold:        T.gold,
  yellow:      T.yellow,
  red:         T.redB,
  mint:        T.mintB,
  orange:      '#ff8c42',
  teal:        '#00cca3',
  pink:        '#ff6b9d',
  sky:         '#66ccff',
  hotPink:     '#ff2a6d',
  electricBlue:'#05d9e8',
  neonYellow:  '#d1f700',
  neonPurple:  '#bf40ff',
  limeGreen:   '#39ff14',
  neonOrange:  '#ff6e27',
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

// Font size scaler: base sizes designed for 400px width, scale up for larger charts
function fs(base, w) {
  var s = w / 400;
  return '' + Math.round(base * s);
}

// ═══════════════════════════════════════════════════
//  BAR CHART — side-by-side vertical bars with shading
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

  var padLeft = Math.round(50 * w / 400);
  var padRight = 8;
  var padTop = showValueAbove ? Math.round(28 * h / 160) : 10;
  var padBottom = showLabels ? Math.round(32 * h / 160) : 10;
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  var maxVal = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].value > maxVal) maxVal = data[i].value;
    if (hasCompare && data[i].compareValue > maxVal) maxVal = data[i].compareValue;
  }
  if (maxVal === 0) maxVal = 1;

  // Gradient defs for bar shading
  var defs = svgEl('defs', {});
  var grad1 = svgEl('linearGradient', { id: 'barGrad1', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad1.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color }));
  grad1.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0.7' }));
  defs.appendChild(grad1);
  var grad2 = svgEl('linearGradient', { id: 'barGrad2', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad2.appendChild(svgEl('stop', { offset: '0%', 'stop-color': compareColor }));
  grad2.appendChild(svgEl('stop', { offset: '100%', 'stop-color': compareColor, 'stop-opacity': '0.7' }));
  defs.appendChild(grad2);
  svg.appendChild(defs);

  var n = data.length;
  var groupW = chartW / n;
  var barW = hasCompare ? groupW * 0.35 : groupW * 0.6;
  var gap = hasCompare ? groupW * 0.05 : 0;

  // Y-axis gridlines
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(14, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
  }

  for (var i = 0; i < n; i++) {
    var x = padLeft + i * groupW;
    var barH = (data[i].value / maxVal) * chartH;
    var barY = padTop + chartH - barH;

    if (hasCompare) {
      svg.appendChild(svgEl('rect', { x: x + gap, y: barY, width: barW, height: barH, fill: 'url(#barGrad1)' }));
      var cH = ((data[i].compareValue || 0) / maxVal) * chartH;
      var cY = padTop + chartH - cH;
      svg.appendChild(svgEl('rect', { x: x + barW + gap * 2, y: cY, width: barW, height: cH, fill: 'url(#barGrad2)' }));
    } else {
      svg.appendChild(svgEl('rect', { x: x + (groupW - barW) / 2, y: barY, width: barW, height: barH, fill: 'url(#barGrad1)' }));
    }

    if (showValueAbove) {
      svg.appendChild(svgEl('text', { x: x + groupW / 2, y: barY - 3, fill: color, 'font-size': fs(14, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].value;
    }

    if (showLabels) {
      svg.appendChild(svgEl('text', { x: x + groupW / 2, y: h - 3, fill: CHART.axisFill, 'font-size': fs(15, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].label;
    }
  }

  // Legend — stacked vertically on the left side
  if (hasCompare && options.legend) {
    var legSz = Math.round(8 * w / 400);
    var lx = 4;
    var ly = padTop + 4;
    svg.appendChild(svgEl('rect', { x: lx, y: ly, width: legSz, height: legSz, fill: color }));
    svg.appendChild(svgEl('text', { x: lx + legSz + 4, y: ly + legSz, fill: color, 'font-size': fs(12, w), 'font-family': FONT })).textContent = options.legend[0] || 'Today';
    svg.appendChild(svgEl('rect', { x: lx, y: ly + legSz + 8, width: legSz, height: legSz, fill: compareColor }));
    svg.appendChild(svgEl('text', { x: lx + legSz + 4, y: ly + legSz * 2 + 8, fill: compareColor, 'font-size': fs(12, w), 'font-family': FONT })).textContent = options.legend[1] || 'Last Wk';
  }
}

// ═══════════════════════════════════════════════════
//  STACKED AREA CHART — two overlapping filled areas
// ═══════════════════════════════════════════════════

export function drawStackedArea(svg, data, options) {
  var color = options.color || CHART.cyan;
  var compareColor = options.compareColor || CHART.lavender;
  var w = options.width || 300;
  var h = options.height || 150;

  var padLeft = Math.round(55 * w / 400);
  var padRight = 12;
  var padTop = Math.round(14 * h / 160);
  var padBottom = Math.round(32 * h / 160);
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;
  var ptSz = Math.round(8 * w / 400);

  var maxVal = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].value > maxVal) maxVal = data[i].value;
    if (data[i].compareValue !== undefined && data[i].compareValue > maxVal) maxVal = data[i].compareValue;
  }
  if (maxVal === 0) maxVal = 1;

  var n = data.length;
  function toX(i) { return padLeft + (i / (n - 1)) * chartW; }
  function toY(v) { return padTop + chartH - (v / maxVal) * chartH; }
  var baseline = padTop + chartH;

  // Gradient defs
  var defs = svgEl('defs', {});
  var g1 = svgEl('linearGradient', { id: 'areaGrad1', x1: '0', y1: '0', x2: '0', y2: '1' });
  g1.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.7' }));
  g1.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0.1' }));
  defs.appendChild(g1);
  var g2 = svgEl('linearGradient', { id: 'areaGrad2', x1: '0', y1: '0', x2: '0', y2: '1' });
  g2.appendChild(svgEl('stop', { offset: '0%', 'stop-color': compareColor, 'stop-opacity': '0.6' }));
  g2.appendChild(svgEl('stop', { offset: '100%', 'stop-color': compareColor, 'stop-opacity': '0.1' }));
  defs.appendChild(g2);
  svg.appendChild(defs);

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(14, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
  }

  // Compare area (behind)
  var hasCompare = false;
  for (var i = 0; i < data.length; i++) {
    if (data[i].compareValue !== undefined) { hasCompare = true; break; }
  }
  if (hasCompare) {
    var cPath = 'M' + toX(0) + ',' + baseline;
    for (var i = 0; i < n; i++) cPath += ' L' + toX(i) + ',' + toY(data[i].compareValue || 0);
    cPath += ' L' + toX(n - 1) + ',' + baseline + ' Z';
    svg.appendChild(svgEl('path', { d: cPath, fill: 'url(#areaGrad2)' }));
    var cPts = [];
    for (var i = 0; i < n; i++) cPts.push(toX(i) + ',' + toY(data[i].compareValue || 0));
    svg.appendChild(svgEl('polyline', { points: cPts.join(' '), fill: 'none', stroke: compareColor, 'stroke-width': 4, 'stroke-dasharray': '8,4' }));
    for (var i = 0; i < n; i++) {
      svg.appendChild(svgEl('rect', { x: toX(i) - ptSz / 2, y: toY(data[i].compareValue || 0) - ptSz / 2, width: ptSz, height: ptSz, fill: compareColor }));
    }
  }

  // Primary area
  var pPath = 'M' + toX(0) + ',' + baseline;
  for (var i = 0; i < n; i++) pPath += ' L' + toX(i) + ',' + toY(data[i].value);
  pPath += ' L' + toX(n - 1) + ',' + baseline + ' Z';
  svg.appendChild(svgEl('path', { d: pPath, fill: 'url(#areaGrad1)' }));
  var pPts = [];
  for (var i = 0; i < n; i++) pPts.push(toX(i) + ',' + toY(data[i].value));
  svg.appendChild(svgEl('polyline', { points: pPts.join(' '), fill: 'none', stroke: color, 'stroke-width': 4.5 }));
  for (var i = 0; i < n; i++) {
    svg.appendChild(svgEl('rect', { x: toX(i) - ptSz / 2, y: toY(data[i].value) - ptSz / 2, width: ptSz, height: ptSz, fill: color }));
  }

  // Data callouts on peak values — below data point with grey bg
  if (options.showCallouts) {
    var coFs = parseInt(fs(14, w));
    var peakIdx = 0;
    for (var i = 1; i < n; i++) { if (data[i].value > data[peakIdx].value) peakIdx = i; }
    var calloutFmt = options.calloutFmt || function(v) { return v; };
    var calloutText = calloutFmt(data[peakIdx].value);
    var cx = toX(peakIdx);
    var cy = toY(data[peakIdx].value) + coFs + 6;
    var tw = calloutText.length * coFs * 0.6 + 12;
    var th = coFs + 6;
    svg.appendChild(svgEl('rect', { x: cx - tw / 2, y: cy - th + 4, width: tw, height: th, fill: '#444444', rx: 0 }));
    svg.appendChild(svgEl('text', { x: cx, y: cy, fill: color, 'font-size': '' + coFs, 'font-family': FONT, 'text-anchor': 'middle', 'font-weight': 'bold' })).textContent = calloutText;

    if (hasCompare) {
      var cPeakIdx = 0;
      for (var i = 1; i < n; i++) { if ((data[i].compareValue || 0) > (data[cPeakIdx].compareValue || 0)) cPeakIdx = i; }
      if (cPeakIdx !== peakIdx) {
        var cText = calloutFmt(data[cPeakIdx].compareValue);
        var ccx = toX(cPeakIdx);
        var ccy = toY(data[cPeakIdx].compareValue) + coFs + 6;
        var ctw = cText.length * coFs * 0.6 + 12;
        svg.appendChild(svgEl('rect', { x: ccx - ctw / 2, y: ccy - th + 4, width: ctw, height: th, fill: '#444444', rx: 0 }));
        svg.appendChild(svgEl('text', { x: ccx, y: ccy, fill: compareColor, 'font-size': '' + coFs, 'font-family': FONT, 'text-anchor': 'middle' })).textContent = cText;
      }
    }
  }

  // X labels
  for (var i = 0; i < n; i++) {
    svg.appendChild(svgEl('text', { x: toX(i), y: h - 4, fill: CHART.axisFill, 'font-size': fs(15, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].label;
  }

  // Axis labels
  if (options.xLabel) {
    svg.appendChild(svgEl('text', { x: padLeft + chartW / 2, y: h, fill: CHART.axisFill, 'font-size': fs(14, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = options.xLabel;
  }
  if (options.yLabel) {
    var yt = svgEl('text', { x: 8, y: padTop + chartH / 2, fill: CHART.axisFill, 'font-size': fs(14, w), 'font-family': FONT, 'text-anchor': 'middle', transform: 'rotate(-90, 8, ' + (padTop + chartH / 2) + ')' });
    yt.textContent = options.yLabel;
    svg.appendChild(yt);
  }

  // Legend — stacked vertically on the left side
  if (hasCompare && options.legend) {
    var legSz = Math.round(8 * w / 400);
    var lx = 4;
    var ly = padTop + 10;
    svg.appendChild(svgEl('rect', { x: lx, y: ly, width: legSz, height: legSz, fill: color }));
    svg.appendChild(svgEl('text', { x: lx + legSz + 4, y: ly + legSz, fill: color, 'font-size': fs(12, w), 'font-family': FONT })).textContent = options.legend[0] || 'Today';
    svg.appendChild(svgEl('rect', { x: lx, y: ly + legSz + 8, width: legSz, height: legSz, fill: compareColor }));
    svg.appendChild(svgEl('text', { x: lx + legSz + 4, y: ly + legSz * 2 + 8, fill: compareColor, 'font-size': fs(12, w), 'font-family': FONT })).textContent = options.legend[1] || 'Last Wk';
  }
}

// ═══════════════════════════════════════════════════
//  PARETO CHART — bars + cumulative line
// ═══════════════════════════════════════════════════

export function drawParetoChart(svg, data, options) {
  var barColor = options.barColor || CHART.gold;
  var lineColor = options.lineColor || CHART.cyan;
  var w = options.width || 300;
  var h = options.height || 150;

  var padLeft = Math.round(45 * w / 400);
  var padRight = Math.round(40 * w / 400);
  var padTop = Math.round(28 * h / 160);
  var padBottom = Math.round(32 * h / 160);
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;
  var ptSz = Math.round(6 * w / 400);

  // Sort descending
  var sorted = data.slice().sort(function(a, b) { return b.value - a.value; });
  var total = 0;
  for (var i = 0; i < sorted.length; i++) total += sorted[i].value;
  if (total === 0) total = 1;

  var maxVal = sorted[0] ? sorted[0].value : 1;
  var n = sorted.length;
  var groupW = chartW / n;
  var barW = groupW * 0.65;

  // Gradient for bars
  var defs = svgEl('defs', {});
  var grad = svgEl('linearGradient', { id: 'paretoGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': barColor }));
  grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': barColor, 'stop-opacity': '0.7' }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(14, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
  }

  // Bars + cumulative line
  var cumPts = [];
  var cumPcts = [];
  var cumul = 0;
  var coFs = parseInt(fs(14, w));
  for (var i = 0; i < n; i++) {
    var x = padLeft + i * groupW;
    var barH = (sorted[i].value / maxVal) * chartH;
    var barY = padTop + chartH - barH;
    svg.appendChild(svgEl('rect', { x: x + (groupW - barW) / 2, y: barY, width: barW, height: barH, fill: 'url(#paretoGrad)' }));

    // Value callout centered inside top of bar (only when showCallouts is true) with grey bg
    if (options.showCallouts) {
      var valText = '' + sorted[i].value;
      var vtw = valText.length * coFs * 0.6 + 12;
      var vth = coFs + 6;
      var vcy = barY + vth + 2;
      svg.appendChild(svgEl('rect', { x: x + groupW / 2 - vtw / 2, y: vcy - vth + 4, width: vtw, height: vth, fill: '#444444', rx: 0 }));
      svg.appendChild(svgEl('text', { x: x + groupW / 2, y: vcy, fill: barColor, 'font-size': '' + coFs, 'font-family': FONT, 'text-anchor': 'middle', 'font-weight': 'bold' })).textContent = valText;
    }

    // X label
    svg.appendChild(svgEl('text', { x: x + groupW / 2, y: h - 4, fill: CHART.axisFill, 'font-size': fs(15, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = sorted[i].label;

    // Cumulative
    cumul += sorted[i].value;
    var cumPct = cumul / total;
    var cy = padTop + chartH - cumPct * chartH;
    cumPts.push((x + groupW / 2) + ',' + cy);
    cumPcts.push(Math.round(cumPct * 100));
  }

  // Cumulative line
  svg.appendChild(svgEl('polyline', { points: cumPts.join(' '), fill: 'none', stroke: lineColor, 'stroke-width': 4 }));
  for (var i = 0; i < cumPts.length; i++) {
    var parts = cumPts[i].split(',');
    svg.appendChild(svgEl('rect', { x: parseFloat(parts[0]) - ptSz / 2, y: parseFloat(parts[1]) - ptSz / 2, width: ptSz, height: ptSz, fill: lineColor }));
  }

  // Right axis: percentages
  for (var p = 0; p <= 4; p++) {
    var pct = p * 25;
    var py = padTop + chartH - (pct / 100) * chartH;
    svg.appendChild(svgEl('text', { x: w - padRight + 4, y: py + 3, fill: lineColor, 'font-size': fs(14, w), 'font-family': FONT, 'text-anchor': 'start' })).textContent = pct + '%';
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
  var barH = Math.min(rowH * 0.7, Math.round(20 * w / 400));

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

    svg.appendChild(svgEl('text', { x: padLeft - 4, y: y + rowH / 2 + 4, fill: CHART.mint, 'font-size': fs(17, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = data[i].label;
    svg.appendChild(svgEl('rect', { x: padLeft, y: y + (rowH - barH) / 2, width: barWidth, height: barH, fill: barColor }));

    if (data[i].sublabel) {
      svg.appendChild(svgEl('text', { x: padLeft + 6, y: y + rowH / 2 + 4, fill: '#333333', 'font-size': fs(15, w), 'font-family': FONT, 'text-anchor': 'start', 'font-weight': 'bold' })).textContent = data[i].sublabel;
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
  var shaded = options.shaded !== false;

  var padLeft = Math.round(55 * w / 400);
  var padRight = 12;
  var padTop = Math.round(14 * h / 160);
  var padBottom = Math.round(32 * h / 160);
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;
  var ptSz = Math.round(8 * w / 400);

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
  var baseline = padTop + chartH;

  // Gradient defs for shading
  if (shaded) {
    var defs = svgEl('defs', {});
    var tg1 = svgEl('linearGradient', { id: 'trendGrad1', x1: '0', y1: '0', x2: '0', y2: '1' });
    tg1.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.6' }));
    tg1.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0.05' }));
    defs.appendChild(tg1);
    if (compareData) {
      var tg2 = svgEl('linearGradient', { id: 'trendGrad2', x1: '0', y1: '0', x2: '0', y2: '1' });
      tg2.appendChild(svgEl('stop', { offset: '0%', 'stop-color': compareColor, 'stop-opacity': '0.5' }));
      tg2.appendChild(svgEl('stop', { offset: '100%', 'stop-color': compareColor, 'stop-opacity': '0.05' }));
      defs.appendChild(tg2);
    }
    svg.appendChild(defs);
  }

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gv = yMin + (g / 4) * yRange;
    var gy = toY(gv);
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(14, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = gv.toFixed(1);
  }

  // Threshold lines
  for (var t = 0; t < thresholds.length; t++) {
    var ty = toY(thresholds[t].value);
    svg.appendChild(svgEl('line', { x1: padLeft, y1: ty, x2: w - padRight, y2: ty, stroke: thresholds[t].color, 'stroke-width': 3, 'stroke-dasharray': '6,4' }));
  }

  // Comparison: shaded area + dashed line
  if (compareData && compareData.length > 0) {
    if (shaded) {
      var cPath = 'M' + toX(0) + ',' + baseline;
      for (var i = 0; i < compareData.length; i++) cPath += ' L' + toX(i) + ',' + toY(compareData[i].value);
      cPath += ' L' + toX(compareData.length - 1) + ',' + baseline + ' Z';
      svg.appendChild(svgEl('path', { d: cPath, fill: 'url(#trendGrad2)' }));
    }
    var cPoints = [];
    for (var i = 0; i < compareData.length; i++) {
      cPoints.push(toX(i) + ',' + toY(compareData[i].value));
    }
    svg.appendChild(svgEl('polyline', { points: cPoints.join(' '), fill: 'none', stroke: compareColor, 'stroke-width': 3.5, 'stroke-dasharray': '8,4' }));
    for (var i = 0; i < compareData.length; i++) {
      svg.appendChild(svgEl('rect', { x: toX(i) - ptSz / 2, y: toY(compareData[i].value) - ptSz / 2, width: ptSz, height: ptSz, fill: compareColor }));
    }
  }

  // Primary: shaded area + solid line
  if (shaded) {
    var pPath = 'M' + toX(0) + ',' + baseline;
    for (var i = 0; i < data.length; i++) pPath += ' L' + toX(i) + ',' + toY(data[i].value);
    pPath += ' L' + toX(data.length - 1) + ',' + baseline + ' Z';
    svg.appendChild(svgEl('path', { d: pPath, fill: 'url(#trendGrad1)' }));
  }
  var points = [];
  for (var i = 0; i < data.length; i++) {
    points.push(toX(i) + ',' + toY(data[i].value));
  }
  svg.appendChild(svgEl('polyline', { points: points.join(' '), fill: 'none', stroke: color, 'stroke-width': 3.5 }));
  for (var i = 0; i < data.length; i++) {
    svg.appendChild(svgEl('rect', { x: toX(i) - ptSz / 2, y: toY(data[i].value) - ptSz / 2, width: ptSz, height: ptSz, fill: color }));
  }

  // X labels
  for (var i = 0; i < data.length; i++) {
    svg.appendChild(svgEl('text', { x: toX(i), y: h - 4, fill: CHART.axisFill, 'font-size': fs(15, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].label;
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
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:' + CHART.headerBg + ';flex-shrink:0;border-bottom:1px solid ' + CHART.gridStroke + ';';

  var titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:' + FONT + ';font-size:14px;color:' + CHART.mint + ';font-weight:bold;letter-spacing:1px;';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  var valueEl = document.createElement('div');
  valueEl.style.cssText = 'font-family:' + FONT + ';font-size:16px;color:' + CHART.gold + ';font-weight:bold;';
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
//  CHART GRID — 2×2 panel grid with tap-to-expand
//  panelBuilderFn(fullSize) should return array of 4 panels
//  onStateChange() is called when expand/collapse happens
// ═══════════════════════════════════════════════════

export function buildChartGrid(panelBuilderFn, onStateChange) {
  var state = { expandedIdx: null };

  function render() {
    var container = document.createElement('div');
    var fullSize = state.expandedIdx !== null;

    if (fullSize) {
      container.style.cssText = 'display:flex;flex:1;min-height:0;';
      var panels = panelBuilderFn(true);
      var panel = panels[state.expandedIdx];
      panel.style.flex = '1';
      panel.style.cursor = 'pointer';
      panel.addEventListener('pointerup', function(e) {
        e.stopPropagation();
        state.expandedIdx = null;
        if (onStateChange) onStateChange(state);
      });
      container.appendChild(panel);
    } else {
      container.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;flex:1;min-height:0;';
      var panels = panelBuilderFn(false);
      for (var i = 0; i < panels.length; i++) {
        (function(idx) {
          panels[idx].style.cursor = 'pointer';
          panels[idx].addEventListener('pointerup', function(e) {
            e.stopPropagation();
            state.expandedIdx = idx;
            if (onStateChange) onStateChange(state);
          });
        })(i);
        container.appendChild(panels[i]);
      }
    }

    return container;
  }

  return { render: render, state: state };
}
