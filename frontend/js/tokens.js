// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Design Tokens
//  Single source of truth for all visual values
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

export const T = Object.freeze({
  bg:       '#333333',
  bgDark:   '#1a1a1a',
  bgLight:  '#5a5a5a',
  bgEdge:   '#151515',
  mint:     '#C6FFBB',
  mintEdgeL:'#e5ffe0',
  mintEdgeD:'#5a7a52',
  goGreen:  '#7ac943',
  greenL:   '#ade87a',
  greenD:   '#345a1c',
  red:      '#da331c',
  redL:     '#f26858',
  redD:     '#5e160c',
  gold:     '#ffc344',
  goldL:    '#ffdb8a',
  goldD:    '#7a5a18',
  cyan:     '#33ffff',
  lavender: '#b48efa',
  yellow:   '#ffff00',
  fh:   'Alien Encounters Solid Bold, monospace',
  fb:   'Sevastopol Interface, monospace',
  fsQuick:  '70px',
  fsMgmt:   '60px',
  fsNumpad: '100px',
  fsHeader: '70px',
  fsClr:    '70px',
  appW:     1024,
  appH:     600,
  headerH:  52,
  scenePad: 20,
  colGap:   20,
  bevel:    4,
  chamfer:  8,
  shadowX:  3,
  shadowY:  4,
});

export function chamfer(s) {
  var c = s || T.chamfer;
  return 'polygon(' + c + 'px 0%, calc(100% - ' + c + 'px) 0%, 100% ' + c + 'px, 100% calc(100% - ' + c + 'px), calc(100% - ' + c + 'px) 100%, ' + c + 'px 100%, 0% calc(100% - ' + c + 'px), 0% ' + c + 'px)';
}

export function bevelEdges(fillColor) {
  if (fillColor === T.bg)      return { light: T.bgLight,  dark: T.bgEdge   };
  if (fillColor === T.mint)    return { light: T.mintEdgeL, dark: T.mintEdgeD };
  if (fillColor === T.goGreen) return { light: T.greenL,   dark: T.greenD   };
  if (fillColor === T.gold)    return { light: T.goldL,    dark: T.goldD    };
  if (fillColor === T.red)     return { light: T.redL,     dark: T.redD     };
  return { light: T.bgLight, dark: T.bgEdge };
}

export function shadowColor(fillColor) {
  return fillColor === T.bg ? 'rgba(198,255,187,0.55)' : 'rgba(10,10,10,0.8)';
}

// ═══════════════════════════════════════════════════
//  WRAPPER + INNER BUTTON
//  Shadow lives on wrapper, clip-path on inner
//  This prevents clip-path from clipping the shadow
// ═══════════════════════════════════════════════════

export function buildStyledButton(fillColor) {
  var fill = fillColor || T.bg;
  var edges = bevelEdges(fill);
  var shadow = shadowColor(fill);
  var b = T.bevel;

  var wrap = document.createElement('div');
  wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + shadow + ')';
  wrap.style.transition = 'transform 50ms, filter 50ms';
  wrap.style.cursor = 'pointer';
  wrap.style.userSelect = 'none';
  wrap.style.webkitUserSelect = 'none';

  var inner = document.createElement('div');
  inner.style.background = fill;
  inner.style.borderTop    = b + 'px solid ' + edges.light;
  inner.style.borderLeft   = b + 'px solid ' + edges.light;
  inner.style.borderBottom = b + 'px solid ' + edges.dark;
  inner.style.borderRight  = b + 'px solid ' + edges.dark;
  inner.style.clipPath = chamfer();
  inner.style.width = '100%';
  inner.style.height = '100%';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.textAlign = 'center';
  inner.style.boxSizing = 'border-box';

  wrap.appendChild(inner);
  wrap._edges = edges;
  wrap._shadow = shadow;
  wrap._inner = inner;

  wrap.addEventListener('pointerdown', _wDown);
  wrap.addEventListener('pointerup', _wUp);
  wrap.addEventListener('pointerleave', _wUp);

  return { wrap: wrap, inner: inner };
}

function _wDown(e) {
  var w = e.currentTarget;
  var b = T.bevel;
  w._inner.style.borderTop    = b + 'px solid ' + w._edges.dark;
  w._inner.style.borderLeft   = b + 'px solid ' + w._edges.dark;
  w._inner.style.borderBottom = b + 'px solid ' + w._edges.light;
  w._inner.style.borderRight  = b + 'px solid ' + w._edges.light;
  w.style.filter = 'drop-shadow(0px 0px 0px transparent)';
  w.style.transform = 'translate(' + T.shadowX + 'px, ' + T.shadowY + 'px)';
}

function _wUp(e) {
  var w = e.currentTarget;
  var b = T.bevel;
  w._inner.style.borderTop    = b + 'px solid ' + w._edges.light;
  w._inner.style.borderLeft   = b + 'px solid ' + w._edges.light;
  w._inner.style.borderBottom = b + 'px solid ' + w._edges.dark;
  w._inner.style.borderRight  = b + 'px solid ' + w._edges.dark;
  w.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + w._shadow + ')';
  w.style.transform = 'translate(0,0)';
}

export function applySunkenStyle(el) {
  var b = T.bevel;
  el.style.borderTop    = b + 'px solid ' + T.bgEdge;
  el.style.borderLeft   = b + 'px solid ' + T.bgEdge;
  el.style.borderBottom = b + 'px solid ' + T.bgLight;
  el.style.borderRight  = b + 'px solid ' + T.bgLight;
  el.style.clipPath = chamfer();
}

export function applyRaisedStyle(el, fillColor) {
  var fill = fillColor || T.mint;
  var edges = bevelEdges(fill);
  var b = T.bevel;
  el.style.background = fill;
  el.style.borderTop    = b + 'px solid ' + edges.light;
  el.style.borderLeft   = b + 'px solid ' + edges.light;
  el.style.borderBottom = b + 'px solid ' + edges.dark;
  el.style.borderRight  = b + 'px solid ' + edges.dark;
  el.style.clipPath = chamfer(10);
}