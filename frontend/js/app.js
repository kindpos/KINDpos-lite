// ═══════════════════════════════════════════════════
//  KINDpos Terminal — App Entry
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { init, push, pop } from './scene-manager.js';
import { T, buildStyledButton } from './tokens.js';

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
  const el = document.getElementById('header-info');
  if (!el) return;
  el.innerHTML = '';
  if (show) {
    const pair = buildStyledButton(T.red);
    pair.wrap.style.height = '44px';
    pair.wrap.style.width = '80px';
    pair.inner.style.fontFamily = T.fb;
    pair.inner.style.fontSize = '32px';
    pair.inner.style.color = '#fff';
    pair.inner.textContent = '<<<';
    pair.wrap.addEventListener('pointerup', () => pop());
    el.appendChild(pair.wrap);
  } else {
    el.textContent = 'KINDpos/lite <> Vz1.0';
  }
}

// ── Boot ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init({
    sceneContainer:     document.getElementById('scene-container'),
    overlayContainer:   document.getElementById('overlay-container'),
    interruptContainer: document.getElementById('interrupt-container'),
    onDiagnostic: (evt) => {
      console.log(`[DIAG] ${evt.type}`, evt);
    },
  });

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