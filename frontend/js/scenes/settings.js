// =======================================================
//  KINDpos Terminal — Configuration Scene (v2 Rebuild)
//  Two-tab dashboard: TERMINAL | HARDWARE
//  Nice. Dependable. Yours.
// =======================================================

import { T, chamfer, buildStyledButton, shadowColor } from '../tokens.js';
import { buildButton } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// == Helpers ============================================

function _darkenHex(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var f = 1 - pct;
  return '#' + [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
    .map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

function _lightenHex(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return '#' + [
    Math.min(255, Math.round(r + (255 - r) * pct)),
    Math.min(255, Math.round(g + (255 - g) * pct)),
    Math.min(255, Math.round(b + (255 - b) * pct)),
  ].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

// Build a card with the clock-in beveled depth style.
// borderColor: base color for the bevel (e.g. T.numpadChassis for mint, T.gold for gold)
// glowColor: rgba glow string, or null for no glow
function buildDepthCard(borderColor, opts) {
  var o = opts || {};
  var chamferSize = o.chamfer != null ? o.chamfer : 10;
  var hasGlow = o.glow !== false;
  var glowRgba = 'rgba(135,247,156,0.15)';

  // Compute glow color from borderColor if not mint
  if (borderColor === T.gold) {
    glowRgba = 'rgba(251,176,59,0.15)';
  } else if (borderColor === T.numpadChassis || borderColor === T.mint) {
    glowRgba = 'rgba(135,247,156,0.15)';
  }

  var wrap = document.createElement('div');
  var shadowStr = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px rgba(0,0,0,0.6))';
  if (hasGlow) shadowStr += ' drop-shadow(0 0 16px ' + glowRgba + ')';
  wrap.style.filter = shadowStr;

  var card = document.createElement('div');
  card.style.cssText = [
    'background:' + T.bgDark + ';',
    'border-top:7px solid ' + _lightenHex(borderColor, 0.2) + ';',
    'border-left:7px solid ' + _lightenHex(borderColor, 0.2) + ';',
    'border-bottom:7px solid ' + _darkenHex(borderColor, 0.3) + ';',
    'border-right:7px solid ' + _darkenHex(borderColor, 0.3) + ';',
    'clip-path:' + chamfer(chamferSize) + ';',
    'box-sizing:border-box;',
    'height:100%;width:100%;',
  ].join('');

  wrap.appendChild(card);
  return { wrap: wrap, card: card };
}

// == State =============================================

var _activeTab = 'terminal';  // 'terminal' | 'hardware'
var _contentEl = null;        // container for tab content
var _tabBtns = {};            // { terminal: {wrap,card,label}, hardware: {wrap,card,label} }
var _rootEl = null;
var _clockIv = null;

// Data state (carried over for later chunks)
var _savedDevices = [];
var _scanResults = [];
var _scanning = false;
var _expandedCard = null;     // for drill-down (Chunk 2+)
var _terminalConfig = {
  terminalName: 'KIND BBQ',
  ipAddress: '—',
  wifiSSID: '—',
  taxRate: '7.0',
  cashDiscount: '4.0',
};

// == Tab Card Builder ==================================

function buildTabCard(label, borderColor, isActive) {
  var dc = buildDepthCard(borderColor, { chamfer: 10, glow: true });

  dc.card.style.display = 'flex';
  dc.card.style.alignItems = 'center';
  dc.card.style.justifyContent = 'center';
  dc.card.style.cursor = 'pointer';
  dc.card.style.transition = 'background 80ms';
  dc.card.style.userSelect = 'none';
  dc.card.style.webkitUserSelect = 'none';

  var lbl = document.createElement('div');
  lbl.style.cssText = [
    'font-family:' + T.fh + ';',
    'font-size:50px;font-weight:bold;font-style:italic;',
    'text-align:center;',
    'pointer-events:none;',
  ].join('');
  lbl.textContent = label;
  dc.card.appendChild(lbl);

  function applyState(active) {
    if (active) {
      dc.card.style.background = borderColor;
      lbl.style.color = T.bgDark;
    } else {
      dc.card.style.background = T.bgDark;
      lbl.style.color = borderColor;
    }
  }

  applyState(isActive);

  dc.wrap.style.flex = '1';
  dc.wrap.style.height = '100%';

  return { wrap: dc.wrap, card: dc.card, label: lbl, applyState: applyState };
}

// == Tab Switching =====================================

function switchTab(tabName) {
  if (_activeTab === tabName) return;
  _activeTab = tabName;

  // Update tab visual states
  if (_tabBtns.terminal) _tabBtns.terminal.applyState(tabName === 'terminal');
  if (_tabBtns.hardware) _tabBtns.hardware.applyState(tabName === 'hardware');

  // Re-render content area
  renderContent();
}

// == Content Rendering =================================

function renderContent() {
  if (!_contentEl) return;
  _contentEl.innerHTML = '';

  if (_activeTab === 'terminal') {
    renderTerminalContent(_contentEl);
  } else {
    renderHardwareContent(_contentEl);
  }
}

// Placeholder renderers — wired in Chunks 2 & 3
function renderTerminalContent(el) {
  var placeholder = document.createElement('div');
  placeholder.style.cssText = [
    'display:flex;align-items:center;justify-content:center;',
    'height:100%;width:100%;',
    'font-family:' + T.fb + ';font-size:16px;color:' + T.mint + ';',
    'opacity:0.4;',
  ].join('');
  placeholder.textContent = 'TERMINAL content — Chunk 2';
  el.appendChild(placeholder);
}

function renderHardwareContent(el) {
  var placeholder = document.createElement('div');
  placeholder.style.cssText = [
    'display:flex;align-items:center;justify-content:center;',
    'height:100%;width:100%;',
    'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';',
    'opacity:0.4;',
  ].join('');
  placeholder.textContent = 'HARDWARE content — Chunk 3';
  el.appendChild(placeholder);
}

// == Scene Builder =====================================

function buildScene(container) {
  container.style.cssText = [
    'display:flex;flex-direction:column;',
    'width:100%;height:100%;',
    'background:' + T.bg + ';',
    'box-sizing:border-box;',
    'overflow:hidden;',
  ].join('');

  // ── Header bar (34px, mint) ──
  var header = document.createElement('div');
  header.style.cssText = [
    'width:100%;height:34px;flex-shrink:0;',
    'background:' + T.mint + ';',
    'display:flex;align-items:center;justify-content:space-between;',
    'padding:0 12px;',
    'box-sizing:border-box;',
  ].join('');

  // Left: date/time
  var clockEl = document.createElement('span');
  clockEl.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.bgDark + ';';
  header.appendChild(clockEl);

  function updateClock() {
    var now = new Date();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    var yy = String(now.getFullYear()).slice(2);
    var h = now.getHours();
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    var min = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = mm + '/' + dd + '/' + yy + ' // ' + h + ':' + min + ampm;
  }
  updateClock();
  _clockIv = setInterval(updateClock, 1000);

  // Right: X close button
  var xBtn = buildStyledButton({ variant: 'dark', size: 'sm', label: 'X' });
  xBtn.wrap.style.height = '26px';
  xBtn.wrap.style.minWidth = '36px';
  xBtn.inner.style.fontSize = '12px';
  xBtn.inner.style.color = T.mint;
  xBtn.wrap.addEventListener('pointerup', function() {
    SceneManager.closeTransactional('settings');
  });
  header.appendChild(xBtn.wrap);

  container.appendChild(header);

  // ── Tab cards row ──
  var tabRow = document.createElement('div');
  tabRow.style.cssText = [
    'display:flex;gap:12px;',
    'padding:12px 16px;',
    'height:130px;flex-shrink:0;',
    'box-sizing:border-box;',
  ].join('');

  // TERMINAL tab (mint, default active)
  _tabBtns.terminal = buildTabCard('TERMINAL', T.numpadChassis, _activeTab === 'terminal');
  _tabBtns.terminal.card.addEventListener('pointerup', function() { switchTab('terminal'); });
  tabRow.appendChild(_tabBtns.terminal.wrap);

  // HARDWARE tab (gold)
  _tabBtns.hardware = buildTabCard('HARDWARE', T.gold, _activeTab === 'hardware');
  _tabBtns.hardware.card.addEventListener('pointerup', function() { switchTab('hardware'); });
  tabRow.appendChild(_tabBtns.hardware.wrap);

  container.appendChild(tabRow);

  // ── Content area ──
  _contentEl = document.createElement('div');
  _contentEl.style.cssText = [
    'flex:1;min-height:0;',
    'overflow:hidden;',
    'padding:0 16px 12px;',
    'box-sizing:border-box;',
  ].join('');
  container.appendChild(_contentEl);

  // Initial render
  renderContent();
}

// == Registration ======================================

SceneManager.register({
  name: 'settings',
  cache: false,

  mount: function(container) {
    _rootEl = container;
    _activeTab = 'terminal';
    _contentEl = null;
    _tabBtns = {};
    _expandedCard = null;
    _savedDevices = [];
    _scanResults = [];
    _scanning = false;

    setSceneName('Configuration');
    setHeaderBack({
      x: true,
      onBack: function() { SceneManager.closeTransactional('settings'); },
    });

    buildScene(container);
  },

  unmount: function() {
    if (_clockIv) { clearInterval(_clockIv); _clockIv = null; }
    _rootEl = null;
    _contentEl = null;
    _tabBtns = {};
    _activeTab = 'terminal';
    _expandedCard = null;
    _savedDevices = [];
    _scanResults = [];
    _scanning = false;
  },
});

// == Interrupt: Confirm Delete Device ==================

SceneManager.register({
  name: 'confirm-delete-device',
  mount: function(container, params) {
    container.style.flexDirection = 'column';
    container.style.gap = '16px';

    var card = document.createElement('div');
    card.style.cssText = [
      'background:' + T.bg + ';',
      'border:3px solid ' + T.vermillion + ';',
      'padding:24px 32px;text-align:center;max-width:400px;',
      'clip-path:' + chamfer(10) + ';',
    ].join('');

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';margin-bottom:20px;';
    msg.textContent = 'Remove ' + (params.deviceName || 'device') + '?';
    card.appendChild(msg);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    btns.appendChild(buildButton('Remove', {
      fill: T.vermillion, color: T.embVermLabel, fontSize: '16px',
      width: 120, height: 40,
      onTap: function() { params.onConfirm(); },
    }));
    btns.appendChild(buildButton('Cancel', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px',
      width: 120, height: 40,
      onTap: function() { params.onCancel(); },
    }));

    card.appendChild(btns);
    container.appendChild(card);
  },
  unmount: function() {},
});
