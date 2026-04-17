// ═══════════════════════════════════════════════════
//  KINDpos Terminal — App Entry
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { SceneManager } from './scene-manager.js';
import { T, buildStyledButton } from './tokens.js';
import { hideKeyboard } from './keyboard.js';
import { showToast } from './components.js';
import { OrderSummary } from './order-summary.js';
import { applyActiveTheme } from './themes/index.js';

// Apply the saved active theme as early as possible so scenes mount
// against the right token values. Failing to apply just leaves
// Terminal Glow in place.
try { applyActiveTheme(); } catch (e) { console.warn('[Theme] apply failed', e); }

// Import scenes (self-registering)
import './scenes/login.js?v=1';
import './scenes/settings.js?v=1';
import './scenes/order-entry.js?v=5';
import './scenes/payment-console.js?v=1';
import './scenes/manager-landing-sm2.js?v=1';
import './scenes/checkout-core.js?v=1';
import './scenes/server-checkout.js?v=1';
import './scenes/close-day.js?v=1';
import './scenes/server-landing-sm2.js?v=1';
import './scenes/clock-in.js?v=1';

// ── Header state ──────────────────────────────────
let _sceneName = null;
let _currentHeaderArgs = { back: false, x: false, onBack: null, onClose: null };
const _headerStack = [];

export function setSceneName(name) {
  _sceneName = name;
  updateClock();
}

export function setHeaderBack(args = {}) {
  _currentHeaderArgs = {
    back: !!args.back,
    x: !!args.x,
    onBack: args.onBack || null,
    onClose: args.onClose || null,
  };
  _applyHeaderBack(_currentHeaderArgs);
}

// Save the current header so a transactional can temporarily override it
// and restoreHeaderSnapshot() brings it back on close. Prevents stale
// back-button closures pointing at already-closed transactionals.
export function pushHeaderSnapshot() {
  _headerStack.push({ ..._currentHeaderArgs });
}

export function popHeaderSnapshot() {
  const prev = _headerStack.pop();
  if (prev !== undefined) {
    _currentHeaderArgs = prev;
    _applyHeaderBack(_currentHeaderArgs);
  }
}

function _applyHeaderBack({ back = false, x = false, onBack = null, onClose = null } = {}) {
  const nav = document.getElementById('header-nav');
  const logout = document.getElementById('header-logout');
  if (nav) nav.innerHTML = '';
  if (logout) logout.innerHTML = '';

  // <<<  back button
  if (back && nav) {
    nav.style.display = 'flex';
    nav.style.gap = '8px';
    nav.style.alignItems = 'center';
    const backPair = buildStyledButton(T.darkBtn);
    backPair.wrap.style.height = '40px';
    backPair.wrap.style.width = '72px';
    backPair.inner.style.fontFamily = T.fb;
    backPair.inner.style.fontSize = T.fsBtnSm;
    backPair.inner.style.color = T.mint;
    backPair.inner.textContent = '<<<';
    backPair.wrap.addEventListener('pointerup', onBack || function() { /* scenes handle their own back */ });
    nav.appendChild(backPair.wrap);
  } else if (nav) {
    nav.style.display = 'none';
  }

  // X  logout / reset button
  if (x && logout) {
    logout.style.display = 'flex';
    const logoutPair = buildStyledButton({ label: 'X', variant: 'vermillion', size: 'sm' });
    logoutPair.wrap.style.height = '40px';
    logoutPair.wrap.style.width = '40px';
    logoutPair.wrap.style.minWidth = '40px';
    logoutPair.wrap.addEventListener('pointerup', onClose || function() {
      SceneManager.closeAllTransactional();
      SceneManager.unmountWorking(SceneManager.getActiveWorking());
      OrderSummary.hide();
      SceneManager.openGate('login');
    });
    logout.appendChild(logoutPair.wrap);
  } else if (logout) {
    logout.style.display = 'none';
  }
}

// ── Boot ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  SceneManager.init();
  SceneManager.onBeforeTransition(hideKeyboard);

  SceneManager.on('transactional:opening', pushHeaderSnapshot);
  SceneManager.on('transactional:closed', popHeaderSnapshot);

  // Open login gate on boot
  SceneManager.openGate('login');

  // Hide order summary on boot (login gate is up)
  OrderSummary.hide();

  // Console testing utility — allows manual scene navigation from devtools
  window._push = function(sceneName, params) { SceneManager.mountWorking(sceneName, params); };

  updateClock();
  setInterval(updateClock, 30000);

  // ── Print failure SSE listener ───────────────────
  try {
    const es = new EventSource('/api/v1/print/failures/stream');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const label = data.template_id === 'kitchen_ticket' ? 'Kitchen ticket' : 'Receipt';
        showToast(label + ' print failed — check printer', { bg: T.red, duration: 5000 });
      } catch (_) { /* ignore parse errors */ }
    };
  } catch (_) { /* SSE not critical */ }
});

// ── Clock ─────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('header-clock');
  if (!el) return;
  const now = new Date();
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const dd  = String(now.getDate()).padStart(2, '0');
  const yy  = String(now.getFullYear()).slice(2);
  let h     = now.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const min = String(now.getMinutes()).padStart(2, '0');
  const time = `${mm}/${dd}/${yy} || ${h}:${min}${ampm}`;
  el.textContent = _sceneName ? `${time} // ${_sceneName}` : time;
}
