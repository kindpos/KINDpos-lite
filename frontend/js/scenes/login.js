// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Login Scene (SM2)
//  PIN entry → Gate layer → closes gate on success
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton } from '../tokens.js';
import { buildNumpad } from '../numpad.js';
import { SceneManager } from '../scene-manager.js';
import { defineScene } from '../scene-manager-2.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── Constants (immutable — no state reset needed) ──
var ROLE_LANDING_MAP = [
  { role: 'manager',    scene: 'manager-landing' },
  { role: 'bartender',  scene: 'server-landing'  },
  { role: 'host',       scene: 'server-landing'  },
  { role: 'server',     scene: 'server-landing'  },
];

function landingScene(empRoles) {
  for (var i = 0; i < ROLE_LANDING_MAP.length; i++) {
    if (empRoles.indexOf(ROLE_LANDING_MAP[i].role) !== -1) {
      return ROLE_LANDING_MAP[i].scene;
    }
  }
  return 'server-landing';
}

// ═══════════════════════════════════════════════════

defineScene({
  name: 'login',

  state: {
    employees: [],
    numpadRef: null,
    clockInMode: false,
    lastValidEmp: null,
  },

  render: function(container, params, state) {
    setSceneName(null);
    setHeaderBack();

    fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
      state.employees = data.servers || [];
    }).catch(function() { state.employees = []; });

    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:space-evenly;position:relative;background:' + T.bg + ';';

    // LEFT — CONFIGURATION button
    var configPair = buildStyledButton({ label: 'CONFIGURATION', variant: 'dark', size: 'md', onClick: function() { SceneManager.openTransactional('settings'); } });
    configPair.wrap.style.marginTop = '76px';
    container.appendChild(configPair.wrap);

    // CENTER — numpad
    var maskSetting = window.KINDpos && window.KINDpos.maskPinDigits !== undefined
      ? window.KINDpos.maskPinDigits : true;
    state.numpadRef = buildNumpad({
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
    container.appendChild(state.numpadRef);

    // RIGHT — CLOCK IN button
    var clockInPair = buildStyledButton({ label: 'CLOCK IN', variant: 'dark', size: 'md', onClick: function() {
      var currentPin = state.numpadRef ? state.numpadRef.getPin() : '';
      if (currentPin.length > 0) {
        var emp = state.employees.find(function(e) { return e.pin === currentPin; });
        if (!emp) {
          if (state.numpadRef) state.numpadRef.setError('Invalid PIN');
          return;
        }
        var empRoles = emp.roles || [emp.role || 'server'];
        var empData = { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles };
        SceneManager.closeGate('login');
        SceneManager.mountWorking(landingScene(empRoles), { emp: empData });
        SceneManager.openTransactional('clock-in', { emp: empData });
        return;
      }
      state.clockInMode = !state.clockInMode;
      if (state.clockInMode && state.numpadRef) state.numpadRef.clear();
    } });
    clockInPair.wrap.style.marginTop = '76px';
    container.appendChild(clockInPair.wrap);

    // Version stamp — bottom-right
    var version = document.createElement('div');
    version.style.cssText = 'font-family:' + T.fb + ';font-size:25px;color:' + T.numpadChassis + ';position:absolute;bottom:4px;right:12px;';
    version.textContent = 'KINDpos/lite_Vz1.2';
    container.appendChild(version);

    // ── PIN submit handler (closes over state) ──
    function handlePinSubmit(pin) {
      var emp = state.employees.find(function(e) { return e.pin === pin; });
      if (!emp) {
        if (state.numpadRef) state.numpadRef.setError('Invalid PIN');
        return;
      }

      var empRoles = emp.roles || [emp.role || 'server'];
      var empData = { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles };

      if (state.clockInMode) {
        SceneManager.closeGate('login');
        SceneManager.mountWorking(landingScene(empRoles), { emp: empData });
        SceneManager.openTransactional('clock-in', { emp: empData });
      } else {
        state.lastValidEmp = empData;
        SceneManager.closeGate('login');
        SceneManager.mountWorking(landingScene(empRoles), { emp: empData });
      }
    }
  },

  // No unmount needed — state auto-resets via SM2
});
