import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { VOID_REASONS } from './order-entry.js';

SceneManager.register({
  name: 'void-reason',
  mount: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.red + ';padding:20px;min-width:280px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.red + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = params.isFullVoid ? '// VOID ENTIRE ORDER //' : '// VOID REASON //';
    panel.appendChild(lbl);

    VOID_REASONS.forEach(function(r) {
      var btn = buildButton(r, {
        fill: T.darkBtn, color: T.mint, fontSize: '26px', height: 44,
        onTap: function() { params.onConfirm(r); },
      });
      btn.style.width = '240px';
      panel.appendChild(btn);
    });

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
