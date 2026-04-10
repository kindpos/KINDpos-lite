// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Payment Console Scene
//  Condensed single-screen: Recap + Denominations + Numpad + Method Toggle
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, applySunkenStyle, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';

var PAD     = T.scenePad;
var GAP     = T.colGapSm;
var LEFT_W  = T.pcLeftW;
var API     = '/api/v1';

// ── Scene state ───────────────────────────────────
var sceneEl           = null;
var sceneData         = {};
var enteredAmount     = 0;
var denomAccum        = 0;
var numpadStr         = '';
var paymentMode       = 'card';
var confirmProcessing = false;
var payments          = [];
var totalPaid         = 0;
var baseTotal         = 0;
var numpadRef         = null;
var dotTimer          = null;

// DOM refs
var _modeButtons      = {};
var _footerPaidRow    = null;
var _footerRemainRow  = null;

// Card processing overlay state
var _procStatusEl     = null;
var _procAnimTimer    = null;

SceneManager.register({
  name: 'payment-console',

  mount: function(container, params) {
    params = params || {};
    sceneEl           = container;
    sceneData         = params;
    enteredAmount     = 0;
    denomAccum        = 0;
    numpadStr         = '';
    paymentMode       = 'card';
    confirmProcessing = false;
    payments          = [];
    totalPaid         = 0;
    baseTotal         = params.cardTotal || 0;
    numpadRef         = null;
    dotTimer          = null;
    _modeButtons      = {};
    _footerPaidRow    = null;
    _footerRemainRow  = null;
    _procStatusEl     = null;
    _procAnimTimer    = null;

    setSceneName(params.checkId || 'ORDER');
    setHeaderBack({
      back: true,
      onBack: function() { SceneManager.closeTransactional('payment-console'); },
      x: true,
    });

    container.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;gap:' + GAP + 'px;',
      'padding:' + PAD + 'px;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');

    container.appendChild(buildReceiptPanel(params));
    container.appendChild(buildCenterColumn(params));
    container.appendChild(buildRightColumn(params));
  },

  unmount: function() {
    if (dotTimer) { clearInterval(dotTimer); dotTimer = null; }
    if (_procAnimTimer) { clearInterval(_procAnimTimer); _procAnimTimer = null; }
  },
});


// ═══════════════════════════════════════════════════
//  LEFT COLUMN — Receipt Panel
// ═══════════════════════════════════════════════════

function buildReceiptPanel(params) {
  var col = document.createElement('div');
  col.style.cssText = [
    'width:' + LEFT_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'background:' + T.bgDark + ';',
  ].join('');
  applySunkenStyle(col);

  // ── Header ──
  var header = document.createElement('div');
  header.style.cssText = [
    'padding:8px 12px;flex-shrink:0;',
    'background:' + T.bg4 + ';',
    'border-bottom:2px solid ' + T.bgEdge + ';',
    'display:flex;justify-content:space-between;align-items:center;',
  ].join('');
  var hTitle = document.createElement('div');
  hTitle.style.cssText = [
    'font-family:' + T.fh + ';font-size:' + T.fsSmall + ';',
    'color:' + T.gold + ';letter-spacing:0.08em;',
  ].join('');
  hTitle.textContent = 'ORDER RECAP';
  var hId = document.createElement('div');
  hId.style.cssText = [
    'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';',
    'color:' + T.mint + ';white-space:nowrap;',
  ].join('');
  hId.textContent = params.checkId || '';
  header.appendChild(hTitle);
  header.appendChild(hId);
  col.appendChild(header);

  // ── Column headers ──
  var colHead = document.createElement('div');
  colHead.style.cssText = [
    'display:grid;grid-template-columns:1fr 40px 68px;gap:0 6px;',
    'padding:4px 10px;',
    'font-family:' + T.fh + ';font-size:' + T.fsCon + ';color:' + T.gold + ';letter-spacing:0.06em;',
    'border-bottom:1px solid ' + T.bg3 + ';flex-shrink:0;',
  ].join('');
  ['ITEM', 'QTY', 'PRICE'].forEach(function(t, i) {
    var c = document.createElement('div');
    c.textContent = t;
    if (i > 0) c.style.textAlign = 'right';
    colHead.appendChild(c);
  });
  col.appendChild(colHead);

  // ── Scrollable items ──
  var itemScroll = document.createElement('div');
  itemScroll.style.cssText = 'flex:1;overflow-y:auto;padding:2px 10px;';

  (params.items || []).forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = [
      'display:grid;grid-template-columns:1fr 40px 68px;gap:0 6px;',
      'padding:3px 0;',
      'font-family:' + T.fb + ';font-size:' + T.fsCon + ';color:' + T.mint + ';',
      'border-bottom:1px solid ' + T.bg3 + ';',
    ].join('');
    var name = document.createElement('div');
    name.textContent = item.name;
    name.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    var qty = document.createElement('div');
    qty.style.cssText = 'text-align:right;color:' + T.gold + ';';
    qty.textContent = item.qty + '\u00D7';
    var price = document.createElement('div');
    price.style.cssText = 'text-align:right;color:' + T.gold + ';';
    price.textContent = '$' + ((item.unitPrice || 0) * (item.qty || 1)).toFixed(2);
    row.appendChild(name);
    row.appendChild(qty);
    row.appendChild(price);
    itemScroll.appendChild(row);
  });
  col.appendChild(itemScroll);

  // ── Bottom: [Summary | Split] row ──
  var summaryRow = document.createElement('div');
  summaryRow.style.cssText = [
    'flex-shrink:0;display:flex;gap:6px;',
    'padding:4px 6px;',
  ].join('');

  // Summary mini-box (bordered)
  var summaryBox = document.createElement('div');
  summaryBox.style.cssText = [
    'flex:1;padding:4px 8px;',
    'background:' + T.bgDark + ';',
  ].join('');
  applySunkenStyle(summaryBox);
  summaryBox.appendChild(footerRow('Subtotal:', '$' + (params.subtotal || 0).toFixed(2), T.mint));
  if (params.discount && params.discount > 0) {
    summaryBox.appendChild(footerRow('Discount:', '$' + params.discount.toFixed(2), T.mint));
  }
  summaryBox.appendChild(footerRow('Tax:', '$' + (params.tax || 0).toFixed(2), T.mint));
  summaryRow.appendChild(summaryBox);

  // Split button (next to summary)
  var splitBtn = buildButton('Split', {
    fill: T.darkBtn, color: T.vermillion, fontSize: T.fsBtnSm,
    onTap: function() { showSplitPopup(); },
  });
  splitBtn.style.cssText += 'flex-shrink:0;width:90px;';
  splitBtn.style.outline = '3px solid ' + T.vermillion;
  splitBtn.style.outlineOffset = '-1px';
  summaryRow.appendChild(splitBtn);
  col.appendChild(summaryRow);

  // ── Prices box (bordered) ──
  var pricesBox = document.createElement('div');
  pricesBox.style.cssText = [
    'flex-shrink:0;padding:4px 8px;margin:0 6px 4px;',
    'background:' + T.bgDark + ';',
  ].join('');
  applySunkenStyle(pricesBox);
  pricesBox.appendChild(footerRow('Card Price:', '$' + (params.cardTotal || 0).toFixed(2), T.gold, true));
  pricesBox.appendChild(footerRow('Cash Price:', '$' + (params.cashPrice || 0).toFixed(2), T.gold, true));

  // Dynamic split-progress rows (hidden until partial payment)
  _footerPaidRow = footerRow('Paid:', '$0.00', T.cyan);
  _footerPaidRow.style.display = 'none';
  pricesBox.appendChild(_footerPaidRow);

  _footerRemainRow = footerRow('Remaining:', '$' + baseTotal.toFixed(2), T.cyan);
  _footerRemainRow.style.display = 'none';
  pricesBox.appendChild(_footerRemainRow);

  col.appendChild(pricesBox);
  return col;
}

function footerRow(label, value, color, bold) {
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;justify-content:space-between;padding:1px 0;',
    'font-family:' + T.fb + ';font-size:' + T.fsConSm + ';',
    'color:' + (color || T.mint) + ';',
    bold ? 'font-weight:bold;' : '',
  ].join('');
  var l = document.createElement('span');
  l.textContent = label;
  var v = document.createElement('span');
  v.style.color = T.gold;
  v.textContent = value;
  v.setAttribute('data-val', '1');
  row.appendChild(l);
  row.appendChild(v);
  return row;
}


// ═══════════════════════════════════════════════════
//  CENTER COLUMN — Denominations + Actions + Toggle
// ═══════════════════════════════════════════════════

function buildCenterColumn(params) {
  var col = document.createElement('div');
  col.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:8px;overflow:hidden;';

  // ── Denomination grid (2 cols) ──
  var grid = document.createElement('div');
  grid.style.cssText = [
    'flex:1;display:grid;',
    'grid-template-columns:1fr 1fr;',
    'grid-template-rows:1fr 1fr auto;',
    'gap:8px;',
  ].join('');

  grid.appendChild(buildDenomBtn(5));
  grid.appendChild(buildDenomBtn(10));
  grid.appendChild(buildDenomBtn(20));
  grid.appendChild(buildDenomBtn(50));

  // $100 spans both columns
  var btn100 = buildDenomBtn(100);
  btn100.style.gridColumn = '1 / -1';
  grid.appendChild(btn100);

  col.appendChild(grid);

  // ── Exact button (yellow accent) ──
  var exactBtn = buildButton('Exact', {
    fill: T.darkBtn, color: T.yellow, fontSize: T.fsBtnSm,
    height: 44,
    onTap: function() { handleExact(); },
  });
  exactBtn.style.flexShrink = '0';
  exactBtn.style.outline = '3px solid ' + T.yellow;
  exactBtn.style.outlineOffset = '-1px';
  col.appendChild(exactBtn);

  // ── Method toggle: Cash | Card | GC ──
  var toggle = document.createElement('div');
  toggle.style.cssText = 'flex-shrink:0;display:flex;gap:8px;';

  toggle.appendChild(buildModeBtn('Cash', 'cash', T.mint));
  toggle.appendChild(buildModeBtn('Card', 'card', T.cyan));
  toggle.appendChild(buildModeBtn('GC', 'gc', T.gold));

  col.appendChild(toggle);

  // Apply initial active mode after DOM is built
  setTimeout(function() { setPaymentMode('card'); }, 0);

  return col;
}

function buildDenomBtn(val) {
  var btn = buildButton('$' + val, {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsDenom,
    onTap: function() {
      handleDenomination(val);
      // Flash mint highlight
      var inner = btn.querySelector('.embossed-btn-inner');
      if (inner) {
        inner.style.background = T.mint;
        inner.style.color = T.bgDark;
        setTimeout(function() {
          inner.style.background = '';
          inner.style.color = T.mint;
        }, 180);
      }
    },
  });
  return btn;
}

function buildModeBtn(label, mode, activeColor) {
  var pair = buildStyledButton(T.darkBtn);
  var wrap = pair.wrap;
  var inner = pair.inner;

  wrap.style.flex = '1';
  wrap.style.height = '44px';
  inner.style.fontFamily = T.fh;
  inner.style.fontSize = T.fsSmall;
  inner.style.color = T.mint;
  inner.style.letterSpacing = '0.06em';
  inner.textContent = label;

  wrap.addEventListener('pointerup', function() {
    setPaymentMode(mode);
  });

  _modeButtons[mode] = { wrap: wrap, inner: inner, color: activeColor };
  return wrap;
}


// ═══════════════════════════════════════════════════
//  RIGHT COLUMN — Numpad
// ═══════════════════════════════════════════════════

function buildRightColumn() {
  var col = document.createElement('div');
  col.style.cssText = 'flex-shrink:0;display:flex;flex-direction:column;';

  numpadRef = buildNumpad({
    masked:         false,
    maxDigits:      7,
    displayH:       60,
    cardPad:        18,
    keyH:           84,
    keyGap:         12,
    gap:            14,
    submitLabel:    'ent',
    chassisColor:   T.numpadChassis,
    chassisChamfer: 6,
    chassisBevel:   5,
    digitColor:     T.digitColor,
    clearColor:     T.clrColor,
    submitColor:    T.submitColor,
    displayColor:   T.gold,
    displayBg:      T.pinFieldBg,
    digitFont:      T.fhr,
    canSubmit:      function() { return enteredAmount > 0; },
    displayFormat:  function(digits) {
      if (digits && digits.length > 0) {
        var n = parseInt(digits, 10) || 0;
        return '$' + (n / 100).toFixed(2);
      }
      return '$' + enteredAmount.toFixed(2);
    },
    onChange: function(digits) {
      numpadStr = digits;
      denomAccum = 0;
      enteredAmount = digits ? parseInt(digits, 10) / 100 : 0;
    },
    onSubmit: function() {
      handleSubmit();
    },
  });

  col.appendChild(numpadRef);
  return col;
}


// ═══════════════════════════════════════════════════
//  PAYMENT MODE TOGGLE
// ═══════════════════════════════════════════════════

function setPaymentMode(mode) {
  paymentMode = mode;
  Object.keys(_modeButtons).forEach(function(m) {
    var b = _modeButtons[m];
    if (!b) return;
    if (m === mode) {
      b.wrap.style.outline = '3px solid ' + b.color;
      b.wrap.style.outlineOffset = '-1px';
      b.inner.style.color = b.color;
    } else {
      b.wrap.style.outline = 'none';
      b.inner.style.color = T.mint;
    }
  });
}


// ═══════════════════════════════════════════════════
//  INPUT HANDLERS
// ═══════════════════════════════════════════════════

var _denomCooldown = false;

function handleDenomination(val) {
  if (_denomCooldown) return;
  _denomCooldown = true;
  setTimeout(function() { _denomCooldown = false; }, 200);

  denomAccum += val;
  enteredAmount = denomAccum;
  numpadStr = '';
  if (numpadRef && numpadRef.clear) numpadRef.clear();
  // clear() triggers render() -> displayFormat('') -> shows enteredAmount
}

function handleExact() {
  var remaining = getRemainingBalance();
  denomAccum = 0;
  enteredAmount = remaining;
  numpadStr = '';
  if (numpadRef && numpadRef.clear) numpadRef.clear();
}

function handleSubmit() {
  if (enteredAmount <= 0 || confirmProcessing) return;
  handleConfirm();
}

function getRemainingBalance() {
  return Math.max(0, baseTotal - totalPaid);
}

function updateSplitDisplay() {
  if (totalPaid > 0) {
    if (_footerPaidRow) {
      _footerPaidRow.style.display = 'flex';
      var pv = _footerPaidRow.querySelector('[data-val]');
      if (pv) pv.textContent = '$' + totalPaid.toFixed(2);
    }
    if (_footerRemainRow) {
      _footerRemainRow.style.display = 'flex';
      var rv = _footerRemainRow.querySelector('[data-val]');
      if (rv) rv.textContent = '$' + getRemainingBalance().toFixed(2);
    }
  }
}


// ═══════════════════════════════════════════════════
//  CONFIRM — API Calls
// ═══════════════════════════════════════════════════

async function handleConfirm() {
  if (confirmProcessing) return;
  confirmProcessing = true;

  var remaining = getRemainingBalance();
  var isCash = paymentMode === 'cash';
  var paymentAmount = Math.min(enteredAmount, remaining);
  var change = isCash ? Math.max(0, enteredAmount - paymentAmount) : 0;
  var proc = null;

  if (paymentAmount <= 0) {
    confirmProcessing = false;
    return;
  }

  try {
    if (isCash) {
      // ── Cash payment ──
      var res = await fetch(API + '/payments/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id:       sceneData.orderId,
          amount:         paymentAmount,
          tip:            0.0,
          payment_method: 'cash',
        }),
      });
      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        confirmProcessing = false;
        showToast(err.detail || 'Cash payment failed', { bg: T.red });
        return;
      }
    } else {
      // ── Card / Gift Card payment ──
      proc = showProcessingOverlay(paymentAmount);

      var controller = new AbortController();
      var cardTimeout = setTimeout(function() { controller.abort(); }, 95000);

      var res = await fetch(API + '/payments/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id:    sceneData.orderId,
          amount:      paymentAmount,
          terminal_id: 'terminal_01',
        }),
        signal: controller.signal,
      });

      clearTimeout(cardTimeout);
      if (proc) proc.dismiss();

      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        var errType = res.status === 402 ? 'DECLINED'
                    : res.status === 400 ? 'CANCELLED'
                    : 'ERROR';
        confirmProcessing = false;
        showToast(err.detail || 'Payment failed \u2014 ' + errType, { bg: T.red });
        return;
      }
    }

    // ── Success — queue receipts ──
    queueReceipt('customer');
    if (!isCash) queueReceipt('merchant');

    // Track payment
    payments.push({ method: paymentMode, amount: paymentAmount });
    totalPaid += paymentAmount;

    var newRemaining = getRemainingBalance();
    confirmProcessing = false;

    if (newRemaining < 0.005) {
      // Fully paid — show change due
      activateResult(change);
    } else {
      // Partial payment — reset for next installment
      enteredAmount = 0;
      denomAccum = 0;
      numpadStr = '';
      if (numpadRef) numpadRef.clear();
      updateSplitDisplay();
      showToast(
        '$' + paymentAmount.toFixed(2) + ' ' + paymentMode +
        ' \u2014 $' + newRemaining.toFixed(2) + ' remaining',
        { bg: T.goGreen, duration: 3000 }
      );
    }

  } catch (err) {
    if (proc) proc.dismiss();
    confirmProcessing = false;
    showToast('Connection error \u2014 check terminal', { bg: T.red });
  }
}

function queueReceipt(copyType) {
  fetch(API + '/print/receipt/' + sceneData.orderId + '?copy_type=' + copyType, { method: 'POST' })
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
    .catch(function(err) {
      console.warn('[KINDpos] Receipt print failed (' + copyType + '):', err);
      showToast('Receipt print failed \u2014 check printer');
    });
}


// ═══════════════════════════════════════════════════
//  RESULT — Open Change Due
// ═══════════════════════════════════════════════════

function activateResult(change) {
  var lastPayment = payments[payments.length - 1] || {};
  var isCash = lastPayment.method === 'cash';
  SceneManager.openTransactional('change-due', {
    paymentMode: isCash ? 'cash' : 'card',
    change:      change,
    total:       totalPaid,
  });
}


// ═══════════════════════════════════════════════════
//  SPLIT POPUP — Fraction Selector (Interrupt)
// ═══════════════════════════════════════════════════

function showSplitPopup() {
  var remaining = getRemainingBalance();
  if (remaining <= 0) return;

  SceneManager.interrupt('split-select', {
    params: { remaining: remaining },
    onConfirm: function(amount) {
      denomAccum = 0;
      enteredAmount = amount;
      numpadStr = '';
      if (numpadRef && numpadRef.clear) numpadRef.clear();
    },
  });
}

SceneManager.register({
  name: 'split-select',

  mount: function(container, params) {
    params = params || {};
    var remaining = params.remaining || 0;
    var onConfirm = params.onConfirm || function() {};
    var onCancel = params.onCancel || function() {};

    container.style.cssText = [
      'display:flex;flex-direction:column;align-items:center;gap:16px;',
      'padding:28px 40px;',
      'background:' + T.bgDark + ';',
      'min-width:360px;',
    ].join('');
    applySunkenStyle(container);

    // Title
    var title = document.createElement('div');
    title.style.cssText = [
      'font-family:' + T.fh + ';font-size:' + T.fsBtnSm + ';',
      'color:' + T.gold + ';letter-spacing:0.1em;',
    ].join('');
    title.textContent = 'SPLIT PAYMENT';
    container.appendChild(title);

    // Remaining display
    var sub = document.createElement('div');
    sub.style.cssText = [
      'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';',
      'color:' + T.mint + ';',
    ].join('');
    sub.textContent = 'Remaining: $' + remaining.toFixed(2);
    container.appendChild(sub);

    // Fraction buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;';

    [2, 3, 4].forEach(function(divisor) {
      var amt = Math.ceil(remaining / divisor * 100) / 100;
      var btn = buildButton('1/' + divisor + '\n$' + amt.toFixed(2), {
        fill: T.darkBtn, color: T.mint, fontSize: T.fsCon,
        width: 100, height: 64,
        onTap: function() { onConfirm(amt); },
      });
      btnRow.appendChild(btn);
    });
    container.appendChild(btnRow);

    // Cancel
    var cancelBtn = buildButton('Cancel', {
      fill: T.darkBtn, color: T.vermillion, fontSize: T.fsCon,
      width: 120, height: 40,
      onTap: function() { onCancel(); },
    });
    container.appendChild(cancelBtn);
  },

  unmount: function() {},
});


// ═══════════════════════════════════════════════════
//  CARD PROCESSING OVERLAY (Win98-style)
// ═══════════════════════════════════════════════════

function showProcessingOverlay(amount) {
  SceneManager.openTransactional('pc-card-processing', { amount: amount });
  return {
    updateStatus: function(msg) { if (_procStatusEl) _procStatusEl.textContent = msg; },
    dismiss: function() {
      if (_procAnimTimer) clearInterval(_procAnimTimer);
      _procAnimTimer = null;
      _procStatusEl = null;
      SceneManager.closeTransactional('pc-card-processing');
    },
  };
}

SceneManager.register({
  name: 'pc-card-processing',

  mount: function(container, params) {
    params = params || {};
    var amount = params.amount || 0;
    var TOTAL_SEGS = 22;
    var segments = [];
    var segIdx = 0;
    var msgIdx = 0;

    var statusMessages = [
      'Connecting to terminal...',
      'Waiting for card...',
      'Reading card data...',
      'Contacting processor...',
      'Awaiting authorization...',
    ];

    container.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;align-items:center;justify-content:center;',
    ].join('');

    // Gold frame
    var frame = document.createElement('div');
    frame.style.cssText = [
      'background:' + T.gold + ';padding:7px;',
      'clip-path:' + chamfer(12) + ';',
      'filter:drop-shadow(4px 6px 0px rgba(0,0,0,0.7));',
    ].join('');

    // Dialog body
    var dialog = document.createElement('div');
    dialog.style.cssText = [
      'background:' + T.bg + ';width:420px;',
      'border-top:2px solid ' + T.bgLight + ';',
      'border-left:2px solid ' + T.bgLight + ';',
      'border-bottom:2px solid ' + T.bgEdge + ';',
      'border-right:2px solid ' + T.bgEdge + ';',
      'font-family:' + T.fb + ';',
    ].join('');

    // Title bar
    var titleBar = document.createElement('div');
    titleBar.style.cssText = [
      'background:linear-gradient(to right,' + T.bgDark + ',' + T.bg3 + ');',
      'padding:5px 8px;display:flex;align-items:center;gap:8px;',
    ].join('');

    var icon = document.createElement('div');
    icon.style.cssText = [
      'width:24px;height:24px;background:' + T.gold + ';',
      'display:flex;align-items:center;justify-content:center;',
      'font-size:' + T.fsMed + ';font-weight:bold;color:' + T.bgDark + ';',
      'clip-path:' + chamfer(3) + ';',
    ].join('');
    icon.textContent = '\u25C8';

    var titleText = document.createElement('span');
    titleText.style.cssText = [
      'font-family:' + T.fb + ';font-size:' + T.fsMed + ';',
      'color:' + T.mint + ';font-weight:bold;letter-spacing:0.05em;',
    ].join('');
    titleText.textContent = 'Card Payment \u2014 $' + amount.toFixed(2);

    titleBar.appendChild(icon);
    titleBar.appendChild(titleText);
    dialog.appendChild(titleBar);

    // Body
    var body = document.createElement('div');
    body.style.cssText = 'padding:16px 20px 14px;display:flex;flex-direction:column;gap:10px;';

    _procStatusEl = document.createElement('div');
    _procStatusEl.style.cssText = [
      'font-family:' + T.fb + ';font-size:' + T.fsMed + ';',
      'color:' + T.mint + ';min-height:24px;',
    ].join('');
    _procStatusEl.textContent = statusMessages[0];
    body.appendChild(_procStatusEl);

    // Progress bar
    var progContainer = document.createElement('div');
    progContainer.style.cssText = [
      'border-top:2px solid ' + T.bgEdge + ';',
      'border-left:2px solid ' + T.bgEdge + ';',
      'border-bottom:2px solid ' + T.bgLight + ';',
      'border-right:2px solid ' + T.bgLight + ';',
      'height:26px;background:' + T.bgDark + ';',
      'padding:3px;overflow:hidden;',
    ].join('');
    var progFill = document.createElement('div');
    progFill.style.cssText = 'height:100%;display:flex;gap:2px;align-items:stretch;';

    for (var i = 0; i < TOTAL_SEGS; i++) {
      var seg = document.createElement('div');
      seg.style.cssText = [
        'width:14px;flex-shrink:0;',
        'background:' + T.gold + ';opacity:0;transition:opacity 0.05s;',
      ].join('');
      progFill.appendChild(seg);
      segments.push(seg);
    }
    progContainer.appendChild(progFill);
    body.appendChild(progContainer);

    var hint = document.createElement('div');
    hint.style.cssText = [
      'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';',
      'color:' + T.mutedText + ';text-align:center;',
    ].join('');
    hint.textContent = 'Present card on terminal...';
    body.appendChild(hint);

    dialog.appendChild(body);
    frame.appendChild(dialog);
    container.appendChild(frame);

    // Animate progress
    _procAnimTimer = setInterval(function() {
      if (segIdx < TOTAL_SEGS) {
        segments[segIdx].style.opacity = '1';
        segIdx++;
      }
      if (segIdx % 4 === 0 && msgIdx < statusMessages.length - 1) {
        msgIdx++;
        if (_procStatusEl) _procStatusEl.textContent = statusMessages[msgIdx];
      }
      if (segIdx >= TOTAL_SEGS) {
        segIdx = 0;
        segments.forEach(function(s) { s.style.opacity = '0'; });
      }
    }, 200);
  },

  unmount: function() {
    if (_procAnimTimer) clearInterval(_procAnimTimer);
    _procAnimTimer = null;
    _procStatusEl = null;
  },
});
