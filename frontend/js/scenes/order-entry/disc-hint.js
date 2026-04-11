import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';

SceneManager.register({
  name: 'disc-hint',
  mount: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';padding:20px;min-width:280px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';text-align:center;';
    lbl.textContent = 'Select item(s) first, then tap DISC';
    panel.appendChild(lbl);
    var okBtn = buildButton('OK', {
      fill: T.darkBtn, color: T.mint, fontSize: '22px', height: 40,
      onTap: function() { params.onConfirm(); },
    });
    okBtn.style.width = '200px';
    panel.appendChild(okBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});
