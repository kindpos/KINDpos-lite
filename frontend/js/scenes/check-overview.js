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
import { showKeyboard, hideKeyboard } from '../keyboard.js';
import './column-editor.js';

// TODO: No font-size token exists for 26px card header labels — using inline '9px'.

// ── Pricing constants (defaults, overwritten by /api/v1/config/pricing) ──
var TAX_RATE = 0.08;
var CASH_DISCOUNT = 0.03;
fetch('/api/v1/config/pricing').then(function(r) { return r.json(); }).then(function(d) {
  if (d.tax_rate != null)           TAX_RATE      = d.tax_rate;
  if (d.cash_discount_rate != null) CASH_DISCOUNT = d.cash_discount_rate;
}).catch(function() { /* keep defaults on network error */ });

var _refreshInFlight = false;

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
  for (var i = 0; i < seat.items.length; i++) t += seat.items[i].qty * (seat.items[i].effectivePrice || seat.items[i].price);
  return t;
}

function fmt(n) { return '$' + (n || 0).toFixed(2); }

function collectSummary(seats, selected) {
  var items = [];
  var subtotal = 0;
  var anySelected = Object.keys(selected).length > 0;
  var showHeaders = seats.length > 1;
  for (var i = 0; i < seats.length; i++) {
    if (anySelected && !selected[seats[i].id]) continue;
    var seatSub = 0;
    if (showHeaders) {
      for (var k = 0; k < seats[i].items.length; k++) seatSub += seats[i].items[k].qty * (seats[i].items[k].effectivePrice || seats[i].items[k].price);
      items.push({ seatHeader: true, seatId: seats[i].id, seatTotal: seatSub, seatIdx: i });
    }
    for (var j = 0; j < seats[i].items.length; j++) {
      var it = seats[i].items[j];
      var ep = it.effectivePrice || it.price;
      items.push({ name: it.name, qty: it.qty, unitPrice: ep, mods: it.mods || [] });
      subtotal += it.qty * ep;
    }
  }
  var tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  var cardTotal = Math.round((subtotal + tax) * 100) / 100;
  var cashPrice = Math.round(cardTotal * (1 - CASH_DISCOUNT) * 100) / 100;
  return { items: items, subtotal: subtotal, tax: tax, cardTotal: cardTotal, cashPrice: cashPrice };
}

// Group order items by seat_number into seats array
function orderToSeats(order, minSeats) {
  var seatMap = {};
  var items = order.items || [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var sn = item.seat_number || 1;
    var key = 'S-' + String(sn).padStart(3, '0');
    if (!seatMap[key]) seatMap[key] = { id: key, items: [] };
    var mods = (item.modifiers || []).map(function(m) {
      return { name: m.name || '', price: m.price || 0, charged: (m.price || 0) > 0, prefix: m.prefix || null, children: m.children || [] };
    });
    var modTotal = mods.reduce(function(s, m) { return s + (m.price || 0); }, 0);
    seatMap[key].items.push({
      name: item.name,
      qty: item.quantity || 1,
      price: item.price || 0,
      effectivePrice: (item.price || 0) + modTotal,
      item_id: item.item_id,
      menu_item_id: item.menu_item_id || '',
      category: item.category || null,
      added_at: item.added_at || null,
      sent_at: item.sent_at || null,
      mods: mods,
    });
  }
  // Ensure all seats up to the max seat_number exist (preserve empty seats)
  var maxSeat = 0;
  for (var mi = 0; mi < items.length; mi++) {
    var msn = items[mi].seat_number || 1;
    if (msn > maxSeat) maxSeat = msn;
  }
  // Also check guest_count as a seat count hint
  if (order.guest_count && order.guest_count > maxSeat) maxSeat = order.guest_count;
  if (minSeats && minSeats > maxSeat) maxSeat = minSeats;
  for (var si = 1; si <= maxSeat; si++) {
    var sKey = 'S-' + String(si).padStart(3, '0');
    if (!seatMap[sKey]) seatMap[sKey] = { id: sKey, items: [] };
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
    paidSeats: {},      // { 'S-001': true } — seats involved in completed payment
    _payingSeats: [],   // stashed seat IDs during active payment
  },

  render: function(container, params, state) {
    function track(el, event, handler) {
      el.addEventListener(event, handler);
      state.listeners.push({ el: el, event: event, handler: handler });
    }

    var chassisEdges = bevelEdges(T.numpadChassis);

    state.orderId = params.checkId || null;
    state.checkNumber = '';
    state.customerName = '';
    state.selected = {};
    state.selectedItems = {};
    state.seatEls = {};
    state.paidSeats = {};
    state._payingSeats = [];
    state._backConfirmed = false;

    // Determine which landing to return to
    var _landing = params.returnLanding || 'server-landing';

    // Build correct params shape for the landing scene.
    // Landing scenes expect { emp: { id, name, pin } }, but check-overview
    // receives flat params { employeeId, employeeName, pin, ... }.
    // Without this, returning to the landing fetches with an empty server_id
    // and checks from other servers bleed in or disappear.
    var _landingParams = { emp: { id: params.employeeId, name: params.employeeName, pin: params.pin } };

    // ── Header ──
    setSceneName(params.checkId ? 'CHECK' : 'NEW CHECK');
    setHeaderBack({
      back: true,
      onBack: function() {
        // Warn if new check was never saved
        if (!state.orderId && state.seats.some(function(s) { return s.items.length > 0; })) {
          showToast('Unsaved check \u2014 items will be lost', { bg: T.gold, duration: 2000 });
          // Double-tap to confirm: set a flag, second tap exits
          if (state._backConfirmed) {
            SceneManager.mountWorking(_landing, _landingParams);
            return;
          }
          state._backConfirmed = true;
          setTimeout(function() { state._backConfirmed = false; }, 3000);
          return;
        }
        SceneManager.mountWorking(_landing, _landingParams);
      },
      x: true,
    });

    // Show persistent OrderSummary panel
    OrderSummary.show({ checkId: '', customerName: '', items: [], subtotal: 0, tax: 0, cardTotal: 0, cashPrice: 0, collapsible: true, onNameTap: function() {
      if (!state.orderId) { showToast('Save items first', { bg: T.gold }); return; }
      SceneManager.interrupt('co-name-input', {
        onConfirm: function(name) {
          fetch('/api/v1/orders/' + state.orderId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_name: name }),
          }).then(function(r) {
            if (r.ok) {
              state.customerName = name;
              OrderSummary.update({ customerName: name });
              showToast(name ? 'Named: ' + name : 'Name cleared', { bg: T.goGreen, duration: 1500 });
            } else { showToast('Name update failed', { bg: T.red }); }
          }).catch(function() { showToast('Name update failed', { bg: T.red }); });
        },
        onCancel: function() {},
        checkLabel: state.checkNumber || 'check',
        currentName: state.customerName || '',
      });
    }});
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
      height: '252px',
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
      gridAutoRows: 'minmax(56px, auto)',
      gap: '6px',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    });

    // "+" tile (persistent, always at end)
    var addTile = document.createElement('div');
    Object.assign(addTile.style, {
      border: '2px dashed ' + T.numpadChassis,
      clipPath: chamfer(T.chamfer),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      boxSizing: 'border-box',
    });
    var plusText = document.createElement('div');
    Object.assign(plusText.style, { fontFamily: T.fb, fontSize: T.fsMed, color: T.numpadChassis });
    plusText.textContent = '+';
    addTile.appendChild(plusText);

    track(addTile, 'pointerup', function() {
      // Find first gap in seat numbering (e.g. S-002 if S-001, S-003 exist)
      var existing = {};
      for (var ei = 0; ei < state.seats.length; ei++) {
        var num = parseInt(state.seats[ei].id.replace('S-', ''), 10);
        if (!isNaN(num)) existing[num] = true;
      }
      var nextNum = 1;
      while (existing[nextNum]) nextNum++;
      var newSeat = { id: 'S-' + String(nextNum).padStart(3, '0'), items: [] };
      state.seats.push(newSeat);
      state.seats.sort(function(a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
      rebuildSeatGrid();
      // Persist seat count so empty seats survive refresh
      if (state.orderId) {
        fetch('/api/v1/orders/' + state.orderId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest_count: Math.max.apply(null, state.seats.map(function(s) { return parseInt(s.id.replace('S-', ''), 10) || 0; })) }),
        }).catch(function() { showToast && showToast('Save failed', { bg: T.red }); });
      }
    });

    seatsGrid.appendChild(addTile);
    seatsCard.appendChild(seatsGrid);
    root.appendChild(seatsCard);

    // ── Build a seat button (embossed + chamfered) ──

    function seatVariant(seat) {
      if (state.paidSeats[seat.id]) return 'mint';
      if (state.selected[seat.id]) return 'mint';
      return 'dark';
    }

    function buildSeatTile(seat) {
      var hasItems = seat.items.length > 0;
      var isPaid = !!state.paidSeats[seat.id];
      var total = seatTotal(seat);
      var variant = seatVariant(seat);

      var btn = buildStyledButton({ variant: variant, disabled: isPaid });
      var wrap = btn.wrap;
      var inner = btn.inner;

      // Selected seats match the header chassis green
      if (variant === 'mint') {
        wrap.style.background = T.numpadChassis;
        inner.style.color = T.bgDark;
      }

      // Override border-radius with chamfer
      wrap.style.borderRadius = '0';
      wrap.style.clipPath = chamfer(T.chamfer);
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      wrap.style.minWidth = '0';

      // Custom inner layout: seat ID top, total bottom
      inner.innerHTML = '';
      inner.style.flexDirection = 'column';
      inner.style.gap = '2px';
      inner.style.padding = '6px 8px';
      inner.style.fontFamily = T.fb;
      inner.style.lineHeight = '1.2';

      var idEl = document.createElement('div');
      idEl.style.cssText = 'font-family:' + T.fh + ';font-size:' + T.fsConSm + ';letter-spacing:2px;text-transform:uppercase;';
      idEl.textContent = seat.id;

      var totalEl = document.createElement('div');
      totalEl.style.cssText = 'font-size:' + T.fsCon + ';';
      if (variant === 'dark' && hasItems) {
        totalEl.style.color = T.gold;
      }
      totalEl.textContent = hasItems ? fmt(total) : '--';

      if (isPaid) {
        var paidEl = document.createElement('div');
        paidEl.style.cssText = 'font-size:8px;letter-spacing:2px;opacity:0.7;';
        paidEl.textContent = 'PAID';
        inner.appendChild(paidEl);
      }

      inner.appendChild(idEl);
      inner.appendChild(totalEl);

      // X button to delete empty seats (min 1 seat)
      if (!hasItems && !isPaid && state.seats.length > 1) {
        wrap.style.position = 'relative';
        var delBtn = document.createElement('div');
        delBtn.style.cssText = 'position:absolute;top:2px;right:4px;z-index:5;width:26px;height:26px;display:flex;align-items:center;justify-content:center;'
          + 'font-family:' + T.fb + ';font-size:' + T.fsCon + ';color:' + T.vermillion + ';cursor:pointer;user-select:none;';
        delBtn.textContent = '\u2715';
        track(delBtn, 'pointerup', (function(sId) {
          return function(e) {
            e.stopPropagation();
            // Remove this seat
            for (var di = 0; di < state.seats.length; di++) {
              if (state.seats[di].id === sId) { state.seats.splice(di, 1); break; }
            }
            delete state.selected[sId];
            delete state.seatEls[sId];
            rebuildSeatGrid();
            updateSummary();
          };
        })(seat.id));
        wrap.appendChild(delBtn);
      }

      state.seatEls[seat.id] = { wrap: wrap, inner: inner, idEl: idEl, totalEl: totalEl, isPaid: isPaid };

      // Long-press on paid seat to reopen; normal tap for unpaid toggle
      (function(seatId, isPaidSeat) {
        var _holdTimer = null;
        var _didHold = false;
        track(wrap, 'pointerdown', function() {
          _didHold = false;
          if (!isPaidSeat) return;
          _holdTimer = setTimeout(function() {
            _didHold = true;
            reopenSeat(seatId);
          }, 600);
        });
        track(wrap, 'pointerup', function() {
          clearTimeout(_holdTimer);
          if (_didHold) return;
          toggleSeat(seatId);
        });
        track(wrap, 'pointerleave', function() {
          clearTimeout(_holdTimer);
        });
      })(seat.id, isPaid);

      return wrap;
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
      // Paid seats cannot be toggled via normal tap
      if (state.paidSeats[seatId]) return;
      if (state.selected[seatId]) {
        delete state.selected[seatId];
      } else {
        state.selected[seatId] = true;
      }
      updateSeatVisuals();
      updateSummary();
    }

    function reopenSeat(seatId) {
      // Find payment(s) covering this seat
      var seatNum = parseInt(seatId.replace('S-', ''), 10) || 0;
      var seatPayments = [];
      if (state.order && state.order.payments) {
        for (var pi = 0; pi < state.order.payments.length; pi++) {
          var p = state.order.payments[pi];
          if (p.status === 'confirmed' && p.seat_numbers && p.seat_numbers.indexOf(seatNum) >= 0) {
            seatPayments.push(p);
          }
        }
      }
      SceneManager.interrupt('seat-payment', {
        params: { seatId: seatId, payments: seatPayments },
        onConfirm: function(paymentId) {
          // Void the selected payment
          fetch('/api/v1/orders/' + state.orderId + '/payments/' + paymentId + '/void', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Payment voided from check overview' }),
          }).then(function(r) {
            if (r.ok) {
              showToast(seatId + ' payment voided', { bg: T.gold, duration: 2000 });
              refreshOrder();
            } else {
              showToast('Failed to void payment', { bg: T.red });
            }
          }).catch(function() {
            showToast('Failed to void payment', { bg: T.red });
          });
        },
        onCancel: function() {},
      });
    }

    function forceSelectAll() {
      // Select all unpaid seats (no toggle)
      state.selected = {};
      for (var si = 0; si < state.seats.length; si++) {
        if (!state.paidSeats[state.seats[si].id]) {
          state.selected[state.seats[si].id] = true;
        }
      }
      updateSeatVisuals();
      updateSummary();
    }

    function selectAll() {
      // Toggle: if all selectable seats are selected, deselect all
      var allSelected = true;
      for (var ci = 0; ci < state.seats.length; ci++) {
        if (!state.paidSeats[state.seats[ci].id] && !state.selected[state.seats[ci].id]) {
          allSelected = false; break;
        }
      }
      if (allSelected) {
        state.selected = {};
      } else {
        forceSelectAll();
        return; // forceSelectAll already calls updateSeatVisuals + updateSummary
      }
      updateSeatVisuals();
      updateSummary();
    }

    function updateSeatVisuals() {
      var anySelected = false;
      for (var si = 0; si < state.seats.length; si++) {
        var seat = state.seats[si];
        var el = state.seatEls[seat.id];
        if (!el || el.isPaid) continue;
        var sel = !!state.selected[seat.id];
        var hasItems = seat.items.length > 0;
        if (sel) anySelected = true;

        // Rebuild button with correct variant by swapping to a fresh button
        var parent = el.wrap.parentNode;
        if (!parent) continue;
        var next = el.wrap.nextSibling;
        parent.removeChild(el.wrap);
        var freshBtn = buildSeatTile(seat);
        if (next) parent.insertBefore(freshBtn, next);
        else parent.appendChild(freshBtn);
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

    // Map from flat item index → seatIdx:itemIdx for selection
    var _summaryItemMap = [];

    function updateSummary() {
      var totals = collectSummary(state.seats, state.selected);

      // Build index map: flat item index → 'seatIdx:itemIdx' (null for seat headers)
      _summaryItemMap = [];
      var anySelected = Object.keys(state.selected).length > 0;
      var showHeaders = state.seats.length > 1;
      for (var si = 0; si < state.seats.length; si++) {
        if (anySelected && !state.selected[state.seats[si].id]) continue;
        if (showHeaders) _summaryItemMap.push(null); // seat header placeholder
        for (var ii = 0; ii < state.seats[si].items.length; ii++) {
          _summaryItemMap.push(si + ':' + ii);
        }
      }

      // Mark selected items so OrderSummary can highlight them
      for (var mi = 0; mi < totals.items.length; mi++) {
        if (totals.items[mi].seatHeader) continue;
        var mapKey = _summaryItemMap[mi];
        totals.items[mi].selected = mapKey ? !!state.selectedItems[mapKey] : false;
      }

      OrderSummary.update({
        checkId: state.checkNumber || '',
        customerName: state.customerName || '',
        items: totals.items,
        subtotal: totals.subtotal,
        tax: totals.tax,
        cardTotal: totals.cardTotal,
        cashPrice: totals.cashPrice,
        onItemTap: function(idx) {
          var key = _summaryItemMap[idx];
          if (key) {
            toggleItem(key);
            updateSummary();
          }
        },
        onSeatHeaderTap: function(seatIdx) {
          toggleSeatItems(seatIdx);
          updateSummary();
        },
      });
    }

    /* -- Seat card rendering removed: OrderSummary handles items with mods --
    var selectedSeats = [];
      var seatIndices = [];
      for (var ui = 0; ui < state.seats.length; ui++) {
        if (!anySelected || state.selected[state.seats[ui].id]) {
          selectedSeats.push(state.seats[ui]);
          seatIndices.push(ui);
        }
      }

      if (selectedSeats.length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'padding:16px 8px;font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.mutedText + ';text-align:center;';
        empty.textContent = 'No items';
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

            (function(k, item) {
              var _holdTimer = null;
              var _didHold = false;
              row.addEventListener('pointerdown', function() {
                _didHold = false;
                _holdTimer = setTimeout(function() {
                  _didHold = true;
                  var timeStr = '--';
                  if (item.added_at) {
                    var d = new Date(item.added_at);
                    var h = d.getHours(), ampm = h >= 12 ? 'pm' : 'am';
                    h = h % 12 || 12;
                    timeStr = h + ':' + String(d.getMinutes()).padStart(2, '0') + ampm;
                  }
                  showToast(item.name + ' ordered at ' + timeStr, { bg: T.bg4, duration: 2500 });
                }, 500);
              });
              row.addEventListener('pointerup', function() {
                clearTimeout(_holdTimer);
                if (_didHold) return;
                toggleItem(k);
                updateSummary();
              });
              row.addEventListener('pointerleave', function() {
                clearTimeout(_holdTimer);
              });
            })(key, it);

            body.appendChild(row);
          }
        }

        card.appendChild(body);
        ticketList.appendChild(card);
      }
    -- end removed block */

    track(allBtn, 'pointerup', function() { selectAll(); });

    // ═══════════════════════════════════════════════════
    //  Fetch real order data (or start empty)
    // ═══════════════════════════════════════════════════

    function syncPaidSeats(order) {
      state.paidSeats = {};
      var ps = order.paid_seats || [];
      for (var i = 0; i < ps.length; i++) {
        var key = 'S-' + String(ps[i]).padStart(3, '0');
        state.paidSeats[key] = true;
      }
    }

    if (state.orderId) {
      fetch('/api/v1/orders/' + state.orderId)
        .then(function(r) { return r.json(); })
        .then(function(order) {
          if (SceneManager.getActiveWorking() !== 'check-overview') return;
          state.order = order;
          state.checkNumber = order.check_number || '';
          state.customerName = order.customer_name || '';
          state.seats = orderToSeats(order, state.seats.length);
          syncPaidSeats(order);
          setSceneName(state.checkNumber || 'CHECK');
          rebuildSeatGrid();
          updateSummary();
        })
        .catch(function() {
          showToast('Failed to load check', { bg: T.red });
          state.seats = [{ id: 'S-001', items: [] }];
          rebuildSeatGrid();
          updateSummary();
        });
    } else {
      // New check — start with one empty seat
      state.seats = [{ id: 'S-001', items: [] }];
      rebuildSeatGrid();
      updateSummary();
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
      if (itemIds.length === 0) {
        // No items selected — require confirmation for full check void
        showToast('Select items to void, or tap seat header for all', { bg: T.gold });
        return;
      }
      // Snapshot selected items for undo (include modifiers so they restore correctly)
      var voidedSnapshot = [];
      var anySent = false;
      var keys = Object.keys(state.selectedItems);
      for (var vsi = 0; vsi < keys.length; vsi++) {
        var parts = keys[vsi].split(':');
        var sIdx = parseInt(parts[0]);
        var iIdx = parseInt(parts[1]);
        var seat = state.seats[sIdx];
        if (seat && seat.items[iIdx]) {
          var it = seat.items[iIdx];
          if (it.sent_at) anySent = true;
          voidedSnapshot.push({
            menu_item_id: it.menu_item_id || it.name.toLowerCase().replace(/\s+/g, '_'),
            name: it.name,
            price: it.price,
            quantity: it.qty,
            category: it.category || null,
            seat_number: sIdx + 1,
            modifiers: (it.mods || []).map(function(m) {
              return {
                name: m.name,
                price: m.price || 0,
                charged: m.charged !== false,
                prefix: m.prefix || null,
                half_price: m.half_price != null ? m.half_price : null,
              };
            }),
          });
        }
      }

      SceneManager.interrupt('disc-pin', {
        onConfirm: function(pin) {
          var pending = itemIds.length;
          var failed = 0;
          for (var vi = 0; vi < itemIds.length; vi++) {
            fetch('/api/v1/orders/' + state.orderId + '/items/' + itemIds[vi], { method: 'DELETE' })
              .then(function(r) { if (!r.ok) failed++; if (--pending === 0) finishVoid(); })
              .catch(function() { failed++; if (--pending === 0) finishVoid(); });
          }
          function finishVoid() {
            state.selectedItems = {};
            if (failed > 0) {
              showToast(failed + ' item(s) failed to void', { bg: T.red });
              refreshOrder();
              return;
            }
            // Only offer undo for unsent items — sent items cannot be restored
            if (anySent) {
              showToast('Items voided', { bg: T.goGreen, duration: 3000 });
            } else {
              _undoWindowActive = true;
              var _undoTimer = setTimeout(function() { _undoWindowActive = false; }, 5500);
              var undone = false;
              var undoEl = document.createElement('span');
              undoEl.style.cssText = 'text-decoration:underline;cursor:pointer;margin-left:8px;';
              undoEl.textContent = 'UNDO';
              undoEl.addEventListener('pointerup', function() {
                if (undone) return;
                undone = true;
                _undoWindowActive = false;
                clearTimeout(_undoTimer);
                // Re-add voided items
                var rePending = voidedSnapshot.length;
                for (var ri = 0; ri < voidedSnapshot.length; ri++) {
                  fetch('/api/v1/orders/' + state.orderId + '/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(voidedSnapshot[ri]),
                  }).then(function() { if (--rePending === 0) { showToast('Items restored', { bg: T.goGreen }); refreshOrder(); } })
                    .catch(function() { if (--rePending === 0) refreshOrder(); });
                }
              });
              showToast('Items voided', { bg: T.goGreen, duration: 5000, append: undoEl });
            }
            refreshOrder();
          }
        },
        onCancel: function() {},
      });
    }

    function handlePay() {
      if (!state.orderId) { showToast('No check to pay', { bg: T.red }); return; }
      var totals = collectSummary(state.seats, state.selected);
      // Stash which seats are part of this payment
      state._payingSeats = [];
      var seatNums = [];
      for (var pi = 0; pi < state.seats.length; pi++) {
        if (state.selected[state.seats[pi].id]) {
          state._payingSeats.push(state.seats[pi].id);
          seatNums.push(pi + 1);
        }
      }
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
        seatNumbers: seatNums,
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

    var _undoWindowActive = false;

    function refreshOrder() {
      if (_refreshInFlight || !state.orderId) return;
      _refreshInFlight = true;
      fetch('/api/v1/orders/' + state.orderId)
        .then(function(r) { return r.json(); })
        .then(function(order) {
          if (SceneManager.getActiveWorking() !== 'check-overview') return;
          state.order = order;
          state.checkNumber = order.check_number || '';
          state.customerName = order.customer_name || '';
          state.seats = orderToSeats(order, state.seats.length);
          syncPaidSeats(order);
          setSceneName(state.checkNumber || 'CHECK');
          rebuildSeatGrid();
          forceSelectAll();
          // If fully paid/closed, return to landing
          if (order.status === 'paid' || order.status === 'closed') {
            showToast('Check closed', { bg: T.goGreen });
            SceneManager.mountWorking(_landing, _landingParams);
            return;
          }
          // If all items voided (empty check at $0), void the order and return
          // Skip during undo window so the user has a chance to restore items
          if (!_undoWindowActive && (order.items || []).length === 0 && (order.total || 0) <= 0 && order.status !== 'voided') {
            fetch('/api/v1/orders/' + state.orderId + '/void', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'All items removed', approved_by: 'system' }),
            }).then(function() {
              showToast('Check voided', { bg: T.goGreen });
              SceneManager.mountWorking(_landing, _landingParams);
            }).catch(function() {
              SceneManager.mountWorking(_landing, _landingParams);
            });
            return;
          }
          if (order.status === 'voided') {
            showToast('Check voided', { bg: T.goGreen });
            SceneManager.mountWorking(_landing, _landingParams);
            return;
          }
        })
        .catch(function() { showToast('Refresh failed', { bg: T.red }); })
        .finally(function() { _refreshInFlight = false; });
    }

    // Listen for payment completion — mark seats paid, then refresh
    function onPaymentComplete() {
      if (SceneManager.getActiveWorking() !== 'check-overview') return;
      // Mark the stashed seats as paid
      for (var ps = 0; ps < state._payingSeats.length; ps++) {
        state.paidSeats[state._payingSeats[ps]] = true;
      }
      state._payingSeats = [];
      state.selectedItems = {};
      refreshOrder();
    }
    SceneManager.on('payment:complete', onPaymentComplete);
    state.listeners.push({ el: null, event: 'payment:complete', handler: onPaymentComplete, bus: true });

    // Row 1 (y:272): PRINT    RSND    DISC
    // Row 2 (y:318): PAY      DRAWER  VOID
    var btnTop1 = '272px';
    var btnTop2 = '334px';

    var printBtn = buildStyledButton({ label: 'PRINT', variant: 'gold', size: 'md', onClick: handlePrint });
    Object.assign(printBtn.wrap.style, { position: 'absolute', left: '12px', top: btnTop1 });
    root.appendChild(printBtn.wrap);

    var rsndBtn = buildStyledButton({ label: 'RSND', variant: 'dark', size: 'sm', onClick: handleResend });
    Object.assign(rsndBtn.wrap.style, { position: 'absolute', left: '240px', top: btnTop1 });
    root.appendChild(rsndBtn.wrap);

    var discBtn = buildStyledButton({ label: 'DISC', variant: 'vermillion', size: 'sm', onClick: handleDiscount });
    Object.assign(discBtn.wrap.style, { position: 'absolute', left: '358px', top: btnTop1 });
    root.appendChild(discBtn.wrap);

    var payBtn = buildStyledButton({ label: 'PAY', variant: 'mint', size: 'md', onClick: handlePay });
    Object.assign(payBtn.wrap.style, { position: 'absolute', left: '12px', top: btnTop2 });
    root.appendChild(payBtn.wrap);

    var drawerBtn = buildStyledButton({ label: 'DRAWER', variant: 'dark', size: 'sm', onClick: handleDrawer });
    Object.assign(drawerBtn.wrap.style, { position: 'absolute', left: '240px', top: btnTop2 });
    root.appendChild(drawerBtn.wrap);

    var voidBtn = buildStyledButton({ label: 'VOID', variant: 'vermillion', size: 'sm', onClick: handleVoid });
    Object.assign(voidBtn.wrap.style, { position: 'absolute', left: '358px', top: btnTop2 });
    root.appendChild(voidBtn.wrap);

    // ═══════════════════════════════════════════════════
    //  Floating buttons
    // ═══════════════════════════════════════════════════

    // ADD ITEM(S) — open order-entry for this check
    var addItemBtn = buildStyledButton({
      label: 'ADD ITEM(S)', variant: 'gold', size: 'lg',
      onClick: function() {
        // Always pass ALL seat numbers so the seat-assign interrupt
        // knows the full seat count (prevents empty seats from being lost)
        var allSeatNums = [];
        for (var aj = 0; aj < state.seats.length; aj++) allSeatNums.push(aj + 1);
        // Pass currently selected seats so order-entry can auto-assign
        var selSeatNums = [];
        for (var sj = 0; sj < state.seats.length; sj++) {
          if (state.selected[state.seats[sj].id]) selSeatNums.push(sj + 1);
        }
        SceneManager.mountWorking('order-entry', {
          recallOrderId: state.orderId || undefined,
          recallCheckNumber: state.checkNumber || undefined,
          mode: 'service',
          pin: params.pin,
          employeeId: params.employeeId,
          employeeName: params.employeeName,
          returnScene: 'check-overview',
          returnLanding: _landing,
          seatNumbers: allSeatNums,
          selectedSeatNumbers: selSeatNums,
        });
      },
    });
    Object.assign(addItemBtn.wrap.style, {
      position: 'absolute', left: '492px', top: '401px', zIndex: '50',
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
            // Persist changes via API
            if (state.orderId) {
              var _cePending = 0;
              var _ceFailed = 0;
              function _ceTrack(promise) {
                _cePending++;
                promise
                  .then(function(r) { if (!r.ok) _ceFailed++; })
                  .catch(function() { _ceFailed++; })
                  .finally(function() {
                    if (--_cePending === 0) {
                      if (_ceFailed > 0) {
                        showToast(_ceFailed + ' seat edit(s) failed to save', { bg: T.red });
                        refreshOrder();
                      }
                    }
                  });
              }
              for (var pi = 0; pi < columns.length; pi++) {
                var seatNum = pi + 1;
                var colItems = columns[pi].items;
                for (var qi = 0; qi < colItems.length; qi++) {
                  if (colItems[qi].item_id) {
                    // Existing item — update seat_number and price
                    _ceTrack(fetch('/api/v1/orders/' + state.orderId + '/items/' + colItems[qi].item_id, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ seat_number: seatNum, price: colItems[qi].price }),
                    }));
                  } else {
                    // New item (e.g. from split) — add to order
                    _ceTrack(fetch('/api/v1/orders/' + state.orderId + '/items', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: colItems[qi].name,
                        price: colItems[qi].price,
                        quantity: colItems[qi].qty || 1,
                        seat_number: seatNum,
                      }),
                    }));
                  }
                }
              }
            }
          },
        });
      },
    });
    Object.assign(editSeatsBtn.wrap.style, {
      position: 'absolute', left: '492px', top: '272px', zIndex: '50',
      display: 'none',
    });
    root.appendChild(editSeatsBtn.wrap);

    // +1 ROUND — duplicate selected seat items, auto-send to kitchen
    var _roundInProgress = false;
    var roundBtn = buildStyledButton({
      label: '+1 ROUND', variant: 'gold', size: 'md',
      onClick: function() {
        if (_roundInProgress) return;
        _roundInProgress = true;
        // Collect items from selected seats
        var itemsToAdd = [];
        for (var ri = 0; ri < state.seats.length; ri++) {
          if (!state.selected[state.seats[ri].id]) continue;
          var seatNum = ri + 1;
          for (var rj = 0; rj < state.seats[ri].items.length; rj++) {
            var it = state.seats[ri].items[rj];
            itemsToAdd.push({
              menu_item_id: it.menu_item_id || it.name.toLowerCase().replace(/\s+/g, '_'),
              name: it.name,
              price: it.price,
              quantity: it.qty,
              category: it.category || null,
              seat_number: seatNum,
              modifiers: (it.mods || []).map(function(m) {
                return {
                  name: m.name,
                  price: m.price || 0,
                  charged: m.charged !== false,
                  prefix: m.prefix || null,
                  half_price: m.half_price != null ? m.half_price : null,
                };
              }),
            });
          }
        }

        if (itemsToAdd.length === 0) {
          _roundInProgress = false;
          showToast('No items to reorder', { bg: T.gold });
          return;
        }

        // Create order first if needed, then POST items
        var doRound = function() {
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
          _roundInProgress = false;
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
        };

        if (!state.orderId) {
          // Create order first
          fetch('/api/v1/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_type: 'quick_service',
              guest_count: 1,
              server_id: params.employeeId || null,
              server_name: params.employeeName || null,
            }),
          }).then(function(r) { return r.json(); })
            .then(function(created) {
              state.orderId = created.order_id;
              state.checkNumber = created.check_number || '';
              setSceneName(state.checkNumber);
              doRound();
            })
            .catch(function() { _roundInProgress = false; showToast('Failed to create check', { bg: T.red }); });
        } else {
          doRound();
        }
      },
    });
    Object.assign(roundBtn.wrap.style, {
      position: 'absolute', left: '492px', top: '340px', zIndex: '50',
    });
    root.appendChild(roundBtn.wrap);
  },

  unmount: function(state) {
    if (OrderSummary.unlockItemRender) OrderSummary.unlockItemRender();
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

  interrupts: {
    'co-name-input': {
      render: function(container, params) {
        showKeyboard({
          placeholder: 'Enter name',
          initialValue: params.currentName || '',
          maxLength: 40,
          onDone: function(val) {
            params.onConfirm(val.trim());
          },
          onDismiss: function() {
            params.onCancel();
          },
          dismissOnDone: true,
        });
      },
      unmount: function() { hideKeyboard(); },
    },

    'server-picker': {
      render: function(container, params) {
        params = params || {};
        var excludeId = (params.params || {}).excludeId || null;

        container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';

        var panel = document.createElement('div');
        panel.style.cssText = 'background:' + T.bgDark + ';border:4px solid ' + T.mint + ';clip-path:polygon(5px 0%,calc(100% - 5px) 0%,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0% calc(100% - 5px),0% 5px);padding:16px;min-width:320px;max-width:440px;max-height:460px;display:flex;flex-direction:column;gap:8px;';

        var title = document.createElement('div');
        title.style.cssText = 'font-family:' + T.fh + ';font-size:11px;letter-spacing:3px;color:' + T.mint + ';text-transform:uppercase;text-align:center;padding:4px 0 8px;';
        title.textContent = 'TRANSFER TO SERVER';
        panel.appendChild(title);

        var list = document.createElement('div');
        list.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;';

        var loading = document.createElement('div');
        loading.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.mutedText + ';text-align:center;padding:20px 0;';
        loading.textContent = 'Loading...';
        list.appendChild(loading);
        panel.appendChild(list);

        var cancelBtn = buildStyledButton({ label: 'CANCEL', variant: 'vermillion', size: 'sm', onClick: function() { params.onCancel(); } });
        cancelBtn.wrap.style.alignSelf = 'center';
        panel.appendChild(cancelBtn.wrap);

        container.appendChild(panel);

        fetch('/api/v1/servers/clocked-in')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            list.innerHTML = '';
            var staff = (data.staff || []).filter(function(s) { return s.employee_id !== excludeId; });

            if (staff.length === 0) {
              var empty = document.createElement('div');
              empty.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.mutedText + ';text-align:center;padding:20px 0;';
              empty.textContent = 'No other servers clocked in';
              list.appendChild(empty);
              return;
            }

            for (var i = 0; i < staff.length; i++) {
              (function(srv) {
                var btn = buildStyledButton({ label: srv.employee_name, variant: 'dark', size: 'md', onClick: function() { params.onConfirm({ employee_id: srv.employee_id, employee_name: srv.employee_name }); } });
                btn.wrap.style.width = '100%';
                list.appendChild(btn.wrap);
              })(staff[i]);
            }
          })
          .catch(function() {
            list.innerHTML = '';
            var err = document.createElement('div');
            err.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.red + ';text-align:center;padding:20px 0;';
            err.textContent = 'Failed to load servers';
            list.appendChild(err);
          });
      },
    },
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
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';clip-path:polygon(5px 0%,calc(100% - 5px) 0%,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0% calc(100% - 5px),0% 5px);padding:20px;';
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
      onCancel: function() { SceneManager.resolveInterrupt('disc-pin'); params.onCancel(); },
    });
    panel.appendChild(numpad);
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
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';clip-path:polygon(5px 0%,calc(100% - 5px) 0%,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0% calc(100% - 5px),0% 5px);padding:20px;min-width:280px;';
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

// ═══════════════════════════════════════════════════
//  Seat Payment Interrupt — shown on long-press of paid seat
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'seat-payment',
  mount: function(container, params) {
    var seatId = params.seatId || '??';
    var payments = params.payments || [];

    container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';

    var panel = document.createElement('div');
    panel.style.cssText = [
      'display:flex;flex-direction:column;align-items:center;gap:10px;',
      'background:' + T.bgDark + ';border:4px solid ' + T.gold + ';clip-path:polygon(5px 0%,calc(100% - 5px) 0%,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0% calc(100% - 5px),0% 5px);',
      'padding:20px 24px;min-width:320px;max-width:440px;',
    ].join('');

    var title = document.createElement('div');
    title.style.cssText = 'font-family:' + T.fh + ';font-size:' + T.fsConSm + ';color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
    title.textContent = '// ' + seatId + ' PAYMENT //';
    panel.appendChild(title);

    if (payments.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.dimText + ';padding:8px 0;';
      empty.textContent = 'No payments found for this seat';
      panel.appendChild(empty);
    } else {
      for (var pi = 0; pi < payments.length; pi++) {
        (function(p) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:4px 0;';

          var info = document.createElement('div');
          info.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';color:' + T.textPrimary + ';';
          info.textContent = p.method.toUpperCase() + '  ' + fmt(p.amount);
          row.appendChild(info);

          var delBtn = buildButton('DELETE', {
            fill: T.darkBtn, color: T.vermillion, fontSize: T.fsConSm, height: 38,
            onTap: function() {
              SceneManager.resolveInterrupt('seat-payment');
              params.onConfirm(p.payment_id);
            },
          });
          delBtn.style.minWidth = '90px';
          row.appendChild(delBtn);

          panel.appendChild(row);
        })(payments[pi]);
      }
    }

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.textPrimary, fontSize: T.fsCon, height: 44,
      onTap: function() { SceneManager.resolveInterrupt('seat-payment'); params.onCancel(); },
    });
    cancelBtn.style.width = '100%';
    cancelBtn.style.marginTop = '4px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);

    container.addEventListener('pointerup', function(e) {
      if (e.target === container) { SceneManager.resolveInterrupt('seat-payment'); params.onCancel(); }
    });
  },
  unmount: function() {},
});
