// ═══════════════════════════════════════════════════
//  KINDpos Terminal — App Entry
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { init, push, pop, replace, onBeforeTransition, clearSceneCache } from './scene-manager.js';
import { T, buildStyledButton } from './tokens.js';
import { showToast } from './components.js';
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
import './scenes/sales-summary.js';
import './scenes/landing.js';

window._push = push;
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
    const backPair = buildStyledButton(T.red);
    backPair.wrap.style.height = '40px';
    backPair.wrap.style.width = '72px';
    backPair.inner.style.fontFamily = T.fb;
    backPair.inner.style.fontSize = T.fsBtnSm;
    backPair.inner.style.color = '#fff';
    backPair.inner.textContent = '<<<';
    backPair.wrap.addEventListener('pointerup', onBack || (() => pop()));
    nav.appendChild(backPair.wrap);
  } else if (nav) {
    nav.style.display = 'none';
  }

  // X  logout / reset button
  if (x && logout) {
    logout.style.display = 'flex';
    const logoutPair = buildStyledButton(T.red);
    logoutPair.wrap.style.height = '40px';
    logoutPair.wrap.style.width = '47px';
    logoutPair.inner.style.fontFamily = T.fb;
    logoutPair.inner.style.fontSize = T.fsBtnSm;
    logoutPair.inner.style.color = '#fff';
    logoutPair.inner.textContent = 'X';
    logoutPair.wrap.addEventListener('pointerup', onClose || (() => { clearSceneCache('order-entry'); replace('login'); }));
    logout.appendChild(logoutPair.wrap);
  } else if (logout) {
    logout.style.display = 'none';
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

  // ── Print failure monitor ─────────────────────────
  startPrintFailureMonitor();
});

// ── Print failure monitor ─────────────────────
let _printFailBanner = null;
let _knownFailedIds = new Set();

function startPrintFailureMonitor() {
  setInterval(pollPrintFailures, 10000);
}

function pollPrintFailures() {
  fetch('/api/v1/print/queue')
    .then(r => r.json())
    .then(data => {
      const failed = data.failed || [];
      if (failed.length > 0) {
        // Check for newly failed jobs to show toast
        for (const job of failed) {
          if (!_knownFailedIds.has(job.job_id)) {
            _knownFailedIds.add(job.job_id);
            const tpl = job.template_id || '';
            const label = tpl.includes('kitchen') ? 'Kitchen ticket' : 'Receipt';
            showToast(label + ' print FAILED — check printer', { bg: '#da331c', duration: 6000 });
          }
        }
        showPrintFailBanner(failed.length);
      } else {
        _knownFailedIds.clear();
        hidePrintFailBanner();
      }
    })
    .catch(() => {}); // silent on network errors
}

function showPrintFailBanner(count) {
  if (!_printFailBanner) {
    _printFailBanner = document.createElement('div');
    _printFailBanner.style.cssText = [
      'position:fixed;top:0;left:0;right:0;height:32px;',
      'display:flex;align-items:center;justify-content:center;gap:12px;',
      'background:#da331c;color:#fff;z-index:10000;cursor:pointer;',
      'font-family:Sevastopol Interface, monospace;font-size:20px;',
    ].join('');
    _printFailBanner.addEventListener('pointerup', () => {
      // Retry all failed jobs
      fetch('/api/v1/print/queue').then(r => r.json()).then(data => {
        (data.failed || []).forEach(job => {
          fetch('/api/v1/print/queue/' + job.job_id + '/retry', { method: 'POST' });
        });
        _knownFailedIds.clear();
        hidePrintFailBanner();
        showToast('Retrying failed prints...', { bg: '#7ac943', duration: 3000 });
      });
    });
    document.body.appendChild(_printFailBanner);
  }
  _printFailBanner.textContent = '\u26A0 ' + count + ' print job' + (count > 1 ? 's' : '') + ' FAILED — tap to retry';
  _printFailBanner.style.display = 'flex';
}

function hidePrintFailBanner() {
  if (_printFailBanner) {
    _printFailBanner.style.display = 'none';
  }
}

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