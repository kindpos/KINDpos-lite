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
//  CENTER COLUMN — Tabs + Check Grid + Ops Panel
// ═══════════════════════════════════════════════════

function buildCenterColumn(emp) {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;border:1px solid ' + T.mint + ';background:' + T.bgDark + ';';
  col.style.clipPath = chamfer(6);

  // ── Tab Bar ──
  var tabKeys = ['open', 'closed', 'void'];
  var tabLabels = ['OPEN', 'CLOSED', 'VOID'];
  var tabEls = [];

  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;flex-shrink:0;border-bottom:1px solid ' + T.border + ';';

  for (var t = 0; t < tabKeys.length; t++) {
    (function(key, label) {
      var tab = document.createElement('div');
      tab.style.cssText = 'flex:1;text-align:center;padding:6px 0;cursor:pointer;font-family:' + T.fh + ';font-size:16px;letter-spacing:2px;user-select:none;';
      applyTabStyle(tab, key === _activeTab);
      tab.textContent = label;
      tab.addEventListener('pointerup', function() {
        if (key === _activeTab) return;
        _activeTab = key;
        _selected = {};
        for (var i = 0; i < tabEls.length; i++) applyTabStyle(tabEls[i], tabKeys[i] === _activeTab);
        renderGrid(emp);
        renderOpsPanel(emp);
      });
      tabEls.push(tab);
      tabBar.appendChild(tab);
    })(tabKeys[t], tabLabels[t]);
  }
  col.appendChild(tabBar);

  // ── Check Grid ──
  _centerGrid = document.createElement('div');
  _centerGrid.style.cssText = 'flex:1;overflow-y:auto;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;';
  col.appendChild(_centerGrid);

  // ── CHECK OPERATION Panel ──
  _opsPanel = document.createElement('div');
  _opsPanel.style.cssText = 'flex-shrink:0;border-top:1px solid ' + T.border + ';background:' + T.bg + ';';
  col.appendChild(_opsPanel);

  renderGrid(emp);
  renderOpsPanel(emp);
  return col;
}

function applyTabStyle(el, active) {
  if (active) {
    el.style.background = T.mint;
    el.style.color = T.bgDark;
  } else {
    el.style.background = T.bgDark;
    el.style.color = T.mutedText;
  }
}

// ── Grid Rendering ────────────────────────────────

function renderGrid(emp) {
  _centerGrid.innerHTML = '';
  var orders = ordersByTab(_activeTab);

  if (orders.length === 0 && _activeTab !== 'open') {
    var empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px 0;font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';';
    empty.textContent = _activeTab === 'closed' ? 'No closed checks' : 'No voided checks';
    _centerGrid.appendChild(empty);
    return;
  }

  for (var i = 0; i < orders.length; i++) {
    _centerGrid.appendChild(buildCheckTile(orders[i], emp));
  }

  // + NEW CHECK tile (OPEN tab only)
  if (_activeTab === 'open') {
    var newTile = document.createElement('div');
    newTile.style.cssText = 'border:2px dashed ' + T.mint + ';display:flex;align-items:center;justify-content:center;min-height:90px;cursor:pointer;user-select:none;';
    newTile.style.clipPath = chamfer(6);
    var plus = document.createElement('div');
    plus.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';';
    plus.textContent = '+';
    newTile.appendChild(plus);
    newTile.addEventListener('pointerup', function() {
      SceneManager.mountWorking('order-entry', {
        mode: 'service', pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
      });
    });
    _centerGrid.appendChild(newTile);
  }
}

// ── Check Tile ────────────────────────────────────

function buildCheckTile(order, emp) {
  var isOpen = _activeTab === 'open';
  var isClosed = _activeTab === 'closed';
  var isVoid = _activeTab === 'void';

  var tile = document.createElement('div');
  tile.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + T.mint + ';padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-height:86px;cursor:pointer;user-select:none;box-sizing:border-box;';
  tile.style.clipPath = chamfer(6);
  if (isClosed) tile.style.opacity = '0.7';
  if (isVoid) { tile.style.opacity = '0.5'; tile.style.cursor = 'default'; }

  // C-00# line
  var numColor = isOpen ? T.mint : (isClosed ? T.electricPink : T.vermillion);
  var num = document.createElement('div');
  num.style.cssText = 'font-family:' + T.fh + ';font-size:22px;color:' + numColor + ';';
  num.textContent = checkNum(order);
  num.dataset.role = 'num';
  tile.appendChild(num);

  // Customer name (hide if absent)
  if (order.customer_name) {
    var name = document.createElement('div');
    name.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';';
    name.textContent = order.customer_name;
    name.dataset.role = 'name';
    tile.appendChild(name);
  }

  // Item count
  var count = document.createElement('div');
  count.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.textPrimary + ';';
  count.textContent = 'x' + itemCount(order);
  count.dataset.role = 'count';
  tile.appendChild(count);

  // Total
  var total = document.createElement('div');
  total.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.gold + ';font-weight:bold;';
  total.textContent = fmt(order.total || order.subtotal || 0);
  total.dataset.role = 'total';
  tile.appendChild(total);

  // ── Interaction by tab ──
  if (isOpen) {
    if (_selected[order.order_id]) applyTileSelected(tile, true);
    tile.addEventListener('pointerup', function() {
      var id = order.order_id;
      if (_selected[id]) {
        delete _selected[id];
        applyTileSelected(tile, false);
      } else {
        _selected[id] = order;
        applyTileSelected(tile, true);
      }
      renderOpsPanel(emp);
    });
  } else if (isClosed) {
    tile.addEventListener('pointerup', function() {
      SceneManager.interrupt('sl-reopen-confirm', {
        onConfirm: function() {
          fetch('/api/v1/orders/' + order.order_id + '/reopen', { method: 'POST' })
            .then(function(r) {
              if (r.ok) { showToast('Check reopened', { bg: T.goGreen }); refreshData(emp); }
              else { showToast('Reopen failed', { bg: T.red }); }
            }).catch(function() { showToast('Reopen failed', { bg: T.red }); });
        },
        onCancel: function() {},
        params: { checkLabel: checkNum(order) },
      });
    });
  }
  // Void tab: read-only — no listener
  return tile;
}

function applyTileSelected(tile, selected) {
  if (selected) {
    tile.style.background = T.mint;
    for (var i = 0; i < tile.children.length; i++) tile.children[i].style.color = T.bgDark;
  } else {
    tile.style.background = T.bgDark;
    for (var i = 0; i < tile.children.length; i++) {
      var child = tile.children[i];
      var role = child.dataset.role;
      if (role === 'num') child.style.color = T.mint;
      else if (role === 'name') child.style.color = T.mutedText;
      else if (role === 'count') child.style.color = T.textPrimary;
      else if (role === 'total') child.style.color = T.gold;
    }
  }
}

// ── Operations Panel ──────────────────────────────

function renderOpsPanel(emp) {
  _opsPanel.innerHTML = '';
  var header = document.createElement('div');
  header.style.cssText = 'font-family:' + T.fh + ';font-size:14px;color:' + T.mint + ';letter-spacing:2px;padding:6px 10px;';
  header.textContent = '// CHECK OPERATION //';
  _opsPanel.appendChild(header);

  if (_activeTab !== 'open') return;
  var ids = Object.keys(_selected);
  if (ids.length === 0) return;

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px 10px 8px;';
  var isSingle = ids.length === 1;

  if (isSingle) {
    var order = _selected[ids[0]];
    grid.appendChild(buildButton('EDIT', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.mountWorking('order-entry', {
          mode: 'service', pin: emp.pin, employeeId: emp.id, employeeName: emp.name,
          recallOrderId: order.order_id,
        });
      },
    }));
    grid.appendChild(buildButton('PRINT', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        fetch('/api/v1/print/receipt/' + order.order_id, { method: 'POST' })
          .then(function() { showToast('Print sent', { bg: T.goGreen }); })
          .catch(function() { showToast('Print failed', { bg: T.red }); });
      },
    }));
    grid.appendChild(buildButton('TRANSFER', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-transfer-choice', {
          onConfirm: function(choice) {
            if (choice === 'internal') {
              SceneManager.openTransactional('sl-internal-transfer', { checks: [order], emp: emp });
            } else {
              showToast('External transfer — not yet wired', { bg: T.gold });
            }
          },
          onCancel: function() {},
        });
      },
    }));
    var voidBtn = buildButton('VOID', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-void-gate', {
          onConfirm: function() {
            SceneManager.interrupt('void-pin', {
              onConfirm: function(mgr) {
                fetch('/api/v1/orders/' + order.order_id + '/void', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason: 'Voided from server landing', approved_by: mgr.id || 'manager' }),
                }).then(function(r) {
                  if (r.ok) { showToast('Check voided', { bg: T.goGreen }); _selected = {}; refreshData(emp); }
                  else { showToast('Void failed', { bg: T.red }); }
                }).catch(function() { showToast('Void failed', { bg: T.red }); });
              },
              onCancel: function() {},
            });
          },
          onCancel: function() {},
          params: { message: 'Void ' + checkNum(order) + '? This is destructive.' },
        });
      },
    });
    voidBtn.style.border = '2px solid ' + T.vermillion;
    grid.appendChild(voidBtn);
  } else {
    // Multi-select buttons
    grid.appendChild(buildButton('MERGE', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-merge-choice', {
          onConfirm: function(mode) {
            showToast('Merge (' + mode + ') — not yet wired', { bg: T.gold });
          },
          onCancel: function() {},
          params: { count: ids.length },
        });
      },
    }));
    grid.appendChild(buildButton('PRINT ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        ids.forEach(function(id) { fetch('/api/v1/print/receipt/' + id, { method: 'POST' }).catch(function() {}); });
        showToast('Print sent for ' + ids.length + ' checks', { bg: T.goGreen });
      },
    }));
    grid.appendChild(buildButton('TRANSFER ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        var selectedOrders = ids.map(function(id) { return _selected[id]; });
        SceneManager.interrupt('sl-transfer-choice', {
          onConfirm: function(choice) {
            if (choice === 'internal') {
              SceneManager.openTransactional('sl-internal-transfer', { checks: selectedOrders, emp: emp });
            } else {
              showToast('External transfer — not yet wired', { bg: T.gold });
            }
          },
          onCancel: function() {},
        });
      },
    }));
    var voidAllBtn = buildButton('VOID ALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px', fontFamily: T.fh, height: 34,
      onTap: function() {
        SceneManager.interrupt('sl-void-gate', {
          onConfirm: function() {
            SceneManager.interrupt('void-pin', {
              onConfirm: function(mgr) {
                Promise.all(ids.map(function(id) {
                  return fetch('/api/v1/orders/' + id + '/void', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: 'Batch voided', approved_by: mgr.id || 'manager' }),
                  });
                })).then(function() {
                  showToast(ids.length + ' checks voided', { bg: T.goGreen }); _selected = {}; refreshData(emp);
                }).catch(function() { showToast('Void failed', { bg: T.red }); });
              },
              onCancel: function() {},
            });
          },
          onCancel: function() {},
          params: { message: 'Void ' + ids.length + ' checks? This is destructive.' },
        });
      },
    });
    voidAllBtn.style.border = '2px solid ' + T.vermillion;
    grid.appendChild(voidAllBtn);
  }
  _opsPanel.appendChild(grid);
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
