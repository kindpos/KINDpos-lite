// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Tip Numpad Scene
//  Standalone numpad for entering tip amounts
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../../tokens.js';
import { SceneManager } from '../../scene-manager.js';
import { buildNumpad } from '../../numpad.js';

var FONT = T.fb;

function el(tag, css, t) {
  var e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (t !== undefined) e.textContent = t;
  return e;
}

SceneManager.register({
  name: 'tip-numpad',
  mount: function(container, params) {
    container.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    // Beveled card wrapper matching clock-in style
    var frame = el('div', 'background:' + T.bgDark + ';padding:20px;display:flex;flex-direction:column;align-items:center;gap:10px;' +
      'border-top:7px solid ' + T.numpadChassisL + ';border-left:7px solid ' + T.numpadChassisL + ';' +
      'border-bottom:7px solid ' + T.numpadChassisD + ';border-right:7px solid ' + T.numpadChassisD + ';' +
      'clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px);' +
      'filter:drop-shadow(3px 4px 0px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(135,247,156,0.15));');
    frame.appendChild(el('div', 'font-family:' + FONT + ';font-size:22px;color:' + T.gold + ';letter-spacing:2px;text-align:center;', 'ENTER TIP AMOUNT'));
    var numpad = buildNumpad({
      maxDigits: 6,
      masked: false,
      displayFormat: function(digits) {
        var cents = parseInt(digits || '0', 10);
        return '$' + (cents / 100).toFixed(2);
      },
      displayColor: T.gold,
      chassisColor: T.numpadChassis,
      digitColor: T.digitColor,
      displayH: 60,
      gap: 16,
      keyH: 84,
      keyGap: 12,
      cardPad: 18,
      chassisChamfer: 6,
      chassisBevel: 5,
      onSubmit: function(digits) {
        var cents = parseInt(digits || '0', 10);
        var amount = cents / 100;
        if (params.onConfirm) params.onConfirm(amount);
      },
      onCancel: function() {
        if (params.onCancel) params.onCancel();
      },
    });
    frame.appendChild(numpad);
    container.appendChild(frame);
  },
});
