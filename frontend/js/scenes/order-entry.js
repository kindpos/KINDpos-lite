// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Order Entry Scene
//  Ticket panel left | Hex Nav canvas right
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { registerScene, push, replace, overlay, dismissOverlay, interrupt, resolveInterrupt, cancelInterrupt, clearSceneCache } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { HexNav } from '../hex-nav.js';
import { buildNumpad } from '../numpad.js';
import { showKeyboard } from '../keyboard.js';
import { showHalfPlacementOverlay } from '../half-placement-overlay.js';
import { PREFIXES as UNI_PREFIXES, getModHexData, hasPizzaCategory, PIZZA_PLACEMENTS, MOD_COLORS } from '../data/universal-modifiers.js';

var PAD      = 16;
var GAP      = 16;
var TICKET_W = 280;
var BTN_H    = 50;
var OVERLAP  = 18;

// ── Pricing constants (defaults, overwritten by /api/v1/config/pricing) ──
var TAX_RATE      = 0.07;
var CASH_DISCOUNT = 0.04;
// Fetch canonical rates from backend so FE/BE always agree
fetch('/api/v1/config/pricing').then(function(r) { return r.json(); }).then(function(d) {
  if (d.tax_rate != null)           TAX_RATE      = d.tax_rate;
  if (d.cash_discount_rate != null) CASH_DISCOUNT = d.cash_discount_rate;
}).catch(function() { /* keep defaults on network error */ });

// ── API ───────────────────────────────────────────
var API = '/api/v1';

// ── Order ID — one per transaction, reset on fresh enter ──
var currentOrderId = null;
var isSending = false;   // guard against concurrent handleSend calls

function _idemKey() {
  return 'ik_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}
var currentCheckNumber = null;

// ── Menu data ─────────────────────────────────────
var MENU_DATA = [
  {
    id: 'pizza', label: 'PIZZA', color: T.catColor('PIZZA'), textColor: '#1a0a0a',
    subcats: [
      { id: 'pizza-items', label: 'Pizza', items: [
        { label: 'Large Cheese', price: 14.00, requiredMods: [
          { id: 'toppings', label: 'TOPPINGS', color: T.red, textColor: '#fff', choices: [
            { label: 'Pepperoni', price: 1.50 }, { label: 'Sausage', price: 1.50 },
            { label: 'Mushrooms', price: 1.00 }, { label: 'Onions', price: 1.00 },
            { label: 'Peppers', price: 1.00 }, { label: 'Extra Cheese', price: 2.00 },
          ] }
        ] },
        { label: 'Large Pepperoni', price: 16.00 },
        { label: 'Large Supreme', price: 18.00 },
        { label: 'Slice Cheese', price: 3.50 },
        { label: 'Slice Pepperoni', price: 4.00 },
        { label: 'Calzone', price: 12.00 },
      ] },
    ]
  },
  {
    id: 'apps', label: 'APPS', color: T.catColor('APPS'), textColor: '#1a1a00',
    subcats: [
      { id: 'apps-items', label: 'Appetizers', items: [
        { label: 'Garlic Knots', price: 6.00 },
        { label: 'Mozz Sticks', price: 8.00 },
        { label: 'Buffalo Wings', price: 10.00 },
        { label: 'Garlic Bread', price: 5.00 },
      ] },
    ]
  },
  {
    id: 'subs', label: 'SUBS', color: T.catColor('SUBS'), textColor: '#1a2a1a',
    subcats: [
      { id: 'subs-items', label: 'Subs', items: [
        { label: 'Italian Sub', price: 10.00 },
        { label: 'Meatball Sub', price: 9.00 },
        { label: 'Chicken Parm Sub', price: 11.00 },
      ] },
    ]
  },
  {
    id: 'sides', label: 'SIDES', color: T.catColor('SIDES'), textColor: '#001a1a',
    subcats: [
      { id: 'side-items', label: 'Sides', items: [
        { label: 'House Salad', price: 7.00, requiredMods: [
          { id: 'dressing', label: 'DRESSING', color: T.cyan, textColor: '#001a1a', choices: [
            { label: 'Ranch', price: 0 }, { label: 'Blue Cheese', price: 0 },
            { label: 'Italian', price: 0 }, { label: 'Caesar', price: 0 },
          ] }
        ] },
        { label: 'Caesar Salad', price: 8.00 },
        { label: 'Fries', price: 4.00 },
      ] },
    ]
  },
  {
    id: 'drinks', label: 'DRINKS', color: T.catColor('DRINKS'), textColor: '#001a1a',
    subcats: [
      { id: 'drinks-items', label: 'Drinks', items: [
        { label: 'Soda', price: 2.50 },
        { label: 'Iced Tea', price: 2.50 },
        { label: 'Water', price: 1.50 },
      ] },
    ]
  },
];

var MOD_DATA = [
  {
    id: 'toppings', label: 'TOPPINGS', color: T.red, textColor: '#fff',
    half_placement: true,
    subcats: [
      { id: 'toppings-items', label: 'Toppings', items: [
        { label: 'Pepperoni', price: 1.50, half_price: 0.75 },
        { label: 'Sausage', price: 1.50, half_price: 0.75 },
        { label: 'Mushrooms', price: 1.00, half_price: 0.50 },
        { label: 'Onions', price: 1.00, half_price: 0.50 },
        { label: 'Peppers', price: 1.00, half_price: 0.50 },
        { label: 'Extra Cheese', price: 2.00, half_price: 1.00 },
      ] },
    ]
  },
  {
    id: 'dressing', label: 'DRESSING', color: T.cyan, textColor: '#001a1a',
    subcats: [
      { id: 'dressing-items', label: 'Dressing', items: [
        { label: 'Ranch', price: 0 },
        { label: 'Blue Cheese', price: 0 },
        { label: 'Italian', price: 0 },
        { label: 'Caesar', price: 0 },
      ] },
    ]
  },
];

// ── Combo flow state ─────────────────────────────
var comboFlow    = null;  // { step: 'side'|'drink', ticketItem: ref }

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
var modHistory   = [];    // [{inst, mod}] — undo stack for modifier additions
var _tabCanvas   = null;  // DOM refs for tab switching from CONFIRM
var _tabItemsBtn = null;
var _tabModsBtn  = null;
var _bottomBar   = null;  // DOM ref for bottom action bar
var _mainArea    = null;  // DOM ref for right panel

// ── Batch Modifier Session ───────────────────────
var modifierSession = {
  active: false,
  selectedItems: [],      // ticket item ids currently selected
  activePrefix: null,     // currently active prefix id or null
  activePlacement: null,  // 'whole'|'left'|'right' for pizza, null otherwise
  appliedMods: [],        // [{ prefixId, prefixLabel, modId, modLabel, affectedItemIds, modRefs, placement }]
  panelEl: null,          // DOM ref for modifier panel
  hexNav: null,           // HexNav instance for modifier browsing
  hasPizza: false,        // whether selected items include pizza category
};

// ── Void reasons ─────────────────────────────────
var VOID_REASONS = ['Mistake', 'Kitchen Error', 'Customer Request', 'Manager Comp', 'Other'];

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
    setHeaderBack({ x: true });
    activeTab      = 'items';
    activePrefix   = 'add';
    ticket         = [];
    ticketSeq      = 0;
    sceneParams    = params || {};
    prefixCard     = null;
    saveBtn        = null;
    currentOrderId = null;   // soft reset — ID assigned on first SEND
    isSending      = false;
    currentCheckNumber = null;
    customerName   = '';     // reset tab name
    modHistory     = [];     // reset undo stack
    modifierSession = { active: false, selectedItems: [], activePrefix: null, activePlacement: null, appliedMods: [], panelEl: null, hexNav: null, hasPizza: false };
    _bottomBar     = null;
    _mainArea      = null;

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

    if (params && params.autoRecall) {
      setTimeout(function() { handleRecall(); }, 100);
    }
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
    'padding-right:' + GAP + 'px;',
  ].join('');

  // SAVE / RECALL
  var topRow = document.createElement('div');
  topRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px;flex-shrink:0;';

  saveBtn = buildButton('SAVE', {
    fill: T.mint, color: T.bgDark, fontSize: '26px', height: 36, fontFamily: T.fh,
    onTap: function() { handleSave(); },
  });

  var recallBtnEl = buildButton('RECALL', {
    fill: T.mint, color: T.bgDark, fontSize: '26px', height: 36, fontFamily: T.fh,
    onTap: function() { handleRecall(); },
  });

  topRow.appendChild(saveBtn);
  topRow.appendChild(recallBtnEl);

  // Item list
  var itemList = document.createElement('div');
  itemList.id = 'ticket-list';
  itemList.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:4px;scrollbar-width:none;-ms-overflow-style:none;';
  panel.appendChild(itemList);

  // Summary + Totals — combined card with sunken bevel
  var summaryTotals = document.createElement('div');
  summaryTotals.style.cssText = 'background:' + T.bgDark + ';padding:4px;flex-shrink:0;';
  applySunkenStyle(summaryTotals);
  summaryTotals.appendChild(buildSummaryRow('Subtotal', '$0.00', 'ticket-subtotal'));
  summaryTotals.appendChild(buildSummaryRow('Tax',      '$0.00', 'ticket-tax'));
  var mintSep = document.createElement('div');
  mintSep.style.cssText = 'height:2px;background:' + T.mint + ';margin:2px 0;';
  summaryTotals.appendChild(mintSep);
  summaryTotals.appendChild(buildTotalRow('Total', '$0.00', 'ticket-total'));
  summaryTotals.appendChild(buildTotalRow('Cash',  '$0.00', 'ticket-cash'));
  panel.appendChild(summaryTotals);

  // SAVE / RECALL below totals
  panel.appendChild(topRow);

  return panel;
}

function buildSummaryRow(label, value, id) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';line-height:0.92;';
  var valEl = document.createElement('span');
  if (id) valEl.id = id;
  valEl.textContent = value;
  row.innerHTML = '<span>' + label + '</span>';
  row.appendChild(valEl);
  return row;
}

function buildTotalRow(label, value, id) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:40px;font-weight:bold;color:' + T.gold + ';line-height:0.92;';
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
    'align-items:center;flex-wrap:wrap;',
  ].join('');

  // Label
  var lbl = document.createElement('span');
  lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mutedText + ';flex-shrink:0;margin-right:2px;';
  lbl.textContent = 'PREFIX:';
  card.appendChild(lbl);

  // Prefix buttons
  var btnEls = {};
  PREFIXES.forEach(function(p) {
    var pair = buildStyledButton(activePrefix === p.id ? p.color : T.bgDark);
    pair.wrap.style.height = '40px';
    pair.wrap.style.flex   = '1';
    pair.inner.style.fontFamily = T.fb;
    pair.inner.style.fontSize   = T.fsBtn;
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

  // ── UNDO + CONFIRM row ──
  var actionRow = document.createElement('div');
  actionRow.style.cssText = 'display:flex;gap:6px;width:100%;margin-top:2px;';

  var undoPair = buildStyledButton(T.bgDark);
  undoPair.wrap.style.height = '40px';
  undoPair.wrap.style.flex   = '1';
  undoPair.inner.style.fontFamily = T.fb;
  undoPair.inner.style.fontSize   = T.fsBtn;
  undoPair.inner.style.color      = T.red;
  undoPair.inner.textContent = 'UNDO';
  undoPair.wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + T.red + 'aa)';
  undoPair.wrap.addEventListener('pointerup', function() {
    if (modHistory.length === 0) return;
    var last = modHistory.pop();
    var idx = last.inst.mods.indexOf(last.mod);
    if (idx !== -1) last.inst.mods.splice(idx, 1);
    renderTicket();
    rebuildBottomBar();
  });
  actionRow.appendChild(undoPair.wrap);

  var confirmPair = buildStyledButton(T.goGreen);
  confirmPair.wrap.style.height = '40px';
  confirmPair.wrap.style.flex   = '2';
  confirmPair.inner.style.fontFamily = T.fb;
  confirmPair.inner.style.fontSize   = T.fsBtn;
  confirmPair.inner.style.color      = '#1a2a1a';
  confirmPair.inner.textContent = 'CONFIRM';
  confirmPair.wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + T.goGreen + 'aa)';
  confirmPair.wrap.addEventListener('pointerup', function() {
    // Deselect all items and clear undo history
    ticket.forEach(function(i) { i.selected = false; });
    modifierSession.selectedItems = [];
    modHistory = [];
    renderTicket();
    rebuildBottomBar();
    // Switch back to ADD ITEMS tab
    switchTab('items');
  });
  actionRow.appendChild(confirmPair.wrap);

  card.appendChild(actionRow);

  card._btnEls = btnEls;
  prefixCard = card;
  return card;
}

// ── MAIN AREA ─────────────────────────────────────
function buildMain(parentEl, params) {
  var main = document.createElement('div');
  main.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
  _mainArea = main;

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
  bottom.id = 'bottom-bar';
  bottom.style.cssText = [
    'display:grid;',
    'grid-template-columns:1fr 1fr 1fr 1fr 1fr;',
    'grid-template-rows:auto auto;',
    'gap:6px;padding:9px;padding-top:0;padding-bottom:10px;row-gap:16px;',
    'position:relative;z-index:2;',
    'margin-top:-' + OVERLAP + 'px;',
  ].join('');
  _bottomBar = bottom;

  // Store refs
  _tabCanvas   = canvas;

  // Build bottom bar initial state (idle)
  rebuildBottomBar(params);

  main.appendChild(bottom);

  requestAnimationFrame(function() {
    hexNav = new HexNav(canvas, {
      data: MENU_DATA,
      onSelect: function(item) { handleItemSelect(item); },
      onToast: function(msg) { showToast(msg, { bg: '#555', duration: 2000 }); },
    });
  });

  return main;
}

// ── BOTTOM BAR — Three States ────────────────────
var _payParams = null; // stash params for PAY handler

function rebuildBottomBar(params) {
  if (params !== undefined) _payParams = params;
  if (!_bottomBar) return;
  _bottomBar.innerHTML = '';

  var selectedIds = modifierSession.selectedItems;
  var hasSelection = selectedIds.length > 0;

  if (modifierSession.active) {
    // ── State C: Session Active — UNDO + FINALIZE ──
    var undoBtn = buildButton('UNDO', { fill: T.darkBtn, color: T.red, fontSize: '26px', fontFamily: T.fh });
    undoBtn.style.gridColumn = '1 / 3';
    undoBtn.style.gridRow = '1';
    undoBtn.style.height = '100%';
    undoBtn.style.position = 'relative';
    undoBtn.style.overflow = 'hidden';

    // Hold-to-cancel fill indicator
    var holdFill = document.createElement('div');
    holdFill.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:' + T.mint + ';opacity:0.3;pointer-events:none;z-index:1;';
    undoBtn.appendChild(holdFill);

    var holdTimer = null;
    var didHold = false;
    undoBtn.addEventListener('pointerdown', function(e) {
      e.stopPropagation();
      didHold = false;
      holdFill.style.transition = 'width 600ms linear';
      holdFill.style.width = '100%';
      holdTimer = setTimeout(function() {
        didHold = true;
        holdFill.style.transition = 'none';
        holdFill.style.width = '0';
        cancelSession();
      }, 600);
    });
    undoBtn.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      clearTimeout(holdTimer);
      holdFill.style.transition = 'none';
      holdFill.style.width = '0';
      if (!didHold) undoLastMod();
    });
    undoBtn.addEventListener('pointerleave', function() {
      clearTimeout(holdTimer);
      holdFill.style.transition = 'none';
      holdFill.style.width = '0';
    });

    var finalizeBtn = buildButton('FINALIZE', { fill: T.gold, color: T.bg, fontSize: '26px', fontFamily: T.fh,
      onTap: function() { finalizeSession(); },
    });
    finalizeBtn.style.gridColumn = '3 / 6';
    finalizeBtn.style.gridRow = '1';
    finalizeBtn.style.height = '100%';

    _bottomBar.appendChild(undoBtn);
    _bottomBar.appendChild(finalizeBtn);
    return;
  }

  // ── Row 1: ADD ITEMS tab + optional MODIFY button ──
  if (hasSelection && !modifierSession.active) {
    var addBtn = buildButton('ADD ITEMS', {
      fill: T.mint, color: T.bg, fontSize: '26px', fontFamily: T.fh,
      onTap: function() { clearModifierSelection(); },
    });
    addBtn.style.gridColumn = '1 / 3';
    addBtn.style.gridRow = '1';
    addBtn.style.height = '100%';

    // State B: Items Selected — show MODIFY
    var modifyBtn = buildButton('MODIFY', { fill: T.gold, color: T.bg, fontSize: '26px', fontFamily: T.fh,
      onTap: function() { openModifierSession(); },
    });
    modifyBtn.style.gridColumn = '3 / 6';
    modifyBtn.style.gridRow = '1';
    modifyBtn.style.height = '100%';

    _bottomBar.appendChild(addBtn);
    _bottomBar.appendChild(modifyBtn);
  } else {
    // State A: Idle — ADD ITEMS only (no MODIFY ITEMS tab)
    var tabItems = buildButton('ADD ITEMS', {
      fill: T.mint, color: T.bg, fontSize: '26px', fontFamily: T.fh,
    });
    tabItems.style.gridColumn = '1 / 5';
    tabItems.style.gridRow    = '1';
    tabItems.style.height = '100%';
    _tabItemsBtn = tabItems;

    _bottomBar.appendChild(tabItems);
  }

  // ── Row 2: Action buttons (always present when not in session) ──
  var disc  = buildButton('DISC', { fill: T.mint, color: T.bgDark, fontSize: '26px', fontFamily: T.fh,
    onTap: function() { handleDiscount(); },
  });
  var voidB = buildButton('VOID', { fill: T.red, color: '#fff', fontSize: '26px', fontFamily: T.fh,
    onTap: function() { handleVoid(); },
  });
  voidB.id = 'void-btn';
  var print = buildButton('PRINT', { fill: T.cyan, color: T.bg, fontSize: '26px', fontFamily: T.fh,
    onTap: function() {
      if (!currentOrderId) return;
      fetch(API + '/print/receipt/' + currentOrderId + '?copy_type=itemized', { method: 'POST' })
        .catch(function(err) { console.warn('[KINDpos] Itemized print failed:', err); });
    },
  });
  var pay = buildButton('PAY', { fill: T.gold, color: T.bg, fontSize: '26px', fontFamily: T.fh,
    onTap: function() { handlePay(_payParams); },
  });
  var allSent = ticket.length > 0 && ticket.every(function(i) { return i.sent; });
  var sendLabel = allSent ? 'RESEND' : 'SEND';
  var send = buildButton(sendLabel, { fill: T.goGreen, color: T.bg, fontSize: '26px', fontFamily: T.fh,
    onTap: function() { handleSend(); },
  });

  disc.style.gridColumn  = '1'; disc.style.gridRow  = '2'; disc.style.height = '100%';
  voidB.style.gridColumn = '2'; voidB.style.gridRow = '2'; voidB.style.height = '100%';
  print.style.gridColumn = '3'; print.style.gridRow = '2'; print.style.height = '100%';
  pay.style.gridColumn   = '4'; pay.style.gridRow   = '2'; pay.style.height = '100%';
  send.style.gridColumn  = '5'; send.style.gridRow  = '2'; send.style.height = '100%';

  [disc, voidB, print, pay, send].forEach(function(b) { _bottomBar.appendChild(b); });

  // Update void/delete label
  var selected = ticket.filter(function(i) { return i.selected; });
  var unsentSelected = selected.length > 0 && selected.every(function(i) { return !i.sent; });
  var vInner = voidB.firstElementChild;
  if (vInner) vInner.textContent = unsentSelected ? 'DELETE' : 'VOID';
}

function clearModifierSelection() {
  modifierSession.selectedItems = [];
  ticket.forEach(function(i) { i.selected = false; });
  renderTicket();
  rebuildBottomBar();
}

// ── MODIFIER SESSION ─────────────────────────────
function openModifierSession() {
  if (modifierSession.active) return;
  // Filter to unsent items only
  var ids = modifierSession.selectedItems;
  var items = ticket.filter(function(i) { return ids.indexOf(i.id) !== -1 && !i.sent; });
  if (items.length === 0) {
    showToast('No unsent items selected', { bg: '#555', duration: 2000 });
    return;
  }
  modifierSession.active = true;
  modifierSession.selectedItems = items.map(function(i) { return i.id; });
  modifierSession.activePrefix = null;
  modifierSession.activePlacement = null;
  modifierSession.appliedMods = [];

  // Detect pizza items for placement
  var catIds = [];
  items.forEach(function(i) {
    if (i.category && catIds.indexOf(i.category) === -1) catIds.push(i.category);
  });
  modifierSession.hasPizza = hasPizzaCategory(catIds);
  modifierSession._catIds = catIds;

  // Hide hex canvas, show modifier panel
  if (_tabCanvas) _tabCanvas.style.display = 'none';

  var panel = buildModifierPanel(catIds);
  modifierSession.panelEl = panel;
  if (_mainArea && _bottomBar) {
    _mainArea.insertBefore(panel, _bottomBar);
  }

  // Init HexNav after panel is in the DOM so it gets correct dimensions
  if (panel._initHexNav) panel._initHexNav();

  rebuildBottomBar();
  renderTicket();
}

function buildPlacementBar() {
  var plColor = MOD_COLORS.pizza.color;
  var plText  = MOD_COLORS.pizza.textColor;
  var dimText = '#7a4045';

  var styled = buildStyledButton(T.darkBtn);
  styled.wrap.style.flexShrink = '0';
  styled.inner.style.height = '38px';
  styled.inner.style.display = 'flex';
  styled.inner.style.alignItems = 'stretch';
  styled.inner.style.justifyContent = 'stretch';
  styled.inner.style.padding = '0';

  var segments = {};
  var order = ['left', 'whole', 'right'];

  order.forEach(function(id, i) {
    var pl = PIZZA_PLACEMENTS.find(function(p) { return p.id === id; });
    if (!pl) return;
    var isActive = modifierSession.activePlacement === id;

    if (i > 0) {
      var div = document.createElement('div');
      div.style.cssText = 'width:2px;background:' + T.bgEdge + ';flex-shrink:0;align-self:stretch;';
      styled.inner.appendChild(div);
    }

    var seg = document.createElement('div');
    seg.style.cssText = [
      'flex:' + (id === 'whole' ? '2' : '1') + ';',
      'display:flex;align-items:center;justify-content:center;',
      'font-family:' + T.fh + ';font-size:22px;',
      'background:' + (isActive ? plColor : 'transparent') + ';',
      'color:' + (isActive ? plText : dimText) + ';',
      'cursor:pointer;transition:background 80ms,color 80ms;',
    ].join('');
    seg.textContent = pl.label;

    seg.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      modifierSession.activePlacement = id;
      refreshPlacementBar();
    });

    styled.inner.appendChild(seg);
    segments[id] = seg;
  });

  return { wrap: styled.wrap, segments: segments, plColor: plColor, plText: plText, dimText: dimText };
}

function refreshPlacementBar() {
  var panel = modifierSession.panelEl;
  if (!panel || !panel._placeBar) return;
  var bar = panel._placeBar;

  ['left', 'whole', 'right'].forEach(function(id) {
    var seg = bar.segments[id];
    if (!seg) return;
    var isActive = modifierSession.activePlacement === id;
    seg.style.background = isActive ? bar.plColor : 'transparent';
    seg.style.color = isActive ? bar.plText : bar.dimText;
  });
}

function buildModifierPanel(catIds) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;display:flex;flex-direction:column;gap:4px;',
    'background:' + T.bg5 + ';',
    'border:7px solid ' + T.gold + ';',
    'padding:6px;overflow:hidden;',
    'margin-bottom:0;padding-bottom:' + OVERLAP + 'px;',
  ].join('');

  // ── PREFIX ROW ──
  var prefixRow = document.createElement('div');
  prefixRow.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';
  panel._prefixBtns = {};

  UNI_PREFIXES.forEach(function(p) {
    var isActive = modifierSession.activePrefix === p.id;
    var pDef = PREFIXES.find(function(x) { return x.id === p.id; }) || {};
    var pColor = pDef.color || T.bgLight;
    var pTextColor = pDef.textColor || '#fff';

    var btn = buildButton(p.label, {
      fill: isActive ? pColor : T.darkBtn,
      color: isActive ? pTextColor : pColor,
      fontSize: '26px',
      fontFamily: T.fh,
    });
    btn.style.flex = '1';
    btn.style.height = '44px';

    btn.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      modifierSession.activePrefix = (modifierSession.activePrefix === p.id) ? null : p.id;
      refreshModifierPanel();
    });

    panel._prefixBtns[p.id] = btn;
    prefixRow.appendChild(btn);
  });
  panel.appendChild(prefixRow);

  // ── PIZZA PLACEMENT CARD — wide chamfered bar with 3 segments ──
  if (modifierSession.hasPizza) {
    if (!modifierSession.activePlacement) modifierSession.activePlacement = 'whole';
    var placeBar = buildPlacementBar();
    panel._placeBar = placeBar;
    panel.appendChild(placeBar.wrap);
  }

  // ── MODIFIER HEXNAV ──
  var hexCanvas = document.createElement('div');
  hexCanvas.style.cssText = 'flex:1;position:relative;overflow:hidden;';
  panel._hexCanvas = hexCanvas;
  panel.appendChild(hexCanvas);

  // Build HexNav data filtered by categories
  // Double-rAF ensures the flex container has laid out before HexNav reads dimensions
  var modData = getModHexData(catIds || []);
  panel._modData = modData;
  panel._hexCanvasRef = hexCanvas;
  panel._initHexNav = function() {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (!modifierSession.active) return;
        var nav = new HexNav(hexCanvas, {
          data: modData,
          scale: 0.7,
          onSelect: function(item) { applyModifier(item); },
          onToast: function(msg) { showToast(msg, { bg: '#555', duration: 2000 }); },
        });
        modifierSession.hexNav = nav;
      });
    });
  };

  // ── APPLIED MODS LOG ──
  var logWrap = document.createElement('div');
  logWrap.style.cssText = [
    'max-height:100px;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
    'background:' + T.bgDark + ';padding:4px 8px;flex-shrink:0;',
  ].join('');
  applySunkenStyle(logWrap);
  panel._log = logWrap;
  panel.appendChild(logWrap);

  // Init log
  renderAppliedModsLog(panel);

  return panel;
}

function applyModifier(mod) {
  if (!modifierSession.activePrefix) {
    showToast('Select a prefix first', { bg: '#555', duration: 2000 });
    return;
  }
  var prefix = UNI_PREFIXES.find(function(p) { return p.id === modifierSession.activePrefix; });
  if (!prefix) return;

  var placement = modifierSession.hasPizza ? (modifierSession.activePlacement || 'whole') : null;
  var modName = prefix.label + ' ' + mod.label;
  var modRefs = [];

  modifierSession.selectedItems.forEach(function(id) {
    var inst = ticket.find(function(i) { return i.id === id; });
    if (!inst) return;
    var isPizza = inst.category === 'pizza';
    var halfSide = null;
    if (isPizza && placement === 'left') halfSide = 'Left';
    else if (isPizza && placement === 'right') halfSide = 'Right';

    var modObj = { name: modName, price: 0, charged: false, prefix: halfSide };
    inst.mods.push(modObj);
    modRefs.push({ inst: inst, mod: modObj });
  });

  var logLabel = modName;
  modifierSession.appliedMods.push({
    prefixId: prefix.id,
    prefixLabel: prefix.label,
    modId: mod.id || mod.label,
    modLabel: mod.label,
    placement: placement,
    affectedItemIds: modifierSession.selectedItems.slice(),
    modRefs: modRefs,
    logLabel: logLabel,
  });

  renderTicket();
  refreshModifierPanel();
}

function refreshModifierPanel() {
  var panel = modifierSession.panelEl;
  if (!panel) return;

  // Refresh prefix button states
  UNI_PREFIXES.forEach(function(p) {
    var btn = panel._prefixBtns[p.id];
    if (!btn) return;
    var isActive = modifierSession.activePrefix === p.id;
    var pDef = PREFIXES.find(function(x) { return x.id === p.id; }) || {};
    var pColor = pDef.color || T.bgLight;
    var pTextColor = pDef.textColor || '#fff';
    var inner = btn.firstElementChild || btn.querySelector('div');
    if (inner) {
      inner.style.background = isActive ? pColor : T.darkBtn;
      inner.style.color = isActive ? pTextColor : pColor;
    }
  });

  // Refresh placement bar (pizza)
  refreshPlacementBar();

  // Refresh applied mods log
  renderAppliedModsLog(panel);
}

function renderAppliedModsLog(panel) {
  var log = panel._log;
  if (!log) return;
  log.innerHTML = '';

  if (modifierSession.appliedMods.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'font-family:' + T.fb + ';font-size:30px;color:' + T.mutedText + ';text-align:center;padding:4px 0;';
    empty.textContent = 'No modifiers applied';
    log.appendChild(empty);
    return;
  }

  modifierSession.appliedMods.forEach(function(entry) {
    var row = document.createElement('div');
    row.style.cssText = 'font-family:' + T.fb + ';font-size:30px;color:' + T.gold + ';line-height:1.2;';
    row.textContent = entry.logLabel || (entry.prefixLabel + ' \u2192 ' + entry.modLabel);
    log.appendChild(row);
  });

  log.scrollTop = log.scrollHeight;
}

function undoLastMod() {
  if (modifierSession.appliedMods.length === 0) return;
  var last = modifierSession.appliedMods.pop();

  // Remove the mod from all affected items
  last.modRefs.forEach(function(ref) {
    var idx = ref.inst.mods.indexOf(ref.mod);
    if (idx !== -1) ref.inst.mods.splice(idx, 1);
  });

  // Reset prefix if no more mods
  if (modifierSession.appliedMods.length === 0) {
    modifierSession.activePrefix = null;
  }

  renderTicket();
  refreshModifierPanel();
}

function cancelSession() {
  // Roll back ALL mods in reverse order
  while (modifierSession.appliedMods.length > 0) {
    var entry = modifierSession.appliedMods.pop();
    entry.modRefs.forEach(function(ref) {
      var idx = ref.inst.mods.indexOf(ref.mod);
      if (idx !== -1) ref.inst.mods.splice(idx, 1);
    });
  }
  endModifierSession();
}

function finalizeSession() {
  // Mods are already on ticket items — just close the session
  endModifierSession();
}

function endModifierSession() {
  modifierSession.active = false;
  modifierSession.activePrefix = null;
  modifierSession.activePlacement = null;
  modifierSession.appliedMods = [];
  modifierSession.hasPizza = false;

  // Destroy modifier hex nav
  if (modifierSession.hexNav) {
    modifierSession.hexNav.destroy();
    modifierSession.hexNav = null;
  }

  // Remove panel
  if (modifierSession.panelEl && modifierSession.panelEl.parentNode) {
    modifierSession.panelEl.parentNode.removeChild(modifierSession.panelEl);
  }
  modifierSession.panelEl = null;

  // Clear selection
  modifierSession.selectedItems = [];
  ticket.forEach(function(i) { i.selected = false; });

  // Restore hex canvas
  if (_tabCanvas) _tabCanvas.style.display = '';

  renderTicket();
  rebuildBottomBar();

  // Reset hex nav if needed
  if (hexNav) hexNav.reset();
}

// ── TAB SWITCHING ─────────────────────────────────
function switchTab(tab) {
  activeTab = tab || 'items';
  if (_tabCanvas) {
    _tabCanvas.style.borderColor = T.mint;
    _tabCanvas.style.borderTop = '';
  }
  if (hexNav) hexNav.setData(MENU_DATA);
}

// ── TICKET ────────────────────────────────────────
function getMenuCat(id) {
  return MENU_DATA.find(function(c) { return c.id === id; });
}

function getModCat(id) {
  return MOD_DATA.find(function(c) { return c.id === id; });
}

function handleItemSelect(item) {
  var name  = item.label || item;
  var price = typeof item.price === 'number' ? item.price : 0;

  // ── Combo flow: picking side or soda ──
  if (comboFlow) {
    if (comboFlow.step === 'side') {
      comboFlow.ticketItem.mods.push({ name: name, price: 0, charged: false });
      comboFlow.step = 'drink';
      var drinksCat = getMenuCat('drinks');
      hexNav.showPickList('DRINKS', drinksCat.color, drinksCat.textColor, drinksCat.subcats[0].items);
      renderTicket();
      rebuildBottomBar();
      return;
    }
    if (comboFlow.step === 'drink') {
      comboFlow.ticketItem.mods.push({ name: name, price: 0, charged: false });
      comboFlow = null;
      hexNav.unlockNav();
      hexNav.reset();
      renderTicket();
      rebuildBottomBar();
      return;
    }
  }

  // ── Start combo flow if selected from COMBO category ──
  if (hexNav && hexNav.getCatId() === 'combo') {
    var comboMods = [];
    if (item.selectedMods) {
      item.selectedMods.forEach(function(sm) {
        comboMods.push({ name: sm.label, price: sm.price || 0, charged: sm.price > 0 });
      });
    }
    var ticketItem = {
      id:        ++ticketSeq,
      idemKey:   _idemKey(),
      name:      'Combo ' + name,
      unitPrice: price,
      mods:      comboMods,
      selected:  false,
      sent:      false,
      category:  'combo',
    };
    ticket.push(ticketItem);
    comboFlow = { step: 'side', ticketItem: ticketItem };
    hexNav.lockNav();
    var sidesCat = getMenuCat('sides');
    hexNav.showPickList('SIDES', sidesCat.color, sidesCat.textColor, sidesCat.subcats[0].items);
    renderTicket();
    rebuildBottomBar();
    return;
  }

  addToTicket(item);
}

function addToTicket(item) {
  var name  = item.label || item;
  var price = typeof item.price === 'number' ? item.price : 0;

  if (activeTab === 'modifiers') {
    // Apply modifier to all selected instances
    var selected = ticket.filter(function(i) { return i.selected; });
    if (selected.length === 0) {
      showToast('Select an item first', { bg: '#555', duration: 2000 });
      return;
    }

    // Check if current modifier category has half_placement
    var modCatId = hexNav ? hexNav.getCatId() : null;
    var modCat = modCatId ? getModCat(modCatId) : null;
    if (modCat && modCat.half_placement) {
      var halfPrice = typeof item.half_price === 'number' ? item.half_price : null;
      // Use first selected item for overlay context
      var targetInst = selected[0];
      showHalfPlacementOverlay(targetInst.name, name, price, halfPrice, targetInst.mods)
        .then(function(result) {
          selected.forEach(function(inst) {
            // Re-selection: if same mod on other side, move it
            var otherSide = result.side === 'Left' ? 'Right' : 'Left';
            for (var i = inst.mods.length - 1; i >= 0; i--) {
              if (inst.mods[i].name === name && inst.mods[i].prefix === otherSide) {
                inst.mods.splice(i, 1);
              }
            }
            var modPrice = halfPrice != null ? halfPrice : 0;
            var mod = { name: name, price: modPrice, half_price: halfPrice, charged: modPrice > 0, prefix: result.side };
            inst.mods.push(mod);
            modHistory.push({ inst: inst, mod: mod });
          });
          renderTicket();
          rebuildBottomBar();
        })
        .catch(function() { /* cancelled */ });
      return;
    }

    var pfx = PREFIXES.find(function(p) { return p.id === activePrefix; });
    var modName = (pfx ? pfx.label + ' ' : '') + name;
    var charged = price > 0;
    selected.forEach(function(inst) {
      var mod = { name: modName, price: price, charged: charged, prefix: null };
      inst.mods.push(mod);
      modHistory.push({ inst: inst, mod: mod });
    });
  } else {
    // New item instance
    var mods = [];
    if (item.selectedMods) {
      item.selectedMods.forEach(function(sm) {
        mods.push({ name: sm.label, price: sm.price || 0, charged: sm.price > 0 });
      });
    }
    ticket.push({
      id:        ++ticketSeq,
      idemKey:   _idemKey(),
      name:      name,
      unitPrice: price,
      mods:      mods,
      selected:  false,
      sent:      false,
      category:  hexNav ? hexNav.getCatId() : null,
    });
  }
  renderTicket();
  rebuildBottomBar();
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

    // Selection check: use modifierSession for batch flow, inst.selected for old tab flow
    var isSelected = function(inst) {
      if (modifierSession.selectedItems.length > 0 || modifierSession.active) {
        return modifierSession.selectedItems.indexOf(inst.id) !== -1;
      }
      return inst.selected;
    };
    var anySelected = instances.some(isSelected);
    var hasMods = instances.some(function(inst) { return inst.mods.length > 0; });

    if (!hasCharged && !anySelected && !hasMods) {
      // ── Collapsed group card ──────────────────────
      var groupPrice = instances.reduce(function(sum, i) {
        return sum + i.unitPrice + i.mods.reduce(function(ms, m) { return ms + m.price; }, 0);
      }, 0);

      var gc = document.createElement('div');
      gc.style.cssText = [
        'flex-shrink:0;cursor:pointer;touch-action:manipulation;',
        'background:#333333;',
        'border:4px solid ' + T.mint + ';',
      ].join('');

      var gRow = document.createElement('div');
      gRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 8px;';

      var allSent = instances.every(function(i) { return i.sent; });
      var gName = document.createElement('span');
      gName.style.cssText = 'font-family:' + T.fb + ';font-size:26px;font-weight:bold;color:' + T.mint + ';';
      gName.textContent = (allSent ? '\u2713 ' : '') + (instances.length > 1 ? instances.length + '\u00d7 ' : '') + name;

      var gPrice = document.createElement('span');
      gPrice.style.cssText = 'font-family:' + T.fb + ';font-size:26px;font-weight:bold;color:' + T.mint + ';';
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
        if (modifierSession.active) return; // locked during session
        // Toggle select all instances into modifierSession
        instances.forEach(function(i) {
          i.selected = true;
          if (modifierSession.selectedItems.indexOf(i.id) === -1) {
            modifierSession.selectedItems.push(i.id);
          }
        });
        renderTicket();
        rebuildBottomBar();
      });

      list.appendChild(gc);

    } else {
      // ── Individual instance cards ─────────────────
      instances.forEach(function(inst) {
        var active = isSelected(inst);
        var bg     = active ? '#2a3a28' : '#333333';
        var fg     = T.mint;
        var fsName = active ? T.fsItem : '26px';
        var fsMod  = active ? T.fsMod  : '24px';

        var ic = document.createElement('div');
        ic.style.cssText = [
          'flex-shrink:0;cursor:pointer;touch-action:manipulation;',
          'background:' + bg + ';',
          'border:4px solid ' + T.mint + ';',
          (active ? 'border-left:4px solid ' + T.mint + ';' : ''),
          'margin-bottom:2px;',
        ].join('');

        var iRow = document.createElement('div');
        iRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:' + (active ? '5px 8px' : '3px 8px') + ';';

        var iName = document.createElement('span');
        iName.style.cssText = 'font-family:' + T.fb + ';font-size:' + fsName + ';font-weight:bold;color:' + fg + ';';
        iName.textContent = (inst.sent ? '\u2713 ' : '') + (active ? '\u25cf ' : '') + inst.name;

        var iPrice = document.createElement('span');
        iPrice.style.cssText = 'font-family:' + T.fb + ';font-size:' + fsName + ';font-weight:bold;color:' + fg + ';';
        var total = inst.unitPrice + inst.mods.reduce(function(s, m) { return s + m.price; }, 0);
        iPrice.textContent = '$' + total.toFixed(2);

        iRow.appendChild(iName);
        iRow.appendChild(iPrice);
        ic.appendChild(iRow);

        // Show all mods when selected or when item has mods; charged only otherwise
        var visibleMods = (active || hasMods)
          ? inst.mods
          : inst.mods.filter(function(m) { return m.charged; });

        if (visibleMods.length > 0) {
          // Partition into whole / left / right
          var wholeMods = [];
          var leftMods = [];
          var rightMods = [];
          visibleMods.forEach(function(m) {
            if (m.prefix === 'Left') leftMods.push(m);
            else if (m.prefix === 'Right') rightMods.push(m);
            else wholeMods.push(m);
          });

          var hasHalf = leftMods.length > 0 || rightMods.length > 0;

          // Render whole mods flat
          if (wholeMods.length > 0) {
            ic.appendChild(buildSeparator());
            wholeMods.forEach(function(m) {
              ic.appendChild(buildModRowSized(m.name, m.price, fsMod));
            });
          }

          // Render L/R as a two-column table
          if (hasHalf) {
            ic.appendChild(buildHalfTable(leftMods, rightMods, fsMod));
          }
        }

        ic.addEventListener('pointerup', function() {
          if (modifierSession.active) return; // locked during session
          // Toggle selection in modifierSession
          var idx = modifierSession.selectedItems.indexOf(inst.id);
          if (idx !== -1) {
            modifierSession.selectedItems.splice(idx, 1);
            inst.selected = false;
          } else {
            modifierSession.selectedItems.push(inst.id);
            inst.selected = true;
          }
          renderTicket();
          rebuildBottomBar();
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
  sep.style.cssText = 'padding:0 8px;font-family:' + T.fb + ';font-size:' + T.fsMod + ';color:' + T.mintEdgeD + ';letter-spacing:2px;overflow:hidden;white-space:nowrap;line-height:1;';
  sep.textContent = '- - - - - - - - - - - - - - - - - -';
  return sep;
}

function buildModRow(name, price, dark, showPrice) {
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;justify-content:space-between;',
    'padding:2px 8px 2px 20px;',
    'font-family:' + T.fb + ';font-size:' + T.fsMod + ';font-weight:bold;',
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

function buildModRowSized(name, price, fontSize) {
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;justify-content:space-between;',
    'padding:1px 8px 1px 16px;',
    'font-family:' + T.fb + ';font-size:' + fontSize + ';font-weight:bold;',
    'color:' + T.gold + ';',
  ].join('');
  var n = document.createElement('span');
  n.textContent = name;
  var p = document.createElement('span');
  p.textContent = price > 0 ? '+$' + price.toFixed(2) : '';
  row.appendChild(n);
  if (price > 0) row.appendChild(p);
  return row;
}

function buildHalfTable(leftMods, rightMods, fontSize) {
  var table = document.createElement('div');
  table.style.cssText = 'padding:2px 8px;';

  // Divider
  var divTop = document.createElement('div');
  divTop.style.cssText = 'display:flex;border-bottom:1px solid ' + T.mintEdgeD + ';margin-bottom:1px;';
  var hdrL = document.createElement('div');
  hdrL.style.cssText = 'flex:1;font-family:' + T.fb + ';font-size:' + fontSize + ';font-weight:bold;color:' + T.gold + ';text-align:center;';
  hdrL.textContent = 'LEFT';
  var hdrSep = document.createElement('div');
  hdrSep.style.cssText = 'width:1px;background:' + T.mintEdgeD + ';margin:0 4px;';
  var hdrR = document.createElement('div');
  hdrR.style.cssText = 'flex:1;font-family:' + T.fb + ';font-size:' + fontSize + ';font-weight:bold;color:' + T.gold + ';text-align:center;';
  hdrR.textContent = 'RIGHT';
  divTop.appendChild(hdrL);
  divTop.appendChild(hdrSep);
  divTop.appendChild(hdrR);
  table.appendChild(divTop);

  // Rows — zip left and right
  var maxRows = Math.max(leftMods.length, rightMods.length);
  for (var i = 0; i < maxRows; i++) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;';

    var cellL = document.createElement('div');
    cellL.style.cssText = 'flex:1;font-family:' + T.fb + ';font-size:' + fontSize + ';color:' + T.mint + ';padding:0 4px;';
    // Strip (L)/(R) and prefix from display name for cleaner table
    cellL.textContent = leftMods[i] ? stripPlacementPrefix(leftMods[i].name) : '';

    var sep = document.createElement('div');
    sep.style.cssText = 'width:1px;background:' + T.mintEdgeD + ';margin:0 4px;';

    var cellR = document.createElement('div');
    cellR.style.cssText = 'flex:1;font-family:' + T.fb + ';font-size:' + fontSize + ';color:' + T.mint + ';padding:0 4px;text-align:right;';
    cellR.textContent = rightMods[i] ? stripPlacementPrefix(rightMods[i].name) : '';

    row.appendChild(cellL);
    row.appendChild(sep);
    row.appendChild(cellR);
    table.appendChild(row);
  }

  // Bottom divider
  var divBot = document.createElement('div');
  divBot.style.cssText = 'border-top:1px solid ' + T.mintEdgeD + ';margin-top:1px;';
  table.appendChild(divBot);

  return table;
}

function stripPlacementPrefix(name) {
  return name;
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
    rebuildBottomBar();
    return;
  }

  if (voidingEntireOrder && ticket.length === 0) return;

  // VOID flow — PIN then reason
  interrupt('void-pin', {
    reason: 'void',
    onBuild: function(el) { buildPinOverlay(el, function(manager) {
      if (!manager) { cancelInterrupt(); return; }
      resolveInterrupt();
      // Defer to next microtask so activeInterrupt is fully cleared
      var vTargets = voidingEntireOrder ? ticket : selected;
      var approvedBy = manager.id || manager.name || 'manager';
      setTimeout(function() { showVoidReasons(vTargets, voidingEntireOrder, approvedBy); }, 0);
    }); },
  }).catch(function() {});
}

function showVoidReasons(targets, isFullVoid, approvedBy) {
  interrupt('void-reason', {
    onBuild: function(el) {
      var panel = document.createElement('div');
      panel.style.cssText = [
        'display:flex;flex-direction:column;align-items:center;',
        'gap:10px;background:#1a1a1a;',
        'border:4px solid ' + T.red + ';padding:20px;min-width:280px;',
      ].join('');

      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.red + ';letter-spacing:2px;margin-bottom:4px;';
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
                body: JSON.stringify({ reason: r, approved_by: approvedBy }),
              }).then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                currentOrderId = null;
                currentCheckNumber = null;
                clearSceneCache('order-entry');
                replace('login');
              }).catch(function(err) {
                console.error('[KINDpos] Void API error:', err);
                showToast('Void failed — check connection');
                // Re-add items to ticket so state isn't lost
                targets.forEach(function(inst) { inst.voided = false; inst.voidReason = null; });
                ticket = ticket.concat(targets);
                renderTicket();
                rebuildBottomBar();
              });
            } else if (isFullVoid) {
              currentOrderId = null;
              currentCheckNumber = null;
              clearSceneCache('order-entry');
              replace('login');
            } else {
              renderTicket();
              rebuildBottomBar();
            }
          },
        });
        btn.style.width = '240px';
        panel.appendChild(btn);
      });

      var cancelBtn = buildButton('CANCEL', {
        fill: T.bgLight, color: T.red, fontSize: T.fsSmall, height: 40,
        onTap: function() { cancelInterrupt(); },
      });
      cancelBtn.style.width = '240px';
      panel.appendChild(cancelBtn);

      el.appendChild(panel);
    },
  }).catch(function() {});
}

// ── DISCOUNT OVERLAY ─────────────────────────────
var DISCOUNT_OPTIONS = ['10%', '15%', '20%', '25%', '50%', 'Comp (100%)'];

function handleDiscount() {
  if (ticket.length === 0) return;
  var selected = ticket.filter(function(i) { return i.selected; });
  if (selected.length === 0) {
    // Nothing selected — show hint via interrupt
    interrupt('disc-hint', {
      reason: 'no-selection',
      onBuild: function(el) {
        var panel = document.createElement('div');
        panel.style.cssText = [
          'display:flex;flex-direction:column;align-items:center;',
          'gap:10px;background:#1a1a1a;',
          'border:4px solid ' + T.gold + ';padding:20px;min-width:280px;',
        ].join('');
        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';text-align:center;';
        lbl.textContent = 'Select item(s) first, then tap DISC';
        panel.appendChild(lbl);
        var okBtn = buildButton('OK', {
          fill: T.gold, color: T.bg, fontSize: '22px', height: 40,
          onTap: function() { resolveInterrupt(); },
        });
        okBtn.style.width = '200px';
        panel.appendChild(okBtn);
        el.appendChild(panel);
      },
    }).catch(function() {});
    return;
  }

  // Show discount options — requires manager PIN first
  interrupt('disc-pin', {
    reason: 'discount',
    onBuild: function(el) { buildPinOverlay(el, function(manager) {
      if (!manager) { cancelInterrupt(); return; }
      resolveInterrupt();
      var approvedBy = manager.id || manager.name || 'manager';
      showDiscountOptions(selected, approvedBy);
    }); },
  }).catch(function() {});
}

function showDiscountOptions(targets, approvedBy) {
  interrupt('disc-select', {
    onBuild: function(el) {
      var panel = document.createElement('div');
      panel.style.cssText = [
        'display:flex;flex-direction:column;align-items:center;',
        'gap:10px;background:#1a1a1a;',
        'border:4px solid ' + T.gold + ';padding:20px;min-width:280px;',
      ].join('');

      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-family:' + T.fb + ';font-size:13px;color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
      lbl.textContent = '// DISCOUNT //';
      panel.appendChild(lbl);

      DISCOUNT_OPTIONS.forEach(function(opt) {
        var btn = buildButton(opt, {
          fill: T.bgLight, color: T.mint, fontSize: '26px', height: 44,
          onTap: function() {
            // Parse percentage from label
            var pct = opt === 'Comp (100%)' ? 1.0 : parseFloat(opt) / 100;
            var discountAmt = 0;
            targets.forEach(function(inst) {
              var itemTotal = inst.unitPrice + inst.mods.reduce(function(s, m) { return s + m.price; }, 0);
              discountAmt += itemTotal * pct;
              inst.discount = opt;
            });
            discountAmt = Math.round(discountAmt * 100) / 100;

            // Post discount event to backend
            if (currentOrderId) {
              var itemIds = targets.map(function(inst) { return inst.id; });
              fetch(API + '/orders/' + currentOrderId + '/discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  discount_type: opt,
                  amount: discountAmt,
                  reason: 'Manager discount: ' + opt,
                  approved_by: approvedBy,
                  item_ids: itemIds,
                }),
              }).catch(function(err) {
                console.warn('[KINDpos] Discount event failed:', err);
              });
            }

            resolveInterrupt();
            renderTicket();
            rebuildBottomBar();
          },
        });
        btn.style.width = '240px';
        panel.appendChild(btn);
      });

      var cancelBtn = buildButton('CANCEL', {
        fill: T.bgLight, color: T.mint, fontSize: '22px', height: 40,
        onTap: function() { cancelInterrupt(); },
      });
      cancelBtn.style.width = '240px';
      panel.appendChild(cancelBtn);

      el.appendChild(panel);
    },
  }).catch(function() {});
}

// ── PIN OVERLAY ───────────────────────────────────
function buildPinOverlay(el, cb) {
  // Child panel — never override el positioning styles
  var panel = document.createElement('div');
  panel.style.cssText = [
    'display:flex;flex-direction:column;align-items:center;',
    'gap:14px;background:#1a1a1a;',
    'border:4px solid ' + T.mint + ';padding:20px;',
    'max-height:90vh;overflow-y:auto;',
  ].join('');

  var lbl = document.createElement('div');
  lbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';letter-spacing:2px;';
  lbl.textContent = '// MANAGER PIN //';
  panel.appendChild(lbl);

  var numpad = buildNumpad({
    maxDigits: 4,
    masked:    true,
    onSubmit:  function(pin) {
      // Validate against backend employee roster — accept any manager PIN
      fetch(API + '/servers')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var servers = data.servers || [];
          var match = servers.find(function(e) {
            return e.pin === pin && (e.role === 'manager' || (e.roles && e.roles.indexOf('manager') !== -1));
          });
          if (match) {
            cb(match);
          } else {
            numpad.setError('WRONG PIN');
          }
        })
        .catch(function() {
          numpad.setError('NETWORK ERROR');
        });
    },
  });
  panel.appendChild(numpad);

  var cancelBtn = buildButton('CANCEL', {
    fill: T.bgLight, color: T.mint, fontSize: T.fsSmall, height: 40,
    onTap: function() { cb(false); },
  });
  cancelBtn.style.width = '332px'; // matches numpad component width
  panel.appendChild(cancelBtn);

  el.appendChild(panel);

  // Backdrop tap dismisses interrupt
  el.addEventListener('pointerup', function(e) {
    if (e.target === el) cb(false);
  });
}

async function handleSend() {
  if (ticket.length === 0) return;
  if (isSending) return;

  var unsentInstances = ticket.filter(function(inst) { return !inst.sent; });

  // All items already sent — resend to kitchen only
  if (unsentInstances.length === 0 && currentOrderId) {
    isSending = true;
    try {
      await fetch(API + '/orders/' + currentOrderId + '/send', { method: 'POST' });
      fetch(API + '/print/ticket/' + currentOrderId, { method: 'POST' })
        .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
        .catch(function(err) {
          console.warn('[KINDpos] Kitchen print failed:', err);
          showToast('Kitchen ticket print failed — check printer');
        });
      showToast('Resent to kitchen', { bg: T.goGreen, duration: 2000 });
    } catch (err) {
      console.warn('[KINDpos] Resend failed:', err);
      showToast('Resend failed', { bg: T.red, duration: 2000 });
    } finally {
      isSending = false;
    }
    return;
  }

  isSending = true;
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
    var itemPromises = unsentInstances.map(function(inst) {
      return fetch(API + '/orders/' + currentOrderId + '/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': inst.idemKey || _idemKey(),
        },
        body: JSON.stringify({
          menu_item_id: inst.name.toLowerCase().replace(/\s+/g, '_'),
          name:         inst.name,
          price:        inst.unitPrice,
          quantity:     1,
          category:     inst.category || 'general',
          modifiers:    inst.mods.map(function(m) {
            return { name: m.name, price: m.price, modifier_price: m.price, charged: m.charged, prefix: m.prefix || null, half_price: m.half_price != null ? m.half_price : null };
          }),
        }),
      });
    });
    var results = await Promise.allSettled(itemPromises);
    var anyFailed = false;
    results.forEach(function(r, idx) {
      if (r.status === 'fulfilled' && r.value.ok) {
        unsentInstances[idx].sent = true;
      } else {
        anyFailed = true;
        console.warn('[KINDpos] Item POST failed:', unsentInstances[idx].name,
          r.status === 'rejected' ? r.reason : 'HTTP ' + r.value.status);
      }
    });
    if (anyFailed) {
      renderTicket();
      throw new Error('Some items failed to send');
    }

    // Step 3 — send to kitchen + trigger kitchen ticket print
    await fetch(API + '/orders/' + currentOrderId + '/send', { method: 'POST' });

    // Mark remaining items as sent (order-level confirmation)
    ticket.forEach(function(inst) { inst.sent = true; });

    // Fire kitchen print — non-blocking, dispatcher handles retry
    fetch(API + '/print/ticket/' + currentOrderId, { method: 'POST' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
      .catch(function(err) {
        console.warn('[KINDpos] Kitchen print failed:', err);
        showToast('Kitchen ticket print failed — check printer');
      });

  } catch (err) {
    console.warn('[KINDpos] Send failed:', err);
    throw err;
  } finally {
    isSending = false;
  }

  // Update UI — SEND becomes RESEND, ticket shows sent state
  renderTicket();
  rebuildBottomBar();

  // Reset hex nav — ticket stays visible for PAY
  if (hexNav) hexNav.reset();
}

function deepCopyTicket(src) {
  return src.map(function(inst) {
    return {
      id:        inst.id,
      idemKey:   inst.idemKey || _idemKey(),
      name:      inst.name,
      unitPrice: inst.unitPrice,
      mods:      inst.mods.map(function(m) {
        return { name: m.name, price: m.price, charged: m.charged, prefix: m.prefix || null, half_price: m.half_price != null ? m.half_price : null };
      }),
      selected:  false,   // always reset selection on copy
      sent:      inst.sent,
      category:  inst.category || null,
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
      title.style.cssText = 'font-family:' + T.fb + ';font-size:40px;font-weight:bold;color:' + T.mint + ';letter-spacing:2px;';
      title.textContent = '// RECALL //';
      var closeBtn = buildButton('\u2715', {
        fill: T.red, color: T.mint, fontSize: T.fsBtn, height: 30,
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
        empty.style.cssText = 'grid-column:1/-1;font-family:' + T.fb + ';color:' + T.mutedText + ';font-size:40px;text-align:center;padding:40px 0;';
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
            fill: '#333333', color: T.mint, fontSize: T.fsBtn, height: 90,
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
    rebuildBottomBar();
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
        nameLbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;font-weight:bold;color:' + T.mint + ';letter-spacing:1px;';
        nameLbl.textContent = tab.label;
        panel.appendChild(nameLbl);
      }
      var checkLbl = document.createElement('div');
      checkLbl.style.cssText = 'font-family:' + T.fb + ';font-size:' + (tab.label ? '16px' : T.fsSmall) + ';color:' + (tab.label ? T.mutedText : T.mint) + ';letter-spacing:1px;margin-bottom:6px;';
      checkLbl.textContent = tab.checkNum;
      panel.appendChild(checkLbl);

      var recallBtn = buildButton('RECALL', {
        fill: T.goGreen, color: T.bg, fontSize: '26px', height: 50,
        onTap: function() {
          if (ticket.length > 0) {
            resolveInterrupt(); // close recall-action so confirm-clear can open
            interrupt('confirm-clear', {
              onBuild: function(cel) {
                var cpanel = document.createElement('div');
                cpanel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;width:320px;background:#1a1a1a;border:4px solid ' + T.gold + ';padding:20px;';
                var clbl = document.createElement('div');
                clbl.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + T.gold + ';letter-spacing:1px;text-align:center;';
                clbl.textContent = 'Clear current ticket?';
                cpanel.appendChild(clbl);
                var yesBtn = buildButton('YES — CLEAR', {
                  fill: T.red, color: '#fff', fontSize: T.fsSmall, height: 46,
                  onTap: function() { resolveInterrupt(); doLoad(); },
                });
                yesBtn.style.width = '240px';
                var noBtn = buildButton('CANCEL', {
                  fill: T.bgLight, color: T.mint, fontSize: T.fsSmall, height: 46,
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

      var deleteBtn = buildButton('DELETE', {
        fill: T.red, color: '#fff', fontSize: '26px', height: 50,
        onTap: doDelete,
      });
      deleteBtn.style.width = '280px';

      var cancelBtn = buildButton('CANCEL', {
        fill: T.bgLight, color: T.mint, fontSize: T.fsSmall, height: 40,
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
async function handlePay(params) {
  if (ticket.length === 0) return;

  // If SEND was never tapped, create the order now before navigating
  if (!currentOrderId) {
    try {
      await handleSend();
    } catch (err) {
      console.warn('[KINDpos] Send failed during pay — cannot proceed to payment');
      return;
    }
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