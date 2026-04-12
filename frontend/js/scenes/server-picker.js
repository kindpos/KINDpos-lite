// ═══════════════════════════════════════════════════
//  KINDpos Terminal — server-picker interrupt
//  Shows clocked-in staff list, resolves with selected server
//
//  SceneManager.interrupt('server-picker', {
//    onConfirm: function(server) { /* { employee_id, employee_name } */ },
//    onCancel: function() {},
//    params: { excludeId: 'current-server-id' },
//  })
// ═══════════════════════════════════════════════════

import { SceneManager } from '../scene-manager.js';
import { T, buildStyledButton } from '../tokens.js';

SceneManager.register({
  name: 'server-picker',

  mount: function(container, params) {
    params = params || {};
    var excludeId = (params.params || {}).excludeId || null;

    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';

    var panel = document.createElement('div');
    Object.assign(panel.style, {
      background: T.bgDark,
      border: '4px solid ' + T.mint,
      borderRadius: '5px',
      padding: '16px',
      minWidth: '320px',
      maxWidth: '440px',
      maxHeight: '460px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    });

    var title = document.createElement('div');
    Object.assign(title.style, {
      fontFamily: T.fh,
      fontSize: '11px',
      letterSpacing: '3px',
      color: T.mint,
      textTransform: 'uppercase',
      textAlign: 'center',
      padding: '4px 0 8px',
    });
    title.textContent = 'TRANSFER TO SERVER';
    panel.appendChild(title);

    var list = document.createElement('div');
    Object.assign(list.style, {
      flex: '1',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    });

    var loading = document.createElement('div');
    Object.assign(loading.style, {
      fontFamily: T.fb,
      fontSize: T.fsConSm,
      color: T.mutedText,
      textAlign: 'center',
      padding: '20px 0',
    });
    loading.textContent = 'Loading...';
    list.appendChild(loading);
    panel.appendChild(list);

    // Cancel button
    var cancelBtn = buildStyledButton({
      label: 'CANCEL', variant: 'vermillion', size: 'sm',
      onClick: function() {
        SceneManager.resolveInterrupt('server-picker');
        if (params.onCancel) params.onCancel();
      },
    });
    cancelBtn.wrap.style.alignSelf = 'center';
    panel.appendChild(cancelBtn.wrap);

    container.appendChild(panel);

    // Fetch clocked-in staff
    fetch('/api/v1/servers/clocked-in')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        list.innerHTML = '';
        var staff = (data.staff || []).filter(function(s) {
          return s.employee_id !== excludeId;
        });

        if (staff.length === 0) {
          var empty = document.createElement('div');
          Object.assign(empty.style, {
            fontFamily: T.fb,
            fontSize: T.fsConSm,
            color: T.mutedText,
            textAlign: 'center',
            padding: '20px 0',
          });
          empty.textContent = 'No other servers clocked in';
          list.appendChild(empty);
          return;
        }

        for (var i = 0; i < staff.length; i++) {
          var srv = staff[i];
          var btn = buildStyledButton({
            label: srv.employee_name,
            variant: 'dark',
            size: 'md',
            onClick: (function(server) {
              return function() {
                SceneManager.resolveInterrupt('server-picker');
                if (params.onConfirm) params.onConfirm(server);
              };
            })({ employee_id: srv.employee_id, employee_name: srv.employee_name }),
          });
          btn.wrap.style.width = '100%';
          list.appendChild(btn.wrap);
        }
      })
      .catch(function() {
        list.innerHTML = '';
        var err = document.createElement('div');
        Object.assign(err.style, {
          fontFamily: T.fb,
          fontSize: T.fsConSm,
          color: T.red,
          textAlign: 'center',
          padding: '20px 0',
        });
        err.textContent = 'Failed to load servers';
        list.appendChild(err);
      });
  },

  unmount: function() {},
});
