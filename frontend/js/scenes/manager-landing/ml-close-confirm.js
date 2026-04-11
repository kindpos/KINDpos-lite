// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Close Day Confirmation
// ═══════════════════════════════════════════════════

import { T, chamfer } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';

SceneManager.register({
  name: 'ml-close-confirm',
  mount: function(container, params) {
    var card = document.createElement('div');
    card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.frameInterruptDecision + ';padding:24px 32px;text-align:center;max-width:420px;';
    card.style.clipPath = chamfer(10);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:8px;';
    msg.textContent = 'Close day?';
    card.appendChild(msg);

    var sub = document.createElement('div');
    sub.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';margin-bottom:16px;';
    sub.textContent = 'All gates passed. This will finalize the service day.';
    card.appendChild(sub);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';
    btns.appendChild(buildButton('CONFIRM', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 140, height: 44,
      onTap: function() { params.onConfirm(); },
    }));
    btns.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.vermillion, fontSize: T.fsBtn, width: 140, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});
