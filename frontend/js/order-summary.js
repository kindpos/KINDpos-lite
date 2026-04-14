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
var _nameEl = null;      // customer name display (tappable)
var _onNameTap = null;   // callback when check ID / name is tapped
var _splitBtn = null;    // split button ref
var _headerTitle = null; // header title element ref
var _colHead = null;     // column header container ref
var _summaryRowEl = null; // summary row (contains summary box + split btn)
var _mode = 'order';     // 'order' or 'checkout'
var _collapsible = false; // when true, items start collapsed with tap-to-expand
var _onItemTap = null;   // callback(itemIndex) when an item row is tapped

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
  _headerTitle = document.createElement('div');
  _headerTitle.style.cssText = [
    'font-family:' + T.fh + ';font-size:' + T.fsSmall + ';',
    'color:' + T.textPrimary + ';letter-spacing:0.08em;',
  ].join('');
  _headerTitle.textContent = 'ORDER RECAP';
  var checkWrap = document.createElement('div');
  checkWrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;cursor:pointer;';
  _checkIdEl = document.createElement('div');
  _checkIdEl.style.cssText = [
    'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';',
    'color:' + T.mint + ';white-space:nowrap;',
  ].join('');
  _nameEl = document.createElement('div');
  _nameEl.style.cssText = [
    'font-family:' + T.fb + ';font-size:11px;',
    'color:' + T.mint + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;',
  ].join('');
  checkWrap.appendChild(_checkIdEl);
  checkWrap.appendChild(_nameEl);
  checkWrap.addEventListener('pointerup', function() {
    if (_onNameTap) _onNameTap();
  });
  header.appendChild(_headerTitle);
  header.appendChild(checkWrap);
  el.appendChild(header);

  // ── Column headers ──
  _colHead = document.createElement('div');
  _colHead.style.cssText = [
    'display:flex;justify-content:space-between;',
    'padding:2px 10px;',
    'font-family:' + T.fh + ';font-size:14px;color:' + T.textPrimary + ';letter-spacing:0.06em;',
    'border-bottom:1px solid ' + T.bg3 + ';flex-shrink:0;',
  ].join('');
  var hdrItem = document.createElement('span');
  hdrItem.textContent = 'ITEM';
  var hdrRight = document.createElement('span');
  hdrRight.textContent = 'QTY    PRICE';
  hdrRight.style.whiteSpace = 'pre';
  _colHead.appendChild(hdrItem);
  _colHead.appendChild(hdrRight);
  el.appendChild(_colHead);

  // ── Scrollable items ──
  _itemScroll = document.createElement('div');
  _itemScroll.id = 'ticket-list';
  _itemScroll.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 10px;scrollbar-width:none;-ms-overflow-style:none;display:flex;flex-direction:column;gap:4px;';
  el.appendChild(_itemScroll);

  // ── Bottom: [Summary | Split] row ──
  _summaryRowEl = document.createElement('div');
  _summaryRowEl.style.cssText = [
    'flex-shrink:0;display:flex;gap:6px;',
    'padding:4px 6px;',
  ].join('');

  _summaryBox = document.createElement('div');
  _summaryBox.style.cssText = [
    'flex:1;padding:8px 10px;',
    'background:' + T.bgDark + ';',
  ].join('');
  applyCardBevel(_summaryBox, T.numpadChassis, 5);
  _summaryBox.style.clipPath = chamfer();
  _summaryRowEl.appendChild(_summaryBox);

  _splitBtn = null;
  el.appendChild(_summaryRowEl);

  // ── Prices box ──
  _pricesBox = document.createElement('div');
  _pricesBox.style.cssText = [
    'flex-shrink:0;padding:8px 10px;margin:0 6px 4px;',
    'background:' + T.bgDark + ';',
  ].join('');
  applyCardBevel(_pricesBox, T.numpadChassis, 5);
  _pricesBox.style.clipPath = chamfer();
  el.appendChild(_pricesBox);
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

function _modRow(mod) {
  var modRow = document.createElement('div');
  modRow.style.cssText = [
    'display:grid;grid-template-columns:1fr 68px;gap:0 6px;',
    'padding:0 0 1px 10px;',
    'font-family:' + T.fb + ';font-size:16px;',
    'color:' + T.mint + ';',
  ].join('');
  var modName = document.createElement('div');
  modName.textContent = mod.name;
  modName.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  var modPrice = document.createElement('div');
  modPrice.style.cssText = 'text-align:right;color:' + T.gold + ';';
  modPrice.textContent = mod.price > 0 ? '+$' + mod.price.toFixed(2) : '';
  modRow.appendChild(modName);
  modRow.appendChild(modPrice);
  return modRow;
}

function _halfCell(mod) {
  var td = document.createElement('div');
  td.style.cssText = 'flex:1;padding:1px 2px;color:' + T.mint + ';';
  if (!mod) return td;
  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:' + (mod.price > 0 ? '11px' : '13px') + ';';
  nameEl.textContent = mod.name;
  if (mod.price > 0) {
    var pr = document.createElement('span');
    pr.style.color = T.gold;
    pr.textContent = ' +$' + mod.price.toFixed(2);
    nameEl.appendChild(pr);
  }
  td.appendChild(nameEl);
  // Special exclusion children
  if (mod.children && mod.children.length > 0) {
    for (var c = 0; c < mod.children.length; c++) {
      var childEl = document.createElement('div');
      childEl.style.cssText = 'font-size:10px;color:' + T.vermillion + ';font-style:italic;padding-left:4px;';
      childEl.textContent = mod.children[c].name;
      td.appendChild(childEl);
    }
  }
  return td;
}

function _summaryRow(label, value, color, bold) {
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;justify-content:space-between;padding:2px 0;',
    'font-family:' + T.fb + ';font-size:' + T.fsCon + ';',
    bold ? 'font-weight:bold;' : '',
  ].join('');
  var l = document.createElement('span');
  l.style.color = T.textPrimary;
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
  var isCollapsible = _collapsible;
  (items || []).forEach(function(item, itemIndex) {
    var mods = item.mods || [];
    var hasMods = mods.length > 0;

    // ── Item header row ──
    var isSel = !!item.selected;
    var row = document.createElement('div');
    row.style.cssText = [
      'display:flex;justify-content:space-between;align-items:center;',
      'padding:3px 0 1px;',
      'font-family:' + T.fb + ';font-size:24px;',
      'color:' + (isSel ? T.bgDark : T.textPrimary) + ';',
      isSel ? 'background:' + T.gold + ';' : '',
      'border-bottom:1px solid ' + T.bg3 + ';',
      isCollapsible ? 'cursor:pointer;user-select:none;' : '',
    ].join('');
    var name = document.createElement('span');
    name.textContent = (item.sent ? '\u2713 ' : '') + item.name;
    name.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;';
    var rightInfo = document.createElement('span');
    rightInfo.style.cssText = 'white-space:nowrap;flex-shrink:0;margin-left:6px;color:' + (isSel ? T.bgDark : T.gold) + ';';
    rightInfo.textContent = item.qty + '\u00D7  $' + ((item.unitPrice || 0) * (item.qty || 1)).toFixed(2);
    row.appendChild(name);
    row.appendChild(rightInfo);

    // Collapse arrow only in checkout mode
    var arrow = null;
    if (isCollapsible && hasMods) {
      arrow = document.createElement('span');
      arrow.style.cssText = 'flex-shrink:0;margin-left:4px;font-size:10px;color:' + T.mutedText + ';';
      arrow.textContent = '\u25BC';
      row.appendChild(arrow);
    }

    _itemScroll.appendChild(row);

    // Attach tap handler for item selection (works for ALL items, not just ones with mods)
    if (isCollapsible) {
      (function(idx) {
        row.addEventListener('pointerup', function() {
          if (_onItemTap) _onItemTap(idx);
        });
      })(itemIndex);
    }

    if (!hasMods) return;

    // ── Modifier detail container ──
    var modDetail = document.createElement('div');
    // Collapsed by default only in checkout mode
    if (isCollapsible) modDetail.style.display = 'none';

    // Partition into whole / left / right
    var wholeMods = [];
    var leftMods = [];
    var rightMods = [];
    for (var m = 0; m < mods.length; m++) {
      if (mods[m].prefix === 'Left') leftMods.push(mods[m]);
      else if (mods[m].prefix === 'Right') rightMods.push(mods[m]);
      else wholeMods.push(mods[m]);
    }

    // Whole mods + children
    for (var w = 0; w < wholeMods.length; w++) {
      modDetail.appendChild(_modRow(wholeMods[w]));
      if (wholeMods[w].children && wholeMods[w].children.length > 0) {
        for (var c = 0; c < wholeMods[w].children.length; c++) {
          var childRow = _modRow(wholeMods[w].children[c]);
          childRow.style.paddingLeft = '20px';
          childRow.style.color = T.vermillion;
          childRow.style.fontStyle = 'italic';
          modDetail.appendChild(childRow);
        }
      }
    }

    // 1st/2nd table
    if (leftMods.length > 0 || rightMods.length > 0) {
      var halfTable = document.createElement('div');
      halfTable.style.cssText = 'padding:2px 0 2px 10px;';

      var hdrRow = document.createElement('div');
      hdrRow.style.cssText = 'display:flex;border-bottom:1px solid ' + T.mutedText + ';margin-bottom:1px;font-family:' + T.fb + ';font-size:16px;font-weight:bold;color:' + T.mint + ';';
      var hdrL = document.createElement('div');
      hdrL.style.cssText = 'flex:1;text-align:center;';
      hdrL.textContent = '1ST';
      var hdrSep = document.createElement('div');
      hdrSep.style.cssText = 'width:1px;background:' + T.mutedText + ';margin:0 3px;';
      var hdrR = document.createElement('div');
      hdrR.style.cssText = 'flex:1;text-align:center;';
      hdrR.textContent = '2ND';
      hdrRow.appendChild(hdrL);
      hdrRow.appendChild(hdrSep);
      hdrRow.appendChild(hdrR);
      halfTable.appendChild(hdrRow);

      var maxRows = Math.max(leftMods.length, rightMods.length);
      for (var r = 0; r < maxRows; r++) {
        var tr = document.createElement('div');
        tr.style.cssText = 'display:flex;font-family:' + T.fb + ';line-height:1.3;';
        var tdL = _halfCell(leftMods[r]);
        var tdSep2 = document.createElement('div');
        tdSep2.style.cssText = 'width:1px;background:' + T.mutedText + ';margin:0 3px;flex-shrink:0;';
        var tdR = _halfCell(rightMods[r]);
        tr.appendChild(tdL);
        tr.appendChild(tdSep2);
        tr.appendChild(tdR);
        halfTable.appendChild(tr);
      }

      modDetail.appendChild(halfTable);
    }

    _itemScroll.appendChild(modDetail);

    // Toggle expand/collapse on tap (item selection handled above for all items)
    if (isCollapsible && hasMods) {
      (function(detail, arrowEl) {
        row.addEventListener('pointerup', function() {
          if (detail && arrowEl) {
            var isOpen = detail.style.display !== 'none';
            detail.style.display = isOpen ? 'none' : '';
            arrowEl.textContent = isOpen ? '\u25BC' : '\u25B2';
          }
        });
      })(modDetail, arrow);
    }
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
  // Re-apply beveled border since innerHTML cleared the borders
  applyCardBevel(_summaryBox, T.numpadChassis, 5);
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

  // Re-apply beveled border
  applyCardBevel(_pricesBox, T.numpadChassis, 5);
  _pricesBox.style.clipPath = chamfer();
}


// ═══════════════════════════════════════════════════
//  CHECKOUT MODE — configure panel for checkout/close-day
// ═══════════════════════════════════════════════════

function _configureForMode(mode) {
  _mode = mode;
  if (mode === 'checkout') {
    if (_headerTitle) _headerTitle.textContent = 'CHECKOUT RECAP';
    if (_colHead) _colHead.style.display = 'none';
    if (_splitBtn) _splitBtn.style.display = 'none';
    if (_summaryRowEl) _summaryRowEl.style.padding = '4px 6px 0';
  } else {
    if (_headerTitle) _headerTitle.textContent = 'ORDER RECAP';
    if (_colHead) {
      _colHead.style.display = '';
      _colHead.style.gridTemplateColumns = '1fr 40px 68px';
      _colHead.innerHTML = '';
      ['ITEM', 'QTY', 'PRICE'].forEach(function(t, i) {
        var c = document.createElement('div');
        c.textContent = t;
        if (i > 0) c.style.textAlign = 'right';
        _colHead.appendChild(c);
      });
    }
    if (_splitBtn) _splitBtn.style.display = '';
    if (_summaryRowEl) _summaryRowEl.style.padding = '4px 6px';
  }
}

function _renderCheckoutBreakdown(params) {
  if (!_itemScroll) return;
  _itemScroll.innerHTML = '';

  var sections = params.sections || [];
  for (var s = 0; s < sections.length; s++) {
    var sec = sections[s];

    // Section header
    var hdr = document.createElement('div');
    hdr.style.cssText = [
      'font-family:' + T.fh + ';font-size:' + T.fsCon + ';',
      'color:' + T.textPrimary + ';letter-spacing:0.06em;',
      'padding:6px 0 2px;',
      s > 0 ? 'border-top:1px solid ' + T.bg3 + ';margin-top:4px;' : '',
    ].join('');
    hdr.textContent = sec.title;
    _itemScroll.appendChild(hdr);

    // Section rows
    var rows = sec.rows || [];
    for (var r = 0; r < rows.length; r++) {
      _itemScroll.appendChild(_summaryRow(rows[r].label, rows[r].value, T.gold));
    }
  }
}

function _renderCheckoutSummary(params) {
  if (!_summaryBox) return;
  _summaryBox.innerHTML = '';
  _summaryBox.appendChild(_summaryRow('CC Sales:', '$' + (params.cardSales || 0).toFixed(2), T.mint));
  _summaryBox.appendChild(_summaryRow('Tips:', '$' + (params.tips || 0).toFixed(2), T.mint));
  applyCardBevel(_summaryBox, T.numpadChassis, 5);
  _summaryBox.style.clipPath = chamfer();
}

function _renderCashExpected(params) {
  if (!_pricesBox) return;
  _pricesBox.innerHTML = '';

  var label = document.createElement('div');
  label.style.cssText = [
    'font-family:' + T.fh + ';font-size:' + T.fsCon + ';',
    'color:' + T.textPrimary + ';letter-spacing:0.06em;',
    'text-align:center;margin-bottom:2px;',
  ].join('');
  label.textContent = 'CASH EXPECTED';
  _pricesBox.appendChild(label);

  var hero = document.createElement('div');
  hero.style.cssText = [
    'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';',
    'color:' + T.gold + ';font-weight:bold;',
    'text-align:center;padding:4px 0;',
  ].join('');
  hero.textContent = '$' + (params.cashExpected || 0).toFixed(2);
  hero.setAttribute('data-cash-expected', '1');
  _pricesBox.appendChild(hero);

  applyCardBevel(_pricesBox, T.numpadChassis, 5);
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
    _collapsible = !!params.collapsible;
    _onItemTap = params.onItemTap || null;
    _configureForMode('order');

    if (_checkIdEl) _checkIdEl.textContent = params.checkId || '';
    if (_nameEl) _nameEl.textContent = params.customerName || '';
    _onNameTap = params.onNameTap || null;

    _renderItems(params.items);
    _renderSummary(params);
    _renderPrices(params);

    SceneManager.showSummary();
  },

  hide: function() {
    _onNameTap = null;
    _onItemTap = null;
    SceneManager.hideSummary();
  },

  update: function(params) {
    params = params || {};
    if (_checkIdEl && params.checkId !== undefined) _checkIdEl.textContent = params.checkId;
    if (_nameEl && params.customerName !== undefined) _nameEl.textContent = params.customerName || '';
    if (params.onNameTap !== undefined) _onNameTap = params.onNameTap;
    if (params.onItemTap !== undefined) _onItemTap = params.onItemTap;
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

  showCheckout: function(params) {
    params = params || {};
    var el = _container();
    if (!el) return;
    if (!_itemScroll) _build();
    _configureForMode('checkout');

    if (_headerTitle && params.title) _headerTitle.textContent = params.title;
    if (_checkIdEl) _checkIdEl.textContent = params.label || '';

    _renderCheckoutBreakdown(params);
    _renderCheckoutSummary(params);
    _renderCashExpected(params);

    SceneManager.showSummary();
  },

  updateCheckout: function(params) {
    params = params || {};
    if (_headerTitle && params.title) _headerTitle.textContent = params.title;
    if (_checkIdEl && params.label !== undefined) _checkIdEl.textContent = params.label;
    if (params.checks) _renderCheckoutBreakdown(params);
    _renderCheckoutSummary(params);
    _renderCashExpected(params);
  },

  getElement: function() {
    return _container();
  },
};
