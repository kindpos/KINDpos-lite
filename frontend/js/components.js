// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Shared Components
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, chamfer, shadowColor } from './tokens.js';
import { lightenHex, darkenHex, hexToRgba } from './theme-manager.js';

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
    'clip-path:polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px);z-index:9999;pointer-events:none;',
    'opacity:0;transition:opacity 0.3s;',
  ].join('');
  el.textContent = message;
  if (o.append) {
    el.style.pointerEvents = 'auto';
    el.appendChild(o.append);
  }
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

// ═══════════════════════════════════════════════════
//  Role Button — selectable role chip with glow
//  Used by: clock-in, settings
// ═══════════════════════════════════════════════════

export function buildRoleButton(roleName, roleColor, onSelect) {
  var borderW = 10;
  var glowDefault = hexToRgba(roleColor, 0.5);
  var baseShadow = shadowColor(T.bg);

  var wrap = document.createElement('div');
  wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + baseShadow + ') drop-shadow(0 0 8px ' + glowDefault + ')';
  wrap.style.transition = 'transform 50ms, filter 50ms';
  wrap.style.cursor = 'pointer';
  wrap.style.userSelect = 'none';
  wrap.style.webkitUserSelect = 'none';
  wrap.style.touchAction = 'manipulation';

  var inner = document.createElement('div');
  inner.style.background = T.bg;
  inner.style.border = borderW + 'px solid ' + roleColor;
  inner.style.clipPath = chamfer();
  inner.style.width = '100%';
  inner.style.height = '100%';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.boxSizing = 'border-box';
  inner.style.padding = '8px 16px';
  inner.style.fontFamily = T.fhr;
  inner.style.fontSize = '40px';
  inner.style.color = T.textPrimary;
  inner.style.textTransform = 'uppercase';
  inner.style.letterSpacing = '3px';
  inner.textContent = roleName.toUpperCase();

  wrap.appendChild(inner);
  wrap._roleName = roleName;
  wrap._selected = false;

  function _applyDefault() {
    inner.style.background = T.bg;
    inner.style.color = T.textPrimary;
    inner.style.border = borderW + 'px solid ' + roleColor;
    wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + baseShadow + ') drop-shadow(0 0 8px ' + glowDefault + ')';
    wrap.style.transform = 'translate(0,0)';
  }

  function _applySelected() {
    var glowFull = hexToRgba(roleColor, 1.0);
    inner.style.background = roleColor;
    inner.style.color = T.bgDark;
    inner.style.border = borderW + 'px solid ' + lightenHex(roleColor, 0.3);
    wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + baseShadow + ') drop-shadow(0 0 12px ' + glowFull + ')';
    wrap.style.transform = 'translate(0,0)';
  }

  wrap._resetVisual = function() {
    if (wrap._selected) _applySelected();
    else _applyDefault();
  };

  wrap.addEventListener('pointerdown', function() {
    wrap.style.filter = 'drop-shadow(0px 0px 0px transparent)';
    wrap.style.transform = 'translate(' + T.shadowX + 'px, ' + T.shadowY + 'px)';
  });

  wrap.addEventListener('pointerup', function() {
    onSelect(roleName);
  });

  wrap.addEventListener('pointerleave', function() {
    wrap._resetVisual();
  });

  return wrap;
}