// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Receipt Review Scene
//  Itemised check + dual pricing before payment
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';
import { buildButton } from '../components.js';
import { registerScene, push } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var PAD      = 16;
var GAP      = 12;
var RECEIPT_W = 490;
var BTN_H    = 50;

registerScene('receipt-review', {
  onEnter: function(el, params) {
    setSceneName(params.checkId || 'QS-001');
    setHeaderBack(true);

    // params shape:
    // {
    //   checkId:    string,
    //   items:      [{ name, qty, unitPrice }],
    //   subtotal:   number,
    //   tax:        number,
    //   cardTotal:  number,
    //   cashPrice:  number,
    //   returnScene: 'check-grid' | 'order-entry',   // post-payment destination
    // }

    el.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;gap:' + GAP + 'px;',
      'padding:' + PAD + 'px;',
      'box-sizing:border-box;',
    ].join('');

    el.appendChild(buildReceiptPanel(params));
    el.appendChild(buildPricePanel(params));
  },
});

// ── LEFT — itemised receipt ────────────────────────
function buildReceiptPanel(params) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:' + RECEIPT_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'background:' + T.bgDark + ';',
    'border:2px solid ' + T.bgLight + ';',
    'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
  ].join('');

  // Receipt header
  var header = document.createElement('div');
  header.style.cssText = [
    'display:flex;justify-content:space-between;align-items:center;',
    'padding:8px 14px;',
    'border-bottom:2px solid ' + T.bgLight + ';',
    'background:' + T.bg4 + ';',
    'flex-shrink:0;',
  ].join('');

  var titleEl = document.createElement('span');
  titleEl.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';letter-spacing:0.1em;';
  titleEl.textContent = 'ITEM SUMMARY';

  var checkEl = document.createElement('span');
  checkEl.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.gold + ';letter-spacing:0.05em;';
  checkEl.textContent = params.checkId || 'QS-001';

  header.appendChild(titleEl);
  header.appendChild(checkEl);
  panel.appendChild(header);

  // Column labels
  var colHeaders = document.createElement('div');
  colHeaders.style.cssText = [
    'display:grid;grid-template-columns:1fr 60px 90px;',
    'padding:6px 14px;',
    'border-bottom:1px solid ' + T.bgLight + ';',
    'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';',
    'letter-spacing:0.1em;flex-shrink:0;',
  ].join('');
  colHeaders.innerHTML = '<span>ITEM</span><span style="text-align:center">QTY</span><span style="text-align:right">PRICE</span>';
  panel.appendChild(colHeaders);

  // Scrollable item list
  var itemList = document.createElement('div');
  itemList.style.cssText = [
    'flex:1;overflow-y:auto;',
    'padding:6px 14px;',
  ].join('');

  (params.items || []).forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = [
      'display:grid;grid-template-columns:1fr 60px 90px;',
      'padding:5px 0;',
      'border-bottom:1px solid ' + T.bg3 + ';',
      'font-family:' + T.fb + ';font-size:20px;color:' + T.mint + ';',
      'align-items:baseline;',
    ].join('');

    var nameEl = document.createElement('span');
    nameEl.textContent = item.name;

    var qtyEl = document.createElement('span');
    qtyEl.style.cssText = 'text-align:center;font-size:20px;color:' + T.mutedText + ';';
    qtyEl.textContent = '×' + (item.qty || 1);

    var priceEl = document.createElement('span');
    priceEl.style.cssText = 'text-align:right;';
    priceEl.textContent = '$' + ((item.unitPrice || 0) * (item.qty || 1)).toFixed(2);

    row.appendChild(nameEl);
    row.appendChild(qtyEl);
    row.appendChild(priceEl);
    itemList.appendChild(row);
  });

  panel.appendChild(itemList);

  // Totals footer
  var footer = document.createElement('div');
  footer.style.cssText = [
    'padding:10px 14px;',
    'border-top:2px solid ' + T.bgLight + ';',
    'flex-shrink:0;',
  ].join('');

  footer.appendChild(buildFooterRow('Subtotal', '$' + (params.subtotal || 0).toFixed(2), false));
  footer.appendChild(buildFooterRow('Tax',      '$' + (params.tax      || 0).toFixed(2), false));

  var divider = document.createElement('hr');
  divider.style.cssText = 'border:none;border-top:1px solid ' + T.bgLight + ';margin:6px 0;';
  footer.appendChild(divider);

  footer.appendChild(buildFooterRow('Card Total', '$' + (params.cardTotal || 0).toFixed(2), true, T.gold));
  footer.appendChild(buildFooterRow('Cash Price', '$' + (params.cashPrice || 0).toFixed(2), true, T.mint));

  panel.appendChild(footer);
  return panel;
}

function buildFooterRow(label, value, big, color) {
  var row = document.createElement('div');
  var size = big ? '22px' : '20px';
  var col  = color || T.mint;
  row.style.cssText = [
    'display:flex;justify-content:space-between;',
    'font-family:' + T.fb + ';font-size:' + size + ';',
    'color:' + col + ';',
    'padding:2px 0;',
  ].join('');
  row.innerHTML = '<span>' + label + '</span><span>' + value + '</span>';
  return row;
}

// ── RIGHT — payment method selection ──────────────
function buildPricePanel(params) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;',
    'display:flex;flex-direction:column;',
    'gap:' + GAP + 'px;',
  ].join('');

  // Prompt label
  var prompt = document.createElement('div');
  prompt.style.cssText = [
    'background:' + T.bg4 + ';',
    'border:2px solid ' + T.bgLight + ';',
    'padding:10px 14px;flex-shrink:0;',
    'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
  ].join('');
  var promptLabel = document.createElement('div');
  promptLabel.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';letter-spacing:0.12em;margin-bottom:4px;';
  promptLabel.textContent = 'PAYMENT METHOD';
  var promptText = document.createElement('div');
  promptText.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mint + ';';
  promptText.textContent = 'Select card or cash to continue';
  prompt.appendChild(promptLabel);
  prompt.appendChild(promptText);
  panel.appendChild(prompt);

  // CARD button — gold, shows card total
  var cardBtn = document.createElement('div');
  cardBtn.style.cssText = [
    'flex:1;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:6px;',
    'cursor:pointer;',
    'background:' + T.gold + ';',
    'clip-path:polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px);',
    'box-shadow:3px 4px 0 rgba(0,0,0,0.5),inset 4px 4px 0 #ffe080,inset -4px -4px 0 #9a7010;',
    'transition:transform 0.06s,box-shadow 0.06s;',
  ].join('');

  var cardLabel = document.createElement('div');
  cardLabel.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:#1a1a1a;letter-spacing:0.12em;';
  cardLabel.textContent = '◈  CARD';

  var cardAmount = document.createElement('div');
  cardAmount.style.cssText = 'font-family:' + T.fb + ';font-size:42px;font-weight:bold;color:#1a1a1a;';
  cardAmount.textContent = '$' + (params.cardTotal || 0).toFixed(2);

  cardBtn.appendChild(cardLabel);
  cardBtn.appendChild(cardAmount);

  cardBtn.addEventListener('pointerdown', function() {
    cardBtn.style.transform = 'translate(3px,4px)';
    cardBtn.style.boxShadow = 'none';
  });
  cardBtn.addEventListener('pointerup', function() {
    cardBtn.style.transform = '';
    cardBtn.style.boxShadow = '3px 4px 0 rgba(0,0,0,0.5),inset 4px 4px 0 #ffe080,inset -4px -4px 0 #9a7010';
    push('payment', {
      orderId:     params.orderId,
      checkId:     params.checkId,
      items:       params.items,
      subtotal:    params.subtotal,
      tax:         params.tax,
      cardTotal:   params.cardTotal,
      cashPrice:   params.cashPrice,
      paymentMode: 'card',
      returnScene: params.returnScene,
    });
  });

  panel.appendChild(cardBtn);

  // CASH button — mint, shows cash price
  var cashBtn = document.createElement('div');
  cashBtn.style.cssText = [
    'flex:1;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:6px;',
    'cursor:pointer;',
    'background:' + T.mint + ';',
    'clip-path:polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px);',
    'box-shadow:3px 4px 0 rgba(0,0,0,0.5),inset 4px 4px 0 #e8ffe4,inset -4px -4px 0 #7acc6e;',
    'transition:transform 0.06s,box-shadow 0.06s;',
  ].join('');

  var cashLabel = document.createElement('div');
  cashLabel.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:#1a1a1a;letter-spacing:0.12em;';
  cashLabel.textContent = '$  CASH';

  var cashAmount = document.createElement('div');
  cashAmount.style.cssText = 'font-family:' + T.fb + ';font-size:42px;font-weight:bold;color:#1a1a1a;';
  cashAmount.textContent = '$' + (params.cashPrice || 0).toFixed(2);

  var cashSavings = document.createElement('div');
  cashSavings.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:#1a1a1a;letter-spacing:0.06em;';
  var savings = ((params.cardTotal || 0) - (params.cashPrice || 0)).toFixed(2);
  cashSavings.textContent = 'save $' + savings + ' with cash';

  cashBtn.appendChild(cashLabel);
  cashBtn.appendChild(cashAmount);
  cashBtn.appendChild(cashSavings);

  cashBtn.addEventListener('pointerdown', function() {
    cashBtn.style.transform = 'translate(3px,4px)';
    cashBtn.style.boxShadow = 'none';
  });
  cashBtn.addEventListener('pointerup', function() {
    cashBtn.style.transform = '';
    cashBtn.style.boxShadow = '3px 4px 0 rgba(0,0,0,0.5),inset 4px 4px 0 #e8ffe4,inset -4px -4px 0 #7acc6e';
    push('payment', {
      orderId:     params.orderId,
      checkId:     params.checkId,
      items:       params.items,
      subtotal:    params.subtotal,
      tax:         params.tax,
      cardTotal:   params.cardTotal,
      cashPrice:   params.cashPrice,
      paymentMode: 'cash',
      returnScene: params.returnScene,
    });
  });

  panel.appendChild(cashBtn);

  // Back button
  var backBtn = buildButton('← BACK', {
    fill: T.bgLight, color: T.mint, fontSize: '28px',
    height: BTN_H,
    onTap: function() {
      // Returns to wherever PAY was tapped from
      history.go(-1);
    },
  });
  panel.appendChild(backBtn);

  return panel;
}