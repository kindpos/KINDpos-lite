// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Settings Scene (Configuration)
//  Hardware tab top / Terminal tab bottom
//  Nav column left (hardware) or right (terminal)
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton } from '../components.js';
import { buildNumpad } from '../numpad.js';
import { registerScene, pop, overlay, dismissOverlay } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── API ───────────────────────────────────────────
var API = '/api/v1';

// ── Layout ────────────────────────────────────────
var PAD      = 12;
var TAB_W    = 340;
var TAB_H    = 52;
var TAB_OVR  = 26;
var BORDER_W = 4;
var NAV_W    = 160;
var NAV_GAP  = 8;
var SCENE_W  = 1024;
var SCENE_H  = 548;
var INNER_W  = SCENE_W - PAD * 2;
var CARD_W   = INNER_W - NAV_W - NAV_GAP - PAD;
// Card spans between the two tabs — each tab overlaps by TAB_OVR
var CARD_H   = SCENE_H - PAD * 2 - 2 * (TAB_H - TAB_OVR);  // 472px

var GOLD = T.gold;
var MINT = T.mint;
var DARK = T.bgDark;
var BG   = T.bg;

// ── State ─────────────────────────────────────────
var state = {
  activeTab:    'hardware',
  activeNav:    'add',
  savedDevices: [],
  scanResults:  [],
  scanning:     false,
  addStep:      'choose',
  foundDevice:  null,
  eventSource:  null,   // active EventSource — prevent double-open
  terminalId:   'T-001',
  terminalName: 'Food Truck 1',
  softwareVer:  'Vz1.0',
  ipAddress:    '—',
  wifiSSID:     '—',
  taxRate:      '8.0',
  cashDiscount: '4.0',
};

var rootEl = null;

var HW_NAVS = [
  { id: 'add',      label: '//Add Device//' },
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
  onEnter: function(el) {
    rootEl = el;
    state.activeTab   = 'hardware';
    state.activeNav   = 'add';
    state.addStep     = 'choose';
    state.foundDevice = null;
    state.scanResults = [];
    state.scanning    = false;

    setSceneName('Configuration');
    setHeaderBack(true);

    el.style.cssText = 'width:100%;height:100%;padding:' + PAD + 'px;box-sizing:border-box;position:relative;background:' + T.bgDark + ';';

    loadSavedDevices().then(function() { render(); });
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

function render() {
  if (!rootEl) return;
  rootEl.innerHTML = '';

  var isHW     = state.activeTab === 'hardware';
  var tabColor = isHW ? GOLD : MINT;

  var cardLeft = isHW ? PAD + NAV_W + NAV_GAP : PAD;
  var cardTop  = PAD + TAB_H - TAB_OVR;

  // ── Hardware tab (top center of card) ─────────────
  var hwTabX = cardLeft + (CARD_W / 2) - (TAB_W / 2);
  buildTab('Hardware', GOLD, isHW, hwTabX, PAD, function() {
    if (isHW) return;
    state.activeTab = 'hardware'; state.activeNav = 'add'; state.addStep = 'choose'; render();
  });

  // ── Terminal tab (bottom center of card) ──────────
  var termTabY = cardTop + CARD_H - TAB_OVR;
  buildTab('Terminal', MINT, !isHW, hwTabX, termTabY, function() {
    if (!isHW) return;
    state.activeTab = 'terminal'; state.activeNav = 'identity'; render();
  });

  // ── Card ──────────────────────────────────────────
  var card = document.createElement('div');
  card.dataset.kindCard = '1';
  card.style.cssText = [
    'position:absolute;left:' + cardLeft + 'px;top:' + cardTop + 'px;',
    'width:' + CARD_W + 'px;height:' + CARD_H + 'px;',
    'border:' + BORDER_W + 'px solid ' + tabColor + ';',
    'box-sizing:border-box;overflow:hidden;background:' + BG + ';',
  ].join('');
  rootEl.appendChild(card);

  // ── Nav column ────────────────────────────────────
  if (isHW) buildHWNav(cardTop);
  else buildTermNav(cardLeft + CARD_W + NAV_GAP, cardTop);

  // ── Content ───────────────────────────────────────
  if (isHW) renderHWContent(card);
  else renderTermContent(card);
}

function buildTab(label, color, active, x, y, onTap) {
  var tab = document.createElement('div');
  tab.style.cssText = [
    'position:absolute;left:' + x + 'px;top:' + y + 'px;',
    'width:' + TAB_W + 'px;height:' + TAB_H + 'px;',
    'display:flex;align-items:center;justify-content:center;',
    'font-family:' + T.fh + ';font-size:32px;',
    'cursor:pointer;user-select:none;z-index:10;',
    'clip-path:' + chamfer(8) + ';',
    active
      ? 'background:' + color + ';color:' + DARK + ';'
      : 'background:' + BG + ';color:' + color + ';border:' + BORDER_W + 'px solid ' + color + ';',
  ].join('');
  tab.textContent = label;
  tab.addEventListener('pointerup', onTap);
  rootEl.appendChild(tab);
}

// ── Hardware nav ──────────────────────────────────
function buildHWNav(cardTop) {
  HW_NAVS.forEach(function(nav, i) {
    var isActive = state.activeNav === nav.id;
    var btn = document.createElement('div');
    btn.style.cssText = [
      'position:absolute;left:' + PAD + 'px;top:' + (cardTop + 20 + i * 72) + 'px;',
      'width:' + NAV_W + 'px;height:52px;',
      'display:flex;align-items:center;justify-content:center;text-align:center;',
      'font-family:' + T.fb + ';font-size:' + (nav.id === 'add' ? '16px' : '20px') + ';font-weight:bold;',
      isActive
        ? 'background:' + GOLD + ';color:' + DARK + ';'
        : 'background:' + BG + ';color:' + GOLD + ';border:' + BORDER_W + 'px solid ' + GOLD + ';',
      'cursor:pointer;user-select:none;clip-path:' + chamfer(6) + ';z-index:5;box-sizing:border-box;',
    ].join('');
    btn.textContent = nav.label;
    btn.addEventListener('pointerup', function() {
      state.activeNav = nav.id;
      if (nav.id === 'add') { state.addStep = 'choose'; state.foundDevice = null; }
      render();
    });
    rootEl.appendChild(btn);
  });
}

// ── Terminal nav ──────────────────────────────────
function buildTermNav(navX, cardTop) {
  TERM_NAVS.forEach(function(nav, i) {
    var isActive = state.activeNav === nav.id;
    var btn = document.createElement('div');
    btn.style.cssText = [
      'position:absolute;left:' + navX + 'px;top:' + (cardTop + 20 + i * 80) + 'px;',
      'width:' + NAV_W + 'px;height:64px;',
      'display:flex;align-items:center;justify-content:center;',
      'font-family:' + T.fb + ';font-size:20px;font-weight:bold;',
      isActive
        ? 'background:' + MINT + ';color:' + DARK + ';'
        : 'background:' + BG + ';color:' + MINT + ';border:' + BORDER_W + 'px solid ' + MINT + ';',
      'cursor:pointer;user-select:none;clip-path:' + chamfer(6) + ';z-index:5;box-sizing:border-box;',
    ].join('');
    btn.textContent = nav.label;
    btn.addEventListener('pointerup', function() { state.activeNav = nav.id; render(); });
    rootEl.appendChild(btn);
  });
}

// ═══════════════════════════════════════════════════
//  HARDWARE CONTENT
// ═══════════════════════════════════════════════════

function renderHWContent(card) {
  card.innerHTML = '';  // always clear before render
  if (state.activeNav === 'add')      renderAddDevice(card);
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
    fill: GOLD, color: DARK, fontSize: '24px', width: 280, height: 60,
    onTap: function() {
      state.addStep = 'scanning';
      state.scanResults = [];
      doScan(null, card);
    },
  }));
  wrap.appendChild(buildButton('Enter IP Address', {
    fill: BG, color: GOLD, fontSize: '24px', width: 280, height: 60,
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
  spinner.style.cssText = 'font-family:' + T.fb + ';font-size:36px;color:' + GOLD + ';display:inline-block;flex-shrink:0;';
  spinner.textContent = '◈';
  var angle = 0;
  var anim = setInterval(function() {
    if (!spinner.isConnected) { clearInterval(anim); return; }
    angle += 30; spinner.style.transform = 'rotate(' + angle + 'deg)';
  }, 100);

  var statusCol = document.createElement('div');
  var scanLbl = makeLabel('Scanning network...', GOLD, '22px');
  var subLbl   = makeLabel('Probing 254 hosts on ports 9100 · 443 · 8080', T.bgLight, '13px');
  statusCol.appendChild(scanLbl);
  statusCol.appendChild(subLbl);

  statusRow.appendChild(spinner);
  statusRow.appendChild(statusCol);
  bottom.appendChild(statusRow);

  // Enter IP shortcut — larger
  var shortcut = buildButton('Know the IP? Enter it directly →', {
    fill: BG, color: GOLD, fontSize: '18px', height: 44, width: 380,
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

  var title = makeLabel('Enter IP Address', GOLD, '20px');
  inner.appendChild(title);

  // IP prefix + octet display in one row
  var ipRow = document.createElement('div');
  ipRow.style.cssText = 'display:flex;align-items:center;gap:8px;';

  var prefix = makeLabel('10 . 0 . 0 .', GOLD, '22px');
  prefix.style.letterSpacing = '3px';
  ipRow.appendChild(prefix);

  var octetDisplay = document.createElement('div');
  octetDisplay.style.cssText = [
    'width:90px;height:48px;',
    'background:' + DARK + ';',
    'display:flex;align-items:center;justify-content:center;',
    'font-family:' + T.fb + ';font-size:28px;color:' + GOLD + ';',
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
    pair.inner.style.fontSize = key.t === 'digit' ? '26px' : '18px';
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
    fill: BG, color: GOLD, fontSize: '16px', width: 200, height: 36,
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
        console.log('[SCAN] started — probing', data.total, 'hosts');

      } else if (data.type === 'device') {
        state.scanResults.push(data);
        console.log('[SCAN] found:', data.ip, data.mac);
        var currentList = card.querySelector('#scan-live-list');
        if (currentList && currentList.isConnected) {
          currentList.appendChild(buildLiveDeviceRow(data, card));
        }

      } else if (data.type === 'complete') {
        console.log('[SCAN] complete — found', state.scanResults.length, 'devices');
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

  var hdr = makeLabel('Device Not Responding', T.red, '20px');
  hdr.style.padding = '16px 20px 4px';
  inner.appendChild(hdr);

  var sub = makeLabel(ip + ' did not respond on known ports. Add manually?', T.bgLight, '14px');
  sub.style.padding = '4px 20px 16px';
  inner.appendChild(sub);

  var form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:0 20px;flex:1;';

  // Type selector
  form.appendChild(makeLabel('Device Type', GOLD, '15px'));
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
      fontSize: '14px', height: 38,
      onTap: function() { selectedType = t.id; refreshTypeBtns(); },
    });
    typeBtnEls[t.id] = btn;
    typeRow.appendChild(btn);
  });
  form.appendChild(typeRow);

  form.appendChild(makeLabel('Device Name', GOLD, '15px'));
  var nameDisplay = document.createElement('div');
  nameDisplay.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:18px;color:' + MINT + ';clip-path:' + chamfer(5) + ';';
  applySunkenStyle(nameDisplay);
  var deviceName = '';
  nameDisplay.textContent = '—';
  form.appendChild(nameDisplay);

  var presetRow = document.createElement('div');
  presetRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  ['Kitchen', 'Receipt', 'Bar Kitchen', 'Card Reader'].forEach(function(p) {
    presetRow.appendChild(buildButton(p, {
      fill: BG, color: GOLD, fontSize: '14px', height: 32,
      onTap: function() { deviceName = p; nameDisplay.textContent = p; },
    }));
  });
  form.appendChild(presetRow);
  inner.appendChild(form);

  var footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;padding:12px 20px;flex-shrink:0;';

  footer.appendChild(buildButton('//ADD ANYWAY//', {
    fill: GOLD, color: DARK, fontSize: '18px', height: 48,
    onTap: async function() {
      await saveDevice({
        mac:  'MANUAL-' + ip.replace(/\./g, '-'),
        ip:   ip,
        type: selectedType,
        name: deviceName || selectedType,
        port: selectedType === 'card_reader' ? 443 : 9100,
      });
      state.addStep = 'choose';
      render();
    },
  }));

  footer.appendChild(buildButton('Try Again', {
    fill: BG, color: GOLD, fontSize: '18px', height: 48,
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
    'border:2px solid ' + (saved ? GOLD : '#444') + ';',
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
  info.appendChild(makeLabel(dev.name || guessName(dev), GOLD, '15px'));
  info.appendChild(makeLabel(dev.ip + '  ·  ' + shortenMac(dev.mac), T.bgLight, '11px'));
  row.appendChild(info);

  if (saved) {
    row.appendChild(makeLabel('Saved ✓', GOLD, '12px'));
  } else {
    // We keep a reference to card via closure — but card may have been replaced.
    // Use a dataset attribute so the confirm step can find the device.
    var addBtn = buildButton('+ Add', {
      fill: GOLD, color: DARK, fontSize: '14px', width: 76, height: 32,
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
    GOLD, '20px'
  );
  hdr.style.padding = '16px 20px 8px';
  inner.appendChild(hdr);

  var list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:8px 16px;overflow-y:auto;flex:1;';

  if (state.scanResults.length === 0) {
    var empty = makeLabel('No devices responded on ports 9100, 443, 8080.', T.bgLight, '14px');
    empty.style.padding = '8px 0';
    list.appendChild(empty);
    var tip = makeLabel('Try "Enter IP" to probe a specific address directly.', T.bgLight, '13px');
    tip.style.opacity = '0.6';
    list.appendChild(tip);
  }

  state.scanResults.forEach(function(dev) {
    var saved = state.savedDevices.some(function(d) { return d.mac === dev.mac; });
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:' + DARK + ';border:2px solid ' + (saved ? GOLD : '#444') + ';clip-path:' + chamfer(5) + ';';

    var info = document.createElement('div');
    info.appendChild(makeLabel(dev.name || guessName(dev), GOLD, '16px'));
    info.appendChild(makeLabel(dev.ip + '  ·  ' + shortenMac(dev.mac), T.bgLight, '12px'));
    row.appendChild(info);

    if (saved) {
      row.appendChild(makeLabel('Saved ✓', GOLD, '13px'));
    } else {
      row.appendChild(buildButton('+ Add', {
        fill: GOLD, color: DARK, fontSize: '16px', width: 80, height: 36,
        onTap: function() { state.foundDevice = Object.assign({}, dev); state.addStep = 'confirm'; renderHWContent(card); },
      }));
    }
    list.appendChild(row);
  });
  inner.appendChild(list);

  var footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;padding:10px 16px;flex-shrink:0;';
  footer.appendChild(buildButton('Scan Again', { fill: GOLD, color: DARK, fontSize: '18px', height: 40, onTap: function() { state.addStep = 'scanning'; state.scanResults = []; renderHWContent(card); doScan(null, card); } }));
  footer.appendChild(buildButton('Enter IP',   { fill: BG,   color: GOLD, fontSize: '18px', height: 40, onTap: function() { state.addStep = 'enter-ip'; renderHWContent(card); } }));
  footer.appendChild(buildButton('Cancel',     { fill: BG,   color: T.bgLight, fontSize: '18px', height: 40, onTap: function() { state.addStep = 'choose'; renderHWContent(card); } }));
  inner.appendChild(footer);
}

function renderConfirmDevice(card) {
  var dev = state.foundDevice;
  if (!dev) { state.addStep = 'choose'; renderHWContent(card); return; }

  var inner = cardInner(card);

  var hdr = makeLabel('Configure Device', GOLD, '22px');
  hdr.style.padding = '16px 20px 2px';
  inner.appendChild(hdr);
  var sub = makeLabel(dev.ip + '  ·  ' + dev.mac, T.bgLight, '13px');
  sub.style.padding = '0 20px 12px';
  inner.appendChild(sub);

  var form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:0 20px;flex:1;overflow:hidden;';

  // Type selector
  form.appendChild(makeLabel('Device Type', GOLD, '15px'));
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
  }

  TYPES.forEach(function(t) {
    var btn = buildButton(t.label, {
      fill: selectedType === t.id ? GOLD : BG,
      color: selectedType === t.id ? DARK : GOLD,
      fontSize: '14px', height: 38,
      onTap: function() { selectedType = t.id; refreshTypeBtns(); },
    });
    typeBtnEls[t.id] = btn;
    typeRow.appendChild(btn);
  });
  form.appendChild(typeRow);

  // Name
  form.appendChild(makeLabel('Device Name', GOLD, '15px'));
  var nameDisplay = document.createElement('div');
  nameDisplay.style.cssText = 'height:40px;background:' + DARK + ';display:flex;align-items:center;padding:0 12px;font-family:' + T.fb + ';font-size:18px;color:' + MINT + ';clip-path:' + chamfer(5) + ';';
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
        fill: BG, color: GOLD, fontSize: '14px', height: 32,
        onTap: function() { deviceName = p; nameDisplay.textContent = p; },
      }));
    });
  }
  refreshPresets();
  form.appendChild(presetRow);
  inner.appendChild(form);

  var footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;padding:12px 20px;flex-shrink:0;';
  footer.appendChild(buildButton('//SAVE//', {
    fill: GOLD, color: DARK, fontSize: '22px', height: 48,
    onTap: async function() {
      await saveDevice({ mac: dev.mac, ip: dev.ip, type: selectedType, name: deviceName || selectedType, port: dev.port || 9100 });
      state.addStep = 'choose'; state.foundDevice = null; render();
    },
  }));
  footer.appendChild(buildButton('Back', {
    fill: BG, color: GOLD, fontSize: '20px', height: 48,
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
  var hdr = makeLabel(type === 'card_reader' ? 'Card Readers' : 'Printers', GOLD, '20px');
  hdr.style.padding = '16px 20px 10px';
  inner.appendChild(hdr);

  if (filtered.length === 0) {
    var emptyWrap = centeredWrap(card);
    emptyWrap.appendChild(makeLabel('No devices saved', T.bgLight, '18px'));
    return;
  }

  var list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:0 16px;overflow-y:auto;flex:1;';

  filtered.forEach(function(dev) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:' + DARK + ';border:2px solid ' + GOLD + ';clip-path:' + chamfer(5) + ';';

    var info = document.createElement('div');
    info.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
    info.appendChild(makeLabel(dev.name, GOLD, '18px'));
    info.appendChild(makeLabel(typeLabel(dev.type), T.bgLight, '13px'));
    info.appendChild(makeLabel(dev.ip + '  ·  ' + shortenMac(dev.mac), T.bgLight, '12px'));
    row.appendChild(info);

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;';

    var testBtn = buildButton('Test', {
      fill: BG, color: T.cyan, fontSize: '14px', width: 70, height: 36,
      onTap: function() { testDevice(dev, testBtn); },
    });
    actions.appendChild(testBtn);

    actions.appendChild(buildButton('Remove', {
      fill: T.red, color: '#fff', fontSize: '14px', width: 80, height: 36,
      onTap: async function() { await deleteDevice(dev.mac); render(); },
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

    var lbl = makeLabel(item.label, item.key ? GOLD : DARK, '16px');
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
  overlay('setting-edit', {
    onBuild: function(el) {
      var panel = document.createElement('div');
      panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px;background:' + BG + ';border:4px solid ' + MINT + ';padding:20px;clip-path:' + chamfer(10) + ';';
      panel.appendChild(makeLabel(item.label, GOLD, '22px'));
      panel.appendChild(buildNumpad({
        maxDigits: 6, masked: false,
        onSubmit: function(val) {
          state[item.key] = val;
          if (valEl) valEl.textContent = val + (item.label.includes('Rate') || item.label.includes('Discount') ? '%' : '');
          dismissOverlay();
        },
      }));
      panel.appendChild(buildButton('CANCEL', {
        fill: BG, color: MINT, fontSize: '20px', width: 200, height: 40,
        onTap: function() { dismissOverlay(); },
      }));
      el.appendChild(panel);
    },
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