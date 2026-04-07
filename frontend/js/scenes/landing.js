// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Landing Scene
//  Post-login dashboard: Actions + Open Tabs
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildButton } from '../components.js';
import { registerScene, push, replace, clearSceneCache } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var SCENE_PAD = 10;

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

    el.style.cssText = 'width:100%;height:100%;display:grid;grid-template-columns:auto 1fr auto;gap:14px;padding:' + SCENE_PAD + 'px;box-sizing:border-box;';

    // ══════════════════════════════════════════════
    //  LEFT — Nav Buttons
    // ══════════════════════════════════════════════
    var left = document.createElement('div');
    left.style.cssText = 'display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px;padding:0 6px;';

    // Welcome
    var welcome = document.createElement('div');
    welcome.style.cssText = 'font-family:' + T.fh + ';font-size:32px;color:' + T.gold + ';text-align:center;letter-spacing:2px;margin-bottom:4px;';
    welcome.textContent = emp.name || 'Welcome';
    left.appendChild(welcome);

    var BTN_W = 220;
    var BTN_H = 80;

    var tipBtn = buildButton('TIP ADJUSTMENT', {
      fill: T.cyan, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() {
        var base = { pin: emp.pin, employeeId: emp.id, employeeName: emp.name, role: empRoles[0] || 'server', roles: empRoles };
        push('tip-adjustment', base);
      },
    });
    left.appendChild(tipBtn);

    el.appendChild(left);

    // ══════════════════════════════════════════════
    //  CENTER — Open Tabs
    // ══════════════════════════════════════════════
    var center = document.createElement('div');
    center.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;';

    var tabHeader = document.createElement('div');
    tabHeader.style.cssText = 'font-family:' + T.fb + ';font-size:32px;color:' + T.cyan + ';letter-spacing:2px;padding:6px 4px;flex-shrink:0;text-align:center;';
    tabHeader.textContent = '// OPEN TABS //';
    center.appendChild(tabHeader);

    var tabGrid = document.createElement('div');
    tabGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:4px;overflow-y:auto;flex:1;align-content:start;';

    // Loading placeholder
    var loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:28px;text-align:center;padding:40px 0;';
    loadingEl.textContent = 'Loading...';
    tabGrid.appendChild(loadingEl);

    center.appendChild(tabGrid);
    el.appendChild(center);

    // ══════════════════════════════════════════════
    //  RIGHT — Manager Buttons
    // ══════════════════════════════════════════════
    if (isManager) {
      var right = document.createElement('div');
      right.style.cssText = 'display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px;padding:0 6px;';

      var reportBtn = buildButton('REPORTING', {
        fill: T.gold, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
        width: BTN_W, height: BTN_H,
        onTap: function() {
          var base = { pin: emp.pin, employeeId: emp.id, employeeName: emp.name, role: empRoles[0] || 'server', roles: empRoles };
          push('reporting', base);
        },
      });
      right.appendChild(reportBtn);

      var configBtn = buildButton('CONFIGURATION', {
        fill: T.gold, color: T.bg, fontSize: '28px', fontFamily: T.fh,
        width: BTN_W, height: BTN_H,
        onTap: function() { push('settings', { pin: emp.pin }); },
      });
      right.appendChild(configBtn);

      el.appendChild(right);
    }

    // Fetch open orders
    fetch('/api/v1/orders/open')
      .then(function(r) { return r.json(); })
      .then(function(orders) {
        tabGrid.innerHTML = '';
        // Filter out $0.00 tabs with no items
        var filtered = (orders || []).filter(function(order) {
          return (order.total || 0) > 0 || (order.items || []).length > 0;
        });
        if (filtered.length === 0) {
          var empty = document.createElement('div');
          empty.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:28px;text-align:center;padding:40px 0;';
          empty.textContent = 'No open tabs';
          tabGrid.appendChild(empty);
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
      })
      .catch(function() {
        tabGrid.innerHTML = '';
        var errEl = document.createElement('div');
        errEl.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.red + ';font-size:28px;text-align:center;padding:40px 0;';
        errEl.textContent = 'Failed to load tabs';
        tabGrid.appendChild(errEl);
      });
  },
  timeoutMs: 0,
});
