// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Change Due Scene
//  Full-screen change display → auto-return to order
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, applySunkenStyle } from '../tokens.js';
import { registerScene, replace } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var AUTO_RETURN_MS = 4000;
var returnTimer    = null;

registerScene('change-due', {
  onEnter: function(el, params) {
    setSceneName(null);
    setHeaderBack(false);

    // params shape:
    // {
    //   change:      number,   // 0 for card or exact cash
    //   paymentMode: 'cash' | 'card',
    //   total:       number,   // amount charged
    //   returnScene: 'order-entry' | 'check-grid',
    // }

    el.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;',
      'gap:0;cursor:pointer;',
      'background:' + T.bg + ';',
    ].join('');

    // Tap anywhere to dismiss early
    el.addEventListener('pointerup', function() {
      doReturn(params.returnScene);
    });

    var isCash   = params.paymentMode === 'cash';
    var hasChange = isCash && params.change > 0;

    // ── Top label ────────────────────────────────
    var topLabel = document.createElement('div');
    topLabel.style.cssText = [
      'font-family:' + T.fh + ';font-size:30px;letter-spacing:0.18em;',
      'color:' + T.mint + ';margin-bottom:24px;',
    ].join('');
    topLabel.textContent = isCash ? 'CASH PAYMENT' : 'CARD PAYMENT';
    el.appendChild(topLabel);

    // ── Main amount block ─────────────────────────
    var amountBlock = document.createElement('div');
    amountBlock.style.cssText = [
      'display:flex;flex-direction:column;align-items:center;',
      'padding:40px 80px;',
      'background:' + T.bgDark + ';',
    ].join('');
    applySunkenStyle(amountBlock);

    if (hasChange) {
      // Change due label
      var changeLabel = document.createElement('div');
      changeLabel.style.cssText = [
        'font-family:' + T.fh + ';font-size:32px;letter-spacing:0.14em;',
        'color:' + T.mint + ';margin-bottom:8px;',
      ].join('');
      changeLabel.textContent = 'CHANGE DUE';
      amountBlock.appendChild(changeLabel);

      // Change amount — big cyan
      var changeAmount = document.createElement('div');
      changeAmount.style.cssText = [
        'font-family:' + T.fb + ';font-size:96px;font-weight:bold;',
        'color:' + T.cyan + ';line-height:1;letter-spacing:0.02em;',
      ].join('');
      changeAmount.textContent = '$' + params.change.toFixed(2);
      amountBlock.appendChild(changeAmount);

    } else {
      // No change — paid exact or card
      var paidIcon = document.createElement('div');
      paidIcon.style.cssText = 'font-size:64px;margin-bottom:16px;';
      paidIcon.textContent = isCash ? '$' : '◈';
      amountBlock.appendChild(paidIcon);

      var paidLabel = document.createElement('div');
      paidLabel.style.cssText = [
        'font-family:' + T.fh + ';font-size:36px;font-weight:bold;letter-spacing:0.1em;',
        'color:' + T.mint + ';',
      ].join('');
      paidLabel.textContent = isCash ? 'EXACT CHANGE' : 'PAYMENT APPROVED';
      amountBlock.appendChild(paidLabel);
    }

    // Charged amount sub-line
    var chargedLine = document.createElement('div');
    chargedLine.style.cssText = [
      'font-family:' + T.fb + ';font-size:30px;color:' + T.mint + ';',
      'margin-top:16px;letter-spacing:0.06em;',
    ].join('');
    chargedLine.textContent = (isCash ? 'Cash price: ' : 'Charged: ') + '$' + params.total.toFixed(2);
    amountBlock.appendChild(chargedLine);

    el.appendChild(amountBlock);

    // ── Receipt printing indicator ────────────────
    var printLine = document.createElement('div');
    printLine.style.cssText = [
      'font-family:' + T.fb + ';font-size:30px;color:' + T.mint + ';',
      'letter-spacing:0.12em;margin-top:32px;',
    ].join('');
    printLine.textContent = 'RECEIPT PRINTING...';
    el.appendChild(printLine);

    // ── Progress bar ──────────────────────────────
    var progressTrack = document.createElement('div');
    progressTrack.style.cssText = [
      'width:320px;height:4px;margin-top:20px;',
      'background:' + T.bg3 + ';',
      'clip-path:' + chamfer(2) + ';',
    ].join('');

    var progressFill = document.createElement('div');
    progressFill.style.cssText = [
      'height:100%;width:0%;',
      'background:' + T.mint + ';',
      'transition:width ' + AUTO_RETURN_MS + 'ms linear;',
    ].join('');
    progressTrack.appendChild(progressFill);
    el.appendChild(progressTrack);

    // ── Tap to dismiss hint ───────────────────────
    var hint = document.createElement('div');
    hint.style.cssText = [
      'font-family:' + T.fb + ';font-size:30px;color:' + T.mutedText + ';',
      'letter-spacing:0.1em;margin-top:12px;',
    ].join('');
    hint.textContent = 'tap anywhere to continue';
    el.appendChild(hint);

    // Kick off progress bar animation
    requestAnimationFrame(function() {
      progressFill.style.width = '100%';
    });

    // Auto-return timer
    returnTimer = setTimeout(function() {
      doReturn(params.returnScene);
    }, AUTO_RETURN_MS);
  },

  onExit: function() {
    if (returnTimer) {
      clearTimeout(returnTimer);
      returnTimer = null;
    }
  },
});

function doReturn(returnScene) {
  if (returnTimer) {
    clearTimeout(returnTimer);
    returnTimer = null;
  }
  // replace so back button can't return to change-due screen
  replace(returnScene || 'order-entry', {});
}