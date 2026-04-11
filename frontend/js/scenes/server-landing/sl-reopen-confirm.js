import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { applyInterruptCardStyle } from './server-landing.js';

// ── Reopen Confirmation ───────────────────────────

SceneManager.register({
  name: 'sl-reopen-confirm',
  mount: function(container, params) {
    var card = document.createElement('div');
    applyInterruptCardStyle(card);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
    msg.textContent = 'Reopen ' + (params.checkLabel || 'check') + '? Requires manager approval.';
    card.appendChild(msg);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
    btns.appendChild(buildButton('CONFIRM', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onConfirm(); },
    }));
    btns.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});
