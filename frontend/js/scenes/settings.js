// =======================================================
//  KINDpos Terminal — Configuration Scene (v2 Rebuild)
//  Two-tab dashboard: TERMINAL | HARDWARE
//  Nice. Dependable. Yours.
// =======================================================

import { T, chamfer, buildStyledButton, shadowColor, setTheme, resetTheme } from '../tokens.js';
import { buildButton } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { THEMES } from '../themes/index.js';

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

// Theme state
var _currentThemeId = 'terminal-glow';
var _previewThemeId = null;

// Data state (carried over for later chunks)
var _savedDevices = [];
var _scanResults = [];
var _scanning = false;
var _expandedCard = null;     // for drill-down
var _scrollPositions = {};    // scroll position per tab
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

  // If a card is expanded (drill-down), render that instead
  if (_expandedCard) {
    renderDrillDown(_contentEl, _expandedCard);
    return;
  }

  if (_activeTab === 'terminal') {
    renderTerminalContent(_contentEl);
  } else {
    renderHardwareContent(_contentEl);
  }
}

// == TERMINAL Tab: 2-column category grid ==============

var TERMINAL_CATEGORIES = [
  { id: 'display',      label: 'DISPLAY' },
  { id: 'network',      label: 'NETWORK' },
  { id: 'store-info',   label: 'STORE INFO' },
  { id: 'tax-pricing',  label: 'TAX & PRICING' },
  { id: 'security',     label: 'SECURITY' },
  { id: 'system',       label: 'SYSTEM' },
];

function renderTerminalContent(el) {
  var grid = document.createElement('div');
  grid.style.cssText = [
    'display:grid;',
    'grid-template-columns:1fr 1fr;',
    'gap:12px;',
    'height:100%;',
    'overflow-y:auto;',
    'scrollbar-width:none;',
    '-webkit-overflow-scrolling:touch;',
    'align-content:start;',
    'padding-bottom:8px;',
  ].join('');

  // Hide scrollbar for WebKit
  if (!document.getElementById('cfg-grid-style')) {
    var style = document.createElement('style');
    style.id = 'cfg-grid-style';
    style.textContent = '.cfg-grid::-webkit-scrollbar{display:none}';
    document.head.appendChild(style);
  }
  grid.classList.add('cfg-grid');

  _scrollPositions = _scrollPositions || {};

  // Restore scroll position
  var savedScroll = _scrollPositions[_activeTab] || 0;
  requestAnimationFrame(function() { grid.scrollTop = savedScroll; });

  // Save scroll on scroll
  grid.addEventListener('scroll', function() {
    _scrollPositions[_activeTab] = grid.scrollTop;
  });

  TERMINAL_CATEGORIES.forEach(function(cat) {
    grid.appendChild(buildCategoryCard(cat, T.numpadChassis));
  });

  el.appendChild(grid);
}

// == HARDWARE Tab: 2x2 category grid ==================

var HARDWARE_CATEGORIES = [
  { id: 'printers',    label: 'PRINTERS' },
  { id: 'readers',     label: 'CARD READERS' },
  { id: 'peripherals', label: 'PERIPHERAL DEVICES' },
];

var _scanEventSource = null;
var _scanGen = 0;

function renderHardwareContent(el) {
  var grid = document.createElement('div');
  grid.style.cssText = [
    'display:grid;',
    'grid-template-columns:1fr 1fr;',
    'gap:12px;',
    'height:100%;',
    'align-content:start;',
    'box-sizing:border-box;',
  ].join('');

  // Device category cards (PRINTERS, CARD READERS, PERIPHERAL DEVICES)
  HARDWARE_CATEGORIES.forEach(function(cat) {
    grid.appendChild(buildCategoryCard(cat, T.gold));
  });

  // SCAN NETWORK card
  grid.appendChild(buildScanNetworkCard());

  el.appendChild(grid);
}

// == SCAN NETWORK Card (3 states) ======================

function buildScanNetworkCard() {
  var dc = buildDepthCard(T.gold, { chamfer: 10, glow: true });
  dc.card.style.minHeight = '100px';
  dc.card.style.display = 'flex';
  dc.card.style.flexDirection = 'column';
  dc.card.style.alignItems = 'center';
  dc.card.style.justifyContent = 'center';
  dc.card.style.padding = '12px';
  dc.card.style.gap = '8px';
  dc.card.style.overflow = 'hidden';
  dc.card.style.position = 'relative';

  // Inject pulse animation style once
  if (!document.getElementById('cfg-scan-pulse')) {
    var style = document.createElement('style');
    style.id = 'cfg-scan-pulse';
    style.textContent = [
      '@keyframes cfg-pulse{0%{opacity:0.4}50%{opacity:1}100%{opacity:0.4}}',
      '.cfg-scanning-dots::after{content:"";animation:cfg-dots 1.5s steps(4,end) infinite}',
      '@keyframes cfg-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}',
    ].join('');
    document.head.appendChild(style);
  }

  var _scanCard = dc.card;
  var _scanWrap = dc.wrap;

  renderScanInitial(_scanCard, _scanWrap);

  return dc.wrap;
}

function renderScanInitial(card, wrap) {
  card.innerHTML = '';

  var scanBtn = buildStyledButton({ variant: 'gold', size: 'md', label: 'SCAN NETWORK' });
  scanBtn.wrap.addEventListener('pointerup', function() {
    startNetworkScan(card, wrap);
  });
  card.appendChild(scanBtn.wrap);
}

function startNetworkScan(card, wrap) {
  // Close any existing scan
  if (_scanEventSource) {
    _scanEventSource.close();
    _scanEventSource = null;
  }

  _scanning = true;
  _scanResults = [];
  _scanGen++;
  var gen = _scanGen;

  // Scanning state UI
  card.innerHTML = '';
  card.style.animation = 'cfg-pulse 1.2s ease-in-out infinite';

  var scanLabel = document.createElement('div');
  scanLabel.style.cssText = [
    'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';',
    'text-align:center;',
  ].join('');
  scanLabel.textContent = '......scanning network....';
  card.appendChild(scanLabel);

  // Discovery area (devices appear here as found)
  var discoveryArea = document.createElement('div');
  discoveryArea.style.cssText = [
    'display:flex;flex-direction:column;gap:6px;',
    'width:100%;overflow-y:auto;scrollbar-width:none;',
    'max-height:calc(100% - 60px);',
  ].join('');
  card.appendChild(discoveryArea);

  // SSE stream
  _scanEventSource = new EventSource('/api/v1/hardware/scan/stream');

  _scanEventSource.onmessage = function(e) {
    if (gen !== _scanGen) return; // stale
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'device') {
        _scanResults.push(data);
        discoveryArea.appendChild(buildDiscoveryCard(data, card, wrap));
      } else if (data.type === 'complete') {
        _scanning = false;
        card.style.animation = '';
        scanLabel.textContent = _scanResults.length + ' device' + (_scanResults.length !== 1 ? 's' : '') + ' found';
        if (_scanEventSource) { _scanEventSource.close(); _scanEventSource = null; }

        // Add re-scan button at bottom
        var rescanBtn = buildStyledButton({ variant: 'gold', size: 'sm', label: 'SCAN AGAIN' });
        rescanBtn.wrap.style.marginTop = '6px';
        rescanBtn.wrap.addEventListener('pointerup', function() {
          startNetworkScan(card, wrap);
        });
        card.appendChild(rescanBtn.wrap);
      }
    } catch (err) {
      console.warn('[KINDpos] Scan parse error:', err);
    }
  };

  _scanEventSource.onerror = function() {
    if (gen !== _scanGen) return;
    _scanning = false;
    card.style.animation = '';
    scanLabel.textContent = 'Scan failed — tap to retry';
    if (_scanEventSource) { _scanEventSource.close(); _scanEventSource = null; }

    var retryBtn = buildStyledButton({ variant: 'gold', size: 'sm', label: 'RETRY' });
    retryBtn.wrap.addEventListener('pointerup', function() {
      startNetworkScan(card, wrap);
    });
    card.appendChild(retryBtn.wrap);
  };
}

// == Discovery Card (inside SCAN NETWORK) ==============

function buildDiscoveryCard(dev, scanCard, scanWrap) {
  var row = document.createElement('div');
  row.style.cssText = [
    'background:' + T.bg + ';',
    'padding:6px 10px;',
    'clip-path:' + chamfer(4) + ';',
    'display:flex;align-items:center;justify-content:space-between;gap:8px;',
  ].join('');

  var info = document.createElement('div');
  info.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;';

  var typeName = dev.name || dev.type || 'Unknown Device';
  var typeEl = document.createElement('div');
  typeEl.style.cssText = 'font-family:' + T.fh + ';font-size:12px;color:' + T.gold + ';';
  typeEl.textContent = typeName;
  info.appendChild(typeEl);

  var addrEl = document.createElement('div');
  addrEl.style.cssText = 'font-family:' + T.fb + ';font-size:10px;color:' + T.mint + ';';
  addrEl.textContent = 'IP: ' + dev.ip + '   MAC: ' + (dev.mac || '—');
  info.appendChild(addrEl);

  row.appendChild(info);

  // Already saved?
  if (dev.saved_name) {
    var confLabel = document.createElement('div');
    confLabel.style.cssText = 'font-family:' + T.fb + ';font-size:10px;color:' + T.lime + ';white-space:nowrap;';
    confLabel.textContent = 'CONFIGURED';
    row.appendChild(confLabel);
  } else {
    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';

    var saveBtn = buildStyledButton({ variant: 'mint', size: 'sm', label: 'SAVE' });
    saveBtn.wrap.style.height = '24px';
    saveBtn.wrap.style.minWidth = '50px';
    saveBtn.inner.style.fontSize = '10px';
    saveBtn.wrap.addEventListener('pointerup', function() {
      saveDiscoveredDevice(dev).then(function(ok) {
        if (ok) {
          btnArea.innerHTML = '';
          var done = document.createElement('span');
          done.style.cssText = 'font-family:' + T.fb + ';font-size:10px;color:' + T.lime + ';';
          done.textContent = 'SAVED';
          btnArea.appendChild(done);
        }
      });
    });
    btnArea.appendChild(saveBtn.wrap);

    var editBtn = buildStyledButton({ variant: 'dark', size: 'sm', label: 'EDIT' });
    editBtn.wrap.style.height = '24px';
    editBtn.wrap.style.minWidth = '50px';
    editBtn.inner.style.fontSize = '10px';
    editBtn.inner.style.color = T.textPrimary;
    editBtn.wrap.addEventListener('pointerup', function() {
      // TODO: Chunk 5 — open device edit form
      console.log('[KINDpos] Edit device:', dev);
    });
    btnArea.appendChild(editBtn.wrap);

    row.appendChild(btnArea);
  }

  return row;
}

// == Hardware API ======================================

function saveDiscoveredDevice(dev) {
  var device = {
    mac: dev.mac,
    ip: dev.ip,
    type: dev.type || 'receipt',
    name: dev.name || 'Device ' + dev.ip,
    port: dev.port || 9100,
  };
  return fetch('/api/v1/hardware/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device),
  }).then(function(r) {
    if (r.ok) {
      return r.json().then(function(saved) {
        _savedDevices.push(saved);
        // Hot-reload
        fetch('/api/v1/payments/reload-devices', { method: 'POST' }).catch(function() {});
        return true;
      });
    }
    return false;
  }).catch(function() { return false; });
}

function loadDevices() {
  return fetch('/api/v1/hardware/devices')
    .then(function(r) { return r.ok ? r.json() : []; })
    .then(function(data) { _savedDevices = data; return data; })
    .catch(function() { _savedDevices = []; return []; });
}

// == Category Card =====================================

function buildCategoryCard(cat, borderColor) {
  var dc = buildDepthCard(borderColor, { chamfer: 10, glow: true });

  dc.card.style.display = 'flex';
  dc.card.style.alignItems = 'center';
  dc.card.style.justifyContent = 'center';
  dc.card.style.cursor = 'pointer';
  dc.card.style.minHeight = '100px';
  dc.card.style.userSelect = 'none';
  dc.card.style.webkitUserSelect = 'none';

  var lbl = document.createElement('div');
  lbl.style.cssText = [
    'font-family:' + T.fh + ';',
    'font-size:32px;font-weight:bold;font-style:italic;',
    'color:' + borderColor + ';',
    'text-align:center;',
    'pointer-events:none;',
  ].join('');
  lbl.textContent = cat.label;
  dc.card.appendChild(lbl);

  dc.wrap.dataset.catId = cat.id;

  dc.wrap.addEventListener('pointerup', function() {
    // Store origin rect for animation
    var rect = dc.wrap.getBoundingClientRect();
    _expandOrigin = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
    _expandedCard = { id: cat.id, label: cat.label, tab: _activeTab, borderColor: borderColor };
    renderContent();
  });

  return dc.wrap;
}

// == Drill-Down Expand/Collapse ========================

var _expandOrigin = null;

function renderDrillDown(el, catInfo) {
  el.style.position = 'relative';

  // Get content area bounds for animation target
  var targetRect = el.getBoundingClientRect();

  // Expanded container — animates from origin to full
  var expanded = document.createElement('div');
  expanded.style.cssText = [
    'position:absolute;',
    'background:' + T.bgDark + ';',
    'border-top:7px solid ' + _lightenHex(catInfo.borderColor, 0.2) + ';',
    'border-left:7px solid ' + _lightenHex(catInfo.borderColor, 0.2) + ';',
    'border-bottom:7px solid ' + _darkenHex(catInfo.borderColor, 0.3) + ';',
    'border-right:7px solid ' + _darkenHex(catInfo.borderColor, 0.3) + ';',
    'clip-path:' + chamfer(10) + ';',
    'box-sizing:border-box;',
    'display:flex;flex-direction:column;',
    'overflow:hidden;',
    'z-index:5;',
  ].join('');

  // Start at origin bounds (relative to content area)
  if (_expandOrigin) {
    var oTop = _expandOrigin.top - targetRect.top;
    var oLeft = _expandOrigin.left - targetRect.left;
    expanded.style.top = oTop + 'px';
    expanded.style.left = oLeft + 'px';
    expanded.style.width = _expandOrigin.width + 'px';
    expanded.style.height = _expandOrigin.height + 'px';
    expanded.style.transition = 'top 220ms ease-out, left 220ms ease-out, width 220ms ease-out, height 220ms ease-out';

    // Animate to full size on next frame
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        expanded.style.top = '0';
        expanded.style.left = '0';
        expanded.style.width = '100%';
        expanded.style.height = '100%';
      });
    });
  } else {
    expanded.style.inset = '0';
    expanded.style.width = '100%';
    expanded.style.height = '100%';
  }

  // Header bar inside expanded
  var hdr = document.createElement('div');
  hdr.style.cssText = [
    'display:flex;align-items:center;justify-content:space-between;',
    'padding:12px 16px;flex-shrink:0;',
  ].join('');

  var title = document.createElement('div');
  title.style.cssText = [
    'font-family:' + T.fh + ';font-size:28px;font-weight:bold;font-style:italic;',
    'color:' + catInfo.borderColor + ';',
  ].join('');
  title.textContent = catInfo.label;
  hdr.appendChild(title);
  expanded.appendChild(hdr);

  // Content area inside expanded — dispatch to category renderer
  var body = document.createElement('div');
  body.style.cssText = [
    'flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;',
    'padding:0 16px 16px;',
  ].join('');

  renderDrillDownContent(body, catInfo);
  expanded.appendChild(body);

  // <<< back button — pinned bottom-right
  var backWrap = document.createElement('div');
  backWrap.style.cssText = [
    'position:absolute;bottom:12px;right:12px;',
  ].join('');

  var backBtn = buildStyledButton({ variant: 'dark', size: 'sm', label: '<<<' });
  backBtn.inner.style.color = T.mint;
  backBtn.inner.style.fontSize = '14px';
  backBtn.wrap.style.height = '32px';
  backBtn.wrap.style.minWidth = '60px';
  backBtn.wrap.addEventListener('pointerup', function() {
    collapseDrillDown(expanded, el);
  });
  backWrap.appendChild(backBtn.wrap);
  expanded.appendChild(backWrap);

  el.appendChild(expanded);
}

function collapseDrillDown(expandedEl, containerEl) {
  if (_expandOrigin) {
    var targetRect = containerEl.getBoundingClientRect();
    var oTop = _expandOrigin.top - targetRect.top;
    var oLeft = _expandOrigin.left - targetRect.left;

    expandedEl.style.transition = 'top 220ms ease-in, left 220ms ease-in, width 220ms ease-in, height 220ms ease-in';
    expandedEl.style.top = oTop + 'px';
    expandedEl.style.left = oLeft + 'px';
    expandedEl.style.width = _expandOrigin.width + 'px';
    expandedEl.style.height = _expandOrigin.height + 'px';
    expandedEl.style.overflow = 'hidden';

    setTimeout(function() {
      _expandedCard = null;
      _expandOrigin = null;
      renderContent();
    }, 220);
  } else {
    _expandedCard = null;
    _expandOrigin = null;
    renderContent();
  }
}

// == Drill-Down Content Dispatcher =====================

var _drillDownRenderers = {
  'display':     renderDisplaySettings,
  'network':     renderNetworkSettings,
  'store-info':  renderStoreInfoSettings,
  'tax-pricing': renderTaxPricingSettings,
  'security':    renderSecuritySettings,
  'system':      renderSystemSettings,
  'printers':    renderDeviceGrid,
  'readers':     renderDeviceGrid,
  'peripherals': renderDeviceGrid,
};

function renderDrillDownContent(body, catInfo) {
  var renderer = _drillDownRenderers[catInfo.id] || renderPlaceholder;
  renderer(body, catInfo);
}

function renderPlaceholder(body, catInfo) {
  var ph = document.createElement('div');
  ph.style.cssText = [
    'display:flex;align-items:center;justify-content:center;height:100%;',
    'font-family:' + T.fb + ';font-size:14px;color:' + (catInfo.borderColor || T.mint) + ';opacity:0.4;',
  ].join('');
  ph.textContent = catInfo.label + ' — content pending';
  body.appendChild(ph);
}

// == Setting Row Helpers ===============================

function buildSettingRow(label, rightEl) {
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;align-items:center;justify-content:space-between;',
    'padding:10px 12px;',
    'background:' + T.bg + ';',
    'clip-path:' + chamfer(4) + ';',
  ].join('');

  var lbl = document.createElement('div');
  lbl.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.mint + ';';
  lbl.textContent = label;
  row.appendChild(lbl);

  if (rightEl) row.appendChild(rightEl);
  return row;
}

function buildValueLabel(text, color) {
  var el = document.createElement('div');
  el.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + (color || T.gold) + ';text-align:right;';
  el.textContent = text;
  return el;
}

function buildToggleBtn(isOn, onToggle) {
  var pair = buildStyledButton({ variant: isOn ? 'mint' : 'dark', size: 'sm', label: isOn ? 'ON' : 'OFF' });
  pair.wrap.style.height = '28px';
  pair.wrap.style.minWidth = '60px';
  pair.inner.style.fontSize = '11px';
  if (!isOn) pair.inner.style.color = T.textPrimary;

  pair.wrap.addEventListener('pointerup', function() {
    if (onToggle) onToggle(!isOn);
  });
  return pair.wrap;
}

function buildPresetButtons(options, current, onSelect) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
  options.forEach(function(opt) {
    var active = current === opt.value;
    var pair = buildStyledButton({ variant: active ? 'mint' : 'dark', size: 'sm', label: opt.label });
    pair.wrap.style.height = '28px';
    pair.wrap.style.minWidth = '60px';
    pair.inner.style.fontSize = '10px';
    if (!active) pair.inner.style.color = T.textPrimary;
    pair.wrap.addEventListener('pointerup', function() {
      if (onSelect) onSelect(opt.value);
    });
    row.appendChild(pair.wrap);
  });
  return row;
}

function buildTextInput(value, placeholder, onChange) {
  var input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.placeholder = placeholder || '';
  input.style.cssText = [
    'background:' + T.bgDark + ';color:' + T.gold + ';',
    'border:2px solid ' + T.border + ';',
    'font-family:' + T.fb + ';font-size:14px;',
    'padding:6px 10px;',
    'clip-path:' + chamfer(4) + ';',
    'outline:none;width:180px;',
  ].join('');
  input.addEventListener('change', function() {
    if (onChange) onChange(input.value);
  });
  return input;
}

function buildSettingsGrid(rows) {
  var grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  rows.forEach(function(r) { grid.appendChild(r); });
  return grid;
}

// == TERMINAL: DISPLAY =================================

function renderDisplaySettings(body) {
  var brightness = 100;
  var resolution = '1024x600';
  var orientation = 'landscape';

  // Theme row — shows current theme name, tapping opens picker
  var themeLabel = THEMES.find(function(t) { return t.id === _currentThemeId; });
  var themeName = themeLabel ? themeLabel.label : 'Terminal Glow';
  var themeVal = buildValueLabel(themeName);
  themeVal.style.cursor = 'pointer';
  var themeRow = buildSettingRow('Theme', themeVal);
  themeRow.style.cursor = 'pointer';
  themeRow.addEventListener('pointerup', function() {
    renderThemePicker(body);
  });

  var grid = buildSettingsGrid([
    themeRow,
    buildSettingRow('Brightness', buildValueLabel(brightness + '%')),
    buildSettingRow('Resolution', buildPresetButtons([
      { label: '1024×600', value: '1024x600' },
      { label: '800×480', value: '800x480' },
    ], resolution, function(v) {
      resolution = v;
      renderDisplaySettings(body);
    })),
    buildSettingRow('Orientation', buildPresetButtons([
      { label: 'Landscape', value: 'landscape' },
      { label: 'Portrait', value: 'portrait' },
    ], orientation, function(v) {
      orientation = v;
      renderDisplaySettings(body);
    })),
  ]);

  body.innerHTML = '';
  body.appendChild(grid);
}

// == THEME PICKER GRID =================================

// Swatch colors for each theme tile (primary accent + bg)
var _THEME_SWATCHES = {
  'terminal-glow': { accent: '#87f79c', bg: '#333333', bg2: '#1a1a1a' },
  'pizza-palace':  { accent: '#CC2200', bg: '#F0E8D5', bg2: '#e4d8c2' },
  'neon-diner':    { accent: '#ff2d78', bg: '#0a0a1a', bg2: '#14142a' },
  'steakhouse':    { accent: '#c9943a', bg: '#2a1800', bg2: '#151515' },
  'tiki-bar':      { accent: '#5cff8f', bg: '#1a0d00', bg2: '#120800' },
  'ramen-shop':    { accent: '#ff3a3a', bg: '#0d0d12', bg2: '#16161e' },
  'bbq-pit':       { accent: '#ff6b1a', bg: '#181818', bg2: '#0f0f0f' },
  'seafood-shack': { accent: '#00cfcf', bg: '#0d1a1f', bg2: '#061012' },
  'speakeasy':     { accent: '#b39ddb', bg: '#1a1228', bg2: '#100e14' },
  'farm-table':    { accent: '#d4a84b', bg: '#161410', bg2: '#0e0c08' },
  'rooftop-bar':   { accent: '#ff7eb3', bg: '#0a0510', bg2: '#060208' },
  'atomic-purple': { accent: '#9b59ff', bg: '#0d0d0f', bg2: '#141418' },
  'rainbow':       { accent: '#ff3333', bg: '#1a1a2e', bg2: '#0f0f1a' },
};

function renderThemePicker(body) {
  _previewThemeId = _currentThemeId;
  body.innerHTML = '';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;gap:8px;';

  // Grid of theme tiles (3 columns)
  var grid = document.createElement('div');
  grid.style.cssText = [
    'flex:1;display:grid;',
    'grid-template-columns:1fr 1fr 1fr;',
    'gap:8px;overflow-y:auto;',
    'scrollbar-width:none;',
    'align-content:start;',
  ].join('');

  THEMES.forEach(function(themeEntry) {
    var tile = _buildThemeTile(themeEntry, grid, body);
    grid.appendChild(tile);
  });

  wrap.appendChild(grid);

  // Bottom bar: Cancel + Confirm
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'flex-shrink:0;display:flex;gap:8px;padding-top:4px;';

  var cancelBtn = buildButton('CANCEL', {
    fill: T.darkBtn, color: T.mint, fontSize: '22px', fontFamily: T.fh, height: 40,
    onTap: function() {
      // Revert preview
      if (_previewThemeId !== _currentThemeId) {
        _applyThemeById(_currentThemeId);
      }
      renderDisplaySettings(body);
    },
  });
  cancelBtn.style.flex = '1';

  var confirmBtn = buildButton('CONFIRM', {
    fill: T.darkBtn, color: T.mint, fontSize: '22px', fontFamily: T.fh, height: 40,
    onTap: function() {
      _currentThemeId = _previewThemeId || _currentThemeId;
      renderDisplaySettings(body);
    },
  });
  confirmBtn.style.flex = '1';
  confirmBtn.style.outline = '2px solid ' + T.mint;
  confirmBtn.style.outlineOffset = '-1px';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  wrap.appendChild(btnRow);

  body.appendChild(wrap);
}

function _buildThemeTile(themeEntry, grid, body) {
  var sw = _THEME_SWATCHES[themeEntry.id] || { accent: '#888', bg: '#333', bg2: '#222' };
  var isActive = themeEntry.id === (_previewThemeId || _currentThemeId);

  var tile = document.createElement('div');
  tile.style.cssText = [
    'display:flex;flex-direction:column;',
    'background:' + sw.bg2 + ';',
    'border:3px solid ' + (isActive ? sw.accent : T.border) + ';',
    'clip-path:' + chamfer(6) + ';',
    'cursor:pointer;padding:6px;gap:4px;',
    'transition:border-color 80ms;',
  ].join('');

  // Color swatches row
  var swatchRow = document.createElement('div');
  swatchRow.style.cssText = 'display:flex;gap:3px;height:18px;';

  var accentDot = document.createElement('div');
  accentDot.style.cssText = 'flex:2;background:' + sw.accent + ';border-radius:2px;';
  var bgDot = document.createElement('div');
  bgDot.style.cssText = 'flex:1;background:' + sw.bg + ';border-radius:2px;';
  var goldDot = document.createElement('div');
  goldDot.style.cssText = 'flex:1;background:#fbb03b;border-radius:2px;';

  swatchRow.appendChild(accentDot);
  swatchRow.appendChild(bgDot);
  swatchRow.appendChild(goldDot);
  tile.appendChild(swatchRow);

  // Label
  var lbl = document.createElement('div');
  lbl.style.cssText = [
    'font-family:' + T.fh + ';font-size:13px;',
    'color:' + sw.accent + ';',
    'text-align:center;letter-spacing:0.04em;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
  ].join('');
  lbl.textContent = themeEntry.label;
  tile.appendChild(lbl);

  tile.addEventListener('pointerup', function() {
    _previewThemeId = themeEntry.id;
    _applyThemeById(themeEntry.id);
    // Re-render grid to update active border
    renderThemePicker(body);
  });

  return tile;
}

function _applyThemeById(id) {
  if (id === 'terminal-glow') {
    resetTheme();
    return;
  }
  var entry = THEMES.find(function(t) { return t.id === id; });
  if (!entry || !entry.loader) return;
  entry.loader().then(function(themeObj) {
    resetTheme();
    setTheme(themeObj);
  });
}

// == TERMINAL: NETWORK =================================

function renderNetworkSettings(body) {
  // Load current values
  fetch('/api/v1/config/pricing').then(function(r) { return r.json(); }).catch(function() { return {}; }).then(function() {
    var connected = true; // placeholder — no endpoint for connection status

    var connEl = document.createElement('div');
    connEl.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + (connected ? T.lime : T.vermillion) + ';';
    connEl.textContent = connected ? '● CONNECTED' : '● DISCONNECTED';

    var grid = buildSettingsGrid([
      buildSettingRow('WiFi SSID', buildTextInput(_terminalConfig.wifiSSID, 'SSID', function(v) {
        _terminalConfig.wifiSSID = v;
      })),
      buildSettingRow('Static IP', buildValueLabel(_terminalConfig.ipAddress)),
      buildSettingRow('Hostname', buildTextInput('kindpos-terminal', 'hostname')),
      buildSettingRow('Status', connEl),
    ]);

    body.innerHTML = '';
    body.appendChild(grid);
  });
}

// == TERMINAL: STORE INFO ==============================

var _storeInfo = {
  business_name: '',
  address: '',
  phone: '',
  receipt_header: '',
  receipt_footer: '',
};

function renderStoreInfoSettings(body) {
  // Load store config
  fetch('/api/v1/config/store').then(function(r) {
    return r.ok ? r.json() : {};
  }).catch(function() { return {}; }).then(function(data) {
    if (data.store) {
      _storeInfo.business_name = data.store.business_name || '';
      _storeInfo.address = data.store.address || '';
      _storeInfo.phone = data.store.phone || '';
      _storeInfo.receipt_header = data.store.receipt_header || '';
      _storeInfo.receipt_footer = data.store.receipt_footer || '';
    }

    var grid = buildSettingsGrid([
      buildSettingRow('Business Name', buildTextInput(_storeInfo.business_name, 'Business name', function(v) { _storeInfo.business_name = v; })),
      buildSettingRow('Address', buildTextInput(_storeInfo.address, 'Address', function(v) { _storeInfo.address = v; })),
      buildSettingRow('Phone', buildTextInput(_storeInfo.phone, 'Phone', function(v) { _storeInfo.phone = v; })),
      buildSettingRow('Receipt Header', buildTextInput(_storeInfo.receipt_header, 'Header text', function(v) { _storeInfo.receipt_header = v; })),
      buildSettingRow('Receipt Footer', buildTextInput(_storeInfo.receipt_footer, 'Footer text', function(v) { _storeInfo.receipt_footer = v; })),
    ]);

    // Save button
    var saveBtn = buildStyledButton({ variant: 'mint', size: 'sm', label: 'SAVE' });
    saveBtn.wrap.style.marginTop = '12px';
    saveBtn.wrap.style.alignSelf = 'flex-start';
    saveBtn.wrap.addEventListener('pointerup', function() {
      fetch('/api/v1/config/store/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(_storeInfo),
      }).then(function(r) {
        if (r.ok) saveBtn.inner.textContent = 'SAVED';
        setTimeout(function() { saveBtn.inner.textContent = 'SAVE'; }, 1500);
      }).catch(function() {
        console.warn('[KINDpos] Store info save failed');
      });
    });

    body.innerHTML = '';
    body.appendChild(grid);
    body.appendChild(saveBtn.wrap);
  });
}

// == TERMINAL: TAX & PRICING ===========================

function renderTaxPricingSettings(body) {
  fetch('/api/v1/config/pricing').then(function(r) {
    return r.ok ? r.json() : {};
  }).catch(function() { return {}; }).then(function(data) {
    var taxRate = data.tax_rate != null ? String(data.tax_rate) : _terminalConfig.taxRate;
    var cashDiscount = data.cash_discount_rate != null ? String(data.cash_discount_rate) : _terminalConfig.cashDiscount;
    var dualPricing = parseFloat(cashDiscount) > 0;
    var rounding = 'standard';
    var currency = 'USD';

    var grid = buildSettingsGrid([
      buildSettingRow('Tax Rate %', buildValueLabel(taxRate + '%')),
      buildSettingRow('Dual Pricing', buildToggleBtn(dualPricing, function(v) {
        dualPricing = v;
        renderTaxPricingSettings(body);
      })),
      buildSettingRow('Cash Discount %', buildValueLabel(cashDiscount + '%')),
      buildSettingRow('Rounding', buildPresetButtons([
        { label: 'Standard', value: 'standard' },
        { label: 'Up', value: 'up' },
        { label: 'Down', value: 'down' },
      ], rounding, function(v) { rounding = v; })),
      buildSettingRow('Currency', buildPresetButtons([
        { label: 'USD', value: 'USD' },
        { label: 'CAD', value: 'CAD' },
        { label: 'EUR', value: 'EUR' },
      ], currency, function(v) { currency = v; })),
    ]);

    // Save button
    var saveBtn = buildStyledButton({ variant: 'mint', size: 'sm', label: 'SAVE' });
    saveBtn.wrap.style.marginTop = '12px';
    saveBtn.wrap.addEventListener('pointerup', function() {
      fetch('/api/v1/config/store/cc-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc_processing_rate: parseFloat(taxRate) || 0 }),
      }).then(function(r) {
        if (r.ok) saveBtn.inner.textContent = 'SAVED';
        setTimeout(function() { saveBtn.inner.textContent = 'SAVE'; }, 1500);
      }).catch(function() {
        console.warn('[KINDpos] Pricing save failed');
      });
    });

    body.innerHTML = '';
    body.appendChild(grid);
    body.appendChild(saveBtn.wrap);
  });
}

// == TERMINAL: SECURITY ================================

function renderSecuritySettings(body) {
  fetch('/api/v1/config/roles').then(function(r) {
    return r.ok ? r.json() : [];
  }).catch(function() { return []; }).then(function(roles) {
    var sessionTimeout = 30;

    var grid = buildSettingsGrid([
      buildSettingRow('Manager PIN', buildValueLabel('••••')),
      buildSettingRow('Session Timeout', buildValueLabel(sessionTimeout + ' min')),
    ]);

    // Role permissions grid
    if (roles.length > 0) {
      var roleHeader = document.createElement('div');
      roleHeader.style.cssText = 'font-family:' + T.fh + ';font-size:18px;color:' + T.mint + ';margin-top:12px;margin-bottom:6px;';
      roleHeader.textContent = 'ROLE PERMISSIONS';
      grid.appendChild(roleHeader);

      roles.forEach(function(role) {
        var roleName = role.name || role.role_id || 'Unknown';
        var perms = role.permissions || [];
        var permStr = perms.length > 0 ? perms.join(', ') : 'none';
        grid.appendChild(buildSettingRow(roleName, buildValueLabel(permStr, T.textPrimary)));
      });
    }

    // Save button
    var saveBtn = buildStyledButton({ variant: 'mint', size: 'sm', label: 'SAVE' });
    saveBtn.wrap.style.marginTop = '12px';
    saveBtn.wrap.addEventListener('pointerup', function() {
      fetch('/api/v1/config/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      }).then(function(r) {
        if (r.ok) saveBtn.inner.textContent = 'SAVED';
        setTimeout(function() { saveBtn.inner.textContent = 'SAVE'; }, 1500);
      }).catch(function() {
        console.warn('[KINDpos] Security save failed');
      });
    });

    body.innerHTML = '';
    body.appendChild(grid);
    body.appendChild(saveBtn.wrap);
  });
}

// == TERMINAL: SYSTEM ==================================

function renderSystemSettings(body) {
  var language = 'en';
  var updateChannel = 'stable';

  var versionEl = document.createElement('div');
  versionEl.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.lime + ';';
  versionEl.textContent = 'KINDpos/lite Vz1.2';

  var grid = buildSettingsGrid([
    buildSettingRow('Version', versionEl),
    buildSettingRow('Language', buildPresetButtons([
      { label: 'English', value: 'en' },
      { label: 'Español', value: 'es' },
    ], language, function(v) { language = v; })),
    buildSettingRow('Update Channel', buildPresetButtons([
      { label: 'Stable', value: 'stable' },
      { label: 'Beta', value: 'beta' },
    ], updateChannel, function(v) { updateChannel = v; })),
    buildSettingRow('Date', buildValueLabel(new Date().toLocaleDateString())),
    buildSettingRow('Time', buildValueLabel(new Date().toLocaleTimeString())),
  ]);

  // Save button
  var saveBtn = buildStyledButton({ variant: 'mint', size: 'sm', label: 'SAVE' });
  saveBtn.wrap.style.marginTop = '12px';
  saveBtn.wrap.addEventListener('pointerup', function() {
    console.warn('[KINDpos] PUT /api/v1/config/system not implemented yet');
    saveBtn.inner.textContent = 'SAVED';
    setTimeout(function() { saveBtn.inner.textContent = 'SAVE'; }, 1500);
  });

  body.innerHTML = '';
  body.appendChild(grid);
  body.appendChild(saveBtn.wrap);
}

// == HARDWARE: Device Grid =============================

var _selectedDeviceMac = null;

var _deviceTypeMap = {
  'printers':    ['kitchen', 'receipt'],
  'readers':     ['card_reader'],
  'peripherals': [],  // everything else
};

function _devicesForCategory(catId) {
  var types = _deviceTypeMap[catId];
  if (!types || types.length === 0) {
    // Peripherals: everything not printer or reader
    var knownTypes = ['kitchen', 'receipt', 'card_reader'];
    return _savedDevices.filter(function(d) { return knownTypes.indexOf(d.type) < 0; });
  }
  return _savedDevices.filter(function(d) { return types.indexOf(d.type) >= 0; });
}

function _typeLabel(type) {
  if (type === 'kitchen') return 'Kitchen Printer';
  if (type === 'receipt') return 'Receipt Printer';
  if (type === 'card_reader') return 'Card Reader';
  return type || 'Unknown';
}

function _shortenMac(mac) {
  if (!mac) return '—';
  var parts = mac.split(':');
  if (parts.length <= 3) return mac;
  return '••:••:••:' + parts.slice(3).join(':');
}

function renderDeviceGrid(body, catInfo) {
  // Reload devices then render
  loadDevices().then(function() {
    _renderDeviceGridInner(body, catInfo);
  });
}

function _renderDeviceGridInner(body, catInfo) {
  body.innerHTML = '';

  var devices = _devicesForCategory(catInfo.id);

  if (devices.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = [
      'display:flex;align-items:center;justify-content:center;height:120px;',
      'font-family:' + T.fb + ';font-size:14px;color:' + T.gold + ';opacity:0.4;',
    ].join('');
    empty.textContent = 'No ' + catInfo.label.toLowerCase() + ' configured';
    body.appendChild(empty);
    return;
  }

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;';

  devices.forEach(function(dev) {
    grid.appendChild(buildDeviceCard(dev, body, catInfo));
  });

  body.appendChild(grid);

  // Operations accordion — renders below grid when a device is selected
  var opsEl = document.createElement('div');
  opsEl.id = 'cfg-device-ops';
  opsEl.style.cssText = 'margin-top:10px;';
  body.appendChild(opsEl);

  if (_selectedDeviceMac) {
    var selectedDev = devices.filter(function(d) { return d.mac === _selectedDeviceMac; })[0];
    if (selectedDev) renderDeviceOps(opsEl, selectedDev, body, catInfo);
  }
}

// == Device Card =======================================

function buildDeviceCard(dev, parentBody, catInfo) {
  var isSelected = _selectedDeviceMac === dev.mac;
  var borderColor = catInfo.borderColor || T.mint;

  var dc = buildDepthCard(borderColor, { chamfer: 8, glow: isSelected });

  dc.card.style.cssText += [
    'padding:10px 12px;',
    'display:flex;flex-direction:column;gap:3px;',
    'cursor:pointer;',
    'user-select:none;-webkit-user-select:none;',
    'min-height:80px;',
  ].join('');

  if (isSelected) {
    dc.card.style.background = borderColor;
  }

  var textColor = isSelected ? T.bgDark : T.mint;
  var subColor = isSelected ? T.bgDark : T.textPrimary;
  var mutedColor = isSelected ? T.bgDark : T.subtleText;

  // Device name
  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + textColor + ';';
  nameEl.textContent = dev.name || 'Unnamed';
  dc.card.appendChild(nameEl);

  // IP
  var ipEl = document.createElement('div');
  ipEl.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + subColor + ';';
  ipEl.textContent = dev.ip || '—';
  dc.card.appendChild(ipEl);

  // MAC
  var macEl = document.createElement('div');
  macEl.style.cssText = 'font-family:' + T.fb + ';font-size:10px;color:' + mutedColor + ';';
  macEl.textContent = 'MAC: ' + _shortenMac(dev.mac);
  dc.card.appendChild(macEl);

  // Status indicator
  var statusEl = document.createElement('div');
  statusEl.style.cssText = 'font-family:' + T.fb + ';font-size:10px;color:' + (isSelected ? T.bgDark : T.lime) + ';margin-top:2px;';
  statusEl.textContent = '\u25CF ONLINE';
  dc.card.appendChild(statusEl);

  dc.card.addEventListener('pointerup', function() {
    if (_selectedDeviceMac === dev.mac) {
      _selectedDeviceMac = null;
    } else {
      _selectedDeviceMac = dev.mac;
    }
    _renderDeviceGridInner(parentBody, catInfo);
  });

  return dc.wrap;
}

// == Device Operations Accordion =======================

function renderDeviceOps(opsEl, dev, parentBody, catInfo) {
  opsEl.innerHTML = '';

  var bar = document.createElement('div');
  bar.style.cssText = [
    'display:flex;gap:8px;padding:8px 0;',
  ].join('');

  // EDIT button
  var editBtn = buildStyledButton({ variant: 'dark', size: 'sm', label: 'EDIT' });
  editBtn.inner.style.color = T.textPrimary;
  editBtn.inner.style.fontSize = '11px';
  editBtn.wrap.style.height = '30px';
  editBtn.wrap.addEventListener('pointerup', function() {
    renderDeviceEditForm(opsEl, dev, parentBody, catInfo);
  });
  bar.appendChild(editBtn.wrap);

  // DELETE button
  var delBtn = buildStyledButton({ variant: 'vermillion', size: 'sm', label: 'DELETE' });
  delBtn.inner.style.fontSize = '11px';
  delBtn.wrap.style.height = '30px';
  delBtn.wrap.addEventListener('pointerup', function() {
    SceneManager.interrupt('confirm-delete-device', {
      onConfirm: function() {
        fetch('/api/v1/hardware/devices/' + encodeURIComponent(dev.mac), { method: 'DELETE' })
          .then(function(r) {
            if (r.ok) {
              _savedDevices = _savedDevices.filter(function(d) { return d.mac !== dev.mac; });
              _selectedDeviceMac = null;
              _renderDeviceGridInner(parentBody, catInfo);
            }
          }).catch(function() {
            console.warn('[KINDpos] Delete device failed');
          });
      },
      onCancel: function() {},
      params: { deviceName: dev.name || dev.mac },
    });
  });
  bar.appendChild(delBtn.wrap);

  // TEST button
  var testBtn = buildStyledButton({ variant: 'dark', size: 'sm', label: 'TEST' });
  testBtn.inner.style.color = T.lime;
  testBtn.inner.style.fontSize = '11px';
  testBtn.wrap.style.height = '30px';
  var testResult = document.createElement('span');
  testResult.style.cssText = 'font-family:' + T.fb + ';font-size:11px;margin-left:8px;';
  testBtn.wrap.addEventListener('pointerup', function() {
    testBtn.inner.textContent = '...';
    var url, payload;
    if (dev.type === 'kitchen' || dev.type === 'receipt') {
      url = '/api/v1/hardware/test-print';
      payload = { ip: dev.ip, port: dev.port || 9100 };
    } else {
      url = '/api/v1/hardware/test-connection';
      payload = { ip: dev.ip, port: dev.port || 8443 };
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function(r) { return r.json(); }).then(function(d) {
      testBtn.inner.textContent = 'TEST';
      testResult.style.color = d.success ? T.lime : T.vermillion;
      testResult.textContent = d.success ? 'OK' : (d.message || 'FAIL');
    }).catch(function() {
      testBtn.inner.textContent = 'TEST';
      testResult.style.color = T.vermillion;
      testResult.textContent = 'ERROR';
    });
  });
  bar.appendChild(testBtn.wrap);
  bar.appendChild(testResult);

  opsEl.appendChild(bar);
}

// == Device Edit Form ==================================

function renderDeviceEditForm(opsEl, dev, parentBody, catInfo) {
  opsEl.innerHTML = '';

  var form = document.createElement('div');
  form.style.cssText = [
    'background:' + T.bg + ';clip-path:' + chamfer(6) + ';',
    'padding:12px;display:flex;flex-direction:column;gap:8px;',
  ].join('');

  var editName = dev.name || '';
  var editType = dev.type || 'receipt';
  var editPort = String(dev.port || 9100);
  var editRegisterId = dev.register_id || '';
  var editTpn = dev.tpn || '';
  var editAuthKey = dev.auth_key || '';
  var editCategories = dev.categories || '';

  // Common fields
  form.appendChild(buildSettingRow('Name', buildTextInput(editName, 'Device name', function(v) { editName = v; })));
  form.appendChild(buildSettingRow('Type', buildPresetButtons([
    { label: 'Kitchen', value: 'kitchen' },
    { label: 'Receipt', value: 'receipt' },
    { label: 'Card Reader', value: 'card_reader' },
  ], editType, function(v) {
    editType = v;
  })));
  form.appendChild(buildSettingRow('Port', buildTextInput(editPort, 'Port', function(v) { editPort = v; })));

  // Card reader fields
  if (editType === 'card_reader') {
    form.appendChild(buildSettingRow('Register ID', buildTextInput(editRegisterId, 'SPIn Register ID', function(v) { editRegisterId = v; })));
    form.appendChild(buildSettingRow('TPN', buildTextInput(editTpn, 'Terminal Processing #', function(v) { editTpn = v; })));
    form.appendChild(buildSettingRow('Auth Key', buildTextInput(editAuthKey, 'Auth key', function(v) { editAuthKey = v; })));
  }

  // Printer-specific: receipt settings
  if (editType === 'kitchen' || editType === 'receipt') {
    if (editType === 'kitchen') {
      form.appendChild(buildSettingRow('Categories', buildTextInput(editCategories, 'e.g. pizza,apps,subs', function(v) { editCategories = v; })));
    }
    if (editType === 'receipt') {
      form.appendChild(buildSettingRow('Chars/Line', buildValueLabel('42')));
      form.appendChild(buildSettingRow('Paper Width', buildPresetButtons([
        { label: '80mm', value: '80' },
        { label: '58mm', value: '58' },
      ], '80', function() {})));
    }
  }

  // Save / Cancel
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:4px;';

  var saveBtn = buildStyledButton({ variant: 'mint', size: 'sm', label: 'SAVE' });
  saveBtn.wrap.style.height = '30px';
  saveBtn.inner.style.fontSize = '11px';
  saveBtn.wrap.addEventListener('pointerup', function() {
    var updated = {
      mac: dev.mac,
      ip: dev.ip,
      type: editType,
      name: editName,
      port: parseInt(editPort) || 9100,
      register_id: editRegisterId,
      tpn: editTpn,
      auth_key: editAuthKey,
      categories: editCategories,
    };
    fetch('/api/v1/hardware/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).then(function(r) {
      if (r.ok) {
        return r.json().then(function(saved) {
          var idx = _savedDevices.findIndex(function(d) { return d.mac === dev.mac; });
          if (idx >= 0) _savedDevices[idx] = saved;
          fetch('/api/v1/payments/reload-devices', { method: 'POST' }).catch(function() {});
          _selectedDeviceMac = null;
          _renderDeviceGridInner(parentBody, catInfo);
        });
      }
    }).catch(function() {
      console.warn('[KINDpos] Device save failed');
    });
  });
  btnRow.appendChild(saveBtn.wrap);

  var cancelBtn = buildStyledButton({ variant: 'dark', size: 'sm', label: 'CANCEL' });
  cancelBtn.inner.style.color = T.textPrimary;
  cancelBtn.inner.style.fontSize = '11px';
  cancelBtn.wrap.style.height = '30px';
  cancelBtn.wrap.addEventListener('pointerup', function() {
    renderDeviceOps(opsEl, dev, parentBody, catInfo);
  });
  btnRow.appendChild(cancelBtn.wrap);

  form.appendChild(btnRow);
  opsEl.appendChild(form);
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

  // Header handled by global #header via setSceneName/setHeaderBack

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

    // Load saved devices for hardware tab
    loadDevices();
  },

  unmount: function() {
    if (_clockIv) { clearInterval(_clockIv); _clockIv = null; }
    if (_scanEventSource) { _scanEventSource.close(); _scanEventSource = null; }
    _rootEl = null;
    _contentEl = null;
    _tabBtns = {};
    _activeTab = 'terminal';
    _expandedCard = null;
    _savedDevices = [];
    _scanResults = [];
    _scanning = false;
    _scanGen++;
    _scrollPositions = {};
    _selectedDeviceMac = null;
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
