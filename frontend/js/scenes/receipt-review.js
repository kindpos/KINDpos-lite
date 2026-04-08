// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Receipt Review Scene
//  Sales recap style — two report cards + item list
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, applySunkenStyle, buildStyledButton, shadowColor, bevelEdges } from '../tokens.js';
import { buildButton } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var PAD = T.scenePad;
var GAP = T.colGap;

SceneManager.register({
  name: 'receipt-review',

  mount: function(container, params) {
    params = params || {};
    setSceneName(params.checkId || 'ORDER');
    setHeaderBack({
      back: true,
      onBack: function() { SceneManager.closeTransactional('receipt-review'); },
      x: true,
    });

    container.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;gap:' + GAP + 'px;',
      'padding:' + PAD + 'px;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');

    container.appendChild(buildReceiptPanel(params));
    container.appendChild(buildMethodPanel(params));
  },

  unmount: function() {},
});


// ═══════════════════════════════════════════════════
//  LEFT — Itemised receipt (sales recap style)
// ═══════════════════════════════════════════════════

function buildReceiptPanel(params) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:340px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'background:' + T.bgDark + ';',
  ].join('');
  applySunkenStyle(panel);

  // Header
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
  panel.appendChild(header);

  // Column headers
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
  panel.appendChild(colHead);

  // Scrollable items
  var items = document.createElement('div');
  items.style.cssText = 'flex:1;overflow-y:auto;padding:4px 14px;';

  (params.items || []).forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = [
      'display:grid;grid-template-columns:1fr 60px 90px;gap:0 12px;',
      'padding:4px 0;',
      'font-family:' + T.fb + ';font-size:' + T.fsItem + ';color:' + T.mint + ';',
      'border-bottom:1px solid ' + T.bg3 + ';',
    ].join('');
    var n = document.createElement('div');
    n.textContent = item.name;
    n.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    var q = document.createElement('div');
    q.style.cssText = 'text-align:right;color:' + T.gold + ';';
    q.textContent = (item.qty || 1) + '\u00D7';
    var p = document.createElement('div');
    p.style.cssText = 'text-align:right;color:' + T.gold + ';';
    p.textContent = '$' + ((item.unitPrice || 0) * (item.qty || 1)).toFixed(2);
    row.appendChild(n);
    row.appendChild(q);
    row.appendChild(p);
    items.appendChild(row);
  });
  panel.appendChild(items);

  // Totals
  var footer = document.createElement('div');
  footer.style.cssText = 'flex-shrink:0;padding:8px 14px;border-top:2px solid ' + T.bg3 + ';';

  footer.appendChild(recapRow('Subtotal', '$' + (params.subtotal || 0).toFixed(2), T.mint, T.fsSmall));
  footer.appendChild(recapRow('Tax', '$' + (params.tax || 0).toFixed(2), T.mint, T.fsSmall));

  var hr = document.createElement('hr');
  hr.style.cssText = 'border:none;border-top:1px dashed ' + T.bgLight + ';margin:6px 0;';
  footer.appendChild(hr);

  footer.appendChild(recapRow('Card Total', '$' + (params.cardTotal || 0).toFixed(2), T.gold, T.fsSmall, true));
  footer.appendChild(recapRow('Cash Price', '$' + (params.cashPrice || 0).toFixed(2), T.mint, T.fsSmall, true));

  var savings = ((params.cardTotal || 0) - (params.cashPrice || 0));
  if (savings > 0.001) {
    var saveLine = document.createElement('div');
    saveLine.style.cssText = [
      'text-align:center;padding:4px 0 0;',
      'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.cyan + ';letter-spacing:0.06em;',
    ].join('');
    saveLine.textContent = 'Cash saves $' + savings.toFixed(2);
    footer.appendChild(saveLine);
  }

  panel.appendChild(footer);
  return panel;
}

function recapRow(label, value, color, size, bold) {
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;justify-content:space-between;padding:2px 0;',
    'font-family:' + T.fb + ';font-size:' + (size || T.fsSmall) + ';color:' + (color || T.mint) + ';',
    bold ? 'font-weight:bold;' : '',
  ].join('');
  var l = document.createElement('span');
  l.textContent = label;
  var v = document.createElement('span');
  v.style.color = T.gold;
  v.textContent = value;
  row.appendChild(l);
  row.appendChild(v);
  return row;
}


// ═══════════════════════════════════════════════════
//  RIGHT — Payment method cards (report card style)
// ═══════════════════════════════════════════════════

function buildMethodPanel(params) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;display:flex;flex-direction:column;gap:' + GAP + 'px;',
  ].join('');

  // Prompt
  var prompt = document.createElement('div');
  prompt.style.cssText = [
    'flex-shrink:0;padding:10px 16px;',
    'background:' + T.bgDark + ';',
  ].join('');
  applySunkenStyle(prompt);
  var pLabel = document.createElement('div');
  pLabel.style.cssText = 'font-family:' + T.fh + ';font-size:40px;color:' + T.gold + ';letter-spacing:0.1em;';
  pLabel.textContent = 'PAYMENT METHOD';
  var pText = document.createElement('div');
  pText.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + T.mint + ';margin-top:2px;';
  pText.textContent = 'Select card or cash to continue';
  prompt.appendChild(pLabel);
  prompt.appendChild(pText);
  panel.appendChild(prompt);

  // Two cards side by side
  var cardRow = document.createElement('div');
  cardRow.style.cssText = 'flex:1;display:flex;gap:' + GAP + 'px;';

  cardRow.appendChild(buildMethodCard({
    label: '◈  CARD',
    amount: '$' + (params.cardTotal || 0).toFixed(2),
    subtitle: null,
    fill: T.darkBtn,
    textColor: T.mint,
    onTap: function() {
      SceneManager.openTransactional('payment', makePaymentParams(params, 'card'));
    },
  }));

  var savings = ((params.cardTotal || 0) - (params.cashPrice || 0));
  cardRow.appendChild(buildMethodCard({
    label: '$  CASH',
    amount: '$' + (params.cashPrice || 0).toFixed(2),
    subtitle: savings > 0.001 ? 'save $' + savings.toFixed(2) : null,
    fill: T.darkBtn,
    textColor: T.mint,
    onTap: function() {
      SceneManager.openTransactional('payment', makePaymentParams(params, 'cash'));
    },
  }));

  panel.appendChild(cardRow);

  // Back button
  var back = buildButton('\u2190 BACK', {
    fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall,
    height: 48,
    onTap: function() { SceneManager.closeTransactional('receipt-review'); },
  });
  back.style.flexShrink = '0';
  panel.appendChild(back);

  return panel;
}

function buildMethodCard(opts) {
  var btn = buildStyledButton(opts.fill);
  var wrap = btn.wrap;
  var inner = btn.inner;

  wrap.style.flex = '1';
  wrap.style.minHeight = '0';

  inner.style.flexDirection = 'column';
  inner.style.gap = '8px';
  inner.style.padding = '20px';

  // Label
  var label = document.createElement('div');
  label.style.cssText = [
    'font-family:' + T.fh + ';font-size:40px;',
    'color:' + opts.textColor + ';letter-spacing:0.12em;',
  ].join('');
  label.textContent = opts.label;
  inner.appendChild(label);

  // Amount
  var amount = document.createElement('div');
  amount.style.cssText = [
    'font-family:' + T.fb + ';font-size:48px;font-weight:bold;',
    'color:' + opts.textColor + ';line-height:1;',
  ].join('');
  amount.textContent = opts.amount;
  inner.appendChild(amount);

  // Subtitle
  if (opts.subtitle) {
    var sub = document.createElement('div');
    sub.style.cssText = [
      'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';',
      'color:' + opts.textColor + ';letter-spacing:0.06em;opacity:0.7;',
    ].join('');
    sub.textContent = opts.subtitle;
    inner.appendChild(sub);
  }

  wrap.addEventListener('pointerup', function() {
    setTimeout(opts.onTap, 60);
  });

  return wrap;
}

function makePaymentParams(params, mode) {
  return {
    orderId:     params.orderId,
    checkId:     params.checkId,
    items:       params.items,
    subtotal:    params.subtotal,
    tax:         params.tax,
    cardTotal:   params.cardTotal,
    cashPrice:   params.cashPrice,
    paymentMode: mode,
    returnScene: params.returnScene,
  };
}
