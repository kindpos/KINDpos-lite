// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  PIN entry → Gate layer → closes gate on success
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildButton } from '../components.js';
import { buildNumpad } from '../numpad.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var employees = [];
var _numpadRef = null;
var _clockInMode = false;

SceneManager.register({
  name: 'login',

  mount: function(container, params) {
    setSceneName(null);
    setHeaderBack();
    _numpadRef = null;
    _clockInMode = false;

    fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
      employees = data.servers || [];
    }).catch(function() { employees = []; });

    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;background:' + T.bg + ';';

    // CENTER — numpad
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
      chassisChamfer: 6,
      chassisBevel: 5,
      digitColor: T.digitColor,
      clearColor: T.clrColor,
      submitColor: T.submitColor,
      displayColor: T.pinDot,
      displayBg: T.pinFieldBg,
      chassisColor: T.numpadChassis,
      maskChar: '\u25C6',
      digitFont: T.fhr,
      onSubmit: function(pin) { handlePinSubmit(pin); },
    });
    container.appendChild(_numpadRef);

    // CONFIGURATION button — bottom-left
    var configBtn = buildButton('CONFIGURATION', {
      fill: T.gold, color: T.bgDark, fontSize: T.fsBtnSm, fontFamily: T.fb,
      width: 220, height: 48,
      onTap: function() { SceneManager.openTransactional('settings'); },
    });
    configBtn.style.position = 'absolute';
    configBtn.style.bottom = '8px';
    configBtn.style.left = '12px';
    container.appendChild(configBtn);

    // CLOCK IN button — bottom-right
    var clockInBtn = buildButton('CLOCK IN', {
      fill: T.goGreen, color: T.bgDark, fontSize: T.fsBtnSm, fontFamily: T.fb,
      width: 220, height: 48,
      onTap: function() {
        _clockInMode = !_clockInMode;
        clockInBtn.style.outline = _clockInMode ? '2px solid ' + T.mint : 'none';
        configBtn.style.outline = 'none';
        if (_clockInMode && _numpadRef) _numpadRef.clear();
      },
    });
    clockInBtn.style.position = 'absolute';
    clockInBtn.style.bottom = '8px';
    clockInBtn.style.right = '12px';
    container.appendChild(clockInBtn);

    // Version stamp — bottom-center
    var version = document.createElement('div');
    version.style.cssText = 'font-family:' + T.fb + ';font-size:25px;color:' + T.numpadChassis + ';position:absolute;bottom:4px;left:50%;transform:translateX(-50%);';
    version.textContent = 'KINDpos/lite_Vz1.2';
    container.appendChild(version);
  },

  unmount: function() {
    _numpadRef = null;
  },
});

function handlePinSubmit(pin) {
  var emp = employees.find(function(e) { return e.pin === pin; });
  if (!emp) {
    if (_numpadRef) _numpadRef.setError('Invalid PIN');
    return;
  }

  var empRoles = emp.roles || [emp.role || 'server'];
  var empData = { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles };

  SceneManager.closeGate('login');
  SceneManager.mountWorking('landing', { emp: empData });

  if (_clockInMode) {
    SceneManager.openTransactional('clock-in', { emp: empData });
    _clockInMode = false;
  }
}
