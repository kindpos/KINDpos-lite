// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Chart Helpers
//  Shared SVG chart drawing functions
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, applySunkenStyle } from './tokens.js';
import { DATA } from './chart-colors.js';
import { injectChartDefs, PAT, GLOW } from './chart-patterns.js';

// ═══════════════════════════════════════════════════
//  CHART CONSTANTS (v4 locked palette)
// ═══════════════════════════════════════════════════

var FONT = T.fb;

export var CHART = {
  // Structural — derived from theme tokens
  axisFill:    T.textPrimary,   // axis labels: white
  axisStroke:  T.textPrimary,   // axis lines: white
  gridStroke:  T.border,        // grid lines: theme border
  calloutBg:   T.bg,            // value callout backgrounds (#333333)
  money:       T.gold,          // money values on axes
  font:        FONT,
  axisFont:    '22px ' + FONT,
  labelFont:   '24px ' + FONT,
  valueFont:   '26px ' + FONT,

  // Data series (v4 locked)
  orange:      DATA.orange,
  coral:       DATA.coral,
  pink:        DATA.pink,
  violet:      DATA.violet,
  blue:        DATA.blue,

  // Warning/Critical
  yellow:      DATA.warning,
  red:         DATA.critical,

  // Heatmap tiers
  heatDead:    DATA.heatDead,
  heatSlow:    DATA.heatSlow,
  heatSteady:  DATA.heatSteady,
  heatBusy:    DATA.heatBusy,
  heatSlammed: DATA.heatSlammed,

  // UI chrome references (panel wrappers only — NOT inside SVG chart data)
  mint:        T.mintB,
  gold:        T.gold,
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
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.display = 'block';
  svg.style.overflow = 'visible';
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

// Standard chart padding — scaled from tokens to actual chart dimensions.
// Options can override any side. Base tokens assume T.chartW × T.chartH.
function chartPad(w, h, opts) {
  opts = opts || {};
  return {
    left:   opts.padLeft   != null ? opts.padLeft   : Math.round(T.chartLblW * w / T.chartW),
    right:  opts.padRight  != null ? opts.padRight  : Math.round(T.chartPadR * w / T.chartW),
    top:    opts.padTop    != null ? opts.padTop     : Math.round(T.chartPadT * h / T.chartH),
    bottom: opts.padBottom != null ? opts.padBottom  : Math.round(T.chartPadB * h / T.chartH),
  };
}

// ═══════════════════════════════════════════════════
//  BAR CHART — side-by-side vertical bars with shading
// ═══════════════════════════════════════════════════

export function drawBarChart(svg, data, options) {
  var color = options.color || DATA.orange;
  var compareColor = options.compareColor || DATA.blue;
  var w = options.width || 300;
  var h = options.height || 150;
  var showLabels = options.showLabels !== false;
  var showValueAbove = options.showValueAbove || false;
  var hasCompare = false;
  for (var i = 0; i < data.length; i++) {
    if (data[i].compareValue !== undefined && data[i].compareValue !== null) { hasCompare = true; break; }
  }

  var _p = chartPad(w, h, options);
  var padLeft = _p.left;
  var padRight = _p.right;
  var padTop = showValueAbove ? Math.round(_p.top * 2.8) : _p.top;
  var padBottom = showLabels ? _p.bottom : _p.top;
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  var maxVal = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].value > maxVal) maxVal = data[i].value;
    if (hasCompare && data[i].compareValue > maxVal) maxVal = data[i].compareValue;
  }
  if (maxVal === 0) maxVal = 1;

  // Pattern defs
  injectChartDefs(svg);
  var fill1 = options.patternFill || color;
  var fill2 = options.comparePatternFill || compareColor;

  var n = data.length;
  var groupW = chartW / n;
  var barW = hasCompare ? groupW * 0.35 : groupW * 0.6;
  var gap = hasCompare ? groupW * 0.05 : 0;

  // Y-axis gridlines
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
  }

  for (var i = 0; i < n; i++) {
    var x = padLeft + i * groupW;
    var barH = (data[i].value / maxVal) * chartH;
    var barY = padTop + chartH - barH;

    if (hasCompare) {
      svg.appendChild(svgEl('rect', { x: x + gap, y: barY, width: barW, height: barH, fill: fill1, stroke: color, 'stroke-width': '1.5' }));
      var cH = ((data[i].compareValue || 0) / maxVal) * chartH;
      var cY = padTop + chartH - cH;
      svg.appendChild(svgEl('rect', { x: x + barW + gap * 2, y: cY, width: barW, height: cH, fill: fill2, stroke: compareColor, 'stroke-width': '1.5' }));
    } else {
      svg.appendChild(svgEl('rect', { x: x + (groupW - barW) / 2, y: barY, width: barW, height: barH, fill: fill1, stroke: color, 'stroke-width': '1.5' }));
    }

    if (showValueAbove) {
      var valStr = '' + data[i].value;
      var vFs = parseInt(fs(13, w));
      var vTw = valStr.length * vFs * 0.6 + 10;
      var vTh = vFs + 6;
      var vX = hasCompare ? x + barW / 2 + gap : x + groupW / 2;
      // Center inside the bar; fallback above if bar too short
      var vY = barY + barH / 2 + vFs / 3;
      if (barH < vTh + 4) vY = barY - 2;
      svg.appendChild(svgEl('rect', { x: vX - vTw / 2, y: vY - vTh + 2, width: vTw, height: vTh, fill: T.bg, rx: 2 }));
      svg.appendChild(svgEl('text', { x: vX, y: vY - 1, fill: color, 'font-size': '' + vFs, 'font-family': FONT, 'text-anchor': 'middle', 'font-weight': 'bold' })).textContent = valStr;
    }

    if (showLabels) {
      svg.appendChild(svgEl('text', { x: x + groupW / 2, y: h - 3, fill: CHART.axisFill, 'font-size': fs(24, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].label;
    }
  }

  // Legend removed from SVG — now rendered in panel header via buildChartPanel
}

// ═══════════════════════════════════════════════════
//  STACKED AREA CHART — two overlapping filled areas
// ═══════════════════════════════════════════════════

export function drawStackedArea(svg, data, options) {
  var color = options.color || DATA.orange;
  var compareColor = options.compareColor || DATA.blue;
  var w = options.width || 300;
  var h = options.height || 150;

  var padLeft = Math.round(70 * w / 400);
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

  // Pattern defs
  injectChartDefs(svg);
  var areaFill1 = options.areaPatternFill || PAT.orange;
  var areaFill2 = options.compareAreaPatternFill || PAT.blue;

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
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
    svg.appendChild(svgEl('path', { d: cPath, fill: areaFill2 }));
    var cPts = [];
    for (var i = 0; i < n; i++) cPts.push(toX(i) + ',' + toY(data[i].compareValue || 0));
    svg.appendChild(svgEl('polyline', { points: cPts.join(' '), fill: 'none', stroke: compareColor, 'stroke-width': 2.5, 'stroke-dasharray': '8,4', filter: GLOW.blue }));
    for (var i = 0; i < n; i++) {
      svg.appendChild(svgEl('rect', { x: toX(i) - ptSz / 2, y: toY(data[i].compareValue || 0) - ptSz / 2, width: ptSz, height: ptSz, fill: compareColor }));
    }
  }

  // Primary area
  var pPath = 'M' + toX(0) + ',' + baseline;
  for (var i = 0; i < n; i++) pPath += ' L' + toX(i) + ',' + toY(data[i].value);
  pPath += ' L' + toX(n - 1) + ',' + baseline + ' Z';
  svg.appendChild(svgEl('path', { d: pPath, fill: areaFill1 }));
  var pPts = [];
  for (var i = 0; i < n; i++) pPts.push(toX(i) + ',' + toY(data[i].value));
  svg.appendChild(svgEl('polyline', { points: pPts.join(' '), fill: 'none', stroke: color, 'stroke-width': 3, filter: GLOW.orange }));
  for (var i = 0; i < n; i++) {
    svg.appendChild(svgEl('rect', { x: toX(i) - ptSz / 2, y: toY(data[i].value) - ptSz / 2, width: ptSz, height: ptSz, fill: color }));
  }

  // Data callouts on all points — inside column area with grey bg
  if (options.showCallouts) {
    var coFs = parseInt(fs(13, w));
    var calloutFmt = options.calloutFmt || function(v) { return v; };
    var colW = n > 1 ? chartW / (n - 1) : chartW;

    for (var i = 0; i < n; i++) {
      var cText = calloutFmt(data[i].value);
      var cx = toX(i);
      var cy = toY(data[i].value) + coFs + 6;
      if (cy > baseline - 4) cy = toY(data[i].value) - 4;
      var tw = cText.length * coFs * 0.6 + 10;
      var th = coFs + 4;
      svg.appendChild(svgEl('rect', { x: cx - tw / 2, y: cy - th + 2, width: tw, height: th, fill: T.bg }));
      svg.appendChild(svgEl('text', { x: cx, y: cy - 1, fill: color, 'font-size': '' + coFs, 'font-family': FONT, 'text-anchor': 'middle', 'font-weight': 'bold' })).textContent = cText;
    }

    if (hasCompare) {
      for (var i = 0; i < n; i++) {
        if (data[i].compareValue === undefined) continue;
        var ccText = calloutFmt(data[i].compareValue);
        var ccx = toX(i);
        var ccy = toY(data[i].compareValue) + coFs + 6;
        if (ccy > baseline - 4) ccy = toY(data[i].compareValue) - 4;
        var ctw = ccText.length * coFs * 0.6 + 10;
        svg.appendChild(svgEl('rect', { x: ccx - ctw / 2, y: ccy - th + 2, width: ctw, height: th, fill: T.bg }));
        svg.appendChild(svgEl('text', { x: ccx, y: ccy - 1, fill: compareColor, 'font-size': '' + coFs, 'font-family': FONT, 'text-anchor': 'middle' })).textContent = ccText;
      }
    }
  }

  // X labels
  for (var i = 0; i < n; i++) {
    svg.appendChild(svgEl('text', { x: toX(i), y: h - 4, fill: CHART.axisFill, 'font-size': fs(20, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].label;
  }

  // Axis labels
  if (options.xLabel) {
    svg.appendChild(svgEl('text', { x: padLeft + chartW / 2, y: h, fill: CHART.axisFill, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = options.xLabel;
  }
  if (options.yLabel) {
    var yt = svgEl('text', { x: 8, y: padTop + chartH / 2, fill: CHART.axisFill, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'middle', transform: 'rotate(-90, 8, ' + (padTop + chartH / 2) + ')' });
    yt.textContent = options.yLabel;
    svg.appendChild(yt);
  }

  // Legend removed from SVG — now rendered in panel header via buildChartPanel
}

// ═══════════════════════════════════════════════════
//  PARETO CHART — bars + cumulative line
// ═══════════════════════════════════════════════════

export function drawParetoChart(svg, data, options) {
  var barColor = options.barColor || DATA.orange;
  var lineColor = options.lineColor || DATA.coral;
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

  // Pattern defs
  injectChartDefs(svg);
  var barFill = options.barPatternFill || barColor;

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
  }

  // Bars + cumulative line
  var cumPts = [];
  var cumPcts = [];
  var cumul = 0;
  var coFs = parseInt(fs(22, w));
  for (var i = 0; i < n; i++) {
    var x = padLeft + i * groupW;
    var barH = (sorted[i].value / maxVal) * chartH;
    var barY = padTop + chartH - barH;
    svg.appendChild(svgEl('rect', { x: x + (groupW - barW) / 2, y: barY, width: barW, height: barH, fill: barFill, stroke: barColor, 'stroke-width': '1.5' }));

    // Value callout inside top of bar with grey bg
    if (options.showCallouts) {
      var valText = '' + sorted[i].value;
      var vtw = valText.length * coFs * 0.6 + 12;
      var vth = coFs + 4;
      var vcy = barY + vth + 4;
      if (vcy > padTop + chartH - 2) vcy = barY + vth;
      svg.appendChild(svgEl('rect', { x: x + groupW / 2 - vtw / 2, y: vcy - vth + 2, width: vtw, height: vth, fill: T.bg }));
      svg.appendChild(svgEl('text', { x: x + groupW / 2, y: vcy - 1, fill: barColor, 'font-size': '' + coFs, 'font-family': FONT, 'text-anchor': 'middle', 'font-weight': 'bold' })).textContent = valText;
    }

    // X label
    svg.appendChild(svgEl('text', { x: x + groupW / 2, y: h - 4, fill: CHART.axisFill, 'font-size': fs(24, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = sorted[i].label;

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
    svg.appendChild(svgEl('text', { x: w - padRight + 4, y: py + 3, fill: lineColor, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'start' })).textContent = pct + '%';
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
    var barColor = data[i].color || options.color || DATA.orange;
    var barWidth = (data[i].value / maxVal) * chartW;

    svg.appendChild(svgEl('text', { x: padLeft - 4, y: y + rowH / 2 + 4, fill: barColor, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = data[i].label;
    svg.appendChild(svgEl('rect', { x: padLeft, y: y + (rowH - barH) / 2, width: barWidth, height: barH, fill: barColor }));

    if (data[i].sublabel) {
      svg.appendChild(svgEl('text', { x: padLeft + 6, y: y + rowH / 2 + 4, fill: T.bg, 'font-size': fs(20, w), 'font-family': FONT, 'text-anchor': 'start', 'font-weight': 'bold' })).textContent = data[i].sublabel;
    }
  }
}

// ═══════════════════════════════════════════════════
//  TREND LINE — with 8×8 rect data points
// ═══════════════════════════════════════════════════

export function drawTrendLine(svg, data, options) {
  var color = options.color || DATA.orange;
  var w = options.width || 300;
  var h = options.height || 150;
  var compareColor = options.compareColor || DATA.blue;
  var thresholds = options.thresholds || [];
  var shaded = options.shaded !== false;
  var hideLabels = options.hideLabels || false;
  var hideAxis = options.hideAxis || false;

  // Support compareData as separate array or inline compareValue on data items
  var compareData = options.compareData || null;
  if (!compareData && data.length > 0 && data[0].compareValue != null) {
    compareData = data.map(function(d) { return { label: d.label, value: d.compareValue || 0 }; });
  }

  var _p = chartPad(w, h, {
    padLeft: hideAxis ? Math.round(8 * w / T.chartW) : null,
    padBottom: hideLabels ? Math.round(8 * h / T.chartH) : null,
  });
  var padLeft = _p.left;
  var padRight = _p.right;
  var padTop = _p.top;
  var padBottom = _p.bottom;
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

  // Pattern defs for area fills
  injectChartDefs(svg);
  var areaFill1 = options.areaPatternFill || PAT.coral;
  var areaFill2 = options.compareAreaPatternFill || PAT.blue;

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gv = yMin + (g / 4) * yRange;
    var gy = toY(gv);
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    if (!hideAxis) {
      svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(20, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = gv.toFixed(1);
    }
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
      svg.appendChild(svgEl('path', { d: cPath, fill: areaFill2 }));
    }
    var cPoints = [];
    for (var i = 0; i < compareData.length; i++) {
      cPoints.push(toX(i) + ',' + toY(compareData[i].value));
    }
    svg.appendChild(svgEl('polyline', { points: cPoints.join(' '), fill: 'none', stroke: compareColor, 'stroke-width': 2.5, 'stroke-dasharray': '8,4', filter: GLOW.blue }));
    for (var i = 0; i < compareData.length; i++) {
      svg.appendChild(svgEl('rect', { x: toX(i) - ptSz / 2, y: toY(compareData[i].value) - ptSz / 2, width: ptSz, height: ptSz, fill: compareColor }));
    }
    // Compare callouts
    if (options.showCallouts) {
      var coFsCmp = parseInt(fs(11, w));
      for (var i = 0; i < compareData.length; i++) {
        var cvText = options.calloutFmt ? options.calloutFmt(compareData[i].value) : '' + compareData[i].value;
        var cvTw = cvText.length * coFsCmp * 0.6 + 8;
        var cvTh = coFsCmp + 4;
        var cvX = toX(i);
        var cvY = toY(compareData[i].value) + ptSz + cvTh;
        if (cvY > baseline) cvY = toY(compareData[i].value) - ptSz - 2;
        svg.appendChild(svgEl('rect', { x: cvX - cvTw / 2, y: cvY - cvTh + 2, width: cvTw, height: cvTh, fill: T.bg, rx: 2 }));
        svg.appendChild(svgEl('text', { x: cvX, y: cvY - 1, fill: compareColor, 'font-size': '' + coFsCmp, 'font-family': FONT, 'text-anchor': 'middle' })).textContent = cvText;
      }
    }
  }

  // Primary: shaded area + solid line
  if (shaded) {
    var pPath = 'M' + toX(0) + ',' + baseline;
    for (var i = 0; i < data.length; i++) pPath += ' L' + toX(i) + ',' + toY(data[i].value);
    pPath += ' L' + toX(data.length - 1) + ',' + baseline + ' Z';
    svg.appendChild(svgEl('path', { d: pPath, fill: areaFill1 }));
  }
  var points = [];
  for (var i = 0; i < data.length; i++) {
    points.push(toX(i) + ',' + toY(data[i].value));
  }
  svg.appendChild(svgEl('polyline', { points: points.join(' '), fill: 'none', stroke: color, 'stroke-width': 3, filter: GLOW.orange }));
  for (var i = 0; i < data.length; i++) {
    svg.appendChild(svgEl('rect', { x: toX(i) - ptSz / 2, y: toY(data[i].value) - ptSz / 2, width: ptSz, height: ptSz, fill: color }));
  }
  // Primary callouts
  if (options.showCallouts) {
    var coFs = parseInt(fs(11, w));
    for (var i = 0; i < data.length; i++) {
      var vText = options.calloutFmt ? options.calloutFmt(data[i].value) : '' + data[i].value;
      var vTw = vText.length * coFs * 0.6 + 8;
      var vTh = coFs + 4;
      var vX = toX(i);
      var vY = toY(data[i].value) - ptSz - 2;
      if (vY < padTop) vY = toY(data[i].value) + ptSz + vTh;
      svg.appendChild(svgEl('rect', { x: vX - vTw / 2, y: vY - vTh + 2, width: vTw, height: vTh, fill: T.bg, rx: 2 }));
      svg.appendChild(svgEl('text', { x: vX, y: vY - 1, fill: color, 'font-size': '' + coFs, 'font-family': FONT, 'text-anchor': 'middle' })).textContent = vText;
    }
  }

  // X labels
  if (!hideLabels) {
    for (var i = 0; i < data.length; i++) {
      svg.appendChild(svgEl('text', { x: toX(i), y: h - 4, fill: CHART.axisFill, 'font-size': fs(20, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].label;
    }
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
  var color = options.color || DATA.orange;

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
//  STACKED COLUMN + LINE — v4 Q1
//  Bars stacked bottom-up, cumulative line overlaid
// ═══════════════════════════════════════════════════

export function drawStackedColumn(svg, data, options) {
  var w = options.width || 300;
  var h = options.height || 150;
  var series = options.series || [];  // [{ key, color, pattern }]
  var lineColor = options.lineColor || DATA.coral;

  injectChartDefs(svg);

  var padLeft = Math.round(70 * w / 400);
  var padRight = 12;
  var padTop = Math.round(14 * h / 160);
  var padBottom = Math.round(32 * h / 160);
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  // Compute max stacked value and cumulative totals
  var maxVal = 0;
  var cumTotals = [];
  for (var i = 0; i < data.length; i++) {
    var stackTotal = 0;
    for (var s = 0; s < series.length; s++) {
      stackTotal += (data[i][series[s].key] || 0);
    }
    if (stackTotal > maxVal) maxVal = stackTotal;
    cumTotals.push(i === 0 ? stackTotal : cumTotals[i - 1] + stackTotal);
  }
  if (maxVal === 0) maxVal = 1;

  // Use cumulative max for Y scale if cumulative line present
  var cumMax = cumTotals.length > 0 ? cumTotals[cumTotals.length - 1] : 0;
  var yMax = options.showCumulative ? Math.max(maxVal, cumMax) : maxVal;
  if (yMax === 0) yMax = 1;

  var n = data.length;
  var groupW = chartW / n;
  var barW = groupW * 0.6;
  var ptSz = Math.round(8 * w / 400);

  // Grid + Y-axis labels
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = Math.round(yMax * g / 4);
  }

  // Stacked bars
  for (var i = 0; i < n; i++) {
    var x = padLeft + i * groupW + (groupW - barW) / 2;
    var yOffset = 0;
    for (var s = 0; s < series.length; s++) {
      var val = data[i][series[s].key] || 0;
      var barH = (val / yMax) * chartH;
      var barY = padTop + chartH - yOffset - barH;
      svg.appendChild(svgEl('rect', {
        x: x, y: barY, width: barW, height: barH,
        fill: series[s].pattern || series[s].color,
        stroke: series[s].color, 'stroke-width': '1.5'
      }));
      yOffset += barH;
    }

    // X label
    svg.appendChild(svgEl('text', { x: padLeft + i * groupW + groupW / 2, y: h - 4, fill: CHART.axisFill, 'font-size': fs(24, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].label;
  }

  // Cumulative line overlay (coral, dashed 5,3)
  if (options.showCumulative !== false && cumTotals.length > 0) {
    var cumPts = [];
    for (var i = 0; i < n; i++) {
      var cx = padLeft + i * groupW + groupW / 2;
      var cy = padTop + chartH - (cumTotals[i] / yMax) * chartH;
      cumPts.push(cx + ',' + cy);
    }
    svg.appendChild(svgEl('polyline', { points: cumPts.join(' '), fill: 'none', stroke: lineColor, 'stroke-width': 3, 'stroke-dasharray': '5,3', filter: GLOW.coral }));
    for (var i = 0; i < cumPts.length; i++) {
      var parts = cumPts[i].split(',');
      svg.appendChild(svgEl('rect', { x: parseFloat(parts[0]) - ptSz / 2, y: parseFloat(parts[1]) - ptSz / 2, width: ptSz, height: ptSz, fill: lineColor }));
    }
  }
}

// ═══════════════════════════════════════════════════
//  HISTOGRAM — v4 Q2 Server
//  Coral crosshatch bars, orange count labels
// ═══════════════════════════════════════════════════

export function drawHistogram(svg, data, options) {
  var w = options.width || 300;
  var h = options.height || 150;
  var barColor = DATA.coral;
  var labelColor = DATA.orange;

  injectChartDefs(svg);

  var padLeft = Math.round(50 * w / 400);
  var padRight = 12;
  var padTop = Math.round(14 * h / 160);
  var padBottom = Math.round(36 * h / 160);
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  var maxVal = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].count > maxVal) maxVal = data[i].count;
  }
  if (maxVal === 0) maxVal = 1;

  var n = data.length;
  var groupW = chartW / n;
  var barW = groupW * 0.7;

  // Grid
  for (var g = 0; g <= 4; g++) {
    var gy = padTop + chartH - (g / 4) * chartH;
    svg.appendChild(svgEl('line', { x1: padLeft, y1: gy, x2: w - padRight, y2: gy, stroke: CHART.gridStroke, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: gy + 3, fill: CHART.axisFill, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = Math.round(maxVal * g / 4);
  }

  // Bars
  for (var i = 0; i < n; i++) {
    var x = padLeft + i * groupW + (groupW - barW) / 2;
    var barH = (data[i].count / maxVal) * chartH;
    var barY = padTop + chartH - barH;
    svg.appendChild(svgEl('rect', { x: x, y: barY, width: barW, height: barH, fill: PAT.coral, stroke: barColor, 'stroke-width': '1.5' }));

    // Count label inside/above bar
    var coFs = parseInt(fs(20, w));
    var labelY = barH > coFs + 8 ? barY + coFs + 4 : barY - 4;
    svg.appendChild(svgEl('text', { x: x + barW / 2, y: labelY, fill: labelColor, 'font-size': '' + coFs, 'font-family': FONT, 'text-anchor': 'middle', 'font-weight': 'bold' })).textContent = '' + data[i].count;

    // X label (bucket range)
    svg.appendChild(svgEl('text', { x: padLeft + i * groupW + groupW / 2, y: h - 4, fill: CHART.axisFill, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = data[i].label;
  }

  // Summary stat bottom-right: "AVG $X.XX"
  if (options.avgValue !== undefined) {
    var avgText = 'AVG $' + options.avgValue.toFixed(2);
    svg.appendChild(svgEl('text', { x: w - padRight - 4, y: h - padBottom + Math.round(14 * h / 160), fill: CHART.axisFill, 'font-size': fs(24, w), 'font-family': FONT, 'text-anchor': 'end', 'font-weight': 'bold' })).textContent = avgText;
  }
}

// ═══════════════════════════════════════════════════
//  HEATMAP — v4 Q2 Manager
//  7 rows (Mon-Sun) × N columns (hourly buckets)
//  Solid fill from heatmap tiers, glow on busy/slammed
// ═══════════════════════════════════════════════════

export function drawHeatmap(svg, data, options) {
  var w = options.width || 300;
  var h = options.height || 150;
  var rows = options.rows || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var cols = options.cols || [];

  injectChartDefs(svg);

  var padLeft = Math.round(50 * w / 400);
  var padRight = 8;
  var padTop = Math.round(24 * h / 160);
  var padBottom = Math.round(30 * h / 160);
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  var nRows = rows.length;
  var nCols = cols.length;
  if (nCols === 0 || nRows === 0) return;

  var cellW = chartW / nCols;
  var cellH = chartH / nRows;
  var gap = 1;

  var tiers = [
    { max: 0.2, color: DATA.heatDead, glow: false },
    { max: 0.4, color: DATA.heatSlow, glow: false },
    { max: 0.6, color: DATA.heatSteady, glow: false },
    { max: 0.8, color: DATA.heatBusy, glow: true },
    { max: 1.01, color: DATA.heatSlammed, glow: true },
  ];

  function tierFor(val, maxVal) {
    if (maxVal === 0) return tiers[0];
    var pct = val / maxVal;
    for (var t = 0; t < tiers.length; t++) {
      if (pct <= tiers[t].max) return tiers[t];
    }
    return tiers[tiers.length - 1];
  }

  // Find max value
  var maxVal = 0;
  for (var r = 0; r < nRows; r++) {
    for (var c = 0; c < nCols; c++) {
      var val = (data[r] && data[r][c]) || 0;
      if (val > maxVal) maxVal = val;
    }
  }

  // Column headers
  for (var c = 0; c < nCols; c++) {
    svg.appendChild(svgEl('text', { x: padLeft + c * cellW + cellW / 2, y: padTop - 4, fill: CHART.axisFill, 'font-size': fs(18, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = cols[c];
  }

  // Row labels + cells
  for (var r = 0; r < nRows; r++) {
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: padTop + r * cellH + cellH / 2 + 4, fill: CHART.axisFill, 'font-size': fs(20, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = rows[r];

    for (var c = 0; c < nCols; c++) {
      var val = (data[r] && data[r][c]) || 0;
      var tier = tierFor(val, maxVal);
      var attrs = {
        x: padLeft + c * cellW + gap, y: padTop + r * cellH + gap,
        width: cellW - gap * 2, height: cellH - gap * 2,
        fill: tier.color
      };
      if (tier.glow) {
        attrs.filter = tier.color === DATA.heatBusy ? GLOW.pink : GLOW.orange;
      }
      svg.appendChild(svgEl('rect', attrs));
    }
  }

  // Legend row below
  var legendY = h - padBottom + Math.round(8 * h / 160);
  var legendLabels = ['DEAD', 'SLOW', 'STEADY', 'BUSY', 'SLAMMED'];
  var legendColors = [DATA.heatDead, DATA.heatSlow, DATA.heatSteady, DATA.heatBusy, DATA.heatSlammed];
  var legendW = chartW / legendLabels.length;
  for (var i = 0; i < legendLabels.length; i++) {
    var lx = padLeft + i * legendW;
    svg.appendChild(svgEl('rect', { x: lx, y: legendY, width: legendW - 4, height: Math.round(10 * h / 160), fill: legendColors[i] }));
    svg.appendChild(svgEl('text', { x: lx + (legendW - 4) / 2, y: legendY + Math.round(20 * h / 160), fill: CHART.axisFill, 'font-size': fs(16, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = legendLabels[i];
  }
}

// ═══════════════════════════════════════════════════
//  PARETO BAR (HORIZONTAL) — v4 Q4
//  Horizontal bars descending by value + cumulative % line
// ═══════════════════════════════════════════════════

export function drawParetoHBar(svg, data, options) {
  var w = options.width || 300;
  var h = options.height || 150;

  injectChartDefs(svg);

  var padLeft = Math.round(80 * w / 400);
  var padRight = Math.round(45 * w / 400);
  var padTop = Math.round(10 * h / 160);
  var padBottom = Math.round(10 * h / 160);
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  // Sort descending by value
  var sorted = data.slice().sort(function(a, b) { return b.value - a.value; });
  var n = sorted.length;
  if (n === 0) return;
  var maxVal = sorted[0].value || 1;
  var total = 0;
  for (var i = 0; i < n; i++) total += sorted[i].value;
  if (total === 0) total = 1;

  var rowH = chartH / n;
  var barH = Math.min(rowH * 0.7, Math.round(22 * w / 400));
  var ptSz = Math.round(6 * w / 400);

  // Bars + labels
  var cumPts = [];
  var cumul = 0;
  for (var i = 0; i < n; i++) {
    var y = padTop + i * rowH;
    var barW = (sorted[i].value / maxVal) * chartW;
    var fill = sorted[i].pattern || sorted[i].color || PAT.orange;
    var strokeColor = sorted[i].color || DATA.orange;

    // Item name label
    svg.appendChild(svgEl('text', { x: padLeft - 4, y: y + rowH / 2 + 4, fill: strokeColor, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'end' })).textContent = sorted[i].label;

    // Bar
    svg.appendChild(svgEl('rect', { x: padLeft, y: y + (rowH - barH) / 2, width: barW, height: barH, fill: fill, stroke: strokeColor, 'stroke-width': '1.5' }));

    // Dollar label with glow
    svg.appendChild(svgEl('text', { x: padLeft + barW + 4, y: y + rowH / 2 + 4, fill: strokeColor, 'font-size': fs(22, w), 'font-family': FONT, 'text-anchor': 'start', filter: GLOW.coral })).textContent = '$' + sorted[i].value;

    // Cumulative %
    cumul += sorted[i].value;
    var cumPct = cumul / total;
    var cx = padLeft + cumPct * chartW;
    var cy = y + rowH / 2;
    cumPts.push(cx + ',' + cy);
  }

  // Cumulative % line (coral dashed 5,3)
  if (cumPts.length > 1) {
    svg.appendChild(svgEl('polyline', { points: cumPts.join(' '), fill: 'none', stroke: DATA.coral, 'stroke-width': 2.5, 'stroke-dasharray': '5,3' }));
    for (var i = 0; i < cumPts.length; i++) {
      var parts = cumPts[i].split(',');
      svg.appendChild(svgEl('rect', { x: parseFloat(parts[0]) - ptSz / 2, y: parseFloat(parts[1]) - ptSz / 2, width: ptSz, height: ptSz, fill: CHART.axisFill }));
    }
  }

  // Right axis: percentages
  for (var p = 0; p <= 4; p++) {
    var pct = p * 25;
    var px = padLeft + (pct / 100) * chartW;
    svg.appendChild(svgEl('text', { x: px, y: h - 2, fill: CHART.axisFill, 'font-size': fs(18, w), 'font-family': FONT, 'text-anchor': 'middle' })).textContent = pct + '%';
  }
}

// ═══════════════════════════════════════════════════
//  CHART PANEL — sunken panel with header bar
// ═══════════════════════════════════════════════════

export function buildChartPanel(title, value, contentFn, legend) {
  var panel = document.createElement('div');
  panel.style.cssText = 'display:flex;flex-direction:column;min-height:0;overflow:hidden;';

  // Header bar
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;padding:6px 10px;background:' + CHART.headerBg + ';flex-shrink:0;border-bottom:1px solid ' + CHART.gridStroke + ';gap:8px;';

  var titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:' + FONT + ';font-size:' + T.fsBtn + ';color:' + CHART.mint + ';font-weight:bold;letter-spacing:1px;';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  // Legend swatches next to title
  if (legend && legend.length) {
    legend.forEach(function(item) {
      var swatch = document.createElement('span');
      swatch.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-family:' + FONT + ';font-size:' + T.fsSmall + ';';
      var dot = document.createElement('span');
      dot.style.cssText = 'width:10px;height:10px;background:' + item.color + ';display:inline-block;';
      var label = document.createElement('span');
      label.style.cssText = 'color:' + item.color + ';';
      label.textContent = item.label;
      swatch.appendChild(dot);
      swatch.appendChild(label);
      header.appendChild(swatch);
    });
  }

  var valueEl = document.createElement('div');
  valueEl.style.cssText = 'font-family:' + FONT + ';font-size:' + T.fsBtn + ';color:' + CHART.gold + ';font-weight:bold;margin-left:auto;';
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
