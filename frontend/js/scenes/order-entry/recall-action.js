import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { _applyCardBevel } from './order-entry.js';

SceneManager.register({
  name: 'recall-action',
  mount: function(container, params) {
    var tab = params.tab;
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;width:360px;background:' + T.bgDark + ';padding:20px;';
    _applyCardBevel(panel, 7);

    if (tab.label) {
      var nameLbl = document.createElement('div');
      nameLbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;font-weight:bold;color:' + T.mint + ';letter-spacing:1px;';
      nameLbl.textContent = tab.label;
      panel.appendChild(nameLbl);
    }
    var checkLbl = document.createElement('div');
    checkLbl.style.cssText = 'font-family:' + T.fb + ';font-size:' + (tab.label ? '16px' : T.fsSmall) + ';color:' + (tab.label ? T.mutedText : T.mint) + ';letter-spacing:1px;margin-bottom:6px;';
    checkLbl.textContent = tab.checkNum;
    panel.appendChild(checkLbl);

    var recallBtn = buildButton('RECALL', {
      fill: T.darkBtn, color: T.mint, fontSize: '26px', height: 50,
      onTap: function() { params.onConfirm('recall'); },
    });
    recallBtn.style.width = '280px';

    var deleteBtn = buildButton('DELETE', {
      fill: T.darkBtn, color: T.mint, fontSize: '26px', height: 50,
      onTap: function() { params.onConfirm('delete'); },
    });
    deleteBtn.style.width = '280px';

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 40,
      onTap: function() { params.onCancel(); },
    });
    cancelBtn.style.width = '280px';

    panel.appendChild(recallBtn);
    panel.appendChild(deleteBtn);
    panel.appendChild(cancelBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});
