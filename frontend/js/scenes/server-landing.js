// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Server Landing Scene
//  3-column shift command center: Sales | Checks | Shift
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── Module State ──────────────────────────────────
var _el = null;
var _params = null;
var _activeTab = 'open';
var _selected = {};
var _allOrders = [];
var _salesData = null;
var _clockedInAt = null;
var _expandedCard = null;
var _expandOrigin = null;
var _tipoutRate = 0;

// DOM refs for partial re-renders
var _centerGrid = null;
var _opsPanel = null;
var _drillEl = null;

// ── Helpers ───────────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

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
  return _allOrders.filter(function(o) {
    if (tab === 'open') return o.status === 'open';
    if (tab === 'closed') return o.status === 'closed' || o.status === 'paid';
    if (tab === 'void') return o.status === 'voided';
    return false;
  });
}

function computeTopSeller() {
  var counts = {};
  _allOrders.forEach(function(o) {
    (o.items || []).forEach(function(item) {
      var n = item.name || 'Unknown';
      counts[n] = (counts[n] || 0) + (item.quantity || 1);
    });
  });
  var best = '--', bestN = 0;
  Object.keys(counts).forEach(function(k) {
    if (counts[k] > bestN) { best = k; bestN = counts[k]; }
  });
  return best;
}

function fmtClockIn() {
  if (!_clockedInAt) return '--';
  var d = new Date(_clockedInAt);
  var h = d.getHours(), ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return h + ':' + String(d.getMinutes()).padStart(2, '0') + ampm;
}

function fmtHours() {
  if (!_clockedInAt) return '--';
  var ms = Date.now() - new Date(_clockedInAt).getTime();
  return Math.floor(ms / 3600000) + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm';
}

// ── Card UI Builders ──────────────────────────────

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

function expandBtn(cardKey, cardEl) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:flex-end;padding:4px 8px 2px;';
  row.appendChild(buildButton('>>>', {
    fill: T.darkBtn, color: T.mint, fontSize: '14px', fontFamily: T.fb,
    width: 48, height: 24,
    onTap: function() {
      _expandOrigin = cardEl.getBoundingClientRect();
      _expandedCard = cardKey;
      showDrillDown();
    },
  }));
  return row;
}

// ── Data Fetching ─────────────────────────────────

function fetchAllData(emp) {
  var sid = encodeURIComponent(emp.id || '');
  return Promise.all([
    fetch('/api/v1/orders/day-summary?server_id=' + sid)
      .then(function(r) { return r.json(); }).catch(function() { return {}; }),
    fetch('/api/v1/orders?server_id=' + sid)
      .then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/v1/servers/clocked-in')
      .then(function(r) { return r.json(); }).catch(function() { return { staff: [] }; }),
    fetch('/api/v1/config/tipout')
      .then(function(r) { return r.json(); }).catch(function() { return []; }),
  ]).then(function(results) {
    _salesData = results[0];
    _allOrders = Array.isArray(results[1]) ? results[1] : [];
    var staff = (results[2].staff || []);
    for (var i = 0; i < staff.length; i++) {
      if (staff[i].employee_id === emp.id) {
        _clockedInAt = staff[i].clocked_in_at;
        break;
      }
    }
    var rules = Array.isArray(results[3]) ? results[3] : [];
    _tipoutRate = rules.reduce(function(sum, r) { return sum + (r.percentage || 0); }, 0) / 100;
  });
}

function refreshData(emp) {
  fetchAllData(emp).then(function() { if (_el) renderScene(); });
}

// ═══════════════════════════════════════════════════
//  LEFT COLUMN
// ═══════════════════════════════════════════════════

function buildLeftColumn(emp) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';
  var d = _salesData || {};
  var guestCount = d.guest_count || 0;
  var tableCount = d.total_checks || 0;
  var guestAvg = guestCount > 0 ? (d.net_sales || 0) / guestCount : 0;

  // ── SALES OVERVIEW card ──
  var salesCard = document.createElement('div');
  salesCard.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + T.mint + ';display:flex;flex-direction:column;flex:0 0 auto;';
  salesCard.style.clipPath = chamfer(6);
  salesCard.appendChild(buildCardHeader('SALES OVERVIEW'));
  var salesBody = document.createElement('div');
  salesBody.style.cssText = 'padding:6px 0;';
  salesBody.appendChild(statRow('Net Sales:', fmt(d.net_sales || 0), T.gold));
  salesBody.appendChild(statRow('Check Avg:', fmt(d.avg_check || 0), T.gold));
  salesCard.appendChild(salesBody);
  salesCard.appendChild(expandBtn('sales', salesCard));
  col.appendChild(salesCard);

  // ── TABLE STATISTICS card ──
  var tablesCard = document.createElement('div');
  tablesCard.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + T.mint + ';display:flex;flex-direction:column;flex:0 0 auto;';
  tablesCard.style.clipPath = chamfer(6);
  tablesCard.appendChild(buildCardHeader('TABLE STATISTICS'));
  var tablesBody = document.createElement('div');
  tablesBody.style.cssText = 'padding:6px 0;';
  tablesBody.appendChild(statRow('Guest Count:', String(guestCount), T.lime));
  tablesBody.appendChild(statRow('Table Count:', String(tableCount), T.lime));
  tablesBody.appendChild(statRow('Guest Avg:', fmt(guestAvg), T.gold));
  tablesBody.appendChild(statRow('Top Seller:', computeTopSeller(), T.lime));
  tablesCard.appendChild(tablesBody);
  tablesCard.appendChild(expandBtn('tables', tablesCard));
  col.appendChild(tablesCard);

  // ── Action Buttons ──
  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:auto;';
  actions.appendChild(buildButton('SALES DETAIL', {
    fill: T.darkBtn, color: T.mint, fontSize: '18px', fontFamily: T.fh, height: 36,
    onTap: function() {
      SceneManager.openTransactional('reporting', {
        pin: emp.pin, employeeId: emp.id, employeeName: emp.name, role: 'server',
      });
    },
  }));
  actions.appendChild(buildButton('CLOSE DAY', {
    fill: T.darkBtn, color: T.mint, fontSize: '18px', fontFamily: T.fh, height: 36,
    onTap: function() {
      SceneManager.interrupt('sl-manager-gate', {
        onConfirm: function() {
          SceneManager.openTransactional('close-day', {
            pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
          });
        },
        onCancel: function() {},
        params: { message: 'Close Day requires manager approval.' },
      });
    },
  }));
  actions.appendChild(buildButton('TIP ADJUSTMENT', {
    fill: T.darkBtn, color: T.mint, fontSize: '18px', fontFamily: T.fh, height: 36,
    onTap: function() {
      SceneManager.openTransactional('tip-adjustment', {
        pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
      });
    },
  }));
  col.appendChild(actions);
  return col;
}

// ═══════════════════════════════════════════════════
//  CENTER COLUMN — placeholder for Chunk 2
// ═══════════════════════════════════════════════════

function buildCenterColumn(emp) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;border:1px solid ' + T.mint + ';background:' + T.bgDark + ';';
  col.style.clipPath = chamfer(6);

  var placeholder = document.createElement('div');
  placeholder.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';';
  placeholder.textContent = 'Loading checks...';
  col.appendChild(placeholder);
  return col;
}

// ═══════════════════════════════════════════════════
//  RIGHT COLUMN
// ═══════════════════════════════════════════════════

function buildRightColumn(emp) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;';
  var d = _salesData || {};

  var card = document.createElement('div');
  card.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + T.mint + ';display:flex;flex-direction:column;flex:1;';
  card.style.clipPath = chamfer(6);
  card.appendChild(buildCardHeader('SHIFT OVERVIEW'));

  var body = document.createElement('div');
  body.style.cssText = 'padding:8px 0;display:flex;flex-direction:column;gap:2px;flex:1;';
  body.appendChild(statRow('Time In:', fmtClockIn(), T.gold));
  body.appendChild(statRow('Hours:', fmtHours(), T.lime));

  // Spacer
  var sp1 = document.createElement('div'); sp1.style.height = '10px'; body.appendChild(sp1);

  body.appendChild(statRow('Total Tips:', fmt(d.total_tips || 0), T.gold));

  // TIP ADJUSTMENT button
  var tipRow = document.createElement('div');
  tipRow.style.cssText = 'padding:6px 8px;';
  tipRow.appendChild(buildButton('TIP ADJUSTMENT', {
    fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 32,
    onTap: function() {
      SceneManager.openTransactional('tip-adjustment', {
        pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
      });
    },
  }));
  body.appendChild(tipRow);

  // Spacer
  var sp2 = document.createElement('div'); sp2.style.height = '10px'; body.appendChild(sp2);

  var tipOut = (d.total_tips || 0) * _tipoutRate;
  body.appendChild(statRow('Tip Out:', fmt(tipOut), T.gold));

  // CHECKOUT — red outline gate
  var coRow = document.createElement('div');
  coRow.style.cssText = 'padding:6px 8px;margin-top:auto;';
  var coBtn = buildButton('CHECKOUT', {
    fill: T.darkBtn, color: T.mint, fontSize: '18px', fontFamily: T.fh, height: 36,
    onTap: function() {
      var openCount = d.open_orders || 0;
      var unadj = d.unadjusted_tips || 0;
      if (openCount > 0 || unadj > 0) {
        var reasons = [];
        if (openCount > 0) reasons.push(openCount + ' open check' + (openCount > 1 ? 's' : ''));
        if (unadj > 0) reasons.push(unadj + ' unadjusted tip' + (unadj > 1 ? 's' : ''));
        SceneManager.interrupt('sl-checkout-gate', {
          onConfirm: function() {},
          onCancel: function() {},
          params: { reasons: reasons },
        });
      } else {
        SceneManager.mountWorking('server-checkout', {
          pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
        });
      }
    },
  });
  coBtn.style.border = '2px solid ' + T.vermillion;
  coRow.appendChild(coBtn);
  body.appendChild(coRow);

  card.appendChild(body);
  col.appendChild(card);
  return col;
}

// ═══════════════════════════════════════════════════
//  DRILL-DOWN OVERLAY — placeholder for Chunk 3
// ═══════════════════════════════════════════════════

function showDrillDown() {}
function hideDrillDown() {}

// ═══════════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════════

function renderScene() {
  if (!_el || !_params) return;
  var emp = _params.emp || _params;

  _el.innerHTML = '';
  _el.style.cssText = 'width:100%;height:100%;display:grid;grid-template-columns:22% 1fr 28%;gap:' + T.colGap + 'px;padding:' + T.scenePad + 'px;box-sizing:border-box;position:relative;';

  _el.appendChild(buildLeftColumn(emp));
  _el.appendChild(buildCenterColumn(emp));
  _el.appendChild(buildRightColumn(emp));
}

// ═══════════════════════════════════════════════════
//  SCENE REGISTRATION
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'server-landing',

  mount: function(container, params) {
    _el = container;
    _params = params;
    _activeTab = 'open';
    _selected = {};
    _allOrders = [];
    _salesData = null;
    _clockedInAt = null;
    _expandedCard = null;
    _drillEl = null;
    _tipoutRate = 0;

    var emp = params.emp || params;
    setSceneName(emp.name || 'Server');
    setHeaderBack({
      x: true,
      onClose: function() {
        SceneManager.closeAllTransactional();
        SceneManager.unmountWorking('server-landing');
        SceneManager.openGate('login');
      },
    });

    // Loading state
    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
    var loading = document.createElement('div');
    loading.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';';
    loading.textContent = 'Loading...';
    container.appendChild(loading);

    fetchAllData(emp).then(function() { renderScene(); });
  },

  unmount: function() {
    if (_drillEl) { _drillEl.remove(); _drillEl = null; }
    _el = null;
    _params = null;
    _selected = {};
    _allOrders = [];
    _salesData = null;
    _clockedInAt = null;
    _expandedCard = null;
    _tipoutRate = 0;
  },
});
