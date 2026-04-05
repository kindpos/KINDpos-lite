// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Settings Scene (Configuration)
//  Two-card dashboard (reporting theme) with drill-down
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle, shadowColor } from '../tokens.js';
import { buildButton } from '../components.js';
import { registerScene, pop } from '../scene-manager.js';
import { showKeyboard } from '../keyboard.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── API ───────────────────────────────────────────
var API = '/api/v1';

// ── Layout ────────────────────────────────────────
var PAD      = 12;
var BORDER_W = 4;
var NAV_W    = 160;

var GOLD = T.gold;
var MINT = T.mint;
var DARK = T.bgDark;
var BG   = T.darkBtn;

// ── State ─────────────────────────────────────────
var state = {
  activeTab:    'hardware',
  activeNav:    'add',
  savedDevices: [],
  scanResults:  [],
  scanning:     false,
  addStep:      'choose',
  foundDevice:  null,
  expandedCard: null,   // null = collapsed dashboard, 'hardware' or 'terminal'
  eventSource:  null,   // active EventSource — prevent double-open
  terminalId:   'T-001',
  terminalName: 'KIND BBQ',
  softwareVer:  'Vz1.0',
  ipAddress:    '—',
  wifiSSID:     '—',
  taxRate:      '7.0',
  cashDiscount: '4.0',
};

var rootEl = null;

var HW_NAVS = [
  { id: 'readers',  label: 'Card Readers'   },
  { id: 'printers', label: 'Printers'       },
];

var TERM_NAVS = [
  { id: 'identity', label: 'Identity' },
  { id: 'network',  label: 'Network'  },
  { id: 'business', label: 'Business' },
];

// ═══════════════════════════════════════════════════
//  REGISTRATION
// ═══════════════════════════════════════════════════

registerScene('settings', {
  cache: false,
  canExit: function() {
    if (state.expandedCard) {
      state.expandedCard = null;
      renderCurrentState();
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  },
  onEnter: function(el) {
    rootEl = el;
    state.expandedCard = null;
    state.activeTab   = 'hardware';
    state.activeNav   = 'printers';
    state.addStep     = 'choose';
    state.foundDevice = null;
    state.scanResults = [];
    state.scanning    = false;

    setSceneName('Configuration');
    setHeaderBack({ x: true });

    el.style.cssText = 'width:100%;height:100%;position:relative;background:' + T.bg + ';';

    loadSavedDevices().then(function() { renderCurrentState(); });
  },
  onExit: function() {
    if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }
    rootEl = null;
  },
});

// ═══════════════════════════════════════════════════
//  DATA LAYER
// ═══════════════════════════════════════════════════

async function loadSavedDevices() {
  try {
    var res = await fetch(API + '/hardware/devices');
    if (res.ok) state.savedDevices = await res.json();
  } catch (e) { state.savedDevices = []; }
}

async function saveDevice(device) {
  try {
    var res = await fetch(API + '/hardware/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
    if (res.ok) {
      var saved = await res.json();
      var idx = state.savedDevices.findIndex(function(d) { return d.mac === device.mac; });
      if (idx >= 0) state.savedDevices[idx] = saved;
      else state.savedDevices.push(saved);
      // Hot-reload payment + printer managers so new devices are live immediately
      fetch(API + '/payments/reload-devices', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(d) { console.log('[KINDpos] Devices reloaded:', d); })
        .catch(function() {});
      return true;
    }
  } catch (e) {}
  return false;
}

async function deleteDevice(mac) {
  try {
    var res = await fetch(API + '/hardware/devices/' + encodeURIComponent(mac), { method: 'DELETE' });
    if (res.ok) { state.savedDevices = state.savedDevices.filter(function(d) { return d.mac !== mac; }); return true; }
  } catch (e) {}
  return false;
}

async function scanNetwork(targetIp) {
  var url = API + '/hardware/scan';
  if (targetIp) url += '?ip=' + encodeURIComponent(targetIp);
  var res = await fetch(url);
  if (!res.ok) throw new Error('Scan failed');
  return await res.json();
}

// ═══════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════

function renderCurrentState() {
  if (!rootEl) return;
  if (state.expandedCard) {
    buildExpandedView(rootEl);
  } else {
    setSceneName('Configuration');
    buildCollapsedView(rootEl);
  }
}

// ═══════════════════════════════════════════════════
//  COLLAPSED DASHBOARD (two-card view)
// ═══════════════════════════════════════════════════

function buildCardWrap(cardInner) {
  var btn = buildStyledButton(T.mint);
  btn.inner.style.padding = '0';
  btn.inner.appendChild(cardInner);
  btn.wrap.style.flex = '1';
  btn.wrap.style.maxHeight = '85%';
  btn.wrap.style.maxWidth = '46%';
  btn.wrap.style.height = '100%';
  // Thicker bevel for main cards
  var thick = 10;
  var edges = btn.wrap._edges;
  btn.inner.style.borderTopWidth = thick + 'px';
  btn.inner.style.borderLeftWidth = thick + 'px';
  btn.inner.style.borderBottomWidth = thick + 'px';
  btn.inner.style.borderRightWidth = thick + 'px';
  var shadow = shadowColor(T.mint);
  btn.wrap.style.filter = 'drop-shadow(6px 8px 2px ' + shadow + ')';
  btn.wrap._shadow = shadow;
  return btn.wrap;
}

function buildHardwareCard() {
  var card = document.createElement('div');
  card.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;background:' + T.bgDark + ';user-select:none;-webkit-user-select:none;padding:16px 20px;box-sizing:border-box;overflow:hidden;';

  var title = document.createElement('div');
  title.style.cssText = 'font-family:' + T.fh + ';font-size:60px;font-weight:bold;font-style:italic;color:' + T.gold + ';margin-bottom:6px;text-align:center;';
  title.textContent = 'HARDWARE';
  card.appendChild(title);

  var printerCount = state.savedDevices.filter(function(d) { return d.type === 'kitchen' || d.type === 'receipt'; }).length;
  var readerCount = state.savedDevices.filter(function(d) { return d.type === 'card_reader'; }).length;
  var otherCount = state.savedDevices.length - printerCount - readerCount;

  var items = [
    { label: 'Printers',     count: printerCount, nav: 'printers' },
    { label: 'Card Readers', count: readerCount,  nav: 'readers'  },
    { label: 'Peripherals',  count: otherCount,   nav: null       },
  ];

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:4px;align-items:center;';

  items.forEach(function(item) {
    var btn = buildStyledButton(BG);
    btn.inner.style.fontFamily = T.fb;
    btn.inner.style.fontSize = '40px';
    btn.inner.style.color = T.mint;
    btn.inner.style.padding = '8px 12px';
    btn.inner.style.justifyContent = 'space-between';
    btn.inner.innerHTML = item.label + ' <span style="color:' + T.gold + '">' + item.count + '</span>';
    btn.wrap.style.width = '85%';
    if (item.nav) {
      btn.wrap.style.cursor = 'pointer';
      btn.wrap.addEventListener('pointerup', function(e) {
        e.stopPropagation();
        state.expandedCard = 'hardware';
        state.activeTab = 'hardware';
        state.activeNav = item.nav;
        renderCurrentState();
      });
    }
    btns.appendChild(btn.wrap);
  });

  card.appendChild(btns);

  // Scan Network button at bottom
  var scanBtn = buildStyledButton(GOLD);
  scanBtn.inner.style.fontFamily = T.fh;
  scanBtn.inner.style.fontSize = '28px';
  scanBtn.inner.style.color = DARK;
  scanBtn.inner.style.padding = '8px 12px';
  scanBtn.inner.textContent = '//Scan Network//';
  scanBtn.wrap.style.cssText = 'width:85%;margin-top:auto;cursor:pointer;align-self:center;';
  scanBtn.wrap.addEventListener('pointerup', function(e) {
    e.stopPropagation();
    state.expandedCard = 'hardware';
    state.activeTab = 'hardware';
    state.activeNav = 'add';
    state.addStep = 'choose';
    renderCurrentState();
  });
  card.appendChild(scanBtn.wrap);

  return card;
}

function buildTerminalCard() {
  var card = document.createElement('div');
  card.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;background:' + T.bgDark + ';user-select:none;-webkit-user-select:none;padding:16px 20px;box-sizing:border-box;overflow:hidden;';

  var title = document.createElement('div');
  title.style.cssText = 'font-family:' + T.fh + ';font-size:60px;font-weight:bold;font-style:italic;color:' + T.mint + ';margin-bottom:6px;text-align:center;';
  title.textContent = 'TERMINAL';
  card.appendChild(title);

  var items = [
    { label: 'Identity', value: state.terminalName, nav: 'identity' },
    { label: 'Network',  value: state.ipAddress,    nav: 'network'  },
    { label: 'Business', value: state.taxRate + '%', nav: 'business' },
  ];

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:4px;align-items:center;';

  items.forEach(function(item) {
    var btn = buildStyledButton(BG);
    btn.inner.style.fontFamily = T.fb;
    btn.inner.style.fontSize = '40px';
    btn.inner.style.color = T.mint;
    btn.inner.style.padding = '8px 12px';
    btn.inner.style.justifyContent = 'space-between';
    btn.inner.innerHTML = item.label + ' <span style="color:' + T.cyan + '">' + item.value + '</span>';
    btn.wrap.style.width = '85%';
    btn.wrap.style.cursor = 'pointer';
    btn.wrap.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      state.expandedCard = 'terminal';
      state.activeTab = 'terminal';
      state.activeNav = item.nav;
      renderCurrentState();
    });
    btns.appendChild(btn.wrap);
  });

  card.appendChild(btns);
  return card;
}

function buildCollapsedView(el) {
  el.innerHTML = '';
  el.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;box-sizing:border-box;padding:20px;gap:20px;';

  var leftCard = buildHardwareCard();
  var rightCard = buildTerminalCard();

  var leftWrap = buildCardWrap(leftCard);
  var rightWrap = buildCardWrap(rightCard);

  el.appendChild(leftWrap);
  el.appendChild(rightWrap);
}

// ═══════════════════════════════════════════════════
//  EXPANDED VIEW (full-width frame with nav + content)
// ═══════════════════════════════════════════════════

function buildExpandedView(el) {
  el.innerHTML = '';
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:' + PAD + 'px;';

  var isHW = state.expandedCard === 'hardware';

  var frame = document.createElement('div');
  frame.style.cssText = 'flex:1;display:flex;min-height:0;background:' + BG + ';border:' + BORDER_W + 'px solid ' + T.mint + ';box-sizing:border-box;overflow:hidden;';

  if (isHW) {
    var navStrip = buildNavStrip(HW_NAVS, GOLD);
    frame.appendChild(navStrip);

    var content = document.createElement('div');
    content.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;background:' + BG + ';';
    renderHWContent(content);
    frame.appendChild(content);
  } else {
    var content = document.createElement('div');
    content.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;background:' + BG + ';';
    renderTermContent(content);
    frame.appendChild(content);

    var navStrip = buildNavStrip(TERM_NAVS, MINT);
    frame.appendChild(navStrip);
  }

  el.appendChild(frame);
}

function buildNavStrip(navItems, accentColor) {
  var strip = document.createElement('div');
  strip.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:12px;flex-shrink:0;width:' + NAV_W + 'px;';

  navItems.forEach(function(nav) {
    var isActive = state.activeNav === nav.id;
    var btn = buildStyledButton(isActive ? accentColor : BG);
    btn.wrap.style.width = '100%';
    btn.inner.style.fontFamily = T.fb;
    btn.inner.style.fontSize = T.fsBtn;
    btn.inner.style.fontWeight = 'bold';
    btn.inner.style.color = isActive ? DARK : accentColor;
    btn.inner.style.padding = '10px 8px';
    btn.inner.style.textAlign = 'center';
    btn.inner.textContent = nav.label;
    btn.wrap.style.cursor = 'pointer';
    btn.wrap.addEventListener('pointerup', function() {
      state.activeNav = nav.id;
      renderCurrentState();
    });
    strip.appendChild(btn.wrap);
  });

  return strip;
}

// ═══════════════════════════════════════════════════
//  HARDWARE CONTENT
// ═══════════════════════════════════════════════════

function renderHWContent(card) {
  card.innerHTML = '';  // always clear before render
  if (state.activeNav === 'add')            renderAddDevice(card);
  else if (state.activeNav === 'printers') renderDeviceList(card, 'printer');
  else if (state.activeNav === 'readers')  renderDeviceList(card, 'card_reader');
}

// ── Add Device flow ───────────────────────────────

function renderAddDevice(card) {
  if      (state.addStep === 'choose')   renderAddChoose(card);
  else if (state.addStep === 'scanning') renderScanning(card);
  else if (state.addStep === 'enter-ip') renderEnterIP(card);
  else if (state.addStep === 'results')  renderScanResults(card);
  else if (state.addStep === 'confirm')  renderConfirmDevice(card);
}

function renderAddChoose(card) {
  var wrap = centeredWrap(card);
  var title = makeLabel('Add Device', GOLD, '28px');
  title.style.marginBottom = '24px';
  wrap.appendChild(title);

  wrap.appendChild(buildButton('Scan Network', {
    fill: GOLD, color: DARK, fontSize: T.fsSmall, width: 280, height: 60,
    onTap: function() {
      state.addStep = 'scanning';
      state.scanResults = [];
      doScan(null, card);
    },
  }));
  wrap.appendChild(buildButton('Enter IP Address', {
    fill: BG, color: GOLD, fontSize: T.fsSmall, width: 280, height: 60,
    onTap: function() { state.addStep = 'enter-ip'; renderHWContent(card); },
  }));
}

function renderScanning(card) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;padding:12px;box-sizing:border-box;gap:8px;';
  card.appendChild(wrap);

  // Live results list — fills available space
  var liveList = document.createElement('div');
  liveList.id = 'scan-live-list';
  liveList.style.cssText = 'display:flex;flex-direction:column;gap:6px;overflow-y:auto;flex:1;';
  wrap.appendChild(liveList);

  // Bottom status bar — centered
  var bottom = document.createElement('div');
  bottom.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;flex-shrink:0;padding:12px 0 4px;';

  // Spinner + label row
  var statusRow = document.createElement('div');
  statusRow.style.cssText = 'display:flex;align-items:center;gap:12px;';

  var spinner = document.createElement('div');
  spinner.style.cssText = 'font-family:' + T.fb + ';font-size:40px;color:' + GOLD + ';display:inline-block;flex-shrink:0;';
  spinner.textContent = '◈';
  var angle = 0;
  var anim = setInterval(function() {
    if (!spinner.isConnected) { clearInterval(anim); return; }
    angle += 30; spinner.style.transform = 'rotate(' + angle + 'deg)';
  }, 100);

  var statusCol = document.createElement('div');
  var scanLbl = makeLabel('Scanning network...', GOLD, T.fsSmall);
  var subLbl   = makeLabel('Probing 254 hosts on ports 9100 · 443 · 8080', T.subtleText, T.fsSmall);
  statusCol.appendChild(scanLbl);
  statusCol.appendChild(subLbl);

  statusRow.appendChild(spinner);
  statusRow.appendChild(statusCol);
  bottom.appendChild(statusRow);

  // Enter IP shortcut — larger
  var shortcut = buildButton('Know the IP? Enter it directly →', {
    fill: BG, color: GOLD, fontSize: T.fsBtn, height: 44, width: 380,
    onTap: function() {
      if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }
      state.addStep = 'enter-ip';
      renderHWContent(card);
    },
  });
  bottom.appendChild(shortcut);
  wrap.appendChild(bottom);
}

function renderEnterIP(card) {
  var inner = cardInner(card);
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.gap = '10px';
  inner.style.padding = '16px';

  var title = makeLabel('Enter IP Address', GOLD, T.fsSmall);
  inner.appendChild(title);

  // IP prefix + octet display in one row
  var ipRow = document.createElement('div');
  ipRow.style.cssText = 'display:flex;align-items:center;gap:8px;';

  var prefix = makeLabel('10 . 0 . 0 .', GOLD, T.fsSmall);
  prefix.style.letterSpacing = '3px';
  ipRow.appendChild(prefix);

  var octetDisplay = document.createElement('div');
  octetDisplay.style.cssText = [
    'width:90px;height:48px;',
    'background:' + DARK + ';',
    'display:flex;align-items:center;justify-content:center;',
    'font-family:' + T.fb + ';font-size:40px;color:' + GOLD + ';',
  ].join('');
  applySunkenStyle(octetDisplay);
  octetDisplay.textContent = '—';
  ipRow.appendChild(octetDisplay);
  inner.appendChild(ipRow);

  // Compact numpad grid
  var digits = '';
  var padGrid = document.createElement('div');
  padGrid.style.cssText = [
    'display:grid;',
    'grid-template-columns:repeat(3,72px);',
    'grid-template-rows:repeat(4,56px);',
    'gap:6px;',
  ].join('');

  var layout = [
    {l:'1',t:'digit'},{l:'2',t:'digit'},{l:'3',t:'digit'},
    {l:'4',t:'digit'},{l:'5',t:'digit'},{l:'6',t:'digit'},
    {l:'7',t:'digit'},{l:'8',t:'digit'},{l:'9',t:'digit'},
    {l:'clr',t:'clear'},{l:'0',t:'digit'},{l:'>>>',t:'submit'},
  ];

  layout.forEach(function(key) {
    var fill = key.t === 'clear' ? T.red : key.t === 'submit' ? T.goGreen : BG;
    var color = key.t === 'digit' ? MINT : '#fff';

    var pair = buildStyledButton(fill);
    pair.wrap.style.width = '72px';
    pair.wrap.style.height = '56px';
    pair.inner.style.fontFamily = T.fb;
    pair.inner.style.fontSize = key.t === 'digit' ? '26px' : T.fsBtn;
    pair.inner.style.color = color;
    pair.inner.textContent = key.l;

    pair.wrap.addEventListener('pointerup', function() {
      if (key.t === 'digit') {
        if (digits.length < 3) {
          digits += key.l;
          octetDisplay.textContent = digits;
        }
      } else if (key.t === 'clear') {
        digits = '';
        octetDisplay.textContent = '—';
      } else if (key.t === 'submit') {
        var oct = parseInt(digits, 10);
        if (isNaN(oct) || oct < 0 || oct > 255) return;
        var targetIp = '10.0.0.' + oct;
        state.addStep = 'scanning';
        state.scanResults = [];
        doScanIP(targetIp, card);
      }
    });

    padGrid.appendChild(pair.wrap);
  });
  inner.appendChild(padGrid);

  inner.appendChild(buildButton('CANCEL', {
    fill: BG, color: GOLD, fontSize: T.fsBtn, width: 200, height: 36,
    onTap: function() { state.addStep = 'choose'; renderHWContent(card); },
  }));
}

function doScan(targetIp, card) {
  // Kill any existing scan — stops auto-reconnect
  if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }

  state.scanResults = [];
  renderHWContent(card);  // Show scanning UI
  var liveList = card.querySelector('#scan-live-list');

  var url = API + '/hardware/scan/stream';
  if (targetIp) url += '?ip=' + encodeURIComponent(targetIp);

  var es = new EventSource(url);
  state.eventSource = es;

  es.onmessage = function(evt) {
    try {
      var data = JSON.parse(evt.data);

      if (data.type === 'start') {
        // scan started

      } else if (data.type === 'device') {
        state.scanResults.push(data);
        var currentList = card.querySelector('#scan-live-list');
        if (currentList && currentList.isConnected) {
          currentList.appendChild(buildLiveDeviceRow(data, card));
        }

      } else if (data.type === 'complete') {
        es.close(); state.eventSource = null;
        state.addStep = 'results';
        if (rootEl) renderHWContent(card);

      } else if (data.type === 'error') {
        es.close(); state.eventSource = null;
        state.addStep = 'results';
        if (rootEl) renderHWContent(card);
      }
    } catch (e) { console.warn('[SCAN] parse error:', e); }
  };

  es.onerror = function() {
    if (state.eventSource !== es) return;  // Already closed intentionally
    console.warn('[SCAN] connection error');
    es.close(); state.eventSource = null;
    state.addStep = 'results';
    if (rootEl) renderHWContent(card);
  };
}

// Single-IP targeted scan — falls back to manual add if not found
function doScanIP(targetIp, card) {
  if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }

  renderHWContent(card);  // Show scanning UI
  var liveList = card.querySelector('#scan-live-list');

  var url = API + '/hardware/scan/stream?ip=' + encodeURIComponent(targetIp);
  var es = new EventSource(url);
  state.eventSource = es;
  var found = false;

  es.onmessage = function(evt) {
    try {
      var data = JSON.parse(evt.data);
      if (data.type === 'device') {
        found = true;
        state.scanResults.push(data);
        state.foundDevice = Object.assign({}, data);
        es.close(); state.eventSource = null;
        state.addStep = 'confirm';
        if (rootEl) renderHWContent(card);

      } else if (data.type === 'complete') {
        es.close(); state.eventSource = null;
        if (!found) {
          // Device didn't respond — offer manual add
          renderManualAdd(targetIp, card);
        }
      }
    } catch (e) {}
  };

  es.onerror = function() {
    if (state.eventSource !== es) return;
    es.close(); state.eventSource = null;
    if (!found) renderManualAdd(targetIp, card);
  };
}

function renderManualAdd(ip, card) {
  // Clear card and show manual add form
  card.innerHTML = '';
  var inner = cardInner(card);

  var hdr = makeLabel('Device Not Responding', T.red, '28px');
  hdr.style.padding = '16px 20px 4px';
  hdr.style.fontWeight = 'bold';
  inner.appendChild(hdr);

  var sub = makeLabel(ip + ' did not respond on known ports. Add manually?', T.mint, T.fsSmall);
  sub.style.padding = '4px 20px 16px';
  inner.appendChild(sub);

  var form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:0 20px;flex:1;';

  // Type selector
  form.appendChild(makeLabel('Device Type', GOLD, T.fsSmall));
  var typeRow = document.createElement('div');
  typeRow.style.cssText = 'display:flex;gap:8px;';
  var TYPES = [
    { id: 'kitchen',     label: 'Kitchen Printer' },
    { id: 'receipt',     label: 'Receipt Printer' },
    { id: 'card_reader', label: 'Card Reader'     },
  ];
  var selectedType = 'kitchen';
  var typeBtnEls = {};

  function refreshTypeBtns() {
    TYPES.forEach(function(t) {
      var b = typeBtnEls[t.id] && typeBtnEls[t.id].querySelector('div');
      if (b) { b.style.background = selectedType === t.id ? GOLD : BG; b.style.color = selectedType === t.id ? DARK : GOLD; }
    });
  }

  TYPES.forEach(function(t) {
    var btn = buildButton(t.label, {
      fill: selectedType === t.id ? GOLD : BG,
      color: selectedType === t.id ? DARK : GOLD,
      fontSize: T.fsBtn, height: 44,
      onTap: function() { selectedType = t.id; refreshTypeBtns(); },
    });
    typeBtnEls[t.id] = btn;
    typeRow.appendChild(btn);
  });
  form.appendChild(typeRow);

  form.appendChild(makeLabel('Device Name', GOLD, T.fsSmall));
  var nameDisplay = document.createElement('div');
  nameDisplay.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:40px;color:' + MINT + ';clip-path:' + chamfer(5) + ';';
  applySunkenStyle(nameDisplay);
  var deviceName = '';
  nameDisplay.textContent = '—';
  form.appendChild(nameDisplay);

  var presetRow = document.createElement('div');
  presetRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  ['Kitchen', 'Receipt', 'Bar Kitchen', 'Card Reader'].forEach(function(p) {
    presetRow.appendChild(buildButton(p, {
      fill: BG, color: GOLD, fontSize: T.fsBtn, height: 40,
      onTap: function() { deviceName = p; nameDisplay.textContent = p; },
    }));
  });
  form.appendChild(presetRow);

  // Register ID field (card readers only)
  var regIdLabel = makeLabel('SPIn Register ID', GOLD, T.fsSmall);
  var regIdDisplay = document.createElement('div');
  regIdDisplay.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:40px;color:' + MINT + ';clip-path:' + chamfer(5) + ';cursor:pointer;';
  applySunkenStyle(regIdDisplay);
  var registerId = '';
  regIdDisplay.textContent = 'Tap to enter';
  regIdDisplay.addEventListener('pointerup', function() {
    showKeyboard({
      placeholder: 'SPIn Register ID',
      initialValue: registerId,
      maxLength: 20,
      onDone: function(val) { registerId = val; regIdDisplay.textContent = val || 'Tap to enter'; },
      dismissOnDone: true,
    });
  });
  form.appendChild(regIdLabel);
  form.appendChild(regIdDisplay);

  // TPN field (card readers only)
  var tpnLabel = makeLabel('SPIn TPN', GOLD, T.fsSmall);
  var tpnDisplay = document.createElement('div');
  tpnDisplay.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:40px;color:' + MINT + ';clip-path:' + chamfer(5) + ';cursor:pointer;';
  applySunkenStyle(tpnDisplay);
  var tpnVal = '';
  tpnDisplay.textContent = 'Tap to enter';
  tpnDisplay.addEventListener('pointerup', function() {
    showKeyboard({
      placeholder: 'Terminal Processing Number',
      initialValue: tpnVal,
      maxLength: 20,
      onDone: function(val) { tpnVal = val; tpnDisplay.textContent = val || 'Tap to enter'; },
      dismissOnDone: true,
    });
  });
  form.appendChild(tpnLabel);
  form.appendChild(tpnDisplay);

  // AuthKey field (card readers only)
  var authLabel = makeLabel('SPIn Auth Key', GOLD, T.fsSmall);
  var authDisplay = document.createElement('div');
  authDisplay.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:40px;color:' + MINT + ';clip-path:' + chamfer(5) + ';cursor:pointer;';
  applySunkenStyle(authDisplay);
  var authVal = '';
  authDisplay.textContent = 'Tap to enter';
  authDisplay.addEventListener('pointerup', function() {
    showKeyboard({
      placeholder: 'SPIn Auth Key',
      initialValue: authVal,
      maxLength: 30,
      onDone: function(val) { authVal = val; authDisplay.textContent = val || 'Tap to enter'; },
      dismissOnDone: true,
    });
  });
  form.appendChild(authLabel);
  form.appendChild(authDisplay);

  // Show/hide SPIn fields based on type selection
  function refreshRegIdVisibility() {
    var show = selectedType === 'card_reader';
    regIdLabel.style.display = show ? '' : 'none';
    regIdDisplay.style.display = show ? '' : 'none';
    tpnLabel.style.display = show ? '' : 'none';
    tpnDisplay.style.display = show ? '' : 'none';
    authLabel.style.display = show ? '' : 'none';
    authDisplay.style.display = show ? '' : 'none';
  }
  // Patch type button taps to also toggle register ID visibility
  var origRefresh = refreshTypeBtns;
  refreshTypeBtns = function() { origRefresh(); refreshRegIdVisibility(); };
  refreshRegIdVisibility();

  inner.appendChild(form);

  var footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;padding:12px 20px;flex-shrink:0;';

  footer.appendChild(buildButton('//ADD ANYWAY//', {
    fill: GOLD, color: DARK, fontSize: T.fsBtn, height: 48,
    onTap: async function() {
      await saveDevice({
        mac:  'MANUAL-' + ip.replace(/\./g, '-'),
        ip:   ip,
        type: selectedType,
        name: deviceName || selectedType,
        port: selectedType === 'card_reader' ? 9000 : 9100,
        register_id: selectedType === 'card_reader' ? registerId : '',
        tpn: selectedType === 'card_reader' ? tpnVal : '',
        auth_key: selectedType === 'card_reader' ? authVal : '',
      });
      state.addStep = 'choose';
      renderCurrentState();
    },
  }));

  footer.appendChild(buildButton('Try Again', {
    fill: BG, color: GOLD, fontSize: T.fsBtn, height: 48,
    onTap: function() { state.addStep = 'enter-ip'; renderHWContent(card); },
  }));

  inner.appendChild(footer);
}

function buildLiveDeviceRow(dev, card) {
  var saved = state.savedDevices.some(function(d) { return d.mac === dev.mac; });
  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex;align-items:center;justify-content:space-between;',
    'padding:8px 12px;',
    'background:' + DARK + ';',
    'border:2px solid ' + (saved ? GOLD : T.border) + ';',
    'clip-path:' + chamfer(5) + ';',
    'animation:fadeIn 0.2s ease;',
  ].join('');

  // Inject keyframe once
  if (!document.getElementById('fade-style')) {
    var s = document.createElement('style');
    s.id = 'fade-style';
    s.textContent = '@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}';
    document.head.appendChild(s);
  }

  var info = document.createElement('div');
  info.appendChild(makeLabel(dev.name || guessName(dev), GOLD, T.fsSmall));
  info.appendChild(makeLabel(dev.ip + '  ·  ' + shortenMac(dev.mac), T.bgLight, T.fsSmall));
  row.appendChild(info);

  if (saved) {
    row.appendChild(makeLabel('Saved ✓', GOLD, T.fsSmall));
  } else {
    // We keep a reference to card via closure — but card may have been replaced.
    // Use a dataset attribute so the confirm step can find the device.
    var addBtn = buildButton('+ Add', {
      fill: GOLD, color: DARK, fontSize: T.fsBtn, width: 76, height: 32,
      onTap: function() {
        state.foundDevice = Object.assign({}, dev);
        state.addStep = 'confirm';
        if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }
        renderHWContent(card);
      },
    });
    row.appendChild(addBtn);
  }
  return row;
}

function renderScanResults(card) {
  var inner = cardInner(card);
  var hdr = makeLabel(
    state.scanResults.length === 0 ? 'No devices found' : state.scanResults.length + ' device' + (state.scanResults.length > 1 ? 's' : '') + ' found',
    GOLD, T.fsSmall
  );
  hdr.style.padding = '16px 20px 8px';
  inner.appendChild(hdr);

  var list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:8px 16px;overflow-y:auto;flex:1;';

  if (state.scanResults.length === 0) {
    var empty = makeLabel('No devices responded on ports 9100, 443, 8080.', T.subtleText, T.fsSmall);
    empty.style.padding = '8px 0';
    list.appendChild(empty);
    var tip = makeLabel('Try "Enter IP" to probe a specific address directly.', T.subtleText, T.fsSmall);
    tip.style.opacity = '0.6';
    list.appendChild(tip);
  }

  state.scanResults.forEach(function(dev) {
    var saved = state.savedDevices.some(function(d) { return d.mac === dev.mac; });
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:' + DARK + ';border:2px solid ' + (saved ? GOLD : T.border) + ';clip-path:' + chamfer(5) + ';';

    var info = document.createElement('div');
    info.appendChild(makeLabel(dev.name || guessName(dev), GOLD, T.fsSmall));
    info.appendChild(makeLabel(dev.ip + '  ·  ' + shortenMac(dev.mac), T.bgLight, T.fsSmall));
    row.appendChild(info);

    if (saved) {
      row.appendChild(makeLabel('Saved ✓', GOLD, T.fsSmall));
    } else {
      row.appendChild(buildButton('+ Add', {
        fill: GOLD, color: DARK, fontSize: T.fsBtn, width: 80, height: 36,
        onTap: function() { state.foundDevice = Object.assign({}, dev); state.addStep = 'confirm'; renderHWContent(card); },
      }));
    }
    list.appendChild(row);
  });
  inner.appendChild(list);

  var footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;padding:10px 16px;flex-shrink:0;';
  footer.appendChild(buildButton('Scan Again', { fill: GOLD, color: DARK, fontSize: T.fsBtn, height: 40, onTap: function() { state.addStep = 'scanning'; state.scanResults = []; renderHWContent(card); doScan(null, card); } }));
  footer.appendChild(buildButton('Enter IP',   { fill: BG,   color: GOLD, fontSize: T.fsBtn, height: 40, onTap: function() { state.addStep = 'enter-ip'; renderHWContent(card); } }));
  footer.appendChild(buildButton('Cancel',     { fill: BG,   color: T.subtleText, fontSize: T.fsBtn, height: 40, onTap: function() { state.addStep = 'choose'; renderHWContent(card); } }));
  inner.appendChild(footer);
}

function renderConfirmDevice(card) {
  var dev = state.foundDevice;
  if (!dev) { state.addStep = 'choose'; renderHWContent(card); return; }

  var inner = cardInner(card);

  var hdr = makeLabel('Configure Device', GOLD, T.fsSmall);
  hdr.style.padding = '16px 20px 2px';
  inner.appendChild(hdr);
  var sub = makeLabel(dev.ip + '  ·  ' + dev.mac, T.subtleText, T.fsSmall);
  sub.style.padding = '0 20px 12px';
  inner.appendChild(sub);

  var form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:0 20px;flex:1;overflow:hidden;';

  // Type selector
  form.appendChild(makeLabel('Device Type', GOLD, T.fsSmall));
  var typeRow = document.createElement('div');
  typeRow.style.cssText = 'display:flex;gap:8px;';

  var TYPES = [
    { id: 'kitchen',     label: 'Kitchen Printer' },
    { id: 'receipt',     label: 'Receipt Printer' },
    { id: 'card_reader', label: 'Card Reader'     },
  ];
  var selectedType = dev.type === 'card_reader' ? 'card_reader' : 'kitchen';
  var typeBtnEls = {};

  function refreshTypeBtns() {
    TYPES.forEach(function(t) {
      var inner2 = typeBtnEls[t.id] && typeBtnEls[t.id].querySelector('div');
      if (inner2) {
        inner2.style.background = selectedType === t.id ? GOLD : BG;
        inner2.style.color = selectedType === t.id ? DARK : GOLD;
      }
    });
    refreshPresets();
    if (typeof refreshRegId2 === 'function') refreshRegId2();
  }

  TYPES.forEach(function(t) {
    var btn = buildButton(t.label, {
      fill: selectedType === t.id ? GOLD : BG,
      color: selectedType === t.id ? DARK : GOLD,
      fontSize: T.fsBtn, height: 44,
      onTap: function() { selectedType = t.id; refreshTypeBtns(); },
    });
    typeBtnEls[t.id] = btn;
    typeRow.appendChild(btn);
  });
  form.appendChild(typeRow);

  // Name
  form.appendChild(makeLabel('Device Name', GOLD, T.fsSmall));
  var nameDisplay = document.createElement('div');
  nameDisplay.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:40px;color:' + MINT + ';clip-path:' + chamfer(5) + ';';
  applySunkenStyle(nameDisplay);
  var deviceName = dev.name || '';
  nameDisplay.textContent = deviceName || '—';
  form.appendChild(nameDisplay);

  var presetRow = document.createElement('div');
  presetRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

  function refreshPresets() {
    presetRow.innerHTML = '';
    var presets = selectedType === 'kitchen'     ? ['Kitchen', 'Bar Kitchen', 'Expo']
                : selectedType === 'receipt'     ? ['Receipt', 'Front Counter', 'Bar']
                :                                  ['Card Reader', 'Dejavoo'];
    presets.forEach(function(p) {
      presetRow.appendChild(buildButton(p, {
        fill: BG, color: GOLD, fontSize: T.fsBtn, height: 32,
        onTap: function() { deviceName = p; nameDisplay.textContent = p; },
      }));
    });
  }
  refreshPresets();
  form.appendChild(presetRow);

  // Register ID field (card readers only)
  var regLabel2 = makeLabel('SPIn Register ID', GOLD, T.fsSmall);
  var regInput2 = document.createElement('div');
  regInput2.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:40px;color:' + MINT + ';clip-path:' + chamfer(5) + ';cursor:pointer;';
  applySunkenStyle(regInput2);
  var registerId2 = dev.register_id || '';
  regInput2.textContent = registerId2 || 'Tap to enter';
  regInput2.addEventListener('pointerup', function() {
    showKeyboard({
      placeholder: 'SPIn Register ID',
      initialValue: registerId2,
      maxLength: 20,
      onDone: function(val) { registerId2 = val; regInput2.textContent = val || 'Tap to enter'; },
      dismissOnDone: true,
    });
  });
  form.appendChild(regLabel2);
  form.appendChild(regInput2);

  // TPN field (card readers only)
  var tpnLabel2 = makeLabel('SPIn TPN', GOLD, T.fsSmall);
  var tpnInput2 = document.createElement('div');
  tpnInput2.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:40px;color:' + MINT + ';clip-path:' + chamfer(5) + ';cursor:pointer;';
  applySunkenStyle(tpnInput2);
  var tpnVal2 = dev.tpn || '';
  tpnInput2.textContent = tpnVal2 || 'Tap to enter';
  tpnInput2.addEventListener('pointerup', function() {
    showKeyboard({
      placeholder: 'Terminal Processing Number',
      initialValue: tpnVal2,
      maxLength: 20,
      onDone: function(val) { tpnVal2 = val; tpnInput2.textContent = val || 'Tap to enter'; },
      dismissOnDone: true,
    });
  });
  form.appendChild(tpnLabel2);
  form.appendChild(tpnInput2);

  // AuthKey field (card readers only)
  var authLabel2 = makeLabel('SPIn Auth Key', GOLD, T.fsSmall);
  var authInput2 = document.createElement('div');
  authInput2.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:40px;color:' + MINT + ';clip-path:' + chamfer(5) + ';cursor:pointer;';
  applySunkenStyle(authInput2);
  var authVal2 = dev.auth_key || '';
  authInput2.textContent = authVal2 || 'Tap to enter';
  authInput2.addEventListener('pointerup', function() {
    showKeyboard({
      placeholder: 'SPIn Auth Key',
      initialValue: authVal2,
      maxLength: 30,
      onDone: function(val) { authVal2 = val; authInput2.textContent = val || 'Tap to enter'; },
      dismissOnDone: true,
    });
  });
  form.appendChild(authLabel2);
  form.appendChild(authInput2);

  function refreshRegId2() {
    var show = selectedType === 'card_reader';
    regLabel2.style.display = show ? '' : 'none';
    regInput2.style.display = show ? '' : 'none';
    tpnLabel2.style.display = show ? '' : 'none';
    tpnInput2.style.display = show ? '' : 'none';
    authLabel2.style.display = show ? '' : 'none';
    authInput2.style.display = show ? '' : 'none';
  }
  refreshRegId2();

  inner.appendChild(form);

  var footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;padding:12px 20px;flex-shrink:0;';
  footer.appendChild(buildButton('//SAVE//', {
    fill: GOLD, color: DARK, fontSize: T.fsSmall, height: 48,
    onTap: async function() {
      await saveDevice({
        mac: dev.mac, ip: dev.ip, type: selectedType,
        name: deviceName || selectedType,
        port: selectedType === 'card_reader' ? (dev.port || 9000) : (dev.port || 9100),
        register_id: selectedType === 'card_reader' ? registerId2 : '',
        tpn: selectedType === 'card_reader' ? tpnVal2 : '',
        auth_key: selectedType === 'card_reader' ? authVal2 : '',
      });
      state.addStep = 'choose'; state.foundDevice = null; renderCurrentState();
    },
  }));
  footer.appendChild(buildButton('Back', {
    fill: BG, color: GOLD, fontSize: T.fsBtn, height: 48,
    onTap: function() { state.addStep = 'results'; renderHWContent(card); },
  }));
  inner.appendChild(footer);
}

// ── Device lists ──────────────────────────────────

function renderDeviceList(card, type) {
  var filtered = state.savedDevices.filter(function(d) {
    if (type === 'printer') return d.type === 'kitchen' || d.type === 'receipt';
    return d.type === type;
  });

  var inner = cardInner(card);
  var hdr = makeLabel(type === 'card_reader' ? 'Card Readers' : 'Printers', GOLD, T.fsSmall);
  hdr.style.padding = '16px 20px 10px';
  inner.appendChild(hdr);

  if (filtered.length === 0) {
    var emptyWrap = centeredWrap(card);
    emptyWrap.appendChild(makeLabel('No devices saved', T.bgLight, T.fsSmall));
    return;
  }

  var list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:0 16px;overflow-y:auto;flex:1;';

  filtered.forEach(function(dev) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:' + DARK + ';border:2px solid ' + GOLD + ';clip-path:' + chamfer(5) + ';';

    var info = document.createElement('div');
    info.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
    info.appendChild(makeLabel(dev.name, GOLD, T.fsSmall));
    info.appendChild(makeLabel(typeLabel(dev.type), T.bgLight, T.fsSmall));
    info.appendChild(makeLabel(dev.ip + '  ·  ' + shortenMac(dev.mac), T.bgLight, T.fsSmall));
    row.appendChild(info);

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;';

    var testBtn = buildButton('Test', {
      fill: BG, color: T.cyan, fontSize: T.fsBtn, width: 70, height: 36,
      onTap: function() { testDevice(dev, testBtn); },
    });
    actions.appendChild(testBtn);

    actions.appendChild(buildButton('Remove', {
      fill: T.red, color: '#fff', fontSize: T.fsBtn, width: 80, height: 36,
      onTap: async function() { await deleteDevice(dev.mac); renderCurrentState(); },
    }));

    row.appendChild(actions);
    list.appendChild(row);
  });
  inner.appendChild(list);
}

async function testDevice(dev, btn) {
  var lbl = btn.querySelector('div') || btn;
  lbl.textContent = '...';
  try {
    var res = await fetch(API + '/hardware/test-print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: dev.ip, port: dev.port || 9100 }),
    });
    var data = await res.json();
    lbl.textContent = data.success ? 'OK ✓' : 'Fail';
    lbl.style.color = data.success ? MINT : T.red;
  } catch (e) {
    lbl.textContent = 'Fail';
    lbl.style.color = T.red;
  }
  setTimeout(function() { lbl.textContent = 'Test'; lbl.style.color = T.cyan; }, 2000);
}

// ═══════════════════════════════════════════════════
//  TERMINAL CONTENT
// ═══════════════════════════════════════════════════

function renderTermContent(card) {
  card.innerHTML = '';  // always clear before render
  var inner = cardInner(card);
  inner.style.padding = '20px 24px';
  inner.style.gap = '14px';

  var gridData =
    state.activeNav === 'identity' ? [
      { label: 'Terminal ID',   value: state.terminalId,   key: 'terminalId'   },
      { label: 'Terminal Name', value: state.terminalName, key: 'terminalName' },
      { label: 'Software',      value: state.softwareVer                       },
    ] :
    state.activeNav === 'network' ? [
      { label: 'IP Address', value: state.ipAddress },
      { label: 'WiFi SSID',  value: state.wifiSSID  },
    ] : [
      { label: 'Tax Rate',      value: state.taxRate + '%',      key: 'taxRate'      },
      { label: 'Cash Discount', value: state.cashDiscount + '%', key: 'cashDiscount' },
    ];

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(' + Math.min(gridData.length, 3) + ',1fr);gap:14px;width:100%;';

  gridData.forEach(function(item) {
    var pair = buildStyledButton(item.key ? BG : MINT);
    pair.wrap.style.width = '100%';
    pair.wrap.style.height = '110px';
    pair.inner.style.flexDirection = 'column';
    pair.inner.style.gap = '4px';
    pair.inner.style.padding = '10px';

    var lbl = makeLabel(item.label, item.key ? GOLD : DARK, T.fsSmall);
    lbl.style.opacity = '0.8';
    var val = makeLabel(item.value, item.key ? MINT : DARK, '28px');
    pair.inner.appendChild(lbl);
    pair.inner.appendChild(val);

    if (item.key) {
      pair.wrap.addEventListener('pointerup', function() { openSettingEditor(item, val); });
    }
    grid.appendChild(pair.wrap);
  });

  inner.appendChild(grid);
}

function openSettingEditor(item, valEl) {
  var suffix = (item.label.includes('Rate') || item.label.includes('Discount')) ? '%' : '';
  showKeyboard({
    placeholder: item.label,
    initialValue: state[item.key],
    maxLength: 6,
    onDone: function(val) {
      state[item.key] = val;
      if (valEl) valEl.textContent = val + suffix;
    },
    dismissOnDone: true,
  });
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

function centeredWrap(card) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;box-sizing:border-box;';
  card.appendChild(wrap);
  return wrap;
}

function cardInner(card) {
  var inner = document.createElement('div');
  inner.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;';
  card.appendChild(inner);
  return inner;
}

function makeLabel(text, color, size) {
  var el = document.createElement('div');
  el.style.cssText = 'font-family:' + T.fb + ';font-size:' + size + ';color:' + color + ';';
  el.textContent = text;
  return el;
}

function shortenMac(mac) {
  if (!mac) return '—';
  var p = mac.split(':');
  return '••:••:••:' + p.slice(3).join(':');
}

function guessName(dev) {
  if (dev.port === 9100) return 'Thermal Printer';
  if (dev.type === 'card_reader') return 'Card Reader';
  return 'Unknown Device';
}

function typeLabel(type) {
  return { kitchen: 'Kitchen Printer', receipt: 'Receipt Printer', card_reader: 'Card Reader' }[type] || type;
}