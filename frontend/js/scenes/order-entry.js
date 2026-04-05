// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Order Entry Scene
//  Ticket panel left | Hex Nav canvas right
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton } from '../tokens.js';
import { buildButton } from '../components.js';
import { registerScene, push, replace, overlay, dismissOverlay, interrupt, resolveInterrupt, cancelInterrupt } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { HexNav } from '../hex-nav.js';
import { buildNumpad } from '../numpad.js';
import { showKeyboard } from '../keyboard.js';

var PAD      = 16;
var GAP      = 16;
var TICKET_W = 280;
var BTN_H    = 50;
var OVERLAP  = 18;

// ── Pricing constants (defaults, overwritten by /api/v1/config/pricing) ──
var TAX_RATE      = 0.07;
var CASH_DISCOUNT = 0.04;
var STUB_PRICE    = 0.01;  // TODO: replace with real menu item prices

// Fetch canonical rates from backend so FE/BE always agree
fetch('/api/v1/config/pricing').then(function(r) { return r.json(); }).then(function(d) {
  if (d.tax_rate != null)           TAX_RATE      = d.tax_rate;
  if (d.cash_discount_rate != null) CASH_DISCOUNT = d.cash_discount_rate;
}).catch(function() { /* keep defaults on network error */ });

// ── API ───────────────────────────────────────────
var API = '/api/v1';

// ── Order ID — one per transaction, reset on fresh enter ──
var currentOrderId = null;
var currentCheckNumber = null;

// ── Void reasons ──────────────────────────────────
var VOID_REASONS = ['Wrong Order', 'Customer Request', 'Manager Comp', 'Other'];

// ── Menu data ─────────────────────────────────────
var MENU_DATA = [
  {
    id: 'combo', label: 'COMBO', color: T.catColor('COMBO'), textColor: '#1a1a00',
    subcats: [
      { id: 'combo-items', label: 'Combo', items: ['Half Rack', 'Pulled Pork'] },
    ]
  },
  {
    id: 'ribs', label: 'RIBS', color: T.catColor('RIBS'), textColor: '#1a0a0a',
    subcats: [
      { id: 'ribs-items', label: 'Ribs', items: ['Full Rack', 'Half Rack'] },
    ]
  },
  {
    id: 'sandwiches', label: 'SANDWICHES', color: T.catColor('SANDWICHES'), textColor: '#1a2a1a',
    subcats: [
      { id: 'sandwich-items', label: 'Sandwiches', items: ['Pulled Pork', 'Sliced Brisket'] },
    ]
  },
  {
    id: 'sides', label: 'SIDES', color: T.catColor('SIDES'), textColor: '#001a1a',
    subcats: [
      { id: 'side-items', label: 'Sides', items: ['Fries', 'Baked Potato', 'Slaw'] },
    ]
  },
  {
    id: 'soda', label: 'SODA', color: T.catColor('SODA'), textColor: '#001a1a',
    subcats: [
      { id: 'soda-items', label: 'Soda', items: ['Coke', 'Sprite', 'Diet Coke', 'Fanta'] },
    ]
  },
];

var MOD_DATA = [
  {
    id: 'sauce', label: 'SAUCE', color: T.red, textColor: '#fff',
    subcats: [
      { id: 'sauce-items', label: 'Sauce', items: ['Sweet', 'Hot', 'Mild', 'Vinegar', 'Mustard'] },
    ]
  },
  {
    id: 'extras', label: 'EXTRAS', color: T.lavender, textColor: '#1a0030',
    subcats: [
      { id: 'extras-items', label: 'Extras', items: ['Extra Meat', 'Cheese', 'Jalapeños', 'Onions'] },
    ]
  },
];

// ── Combo flow state ─────────────────────────────
var comboFlow    = null;  // { step: 'side'|'soda', ticketItem: ref }

// ── Scene state ───────────────────────────────────
var hexNav       = null;
var activeTab    = 'items';
var activePrefix = 'add';
var ticket       = [];    // [{ id, name, unitPrice, mods:[{name,price,charged}], selected, sent }]
var ticketSeq    = 0;     // monotonic ID counter
var sceneParams  = {};
var prefixCard   = null;  // DOM ref for show/hide
var savedTabs    = [];    // [{ id, checkNum, label, ticket }] — in-memory for pilot
var saveSeq      = 0;     // saved tab ID counter
var saveBtn      = null;  // DOM ref for SAVE button state
var customerName = '';    // current tab's customer name (from save/recall)

// ── Prefix definitions ────────────────────────────
var PREFIXES = [
  { id: 'add',     label: 'Add',     color: T.goGreen,  textColor: '#1a2a1a' },
  { id: 'no',      label: 'No',      color: T.red,      textColor: '#fff'    },
  { id: 'on-side', label: 'On Side', color: T.gold,     textColor: '#1a1000' },
  { id: 'extra',   label: 'Extra',   color: T.cyan,     textColor: '#001a1a' },
  { id: 'sub',     label: 'Sub',     color: T.lavender, textColor: '#1a0030' },
];

registerScene('order-entry', {
  cache: true,
  onEnter: function(el, params) {
    setSceneName('NEW ORDER');
    setHeaderBack(true);
    activeTab      = 'items';
    activePrefix   = 'add';
    ticket         = [];
    ticketSeq      = 0;
    sceneParams    = params || {};
    prefixCard     = null;
    saveBtn        = null;
    currentOrderId = null;   // soft reset — ID assigned on first SEND
    currentCheckNumber = null;
    customerName   = '';     // reset tab name

    el.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;gap:' + GAP + 'px;',
      'padding:' + PAD + 'px;',
      'box-sizing:border-box;',
    ].join('');

    var ticketPanel = buildTicket(el);
    var mainArea    = buildMain(el, params);
    el.appendChild(ticketPanel);
    el.appendChild(mainArea);
  },

  onResume: function() {
    var el = document.querySelector('[data-scene="order-entry"]');
    if (el) el.style.display = 'flex';
  },
  onExit: function() {
    if (hexNav) { hexNav.destroy(); hexNav = null; }
  },
});

// ── TOTALS HELPER ─────────────────────────────────
function computeTotals() {
  var subtotal = 0;
  var counts = {};
  ticket.forEach(function(inst) {
    var lineTotal = inst.unitPrice + inst.mods.reduce(function(s, m) { return s + m.price; }, 0);
    counts[inst.name] = counts[inst.name] || { unitPrice: inst.unitPrice, qty: 0 };
    counts[inst.name].qty += 1;
    subtotal += lineTotal;
  });
  var tax       = Math.round(subtotal * TAX_RATE * 100) / 100;
  var cardTotal = Math.round((subtotal + tax) * 100) / 100;
  var cashPrice = Math.round(cardTotal * (1 - CASH_DISCOUNT) * 100) / 100;
  return { counts: counts, subtotal: subtotal, tax: tax, cardTotal: cardTotal, cashPrice: cashPrice };
}

// ── TICKET PANEL ──────────────────────────────────
function buildTicket(parentEl) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:' + TICKET_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'border-right:2px solid ' + T.mint + ';',
    'padding-right:' + GAP + 'px;',
  ].join('');

  // SAVE / RECALL
  var topRow = document.createElement('div');
  topRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px;flex-shrink:0;';

  saveBtn = buildButton('//SAVE//', {
    fill: T.bgLight, color: T.mint, fontSize: '30px', height: BTN_H,
    onTap: function() { handleSave(); },
  });

  var recallBtnEl = buildButton('//RECALL//', {
    fill: T.bgLight, color: T.mint, fontSize: '30px', height: BTN_H,
    onTap: function() { handleRecall(); },
  });

  topRow.appendChild(saveBtn);
  topRow.appendChild(recallBtnEl);
  panel.appendChild(topRow);

  // Item list
  var itemList = document.createElement('div');
  itemList.id = 'ticket-list';
  itemList.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;gap:4px;';
  panel.appendChild(itemList);

  // Summary — IDs for live update
  var summary = document.createElement('div');
  summary.style.cssText = 'padding:3px 4px;border-top:1px solid ' + T.bgLight + ';flex-shrink:0;';
  summary.appendChild(buildSummaryRow('Subtotal', '$0.00', 'ticket-subtotal'));
  summary.appendChild(buildSummaryRow('Tax',      '$0.00', 'ticket-tax'));
  panel.appendChild(summary);

  // Totals — IDs for live update
  var totals = document.createElement('div');
  totals.style.cssText = 'background:' + T.bgDark + ';padding:4px;border-top:2px solid ' + T.bgLight + ';flex-shrink:0;';
  totals.appendChild(buildTotalRow('Total', '$0.00', 'ticket-total'));
  totals.appendChild(buildTotalRow('Cash',  '$0.00', 'ticket-cash'));
  panel.appendChild(totals);

  return panel;
}

function buildSummaryRow(label, value, id) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:26px;color:' + T.mint + ';line-height:1.6;';
  var valEl = document.createElement('span');
  if (id) valEl.id = id;
  valEl.textContent = value;
  row.innerHTML = '<span>' + label + '</span>';
  row.appendChild(valEl);
  return row;
}

function buildTotalRow(label, value, id) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:22px;font-weight:bold;color:' + T.gold + ';line-height:1.7;';
  var valEl = document.createElement('span');
  if (id) valEl.id = id;
  valEl.textContent = value;
  row.innerHTML = '<span>' + label + '</span>';
  row.appendChild(valEl);
  return row;
}

// ── PREFIX CARD ───────────────────────────────────
function buildPrefixCard() {
  var card = document.createElement('div');
  card.style.cssText = [
    'display:none;flex-shrink:0;',
    'background:#1a1a1a;',
    'border:2px solid ' + T.gold + ';',
    'border-bottom:none;',
    'padding:6px 8px;',
    'display:none;gap:6px;',
    'align-items:center;',
  ].join('');

  // Label
  var lbl = document.createElement('span');
  lbl.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mutedText + ';flex-shrink:0;margin-right:2px;';
  lbl.textContent = 'PREFIX:';
  card.appendChild(lbl);

  // Prefix buttons
  var btnEls = {};
  PREFIXES.forEach(function(p) {
    var pair = buildStyledButton(activePrefix === p.id ? p.color : T.bgDark);
    pair.wrap.style.height = '40px';
    pair.wrap.style.flex   = '1';
    pair.inner.style.fontFamily = T.fb;
    pair.inner.style.fontSize   = '20px';
    pair.inner.style.color      = activePrefix === p.id ? p.textColor : p.color;
    pair.inner.textContent = p.label;
    // Shadow always matches the prefix color
    pair.wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + p.color + 'aa)';

    pair.wrap.addEventListener('pointerup', function() {
      // Deactivate all
      PREFIXES.forEach(function(q) {
        var b = btnEls[q.id];
        if (!b) return;
        b.inner.style.background = T.bgDark;
        b.inner.style.color = q.color;
        b.wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + q.color + 'aa)';
      });
      // Activate this one
      pair.inner.style.background = p.color;
      pair.inner.style.color = p.textColor;
      pair.wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + p.color + 'aa)';
      activePrefix = p.id;
    });

    btnEls[p.id] = pair;
    card.appendChild(pair.wrap);
  });

  card._btnEls = btnEls;
  prefixCard = card;
  return card;
}

// ── MAIN AREA ─────────────────────────────────────
function buildMain(parentEl, params) {
  var main = document.createElement('div');
  main.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

  var pc = buildPrefixCard();
  main.appendChild(pc);

  var canvas = document.createElement('div');
  canvas.id = 'hex-canvas';
  canvas.style.cssText = [
    'flex:1;background:' + T.bg5 + ';',
    'border:7px solid ' + T.mint + ';',
    'margin-bottom:0;padding-bottom:' + OVERLAP + 'px;',
    'position:relative;overflow:hidden;',
  ].join('');
  main.appendChild(canvas);

  var bottom = document.createElement('div');
  bottom.style.cssText = [
    'display:grid;',
    'grid-template-columns:1fr 1fr 1fr 1fr 1.3fr;',
    'grid-template-rows:' + BTN_H + 'px ' + BTN_H + 'px;',
    'gap:3px;padding:3px;padding-top:0;',
    'position:relative;z-index:2;',
    'margin-top:-' + OVERLAP + 'px;',
  ].join('');

  var tabItems = buildButton('< items >', {
    fill: T.mint, color: T.bg, fontSize: '26px', height: BTN_H,
    onTap: function() { switchTab('items', canvas, tabItems, tabMods); },
  });
  tabItems.style.gridColumn = '1 / 3';
  tabItems.style.gridRow    = '1';

  var tabMods = buildButton('< modifiers >', {
    fill: T.gold, color: T.bg, fontSize: '26px', height: BTN_H,
    onTap: function() { switchTab('modifiers', canvas, tabItems, tabMods); },
  });
  tabMods.style.gridColumn = '3 / 5';
  tabMods.style.gridRow    = '1';

  var send = buildButton('//SEND//', {
    fill: T.goGreen, color: T.bg, fontSize: '36px',
    onTap: function() { handleSend(); },
  });
  send.style.gridColumn = '5';
  send.style.gridRow    = '1 / 3';

  var disc  = buildButton('//DISC//', { fill: T.bgLight, color: T.mint, fontSize: '26px', height: BTN_H });
  var voidB = buildButton('//VOID//', { fill: T.red,     color: '#fff', fontSize: '26px', height: BTN_H,
    onTap: function() { handleVoid(); },
  });
  voidB.id = 'void-btn';
  var print = buildButton('//PRINT//',{ fill: T.cyan,    color: T.bg,   fontSize: '26px', height: BTN_H });

  var pay = buildButton('//PAY//', { fill: T.gold, color: T.bg, fontSize: '26px', height: BTN_H,
    onTap: function() { handlePay(params); },
  });

  disc.style.gridColumn  = '1'; disc.style.gridRow  = '2';
  voidB.style.gridColumn = '2'; voidB.style.gridRow = '2';
  print.style.gridColumn = '3'; print.style.gridRow = '2';
  pay.style.gridColumn   = '4'; pay.style.gridRow   = '2';

  [tabItems, tabMods, send, disc, voidB, print, pay].forEach(function(b) {
    bottom.appendChild(b);
  });
  main.appendChild(bottom);

  requestAnimationFrame(function() {
    hexNav = new HexNav(canvas, {
      data: MENU_DATA,
      onSelect: function(item) { handleItemSelect(item); },
    });
  });

  return main;
}

// ── TAB SWITCHING ─────────────────────────────────
function switchTab(tab, canvas, tabItems, tabMods) {
  activeTab = tab;
  var isItems = tab === 'items';

  // Show/hide prefix card
  if (prefixCard) {
    prefixCard.style.display = isItems ? 'none' : 'flex';
  }

  // Border color tracks active tab
  canvas.style.borderColor  = isItems ? T.mint : T.gold;
  canvas.style.borderTop    = isItems ? '' : 'none';

  if (hexNav) hexNav.setData(isItems ? MENU_DATA : MOD_DATA);
}

// ── TICKET ────────────────────────────────────────
function getMenuCat(id) {
  return MENU_DATA.find(function(c) { return c.id === id; });
}

function handleItemSelect(item) {
  var name = item.label || item;

  // ── Combo flow: picking side or soda ──
  if (comboFlow) {
    if (comboFlow.step === 'side') {
      comboFlow.ticketItem.mods.push({ name: name, price: 0, charged: false });
      comboFlow.step = 'soda';
      var sodaCat = getMenuCat('soda');
      hexNav.showPickList('SODA', sodaCat.color, sodaCat.textColor, sodaCat.subcats[0].items);
      renderTicket();
      updateBottomBar();
      return;
    }
    if (comboFlow.step === 'soda') {
      comboFlow.ticketItem.mods.push({ name: name, price: 0, charged: false });
      comboFlow = null;
      hexNav.reset();
      renderTicket();
      updateBottomBar();
      return;
    }
  }

  // ── Start combo flow if selected from COMBO category ──
  if (hexNav && hexNav.getCatId() === 'combo') {
    var ticketItem = {
      id:        ++ticketSeq,
      name:      'Combo ' + name,
      unitPrice: STUB_PRICE,
      mods:      [],
      selected:  false,
      sent:      false,
    };
    ticket.push(ticketItem);
    comboFlow = { step: 'side', ticketItem: ticketItem };
    var sidesCat = getMenuCat('sides');
    hexNav.showPickList('SIDES', sidesCat.color, sidesCat.textColor, sidesCat.subcats[0].items);
    renderTicket();
    updateBottomBar();
    return;
  }

  addToTicket(item);
}

function addToTicket(item) {
  var name = item.label || item;

  if (activeTab === 'modifiers') {
    // Apply modifier to all selected instances
    var selected = ticket.filter(function(i) { return i.selected; });
    if (selected.length === 0) return;
    var pfx = PREFIXES.find(function(p) { return p.id === activePrefix; });
    var modName = (pfx ? pfx.label + ' ' : '') + name;
    selected.forEach(function(inst) {
      inst.mods.push({ name: modName, price: 0, charged: false });
    });
  } else {
    // New item instance
    ticket.push({
      id:        ++ticketSeq,
      name:      name,
      unitPrice: STUB_PRICE,
      mods:      [],
      selected:  false,
      sent:      false,
    });
  }
  renderTicket();
  updateBottomBar();
}

function renderTicket() {
  var list = document.getElementById('ticket-list');
  if (!list) return;
  list.innerHTML = '';

  // ── Group instances by name ──────────────────────
  var groups = {};
  var groupOrder = [];
  ticket.forEach(function(inst) {
    if (!groups[inst.name]) {
      groups[inst.name] = [];
      groupOrder.push(inst.name);
    }
    groups[inst.name].push(inst);
  });

  groupOrder.forEach(function(name) {
    var instances = groups[name];
    var hasCharged = instances.some(function(inst) {
      return inst.mods.some(function(m) { return m.charged; });
    });
    var allSelected = instances.every(function(i) { return i.selected; });
    var anySelected = instances.some(function(i) { return i.selected; });

    if (!hasCharged && !anySelected) {
      // ── Collapsed group card ──────────────────────
      var groupPrice = instances.reduce(function(sum, i) {
        return sum + i.unitPrice + i.mods.reduce(function(ms, m) { return ms + m.price; }, 0);
      }, 0);

      var gc = document.createElement('div');
      gc.style.cssText = [
        'flex-shrink:0;cursor:pointer;',
        'background:#333333;',
        'border:4px solid ' + T.mint + ';',
      ].join('');

      var gRow = document.createElement('div');
      gRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 8px;';

      var gName = document.createElement('span');
      gName.style.cssText = 'font-family:' + T.fb + ';font-size:20px;font-weight:bold;color:' + T.mint + ';';
      gName.textContent = (instances.length > 1 ? instances.length + '\u00d7 ' : '') + name;

      var gPrice = document.createElement('span');
      gPrice.style.cssText = 'font-family:' + T.fb + ';font-size:20px;font-weight:bold;color:' + T.mint + ';';
      gPrice.textContent = '$' + groupPrice.toFixed(2);

      gRow.appendChild(gName);
      gRow.appendChild(gPrice);
      gc.appendChild(gRow);

      // Charged mods only in collapsed state
      var chargedMods = [];
      instances.forEach(function(inst) {
        inst.mods.forEach(function(m) {
          if (m.charged) chargedMods.push(m);
        });
      });
      if (chargedMods.length > 0) {
        var sep = buildSeparator();
        gc.appendChild(sep);
        chargedMods.forEach(function(m) {
          gc.appendChild(buildModRow(m.name, m.price, true, false));
        });
      }

      gc.addEventListener('pointerup', function() {
        // Expand: select all instances
        instances.forEach(function(i) { i.selected = true; });
        renderTicket();
        updateBottomBar();
      });

      list.appendChild(gc);

    } else {
      // ── Individual instance cards ─────────────────
      instances.forEach(function(inst) {
        var active = inst.selected;
        var bg     = active ? T.mint    : '#333333';
        var border = active ? '#1a1a1a' : T.mint;
        var fg     = active ? '#1a1a1a' : T.mint;

        var ic = document.createElement('div');
        ic.style.cssText = [
          'flex-shrink:0;cursor:pointer;',
          'background:' + bg + ';',
          'border:4px solid ' + border + ';',
          'margin-bottom:2px;',
        ].join('');

        var iRow = document.createElement('div');
        iRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 8px;';

        var iName = document.createElement('span');
        iName.style.cssText = 'font-family:' + T.fb + ';font-size:20px;font-weight:bold;color:' + fg + ';';
        iName.textContent = inst.name;

        var iPrice = document.createElement('span');
        iPrice.style.cssText = 'font-family:' + T.fb + ';font-size:20px;font-weight:bold;color:' + fg + ';';
        var total = inst.unitPrice + inst.mods.reduce(function(s, m) { return s + m.price; }, 0);
        iPrice.textContent = '$' + total.toFixed(2);

        iRow.appendChild(iName);
        iRow.appendChild(iPrice);
        ic.appendChild(iRow);

        // Mods: active = all mods; inactive = charged only
        var visibleMods = active
          ? inst.mods
          : inst.mods.filter(function(m) { return m.charged; });

        if (visibleMods.length > 0) {
          ic.appendChild(buildSeparator());
          visibleMods.forEach(function(m) {
            ic.appendChild(buildModRow(m.name, m.price, active, active));
          });
        }

        ic.addEventListener('pointerup', function() {
          inst.selected = !inst.selected;
          // Auto-collapse group if nothing selected in it
          if (!inst.selected) {
            var anyStillSelected = instances.some(function(i) { return i.selected; });
            // renderTicket handles collapse automatically
          }
          renderTicket();
          updateBottomBar();
        });

        list.appendChild(ic);
      });
    }
  });

  // ── Live totals ───────────────────────────────────
  var totals = computeTotals();
  var subEl  = document.getElementById('ticket-subtotal');
  var taxEl  = document.getElementById('ticket-tax');
  var totEl  = document.getElementById('ticket-total');
  var cashEl = document.getElementById('ticket-cash');
  if (subEl)  subEl.textContent  = '$' + totals.subtotal.toFixed(2);
  if (taxEl)  taxEl.textContent  = '$' + totals.tax.toFixed(2);
  if (totEl)  totEl.textContent  = '$' + totals.cardTotal.toFixed(2);
  if (cashEl) cashEl.textContent = '$' + totals.cashPrice.toFixed(2);
}

// ── SEPARATOR + MOD ROW helpers ───────────────────
function buildSeparator() {
  var sep = document.createElement('div');
  sep.style.cssText = 'padding:0 8px;font-family:' + T.fb + ';font-size:20px;color:' + T.mintEdgeD + ';letter-spacing:2px;overflow:hidden;white-space:nowrap;line-height:1;';
  sep.textContent = '- - - - - - - - - - - - - - - - - -';
  return sep;
}

function buildModRow(name, price, dark, showPrice) {
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;justify-content:space-between;',
    'padding:2px 8px 2px 20px;',
    'font-family:' + T.fb + ';font-size:20px;font-weight:bold;',
    'color:' + (dark ? '#1a1a1a' : T.gold) + ';',
  ].join('');
  var n = document.createElement('span');
  n.textContent = name;
  var p = document.createElement('span');
  p.textContent = price > 0 ? '+$' + price.toFixed(2) : '$0.00';
  row.appendChild(n);
  row.appendChild(p);
  return row;
}

function handleVoid() {
  var selected = ticket.filter(function(i) { return i.selected; });
  var hasSelected = selected.length > 0;
  var anyUnsent = hasSelected && selected.every(function(i) { return !i.sent; });
  var voidingEntireOrder = !hasSelected;

  if (hasSelected && anyUnsent) {
    // Silent delete — unsent selected items, no pin required
    ticket = ticket.filter(function(i) { return !i.selected; });
    renderTicket();
    updateBottomBar();
    return;
  }

  if (voidingEntireOrder && ticket.length === 0) return;

  // VOID flow — PIN then reason
  interrupt('void-pin', {
    reason: 'void',
    onBuild: function(el) { buildPinOverlay(el, function(pinOk) {
      if (!pinOk) { cancelInterrupt(); return; }
      resolveInterrupt();
      showVoidReasons(voidingEntireOrder ? ticket : selected, voidingEntireOrder);
    }); },
  }).catch(function() {});
}

function showVoidReasons(targets, isFullVoid) {
  interrupt('void-reason', {
    onBuild: function(el) {
      var panel = document.createElement('div');
      panel.style.cssText = [
        'display:flex;flex-direction:column;align-items:center;',
        'gap:10px;background:#1a1a1a;',
        'border:4px solid ' + T.red + ';padding:20px;min-width:280px;',
      ].join('');

      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.red + ';letter-spacing:2px;margin-bottom:4px;';
      lbl.textContent = isFullVoid ? '// VOID ENTIRE ORDER //' : '// VOID REASON //';
      panel.appendChild(lbl);

      VOID_REASONS.forEach(function(r) {
        var btn = buildButton(r, {
          fill: T.bgLight, color: T.mint, fontSize: '26px', height: 44,
          onTap: function() {
            targets.forEach(function(inst) { inst.voided = true; inst.voidReason = r; });
            ticket = ticket.filter(function(i) { return !i.voided; });
            resolveInterrupt();

            if (isFullVoid && currentOrderId) {
              fetch(API + '/orders/' + currentOrderId + '/void', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: r }),
              }).catch(function(err) {
                console.error('[KINDpos] Void API error:', err);
              }).then(function() {
                currentOrderId = null;
                currentCheckNumber = null;
                replace('login');
              });
            } else if (isFullVoid) {
              currentOrderId = null;
              currentCheckNumber = null;
              replace('login');
            } else {
              renderTicket();
              updateBottomBar();
            }
          },
        });
        btn.style.width = '240px';
        panel.appendChild(btn);
      });

      var cancelBtn = buildButton('CANCEL', {
        fill: T.bgLight, color: T.red, fontSize: '22px', height: 40,
        onTap: function() { cancelInterrupt(); },
      });
      cancelBtn.style.width = '240px';
      panel.appendChild(cancelBtn);

      el.appendChild(panel);
    },
  }).catch(function() {});
}

// ── PIN OVERLAY ───────────────────────────────────
var MANAGER_PIN = '1234'; // demo seed manager PIN

function buildPinOverlay(el, cb) {
  // Child panel — never override el positioning styles
  var panel = document.createElement('div');
  panel.style.cssText = [
    'display:flex;flex-direction:column;align-items:center;',
    'gap:14px;background:#1a1a1a;',
    'border:4px solid ' + T.mint + ';padding:20px;',
  ].join('');

  var lbl = document.createElement('div');
  lbl.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.mint + ';letter-spacing:2px;';
  lbl.textContent = '// MANAGER PIN //';
  panel.appendChild(lbl);

  var numpad = buildNumpad({
    maxDigits: 4,
    masked:    true,
    onSubmit:  function(pin) {
      if (pin === MANAGER_PIN) {
        cb(true);
      } else {
        numpad.setError('WRONG PIN');
      }
    },
  });
  panel.appendChild(numpad);

  var cancelBtn = buildButton('CANCEL', {
    fill: T.bgLight, color: T.mint, fontSize: '22px', height: 40,
    onTap: function() { cb(false); },
  });
  cancelBtn.style.width = '332px'; // matches numpad component width
  panel.appendChild(cancelBtn);

  el.appendChild(panel);
}

async function handleSend() {
  if (ticket.length === 0) return;

  var totals = computeTotals();

  try {
    // Step 1 — create order on first send, reuse on subsequent sends
    if (!currentOrderId) {
      var createRes = await fetch(API + '/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_type:  'quick_service',
          guest_count: 1,
          customer_name: customerName || null,
        }),
      });
      if (!createRes.ok) throw new Error('Order create failed: ' + createRes.status);
      var created = await createRes.json();
      currentOrderId = created.order_id;   // use the backend-generated ID
      currentCheckNumber = created.check_number;
      setSceneName(currentCheckNumber);
    }

    // Step 2 — post only unsent instances, each with their own modifiers
    var unsentInstances = ticket.filter(function(inst) { return !inst.sent; });
    var itemPromises = unsentInstances.map(function(inst) {
      return fetch(API + '/orders/' + currentOrderId + '/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: inst.name.toLowerCase().replace(/\s+/g, '_'),
          name:         inst.name,
          price:        inst.unitPrice,
          quantity:     1,
          category:     'general',
          modifiers:    inst.mods.map(function(m) {
            return { name: m.name, price: m.price, charged: m.charged };
          }),
        }),
      });
    });
    await Promise.all(itemPromises);

    // Step 3 — send to kitchen + trigger kitchen ticket print
    await fetch(API + '/orders/' + currentOrderId + '/send', { method: 'POST' });

    // Mark all current instances as sent
    ticket.forEach(function(inst) { inst.sent = true; });

    // Fire kitchen print — non-blocking, dispatcher handles retry
    fetch(API + '/print/ticket/' + currentOrderId, { method: 'POST' })
      .catch(function(err) { console.warn('[KINDpos] Kitchen print failed:', err); });

  } catch (err) {
    console.warn('[KINDpos] Send failed:', err);
  }

  // Reset hex nav — ticket stays visible for PAY
  if (hexNav) hexNav.reset();
}

function deepCopyTicket(src) {
  return src.map(function(inst) {
    return {
      id:        inst.id,
      name:      inst.name,
      unitPrice: inst.unitPrice,
      mods:      inst.mods.map(function(m) {
        return { name: m.name, price: m.price, charged: m.charged };
      }),
      selected:  false,   // always reset selection on copy
      sent:      inst.sent,
    };
  });
}

// ── SAVE ─────────────────────────────────────────
function handleSave() {
  if (ticket.length === 0) return;
  var seq = ++saveSeq;
  var checkNum = 'CHECK-' + String(seq).padStart(3, '0');
  var snap = deepCopyTicket(ticket);   // deep copy — no shared references
  var finishSave = function(label) {
    savedTabs.push({
      id:       seq,
      checkNum: checkNum,
      label:    label || '',
      ticket:   snap,
    });
    if (saveBtn) {
      saveBtn.style.background = T.goGreen;
      saveBtn.querySelector && (function() {
        var inner = saveBtn.querySelector('[data-inner]') || saveBtn.firstChild;
        if (inner) inner.style.color = T.bg;
      })();
    }
  };
  showKeyboard({
    placeholder: 'Name this tab (optional)',
    initialValue: '',
    maxLength: 20,
    onDone: function(val) { finishSave(val ? val.toUpperCase() : ''); },
    onDismiss: function() { finishSave(''); },
    dismissOnDone: true,
  });
}

// ── RECALL ───────────────────────────────────────
function handleRecall() {
  overlay('recall', {
    onBuild: function(el) {
      // el is the full-screen centered flex container from scene-manager
      // build panel as a child — never override el's positioning styles
      var panel = document.createElement('div');
      panel.style.cssText = 'display:flex;flex-direction:column;width:600px;max-height:520px;background:#1a1a1a;border:4px solid ' + T.mint + ';padding:0;overflow:hidden;';

      // Header
      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid ' + T.bg3 + ';flex-shrink:0;';
      var title = document.createElement('span');
      title.style.cssText = 'font-family:' + T.fb + ';font-size:20px;font-weight:bold;color:' + T.mint + ';letter-spacing:2px;';
      title.textContent = '// RECALL //';
      var closeBtn = buildButton('\u2715', {
        fill: T.red, color: T.mint, fontSize: '20px', height: 30,
        onTap: function() { dismissOverlay(); },
      });
      closeBtn.style.width = '30px';
      hdr.appendChild(title);
      hdr.appendChild(closeBtn);
      panel.appendChild(hdr);

      // Grid
      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px;overflow-y:auto;flex:1;';

      if (savedTabs.length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:20px;text-align:center;padding:40px 0;';
        empty.textContent = 'No saved tabs';
        grid.appendChild(empty);
      } else {
        savedTabs.forEach(function(tab) {
          var total = tab.ticket.reduce(function(s, i) {
            return s + i.unitPrice + i.mods.reduce(function(ms, m) { return ms + m.price; }, 0);
          }, 0);

          var cardLabel = tab.label
            ? tab.label + '\n' + tab.checkNum + '\n$' + total.toFixed(2)
            : tab.checkNum + '\n$' + total.toFixed(2);
          var card = buildButton(cardLabel, {
            fill: '#333333', color: T.mint, fontSize: '20px', height: 90,
            onTap: function() { recallTabInterrupt(tab, grid, panel); },
          });
          grid.appendChild(card);
        });
      }
      panel.appendChild(grid);
      el.appendChild(panel);
    },
  });
}

function recallTabInterrupt(tab, grid, overlayEl) {
  var doLoad = function() {
    resolveInterrupt();
    ticket = deepCopyTicket(tab.ticket);  // deep copy — clean slate, selection reset
    savedTabs = savedTabs.filter(function(t) { return t.id !== tab.id; });
    ticketSeq = ticket.reduce(function(mx, i) { return Math.max(mx, i.id); }, 0);
    currentOrderId = null;
    currentCheckNumber = null;
    customerName = tab.label || '';
    dismissOverlay();
    renderTicket();
    updateBottomBar();
    if (saveBtn) saveBtn.style.background = T.bgLight;
  };

  var doDelete = function() {
    resolveInterrupt();
    savedTabs = savedTabs.filter(function(t) { return t.id !== tab.id; });
    dismissOverlay();
    handleRecall();
  };

  interrupt('recall-action', {
    onBuild: function(el) {
      // Child panel — never override el positioning styles
      var panel = document.createElement('div');
      panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;width:360px;background:#1a1a1a;border:4px solid ' + T.mint + ';padding:20px;';

      if (tab.label) {
        var nameLbl = document.createElement('div');
        nameLbl.style.cssText = 'font-family:' + T.fb + ';font-size:22px;font-weight:bold;color:' + T.mint + ';letter-spacing:1px;';
        nameLbl.textContent = tab.label;
        panel.appendChild(nameLbl);
      }
      var checkLbl = document.createElement('div');
      checkLbl.style.cssText = 'font-family:' + T.fb + ';font-size:' + (tab.label ? '16px' : '20px') + ';color:' + (tab.label ? T.mutedText : T.mint) + ';letter-spacing:1px;margin-bottom:6px;';
      checkLbl.textContent = tab.checkNum;
      panel.appendChild(checkLbl);

      var recallBtn = buildButton('//RECALL//', {
        fill: T.goGreen, color: T.bg, fontSize: '26px', height: 50,
        onTap: function() {
          if (ticket.length > 0) {
            resolveInterrupt(); // close recall-action so confirm-clear can open
            interrupt('confirm-clear', {
              onBuild: function(cel) {
                var cpanel = document.createElement('div');
                cpanel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;width:320px;background:#1a1a1a;border:4px solid ' + T.gold + ';padding:20px;';
                var clbl = document.createElement('div');
                clbl.style.cssText = 'font-family:' + T.fb + ';font-size:20px;color:' + T.gold + ';letter-spacing:1px;text-align:center;';
                clbl.textContent = 'Clear current ticket?';
                cpanel.appendChild(clbl);
                var yesBtn = buildButton('YES — CLEAR', {
                  fill: T.red, color: '#fff', fontSize: '24px', height: 46,
                  onTap: function() { resolveInterrupt(); doLoad(); },
                });
                yesBtn.style.width = '240px';
                var noBtn = buildButton('CANCEL', {
                  fill: T.bgLight, color: T.mint, fontSize: '24px', height: 46,
                  onTap: function() { cancelInterrupt(); },
                });
                noBtn.style.width = '240px';
                cpanel.appendChild(yesBtn);
                cpanel.appendChild(noBtn);
                cel.appendChild(cpanel);
              },
            }).catch(function() {});
          } else {
            doLoad();
          }
        },
      });
      recallBtn.style.width = '280px';

      var deleteBtn = buildButton('//DELETE//', {
        fill: T.red, color: '#fff', fontSize: '26px', height: 50,
        onTap: doDelete,
      });
      deleteBtn.style.width = '280px';

      var cancelBtn = buildButton('CANCEL', {
        fill: T.bgLight, color: T.mint, fontSize: '22px', height: 40,
        onTap: function() { cancelInterrupt(); },
      });
      cancelBtn.style.width = '280px';

      panel.appendChild(recallBtn);
      panel.appendChild(deleteBtn);
      panel.appendChild(cancelBtn);
      el.appendChild(panel);
    },
  }).catch(function() {});
}
// ── BOTTOM BAR STATE ─────────────────────────────
function updateBottomBar() {
  var voidBtn = document.getElementById('void-btn');
  if (!voidBtn) return;
  var selected = ticket.filter(function(i) { return i.selected; });
  var unsentSelected = selected.length > 0 && selected.every(function(i) { return !i.sent; });
  var inner = voidBtn.firstElementChild;
  if (inner) inner.textContent = unsentSelected ? '//DELETE//' : '//VOID//';
}

async function handlePay(params) {
  if (ticket.length === 0) return;

  // If SEND was never tapped, create the order now before navigating
  if (!currentOrderId) {
    await handleSend();
  }

  if (!currentOrderId) {
    console.warn('[KINDpos] Failed to create order — cannot proceed to payment');
    return;
  }

  var totals = computeTotals();
  var items  = Object.keys(totals.counts).map(function(name) {
    return { name: name, qty: totals.counts[name].qty, unitPrice: totals.counts[name].unitPrice };
  });

  push('receipt-review', {
    orderId:     currentOrderId,
    checkId:     currentCheckNumber,
    items:       items,
    subtotal:    totals.subtotal,
    tax:         totals.tax,
    cardTotal:   totals.cardTotal,
    cashPrice:   totals.cashPrice,
    returnScene: 'order-entry',
  });
}