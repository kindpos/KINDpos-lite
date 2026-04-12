// ═══════════════════════════════════════════════════
//  KINDpos Terminal — check-overview scene (SM2)
//  Working layer: Check overview with seats, options, and OrderSummary
//  SceneManager.mountWorking('check-overview', { checkId, tableId })
// ═══════════════════════════════════════════════════

import { defineScene } from '../scene-manager-2.js';
import { SceneManager } from '../scene-manager.js';
import { T, chamfer, bevelEdges, buildStyledButton } from '../tokens.js';
import { OrderSummary } from '../order-summary.js';
import { showToast } from '../components.js';
import { setSceneName, setHeaderBack } from '../app.js';
import './column-editor.js';

// TODO: No font-size token exists for 26px card header labels — using inline '9px'.

var TAX_RATE = 0.08;
var CASH_DISCOUNT = 0.03;

// ── Inject invisible scrollbar style ──
(function() {
  if (document.getElementById('co-scroll-style')) return;
  var s = document.createElement('style');
  s.id = 'co-scroll-style';
  s.textContent = '.co-scroll::-webkit-scrollbar{display:none}';
  document.head.appendChild(s);
})();

function seatTotal(seat) {
  var t = 0;
  for (var i = 0; i < seat.items.length; i++) t += seat.items[i].qty * seat.items[i].price;
  return t;
}

function fmt(n) { return '$' + (n || 0).toFixed(2); }

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
  var tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  var cardTotal = Math.round((subtotal + tax) * 100) / 100;
  var cashPrice = Math.round(cardTotal * (1 - CASH_DISCOUNT) * 100) / 100;
  return { items: items, subtotal: subtotal, tax: tax, cardTotal: cardTotal, cashPrice: cashPrice };
}

// Group order items by seat_number into seats array
function orderToSeats(order) {
  var seatMap = {};
  var items = order.items || [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var sn = item.seat_number || 1;
    var key = 'S-' + String(sn).padStart(3, '0');
    if (!seatMap[key]) seatMap[key] = { id: key, items: [] };
    seatMap[key].items.push({
      name: item.name,
      qty: item.quantity || 1,
      price: item.price || 0,
      item_id: item.item_id,
    });
  }
  var seats = [];
  var keys = Object.keys(seatMap).sort();
  for (var j = 0; j < keys.length; j++) seats.push(seatMap[keys[j]]);
  if (seats.length === 0) seats.push({ id: 'S-001', items: [] });
  return seats;
}

defineScene({
  name: 'check-overview',

  state: {
    listeners: [],
    seats: [],
    selected: {},
    seatEls: {},
    orderId: null,
    checkNumber: '',
    order: null,
  },

  render: function(container, params, state) {
    function track(el, event, handler) {
      el.addEventListener(event, handler);
      state.listeners.push({ el: el, event: event, handler: handler });
    }

    var mintEdges = bevelEdges(T.mint);
    var darkEdges = bevelEdges(T.darkBtn);

    state.orderId = params.checkId || null;
    state.checkNumber = '';

    // ── Header ──
    setSceneName(params.checkId ? 'CHECK' : 'NEW CHECK');
    setHeaderBack({
      back: true,
      onBack: function() {
        SceneManager.mountWorking('manager-landing', params);
      },
      x: true,
    });

    // Show persistent OrderSummary panel
    OrderSummary.show({ checkId: '', items: [], subtotal: 0, tax: 0, cardTotal: 0, cashPrice: 0 });

    var root = document.createElement('div');
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      background: T.bg,
    });
    container.appendChild(root);

    // ═══════════════════════════════════════════════════
    //  SEATS card
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

    // "+" tile (persistent, always at end)
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
    Object.assign(plusText.style, { fontFamily: T.fb, fontSize: '40px', color: T.mint });
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

    function rebuildSeatGrid() {
      // Remove all tiles except the "+" addTile
      while (seatsGrid.firstChild && seatsGrid.firstChild !== addTile) {
        seatsGrid.removeChild(seatsGrid.firstChild);
      }
      state.seatEls = {};
      for (var i = 0; i < state.seats.length; i++) {
        seatsGrid.insertBefore(buildSeatTile(state.seats[i]), addTile);
      }
    }

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
        checkId: state.checkNumber || '',
        items: totals.items,
        subtotal: totals.subtotal,
        tax: totals.tax,
        cardTotal: totals.cardTotal,
        cashPrice: totals.cashPrice,
      });
    }

    track(allBtn, 'pointerup', function() { selectAll(); });

    // ═══════════════════════════════════════════════════
    //  Fetch real order data (or start empty)
    // ═══════════════════════════════════════════════════

    if (state.orderId) {
      fetch('/api/v1/orders/' + state.orderId)
        .then(function(r) { return r.json(); })
        .then(function(order) {
          state.order = order;
          state.checkNumber = order.check_number || '';
          state.seats = orderToSeats(order);
          setSceneName(state.checkNumber || 'CHECK');
          rebuildSeatGrid();
          selectAll();
        })
        .catch(function() {
          showToast('Failed to load check', { bg: T.red });
          state.seats = [{ id: 'S-001', items: [] }];
          rebuildSeatGrid();
          selectAll();
        });
    } else {
      // New check — start with one empty seat
      state.seats = [{ id: 'S-001', items: [] }];
      rebuildSeatGrid();
      selectAll();
    }

    // ═══════════════════════════════════════════════════
    //  CHECK OPTIONS card
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

    // ── Button handlers ──

    function handlePrint() {
      if (!state.orderId) { showToast('No check to print', { bg: T.red }); return; }
      fetch('/api/v1/print/receipt/' + state.orderId + '?copy_type=customer', { method: 'POST' })
        .then(function(r) {
          if (r.ok) showToast('Receipt sent to printer', { bg: T.goGreen });
          else showToast('Print failed', { bg: T.red });
        })
        .catch(function() { showToast('Print failed', { bg: T.red }); });
    }

    function handleDiscount() {
      if (!state.orderId) { showToast('No check to discount', { bg: T.red }); return; }
      SceneManager.interrupt('disc-pin', {
        onConfirm: function(pin) {
          SceneManager.interrupt('disc-select', {
            onConfirm: function(opt) {
              var pct = opt === 'Comp (100%)' ? 1.0 : parseFloat(opt) / 100;
              var totals = collectSummary(state.seats, state.selected);
              var amount = Math.round(totals.subtotal * pct * 100) / 100;
              fetch('/api/v1/orders/' + state.orderId + '/discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discount_type: opt, amount: amount, approved_by: pin }),
              }).then(function(r) {
                if (r.ok) { showToast('Discount applied: ' + opt, { bg: T.goGreen }); refreshOrder(); }
                else showToast('Discount failed', { bg: T.red });
              }).catch(function() { showToast('Discount failed', { bg: T.red }); });
            },
            onCancel: function() {},
          });
        },
        onCancel: function() {},
      });
    }

    function handleVoid() {
      if (!state.orderId) { showToast('No check to void', { bg: T.red }); return; }
      SceneManager.interrupt('disc-pin', {
        onConfirm: function(pin) {
          fetch('/api/v1/orders/' + state.orderId + '/void', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Voided from check overview', approved_by: pin }),
          }).then(function(r) {
            if (r.ok) {
              showToast('Check voided', { bg: T.goGreen });
              fetch('/api/v1/print/ticket/' + state.orderId + '?void=true', { method: 'POST' });
              SceneManager.mountWorking('manager-landing', params);
            } else showToast('Void failed', { bg: T.red });
          }).catch(function() { showToast('Void failed', { bg: T.red }); });
        },
        onCancel: function() {},
      });
    }

    function handlePay() {
      if (!state.orderId) { showToast('No check to pay', { bg: T.red }); return; }
      var totals = collectSummary(state.seats, { ALL: true });
      // Select all for payment totals
      var allSelected = {};
      for (var si = 0; si < state.seats.length; si++) allSelected[state.seats[si].id] = true;
      totals = collectSummary(state.seats, allSelected);
      SceneManager.openTransactional('payment-console', {
        orderId: state.orderId,
        checkId: state.checkNumber,
        items: totals.items,
        subtotal: totals.subtotal,
        tax: totals.tax,
        cardTotal: totals.cardTotal,
        cashPrice: totals.cashPrice,
        discount: 0,
        returnScene: 'check-overview',
      });
    }

    function handleDrawer() {
      // No API endpoint yet — stub
      showToast('Cash drawer — not yet wired', { bg: T.gold });
    }

    function handleResend() {
      if (!state.orderId) { showToast('No check to resend', { bg: T.red }); return; }
      fetch('/api/v1/orders/' + state.orderId + '/send', { method: 'POST' })
        .then(function(r) {
          if (r.ok) showToast('Sent to kitchen', { bg: T.goGreen });
          else showToast('Send failed', { bg: T.red });
        })
        .catch(function() { showToast('Send failed', { bg: T.red }); });
    }

    function refreshOrder() {
      if (!state.orderId) return;
      fetch('/api/v1/orders/' + state.orderId)
        .then(function(r) { return r.json(); })
        .then(function(order) {
          state.order = order;
          state.checkNumber = order.check_number || '';
          state.seats = orderToSeats(order);
          setSceneName(state.checkNumber || 'CHECK');
          rebuildSeatGrid();
          selectAll();
          // If fully paid, return to landing
          if (order.status === 'paid' || order.status === 'closed') {
            showToast('Check closed', { bg: T.goGreen });
            SceneManager.mountWorking('manager-landing', params);
            return;
          }
        })
        .catch(function() { showToast('Refresh failed', { bg: T.red }); });
    }

    // Listen for payment completion — refresh to check if check is fully paid or partial
    SceneManager.on('payment:complete', refreshOrder);
    state.listeners.push({ el: null, event: 'payment:complete', handler: refreshOrder, bus: true });

    var optHandlers = {
      PRINT: handlePrint,
      DISCOUNT: handleDiscount,
      VOID: handleVoid,
      PAY: handlePay,
      DRAWER: handleDrawer,
      RSND: handleResend,
    };

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
          return function() { (optHandlers[lbl] || function() {})(); };
        })(opt.label),
      });
      optBody.appendChild(btn.wrap);
    }

    optCard.appendChild(optBody);
    root.appendChild(optCard);

    // ═══════════════════════════════════════════════════
    //  Floating buttons
    // ═══════════════════════════════════════════════════

    // ADD ITEM(S) — open order-entry for this check
    var addItemBtn = buildStyledButton({
      label: 'ADD ITEM(S)', variant: 'gold', size: 'lg',
      onClick: function() {
        if (state.orderId) {
          SceneManager.mountWorking('order-entry', {
            recallOrderId: state.orderId,
            mode: 'service',
            pin: params.pin,
            employeeId: params.employeeId,
            employeeName: params.employeeName,
          });
        } else {
          SceneManager.mountWorking('order-entry', {
            mode: 'service',
            pin: params.pin,
            employeeId: params.employeeId,
            employeeName: params.employeeName,
          });
        }
      },
    });
    Object.assign(addItemBtn.wrap.style, {
      position: 'absolute', left: '520px', top: '468px', zIndex: '50',
    });
    root.appendChild(addItemBtn.wrap);

    // EDIT SEATS — open column-editor with selected seats
    var editSeatsBtn = buildStyledButton({
      label: 'EDIT SEATS', variant: 'dark', size: 'lg',
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
          onSave: function(columns) {
            // Apply column-editor changes back to seat state
            state.seats = [];
            for (var ci = 0; ci < columns.length; ci++) {
              state.seats.push({
                id: columns[ci].id,
                label: columns[ci].label,
                items: columns[ci].items,
              });
            }
            rebuildSeatGrid();
            selectAll();
            // Persist seat_number changes via API
            if (state.orderId) {
              for (var pi = 0; pi < columns.length; pi++) {
                var seatNum = pi + 1;
                var colItems = columns[pi].items;
                for (var qi = 0; qi < colItems.length; qi++) {
                  if (colItems[qi].item_id) {
                    fetch('/api/v1/orders/' + state.orderId + '/items/' + colItems[qi].item_id, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ seat_number: seatNum }),
                    }).catch(function() {});
                  }
                }
              }
            }
          },
        });
      },
    });
    Object.assign(editSeatsBtn.wrap.style, {
      position: 'absolute', left: '520px', top: '360px', zIndex: '50',
    });
    root.appendChild(editSeatsBtn.wrap);

    // +1 ROUND — open order-entry to add more items
    var roundBtn = buildStyledButton({
      label: '+1 ROUND', variant: 'gold', size: 'md',
      onClick: function() {
        if (state.orderId) {
          SceneManager.mountWorking('order-entry', {
            recallOrderId: state.orderId,
            mode: 'service',
            pin: params.pin,
            employeeId: params.employeeId,
            employeeName: params.employeeName,
          });
        } else {
          showToast('Save check first', { bg: T.gold });
        }
      },
    });
    Object.assign(roundBtn.wrap.style, {
      position: 'absolute', left: '300px', top: '336px', zIndex: '50',
    });
    root.appendChild(roundBtn.wrap);
  },

  unmount: function(state) {
    OrderSummary.hide();
    for (var i = 0; i < state.listeners.length; i++) {
      var l = state.listeners[i];
      if (l.bus) {
        SceneManager.off(l.event, l.handler);
      } else {
        l.el.removeEventListener(l.event, l.handler);
      }
    }
    state.listeners = [];
  },
});
