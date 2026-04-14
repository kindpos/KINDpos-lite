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

    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:24px;position:relative;background:' + T.bg + ';padding:0 20px;';

    // ── LEFT COLUMN — Logo + store name ─────
    var leftCol = document.createElement('div');
    leftCol.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;align-self:stretch;justify-content:center;';

    // Logo + store name — vertically centered
    var brandCenter = document.createElement('div');
    brandCenter.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;';

    var logo = document.createElement('img');
    logo.src = '/assets/images/palm.jpg';
    logo.alt = 'Store logo';
    logo.style.cssText = 'max-width:220px;max-height:260px;object-fit:contain;';
    brandCenter.appendChild(logo);

    var storeName = document.createElement('div');
    storeName.style.cssText = 'font-family:' + T.fhr + ';font-size:22px;color:' + T.textPrimary + ';text-align:center;text-transform:uppercase;letter-spacing:2px;line-height:1.2;max-width:180px;word-wrap:break-word;';
    storeName.textContent = 'KINDpos';
    brandCenter.appendChild(storeName);

    // Fetch store name from API
    fetch('/api/v1/config/store').then(function(r) { return r.json(); }).then(function(data) {
      var name = (data.store && data.store.info && data.store.info.restaurant_name) || 'KINDpos';
      storeName.textContent = name;
    }).catch(function() {});

    leftCol.appendChild(brandCenter);

    container.appendChild(leftCol);

    // ── CENTER — numpad ────────────────────
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

    // ── RIGHT COLUMN — Timeclock + New Order, vertically centered ─────
    var rightCol = document.createElement('div');
    rightCol.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;align-self:stretch;justify-content:center;gap:16px;';

    var clockPair = buildStyledButton({ label: 'TIMECLOCK', variant: 'cyan', size: 'md', onClick: function() {
      var currentPin = state.numpadRef ? state.numpadRef.getPin() : '';
      if (currentPin.length === 0) {
        if (state.numpadRef) state.numpadRef.setHint('Enter PIN');
        return;
      }
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
    } });
    rightCol.appendChild(clockPair.wrap);

    var quickOrderPair = buildStyledButton({ label: 'NEW\nORDER', variant: 'mint', size: 'md', onClick: function() {
      var currentPin = state.numpadRef ? state.numpadRef.getPin() : '';
      if (currentPin.length === 0) {
        if (state.numpadRef) state.numpadRef.setHint('Enter PIN');
        return;
      }
      var emp = state.employees.find(function(e) { return e.pin === currentPin; });
      if (!emp) {
        if (state.numpadRef) state.numpadRef.setError('Invalid PIN');
        return;
      }
      var empRoles = emp.roles || [emp.role || 'server'];
      var empData = { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles };
      SceneManager.closeGate('login');
      SceneManager.mountWorking('order-entry', { emp: empData });
    } });
    rightCol.appendChild(quickOrderPair.wrap);

    // Config — small vermillion button, extra padding above
    var configPair = buildStyledButton({ label: 'TERMINAL\nCONFIGURATION', variant: 'vermillion', size: 'md', onClick: function() {
      if (state.numpadRef) state.numpadRef.clear();
      SceneManager.openTransactional('settings');
    } });
    configPair.wrap.style.marginTop = '52px';
    rightCol.appendChild(configPair.wrap);

    container.appendChild(rightCol);

    // Version stamp — bottom-right
    var version = document.createElement('div');
    version.style.cssText = 'font-family:' + T.fb + ';font-size:25px;color:' + T.numpadChassis + ';position:absolute;bottom:4px;right:12px;';
    version.textContent = 'KINDpos/lite_Vz1.2';
    container.appendChild(version);

    // ── PIN submit handler (closes over state) ──
    // >>> goes straight to landing — clock-in/out handled by dedicated buttons
    function handlePinSubmit(pin) {
      var emp = state.employees.find(function(e) { return e.pin === pin; });
      if (!emp) {
        if (state.numpadRef) state.numpadRef.setError('Invalid PIN');
        return;
      }

      var empRoles = emp.roles || [emp.role || 'server'];
      var empData = { id: emp.id, name: emp.name, pin: emp.pin, roles: empRoles };

      SceneManager.closeGate('login');
      SceneManager.mountWorking(landingScene(empRoles), { emp: empData });
    }
  },

  // No unmount needed — state auto-resets via SM2
});
