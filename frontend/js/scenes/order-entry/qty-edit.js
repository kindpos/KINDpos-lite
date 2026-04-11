import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';

SceneManager.register({
  name: 'qty-edit',
  mount: function(container, params) {
    var qty = params.currentQty || 1;
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.cyan + ';padding:20px;min-width:280px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:32px;color:' + T.cyan + ';letter-spacing:1px;text-align:center;';
    lbl.textContent = params.itemName;
    panel.appendChild(lbl);

    var qtyDisplay = document.createElement('div');
    qtyDisplay.style.cssText = 'font-family:' + T.fh + ';font-size:60px;color:' + T.mint + ';text-align:center;min-width:100px;';
    qtyDisplay.textContent = qty;
    panel.appendChild(qtyDisplay);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';

    var minusBtn = buildButton('\u2212', {
      fill: T.darkBtn, color: T.red, fontSize: '40px', height: 52,
      onTap: function() {
        if (qty > 1) { qty--; qtyDisplay.textContent = qty; }
      },
    });
    minusBtn.style.width = '70px';

    var plusBtn = buildButton('+', {
      fill: T.darkBtn, color: T.goGreen, fontSize: '40px', height: 52,
      onTap: function() {
        if (qty < 99) { qty++; qtyDisplay.textContent = qty; }
      },
    });
    plusBtn.style.width = '70px';

    btnRow.appendChild(minusBtn);
    btnRow.appendChild(plusBtn);
    panel.appendChild(btnRow);

    var confirmBtn = buildButton('CONFIRM', {
      fill: T.darkBtn, color: T.mint, fontSize: '26px', height: 44,
      onTap: function() { params.onConfirm(qty); },
    });
    confirmBtn.style.width = '200px';
    panel.appendChild(confirmBtn);

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: '22px', height: 40,
      onTap: function() { params.onCancel(); },
    });
    cancelBtn.style.width = '200px';
    panel.appendChild(cancelBtn);

    container.appendChild(panel);
  },
  unmount: function() {},
});
