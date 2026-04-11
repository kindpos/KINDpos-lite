import { SceneManager } from '../../scene-manager.js';
import { buildNumpadInterrupt } from './server-landing.js';

SceneManager.register({
  name: 'sl-tip-numpad',
  mount: function(container, params) {
    buildNumpadInterrupt(container, params, 'ENTER TIP');
  },
  unmount: function() {},
});
