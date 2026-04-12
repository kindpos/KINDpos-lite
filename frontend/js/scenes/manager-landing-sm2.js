// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Manager Landing Scene (SM2)
//  3-column command center: Sales | Checks | Operations
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { defineScene } from '../scene-manager-2.js';
import { buildCard, applyCardBevel, hexToRgba } from '../theme-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── Constants (immutable) ────────────────────────

var CHROME = T.numpadChassis;
var TIP_ADJ_THRESHOLD = 5;
var COB_WARNING = 30;
var COB_CRITICAL = 35;

var SERVER_PALETTE = [
  T.roles.server, T.roles.busser, T.roles.bartender, T.roles.host,
  T.roles.cook, T.roles.manager, T.catBeverages, T.catSauces,
  T.catProteins, T.lavender, T.cyan, T.sage,
];

// ── Pure Helpers ─────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function cobColor(pct) {
  if (pct >= COB_CRITICAL) return T.vermillion;
  if (pct >= COB_WARNING) return T.yellow;
  return T.lime;
}

function srvColor(map, id) {
  return map[id] || SERVER_PALETTE[0];
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

function gateRow(met, label) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:2px 8px;';
  var icon = document.createElement('span');
  icon.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + (met ? T.green : T.vermillion) + ';';
  icon.textContent = met ? '\u2713' : '\u2717';
  var text = document.createElement('span');
  text.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + (met ? T.green : T.vermillion) + ';';
  text.textContent = label;
  row.appendChild(icon);
  row.appendChild(text);
  return row;
}

// ── Stub Data ────────────────────────────────────

function loadStubData(state) {
  state.salesData = {
    net_sales: 0, avg_check: 0, active_checks: 0,
    total_covers: 0, labor_cob: 0,
    gross_sales: 0, cash_total: 0, card_total: 0,
    discount_total: 0, void_total: 0, tax_total: 0,
  };
  state.breakdownData = { categories: [], cash: 0, card: 0, hourly: [] };
  state.heatmapData = { hours: [], current_hour: -1, servers: [] };
  state.allOrders = [];
  state.staffData = { servers: [] };
  state.tipPoolData = { total_tips: 0, distribution_method: '--', servers: [] };
  state.tipAdjData = { unadjusted_count: 0 };
  state.closeDayData = {
    all_checked_out: false, pending_count: 0,
    all_tips_adjusted: true, unadjusted_count: 0,
    batch_ready: false, day_closed: false,
  };
  state.serverColorMap = {};
}

// ── Data Fetching (TODO: port from v3) ──────────

function fetchAllData(state) {
  loadStubData(state);
  // TODO: port Promise.all fetch orchestration from v3
  return Promise.resolve();
}

function refreshData(state) {
  fetchAllData(state).then(function() { if (state.el) renderLayout(state); });
}

// ═══════════════════════════════════════════════════
//  SCENE DEFINITION
// ═══════════════════════════════════════════════════

defineScene({
  name: 'manager-landing',

  state: {
    el: null,
    params: null,
    // API data
    salesData: null,
    breakdownData: null,
    heatmapData: null,
    staffData: null,
    tipPoolData: null,
    tipAdjData: null,
    closeDayData: null,
    allOrders: [],
    serverColorMap: {},
    // UI interaction
    filteredServerId: null,
    activeTab: 'open',
    selected: {},
    // Drill-down
    expandedCard: null,
    expandOrigin: null,
    drillEl: null,
    // DOM refs
    leftCol: null,
    centerCol: null,
    rightCol: null,
    heatmapEl: null,
    centerGrid: null,
    opsPanel: null,
    checkHeader: null,
  },

  render: function(el, params, state) {
    state.el = el;
    state.params = params;

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

    // Loading state
    el.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:' + T.bgDark + ';';
    var loading = document.createElement('div');
    loading.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';';
    loading.textContent = 'Loading...';
    el.appendChild(loading);

    fetchAllData(state).then(function() { renderLayout(state); });
  },

  events: {
    'transactional:closed': function(e) {
      // TODO: refresh data when tip-adjustment closes
    },
  },

  interrupts: {
    'ml-close-gate': {
      render: function(container, params) {
        // TODO: port close-day gate interrupt
      },
    },
    'ml-close-confirm': {
      render: function(container, params) {
        // TODO: port close-day confirmation interrupt
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
    + ';display:grid;grid-template-columns:25fr 42fr 33fr;gap:' + T.colGap
    + 'px;padding:' + T.scenePad + 'px;box-sizing:border-box;overflow:hidden;';

  state.leftCol = buildLeftColumn(state);
  state.centerCol = buildCenterColumn(state);
  state.rightCol = buildRightColumn(state);

  el.appendChild(state.leftCol);
  el.appendChild(state.centerCol);
  el.appendChild(state.rightCol);
}

// ═══════════════════════════════════════════════════
//  LEFT COLUMN — Sales Overview + Sales Breakdown
// ═══════════════════════════════════════════════════

function buildLeftColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';

  col.appendChild(buildSalesOverviewCard(state));
  col.appendChild(buildSalesBreakdownCard(state));

  return col;
}

function buildSalesOverviewCard(state) {
  var d = state.salesData || {};
  var cob = d.labor_cob || 0;

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';

  card.appendChild(buildCardHeader('SALES OVERVIEW'));

  var body = document.createElement('div');
  body.style.cssText = 'padding:6px 0;';
  body.appendChild(statRow('Net Sales:', fmt(d.net_sales), T.gold));
  body.appendChild(statRow('Check Avg:', fmt(d.avg_check), T.gold));
  body.appendChild(statRow('Active Checks:', String(d.active_checks || 0), T.lime));
  body.appendChild(statRow('Total Covers:', String(d.total_covers || 0), T.lime));
  body.appendChild(statRow('Labor COB%:', cob.toFixed(1) + '%', cobColor(cob)));
  card.appendChild(body);

  // TODO: >>> drill-down button

  return pair.wrap;
}

function buildSalesBreakdownCard(state) {
  var bd = state.breakdownData || {};
  var cats = bd.categories || [];

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';

  card.appendChild(buildCardHeader('SALES BREAKDOWN'));

  var body = document.createElement('div');
  body.style.cssText = 'padding:6px 0;';

  for (var i = 0; i < cats.length; i++) {
    var catColor = T.catColor(cats[i].name);
    body.appendChild(statRow(cats[i].name + ':', fmt(cats[i].value), catColor));
  }

  var divider = document.createElement('div');
  divider.style.cssText = 'height:1px;background:' + T.bgDark + ';margin:4px 8px;border-top:1px solid ' + T.border + ';';
  body.appendChild(divider);

  body.appendChild(statRow('Cash:', fmt(bd.cash), T.gold));
  body.appendChild(statRow('Card:', fmt(bd.card), T.gold));
  card.appendChild(body);

  // TODO: >>> drill-down button

  return pair.wrap;
}

// ═══════════════════════════════════════════════════
//  CENTER COLUMN — Check Grid + Heatmap
// ═══════════════════════════════════════════════════

function buildCenterColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;gap:8px;';

  // ── Check grid container ──
  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.flex = '1';
  card.style.overflow = 'hidden';
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';

  // Header
  state.checkHeader = buildCardHeader('ALL CHECKS');
  card.appendChild(state.checkHeader);

  // ── Tab bar ──
  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;flex-shrink:0;border-bottom:1px solid ' + T.border + ';';
  var tabs = ['OPEN', 'CLOSED', 'VOID'];
  for (var t = 0; t < tabs.length; t++) {
    var tab = document.createElement('div');
    tab.style.cssText = 'flex:1;text-align:center;padding:6px 0;font-family:' + T.fh
      + ';font-size:16px;letter-spacing:2px;user-select:none;';
    tab.style.background = t === 0 ? T.mint : T.bgDark;
    tab.style.color = t === 0 ? T.bgDark : T.mutedText;
    tab.textContent = tabs[t];
    tabBar.appendChild(tab);
  }
  card.appendChild(tabBar);

  // ── Check grid ──
  state.centerGrid = document.createElement('div');
  state.centerGrid.style.cssText = 'flex:1;overflow-y:auto;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;';
  card.appendChild(state.centerGrid);

  // TODO: renderGrid(state) — check tiles + new-check tile
  // TODO: tab switching logic

  // ── Operations panel ──
  state.opsPanel = document.createElement('div');
  state.opsPanel.style.cssText = 'flex-shrink:0;border-top:1px solid ' + T.border + ';background:' + T.bg + ';';
  card.appendChild(state.opsPanel);

  col.appendChild(pair.wrap);

  // TODO: buildHeatmapPanel(state)

  return col;
}

// ═══════════════════════════════════════════════════
//  RIGHT COLUMN — Server Checkouts + Close Day
// ═══════════════════════════════════════════════════

function buildRightColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow-y:auto;overflow-x:hidden;min-width:0;';

  col.appendChild(buildServerCheckoutsCard(state));
  col.appendChild(buildCloseDayCard(state));

  return col;
}

function buildServerCheckoutsCard(state) {
  var sd = state.staffData || {};
  var servers = sd.servers || [];
  var ta = state.tipAdjData || {};
  var unadjCount = ta.unadjusted_count || 0;
  var tp = state.tipPoolData || {};

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';

  card.appendChild(buildCardHeader('SERVER CHECKOUTS'));

  var body = document.createElement('div');
  body.style.cssText = 'padding:6px 0;';

  for (var i = 0; i < servers.length; i++) {
    var srv = servers[i];
    var statusLabel, statusColor;
    if (srv.status === 'checked_out') {
      statusLabel = 'CHECKED OUT'; statusColor = T.green;
    } else if (srv.status === 'pending') {
      statusLabel = 'PENDING'; statusColor = T.yellow;
    } else {
      statusLabel = 'ACTIVE TABLES'; statusColor = T.vermillion;
    }
    body.appendChild(statRow(srv.name, statusLabel, statusColor));
  }

  var divider = document.createElement('div');
  divider.style.cssText = 'height:1px;margin:4px 8px;border-top:1px solid ' + T.border + ';';
  body.appendChild(divider);

  var tipColor = unadjCount === 0 ? T.green : (unadjCount >= TIP_ADJ_THRESHOLD ? T.vermillion : T.yellow);
  body.appendChild(statRow('Unadjusted:', String(unadjCount), tipColor));

  var divider2 = document.createElement('div');
  divider2.style.cssText = 'height:1px;margin:4px 8px;border-top:1px solid ' + T.border + ';';
  body.appendChild(divider2);
  body.appendChild(statRow('Total Tips:', fmt(tp.total_tips), T.gold));

  card.appendChild(body);

  // TODO: TIP ADJUSTMENT button + >>> drill-down

  return pair.wrap;
}

function buildCloseDayCard(state) {
  var cd = state.closeDayData || {};

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';

  card.appendChild(buildCardHeader('CLOSE DAY'));

  var body = document.createElement('div');
  body.style.cssText = 'padding:6px 0;';
  body.appendChild(gateRow(
    cd.all_checked_out,
    cd.all_checked_out ? 'All servers checked out' : (cd.pending_count || 0) + ' servers pending'
  ));
  body.appendChild(gateRow(
    cd.all_tips_adjusted,
    cd.all_tips_adjusted ? 'All tips adjusted' : (cd.unadjusted_count || 0) + ' tips unadjusted'
  ));
  body.appendChild(gateRow(
    cd.batch_ready,
    cd.batch_ready ? 'Batch ready' : 'Awaiting close day'
  ));
  card.appendChild(body);

  // TODO: CLOSE DAY + SETTLE BATCH buttons

  return pair.wrap;
}
