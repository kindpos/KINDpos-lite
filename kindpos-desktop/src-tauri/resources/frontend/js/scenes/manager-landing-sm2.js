// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Manager Landing Scene (SM2)
//  3-column command center: Sales | Checks | Operations
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager, defineScene } from '../scene-manager.js';
import { buildCard, applyCardBevel, hexToRgba } from '../theme-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import './check-overview.js';
import { showKeyboard, hideKeyboard } from '../keyboard.js';
import { createSVG, drawTrendLine, drawStackedAreaMulti } from '../chart-helpers.js';

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

var ML_TAX_RATE = 0.07;
var ML_CASH_DISCOUNT = 0.04;

// Fetch canonical rates from backend so FE/BE always agree
fetch('/api/v1/config/pricing').then(function(r) { return r.json(); }).then(function(d) {
  if (d.tax_rate != null)           ML_TAX_RATE      = d.tax_rate;
  if (d.cash_discount_rate != null) ML_CASH_DISCOUNT = d.cash_discount_rate;
}).catch(function() { /* keep defaults on network error */ });

function orderTotals(order) {
  var items = order.items || [];
  var subtotal = 0;
  var itemList = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var qty = it.quantity || 1;
    var price = it.price || 0;
    subtotal += qty * price;
    itemList.push({ name: it.name, qty: qty, unitPrice: price });
  }
  var tax = Math.round(subtotal * ML_TAX_RATE * 100) / 100;
  var cardTotal = Math.round((subtotal + tax) * 100) / 100;
  var cashPrice = Math.round(cardTotal * (1 - ML_CASH_DISCOUNT) * 100) / 100;
  return { items: itemList, subtotal: subtotal, tax: tax, cardTotal: cardTotal, cashPrice: cashPrice };
}

function checkNum(order) {
  return order.check_number || ('C-' + String(order.order_id).slice(0, 3).toUpperCase());
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
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;padding:4px 12px;min-width:0;';
  var l = document.createElement('span');
  l.style.cssText = 'font-family:' + T.fh + ';font-size:26px;color:' + T.textPrimary + ';font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex-shrink:1;';
  l.textContent = label;
  var v = document.createElement('span');
  v.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + color + ';font-weight:bold;white-space:nowrap;flex-shrink:0;';
  v.textContent = value;
  row.appendChild(l);
  row.appendChild(v);
  return row;
}

function gateRow(met, label) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px;';
  var icon = document.createElement('span');
  icon.style.cssText = 'font-family:' + T.fb + ';font-size:22px;color:' + (met ? T.green : T.vermillion) + ';';
  icon.textContent = met ? '\u2713' : '\u2717';
  var text = document.createElement('span');
  text.style.cssText = 'font-family:' + T.fh + ';font-size:20px;color:' + (met ? T.green : T.vermillion) + ';font-weight:bold;';
  text.textContent = label;
  row.appendChild(icon);
  row.appendChild(text);
  return row;
}

// ── Module ref for event handler access to state ─

var _state = null;

// ── Data Fetching ────────────────────────────────

var API = '/api/v1';

function fetchAllData(state) {
  var today = new Date();
  var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  return Promise.all([
    // 0: Day summary → sales overview + breakdown + hourly + tips
    fetch(API + '/orders/day-summary')
      .then(function(r) { return r.json(); }).catch(function() { return {}; }),
    // 1: All orders → check grid + heatmap
    fetch(API + '/orders')
      .then(function(r) { return r.json(); }).catch(function() { return []; }),
    // 2: Clocked-in staff → server checkouts + heatmap
    fetch(API + '/servers/clocked-in')
      .then(function(r) { return r.json(); }).catch(function() { return { staff: [] }; }),
    // 3: Labor summary → COB%
    fetch(API + '/reports/labor-summary?date=' + dateStr)
      .then(function(r) { return r.json(); }).catch(function() { return {}; }),
    // 4: Tip pool (stub — endpoint not yet available)
    fetch(API + '/tips/pool')
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function() { return { total_tips: 0, distribution_method: '--', servers: [] }; }),
    // 5: Hourly sales comparison (today vs last week)
    fetch(API + '/reports/hourly-compare?date=' + dateStr)
      .then(function(r) { return r.json(); }).catch(function() { return { today: [], last_week: [] }; }),
    // 6: Store config → operating hours
    fetch(API + '/config/store')
      .then(function(r) { return r.json(); }).catch(function() { return {}; }),
  ]).then(function(results) {
    var daySummary = results[0] || {};
    var orders = Array.isArray(results[1]) ? results[1] : [];
    var staffResult = results[2] || {};
    var laborSummary = results[3] || {};
    var tipPool = results[4] || {};
    var hourlyCompare = results[5] || {};
    var storeConfig = results[6] || {};

    // Extract operating hours for today
    state.storeConfig = storeConfig;
    state.operatingHours = parseOperatingHours(storeConfig);

    wireSalesData(state, daySummary, orders, laborSummary);
    wireBreakdownData(state, daySummary, orders, state.operatingHours);
    wireOrders(state, orders);
    wireStaffData(state, staffResult, orders);
    wireHeatmap(state, staffResult, orders);
    state.tipPoolData = tipPool;
    state.hourlyCompare = hourlyCompare;
    wireTipAdjData(state, daySummary);
    wireCloseDayData(state);
  });
}

function refreshData(state) {
  if (state._refreshing || !state.el) return;
  state._refreshing = true;
  fetchAllData(state).then(function() {
    state._refreshing = false;
    if (state.el) renderLayout(state);
  }).catch(function() { state._refreshing = false; });
}

// ── Operating Hours ──────────────────────────────

var DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseOperatingHours(storeConfig) {
  var opHours = storeConfig.operating_hours || {};
  var today = DAY_NAMES[new Date().getDay()];
  var todayHours = opHours[today];

  var openHour = 11;  // fallback
  var closeHour = 22; // fallback

  if (todayHours && todayHours.enabled !== false) {
    if (todayHours.open) openHour = parseInt(todayHours.open.split(':')[0], 10);
    if (todayHours.close) closeHour = parseInt(todayHours.close.split(':')[0], 10);
  }

  return { openHour: openHour, closeHour: closeHour };
}

function getShifts(storeConfig) {
  var shifts = (storeConfig || {}).shifts;
  if (shifts && shifts.length > 0) return shifts;
  // Default: split operating hours at midpoint
  var opH = storeConfig ? parseOperatingHours(storeConfig) : { openHour: 11, closeHour: 22 };
  var mid = Math.floor((opH.openHour + opH.closeHour) / 2);
  return [
    { label: 'LUNCH', startHour: opH.openHour, endHour: mid },
    { label: 'DINNER', startHour: mid + 1, endHour: opH.closeHour },
  ];
}

function getShiftDividerIndices(shifts, openHour) {
  // Returns data-point indices where shift boundaries fall
  var indices = [];
  for (var i = 1; i < shifts.length; i++) {
    var idx = shifts[i].startHour - openHour;
    if (idx > 0) indices.push(idx);
  }
  return indices;
}

// ── Data Wiring ─────────────────────────────────

function wireSalesData(state, daySummary, orders, laborSummary) {
  var openOrders = orders.filter(function(o) { return o.status === 'open'; });
  state.salesData = {
    net_sales: daySummary.net_sales || 0,
    avg_check: daySummary.check_avg || daySummary.avg_check || 0,
    active_checks: openOrders.length,
    total_covers: daySummary.guest_count || daySummary.total_checks || 0,
    labor_cob: laborSummary.cob_percent || 0,
    gross_sales: daySummary.gross_sales || 0,
    cash_total: daySummary.cash_total || 0,
    card_total: daySummary.card_total || 0,
    discount_total: daySummary.discount_total || 0,
    void_total: daySummary.void_total || 0,
    tax_total: daySummary.tax_total || 0,
  };
}

function wireBreakdownData(state, daySummary, orders, opHours) {
  var cats = daySummary.categories || [];
  var catList = [];
  if (Array.isArray(cats)) {
    catList = cats.map(function(c) {
      return { name: c.name || c.category, value: c.total || c.value || 0 };
    });
  } else {
    for (var catName in cats) {
      if (cats.hasOwnProperty(catName)) {
        catList.push({ name: catName, value: cats[catName] });
      }
    }
  }
  var hourlyData = (daySummary.hourly_breakdown || daySummary.hourly_sales || []).map(function(h) {
    return { label: h.hour || h.label || '', value: h.total || h.value || h.net_sales || 0 };
  });

  // Compute hourly-per-category from orders for stacked area chart
  var hourlyCats = computeHourlyCats(orders || [], catList, opHours);

  state.breakdownData = {
    categories: catList,
    cash: daySummary.cash_total || 0,
    card: daySummary.card_total || 0,
    hourly: hourlyData,
    hourlyCats: hourlyCats,
  };
}

function computeHourlyCats(orders, catList, opHours) {
  // Build hour labels from operating hours
  var openH = opHours ? opHours.openHour : 11;
  var closeH = opHours ? opHours.closeHour : 22;
  var hours = [];
  for (var h = openH; h <= closeH; h++) {
    var ampm = h >= 12 ? 'p' : 'a';
    hours.push((h > 12 ? h - 12 : (h === 0 ? 12 : h)) + ampm);
  }

  // Get category names from catList
  var catNames = {};
  for (var i = 0; i < catList.length; i++) catNames[catList[i].name] = true;

  // Bucket item revenue by hour + category
  var buckets = {}; // { catName: [hourlyValues] }
  for (var cn in catNames) {
    buckets[cn] = [];
    for (var hi = 0; hi < hours.length; hi++) buckets[cn].push(0);
  }

  for (var oi = 0; oi < orders.length; oi++) {
    var order = orders[oi];
    if (order.status === 'voided') continue;
    // Parse hour from created_at or use current hour
    var orderHour = 12; // default noon
    if (order.created_at) {
      var d = new Date(order.created_at);
      if (!isNaN(d.getTime())) orderHour = d.getHours();
    }
    var hourIdx = orderHour - openH;
    if (hourIdx < 0 || hourIdx >= hours.length) continue;

    var items = order.items || [];
    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      var cat = (item.category || '').toUpperCase();
      if (!buckets[cat]) {
        // New category not in catList — add it
        catNames[cat] = true;
        buckets[cat] = [];
        for (var hi = 0; hi < hours.length; hi++) buckets[cat].push(0);
      }
      buckets[cat][hourIdx] += (item.price || 0) * (item.quantity || 1);
    }
  }

  // Build series for drawStackedAreaMulti
  var series = [];
  for (var cn in buckets) {
    series.push({
      name: cn,
      color: T.catColor(cn),
      data: buckets[cn],
    });
  }

  return { hours: hours, series: series };
}

function wireOrders(state, orders) {
  state.allOrders = orders.map(function(o) {
    return {
      order_id: o.order_id,
      check_number: o.check_number || ('C-' + String(o.order_id).slice(0, 3).toUpperCase()),
      server_id: o.server_id || '',
      server_name: o.server_name || '',
      customer_name: o.customer_name || o.table || '',
      status: o.status,
      items: o.items || [],
      total: o.total || o.subtotal || 0,
    };
  });
}

function wireStaffData(state, staffResult, orders) {
  var staff = staffResult.staff || [];
  state.staffData = {
    servers: staff.map(function(s) {
      var myOrders = orders.filter(function(o) { return o.server_id === s.employee_id; });
      var openOrders = myOrders.filter(function(o) { return o.status === 'open'; });
      var closedOrders = myOrders.filter(function(o) { return o.status === 'closed' || o.status === 'paid'; });

      // Count unadjusted tips — closed card payments with no tip_amount
      var unadjTips = 0;
      for (var ci = 0; ci < closedOrders.length; ci++) {
        var payments = closedOrders[ci].payments || [];
        for (var pi = 0; pi < payments.length; pi++) {
          var p = payments[pi];
          if (p.method === 'card' && p.status === 'confirmed' && (p.tip_amount == null || p.tip_amount === undefined)) {
            unadjTips++;
          }
        }
      }

      return {
        id: s.employee_id,
        name: s.employee_name || s.name || '',
        status: openOrders.length > 0 ? 'active' : 'pending',
        open_tables: openOrders.length,
        closed_checks: closedOrders.length,
        unadj_tips: unadjTips,
        checked_out: false,
      };
    }),
  };
}

function wireHeatmap(state, staffResult, orders) {
  var staff = staffResult.staff || [];
  var now = new Date();
  var opH = state.operatingHours || { openHour: 11, closeHour: 22 };
  var startHour = opH.openHour;
  var curH = now.getHours();
  var hours = [];
  for (var hh = startHour; hh <= Math.max(curH, startHour + 1); hh++) {
    var ampm = hh >= 12 ? 'p' : 'a';
    hours.push((hh > 12 ? hh - 12 : (hh === 0 ? 12 : hh)) + ampm);
  }
  var curIdx = Math.min(Math.max(0, curH - startHour), hours.length - 1);

  var servers = staff.map(function(s) {
    var sOrders = orders.filter(function(o) { return o.server_id === s.employee_id; });
    var openCount = sOrders.filter(function(o) { return o.status === 'open'; }).length;
    var cells = [];
    for (var h = 0; h < hours.length; h++) cells.push(0);
    if (curIdx >= 0 && curIdx < cells.length) cells[curIdx] = openCount;
    return { id: s.employee_id, name: s.employee_name || s.name || '', live_tables: openCount, cells: cells };
  });

  state.heatmapData = { hours: hours, current_hour: curIdx, servers: servers };

  // Assign palette colors
  state.serverColorMap = {};
  for (var i = 0; i < servers.length; i++) {
    state.serverColorMap[servers[i].id] = SERVER_PALETTE[i % SERVER_PALETTE.length];
  }
  for (var j = 0; j < staff.length; j++) {
    if (!state.serverColorMap[staff[j].employee_id]) {
      state.serverColorMap[staff[j].employee_id] = SERVER_PALETTE[Object.keys(state.serverColorMap).length % SERVER_PALETTE.length];
    }
  }
}

function wireTipAdjData(state, daySummary) {
  var unadjCount = 0;
  var checklist = daySummary.tip_adjustment_checklist || [];
  for (var i = 0; i < checklist.length; i++) {
    if (!checklist[i].adjusted) unadjCount++;
  }
  if (unadjCount === 0 && daySummary.unadjusted_tips != null) {
    unadjCount = daySummary.unadjusted_tips;
  }
  state.tipAdjData = { unadjusted_count: unadjCount };
}

function wireCloseDayData(state) {
  var pendingCount = 0;
  var srvList = (state.staffData || {}).servers || [];
  for (var i = 0; i < srvList.length; i++) {
    if (!srvList[i].checked_out) pendingCount++;
  }
  var unadj = ((state.tipAdjData || {}).unadjusted_count) || 0;
  var allOut = srvList.length > 0 && pendingCount === 0;
  var allAdj = unadj === 0;
  state.closeDayData = {
    all_checked_out: allOut,
    pending_count: pendingCount,
    all_tips_adjusted: allAdj,
    unadjusted_count: unadj,
    batch_ready: allOut && allAdj,
    day_closed: false,
  };
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
    hourlyCompare: null,
    heatmapData: null,
    staffData: null,
    tipPoolData: null,
    tipAdjData: null,
    closeDayData: null,
    allOrders: [],
    serverColorMap: {},
    operatingHours: null,
    storeConfig: null,
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
    _state = state;
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

  unmount: function(state) {
    if (state.el) state.el.innerHTML = '';
    state.leftCol = null;
    state.centerCol = null;
    state.rightCol = null;
    state.heatmapEl = null;
    state.centerGrid = null;
    state.opsPanel = null;
    state.checkHeader = null;
    state.drillEl = null;
    state.salesData = null;
    state.breakdownData = null;
    state.hourlyCompare = null;
    state.heatmapData = null;
    state.staffData = null;
    state.tipPoolData = null;
    state.tipAdjData = null;
    state.closeDayData = null;
    state.allOrders = [];
    state.serverColorMap = {};
    state.selected = {};
    _state = null;
  },

  events: {
    'transactional:closed': function(e) {
      if (e && (e.sceneName === 'sc-tip-adjust' || e.sceneName === 'cd-tip-adjust') && _state) {
        refreshData(_state);
      }
    },
    'payment:complete': function() {
      if (_state) {
        _state.selected = {};
        refreshData(_state);
      }
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

    'ml-name-input': {
      render: function(container, params) {
        showKeyboard({
          placeholder: 'Enter name',
          initialValue: params.currentName || '',
          maxLength: 40,
          onDone: function(val) {
            params.onConfirm(val.trim());
          },
          onDismiss: function() {
            params.onCancel();
          },
          dismissOnDone: true,
        });
      },
      unmount: function() { hideKeyboard(); },
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
    + ';display:grid;grid-template-columns:33fr 34fr 33fr;gap:' + T.colGapSm
    + 'px;padding:14px ' + T.colGapSm + 'px;box-sizing:border-box;overflow:hidden;';

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
  col.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:8px;overflow:hidden;';

  col.appendChild(buildSalesOverviewCard(state));
  col.appendChild(buildSalesBreakdownCard(state));

  return col;
}

function buildSalesOverviewCard(state) {
  var d = state.salesData || {};
  var hc = state.hourlyCompare || {};

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.flex = '1';
  card.style.overflow = 'hidden';

  card.appendChild(buildCardHeader('SALES OVERVIEW'));

  // ── Sparkline: today (gold) vs last week (mint dashed) ──
  var chartWrap = document.createElement('div');
  chartWrap.style.cssText = 'flex:1;min-height:0;padding:4px 6px 0;pointer-events:none;overflow:hidden;';

  var todayData = (hc.today || []).map(function(h) {
    return { label: h.hour, value: h.net_sales || 0 };
  });
  var lastWeekData = (hc.last_week || []).map(function(h) {
    return { label: h.hour, value: h.net_sales || 0 };
  });

  // Merge compare values — use whichever has more data points as the base
  var baseData = todayData.length >= lastWeekData.length ? todayData : lastWeekData;
  var chartData = baseData.map(function(d, i) {
    var todayVal = todayData[i] ? todayData[i].value : 0;
    var lastVal = lastWeekData[i] ? lastWeekData[i].value : 0;
    return { label: d.label, value: todayVal, compareValue: lastVal };
  });

  var hasAnyData = chartData.length > 0 && chartData.some(function(d) { return d.value > 0 || d.compareValue > 0; });
  if (hasAnyData) {
    var svg = createSVG(T.chartW, T.chartHSm);
    drawTrendLine(svg, chartData, {
      color: T.gold,
      compareColor: T.mint,
      compareDashed: true,
      width: T.chartW,
      height: T.chartHSm,
      shaded: false,
      hideLabels: true,
      hideAxis: true,
    });
    chartWrap.appendChild(svg);
  }
  card.appendChild(chartWrap);

  // ── KPIs (single row) ──
  var kpiRow = document.createElement('div');
  kpiRow.style.cssText = 'display:flex;justify-content:space-between;padding:6px 10px 8px;flex-shrink:0;';
  var netLabel = document.createElement('span');
  netLabel.style.cssText = 'font-family:' + T.fh + ';font-size:26px;color:' + T.textPrimary + ';font-weight:bold;';
  netLabel.textContent = 'Net ';
  var netVal = document.createElement('span');
  netVal.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + T.gold + ';font-weight:bold;';
  netVal.textContent = fmt(d.net_sales);
  var avgLabel = document.createElement('span');
  avgLabel.style.cssText = 'font-family:' + T.fh + ';font-size:26px;color:' + T.textPrimary + ';font-weight:bold;';
  avgLabel.textContent = 'Avg ';
  var avgVal = document.createElement('span');
  avgVal.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + T.gold + ';font-weight:bold;';
  avgVal.textContent = fmt(d.avg_check);
  var netWrap = document.createElement('span');
  netWrap.appendChild(netLabel);
  netWrap.appendChild(netVal);
  var avgWrap = document.createElement('span');
  avgWrap.appendChild(avgLabel);
  avgWrap.appendChild(avgVal);
  kpiRow.appendChild(netWrap);
  kpiRow.appendChild(avgWrap);
  card.appendChild(kpiRow);

  // ── Tap to expand ──
  card.style.cursor = 'pointer';
  card.addEventListener('pointerup', function() {
    showDrillDown(state, 'sales-overview');
  });

  return pair.wrap;
}

// ═══════════════════════════════════════════════════
//  DRILL-DOWN OVERLAY
// ═══════════════════════════════════════════════════

function showDrillDown(state, cardName, extra) {
  hideDrillDown(state);
  if (!state.el) return;

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:' + T.bgDark
    + ';display:flex;flex-direction:column;z-index:5;overflow:hidden;';
  overlay.style.clipPath = chamfer(8);

  // Header — tap to close
  var headerLabels = {
    'sales-overview': 'SALES OVERVIEW',
    'sales-breakdown': 'SALES BREAKDOWN',
    'server-checkouts': 'SERVER CHECKOUTS',
    'heatmap-full': 'SERVER WORKLOAD',
  };
  var headerText = cardName === 'server-detail' && extra ? extra.name : (headerLabels[cardName] || 'DETAIL');
  var header = buildCardHeader(headerText);
  header.style.cursor = 'pointer';
  header.addEventListener('pointerup', function() { hideDrillDown(state); });
  overlay.appendChild(header);

  // Scrollable content (invisible scrollbar)
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow-y:auto;padding:12px;-ms-overflow-style:none;scrollbar-width:none;';

  if (cardName === 'sales-overview') {
    buildSalesOverviewExpanded(state, content);
  } else if (cardName === 'sales-breakdown') {
    buildSalesBreakdownExpanded(state, content);
  } else if (cardName === 'server-detail') {
    buildServerDetailExpanded(state, content, extra, overlay);
  } else if (cardName === 'heatmap-full') {
    buildHeatmapExpanded(state, content);
  }

  overlay.appendChild(content);
  state.el.style.position = 'relative';
  state.el.appendChild(overlay);
  state.drillEl = overlay;
}

function hideDrillDown(state) {
  if (state.drillEl) {
    state.drillEl.remove();
    state.drillEl = null;
  }
}

function buildSalesOverviewExpanded(state, content) {
  var d = state.salesData || {};
  var hc = state.hourlyCompare || {};
  var activeTab = 'both';

  var todayData = (hc.today || []).map(function(h) {
    return { label: h.hour, value: h.net_sales || 0 };
  });
  var lastWeekData = (hc.last_week || []).map(function(h) {
    return { label: h.hour, value: h.net_sales || 0 };
  });

  // ── Tabs: Today / Last Week / Both ──
  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;margin-bottom:10px;border-bottom:1px solid ' + T.border + ';';
  var tabKeys = ['both', 'today', 'last_week'];
  var tabLabels = ['BOTH', 'TODAY', 'LAST WEEK'];
  var tabEls = [];
  var chartContainer = document.createElement('div');

  var tabColors = { both: T.textPrimary, today: T.gold, last_week: T.mint };

  function applyTab(el, active, key) {
    var accent = tabColors[key] || T.textPrimary;
    el.style.background = active ? accent : T.bgDark;
    el.style.color = active ? T.bgDark : T.mutedText;
  }

  function renderChart() {
    chartContainer.innerHTML = '';
    var chartData, opts;
    var baseData = todayData.length >= lastWeekData.length ? todayData : lastWeekData;

    if (activeTab === 'today') {
      chartData = todayData.length > 0 ? todayData : baseData.map(function(d) { return { label: d.label, value: 0 }; });
      opts = { color: T.gold, width: T.chartFullW, height: T.chartFullH, shaded: false, showCallouts: true, calloutFmt: fmt };
    } else if (activeTab === 'last_week') {
      chartData = lastWeekData.length > 0 ? lastWeekData : baseData.map(function(d) { return { label: d.label, value: 0 }; });
      opts = { color: T.mint, width: T.chartFullW, height: T.chartFullH, shaded: false, showCallouts: true, calloutFmt: fmt };
    } else {
      chartData = baseData.map(function(d, i) {
        var todayVal = todayData[i] ? todayData[i].value : 0;
        var lastVal = lastWeekData[i] ? lastWeekData[i].value : 0;
        return { label: d.label, value: todayVal, compareValue: lastVal };
      });
      opts = { color: T.gold, compareColor: T.mint, width: T.chartFullW, height: T.chartFullH, shaded: false, showCallouts: true, calloutFmt: fmt };
    }

    var hasAny = chartData.length > 0 && chartData.some(function(d) { return d.value > 0 || (d.compareValue || 0) > 0; });
    if (hasAny) {
      var svg = createSVG(opts.width, opts.height);
      drawTrendLine(svg, chartData, opts);
      chartContainer.appendChild(svg);
    }
  }

  for (var t = 0; t < tabKeys.length; t++) {
    (function(key, label) {
      var tab = document.createElement('div');
      tab.style.cssText = 'flex:1;text-align:center;padding:6px 0;cursor:pointer;font-family:' + T.fh + ';font-size:16px;letter-spacing:2px;user-select:none;';
      applyTab(tab, key === activeTab, key);
      tab.textContent = label;
      tab._tabKey = key;
      tab.addEventListener('pointerup', function() {
        activeTab = key;
        for (var i = 0; i < tabEls.length; i++) applyTab(tabEls[i], tabKeys[i] === activeTab, tabEls[i]._tabKey);
        renderChart();
      });
      tabEls.push(tab);
      tabBar.appendChild(tab);
    })(tabKeys[t], tabLabels[t]);
  }

  content.appendChild(tabBar);
  content.appendChild(chartContainer);
  renderChart();

  // ── Breakdown Grid ──
  var gridLabel = document.createElement('div');
  gridLabel.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + T.textPrimary + ';letter-spacing:1px;margin:12px 0 6px;';
  gridLabel.textContent = 'BREAKDOWN';
  content.appendChild(gridLabel);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;';

  function gridCell(label, value, color) {
    var cell = document.createElement('div');
    cell.style.cssText = 'background:' + T.bg + ';padding:8px 10px;';
    cell.style.clipPath = chamfer(4);
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.mutedText + ';font-weight:bold;';
    lbl.textContent = label;
    var val = document.createElement('div');
    val.style.cssText = 'font-family:' + T.fb + ';font-size:22px;color:' + color + ';font-weight:bold;margin-top:2px;';
    val.textContent = value;
    cell.appendChild(lbl);
    cell.appendChild(val);
    return cell;
  }

  grid.appendChild(gridCell('Net Sales', fmt(d.net_sales), T.gold));
  grid.appendChild(gridCell('Gross Sales', fmt(d.gross_sales), T.gold));
  grid.appendChild(gridCell('Tax', fmt(d.tax_total), T.textPrimary));
  grid.appendChild(gridCell('Cash', fmt(d.cash_total), T.gold));
  grid.appendChild(gridCell('Card', fmt(d.card_total), T.gold));
  grid.appendChild(gridCell('Check Avg', fmt(d.avg_check), T.gold));
  grid.appendChild(gridCell('Discounts', fmt(d.discount_total), T.vermillion));
  grid.appendChild(gridCell('Voids', fmt(d.void_total), T.vermillion));

  content.appendChild(grid);
}

function buildSalesBreakdownExpanded(state, content) {
  var bd = state.breakdownData || {};
  var cats = bd.categories || [];
  var hc = bd.hourlyCats || { hours: [], series: [] };
  var orders = state.allOrders || [];
  var activeFilter = null;

  // ── Stats row ──
  var totalRevenue = 0;
  for (var i = 0; i < cats.length; i++) totalRevenue += cats[i].value;
  var topCat = cats.length > 0 ? cats.reduce(function(a, b) { return a.value > b.value ? a : b; }) : null;
  var totalItems = 0;
  for (var oi = 0; oi < orders.length; oi++) {
    var items = orders[oi].items || [];
    for (var ii = 0; ii < items.length; ii++) totalItems += (items[ii].quantity || 1);
  }
  // Peak hour from hourly data
  var hourlyData = bd.hourly || [];
  var peakHour = '--';
  var peakVal = 0;
  for (var i = 0; i < hourlyData.length; i++) {
    if (hourlyData[i].value > peakVal) { peakVal = hourlyData[i].value; peakHour = hourlyData[i].label; }
  }

  var statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';

  function statBox(label, value, color) {
    var box = document.createElement('div');
    box.style.cssText = 'background:' + T.bg + ';border:2px solid ' + T.border + ';flex:1;padding:7px 8px;';
    box.style.clipPath = chamfer(4);
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.numpadChassis + ';font-weight:bold;letter-spacing:1px;';
    lbl.textContent = label;
    var val = document.createElement('div');
    val.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + color + ';font-weight:bold;line-height:1.1;margin-top:2px;';
    val.textContent = value;
    box.appendChild(lbl);
    box.appendChild(val);
    return box;
  }

  statsRow.appendChild(statBox('TOTAL REVENUE', fmt(totalRevenue), T.gold));
  var topBox = statBox('TOP CATEGORY', topCat ? topCat.name : '--', topCat ? T.catColor(topCat.name) : T.textPrimary);
  statsRow.appendChild(topBox);
  statsRow.appendChild(statBox('PEAK HOUR', peakHour, T.lime));
  statsRow.appendChild(statBox('TOTAL ITEMS', String(totalItems), T.lime));
  content.appendChild(statsRow);

  // ── Full stacked area chart ──
  var chartContainer = document.createElement('div');

  function renderChart() {
    chartContainer.innerHTML = '';
    if (hc.series.length > 0) {
      var svg = createSVG(T.chartFullW, T.chartFullH);
      drawStackedAreaMulti(svg, hc.series, {
        width: T.chartFullW,
        height: T.chartFullH,
        labels: hc.hours,
        activeSeries: activeFilter,
      });
      chartContainer.appendChild(svg);
    }
  }

  content.appendChild(chartContainer);
  renderChart();

  // ── Tender split bar ──
  var tenderLabel = document.createElement('div');
  tenderLabel.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.numpadChassis + ';font-weight:bold;letter-spacing:2px;margin:12px 0 6px;';
  tenderLabel.textContent = 'TENDER SPLIT';
  content.appendChild(tenderLabel);

  var cashTotal = bd.cash || 0;
  var cardTotal = bd.card || 0;
  var tenderTotal = cashTotal + cardTotal;
  var cashPct = tenderTotal > 0 ? cashTotal / tenderTotal : 0.5;

  var tenderBar = document.createElement('div');
  tenderBar.style.cssText = 'display:flex;height:28px;margin-bottom:4px;';
  var cashSeg = document.createElement('div');
  cashSeg.style.cssText = 'background:' + T.gold + ';flex:' + (cashPct * 100).toFixed(0) + ';display:flex;align-items:center;justify-content:center;font-family:' + T.fb + ';font-size:14px;color:' + T.bgDark + ';font-weight:bold;';
  cashSeg.textContent = 'CASH ' + fmt(cashTotal) + ' ' + Math.round(cashPct * 100) + '%';
  var cardSeg = document.createElement('div');
  cardSeg.style.cssText = 'background:' + T.electricPink + ';flex:' + ((1 - cashPct) * 100).toFixed(0) + ';display:flex;align-items:center;justify-content:center;font-family:' + T.fb + ';font-size:14px;color:' + T.bgDark + ';font-weight:bold;';
  cardSeg.textContent = 'CARD ' + fmt(cardTotal) + ' ' + Math.round((1 - cashPct) * 100) + '%';
  tenderBar.appendChild(cashSeg);
  tenderBar.appendChild(cardSeg);
  content.appendChild(tenderBar);

  // ── Category filter chips ──
  var filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:5px;margin:12px 0 10px;flex-wrap:wrap;align-items:center;';
  var filterLbl = document.createElement('span');
  filterLbl.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.mutedText + ';font-weight:bold;letter-spacing:1px;';
  filterLbl.textContent = 'FILTER:';
  filterBar.appendChild(filterLbl);

  var chipEls = [];
  var itemSections = document.createElement('div');

  function updateFilter(name) {
    if (activeFilter === name) {
      activeFilter = null;
    } else {
      activeFilter = name;
    }
    for (var i = 0; i < chipEls.length; i++) {
      var isActive = !activeFilter || chipEls[i]._catName === activeFilter;
      chipEls[i].style.opacity = isActive ? '1' : '0.2';
    }
    renderChart();
    renderItemSections();
  }

  for (var i = 0; i < cats.length; i++) {
    (function(cat) {
      var chip = document.createElement('button');
      chip.style.cssText = 'font-family:' + T.fh + ';font-size:14px;font-weight:bold;letter-spacing:1px;padding:3px 8px;border:1px solid ' + T.catColor(cat.name) + ';color:' + T.catColor(cat.name) + ';background:transparent;cursor:pointer;';
      chip.style.clipPath = chamfer(3);
      chip.textContent = cat.name;
      chip._catName = cat.name;
      chip.addEventListener('pointerup', function() { updateFilter(cat.name); });
      chipEls.push(chip);
      filterBar.appendChild(chip);
    })(cats[i]);
  }
  content.appendChild(filterBar);

  // ── Item sections per category ──
  function renderItemSections() {
    itemSections.innerHTML = '';
    var visibleCats = activeFilter ? cats.filter(function(c) { return c.name === activeFilter; }) : cats;

    // Build item map from orders
    var itemsByCat = {};
    for (var oi = 0; oi < orders.length; oi++) {
      if (orders[oi].status === 'voided') continue;
      var oItems = orders[oi].items || [];
      for (var ii = 0; ii < oItems.length; ii++) {
        var item = oItems[ii];
        var catName = (item.category || '').toUpperCase();
        if (!itemsByCat[catName]) itemsByCat[catName] = {};
        var key = item.name || item.menu_item_id || 'Unknown';
        if (!itemsByCat[catName][key]) {
          itemsByCat[catName][key] = { name: key, qty: 0, price: item.price || 0 };
        }
        itemsByCat[catName][key].qty += (item.quantity || 1);
      }
    }

    for (var ci = 0; ci < visibleCats.length; ci++) {
      var cat = visibleCats[ci];
      var catColor = T.catColor(cat.name);

      // Section header
      var secHdr = document.createElement('div');
      secHdr.style.cssText = 'display:flex;align-items:center;gap:8px;padding-bottom:4px;margin-bottom:5px;border-bottom:1px solid ' + T.border + ';margin-top:10px;';
      var dot = document.createElement('span');
      dot.style.cssText = 'width:8px;height:8px;background:' + catColor + ';flex-shrink:0;';
      var nameEl = document.createElement('span');
      nameEl.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + catColor + ';font-weight:bold;letter-spacing:2px;';
      nameEl.textContent = cat.name;
      var totalEl = document.createElement('span');
      totalEl.style.cssText = 'margin-left:auto;font-family:' + T.fb + ';font-size:18px;color:' + T.gold + ';font-weight:bold;';
      totalEl.textContent = fmt(cat.value);
      secHdr.appendChild(dot);
      secHdr.appendChild(nameEl);
      secHdr.appendChild(totalEl);
      itemSections.appendChild(secHdr);

      // Item table
      var catItems = itemsByCat[cat.name] || {};
      var itemList = [];
      for (var k in catItems) { if (catItems.hasOwnProperty(k)) itemList.push(catItems[k]); }
      itemList.sort(function(a, b) { return (b.qty * b.price) - (a.qty * a.price); });

      if (itemList.length === 0) continue;

      var table = document.createElement('div');
      table.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:0;';

      // Header row
      var thLabels = ['ITEM', 'QTY', 'UNIT', 'TOTAL'];
      for (var ti = 0; ti < thLabels.length; ti++) {
        var th = document.createElement('div');
        th.style.cssText = 'background:' + T.bgDark + ';font-family:' + T.fh + ';font-size:14px;color:' + T.numpadChassis + ';font-weight:bold;letter-spacing:1px;padding:4px 8px;border-bottom:1px solid ' + T.border + ';' + (ti > 0 ? 'text-align:right;' : '');
        th.textContent = thLabels[ti];
        table.appendChild(th);
      }

      for (var ii = 0; ii < itemList.length; ii++) {
        var it = itemList[ii];
        var cells = [it.name, String(it.qty), fmt(it.price), fmt(it.qty * it.price)];
        for (var ci2 = 0; ci2 < cells.length; ci2++) {
          var td = document.createElement('div');
          var isMoney = ci2 === 3;
          td.style.cssText = 'font-family:' + T.fb + ';font-size:16px;padding:5px 8px;border-bottom:1px solid ' + T.bg + ';font-weight:bold;color:' + (isMoney ? T.gold : ci2 > 0 ? T.numpadChassis : T.textPrimary) + ';' + (ci2 > 0 ? 'text-align:right;' : '');
          td.textContent = cells[ci2];
          table.appendChild(td);
        }
      }
      itemSections.appendChild(table);
    }
  }

  content.appendChild(itemSections);
  renderItemSections();
}

// ═══════════════════════════════════════════════════
//  SERVER DETAIL — expanded per-server checkout view
// ═══════════════════════════════════════════════════

function buildServerDetailExpanded(state, content, srv, overlay) {
  var orders = state.allOrders || [];
  var showAll = true; // false = unadjusted only

  // Get this server's closed orders
  var closedOrders = orders.filter(function(o) {
    return o.server_id === srv.id && (o.status === 'closed' || o.status === 'paid');
  });

  // ── Filter toggle: ALL / UNADJUSTED ──
  var filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';
  var filterEls = [];

  function applyFilterStyle(el, active) {
    el.style.background = active ? T.mint : T.bgDark;
    el.style.color = active ? T.bgDark : T.mutedText;
  }

  ['ALL', 'UNADJUSTED'].forEach(function(label, idx) {
    var btn = document.createElement('div');
    btn.style.cssText = 'flex:1;text-align:center;padding:6px 0;cursor:pointer;font-family:' + T.fh + ';font-size:16px;letter-spacing:2px;user-select:none;font-weight:bold;';
    btn.textContent = label;
    applyFilterStyle(btn, idx === 0);
    btn.addEventListener('pointerup', function() {
      showAll = idx === 0;
      for (var i = 0; i < filterEls.length; i++) applyFilterStyle(filterEls[i], i === idx);
      renderChecks();
    });
    filterEls.push(btn);
    filterBar.appendChild(btn);
  });
  content.appendChild(filterBar);

  // ── Check list container ──
  var checkList = document.createElement('div');
  content.appendChild(checkList);

  // ── Numpad container (slides in from right) ──
  var numpadWrap = document.createElement('div');
  numpadWrap.style.cssText = 'position:absolute;top:0;right:-300px;width:280px;height:100%;background:' + T.bg + ';border-left:2px solid ' + T.border + ';transition:right 200ms ease-out;z-index:10;display:flex;flex-direction:column;padding:8px;';
  overlay.appendChild(numpadWrap);

  var activePaymentId = null;
  var activeOrderId = null;

  function showNumpad(orderId, paymentId) {
    activeOrderId = orderId;
    activePaymentId = paymentId;
    numpadWrap.innerHTML = '';
    numpadWrap.style.right = '0';
    content.style.marginRight = '280px';

    var title = document.createElement('div');
    title.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + T.mint + ';font-weight:bold;letter-spacing:1px;margin-bottom:8px;';
    title.textContent = 'ADJUST TIP';
    numpadWrap.appendChild(title);

    // Simple digit entry
    var display = document.createElement('div');
    display.style.cssText = 'font-family:' + T.fb + ';font-size:32px;color:' + T.pinDot + ';font-weight:bold;text-align:right;padding:8px;background:' + T.pinFieldBg + ';margin-bottom:8px;';
    display.textContent = '$0.00';
    numpadWrap.appendChild(display);

    var digits = '';
    function updateDisplay() {
      var cents = parseInt(digits || '0', 10);
      display.textContent = '$' + (cents / 100).toFixed(2);
    }

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;flex:1;';
    var keys = ['1','2','3','4','5','6','7','8','9','C','0','\u2713'];
    for (var ki = 0; ki < keys.length; ki++) {
      (function(k) {
        var btn = document.createElement('div');
        var isConfirm = k === '\u2713';
        var isClear = k === 'C';
        btn.style.cssText = 'display:flex;align-items:center;justify-content:center;font-family:' + T.fb + ';font-size:24px;font-weight:bold;cursor:pointer;user-select:none;background:' + (isConfirm ? T.submitColor : isClear ? T.clrColor : T.darkBtn) + ';color:' + (isConfirm ? T.bgDark : isClear ? T.textPrimary : T.digitColor) + ';';
        btn.textContent = k;
        btn.addEventListener('pointerup', function() {
          if (isClear) {
            digits = '';
          } else if (isConfirm) {
            var tipVal = parseInt(digits || '0', 10) / 100;
            submitTipAdjust(activeOrderId, activePaymentId, tipVal);
          } else {
            if (digits.length < 6) digits += k;
          }
          updateDisplay();
        });
        grid.appendChild(btn);
      })(keys[ki]);
    }
    numpadWrap.appendChild(grid);

    // Cancel button
    var cancelBtn = document.createElement('div');
    cancelBtn.style.cssText = 'text-align:center;padding:8px;cursor:pointer;font-family:' + T.fh + ';font-size:16px;color:' + T.vermillion + ';font-weight:bold;margin-top:6px;';
    cancelBtn.textContent = 'CANCEL';
    cancelBtn.addEventListener('pointerup', function() { hideNumpad(); });
    numpadWrap.appendChild(cancelBtn);
  }

  function hideNumpad() {
    numpadWrap.style.right = '-300px';
    content.style.marginRight = '0';
    activePaymentId = null;
    activeOrderId = null;
  }

  function submitTipAdjust(orderId, paymentId, tipVal) {
    fetch('/api/v1/orders/' + orderId + '/adjust-tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, tip_amount: tipVal }),
    }).then(function(r) {
      if (r.ok) {
        showToast('Tip adjusted', { bg: T.goGreen });
        hideNumpad();
        // Refresh data and re-render the check list
        refreshData(state);
      } else {
        showToast('Tip adjust failed', { bg: T.red });
      }
    }).catch(function() { showToast('Tip adjust failed', { bg: T.red }); });
  }

  function renderChecks() {
    checkList.innerHTML = '';

    var visible = closedOrders;
    if (!showAll) {
      visible = closedOrders.filter(function(o) {
        var payments = o.payments || [];
        for (var pi = 0; pi < payments.length; pi++) {
          if (payments[pi].method === 'card' && payments[pi].status === 'confirmed' && (payments[pi].tip_amount == null || payments[pi].tip_amount === undefined)) return true;
        }
        return false;
      });
    }

    if (visible.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:20px;font-family:' + T.fh + ';font-size:18px;color:' + T.mutedText + ';font-weight:bold;';
      empty.textContent = showAll ? 'No closed checks' : 'All tips adjusted';
      checkList.appendChild(empty);
      return;
    }

    // Header row
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:0;margin-bottom:2px;';
    var hdrLabels = ['CHECK', 'COVERS', 'TOTAL', 'TIP'];
    for (var hi = 0; hi < hdrLabels.length; hi++) {
      var th = document.createElement('div');
      th.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.numpadChassis + ';font-weight:bold;letter-spacing:1px;padding:4px 8px;border-bottom:1px solid ' + T.border + ';' + (hi > 0 ? 'text-align:right;' : '');
      th.textContent = hdrLabels[hi];
      hdr.appendChild(th);
    }
    checkList.appendChild(hdr);

    for (var oi = 0; oi < visible.length; oi++) {
      (function(order) {
        var checkNum = order.check_number || ('C-' + String(order.order_id).slice(0, 3).toUpperCase());
        var items = order.items || [];
        var coverCount = 0;
        for (var ii = 0; ii < items.length; ii++) coverCount += (items[ii].quantity || 1);
        var total = order.total || 0;

        // Find card payment + tip status
        var cardPayment = null;
        var payments = order.payments || [];
        for (var pi = 0; pi < payments.length; pi++) {
          if (payments[pi].method === 'card' && payments[pi].status === 'confirmed') {
            cardPayment = payments[pi];
            break;
          }
        }
        var tipText, tipColor, isTappable;
        if (!cardPayment) {
          tipText = 'CASH';
          tipColor = T.mutedText;
          isTappable = false;
        } else if (cardPayment.tip_amount != null && cardPayment.tip_amount !== undefined) {
          tipText = fmt(cardPayment.tip_amount);
          tipColor = T.gold;
          isTappable = true; // can re-adjust
        } else {
          tipText = 'UNADJ';
          tipColor = T.vermillion;
          isTappable = true;
        }

        var row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:0;border-bottom:1px solid ' + T.bg + ';';

        var cells = [checkNum, String(coverCount), fmt(total), tipText];
        var colors = [T.textPrimary, T.textPrimary, T.gold, tipColor];
        for (var ci = 0; ci < cells.length; ci++) {
          var td = document.createElement('div');
          td.style.cssText = 'font-family:' + T.fb + ';font-size:18px;padding:6px 8px;font-weight:bold;color:' + colors[ci] + ';' + (ci > 0 ? 'text-align:right;' : '');

          if (ci === 3 && isTappable) {
            // Tip cell is tappable
            td.style.cursor = 'pointer';
            td.style.borderBottom = '2px solid ' + tipColor;
            (function(oid, pid) {
              td.addEventListener('pointerup', function(e) {
                e.stopPropagation();
                showNumpad(oid, pid);
              });
            })(order.order_id, cardPayment.payment_id);
          }

          td.textContent = cells[ci];
          row.appendChild(td);
        }
        checkList.appendChild(row);
      })(visible[oi]);
    }
  }

  renderChecks();

  // ── CHECKOUT button ──
  var checkoutBtn = buildStyledButton({ label: 'CHECKOUT ' + srv.name.toUpperCase() + ' \u25B6', variant: 'mint', size: 'md' });
  checkoutBtn.wrap.style.marginTop = '12px';
  checkoutBtn.wrap.addEventListener('pointerup', function(e) {
    e.stopPropagation();
    hideDrillDown(state);
    var emp = state.params.emp || state.params;
    SceneManager.openTransactional('server-checkout', {
      pin: emp.pin, employeeId: srv.id, employeeName: srv.name,
    });
  });
  content.appendChild(checkoutBtn.wrap);
}

function buildSalesBreakdownCard(state) {
  var bd = state.breakdownData || {};
  var hc = bd.hourlyCats || { hours: [], series: [] };

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.flex = '1';
  card.style.overflow = 'hidden';

  card.appendChild(buildCardHeader('SALES BREAKDOWN'));

  // ── Stacked area sparkline ──
  var chartWrap = document.createElement('div');
  chartWrap.style.cssText = 'flex:1;min-height:0;padding:4px 6px 0;pointer-events:none;overflow:hidden;';
  if (hc.series.length > 0) {
    var opH = state.operatingHours || { openHour: 11, closeHour: 22 };
    var shifts = getShifts(state.storeConfig || {});
    var dividers = getShiftDividerIndices(shifts, opH.openHour);
    var svg = createSVG(T.chartW, T.chartHSm);
    drawStackedAreaMulti(svg, hc.series, {
      width: T.chartW,
      height: T.chartHSm,
      labels: hc.hours,
      hideLabels: true,
      hideAxis: true,
      shiftDividers: dividers,
    });
    chartWrap.appendChild(svg);
  }
  card.appendChild(chartWrap);

  // ── KPI row: Cash | Card ──
  var kpiRow = document.createElement('div');
  kpiRow.style.cssText = 'display:flex;justify-content:space-between;padding:6px 10px 8px;flex-shrink:0;';
  var cashWrap = document.createElement('span');
  var cashLbl = document.createElement('span');
  cashLbl.style.cssText = 'font-family:' + T.fh + ';font-size:26px;color:' + T.textPrimary + ';font-weight:bold;';
  cashLbl.textContent = 'Cash ';
  var cashVal = document.createElement('span');
  cashVal.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + T.gold + ';font-weight:bold;';
  cashVal.textContent = fmt(bd.cash);
  cashWrap.appendChild(cashLbl);
  cashWrap.appendChild(cashVal);
  var cardWrap = document.createElement('span');
  var cardLbl = document.createElement('span');
  cardLbl.style.cssText = 'font-family:' + T.fh + ';font-size:26px;color:' + T.textPrimary + ';font-weight:bold;';
  cardLbl.textContent = 'Card ';
  var cardVal = document.createElement('span');
  cardVal.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + T.gold + ';font-weight:bold;';
  cardVal.textContent = fmt(bd.card);
  cardWrap.appendChild(cardLbl);
  cardWrap.appendChild(cardVal);
  kpiRow.appendChild(cashWrap);
  kpiRow.appendChild(cardWrap);
  card.appendChild(kpiRow);

  card.style.cursor = 'pointer';
  card.addEventListener('pointerup', function() {
    showDrillDown(state, 'sales-breakdown');
  });

  return pair.wrap;
}

// ═══════════════════════════════════════════════════
//  CENTER COLUMN — Check Grid + Heatmap
// ═══════════════════════════════════════════════════

function buildCenterColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;gap:8px;';

  // ── Heatmap card (compact — last 2hrs + now) ──
  col.appendChild(buildHeatmapCard(state));

  // ── Check grid card (fills remaining space) ──
  col.appendChild(buildCheckGridCard(state));

  return col;
}

// ═══════════════════════════════════════════════════
//  HEATMAP CARD — compact (last 2hrs + current)
// ═══════════════════════════════════════════════════

function heatmapTier(count) {
  if (count === 0)  return { fill: 'transparent', color: T.mutedText, border: '1px dashed ' + T.border };
  if (count <= 2)   return { fill: T.textPrimary, color: T.bgDark, border: 'none' };
  if (count <= 4)   return { fill: T.mint, color: T.bgDark, border: 'none' };
  if (count <= 6)   return { fill: '#ff8800', color: T.textPrimary, border: 'none' };
  return { fill: T.vermillion, color: T.textPrimary, border: 'none' };
}

function buildHeatmapCard(state) {
  var hm = state.heatmapData || {};
  var hours = hm.hours || [];
  var servers = hm.servers || [];
  var curHour = hm.current_hour != null ? hm.current_hour : -1;

  // Show last 2 hours + current (compact view)
  var startIdx = Math.max(0, curHour - 2);
  var visibleHours = hours.slice(startIdx);
  var visibleIndices = [];
  for (var i = startIdx; i < hours.length; i++) visibleIndices.push(i);

  // Filter servers with any activity
  var active = servers.filter(function(s) {
    for (var i = 0; i < s.cells.length; i++) { if (s.cells[i] > 0) return true; }
    return s.live_tables > 0;
  });

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.flexShrink = '0';

  card.appendChild(buildCardHeader('SERVER WORKLOAD'));

  if (active.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'padding:12px;text-align:center;font-family:' + T.fh + ';font-size:16px;color:' + T.mutedText + ';font-weight:bold;';
    empty.textContent = 'No active servers';
    card.appendChild(empty);
  } else {
    var gridCols = 'auto repeat(' + visibleHours.length + ', 1fr) auto';
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:' + gridCols + ';gap:2px;padding:6px;';

    // Header row: corner + hour labels + NOW
    grid.appendChild(document.createElement('div')); // empty corner
    for (var h = 0; h < visibleHours.length; h++) {
      var hLabel = document.createElement('div');
      var isCurrent = visibleIndices[h] === curHour;
      hLabel.style.cssText = 'font-family:' + T.fh + ';font-size:12px;font-weight:bold;color:' + (isCurrent ? T.lime : T.mutedText) + ';text-align:center;padding:2px 0;';
      hLabel.textContent = visibleHours[h];
      grid.appendChild(hLabel);
    }
    var nowLabel = document.createElement('div');
    nowLabel.style.cssText = 'font-family:' + T.fh + ';font-size:12px;font-weight:bold;color:' + T.lime + ';text-align:right;padding:2px 4px;';
    nowLabel.textContent = 'NOW';
    grid.appendChild(nowLabel);

    // Server rows
    for (var s = 0; s < active.length; s++) {
      var srv = active[s];
      var sColor = srvColor(state.serverColorMap, srv.id);

      // Name cell (tappable — filters check grid to this server)
      var nameCell = document.createElement('div');
      nameCell.style.cssText = 'font-family:' + T.fh + ';font-size:14px;font-weight:bold;color:' + sColor + ';padding:3px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;cursor:pointer;';
      nameCell.textContent = srv.name;
      (function(serverId, serverName) {
        nameCell.addEventListener('pointerup', function(e) {
          e.stopPropagation();
          state.filteredServerId = state.filteredServerId === serverId ? null : serverId;
          state.filteredServerName = state.filteredServerId ? serverName : null;
          state.selected = {};
          renderCheckGrid(state);
          renderOpsPanel(state);
        });
      })(srv.id, srv.name);
      grid.appendChild(nameCell);

      // Hour cells (tappable — same filter as name)
      for (var c = 0; c < visibleIndices.length; c++) {
        var cellIdx = visibleIndices[c];
        var count = srv.cells[cellIdx] || 0;
        var tier = heatmapTier(count);
        var cell = document.createElement('div');
        cell.style.cssText = 'min-height:22px;display:flex;align-items:center;justify-content:center;font-family:' + T.fb + ';font-size:14px;font-weight:bold;color:' + tier.color + ';background:' + tier.fill + ';cursor:pointer;';
        if (tier.border !== 'none') cell.style.border = tier.border;
        if (cellIdx === curHour) cell.style.borderLeft = '2px solid ' + T.lime;
        if (count > 0) cell.textContent = String(count);
        (function(serverId, serverName) {
          cell.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            state.filteredServerId = state.filteredServerId === serverId ? null : serverId;
            state.filteredServerName = state.filteredServerId ? serverName : null;
            state.selected = {};
            renderCheckGrid(state);
            renderOpsPanel(state);
          });
        })(srv.id, srv.name);
        grid.appendChild(cell);
      }

      // Live count (tappable — same filter as name)
      var liveCell = document.createElement('div');
      liveCell.style.cssText = 'font-family:' + T.fb + ';font-size:16px;font-weight:bold;color:' + sColor + ';text-align:right;padding:3px 4px;cursor:pointer;';
      liveCell.textContent = String(srv.live_tables);
      (function(serverId, serverName) {
        liveCell.addEventListener('pointerup', function(e) {
          e.stopPropagation();
          state.filteredServerId = state.filteredServerId === serverId ? null : serverId;
          state.filteredServerName = state.filteredServerId ? serverName : null;
          state.selected = {};
          renderCheckGrid(state);
          renderOpsPanel(state);
        });
      })(srv.id, srv.name);
      grid.appendChild(liveCell);
    }

    card.appendChild(grid);
  }

  // Tap to expand full-day heatmap
  card.style.cursor = 'pointer';
  card.addEventListener('pointerup', function() {
    showDrillDown(state, 'heatmap-full');
  });

  return pair.wrap;
}

function buildHeatmapExpanded(state, content) {
  var hm = state.heatmapData || {};
  var hours = hm.hours || [];
  var servers = hm.servers || [];
  var curHour = hm.current_hour != null ? hm.current_hour : -1;

  var active = servers.filter(function(s) {
    for (var i = 0; i < s.cells.length; i++) { if (s.cells[i] > 0) return true; }
    return s.live_tables > 0;
  });

  if (active.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:40px;font-family:' + T.fh + ';font-size:18px;color:' + T.mutedText + ';font-weight:bold;';
    empty.textContent = 'No server activity today';
    content.appendChild(empty);
    return;
  }

  var gridCols = 'auto repeat(' + hours.length + ', 1fr) auto';
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:' + gridCols + ';gap:3px;';

  // Header row
  grid.appendChild(document.createElement('div'));
  for (var h = 0; h < hours.length; h++) {
    var hLabel = document.createElement('div');
    var isCurrent = h === curHour;
    hLabel.style.cssText = 'font-family:' + T.fh + ';font-size:14px;font-weight:bold;color:' + (isCurrent ? T.lime : T.mutedText) + ';text-align:center;padding:2px 0;';
    hLabel.textContent = hours[h];
    grid.appendChild(hLabel);
  }
  var nowHdr = document.createElement('div');
  nowHdr.style.cssText = 'font-family:' + T.fh + ';font-size:14px;font-weight:bold;color:' + T.lime + ';text-align:right;padding:2px 4px;';
  nowHdr.textContent = 'NOW';
  grid.appendChild(nowHdr);

  // Server rows
  for (var s = 0; s < active.length; s++) {
    var srv = active[s];
    var sColor = srvColor(state.serverColorMap, srv.id);

    var nameCell = document.createElement('div');
    nameCell.style.cssText = 'font-family:' + T.fh + ';font-size:16px;font-weight:bold;color:' + sColor + ';padding:4px 8px;white-space:nowrap;';
    nameCell.textContent = srv.name;
    grid.appendChild(nameCell);

    for (var c = 0; c < srv.cells.length; c++) {
      var count = srv.cells[c] || 0;
      var tier = heatmapTier(count);
      var cell = document.createElement('div');
      cell.style.cssText = 'min-height:28px;display:flex;align-items:center;justify-content:center;font-family:' + T.fb + ';font-size:16px;font-weight:bold;color:' + tier.color + ';background:' + tier.fill + ';';
      if (tier.border !== 'none') cell.style.border = tier.border;
      if (c === curHour) cell.style.borderLeft = '2px solid ' + T.lime;
      if (count > 0) cell.textContent = String(count);
      grid.appendChild(cell);
    }

    var liveCell = document.createElement('div');
    liveCell.style.cssText = 'font-family:' + T.fb + ';font-size:18px;font-weight:bold;color:' + sColor + ';text-align:right;padding:4px 6px;';
    liveCell.textContent = String(srv.live_tables);
    grid.appendChild(liveCell);
  }

  content.appendChild(grid);

  // Legend
  var legend = document.createElement('div');
  legend.style.cssText = 'display:flex;gap:12px;justify-content:center;margin-top:12px;';
  var tiers = [
    { label: 'NONE', fill: 'transparent', border: '1px dashed ' + T.border, color: T.mutedText },
    { label: 'CALM', fill: T.textPrimary, color: T.bgDark },
    { label: 'MODERATE', fill: T.mint, color: T.bgDark },
    { label: 'HIGH', fill: '#ff8800', color: T.textPrimary },
    { label: 'EXTREME', fill: T.vermillion, color: T.textPrimary },
  ];
  for (var ti = 0; ti < tiers.length; ti++) {
    var item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:4px;';
    var swatch = document.createElement('div');
    swatch.style.cssText = 'width:14px;height:14px;background:' + tiers[ti].fill + ';';
    if (tiers[ti].border) swatch.style.border = tiers[ti].border;
    var lbl = document.createElement('span');
    lbl.style.cssText = 'font-family:' + T.fh + ';font-size:12px;font-weight:bold;color:' + T.mutedText + ';';
    lbl.textContent = tiers[ti].label;
    item.appendChild(swatch);
    item.appendChild(lbl);
    legend.appendChild(item);
  }
  content.appendChild(legend);
}

// ═══════════════════════════════════════════════════
//  CHECK GRID CARD — tabs + tiles + operations
// ═══════════════════════════════════════════════════

function buildCheckGridCard(state) {
  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.flex = '1';
  card.style.minHeight = '0';
  card.style.overflow = 'hidden';
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';

  // ── Tab bar ──
  var tabKeys = ['open', 'closed', 'void'];
  var tabLabels = ['OPEN', 'CLOSED', 'VOID'];
  var tabEls = [];
  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;flex-shrink:0;border-bottom:1px solid ' + T.border + ';';

  function applyCheckTab(el, active) {
    el.style.background = active ? T.mint : T.bgDark;
    el.style.color = active ? T.bgDark : T.mutedText;
  }

  for (var t = 0; t < tabKeys.length; t++) {
    (function(key, label) {
      var tab = document.createElement('div');
      tab.style.cssText = 'flex:1;text-align:center;padding:6px 0;cursor:pointer;font-family:' + T.fh + ';font-size:16px;letter-spacing:2px;user-select:none;font-weight:bold;';
      applyCheckTab(tab, key === state.activeTab);
      tab.textContent = label;
      tab.addEventListener('pointerup', function() {
        state.activeTab = key;
        state.selected = {};
        for (var i = 0; i < tabEls.length; i++) applyCheckTab(tabEls[i], tabKeys[i] === state.activeTab);
        renderCheckGrid(state);
        renderOpsPanel(state);
      });
      tabEls.push(tab);
      tabBar.appendChild(tab);
    })(tabKeys[t], tabLabels[t]);
  }
  card.appendChild(tabBar);

  // ── Check grid ──
  state.centerGrid = document.createElement('div');
  state.centerGrid.style.cssText = 'flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;';
  card.appendChild(state.centerGrid);

  // ── Operations panel ──
  state.opsPanel = document.createElement('div');
  state.opsPanel.style.cssText = 'flex-shrink:0;border-top:1px solid ' + T.border + ';background:' + T.bg + ';';
  card.appendChild(state.opsPanel);

  renderCheckGrid(state);
  renderOpsPanel(state);

  return pair.wrap;
}

// ── Check Grid Rendering ────────────────────────

function ordersByTab(state) {
  var tab = state.activeTab;
  var sid = state.filteredServerId;
  return (state.allOrders || []).filter(function(o) {
    if (sid && o.server_id !== sid) return false;
    if (tab === 'open') return o.status === 'open';
    if (tab === 'closed') return o.status === 'closed' || o.status === 'paid';
    if (tab === 'void') return o.status === 'voided';
    return false;
  });
}

function renderCheckGrid(state) {
  if (!state.centerGrid) return;
  // Clear pending hold timers from previous render
  if (state._holdTimers) {
    for (var ht = 0; ht < state._holdTimers.length; ht++) clearTimeout(state._holdTimers[ht]);
  }
  state._holdTimers = [];
  state.centerGrid.innerHTML = '';

  // Filter banner when viewing a single server's checks
  if (state.filteredServerId && state.filteredServerName) {
    var filterColor = srvColor(state.serverColorMap, state.filteredServerId);
    var banner = document.createElement('div');
    banner.style.cssText = 'grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:' + T.bg + ';border:1px solid ' + filterColor + ';margin-bottom:4px;';
    var label = document.createElement('span');
    label.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + filterColor + ';font-weight:bold;';
    label.textContent = state.filteredServerName;
    var clearBtn = document.createElement('span');
    clearBtn.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.mutedText + ';cursor:pointer;padding:0 4px;';
    clearBtn.textContent = '\u2715 CLEAR';
    clearBtn.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      state.filteredServerId = null;
      state.filteredServerName = null;
      state.selected = {};
      renderCheckGrid(state);
      renderOpsPanel(state);
    });
    banner.appendChild(label);
    banner.appendChild(clearBtn);
    state.centerGrid.appendChild(banner);
  }

  var orders = ordersByTab(state);
  var isOpen = state.activeTab === 'open';
  var isClosed = state.activeTab === 'closed';
  var isVoid = state.activeTab === 'void';

  if (orders.length === 0 && !isOpen) {
    var empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px 0;font-family:' + T.fh + ';font-size:18px;color:' + T.mutedText + ';font-weight:bold;';
    empty.textContent = isClosed ? 'No closed checks' : 'No voided checks';
    state.centerGrid.appendChild(empty);
    return;
  }

  for (var i = 0; i < orders.length; i++) {
    state.centerGrid.appendChild(buildCheckTile(state, orders[i]));
  }

  // + NEW CHECK tile (OPEN tab only)
  if (isOpen) {
    var newTile = document.createElement('div');
    newTile.style.cssText = 'border:2px dashed ' + CHROME + ';display:flex;align-items:center;justify-content:center;min-height:60px;cursor:pointer;user-select:none;';
    newTile.style.clipPath = chamfer(6);
    var plus = document.createElement('div');
    plus.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + CHROME + ';';
    plus.textContent = '+';
    newTile.appendChild(plus);
    newTile.addEventListener('pointerup', function() {
      var emp = state.params.emp || state.params;
      SceneManager.mountWorking('check-overview', {
        pin: emp.pin, employeeId: emp.id, employeeName: emp.name, returnLanding: 'manager-landing',
      });
    });
    state.centerGrid.appendChild(newTile);
  }
}

function buildCheckTile(state, order) {
  var isOpen = state.activeTab === 'open';
  var isClosed = state.activeTab === 'closed';
  var isVoid = state.activeTab === 'void';
  var sColor = srvColor(state.serverColorMap, order.server_id);
  var checkNum = order.check_number || ('C-' + String(order.order_id).slice(0, 3).toUpperCase());

  var tile = document.createElement('div');
  tile.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + sColor + ';padding:6px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:60px;cursor:pointer;user-select:none;box-sizing:border-box;';
  tile.style.clipPath = chamfer(6);
  if (isClosed) tile.style.opacity = '0.7';
  if (isVoid) { tile.style.opacity = '0.5'; tile.style.cursor = 'default'; }

  // Check number
  var numColor = isOpen ? T.mint : (isClosed ? T.electricPink : T.vermillion);
  var num = document.createElement('div');
  num.style.cssText = 'font-family:' + T.fh + ';font-size:22px;font-weight:bold;color:' + numColor + ';';
  num.textContent = checkNum;
  num.dataset.role = 'num';
  tile.appendChild(num);

  // Server name
  var srvName = document.createElement('div');
  srvName.style.cssText = 'font-family:' + T.fh + ';font-size:12px;font-weight:bold;color:' + sColor + ';';
  srvName.textContent = order.server_name || '';
  srvName.dataset.role = 'server';
  tile.appendChild(srvName);

  // Customer name
  if (order.customer_name) {
    var name = document.createElement('div');
    name.style.cssText = 'font-family:' + T.fh + ';font-size:16px;font-weight:bold;color:' + T.mint + ';';
    name.textContent = order.customer_name;
    name.dataset.role = 'name';
    tile.appendChild(name);
  }

  // Item count
  var items = order.items || [];
  var count = 0;
  for (var ii = 0; ii < items.length; ii++) count += (items[ii].quantity || 1);
  var countEl = document.createElement('div');
  countEl.style.cssText = 'font-family:' + T.fb + ';font-size:16px;font-weight:bold;color:' + T.textPrimary + ';';
  countEl.textContent = 'x' + count;
  countEl.dataset.role = 'count';
  tile.appendChild(countEl);

  // Total
  var total = document.createElement('div');
  total.style.cssText = 'font-family:' + T.fb + ';font-size:16px;font-weight:bold;color:' + T.gold + ';';
  total.textContent = fmt(order.total || 0);
  total.dataset.role = 'total';
  tile.appendChild(total);

  // ── Interaction ──
  if (isOpen) {
    if (state.selected[order.order_id]) applyTileSelected(tile, sColor, true);
    // Short tap = toggle selection, long hold = open check directly
    var _holdTimer = null;
    var _didHold = false;
    tile.addEventListener('pointerdown', function() {
      _didHold = false;
      _holdTimer = setTimeout(function() {
        _didHold = true;
        var emp = state.params.emp || state.params;
        SceneManager.mountWorking('check-overview', {
          checkId: order.order_id, tableId: order.table_id,
          pin: emp.pin, employeeId: emp.id, employeeName: emp.name, returnLanding: 'manager-landing',
        });
      }, 400);
      if (state._holdTimers) state._holdTimers.push(_holdTimer);
    });
    tile.addEventListener('pointerup', function() {
      clearTimeout(_holdTimer);
      if (_didHold) return;
      if (state.selected[order.order_id]) {
        delete state.selected[order.order_id];
        applyTileSelected(tile, sColor, false);
      } else {
        state.selected[order.order_id] = order;
        applyTileSelected(tile, sColor, true);
      }
      renderOpsPanel(state);
    });
    tile.addEventListener('pointerleave', function() {
      clearTimeout(_holdTimer);
    });
  } else if (isClosed) {
    tile.addEventListener('pointerup', function() {
      SceneManager.interrupt('sl-reopen-confirm', {
        onConfirm: function() {
          fetch('/api/v1/orders/' + order.order_id + '/reopen', { method: 'POST' })
            .then(function(r) {
              if (r.ok) { showToast('Check reopened', { bg: T.goGreen }); refreshData(state); }
              else { showToast('Reopen failed', { bg: T.red }); }
            }).catch(function() { showToast('Reopen failed', { bg: T.red }); });
        },
        onCancel: function() {},
        params: { checkLabel: checkNum },
      });
    });
  }

  return tile;
}

function applyTileSelected(tile, sColor, selected) {
  if (selected) {
    tile.style.background = T.mint;
    tile.style.borderColor = sColor;
    for (var i = 0; i < tile.children.length; i++) tile.children[i].style.color = T.bgDark;
  } else {
    tile.style.background = T.bgDark;
    tile.style.borderColor = sColor;
    var roleColors = { num: T.mint, server: sColor, name: T.mint, count: T.textPrimary, total: T.gold };
    for (var i = 0; i < tile.children.length; i++) {
      var role = tile.children[i].dataset.role;
      if (roleColors[role]) tile.children[i].style.color = roleColors[role];
    }
  }
}

// ── Operations Panel ────────────────────────────

function renderOpsPanel(state) {
  if (!state.opsPanel) return;
  state.opsPanel.innerHTML = '';

  if (state.activeTab !== 'open') return;
  var ids = Object.keys(state.selected);
  if (ids.length === 0) return;

  state.opsPanel.appendChild(buildCardHeader('CHECK OPERATION'));

  var emp = state.params ? (state.params.emp || state.params) : {};
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:6px 10px 8px;';
  var isSingle = ids.length === 1;
  var btnStyle = { fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34 };

  // Row 1: EDIT (single) or MERGE (multi) | PRINT | RSND
  if (isSingle) {
    var order = state.selected[ids[0]];
    grid.appendChild(buildButton('EDIT', Object.assign({}, btnStyle, { onTap: function() {
      SceneManager.mountWorking('check-overview', { checkId: order.order_id, tableId: order.table_id, pin: emp.pin, employeeId: emp.id, employeeName: emp.name, returnLanding: 'manager-landing' });
    }})));
  } else {
    grid.appendChild(buildButton('MERGE', Object.assign({}, btnStyle, { onTap: function() {
      showToast('Merge — not yet wired', { bg: T.gold });
    }})));
  }

  grid.appendChild(buildButton('PRINT', Object.assign({}, btnStyle, { onTap: function() {
    ids.forEach(function(id) { fetch('/api/v1/print/receipt/' + id, { method: 'POST' }).catch(function(err) { console.warn('[KINDpos] Operation failed:', err); }); });
    showToast('Print sent' + (ids.length > 1 ? ' for ' + ids.length + ' checks' : ''), { bg: T.goGreen });
  }})));

  grid.appendChild(buildButton('RSND', Object.assign({}, btnStyle, { onTap: function() {
    ids.forEach(function(id) { fetch('/api/v1/orders/' + id + '/send', { method: 'POST' }).catch(function(err) { console.warn('[KINDpos] Operation failed:', err); }); });
    showToast('Sent to kitchen' + (ids.length > 1 ? ' (' + ids.length + ' checks)' : ''), { bg: T.goGreen });
  }})));

  // Row 2: PAY | DISC | VOID
  grid.appendChild(buildButton('PAY', Object.assign({}, btnStyle, { onTap: function() {
    if (ids.length > 1) { showToast('Select one check to pay', { bg: T.gold }); return; }
    var payOrder = state.selected[ids[0]];
    var totals = orderTotals(payOrder);
    SceneManager.openTransactional('payment-console', {
      orderId: payOrder.order_id,
      checkId: payOrder.check_number || checkNum(payOrder),
      items: totals.items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      cardTotal: totals.cardTotal,
      cashPrice: totals.cashPrice,
      discount: 0,
      returnScene: 'manager-landing',
    });
  }})));

  grid.appendChild(buildButton('DISC', Object.assign({}, btnStyle, { onTap: function() {
    SceneManager.interrupt('disc-pin', {
      onConfirm: function(pin) {
        if (!pin) { showToast('PIN required', { bg: T.gold }); return; }
        SceneManager.interrupt('disc-select', {
          onConfirm: function(opt) {
            var pct = opt === 'Comp (100%)' ? 1.0 : parseFloat(opt) / 100;
            var pending = ids.length;
            var failed = 0;
            ids.forEach(function(id) {
              var discOrder = state.selected[id];
              var subtotal = 0;
              (discOrder.items || []).forEach(function(it) { subtotal += (it.quantity || 1) * (it.price || 0); });
              var amount = Math.round(subtotal * pct * 100) / 100;
              fetch('/api/v1/orders/' + id + '/discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discount_type: opt, amount: amount, approved_by: pin }),
              }).then(function(r) { if (!r.ok) failed++; if (--pending === 0) finishDisc(); })
                .catch(function() { failed++; if (--pending === 0) finishDisc(); });
            });
            function finishDisc() {
              if (failed > 0) showToast(failed + ' discount(s) failed', { bg: T.red });
              else showToast('Discount applied: ' + opt, { bg: T.goGreen });
              refreshData(state);
            }
          },
          onCancel: function() {},
        });
      },
      onCancel: function() {},
    });
  }})));

  var voidBtn = buildButton('VOID', Object.assign({}, btnStyle, { onTap: function() {
    var voidMsg = isSingle
      ? 'Void ' + checkNum(state.selected[ids[0]]) + '? This is destructive.'
      : 'Void ' + ids.length + ' checks? This is destructive.';
    SceneManager.interrupt('sl-void-gate', {
      onConfirm: function() {
        if (isSingle) {
          // Manager can void directly without PIN gate
          var ordId = ids[0];
          fetch('/api/v1/orders/' + ordId + '/void', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Voided by manager', approved_by: emp.id || 'manager' }),
          }).then(function(r) {
            if (r.ok) { showToast('Check voided', { bg: T.goGreen }); state.selected = {}; refreshData(state); }
            else { showToast('Void failed', { bg: T.red }); }
          }).catch(function() { showToast('Void failed', { bg: T.red }); });
        } else {
          Promise.all(ids.map(function(id) {
            return fetch('/api/v1/orders/' + id + '/void', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'Batch voided by manager', approved_by: emp.id || 'manager' }),
            }).then(function(r) { return { id: id, ok: r.ok }; })
              .catch(function() { return { id: id, ok: false }; });
          })).then(function(results) {
            var ok = results.filter(function(r) { return r.ok; }).length;
            var fail = results.length - ok;
            if (fail === 0) { showToast(ok + ' checks voided', { bg: T.goGreen }); }
            else { showToast(ok + ' voided, ' + fail + ' failed', { bg: fail === results.length ? T.red : T.gold }); }
            state.selected = {};
            refreshData(state);
          });
        }
      },
      onCancel: function() {},
      params: { message: voidMsg },
    });
  }}));
  voidBtn.style.border = '2px solid ' + T.vermillion;
  grid.appendChild(voidBtn);

  // Row 3: NAME | TRANSFER
  if (isSingle) {
    var nameOrder = state.selected[ids[0]];
    grid.appendChild(buildButton('NAME', Object.assign({}, btnStyle, { onTap: function() {
      SceneManager.interrupt('ml-name-input', {
        onConfirm: function(name) {
          fetch('/api/v1/orders/' + nameOrder.order_id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_name: name }),
          }).then(function(r) {
            if (r.ok) {
              showToast(name ? 'Named: ' + name : 'Name cleared', { bg: T.goGreen });
              state.selected = {};
              refreshData(state);
            } else { showToast('Name update failed', { bg: T.red }); }
          }).catch(function() { showToast('Name update failed', { bg: T.red }); });
        },
        onCancel: function() {},
        checkLabel: checkNum(nameOrder),
        currentName: nameOrder.customer_name || '',
      });
    }})));
  }

  grid.appendChild(buildButton('TRANSFER', Object.assign({}, btnStyle, { onTap: function() {
    showToast('Transfer — not yet wired', { bg: T.gold });
  }})));

  state.opsPanel.appendChild(grid);
}

// ═══════════════════════════════════════════════════
//  RIGHT COLUMN — Server Checkouts + Close Day
// ═══════════════════════════════════════════════════

function buildRightColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:8px;overflow-y:auto;overflow-x:hidden;min-width:0;';

  col.appendChild(buildServerCheckoutsCard(state));
  col.appendChild(buildCloseDayCard(state));

  return col;
}

function buildServerCheckoutsCard(state) {
  var sd = state.staffData || {};
  var servers = sd.servers || [];

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.overflow = 'hidden';
  card.style.flex = '1';

  card.appendChild(buildCardHeader('SERVER CHECKOUTS'));

  // ── Scrollable server list ──
  var list = document.createElement('div');
  list.style.cssText = 'flex:1;min-height:0;overflow-y:auto;-ms-overflow-style:none;scrollbar-width:none;padding:6px 0;display:flex;flex-direction:column;justify-content:center;';

  // Sort: active/pending first, checked_out at bottom
  var sorted = servers.slice().sort(function(a, b) {
    if (a.checked_out && !b.checked_out) return 1;
    if (!a.checked_out && b.checked_out) return -1;
    return 0;
  });

  for (var i = 0; i < sorted.length; i++) {
    (function(srv) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;padding:8px 12px;cursor:pointer;border-bottom:1px solid ' + T.border + ';flex-shrink:0;';

      var name = document.createElement('span');
      name.style.cssText = 'font-family:' + T.fh + ';font-size:22px;color:' + T.textPrimary + ';font-weight:bold;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

      if (srv.checked_out) {
        name.textContent = srv.name;
        name.style.color = T.green;
        var badge = document.createElement('span');
        badge.style.cssText = 'font-family:' + T.fh + ';font-size:18px;color:' + T.green + ';font-weight:bold;';
        badge.textContent = '\u2713 COMPLETE';
        row.appendChild(name);
        row.appendChild(badge);
      } else {
        name.textContent = srv.name;
        row.appendChild(name);

        var closedBadge = document.createElement('span');
        closedBadge.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.textPrimary + ';font-weight:bold;margin-right:12px;';
        closedBadge.textContent = srv.closed_checks + ' closed';
        row.appendChild(closedBadge);

        var unadjBadge = document.createElement('span');
        var unadjColor = srv.unadj_tips === 0 ? T.green : T.vermillion;
        unadjBadge.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + unadjColor + ';font-weight:bold;';
        unadjBadge.textContent = srv.unadj_tips + ' unadj';
        row.appendChild(unadjBadge);
      }

      row.addEventListener('pointerup', function(e) {
        e.stopPropagation();
        if (!srv.checked_out) {
          showDrillDown(state, 'server-detail', srv);
        }
      });

      list.appendChild(row);
    })(sorted[i]);
  }

  card.appendChild(list);
  return pair.wrap;
}

function buildCloseDayCard(state) {
  var cd = state.closeDayData || {};

  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.flex = '1';
  pair.wrap.style.display = 'flex';
  pair.wrap.style.overflow = 'hidden';
  pair.wrap.style.minHeight = '0';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.flex = '1';

  card.appendChild(buildCardHeader('CLOSE DAY'));

  var body = document.createElement('div');
  body.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;padding:8px 0;';
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

  card.style.cursor = 'pointer';
  card.addEventListener('pointerup', function() {
    var emp = state.params.emp || state.params;
    SceneManager.openTransactional('close-day', {
      pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
    });
  });

  return pair.wrap;
}
