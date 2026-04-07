// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Shared Components
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton } from './tokens.js';

export function buildButton(label, opts) {
  var o = opts || {};
  var fill       = o.fill       || T.darkBtn;
  var color      = o.color      || T.mint;
  var fontSize   = o.fontSize   || T.fsMgmt;
  var fontFamily = o.fontFamily || T.fb;
  var width      = o.width;
  var height     = o.height;
  var onTap      = o.onTap      || null;
  var lineH      = o.lineHeight || '1.05';

  var pair = buildStyledButton(fill);
  var wrap = pair.wrap;
  var inner = pair.inner;

  if (width)  wrap.style.width  = width + 'px';
  if (height) wrap.style.height = height + 'px';

  inner.style.fontFamily = fontFamily;
  inner.style.fontSize   = fontSize;
  inner.style.color      = color;
  inner.style.lineHeight = lineH;
  inner.style.whiteSpace = 'pre-line';
  inner.style.padding    = '8px 12px';
  inner.textContent      = label;

  if (onTap) wrap.addEventListener('pointerup', onTap);

  return wrap;
}

export function showToast(message, opts) {
  var o = opts || {};
  var duration = o.duration || 4000;
  var bg = o.bg || T.red;

  var el = document.createElement('div');
  el.style.cssText = [
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);',
    'padding:12px 28px;background:' + bg + ';color:#fff;',
    'font-family:' + T.fb + ';font-size:22px;',
    'border-radius:8px;z-index:9999;pointer-events:none;',
    'opacity:0;transition:opacity 0.3s;',
  ].join('');
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(function() { el.style.opacity = '1'; });
  setTimeout(function() {
    el.style.opacity = '0';
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }, duration);
}

export function buildGap(px) {
  var gap = document.createElement('div');
  gap.style.height = px + 'px';
  gap.style.flexShrink = '0';
  return gap;
}