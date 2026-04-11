import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { applyInterruptCardStyle } from './server-landing.js';

// ── Checkout Gate ─────────────────────────────────

SceneManager.register({
  name: 'sl-checkout-gate',
  mount: function(container, params) {
    var isWarning = !!(params.warning); // warning mode allows proceeding
    var frameColor = isWarning ? T.frameInterruptDecision : T.frameInterruptCritical;

    var card = document.createElement('div');
    applyInterruptCardStyle(card);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-bottom:12px;';
    msg.textContent = isWarning ? 'Warning:' : 'Cannot checkout:';
    card.appendChild(msg);

    var reasons = params.reasons || [];
    for (var i = 0; i < reasons.length; i++) {
      var line = document.createElement('div');
      line.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + (isWarning ? '#ffdd44' : T.vermillion) + ';margin-bottom:4px;';
      line.textContent = '\u2022 ' + reasons[i];
      card.appendChild(line);
    }

    var sp = document.createElement('div'); sp.style.height = '16px'; card.appendChild(sp);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';
    if (isWarning) {
      btns.appendChild(buildButton('PROCEED', {
        fill: T.darkBtn, color: T.gold, fontSize: T.fsBtn, width: 140, height: 44,
        onTap: function() { params.onConfirm(); },
      }));
    }
    btns.appendChild(buildButton(isWarning ? 'CANCEL' : 'OK', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});
