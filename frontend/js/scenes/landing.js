// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Landing Scene
//  Post-login dashboard: Card | Open Tabs | Card
//  Servers:  SHIFT  | Open Tabs | HOURS
//  Managers: SALES  | Open Tabs | LABOR
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildButton } from '../components.js';
import { registerScene, push, replace, clearSceneCache } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildChartGrid } from '../chart-helpers.js';
import {
  fetchReportData, buildLeftCard, buildRightCard, buildCardWrap,
  buildServerShiftPanels, buildServerHoursPanels,
  buildManagerSalesPanels, buildManagerLaborPanels,
} from './reporting.js';

var SCENE_PAD = 10;

// ── Expanded card state ────────────────────────────
var expandedCard = null;   // 'left' | 'right' | null
var expandedPanel = null;  // panel index or null
var landingEl = null;
var landingParams = null;
var landingSales = null;
var landingLabor = null;
var landingRole = 'server'; // 'server' | 'manager'

function renderLanding() {
  if (!landingEl || !landingParams) return;
  if (expandedCard) {
    buildExpandedLanding(landingEl, landingParams, landingSales, landingLabor);
  } else {
    buildCardLanding(landingEl, landingParams, landingSales, landingLabor);
  }
}

// ═══════════════════════════════════════════════════
//  EXPANDED CARD VIEW (full-page chart grid)
// ═══════════════════════════════════════════════════

function getCardName(side) {
  if (landingRole === 'manager') return side === 'left' ? 'Sales' : 'Labor';
  return side === 'left' ? 'Shift' : 'Hours';
}

function getRailText(side) {
  if (landingRole === 'manager') return side === 'left' ? 'SALES' : 'LABOR';
  return side === 'left' ? 'SHIFT' : 'HOURS';
}

function buildExpandedLanding(el, params, sales, labor) {
  el.innerHTML = '';
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:20px;';

  var cardName = getCardName(expandedCard);
  setSceneName(cardName);
  setHeaderBack({
    back: true, x: true,
    onBack: function() {
      if (expandedPanel !== null) {
        expandedPanel = null;
      } else {
        expandedCard = null;
      }
      renderLanding();
    },
    onClose: function() {
      expandedCard = null;
      expandedPanel = null;
      clearSceneCache('order-entry');
      replace('login');
    },
  });

  var isRight = expandedCard === 'right';

  var frame = document.createElement('div');
  frame.style.cssText = 'flex:1;display:flex;flex-direction:column;border:8px solid ' + T.mint + ';box-sizing:border-box;min-height:0;background:' + T.bgDark + ';';

  if (isRight) {
    // Right card uses vertical rail header
    var headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;flex:1;min-height:0;';

    var railColor = landingRole === 'manager' ? '#33ff99' : T.cyan;
    var rail = document.createElement('div');
    rail.style.cssText = 'writing-mode:vertical-rl;text-orientation:mixed;font-family:' + T.fh + ';font-size:40px;font-weight:bold;color:' + railColor + ';display:flex;align-items:center;justify-content:center;padding:0 12px;flex-shrink:0;';
    rail.textContent = getRailText('right');
    headerRow.appendChild(rail);

    var gridWrap = document.createElement('div');
    gridWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;padding:12px;';
    gridWrap.appendChild(buildLandingPanelGrid(params, sales, labor));
    headerRow.appendChild(gridWrap);

    frame.appendChild(headerRow);
  } else {
    // Left card uses title bar header
    var titleBar = document.createElement('div');
    titleBar.style.cssText = 'font-family:' + T.fh + ';font-size:40px;font-weight:bold;font-style:italic;color:' + T.gold + ';padding:12px 16px 0;flex-shrink:0;';
    titleBar.textContent = getRailText('left');
    frame.appendChild(titleBar);

    var gridWrap = document.createElement('div');
    gridWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;padding:12px;';
    gridWrap.appendChild(buildLandingPanelGrid(params, sales, labor));
    frame.appendChild(gridWrap);
  }

  el.appendChild(frame);
}

function buildLandingPanelGrid(params, sales, labor) {
  var builderFn;

  if (landingRole === 'manager' && expandedCard === 'left') {
    builderFn = function(full) { return buildManagerSalesPanels(sales, full); };
  } else if (landingRole === 'manager' && expandedCard === 'right') {
    builderFn = function(full) { return buildManagerLaborPanels(labor, full); };
  } else if (expandedCard === 'left') {
    builderFn = function(full) { return buildServerShiftPanels(sales, full); };
  } else {
    builderFn = function(full) { return buildServerHoursPanels(sales, labor, full); };
  }

  var chartGrid = buildChartGrid(builderFn, function(state) {
    expandedPanel = state.expandedIdx;
    renderLanding();
  });

  chartGrid.state.expandedIdx = expandedPanel;
  return chartGrid.render();
}

// ═══════════════════════════════════════════════════
//  CARD LANDING — Left Card | Open Tabs | Right Card
//  (shared layout for both server and manager)
// ═══════════════════════════════════════════════════

function buildCardLanding(el, params, sales, labor) {
  var emp = params.emp || {};
  var empRoles = emp.roles || [emp.role || 'server'];
  var isManager = landingRole === 'manager';

  el.innerHTML = '';
  el.style.cssText = 'width:100%;height:100%;display:grid;grid-template-columns:1fr 2fr 1fr;grid-template-rows:1fr auto;gap:14px;padding:' + SCENE_PAD + 'px;box-sizing:border-box;';

  setSceneName(emp.name || 'Dashboard');
  setHeaderBack({
    x: true,
    onClose: function() {
      expandedCard = null;
      expandedPanel = null;
      clearSceneCache('order-entry');
      replace('login');
    },
  });

  var baseParams = { pin: emp.pin, employeeId: emp.id, employeeName: emp.name, role: landingRole, roles: empRoles, compact: true };

  // ══════════════════════════════════════════════
  //  LEFT — SHIFT (server) or SALES (manager) Card
  // ══════════════════════════════════════════════
  var leftCol = document.createElement('div');
  leftCol.style.cssText = 'display:flex;align-items:center;justify-content:center;overflow:hidden;grid-row:1/-1;';

  if (sales !== undefined) {
    var leftCard = buildLeftCard(baseParams, sales, labor);
    var leftWrap = buildCardWrap(leftCard);
    leftWrap.style.maxWidth = '100%';
    leftWrap.style.maxHeight = '95%';
    leftWrap.addEventListener('pointerup', function() {
      expandedCard = 'left';
      renderLanding();
    });
    leftCol.appendChild(leftWrap);
  } else {
    var loadLeft = document.createElement('div');
    loadLeft.style.cssText = 'font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:28px;text-align:center;';
    loadLeft.textContent = 'Loading...';
    leftCol.appendChild(loadLeft);
  }

  el.appendChild(leftCol);

  // ══════════════════════════════════════════════
  //  CENTER — Open Tabs (bordered card)
  // ══════════════════════════════════════════════
  var center = document.createElement('div');
  center.style.cssText = 'grid-column:2;display:flex;flex-direction:column;overflow:hidden;border:3px solid ' + T.mint + ';background:' + T.bgDark + ';box-sizing:border-box;';

  var tabHeader = document.createElement('div');
  tabHeader.style.cssText = 'font-family:' + T.fb + ';font-size:28px;color:' + T.cyan + ';letter-spacing:2px;padding:8px 4px;flex-shrink:0;text-align:center;';
  tabHeader.textContent = '// OPEN TABS //';
  center.appendChild(tabHeader);

  var tabGrid = document.createElement('div');
  tabGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:4px 8px;overflow-y:auto;flex:1;align-content:start;';

  var loadingEl = document.createElement('div');
  loadingEl.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:28px;text-align:center;padding:40px 0;';
  loadingEl.textContent = 'Loading...';
  tabGrid.appendChild(loadingEl);

  center.appendChild(tabGrid);

  el.appendChild(center);

  // Manager CONFIGURATION button below center card
  if (isManager) {
    var configRow = document.createElement('div');
    configRow.style.cssText = 'grid-column:2;display:flex;justify-content:center;padding:6px 4px;';

    var configBtn = buildButton('CONFIGURATION', {
      fill: T.gold, color: T.bg, fontSize: '20px', fontFamily: T.fh,
      width: 200, height: 42,
      onTap: function() { push('settings', { pin: emp.pin }); },
    });
    configRow.appendChild(configBtn);
    el.appendChild(configRow);
  }

  // ══════════════════════════════════════════════
  //  RIGHT — HOURS (server) or LABOR (manager) Card
  // ══════════════════════════════════════════════
  var rightCol = document.createElement('div');
  rightCol.style.cssText = 'grid-column:3;grid-row:1/-1;display:flex;align-items:center;justify-content:center;overflow:hidden;';

  if (sales !== undefined) {
    var rightCard = buildRightCard(baseParams, sales, labor);
    var rightWrap = buildCardWrap(rightCard);
    rightWrap.style.maxWidth = '100%';
    rightWrap.style.maxHeight = '95%';
    rightWrap.addEventListener('pointerup', function() {
      expandedCard = 'right';
      renderLanding();
    });
    rightCol.appendChild(rightWrap);
  } else {
    var loadRight = document.createElement('div');
    loadRight.style.cssText = 'font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:28px;text-align:center;';
    loadRight.textContent = 'Loading...';
    rightCol.appendChild(loadRight);
  }

  el.appendChild(rightCol);

  // Fetch open orders
  fetchOpenTabs(tabGrid, emp, empRoles);
}

// ═══════════════════════════════════════════════════
//  OPEN TABS FETCH (shared)
// ═══════════════════════════════════════════════════

function fetchOpenTabs(tabGrid, emp, empRoles) {
  fetch('/api/v1/orders/open')
    .then(function(r) { return r.json(); })
    .then(function(orders) {
      tabGrid.innerHTML = '';
      var filtered = (orders || []).filter(function(order) {
        return (order.total || 0) > 0 || (order.items || []).length > 0;
      });
      if (filtered.length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:28px;text-align:center;padding:40px 0;';
        empty.textContent = 'No open tabs';
        tabGrid.appendChild(empty);

        // "+" button to start a new check
        var newCheckEmpty = document.createElement('div');
        newCheckEmpty.style.cssText = 'width:100%;height:100px;display:flex;align-items:center;justify-content:center;border:3px dashed ' + T.mint + ';box-sizing:border-box;cursor:pointer;font-family:' + T.fb + ';font-size:48px;color:' + T.mint + ';user-select:none;';
        newCheckEmpty.textContent = '+';
        newCheckEmpty.addEventListener('pointerup', function() {
          push('order-entry', {
            mode: 'service',
            pin: emp.pin,
            employeeId: emp.id,
            employeeName: emp.name,
          });
        });
        tabGrid.appendChild(newCheckEmpty);
        return;
      }

      filtered.forEach(function(order) {
        var label = '';
        if (order.check_number) label += order.check_number;
        if (order.customer_name) label += (label ? '\n' : '') + order.customer_name;
        if (order.server_name) label += (label ? '\n' : '') + order.server_name;
        label += '\n$' + (order.total || 0).toFixed(2);
        var itemCount = (order.items || []).length;
        label += '  (' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + ')';

        var statusColor = order.balance_due > 0 ? T.gold : T.goGreen;
        var card = buildButton(label, {
          fill: T.bgDark, color: statusColor, fontSize: '22px', fontFamily: T.fb,
          height: 100,
          onTap: function() {
            push('order-entry', {
              mode: 'service',
              pin: emp.pin,
              employeeId: emp.id,
              employeeName: emp.name,
              recallOrderId: order.order_id,
            });
          },
        });
        card.style.width = '100%';
        tabGrid.appendChild(card);
      });

      // "+" button to start a new check
      var newCheckBtn = document.createElement('div');
      newCheckBtn.style.cssText = 'width:100%;height:100px;display:flex;align-items:center;justify-content:center;border:3px dashed ' + T.mint + ';box-sizing:border-box;cursor:pointer;font-family:' + T.fb + ';font-size:48px;color:' + T.mint + ';user-select:none;';
      newCheckBtn.textContent = '+';
      newCheckBtn.addEventListener('pointerup', function() {
        push('order-entry', {
          mode: 'service',
          pin: emp.pin,
          employeeId: emp.id,
          employeeName: emp.name,
        });
      });
      tabGrid.appendChild(newCheckBtn);
    })
    .catch(function() {
      tabGrid.innerHTML = '';
      var errEl = document.createElement('div');
      errEl.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.red + ';font-size:28px;text-align:center;padding:40px 0;';
      errEl.textContent = 'Failed to load tabs';
      tabGrid.appendChild(errEl);
    });
}

// ═══════════════════════════════════════════════════
//  SCENE REGISTRATION
// ═══════════════════════════════════════════════════

registerScene('landing', {
  onEnter: function(el, params) {
    var emp = params.emp || {};
    var empRoles = emp.roles || [emp.role || 'server'];
    var isManager = empRoles.indexOf('manager') !== -1;

    setSceneName(emp.name || 'Dashboard');
    setHeaderBack({
      x: true,
      onClose: function() {
        clearSceneCache('order-entry');
        replace('login');
      },
    });

    // Initialize landing state
    landingEl = el;
    landingParams = params;
    landingSales = undefined;
    landingLabor = undefined;
    landingRole = isManager ? 'manager' : (empRoles[0] || 'server');
    expandedCard = null;
    expandedPanel = null;

    // Render immediately (shows loading placeholders for cards)
    buildCardLanding(el, params, undefined, undefined);

    // Fetch report data, then re-render with cards populated
    var baseParams = { pin: emp.pin, employeeId: emp.id, employeeName: emp.name, role: landingRole, roles: empRoles };
    fetchReportData(baseParams).then(function(data) {
      landingSales = data.sales;
      landingLabor = data.labor;
      renderLanding();
    });
  },
  onExit: function() {
    expandedCard = null;
    expandedPanel = null;
    landingEl = null;
    landingParams = null;
    landingSales = null;
    landingLabor = null;
  },
  timeoutMs: 0,
});
