// ═══════════════════════════════════════════════════
//  KINDpos Terminal — App Entry
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { init, push, pop, replace, onBeforeTransition } from './scene-manager.js';
import { T, buildStyledButton } from './tokens.js';
import { hideKeyboard } from './keyboard.js';

// Import scenes (self-registering)
import './scenes/login.js';
import './scenes/settings.js';
import './scenes/order-entry.js?v=5';
import './scenes/receipt-review.js';
import './scenes/payment.js';
import './scenes/change-due.js';
import './scenes/tip-adjustment.js';
import './scenes/reporting.js';
import './scenes/server-checkout.js';
import './scenes/close-day.js';

window._push = push;
// ── Header state ──────────────────────────────────
let _sceneName = null;

export function setSceneName(name) {
  _sceneName = name;
  updateClock();
}

export function setHeaderBack(show) {
  const nav = document.getElementById('header-nav');
  const logout = document.getElementById('header-logout');
  if (nav) nav.innerHTML = '';
  if (logout) logout.innerHTML = '';

  if (show) {
    if (nav) {
      nav.style.display = 'flex';
      nav.style.gap = '8px';
      nav.style.alignItems = 'center';

      // <<<  back button
      const backPair = buildStyledButton(T.red);
      backPair.wrap.style.height = '44px';
      backPair.wrap.style.width = '80px';
      backPair.inner.style.fontFamily = T.fb;
      backPair.inner.style.fontSize = '32px';
      backPair.inner.style.color = '#fff';
      backPair.inner.textContent = '<<<';
      backPair.wrap.addEventListener('pointerup', () => pop());
      nav.appendChild(backPair.wrap);
    }

    // X  logout / reset button — far right of header
    if (logout) {
      logout.style.display = 'flex';
      const logoutPair = buildStyledButton(T.red);
      logoutPair.wrap.style.height = '44px';
      logoutPair.wrap.style.width = '52px';
      logoutPair.inner.style.fontFamily = T.fb;
      logoutPair.inner.style.fontSize = '32px';
      logoutPair.inner.style.color = '#fff';
      logoutPair.inner.textContent = 'X';
      logoutPair.wrap.addEventListener('pointerup', () => replace('login'));
      logout.appendChild(logoutPair.wrap);
    }
  } else {
    if (nav) nav.style.display = 'none';
    if (logout) logout.style.display = 'none';
  }
}

// ── Boot ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init({
    sceneContainer:     document.getElementById('scene-container'),
    overlayContainer:   document.getElementById('overlay-container'),
    interruptContainer: document.getElementById('interrupt-container'),
    onDiagnostic: null,
  });

  onBeforeTransition(hideKeyboard);

  push('login');

  updateClock();
  setInterval(updateClock, 30000);
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
  const time = `${mm}/${dd}/${yy} <> ${h}:${min}${ampm}`;
  el.textContent = _sceneName ? `${time} // ${_sceneName}` : time;
}