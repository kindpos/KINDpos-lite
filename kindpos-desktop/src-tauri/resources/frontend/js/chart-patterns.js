// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Chart SVG Patterns & Glow Filters (LOCKED v4)
//  Pattern fills and glow filters for chart rendering.
//  All patterns use #0a0a0a solid black background.
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { DATA } from './chart-colors.js';

var SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  var el = document.createElementNS(SVG_NS, tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// ═══════════════════════════════════════════════════
//  PATTERN DEFINITIONS
// ═══════════════════════════════════════════════════

// Dense dots (4×4, r=1) — Primary / Orange / Food
function orangeDotPattern() {
  var p = svgEl('pattern', { id: 'pat-orange-dots', patternUnits: 'userSpaceOnUse', width: '4', height: '4' });
  p.appendChild(svgEl('rect', { width: '4', height: '4', fill: DATA.patternBg }));
  p.appendChild(svgEl('circle', { cx: '2', cy: '2', r: '1', fill: DATA.orange }));
  return p;
}

// Crosshatch (5×5, stroke 1) — Money / Coral / Tips
function coralCrosshatchPattern() {
  var p = svgEl('pattern', { id: 'pat-coral-crosshatch', patternUnits: 'userSpaceOnUse', width: '5', height: '5' });
  p.appendChild(svgEl('rect', { width: '5', height: '5', fill: DATA.patternBg }));
  p.appendChild(svgEl('line', { x1: '0', y1: '0', x2: '5', y2: '5', stroke: DATA.coral, 'stroke-width': '1' }));
  p.appendChild(svgEl('line', { x1: '5', y1: '0', x2: '0', y2: '5', stroke: DATA.coral, 'stroke-width': '1' }));
  return p;
}

// Diagonal hatch (5×5, stroke 1.5) — Drink / Pink / Secondary
function pinkHatchPattern() {
  var p = svgEl('pattern', { id: 'pat-pink-hatch', patternUnits: 'userSpaceOnUse', width: '5', height: '5' });
  p.appendChild(svgEl('rect', { width: '5', height: '5', fill: DATA.patternBg }));
  p.appendChild(svgEl('line', { x1: '0', y1: '5', x2: '5', y2: '0', stroke: DATA.pink, 'stroke-width': '1.5' }));
  return p;
}

// Crosshatch (5×5, stroke 1) — Other / Violet / Tertiary
function violetCrosshatchPattern() {
  var p = svgEl('pattern', { id: 'pat-violet-crosshatch', patternUnits: 'userSpaceOnUse', width: '5', height: '5' });
  p.appendChild(svgEl('rect', { width: '5', height: '5', fill: DATA.patternBg }));
  p.appendChild(svgEl('line', { x1: '0', y1: '0', x2: '5', y2: '5', stroke: DATA.violet, 'stroke-width': '1' }));
  p.appendChild(svgEl('line', { x1: '5', y1: '0', x2: '0', y2: '5', stroke: DATA.violet, 'stroke-width': '1' }));
  return p;
}

// Sparse dots (6×6, r=1.2) — Reference / Blue / Last Week
function blueDotPattern() {
  var p = svgEl('pattern', { id: 'pat-blue-dots', patternUnits: 'userSpaceOnUse', width: '6', height: '6' });
  p.appendChild(svgEl('rect', { width: '6', height: '6', fill: DATA.patternBg }));
  p.appendChild(svgEl('circle', { cx: '3', cy: '3', r: '1.2', fill: DATA.blue }));
  return p;
}

// Warning — Vertical lines (4×4, stroke 1.5)
function warningPattern() {
  var p = svgEl('pattern', { id: 'pat-warning', patternUnits: 'userSpaceOnUse', width: '4', height: '4' });
  p.appendChild(svgEl('rect', { width: '4', height: '4', fill: DATA.patternBg }));
  p.appendChild(svgEl('line', { x1: '2', y1: '0', x2: '2', y2: '4', stroke: DATA.warning, 'stroke-width': '1.5' }));
  return p;
}

// Critical — Horizontal lines (4×4, stroke 1.5)
function criticalPattern() {
  var p = svgEl('pattern', { id: 'pat-critical', patternUnits: 'userSpaceOnUse', width: '4', height: '4' });
  p.appendChild(svgEl('rect', { width: '4', height: '4', fill: DATA.patternBg }));
  p.appendChild(svgEl('line', { x1: '0', y1: '2', x2: '4', y2: '2', stroke: DATA.critical, 'stroke-width': '1.5' }));
  return p;
}

// ═══════════════════════════════════════════════════
//  GLOW FILTER DEFINITIONS
// ═══════════════════════════════════════════════════

function makeGlow(id, color) {
  var f = svgEl('filter', { id: id, x: '-50%', y: '-50%', width: '200%', height: '200%' });
  f.appendChild(svgEl('feFlood', { 'flood-color': color, 'flood-opacity': '1', result: 'flood' }));
  var comp = svgEl('feComposite', { in: 'flood', in2: 'SourceGraphic', operator: 'in', result: 'mask' });
  f.appendChild(comp);
  f.appendChild(svgEl('feGaussianBlur', { in: 'mask', stdDeviation: '4', result: 'blur' }));
  var merge = svgEl('feMerge', {});
  merge.appendChild(svgEl('feMergeNode', { in: 'blur' }));
  merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
  f.appendChild(merge);
  return f;
}

// ═══════════════════════════════════════════════════
//  INJECT ALL DEFS INTO AN SVG
// ═══════════════════════════════════════════════════

// Call this once per SVG to inject all pattern + glow defs.
// Returns the <defs> element appended to the svg.
export function injectChartDefs(svg) {
  var defs = svgEl('defs', {});

  // Patterns
  defs.appendChild(orangeDotPattern());
  defs.appendChild(coralCrosshatchPattern());
  defs.appendChild(pinkHatchPattern());
  defs.appendChild(violetCrosshatchPattern());
  defs.appendChild(blueDotPattern());
  defs.appendChild(warningPattern());
  defs.appendChild(criticalPattern());

  // Glow filters
  defs.appendChild(makeGlow('glow-orange', DATA.orange));
  defs.appendChild(makeGlow('glow-coral', DATA.coral));
  defs.appendChild(makeGlow('glow-pink', DATA.pink));
  defs.appendChild(makeGlow('glow-violet', DATA.violet));
  defs.appendChild(makeGlow('glow-blue', DATA.blue));

  svg.appendChild(defs);
  return defs;
}

// Pattern fill URL strings for convenience
export var PAT = {
  orange:   'url(#pat-orange-dots)',
  coral:    'url(#pat-coral-crosshatch)',
  pink:     'url(#pat-pink-hatch)',
  violet:   'url(#pat-violet-crosshatch)',
  blue:     'url(#pat-blue-dots)',
  warning:  'url(#pat-warning)',
  critical: 'url(#pat-critical)',
};

// Glow filter URL strings
export var GLOW = {
  orange: 'url(#glow-orange)',
  coral:  'url(#glow-coral)',
  pink:   'url(#glow-pink)',
  violet: 'url(#glow-violet)',
  blue:   'url(#glow-blue)',
};
