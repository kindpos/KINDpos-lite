// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Card Processing Overlay
//  Win98-style progress dialog for card payments
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer } from '../../tokens.js';
import { SceneManager } from '../../scene-manager.js';

// ── Shared state (used by showProcessingOverlay + scene) ──
var _procStatusEl = null;
var _procAnimTimer = null;

export function showProcessingOverlay(amount) {
  SceneManager.openTransactional('card-processing', { amount: amount });

  return {
    updateStatus: function(msg) { if (_procStatusEl) _procStatusEl.textContent = msg; },
    dismiss: function() {
      if (_procAnimTimer) clearInterval(_procAnimTimer);
      _procAnimTimer = null;
      _procStatusEl = null;
      SceneManager.closeTransactional('card-processing');
    },
  };
}


// ═══════════════════════════════════════════════════
//  INLINE SCENE: Card Processing Overlay
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'card-processing',

  mount: function(container, params) {
    params = params || {};
    var amount = params.amount || 0;
    var TOTAL_SEGS = 22;
    var segments = [];
    var segIdx = 0;
    var msgIdx = 0;

    var statusMessages = [
      'Connecting to terminal...',
      'Waiting for card...',
      'Reading card data...',
      'Contacting processor...',
      'Awaiting authorization...',
    ];

    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;';

    var frame = document.createElement('div');
    frame.style.cssText = 'background:' + T.gold + ';padding:7px;clip-path:' + chamfer(12) + ';filter:drop-shadow(4px 6px 0px rgba(0,0,0,0.7));';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:' + T.bg + ';width:420px;border-top:2px solid ' + T.bgLight + ';border-left:2px solid ' + T.bgLight + ';border-bottom:2px solid ' + T.bgEdge + ';border-right:2px solid ' + T.bgEdge + ';font-family:' + T.fb + ';';

    var titleBar = document.createElement('div');
    titleBar.style.cssText = 'background:linear-gradient(to right,' + T.bgDark + ',' + T.bg3 + ');padding:5px 8px;display:flex;align-items:center;gap:8px;';
    var icon = document.createElement('div');
    icon.style.cssText = 'width:24px;height:24px;background:' + T.gold + ';display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:bold;color:' + T.bgDark + ';clip-path:' + chamfer(3) + ';';
    icon.textContent = '\u25C8';
    var titleText = document.createElement('span');
    titleText.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';font-weight:bold;letter-spacing:0.05em;';
    titleText.textContent = 'Card Payment \u2014 $' + amount.toFixed(2);
    titleBar.appendChild(icon);
    titleBar.appendChild(titleText);
    dialog.appendChild(titleBar);

    var body = document.createElement('div');
    body.style.cssText = 'padding:16px 20px 14px;display:flex;flex-direction:column;gap:10px;';

    _procStatusEl = document.createElement('div');
    _procStatusEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';min-height:24px;';
    _procStatusEl.textContent = statusMessages[0];
    body.appendChild(_procStatusEl);

    var progContainer = document.createElement('div');
    progContainer.style.cssText = 'border-top:2px solid ' + T.bgEdge + ';border-left:2px solid ' + T.bgEdge + ';border-bottom:2px solid ' + T.bgLight + ';border-right:2px solid ' + T.bgLight + ';height:26px;background:' + T.bgDark + ';padding:3px;overflow:hidden;';
    var progFill = document.createElement('div');
    progFill.style.cssText = 'height:100%;display:flex;gap:2px;align-items:stretch;';

    for (var i = 0; i < TOTAL_SEGS; i++) {
      var seg = document.createElement('div');
      seg.style.cssText = 'width:14px;flex-shrink:0;background:' + T.gold + ';opacity:0;transition:opacity 0.05s;';
      progFill.appendChild(seg);
      segments.push(seg);
    }
    progContainer.appendChild(progFill);
    body.appendChild(progContainer);

    var hint = document.createElement('div');
    hint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';text-align:center;';
    hint.textContent = 'Present card on terminal...';
    body.appendChild(hint);

    dialog.appendChild(body);
    frame.appendChild(dialog);
    container.appendChild(frame);

    _procAnimTimer = setInterval(function() {
      if (segIdx < TOTAL_SEGS) {
        segments[segIdx].style.opacity = '1';
        segIdx++;
      }
      if (segIdx % 4 === 0 && msgIdx < statusMessages.length - 1) {
        msgIdx++;
        if (_procStatusEl) _procStatusEl.textContent = statusMessages[msgIdx];
      }
      if (segIdx >= TOTAL_SEGS) {
        segIdx = 0;
        segments.forEach(function(s) { s.style.opacity = '0'; });
      }
    }, 200);
  },

  unmount: function() {
    if (_procAnimTimer) clearInterval(_procAnimTimer);
    _procAnimTimer = null;
    _procStatusEl = null;
  },
});
