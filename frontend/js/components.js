// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Shared Components
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton } from './tokens.js';

export function buildButton(label, opts) {
  var o = opts || {};
  var fill     = o.fill     || T.bg;
  var color    = o.color    || T.mint;
  var fontSize = o.fontSize || T.fsMgmt;
  var width    = o.width;
  var height   = o.height;
  var onTap    = o.onTap    || null;
  var lineH    = o.lineHeight || '1.05';

  var pair = buildStyledButton(fill);
  var wrap = pair.wrap;
  var inner = pair.inner;

  if (width)  wrap.style.width  = width + 'px';
  if (height) wrap.style.height = height + 'px';

  inner.style.fontFamily = T.fb;
  inner.style.fontSize   = fontSize;
  inner.style.color      = color;
  inner.style.lineHeight = lineH;
  inner.style.whiteSpace = 'pre-line';
  inner.textContent      = label;

  if (onTap) wrap.addEventListener('pointerup', onTap);

  return wrap;
}

export function buildGap(px) {
  var gap = document.createElement('div');
  gap.style.height = px + 'px';
  gap.style.flexShrink = '0';
  return gap;
}