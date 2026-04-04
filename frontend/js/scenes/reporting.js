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
