// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Hex Navigation Component
//  Self-contained hex bloom nav for items + modifiers
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from './tokens.js';

var CAT_R    = 80;
var SUBCAT_R = 70;
var ITEM_R   = 48;
var GAP      = 1.04;
var NBTH     = 1.15; // neighbor threshold multiplier

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

  function getOccupiedFaces(target, allHexes) {
    var occ = [false, false, false, false, false, false];
    allHexes.forEach(function(h) {
      if (h === target) return;
      var dx = h.x - target.x, dy = h.y - target.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > (target.r + h.r) * NBTH) return;
      var angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;
      var face = Math.round((angle + Math.PI / 2) / (Math.PI / 3)) % 6;
      occ[face] = true;
    });
    return occ;
  }

  function getChildPositions(parent, childR, allHexes, towardCenter) {
    var occ  = getOccupiedFaces(parent, allHexes);
    var dist = (parent.r + childR) * GAP + 8;
    var positions = [];
    var startFace;
    if (towardCenter) {
      // Pick the face that points toward the viewport center
      var toCenterAngle = Math.atan2(svgH / 2 - parent.y, svgW / 2 - parent.x);
      // Convert angle to face index (face 0 = top, goes clockwise)
      var normAngle = toCenterAngle + Math.PI / 2; // offset to match hex face 0 = top
      if (normAngle < 0) normAngle += Math.PI * 2;
      startFace = Math.round(normAngle / (Math.PI / 3)) % 6;
    } else {
      // Seed from parent position — deterministic per hex, varied between hexes
      startFace = Math.abs(Math.floor(parent.x * 7 + parent.y * 3)) % 6;
    }
    for (var i = 0; i < 6; i++) {
      var face = (startFace + i) % 6;
      if (occ[face]) continue;
      var angle = -Math.PI / 2 + (Math.PI / 3) * face + Math.PI / 6;
      var x = parent.x + dist * Math.cos(angle);
      var y = parent.y + dist * Math.sin(angle);
      if (x - childR < 2 || x + childR > svgW - 2) continue;
      if (y - childR < 2 || y + childR > svgH - 2) continue;
      positions.push({ x: x, y: y });
    }
    return positions;
  }

  function noCollision(x, y, r, allHexes) {
    for (var i = 0; i < allHexes.length; i++) {
      var h = allHexes[i];
      var dx = h.x - x, dy = h.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < (h.r + r) * 1.05) return false;
    }
    return true;
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

  // ── Chain bloom placement ──────────────────────
  // First child off parent, subsequent children off the
  // already-placed child nearest to parent, preferring
  // positions that face back toward the parent
  function placeChain(parent, items, childR, locked, gravity, opts) {
  var grav = gravity || parent;
  var preferSpace = opts && opts.preferSpace;
  var placed = [];

  items.forEach(function(item, idx) {
    var allHexes = locked.concat(placed);
    var sources = idx === 0 ? [parent] : [parent].concat(placed);
    var candidates = [];

    sources.forEach(function(src) {
      getChildPositions(src, childR, allHexes, preferSpace).forEach(function(pos) {
        candidates.push(pos);
      });
    });

    // Deduplicate
    var unique = [];
    candidates.forEach(function(c) {
      var isDup = unique.some(function(u) {
        return Math.abs(u.x - c.x) < 4 && Math.abs(u.y - c.y) < 4;
      });
      if (!isDup) unique.push(c);
    });

    // Prefer positions closest to gravity (cat/parent)
    unique.sort(function(a, b) {
      var dxA = a.x - grav.x, dyA = a.y - grav.y;
      var dxB = b.x - grav.x, dyB = b.y - grav.y;
      return (dxA * dxA + dyA * dyA) - (dxB * dxB + dyB * dyB);
    });

    var pos = null;
    for (var j = 0; j < unique.length; j++) {
      if (noCollision(unique[j].x, unique[j].y, childR, allHexes)) {
        pos = unique[j]; break;
      }
    }

    // Fallback: try all 12 directions from every placed hex with tighter packing
    if (!pos) {
      var fallbackDist = childR * 2.1;
      var allSources = [parent].concat(placed);
      for (var si = 0; si < allSources.length && !pos; si++) {
        var src = allSources[si];
        for (var a = 0; a < 12 && !pos; a++) {
          var angle = (Math.PI / 6) * a;
          var fx = src.x + fallbackDist * Math.cos(angle);
          var fy = src.y + fallbackDist * Math.sin(angle);
          if (fx - childR < 0 || fx + childR > svgW) continue;
          if (fy - childR < 0 || fy + childR > svgH) continue;
          if (noCollision(fx, fy, childR, allHexes)) {
            pos = { x: fx, y: fy };
          }
        }
      }
    }

    // Grid scan: systematically search the viewport for any open position
    if (!pos) {
      var step = childR * 1.8;
      var bestDist = Infinity;
      for (var gy = childR + 2; gy < svgH - childR; gy += step) {
        for (var gx = childR + 2; gx < svgW - childR; gx += step) {
          if (noCollision(gx, gy, childR, allHexes)) {
            var dgx = gx - grav.x, dgy = gy - grav.y;
            var d = dgx * dgx + dgy * dgy;
            if (d < bestDist) { bestDist = d; pos = { x: gx, y: gy }; }
          }
        }
      }
    }

    // Last resort: extend viewport height and place below existing hexes
    if (!pos) {
      var maxY = 0;
      allHexes.forEach(function(h) { if (h.y + h.r > maxY) maxY = h.y + h.r; });
      placed.forEach(function(h) { if (h.y + h.r > maxY) maxY = h.y + h.r; });
      var ny = maxY + childR + 10;
      var nx = grav.x;
      if (nx - childR < 2) nx = childR + 2;
      if (nx + childR > svgW - 2) nx = svgW - childR - 2;
      svgH = ny + childR + 10;
      svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
      pos = { x: nx, y: ny };
    }

    if (!pos) return;

    placed.push({
      id:        item.id    || item,
      label:     item.label || item,
      x: pos.x,  y: pos.y,  r: childR,
      color:     parent.color,
      textColor: parent.textColor,
      locked:    false,
      type:      childR === SUBCAT_R ? 'subcat' : 'item',
      data:      item,
    });
  });

  return placed;
}

  // ── Tap debounce ───────────────────────────────
  var lastTapTime = 0;

  // ── Navigation ─────────────────────────────────
  function showCats() {
    state.level = 0; state.cat = null; state.subcat = null;

    // Re-measure container each time
    resize();

    var colStep = CAT_R * Math.sqrt(3) * 1.08 + 8;
    var rowStep = CAT_R * 1.5 * 1.08 + 8;
    var startX  = CAT_R + 20;
    var startY  = CAT_R + 20;

    // Build honeycomb rows: row 0 = full width, row 1 = offset, etc.
    // Fit as many per row as possible
    var perRow = Math.floor((svgW - startX - CAT_R) / colStep) + 1;
    perRow = Math.max(2, perRow);

    var positions = data.map(function(_, i) {
      var row = Math.floor(i / perRow);
      var col = i % perRow;
      var xOff = (row % 2 === 1) ? colStep / 2 : 0;
      return {
        x: startX + col * colStep + xOff,
        y: startY + row * rowStep,
      };
    });

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

  function showSubcats(catHex) {
    resize();
    state.level = 1; state.cat = catHex;
    catHex.locked = true;
    var placed = placeChain(catHex, catHex.data.subcats, SUBCAT_R, [catHex], catHex);
    state.hexes = [catHex].concat(placed);
    render();
  }

  function adaptiveR(baseR, count, areaW, areaH) {
    // Shrink hex radius when too many items for the viewport
    var area = areaW * areaH;
    // Each hex needs roughly (2r)^2 of space with gaps
    var needed = count * Math.pow(baseR * 2.3, 2);
    if (needed > area * 0.7) {
      var scale = Math.sqrt((area * 0.7) / needed);
      return Math.max(Math.round(baseR * scale), 28);
    }
    return baseR;
  }

  function showItems(subcatHex) {
    resize();
    state.level = 2; state.subcat = subcatHex;
    subcatHex.locked = true;
    var locked = [state.cat, subcatHex];
    var r = adaptiveR(ITEM_R, subcatHex.data.items.length, svgW, svgH);
    var placed = placeChain(subcatHex, subcatHex.data.items, r, locked, state.cat);
    state.hexes = locked.concat(placed);
    render();
  }

  function showItemsDirect(catHex) {
    resize();
    state.level = 2; state.cat = catHex; state.subcat = null;
    catHex.locked = true;
    var items = (catHex.data.subcats && catHex.data.subcats[0]) ? catHex.data.subcats[0].items : [];
    var r = adaptiveR(SUBCAT_R, items.length, svgW, svgH);
    var placed = placeChain(catHex, items, r, [catHex], catHex);
    placed.forEach(function(h) { h.type = 'item'; });
    state.hexes = [catHex].concat(placed);
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
      modState.groups = itemHex.data.requiredMods;
      modState.selectedMods = [];
      modState.satisfied = {};
      modState.currentGroup = null;
    }

    itemHex.locked = true;
    state.level = 3;
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

    // Count items: groups + maybe DONE
    var allSatisfied = modState.groups.every(function(g) { return modState.satisfied[g.id]; });
    var totalCount = groupItems.length + (allSatisfied ? 1 : 0);
    var r = adaptiveR(SUBCAT_R, totalCount, svgW, svgH);
    var placed = placeChain(itemHex, groupItems, r, locked, itemHex, { preferSpace: true });
    var catColor = state.cat ? state.cat.color : itemHex.color;
    var catText  = state.cat ? (state.cat.textColor || '#1a1a1a') : (itemHex.textColor || '#1a1a1a');
    placed.forEach(function(h) {
      h.type = 'modgroup';
      if (modState.satisfied[h.data.id]) {
        h.locked = true;  // filled = satisfied
        h.color = catColor;
        h.textColor = catText;
      } else {
        h.pulse = true;   // pulsate = needs selection
        h.color = T.mint;
        h.textColor = '#1a1a1a';
      }
    });

    // DONE hex — only when all groups satisfied, in cat/item color
    if (allSatisfied) {
      var doneItems = [{ id: '__done__', label: 'DONE', isDone: true }];
      var donePlaced = placeChain(itemHex, doneItems, r, locked.concat(placed), itemHex, { preferSpace: true });
      donePlaced.forEach(function(h) {
        h.type = 'done';
        h.color = catColor;
        h.textColor = catText;
      });
      placed = placed.concat(donePlaced);
    }

    state.hexes = locked.concat(placed);
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

    var r = adaptiveR(ITEM_R, choiceItems.length, svgW, svgH);
    var placed = placeChain(modGroupHex, choiceItems, r, locked, modGroupHex, { preferSpace: true });
    placed.forEach(function(h) {
      h.type = 'mod';
      h.color = T.mint;
      h.textColor = '#1a1a1a';
      h.pulse = true;  // pulsate until tapped
    });
    state.hexes = locked.concat(placed);
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
      // Tap satisfied mod-group to re-pick
      if (modState.active && h.type === 'modgroup') {
        showModChoices(h);
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
      x: CAT_R + 20, y: svgH / 2, r: CAT_R,
      color: color, textColor: textColor || '#1a1a1a',
      locked: true, type: 'cat', data: { subcats: [] },
    };
    state.cat = centerHex;
    var r = adaptiveR(SUBCAT_R, items.length, svgW, svgH);
    var placed = placeChain(centerHex, items, r, [centerHex], centerHex);
    placed.forEach(function(h) { h.type = 'item'; });
    state.hexes = [centerHex].concat(placed);
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