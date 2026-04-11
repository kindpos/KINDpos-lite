// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Theme Manager (TM2)
//  Shared visual construction — cards, bevels, filters
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════
//
//  TM2 provides reusable builders for the beveled depth
//  card system, color utilities, and filter strings.
//  tokens.js owns the raw values; TM2 owns the construction.
//
//  Usage:
//    import { buildCard, cardFilter, applyCardBevel } from './theme-manager.js';
//    import { lightenHex, darkenHex, hexToRgba } from './theme-manager.js';
//
// ═══════════════════════════════════════════════════

import { T, chamfer } from './tokens.js';

// ═══════════════════════════════════════════════════
//  COLOR UTILITIES
// ═══════════════════════════════════════════════════

export function lightenHex(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return '#' + [
    Math.min(255, Math.round(r + (255 - r) * pct)),
    Math.min(255, Math.round(g + (255 - g) * pct)),
    Math.min(255, Math.round(b + (255 - b) * pct)),
  ].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

export function darkenHex(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var f = 1 - pct;
  return '#' + [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
    .map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

export function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// ═══════════════════════════════════════════════════
//  CARD FILTER — drop-shadow + mint glow
// ═══════════════════════════════════════════════════

// Standard overlay/card filter: offset shadow + mint ambient glow
export function cardFilter() {
  return 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(135,247,156,0.15))';
}

// Lighter variant for nested cards (no glow)
export function cardFilterLight() {
  return 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px rgba(0,0,0,0.5))';
}

// ═══════════════════════════════════════════════════
//  CARD BEVEL — beveled border application
// ═══════════════════════════════════════════════════

// Full 4-side bevel (top+left light, bottom+right dark)
// borderColor: base color to derive light/dark edges (default: T.numpadChassis)
// width: border width in px (default: 7)
export function applyCardBevel(el, borderColor, width) {
  var color = borderColor || T.numpadChassis;
  var w = (width || 7) + 'px solid ';
  el.style.borderTop    = w + lightenHex(color, 0.2);
  el.style.borderLeft   = w + lightenHex(color, 0.2);
  el.style.borderBottom = w + darkenHex(color, 0.3);
  el.style.borderRight  = w + darkenHex(color, 0.3);
}

// 2-side bevel (top+left only — used for flush cards in grids)
export function applyCardBevelHalf(el, borderColor, width) {
  var color = borderColor || T.numpadChassis;
  var w = (width || 7) + 'px solid ';
  el.style.borderTop  = w + lightenHex(color, 0.2);
  el.style.borderLeft = w + lightenHex(color, 0.2);
}

// ═══════════════════════════════════════════════════
//  CARD BUILDER — wrap + inner card pair
// ═══════════════════════════════════════════════════

// Builds the standard beveled depth card:
//   outer wrap (drop-shadow filter) → inner card (beveled border + chamfer)
//
// opts:
//   width:       CSS width string (default: auto)
//   height:      CSS height string (default: auto)
//   borderColor: bevel base color (default: T.numpadChassis)
//   borderWidth: bevel px (default: 7)
//   chamferSize: clip-path corner size (default: 10)
//   padding:     inner padding (default: '20px')
//   bg:          card background (default: T.bg)
//   glow:        true for mint glow filter (default: true)
//   cssText:     extra CSS for inner card
//
// Returns: { wrap, card }
export function buildCard(opts) {
  var o = opts || {};
  var bg          = o.bg          || T.bg;
  var padding     = o.padding     || '20px';
  var cham        = o.chamferSize != null ? o.chamferSize : 10;
  var glow        = o.glow !== false;

  var wrap = document.createElement('div');
  wrap.style.filter = glow ? cardFilter() : cardFilterLight();

  var card = document.createElement('div');
  card.style.background = bg;
  card.style.padding = padding;
  card.style.boxSizing = 'border-box';
  if (o.width)  card.style.width  = o.width;
  if (o.height) card.style.height = o.height;
  if (cham > 0) card.style.clipPath = chamfer(cham);
  if (o.cssText) card.style.cssText += o.cssText;

  applyCardBevel(card, o.borderColor, o.borderWidth);

  wrap.appendChild(card);
  return { wrap: wrap, card: card };
}
