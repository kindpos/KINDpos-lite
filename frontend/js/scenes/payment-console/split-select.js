// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Split-Select Scene
//  Fraction selector popup for split payments
// ═══════════════════════════════════════════════════

import { T, applySunkenStyle } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';

SceneManager.register({
  name: 'split-select',

  mount: function(container, params) {
    params = params || {};
    var remaining = params.remaining || 0;
    var onConfirm = params.onConfirm || function() {};
    var onCancel = params.onCancel || function() {};

    container.style.cssText = [
      'display:flex;flex-direction:column;align-items:center;gap:16px;',
      'padding:28px 40px;',
      'background:' + T.bgDark + ';',
      'min-width:360px;',
    ].join('');
    applySunkenStyle(container);

    // Title
    var title = document.createElement('div');
    title.style.cssText = [
      'font-family:' + T.fh + ';font-size:' + T.fsBtnSm + ';',
      'color:' + T.gold + ';letter-spacing:0.1em;',
    ].join('');
    title.textContent = 'SPLIT PAYMENT';
    container.appendChild(title);

    // Remaining display
    var sub = document.createElement('div');
    sub.style.cssText = [
      'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';',
      'color:' + T.mint + ';',
    ].join('');
    sub.textContent = 'Remaining: $' + remaining.toFixed(2);
    container.appendChild(sub);

    // Fraction buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;';

    [2, 3, 4].forEach(function(divisor) {
      var amt = Math.ceil(remaining / divisor * 100) / 100;
      var btn = buildButton('1/' + divisor + '\n$' + amt.toFixed(2), {
        fill: T.darkBtn, color: T.mint, fontSize: T.fsCon,
        width: 100, height: 64,
        onTap: function() { onConfirm(amt); },
      });
      btnRow.appendChild(btn);
    });
    container.appendChild(btnRow);

    // Cancel
    var cancelBtn = buildButton('Cancel', {
      fill: T.darkBtn, color: T.vermillion, fontSize: T.fsCon,
      width: 120, height: 40,
      onTap: function() { onCancel(); },
    });
    container.appendChild(cancelBtn);
  },

  unmount: function() {},
});
