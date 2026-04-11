import { SceneManager } from '../../scene-manager.js';
import { buildNumpadInterrupt } from './server-landing.js';

SceneManager.register({
  name: 'sl-tipout-numpad',
  mount: function(container, params) {
    buildNumpadInterrupt(container, params, 'TIP OUT AMOUNT');
  },
  unmount: function() {},
});
