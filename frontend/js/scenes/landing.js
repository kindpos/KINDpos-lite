// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Landing Scene
//  Post-login dashboard: Actions + Open Tabs
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer } from '../tokens.js';
import { buildButton } from '../components.js';
import { registerScene, push, replace, overlay, dismissOverlay, clearSceneCache } from '../scene-manager.js';
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

    el.style.cssText = 'width:100%;height:100%;display:grid;grid-template-columns:auto 1fr;gap:20px;padding:' + SCENE_PAD + 'px;box-sizing:border-box;';

    // ══════════════════════════════════════════════
    //  LEFT — Action Buttons
    // ══════════════════════════════════════════════
    var left = document.createElement('div');
    left.style.cssText = 'display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px;padding:0 10px;';

    // Welcome
    var welcome = document.createElement('div');
    welcome.style.cssText = 'font-family:' + T.fh + ';font-size:32px;color:' + T.gold + ';text-align:center;letter-spacing:2px;margin-bottom:4px;';
    welcome.textContent = emp.name || 'Welcome';
    left.appendChild(welcome);

    var BTN_W = 260;
    var BTN_H = 80;

    var qsBtn = buildButton('QUICK SERVICE', {
      fill: T.mint, color: T.bgDark, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() {
        push('order-entry', { mode: 'service', pin: emp.pin, employeeId: emp.id, employeeName: emp.name });
      },
    });
    left.appendChild(qsBtn);

    var clockBtn = buildButton('CLOCK IN/OUT', {
      fill: T.cyan, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() { handleClockOverlay(emp, empRoles); },
    });
    left.appendChild(clockBtn);

    var tipBtn = buildButton('TIP ADJUSTMENT', {
      fill: T.cyan, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() {
        var base = { pin: emp.pin, employeeId: emp.id, employeeName: emp.name, role: empRoles[0] || 'server', roles: empRoles };
        push('tip-adjustment', base);
      },
    });
    left.appendChild(tipBtn);

    if (isManager) {
      var reportBtn = buildButton('REPORTING', {
        fill: T.gold, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
        width: BTN_W, height: BTN_H,
        onTap: function() {
          var base = { pin: emp.pin, employeeId: emp.id, employeeName: emp.name, role: empRoles[0] || 'server', roles: empRoles };
          push('reporting', base);
        },
      });
      left.appendChild(reportBtn);

      var configBtn = buildButton('CONFIGURATION', {
        fill: T.gold, color: T.bg, fontSize: '28px', fontFamily: T.fh,
        width: BTN_W, height: BTN_H,
        onTap: function() { push('settings', { pin: emp.pin }); },
      });
      left.appendChild(configBtn);
    }

    // Version label
    var version = document.createElement('div');
    version.style.cssText = 'font-family:' + T.fb + ';font-size:30px;padding:8px 0 0;';
    var parts = [
      { text: 'KIND', color: T.gold, fontFamily: T.fh, fontSize: '28px' },
      { text: 'pos', color: T.red },
      { text: '_lite', color: T.gold },
      { text: ' // ', color: T.mint },
      { text: 'Vz', color: T.mint },
      { text: '1.0', color: T.gold },
    ];
    parts.forEach(function(p) {
      var span = document.createElement('span');
      span.style.color = p.color;
      if (p.fontFamily) span.style.fontFamily = p.fontFamily;
      if (p.fontSize) span.style.fontSize = p.fontSize;
      span.textContent = p.text;
      version.appendChild(span);
    });
    left.appendChild(version);

    el.appendChild(left);

    // ══════════════════════════════════════════════
    //  RIGHT — Open Tabs
    // ══════════════════════════════════════════════
    var right = document.createElement('div');
    right.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;';

    var tabHeader = document.createElement('div');
    tabHeader.style.cssText = 'font-family:' + T.fb + ';font-size:32px;color:' + T.cyan + ';letter-spacing:2px;padding:6px 4px;flex-shrink:0;';
    tabHeader.textContent = '// OPEN TABS //';
    right.appendChild(tabHeader);

    var tabGrid = document.createElement('div');
    tabGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:4px;overflow-y:auto;flex:1;align-content:start;';

    // Loading placeholder
    var loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:28px;text-align:center;padding:40px 0;';
    loadingEl.textContent = 'Loading...';
    tabGrid.appendChild(loadingEl);

    right.appendChild(tabGrid);
    el.appendChild(right);

    // Fetch open orders
    fetch('/api/v1/orders/open')
      .then(function(r) { return r.json(); })
      .then(function(orders) {
        tabGrid.innerHTML = '';
        if (!orders || orders.length === 0) {
          var empty = document.createElement('div');
          empty.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:28px;text-align:center;padding:40px 0;';
          empty.textContent = 'No open tabs';
          tabGrid.appendChild(empty);
          return;
        }

        orders.forEach(function(order) {
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

// ═══════════════════════════════════════════════════
//  CLOCK IN/OUT OVERLAY (moved from login.js)
// ═══════════════════════════════════════════════════

function handleClockOverlay(emp, empRoles) {
  Promise.all([
    fetch('/api/v1/servers/clocked-in').then(function(r) { return r.json(); }),
    fetch('/api/v1/config/roles').then(function(r) { return r.json(); }),
  ]).then(function(results) {
    var clockedInData = results[0];
    var rolesData = results[1];

    var staff = clockedInData.staff || [];
    var isClockedIn = staff.some(function(s) { return s.employee_id === emp.id; });
    var clockRecord = staff.find(function(s) { return s.employee_id === emp.id; });

    var allRoles = Array.isArray(rolesData) ? rolesData : [];
    var empRoleObjects = empRoles.map(function(rid) {
      var matched = allRoles.find(function(r) { return r.role_id === rid; });
      return { role_id: rid, name: matched ? matched.name : rid };
    });

    if (isClockedIn) {
      fetch('/api/v1/orders/day-summary?server_id=' + encodeURIComponent(emp.id))
        .then(function(r) { return r.json(); })
        .then(function(summary) {
          var blockers = {
            openChecks: summary.open_orders || 0,
            unadjustedTips: summary.unadjusted_tips || 0,
          };
          showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects, blockers);
        })
        .catch(function() {
          showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects, null);
        });
    } else {
      showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects, null);
    }
  }).catch(function() {
    // Silent fail — could toast here
  });
}

function showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects, blockers) {
  overlay('clock-io', {
    onBuild: function(el) {
      var panel = document.createElement('div');
      panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;'
        + 'width:480px;background:' + T.bgDark + ';border:7px solid ' + T.cyan
        + ';padding:20px;gap:16px;clip-path:' + chamfer(10) + ';';

      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;';

      var title = document.createElement('span');
      title.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.cyan + ';letter-spacing:2px;';
      title.textContent = '// CLOCK IN/OUT //';

      var closeBtn = buildButton('\u2715', {
        fill: T.red, color: '#ffffff', fontSize: T.fsSmall,
        width: 38, height: 38,
        onTap: function() { dismissOverlay(); },
      });

      hdr.appendChild(title);
      hdr.appendChild(closeBtn);
      panel.appendChild(hdr);

      var nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-family:' + T.fh + ';font-size:40px;color:' + T.gold + ';text-align:center;';
      nameEl.textContent = emp.name;
      panel.appendChild(nameEl);

      var statusEl = document.createElement('div');
      statusEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';text-align:center;min-height:28px;';
      statusEl.textContent = '';

      if (isClockedIn && clockRecord) {
        var t = new Date(clockRecord.clocked_in_at);
        var timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.cyan + ';text-align:center;';
        infoEl.textContent = 'Clocked in since ' + timeStr;
        panel.appendChild(infoEl);

        var hasBlockers = blockers && (blockers.openChecks > 0 || blockers.unadjustedTips > 0);

        if (hasBlockers) {
          var blockerEl = document.createElement('div');
          blockerEl.style.cssText = 'font-family:' + T.fb + ';font-size:32px;color:' + T.red + ';text-align:center;line-height:1.4;';
          var reasons = [];
          if (blockers.openChecks > 0) reasons.push(blockers.openChecks + ' open check' + (blockers.openChecks > 1 ? 's' : ''));
          if (blockers.unadjustedTips > 0) reasons.push(blockers.unadjustedTips + ' unadjusted tip' + (blockers.unadjustedTips > 1 ? 's' : ''));
          blockerEl.textContent = reasons.join(', ');
          panel.appendChild(blockerEl);

          var hintEl = document.createElement('div');
          hintEl.style.cssText = 'font-family:' + T.fb + ';font-size:28px;color:' + T.mutedText + ';text-align:center;';
          hintEl.textContent = 'Complete checkout before clocking out';
          panel.appendChild(hintEl);
        }

        var outBtn = buildButton('CLOCK OUT', {
          fill: hasBlockers ? T.darkBtn : T.red,
          color: hasBlockers ? T.mutedText : '#ffffff',
          fontSize: '40px',
          width: 340, height: 70,
          onTap: hasBlockers ? function() {} : function() { doClockAction(emp, empRoleObjects[0].name, 'out', statusEl); },
        });
        panel.appendChild(outBtn);
      } else if (empRoleObjects.length === 1) {
        var singleRole = empRoleObjects[0];
        var infoEl2 = document.createElement('div');
        infoEl2.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.cyan + ';text-align:center;';
        infoEl2.textContent = 'Role: ' + singleRole.name;
        panel.appendChild(infoEl2);
        panel.appendChild(statusEl);
        el.appendChild(panel);
        doClockAction(emp, singleRole.name, 'in', statusEl);
        return;
      } else {
        var selectLabel = document.createElement('div');
        selectLabel.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mutedText + ';text-align:center;';
        selectLabel.textContent = 'Select role to clock in:';
        panel.appendChild(selectLabel);

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;width:100%;';

        empRoleObjects.forEach(function(role) {
          var btn = buildButton(role.name.toUpperCase(), {
            fill: T.goGreen, color: '#ffffff', fontSize: '28px',
            width: empRoleObjects.length <= 2 ? 200 : 140, height: 64,
            onTap: function() { doClockAction(emp, role.name, 'in', statusEl); },
          });
          btnRow.appendChild(btn);
        });
        panel.appendChild(btnRow);
      }

      panel.appendChild(statusEl);
      el.appendChild(panel);
    },
  });
}

function printClockHours(emp, roleName, action) {
  fetch('/api/v1/print/clock-hours/' + encodeURIComponent(emp.id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_name: emp.name, role_name: roleName, action: action }),
  }).catch(function() { /* printing is best-effort */ });
}

function doClockAction(emp, roleName, direction, statusEl) {
  var endpoint = direction === 'in' ? '/api/v1/servers/clock-in' : '/api/v1/servers/clock-out';
  var actionLabel = direction === 'in' ? 'CLOCK IN' : 'CLOCK OUT';
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: emp.id, employee_name: emp.name }),
  }).then(function(r) {
    if (!r.ok) return r.json().then(function(err) { throw new Error(err.detail || 'Failed'); });
    return r.json();
  }).then(function() {
    statusEl.textContent = direction === 'in' ? 'Clocked in!' : 'Clocked out!';
    statusEl.style.color = direction === 'in' ? T.goGreen : T.gold;
    printClockHours(emp, roleName, actionLabel);
    setTimeout(function() { dismissOverlay(); }, 1200);
  }).catch(function(e) {
    statusEl.textContent = e.message || 'Network error';
    statusEl.style.color = T.red;
  });
}
