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
      var a = (Math.PI / 3) * i;  // flat-top: first vertex at 0° (right)
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
    var size = r * g;
    var total = allItems.length;

    // Axial to pixel (flat-top) centered at (0,0)
    function axToPixel(q, rax) {
      return {
        x: size * 1.5 * q,
        y: size * Math.sqrt(3) * (rax + q / 2)
      };
    }

    // Generate axial coords in a compact hex spiral
    // Start at center, spiral outward
    var coords = [{ q: 0, r: 0 }];
    var ring = 1;
    while (coords.length < total) {
      var q = ring, rax = 0;
      // 6 directions for hex ring walk
      var dirs = [[0,-1],[-1,0],[-1,1],[0,1],[1,0],[1,-1]];
      for (var d = 0; d < 6 && coords.length < total; d++) {
        for (var s = 0; s < ring && coords.length < total; s++) {
          coords.push({ q: q, r: rax });
          q += dirs[d][0];
          rax += dirs[d][1];
        }
      }
      ring++;
    }

    // Convert to pixel positions
    var rawPositions = coords.map(function(c) { return axToPixel(c.q, c.r); });

    // Center the whole group in the viewport
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rawPositions.forEach(function(p) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    var offsetX = (svgW - (maxX - minX)) / 2 - minX;
    var offsetY = (svgH - (maxY - minY)) / 2 - minY;

    return rawPositions.map(function(p) {
      var x = p.x + offsetX;
      var y = p.y + offsetY;
      if (x < r + 4) x = r + 4;
      if (y < r + 4) y = r + 4;
      if (y + r > svgH - 4) {
        svgH = y + r + 10;
        svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
      }
      return { x: x, y: y };
    });
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

  // Generate flat-top honeycomb grid slots centered on (cx, cy).
  // Same math as honeycombLayout but centered on parent, not viewport.
  // Generates enough slots to cover children, sorted nearest-first.
  // Generate hex neighbor positions using axial coordinates.
  // For flat-top hexes, the 6 neighbor offsets in axial (q, r) are:
  //   (+1,0) (-1,0) (0,+1) (0,-1) (+1,-1) (-1,+1)
  // Convert axial to pixel: x = r * 1.5 * q, y = r * sqrt(3) * (r_ax + q/2)
  function gridSlotsAround(cx, cy, r, count, gap, childR) {
    var actualR = childR || r;  // actual child radius for boundary checks
    var size = r * gap;
    // Axial to pixel conversion for flat-top hexes
    function axToPixel(q, rax) {
      return {
        x: cx + size * 1.5 * q,
        y: cy + size * Math.sqrt(3) * (rax + q / 2)
      };
    }

    // Generate all axial coords in a hex-shaped region
    var radius = Math.max(3, Math.ceil(Math.sqrt(count)));
    var slots = [];
    for (var q = -radius; q <= radius; q++) {
      for (var rax = -radius; rax <= radius; rax++) {
        // Hex constraint: |q + r| <= radius
        if (Math.abs(q + rax) > radius) continue;
        // Skip center (parent)
        if (q === 0 && rax === 0) continue;
        var pos = axToPixel(q, rax);
        // Keep in viewport
        if (pos.x - actualR < 2 || pos.x + actualR > svgW - 2) continue;
        if (pos.y - actualR < 2 || pos.y + actualR > svgH - 2) continue;
        slots.push(pos);
      }
    }

    // Sort: nearest to parent first, bias toward viewport center
    var vcx = svgW / 2, vcy = svgH / 2;
    var nearDist = size * size * 4;
    slots.sort(function(a, b) {
      var dxA = a.x - cx, dyA = a.y - cy;
      var dxB = b.x - cx, dyB = b.y - cy;
      var distA = dxA * dxA + dyA * dyA;
      var distB = dxB * dxB + dyB * dyB;
      if (Math.abs(distA - distB) > nearDist * 0.5) return distA - distB;
      var vdxA = a.x - vcx, vdyA = a.y - vcy;
      var vdxB = b.x - vcx, vdyB = b.y - vcy;
      return (vdxA * vdxA + vdyA * vdyA) - (vdxB * vdxB + vdyB * vdyB);
    });
    return slots;
  }

  // Build hex layout: children use their own radius, scaling down
  // at each drill-down level. Axial coords handle mixed-size tiling.
  function buildGrid(lockedHexes, childItems, childR, childType) {
    var parentHex = lockedHexes[lockedHexes.length - 1] || lockedHexes[0];
    var r = adaptiveR(childR, childItems.length, svgW, svgH);
    var gap = gapForLevel(state.level);

    // Use average radius for grid spacing so ring-1 aligns at edge-sharing distance
    var gridR = (parentHex.r + r) / 2;
    var slots = gridSlotsAround(parentHex.x, parentHex.y, gridR, childItems.length, gap, r);

    // Only avoid overlapping parent and grandparent (last 2 locked hexes)
    var avoidHexes = lockedHexes.slice(-2);
    var freeSlots = [];
    slots.forEach(function(pos) {
      var overlaps = avoidHexes.some(function(lh) {
        var dx = lh.x - pos.x, dy = lh.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) < (lh.r + r) * 0.85;
      });
      if (!overlaps) freeSlots.push(pos);
    });

    var hexes = lockedHexes.slice();
    childItems.forEach(function(item, i) {
      if (i >= freeSlots.length) return;
      var pos = freeSlots[i];
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
    var locked = [itemHex];
    if (state.cat && state.cat !== itemHex) {
      state.cat.locked = true;
      locked.unshift(state.cat);
    }

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
      x: svgW / 2, y: svgH / 2, r: CAT_R,
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