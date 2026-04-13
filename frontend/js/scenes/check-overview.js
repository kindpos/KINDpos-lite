// ═══════════════════════════════════════════════════
//  KINDpos Terminal — check-overview scene (SM2)
//  Working layer: Check overview with seats, options, and OrderSummary
//  SceneManager.mountWorking('check-overview', { checkId, tableId })
// ═══════════════════════════════════════════════════

import { defineScene } from '../scene-manager-2.js';
import { SceneManager } from '../scene-manager.js';
import { T, chamfer, bevelEdges, buildStyledButton } from '../tokens.js';
import { buildButton } from '../components.js';
import { OrderSummary } from '../order-summary.js';
import { buildNumpad } from '../numpad.js';
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
    selectedItems: {},  // { 'seatIdx:itemIdx': true }
  },

  render: function(container, params, state) {
    function track(el, event, handler) {
      el.addEventListener(event, handler);
      state.listeners.push({ el: el, event: event, handler: handler });
    }

    var mintEdges = bevelEdges(T.mint);
    var chassisEdges = bevelEdges(T.numpadChassis);
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
    // Hide split button — split is available via EDIT SEATS column-editor
    var summaryEl = OrderSummary.getElement();
    if (summaryEl) {
      var splitBtns = summaryEl.querySelectorAll('div');
      for (var sb = 0; sb < splitBtns.length; sb++) {
        if (splitBtns[sb].textContent === 'Split') { splitBtns[sb].style.display = 'none'; break; }
      }
    }

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
      height: '316px',
      borderRadius: '5px',
      background: T.bg,
      borderTop: T.bevel + 'px solid ' + chassisEdges.light,
      borderLeft: T.bevel + 'px solid ' + chassisEdges.light,
      borderBottom: T.bevel + 'px solid ' + chassisEdges.dark,
      borderRight: T.bevel + 'px solid ' + chassisEdges.dark,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    });

    var seatsH = document.createElement('div');
    Object.assign(seatsH.style, {
      background: T.numpadChassis,
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
      var anySelected = false;
      for (var si = 0; si < state.seats.length; si++) {
        var seat = state.seats[si];
        var el = state.seatEls[seat.id];
        if (!el) continue;
        var sel = !!state.selected[seat.id];
        var hasItems = seat.items.length > 0;
        if (sel) anySelected = true;

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
      // EDIT SEATS only visible when seats are selected
      if (editSeatsBtn) editSeatsBtn.wrap.style.display = anySelected ? '' : 'none';
    }

    function toggleItem(key) {
      if (state.selectedItems[key]) {
        delete state.selectedItems[key];
      } else {
        state.selectedItems[key] = true;
      }
    }

    function toggleSeatItems(seatIdx) {
      var seat = state.seats[seatIdx];
      if (!seat) return;
      // Check if all items in this seat are already selected
      var allSelected = true;
      for (var ti = 0; ti < seat.items.length; ti++) {
        if (!state.selectedItems[seatIdx + ':' + ti]) { allSelected = false; break; }
      }
      // Toggle: if all selected → deselect all, else select all
      for (var tj = 0; tj < seat.items.length; tj++) {
        var key = seatIdx + ':' + tj;
        if (allSelected) { delete state.selectedItems[key]; }
        else { state.selectedItems[key] = true; }
      }
    }

    function getSelectedItemIds() {
      // Return item_ids of all selected items (for API calls)
      var ids = [];
      var keys = Object.keys(state.selectedItems);
      for (var ki = 0; ki < keys.length; ki++) {
        var parts = keys[ki].split(':');
        var seatIdx = parseInt(parts[0]);
        var itemIdx = parseInt(parts[1]);
        var seat = state.seats[seatIdx];
        if (seat && seat.items[itemIdx] && seat.items[itemIdx].item_id) {
          ids.push(seat.items[itemIdx].item_id);
        }
      }
      return ids;
    }

    function updateSummary() {
      var totals = collectSummary(state.seats, state.selected);
      OrderSummary.update({
        checkId: state.checkNumber || '',
        skipItems: true,
        subtotal: totals.subtotal,
        tax: totals.tax,
        cardTotal: totals.cardTotal,
        cashPrice: totals.cashPrice,
      });
      var ticketList = document.getElementById('ticket-list');
      if (!ticketList) return;
      ticketList.innerHTML = '';

      var selectedSeats = [];
      var seatIndices = [];
      for (var ui = 0; ui < state.seats.length; ui++) {
        if (state.selected[state.seats[ui].id]) {
          selectedSeats.push(state.seats[ui]);
          seatIndices.push(ui);
        }
      }

      if (selectedSeats.length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'padding:16px 8px;font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.mutedText + ';text-align:center;';
        empty.textContent = 'No seats selected';
        ticketList.appendChild(empty);
        return;
      }

      for (var si = 0; si < selectedSeats.length; si++) {
        var seat = selectedSeats[si];
        var seatIdx = seatIndices[si];
        var total = seatTotal(seat);

        var card = document.createElement('div');
        card.style.cssText = 'margin-bottom:2px;';

        // Seat header — tap to select/deselect all items on this seat
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:2px 8px;background:' + T.bg3 + ';cursor:pointer;user-select:none;border-bottom:1px solid ' + T.border + ';';
        var hdrLabel = document.createElement('span');
        hdrLabel.style.cssText = 'font-family:' + T.fh + ';font-size:' + T.fsCon + ';color:' + T.numpadChassis + ';letter-spacing:2px;';
        hdrLabel.textContent = seat.id;
        hdr.appendChild(hdrLabel);
        var hdrTotal = document.createElement('span');
        hdrTotal.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsCon + ';color:' + T.gold + ';';
        hdrTotal.textContent = fmt(total);
        hdr.appendChild(hdrTotal);
        card.appendChild(hdr);

        (function(idx) {
          hdr.addEventListener('pointerup', function() {
            toggleSeatItems(idx);
            updateSummary();
          });
        })(seatIdx);

        // Items body
        var body = document.createElement('div');
        body.style.cssText = 'overflow:hidden;';

        if (seat.items.length === 0) {
          var emptyRow = document.createElement('div');
          emptyRow.style.cssText = 'padding:1px 8px;font-family:' + T.fb + ';font-size:' + T.fsCon + ';color:' + T.mutedText + ';';
          emptyRow.textContent = 'Empty';
          body.appendChild(emptyRow);
        } else {
          for (var ii = 0; ii < seat.items.length; ii++) {
            var it = seat.items[ii];
            var key = seatIdx + ':' + ii;
            var isSel = !!state.selectedItems[key];

            var row = document.createElement('div');
            row.style.cssText = 'display:grid;grid-template-columns:1fr 30px 58px;gap:0 4px;padding:1px 8px;font-family:' + T.fb + ';font-size:' + T.fsCon + ';cursor:pointer;user-select:none;border-bottom:1px solid ' + T.bg3 + ';'
              + 'background:' + (isSel ? T.gold : '') + ';color:' + (isSel ? T.bgDark : T.textPrimary) + ';';
            var nameEl = document.createElement('div');
            nameEl.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            nameEl.textContent = it.name;
            var qtyEl = document.createElement('div');
            qtyEl.style.cssText = 'text-align:right;color:' + (isSel ? T.bgDark : T.gold) + ';';
            qtyEl.textContent = it.qty + '\u00D7';
            var priceEl = document.createElement('div');
            priceEl.style.cssText = 'text-align:right;color:' + (isSel ? T.bgDark : T.gold) + ';';
            priceEl.textContent = fmt(it.qty * it.price);
            row.appendChild(nameEl);
            row.appendChild(qtyEl);
            row.appendChild(priceEl);

            (function(k) {
              row.addEventListener('pointerup', function() {
                toggleItem(k);
                updateSummary();
              });
            })(key);

            body.appendChild(row);
          }
        }

        card.appendChild(body);
        ticketList.appendChild(card);
      }
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
    //  Check option buttons (free-floating, no card)
    // ═══════════════════════════════════════════════════

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
      var itemIds = getSelectedItemIds();
      SceneManager.interrupt('disc-pin', {
        onConfirm: function(pin) {
          SceneManager.interrupt('disc-select', {
            onConfirm: function(opt) {
              var pct = opt === 'Comp (100%)' ? 1.0 : parseFloat(opt) / 100;
              var totals = collectSummary(state.seats, state.selected);
              var amount = Math.round(totals.subtotal * pct * 100) / 100;
              var body = { discount_type: opt, amount: amount, approved_by: pin };
              if (itemIds.length > 0) body.item_ids = itemIds;
              fetch('/api/v1/orders/' + state.orderId + '/discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              }).then(function(r) {
                if (r.ok) {
                  showToast('Discount applied: ' + opt, { bg: T.goGreen });
                  state.selectedItems = {};
                  refreshOrder();
                } else showToast('Discount failed', { bg: T.red });
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
      var itemIds = getSelectedItemIds();
      SceneManager.interrupt('disc-pin', {
        onConfirm: function(pin) {
          if (itemIds.length > 0) {
            // Item-level void: delete each selected item
            var pending = itemIds.length;
            var failed = 0;
            for (var vi = 0; vi < itemIds.length; vi++) {
              fetch('/api/v1/orders/' + state.orderId + '/items/' + itemIds[vi], { method: 'DELETE' })
                .then(function(r) { if (!r.ok) failed++; if (--pending === 0) finishVoid(); })
                .catch(function() { failed++; if (--pending === 0) finishVoid(); });
            }
            function finishVoid() {
              if (failed > 0) showToast(failed + ' item(s) failed to void', { bg: T.red });
              else showToast('Items voided', { bg: T.goGreen });
              state.selectedItems = {};
              refreshOrder();
            }
          } else {
            // Full check void
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
          }
        },
        onCancel: function() {},
      });
    }

    function handlePay() {
      if (!state.orderId) { showToast('No check to pay', { bg: T.red }); return; }
      var totals = collectSummary(state.seats, state.selected);
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
          // If fully paid/closed, return to landing
          if (order.status === 'paid' || order.status === 'closed') {
            showToast('Check closed', { bg: T.goGreen });
            SceneManager.mountWorking('manager-landing', params);
            return;
          }
          // If all items voided (empty check at $0), void the order and return
          if ((order.items || []).length === 0 && (order.total || 0) <= 0 && order.status !== 'voided') {
            fetch('/api/v1/orders/' + state.orderId + '/void', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'All items removed', approved_by: 'system' }),
            }).then(function() {
              showToast('Check voided', { bg: T.goGreen });
              SceneManager.mountWorking('manager-landing', params);
            }).catch(function() {
              SceneManager.mountWorking('manager-landing', params);
            });
            return;
          }
          if (order.status === 'voided') {
            showToast('Check voided', { bg: T.goGreen });
            SceneManager.mountWorking('manager-landing', params);
            return;
          }
        })
        .catch(function() { showToast('Refresh failed', { bg: T.red }); });
    }

    // Listen for payment completion — refresh to check if check is fully paid or partial
    SceneManager.on('payment:complete', refreshOrder);
    state.listeners.push({ el: null, event: 'payment:complete', handler: refreshOrder, bus: true });

    // Row 1 (y:340): PRINT    RSND             DISC
    // Row 2 (y:388): PAY      DRAWER    VOID
    var printBtn = buildStyledButton({ label: 'PRINT', variant: 'gold', size: 'md', onClick: handlePrint });
    Object.assign(printBtn.wrap.style, { position: 'absolute', left: '12px', top: '340px' });
    root.appendChild(printBtn.wrap);

    var rsndBtn = buildStyledButton({ label: 'RSND', variant: 'dark', size: 'sm', onClick: handleResend });
    Object.assign(rsndBtn.wrap.style, { position: 'absolute', left: '240px', top: '340px' });
    root.appendChild(rsndBtn.wrap);

    var discBtn = buildStyledButton({ label: 'DISC', variant: 'vermillion', size: 'sm', onClick: handleDiscount });
    Object.assign(discBtn.wrap.style, { position: 'absolute', left: '358px', top: '340px' });
    root.appendChild(discBtn.wrap);

    var payBtn = buildStyledButton({ label: 'PAY', variant: 'mint', size: 'md', onClick: handlePay });
    Object.assign(payBtn.wrap.style, { position: 'absolute', left: '12px', top: '388px' });
    root.appendChild(payBtn.wrap);

    var drawerBtn = buildStyledButton({ label: 'DRAWER', variant: 'dark', size: 'sm', onClick: handleDrawer });
    Object.assign(drawerBtn.wrap.style, { position: 'absolute', left: '240px', top: '388px' });
    root.appendChild(drawerBtn.wrap);

    var voidBtn = buildStyledButton({ label: 'VOID', variant: 'vermillion', size: 'sm', onClick: handleVoid });
    Object.assign(voidBtn.wrap.style, { position: 'absolute', left: '358px', top: '388px' });
    root.appendChild(voidBtn.wrap);

    // ═══════════════════════════════════════════════════
    //  Floating buttons
    // ═══════════════════════════════════════════════════

    // ADD ITEM(S) — open order-entry for this check
    var addItemBtn = buildStyledButton({
      label: 'ADD ITEM(S)', variant: 'gold', size: 'lg',
      onClick: function() {
        var selectedSeatNums = [];
        for (var ai = 0; ai < state.seats.length; ai++) {
          if (state.selected[state.seats[ai].id]) selectedSeatNums.push(ai + 1);
        }
        if (selectedSeatNums.length === 0) {
          for (var aj = 0; aj < state.seats.length; aj++) selectedSeatNums.push(aj + 1);
        }
        SceneManager.mountWorking('order-entry', {
          recallOrderId: state.orderId || undefined,
          mode: 'service',
          pin: params.pin,
          employeeId: params.employeeId,
          employeeName: params.employeeName,
          returnScene: 'check-overview',
          seatNumbers: selectedSeatNums,
        });
      },
    });
    Object.assign(addItemBtn.wrap.style, {
      position: 'absolute', left: '492px', top: '448px', zIndex: '50',
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
          orderId: state.orderId,
          serverId: state.order ? state.order.server_id : null,
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
      position: 'absolute', left: '492px', top: '336px', zIndex: '50',
      display: 'none',
    });
    root.appendChild(editSeatsBtn.wrap);

    // +1 ROUND — duplicate selected seat items, auto-send to kitchen
    var roundBtn = buildStyledButton({
      label: '+1 ROUND', variant: 'gold', size: 'md',
      onClick: function() {
        if (!state.orderId) { showToast('Save check first', { bg: T.gold }); return; }

        // Collect items from selected seats
        var itemsToAdd = [];
        for (var ri = 0; ri < state.seats.length; ri++) {
          if (!state.selected[state.seats[ri].id]) continue;
          var seatNum = ri + 1;
          for (var rj = 0; rj < state.seats[ri].items.length; rj++) {
            var it = state.seats[ri].items[rj];
            itemsToAdd.push({
              name: it.name,
              price: it.price,
              quantity: it.qty,
              seat_number: seatNum,
            });
          }
        }

        if (itemsToAdd.length === 0) {
          showToast('No items to reorder', { bg: T.gold });
          return;
        }

        // POST each item, then send to kitchen, then refresh
        var pending = itemsToAdd.length;
        var failed = 0;
        for (var rk = 0; rk < itemsToAdd.length; rk++) {
          fetch('/api/v1/orders/' + state.orderId + '/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemsToAdd[rk]),
          }).then(function(r) {
            if (!r.ok) failed++;
            if (--pending === 0) finishRound();
          }).catch(function() {
            failed++;
            if (--pending === 0) finishRound();
          });
        }

        function finishRound() {
          if (failed > 0) {
            showToast(failed + ' item(s) failed to add', { bg: T.red });
          }
          // Send unsent items to kitchen
          fetch('/api/v1/orders/' + state.orderId + '/send', { method: 'POST' })
            .then(function() {
              showToast('+1 Round sent to kitchen', { bg: T.goGreen });
              refreshOrder();
            })
            .catch(function() {
              showToast('Send failed', { bg: T.red });
              refreshOrder();
            });
        }
      },
    });
    Object.assign(roundBtn.wrap.style, {
      position: 'absolute', left: '492px', top: '392px', zIndex: '50',
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

// ═══════════════════════════════════════════════════
//  Shared interrupt scenes (disc-pin, disc-select)
// ═══════════════════════════════════════════════════

var DISCOUNT_OPTIONS = ['10%', '15%', '20%', '25%', '50%', 'Comp (100%)'];

SceneManager.register({
  name: 'disc-pin',
  mount: function(container, params) {
    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';border-radius:5px;padding:20px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:13px;color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// MANAGER PIN //';
    panel.appendChild(lbl);

    var numpad = buildNumpad({
      onSubmit: function(pin) {
        fetch('/api/v1/servers').then(function(r) { return r.json(); }).then(function(data) {
          var servers = data.servers || [];
          var mgr = servers.find(function(s) { return s.pin === pin && (s.roles || []).indexOf('manager') !== -1; });
          if (mgr) {
            SceneManager.resolveInterrupt('disc-pin');
            params.onConfirm(mgr.id || pin);
          } else {
            numpad.setError('NOT AUTHORIZED');
          }
        }).catch(function() { numpad.setError('NETWORK ERROR'); });
      },
    });
    panel.appendChild(numpad);

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 40,
      onTap: function() { SceneManager.resolveInterrupt('disc-pin'); params.onCancel(); },
    });
    cancelBtn.style.width = '332px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);

    container.addEventListener('pointerup', function(e) {
      if (e.target === container) { SceneManager.resolveInterrupt('disc-pin'); params.onCancel(); }
    });
  },
  unmount: function() {},
});

SceneManager.register({
  name: 'disc-select',
  mount: function(container, params) {
    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';border-radius:5px;padding:20px;min-width:280px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:13px;color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// DISCOUNT //';
    panel.appendChild(lbl);

    DISCOUNT_OPTIONS.forEach(function(opt) {
      var btn = buildButton(opt, {
        fill: T.darkBtn, color: T.mint, fontSize: '26px', height: 44,
        onTap: function() { SceneManager.resolveInterrupt('disc-select'); params.onConfirm(opt); },
      });
      btn.style.width = '240px';
      panel.appendChild(btn);
    });

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: '22px', height: 40,
      onTap: function() { SceneManager.resolveInterrupt('disc-select'); params.onCancel(); },
    });
    cancelBtn.style.width = '240px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);
  },
  unmount: function() {},
});
