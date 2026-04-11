import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { applyInterruptCardStyle } from './server-landing.js';

// ── Transfer Choice (Internal / External) ─────────

SceneManager.register({
  name: 'sl-transfer-choice',
  mount: function(container, params) {
    var card = document.createElement('div');
    applyInterruptCardStyle(card);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:20px;';
    msg.textContent = 'Transfer type:';
    card.appendChild(msg);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';
    btns.appendChild(buildButton('INTERNAL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 140, height: 44,
      onTap: function() { params.onConfirm('internal'); },
    }));
    btns.appendChild(buildButton('EXTERNAL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 140, height: 44,
      onTap: function() { params.onConfirm('external'); },
    }));
    card.appendChild(btns);

    var cancelRow = document.createElement('div');
    cancelRow.style.cssText = 'margin-top:12px;';
    cancelRow.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mutedText, fontSize: T.fsBtnSm, width: 100, height: 34,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(cancelRow);
    container.appendChild(card);
  },
  unmount: function() {},
});
