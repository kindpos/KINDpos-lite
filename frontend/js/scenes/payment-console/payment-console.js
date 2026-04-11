// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Payment Console Scene
//  2-column: Denominations + Numpad (left recap is persistent OrderSummary)
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, applySunkenStyle, buildStyledButton } from '../../tokens.js';
import { buildButton, showToast } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { setSceneName, setHeaderBack } from '../../app.js';
import { buildNumpad } from '../../numpad.js';
import { OrderSummary } from '../../order-summary.js';
import { showProcessingOverlay } from './pc-card-processing.js';
import './split-select.js';

var PAD     = T.scenePad;
var GAP     = T.colGapSm;
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

// Split tap handler (bound to event bus)
function _onSplitTap() { showSplitPopup(); }

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
      'background:' + T.bg + ';',
    ].join('');

    // Summary panel is already visible from order-entry — just update split progress
    SceneManager.on('split:tap', _onSplitTap);
    container.appendChild(buildCenterColumn(params));
    container.appendChild(buildRightColumn(params));
  },

  unmount: function() {
    SceneManager.off('split:tap', _onSplitTap);
    if (dotTimer) { clearInterval(dotTimer); dotTimer = null; }
  },
});


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
    gap:            16,
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
      // Active: colored fill, dark text (inverted)
      b.wrap.style.background = b.color;
      b.wrap.style.outline = 'none';
      b.inner.style.color = T.bgDark;
    } else {
      // Inactive: dark fill, colored text
      b.wrap.style.background = b.wrap._embV ? b.wrap._embV.bg : T.embDarkBg;
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
    OrderSummary.updateSplit({ totalPaid: totalPaid, remaining: getRemainingBalance() });
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

