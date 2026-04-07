// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  PIN entry → push to Landing dashboard
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildNumpad } from '../numpad.js';
import { registerScene, push } from '../scene-manager.js';
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

    el.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;';

    // PIN prompt
    var pinPrompt = document.createElement('div');
    pinPrompt.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';text-align:center;padding:2px 0;min-height:26px;';
    pinPrompt.textContent = 'Enter PIN';
    _pinPromptEl = pinPrompt;
    el.appendChild(pinPrompt);

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
    el.appendChild(_numpadRef);

    // Version label at bottom
    var version = document.createElement('div');
    version.style.cssText = 'font-family:' + T.fb + ';font-size:30px;padding:12px 0 0;';
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

  // Valid PIN — navigate to landing dashboard
  var empRoles = emp.roles || [emp.role || 'server'];
  push('landing', { emp: { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles } });
}
