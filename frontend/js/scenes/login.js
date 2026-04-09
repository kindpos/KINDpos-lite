// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene
//  PIN entry → Gate layer → closes gate on success
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton } from '../tokens.js';
import { buildNumpad } from '../numpad.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var employees = [];
var _numpadRef = null;
var _clockInMode = false;
var _lastValidEmp = null;

SceneManager.register({
  name: 'login',

  mount: function(container, params) {
    setSceneName(null);
    setHeaderBack();
    _numpadRef = null;
    _clockInMode = false;
    _lastValidEmp = null;

    fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
      employees = data.servers || [];
    }).catch(function() { employees = []; });

    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:space-evenly;position:relative;background:' + T.bg + ';';

    // LEFT — CONFIGURATION button
    var configPair = buildStyledButton({ label: 'CONFIGURATION', variant: 'dark', size: 'md', onClick: function() { SceneManager.openTransactional('settings'); } });
    configPair.wrap.style.marginTop = '76px';
    container.appendChild(configPair.wrap);

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

    // RIGHT — CLOCK IN button
    var clockInPair = buildStyledButton({ label: 'CLOCK IN', variant: 'dark', size: 'md', onClick: function() {
      // If PIN already typed in the numpad, validate and clock in directly
      var currentPin = _numpadRef ? _numpadRef.getPin() : '';
      if (currentPin.length > 0) {
        var emp = employees.find(function(e) { return e.pin === currentPin; });
        if (!emp) {
          if (_numpadRef) _numpadRef.setError('Invalid PIN');
          return;
        }
        var empRoles = emp.roles || [emp.role || 'server'];
        var empData = { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles };
        _clockInMode = false;
        _lastValidEmp = null;
        SceneManager.closeGate('login');
        SceneManager.mountWorking(landingScene(empRoles), { emp: empData });
        SceneManager.openTransactional('clock-in', { emp: empData });
        return;
      }
      // No PIN yet — toggle clock-in mode so next >>> submit routes to clock-in
      _clockInMode = !_clockInMode;
      if (_clockInMode && _numpadRef) _numpadRef.clear();
    } });
    clockInPair.wrap.style.marginTop = '76px';
    container.appendChild(clockInPair.wrap);

    // Version stamp — bottom-right
    var version = document.createElement('div');
    version.style.cssText = 'font-family:' + T.fb + ';font-size:25px;color:' + T.numpadChassis + ';position:absolute;bottom:4px;right:12px;';
    version.textContent = 'KINDpos/lite_Vz1.2';
    container.appendChild(version);
  },

  unmount: function() {
    _numpadRef = null;
  },
});

function landingScene(empRoles) {
  return empRoles.indexOf('manager') !== -1 ? 'manager-landing' : 'server-landing';
}

function handlePinSubmit(pin) {
  var emp = employees.find(function(e) { return e.pin === pin; });
  if (!emp) {
    if (_numpadRef) _numpadRef.setError('Invalid PIN');
    return;
  }

  var empRoles = emp.roles || [emp.role || 'server'];
  var empData = { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles };

  if (_clockInMode) {
    // Clock-in mode active — go straight to clock-in
    _clockInMode = false;
    _lastValidEmp = null;
    SceneManager.closeGate('login');
    SceneManager.mountWorking(landingScene(empRoles), { emp: empData });
    SceneManager.openTransactional('clock-in', { emp: empData });
  } else {
    // Normal flow — store emp so CLOCK IN button can use it after
    _lastValidEmp = empData;
    SceneManager.closeGate('login');
    SceneManager.mountWorking(landingScene(empRoles), { emp: empData });
  }
}
