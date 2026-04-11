import { T, chamfer } from '../../tokens.js';
import { buildButton, showToast } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { buildCardHeader, CHROME, fmt, checkNum } from './server-landing.js';

// ── Internal Transfer (Transactional stub) ────────

SceneManager.register({
  name: 'sl-internal-transfer',
  mount: function(container, params) {
    container.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;padding:' + T.scenePad + 'px;box-sizing:border-box;';

    // Header
    container.appendChild(buildCardHeader('INTERNAL TRANSFER'));

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;display:flex;gap:10px;overflow-x:auto;padding:10px 0;';

    // Render each source check as a column
    var checks = params.checks || [];
    for (var i = 0; i < checks.length; i++) {
      var order = checks[i];
      var col = document.createElement('div');
      col.style.cssText = 'flex:1;min-width:180px;background:' + T.bgDark + ';display:flex;flex-direction:column;overflow-y:auto;'
        + 'border:2px solid ' + T.mint + ';'
        + 'clip-path:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px);';

      var colHeader = document.createElement('div');
      colHeader.style.cssText = 'font-family:' + T.fh + ';font-size:18px;color:' + CHROME + ';padding:6px 8px;border-bottom:1px solid ' + T.border + ';';
      colHeader.textContent = checkNum(order);
      col.appendChild(colHeader);

      var items = order.items || [];
      for (var j = 0; j < items.length; j++) {
        var row = document.createElement('div');
        row.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.textPrimary + ';padding:4px 8px;cursor:pointer;';
        row.textContent = items[j].name + ' — ' + fmt(items[j].price || 0);
        col.appendChild(row);
      }
      body.appendChild(col);
    }

    // + NEW CHECK destination column
    var newCol = document.createElement('div');
    newCol.style.cssText = 'flex:1;min-width:180px;border:2px dashed ' + CHROME + ';display:flex;align-items:center;justify-content:center;';
    newCol.style.clipPath = chamfer(6);
    var newLabel = document.createElement('div');
    newLabel.style.cssText = 'font-family:' + T.fb + ';font-size:30px;color:' + CHROME + ';';
    newLabel.textContent = '+ NEW CHECK';
    newCol.appendChild(newLabel);
    body.appendChild(newCol);

    container.appendChild(body);

    // Bottom action bar
    var actionBar = document.createElement('div');
    actionBar.style.cssText = 'flex-shrink:0;display:flex;gap:10px;justify-content:flex-end;padding-top:8px;';
    actionBar.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 40,
      onTap: function() { SceneManager.closeTransactional('sl-internal-transfer'); },
    }));
    actionBar.appendChild(buildButton('CONFIRM', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 40,
      onTap: function() {
        showToast('Transfer — not yet wired to backend', { bg: T.gold });
        SceneManager.closeTransactional('sl-internal-transfer');
      },
    }));
    container.appendChild(actionBar);
  },
  unmount: function() {},
});
