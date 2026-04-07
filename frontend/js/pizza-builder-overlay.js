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

// ── Placement IDs ────────────────────────────────
var PLACEMENTS = [
  { id: '1st-half', label: '1st\n1/2' },
  { id: 'whole',    label: 'Whole' },
  { id: '2nd-half', label: '2nd\n1/2' },
];

/**
 * Show the pizza builder overlay.
 *
 * @param {object} sizeItem  — the size item from MENU_DATA (label, price)
 * @returns {Promise<{name, unitPrice, mods[], category}>}  the built pizza
 */
export function showPizzaBuilderOverlay(sizeItem) {
  return interrupt('pizza-builder', {
    onBuild: function(el) {
      _buildOverlay(el, sizeItem);
    },
  });
}

function _buildOverlay(el, sizeItem) {
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

  // ═══ MAIN BODY: HexNav (left) + Split Hex (right) ═══
  var body = document.createElement('div');
  body.style.cssText = 'flex:1;display:flex;overflow:hidden;min-height:0;';

  // ── HexNav area ──
  var hexArea = document.createElement('div');
  hexArea.style.cssText = [
    'flex:1;position:relative;overflow:hidden;',
    'border-right:2px solid ' + T.border + ';',
  ].join('');
  body.appendChild(hexArea);

  // ── Placement hex area ──
  var placeArea = document.createElement('div');
  placeArea.style.cssText = [
    'width:260px;flex-shrink:0;display:flex;align-items:center;justify-content:center;',
    'background:' + T.bg5 + ';',
  ].join('');

  var placeSvg = _buildSplitHex(activePlacement, function(id) {
    activePlacement = id;
    // Rebuild the SVG to show new active state
    placeArea.innerHTML = '';
    placeSvg = _buildSplitHex(activePlacement, arguments.callee);
    placeArea.appendChild(placeSvg);
  });

  // We need a stable callback reference for rebuilds
  var onPlaceTap = function(id) {
    activePlacement = id;
    placeArea.innerHTML = '';
    var newSvg = _buildSplitHex(activePlacement, onPlaceTap);
    placeArea.appendChild(newSvg);
  };
  placeArea.innerHTML = '';
  placeSvg = _buildSplitHex(activePlacement, onPlaceTap);
  placeArea.appendChild(placeSvg);

  body.appendChild(placeArea);
  panel.appendChild(body);

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
        data: PIZZA_BUILDER_DATA,
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

// ═══════════════════════════════════════════════════
//  Split Hexagon — 3-zone placement selector
//  Large flat-top hex divided into: 1st 1/2 | Whole | 2nd 1/2
// ═══════════════════════════════════════════════════

function _buildSplitHex(activePlacement, onTap) {
  var svgNS = 'http://www.w3.org/2000/svg';
  var r = 110;
  var cx = 130;
  var cy = 120;
  var sin60 = Math.sqrt(3) / 2;
  var w = 260;
  var h = 240;

  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  svg.style.cssText = 'width:240px;height:220px;display:block;touch-action:none;';

  // Hex vertices (flat-top)
  var v0 = { x: cx + r,     y: cy };                   // right
  var v1 = { x: cx + r / 2, y: cy + r * sin60 };       // bottom-right
  var v2 = { x: cx - r / 2, y: cy + r * sin60 };       // bottom-left
  var v3 = { x: cx - r,     y: cy };                   // left
  var v4 = { x: cx - r / 2, y: cy - r * sin60 };       // top-left
  var v5 = { x: cx + r / 2, y: cy - r * sin60 };       // top-right

  // Divider x positions (thirds)
  var divL = cx - r / 3;
  var divR = cx + r / 3;

  // Intersection points on top/bottom horizontal edges
  var topL  = { x: divL, y: cy - r * sin60 };
  var topR  = { x: divR, y: cy - r * sin60 };
  var botL  = { x: divL, y: cy + r * sin60 };
  var botR  = { x: divR, y: cy + r * sin60 };

  // Three zone polygons
  var leftPoly  = [v3, v4, topL, botL, v2];
  var centerPoly = [topL, topR, botR, botL];
  var rightPoly  = [topR, v5, v0, v1, botR];

  var zones = [
    { id: '1st-half', label: '1/2',   poly: leftPoly },
    { id: 'whole',    label: 'Whole',  poly: centerPoly },
    { id: '2nd-half', label: '1/2',   poly: rightPoly },
  ];

  var pizzaColor = T.catColor('PIZZA');
  var activeColor = pizzaColor;
  var inactiveColor = T.bg5;
  var strokeColor = pizzaColor;

  zones.forEach(function(zone) {
    var isActive = activePlacement === zone.id;
    var points = zone.poly.map(function(p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');

    var g = document.createElementNS(svgNS, 'g');
    g.style.cursor = 'pointer';

    var poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', points);
    poly.setAttribute('fill', isActive ? activeColor : inactiveColor);
    poly.setAttribute('stroke', strokeColor);
    poly.setAttribute('stroke-width', '3');
    g.appendChild(poly);

    // Centroid for label placement
    var centX = zone.poly.reduce(function(s, p) { return s + p.x; }, 0) / zone.poly.length;
    var centY = zone.poly.reduce(function(s, p) { return s + p.y; }, 0) / zone.poly.length;

    var text1 = document.createElementNS(svgNS, 'text');
    text1.setAttribute('x', centX);
    text1.setAttribute('y', centY);
    text1.setAttribute('text-anchor', 'middle');
    text1.setAttribute('dominant-baseline', 'central');
    text1.setAttribute('font-family', T.fh);
    text1.setAttribute('font-size', '24');
    text1.setAttribute('font-weight', 'bold');
    text1.setAttribute('fill', isActive ? '#1a0a0a' : pizzaColor);
    text1.setAttribute('pointer-events', 'none');
    text1.textContent = zone.label;
    g.appendChild(text1);

    // Tap handler
    g.addEventListener('pointerup', function() {
      onTap(zone.id);
    });

    svg.appendChild(g);
  });

  // Outer hex outline for clean look
  var outline = document.createElementNS(svgNS, 'polygon');
  var allVerts = [v0, v1, v2, v3, v4, v5];
  outline.setAttribute('points', allVerts.map(function(p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '));
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke', strokeColor);
  outline.setAttribute('stroke-width', '4');
  outline.setAttribute('pointer-events', 'none');
  svg.appendChild(outline);

  return svg;
}
