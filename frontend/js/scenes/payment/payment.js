// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Payment Scene
//  Two-column: Receipt Panel + Payment Action
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, applySunkenStyle, buildStyledButton } from '../../tokens.js';
import { buildButton, showToast } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { setSceneName, setHeaderBack } from '../../app.js';
import { buildNumpad } from '../../numpad.js';
import { showProcessingOverlay } from './card-processing.js';

var PAD     = T.scenePad;
var GAP     = T.colGap;
var LEFT_W  = 340;

// ── Scene state ───────────────────────────────────
var tendered   = 0;
var numpadStr  = '';
var sceneEl    = null;
var sceneData  = {};
var rightCol   = null;
var returnTimer = null;
var dotTimer    = null;
var confirmProcessing = false;

SceneManager.register({
  name: 'payment',

  mount: function(container, params) {
    params = params || {};
    setSceneName(params.checkId || 'ORDER');
    setHeaderBack({
      back: true,
      onBack: function() { SceneManager.closeTransactional('payment'); },
      x: true,
    });

    sceneEl          = container;
    sceneData        = params;
    tendered         = 0;
    numpadStr        = '';
    confirmProcessing = false;
    rightCol         = null;
    returnTimer      = null;
    dotTimer         = null;

    container.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;gap:' + GAP + 'px;',
      'padding:' + PAD + 'px;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');

    container.appendChild(buildReceiptPanel(params));
    if (params.paymentMode === 'cash') {
      rightCol = buildCashPanel(params);
    } else if (params.paymentMode === 'gift_card') {
      rightCol = buildGiftCardPanel(params);
    } else {
      rightCol = buildCardPanel(params);
    }
    container.appendChild(rightCol);
  },

  unmount: function() {
    if (returnTimer) { clearTimeout(returnTimer); returnTimer = null; }
    if (dotTimer)    { clearInterval(dotTimer); dotTimer = null; }
  },
});


// ═══════════════════════════════════════════════════
//  LEFT COLUMN — Receipt Panel
// ═══════════════════════════════════════════════════

function buildReceiptPanel(params) {
  var isCash = params.paymentMode === 'cash';
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
    'padding:10px 14px;flex-shrink:0;',
    'background:' + T.bg4 + ';',
    'border-bottom:2px solid ' + T.bgEdge + ';',
    'display:flex;justify-content:space-between;align-items:center;',
  ].join('');
  var hTitle = document.createElement('div');
  hTitle.style.cssText = 'font-family:' + T.fh + ';font-size:' + T.fsBtn + ';color:' + T.gold + ';letter-spacing:0.08em;';
  hTitle.textContent = 'ORDER RECAP';
  var hId = document.createElement('div');
  hId.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';white-space:nowrap;';
  hId.textContent = params.checkId || '';
  header.appendChild(hTitle);
  header.appendChild(hId);
  col.appendChild(header);

  // ── Column headers ──
  var colHead = document.createElement('div');
  colHead.style.cssText = [
    'display:grid;grid-template-columns:1fr 60px 90px;gap:0 12px;',
    'padding:6px 14px;',
    'font-family:' + T.fh + ';font-size:' + T.fsSmall + ';color:' + T.gold + ';letter-spacing:0.08em;',
    'border-bottom:1px solid ' + T.bg3 + ';flex-shrink:0;',
  ].join('');
  ['ITEM', 'QTY', 'PRICE'].forEach(function(t, i) {
    var c = document.createElement('div');
    c.textContent = t;
    if (i > 0) c.style.textAlign = 'right';
    colHead.appendChild(c);
  });
  col.appendChild(colHead);

  // ── Item rows (scrollable) ──
  var itemScroll = document.createElement('div');
  itemScroll.style.cssText = [
    'flex:1;overflow-y:auto;padding:4px 14px;',
  ].join('');

  (params.items || []).forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = [
      'display:grid;grid-template-columns:1fr 60px 90px;gap:0 12px;',
      'padding:4px 0;',
      'font-family:' + T.fb + ';font-size:' + T.fsItem + ';color:' + T.mint + ';',
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
    price.textContent = '$' + (item.unitPrice * item.qty).toFixed(2);
    row.appendChild(name);
    row.appendChild(qty);
    row.appendChild(price);
    itemScroll.appendChild(row);
  });
  col.appendChild(itemScroll);

  // ── Totals footer ──
  var footer = document.createElement('div');
  footer.style.cssText = [
    'flex-shrink:0;padding:8px 14px;',
    'border-top:2px solid ' + T.bg3 + ';',
  ].join('');

  footer.appendChild(totalsRow('Subtotal', '$' + params.subtotal.toFixed(2), false, T.mint));
  footer.appendChild(totalsRow('Tax', '$' + params.tax.toFixed(2), false, T.mint));

  var hr = document.createElement('hr');
  hr.style.cssText = 'border:none;border-top:1px dashed ' + T.bgLight + ';margin:6px 0;';
  footer.appendChild(hr);

  if (isCash) {
    footer.appendChild(totalsRow('Cash Price', '$' + params.cashPrice.toFixed(2), true, T.gold));
    var tendRow = totalsRow('Tendered', '$0.00', true, T.gold);
    tendRow.querySelector('[data-val]').id = 'pay-tendered';
    footer.appendChild(tendRow);
    var changeRow = totalsRow('Change', '$0.00', true, T.gold);
    changeRow.querySelector('[data-val]').id = 'pay-change';
    changeRow.style.display = 'none';
    changeRow.id = 'pay-change-row';
    footer.appendChild(changeRow);
  } else {
    footer.appendChild(totalsRow('Total', '$' + params.cardTotal.toFixed(2), true, T.gold));
  }

  col.appendChild(footer);

  // ── Mode strip ──
  var strip = document.createElement('div');
  strip.style.cssText = [
    'height:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;',
    'background:' + (isCash ? T.mint : T.gold) + ';',
    'font-family:' + T.fh + ';font-size:' + T.fsBtn + ';color:' + T.bgDark + ';',
    'letter-spacing:0.1em;',
  ].join('');
  strip.textContent = isCash ? '$ CASH' : '◈ CARD';
  col.appendChild(strip);

  return col;
}

function totalsRow(label, value, bold, color) {
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;justify-content:space-between;padding:2px 0;',
    'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';',
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
//  RIGHT COLUMN — Cash Mode
// ═══════════════════════════════════════════════════

function buildCashPanel(params) {
  var col = document.createElement('div');
  col.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:8px;overflow:hidden;';

  // ── Top: Presets (left, expanded) + Numpad (right, login-sized) ──
  var topRow = document.createElement('div');
  topRow.style.cssText = 'flex:1;display:flex;gap:' + GAP + 'px;overflow:hidden;';

  // Preset column (expanded — takes remaining space)
  var presetCol = document.createElement('div');
  presetCol.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:12px;';

  // Preset grid (2×3) — expanded with larger font
  var grid = document.createElement('div');
  grid.style.cssText = 'flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:12px;';

  [5, 10, 15, 20, 50, 100].forEach(function(val) {
    var btn = buildButton('$' + val, {
      fill: T.darkBtn, color: T.mint, fontSize: '50px',
      onTap: function() {
        addTendered(val, params);
        // Flash mint highlight
        var inner = btn.querySelector('div');
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
    grid.appendChild(btn);
  });
  presetCol.appendChild(grid);

  // Exact button — taller with more presence
  var exact = buildButton('EXACT  $' + params.cashPrice.toFixed(2), {
    fill: T.darkBtn, color: T.mint, fontSize: '42px',
    height: 72,
    onTap: function() {
      tendered  = params.cashPrice;
      numpadStr = '';
      updateCashDisplay(params);
      handleConfirm(params);
    },
  });
  exact.style.flexShrink = '0';
  presetCol.appendChild(exact);

  topRow.appendChild(presetCol);

  // Numpad column (right, login-sized)
  var numpadWrap = document.createElement('div');
  numpadWrap.style.cssText = 'flex-shrink:0;display:flex;flex-direction:column;';

  var numpad = buildNumpad({
    masked:        false,
    maxDigits:     7,
    displayH:      60,
    cardPad:       18,
    keyH:          84,
    keyGap:        12,
    gap:           16,
    displayFormat: function(digits) {
      var n = digits ? parseInt(digits, 10) : 0;
      return '$' + (n / 100).toFixed(2);
    },
    onChange: function(digits) {
      numpadStr = digits;
      tendered  = digits ? parseInt(digits, 10) / 100 : 0;
      updateCashDisplay(params);
    },
    onSubmit: function() {
      if (tendered >= params.cashPrice) handleConfirm(params);
    },
  });
  numpadWrap.appendChild(numpad);
  topRow.appendChild(numpadWrap);

  col.appendChild(topRow);

  // ── Bottom: Change display + Confirm ──
  var changeStrip = document.createElement('div');
  changeStrip.id = 'pay-display-change';
  changeStrip.style.cssText = [
    'flex-shrink:0;display:none;padding:8px 16px;',
    'background:' + T.bgDark + ';',
    'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';',
    'text-align:center;letter-spacing:0.08em;',
  ].join('');
  applySunkenStyle(changeStrip);
  changeStrip.textContent = 'CHANGE DUE: $0.00';
  col.appendChild(changeStrip);

  return col;
}


// ═══════════════════════════════════════════════════
//  RIGHT COLUMN — Card Mode
// ═══════════════════════════════════════════════════

function buildCardPanel(params) {
  var col = document.createElement('div');
  col.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:' + GAP + 'px;';

  // ── Reader status panel ──
  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;background:' + T.bgDark + ';',
    'display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:10px;',
    'padding:14px;overflow:hidden;',
  ].join('');
  applySunkenStyle(panel);

  // Icon
  var iconWrap = document.createElement('div');
  iconWrap.style.cssText = [
    'width:64px;height:64px;',
    'background:' + T.bg4 + ';',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:40px;color:' + T.gold + ';',
    'clip-path:' + chamfer(8) + ';',
    'border:3px solid ' + T.gold + ';',
  ].join('');
  iconWrap.textContent = '◈';
  panel.appendChild(iconWrap);

  // Heading
  var heading = document.createElement('div');
  heading.style.cssText = [
    'font-family:' + T.fh + ';font-size:40px;color:' + T.mint + ';',
    'letter-spacing:0.1em;text-align:center;',
  ].join('');
  heading.textContent = 'CARD READER';
  panel.appendChild(heading);

  // Animated dots
  var dotsEl = document.createElement('div');
  dotsEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';letter-spacing:0.3em;height:30px;';
  dotsEl.textContent = '●○○';
  panel.appendChild(dotsEl);
  var dotFrame = 0;
  var dotPatterns = ['●○○', '○●○', '○○●', '○●○'];
  dotTimer = setInterval(function() {
    dotFrame = (dotFrame + 1) % dotPatterns.length;
    dotsEl.textContent = dotPatterns[dotFrame];
  }, 400);

  // Status text
  var status = document.createElement('div');
  status.style.cssText = [
    'font-family:' + T.fb + ';font-size:40px;color:' + T.mutedText + ';',
    'text-align:center;line-height:1.6;letter-spacing:0.05em;',
    'white-space:pre-line;',
  ].join('');
  status.textContent = 'Present card on terminal\nTap, insert, or swipe';
  panel.appendChild(status);

  // Amount display
  var amtBox = document.createElement('div');
  amtBox.style.cssText = [
    'margin-top:6px;padding:8px 32px;',
    'background:' + T.bg4 + ';',
    'clip-path:' + chamfer(6) + ';',
    'border:2px solid ' + T.gold + ';',
    'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.gold + ';',
    'text-align:center;letter-spacing:0.08em;',
  ].join('');
  amtBox.textContent = '$' + params.cardTotal.toFixed(2);
  panel.appendChild(amtBox);

  col.appendChild(panel);

  // ── Charge button ──
  var chargeBtn = buildButton('CHARGE  $' + params.cardTotal.toFixed(2), {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall,
    height: 56,
    onTap: function() { handleConfirm(params); },
  });
  chargeBtn.style.flexShrink = '0';
  col.appendChild(chargeBtn);

  return col;
}


// ═══════════════════════════════════════════════════
//  RIGHT COLUMN — Gift Card Mode
// ═══════════════════════════════════════════════════

function buildGiftCardPanel(params) {
  var col = document.createElement('div');
  col.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:' + GAP + 'px;';

  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;background:' + T.bgDark + ';',
    'display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:16px;',
    'padding:24px;',
  ].join('');
  applySunkenStyle(panel);
  panel.style.borderColor = T.gold;

  // Icon
  var icon = document.createElement('div');
  icon.style.cssText = [
    'font-size:60px;color:' + T.gold + ';',
  ].join('');
  icon.textContent = '\u2605';
  panel.appendChild(icon);

  // Title
  var title = document.createElement('div');
  title.style.cssText = 'font-family:' + T.fh + ';font-size:40px;color:' + T.gold + ';letter-spacing:0.1em;';
  title.textContent = 'GIFT CARD';
  panel.appendChild(title);

  // Instructions
  var instr = document.createElement('div');
  instr.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';text-align:center;';
  instr.textContent = 'Swipe or enter gift card number';
  panel.appendChild(instr);

  // Amount display
  var amtBox = document.createElement('div');
  amtBox.style.cssText = [
    'margin-top:6px;padding:8px 32px;',
    'background:' + T.bg4 + ';',
    'clip-path:' + chamfer(6) + ';',
    'border:2px solid ' + T.gold + ';',
    'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.gold + ';',
    'text-align:center;letter-spacing:0.08em;',
  ].join('');
  amtBox.textContent = '$' + params.cardTotal.toFixed(2);
  panel.appendChild(amtBox);

  // Card number input via numpad
  var numpadWrap = document.createElement('div');
  numpadWrap.style.cssText = 'margin-top:8px;';
  var gcNumpad = buildNumpad({
    masked:        false,
    maxDigits:     16,
    displayH:      50,
    cardPad:       14,
    keyH:          60,
    keyGap:        8,
    gap:           12,
    displayFormat: function(digits) {
      if (!digits) return 'Enter card #';
      return digits.replace(/(.{4})/g, '$1 ').trim();
    },
    onSubmit: function(digits) {
      if (digits.length < 4) return;
      // Process as a card payment with gift_card method
      handleConfirm(Object.assign({}, params, { paymentMode: 'card', giftCardNumber: digits }));
    },
  });
  numpadWrap.appendChild(gcNumpad);
  panel.appendChild(numpadWrap);

  col.appendChild(panel);

  // Charge button
  var chargeBtn = buildButton('REDEEM  $' + params.cardTotal.toFixed(2), {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall,
    height: 56,
    onTap: function() {
      var digits = gcNumpad.getPin ? gcNumpad.getPin() : '';
      if (digits.length < 4) {
        if (gcNumpad.setError) gcNumpad.setError('Enter card #');
        return;
      }
      handleConfirm(Object.assign({}, params, { paymentMode: 'card', giftCardNumber: digits }));
    },
  });
  chargeBtn.style.flexShrink = '0';
  col.appendChild(chargeBtn);

  return col;
}


// ═══════════════════════════════════════════════════
//  RESULT STATE — Replaces right column
// ═══════════════════════════════════════════════════

function activateResult(params, change) {
  var isCash = params.paymentMode === 'cash';
  var amount = isCash ? params.cashPrice : params.cardTotal;

  // Open change-due as transactional over payment
  SceneManager.openTransactional('change-due', {
    paymentMode: params.paymentMode,
    change: change,
    total: amount,
  });
}

function doReturn(returnScene) {
  if (returnTimer) { clearTimeout(returnTimer); returnTimer = null; }
  if (dotTimer)    { clearInterval(dotTimer); dotTimer = null; }
  SceneManager.closeTransactional('payment');
}

function showErrorResult(params, message, errorType) {
  if (!rightCol || !sceneEl) return;

  // Stop dot timer
  if (dotTimer) { clearInterval(dotTimer); dotTimer = null; }

  var newRight = document.createElement('div');
  newRight.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:' + GAP + 'px;';

  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;background:' + T.bgDark + ';',
    'display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:16px;',
    'padding:24px;',
  ].join('');
  applySunkenStyle(panel);
  panel.style.borderColor = T.red;

  // Error icon
  var icon = document.createElement('div');
  icon.style.cssText = [
    'width:80px;height:80px;',
    'background:' + T.red + ';',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:40px;color:#fff;font-weight:bold;',
    'clip-path:' + chamfer(8) + ';',
  ].join('');
  icon.textContent = '✕';
  panel.appendChild(icon);

  // Heading
  var heading = document.createElement('div');
  heading.style.cssText = [
    'font-family:' + T.fh + ';font-size:40px;',
    'color:' + T.red + ';letter-spacing:0.1em;text-align:center;',
  ].join('');
  var headingMap = {
    'DECLINED':  'DECLINED',
    'CANCELLED': 'CANCELLED',
    'ERROR':     'CONNECTION ERROR',
  };
  heading.textContent = headingMap[errorType] || 'ERROR';
  panel.appendChild(heading);

  // Error message
  var msgEl = document.createElement('div');
  msgEl.style.cssText = [
    'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';',
    'color:' + T.mint + ';text-align:center;',
    'max-width:400px;line-height:1.4;letter-spacing:0.04em;',
  ].join('');
  msgEl.textContent = message;
  panel.appendChild(msgEl);

  // Retry hint
  var hint = document.createElement('div');
  hint.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';letter-spacing:0.08em;margin-top:8px;';
  hint.textContent = 'tap to try again';
  panel.appendChild(hint);

  newRight.appendChild(panel);

  // Tap to dismiss back to payment input
  panel.addEventListener('pointerup', function() {
    // Rebuild the right column for another attempt
    sceneEl.removeChild(newRight);
    rightCol = params.paymentMode === 'cash'
      ? buildCashPanel(params)
      : buildCardPanel(params);
    sceneEl.appendChild(rightCol);
  });

  sceneEl.replaceChild(newRight, rightCol);
  rightCol = newRight;
}


// ═══════════════════════════════════════════════════
//  CASH HELPERS
// ═══════════════════════════════════════════════════

var _tenderedCooldown = false;
function addTendered(val, params) {
  if (_tenderedCooldown) return;
  _tenderedCooldown = true;
  setTimeout(function() { _tenderedCooldown = false; }, 200);
  tendered  += val;
  numpadStr  = '';
  updateCashDisplay(params);
  if (tendered >= params.cashPrice) handleConfirm(params);
}

function updateCashDisplay(params) {
  var tenderedEl  = document.getElementById('pay-tendered');
  var changeRowEl = document.getElementById('pay-change-row');
  var changeValEl = document.getElementById('pay-change');
  var changeStrip = document.getElementById('pay-display-change');

  if (tenderedEl) tenderedEl.textContent = '$' + tendered.toFixed(2);

  var change = tendered - params.cashPrice;
  var ready  = tendered >= params.cashPrice;

  if (changeRowEl) {
    changeRowEl.style.display = ready ? 'flex' : 'none';
  }
  if (changeValEl) {
    changeValEl.textContent = '$' + (ready ? change.toFixed(2) : '0.00');
  }
  if (changeStrip) {
    changeStrip.style.display = ready ? 'block' : 'none';
    changeStrip.textContent = 'CHANGE DUE: $' + (ready ? change.toFixed(2) : '0.00');
  }
}


// ═══════════════════════════════════════════════════
//  API + CONFIRM
// ═══════════════════════════════════════════════════
var API = '/api/v1';

async function handleConfirm(params) {
  if (confirmProcessing) return;
  confirmProcessing = true;

  var isCash = params.paymentMode === 'cash';
  var change = isCash ? Math.max(0, tendered - params.cashPrice) : 0;
  var amount = isCash ? params.cashPrice : params.cardTotal;

  var proc = null;

  try {
    if (isCash) {
      var res = await fetch(API + '/payments/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id:       params.orderId,
          amount:         amount,
          tip:            0.0,
          payment_method: 'cash',
        }),
      });
      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        console.error('[KINDpos] Cash payment failed:', err);
        confirmProcessing = false;
        showErrorResult(params, err.detail || 'Cash payment failed', 'ERROR');
        return;
      }
    }
    if (!isCash) {
      // Show processing overlay for card payments
      proc = showProcessingOverlay(amount);

      // 95s client-side timeout (backend has 90s device timeout)
      var controller = new AbortController();
      var cardTimeout = setTimeout(function() { controller.abort(); }, 95000);

      var res = await fetch(API + '/payments/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id:    params.orderId,
          amount:      amount,
          terminal_id: 'terminal_01',
        }),
        signal: controller.signal,
      });

      clearTimeout(cardTimeout);

      if (proc) proc.dismiss();

      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        var errMsg = err.detail || 'Card payment failed';
        var errType = res.status === 402 ? 'DECLINED'
                    : res.status === 400 ? 'CANCELLED'
                    : 'ERROR';
        console.error('[KINDpos] Card payment failed:', errMsg);
        confirmProcessing = false;
        showErrorResult(params, errMsg, errType);
        return;
      }
    }

    // ── Receipt printing ──
    function queueReceipt(copyType) {
      fetch(API + '/print/receipt/' + params.orderId + '?copy_type=' + copyType, { method: 'POST' })
        .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
        .catch(function(err) {
          console.warn('[KINDpos] Receipt print failed (' + copyType + '):', err);
          showToast('Receipt print failed — check printer');
        });
    }

    queueReceipt('customer');
    if (!isCash) queueReceipt('merchant');

  } catch (err) {
    if (proc) proc.dismiss();
    console.error('[KINDpos] Confirm error:', err);
    confirmProcessing = false;
    showErrorResult(params, 'Connection error — check terminal', 'ERROR');
    return;
  }

  confirmProcessing = false;
  activateResult(params, change);
}

