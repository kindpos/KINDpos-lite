// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  Two columns: Buttons | Numpad
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, bevelEdges, shadowColor } from '../tokens.js';
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
    registerActionButton(qsBtn, 'quick-service', T.mint);
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
    registerActionButton(clockBtn, 'clock', T.cyan);
    row.appendChild(clockBtn);

    var reportBtn = buildButton('Reporting', {
      fill: T.cyan, color: T.bg, fontSize: T.fsMgmt,
      width: MGMT_W, height: MGMT_H,
      onTap: function() { handleAction('reporting'); },
    });
    registerActionButton(reportBtn, 'reporting', T.cyan);
    row.appendChild(reportBtn);

    left.appendChild(row);

    left.appendChild(buildGap(40));

    // Configurations — wide gold button at bottom
    var configBtn = buildButton('< Configurations >', {
      fill: T.gold, color: T.bg, fontSize: '60px',
      width: COL_LEFT - 60, height: CONFIG_H,
      onTap: function() { handleAction('configuration'); },
    });
    registerActionButton(configBtn, 'configuration', T.gold);
    left.appendChild(configBtn);

    el.appendChild(left);

    // ── RIGHT COLUMN ──
    var right = document.createElement('div');
    right.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:flex-start;';

    // PIN prompt — hidden until an action button is tapped
    var pinPrompt = document.createElement('div');
    pinPrompt.style.cssText = 'font-family:' + T.fb + ';font-size:22px;color:' + T.mint + ';text-align:center;padding:6px 0;min-height:32px;';
    pinPrompt.textContent = '';
    _pinPromptEl = pinPrompt;
    right.appendChild(pinPrompt);

    right.appendChild(buildNumpad({
      maxDigits: 6,
      masked: true,
      onSubmit: function(pin) { handlePinSubmit(pin, pinPrompt); },
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

var _pinPromptEl = null;

var actionLabels = {
  'quick-service': 'Quick Service',
  'clock': 'Clock In/Out',
  'reporting': 'Reporting',
  'configuration': 'Configurations',
};

function handleAction(action) {
  selectedAction = action;
  setTimeout(function() { highlightButton(action); }, 0);
  if (_pinPromptEl) {
    _pinPromptEl.textContent = 'Enter PIN for ' + (actionLabels[action] || action);
    _pinPromptEl.style.color = T.mint;
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
  var role = emp.role || 'server';
  var base = { pin: pin, employeeId: emp.id, employeeName: emp.name, role: role };

  switch (action) {
    case 'quick-service': push('order-entry', { mode: 'service', pin: pin, employeeId: emp.id, employeeName: emp.name }); break;
    case 'clock':         break;
    case 'reporting':     push('reporting', base); break;
    case 'configuration':
      if (role !== 'manager') {
        if (promptEl || _pinPromptEl) {
          var el = promptEl || _pinPromptEl;
          el.textContent = 'Manager access only';
          el.style.color = T.red;
        }
        return;
      }
      push('settings', { pin: pin });
      break;
  }
}
