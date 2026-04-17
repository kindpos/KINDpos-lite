// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Category Grid Component
//  3-column chamfered-tile nav, drop-in HexNav replacement
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer } from './tokens.js';
import { applyCardBevel, hexToRgba } from './theme-manager.js';

// ═══════════════════════════════════════════════════
//  CategoryGrid
//  Usage:
//    var grid = new CategoryGrid(containerEl, {
//      data: menuData,            // array of cat objects
//      onSelect: fn(item, mods),  // called on leaf tap (mods always {})
//    });
//    grid.setData(newData);       // swap data, return to State A
//    grid.reset();                // return to State A
//    grid.destroy();              // remove from DOM
// ═══════════════════════════════════════════════════

export function CategoryGrid(container, opts) {
  var o        = opts || {};
  var onSelect = o.onSelect || function() {};
  var data     = o.data    || [];

  // Drill path. Empty = State A (categories). Non-empty = State B
  // with the top of the stack as the parent back tile.
  var path = [];

  // ── Root element ──
  var root = document.createElement('div');
  root.style.cssText = [
    'width:100%;height:100%;box-sizing:border-box;',
    'display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;',
    'padding:12px;',
    'background:' + T.bg + ';',
    'border-radius:0;',
    'overflow:auto;align-content:start;',
  ].join('');
  container.appendChild(root);

  // Build a tile element.
  //   mode: 'border' (idle cat/subcat) or 'solid' (parent back tile)
  function buildTile(cfg) {
    var mode     = cfg.mode || 'border';
    var color    = cfg.color || T.mint;
    var label    = cfg.label || '';
    var price    = cfg.price;
    var isBack   = !!cfg.back;
    var onTap    = cfg.onTap;

    var tile = document.createElement('div');

    var baseBg   = mode === 'solid' ? color    : T.bgDark;
    var labelClr = mode === 'solid' ? T.bgDark : color;

    tile.style.cssText = [
      'position:relative;box-sizing:border-box;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'min-height:120px;padding:14px 10px;',
      'background:' + baseBg + ';',
      'border-radius:0;',
      'clip-path:' + chamfer(8) + ';',
      'cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;',
      'transition:transform 60ms, filter 60ms;',
    ].join('');

    // Style D bevel: chassis edges for idle tiles, color-derived for solid parent.
    applyCardBevel(tile, mode === 'solid' ? color : undefined, 7);

    if (mode === 'border') {
      // Category stroke + glow — outline inset sits inside the bevel frame.
      tile.style.boxShadow = '0 0 8px ' + hexToRgba(color, 0.33) + ', inset 0 0 0 2px ' + color;
    } else {
      // Inner bevel for depth on the solid parent back tile.
      tile.style.boxShadow = 'inset 0 2px 0 ' + hexToRgba(T.bgLight, 0.5)
        + ', inset 0 -2px 0 ' + hexToRgba(T.bgEdge, 0.6);
    }

    // Label
    var lbl = document.createElement('div');
    lbl.style.cssText = [
      'font-family:' + T.fh + ';',
      'font-weight:bold;font-size:26px;line-height:1.1;',
      'color:' + labelClr + ';',
      'text-align:center;pointer-events:none;',
      'word-break:break-word;',
    ].join('');
    lbl.textContent = label;
    tile.appendChild(lbl);

    // Price (gold) if provided
    if (price !== undefined && price !== null && price !== '') {
      var p = document.createElement('div');
      p.style.cssText = [
        'font-family:' + T.fb + ';',
        'font-size:20px;margin-top:6px;',
        'color:' + T.gold + ';',
        'pointer-events:none;',
      ].join('');
      var pv = Number(price);
      p.textContent = isNaN(pv) ? String(price) : ('$' + pv.toFixed(2));
      tile.appendChild(p);
    }

    // ← BACK at bottom of solid parent tile
    if (isBack) {
      var back = document.createElement('div');
      back.style.cssText = [
        'position:absolute;left:0;right:0;bottom:8px;',
        'font-family:' + T.fh + ';',
        'font-weight:bold;font-size:16px;letter-spacing:2px;',
        'color:' + T.bgDark + ';',
        'text-align:center;pointer-events:none;',
      ].join('');
      back.textContent = '\u2190 BACK';
      tile.appendChild(back);
    }

    // Press-and-release tap handling.
    var pressed = false;
    tile.addEventListener('pointerdown', function(e) {
      pressed = true;
      tile.style.transform = 'translate(2px, 3px)';
      tile.style.filter = 'brightness(1.1)';
      if (tile.setPointerCapture) {
        try { tile.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });
    tile.addEventListener('pointerup', function() {
      if (!pressed) return;
      pressed = false;
      tile.style.transform = '';
      tile.style.filter = '';
      if (onTap) onTap();
    });
    tile.addEventListener('pointercancel', function() {
      pressed = false;
      tile.style.transform = '';
      tile.style.filter = '';
    });
    tile.addEventListener('pointerleave', function() {
      pressed = false;
      tile.style.transform = '';
      tile.style.filter = '';
    });

    return tile;
  }

  // ── Data helpers ──
  // Categories in this menu wrap items in a single "subcats[0].items"
  // array. Treat that wrapper as transparent so drilling into a cat
  // shows items directly.
  function childrenOf(node) {
    if (node.subcats && node.subcats.length > 0) {
      if (node.subcats.length === 1 && node.subcats[0].items) {
        return node.subcats[0].items;
      }
      return node.subcats;
    }
    if (node.items) return node.items;
    return [];
  }

  function hasChildren(node) {
    if (node.subcats && node.subcats.length > 0) return true;
    if (node.items && node.items.length > 0) return true;
    return false;
  }

  // ── Render ──
  function render() {
    root.innerHTML = '';
    if (path.length === 0) renderStateA();
    else                    renderStateB();
  }

  function renderStateA() {
    data.forEach(function(cat) {
      root.appendChild(buildTile({
        mode:  'border',
        color: cat.color || T.mint,
        label: cat.label || cat.name || '',
        onTap: function() { drillInto(cat); },
      }));
    });
  }

  function renderStateB() {
    var parent      = path[path.length - 1];
    var parentColor = parent.color || T.mint;
    var children    = childrenOf(parent);

    // Parent tile, solid, top-left slot.
    root.appendChild(buildTile({
      mode:  'solid',
      color: parentColor,
      label: parent.label || parent.name || '',
      back:  true,
      onTap: function() { goBack(); },
    }));

    children.forEach(function(child) {
      root.appendChild(buildTile({
        mode:  'border',
        color: parentColor,
        label: child.label || child.name || '',
        price: child.price,
        onTap: function() {
          if (hasChildren(child)) {
            drillInto(child);
          } else {
            onSelect(child, {});
          }
        },
      }));
    });
  }

  function drillInto(node) {
    path.push(node);
    render();
  }

  function goBack() {
    path.pop();
    render();
  }

  // ── Public API ──
  this.setData = function(newData) {
    data = newData || [];
    path = [];
    render();
  };

  this.reset = function() {
    path = [];
    render();
  };

  this.destroy = function() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
  };

  // ── Init ──
  render();
}
