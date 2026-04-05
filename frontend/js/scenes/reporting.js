// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Reporting Scene
//  Role-driven two-card dashboard with drill-down charts
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle, bevelEdges, shadowColor } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { registerScene, push, pop } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { CHART, createSVG, svgEl, drawBarChart, drawStackedArea, drawParetoChart, drawHorizontalBars, drawTrendLine, drawProgressBar, buildChartPanel, buildChartGrid } from '../chart-helpers.js';

// ── Module state ────────────────────────────────────
var expandedCard = null;
var expandedPanel = null;
var currentParams = null;
var currentEl = null;
var salesData = null;
var laborData = null;

function fmt(n) { return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

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

function buildCardWrap(cardInner) {
  // Wrap card in a styled button shell (beveled edges, shadow, chamfer)
  var btn = buildStyledButton(T.mint);
  btn.inner.style.padding = '0';
  btn.inner.appendChild(cardInner);
  btn.wrap.style.flex = '1';
  btn.wrap.style.maxHeight = '85%';
  btn.wrap.style.maxWidth = '46%';
  btn.wrap.style.height = '100%';
  // Increase shadow for more raised look
  var shadow = shadowColor(T.mint);
  btn.wrap.style.filter = 'drop-shadow(6px 8px 2px ' + shadow + ')';
  btn.wrap._shadow = shadow;
  return btn.wrap;
}

function buildCollapsedView(el, params, sales, labor) {
  el.innerHTML = '';
  el.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;box-sizing:border-box;padding:20px;gap:20px;';

  var leftCard = buildLeftCard(params, sales, labor);
  var rightCard = buildRightCard(params, sales, labor);

  var leftWrap = buildCardWrap(leftCard);
  var rightWrap = buildCardWrap(rightCard);

  leftWrap.addEventListener('pointerup', function() {
    expandedCard = 'left';
    renderCurrentState();
  });

  rightWrap.addEventListener('pointerup', function() {
    expandedCard = 'right';
    renderCurrentState();
  });

  el.appendChild(leftWrap);
  el.appendChild(rightWrap);
}

// ── LEFT CARD: SALES (manager) or SHIFT (server) ──

function buildLeftCard(params, sales, labor) {
  var card = document.createElement('div');
  card.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;background:' + T.bgDark + ';cursor:pointer;user-select:none;-webkit-user-select:none;padding:16px 20px;box-sizing:border-box;overflow:hidden;';

  var s = sales;

  if (params.role === 'manager') {
    // SALES card — title + numbers both gold (title color)
    var title = document.createElement('div');
    title.style.cssText = 'font-family:' + T.fh + ';font-size:60px;font-weight:bold;font-style:italic;color:' + T.gold + ';margin-bottom:6px;';
    title.textContent = 'SALES';
    card.appendChild(title);

    var g = T.gold;
    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-family:' + T.fb + ';font-size:36px;color:' + T.mint + ';';
    kpis.innerHTML =
      '<div>Net: <span style="color:' + g + '">' + (s ? fmt(s.net_sales) : '--') + '</span></div>' +
      '<div>Checks: <span style="color:' + g + '">' + (s ? s.total_checks : '--') + '</span></div>' +
      '<div>Avg: <span style="color:' + g + '">' + (s ? fmt(s.check_avg) : '--') + '</span></div>';
    card.appendChild(kpis);

    // Cash / Card breakdown — single combined bar
    if (s) {
      var total = s.cash_total + s.card_total;
      var cashPct = total > 0 ? (s.cash_total / total * 100).toFixed(0) : 0;
      var cardPct = total > 0 ? (s.card_total / total * 100).toFixed(0) : 0;
      var breakdown = document.createElement('div');
      breakdown.style.cssText = 'margin-top:6px;font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';';
      breakdown.innerHTML =
        '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">' +
          '<span>Cash: <span style="color:' + g + '">' + fmt(s.cash_total) + '</span></span>' +
          '<span>Card: <span style="color:' + g + '">' + fmt(s.card_total) + '</span></span>' +
        '</div>' +
        '<div style="display:flex;height:16px;background:' + T.bg + ';">' +
          '<div style="width:' + cashPct + '%;height:100%;background:' + g + ';opacity:0.8;"></div>' +
          '<div style="width:' + cardPct + '%;height:100%;background:' + T.cyan + ';opacity:0.8;"></div>' +
        '</div>';
      card.appendChild(breakdown);
    } else {
      var fallback = document.createElement('div');
      fallback.style.cssText = 'margin-top:6px;font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';';
      fallback.textContent = 'Cash: --   Card: --';
      card.appendChild(fallback);
    }

    // Close Day button + active checks
    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'margin-top:auto;align-self:stretch;display:flex;flex-direction:column;gap:4px;';

    var closeDayBtn = buildStyledButton(T.red);
    closeDayBtn.inner.textContent = 'Close Day';
    closeDayBtn.inner.style.fontFamily = T.fh;
    closeDayBtn.inner.style.fontSize = '32px';
    closeDayBtn.inner.style.color = '#fff';
    closeDayBtn.inner.style.padding = '10px 16px';
    closeDayBtn.wrap.style.alignSelf = 'stretch';
    closeDayBtn.wrap.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      push('close-day', params);
    });
    btnArea.appendChild(closeDayBtn.wrap);

    var activeChecks = document.createElement('div');
    activeChecks.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';text-align:center;';
    var checkCount = s ? s.total_checks : 0;
    activeChecks.textContent = checkCount + ' active check' + (checkCount !== 1 ? 's' : '');
    btnArea.appendChild(activeChecks);

    card.appendChild(btnArea);
  } else {
    // SHIFT card — title gold, numbers gold
    var title = document.createElement('div');
    title.style.cssText = 'font-family:' + T.fh + ';font-size:60px;font-weight:bold;font-style:italic;color:' + T.gold + ';margin-bottom:6px;';
    title.textContent = 'SHIFT';
    card.appendChild(title);

    var g = T.gold;
    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-family:' + T.fb + ';font-size:36px;color:' + T.mint + ';';
    kpis.innerHTML =
      '<div>Guests: <span style="color:' + g + '">' + (s ? (s.total_guests || '--') : '--') + '</span></div>' +
      '<div>Tables: <span style="color:' + g + '">' + (s ? (s.total_tables || '--') : '--') + '</span></div>' +
      '<div>Avg: <span style="color:' + g + '">' + (s ? fmt(s.check_avg) : '--') + '</span></div>' +
      '<div style="margin-top:4px;font-size:28px">Tips: <span style="color:' + g + '">' + (s ? fmt(s.tips_collected || 0) : '--') + '</span> / Out: <span style="color:' + g + '">' + (s ? fmt(s.tipout_amount || 0) : '--') + '</span></div>';
    card.appendChild(kpis);

    // Checkout button + active checks
    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'margin-top:auto;align-self:stretch;display:flex;flex-direction:column;gap:6px;';

    var checkoutBtn = buildStyledButton('#33ff99');
    checkoutBtn.inner.textContent = 'Checkout';
    checkoutBtn.inner.style.fontFamily = T.fh;
    checkoutBtn.inner.style.fontSize = '28px';
    checkoutBtn.inner.style.color = T.bgDark;
    checkoutBtn.inner.style.padding = '8px 16px';
    checkoutBtn.wrap.style.alignSelf = 'stretch';
    checkoutBtn.wrap.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      push('server-checkout', params);
    });
    btnArea.appendChild(checkoutBtn.wrap);

    var activeChecks = document.createElement('div');
    activeChecks.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mint + ';text-align:center;';
    var checkCount = s ? s.total_checks : 0;
    activeChecks.textContent = checkCount + ' active check' + (checkCount !== 1 ? 's' : '');
    btnArea.appendChild(activeChecks);

    card.appendChild(btnArea);
  }

  return card;
}

// ── RIGHT CARD: LABOR (manager) or HOURS (server) ──

function buildVerticalRail(text, color) {
  var rail = document.createElement('div');
  rail.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-family:' + T.fh + ';font-size:60px;font-weight:bold;color:' + color + ';flex-shrink:0;padding-right:10px;';
  for (var i = 0; i < text.length; i++) {
    var ch = document.createElement('div');
    ch.style.cssText = 'line-height:1;';
    ch.textContent = text[i];
    rail.appendChild(ch);
  }
  return rail;
}

function buildRightCard(params, sales, labor) {
  var card = document.createElement('div');
  card.style.cssText = 'display:flex;width:100%;height:100%;background:' + T.bgDark + ';cursor:pointer;user-select:none;-webkit-user-select:none;padding:16px 20px;gap:10px;box-sizing:border-box;overflow:hidden;';

  var l = labor;

  if (params.role === 'manager') {
    // LABOR card — numbers in #33ff99 (title color), money in gold
    var lc = '#33ff99';
    card.appendChild(buildVerticalRail('LABOR', lc));

    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;font-family:' + T.fb + ';font-size:36px;color:' + T.mint + ';justify-content:center;';

    var otAlert = '--';
    if (l && l.ot_alerts && l.ot_alerts.length > 0) {
      otAlert = l.ot_alerts.length + ' warning(s)';
    } else if (l) {
      otAlert = 'All clear';
    }

    kpis.innerHTML =
      '<div>Hrs: <span style="color:' + lc + '">' + (l ? l.total_hours : '--') + '</span></div>' +
      '<div>Tips: <span style="color:' + T.gold + '">' + (l ? fmt(l.tip_pool) : '--') + '</span></div>' +
      '<div>COB: <span style="color:' + lc + '">' + (l ? l.cob_percent + '%' : '--') + '</span></div>' +
      '<div style="margin-top:4px;font-size:18px">OT Alert: <span style="color:' + T.gold + '">' + otAlert + '</span></div>';
    card.appendChild(kpis);
  } else {
    // HOURS card — numbers in #33ff99 (same as LABOR), money in gold
    var hc = '#33ff99';
    card.appendChild(buildVerticalRail('HOURS', hc));

    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;font-family:' + T.fb + ';font-size:36px;color:' + T.mint + ';justify-content:center;';

    var otAlert = '--';
    if (l) {
      if (l.ot_status === 'warning') otAlert = 'Warning';
      else if (l.ot_status === 'over') otAlert = 'OVERTIME';
      else otAlert = 'All clear';
    }

    kpis.innerHTML =
      '<div>In: <span style="color:' + hc + '">' + (l ? l.clock_in : '--') + '</span></div>' +
      '<div>Out: <span style="color:' + hc + '">' + (l ? (l.clock_out || 'active') : '--') + '</span></div>'  +
      '<div>Today: <span style="color:' + hc + '">' + (l ? l.today_hours + 'h' : '--') + '</span></div>' +
      '<div>Week: <span style="color:' + hc + '">' + (l ? l.weekly_hours + 'h' : '--') + '</span></div>' +
      '<div style="margin-top:4px;font-size:18px">OT Alert: <span style="color:' + T.gold + '">' + otAlert + '</span></div>';
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
  frame.style.cssText = 'flex:1;display:flex;flex-direction:column;border:8px solid ' + T.mint + ';box-sizing:border-box;min-height:0;background:' + T.bgDark + ';';

  var isRightCard = expandedCard === 'right';

  // Header area
  if (isRightCard) {
    // Right card has vertical text rail on left side
    var headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;flex:1;min-height:0;';

    var rail = document.createElement('div');
    rail.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;font-family:' + T.fh + ';font-size:36px;font-weight:bold;color:' + T.cyan + ';display:flex;align-items:center;justify-content:center;padding:0 12px;flex-shrink:0;';
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
    titleBar.style.cssText = 'font-family:' + T.fh + ';font-size:36px;font-weight:bold;font-style:italic;color:' + T.gold + ';padding:12px 16px 0;flex-shrink:0;';
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
  var builderFn;
  if (params.role === 'manager' && expandedCard === 'left') {
    builderFn = function(full) { return buildManagerSalesPanels(sales, full); };
  } else if (params.role === 'manager' && expandedCard === 'right') {
    builderFn = function(full) { return buildManagerLaborPanels(labor, full); };
  } else if (params.role === 'server' && expandedCard === 'left') {
    builderFn = function(full) { return buildServerShiftPanels(sales, full); };
  } else {
    builderFn = function(full) { return buildServerHoursPanels(sales, labor, full); };
  }

  var chartGrid = buildChartGrid(builderFn, function(state) {
    expandedPanel = state.expandedIdx;
    renderCurrentState();
  });

  // Sync initial state
  chartGrid.state.expandedIdx = expandedPanel;
  return chartGrid.render();
}

// ═══════════════════════════════════════════════════
//  MANAGER SALES PANELS
// ═══════════════════════════════════════════════════

function buildManagerSalesPanels(sales, fullSize) {
  var s = sales || {};
  var hourly = s.hourly_sales || [];
  var lastWeek = s.last_week_hourly || [];
  var dailyAvg = s.daily_check_avg || [];
  var svgW = fullSize ? 900 : 400;
  var svgH = fullSize ? 380 : 160;

  // NET SALES — side-by-side bar chart: today (teal) vs last week (orange)
  var p1 = buildChartPanel('NET SALES', s.net_sales ? fmt(s.net_sales) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < hourly.length; i++) {
      var hr = parseInt(hourly[i].hour);
      var label = hr > 12 ? (hr - 12) + 'p' : hr + 'a';
      var cmp = lastWeek[i] ? lastWeek[i].net : 0;
      data.push({ label: label, value: hourly[i].net, compareValue: cmp });
    }
    drawBarChart(svg, data, { color: CHART.teal, compareColor: CHART.orange, width: svgW, height: svgH, showLabels: true, showValueAbove: true, legend: ['Today', 'Last Wk'] });
    body.appendChild(svg);
  });

  // TOTAL CHECKS — stacked area: today vs last week, 12hr labels
  var p2 = buildChartPanel('TOTAL CHECKS', s.total_checks || '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < hourly.length; i++) {
      var hr = parseInt(hourly[i].hour);
      var label = hr > 12 ? (hr - 12) + 'p' : hr + 'a';
      var cmp = lastWeek[i] ? lastWeek[i].checks : 0;
      data.push({ label: label, value: hourly[i].checks, compareValue: cmp });
    }
    drawStackedArea(svg, data, { color: CHART.hotPink, compareColor: CHART.electricBlue, width: svgW, height: svgH, legend: ['Today', 'Last Wk'], showCallouts: true, calloutFmt: function(v) { return v; } });
    body.appendChild(svg);
  });

  // CHECK AVG — pareto: which days are most profitable, sorted descending
  var p3 = buildChartPanel('CHECK AVG', s.check_avg ? fmt(s.check_avg) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < dailyAvg.length; i++) {
      data.push({ label: dailyAvg[i].day, value: dailyAvg[i].avg });
    }
    drawParetoChart(svg, data, { barColor: CHART.neonYellow, lineColor: CHART.hotPink, width: svgW, height: svgH, showCallouts: true });
    body.appendChild(svg);
  });

  // CASH / CARD — win98-style combined bar
  var p4 = buildChartPanel('CASH / CARD', s.cash_total ? fmt((s.cash_total || 0) + (s.card_total || 0)) : '--', function(body) {
    var total = (s.cash_total || 0) + (s.card_total || 0);
    var cashPct = total > 0 ? Math.round((s.cash_total || 0) / total * 100) : 0;
    var cardPct = total > 0 ? 100 - cashPct : 0;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:12px 16px;display:flex;flex-direction:column;gap:8px;font-family:' + T.fb + ';';

    // Labels row
    var labels = document.createElement('div');
    labels.style.cssText = 'display:flex;justify-content:space-between;font-size:' + (fullSize ? '20' : '16') + 'px;';
    labels.innerHTML =
      '<span style="color:' + CHART.gold + '">Cash: ' + fmt(s.cash_total || 0) + ' (' + cashPct + '%)</span>' +
      '<span style="color:' + CHART.sky + '">Card: ' + fmt(s.card_total || 0) + ' (' + cardPct + '%)</span>';
    wrap.appendChild(labels);

    // Win98-style bar — beveled raised look
    var barOuter = document.createElement('div');
    barOuter.style.cssText = 'height:' + (fullSize ? '28' : '20') + 'px;background:' + T.bg + ';border:2px solid;border-color:' + T.bgLight + ' ' + T.bgDark + ' ' + T.bgDark + ' ' + T.bgLight + ';position:relative;';

    // Inner sunken bar area
    var barInner = document.createElement('div');
    barInner.style.cssText = 'position:absolute;inset:2px;display:flex;border:1px solid;border-color:' + T.bgDark + ' ' + T.bgLight + ' ' + T.bgLight + ' ' + T.bgDark + ';';

    // Cash segment
    var cashBar = document.createElement('div');
    cashBar.style.cssText = 'width:' + cashPct + '%;height:100%;background:' + CHART.gold + ';';
    barInner.appendChild(cashBar);

    // Card segment
    var cardBar = document.createElement('div');
    cardBar.style.cssText = 'width:' + cardPct + '%;height:100%;background:' + CHART.sky + ';';
    barInner.appendChild(cardBar);

    barOuter.appendChild(barInner);
    wrap.appendChild(barOuter);

    // Total line
    var totalLine = document.createElement('div');
    totalLine.style.cssText = 'text-align:center;font-size:' + (fullSize ? '22' : '16') + 'px;color:' + CHART.mint + ';margin-top:4px;';
    totalLine.innerHTML = 'Total: <span style="color:' + CHART.gold + '">' + fmt(total) + '</span>';
    wrap.appendChild(totalLine);

    body.appendChild(wrap);
  });

  return [p1, p2, p3, p4];
}

// ═══════════════════════════════════════════════════
//  MANAGER LABOR PANELS
// ═══════════════════════════════════════════════════

function buildManagerLaborPanels(labor, fullSize) {
  var l = labor || {};
  var employees = l.employees || [];
  var cobTrend = l.cob_trend || [];
  var otAlerts = l.ot_alerts || [];
  var svgW = fullSize ? 900 : 400;
  var svgH = fullSize ? 380 : 160;
  var lblW = fullSize ? 80 : 55;
  var fontSize = fullSize ? '24px' : '20px';

  // TOTAL HRS — horizontal bars: employees by hours
  var p1 = buildChartPanel('TOTAL HRS', l.total_hours ? l.total_hours + 'h' : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < employees.length; i++) {
      var emp = employees[i];
      data.push({ label: emp.name, value: emp.hours, sublabel: emp.hours + 'h (' + emp.clock_in + '-' + emp.clock_out + ')', color: CHART.cyan });
    }
    drawHorizontalBars(svg, data, { width: svgW, height: svgH, labelWidth: lblW });
    body.appendChild(svg);
  });

  // TIP POOL — horizontal bars: employees by tips
  var p2 = buildChartPanel('TIP POOL', l.tip_pool ? fmt(l.tip_pool) : '--', function(body) {
    var chartH = fullSize ? 300 : 120;
    var svg = createSVG(svgW, chartH);
    var data = [];
    for (var i = 0; i < employees.length; i++) {
      data.push({ label: employees[i].name, value: employees[i].tips, sublabel: fmt(employees[i].tips), color: CHART.gold });
    }
    drawHorizontalBars(svg, data, { width: svgW, height: chartH, labelWidth: lblW });
    body.appendChild(svg);

    // Text breakdown below chart
    var info = document.createElement('div');
    info.style.cssText = 'padding:4px 8px;font-family:' + T.fb + ';font-size:' + fontSize + ';color:' + CHART.mint + ';';
    info.innerHTML =
      'Card Tips: <span style="color:' + CHART.gold + '">' + fmt(l.card_tips_total || 0) + '</span> ' +
      '- Tipout: <span style="color:' + CHART.red + '">' + fmt(l.tipout_deducted || 0) + '</span> ' +
      '= Pool: <span style="color:' + CHART.gold + '">' + fmt(l.tip_pool || 0) + '</span>';
    body.appendChild(info);
  });

  // COB % — trend line with thresholds
  var p3 = buildChartPanel('COB %', l.cob_percent ? l.cob_percent + '%' : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < cobTrend.length; i++) {
      data.push({ label: cobTrend[i].day, value: cobTrend[i].percent });
    }
    drawTrendLine(svg, data, {
      color: CHART.neonPurple, width: svgW, height: svgH,
      thresholds: [
        { value: 35, color: CHART.yellow },
        { value: 45, color: CHART.red },
      ],
    });
    body.appendChild(svg);
  });

  // OT ALERT — horizontal bars colored by status
  var otStatus = otAlerts.length > 0 ? 'Warning' : 'All clear';
  var otColor = otAlerts.length > 0 ? CHART.yellow : CHART.cyan;
  var p4 = buildChartPanel('OT ALERT', otStatus, function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < employees.length; i++) {
      var wh = employees[i].weekly_hours;
      var barColor = CHART.cyan;
      if (wh > 40) barColor = CHART.red;
      else if (wh >= 35) barColor = CHART.yellow;
      data.push({ label: employees[i].name, value: wh, sublabel: wh + 'h', color: barColor });
    }
    drawHorizontalBars(svg, data, { width: svgW, height: svgH, labelWidth: lblW });
    // 40h threshold line
    if (employees.length > 0) {
      var maxH = 0;
      for (var i = 0; i < employees.length; i++) {
        if (employees[i].weekly_hours > maxH) maxH = employees[i].weekly_hours;
      }
      if (maxH > 0) {
        var lineX = lblW + (40 / Math.max(maxH, 40)) * (svgW - lblW - 10);
        svg.appendChild(svgEl('line', { x1: lineX, y1: 0, x2: lineX, y2: svgH, stroke: CHART.yellow, 'stroke-width': 2, 'stroke-dasharray': '4,3' }));
      }
    }
    body.appendChild(svg);

    // Status text
    var statusEl = document.createElement('div');
    statusEl.style.cssText = 'position:absolute;top:4px;right:8px;font-family:' + T.fb + ';font-size:' + fontSize + ';color:' + otColor + ';font-weight:bold;';
    statusEl.textContent = otStatus;
    body.appendChild(statusEl);
  });

  return [p1, p2, p3, p4];
}

// ═══════════════════════════════════════════════════
//  SERVER SHIFT PANELS
// ═══════════════════════════════════════════════════

function buildServerShiftPanels(sales, fullSize) {
  var s = sales || {};
  var hourly = s.hourly_sales || [];
  var hourlyTables = s.hourly_tables || [];
  var dailyAvg = s.daily_check_avg || [];
  var svgW = fullSize ? 900 : 400;
  var svgH = fullSize ? 380 : 160;
  var lblW = fullSize ? 60 : 40;
  var fontSize = fullSize ? '24px' : '20px';
  var lgFontSize = fullSize ? '36px' : '28px';

  // TOTAL GUESTS — bar chart per hour
  var p1 = buildChartPanel('TOTAL GUESTS', s.total_guests || '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < hourly.length; i++) {
      var hr = parseInt(hourly[i].hour);
      var label = hr > 12 ? (hr - 12) + 'p' : hr + 'a';
      data.push({ label: label, value: hourly[i].checks });
    }
    drawBarChart(svg, data, { color: CHART.electricBlue, width: svgW, height: svgH, showLabels: true, showValueAbove: true });
    body.appendChild(svg);
  });

  // TOTAL TABLES — horizontal bars per hour
  var p2 = buildChartPanel('TOTAL TABLES', s.total_tables || '--', function(body) {
    var chartH = fullSize ? 300 : 130;
    var svg = createSVG(svgW, chartH);
    var data = [];
    for (var i = 0; i < hourlyTables.length; i++) {
      var hr = parseInt(hourlyTables[i].hour);
      var label = hr > 12 ? (hr - 12) + 'p' : hr + 'a';
      data.push({ label: label, value: hourlyTables[i].tables, sublabel: hourlyTables[i].tables + ' tbl', color: CHART.teal });
    }
    drawHorizontalBars(svg, data, { width: svgW, height: chartH, labelWidth: lblW });
    body.appendChild(svg);

    var avgText = document.createElement('div');
    avgText.style.cssText = 'padding:4px 8px;font-family:' + T.fb + ';font-size:' + fontSize + ';color:' + CHART.mint + ';';
    avgText.textContent = 'Avg guests/table: ' + (s.guests_per_table || '--');
    body.appendChild(avgText);
  });

  // CHECK AVG — trend line: daily avg vs house avg
  var p3 = buildChartPanel('CHECK AVG', s.check_avg ? fmt(s.check_avg) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    var compare = [];
    for (var i = 0; i < dailyAvg.length; i++) {
      data.push({ label: dailyAvg[i].day, value: dailyAvg[i].avg });
      compare.push({ label: dailyAvg[i].day, value: dailyAvg[i].house_avg });
    }
    drawTrendLine(svg, data, { color: CHART.neonOrange, compareData: compare, compareColor: CHART.limeGreen, width: svgW, height: svgH });
    body.appendChild(svg);
  });

  // TIPS / TIPOUT — styled DOM text panel with win98 bar for breakdown
  var p4 = buildChartPanel('TIPS / TIPOUT', s.tips_collected ? fmt(s.tips_collected) : '--', function(body) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:12px;font-family:' + T.fb + ';display:flex;flex-direction:column;gap:6px;';

    var tipsTotal = s.tips_collected || 0;
    var tipout = s.tipout_amount || 0;
    var takeHome = s.take_home || 0;
    var cashTips = s.cash_tips || 0;

    wrap.innerHTML =
      '<div style="font-size:' + fontSize + ';color:' + CHART.gold + '">Card Tips: ' + fmt(tipsTotal) + '</div>' +
      '<div style="font-size:' + fontSize + ';color:' + CHART.red + '">Tipout: -' + fmt(tipout) + '</div>' +
      '<div style="height:1px;background:' + T.border + ';margin:4px 0;"></div>' +
      '<div style="font-size:' + lgFontSize + ';font-weight:bold;color:' + CHART.gold + '">Take-home: ' + fmt(takeHome) + '</div>' +
      '<div style="font-size:' + lgFontSize + ';color:' + CHART.gold + '">Cash Tips: ' + fmt(cashTips) + '</div>' +
      '<div style="height:2px;background:' + CHART.gold + ';margin:4px 0;"></div>' +
      '<div><span style="font-size:' + fontSize + ';color:' + CHART.mint + '">TOTAL EARNED </span><span style="font-size:' + (fullSize ? '28px' : '22px') + ';color:' + CHART.gold + '">' + fmt(takeHome + cashTips) + '</span></div>';
    body.appendChild(wrap);
  });

  return [p1, p2, p3, p4];
}

// ═══════════════════════════════════════════════════
//  SERVER HOURS PANELS
// ═══════════════════════════════════════════════════

function buildServerHoursPanels(sales, labor, fullSize) {
  var l = labor || {};
  var weekly = l.weekly_breakdown || [];
  var svgW = fullSize ? 900 : 400;
  var svgH = fullSize ? 380 : 160;
  var fontSize = fullSize ? '24px' : '20px';
  var lgFontSize = fullSize ? '44px' : '36px';
  var progW = fullSize ? 860 : 380;

  // TODAY'S SHIFT — big clock in/out text + progress bar
  var p1 = buildChartPanel('TODAY\'S SHIFT', l.today_hours ? l.today_hours + 'h' : '--', function(body) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:8px 12px;font-family:' + T.fb + ';display:flex;flex-direction:column;gap:4px;';

    wrap.innerHTML =
      '<div style="font-size:' + fontSize + ';color:' + CHART.cyan + '">Time In</div>' +
      '<div style="font-size:' + lgFontSize + ';color:' + CHART.cyan + '">' + (l.clock_in || '--') + '</div>' +
      '<div style="font-size:' + fontSize + ';color:' + CHART.mint + '">Time Out</div>' +
      '<div style="font-size:' + lgFontSize + ';color:' + CHART.mint + '">' + (l.clock_out || 'active') + '</div>' +
      '<div style="height:1px;background:' + T.border + ';margin:2px 0;"></div>' +
      '<div style="font-size:' + (fullSize ? '28px' : '22px') + ';color:' + CHART.cyan + '">Today: ' + (l.today_hours || 0) + ' hrs</div>';
    body.appendChild(wrap);

    // Progress bar for shift span
    var svg = createSVG(progW, fullSize ? 32 : 24);
    drawProgressBar(svg, l.today_hours || 0, 12, { width: progW, height: fullSize ? 32 : 24, color: CHART.cyan });
    svg.style.marginLeft = '12px';
    body.appendChild(svg);
  });

  // WEEKLY HOURS — bar chart per day
  var p2 = buildChartPanel('WEEKLY HOURS', l.weekly_hours ? l.weekly_hours + 'h' : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < weekly.length; i++) {
      var d = weekly[i];
      var val = d.hours || 0;
      data.push({ label: d.day, value: val });
    }
    drawBarChart(svg, data, { color: CHART.electricBlue, width: svgW, height: svgH, showLabels: true, showValueAbove: true });

    // Draw dashed outline for scheduled-unworked days
    var padLeft = 50;
    var padBottom = 26;
    var chartW = svgW - padLeft - 8;
    var chartH = svgH - (fullSize ? 22 : 10) - padBottom;
    for (var i = 0; i < weekly.length; i++) {
      if (weekly[i].scheduled && !weekly[i].hours && weekly[i].hours !== 0) {
        var groupW = chartW / weekly.length;
        var barW = groupW * 0.6;
        var x = padLeft + i * groupW + (groupW - barW) / 2;
        var maxVal = 0;
        for (var j = 0; j < data.length; j++) if (data[j].value > maxVal) maxVal = data[j].value;
        if (maxVal === 0) maxVal = 1;
        var barH = (weekly[i].scheduled / maxVal) * chartH;
        var padTop = fullSize ? 22 : 10;
        svg.appendChild(svgEl('rect', { x: x, y: padTop + chartH - barH, width: barW, height: barH, fill: 'none', stroke: CHART.electricBlue, 'stroke-width': 1, 'stroke-dasharray': '4,3' }));
      }
    }

    body.appendChild(svg);
  });

  // TOTAL HRS — progress bar + daily breakdown table
  var p3 = buildChartPanel('TOTAL HRS', l.weekly_hours ? l.weekly_hours + '/40h' : '--', function(body) {
    // Progress bar
    var svg = createSVG(progW, fullSize ? 36 : 28);
    drawProgressBar(svg, l.weekly_hours || 0, 48, { width: progW, height: fullSize ? 36 : 28, color: CHART.cyan, warnAt: 35, critAt: 40 });
    svg.style.margin = '4px 12px';
    body.appendChild(svg);

    // Daily table
    var table = document.createElement('div');
    table.style.cssText = 'padding:2px 8px;font-family:' + T.fb + ';font-size:' + fontSize + ';overflow-y:auto;flex:1;';

    var remainScheduled = 0;
    for (var i = 0; i < weekly.length; i++) {
      var d = weekly[i];
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:' + (fullSize ? '16' : '8') + 'px;padding:' + (fullSize ? '3' : '1') + 'px 0;';

      var dayCol = document.createElement('span');
      dayCol.style.cssText = 'width:' + (fullSize ? '50' : '35') + 'px;color:' + CHART.mint + ';';
      dayCol.textContent = d.day;
      row.appendChild(dayCol);

      var inCol = document.createElement('span');
      inCol.style.cssText = 'width:' + (fullSize ? '70' : '50') + 'px;color:' + T.dimText + ';';
      inCol.textContent = d['in'] || '--';
      row.appendChild(inCol);

      var outCol = document.createElement('span');
      outCol.style.cssText = 'width:' + (fullSize ? '70' : '50') + 'px;color:' + T.dimText + ';';
      outCol.textContent = d['out'] || '--';
      row.appendChild(outCol);

      var hrsCol = document.createElement('span');
      hrsCol.style.cssText = 'color:' + CHART.cyan + ';';
      hrsCol.textContent = d.hours ? d.hours + 'h' : (d.scheduled ? d.scheduled + 'h (sched)' : '--');
      row.appendChild(hrsCol);

      table.appendChild(row);

      if (d.scheduled && !d.hours) remainScheduled += d.scheduled;
    }

    if (remainScheduled > 0) {
      var footer = document.createElement('div');
      footer.style.cssText = 'padding:2px 0;color:' + T.dimText + ';font-style:italic;font-size:' + fontSize + ';';
      footer.textContent = 'Remaining scheduled: ' + remainScheduled + 'h';
      table.appendChild(footer);
    }

    body.appendChild(table);
  });

  // OT ALERT — custom DOM status box
  var otStatus = l.ot_status || 'clear';
  var statusLabel = otStatus === 'warning' ? 'WARNING' : otStatus === 'over' ? 'OVERTIME' : 'All clear';
  var statusColor = otStatus === 'warning' ? CHART.yellow : otStatus === 'over' ? CHART.red : CHART.cyan;

  var p4 = buildChartPanel('OT ALERT', statusLabel, function(body) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:' + (fullSize ? '16px 24px' : '8px 12px') + ';font-family:' + T.fb + ';display:flex;flex-direction:column;gap:' + (fullSize ? '10' : '6') + 'px;';

    // Status box
    var statusBox = document.createElement('div');
    statusBox.style.cssText = 'border:2px solid ' + statusColor + ';padding:' + (fullSize ? '12px 16px' : '8px 12px') + ';text-align:center;';
    var statusText = document.createElement('div');
    statusText.style.cssText = 'font-size:' + (fullSize ? '28px' : '20px') + ';font-weight:bold;color:' + statusColor + ';';
    statusText.textContent = statusLabel;
    statusBox.appendChild(statusText);
    wrap.appendChild(statusBox);

    // Breakdown rows
    var worked = l.weekly_hours || 0;
    var projected = l.ot_projected || 0;
    var buffer = l.ot_buffer || 0;
    var scheduledRemain = 0;
    for (var i = 0; i < weekly.length; i++) {
      if (weekly[i].scheduled && !weekly[i].hours) scheduledRemain += weekly[i].scheduled;
    }

    var projColor = projected > 40 ? CHART.yellow : CHART.cyan;

    wrap.innerHTML +=
      '<div style="display:flex;justify-content:space-between;font-size:' + fontSize + ';"><span style="color:' + CHART.mint + '">Worked so far</span><span style="color:' + CHART.cyan + '">' + worked + 'h</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:' + fontSize + ';"><span style="color:' + T.dimText + '">Scheduled remaining</span><span style="color:' + T.dimText + '">' + scheduledRemain + 'h</span></div>' +
      '<div style="height:1px;background:' + T.border + ';"></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:' + fontSize + ';"><span style="color:' + CHART.mint + ';font-weight:bold">Projected total</span><span style="color:' + projColor + ';font-weight:bold">' + projected + 'h</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:' + fontSize + ';"><span style="color:' + CHART.mint + '">Buffer</span><span style="color:' + (buffer <= 0 ? CHART.yellow : CHART.cyan) + '">' + buffer + 'h</span></div>';

    body.appendChild(wrap);
  });

  return [p1, p2, p3, p4];
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
    if (expandedPanel !== null) {
      expandedPanel = null;
      renderCurrentState();
      return Promise.resolve(false);
    }
    if (expandedCard) {
      expandedCard = null;
      expandedPanel = null;
      renderCurrentState();
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  },
  cache: false,
  timeoutMs: 0,
});
