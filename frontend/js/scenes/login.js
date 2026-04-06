// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  Two columns: Buttons | Numpad
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, bevelEdges, shadowColor, chamfer } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { buildNumpad } from '../numpad.js';
import { registerScene, push, overlay, dismissOverlay } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var COL_GAP    = 20;
var SCENE_PAD  = 10;
var BTN_W      = 260;
var BTN_H      = 100;

var selectedAction = null;
var employees = [];  // loaded from /api/v1/servers on scene enter
var actionButtons = [];  // track buttons for highlight
var _numpadRef = null;

function clearHighlights() {
  var b = T.bevel;
  actionButtons.forEach(function(item) {
    var edges = bevelEdges(item.fill);
    var shadow = shadowColor(item.fill);
    var inner = item.wrap.querySelector('div');
    inner.style.borderTop    = b + 'px solid ' + edges.light;
    inner.style.borderLeft   = b + 'px solid ' + edges.light;
    inner.style.borderBottom = b + 'px solid ' + edges.dark;
    inner.style.borderRight  = b + 'px solid ' + edges.dark;
    item.wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + shadow + ')';
    item.wrap.style.transform = 'translate(0,0)';
    item.selected = false;
  });
}

function highlightButton(action) {
  clearHighlights();
  var b = T.bevel;
  actionButtons.forEach(function(item) {
    if (item.action === action) {
      var edges = bevelEdges(item.fill);
      var inner = item.wrap.querySelector('div');
      inner.style.borderTop    = b + 'px solid ' + edges.dark;
      inner.style.borderLeft   = b + 'px solid ' + edges.dark;
      inner.style.borderBottom = b + 'px solid ' + edges.light;
      inner.style.borderRight  = b + 'px solid ' + edges.light;
      item.wrap.style.filter = 'drop-shadow(0px 0px 0px transparent)';
      item.wrap.style.transform = 'translate(' + T.shadowX + 'px, ' + T.shadowY + 'px)';
      item.selected = true;
    }
  });
}

function registerActionButton(wrap, action, fill) {
  var entry = { wrap: wrap, action: action, fill: fill, selected: false };
  actionButtons.push(entry);
  // Re-apply pressed-in look after default pointerup/pointerleave restores it
  wrap.addEventListener('pointerup', function() {
    setTimeout(function() {
      if (entry.selected) highlightButton(action);
    }, 0);
  });
  wrap.addEventListener('pointerleave', function() {
    setTimeout(function() {
      if (entry.selected) highlightButton(action);
    }, 0);
  });
}

registerScene('login', {
  onEnter: function(el, params) {
    setSceneName(null);
    setHeaderBack();
    selectedAction = null;
    actionButtons = [];
    fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
      employees = data.servers || [];
    }).catch(function() { employees = []; });
    el.style.cssText = 'width:100%;height:100%;display:grid;grid-template-columns:1fr auto 1fr;gap:' + COL_GAP + 'px;padding:' + SCENE_PAD + 'px;box-sizing:border-box;';

    // ── LEFT COLUMN ── (Clock In/Out, Reporting, Configuration)
    var left = document.createElement('div');
    left.style.cssText = 'display:flex;flex-direction:column;justify-content:center;align-items:center;gap:20px;';

    var clockBtn = buildButton('CLOCK IN/OUT', {
      fill: T.cyan, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() { handleAction('clock'); },
    });
    registerActionButton(clockBtn, 'clock', T.cyan);
    left.appendChild(clockBtn);

    var reportBtn = buildButton('REPORTING', {
      fill: T.cyan, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() { handleAction('reporting'); },
    });
    registerActionButton(reportBtn, 'reporting', T.cyan);
    left.appendChild(reportBtn);

    var configBtn = buildButton('CONFIGURATION', {
      fill: T.gold, color: T.bg, fontSize: '28px', fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() { handleAction('configuration'); },
    });
    registerActionButton(configBtn, 'configuration', T.gold);
    left.appendChild(configBtn);

    el.appendChild(left);

    // ── CENTER COLUMN ── (PIN prompt + Numpad + Version)
    var center = document.createElement('div');
    center.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:flex-start;';

    // PIN prompt — hidden until an action button is tapped
    var pinPrompt = document.createElement('div');
    pinPrompt.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';text-align:center;padding:2px 0;min-height:26px;';
    pinPrompt.textContent = '';
    _pinPromptEl = pinPrompt;
    center.appendChild(pinPrompt);

    _numpadRef = buildNumpad({
      maxDigits: 6,
      masked: true,
      displayH: 60,
      gap: 16,
      keyH: 84,
      keyGap: 12,
      cardPad: 18,
      onSubmit: function(pin) { handlePinSubmit(pin, pinPrompt); },
    });
    center.appendChild(_numpadRef);

    // Version label at bottom with multi-color spans
    var version = document.createElement('div');
    version.style.cssText = 'margin-top:auto;align-self:flex-end;font-family:' + T.fb + ';font-size:40px;padding:4px 0;margin-right:0;';
    var parts = [
      { text: 'KIND', color: T.gold, fontFamily: T.fh, fontSize: '36px' },
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
    center.appendChild(version);

    el.appendChild(center);

    // ── RIGHT COLUMN ── (Quick Service, Recall Table, Tip Adjustment)
    var right = document.createElement('div');
    right.style.cssText = 'display:flex;flex-direction:column;justify-content:center;align-items:center;gap:20px;';

    var qsBtn = buildButton('QUICK SERVICE', {
      fill: T.grayBtn, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() { handleAction('quick-service'); },
    });
    registerActionButton(qsBtn, 'quick-service', T.grayBtn);
    right.appendChild(qsBtn);

    var recallBtn = buildButton('RECALL TABLE', {
      fill: T.grayBtn, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() { handleAction('recall-table'); },
    });
    registerActionButton(recallBtn, 'recall-table', T.grayBtn);
    right.appendChild(recallBtn);

    var tipBtn = buildButton('TIP ADJUSTMENT', {
      fill: T.cyan, color: T.bg, fontSize: T.fsBtn, fontFamily: T.fh,
      width: BTN_W, height: BTN_H,
      onTap: function() { handleAction('tip-adjustment'); },
    });
    registerActionButton(tipBtn, 'tip-adjustment', T.cyan);
    right.appendChild(tipBtn);

    el.appendChild(right);
  },
  timeoutMs: 0,
});

var _pinPromptEl = null;

var actionLabels = {
  'quick-service': 'Quick Service',
  'clock': 'Clock In/Out',
  'reporting': 'Reporting',
  'configuration': 'Configurations',
  'recall-table': 'Recall Table',
  'tip-adjustment': 'Tip Adjustment',
};

function handleAction(action) {
  selectedAction = action;
  setTimeout(function() { highlightButton(action); }, 0);

  // If PIN already entered, submit immediately
  if (_numpadRef) {
    var existingPin = _numpadRef.getPin();
    if (existingPin.length > 0) {
      handlePinSubmit(existingPin, _pinPromptEl);
      return;
    }
  }

  if (_pinPromptEl) {
    _pinPromptEl.textContent = 'Enter PIN for ' + (actionLabels[action] || action);
    _pinPromptEl.style.color = T.gold;
  }
}

function handlePinSubmit(pin, promptEl) {
  var emp = employees.find(function(e) { return e.pin === pin; });
  if (!emp) {
    if (promptEl || _pinPromptEl) {
      var el = promptEl || _pinPromptEl;
      el.textContent = 'Invalid PIN';
      el.style.color = T.red;
    }
    return;
  }

  var action = selectedAction || 'quick-service';
  var empRoles = emp.roles || [emp.role || 'server'];
  var role = empRoles[0] || 'server';
  var base = { pin: pin, employeeId: emp.id, employeeName: emp.name, role: role, roles: empRoles };

  switch (action) {
    case 'quick-service': push('order-entry', { mode: 'service', pin: pin, employeeId: emp.id, employeeName: emp.name }); break;
    case 'clock':         handleClockOverlay(emp); break;
    case 'reporting':     push('reporting', base); break;
    case 'configuration':
      if (empRoles.indexOf('manager') === -1) {
        if (promptEl || _pinPromptEl) {
          var el = promptEl || _pinPromptEl;
          el.textContent = 'Manager access only';
          el.style.color = T.red;
        }
        return;
      }
      push('settings', { pin: pin });
      break;
    case 'recall-table':
      push('order-entry', { mode: 'service', pin: pin, employeeId: emp.id, employeeName: emp.name, autoRecall: true });
      break;
    case 'tip-adjustment':
      push('tip-adjustment', base);
      break;
  }
}

// ═══════════════════════════════════════════════════
//  CLOCK IN/OUT OVERLAY
// ═══════════════════════════════════════════════════

function handleClockOverlay(emp) {
  Promise.all([
    fetch('/api/v1/servers/clocked-in').then(function(r) { return r.json(); }),
    fetch('/api/v1/config/roles').then(function(r) { return r.json(); }),
  ]).then(function(results) {
    var clockedInData = results[0];
    var rolesData = results[1];

    var staff = clockedInData.staff || [];
    var isClockedIn = staff.some(function(s) { return s.employee_id === emp.id; });
    var clockRecord = staff.find(function(s) { return s.employee_id === emp.id; });

    var empRoles = emp.roles || [emp.role || 'server'];
    var allRoles = Array.isArray(rolesData) ? rolesData : [];

    // Resolve role names for this employee's roles
    var empRoleObjects = empRoles.map(function(rid) {
      var matched = allRoles.find(function(r) { return r.role_id === rid; });
      return { role_id: rid, name: matched ? matched.name : rid };
    });

    showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects);
  }).catch(function() {
    if (_pinPromptEl) {
      _pinPromptEl.textContent = 'Network error';
      _pinPromptEl.style.color = T.red;
    }
  });
}

function showClockOverlay(emp, isClockedIn, clockRecord, empRoleObjects) {
  overlay('clock-io', {
    onBuild: function(el) {
      var panel = document.createElement('div');
      panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;'
        + 'width:480px;background:' + T.bgDark + ';border:7px solid ' + T.cyan
        + ';padding:20px;gap:16px;clip-path:' + chamfer(10) + ';';

      // Header row
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

      // Employee name
      var nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-family:' + T.fh + ';font-size:40px;color:' + T.gold + ';text-align:center;';
      nameEl.textContent = emp.name;
      panel.appendChild(nameEl);

      // Status message area
      var statusEl = document.createElement('div');
      statusEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';text-align:center;min-height:28px;';
      statusEl.textContent = '';

      if (isClockedIn && clockRecord) {
        // Clocked in — show info + clock out
        var t = new Date(clockRecord.clocked_in_at);
        var timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.cyan + ';text-align:center;';
        infoEl.textContent = 'Clocked in since ' + timeStr;
        panel.appendChild(infoEl);

        var outBtn = buildButton('CLOCK OUT', {
          fill: T.red, color: '#ffffff', fontSize: '40px',
          width: 340, height: 70,
          onTap: function() { doClockOut(emp, empRoleObjects[0].name, statusEl); },
        });
        panel.appendChild(outBtn);
      } else if (empRoleObjects.length === 1) {
        // Single role — auto clock in immediately
        var singleRole = empRoleObjects[0];
        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.cyan + ';text-align:center;';
        infoEl.textContent = 'Role: ' + singleRole.name;
        panel.appendChild(infoEl);
        panel.appendChild(statusEl);
        el.appendChild(panel);
        doClockIn(emp, singleRole.name, statusEl);
        return;
      } else {
        // Multiple roles — show selection buttons
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
            onTap: function() { doClockIn(emp, role.name, statusEl); },
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

function doClockIn(emp, roleName, statusEl) {
  fetch('/api/v1/servers/clock-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: emp.id, employee_name: emp.name }),
  }).then(function(r) {
    if (!r.ok) return r.json().then(function(err) { throw new Error(err.detail || 'Failed'); });
    return r.json();
  }).then(function(data) {
    statusEl.textContent = 'Clocked in!';
    statusEl.style.color = T.goGreen;
    printClockHours(emp, roleName, 'CLOCK IN');
    setTimeout(function() { dismissOverlay(); }, 1200);
  }).catch(function(e) {
    statusEl.textContent = e.message || 'Network error';
    statusEl.style.color = T.red;
  });
}

function doClockOut(emp, roleName, statusEl) {
  fetch('/api/v1/servers/clock-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: emp.id, employee_name: emp.name }),
  }).then(function(r) {
    if (!r.ok) return r.json().then(function(err) { throw new Error(err.detail || 'Failed'); });
    return r.json();
  }).then(function(data) {
    statusEl.textContent = 'Clocked out!';
    statusEl.style.color = T.gold;
    printClockHours(emp, roleName, 'CLOCK OUT');
    setTimeout(function() { dismissOverlay(); }, 1200);
  }).catch(function(e) {
    statusEl.textContent = e.message || 'Network error';
    statusEl.style.color = T.red;
  });
}
