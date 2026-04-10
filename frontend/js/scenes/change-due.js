// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Change Due Scene
//  Interrupt-style screen with Confirm + Logout
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, applySunkenStyle } from '../tokens.js';
import { buildButton } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { OrderSummary } from '../order-summary.js';

var returned = false;
var sceneEl  = null;

SceneManager.register({
  name: 'change-due',

  mount: function(el, params) {
    params = params || {};
    sceneEl = el;
    setSceneName(null);
    setHeaderBack({});  // no back/X — must use buttons
    returned = false;

    el.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;',
      'gap:0;',
      'background:rgba(0,0,0,0.85);',
    ].join('');

    var isCash    = params.paymentMode === 'cash';
    var hasChange = isCash && params.change > 0;

    // ── Interrupt card ──────────────────────────────
    var card = document.createElement('div');
    card.style.cssText = [
      'display:flex;flex-direction:column;align-items:center;',
      'padding:32px 64px 28px;',
      'background:' + T.bgDark + ';',
      'min-width:480px;',
    ].join('');
    applySunkenStyle(card);

    // Top label
    var topLabel = document.createElement('div');
    topLabel.style.cssText = [
      'font-family:' + T.fh + ';font-size:32px;letter-spacing:0.18em;',
      'color:' + T.mint + ';margin-bottom:20px;',
    ].join('');
    topLabel.textContent = isCash ? 'CASH PAYMENT' : 'CARD PAYMENT';
    card.appendChild(topLabel);

    if (hasChange) {
      var changeLabel = document.createElement('div');
      changeLabel.style.cssText = [
        'font-family:' + T.fh + ';font-size:' + T.fsBtn + ';letter-spacing:0.14em;',
        'color:' + T.mint + ';margin-bottom:4px;',
      ].join('');
      changeLabel.textContent = 'CHANGE DUE';
      card.appendChild(changeLabel);

      var changeAmount = document.createElement('div');
      changeAmount.style.cssText = [
        'font-family:' + T.fb + ';font-size:96px;font-weight:bold;',
        'color:' + T.gold + ';line-height:1;letter-spacing:0.02em;',
      ].join('');
      changeAmount.textContent = '$' + params.change.toFixed(2);
      card.appendChild(changeAmount);
    } else {
      var paidLabel = document.createElement('div');
      paidLabel.style.cssText = [
        'font-family:' + T.fh + ';font-size:40px;font-weight:bold;letter-spacing:0.1em;',
        'color:' + T.mint + ';margin-bottom:8px;',
      ].join('');
      paidLabel.textContent = isCash ? 'EXACT CHANGE' : 'PAYMENT APPROVED';
      card.appendChild(paidLabel);
    }

    // Charged amount sub-line
    var chargedLine = document.createElement('div');
    chargedLine.style.cssText = [
      'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';',
      'margin-top:12px;letter-spacing:0.06em;',
    ].join('');
    chargedLine.textContent = (isCash ? 'Cash price: ' : 'Charged: ') + '$' + params.total.toFixed(2);
    card.appendChild(chargedLine);

    // Receipt printing indicator
    var printLine = document.createElement('div');
    printLine.style.cssText = [
      'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';',
      'letter-spacing:0.12em;margin-top:16px;',
    ].join('');
    printLine.textContent = 'RECEIPT PRINTING...';
    card.appendChild(printLine);

    el.appendChild(card);

    // ── Button row ────────────────────────────────
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:20px;margin-top:24px;';

    var postAction = (window.KINDpos && window.KINDpos.postPaymentAction) || 'quick-service';

    // New Order button
    var confirmBtn = buildButton('NEW ORDER', {
      fill: T.darkBtn, color: T.mint, fontSize: '32px',
      width: 220, height: 64,
      onTap: function() { doReturn('order-entry'); },
    });
    btnRow.appendChild(confirmBtn);

    // Logout button
    var logoutBtn = buildButton('LOGOUT', {
      fill: T.darkBtn, color: T.mint, fontSize: '32px',
      width: 220, height: 64,
      onTap: function() { doReturn('login'); },
    });
    btnRow.appendChild(logoutBtn);

    el.appendChild(btnRow);

    // Auto-logout countdown if configured
    if (postAction === 'logout') {
      var autoHint = document.createElement('div');
      autoHint.style.cssText = [
        'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';',
        'letter-spacing:0.1em;margin-top:12px;',
      ].join('');
      autoHint.textContent = 'auto-logout in 8s...';
      el.appendChild(autoHint);

      var countdown = 8;
      el._countdownTimer = setInterval(function() {
        countdown--;
        if (countdown <= 0) {
          clearInterval(el._countdownTimer);
          doReturn('login');
        } else {
          autoHint.textContent = 'auto-logout in ' + countdown + 's...';
        }
      }, 1000);
    }
  },

  unmount: function() {
    if (sceneEl && sceneEl._countdownTimer) {
      clearInterval(sceneEl._countdownTimer);
      sceneEl._countdownTimer = null;
    }
  },
});

function doReturn(target) {
  if (returned) return;
  returned = true;
  if (sceneEl && sceneEl._countdownTimer) {
    clearInterval(sceneEl._countdownTimer);
    sceneEl._countdownTimer = null;
  }
  SceneManager.closeAllTransactional();
  OrderSummary.hide();
  if (target === 'login') {
    SceneManager.unmountWorking(SceneManager.getActiveWorking());
    SceneManager.openGate('login');
  } else {
    SceneManager.mountWorking('order-entry', {});
  }
}
