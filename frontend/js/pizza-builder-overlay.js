// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Pizza Builder Overlay
//  Interrupt overlay for building a pizza from scratch
//  Size → Specials / Prep / Toppings + Half placement
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, applySunkenStyle } from './tokens.js';
import { interrupt, resolveInterrupt, cancelInterrupt } from './scene-manager.js';
import { HexNav } from './hex-nav.js';
import { PREFIXES as UNI_PREFIXES } from './data/universal-modifiers.js';

// ── Pizza builder HexNav categories ──────────────
var PIZZA_BUILDER_DATA = [
  {
    id: 'specials', label: 'SPECIALS', color: T.gold, textColor: '#1a1000',
    subcats: [{ id: 'specials-items', label: 'Specials', items: [
      { label: 'Meat Lovers', id: 'meat-lovers' },
      { label: 'Veggie Lovers', id: 'veggie-lovers' },
      { label: 'Supreme', id: 'supreme' },
      { label: 'Hawaiian', id: 'hawaiian' },
      { label: 'BBQ Chicken', id: 'bbq-chicken' },
      { label: 'Buffalo', id: 'buffalo' },
      { label: 'White Pizza', id: 'white-pizza' },
      { label: 'Margherita', id: 'margherita' },
    ]}],
  },
  {
    id: 'prep', label: 'PREP', color: T.lavender, textColor: '#1a0030',
    subcats: [
      { id: 'prep-crust', label: 'Crust', items: [
        { label: 'Sub GF Crust', id: 'gf-crust' },
        { label: 'Thin Crust', id: 'thin-crust' },
        { label: 'Thick Crust', id: 'thick-crust' },
        { label: 'Stuffed Crust', id: 'stuffed-crust' },
      ]},
      { id: 'prep-temp', label: 'Temp', items: [
        { label: 'Well Done', id: 'well-done' },
        { label: 'Light Bake', id: 'light-bake' },
      ]},
      { id: 'prep-sauce', label: 'Sauce', items: [
        { label: 'Light Sauce', id: 'light-sauce' },
        { label: 'Extra Sauce', id: 'extra-sauce' },
        { label: 'No Sauce', id: 'no-sauce' },
        { label: 'White Sauce', id: 'white-sauce' },
        { label: 'BBQ Sauce', id: 'bbq-sauce' },
      ]},
      { id: 'prep-cut', label: 'Cut', items: [
        { label: 'Cut Square', id: 'cut-square' },
        { label: 'No Cut', id: 'no-cut' },
      ]},
    ],
  },
  {
    id: 'toppings', label: 'TOPPINGS', color: T.catColor('PIZZA'), textColor: '#1a0a0a',
    subcats: [{ id: 'toppings-items', label: 'Toppings', items: [
      { label: 'Pepperoni', id: 'pepperoni', price: 1.50 },
      { label: 'Sausage', id: 'sausage', price: 1.50 },
      { label: 'Mushrooms', id: 'mushrooms', price: 1.00 },
      { label: 'Onions', id: 'onions', price: 1.00 },
      { label: 'Peppers', id: 'peppers', price: 1.00 },
      { label: 'Xtra Cheese', id: 'x-cheese', price: 2.00 },
      { label: 'Olives', id: 'olives', price: 1.00 },
      { label: 'Bacon', id: 'bacon', price: 1.50 },
      { label: 'Anchovies', id: 'anchovies', price: 1.00 },
      { label: 'Pineapple', id: 'pineapple', price: 1.00 },
      { label: 'Jalapeños', id: 'jalapenos', price: 1.00 },
      { label: 'Spinach', id: 'spinach', price: 1.00 },
    ]}],
  },
];

// ── Prefix definitions (mirrors order-entry) ─────
var PREFIXES = [
  { id: 'add',     label: 'Add',     color: T.goGreen,  textColor: '#1a2a1a' },
  { id: 'no',      label: 'No',      color: T.red,      textColor: '#fff'    },
  { id: 'on-side', label: 'On Side', color: T.gold,     textColor: '#1a1000' },
  { id: 'extra',   label: 'Extra',   color: T.cyan,     textColor: '#001a1a' },
  { id: 'sub',     label: 'Sub',     color: T.lavender, textColor: '#1a0030' },
];


/**
 * Show the pizza builder overlay.
 *
 * @param {object}      sizeItem     — the size item from MENU_DATA (label, price)
 * @param {Array|null}  builderData  — dynamic HexNav data from API, or null for fallback
 * @returns {Promise<{name, unitPrice, mods[], category}>}  the built pizza
 */
export function showPizzaBuilderOverlay(sizeItem, builderData) {
  var data = (builderData && builderData.length > 0) ? builderData : PIZZA_BUILDER_DATA;
  return interrupt('pizza-builder', {
    onBuild: function(el) {
      _buildOverlay(el, sizeItem, data);
    },
  });
}

function _buildOverlay(el, sizeItem, builderData) {
  // ── State ──
  var activePrefix = 'add';
  var activePlacement = 'whole';
  var appliedMods = []; // [{ prefixLabel, modLabel, placement, price }]
  var builderNav = null;

  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:98%;max-width:1100px;height:95%;',
    'background:' + T.bg + ';',
    'border:4px solid ' + T.catColor('PIZZA') + ';',
    'display:flex;flex-direction:column;',
    'font-family:' + T.fb + ';',
    'overflow:hidden;',
  ].join('');

  // ═══ HEADER ═══
  var header = document.createElement('div');
  header.style.cssText = [
    'display:flex;align-items:center;justify-content:space-between;',
    'padding:6px 12px;',
    'background:' + T.bgDark + ';',
    'border-bottom:2px solid ' + T.catColor('PIZZA') + ';',
    'flex-shrink:0;',
  ].join('');

  var titleSpan = document.createElement('span');
  titleSpan.style.cssText = 'color:' + T.catColor('PIZZA') + ';font-size:30px;font-family:' + T.fh + ';';
  titleSpan.textContent = sizeItem.label + '  —  $' + sizeItem.price.toFixed(2);
  header.appendChild(titleSpan);

  var cancelPair = buildStyledButton(T.darkBtn);
  cancelPair.wrap.style.cssText += 'width:100px;height:36px;';
  cancelPair.inner.textContent = 'CANCEL';
  cancelPair.inner.style.color = T.mint;
  cancelPair.inner.style.fontSize = T.fsSmall;
  cancelPair.inner.style.fontFamily = T.fb;
  cancelPair.wrap.addEventListener('pointerup', function() {
    if (builderNav) builderNav.destroy();
    cancelInterrupt();
  });
  header.appendChild(cancelPair.wrap);
  panel.appendChild(header);

  // ═══ PREFIX ROW ═══
  var prefixRow = document.createElement('div');
  prefixRow.style.cssText = 'display:flex;gap:4px;padding:4px 8px;flex-shrink:0;';
  var prefixBtns = {};

  PREFIXES.forEach(function(p) {
    var isActive = activePrefix === p.id;
    var btn = document.createElement('div');
    btn.style.cssText = [
      'flex:1;height:34px;display:flex;align-items:center;justify-content:center;',
      'font-family:' + T.fh + ';font-size:22px;cursor:pointer;',
      'background:' + (isActive ? p.color : T.darkBtn) + ';',
      'color:' + (isActive ? p.textColor : p.color) + ';',
      'border:2px solid ' + p.color + ';',
      'transition:background 80ms,color 80ms;',
    ].join('');
    btn.textContent = p.label;

    btn.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      activePrefix = p.id;
      refreshPrefixes();
    });

    prefixBtns[p.id] = btn;
    prefixRow.appendChild(btn);
  });
  panel.appendChild(prefixRow);

  function refreshPrefixes() {
    PREFIXES.forEach(function(p) {
      var btn = prefixBtns[p.id];
      var isActive = activePrefix === p.id;
      btn.style.background = isActive ? p.color : T.darkBtn;
      btn.style.color = isActive ? p.textColor : p.color;
    });
  }

  // ═══ PLACEMENT BAR — horizontal selector: < 1st // Whole // 2nd > ═══
  var placeBar = document.createElement('div');
  placeBar.style.cssText = [
    'display:flex;align-items:center;flex-shrink:0;',
    'padding:2px 8px;gap:0;',
  ].join('');
  var placeBtns = {};
  var pizzaColor = T.catColor('PIZZA');

  var placeSegments = [
    { id: '1st-half', label: '1st' },
    { id: 'whole',    label: 'Whole' },
    { id: '2nd-half', label: '2nd' },
  ];

  placeSegments.forEach(function(seg, i) {
    if (i > 0) {
      var divider = document.createElement('div');
      divider.style.cssText = [
        'width:2px;height:28px;',
        'background:' + pizzaColor + ';',
        'flex-shrink:0;',
      ].join('');
      placeBar.appendChild(divider);
    }
    var isActive = activePlacement === seg.id;
    var btn = document.createElement('div');
    btn.style.cssText = [
      'flex:1;height:32px;display:flex;align-items:center;justify-content:center;',
      'font-family:' + T.fh + ';font-size:22px;cursor:pointer;',
      'background:' + (isActive ? pizzaColor : T.darkBtn) + ';',
      'color:' + (isActive ? '#1a0a0a' : pizzaColor) + ';',
      'border-top:2px solid ' + pizzaColor + ';',
      'border-bottom:2px solid ' + pizzaColor + ';',
      'transition:background 80ms,color 80ms;',
    ].join('');
    // Add left/right border on edges
    if (i === 0) btn.style.borderLeft = '2px solid ' + pizzaColor;
    if (i === placeSegments.length - 1) btn.style.borderRight = '2px solid ' + pizzaColor;
    btn.textContent = seg.label;

    btn.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      activePlacement = seg.id;
      refreshPlacement();
    });

    placeBtns[seg.id] = btn;
    placeBar.appendChild(btn);
  });
  panel.appendChild(placeBar);

  function refreshPlacement() {
    placeSegments.forEach(function(seg) {
      var btn = placeBtns[seg.id];
      var isActive = activePlacement === seg.id;
      btn.style.background = isActive ? pizzaColor : T.darkBtn;
      btn.style.color = isActive ? '#1a0a0a' : pizzaColor;
    });
  }

  // ═══ MAIN BODY: HexNav ═══
  var hexArea = document.createElement('div');
  hexArea.style.cssText = 'flex:1;position:relative;overflow:hidden;';
  panel.appendChild(hexArea);

  // ═══ APPLIED MODS LOG ═══
  var logWrap = document.createElement('div');
  logWrap.style.cssText = [
    'max-height:80px;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
    'background:' + T.bgDark + ';padding:4px 8px;flex-shrink:0;',
    'border-top:2px solid ' + T.border + ';',
  ].join('');
  applySunkenStyle(logWrap);
  renderLog();
  panel.appendChild(logWrap);

  // ═══ BOTTOM BAR ═══
  var bottomBar = document.createElement('div');
  bottomBar.style.cssText = [
    'display:flex;gap:6px;padding:6px 8px;flex-shrink:0;',
    'background:' + T.bgDark + ';',
    'border-top:2px solid ' + T.catColor('PIZZA') + ';',
  ].join('');

  // UNDO
  var undoPair = buildStyledButton(T.darkBtn);
  undoPair.wrap.style.cssText += 'flex:1;height:40px;';
  undoPair.inner.textContent = 'UNDO';
  undoPair.inner.style.color = T.red;
  undoPair.inner.style.fontSize = T.fsSmall;
  undoPair.inner.style.fontFamily = T.fb;
  undoPair.wrap.addEventListener('pointerup', function() {
    if (appliedMods.length === 0) return;
    appliedMods.pop();
    renderLog();
  });
  bottomBar.appendChild(undoPair.wrap);

  // ADD TO ORDER
  var addPair = buildStyledButton(T.goGreen);
  addPair.wrap.style.cssText += 'flex:3;height:40px;';
  addPair.inner.textContent = 'ADD TO ORDER';
  addPair.inner.style.color = '#1a2a1a';
  addPair.inner.style.fontSize = T.fsBtn;
  addPair.inner.style.fontFamily = T.fh;
  addPair.wrap.addEventListener('pointerup', function() {
    if (builderNav) builderNav.destroy();
    // Build the result
    var mods = appliedMods.map(function(m) {
      var modName = m.prefixLabel + ' ' + m.modLabel;
      var halfSide = null;
      if (m.placement === '1st-half') halfSide = 'Left';
      else if (m.placement === '2nd-half') halfSide = 'Right';
      return {
        name: modName,
        price: m.price || 0,
        charged: (m.price || 0) > 0,
        prefix: halfSide,
      };
    });
    resolveInterrupt({
      name: sizeItem.label,
      unitPrice: sizeItem.price,
      mods: mods,
      category: 'pizza',
    });
  });
  bottomBar.appendChild(addPair.wrap);

  panel.appendChild(bottomBar);
  el.appendChild(panel);

  // ── Init HexNav after DOM layout ──
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      builderNav = new HexNav(hexArea, {
        data: builderData,
        scale: 0.85,
        onSelect: function(item) {
          handleModSelect(item);
        },
      });
    });
  });

  // ── Mod selection handler ──
  function handleModSelect(item) {
    var prefix = PREFIXES.find(function(p) { return p.id === activePrefix; });
    if (!prefix) return;

    var price = item.price || 0;
    // Half toppings cost half price (if price exists)
    if (activePlacement !== 'whole' && price > 0) {
      price = Math.round(price * 50) / 100; // half price
    }

    appliedMods.push({
      prefixId: prefix.id,
      prefixLabel: prefix.label,
      modId: item.id || item.label,
      modLabel: item.label,
      placement: activePlacement,
      price: price,
    });
    renderLog();
  }

  // ── Log renderer ──
  function renderLog() {
    logWrap.innerHTML = '';
    if (appliedMods.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-family:' + T.fb + ';font-size:26px;color:' + T.mutedText + ';text-align:center;padding:2px 0;';
      empty.textContent = 'Tap a topping or special to build your pizza';
      logWrap.appendChild(empty);
      return;
    }
    appliedMods.forEach(function(entry) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:26px;color:' + T.gold + ';line-height:1.2;';
      var placementTag = '';
      if (entry.placement === '1st-half') placementTag = ' [1st 1/2]';
      else if (entry.placement === '2nd-half') placementTag = ' [2nd 1/2]';
      var nameSpan = document.createElement('span');
      nameSpan.textContent = entry.prefixLabel + ' ' + entry.modLabel + placementTag;
      row.appendChild(nameSpan);
      if (entry.price > 0) {
        var priceSpan = document.createElement('span');
        priceSpan.textContent = '+$' + entry.price.toFixed(2);
        row.appendChild(priceSpan);
      }
      logWrap.appendChild(row);
    });
    logWrap.scrollTop = logWrap.scrollHeight;
  }
}
