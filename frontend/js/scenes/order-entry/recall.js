import { T } from '../../tokens.js';
import { buildButton } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { savedTabs, recallTabInterrupt, _applyCardBevel } from './order-entry.js';

SceneManager.register({
  name: 'recall',
  mount: function(container, params) {
    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;width:600px;max-height:520px;background:' + T.bgDark + ';padding:0;overflow:hidden;';
    _applyCardBevel(panel, 7);

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid ' + T.bg3 + ';flex-shrink:0;';
    var title = document.createElement('span');
    title.style.cssText = 'font-family:' + T.fb + ';font-size:40px;font-weight:bold;color:' + T.mint + ';letter-spacing:2px;';
    title.textContent = '// RECALL //';
    var closeBtn = buildButton('\u2715', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, height: 30,
      onTap: function() { SceneManager.closeTransactional('recall'); },
    });
    closeBtn.style.width = '30px';
    hdr.appendChild(title);
    hdr.appendChild(closeBtn);
    panel.appendChild(hdr);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px;overflow-y:auto;flex:1;';

    if (savedTabs.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:40px;text-align:center;padding:40px 0;';
      empty.textContent = 'No saved tabs';
      grid.appendChild(empty);
    } else {
      savedTabs.forEach(function(tab) {
        var total = tab.ticket.reduce(function(s, i) {
          return s + i.unitPrice + i.mods.reduce(function(ms, m) { return ms + m.price; }, 0);
        }, 0);
        var cardLabel = tab.label
          ? tab.label + '\n' + tab.checkNum + '\n$' + total.toFixed(2)
          : tab.checkNum + '\n$' + total.toFixed(2);
        var card = buildButton(cardLabel, {
          fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, height: 90,
          onTap: function() { recallTabInterrupt(tab); },
        });
        grid.appendChild(card);
      });
    }
    panel.appendChild(grid);
    container.appendChild(panel);
  },
  unmount: function() {},
});
