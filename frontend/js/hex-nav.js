// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Hex Navigation Component
//  Self-contained hex bloom nav for items + modifiers
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

var CAT_R    = 80;
var SUBCAT_R = 80;
var ITEM_R   = 60;
var GAP      = 1.06;
var NBTH     = 1.2; // neighbor threshold multiplier

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

  // ── Build SVG ──────────────────────────────────
  var svg = document.createElementNS(svgNS, 'svg');
  svg.style.cssText = 'width:100%;height:100%;display:block;';
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

  function getChildPositions(parent, childR, allHexes) {
    var occ  = getOccupiedFaces(parent, allHexes);
    var dist = (parent.r + childR) * GAP + 8;
    var positions = [];
    // Seed from parent position — deterministic per hex, varied between hexes
    var startFace = Math.abs(Math.floor(parent.x * 7 + parent.y * 3)) % 6;
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
      poly.setAttribute('stroke-width', '5');
    } else {
      poly.setAttribute('fill', 'transparent');
      poly.setAttribute('stroke', h.color);
      poly.setAttribute('stroke-width', '4');
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

    // Label
    var fontSize = h.r > 70 ? 35 : h.r > 30 ? 25 : 20;
    var lines    = h.label.split(' ');
    lines.forEach(function(line, i) {
      var text = document.createElementNS(svgNS, 'text');
      var offset = (i - (lines.length - 1) / 2) * (fontSize * 1.3);
      text.setAttribute('x', h.x);
      text.setAttribute('y', h.y + offset);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-family', 'Sevastopol Interface, monospace');
      text.setAttribute('font-size', fontSize);
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', h.locked ? h.textColor : h.color);
      text.setAttribute('pointer-events', 'none');
      text.textContent = line;
      g.appendChild(text);
    });

    // Press animation
    g.addEventListener('pointerdown', function() {
      g.setAttribute('transform', 'translate(3,4)');
    });
    g.addEventListener('pointerup', function() {
      g.setAttribute('transform', '');
      onHexTap(h);
    });
    g.addEventListener('pointerleave', function() {
      g.setAttribute('transform', '');
    });

    svg.appendChild(g);
  }

  // ── Chain bloom placement ──────────────────────
  // First child off parent, subsequent children off the
  // already-placed child nearest to parent, preferring
  // positions that face back toward the parent
  function placeChain(parent, items, childR, locked, gravity) {
  var grav = gravity || parent;
  var placed = [];

  items.forEach(function(item, idx) {
    var allHexes = locked.concat(placed);
    var sources = idx === 0 ? [parent] : [parent].concat(placed);
    var candidates = [];

    sources.forEach(function(src) {
      getChildPositions(src, childR, allHexes).forEach(function(pos) {
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

    if (unique.length === 0) return;

    // Prefer positions closest to gravity (cat)
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

  function showItems(subcatHex) {
    resize();
    state.level = 2; state.subcat = subcatHex;
    subcatHex.locked = true;
    var locked = [state.cat, subcatHex];
    var placed = placeChain(subcatHex, subcatHex.data.items, ITEM_R, locked, state.cat);
    state.hexes = locked.concat(placed);
    render();
  }

  function showItemsDirect(catHex) {
    resize();
    state.level = 2; state.cat = catHex; state.subcat = null;
    catHex.locked = true;
    var items = catHex.data.subcats[0].items;
    var placed = placeChain(catHex, items, SUBCAT_R, [catHex], catHex);
    placed.forEach(function(h) { h.type = 'item'; });
    state.hexes = [catHex].concat(placed);
    render();
  }

  function onHexTap(h) {
    if (h.locked) {
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
    if (h.type === 'subcat') { showItems(h);   return; }
    if (h.type === 'item')   { onSelect(h.data); return; }
  }

  // ── Public API ─────────────────────────────────
  this.setData = function(newData) {
    data = newData;
    resize();
    showCats();
  };

  this.reset = function() {
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
    var placed = placeChain(centerHex, items, SUBCAT_R, [centerHex], centerHex);
    placed.forEach(function(h) { h.type = 'item'; });
    state.hexes = [centerHex].concat(placed);
    render();
  };

  this.getCatId = function() {
    return state.cat ? state.cat.id : null;
  };

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