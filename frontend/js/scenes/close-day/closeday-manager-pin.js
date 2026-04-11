// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Manager PIN Interrupt Scene
// ═══════════════════════════════════════════════════

import { SceneManager } from '../../scene-manager.js';
import { buildNumpad } from '../../numpad.js';

SceneManager.register({
  name: 'closeday-manager-pin',
  mount: function(container, params) {
    container.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    var numpad = buildNumpad({
      maxDigits: 4,
      masked: true,
      onSubmit: function(pin) {
        fetch('/api/v1/auth/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin }),
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.valid) {
              params.onConfirm(data);
            } else {
              numpad.setError('Invalid PIN');
            }
          })
          .catch(function() { numpad.setError('PIN check failed'); });
      },
      onCancel: function() { params.onCancel(); },
    });
    container.appendChild(numpad);
  },
  unmount: function() {},
});
