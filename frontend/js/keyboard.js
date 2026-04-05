// ═══════════════════════════════════════════════════
//  KINDpos Terminal — QWERTY Keyboard Component
//  Full-width overlay keyboard for text input
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, applySunkenStyle, shadowColor } from './tokens.js';

// ── Layout Constants ──
var KB = {
  padX:     10,
  gap:      5,
  keyH:     56,
  rowGap:   5,
  inputH:   48,
  inputGap: 8,
};

// ── Key Layout ──
var ROW1 = ['Q','W','E','R','T','Y','U','I','O','P'];
var ROW2 = ['A','S','D','F','G','H','J','K','L'];
var ROW3 = [
  { label: '\u21E7', key: 'SHIFT', type: 'modifier', flex: 1.5 },
  'Z','X','C','V','B','N','M',
  { label: '\u232B', key: 'BKSP', type: 'modifier', flex: 1.5 },
];
var ROW4 = [
  { label: 'CLR', key: 'CLR', type: 'action', flex: 1.5 },
  { label: 'SPACE', key: 'SPACE', type: 'regular', flex: 5 },
  { label: '>>>', key: 'DONE', type: 'action', flex: 1.5 },
];

// ── Module State (singleton) ──
var _kbRoot = null;
var _visible = false;
var _text = '';
var _shifted = false;
var _opts = {};
var _cursorTimer = null;
var _inputText = null;
var _cursor = null;
var _shiftBtn = null;

// ── Exported API ──

export function showKeyboard(opts) {
  _opts = opts || {};
  _text = _opts.initialValue || '';
  _shifted = false;

  if (!_kbRoot) _buildKeyboard();

  _updateShiftVisual();
  _renderInput();

  var terminal = document.getElementById('terminal');
  if (!_kbRoot.parentNode) {
    _kbRoot.style.transform = 'translateY(100%)';
    terminal.appendChild(_kbRoot);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        _kbRoot.style.transform = 'translateY(0)';
      });
    });
  }

  _visible = true;
  _startCursorBlink();
}

export function hideKeyboard() {
  if (!_visible) return;
  _visible = false;
  _shifted = false;

  if (_cursorTimer) { clearInterval(_cursorTimer); _cursorTimer = null; }

  if (_kbRoot && _kbRoot.parentNode) {
    _kbRoot.style.transform = 'translateY(100%)';
    var root = _kbRoot;
    var handler = function() {
      // Guard: don't remove if keyboard was re-shown during animation
      if (!_visible && root.parentNode) root.parentNode.removeChild(root);
      root.removeEventListener('transitionend', handler);
    };
    root.addEventListener('transitionend', handler);
  }
}

export function isKeyboardVisible() {
  return _visible;
}

// ── Internal: Build Keyboard DOM ──

function _buildKeyboard() {
  // Root container — covers full terminal viewport
  _kbRoot = document.createElement('div');
  _kbRoot.style.position = 'absolute';
  _kbRoot.style.top = '0';
  _kbRoot.style.left = '0';
  _kbRoot.style.width = T.appW + 'px';
  _kbRoot.style.height = T.appH + 'px';
  _kbRoot.style.zIndex = '150';
  _kbRoot.style.pointerEvents = 'none';
  _kbRoot.style.transition = 'transform 150ms ease-out';

  // Backdrop — semi-transparent, dismisses on tap
  var backdrop = document.createElement('div');
  backdrop.style.position = 'absolute';
  backdrop.style.top = '0';
  backdrop.style.left = '0';
  backdrop.style.width = '100%';
  backdrop.style.height = '100%';
  backdrop.style.background = 'rgba(0,0,0,0.4)';
  backdrop.style.pointerEvents = 'auto';
  backdrop.addEventListener('pointerup', function() {
    if (_opts.onDismiss) _opts.onDismiss();
    hideKeyboard();
  });
  _kbRoot.appendChild(backdrop);

  // Keyboard panel — anchored to bottom
  var panel = document.createElement('div');
  panel.style.position = 'absolute';
  panel.style.bottom = '0';
  panel.style.left = '0';
  panel.style.width = '100%';
  panel.style.padding = KB.inputGap + 'px ' + KB.padX + 'px';
  panel.style.background = T.mint;
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = KB.rowGap + 'px';
  panel.style.pointerEvents = 'auto';
  panel.style.boxSizing = 'border-box';

  // Input field
  var inputShadow = document.createElement('div');
  inputShadow.style.width = '100%';
  inputShadow.style.height = KB.inputH + 'px';
  inputShadow.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + shadowColor(T.darkBtn) + ')';

  var inputWrap = document.createElement('div');
  inputWrap.style.width = '100%';
  inputWrap.style.height = '100%';
  inputWrap.style.background = T.bgDark;
  inputWrap.style.display = 'flex';
  inputWrap.style.alignItems = 'center';
  inputWrap.style.padding = '0 12px';
  inputWrap.style.boxSizing = 'border-box';
  inputWrap.style.overflow = 'hidden';
  applySunkenStyle(inputWrap);

  _inputText = document.createElement('span');
  _inputText.style.fontFamily = T.fb;
  _inputText.style.fontSize = '31px';
  _inputText.style.color = T.mint;
  _inputText.style.whiteSpace = 'nowrap';

  _cursor = document.createElement('span');
  _cursor.style.fontFamily = T.fb;
  _cursor.style.fontSize = '31px';
  _cursor.style.color = T.gold;
  _cursor.textContent = '|';

  inputWrap.appendChild(_inputText);
  inputWrap.appendChild(_cursor);
  inputShadow.appendChild(inputWrap);
  panel.appendChild(inputShadow);

  // Key rows + numpad side by side
  var body = document.createElement('div');
  body.style.display = 'flex';
  body.style.gap = KB.gap + 'px';

  // Left: letter rows
  var letters = document.createElement('div');
  letters.style.display = 'flex';
  letters.style.flexDirection = 'column';
  letters.style.gap = KB.rowGap + 'px';
  letters.style.flex = '1';
  letters.style.minWidth = '0';
  letters.appendChild(_buildRow(ROW1));
  letters.appendChild(_buildRow(ROW2));
  letters.appendChild(_buildRow(ROW3));
  letters.appendChild(_buildRow(ROW4));
  body.appendChild(letters);

  // Right: numpad
  body.appendChild(_buildNumpadColumn());

  panel.appendChild(body);
  _kbRoot.appendChild(panel);
}

// ── Internal: Build a Row of Keys ──

function _buildRow(keys) {
  var row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = KB.gap + 'px';
  row.style.width = '100%';

  keys.forEach(function(k) {
    var def = typeof k === 'string'
      ? { label: k, key: k, type: 'regular', flex: 1 }
      : k;

    var fill, color;
    if (def.type === 'modifier') { fill = T.bg; color = T.cyan; }
    else if (def.type === 'action') { fill = T.gold; color = T.bgDark; }
    else { fill = T.darkBtn; color = T.mint; }

    var pair = buildStyledButton(fill);
    pair.wrap.style.flex = def.flex;
    pair.wrap.style.height = KB.keyH + 'px';
    pair.wrap.style.minWidth = '0';
    pair.inner.style.fontFamily = T.fb;
    pair.inner.style.fontSize = '31px';
    pair.inner.style.color = color;
    pair.inner.textContent = def.label;

    if (def.key === 'SHIFT') _shiftBtn = pair;

    pair.wrap.addEventListener('pointerup', function() { _handleKey(def.key); });
    row.appendChild(pair.wrap);
  });

  return row;
}

// ── Internal: Build Numpad Column ──

function _buildNumpadColumn() {
  var col = document.createElement('div');
  col.style.display = 'grid';
  col.style.gridTemplateColumns = 'repeat(3, 1fr)';
  col.style.gridTemplateRows = 'repeat(4, 1fr)';
  col.style.gap = KB.gap + 'px';
  col.style.width = '160px';
  col.style.flexShrink = '0';

  var layout = [
    '7','8','9',
    '4','5','6',
    '1','2','3',
    '.','0',{ label: '\u232B', key: 'BKSP' },
  ];

  layout.forEach(function(k) {
    var isObj = typeof k !== 'string';
    var label = isObj ? k.label : k;
    var key   = isObj ? k.key   : k;
    var fill  = isObj ? T.bg : T.darkBtn;
    var color = isObj ? T.cyan : T.gold;

    var pair = buildStyledButton(fill);
    pair.wrap.style.minWidth = '0';
    pair.wrap.style.height = '100%';
    pair.inner.style.fontFamily = T.fb;
    pair.inner.style.fontSize = '28px';
    pair.inner.style.color = color;
    pair.inner.textContent = label;

    pair.wrap.addEventListener('pointerup', function() { _handleKey(key); });
    col.appendChild(pair.wrap);
  });

  return col;
}

// ── Internal: Key Handler ──

function _handleKey(key) {
  if (key === 'SHIFT') {
    _shifted = !_shifted;
    _updateShiftVisual();
    return;
  }
  if (key === 'BKSP') {
    _text = _text.slice(0, -1);
  } else if (key === 'CLR') {
    _text = '';
    if (_opts.onClear) _opts.onClear();
  } else if (key === 'DONE') {
    if (_opts.onDone) _opts.onDone(_text);
    if (_opts.dismissOnDone !== false) hideKeyboard();
    return;
  } else if (key === 'SPACE') {
    if (!_opts.maxLength || _text.length < _opts.maxLength) {
      _text += ' ';
    }
  } else {
    // Letter key
    if (!_opts.maxLength || _text.length < _opts.maxLength) {
      _text += _shifted ? key.toUpperCase() : key.toLowerCase();
      if (_shifted) { _shifted = false; _updateShiftVisual(); }
    }
  }
  _renderInput();
  if (_opts.onInput) _opts.onInput(_text);
}

// ── Internal: Render Input Display ──

function _renderInput() {
  if (_text.length === 0 && _opts.placeholder) {
    _inputText.textContent = _opts.placeholder;
    _inputText.style.color = T.mutedText;
  } else {
    _inputText.textContent = _text;
    _inputText.style.color = T.mint;
  }
  // Reset cursor visibility on input change
  if (_cursor) _cursor.style.visibility = 'visible';
}

// ── Internal: Shift Visual Toggle ──

function _updateShiftVisual() {
  if (!_shiftBtn) return;
  var b = T.bevel;
  var edges = _shiftBtn.wrap._edges;
  if (_shifted) {
    // Pressed look: flip bevel
    _shiftBtn.inner.style.borderTop    = b + 'px solid ' + edges.dark;
    _shiftBtn.inner.style.borderLeft   = b + 'px solid ' + edges.dark;
    _shiftBtn.inner.style.borderBottom = b + 'px solid ' + edges.light;
    _shiftBtn.inner.style.borderRight  = b + 'px solid ' + edges.light;
    _shiftBtn.inner.style.background   = T.bgLight;
  } else {
    // Normal look
    _shiftBtn.inner.style.borderTop    = b + 'px solid ' + edges.light;
    _shiftBtn.inner.style.borderLeft   = b + 'px solid ' + edges.light;
    _shiftBtn.inner.style.borderBottom = b + 'px solid ' + edges.dark;
    _shiftBtn.inner.style.borderRight  = b + 'px solid ' + edges.dark;
    _shiftBtn.inner.style.background   = T.bg;
  }
}

// ── Internal: Cursor Blink ──

function _startCursorBlink() {
  if (_cursorTimer) clearInterval(_cursorTimer);
  if (_cursor) _cursor.style.visibility = 'visible';
  _cursorTimer = setInterval(function() {
    if (_cursor) {
      _cursor.style.visibility = _cursor.style.visibility === 'hidden' ? 'visible' : 'hidden';
    }
  }, 500);
}
