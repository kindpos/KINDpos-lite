// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Tip Adjustment Scene
//  Table left | Filters+Numpad right
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle, bevelEdges, shadowColor } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { registerScene, push, pop, interrupt, resolveInterrupt, cancelInterrupt } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';

// ── State ─────────────────────────────────────────
var checks = [];
var filter = 'all';         // 'all' | 'unadjusted'
var statusFilter = 'all';  // 'all' | 'open' | 'closed' | 'voided'
var editingIndex = -1;      // index into checks[]
var cents = 0;
var _editCooldown = false;

var tableBody     = null;
var rightDefault  = null;
var rightEdit     = null;
var batchBar      = null;
var bottomBar     = null;
var btnUnadj      = null;
var btnOpen       = null;
var btnClosed     = null;
var btnVoided     = null;
var numpadRef     = null;   // buildNumpad component instance
var numpadCheckId = null;
var numpadAmount  = null;
var summaryEls    = {};

// ═══════════════════════════════════════════════════
//  CHECK DATA — fetched from day-summary API
// ═══════════════════════════════════════════════════

function fetchChecks(employeeId) {
  var url = '/api/v1/orders/day-summary';
  if (employeeId) url += '?server_id=' + encodeURIComponent(employeeId);
  return fetch(url).then(function(r) { return r.json(); }).then(function(d) {
    return d.checks || [];
  }).catch(function() { return []; });
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

function fmt(n) { return '$' + n.toFixed(2); }

function unadjCount() {
  return checks.filter(function(c) { return !c.adjusted; }).length;
}

function totalTips() {
  return checks.reduce(function(s, c) { return s + (c.tip || 0); }, 0);
}

function creditSales() {
  return checks.filter(function(c) { return c.method === 'card'; })
    .reduce(function(s, c) { return s + c.amount; }, 0);
}

function cashSales() {
  return checks.filter(function(c) { return c.method === 'cash'; })
    .reduce(function(s, c) { return s + c.amount; }, 0);
}

// ═══════════════════════════════════════════════════
//  TABLE RENDERING
// ═══════════════════════════════════════════════════

function renderTable() {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  // Sort checks: card first, then cash (within closed)
  var sorted = checks.map(function(c, i) { return { c: c, i: i }; });
  sorted.sort(function(a, b) {
    var ma = a.c.method === 'card' ? 0 : a.c.method === 'cash' ? 1 : 2;
    var mb = b.c.method === 'card' ? 0 : b.c.method === 'cash' ? 1 : 2;
    return ma - mb;
  });

  var lastMethod = null;
  sorted.forEach(function(entry) {
    var c = entry.c;
    var i = entry.i;
    // Filter logic
    if (filter === 'unadjusted' && c.adjusted) return;
    var checkStatus = c.status || 'closed';
    if (statusFilter === 'open' && checkStatus !== 'open') return;
    if (statusFilter === 'closed' && checkStatus !== 'closed') return;
    if (statusFilter === 'voided' && checkStatus !== 'voided') return;

    var isOpen = checkStatus === 'open';
    var isVoided = checkStatus === 'voided';

    // Group header when method changes (card → cash)
    if (!isOpen && statusFilter === 'closed' && c.method !== lastMethod) {
      lastMethod = c.method;
      var hdr = document.createElement('tr');
      var hdrTd = document.createElement('td');
      hdrTd.colSpan = 5;
      hdrTd.textContent = (c.method === 'card' ? 'Card' : 'Cash');
      hdrTd.style.cssText = 'font-family:' + T.fh + ';font-size:40px;color:' + T.gold + ';padding:10px 8px 4px;text-align:left;border:none;background:transparent;';
      hdr.appendChild(hdrTd);
      tableBody.appendChild(hdr);
    }

    var tr = document.createElement('tr');
    tr.dataset.idx = i;

    var total = c.adjusted ? c.amount + c.tip : 0;

    // Cell data
    var cells;
    if (isVoided) {
      cells = [
        { text: c.checkLabel || c.checkId, cls: '' },
        { text: c.time,    cls: '' },
        { text: fmt(c.amount), cls: '' },
        { text: 'VOID',    cls: '' },
        { text: '—',       cls: '' },
      ];
    } else if (isOpen) {
      cells = [
        { text: c.checkLabel || c.checkId, cls: '' },
        { text: c.time,    cls: '' },
        { text: fmt(c.amount), cls: '' },
        { text: '—',       cls: '' },
        { text: '—',       cls: '' },
      ];
    } else {
      cells = [
        { text: c.checkLabel || c.checkId, cls: '' },
        { text: c.time,    cls: '' },
        { text: fmt(c.amount), cls: '' },
        { text: c.adjusted ? fmt(c.tip) : '$0.00', cls: c.adjusted ? '' : 'tip-cell' },
        { text: c.adjusted ? fmt(total) : '$0.00', cls: c.adjusted ? '' : 'cyan-cell' },
      ];
    }

    cells.forEach(function(cell) {
      var td = document.createElement('td');
      td.textContent = cell.text;

      if (isVoided) {
        // Voided: dim red text, strikethrough
        td.style.background = T.bgDark;
        td.style.border = '2px solid ' + T.dimText;
        td.style.color = '#cc4444';
        td.style.textDecoration = 'line-through';
      } else if (isOpen) {
        // Open: distinct style — dark bg, mint text, dashed border
        td.style.background = T.bgDark;
        td.style.border = '2px dashed ' + T.mint;
        td.style.color = T.mint;
      } else if (c.adjusted) {
        // Adjusted: #333 bg, gold text, visible border
        td.style.background = T.bg;
        td.style.border = '2px solid ' + T.dimText;
        td.style.color = T.gold;
      } else {
        // Unadjusted: transparent bg (mint shows through), no border
        td.style.background = 'transparent';
        td.style.border = '2px solid transparent';
        td.style.color = '#333';
      }

      td.style.fontFamily = T.fb;
      td.style.fontSize = T.fsSmall;
      td.style.padding = '10px 8px';
      td.style.textAlign = 'center';

      // Tip cell button for unadjusted rows (closed checks only)
      if (cell.cls === 'tip-cell') {
        td.style.color = T.cyan;
        td.style.background = T.bg;
        td.style.border = '2px solid ' + T.cyan;
        td.style.cursor = 'pointer';
        td.style.clipPath = chamfer(4);
        td.addEventListener('pointerup', function() {
          activateEdit(i);
        });
      }

      // Cyan total for unadjusted — dark bg so cyan reads on mint
      if (cell.cls === 'cyan-cell') {
        td.style.color = T.cyan;
        td.style.background = T.bg;
        td.style.border = '2px solid ' + T.dimText;
      }

      tr.appendChild(td);
    });

    // Sync error indicator — tip failed to save to backend
    if (c.syncError) {
      tr.style.outline = '2px solid ' + T.red;
      tr.title = 'Tip failed to save — tap tip cell to retry';
    }

    // Closed check row tap → reopen option (only when not editing)
    if (!isOpen && editingIndex < 0) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('pointerup', function(ev) {
        // Don't trigger if the tip-cell button was tapped
        if (ev.target.style.clipPath) return;
        doReopen(c);
      });
    }

    // Dimming in edit mode
    if (editingIndex >= 0) {
      if (i === editingIndex) {
        // Selected row: cyan left accent
        tr.style.opacity = '1';
        var firstTd = tr.querySelector('td');
        if (firstTd) firstTd.style.borderLeft = T.bevel + 'px solid ' + T.cyan;
      } else {
        tr.style.opacity = '0.3';
        tr.style.pointerEvents = 'none';
      }
    }

    tableBody.appendChild(tr);
  });
}

// ═══════════════════════════════════════════════════
//  SUMMARY UPDATE
// ═══════════════════════════════════════════════════

function updateSummary() {
  if (summaryEls.checks) summaryEls.checks.textContent = checks.length;
  if (summaryEls.tips)   summaryEls.tips.textContent   = fmt(totalTips());
  if (summaryEls.credit) summaryEls.credit.textContent = fmt(creditSales());
  if (summaryEls.cash)   summaryEls.cash.textContent   = fmt(cashSales());
  if (btnUnadj)          btnUnadj.textContent          = 'Unadjusted: ' + unadjCount();
}

// ═══════════════════════════════════════════════════
//  EDIT STATE
// ═══════════════════════════════════════════════════

function activateEdit(idx) {
  if (_editCooldown) return;
  _editCooldown = true;
  setTimeout(function() { _editCooldown = false; }, 200);
  editingIndex = idx;
  cents = 0;

  // Update numpad context
  var c = checks[idx];
  if (numpadCheckId) numpadCheckId.textContent = c.checkLabel || c.checkId;
  if (numpadAmount)  numpadAmount.textContent  = fmt(c.amount);
  updateNumpadDisplay();

  // Swap panels
  if (rightDefault) rightDefault.style.display = 'none';
  if (rightEdit)    rightEdit.style.display    = 'flex';
  if (batchBar)     { batchBar.style.opacity = '0.3'; batchBar.style.pointerEvents = 'none'; }
  if (bottomBar)    { bottomBar.style.opacity = '0.3'; bottomBar.style.pointerEvents = 'none'; }

  renderTable();
}

function deactivateEdit() {
  editingIndex = -1;
  cents = 0;

  // Restore panels
  if (rightDefault) rightDefault.style.display = 'flex';
  if (rightEdit)    rightEdit.style.display    = 'none';
  if (batchBar)     { batchBar.style.opacity = '1'; batchBar.style.pointerEvents = 'auto'; }
  if (bottomBar)    { bottomBar.style.opacity = '1'; bottomBar.style.pointerEvents = 'auto'; }

  renderTable();
  updateSummary();
}

// ═══════════════════════════════════════════════════
//  DOLLAR NUMPAD LOGIC
// ═══════════════════════════════════════════════════

function updateNumpadDisplay() {
  if (!numpadRef) return;
  numpadRef.clear();
  cents = 0;
}

function numpadKey(digit) {
  if (cents > 99999) return;
  cents = cents * 10 + digit;
  updateNumpadDisplay();
}

function numpadClear() {
  cents = 0;
  updateNumpadDisplay();
}

function persistTip(c, attempt) {
  if (!c.paymentId) return;
  attempt = attempt || 1;
  fetch('/api/v1/payments/tip-adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id:   c.checkId,
      payment_id: c.paymentId,
      tip_amount:  c.tip,
    }),
  }).then(function(res) {
    if (res.ok) {
      c.syncError = false;
    } else if (!res.ok && attempt < 3) {
      setTimeout(function() { persistTip(c, attempt + 1); }, 1000 * attempt);
    } else if (!res.ok) {
      console.error('[KINDpos] Tip adjust failed after retries:', res.status);
      c.syncError = true;
      renderTable();
    }
  }).catch(function(err) {
    if (attempt < 3) {
      setTimeout(function() { persistTip(c, attempt + 1); }, 1000 * attempt);
    } else {
      console.error('[KINDpos] Tip adjust failed after retries:', err);
      c.syncError = true;
      renderTable();
    }
  });
}

function numpadSubmit() {
  if (editingIndex < 0) return;

  // Write tip
  var c = checks[editingIndex];
  c.tip = cents / 100;
  c.adjusted = true;
  persistTip(c);

  // Find next unadjusted
  var next = -1;
  // Search after current
  for (var i = editingIndex + 1; i < checks.length; i++) {
    if (!checks[i].adjusted) { next = i; break; }
  }
  // Wrap around from start
  if (next < 0) {
    for (var j = 0; j < editingIndex; j++) {
      if (!checks[j].adjusted) { next = j; break; }
    }
  }

  if (next >= 0) {
    // Auto-advance
    activateEdit(next);
  } else {
    // All done
    deactivateEdit();
  }
}

// ═══════════════════════════════════════════════════
//  BUILD UI
// ═══════════════════════════════════════════════════

function buildScene(el, params) {
  filter = 'all';
  statusFilter = 'all';
  editingIndex = -1;
  cents = 0;

  el.style.display = 'flex';
  el.style.padding = T.scenePad + 'px';
  el.style.gap = '8px';
  el.style.height = '100%';
  el.style.boxSizing = 'border-box';

  // ══════════════════════════════════════════════
  //  LEFT COLUMN
  // ══════════════════════════════════════════════
  var left = document.createElement('div');
  left.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:10px;min-width:0;min-height:0;';

  // ── Scroll card (sunken panel) ──
  var scrollCard = document.createElement('div');
  scrollCard.style.cssText = 'flex:1;min-height:0;background:' + T.mint + ';overflow-y:auto;padding:8px;scrollbar-width:none;-ms-overflow-style:none;';
  // Hide scrollbar via WebKit pseudo-element
  var style = document.createElement('style');
  style.textContent = '.tip-scroll::-webkit-scrollbar{display:none}';
  document.head.appendChild(style);
  scrollCard.classList.add('tip-scroll');
  applySunkenStyle(scrollCard);

  var table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:separate;border-spacing:4px;';

  // Header row
  var thead = document.createElement('thead');
  var headerRow = document.createElement('tr');
  ['Check', 'Time', 'Amount', 'Tip', 'Total'].forEach(function(label) {
    var th = document.createElement('th');
    th.textContent = label;
    th.style.fontFamily = T.fh;
    th.style.fontSize = T.fsSmall;
    th.style.color = T.gold;
    th.style.padding = '8px 6px';
    th.style.textAlign = 'center';
    th.style.border = '7px solid ' + T.gold;
    th.style.background = T.bg;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  tableBody = document.createElement('tbody');
  table.appendChild(tableBody);
  scrollCard.appendChild(table);
  left.appendChild(scrollCard);

  // ── Batch zero button ──
  batchBar = buildButton('Set all unadjusted tips to $0?', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
    height: 40,
    onTap: function() { doBatchZero(); },
  });
  batchBar.style.maxWidth = '380px';
  // Cyan border override
  batchBar.querySelector('div').style.borderColor = T.cyan;
  left.appendChild(batchBar);

  // ── Bottom buttons ──
  bottomBar = document.createElement('div');
  bottomBar.style.cssText = 'display:flex;gap:12px;flex-shrink:0;';

  bottomBar.appendChild(buildButton('//Checkout//', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall,
    width: 180, height: 48,
    onTap: function() { doCheckout(params); },
  }));

  bottomBar.appendChild(buildButton('//Print//', {
    fill: T.darkBtn, color: T.subtleText, fontSize: T.fsSmall,
    width: 140, height: 48,
    onTap: function() { doPrint(); },
  }));

  left.appendChild(bottomBar);
  el.appendChild(left);

  // ══════════════════════════════════════════════
  //  RIGHT COLUMN — DEFAULT (filters + summary)
  // ══════════════════════════════════════════════
  rightDefault = document.createElement('div');
  rightDefault.style.cssText = 'width:260px;display:flex;flex-direction:column;gap:0px;flex-shrink:0;';

  // ALL button — narrower, touches top of area
  var btnAll = buildButton('ALL', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall,
    width: 200, height: 48,
    onTap: function() {
      filter = 'all';
      btnAll.querySelector('div').style.background = T.darkBtn;
      btnAll.querySelector('div').style.color = T.mint;
      btnUnadjWrap.querySelector('div').style.background = T.darkBtn;
      btnUnadjWrap.querySelector('div').style.color = T.mint;
      renderTable();
    },
  });
  btnAll.style.position = 'relative';
  btnAll.style.zIndex = '2';
  rightDefault.appendChild(btnAll);

  // Unadjusted button — narrower, overlaps slightly
  var btnUnadjWrap = buildButton('Unadjusted: ' + unadjCount(), {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
    width: 200, height: 48,
    onTap: function() {
      filter = 'unadjusted';
      btnUnadjWrap.querySelector('div').style.background = T.darkBtn;
      btnUnadjWrap.querySelector('div').style.color = T.mint;
      btnAll.querySelector('div').style.background = T.darkBtn;
      btnAll.querySelector('div').style.color = T.mint;
      renderTable();
    },
  });
  btnUnadjWrap.style.marginTop = '8px';
  btnUnadjWrap.style.position = 'relative';
  btnUnadjWrap.style.zIndex = '1';
  // Override border to cyan
  btnUnadjWrap.querySelector('div').style.borderColor = T.mint;
  btnUnadj = btnUnadjWrap.querySelector('div'); // ref for text updates
  rightDefault.appendChild(btnUnadjWrap);

  // ── Status filter (Open / Closed) ──
  var statusSpacer = document.createElement('div');
  statusSpacer.style.height = '16px';
  rightDefault.appendChild(statusSpacer);

  var btnOpenWrap = buildButton('Open', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
    width: 200, height: 44,
    onTap: function() {
      statusFilter = statusFilter === 'open' ? 'all' : 'open';
      updateStatusButtons();
      renderTable();
    },
  });
  btnOpenWrap.querySelector('div').style.borderColor = T.mint;
  btnOpen = btnOpenWrap.querySelector('div');
  rightDefault.appendChild(btnOpenWrap);

  var btnClosedWrap = buildButton('Closed', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
    width: 200, height: 44,
    onTap: function() {
      statusFilter = statusFilter === 'closed' ? 'all' : 'closed';
      updateStatusButtons();
      renderTable();
    },
  });
  btnClosedWrap.style.marginTop = '8px';
  btnClosedWrap.querySelector('div').style.borderColor = T.mint;
  btnClosed = btnClosedWrap.querySelector('div');
  rightDefault.appendChild(btnClosedWrap);

  var btnVoidedWrap = buildButton('Voided', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
    width: 200, height: 44,
    onTap: function() {
      statusFilter = statusFilter === 'voided' ? 'all' : 'voided';
      updateStatusButtons();
      renderTable();
    },
  });
  btnVoidedWrap.style.marginTop = '8px';
  btnVoidedWrap.querySelector('div').style.borderColor = T.mint;
  btnVoided = btnVoidedWrap.querySelector('div');
  rightDefault.appendChild(btnVoidedWrap);

  function updateStatusButtons() {
    if (btnOpen) {
      btnOpen.style.background = T.darkBtn;
      btnOpen.style.color = T.mint;
    }
    if (btnClosed) {
      btnClosed.style.background = T.darkBtn;
      btnClosed.style.color = T.mint;
    }
    if (btnVoided) {
      btnVoided.style.background = T.darkBtn;
      btnVoided.style.color = T.mint;
    }
  }

  // Spacer
  var spacer = document.createElement('div');
  spacer.style.flex = '1';
  rightDefault.appendChild(spacer);

  // Summary card
  var summaryCard = document.createElement('div');
  summaryCard.style.cssText = 'background:' + T.bg + ';border:2px solid ' + T.dimText + ';padding:14px 16px;display:flex;flex-direction:column;gap:8px;';
  summaryCard.style.clipPath = chamfer(6);

  function addSummaryLine(label, valueKey, valueColor) {
    var line = document.createElement('div');
    line.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:40px;';
    var lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.color = T.mint;
    var val = document.createElement('span');
    val.style.color = valueColor;
    summaryEls[valueKey] = val;
    line.appendChild(lbl);
    line.appendChild(val);
    summaryCard.appendChild(line);
  }

  addSummaryLine('Total Checks:', 'checks', T.cyan);
  addSummaryLine('Total Tips:',   'tips',   T.gold);
  addSummaryLine('Credit Sales:', 'credit', T.gold);
  addSummaryLine('Cash Sales:',   'cash',   T.gold);

  rightDefault.appendChild(summaryCard);
  el.appendChild(rightDefault);

  // ══════════════════════════════════════════════
  //  RIGHT COLUMN — EDIT (numpad)
  // ══════════════════════════════════════════════
  rightEdit = document.createElement('div');
  rightEdit.style.cssText = 'width:332px;display:none;flex-direction:column;gap:10px;flex-shrink:0;';

  // Numpad component — dollar entry, formatted display
  numpadRef = buildNumpad({
    masked:        false,
    maxDigits:     6,
    displayFormat: function(digits) {
      var n = digits ? parseInt(digits, 10) : 0;
      return '$' + (n / 100).toFixed(2);
    },
    onChange: function(digits) {
      cents = digits ? parseInt(digits, 10) : 0;
    },
    onSubmit: function() {
      numpadSubmit();
    },
  });
  numpadRef.style.width = '100%';
  rightEdit.appendChild(numpadRef);

  // Cancel button
  var cancelBtn = buildButton('CANCEL', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
    height: 44,
    onTap: function() { deactivateEdit(); },
  });
  cancelBtn.style.width = '100%';
  rightEdit.appendChild(cancelBtn);

  el.appendChild(rightEdit);

  // ── Fetch checks and render ──
  fetchChecks(params.employeeId).then(function(data) {
    checks = data;
    renderTable();
    updateSummary();
  });
}

// ═══════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════

function doBatchZero() {
  var n = unadjCount();
  if (n === 0) return;

  interrupt('confirm-batch-zero', {
    reason: 'batch-zero',
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '16px';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.cyan + ';padding:24px 32px;text-align:center;max-width:400px;';
      card.style.clipPath = chamfer(10);

      var msg = document.createElement('div');
      msg.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-bottom:20px;';
      msg.textContent = 'Set ' + n + ' unadjusted tip' + (n > 1 ? 's' : '') + ' to $0.00?';
      card.appendChild(msg);

      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';

      btns.appendChild(buildButton('Confirm', {
        fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
        width: 120, height: 44,
        onTap: function() {
          checks.forEach(function(c) {
            if (!c.adjusted) { c.tip = 0; c.adjusted = true; }
          });
          resolveInterrupt(true);
          renderTable();
          updateSummary();
        },
      }));

      btns.appendChild(buildButton('Cancel', {
        fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
        width: 120, height: 44,
        onTap: function() { cancelInterrupt(); },
      }));

      card.appendChild(btns);
      el.appendChild(card);
    },
  });
}

function doCheckout(params) {
  var n = unadjCount();
  if (n > 0) {
    interrupt('checkout-gate', {
      reason: 'unadjusted-tips',
      onBuild: function(el) {
        el.style.flexDirection = 'column';
        el.style.gap = '16px';

        var card = document.createElement('div');
        card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.gold + ';padding:24px 32px;text-align:center;max-width:420px;';
        card.style.clipPath = chamfer(10);

        var msg = document.createElement('div');
        msg.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-bottom:20px;';
        msg.textContent = n + ' tip' + (n > 1 ? 's' : '') + ' not adjusted. Set to $0 or go back and adjust.';
        card.appendChild(msg);

        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';

        btns.appendChild(buildButton('Set to $0', {
          fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
          width: 130, height: 44,
          onTap: function() {
            checks.forEach(function(c) {
              if (!c.adjusted) { c.tip = 0; c.adjusted = true; persistTip(c); }
            });
            resolveInterrupt(true);
            renderTable();
            updateSummary();
            // Proceed to checkout
            push('server-checkout', { employeeId: params.employeeId });
          },
        }));

        btns.appendChild(buildButton('Go Back', {
          fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
          width: 130, height: 44,
          onTap: function() { cancelInterrupt(); },
        }));

        card.appendChild(btns);
        el.appendChild(card);
      },
    });
    return;
  }

  // All adjusted — proceed
  push('server-checkout', { employeeId: params.employeeId });
}

function doReopen(c) {
  interrupt('confirm-reopen', {
    reason: 'reopen-check',
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '16px';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + T.bg + ';border:3px solid ' + T.gold + ';padding:24px 32px;text-align:center;max-width:400px;';
      card.style.clipPath = chamfer(10);

      var msg = document.createElement('div');
      msg.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-bottom:20px;';
      msg.textContent = 'Reopen check ' + (c.checkLabel || c.checkId) + '?';
      card.appendChild(msg);

      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';

      btns.appendChild(buildButton('Reopen', {
        fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
        width: 120, height: 44,
        onTap: function() {
          fetch('/api/v1/orders/' + c.checkId + '/reopen', { method: 'POST' })
            .then(function(res) {
              if (res.ok) {
                c.status = 'open';
                resolveInterrupt(true);
                renderTable();
                updateSummary();
              } else {
                res.json().then(function(d) {
                  console.error('[KINDpos] Reopen failed:', d.detail || res.status);
                }).catch(function() {
                  console.error('[KINDpos] Reopen failed:', res.status);
                });
                cancelInterrupt();
              }
            })
            .catch(function(err) {
              console.error('[KINDpos] Reopen failed:', err);
              cancelInterrupt();
            });
        },
      }));

      btns.appendChild(buildButton('Cancel', {
        fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn,
        width: 120, height: 44,
        onTap: function() { cancelInterrupt(); },
      }));

      card.appendChild(btns);
      el.appendChild(card);
    },
  });
}

function doPrint() {
  checks.forEach(function(c) {
    fetch('/api/v1/print/receipt/' + c.checkId + '?copy_type=merchant', { method: 'POST' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
      .catch(function(err) { console.warn('[KINDpos] Print failed:', err); });
  });
}

// ═══════════════════════════════════════════════════
//  REGISTRATION
// ═══════════════════════════════════════════════════

registerScene('tip-adjustment', {
  onEnter: function(el, params) {
    setSceneName('Tip Adjustment: ' + (params.employeeName || 'Server'));
    setHeaderBack({ back: true, x: true });
    buildScene(el, params);
  },
  onExit: function() {
    // Reset refs
    tableBody     = null;
    rightDefault  = null;
    rightEdit     = null;
    batchBar      = null;
    bottomBar     = null;
    btnUnadj      = null;
    btnOpen       = null;
    btnClosed     = null;
    btnVoided     = null;
    numpadRef     = null;
    numpadCheckId = null;
    numpadAmount  = null;
    summaryEls    = {};
    checks = [];
    editingIndex = -1;
    cents = 0;
    filter = 'all';
    statusFilter = 'all';
  },
  cache: false,
  timeoutMs: 0,
});