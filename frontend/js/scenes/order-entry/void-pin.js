import { SceneManager } from '../../scene-manager.js';
import { buildPinOverlay } from './order-entry.js';

SceneManager.register({
  name: 'void-pin',
  mount: function(container, params) {
    buildPinOverlay(container, function(manager) {
      if (!manager) { params.onCancel(); return; }
      params.onConfirm(manager);
    });
  },
  unmount: function() {},
});
