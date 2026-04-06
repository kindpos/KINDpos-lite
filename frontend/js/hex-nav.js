// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Hex Navigation Component
//  Self-contained hex bloom nav for items + modifiers
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from './tokens.js';

var CAT_R    = 80;
var SUBCAT_R = 70;
var ITEM_R   = 48;
// Gap multipliers per depth — tighter as you drill deeper
var GAPS = [1.12, 1.06, 1.02, 1.00, 1.00];
function gapForLevel(level) { return GAPS[level] || GAPS[GAPS.length - 1]; }

// ═══════════════════════════════════════════════════
//  HexNav class
//  Usage:
//    var nav = new HexNav(containerEl, {
//      data: menuData,       // array of cat objects
//      onSelect: fn(item),   // called when leaf item tapped
//    });
//    nav.setData(modData);   // swap to modifier data
//    nav.reset();            // back to cat level
//    nav.destroy();          // remove from DOM
// ═══════════════════════════════════════════════════

export function HexNav(container, opts) {
  var o        = opts || {};
  var onSelect = o.onSelect || function() {};
  var onToast  = o.onToast  || function() {};
  var data     = o.data    || [];

  var svgNS = 'http://www.w3.org/2000/svg';
  var svgW = 600;  // safe fallback until container has real dimensions
  var svgH = 500;

  // State
  var state = { level: 0, cat: null, subcat: null, hexes: [] };

  // Mandatory modifier state
  var modState = {
    active:       false,
    itemHex:      null,   // the locked item hex
    itemData:     null,   // original item data
    groups:       [],     // requiredMods array
    selectedMods: [],     // [{group:'sauce', label:'Hot', price:0}, ...]
    satisfied:    {},     // {groupId: true} — groups with at least one pick
    currentGroup: null,   // currently expanded mod-group hex
  };

  // ── Build SVG ──────────────────────────────────
  var svg = document.createElementNS(svgNS, 'svg');
  svg.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  container.appendChild(svg);

  function resize() {
    var w = container.clientWidth;
    var h = container.clientHeight;
    if (w > 10) svgW = w;   // only update with real layout dimensions
    if (h > 10) svgH = h;
    svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
  }

  // ── Math ───────────────────────────────────────
  function hexPoints(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i - Math.PI / 2;
      pts.push((cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join(' ');
  }

  // ── Render ─────────────────────────────────────
  function render() {
    svg.innerHTML = '';
    state.hexes.forEach(drawHex);
  }

  function drawHex(h) {
    var g = document.createElementNS(svgNS, 'g');
    g.style.cursor = 'pointer';

    if (h.locked) {
      var shadow = document.createElementNS(svgNS, 'polygon');
      shadow.setAttribute('points', hexPoints(h.x + 3, h.y + 4, h.r));
      shadow.setAttribute('fill', 'rgba(0,0,0,0.5)');
      g.appendChild(shadow);
    }

    var poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', hexPoints(h.x, h.y, h.r));
    if (h.locked) {
      poly.setAttribute('fill', h.color);
      poly.setAttribute('stroke', h.color);
      poly.setAttribute('stroke-width', '7');
    } else {
      poly.setAttribute('fill', 'transparent');
      poly.setAttribute('stroke', h.color);
      poly.setAttribute('stroke-width', '7');
    }
    g.appendChild(poly);

    if (h.locked) {
      var bevel = document.createElementNS(svgNS, 'polygon');
      bevel.setAttribute('points', hexPoints(h.x, h.y, h.r - 6));
      bevel.setAttribute('fill', 'none');
      bevel.setAttribute('stroke', 'rgba(255,255,255,0.3)');
      bevel.setAttribute('stroke-width', '3');
      g.appendChild(bevel);
    }

    // Pulse animation for unsatisfied mandatory mod hexes
    if (h.pulse) {
      var anim = document.createElementNS(svgNS, 'animate');
      anim.setAttribute('attributeName', 'stroke-opacity');
      anim.setAttribute('values', '1;0.3;1');
      anim.setAttribute('dur', '1.5s');
      anim.setAttribute('repeatCount', 'indefinite');
      poly.appendChild(anim);
    }

    // Label
    var fontSize = h.r > 70 ? 28 : h.r > 30 ? 22 : 18;
    var lines    = h.label.split(' ');
    lines.forEach(function(line, i) {
      var text = document.createElementNS(svgNS, 'text');
      var offset = (i - (lines.length - 1) / 2) * (fontSize * 1.3);
      text.setAttribute('x', h.x);
      text.setAttribute('y', h.y + offset);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-family', T.fb);
      text.setAttribute('font-size', fontSize);
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', h.locked ? h.textColor : h.color);
      text.setAttribute('pointer-events', 'none');
      text.textContent = line;
      g.appendChild(text);
    });

    // Press animation + tap handling
    var pressed = false;
    g.addEventListener('pointerdown', function(e) {
      pressed = true;
      g.setAttribute('transform', 'translate(3,4)');
      g.setPointerCapture(e.pointerId);
    });
    g.addEventListener('pointerup', function() {
      if (pressed) {
        pressed = false;
        g.setAttribute('transform', '');
        onHexTap(h);
      }
    });
    g.addEventListener('pointercancel', function() {
      pressed = false;
      g.setAttribute('transform', '');
    });
    g.addEventListener('pointerleave', function() {
      // Don't clear pressed — pointerup with capture will still fire
      g.setAttribute('transform', '');
    });

    svg.appendChild(g);
  }

  // ── Honeycomb grid layout ───────────────────────
  // Place all hexes (parent + children) in a single centered
  // honeycomb grid. Parent occupies slot 0 (locked), children
  // fill remaining slots. The whole grid is centered in the viewport.
  function honeycombLayout(allItems, r, gap) {
    var g = gap || gapForLevel(0);
    var colStep = r * Math.sqrt(3) * g;
    var rowStep = r * 1.5 * g;
    var total   = allItems.length;

    // Determine grid dimensions
    var perRow = Math.max(2, Math.ceil(Math.sqrt(total * 1.3)));
    // Clamp to viewport width
    var maxPerRow = Math.max(2, Math.floor((svgW - r * 2) / colStep) + 1);
    if (perRow > maxPerRow) perRow = maxPerRow;

    var rows = Math.ceil(total / perRow);

    // Calculate total grid size then center it
    var gridW = (perRow - 1) * colStep + colStep / 2; // account for offset rows
    var gridH = (rows - 1) * rowStep;
    var originX = (svgW - gridW) / 2 + r;
    var originY = (svgH - gridH) / 2;

    // Clamp so hexes don't go off-screen
    if (originX < r + 4) originX = r + 4;
    if (originY < r + 4) originY = r + 4;

    var positions = [];
    for (var i = 0; i < total; i++) {
      var row = Math.floor(i / perRow);
      var col = i % perRow;
      var xOff = (row % 2 === 1) ? colStep / 2 : 0;
      var x = originX + col * colStep + xOff;
      var y = originY + row * rowStep;

      // Extend viewport if needed
      if (y + r > svgH - 4) {
        svgH = y + r + 10;
        svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
      }

      positions.push({ x: x, y: y });
    }
    return positions;
  }

  // ── Tap debounce ───────────────────────────────
  var lastTapTime = 0;

  // ── Navigation ─────────────────────────────────
  function showCats() {
    state.level = 0; state.cat = null; state.subcat = null;
    resize();
    var positions = honeycombLayout(data, CAT_R);
    state.hexes = data.map(function(cat, i) {
      return {
        id: cat.id, label: cat.label,
        x: positions[i].x, y: positions[i].y, r: CAT_R,
        color: cat.color, textColor: cat.textColor || '#1a1a1a',
        locked: false, type: 'cat', data: cat,
      };
    });
    render();
  }

  function adaptiveR(baseR, count, areaW, areaH) {
    var area = areaW * areaH;
    var needed = count * Math.pow(baseR * 2.3, 2);
    if (needed > area * 0.7) {
      var scale = Math.sqrt((area * 0.7) / needed);
      return Math.max(Math.round(baseR * scale), 28);
    }
    return baseR;
  }

  // Generate hex ring positions radiating from center.
  // Uses axial coordinates converted to pixel positions.
  // innerDist = center-to-center for ring 1 (accounts for parent size)
  // stepDist  = center-to-center between children in outer rings
  function hexRingSlots(cx, cy, r, maxRings, innerDist, stepDist) {
    var slots = [];
    for (var ring = 1; ring <= maxRings; ring++) {
      // Distance from center for this ring
      var ringDist = innerDist + (ring - 1) * stepDist;
      for (var side = 0; side < 6; side++) {
        for (var step = 0; step < ring; step++) {
          var a0 = (Math.PI / 3) * side - Math.PI / 6;  // corner angle
          var a1 = (Math.PI / 3) * ((side + 2) % 6) - Math.PI / 6;  // edge walk direction
          var sx = cx + ringDist * Math.cos(a0) + step * stepDist * Math.cos(a1);
          var sy = cy + ringDist * Math.sin(a0) + step * stepDist * Math.sin(a1);
          if (sx - r >= 2 && sx + r <= svgW - 2 && sy - r >= 2 && sy + r <= svgH - 2) {
            slots.push({ x: sx, y: sy });
          }
        }
      }
    }
    return slots;
  }

  // Build hex layout: locked parents keep positions, children fill
  // ring slots radiating outward from the parent — tight cluster.
  function buildGrid(lockedHexes, childItems, childR, childType) {
    var r = adaptiveR(childR, childItems.length, svgW, svgH);
    var parentHex = lockedHexes[lockedHexes.length - 1] || lockedHexes[0];
    var gap = gapForLevel(state.level);

    // Ring 1 distance: must clear the parent hex (which may be larger)
    var innerDist = (parentHex.r + r) * gap;
    // Step distance between children in same/outer rings
    var stepDist = r * Math.sqrt(3) * gap;

    var maxRings = Math.max(3, Math.ceil(Math.sqrt(childItems.length)));
    var slots = hexRingSlots(parentHex.x, parentHex.y, r, maxRings, innerDist, stepDist);

    // Filter out slots that overlap ANY locked hex (parent, grandparent, etc.)
    // Also filter slots that overlap already-accepted children
    var freeSlots = [];
    slots.forEach(function(pos) {
      var overlaps = lockedHexes.some(function(lh) {
        var dx = lh.x - pos.x, dy = lh.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) < (lh.r + r) * gap;
      });
      if (!overlaps) freeSlots.push(pos);
    });

    // Deduplicate slots that are too close to each other
    var uniqueSlots = [];
    freeSlots.forEach(function(pos) {
      var tooClose = uniqueSlots.some(function(u) {
        var dx = u.x - pos.x, dy = u.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) < r * 1.5;
      });
      if (!tooClose) uniqueSlots.push(pos);
    });

    var hexes = lockedHexes.slice();
    childItems.forEach(function(item, i) {
      if (i >= uniqueSlots.length) return;
      var pos = uniqueSlots[i];
      if (pos.y + r > svgH - 4) {
        svgH = pos.y + r + 10;
        svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
      }
      hexes.push({
        id:        item.id    || item,
        label:     item.label || item,
        x: pos.x,  y: pos.y,  r: r,
        color:     parentHex.color,
        textColor: parentHex.textColor,
        locked:    false,
        type:      childType || 'item',
        data:      item,
      });
    });
    return hexes;
  }

  function showSubcats(catHex) {
    resize();
    state.level = 1; state.cat = catHex;
    catHex.locked = true;
    state.hexes = buildGrid([catHex], catHex.data.subcats, SUBCAT_R, 'subcat');
    render();
  }

  function showItems(subcatHex) {
    resize();
    state.level = 2; state.subcat = subcatHex;
    subcatHex.locked = true;
    state.cat.locked = true;
    state.hexes = buildGrid([state.cat, subcatHex], subcatHex.data.items, ITEM_R, 'item');
    render();
  }

  function showItemsDirect(catHex) {
    resize();
    state.level = 2; state.cat = catHex; state.subcat = null;
    catHex.locked = true;
    var items = (catHex.data.subcats && catHex.data.subcats[0]) ? catHex.data.subcats[0].items : [];
    state.hexes = buildGrid([catHex], items, SUBCAT_R, 'item');
    render();
  }

  // ── Mandatory Modifier Flow ────────────────────
  function resetModState() {
    modState.active = false;
    modState.itemHex = null;
    modState.itemData = null;
    modState.groups = [];
    modState.selectedMods = [];
    modState.satisfied = {};
    modState.currentGroup = null;
  }

  function showModGroups(itemHex, fresh) {
    resize();
    if (fresh) {
      modState.active = true;
      modState.itemHex = itemHex;
      modState.itemData = itemHex.data;
      modState.groups = itemHex.data.requiredMods.filter(function(g) {
        return g.choices && g.choices.length > 0;
      });
      modState.selectedMods = [];
      modState.satisfied = {};
      modState.currentGroup = null;
      // If no valid groups remain, skip mod flow entirely
      if (modState.groups.length === 0) {
        resetModState();
        onSelect(itemHex.data);
        return;
      }
    }

    itemHex.locked = true;
    state.level = 3;
    // Anchor cat top-left, item hex beside it
    if (state.cat && state.cat !== itemHex) {
      anchorTopLeft(state.cat);
      itemHex.x = state.cat.x + (state.cat.r + itemHex.r) * gapForLevel(3) + 8;
      itemHex.y = state.cat.y;
    } else {
      anchorTopLeft(itemHex);
    }
    var locked = [itemHex];
    if (state.cat && state.cat !== itemHex) locked.unshift(state.cat);

    // Build group items with label swap for satisfied groups
    var groupItems = modState.groups.map(function(g) {
      var sel = null;
      modState.selectedMods.forEach(function(m) { if (m.group === g.id) sel = m; });
      return {
        id: g.id,
        label: sel ? sel.label : g.label,
        color: g.color,
        textColor: g.textColor,
        choices: g.choices,
      };
    });

    var allSatisfied = modState.groups.every(function(g) { return modState.satisfied[g.id]; });
    var catColor = state.cat ? state.cat.color : itemHex.color;
    var catText  = state.cat ? (state.cat.textColor || '#1a1a1a') : (itemHex.textColor || '#1a1a1a');

    // Add DONE to the list if all satisfied
    if (allSatisfied) {
      groupItems.push({ id: '__done__', label: 'DONE', isDone: true });
    }

    state.hexes = buildGrid(locked, groupItems, SUBCAT_R, 'modgroup');
    // Style the mod-group hexes
    state.hexes.forEach(function(h) {
      if (h.type !== 'modgroup') return;
      if (h.data.isDone) {
        h.type = 'done';
        h.color = catColor;
        h.textColor = catText;
      } else if (modState.satisfied[h.data.id]) {
        h.locked = true;
        h.color = catColor;
        h.textColor = catText;
      } else {
        h.pulse = true;
        h.color = T.mint;
        h.textColor = '#1a1a1a';
      }
    });
    render();
  }

  function showModChoices(modGroupHex) {
    resize();
    modState.currentGroup = modGroupHex;
    modGroupHex.locked = true;
    state.level = 4;

    var locked = [modState.itemHex, modGroupHex];
    if (state.cat && state.cat !== modState.itemHex) locked.unshift(state.cat);

    var groupData = modGroupHex.data;
    var choiceItems = groupData.choices.map(function(c) {
      return { id: c.label, label: c.label, price: c.price, groupId: groupData.id };
    });

    state.hexes = buildGrid(locked, choiceItems, ITEM_R, 'mod');
    // Style mod choices
    state.hexes.forEach(function(h) {
      if (h.type !== 'mod') return;
      h.color = T.mint;
      h.textColor = '#1a1a1a';
      h.pulse = true;
    });
    render();
  }

  function selectMod(modHex) {
    var groupId = modHex.data.groupId;
    var label   = modHex.data.label;
    var price   = modHex.data.price || 0;

    // Single-select: replace any prior selection for this group
    modState.selectedMods = modState.selectedMods.filter(function(m) {
      return m.group !== groupId;
    });
    modState.selectedMods.push({ group: groupId, label: label, price: price });
    modState.satisfied[groupId] = true;

    // Return to mod-group level
    showModGroups(modState.itemHex, false);
  }

  function handleDoneTap() {
    var allDone = modState.groups.every(function(g) { return modState.satisfied[g.id]; });
    if (!allDone) return;  // shouldn't happen — DONE only shows when all satisfied

    var result = {};
    for (var k in modState.itemData) result[k] = modState.itemData[k];
    result.selectedMods = modState.selectedMods.slice();

    // Restore nav to item level before firing callback
    var savedCat    = state.cat;
    var savedSubcat = state.subcat;
    resetModState();
    if (savedSubcat) showItems(savedSubcat);
    else if (savedCat) showItemsDirect(savedCat);
    else showCats();

    onSelect(result);
  }

  var navLocked = false;

  function onHexTap(h) {
    var now = Date.now();
    if (now - lastTapTime < 100) return;
    lastTapTime = now;

    if (h.locked) {
      if (navLocked) return;  // during combo flow, ignore locked hex taps
      // Back navigation for mod flow
      if (modState.active && h.type === 'item') {
        resetModState();
        if (state.subcat) showItems(state.subcat);
        else if (state.cat) showItemsDirect(state.cat);
        else showCats();
        return;
      }
      // Tap locked mod-group: at level 4 go back to groups, at level 3 re-pick
      if (modState.active && h.type === 'modgroup') {
        if (state.level === 4) {
          showModGroups(modState.itemHex, false);
        } else {
          showModChoices(h);
        }
        return;
      }
      if (h.type === 'cat')    showCats();
      if (h.type === 'subcat') showSubcats(state.cat);
      return;
    }
    if (h.type === 'cat') {
      if (h.data.subcats.length === 1) {
        showItemsDirect(h);
      } else {
        showSubcats(h);
      }
      return;
    }
    if (h.type === 'subcat') { showItems(h); return; }
    if (h.type === 'item') {
      if (h.data.requiredMods && h.data.requiredMods.length > 0) {
        showModGroups(h, true);
      } else {
        onSelect(h.data);
      }
      return;
    }
    if (h.type === 'modgroup') { showModChoices(h); return; }
    if (h.type === 'mod')     { selectMod(h); return; }
    if (h.type === 'done')    { handleDoneTap(); return; }
  }

  // ── Public API ─────────────────────────────────
  this.setData = function(newData) {
    data = newData;
    resetModState();
    resize();
    showCats();
  };

  this.reset = function() {
    resetModState();
    resize();
    showCats();
  };

  this.showPickList = function(label, color, textColor, items) {
    resize();
    state.level = 2; state.subcat = null;
    var centerHex = {
      id: 'pick-center', label: label,
      x: 0, y: 0, r: CAT_R,
      color: color, textColor: textColor || '#1a1a1a',
      locked: true, type: 'cat', data: { subcats: [] },
    };
    state.cat = centerHex;
    state.hexes = buildGrid([centerHex], items, SUBCAT_R, 'item');
    render();
  };

  this.getCatId = function() {
    return state.cat ? state.cat.id : null;
  };

  this.lockNav   = function() { navLocked = true; };
  this.unlockNav = function() { navLocked = false; };

  this.destroy = function() {
    svg.remove();
  };

  // ── Init ───────────────────────────────────────
  resize();
  // Delay first render so container has final dimensions
  requestAnimationFrame(function() {
    resize();
    showCats();
  });
}