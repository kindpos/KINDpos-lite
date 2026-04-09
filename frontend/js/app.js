// ═══════════════════════════════════════════════════
//  KINDpos Terminal — App Entry
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { SceneManager } from './scene-manager.js';
import { T, buildStyledButton } from './tokens.js';
import { hideKeyboard } from './keyboard.js';
import { showToast } from './components.js';

// Import scenes (self-registering)
import './scenes/login.js?v=2';
import './scenes/settings.js?v=6';
import './scenes/order-entry.js?v=7';
import './scenes/receipt-review.js?v=2';
import './scenes/payment.js?v=2';
import './scenes/change-due.js?v=2';
import './scenes/tip-adjustment.js?v=3';
import './scenes/reporting.js?v=2';
import './scenes/server-checkout.js?v=2';
import './scenes/close-day.js?v=2';
import './scenes/sales-summary.js?v=2';
import './scenes/landing.js?v=2';
import './scenes/server-landing.js?v=2';
import './scenes/clock-in.js?v=2';
import './scenes/manager-landing.js?v=2';

// ── Header state ──────────────────────────────────
let _sceneName = null;

export function setSceneName(name) {
  _sceneName = name;
  updateClock();
}

export function setHeaderBack({ back = false, x = false, onBack = null, onClose = null } = {}) {
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
    const logoutPair = buildStyledButton(T.darkBtn);
    logoutPair.wrap.style.height = '40px';
    logoutPair.wrap.style.width = '47px';
    logoutPair.inner.style.fontFamily = T.fb;
    logoutPair.inner.style.fontSize = T.fsBtnSm;
    logoutPair.inner.style.color = T.mint;
    logoutPair.inner.textContent = 'X';
    logoutPair.wrap.addEventListener('pointerup', onClose || function() {
      SceneManager.closeAllTransactional();
      SceneManager.unmountWorking(SceneManager.getActiveWorking());
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

  // Open login gate on boot
  SceneManager.openGate('login');

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
