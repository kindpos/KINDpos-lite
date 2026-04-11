import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { applyInterruptCardStyle } from './server-landing.js';

// ── Merge Choice (As One / As Separate Seats) ─────

SceneManager.register({
  name: 'sl-merge-choice',
  mount: function(container, params) {
    var card = document.createElement('div');
    applyInterruptCardStyle(card);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:8px;';
    msg.textContent = 'Merge ' + (params.count || 0) + ' checks:';
    card.appendChild(msg);

    var hint = document.createElement('div');
    hint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';margin-bottom:16px;';
    hint.textContent = 'Source check numbers will be retired.';
    card.appendChild(hint);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';
    btns.appendChild(buildButton('AS ONE', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtnSm, width: 160, height: 44,
      onTap: function() { params.onConfirm('as_one'); },
    }));
    btns.appendChild(buildButton('AS SEPARATE SEATS', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtnSm, width: 160, height: 44,
      onTap: function() { params.onConfirm('as_separate'); },
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
