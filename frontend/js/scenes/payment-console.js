// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Payment Console Scene (SM2)
//  2-column: Denominations + Numpad (left recap is persistent OrderSummary)
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, applySunkenStyle, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager, defineScene } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';
import { OrderSummary } from '../order-summary.js';

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

// Card processing overlay state
var _procStatusEl     = null;
var _procAnimTimer    = null;

// Change-due timer
var _changeDueTimer   = null;

// Split tap handler (bound to event bus)
function _onSplitTap() { showSplitPopup(); }


// ═══════════════════════════════════════════════════
//  SCENE DEFINITION
// ═══════════════════════════════════════════════════

defineScene({
  name: 'payment-console',

  state: {
    enteredAmount: 0,
    paymentMode: 'card',
  },

  render: function(container, params) {
    params = params || {};
    sceneEl           = container;
    sceneData         = params;
    enteredAmount     = 0;
    denomAccum        = 0;
    numpadStr         = '';
    paymentMode       = params.paymentMode || 'card';
    confirmProcessing = false;
    payments          = [];
    totalPaid         = 0;
    baseTotal         = params.cardTotal || 0;
    numpadRef         = null;
    dotTimer          = null;
    _modeButtons      = {};
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
      'background:' + T.bg + ';',
    ].join('');

    container.appendChild(buildCenterColumn(params));
    container.appendChild(buildRightColumn(params));
  },

  unmount: function() {
    SceneManager.off('split:tap', _onSplitTap);
    if (dotTimer) { clearInterval(dotTimer); dotTimer = null; }
    if (_procAnimTimer) { clearInterval(_procAnimTimer); _procAnimTimer = null; }
  },

  events: {
    'split:tap': function() { showSplitPopup(); },
  },

  interrupts: {
    'split-select': {
      render: function(container, params) {
        params = params || {};
        var remaining = params.remaining || 0;

        container.style.cssText = [
          'display:flex;flex-direction:column;align-items:center;gap:16px;',
          'padding:28px 40px;',
          'background:' + T.bgDark + ';',
          'min-width:360px;',
        ].join('');
        applySunkenStyle(container);

        var title = document.createElement('div');
        title.style.cssText = 'font-family:' + T.fh + ';font-size:' + T.fsBtnSm + ';color:' + T.gold + ';letter-spacing:0.1em;';
        title.textContent = 'SPLIT PAYMENT';
        container.appendChild(title);

        var sub = document.createElement('div');
        sub.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';';
        sub.textContent = 'Remaining: $' + remaining.toFixed(2);
        container.appendChild(sub);

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:12px;';

        [2, 3, 4].forEach(function(divisor) {
          var amt = Math.ceil(remaining / divisor * 100) / 100;
          btnRow.appendChild(buildButton('1/' + divisor + '\n$' + amt.toFixed(2), {
            fill: T.darkBtn, color: T.mint, fontSize: T.fsCon,
            width: 100, height: 64,
            onTap: function() { params.onConfirm(amt); },
          }));
        });
        container.appendChild(btnRow);

        container.appendChild(buildButton('Cancel', {
          fill: T.darkBtn, color: T.vermillion, fontSize: T.fsCon,
          width: 120, height: 40,
          onTap: function() { params.onCancel(); },
        }));
      },
    },
  },

  transactionals: {
    'pc-card-processing': {
      render: function(container, params) {
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

        container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';

        var frame = document.createElement('div');
        frame.style.cssText = 'background:' + T.gold + ';padding:7px;clip-path:' + chamfer(12) + ';filter:drop-shadow(4px 6px 0px rgba(0,0,0,0.7));';

        var dialog = document.createElement('div');
        dialog.style.cssText = 'background:' + T.bg + ';width:420px;border-top:2px solid ' + T.bgLight + ';border-left:2px solid ' + T.bgLight + ';border-bottom:2px solid ' + T.bgEdge + ';border-right:2px solid ' + T.bgEdge + ';font-family:' + T.fb + ';';

        var titleBar = document.createElement('div');
        titleBar.style.cssText = 'background:linear-gradient(to right,' + T.bgDark + ',' + T.bg3 + ');padding:5px 8px;display:flex;align-items:center;gap:8px;';

        var icon = document.createElement('div');
        icon.style.cssText = 'width:24px;height:24px;background:' + T.gold + ';display:flex;align-items:center;justify-content:center;font-size:' + T.fsMed + ';font-weight:bold;color:' + T.bgDark + ';clip-path:' + chamfer(3) + ';';
        icon.textContent = '\u25C8';

        var titleText = document.createElement('span');
        titleText.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsMed + ';color:' + T.mint + ';font-weight:bold;letter-spacing:0.05em;';
        titleText.textContent = 'Card Payment \u2014 $' + amount.toFixed(2);

        titleBar.appendChild(icon);
        titleBar.appendChild(titleText);
        dialog.appendChild(titleBar);

        var body = document.createElement('div');
        body.style.cssText = 'padding:16px 20px 14px;display:flex;flex-direction:column;gap:10px;';

        _procStatusEl = document.createElement('div');
        _procStatusEl.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsMed + ';color:' + T.mint + ';min-height:24px;';
        _procStatusEl.textContent = statusMessages[0];
        body.appendChild(_procStatusEl);

        var progContainer = document.createElement('div');
        progContainer.style.cssText = 'border-top:2px solid ' + T.bgEdge + ';border-left:2px solid ' + T.bgEdge + ';border-bottom:2px solid ' + T.bgLight + ';border-right:2px solid ' + T.bgLight + ';height:26px;background:' + T.bgDark + ';padding:3px;overflow:hidden;';
        var progFill = document.createElement('div');
        progFill.style.cssText = 'height:100%;display:flex;gap:2px;align-items:stretch;';

        for (var i = 0; i < TOTAL_SEGS; i++) {
          var seg = document.createElement('div');
          seg.style.cssText = 'width:14px;flex-shrink:0;background:' + T.gold + ';opacity:0;transition:opacity 0.05s;';
          progFill.appendChild(seg);
          segments.push(seg);
        }
        progContainer.appendChild(progFill);
        body.appendChild(progContainer);

        var hint = document.createElement('div');
        hint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';text-align:center;';
        hint.textContent = 'Present card on terminal...';
        body.appendChild(hint);

        dialog.appendChild(body);
        frame.appendChild(dialog);
        container.appendChild(frame);

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
    },

    'pc-change-due': {
      render: function(container, params) {
        params = params || {};
        var returned = false;
        _changeDueTimer = null;

        setSceneName(null);
        setHeaderBack({});

        container.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;background:' + T.scrimInterrupt + ';';

        var isCash    = params.paymentMode === 'cash';
        var hasChange = isCash && params.change > 0;

        var card = document.createElement('div');
        card.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:32px 64px 28px;background:' + T.bgDark + ';min-width:480px;';
        applySunkenStyle(card);

        var topLabel = document.createElement('div');
        topLabel.style.cssText = 'font-family:' + T.fh + ';font-size:32px;letter-spacing:0.18em;color:' + T.mint + ';margin-bottom:20px;';
        topLabel.textContent = isCash ? 'CASH PAYMENT' : 'CARD PAYMENT';
        card.appendChild(topLabel);

        if (hasChange) {
          var changeLabel = document.createElement('div');
          changeLabel.style.cssText = 'font-family:' + T.fh + ';font-size:' + T.fsBtn + ';letter-spacing:0.14em;color:' + T.mint + ';margin-bottom:4px;';
          changeLabel.textContent = 'CHANGE DUE';
          card.appendChild(changeLabel);

          var changeAmount = document.createElement('div');
          changeAmount.style.cssText = 'font-family:' + T.fb + ';font-size:96px;font-weight:bold;color:' + T.gold + ';line-height:1;letter-spacing:0.02em;';
          changeAmount.textContent = '$' + params.change.toFixed(2);
          card.appendChild(changeAmount);
        } else {
          var paidLabel = document.createElement('div');
          paidLabel.style.cssText = 'font-family:' + T.fh + ';font-size:40px;font-weight:bold;letter-spacing:0.1em;color:' + T.mint + ';margin-bottom:8px;';
          paidLabel.textContent = isCash ? 'EXACT CHANGE' : 'PAYMENT APPROVED';
          card.appendChild(paidLabel);
        }

        var chargedLine = document.createElement('div');
        chargedLine.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';margin-top:12px;letter-spacing:0.06em;';
        chargedLine.textContent = (isCash ? 'Cash price: ' : 'Charged: ') + '$' + params.total.toFixed(2);
        card.appendChild(chargedLine);

        var printLine = document.createElement('div');
        printLine.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';letter-spacing:0.12em;margin-top:16px;';
        printLine.textContent = 'RECEIPT PRINTING...';
        card.appendChild(printLine);

        container.appendChild(card);

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:20px;margin-top:24px;';

        btnRow.appendChild(buildButton('NEW ORDER', {
          fill: T.darkBtn, color: T.mint, fontSize: '32px',
          width: 220, height: 64,
          onTap: function() { doReturn('order-entry'); },
        }));

        btnRow.appendChild(buildButton('LOGOUT', {
          fill: T.darkBtn, color: T.mint, fontSize: '32px',
          width: 220, height: 64,
          onTap: function() { doReturn('login'); },
        }));

        container.appendChild(btnRow);

        var postAction = (window.KINDpos && window.KINDpos.postPaymentAction) || 'quick-service';
        if (postAction === 'logout') {
          var autoHint = document.createElement('div');
          autoHint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';letter-spacing:0.1em;margin-top:12px;';
          autoHint.textContent = 'auto-logout in 8s...';
          container.appendChild(autoHint);

          var countdown = 8;
          _changeDueTimer = setInterval(function() {
            countdown--;
            if (countdown <= 0) {
              clearInterval(_changeDueTimer);
              _changeDueTimer = null;
              doReturn('login');
            } else {
              autoHint.textContent = 'auto-logout in ' + countdown + 's...';
            }
          }, 1000);
        }

        function doReturn(target) {
          if (returned) return;
          returned = true;
          if (_changeDueTimer) { clearInterval(_changeDueTimer); _changeDueTimer = null; }
          var activeScene = SceneManager.getActiveWorking();
          SceneManager.closeAllTransactional();
          if (target === 'login') {
            OrderSummary.hide();
            SceneManager.unmountWorking(activeScene);
            SceneManager.openGate('login');
          } else if (activeScene === 'check-overview') {
            SceneManager.emit('payment:complete');
          } else {
            OrderSummary.hide();
            SceneManager.mountWorking('order-entry', {});
          }
        }
      },
      unmount: function() {
        if (_changeDueTimer) { clearInterval(_changeDueTimer); _changeDueTimer = null; }
      },
    },
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

  setTimeout(function() { setPaymentMode(paymentMode); }, 0);

  return col;
}

function buildDenomBtn(val) {
  var btn = buildButton('$' + val, {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsDenom,
    onTap: function() {
      handleDenomination(val);
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
    displayColor:   T.pinDot,
    displayBg:      T.pinFieldBg,
    digitFont:      T.fhr,
    canSubmit:      function() { return enteredAmount > 0; },
    displayFormat:  function(digits) {
      if (digits && digits.length > 0) {
        var n = parseInt(digits, 10) || 0;
        return '$' + (n / 100).toFixed(2);
      }
      if (denomAccum > 0) return '$' + denomAccum.toFixed(2);
      return '$0.00';
    },
    onChange: function(digits) {
      denomAccum = 0;
      numpadStr = digits;
      enteredAmount = (parseInt(digits, 10) || 0) / 100;
      updateSplitDisplay();
    },
    onSubmit: function() {
      handleConfirm();
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
      b.wrap.style.background = b.color;
      b.wrap.style.outline = 'none';
      b.inner.style.color = T.bgDark;
    } else {
      b.wrap.style.background = b.wrap._embV ? b.wrap._embV.bg : T.embDarkBg;
      b.wrap.style.outline = 'none';
      b.inner.style.color = T.mint;
    }
  });
}


// ═══════════════════════════════════════════════════
//  DENOMINATION + EXACT HANDLERS
// ═══════════════════════════════════════════════════

function handleDenomination(val) {
  denomAccum += val;
  numpadStr = '';
  enteredAmount = denomAccum;
  if (numpadRef) {
    numpadRef.setPin('');
    numpadRef.setHint('$' + denomAccum.toFixed(2), T.gold);
  }
  updateSplitDisplay();
}

function handleExact() {
  var remaining = getRemainingBalance();
  enteredAmount = remaining;
  denomAccum = 0;
  numpadStr = '';
  if (numpadRef) {
    numpadRef.setPin('');
    numpadRef.setHint('$' + remaining.toFixed(2), T.gold);
  }
  updateSplitDisplay();
}


// ═══════════════════════════════════════════════════
//  BALANCE TRACKING
// ═══════════════════════════════════════════════════

function getRemainingBalance() {
  return Math.max(0, baseTotal - totalPaid);
}

function updateSplitDisplay() {
  if (OrderSummary && OrderSummary.updateSplit) {
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
      var cashBody = {
          order_id:       sceneData.orderId,
          amount:         paymentAmount,
          tip:            0.0,
          payment_method: 'cash',
      };
      if (sceneData.seatNumbers) cashBody.seat_numbers = sceneData.seatNumbers;
      var res = await fetch(API + '/payments/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cashBody),
      });
      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        confirmProcessing = false;
        showToast(err.detail || 'Cash payment failed', { bg: T.red });
        return;
      }
    } else {
      proc = showProcessingOverlay(paymentAmount);

      var controller = new AbortController();
      var cardTimeout = setTimeout(function() { controller.abort(); }, 95000);

      var saleBody = {
          order_id:    sceneData.orderId,
          amount:      paymentAmount,
          terminal_id: 'terminal_01',
      };
      if (sceneData.seatNumbers) saleBody.seat_numbers = sceneData.seatNumbers;
      var res = await fetch(API + '/payments/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleBody),
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

    payments.push({ method: paymentMode, amount: paymentAmount });
    totalPaid += paymentAmount;

    var newRemaining = getRemainingBalance();
    confirmProcessing = false;

    if (newRemaining < 0.005) {
      activateResult(change);
    } else {
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

  // If this payment came from the check-overview (per-seat / split-check
  // flow), skip the logout/new-order interrupt and return directly. The
  // freshly paid seat(s) will render gold; remaining seats stay tappable.
  var activeScene = SceneManager.getActiveWorking && SceneManager.getActiveWorking();
  if (activeScene === 'check-overview') {
    SceneManager.closeAllTransactional();
    SceneManager.emit('payment:complete');
    if (isCash && change > 0) {
      showToast('Change: $' + change.toFixed(2), { bg: T.gold, duration: 3000 });
    }
    return;
  }

  SceneManager.openTransactional('pc-change-due', {
    paymentMode: isCash ? 'cash' : 'card',
    change:      change,
    total:       totalPaid,
  });
}


// ═══════════════════════════════════════════════════
//  SPLIT POPUP
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


// ═══════════════════════════════════════════════════
//  CARD PROCESSING OVERLAY HELPERS
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
