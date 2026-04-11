// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Zero-Confirm Interrupt Scene
// ═══════════════════════════════════════════════════

import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { RED } from './close-day.js';

SceneManager.register({
  name: 'closeday-zero-confirm',
  mount: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + RED + ';padding:20px;min-width:280px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + RED + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// ZERO ALL TIPS //';
    panel.appendChild(lbl);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;';
    msg.textContent = 'Set ' + (params.count || 0) + ' unadjusted tip(s) to $0.00?';
    panel.appendChild(msg);

    var confirmBtn = buildButton('CONFIRM', {
      fill: T.darkBtn, color: RED, fontSize: '26px', height: 44,
      onTap: function() { params.onConfirm(); },
    });
    confirmBtn.style.width = '240px';
    panel.appendChild(confirmBtn);

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 40,
      onTap: function() { params.onCancel(); },
    });
    cancelBtn.style.width = '240px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});
