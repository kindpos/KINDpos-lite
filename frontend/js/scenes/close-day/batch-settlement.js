// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Batch Settlement Overlay Scene
// ═══════════════════════════════════════════════════

import { T } from '../../tokens.js';
import { buildButton, showToast } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { fmt } from './close-day.js';

SceneManager.register({
  name: 'batch-settlement',
  mount: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';padding:20px;min-width:300px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// SUBMIT BATCH //';
    panel.appendChild(lbl);

    var info = document.createElement('div');
    info.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;';
    info.textContent = (params.batchTransactions || 0) + ' transactions — ' + fmt(params.batchTotal || 0);
    panel.appendChild(info);

    var submitBtn = buildButton('SETTLE', {
      fill: T.darkBtn, color: T.gold, fontSize: '26px', height: 44,
      onTap: function() {
        fetch('/api/v1/payments/batch-settle', { method: 'POST' })
          .then(function(r) { return r.json(); })
          .then(function() {
            if (params.onSettled) params.onSettled();
            SceneManager.closeTransactional('batch-settlement');
          })
          .catch(function(err) {
            console.error('[KINDpos] Batch settle failed:', err);
            showToast('Batch settle failed');
          });
      },
    });
    submitBtn.style.width = '240px';
    panel.appendChild(submitBtn);

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 40,
      onTap: function() { SceneManager.closeTransactional('batch-settlement'); },
    });
    cancelBtn.style.width = '240px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});
