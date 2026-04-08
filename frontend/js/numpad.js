// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Numpad Component
//  Reusable: login PIN, payment amounts, any numeric input
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle, applyRaisedStyle, shadowColor } from './tokens.js';

var PAD = {
  width:    332,
  displayH: 75,
  gap:      20,
  cardPad:  20,
  keyW:     88,
  keyH:     80,
  keyGap:   14,
};
PAD.cardW = PAD.keyW * 3 + PAD.keyGap * 2 + PAD.cardPad * 2;
PAD.cardH = PAD.keyH * 4 + PAD.keyGap * 3 + PAD.cardPad * 2 + 14;

export function buildNumpad(opts) {
  var o = opts || {};
  var maxDigits    = o.maxDigits    || 6;
  var masked       = o.masked       !== false;
  var onSubmit     = o.onSubmit     || function(){};
  var onChange     = o.onChange     || null;   // fires(digits) on every digit/clear
  var displayFormat = o.displayFormat || null; // function(digits) => display string

  // Allow per-instance size overrides
  var displayH = o.displayH || PAD.displayH;
  var gap      = o.gap      != null ? o.gap : PAD.gap;
  var keyH     = o.keyH     || PAD.keyH;
  var keyGap   = o.keyGap   != null ? o.keyGap : PAD.keyGap;
  var cardPad  = o.cardPad  != null ? o.cardPad : PAD.cardPad;
  var width    = o.width    || PAD.width;
  var cardH    = keyH * 4 + keyGap * 3 + cardPad * 2 + T.bevel * 2;

  var digitColor  = o.digitColor  || T.mint;
  var clearColor  = o.clearColor  || T.mint;
  var submitColor = o.submitColor || T.mint;
  var displayColor = o.displayColor || T.gold;
  var displayBg    = o.displayBg   || T.bg;
  var chassisColor = o.chassisColor || T.mint;
  var maskChar     = o.maskChar    || '\u25CF';
  var digitFont    = o.digitFont   || T.fh;

  var pin = '';
  var _submitCooldown = false;

  // ── Container ──
  var container = document.createElement('div');
  container.style.width = width + 'px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = gap + 'px';

  // ── Digit Display (mint shadow wrap + sunken inner) ──
  var displayShadow = document.createElement('div');
  displayShadow.style.width = '100%';
  displayShadow.style.height = displayH + 'px';
  displayShadow.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + shadowColor(T.darkBtn) + ')';

  var display = document.createElement('div');
  display.style.width = '100%';
  display.style.height = '100%';
  display.style.boxSizing = 'border-box';
  display.style.background = displayBg;
  display.style.display = 'flex';
  display.style.alignItems = 'center';
  display.style.justifyContent = 'center';
  display.style.fontFamily = T.fb;
  display.style.fontSize = '28px';
  display.style.color = displayColor;
  display.style.letterSpacing = '8px';
  // Border color matches chassis — inset bevel with chassis color
  var db = T.bevel;
  display.style.borderTop    = db + 'px solid ' + chassisColor;
  display.style.borderLeft   = db + 'px solid ' + chassisColor;
  display.style.borderBottom = db + 'px solid ' + chassisColor;
  display.style.borderRight  = db + 'px solid ' + chassisColor;
  display.style.clipPath = chamfer();

  displayShadow.appendChild(display);
  container.appendChild(displayShadow);

  // ── Numpad Card (mint fill, raised with depth) ──
  var cardWrap = document.createElement('div');
  cardWrap.style.width = '100%';
  cardWrap.style.height = cardH + 'px';
  cardWrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + shadowColor(chassisColor) + ')';

  var card = document.createElement('div');
  card.style.width = '100%';
  card.style.height = '100%';
  card.style.padding = cardPad + 'px';
  card.style.display = 'grid';
  card.style.gridTemplateColumns = 'repeat(3, ' + PAD.keyW + 'px)';
  card.style.gridTemplateRows = 'repeat(4, ' + keyH + 'px)';
  card.style.gap = keyGap + 'px';
  card.style.boxSizing = 'border-box';
  applyRaisedStyle(card, chassisColor);

  cardWrap.appendChild(card);
  container.appendChild(cardWrap);

  // ── Keys ──
  var layout = [
    { label: '1', type: 'digit' },
    { label: '2', type: 'digit' },
    { label: '3', type: 'digit' },
    { label: '4', type: 'digit' },
    { label: '5', type: 'digit' },
    { label: '6', type: 'digit' },
    { label: '7', type: 'digit' },
    { label: '8', type: 'digit' },
    { label: '9', type: 'digit' },
    { label: 'clr', type: 'clear' },
    { label: '0', type: 'digit' },
    { label: '>>>', type: 'submit' },
  ];

  layout.forEach(function(key) {
    var fill, textColor, fontSize, fontFamily;
    if (key.type === 'clear') {
      fill = T.darkBtn; textColor = clearColor; fontSize = '60px'; fontFamily = T.fb;
    } else if (key.type === 'submit') {
      fill = T.darkBtn; textColor = submitColor; fontSize = '60px'; fontFamily = T.fb;
    } else {
      fill = T.darkBtn; textColor = digitColor; fontSize = '60px'; fontFamily = digitFont;
    }

    var pair = buildStyledButton(fill);
    pair.wrap.style.width = PAD.keyW + 'px';
    pair.wrap.style.height = keyH + 'px';
    pair.inner.style.fontFamily = fontFamily;
    pair.inner.style.fontSize = fontSize;
    pair.inner.style.color = textColor;
    pair.inner.style.lineHeight = '1';
    pair.inner.textContent = key.label;

    if (key.type === 'clear') {
      // CLR: normal tap clears last digit, long-press (500ms) clears all
      var _clrTimer = null;
      var _clrFired = false;
      pair.wrap.addEventListener('pointerdown', function() {
        _clrFired = false;
        _clrTimer = setTimeout(function() {
          _clrFired = true;
          pin = '';
          render();
          if (onChange) onChange(pin);
        }, 500);
      });
      pair.wrap.addEventListener('pointerup', function() {
        if (_clrTimer) { clearTimeout(_clrTimer); _clrTimer = null; }
        if (!_clrFired) {
          // Short tap — backspace (remove last digit)
          if (pin.length > 0) {
            pin = pin.slice(0, -1);
            render();
            if (onChange) onChange(pin);
          }
        }
      });
      pair.wrap.addEventListener('pointercancel', function() {
        if (_clrTimer) { clearTimeout(_clrTimer); _clrTimer = null; }
      });
    } else {
      pair.wrap.addEventListener('pointerup', function() {
        if (key.type === 'digit') {
          if (pin.length < maxDigits) {
            pin += key.label;
            render();
            if (onChange) onChange(pin);
          }
        } else if (key.type === 'submit') {
          if (pin.length > 0 && !_submitCooldown) {
            _submitCooldown = true;
            setTimeout(function() { _submitCooldown = false; }, 200);
            onSubmit(pin);
          }
        }
      });
    }

    card.appendChild(pair.wrap);
  });

  function render() {
    if (displayFormat) {
      display.textContent = displayFormat(pin);
    } else if (masked) {
      display.textContent = Array(pin.length + 1).join(maskChar + ' ').trim();
    } else {
      display.textContent = pin;
    }
  }

  container.clear = function() { pin = ''; render(); };
  container.getPin = function() { return pin; };
  container.setError = function(msg) {
    display.textContent = msg || '';
    display.style.color = T.red;
    setTimeout(function() {
      display.style.color = displayColor;
      pin = ''; render();
    }, 1200);
  };

  render();
  return container;
}