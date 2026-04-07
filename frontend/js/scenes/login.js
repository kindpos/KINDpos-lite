// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  PIN entry → push to Landing dashboard
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer } from '../tokens.js';
import { buildButton } from '../components.js';
import { buildNumpad } from '../numpad.js';
import { registerScene, push, overlay, dismissOverlay } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var employees = [];
var _numpadRef = null;
var _pinPromptEl = null;

registerScene('login', {
  onEnter: function(el, params) {
    setSceneName(null);
    setHeaderBack();
    _numpadRef = null;

    fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
      employees = data.servers || [];
    }).catch(function() { employees = []; });

    el.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:24px;position:relative;';

    // LEFT — Clock In/Out & Quick Service buttons
    var leftCol = document.createElement('div');
    leftCol.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px;padding-top:40px;';

    var clockBtn = buildButton('CLOCK IN/OUT', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, fontFamily: T.fh,
      width: 220, height: 80,
      onTap: function() { handleClockOverlay(); },
    });
    leftCol.appendChild(clockBtn);

    var qsBtn = buildButton('QUICK SERVICE', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, fontFamily: T.fh,
      width: 220, height: 80,
      onTap: function() { handleQuickService(); },
    });
    leftCol.appendChild(qsBtn);

    el.appendChild(leftCol);

    // CENTER — PIN prompt + numpad
    var centerCol = document.createElement('div');
    centerCol.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

    // PIN prompt
    var pinPrompt = document.createElement('div');
    pinPrompt.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';text-align:center;padding:2px 0 8px;min-height:26px;';
    pinPrompt.textContent = 'Enter PIN';
    _pinPromptEl = pinPrompt;
    centerCol.appendChild(pinPrompt);

    var maskSetting = window.KINDpos && window.KINDpos.maskPinDigits !== undefined
      ? window.KINDpos.maskPinDigits : true;
    _numpadRef = buildNumpad({
      maxDigits: 6,
      masked: maskSetting,
      displayH: 60,
      gap: 16,
      keyH: 84,
      keyGap: 12,
      cardPad: 18,
      onSubmit: function(pin) { handlePinSubmit(pin); },
    });
    centerCol.appendChild(_numpadRef);

    el.appendChild(centerCol);

    // Version label at bottom-right
    var version = document.createElement('div');
    version.style.cssText = 'font-family:' + T.fb + ';font-size:30px;position:absolute;bottom:4px;right:12px;';
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
    el.appendChild(version);
  },
  onExit: function() {
    _numpadRef = null;
    _pinPromptEl = null;
  },
  timeoutMs: 0,
});

function handlePinSubmit(pin) {
  var emp = employees.find(function(e) { return e.pin === pin; });
  if (!emp) {
    if (_pinPromptEl) {
      _pinPromptEl.textContent = 'Invalid PIN';
      _pinPromptEl.style.color = T.red;
    }
    return;
  }

  // If a pending action (clock/QS) is waiting, run it instead of navigating
  if (_pendingAction) {
    var action = _pendingAction;
    _pendingAction = null;
    var empData = { id: emp.id, name: emp.name, pin: emp.pin, roles: emp.roles || [emp.role || 'server'] };
    action(empData);
    return;
  }

  // Valid PIN — navigate to landing dashboard
  var empRoles = emp.roles || [emp.role || 'server'];
  push('landing', { emp: { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles } });
}

// ═══════════════════════════════════════════════════
//  Clock In/Out — requires PIN first
// ═══════════════════════════════════════════════════
function requirePin(callback) {
  if (!_numpadRef) return;
  if (_pinPromptEl) {
    _pinPromptEl.textContent = 'Enter PIN';
    _pinPromptEl.style.color = T.gold;
  }
  // Override the numpad submit temporarily
  _pendingAction = callback;
}

var _pendingAction = null;

function handleClockOverlay() {
  if (_pendingAction) return;
  requirePin(function(emp) {
    var empRoles = emp.roles || [emp.role || 'server'];
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
            var blockers = { openChecks: summary.open_orders || 0, unadjustedTips: summary.unadjusted_tips || 0 };
            showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects, blockers);
          })
          .catch(function() { showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects, null); });
      } else {
        showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects, null);
      }
    }).catch(function() {});
  });
}

function handleQuickService() {
  if (_pendingAction) return;
  requirePin(function(emp) {
    push('order-entry', { mode: 'service', pin: emp.pin, employeeId: emp.id, employeeName: emp.name });
  });
}

// ═══════════════════════════════════════════════════
//  Clock Overlay (shared with landing.js)
// ═══════════════════════════════════════════════════

function showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects, blockers) {
  var empRoles = emp.roles || [];
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
        fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall,
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
          fill: T.darkBtn,
          color: hasBlockers ? T.mutedText : T.mint,
          fontSize: '40px', width: 340, height: 70,
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
            fill: T.darkBtn, color: T.mint, fontSize: '28px',
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
  }).catch(function() {});
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
