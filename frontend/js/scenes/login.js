// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  Three columns: Management | Quick Modes | Numpad
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { buildNumpad } from '../numpad.js';
import { registerScene, push, overlay } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var COL_LEFT   = 210;
var COL_CENTER = 240;
var COL_RIGHT  = 494;
var COL_GAP    = 20;
var SCENE_PAD  = 20;
var QUICK_H    = 128;
var MGMT_H     = 80;
var CLOCK_H    = 128;

var selectedAction = null;
var employees = [];  // loaded from /api/v1/servers on scene enter

registerScene('login', {
  onEnter: function(el, params) {
     setSceneName(null);
    setHeaderBack(false);
    selectedAction = null;
    fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
      employees = data.servers || [];
    }).catch(function() { employees = []; });
    el.style.cssText = 'width:100%;height:100%;display:grid;grid-template-columns:' + COL_LEFT + 'px ' + COL_CENTER + 'px ' + COL_RIGHT + 'px;gap:' + COL_GAP + 'px;padding:' + SCENE_PAD + 'px;box-sizing:border-box;';

    // ── LEFT COLUMN — all buttons grouped, centered vertically ──
    var left = document.createElement('div');
    left.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:0;';

    left.appendChild(buildButton('Clock\nin/out', {
      fill: T.mint, color: T.bg, fontSize: T.fsMgmt,
      width: COL_LEFT, height: CLOCK_H,
      lineHeight: '0.75',
      onTap: function() { handleAction('clock'); },
    }));

    left.appendChild(buildGap(24));

    left.appendChild(buildButton('Reporting', {
      fill: T.goGreen, color: T.bg, fontSize: T.fsMgmt,
      width: COL_LEFT, height: MGMT_H,
      onTap: function() { handleAction('reporting'); },
    }));

    left.appendChild(buildGap(16));

    left.appendChild(buildButton('Close Day', {
      fill: T.goGreen, color: T.bg, fontSize: T.fsMgmt,
      width: COL_LEFT, height: MGMT_H,
      onTap: function() { handleAction('close-day'); },
    }));

    left.appendChild(buildGap(16));

    left.appendChild(buildButton('Configuration', {
      fill: T.gold, color: T.bg, fontSize: '53px',
      width: COL_LEFT, height: MGMT_H,
      onTap: function() { handleAction('configuration'); },
    }));

    el.appendChild(left);

    // ── CENTER COLUMN — centered vertically ──
    var center = document.createElement('div');
center.style.cssText = 'display:flex;flex-direction:column;gap:24px;justify-content:center;padding-left:30px;';

    center.appendChild(buildButton('Quick\nService', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsQuick,
      width: COL_CENTER, height: QUICK_H,
      lineHeight: '0.75',
      onTap: function() { handleAction('quick-service'); },
    }));

    center.appendChild(buildButton('Quick\nBar', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsQuick,
      width: COL_CENTER, height: QUICK_H,
      lineHeight: '0.75',
      onTap: function() { handleAction('quick-bar'); },
    }));

    center.appendChild(buildButton('Quick\nItem', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsQuick,
      width: COL_CENTER, height: QUICK_H,
      lineHeight: '0.75',
      onTap: function() { handleAction('quick-item'); },
    }));

    el.appendChild(center);

    // ── RIGHT COLUMN ──
    var right = document.createElement('div');
    right.style.cssText = 'display:flex;justify-content:center;align-items:flex-start;';

    right.appendChild(buildNumpad({
      maxDigits: 6,
      masked: true,
      onSubmit: function(pin) { handlePinSubmit(pin); },
    }));

    el.appendChild(right);
  },
  timeoutMs: 0,
});

function handleAction(action) {
  selectedAction = action;
}

function handlePinSubmit(pin) {
  var emp = employees.find(function(e) { return e.pin === pin; });
  if (!emp) return;  // invalid PIN — ignore

  var action = selectedAction || 'quick-service';
  var role = emp.role || 'server';
  var base = { pin: pin, employeeId: emp.id, employeeName: emp.name, role: role };

  switch (action) {
    case 'quick-service': push('order-entry', { mode: 'service', pin: pin, employeeId: emp.id, employeeName: emp.name }); break;
    case 'quick-bar': push('order-entry', { mode: 'bar', pin: pin, employeeId: emp.id, employeeName: emp.name }); break;
    case 'quick-item':    break;
    case 'clock':         break;
    case 'reporting':     push('reporting', base); break;
    case 'close-day':     push('close-day', { pin: pin, managerName: emp.name }); break;
    case 'configuration':
      if (role !== 'manager') return;  // only managers can access config
      push('settings', { pin: pin });
      break;
  }
}