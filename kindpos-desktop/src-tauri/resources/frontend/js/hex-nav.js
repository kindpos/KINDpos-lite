// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Hex Navigation Component
//  Self-contained hex bloom nav for items + modifiers
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from './tokens.js';

// ── Bevel color helpers (match clock-in card depth pattern) ──
function _lightenHex(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return '#' + [
    Math.min(255, Math.round(r + (255 - r) * pct)),
    Math.min(255, Math.round(g + (255 - g) * pct)),
    Math.min(255, Math.round(b + (255 - b) * pct)),
  ].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}
function _darkenHex(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var f = 1 - pct;
  return '#' + [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
    .map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

var CAT_R    = 80;
var SUBCAT_R = 70;
var ITEM_R   = 70;
var MOD_R    = 70;
// Gap multipliers per depth — breathing room between hexes
var GAPS = [1.12, 1.02, 1.02, 1.02, 1.02];
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
  var scale    = o.scale   || 1;
  var sCatR    = Math.round(CAT_R    * scale);
  var sSubcatR = Math.round(SUBCAT_R * scale);
  var sItemR   = Math.round(ITEM_R   * scale);
  var sModR    = Math.round(MOD_R    * scale);

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

  // ── Connector lines (from item to mod groups) ──
  var connectorLines = [];

  // ── Render ─────────────────────────────────────
  function render() {
    svg.innerHTML = '';
    // Draw connector lines first (behind hexes)
    connectorLines.forEach(function(line) {
      var pathEl = document.createElementNS(svgNS, 'line');
      pathEl.setAttribute('x1', line.x1);
      pathEl.setAttribute('y1', line.y1);
      pathEl.setAttribute('x2', line.x2);
      pathEl.setAttribute('y2', line.y2);
      pathEl.setAttribute('stroke', line.color || T.mint);
      pathEl.setAttribute('stroke-width', '3');
      pathEl.setAttribute('stroke-opacity', '0.5');
      pathEl.setAttribute('stroke-dasharray', '8,6');
      // Animate dash to create flow effect
      var animDash = document.createElementNS(svgNS, 'animate');
      animDash.setAttribute('attributeName', 'stroke-dashoffset');
      animDash.setAttribute('values', '0;-28');
      animDash.setAttribute('dur', '1.5s');
      animDash.setAttribute('repeatCount', 'indefinite');
      pathEl.appendChild(animDash);
      svg.appendChild(pathEl);
    });
    state.hexes.forEach(drawHex);
  }

  function drawHex(h) {
    var g = document.createElementNS(svgNS, 'g');
    g.style.cursor = 'pointer';

    var baseColor = h.color;
    var lightColor = _lightenHex(baseColor, 0.25);
    var darkColor  = _darkenHex(baseColor, 0.4);
    var bevelOff = 2.5; // offset for bevel layers

    // Drop shadow (behind everything)
    var shadow = document.createElementNS(svgNS, 'polygon');
    shadow.setAttribute('points', hexPoints(h.x + 3, h.y + 4, h.r));
    shadow.setAttribute('fill', 'rgba(0,0,0,0.45)');
    g.appendChild(shadow);

    // Dark bevel layer (bottom-right — drawn first, shifted down-right)
    var darkBevel = document.createElementNS(svgNS, 'polygon');
    darkBevel.setAttribute('points', hexPoints(h.x + bevelOff, h.y + bevelOff, h.r));
    darkBevel.setAttribute('fill', 'none');
    darkBevel.setAttribute('stroke', darkColor);
    darkBevel.setAttribute('stroke-width', '5');
    g.appendChild(darkBevel);

    // Light bevel layer (top-left — shifted up-left)
    var lightBevel = document.createElementNS(svgNS, 'polygon');
    lightBevel.setAttribute('points', hexPoints(h.x - bevelOff, h.y - bevelOff, h.r));
    lightBevel.setAttribute('fill', 'none');
    lightBevel.setAttribute('stroke', lightColor);
    lightBevel.setAttribute('stroke-width', '5');
    g.appendChild(lightBevel);

    // Main hex polygon (on top of bevels)
    var poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', hexPoints(h.x, h.y, h.r));
    if (h.locked) {
      poly.setAttribute('fill', h.color);
      poly.setAttribute('stroke', h.color);
      poly.setAttribute('stroke-width', '7');
    } else {
      poly.setAttribute('fill', T.bg5);
      poly.setAttribute('stroke', h.color);
      poly.setAttribute('stroke-width', '7');
    }
    g.appendChild(poly);

    // Inner highlight bevel (locked gets brighter, unlocked gets subtle)
    var innerBevel = document.createElementNS(svgNS, 'polygon');
    innerBevel.setAttribute('points', hexPoints(h.x, h.y, h.r - 6));
    innerBevel.setAttribute('fill', 'none');
    if (h.locked) {
      innerBevel.setAttribute('stroke', 'rgba(255,255,255,0.3)');
    } else {
      innerBevel.setAttribute('stroke', 'rgba(255,255,255,0.08)');
    }
    innerBevel.setAttribute('stroke-width', '2');
    g.appendChild(innerBevel);

    // Pulse animation for unsatisfied mandatory mod hexes
    if (h.pulse) {
      var anim = document.createElementNS(svgNS, 'animate');
      anim.setAttribute('attributeName', 'stroke-opacity');
      anim.setAttribute('values', '1;0.3;1');
      anim.setAttribute('dur', '1.5s');
      anim.setAttribute('repeatCount', 'indefinite');
      poly.appendChild(anim);
    }

    // Label — scale font to fill hex as much as possible
    var lines    = h.label.split(' ');
    var longestWord = '';
    lines.forEach(function(w) { if (w.length > longestWord.length) longestWord = w; });
    // Start with a font size that fills the hex width for the longest word
    // Hex usable width ≈ r * 1.7, each char ≈ fontSize * 0.52
    var maxWidth = h.r * 1.7;
    var fontSize = longestWord.length > 0
      ? Math.round(maxWidth / (longestWord.length * 0.52))
      : Math.round(28 * scale);
    // Clamp to reasonable range
    var maxFont = Math.round(38 * scale);
    var minFont = Math.round(14 * scale);
    if (fontSize > maxFont) fontSize = maxFont;
    if (fontSize < minFont) fontSize = minFont;
    // Also shrink if too many lines overflow vertically
    var totalTextH = lines.length * fontSize * 1.2;
    if (totalTextH > h.r * 1.6) {
      fontSize = Math.max(Math.round((h.r * 1.6) / (lines.length * 1.2)), minFont);
    }
    lines.forEach(function(line, i) {
      var text = document.createElementNS(svgNS, 'text');
      var offset = (i - (lines.length - 1) / 2) * (fontSize * 1.05);
      text.setAttribute('x', h.x);
      text.setAttribute('y', h.y + offset);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-family', h.type === 'cat' ? T.fh : T.fb);
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
    connectorLines = [];
    resize();
    var positions = honeycombLayout(data, sCatR);
    state.hexes = data.map(function(cat, i) {
      return {
        id: cat.id, label: cat.label,
        x: positions[i].x, y: positions[i].y, r: sCatR,
        color: cat.color, textColor: cat.textColor || '#1a1a1a',
        locked: false, type: 'cat', data: cat,
      };
    });
    render();
  }

  function adaptiveR(baseR, count, areaW, areaH) {
    var area = areaW * areaH;
    var needed = count * Math.pow(baseR * 2.3, 2);
    if (needed > area * 0.85) {
      var s = Math.sqrt((area * 0.85) / needed);
      return Math.max(Math.round(baseR * s), Math.round(36 * scale));
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

    // Avoid overlapping ALL locked ancestors in the chain
    var freeSlots = [];
    slots.forEach(function(pos) {
      var overlaps = lockedHexes.some(function(lh) {
        var dx = lh.x - pos.x, dy = lh.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) < (lh.r + r) * 0.98;
      });
      if (!overlaps) freeSlots.push(pos);
    });

    // Sort slots top-to-bottom, left-to-right so alphabetical items read naturally
    var sortedSlots = freeSlots.slice(0, childItems.length);
    sortedSlots.sort(function(a, b) {
      var rowSize = r * 0.8;  // threshold for "same row"
      var rowA = Math.round(a.y / rowSize);
      var rowB = Math.round(b.y / rowSize);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });

    // Sort child items alphabetically by label
    var sortedItems = childItems.slice().sort(function(a, b) {
      var la = (a.label || a).toLowerCase();
      var lb = (b.label || b).toLowerCase();
      return la < lb ? -1 : la > lb ? 1 : 0;
    });

    var hexes = lockedHexes.slice();
    sortedItems.forEach(function(item, i) {
      if (i >= sortedSlots.length) return;
      var pos = sortedSlots[i];
      // Scale hex radius based on label length — short labels shrink, long labels grow
      var label = item.label || item;
      var words = label.split(' ');
      var longest = 0;
      words.forEach(function(w) { if (w.length > longest) longest = w.length; });
      var totalChars = label.length;
      // Base: labels ~10 chars get full r, shorter shrink to 88%, longer grow up to 112%
      var charScale = Math.min(Math.max(0.88, (totalChars + longest) / 16), 1.12);
      var itemR = Math.round(r * charScale);
      if (pos.y + itemR > svgH - 4) {
        svgH = pos.y + itemR + 10;
        svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
      }
      hexes.push({
        id:        item.id    || item,
        label:     label,
        x: pos.x,  y: pos.y,  r: itemR,
        color:     parentHex.color,
        textColor: parentHex.textColor,
        locked:    false,
        type:      childType || 'item',
        data:      item,
      });
    });

    // Prevent sibling overlap — shrink any hex that overlaps a neighbor
    var childStart = lockedHexes.length;
    for (var a = childStart; a < hexes.length; a++) {
      for (var b = a + 1; b < hexes.length; b++) {
        var dx = hexes[a].x - hexes[b].x;
        var dy = hexes[a].y - hexes[b].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = (hexes[a].r + hexes[b].r) * 0.95;
        if (dist < minDist && dist > 0) {
          var shrink = dist / minDist;
          hexes[a].r = Math.round(hexes[a].r * shrink);
          hexes[b].r = Math.round(hexes[b].r * shrink);
        }
      }
    }

    return hexes;
  }

  function showSubcats(catHex) {
    resize();
    state.level = 1;
    connectorLines = [];
    var cat = catHex.data;
    var subcats = cat.subcats;
    var r = adaptiveR(sSubcatR, subcats.length + 1, svgW, svgH);
    var positions = honeycombLayout(new Array(subcats.length + 1), r);
    var parentHex = {
      id: cat.id, label: cat.label,
      x: positions[0].x, y: positions[0].y, r: r,
      color: catHex.color, textColor: catHex.textColor || '#1a1a1a',
      locked: true, type: 'cat', data: cat,
    };
    state.cat = parentHex;
    state.subcat = null;
    state.hexes = [parentHex];
    subcats.forEach(function(sub, i) {
      state.hexes.push({
        id: sub.id, label: sub.label || sub,
        x: positions[i + 1].x, y: positions[i + 1].y, r: r,
        color: catHex.color, textColor: catHex.textColor || '#1a1a1a',
        locked: false, type: 'subcat', data: sub,
      });
    });
    render();
  }

  function showItems(subcatHex) {
    resize();
    state.level = 2;
    connectorLines = [];
    var items = subcatHex.data.items;
    var r = adaptiveR(sItemR, items.length + 1, svgW, svgH);
    var positions = honeycombLayout(new Array(items.length + 1), r);
    var parentHex = {
      id: subcatHex.id, label: subcatHex.label,
      x: positions[0].x, y: positions[0].y, r: r,
      color: state.cat.color, textColor: state.cat.textColor || '#1a1a1a',
      locked: true, type: 'subcat', data: subcatHex.data,
    };
    state.subcat = parentHex;
    state.hexes = [parentHex];
    items.forEach(function(item, i) {
      state.hexes.push({
        id: item.id || item, label: item.label || item,
        x: positions[i + 1].x, y: positions[i + 1].y, r: r,
        color: state.cat.color, textColor: state.cat.textColor || '#1a1a1a',
        locked: false, type: 'item', data: item,
      });
    });
    render();
  }

  function showItemsDirect(catHex) {
    resize();
    state.level = 2;
    connectorLines = [];
    state.subcat = null;
    var items = (catHex.data.subcats && catHex.data.subcats[0]) ? catHex.data.subcats[0].items : [];
    var r = adaptiveR(sSubcatR, items.length + 1, svgW, svgH);
    var positions = honeycombLayout(new Array(items.length + 1), r);
    var parentHex = {
      id: catHex.data.id || catHex.id, label: catHex.data.label || catHex.label,
      x: positions[0].x, y: positions[0].y, r: r,
      color: catHex.color, textColor: catHex.textColor || '#1a1a1a',
      locked: true, type: 'cat', data: catHex.data,
    };
    state.cat = parentHex;
    state.hexes = [parentHex];
    items.forEach(function(item, i) {
      state.hexes.push({
        id: item.id || item, label: item.label || item,
        x: positions[i + 1].x, y: positions[i + 1].y, r: r,
        color: catHex.color, textColor: catHex.textColor || '#1a1a1a',
        locked: false, type: 'item', data: item,
      });
    });
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
    connectorLines = [];
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

    // ── Position item hex in top-left corner ──
    var itemR = sItemR;
    itemHex.x = itemR + 20;
    itemHex.y = itemR + 20;
    itemHex.r = itemR;

    var catColor = state.cat ? state.cat.color : itemHex.color;
    var catText  = state.cat ? (state.cat.textColor || '#1a1a1a') : (itemHex.textColor || '#1a1a1a');

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

    // Add DONE to the list if all satisfied
    if (allSatisfied) {
      groupItems.push({ id: '__done__', label: 'DONE', isDone: true });
    }

    // ── Layout mod groups extending from item hex ──
    // Fan out horizontally to the right, vertically spaced
    var groupR = adaptiveR(sItemR, groupItems.length, svgW, svgH);
    var startX = itemHex.x + itemR + groupR + 60;
    var spacingY = groupR * 2.4;
    var totalH = (groupItems.length - 1) * spacingY;
    var startY = Math.max(groupR + 10, (svgH - totalH) / 2);

    var hexes = [itemHex];
    connectorLines = [];

    groupItems.forEach(function(g, i) {
      var gx = startX + (i % 2 === 1 ? groupR * 0.8 : 0);
      var gy = startY + i * spacingY;
      if (gy + groupR > svgH - 4) {
        svgH = gy + groupR + 10;
        svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
      }
      var h = {
        id: g.id, label: g.label,
        x: gx, y: gy, r: groupR,
        color: g.color || T.mint,
        textColor: g.textColor || '#1a1a1a',
        locked: false, type: 'modgroup', data: g,
      };

      if (g.isDone) {
        h.type = 'done';
        h.color = catColor;
        h.textColor = catText;
      } else if (modState.satisfied[g.id]) {
        h.locked = true;
        h.color = catColor;
        h.textColor = catText;
      } else {
        h.pulse = true;
        h.color = T.mint;
        h.textColor = '#1a1a1a';
      }

      hexes.push(h);

      // Connector line from item hex to this group
      connectorLines.push({
        x1: itemHex.x + itemR * 0.8,
        y1: itemHex.y + (i > 0 ? itemR * 0.3 : 0),
        x2: gx - groupR * 0.8,
        y2: gy,
        color: h.color,
      });
    });

    state.hexes = hexes;
    render();
  }

  function showModChoices(modGroupHex) {
    resize();
    modState.currentGroup = modGroupHex;
    modGroupHex.locked = true;
    state.level = 4;

    var itemHex = modState.itemHex;
    var groupData = modGroupHex.data;
    var choiceItems = groupData.choices.map(function(c) {
      return { id: c.label, label: c.label, price: c.price, groupId: groupData.id };
    });

    // Keep item hex in top-left, group hex stays, choices fan out from group
    var choiceR = adaptiveR(sModR, choiceItems.length, svgW - modGroupHex.x, svgH);
    var startX = modGroupHex.x + modGroupHex.r + choiceR + 40;
    var spacingY = choiceR * 2.2;
    var totalH = (choiceItems.length - 1) * spacingY;
    var startY = Math.max(choiceR + 10, modGroupHex.y - totalH / 2);

    var hexes = [itemHex, modGroupHex];
    connectorLines = [{
      x1: itemHex.x + itemHex.r * 0.8,
      y1: itemHex.y,
      x2: modGroupHex.x - modGroupHex.r * 0.8,
      y2: modGroupHex.y,
      color: modGroupHex.color,
    }];

    choiceItems.forEach(function(c, i) {
      var cx = startX + (i % 2 === 1 ? choiceR * 0.6 : 0);
      var cy = startY + i * spacingY;
      if (cy + choiceR > svgH - 4) {
        svgH = cy + choiceR + 10;
        svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
      }
      var h = {
        id: c.id, label: c.label,
        x: cx, y: cy, r: choiceR,
        color: T.mint, textColor: '#1a1a1a',
        locked: false, type: 'mod', data: c,
        pulse: true,
      };
      hexes.push(h);

      // Connector line from group to choice
      connectorLines.push({
        x1: modGroupHex.x + modGroupHex.r * 0.8,
        y1: modGroupHex.y,
        x2: cx - choiceR * 0.8,
        y2: cy,
        color: T.mint,
      });
    });

    state.hexes = hexes;
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
      x: svgW / 2, y: svgH / 2, r: sCatR,
      color: color, textColor: textColor || '#1a1a1a',
      locked: true, type: 'cat', data: { subcats: [] },
    };
    state.cat = centerHex;
    state.hexes = buildGrid([centerHex], items, sSubcatR, 'item');
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