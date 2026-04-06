// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Payment Scene
//  Two-column: Receipt Panel + Payment Action
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, applySunkenStyle, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { registerScene, replace, overlay, dismissOverlay } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';

var PAD     = T.scenePad;
var GAP     = T.colGap;
var LEFT_W  = 280;

// ── Scene state ───────────────────────────────────
var tendered   = 0;
var numpadStr  = '';
var sceneEl    = null;
var sceneData  = {};
var rightCol   = null;
var returnTimer = null;
var dotTimer    = null;
var confirmProcessing = false;

registerScene('payment', {
  onEnter: function(el, params) {
    setSceneName(params.checkId || 'ORDER');
    setHeaderBack({ back: true, x: true });

    sceneEl          = el;
    sceneData        = params;
    tendered         = 0;
    numpadStr        = '';
    confirmProcessing = false;
    rightCol         = null;
    returnTimer      = null;
    dotTimer         = null;

    el.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;gap:' + GAP + 'px;',
      'padding:' + PAD + 'px;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');

    el.appendChild(buildReceiptPanel(params));
    rightCol = params.paymentMode === 'cash'
      ? buildCashPanel(params)
      : buildCardPanel(params);
    el.appendChild(rightCol);
  },
  onExit: function() {
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
    'padding:8px 14px;flex-shrink:0;',
    'background:' + T.bg4 + ';',
    'border-bottom:2px solid ' + T.bgEdge + ';',
    'display:flex;justify-content:space-between;align-items:center;',
  ].join('');
  var hTitle = document.createElement('div');
  hTitle.style.cssText = 'font-family:' + T.fh + ';font-size:40px;color:' + T.gold + ';letter-spacing:0.08em;';
  hTitle.textContent = 'ORDER';
  var hId = document.createElement('div');
  hId.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';';
  hId.textContent = params.checkId || '';
  header.appendChild(hTitle);
  header.appendChild(hId);
  col.appendChild(header);

  // ── Column headers ──
  var colHead = document.createElement('div');
  colHead.style.cssText = [
    'display:grid;grid-template-columns:1fr 50px 80px;',
    'padding:6px 14px;',
    'font-family:' + T.fh + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';letter-spacing:0.08em;',
    'border-bottom:1px solid ' + T.bg3 + ';',
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
      'display:grid;grid-template-columns:1fr 50px 80px;',
      'padding:4px 0;',
      'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';',
      'border-bottom:1px solid ' + T.bg3 + ';',
    ].join('');
    var name = document.createElement('div');
    name.textContent = item.name;
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    name.style.whiteSpace = 'nowrap';
    var qty = document.createElement('div');
    qty.style.cssText = 'text-align:right;color:' + T.mutedText + ';';
    qty.textContent = item.qty + '\u00D7';
    var price = document.createElement('div');
    price.style.textAlign = 'right';
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

  footer.appendChild(totalsRow('Subtotal', '$' + params.subtotal.toFixed(2), false, T.mutedText));
  footer.appendChild(totalsRow('Tax', '$' + params.tax.toFixed(2), false, T.mutedText));

  var hr = document.createElement('hr');
  hr.style.cssText = 'border:none;border-top:1px dashed ' + T.bgLight + ';margin:6px 0;';
  footer.appendChild(hr);

  if (isCash) {
    footer.appendChild(totalsRow('Cash Price', '$' + params.cashPrice.toFixed(2), true, T.gold));
    var tendRow = totalsRow('Tendered', '$0.00', true, T.mint);
    tendRow.querySelector('[data-val]').id = 'pay-tendered';
    footer.appendChild(tendRow);
    var changeRow = totalsRow('Change', '$0.00', true, T.cyan);
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
    'font-family:' + T.fb + ';',
    'font-size:' + (bold ? T.fsSmall : '18px') + ';',
    'color:' + (color || T.mint) + ';',
    bold ? 'font-weight:bold;' : '',
  ].join('');
  var l = document.createElement('span');
  l.textContent = label;
  var v = document.createElement('span');
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

  // ── Top: Presets + Numpad side by side ──
  var topRow = document.createElement('div');
  topRow.style.cssText = 'flex:1;display:flex;gap:' + GAP + 'px;overflow:hidden;';

  // Preset column
  var presetCol = document.createElement('div');
  presetCol.style.cssText = 'width:180px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;';

  // Preset grid (2×3)
  var grid = document.createElement('div');
  grid.style.cssText = 'flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:8px;';

  [5, 10, 15, 20, 50, 100].forEach(function(val) {
    var btn = buildButton('$' + val, {
      fill: T.mint, color: T.bgDark, fontSize: T.fsSmall,
      onTap: function() { addTendered(val, params); },
    });
    grid.appendChild(btn);
  });
  presetCol.appendChild(grid);

  // Exact button
  var exact = buildButton('EXACT\n$' + params.cashPrice.toFixed(2), {
    fill: T.gold, color: T.bgDark, fontSize: T.fsBtn,
    height: 56,
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

  // Numpad column
  var numpadWrap = document.createElement('div');
  numpadWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;';

  var numpad = buildNumpad({
    masked:        false,
    maxDigits:     7,
    width:         null,
    displayH:      56,
    cardPad:       12,
    keyH:          56,
    keyGap:        8,
    gap:           8,
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
  numpad.style.flex = '1';
  numpadWrap.appendChild(numpad);
  topRow.appendChild(numpadWrap);

  col.appendChild(topRow);

  // ── Bottom: Change display + Confirm ──
  var changeStrip = document.createElement('div');
  changeStrip.id = 'pay-display-change';
  changeStrip.style.cssText = [
    'flex-shrink:0;display:none;padding:8px 16px;',
    'background:' + T.bgDark + ';',
    'font-family:' + T.fb + ';font-size:40px;color:' + T.cyan + ';',
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
    fill: T.gold, color: T.bgDark, fontSize: T.fsSmall,
    height: 56,
    onTap: function() { handleConfirm(params); },
  });
  chargeBtn.style.flexShrink = '0';
  col.appendChild(chargeBtn);

  return col;
}


// ═══════════════════════════════════════════════════
//  RESULT STATE — Replaces right column
// ═══════════════════════════════════════════════════

function activateResult(params, change) {
  if (!rightCol || !sceneEl) return;

  // Stop dot timer
  if (dotTimer) { clearInterval(dotTimer); dotTimer = null; }

  // Replace right column
  var newRight = document.createElement('div');
  newRight.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:' + GAP + 'px;';

  var isCash    = params.paymentMode === 'cash';
  var hasChange = isCash && change > 0;
  var amount    = isCash ? params.cashPrice : params.cardTotal;

  // ── Result panel ──
  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;background:' + T.bgDark + ';',
    'display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:16px;',
    'padding:24px;',
  ].join('');
  applySunkenStyle(panel);
  // Highlight border
  panel.style.borderColor = T.mint;

  // Status icon
  var icon = document.createElement('div');
  icon.style.cssText = [
    'width:80px;height:80px;',
    'background:' + (hasChange ? T.cyan : T.mint) + ';',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:40px;color:' + T.bgDark + ';font-weight:bold;',
    'clip-path:' + chamfer(8) + ';',
  ].join('');
  icon.textContent = hasChange ? '$' : '✓';
  panel.appendChild(icon);

  // Heading
  var heading = document.createElement('div');
  heading.style.cssText = [
    'font-family:' + T.fh + ';font-size:40px;',
    'color:' + T.mint + ';letter-spacing:0.1em;text-align:center;',
  ].join('');
  if (hasChange) {
    heading.textContent = 'CHANGE DUE';
  } else if (isCash) {
    heading.textContent = 'EXACT CHANGE';
  } else {
    heading.textContent = 'APPROVED';
  }
  panel.appendChild(heading);

  // Change amount (large)
  if (hasChange) {
    var changeAmt = document.createElement('div');
    changeAmt.style.cssText = [
      'font-family:' + T.fb + ';font-size:72px;font-weight:bold;',
      'color:' + T.cyan + ';line-height:1;letter-spacing:0.02em;',
    ].join('');
    changeAmt.textContent = '$' + change.toFixed(2);
    panel.appendChild(changeAmt);
  }

  // Charged line
  var charged = document.createElement('div');
  charged.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mutedText + ';letter-spacing:0.06em;';
  charged.textContent = (isCash ? 'Cash price: ' : 'Charged: ') + '$' + amount.toFixed(2);
  panel.appendChild(charged);

  // Receipt printing
  var printLine = document.createElement('div');
  printLine.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mutedText + ';letter-spacing:0.1em;margin-top:12px;';
  printLine.textContent = 'RECEIPT PRINTING...';
  panel.appendChild(printLine);

  // Progress bar
  var AUTO_MS = 4000;
  var track = document.createElement('div');
  track.style.cssText = [
    'width:60%;height:4px;margin-top:8px;',
    'background:' + T.bg3 + ';',
    'clip-path:' + chamfer(2) + ';',
  ].join('');
  var fill = document.createElement('div');
  fill.style.cssText = [
    'height:100%;width:0%;',
    'background:' + T.mint + ';',
    'transition:width ' + AUTO_MS + 'ms linear;',
  ].join('');
  track.appendChild(fill);
  panel.appendChild(track);

  // Tap hint
  var hint = document.createElement('div');
  hint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.dimText + ';letter-spacing:0.08em;margin-top:4px;';
  hint.textContent = 'tap to continue';
  panel.appendChild(hint);

  newRight.appendChild(panel);

  // Tap to dismiss
  panel.addEventListener('pointerup', function() {
    doReturn(params.returnScene);
  });

  // Replace in DOM
  sceneEl.replaceChild(newRight, rightCol);
  rightCol = newRight;

  // Kick progress bar
  requestAnimationFrame(function() { fill.style.width = '100%'; });

  // Auto-return
  returnTimer = setTimeout(function() {
    doReturn(params.returnScene);
  }, AUTO_MS);
}

function doReturn(returnScene) {
  if (returnTimer) { clearTimeout(returnTimer); returnTimer = null; }
  if (dotTimer)    { clearInterval(dotTimer); dotTimer = null; }
  replace(returnScene || 'order-entry', {});
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
//  PROCESSING OVERLAY (Win98-style, like batch settlement)
// ═══════════════════════════════════════════════════

function showProcessingOverlay(amount, onDone) {
  var TOTAL_SEGS = 22;
  var segments = [];
  var statusEl = null;
  var segIdx = 0;
  var animTimer = null;

  var statusMessages = [
    'Connecting to terminal...',
    'Waiting for card...',
    'Reading card data...',
    'Contacting processor...',
    'Awaiting authorization...',
  ];
  var msgIdx = 0;

  overlay('card-processing', {
    onBuild: function(el) {
      el.style.flexDirection = 'column';

      var frame = document.createElement('div');
      frame.style.cssText = 'background:' + T.gold + ';padding:7px;clip-path:' + chamfer(12) + ';filter:drop-shadow(4px 6px 0px rgba(0,0,0,0.7));';

      var dialog = document.createElement('div');
      dialog.style.cssText = 'background:' + T.bg + ';width:420px;border-top:2px solid ' + T.bgLight + ';border-left:2px solid ' + T.bgLight + ';border-bottom:2px solid ' + T.bgEdge + ';border-right:2px solid ' + T.bgEdge + ';font-family:' + T.fb + ';';

      // Title bar
      var titleBar = document.createElement('div');
      titleBar.style.cssText = 'background:linear-gradient(to right,' + T.bgDark + ',' + T.bg3 + ');padding:5px 8px;display:flex;align-items:center;gap:8px;';
      var icon = document.createElement('div');
      icon.style.cssText = 'width:24px;height:24px;background:' + T.gold + ';display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:bold;color:' + T.bgDark + ';clip-path:' + chamfer(3) + ';';
      icon.textContent = '◈';
      var titleText = document.createElement('span');
      titleText.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';font-weight:bold;letter-spacing:0.05em;';
      titleText.textContent = 'Card Payment — $' + amount.toFixed(2);
      titleBar.appendChild(icon);
      titleBar.appendChild(titleText);
      dialog.appendChild(titleBar);

      // Body
      var body = document.createElement('div');
      body.style.cssText = 'padding:16px 20px 14px;display:flex;flex-direction:column;gap:10px;';

      // Status text
      statusEl = document.createElement('div');
      statusEl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';min-height:24px;';
      statusEl.textContent = statusMessages[0];
      body.appendChild(statusEl);

      // Chunky progress bar
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
      el.appendChild(frame);

      // Animate progress segments
      animTimer = setInterval(function() {
        if (segIdx < TOTAL_SEGS) {
          segments[segIdx].style.opacity = '1';
          segIdx++;
        }
        // Cycle status messages
        if (segIdx % 4 === 0 && msgIdx < statusMessages.length - 1) {
          msgIdx++;
          statusEl.textContent = statusMessages[msgIdx];
        }
        // Loop back at end
        if (segIdx >= TOTAL_SEGS) {
          segIdx = 0;
          segments.forEach(function(s) { s.style.opacity = '0'; });
        }
      }, 200);
    },
  });

  return {
    updateStatus: function(msg) { if (statusEl) statusEl.textContent = msg; },
    dismiss: function() {
      if (animTimer) clearInterval(animTimer);
      dismissOverlay();
    },
  };
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

      var res = await fetch(API + '/payments/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id:    params.orderId,
          amount:      amount,
          terminal_id: 'terminal_01',
        }),
      });

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
