// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Payment Scene
//  Cash: preset grid + numpad | Card: await tap
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

registerScene('payment', {
  onEnter: function(el, params) {
    setSceneName(params.checkId || 'QS-001');
    setHeaderBack(false);   // no back mid-payment

    sceneEl   = el;
    sceneData = params;
    tendered  = 0;
    numpadStr = '';

    el.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;gap:' + GAP + 'px;',
      'padding:' + PAD + 'px;',
      'box-sizing:border-box;',
    ].join('');

    el.appendChild(buildLeft(params));
    el.appendChild(buildCenter(params));
    el.appendChild(buildRight(params));
  },
});

// ── LEFT — totals summary ─────────────────────────
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
  summaryLabel.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.mintDim + ';letter-spacing:0.1em;margin-bottom:8px;';
  summaryLabel.textContent = 'ITEM SUMMARY';
  summaryCard.appendChild(summaryLabel);

  (params.items || []).forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = [
      'display:flex;justify-content:space-between;',
      'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';',
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

// ── CENTER — presets (cash) or spacer (card) ──────
function buildCenter(params) {
  var col = document.createElement('div');
  col.style.cssText = [
    'width:220px;flex-shrink:0;',
    'display:flex;flex-direction:column;gap:8px;',
  ].join('');

  if (params.paymentMode !== 'cash') {
    // Card — just a waiting panel
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
    waitText.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mintDim + ';letter-spacing:0.08em;text-align:center;line-height:1.6;';
    waitText.textContent = 'TAP OR INSERT\nCARD TO CONTINUE';
    waitCard.appendChild(waitIcon);
    waitCard.appendChild(waitText);
    col.appendChild(waitCard);

    // Confirm for card (fires payment)
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
  var exact = buildButton('Exact', {
    fill: T.gold, color: T.bgDark, fontSize: '22px',
    height: BTN_H,
    onTap: function() {
      tendered   = params.cashPrice;
      numpadStr  = '';
      updateCashDisplay(params);
    },
  });
  exact.style.flexShrink = '0';
  col.appendChild(exact);

  return col;
}

// ── RIGHT — display + numpad ───────────────────────
function buildRight(params) {
  var col = document.createElement('div');
  col.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:8px;';

  if (params.paymentMode !== 'cash') {
    // Card — empty right panel (card reader handles UI)
    var spacer = document.createElement('div');
    spacer.style.cssText = [
      'flex:1;background:' + T.bgDark + ';',
      'border:2px solid ' + T.bgLight + ';',
      'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
      'display:flex;align-items:center;justify-content:center;',
      'font-family:' + T.fb + ';font-size:14px;color:#2a3a2a;letter-spacing:0.1em;',
    ].join('');
    spacer.textContent = '— CARD READER ACTIVE —';
    col.appendChild(spacer);
    return col;
  }

  // Cash — numpad component with dollar display + live change-due strip
  var changeStrip = document.createElement('div');
  changeStrip.id = 'pay-display-change';
  changeStrip.style.cssText = [
    'padding:6px 12px;flex-shrink:0;display:none;',
    'font-family:' + T.fb + ';font-size:16px;color:' + T.cyan + ';',
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

function buildNumKey(digit, params) {
  var btn = document.createElement('div');
  btn.style.cssText = numKeyStyle('#333', T.mint);
  btn.textContent = digit;
  btn.addEventListener('pointerdown', function() { applyPress(btn, true); });
  btn.addEventListener('pointerup',   function() {
    applyPress(btn, false);
    numPress(digit, params);
  });
  return btn;
}

function buildActionKey(label, bg, color, onTap) {
  var btn = document.createElement('div');
  btn.style.cssText = numKeyStyle(bg, color);
  btn.textContent = label;
  btn.addEventListener('pointerdown', function() { applyPress(btn, true); });
  btn.addEventListener('pointerup',   function() { applyPress(btn, false); onTap(); });
  return btn;
}

function buildConfirmKey(params) {
  var btn = document.createElement('div');
  btn.id = 'pay-confirm';
  btn.style.cssText = numKeyStyle('#1a3a1a', '#2a4a2a');  // starts disabled
  btn.textContent = '▶▶▶';
  btn.addEventListener('pointerdown', function() {
    if (tendered < params.cashPrice) return;
    applyPress(btn, true);
  });
  btn.addEventListener('pointerup', function() {
    if (tendered < params.cashPrice) return;
    applyPress(btn, false);
    handleConfirm(params);
  });
  return btn;
}

function buildConfirmBtn(params, isCard) {
  var btn = buildButton('CHARGE  $' + params.cardTotal.toFixed(2), {
    fill: T.gold, color: T.bgDark, fontSize: '22px',
    height: BTN_H,
    onTap: function() { handleConfirm(params); },
  });
  btn.style.flexShrink = '0';
  return btn;
}

// ── NUMPAD LOGIC ──────────────────────────────────
function numPress(digit, params) {
  if (numpadStr.length >= 7) return;
  numpadStr += digit;
  tendered = parseInt(numpadStr, 10) / 100;
  updateCashDisplay(params);
}

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

// ── API ───────────────────────────────────────────
var API = '/api/v1';

// ── CONFIRM ───────────────────────────────────────
async function handleConfirm(params) {
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
        return;  // stay on screen, let operator retry
      }
    }
    if (!isCash) {
      // Card payment — route through PaymentManager → SPIn adapter
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
        return;  // stay on screen, let operator retry
      }
    }

    // ── Receipt printing ──────────────────────────────────────────────────
    // Config flags — will be driven by settings scene once wired
    var PRINT_ITEMIZED = false;   // TODO: read from terminal config

    function queueReceipt(copyType) {
      fetch(API + '/print/receipt/' + params.orderId + '?copy_type=' + copyType, { method: 'POST' })
        .catch(function(err) { console.warn('[KINDpos] Receipt print failed (' + copyType + '):', err); });
    }

    // Customer copy — always
    queueReceipt('customer');

    // Merchant copy — card only (per spec 1A)
    if (!isCash) queueReceipt('merchant');

    // Itemized copy — configurable (default off until settings scene wired)
    if (PRINT_ITEMIZED) queueReceipt('itemized');

  } catch (err) {
    console.error('[KINDpos] Confirm error:', err);
    return;
  }

  replace('change-due', {
    change:      change,
    paymentMode: params.paymentMode,
    total:       amount,
    returnScene: params.returnScene,
  });
}

// ── HELPERS ───────────────────────────────────────
function numKeyStyle(bg, color) {
  return [
    'display:flex;align-items:center;justify-content:center;',
    'font-family:' + T.fb + ';font-size:22px;font-weight:bold;',
    'color:' + color + ';background:' + bg + ';cursor:pointer;',
    'clip-path:polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px);',
    'box-shadow:3px 4px 0 rgba(198,255,187,0.45),inset 4px 4px 0 #5a5a5a,inset -4px -4px 0 #151515;',
  ].join('');
}

function applyPress(el, down) {
  el.style.transform  = down ? 'translate(3px,4px)' : '';
  el.style.boxShadow  = down ? 'none' : '';
}