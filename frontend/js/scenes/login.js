// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  PIN entry → push to Landing dashboard
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildButton } from '../components.js';
import { buildNumpad } from '../numpad.js';
import { registerScene, push } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var employees = [];
var _numpadRef = null;

registerScene('login', {
  onEnter: function(el, params) {
    setSceneName(null);
    setHeaderBack();
    _numpadRef = null;

    fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
      employees = data.servers || [];
    }).catch(function() { employees = []; });

    el.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;';

    // CENTER — numpad only
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
      digitColor: T.gold,
      clearColor: T.red,
      submitColor: T.mint,
      onSubmit: function(pin) { handlePinSubmit(pin); },
    });
    el.appendChild(_numpadRef);

    // CONFIGURATION button — bottom-left
    var configBtn = buildButton('CONFIGURATION', {
      fill: T.gold, color: T.bgDark, fontSize: T.fsBtnSm, fontFamily: T.fb,
      width: 220, height: 48,
      onTap: function() { push('settings'); },
    });
    configBtn.style.position = 'absolute';
    configBtn.style.bottom = '8px';
    configBtn.style.left = '12px';
    el.appendChild(configBtn);

    // Version label — bottom-right
    var version = document.createElement('div');
    version.style.cssText = 'font-family:' + T.fb + ';font-size:30px;position:absolute;bottom:4px;right:12px;';
    var parts = [
      { text: 'KIND', color: T.gold, fontFamily: T.fh, fontSize: '28px' },
      { text: 'pos', color: T.red },
      { text: '/lite', color: T.gold },
      { text: '_', color: T.mint },
      { text: 'Vz', color: T.mint },
      { text: '1.2', color: T.gold },
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
  },
  timeoutMs: 0,
});

function handlePinSubmit(pin) {
  var emp = employees.find(function(e) { return e.pin === pin; });
  if (!emp) {
    if (_numpadRef) _numpadRef.setError('Invalid PIN');
    return;
  }

  // Valid PIN — navigate to landing dashboard
  var empRoles = emp.roles || [emp.role || 'server'];
  push('landing', { emp: { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles } });
}
