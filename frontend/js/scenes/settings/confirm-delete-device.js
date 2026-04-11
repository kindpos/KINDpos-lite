import { T, chamfer } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';

SceneManager.register({
  name: 'confirm-delete-device',
  mount: function(container, params) {
    container.style.flexDirection = 'column';
    container.style.gap = '16px';

    var card = document.createElement('div');
    card.style.cssText = [
      'background:' + T.bg + ';',
      'border:3px solid ' + T.vermillion + ';',
      'padding:24px 32px;text-align:center;max-width:400px;',
      'clip-path:' + chamfer(10) + ';',
    ].join('');

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';margin-bottom:20px;';
    msg.textContent = 'Remove ' + (params.deviceName || 'device') + '?';
    card.appendChild(msg);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    btns.appendChild(buildButton('Remove', {
      fill: T.vermillion, color: T.embVermLabel, fontSize: '16px',
      width: 120, height: 40,
      onTap: function() { params.onConfirm(); },
    }));
    btns.appendChild(buildButton('Cancel', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px',
      width: 120, height: 40,
      onTap: function() { params.onCancel(); },
    }));

    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});
