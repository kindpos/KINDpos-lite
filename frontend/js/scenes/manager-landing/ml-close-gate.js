// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Close Day Gate (unmet conditions)
// ═══════════════════════════════════════════════════

import { T, chamfer } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';

SceneManager.register({
  name: 'ml-close-gate',
  mount: function(container, params) {
    var card = document.createElement('div');
    card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.frameInterruptCritical + ';padding:24px 32px;text-align:center;max-width:420px;';
    card.style.clipPath = chamfer(10);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:12px;';
    msg.textContent = 'Cannot close day:';
    card.appendChild(msg);

    var reasons = params.reasons || [];
    for (var i = 0; i < reasons.length; i++) {
      var line = document.createElement('div');
      line.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.vermillion + ';margin-bottom:4px;';
      line.textContent = '\u2717 ' + reasons[i];
      card.appendChild(line);
    }

    var sp = document.createElement('div'); sp.style.height = '16px'; card.appendChild(sp);
    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;justify-content:center;';
    btns.appendChild(buildButton('OK', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});
