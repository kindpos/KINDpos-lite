// ═══════════════════════════════════════════════════
//  KINDpos Terminal — check-overview scene
//  Working layer: Check overview with payment summary, seats, and options
//  SceneManager.mountWorking('check-overview', { checkId, tableId })
// ═══════════════════════════════════════════════════

import { SceneManager } from '../scene-manager.js';
import { T, chamfer, bevelEdges, buildStyledButton } from '../tokens.js';

// TODO: No font-size token exists for 26px card header labels — using inline '9px'.
//       Consider adding T.fsLabel or similar to tokens.js.

// ── Listener tracking for cleanup ──
var _listeners = [];

function _track(el, event, handler) {
  el.addEventListener(event, handler);
  _listeners.push({ el: el, event: event, handler: handler });
}

SceneManager.register({
  name: 'check-overview',

  mount: function(container, params) {
    if (params === undefined) params = {};
    _listeners = [];

    var root = document.createElement('div');
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      background: T.bg,
    });
    container.appendChild(root);

    var mintEdges = bevelEdges(T.mint);
    var darkEdges = bevelEdges(T.darkBtn);

    // ═══════════════════════════════════════════════════
    //  Card 1 — PAYMENT SUMMARY (left panel)
    //  x:24 y:24 w:312 h:552
    // ═══════════════════════════════════════════════════

    var card1 = document.createElement('div');
    Object.assign(card1.style, {
      position: 'absolute',
      left: '24px',
      top: '24px',
      width: '312px',
      height: '552px',
      borderRadius: '5px',
      background: T.bg,
      borderTop: T.bevel + 'px solid ' + mintEdges.light,
      borderLeft: T.bevel + 'px solid ' + mintEdges.light,
      borderBottom: T.bevel + 'px solid ' + mintEdges.dark,
      borderRight: T.bevel + 'px solid ' + mintEdges.dark,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    });

    var card1H = document.createElement('div');
    Object.assign(card1H.style, {
      background: T.mint,
      height: '26px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      fontFamily: T.fh,
      fontSize: '9px',
      letterSpacing: '2px',
      color: T.bgDark,
      textTransform: 'uppercase',
    });
    card1H.textContent = 'PAYMENT SUMMARY';
    card1.appendChild(card1H);

    // Body — placeholder well (wire to real data in a later pass)
    var card1Well = document.createElement('div');
    Object.assign(card1Well.style, {
      flex: '1',
      margin: '6px',
      background: T.bgDark,
      clipPath: chamfer(),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.fb,
      fontSize: T.fsSmall,
      color: T.sage,
    });
    card1Well.textContent = 'C-042';
    card1.appendChild(card1Well);

    root.appendChild(card1);

    // ═══════════════════════════════════════════════════
    //  Card 2 — SEATS (top right grid)
    //  x:360 y:24 w:648 h:336
    // ═══════════════════════════════════════════════════

    var card2 = document.createElement('div');
    Object.assign(card2.style, {
      position: 'absolute',
      left: '360px',
      top: '24px',
      width: '648px',
      height: '336px',
      borderRadius: '5px',
      background: T.bg,
      borderTop: T.bevel + 'px solid ' + mintEdges.light,
      borderLeft: T.bevel + 'px solid ' + mintEdges.light,
      borderBottom: T.bevel + 'px solid ' + mintEdges.dark,
      borderRight: T.bevel + 'px solid ' + mintEdges.dark,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    });

    var card2H = document.createElement('div');
    Object.assign(card2H.style, {
      background: T.mint,
      height: '26px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      fontFamily: T.fh,
      fontSize: '9px',
      letterSpacing: '2px',
      color: T.bgDark,
      textTransform: 'uppercase',
    });
    card2H.textContent = 'SEATS';
    card2.appendChild(card2H);

    var card2Body = document.createElement('div');
    Object.assign(card2Body.style, {
      flex: '1',
      padding: '6px',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      gap: '6px',
      overflow: 'hidden',
    });

    // Seat slot definitions: S-001,002,006 = mint (occupied), S-003,004,005 = darkBtn (empty)
    var seats = [
      { id: 'S-001', frame: T.mint,    edges: mintEdges },
      { id: 'S-002', frame: T.mint,    edges: mintEdges },
      { id: 'S-003', frame: T.darkBtn, edges: darkEdges },
      { id: 'S-004', frame: T.darkBtn, edges: darkEdges },
      { id: 'S-005', frame: T.darkBtn, edges: darkEdges },
      { id: 'S-006', frame: T.mint,    edges: mintEdges },
    ];

    for (var i = 0; i < seats.length; i++) {
      var s = seats[i];
      var slot = document.createElement('div');
      Object.assign(slot.style, {
        borderRadius: '5px',
        background: T.bgDark,
        borderTop: T.bevelBtn + 'px solid ' + s.edges.light,
        borderLeft: T.bevelBtn + 'px solid ' + s.edges.light,
        borderBottom: T.bevelBtn + 'px solid ' + s.edges.dark,
        borderRight: T.bevelBtn + 'px solid ' + s.edges.dark,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
      });

      var slotH = document.createElement('div');
      Object.assign(slotH.style, {
        background: s.frame,
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        fontFamily: T.fh,
        fontSize: '8px',
        color: T.bgDark,
        textTransform: 'uppercase',
      });
      slotH.textContent = s.id;
      slot.appendChild(slotH);

      // Seat tap handler
      (function(slotId) {
        _track(slot, 'pointerup', function() {
          console.log('seat tapped: ' + slotId);
        });
      })(s.id);

      card2Body.appendChild(slot);
    }

    card2.appendChild(card2Body);
    root.appendChild(card2);

    // ═══════════════════════════════════════════════════
    //  Card 3 — CHECK OPTIONS (bottom right)
    //  x:360 y:408 w:408 h:168
    // ═══════════════════════════════════════════════════

    var card3 = document.createElement('div');
    Object.assign(card3.style, {
      position: 'absolute',
      left: '360px',
      top: '408px',
      width: '408px',
      height: '168px',
      borderRadius: '5px',
      background: T.bg,
      borderTop: T.bevel + 'px solid ' + mintEdges.light,
      borderLeft: T.bevel + 'px solid ' + mintEdges.light,
      borderBottom: T.bevel + 'px solid ' + mintEdges.dark,
      borderRight: T.bevel + 'px solid ' + mintEdges.dark,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    });

    var card3H = document.createElement('div');
    Object.assign(card3H.style, {
      background: T.mint,
      height: '26px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      fontFamily: T.fh,
      fontSize: '9px',
      letterSpacing: '2px',
      color: T.bgDark,
      textTransform: 'uppercase',
    });
    card3H.textContent = 'CHECK OPTIONS';
    card3.appendChild(card3H);

    var card3Body = document.createElement('div');
    Object.assign(card3Body.style, {
      flex: '1',
      padding: '6px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignContent: 'flex-start',
    });

    var options = [
      { label: 'PRINT',    variant: 'gold',       size: 'lg' },
      { label: 'DISCOUNT', variant: 'vermillion', size: 'sm' },
      { label: 'VOID',     variant: 'vermillion', size: 'sm' },
      { label: 'PAY',      variant: 'mint',       size: 'lg' },
      { label: 'DRAWER',   variant: 'dark',       size: 'sm' },
      { label: 'RSND',     variant: 'dark',       size: 'sm' },
    ];

    for (var j = 0; j < options.length; j++) {
      var opt = options[j];
      var btn = buildStyledButton({
        label: opt.label,
        variant: opt.variant,
        size: opt.size,
        onClick: (function(lbl) {
          return function() { console.log('[check-overview] ' + lbl + ' tapped'); };
        })(opt.label),
      });
      card3Body.appendChild(btn.wrap);
    }

    card3.appendChild(card3Body);
    root.appendChild(card3);

    // ═══════════════════════════════════════════════════
    //  Floating buttons (position: absolute, above all cards)
    //  Sit outside card boundaries — do not clip or contain
    // ═══════════════════════════════════════════════════

    var floats = [
      { label: 'ADD ITEM(S)', variant: 'gold', size: 'lg', x: 816, y: 504 },
      { label: 'EDIT SEATS',  variant: 'dark', size: 'lg', x: 816, y: 336 },
      { label: '+1 ROUND',    variant: 'gold', size: 'md', x: 408, y: 336 },
    ];

    for (var k = 0; k < floats.length; k++) {
      var f = floats[k];
      var fb = buildStyledButton({
        label: f.label,
        variant: f.variant,
        size: f.size,
        onClick: (function(lbl) {
          return function() { console.log('[check-overview] ' + lbl + ' tapped'); };
        })(f.label),
      });
      Object.assign(fb.wrap.style, {
        position: 'absolute',
        left: f.x + 'px',
        top: f.y + 'px',
        zIndex: '50',
      });
      root.appendChild(fb.wrap);
    }
  },

  unmount: function() {
    for (var i = 0; i < _listeners.length; i++) {
      var l = _listeners[i];
      l.el.removeEventListener(l.event, l.handler);
    }
    _listeners = [];
  },
});
