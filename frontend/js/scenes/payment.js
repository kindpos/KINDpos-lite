// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Payment Scene
//  Left-to-right flow: Summary → Input → Result
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildButton } from '../components.js';
import { registerScene, replace } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';

var PAD     = 16;
var GAP     = 10;
var LEFT_W  = 310;
var BTN_H   = 56;

// ── Scene state ───────────────────────────────────
var tendered   = 0;
var numpadStr  = '';
var sceneEl    = null;
var sceneData  = {};
var rightCol   = null;   // reference to step-3 column
var returnTimer = null;

registerScene('payment', {
  onEnter: function(el, params) {
    setSceneName(params.checkId || 'ORDER');
    setHeaderBack(false);

    sceneEl          = el;
    sceneData        = params;
    tendered         = 0;
    numpadStr        = '';
    confirmProcessing = false;
    rightCol         = null;
    returnTimer      = null;

    el.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;gap:' + GAP + 'px;',
      'padding:' + PAD + 'px;',
      'box-sizing:border-box;',
    ].join('');

    el.appendChild(buildLeft(params));
    el.appendChild(buildCenter(params));
    rightCol = buildRight(params);
    el.appendChild(rightCol);
  },
  onExit: function() {
    if (returnTimer) { clearTimeout(returnTimer); returnTimer = null; }
  },
});

// ═══════════════════════════════════════════════════
//  STEP 1 — LEFT: Order summary + totals
// ═══════════════════════════════════════════════════

function buildLeft(params) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:' + LEFT_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;gap:8px;',
  ].join('');

  // Item summary
  var summaryCard = document.createElement('div');
  summaryCard.style.cssText = [
    'flex:1;background:' + T.bgDark + ';',
    'border:2px solid ' + T.bgLight + ';',
    'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
    'padding:10px 12px;overflow-y:auto;',
  ].join('');

  var summaryLabel = document.createElement('div');
  summaryLabel.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';letter-spacing:0.1em;margin-bottom:8px;';
  summaryLabel.textContent = 'ITEM SUMMARY';
  summaryCard.appendChild(summaryLabel);

  (params.items || []).forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = [
      'display:flex;justify-content:space-between;',
      'font-family:' + T.fb + ';font-size:20px;color:' + T.mint + ';',
      'padding:3px 0;border-bottom:1px solid ' + T.bg3 + ';',
    ].join('');
    var nameEl = document.createElement('span');
    nameEl.textContent = (item.qty > 1 ? item.qty + '× ' : '') + item.name;
    var priceEl = document.createElement('span');
    priceEl.textContent = '$' + (item.unitPrice * item.qty).toFixed(2);
    row.appendChild(nameEl);
    row.appendChild(priceEl);
    summaryCard.appendChild(row);
  });

  panel.appendChild(summaryCard);

  // Totals card
  var totalsCard = document.createElement('div');
  totalsCard.style.cssText = [
    'background:' + T.bgDark + ';',
    'border:2px solid ' + T.bgLight + ';',
    'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
    'padding:8px 12px;flex-shrink:0;',
  ].join('');

  totalsCard.appendChild(buildTotalsRow('Subtotal', '$' + params.subtotal.toFixed(2), false));
  totalsCard.appendChild(buildTotalsRow('Tax',      '$' + params.tax.toFixed(2),      false));

  var divider = document.createElement('hr');
  divider.style.cssText = 'border:none;border-top:1px solid ' + T.bgLight + ';margin:5px 0;';
  totalsCard.appendChild(divider);

  if (params.paymentMode === 'cash') {
    totalsCard.appendChild(buildTotalsRow('Cash Price', '$' + params.cashPrice.toFixed(2), true, T.gold));
    totalsCard.appendChild(buildTotalsRow('Tendered',   '$0.00', true, T.mint, 'pay-tendered'));

    var changeDivider = document.createElement('hr');
    changeDivider.style.cssText = 'border:none;border-top:1px solid ' + T.bgLight + ';margin:5px 0;display:none;';
    changeDivider.id = 'change-divider';
    totalsCard.appendChild(changeDivider);

    totalsCard.appendChild(buildTotalsRow('Change Due', '$0.00', true, T.cyan, 'pay-change'));
    document.getElementById && setTimeout(function() {
      var cr = document.getElementById('pay-change');
      if (cr) cr.parentElement.style.display = 'none';
    }, 0);
  } else {
    totalsCard.appendChild(buildTotalsRow('Card Total', '$' + params.cardTotal.toFixed(2), true, T.gold));
  }

  panel.appendChild(totalsCard);

  // Mode indicator
  var modeBar = document.createElement('div');
  var isCash = params.paymentMode === 'cash';
  modeBar.style.cssText = [
    'height:48px;display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    'background:' + (isCash ? T.mint : T.gold) + ';',
    'clip-path:polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px);',
    'font-family:' + T.fb + ';font-size:20px;font-weight:bold;color:#1a1a1a;',
    'letter-spacing:0.12em;',
  ].join('');
  modeBar.textContent = isCash ? '$ CASH PAYMENT' : '◈ CARD PAYMENT';
  panel.appendChild(modeBar);

  return panel;
}

function buildTotalsRow(label, value, big, color, id) {
  var row = document.createElement('div');
  var size = big ? '18px' : '14px';
  var col  = color || T.mint;
  row.style.cssText = [
    'display:flex;justify-content:space-between;',
    'font-family:' + T.fb + ';font-size:' + size + ';color:' + col + ';padding:2px 0;',
  ].join('');
  var valEl = document.createElement('span');
  if (id) valEl.id = id;
  valEl.textContent = value;
  var labelEl = document.createElement('span');
  labelEl.textContent = label;
  row.appendChild(labelEl);
  row.appendChild(valEl);
  return row;
}

// ═══════════════════════════════════════════════════
//  STEP 2 — CENTER: Payment input
// ═══════════════════════════════════════════════════

function buildCenter(params) {
  var col = document.createElement('div');
  col.style.cssText = [
    'width:220px;flex-shrink:0;',
    'display:flex;flex-direction:column;gap:8px;',
  ].join('');

  if (params.paymentMode !== 'cash') {
    // Card — waiting panel
    var waitCard = document.createElement('div');
    waitCard.style.cssText = [
      'flex:1;display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;gap:16px;',
      'background:' + T.bgDark + ';',
      'border:2px solid ' + T.bgLight + ';',
      'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
    ].join('');
    var waitIcon = document.createElement('div');
    waitIcon.style.cssText = 'font-size:48px;';
    waitIcon.textContent = '◈';
    var waitText = document.createElement('div');
    waitText.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';letter-spacing:0.08em;text-align:center;line-height:1.6;';
    waitText.textContent = 'TAP OR INSERT\nCARD TO CONTINUE';
    waitCard.appendChild(waitIcon);
    waitCard.appendChild(waitText);
    col.appendChild(waitCard);

    // Confirm for card
    col.appendChild(buildConfirmBtn(params, true));
    return col;
  }

  // Cash — preset grid
  var presets = [5, 10, 15, 20, 50, 100];
  var grid = document.createElement('div');
  grid.style.cssText = [
    'flex:1;display:grid;',
    'grid-template-columns:1fr 1fr;',
    'grid-template-rows:repeat(3,1fr);',
    'gap:8px;',
  ].join('');

  presets.forEach(function(val) {
    var btn = buildButton('$' + val, {
      fill: T.mint, color: T.bgDark, fontSize: '26px',
      onTap: function() { addTendered(val, params); },
    });
    btn.style.flex = '1';
    grid.appendChild(btn);
  });
  col.appendChild(grid);

  // Exact button
  var exact = buildButton('EXACT $' + params.cashPrice.toFixed(2), {
    fill: T.gold, color: T.bgDark, fontSize: '20px',
    height: BTN_H,
    onTap: function() {
      tendered  = params.cashPrice;
      numpadStr = '';
      updateCashDisplay(params);
      handleConfirm(params);
    },
  });
  exact.style.flexShrink = '0';
  col.appendChild(exact);

  return col;
}

// ═══════════════════════════════════════════════════
//  STEP 3 — RIGHT: Result (starts as waiting state)
// ═══════════════════════════════════════════════════

function buildRight(params) {
  var col = document.createElement('div');
  col.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:8px;';

  if (params.paymentMode !== 'cash') {
    // Card — reader status panel
    var panel = document.createElement('div');
    panel.style.cssText = [
      'flex:1;background:' + T.bgDark + ';',
      'border:2px solid ' + T.bgLight + ';',
      'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
      'display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;gap:20px;',
      'padding:24px;',
    ].join('');

    var icon = document.createElement('div');
    icon.style.cssText = [
      'width:80px;height:80px;',
      'border:3px solid ' + T.gold + ';',
      'display:flex;align-items:center;justify-content:center;',
      'font-size:36px;color:' + T.gold + ';',
      'clip-path:polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px);',
    ].join('');
    icon.textContent = '◈';
    panel.appendChild(icon);

    var heading = document.createElement('div');
    heading.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mint + ';letter-spacing:0.1em;text-align:center;';
    heading.textContent = 'CARD READER ACTIVE';
    panel.appendChild(heading);

    var dotsEl = document.createElement('div');
    dotsEl.style.cssText = 'font-family:' + T.fb + ';font-size:24px;color:' + T.gold + ';letter-spacing:0.3em;height:30px;';
    dotsEl.textContent = '●○○';
    panel.appendChild(dotsEl);
    var dotFrame = 0;
    var dotPatterns = ['●○○', '○●○', '○○●', '○●○'];
    var dotTimer = setInterval(function() {
      dotFrame = (dotFrame + 1) % dotPatterns.length;
      dotsEl.textContent = dotPatterns[dotFrame];
    }, 400);
    panel._dotTimer = dotTimer;

    var statusEl = document.createElement('div');
    statusEl.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';text-align:center;line-height:1.6;letter-spacing:0.05em;';
    statusEl.textContent = 'Present card on terminal\nTap, insert, or swipe';
    panel.appendChild(statusEl);

    var amtEl = document.createElement('div');
    amtEl.style.cssText = [
      'margin-top:12px;padding:12px 24px;',
      'border:2px solid ' + T.gold + ';',
      'clip-path:polygon(6px 0%,calc(100% - 6px) 0%,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0% calc(100% - 6px),0% 6px);',
      'font-family:' + T.fb + ';font-size:28px;color:' + T.gold + ';',
      'text-align:center;letter-spacing:0.08em;',
    ].join('');
    amtEl.textContent = '$' + params.cardTotal.toFixed(2);
    panel.appendChild(amtEl);

    col.appendChild(panel);
    return col;
  }

  // Cash — numpad
  var changeStrip = document.createElement('div');
  changeStrip.id = 'pay-display-change';
  changeStrip.style.cssText = [
    'padding:6px 12px;flex-shrink:0;display:none;',
    'font-family:' + T.fb + ';font-size:20px;color:' + T.cyan + ';',
    'background:' + T.bgDark + ';border:2px solid ' + T.bgLight + ';',
  ].join('');
  changeStrip.textContent = 'Change Due: $0.00';
  col.appendChild(changeStrip);

  var numpad = buildNumpad({
    masked:        false,
    maxDigits:     7,
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
  col.appendChild(numpad);
  return col;
}

// ═══════════════════════════════════════════════════
//  STEP 3 ACTIVATION — Replace right col with result
// ═══════════════════════════════════════════════════

function activateResult(params, change) {
  if (!rightCol) return;

  // Stop any dot timers in old content
  var oldPanel = rightCol.querySelector('div');
  if (oldPanel && oldPanel._dotTimer) clearInterval(oldPanel._dotTimer);

  // Clear and rebuild right column as the result panel
  rightCol.innerHTML = '';

  var isCash    = params.paymentMode === 'cash';
  var hasChange = isCash && change > 0;
  var amount    = isCash ? params.cashPrice : params.cardTotal;

  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;background:' + T.bgDark + ';',
    'border:2px solid ' + T.mint + ';',
    'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
    'display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:16px;',
    'padding:24px;',
    'animation:fadeIn 0.3s ease;',
  ].join('');

  // Status icon
  var icon = document.createElement('div');
  icon.style.cssText = 'font-size:56px;';
  icon.textContent = hasChange ? '$' : '✓';
  panel.appendChild(icon);

  // Main heading
  var heading = document.createElement('div');
  heading.style.cssText = 'font-family:' + T.fb + ';font-size:28px;font-weight:bold;color:' + T.mint + ';letter-spacing:0.1em;text-align:center;';
  if (hasChange) {
    heading.textContent = 'CHANGE DUE';
  } else if (isCash) {
    heading.textContent = 'EXACT CHANGE';
  } else {
    heading.textContent = 'APPROVED';
  }
  panel.appendChild(heading);

  // Amount
  if (hasChange) {
    var changeEl = document.createElement('div');
    changeEl.style.cssText = 'font-family:' + T.fb + ';font-size:72px;font-weight:bold;color:' + T.cyan + ';line-height:1;letter-spacing:0.02em;';
    changeEl.textContent = '$' + change.toFixed(2);
    panel.appendChild(changeEl);
  }

  // Charged line
  var chargedLine = document.createElement('div');
  chargedLine.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mint + ';letter-spacing:0.06em;';
  chargedLine.textContent = (isCash ? 'Cash price: ' : 'Charged: ') + '$' + amount.toFixed(2);
  panel.appendChild(chargedLine);

  // Receipt printing indicator
  var printLine = document.createElement('div');
  printLine.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';letter-spacing:0.1em;margin-top:12px;';
  printLine.textContent = 'RECEIPT PRINTING...';
  panel.appendChild(printLine);

  // Progress bar — auto-return countdown
  var AUTO_MS = 4000;

  var progressTrack = document.createElement('div');
  progressTrack.style.cssText = [
    'width:80%;height:4px;margin-top:8px;',
    'background:' + T.bgLight + ';',
    'box-shadow:inset 1px 1px 0 #151515;',
  ].join('');
  var progressFill = document.createElement('div');
  progressFill.style.cssText = [
    'height:100%;width:0%;',
    'background:' + T.mint + ';',
    'transition:width ' + AUTO_MS + 'ms linear;',
  ].join('');
  progressTrack.appendChild(progressFill);
  panel.appendChild(progressTrack);

  // Tap hint
  var hint = document.createElement('div');
  hint.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';letter-spacing:0.08em;margin-top:4px;';
  hint.textContent = 'tap to continue';
  panel.appendChild(hint);

  rightCol.appendChild(panel);

  // Tap panel to dismiss early
  panel.addEventListener('pointerup', function() {
    doReturn(params.returnScene);
  });

  // Kick progress bar
  requestAnimationFrame(function() {
    progressFill.style.width = '100%';
  });

  // Auto-return
  returnTimer = setTimeout(function() {
    doReturn(params.returnScene);
  }, AUTO_MS);
}

function doReturn(returnScene) {
  if (returnTimer) { clearTimeout(returnTimer); returnTimer = null; }
  replace(returnScene || 'order-entry', {});
}

// ═══════════════════════════════════════════════════
//  CONFIRM BUTTON
// ═══════════════════════════════════════════════════

function buildConfirmBtn(params, isCard) {
  var btn = buildButton('CHARGE  $' + params.cardTotal.toFixed(2), {
    fill: T.gold, color: T.bgDark, fontSize: '22px',
    height: BTN_H,
    onTap: function() { handleConfirm(params); },
  });
  btn.style.flexShrink = '0';
  return btn;
}

// ═══════════════════════════════════════════════════
//  CASH HELPERS
// ═══════════════════════════════════════════════════

function addTendered(val, params) {
  tendered  += val;
  numpadStr  = '';
  updateCashDisplay(params);
}

function clearTendered(params) {
  tendered  = 0;
  numpadStr = '';
  updateCashDisplay(params);
}

function updateCashDisplay(params) {
  var changeEl    = document.getElementById('pay-display-change');
  var tenderedEl  = document.getElementById('pay-tendered');
  var changeRowEl = document.getElementById('pay-change');

  if (tenderedEl)  tenderedEl.textContent = '$' + tendered.toFixed(2);

  var change = tendered - params.cashPrice;
  var ready  = tendered >= params.cashPrice;

  if (changeEl) {
    changeEl.style.display = ready ? 'block' : 'none';
    changeEl.textContent = 'Change Due: $' + (ready ? change.toFixed(2) : '0.00');
  }

  if (changeRowEl) {
    changeRowEl.textContent = '$' + (ready ? change.toFixed(2) : '0.00');
    changeRowEl.parentElement.style.display = ready ? 'flex' : 'none';
  }
}

// ═══════════════════════════════════════════════════
//  API + CONFIRM
// ═══════════════════════════════════════════════════
var API = '/api/v1';
var confirmProcessing = false;

async function handleConfirm(params) {
  if (confirmProcessing) return;
  confirmProcessing = true;

  var isCash = params.paymentMode === 'cash';
  var change = isCash ? Math.max(0, tendered - params.cashPrice) : 0;
  var amount = isCash ? params.cashPrice : params.cardTotal;

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
        return;
      }
    }
    if (!isCash) {
      var res = await fetch(API + '/payments/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id:    params.orderId,
          amount:      amount,
          terminal_id: 'terminal_01',
        }),
      });
      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        console.error('[KINDpos] Card payment failed:', err);
        confirmProcessing = false;
        return;
      }
    }

    // ── Receipt printing ──────────────────────────
    function queueReceipt(copyType) {
      fetch(API + '/print/receipt/' + params.orderId + '?copy_type=' + copyType, { method: 'POST' })
        .catch(function(err) { console.warn('[KINDpos] Receipt print failed (' + copyType + '):', err); });
    }

    queueReceipt('customer');
    if (!isCash) queueReceipt('merchant');

  } catch (err) {
    console.error('[KINDpos] Confirm error:', err);
    confirmProcessing = false;
    return;
  }

  confirmProcessing = false;

  // ── Activate step 3: show result in right column ──
  activateResult(params, change);
}
