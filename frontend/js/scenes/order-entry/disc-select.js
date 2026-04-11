import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { DISCOUNT_OPTIONS } from './order-entry.js';

SceneManager.register({
  name: 'disc-select',
  mount: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';padding:20px;min-width:280px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:13px;color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// DISCOUNT //';
    panel.appendChild(lbl);

    DISCOUNT_OPTIONS.forEach(function(opt) {
      var btn = buildButton(opt, {
        fill: T.darkBtn, color: T.mint, fontSize: '26px', height: 44,
        onTap: function() { params.onConfirm(opt); },
      });
      btn.style.width = '240px';
      panel.appendChild(btn);
    });

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: '22px', height: 40,
      onTap: function() { params.onCancel(); },
    });
    cancelBtn.style.width = '240px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});
