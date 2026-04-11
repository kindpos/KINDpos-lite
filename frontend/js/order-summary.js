// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Persistent Order Summary Panel
//  Left-column panel that persists across order + payment flow
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer } from './tokens.js';
import { buildButton } from './components.js';
import { SceneManager } from './scene-manager.js';
import { applyCardBevel } from './theme-manager.js';

var _el = null;         // #order-summary container
var _itemScroll = null;  // scrollable item list
var _summaryBox = null;  // subtotal/discount/tax box
var _pricesBox = null;   // card/cash prices box
var _paidRow = null;     // dynamic paid row
var _remainRow = null;   // dynamic remaining row
var _checkIdEl = null;   // check ID display
var _splitBtn = null;    // split button ref

function _container() {
  if (!_el) _el = document.getElementById('order-summary');
  return _el;
}

// ═══════════════════════════════════════════════════
//  BUILD — One-time panel construction
// ═══════════════════════════════════════════════════

function _build() {
  var el = _container();
  if (!el) return;
  el.innerHTML = '';

  el.style.cssText += [
    'display:none;',
    'flex-direction:column;',
    'background:' + T.bgDark + ';',
  ].join('');
  applyCardBevel(el, T.numpadChassis);
  el.style.clipPath = chamfer();

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
  _checkIdEl = document.createElement('div');
  _checkIdEl.style.cssText = [
    'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';',
    'color:' + T.mint + ';white-space:nowrap;',
  ].join('');
  header.appendChild(hTitle);
  header.appendChild(_checkIdEl);
  el.appendChild(header);

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
  el.appendChild(colHead);

  // ── Scrollable items ──
  _itemScroll = document.createElement('div');
  _itemScroll.id = 'ticket-list';
  _itemScroll.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 10px;scrollbar-width:none;-ms-overflow-style:none;display:flex;flex-direction:column;gap:4px;';
  el.appendChild(_itemScroll);

  // ── Bottom: [Summary | Split] row ──
  var summaryRow = document.createElement('div');
  summaryRow.style.cssText = [
    'flex-shrink:0;display:flex;gap:6px;',
    'padding:4px 6px;',
  ].join('');

  _summaryBox = document.createElement('div');
  _summaryBox.style.cssText = [
    'flex:1;padding:4px 8px;',
    'background:' + T.bgDark + ';',
    'border:2px solid ' + T.mint + ';',
  ].join('');
  _summaryBox.style.clipPath = chamfer();
  summaryRow.appendChild(_summaryBox);

  // Split button
  _splitBtn = buildButton('Split', {
    fill: T.darkBtn, color: T.vermillion, fontSize: T.fsBtnSm,
    onTap: function() { SceneManager.emit('split:tap'); },
  });
  _splitBtn.style.cssText += 'flex-shrink:0;width:90px;';
  _splitBtn.style.outline = '3px solid ' + T.vermillion;
  _splitBtn.style.outlineOffset = '-1px';
  summaryRow.appendChild(_splitBtn);
  el.appendChild(summaryRow);

  // ── Prices box ──
  _pricesBox = document.createElement('div');
  _pricesBox.style.cssText = [
    'flex-shrink:0;padding:4px 8px;margin:0 6px 4px;',
    'background:' + T.bgDark + ';',
    'border:2px solid ' + T.mint + ';',
  ].join('');
  _pricesBox.style.clipPath = chamfer();
  el.appendChild(_pricesBox);
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

function _summaryRow(label, value, color, bold) {
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

function _renderItems(items) {
  if (!_itemScroll) return;
  _itemScroll.innerHTML = '';
  (items || []).forEach(function(item) {
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
    _itemScroll.appendChild(row);
  });
}

function _renderSummary(params) {
  if (!_summaryBox) return;
  _summaryBox.innerHTML = '';
  _summaryBox.appendChild(_summaryRow('Subtotal:', '$' + (params.subtotal || 0).toFixed(2), T.mint));
  if (params.discount && params.discount > 0) {
    _summaryBox.appendChild(_summaryRow('Discount:', '$' + params.discount.toFixed(2), T.mint));
  }
  _summaryBox.appendChild(_summaryRow('Tax:', '$' + (params.tax || 0).toFixed(2), T.mint));
  // Re-apply mint border since innerHTML cleared the borders
  _summaryBox.style.border = '2px solid ' + T.mint;
  _summaryBox.style.clipPath = chamfer();
}

function _renderPrices(params) {
  if (!_pricesBox) return;
  _pricesBox.innerHTML = '';
  _pricesBox.appendChild(_summaryRow('Card Price:', '$' + (params.cardTotal || 0).toFixed(2), T.gold, true));
  _pricesBox.appendChild(_summaryRow('Cash Price:', '$' + (params.cashPrice || 0).toFixed(2), T.gold, true));

  // Dynamic split-progress rows (hidden until partial payment)
  _paidRow = _summaryRow('Paid:', '$0.00', T.cyan);
  _paidRow.style.display = 'none';
  _pricesBox.appendChild(_paidRow);

  _remainRow = _summaryRow('Remaining:', '$' + (params.cardTotal || 0).toFixed(2), T.cyan);
  _remainRow.style.display = 'none';
  _pricesBox.appendChild(_remainRow);

  // Re-apply mint border
  _pricesBox.style.border = '2px solid ' + T.mint;
  _pricesBox.style.clipPath = chamfer();
}


// ═══════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════

export var OrderSummary = {

  show: function(params) {
    params = params || {};
    var el = _container();
    if (!el) return;

    // Build DOM on first show
    if (!_itemScroll) _build();

    if (_checkIdEl) _checkIdEl.textContent = params.checkId || '';

    _renderItems(params.items);
    _renderSummary(params);
    _renderPrices(params);

    SceneManager.showSummary();
  },

  hide: function() {
    SceneManager.hideSummary();
  },

  update: function(params) {
    params = params || {};
    if (_checkIdEl && params.checkId !== undefined) _checkIdEl.textContent = params.checkId;
    if (params.items && !params.skipItems) _renderItems(params.items);
    _renderSummary(params);
    _renderPrices(params);
  },

  updateSplit: function(opts) {
    opts = opts || {};
    if (_paidRow) {
      _paidRow.style.display = 'flex';
      var pv = _paidRow.querySelector('[data-val]');
      if (pv) pv.textContent = '$' + (opts.totalPaid || 0).toFixed(2);
    }
    if (_remainRow) {
      _remainRow.style.display = 'flex';
      var rv = _remainRow.querySelector('[data-val]');
      if (rv) rv.textContent = '$' + (opts.remaining || 0).toFixed(2);
    }
  },

  getElement: function() {
    return _container();
  },
};
