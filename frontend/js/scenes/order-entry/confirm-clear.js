import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';

SceneManager.register({
  name: 'confirm-clear',
  mount: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;width:320px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';padding:20px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';letter-spacing:1px;text-align:center;';
    lbl.textContent = 'Clear current ticket?';
    panel.appendChild(lbl);

    var yesBtn = buildButton('YES \u2014 CLEAR', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 46,
      onTap: function() { params.onConfirm(); },
    });
    yesBtn.style.width = '240px';
    var noBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 46,
      onTap: function() { params.onCancel(); },
    });
    noBtn.style.width = '240px';
    panel.appendChild(yesBtn);
    panel.appendChild(noBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});
