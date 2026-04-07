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
      { label: 'Bianco', id: 'bianco' },
      { label: 'Breakfast Bacon', id: 'breakfast-bacon' },
      { label: 'Cheeseburger', id: 'cheeseburger' },
      { label: 'Chicken Alfredo', id: 'chicken-alfredo' },
      { label: 'Crew', id: 'crew' },
      { label: 'Hawaiian', id: 'hawaiian' },
      { label: 'House', id: 'house' },
      { label: 'Kosher', id: 'kosher' },
      { label: 'Mac N Cheese', id: 'mac-n-cheese' },
      { label: 'Moccho', id: 'moccho' },
      { label: 'Nick Special', id: 'nick-special' },
      { label: 'Primo', id: 'primo' },
      { label: "Sammy's Special", id: 'sammys-special' },
      { label: 'Taco', id: 'taco' },
      { label: 'Veggie', id: 'veggie' },
    ]}],
  },
  {
    id: 'prep', label: 'PREP', color: T.lavender, textColor: '#1a0030',
    subcats: [
      { id: 'prep-crust', label: 'Crust', items: [
        { label: 'Sub GF Crust', id: 'gf-crust' },
        { label: 'Stuffed Crust', id: 'stuffed-crust' },
        { label: 'Thick Crust', id: 'thick-crust' },
        { label: 'Thin Crust', id: 'thin-crust' },
      ]},
      { id: 'prep-temp', label: 'Temp', items: [
        { label: 'Light Bake', id: 'light-bake' },
        { label: 'Well Done', id: 'well-done' },
      ]},
      { id: 'prep-sauce', label: 'Sauce', items: [
        { label: 'BBQ Sauce', id: 'bbq-sauce' },
        { label: 'Extra Sauce', id: 'extra-sauce' },
        { label: 'Light Sauce', id: 'light-sauce' },
        { label: 'No Sauce', id: 'no-sauce' },
        { label: 'White Sauce', id: 'white-sauce' },
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
      { label: 'Banana Peppers', id: 'banana-peppers', price: 1.00 },
      { label: 'Beef', id: 'beef', price: 1.50 },
      { label: 'Black Olives', id: 'black-olives', price: 1.00 },
      { label: 'Canadian Bacon', id: 'canadian-bacon', price: 1.50 },
      { label: 'Cheddar', id: 'cheddar', price: 1.50 },
      { label: 'Chicken', id: 'chicken', price: 2.00 },
      { label: 'Garlic', id: 'garlic', price: 0.50 },
      { label: 'Green Olives', id: 'green-olives', price: 1.00 },
      { label: 'Green Peppers', id: 'green-peppers', price: 1.00 },
      { label: 'Ground Beef', id: 'ground-beef', price: 1.50 },
      { label: 'Jalapenos', id: 'jalapenos', price: 1.00 },
      { label: 'Mozzarella', id: 'mozzarella', price: 1.50 },
      { label: 'Mushroom', id: 'mushroom', price: 1.00 },
      { label: 'Onion', id: 'onion', price: 1.00 },
      { label: 'Pepperoni', id: 'pepperoni', price: 1.50 },
      { label: 'Pineapple', id: 'pineapple', price: 1.00 },
      { label: 'Sausage', id: 'sausage', price: 1.50 },
      { label: 'Spinach', id: 'spinach', price: 1.00 },
      { label: 'Tomatoe', id: 'tomatoe', price: 1.00 },
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

  // ═══ PREFIX ROW ═══
  var prefixRow = document.createElement('div');
  prefixRow.style.cssText = 'display:flex;gap:4px;padding:2px 4px;flex-shrink:0;';
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

  // ═══ MAIN BODY: HexNav (left) + Right panel (mods log + placement) ═══
  var body = document.createElement('div');
  body.style.cssText = 'flex:1;display:flex;overflow:hidden;min-height:0;';

  var hexArea = document.createElement('div');
  hexArea.style.cssText = 'flex:1;position:relative;overflow:hidden;';
  body.appendChild(hexArea);

  // ═══ RIGHT PANEL: Mods log + Placement bar ═══
  var rightPanel = document.createElement('div');
  rightPanel.style.cssText = [
    'width:200px;flex-shrink:0;display:flex;flex-direction:column;',
    'background:' + T.bgDark + ';',
    'border-left:2px solid ' + T.border + ';',
  ].join('');

  // Applied mods log
  var logWrap = document.createElement('div');
  logWrap.style.cssText = [
    'flex:1;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
    'padding:6px 8px;',
  ].join('');
  applySunkenStyle(logWrap);
  renderLog();
  rightPanel.appendChild(logWrap);

  // Placement bar (bottom of right panel)
  var placeBar = document.createElement('div');
  placeBar.style.cssText = [
    'display:flex;align-items:center;flex-shrink:0;',
    'padding:2px 4px;gap:0;',
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
      divider.style.cssText = 'width:2px;height:28px;background:' + pizzaColor + ';flex-shrink:0;';
      placeBar.appendChild(divider);
    }
    var isActive = activePlacement === seg.id;
    var btn = document.createElement('div');
    btn.style.cssText = [
      'flex:1;height:32px;display:flex;align-items:center;justify-content:center;',
      'font-family:' + T.fh + ';font-size:20px;cursor:pointer;',
      'background:' + (isActive ? pizzaColor : T.darkBtn) + ';',
      'color:' + (isActive ? '#1a0a0a' : pizzaColor) + ';',
      'border-top:2px solid ' + pizzaColor + ';',
      'border-bottom:2px solid ' + pizzaColor + ';',
      'transition:background 80ms,color 80ms;',
    ].join('');
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
  rightPanel.appendChild(placeBar);

  function refreshPlacement() {
    placeSegments.forEach(function(seg) {
      var btn = placeBtns[seg.id];
      var isActive = activePlacement === seg.id;
      btn.style.background = isActive ? pizzaColor : T.darkBtn;
      btn.style.color = isActive ? '#1a0a0a' : pizzaColor;
    });
  }

  body.appendChild(rightPanel);
  panel.appendChild(body);

  // ═══ BOTTOM BAR ═══
  var bottomBar = document.createElement('div');
  bottomBar.style.cssText = [
    'display:flex;gap:4px;padding:3px 4px;flex-shrink:0;',
    'background:' + T.bgDark + ';',
    'border-top:2px solid ' + T.catColor('PIZZA') + ';',
  ].join('');

  // CANCEL
  var cancelPair = buildStyledButton(T.darkBtn);
  cancelPair.wrap.style.cssText += 'flex:1;height:40px;';
  cancelPair.inner.textContent = 'CANCEL';
  cancelPair.inner.style.color = T.mint;
  cancelPair.inner.style.fontSize = T.fsSmall;
  cancelPair.inner.style.fontFamily = T.fb;
  cancelPair.wrap.addEventListener('pointerup', function() {
    if (builderNav) builderNav.destroy();
    cancelInterrupt();
  });
  bottomBar.appendChild(cancelPair.wrap);

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
  addPair.wrap.style.cssText += 'flex:2;height:40px;';
  addPair.inner.textContent = 'ADD';
  addPair.inner.style.color = '#1a2a1a';
  addPair.inner.style.fontSize = T.fsSmall;
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
        scale: 1.0,
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
    appliedMods.forEach(function(entry, idx) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:26px;color:' + T.gold + ';line-height:1.2;cursor:pointer;';
      var placementTag = '';
      if (entry.placement === '1st-half') placementTag = ' [1st]';
      else if (entry.placement === '2nd-half') placementTag = ' [2nd]';
      var nameSpan = document.createElement('span');
      nameSpan.textContent = entry.prefixLabel + ' ' + entry.modLabel + placementTag;
      row.appendChild(nameSpan);
      if (entry.price > 0) {
        var priceSpan = document.createElement('span');
        priceSpan.textContent = '+$' + entry.price.toFixed(2);
        row.appendChild(priceSpan);
      }
      row.addEventListener('pointerup', (function(i) {
        return function() {
          appliedMods.splice(i, 1);
          renderLog();
        };
      })(idx));
      logWrap.appendChild(row);
    });
    logWrap.scrollTop = logWrap.scrollHeight;
  }
}
