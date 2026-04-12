// ════════��══════════════════════════════════════════
//  KINDpos Terminal — check-overview scene (SM2)
//  Working layer: Check overview with payment summary, seats, and options
//  SceneManager.mountWorking('check-overview', { checkId, tableId })
// ══════��════════════════════════════════════════════

import { defineScene } from '../scene-manager-2.js';
import { T, chamfer, bevelEdges, buildStyledButton } from '../tokens.js';

// TODO: No font-size token exists for 26px card header labels — using inline '9px'.
//       Consider adding T.fsLabel or similar to tokens.js.

// ── Inject invisible scrollbar style ─���
(function() {
  if (document.getElementById('co-scroll-style')) return;
  var s = document.createElement('style');
  s.id = 'co-scroll-style';
  s.textContent = '.co-scroll::-webkit-scrollbar{display:none}';
  document.head.appendChild(s);
})();

// ── Mock seat data (wire to API in a later pass) ──
function getMockSeats() {
  return [
    { id: 'S-001', items: [{ name: 'Margherita', qty: 1, price: 12.50 }, { name: 'Draft IPA', qty: 2, price: 7.00 }] },
    { id: 'S-002', items: [{ name: 'Caesar Salad', qty: 1, price: 9.75 }, { name: 'Lemonade', qty: 1, price: 4.50 }] },
    { id: 'S-003', items: [] },
    { id: 'S-004', items: [] },
    { id: 'S-005', items: [] },
    { id: 'S-006', items: [{ name: 'Wings x12', qty: 1, price: 15.00 }, { name: 'Coke', qty: 1, price: 3.50 }] },
  ];
}

function seatTotal(seat) {
  var t = 0;
  for (var i = 0; i < seat.items.length; i++) {
    t += seat.items[i].qty * seat.items[i].price;
  }
  return t;
}

function fmt(n) { return '$' + (n || 0).toFixed(2); }

defineScene({
  name: 'check-overview',

  state: {
    listeners: [],
    seats: [],
    selected: {},
    seatEls: {},
    summaryBody: null,
  },

  render: function(container, params, state) {
    function track(el, event, handler) {
      el.addEventListener(event, handler);
      state.listeners.push({ el: el, event: event, handler: handler });
    }

    state.seats = getMockSeats();

    var mintEdges = bevelEdges(T.mint);
    var darkEdges = bevelEdges(T.darkBtn);

    var root = document.createElement('div');
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      background: T.bg,
    });
    container.appendChild(root);

    // ���═══════════════════════════��══════════════════════
    //  Card 1 — PAYMENT SUMMARY (left panel)
    //  x:24 y:24 w:312 h:552
    // ════════════════════════════��══════════════════════

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

    // Header with ALL button
    var card1H = document.createElement('div');
    Object.assign(card1H.style, {
      background: T.mint,
      height: '26px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px',
      fontFamily: T.fh,
      fontSize: '9px',
      letterSpacing: '2px',
      color: T.bgDark,
      textTransform: 'uppercase',
    });

    var card1Label = document.createElement('span');
    card1Label.textContent = 'PAYMENT SUMMARY';
    card1H.appendChild(card1Label);

    var allBtn = document.createElement('span');
    Object.assign(allBtn.style, {
      cursor: 'pointer',
      fontFamily: T.fh,
      fontSize: '9px',
      letterSpacing: '2px',
      color: T.bgDark,
      padding: '2px 6px',
      userSelect: 'none',
    });
    allBtn.textContent = 'ALL';
    card1H.appendChild(allBtn);
    card1.appendChild(card1H);

    // Summary body — scrollable, invisible scrollbar
    var summaryBody = document.createElement('div');
    summaryBody.className = 'co-scroll';
    Object.assign(summaryBody.style, {
      flex: '1',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      padding: '6px',
    });
    state.summaryBody = summaryBody;
    card1.appendChild(summaryBody);

    root.appendChild(card1);

    // ═════════��═════════════════════════════════════════
    //  Card 2 — SEATS (top right grid)
    //  x:360 y:24 w:648 h:336
    // ═════════════════════════���═════════════════════════

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
    card2Body.className = 'co-scroll';
    Object.assign(card2Body.style, {
      flex: '1',
      padding: '6px',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridAutoRows: 'minmax(80px, auto)',
      gap: '6px',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    });

    // ── Build a seat tile ──
    function buildSeatTile(seat) {
      var hasItems = seat.items.length > 0;
      var frameColor = hasItems ? T.mint : T.darkBtn;
      var edges = hasItems ? mintEdges : darkEdges;
      var total = seatTotal(seat);

      var tile = document.createElement('div');
      Object.assign(tile.style, {
        borderRadius: '5px',
        background: T.bgDark,
        borderTop: T.bevelBtn + 'px solid ' + edges.light,
        borderLeft: T.bevelBtn + 'px solid ' + edges.light,
        borderBottom: T.bevelBtn + 'px solid ' + edges.dark,
        borderRight: T.bevelBtn + 'px solid ' + edges.dark,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
      });

      var header = document.createElement('div');
      Object.assign(header.style, {
        background: frameColor,
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        fontFamily: T.fh,
        fontSize: '8px',
        color: T.bgDark,
        textTransform: 'uppercase',
      });
      header.textContent = seat.id;
      tile.appendChild(header);

      var body = document.createElement('div');
      Object.assign(body.style, {
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.fb,
        fontSize: T.fsConSm,
        color: hasItems ? T.gold : T.mutedText,
      });
      body.textContent = hasItems ? fmt(total) : '--';
      tile.appendChild(body);

      state.seatEls[seat.id] = {
        tile: tile, header: header, body: body,
        frameColor: frameColor, edges: edges,
      };

      track(tile, 'pointerup', (function(seatId) {
        return function() { toggleSeat(seatId); };
      })(seat.id));

      return tile;
    }

    for (var i = 0; i < state.seats.length; i++) {
      card2Body.appendChild(buildSeatTile(state.seats[i]));
    }

    // "+" tile to add a new seat
    var addTile = document.createElement('div');
    Object.assign(addTile.style, {
      borderRadius: '5px',
      border: '2px dashed ' + T.mint,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      boxSizing: 'border-box',
    });
    var plusText = document.createElement('div');
    Object.assign(plusText.style, {
      fontFamily: T.fb,
      fontSize: '40px',
      color: T.mint,
    });
    plusText.textContent = '+';
    addTile.appendChild(plusText);

    track(addTile, 'pointerup', function() {
      var nextNum = state.seats.length + 1;
      var newSeat = { id: 'S-' + String(nextNum).padStart(3, '0'), items: [] };
      state.seats.push(newSeat);
      card2Body.insertBefore(buildSeatTile(newSeat), addTile);
      console.log('[check-overview] added seat: ' + newSeat.id);
    });

    card2Body.appendChild(addTile);
    card2.appendChild(card2Body);
    root.appendChild(card2);

    // ═══════��═══════════════════════════════════════════
    //  Selection logic
    // ════════��══════════════════════════════════���═══════

    function toggleSeat(seatId) {
      if (state.selected[seatId]) {
        delete state.selected[seatId];
      } else {
        state.selected[seatId] = true;
      }
      updateSeatVisuals();
      renderSummary();
    }

    function selectAll() {
      state.selected = {};
      for (var i = 0; i < state.seats.length; i++) {
        state.selected[state.seats[i].id] = true;
      }
      updateSeatVisuals();
      renderSummary();
    }

    function updateSeatVisuals() {
      for (var i = 0; i < state.seats.length; i++) {
        var seat = state.seats[i];
        var el = state.seatEls[seat.id];
        if (!el) continue;
        var sel = !!state.selected[seat.id];
        var hasItems = seat.items.length > 0;

        if (sel) {
          // Inverted: body gets frame color, header gets bgDark
          el.header.style.background = T.bgDark;
          el.header.style.color = el.frameColor;
          el.body.style.background = el.frameColor;
          el.body.style.color = T.bgDark;
        } else {
          // Normal
          el.header.style.background = el.frameColor;
          el.header.style.color = T.bgDark;
          el.body.style.background = '';
          el.body.style.color = hasItems ? T.gold : T.mutedText;
        }
      }
    }

    function renderSummary() {
      summaryBody.innerHTML = '';

      var selectedSeats = [];
      for (var i = 0; i < state.seats.length; i++) {
        if (state.selected[state.seats[i].id]) selectedSeats.push(state.seats[i]);
      }

      if (selectedSeats.length === 0) {
        var empty = document.createElement('div');
        Object.assign(empty.style, {
          fontFamily: T.fb,
          fontSize: T.fsConSm,
          color: T.mutedText,
          textAlign: 'center',
          padding: '20px 0',
        });
        empty.textContent = 'No seats selected';
        summaryBody.appendChild(empty);
        return;
      }

      var grandTotal = 0;

      for (var j = 0; j < selectedSeats.length; j++) {
        var seat = selectedSeats[j];
        var total = seatTotal(seat);
        grandTotal += total;

        // Seat sub-header
        var sh = document.createElement('div');
        Object.assign(sh.style, {
          fontFamily: T.fh,
          fontSize: '9px',
          letterSpacing: '2px',
          color: T.mint,
          textTransform: 'uppercase',
          padding: '6px 0 2px',
          borderBottom: '1px solid ' + T.border,
          marginBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
        });
        var shLabel = document.createElement('span');
        shLabel.textContent = seat.id;
        sh.appendChild(shLabel);
        var shTotal = document.createElement('span');
        shTotal.style.color = T.gold;
        shTotal.textContent = fmt(total);
        sh.appendChild(shTotal);
        summaryBody.appendChild(sh);

        // Items
        if (seat.items.length === 0) {
          var noItems = document.createElement('div');
          Object.assign(noItems.style, {
            fontFamily: T.fb,
            fontSize: T.fsConSm,
            color: T.mutedText,
            padding: '2px 0 6px',
          });
          noItems.textContent = 'Empty';
          summaryBody.appendChild(noItems);
        } else {
          for (var k = 0; k < seat.items.length; k++) {
            var item = seat.items[k];
            var row = document.createElement('div');
            Object.assign(row.style, {
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: T.fb,
              fontSize: T.fsConSm,
              color: T.textPrimary,
              padding: '1px 0',
            });
            var nameEl = document.createElement('span');
            nameEl.textContent = (item.qty > 1 ? item.qty + 'x ' : '') + item.name;
            row.appendChild(nameEl);
            var priceEl = document.createElement('span');
            priceEl.style.color = T.gold;
            priceEl.textContent = fmt(item.qty * item.price);
            row.appendChild(priceEl);
            summaryBody.appendChild(row);
          }
        }
      }

      // Grand total bar
      var totalBar = document.createElement('div');
      Object.assign(totalBar.style, {
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: T.fh,
        fontSize: '11px',
        letterSpacing: '2px',
        color: T.mint,
        textTransform: 'uppercase',
        padding: '8px 0 0',
        marginTop: '6px',
        borderTop: '2px solid ' + T.mint,
      });
      var totalLabel = document.createElement('span');
      totalLabel.textContent = 'TOTAL';
      totalBar.appendChild(totalLabel);
      var totalVal = document.createElement('span');
      totalVal.style.color = T.gold;
      totalVal.textContent = fmt(grandTotal);
      totalBar.appendChild(totalVal);
      summaryBody.appendChild(totalBar);
    }

    // ALL button handler
    track(allBtn, 'pointerup', function() { selectAll(); });

    // Default: ALL selected on mount
    selectAll();

    // ═══���═════════════════════════════════════════���═════
    //  Card 3 — CHECK OPTIONS (bottom right)
    //  x:360 y:408 w:408 h:168
    // ══════════════════════════���═════════════════════��══

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

    for (var oi = 0; oi < options.length; oi++) {
      var opt = options[oi];
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

    // ═��═══════════════════���═════════════════════════════
    //  Floating buttons (position: absolute, above all cards)
    //  Sit outside card boundaries — do not clip or contain
    // ══════��═══════════���════════════════════════════════

    var floats = [
      { label: 'ADD ITEM(S)', variant: 'gold', size: 'lg', x: 816, y: 504 },
      { label: 'EDIT SEATS',  variant: 'dark', size: 'lg', x: 816, y: 336 },
      { label: '+1 ROUND',    variant: 'gold', size: 'md', x: 408, y: 336 },
    ];

    for (var fi = 0; fi < floats.length; fi++) {
      var f = floats[fi];
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

  unmount: function(state) {
    for (var i = 0; i < state.listeners.length; i++) {
      var l = state.listeners[i];
      l.el.removeEventListener(l.event, l.handler);
    }
    state.listeners = [];
  },
});
