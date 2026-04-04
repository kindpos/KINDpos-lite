// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  Two columns: Buttons | Numpad
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { buildNumpad } from '../numpad.js';
import { registerScene, push, overlay } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var COL_LEFT   = 530;
var COL_RIGHT  = 410;
var COL_GAP    = 20;
var SCENE_PAD  = 20;
var QS_H       = 120;
var MGMT_H     = 130;
var CONFIG_H   = 100;
var MGMT_W     = 250;

var selectedAction = null;
var employees = [];  // loaded from /api/v1/servers on scene enter
var actionButtons = [];  // track buttons for highlight

function clearHighlights() {
  actionButtons.forEach(function(item) {
    item.wrap.style.outline = 'none';
    item.wrap.style.outlineOffset = '0';
  });
}

function highlightButton(action) {
  clearHighlights();
  actionButtons.forEach(function(item) {
    if (item.action === action) {
      item.wrap.style.outline = '3px solid #ffffff';
      item.wrap.style.outlineOffset = '4px';
    }
  });
}

registerScene('login', {
  onEnter: function(el, params) {
    setSceneName(null);
    setHeaderBack(false);
    selectedAction = null;
    actionButtons = [];
    fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
      employees = data.servers || [];
    }).catch(function() { employees = []; });
    el.style.cssText = 'width:100%;height:100%;display:grid;grid-template-columns:' + COL_LEFT + 'px ' + COL_RIGHT + 'px;gap:' + COL_GAP + 'px;padding:' + SCENE_PAD + 'px;box-sizing:border-box;';

    // ── LEFT COLUMN ──
    var left = document.createElement('div');
    left.style.cssText = 'display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0;';

    // Quick Service — large button at top
    var qsBtn = buildButton('< Quick Service >', {
      fill: T.mint, color: T.bg, fontSize: '60px',
      width: COL_LEFT - 60, height: QS_H,
      onTap: function() { handleAction('quick-service'); },
    });
    actionButtons.push({ wrap: qsBtn, action: 'quick-service' });
    left.appendChild(qsBtn);

    left.appendChild(buildGap(40));

    // Clock in/out + Reporting — side by side
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:20px;';

    var clockBtn = buildButton('Clock\nin/out', {
      fill: T.cyan, color: T.bg, fontSize: T.fsMgmt,
      width: MGMT_W, height: MGMT_H,
      lineHeight: '0.75',
      onTap: function() { handleAction('clock'); },
    });
    actionButtons.push({ wrap: clockBtn, action: 'clock' });
    row.appendChild(clockBtn);

    var reportBtn = buildButton('Reporting', {
      fill: T.cyan, color: T.bg, fontSize: T.fsMgmt,
      width: MGMT_W, height: MGMT_H,
      onTap: function() { handleAction('reporting'); },
    });
    actionButtons.push({ wrap: reportBtn, action: 'reporting' });
    row.appendChild(reportBtn);

    left.appendChild(row);

    left.appendChild(buildGap(40));

    // Configurations — wide gold button at bottom
    var configBtn = buildButton('< Configurations >', {
      fill: T.gold, color: T.bg, fontSize: '60px',
      width: COL_LEFT - 60, height: CONFIG_H,
      onTap: function() { handleAction('configuration'); },
    });
    actionButtons.push({ wrap: configBtn, action: 'configuration' });
    left.appendChild(configBtn);

    el.appendChild(left);

    // ── RIGHT COLUMN ──
    var right = document.createElement('div');
    right.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:flex-start;';

    right.appendChild(buildNumpad({
      maxDigits: 6,
      masked: true,
      onSubmit: function(pin) { handlePinSubmit(pin); },
    }));

    // Version label at bottom-right with multi-color spans
    var version = document.createElement('div');
    version.style.cssText = 'margin-top:auto;align-self:flex-end;font-family:' + T.fb + ';font-size:24px;padding:4px 0;margin-right:0;';
    var parts = [
      { text: 'KIND', color: T.gold },
      { text: 'pos', color: T.red },
      { text: '_lite', color: T.gold },
      { text: ' // ', color: T.mint },
      { text: 'Vz', color: T.mint },
      { text: '1.0', color: T.gold },
    ];
    parts.forEach(function(p) {
      var span = document.createElement('span');
      span.style.color = p.color;
      span.textContent = p.text;
      version.appendChild(span);
    });
    right.appendChild(version);

    el.appendChild(right);
  },
  timeoutMs: 0,
});

function handleAction(action) {
  selectedAction = action;
  highlightButton(action);
}

function handlePinSubmit(pin) {
  var emp = employees.find(function(e) { return e.pin === pin; });
  if (!emp) return;  // invalid PIN — ignore

  var action = selectedAction || 'quick-service';
  var role = emp.role || 'server';
  var base = { pin: pin, employeeId: emp.id, employeeName: emp.name, role: role };

  switch (action) {
    case 'quick-service': push('order-entry', { mode: 'service', pin: pin, employeeId: emp.id, employeeName: emp.name }); break;
    case 'clock':         break;
    case 'reporting':     push('reporting', base); break;
    case 'configuration':
      if (role !== 'manager') return;  // only managers can access config
      push('settings', { pin: pin });
      break;
  }
}
