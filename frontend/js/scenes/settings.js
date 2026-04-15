// =======================================================
//  KINDpos Terminal — Hardware Configuration Scene
//  Single-page device manager: Kitchen Printers, Receipt Printers,
//  Card Readers, Scan Network
//  Nice. Dependable. Yours.
// =======================================================

import { defineScene } from '../scene-manager-2.js';
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

var _contentEl = null;
var _rootEl = null;
var _savedDevices = [];
var _scanResults = [];
var _scanning = false;
var _expandedCard = null;
var _scrollPositions = {};
var _scanEventSource = null;
var _scanGen = 0;
var _selectedDeviceMac = null;

// == Device Categories =================================

var DEVICE_CATEGORIES = [
  { id: 'kitchen-printers', label: 'KITCHEN\nPRINTERS' },
  { id: 'receipt-printers', label: 'RECEIPT\nPRINTERS' },
  { id: 'card-readers',     label: 'CARD\nREADERS' },
];

// == Content Rendering =================================

function renderContent() {
  if (!_contentEl) return;
  _contentEl.innerHTML = '';

  if (_expandedCard) {
    renderDrillDown(_contentEl, _expandedCard);
    return;
  }

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:12px;height:100%;box-sizing:border-box;';

  DEVICE_CATEGORIES.forEach(function(cat) {
    grid.appendChild(buildCategoryCard(cat, T.gold));
  });
  grid.appendChild(buildScanNetworkCard());

  _contentEl.appendChild(grid);
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
    'display:grid;grid-template-columns:1fr 1fr;gap:8px;',
    'width:100%;overflow-y:auto;scrollbar-width:none;',
    'max-height:calc(100% - 60px);align-content:start;',
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
  var isSaved = !!dev.saved_name;
  var borderColor = isSaved ? T.green : T.gold;
  var dc = buildDepthCard(borderColor, { chamfer: 8, glow: false });

  dc.card.style.cssText += [
    'padding:10px 12px;',
    'display:flex;flex-direction:column;gap:3px;',
    'min-height:70px;',
  ].join('');

  // Device name
  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-family:' + T.fh + ';font-size:18px;color:' + (isSaved ? T.green : T.gold) + ';';
  nameEl.textContent = dev.saved_name || dev.name || dev.type || 'Unknown Device';
  dc.card.appendChild(nameEl);

  // IP
  var ipEl = document.createElement('div');
  ipEl.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.textPrimary + ';';
  ipEl.textContent = dev.ip;
  dc.card.appendChild(ipEl);

  // MAC
  var macEl = document.createElement('div');
  macEl.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.subtleText + ';';
  macEl.textContent = 'MAC: ' + (dev.mac || '—');
  dc.card.appendChild(macEl);

  // Status / action
  if (isSaved) {
    var confLabel = document.createElement('div');
    confLabel.style.cssText = 'font-family:' + T.fb + ';font-size:11px;color:' + T.green + ';margin-top:2px;';
    confLabel.textContent = '\u2713 CONFIGURED';
    dc.card.appendChild(confLabel);
  } else {
    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'display:flex;gap:6px;margin-top:4px;';

    var saveBtn = buildStyledButton({ variant: 'mint', size: 'sm', label: 'SAVE' });
    saveBtn.wrap.style.height = '28px';
    saveBtn.wrap.style.minWidth = '60px';
    saveBtn.inner.style.fontSize = '11px';
    saveBtn.wrap.addEventListener('pointerup', function() {
      saveDiscoveredDevice(dev).then(function(ok) {
        if (ok) {
          btnArea.innerHTML = '';
          var done = document.createElement('div');
          done.style.cssText = 'font-family:' + T.fb + ';font-size:11px;color:' + T.green + ';';
          done.textContent = '\u2713 SAVED';
          btnArea.appendChild(done);
          // Update border to green
          dc.card.style.borderTopColor = _lightenHex(T.green, 0.2);
          dc.card.style.borderLeftColor = _lightenHex(T.green, 0.2);
          dc.card.style.borderBottomColor = _darkenHex(T.green, 0.3);
          dc.card.style.borderRightColor = _darkenHex(T.green, 0.3);
        }
      });
    });
    btnArea.appendChild(saveBtn.wrap);

    dc.card.appendChild(btnArea);
  }

  return dc.wrap;
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
    _expandedCard = { id: cat.id, label: cat.label, borderColor: borderColor };
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
  'kitchen-printers': renderDeviceGrid,
  'receipt-printers': renderDeviceGrid,
  'card-readers':     renderDeviceGrid,
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


// == HARDWARE: Device Grid =============================

var _selectedDeviceMac = null;

var _deviceTypeMap = {
  'kitchen-printers': ['kitchen'],
  'receipt-printers': ['receipt', 'printer'],
  'card-readers':     ['card_reader'],
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
  statusEl.style.cssText = 'font-family:' + T.fb + ';font-size:10px;color:' + (isSelected ? T.bgDark : T.green) + ';margin-top:2px;';
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
  testBtn.inner.style.color = T.green;
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
      payload = { ip: dev.ip, port: dev.port || 9000 };
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function(r) { return r.json(); }).then(function(d) {
      testBtn.inner.textContent = 'TEST';
      testResult.style.color = d.success ? T.green : T.vermillion;
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

// == Scene (SM2) =======================================

defineScene({
  name: 'settings',

  state: {},

  render: function(container) {
    _rootEl = container;
    _contentEl = null;
    _expandedCard = null;
    _savedDevices = [];
    _scanResults = [];
    _scanning = false;
    _selectedDeviceMac = null;

    setSceneName('Hardware');
    setHeaderBack({
      x: true,
      onClose: function() { SceneManager.closeTransactional('settings'); },
    });

    container.style.cssText = [
      'display:flex;flex-direction:column;',
      'width:100%;height:100%;',
      'background:' + T.bg + ';',
      'box-sizing:border-box;',
      'overflow:hidden;',
    ].join('');

    _contentEl = document.createElement('div');
    _contentEl.style.cssText = [
      'flex:1;min-height:0;',
      'overflow:hidden;',
      'padding:12px 16px;',
      'box-sizing:border-box;',
    ].join('');
    container.appendChild(_contentEl);

    renderContent();
    loadDevices();
  },

  unmount: function() {
    if (_scanEventSource) { _scanEventSource.close(); _scanEventSource = null; }
    _rootEl = null;
    _contentEl = null;
    _expandedCard = null;
    _savedDevices = [];
    _scanResults = [];
    _scanning = false;
    _scanGen++;
    _scrollPositions = {};
    _selectedDeviceMac = null;
  },

  interrupts: {
    'confirm-delete-device': {
      render: function(container, params) {
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
    },
  },
});
