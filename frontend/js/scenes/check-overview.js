// ═══════════════════════════════════════════════════
//  KINDpos Terminal — check-overview scene (SM2)
//  Working layer: Check overview with seats, options, and OrderSummary
//  SceneManager.mountWorking('check-overview', { checkId, tableId })
// ═══════════════════════════════════════════════════

import { defineScene } from '../scene-manager-2.js';
import { SceneManager } from '../scene-manager.js';
import { T, chamfer, bevelEdges, buildStyledButton } from '../tokens.js';
import { OrderSummary } from '../order-summary.js';
import './column-editor.js';

// TODO: No font-size token exists for 26px card header labels — using inline '9px'.
//       Consider adding T.fsLabel or similar to tokens.js.

// ── Inject invisible scrollbar style ──
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
  for (var i = 0; i < seat.items.length; i++) t += seat.items[i].qty * seat.items[i].price;
  return t;
}

function fmt(n) { return '$' + (n || 0).toFixed(2); }

// Flatten selected seats into OrderSummary item format
function collectSummary(seats, selected) {
  var items = [];
  var subtotal = 0;
  for (var i = 0; i < seats.length; i++) {
    if (!selected[seats[i].id]) continue;
    for (var j = 0; j < seats[i].items.length; j++) {
      var it = seats[i].items[j];
      items.push({ name: it.name, qty: it.qty, unitPrice: it.price });
      subtotal += it.qty * it.price;
    }
  }
  var tax = Math.round(subtotal * 0.08 * 100) / 100;
  var cardTotal = Math.round((subtotal + tax) * 100) / 100;
  var cashPrice = Math.round(cardTotal * 0.97 * 100) / 100;
  return { items: items, subtotal: subtotal, tax: tax, cardTotal: cardTotal, cashPrice: cashPrice };
}

defineScene({
  name: 'check-overview',

  state: {
    listeners: [],
    seats: [],
    selected: {},
    seatEls: {},
  },

  render: function(container, params, state) {
    function track(el, event, handler) {
      el.addEventListener(event, handler);
      state.listeners.push({ el: el, event: event, handler: handler });
    }

    state.seats = getMockSeats();

    var mintEdges = bevelEdges(T.mint);
    var darkEdges = bevelEdges(T.darkBtn);

    // Show persistent OrderSummary panel (matches order-entry placement + style)
    OrderSummary.show({ checkId: params.checkId || '', items: [], subtotal: 0, tax: 0, cardTotal: 0, cashPrice: 0 });

    var root = document.createElement('div');
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      background: T.bg,
    });
    container.appendChild(root);

    // ═══════════════════════════════════════════════════
    //  SEATS card (top, full width of working area)
    //  Working layer is ~732px wide when OrderSummary visible
    // ═══════════════════════════════════════════════════

    var seatsCard = document.createElement('div');
    Object.assign(seatsCard.style, {
      position: 'absolute',
      left: '12px',
      top: '12px',
      right: '12px',
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

    // Header: SEATS left, ALL right
    var seatsH = document.createElement('div');
    Object.assign(seatsH.style, {
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

    var seatsLabel = document.createElement('span');
    seatsLabel.textContent = 'SEATS';
    seatsH.appendChild(seatsLabel);

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
    seatsH.appendChild(allBtn);
    seatsCard.appendChild(seatsH);

    // Grid body — 3 columns, auto rows, invisible scroll
    var seatsGrid = document.createElement('div');
    seatsGrid.className = 'co-scroll';
    Object.assign(seatsGrid.style, {
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
      seatsGrid.appendChild(buildSeatTile(state.seats[i]));
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
      seatsGrid.insertBefore(buildSeatTile(newSeat), addTile);
    });

    seatsGrid.appendChild(addTile);
    seatsCard.appendChild(seatsGrid);
    root.appendChild(seatsCard);

    // ═══════════════════════════════════════════════════
    //  Selection logic
    // ═══════════════════════════════════════════════════

    function toggleSeat(seatId) {
      if (state.selected[seatId]) {
        delete state.selected[seatId];
      } else {
        state.selected[seatId] = true;
      }
      updateSeatVisuals();
      updateSummary();
    }

    function selectAll() {
      state.selected = {};
      for (var si = 0; si < state.seats.length; si++) {
        state.selected[state.seats[si].id] = true;
      }
      updateSeatVisuals();
      updateSummary();
    }

    function updateSeatVisuals() {
      for (var si = 0; si < state.seats.length; si++) {
        var seat = state.seats[si];
        var el = state.seatEls[seat.id];
        if (!el) continue;
        var sel = !!state.selected[seat.id];
        var hasItems = seat.items.length > 0;

        if (sel) {
          el.header.style.background = T.bgDark;
          el.header.style.color = el.frameColor;
          el.body.style.background = el.frameColor;
          el.body.style.color = T.bgDark;
        } else {
          el.header.style.background = el.frameColor;
          el.header.style.color = T.bgDark;
          el.body.style.background = '';
          el.body.style.color = hasItems ? T.gold : T.mutedText;
        }
      }
    }

    function updateSummary() {
      var totals = collectSummary(state.seats, state.selected);
      OrderSummary.update({
        checkId: params.checkId || '',
        items: totals.items,
        subtotal: totals.subtotal,
        tax: totals.tax,
        cardTotal: totals.cardTotal,
        cashPrice: totals.cashPrice,
      });
    }

    track(allBtn, 'pointerup', function() { selectAll(); });

    // Default: ALL selected on mount
    selectAll();

    // ═══════════════════════════════════════════════════
    //  CHECK OPTIONS card (bottom left)
    // ═══════════════════════════════════════════════════

    var optCard = document.createElement('div');
    Object.assign(optCard.style, {
      position: 'absolute',
      left: '12px',
      top: '360px',
      width: '440px',
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

    var optH = document.createElement('div');
    Object.assign(optH.style, {
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
    optH.textContent = 'CHECK OPTIONS';
    optCard.appendChild(optH);

    var optBody = document.createElement('div');
    Object.assign(optBody.style, {
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
      optBody.appendChild(btn.wrap);
    }

    optCard.appendChild(optBody);
    root.appendChild(optCard);

    // ═══════════════════════════════════════════════════
    //  Floating buttons (position: absolute, above all cards)
    // ═══════════════════════════════════════════════════

    var floats = [
      { label: 'ADD ITEM(S)', variant: 'gold', size: 'lg', x: 520, y: 468 },
      {
        label: 'EDIT SEATS', variant: 'dark', size: 'lg', x: 520, y: 360,
        onClick: function() {
          var selectedSeats = [];
          for (var si = 0; si < state.seats.length; si++) {
            if (state.selected[state.seats[si].id]) selectedSeats.push(state.seats[si]);
          }
          if (selectedSeats.length === 0) selectedSeats = state.seats.slice();
          SceneManager.openTransactional('column-editor', {
            columns: selectedSeats.map(function(s) {
              return { id: s.id, label: s.id, items: s.items.slice() };
            }),
            operations: ['MERGE', 'MOVE', 'SPLIT', 'TRANSFER'],
          });
        },
      },
      { label: '+1 ROUND',   variant: 'gold', size: 'md', x: 300, y: 336 },
    ];

    for (var fi = 0; fi < floats.length; fi++) {
      var f = floats[fi];
      var onClickFn = f.onClick || (function(lbl) {
        return function() { console.log('[check-overview] ' + lbl + ' tapped'); };
      })(f.label);
      var fb = buildStyledButton({
        label: f.label,
        variant: f.variant,
        size: f.size,
        onClick: onClickFn,
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
    OrderSummary.hide();
    for (var i = 0; i < state.listeners.length; i++) {
      var l = state.listeners[i];
      l.el.removeEventListener(l.event, l.handler);
    }
    state.listeners = [];
  },
});
