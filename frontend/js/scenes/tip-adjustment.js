// =======================================================
//  KINDpos Terminal - Tip Adjustment Scene (v2 Overhaul)
//  Card grid | Filter bar | Tip entry interrupt
//  Nice. Dependable. Yours.
// =======================================================

import { T, chamfer, buildStyledButton, bevelEdges } from '../tokens.js';
import { buildButton } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// == State =============================================
var checks = [];
var statusFilter = 'unadjusted';
var cardFilter = 'all';
var serverFilter = 'all';
var _clockIv = null;
var _role = 'server';
var _sceneName = '';
var _params = {};

// DOM refs
var _gridEl = null;
var _unadjCountEl = null;
var _tipTotalEl = null;
var _filterEls = { status: {}, card: {}, server: {} };

// == HELPERS ============================================

function fmt(n) { return '$' + (n || 0).toFixed(2); }

function isUnadjusted(c) { return c.tip_amount == null; }

function filteredChecks() {
  return checks.filter(function(c) {
    if (statusFilter === 'unadjusted' && !isUnadjusted(c)) return false;
    if (cardFilter !== 'all' && c.card_type !== cardFilter.toUpperCase()) return false;
    if (serverFilter !== 'all' && c.server_id !== serverFilter) return false;
    return true;
  });
}

function getUnadjCount() {
  return checks.filter(function(c) {
    if (!isUnadjusted(c)) return false;
    if (cardFilter !== 'all' && c.card_type !== cardFilter.toUpperCase()) return false;
    if (serverFilter !== 'all' && c.server_id !== serverFilter) return false;
    return true;
  }).length;
}

function getTipTotal() {
  return checks.filter(function(c) {
    if (isUnadjusted(c)) return false;
    if (cardFilter !== 'all' && c.card_type !== cardFilter.toUpperCase()) return false;
    if (serverFilter !== 'all' && c.server_id !== serverFilter) return false;
    return true;
  }).reduce(function(s, c) { return s + c.tip_amount; }, 0);
}

function getUnadjChecks() {
  return checks.filter(function(c) {
    if (!isUnadjusted(c)) return false;
    if (cardFilter !== 'all' && c.card_type !== cardFilter.toUpperCase()) return false;
    if (serverFilter !== 'all' && c.server_id !== serverFilter) return false;
    return true;
  });
}

function uniqueServers() {
  var seen = {};
  var list = [];
  checks.forEach(function(c) {
    if (c.server_id && !seen[c.server_id]) {
      seen[c.server_id] = true;
      list.push({ id: c.server_id, name: c.server_name });
    }
  });
  return list;
}

// == FETCH =============================================

function fetchChecks(params) {
  var url = '/api/v1/tips/checks';
  var qs = [];
  if (params.employeeId && _role !== 'manager') {
    qs.push('server_id=' + encodeURIComponent(params.employeeId));
  }
  if (qs.length) url += '?' + qs.join('&');
  return fetch(url)
    .then(function(r) { return r.json(); })
    .catch(function() { return []; });
}

// == CHECK CARD ========================================

function buildCheckCard(c) {
  var unadj = isUnadjusted(c);
  var borderColor = unadj ? T.lime : T.darkBtn;
  var edges = bevelEdges(T.bgDark);

  var wrap = document.createElement('div');
  wrap.dataset.checkId = c.check_id;
  wrap.style.cssText = [
    'background:' + borderColor + ';',
    'padding:2px;',
    'clip-path:' + chamfer(8) + ';',
    unadj ? 'cursor:pointer;' : '',
  ].join('');

  var inner = document.createElement('div');
  inner.style.cssText = [
    'background:' + T.bgDark + ';',
    'height:100%;box-sizing:border-box;',
    'padding:5px 8px;',
    'display:flex;flex-direction:column;justify-content:space-between;',
    'position:relative;',
    'border-top:' + T.bevel + 'px solid ' + edges.light + ';',
    'border-left:' + T.bevel + 'px solid ' + edges.light + ';',
    'border-bottom:' + T.bevel + 'px solid ' + edges.dark + ';',
    'border-right:' + T.bevel + 'px solid ' + edges.dark + ';',
    'overflow:hidden;',
  ].join('');

  // Row 1: Check # + Card badge
  var r1 = document.createElement('div');
  r1.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

  var chk = document.createElement('span');
  chk.textContent = c.check_num || c.check_id;
  chk.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.gold + ';';
  r1.appendChild(chk);

  var badge = document.createElement('span');
  badge.textContent = c.card_type;
  badge.style.cssText = [
    'font-family:' + T.fb + ';font-size:10px;color:' + T.mint + ';',
    'border:1px solid ' + T.mint + ';',
    'padding:1px 4px;',
    'clip-path:' + chamfer(3) + ';',
  ].join('');
  r1.appendChild(badge);
  inner.appendChild(r1);

  // Row 2: Card network + last 4
  var r2 = document.createElement('div');
  r2.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.sage + ';';
  r2.textContent = c.card_type + ' \u00B7\u00B7\u00B7\u00B7' + c.last_four;
  inner.appendChild(r2);

  // Row 3: Check amount
  var r3 = document.createElement('div');
  r3.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';';
  r3.textContent = fmt(c.amount);
  inner.appendChild(r3);

  // Row 3b: Tip amount (adjusted cards only)
  if (!unadj) {
    var r3b = document.createElement('div');
    r3b.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.gold + ';';
    r3b.textContent = 'tip: ' + fmt(c.tip_amount);
    inner.appendChild(r3b);
  }

  // Row 4: Time closed
  var r4 = document.createElement('div');
  r4.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.mint + ';';
  r4.textContent = c.time;
  inner.appendChild(r4);

  // Row 5: Server name (manager mode only)
  if (_role === 'manager' && c.server_name) {
    var r5 = document.createElement('div');
    r5.style.cssText = 'font-family:' + T.fb + ';font-size:11px;color:' + T.electricPink + ';';
    r5.textContent = c.server_name;
    inner.appendChild(r5);
  }

  wrap.appendChild(inner);

  if (unadj) {
    wrap.addEventListener('pointerup', function() {
      openTipEntry(c);
    });
  }

  return wrap;
}

// == GRID + SUMMARY ====================================

function renderGrid() {
  if (!_gridEl) return;
  _gridEl.innerHTML = '';

  var list = filteredChecks();

  if (list.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = [
      'grid-column:1/-1;',
      'display:flex;align-items:center;justify-content:center;',
      'min-height:200px;',
      'font-family:' + T.fb + ';font-size:14px;color:' + T.mint + ';',
    ].join('');
    empty.textContent = 'All tips adjusted';
    _gridEl.appendChild(empty);
    return;
  }

  list.forEach(function(c) { _gridEl.appendChild(buildCheckCard(c)); });
}

function updateSummary() {
  if (_unadjCountEl) _unadjCountEl.textContent = getUnadjCount();
  if (_tipTotalEl) _tipTotalEl.textContent = fmt(getTipTotal());
}

// == FILTER BAR ========================================

function setFilterActive(pair, active) {
  if (active) {
    pair.inner.style.color = T.mint;
    pair.wrap.style.outline = '2px solid ' + T.mint;
    pair.wrap.style.outlineOffset = '-2px';
  } else {
    pair.inner.style.color = T.textPrimary;
    pair.wrap.style.outline = 'none';
  }
}

function makeFilterBtn(label, active, onTap) {
  var pair = buildStyledButton(T.darkBtn);
  pair.inner.textContent = label;
  pair.inner.style.fontFamily = T.fb;
  pair.inner.style.fontSize = '14px';
  pair.inner.style.padding = '4px 10px';
  pair.wrap.style.height = '30px';
  pair.wrap.addEventListener('pointerup', onTap);
  setFilterActive(pair, active);
  return pair;
}

function updateFilterStyles() {
  Object.keys(_filterEls.status).forEach(function(key) {
    setFilterActive(_filterEls.status[key], statusFilter === key);
  });
  Object.keys(_filterEls.card).forEach(function(key) {
    setFilterActive(_filterEls.card[key], cardFilter === key);
  });
  if (_filterEls.server) {
    Object.keys(_filterEls.server).forEach(function(key) {
      setFilterActive(_filterEls.server[key], serverFilter === key);
    });
  }
}

function updateAllFilters() {
  updateFilterStyles();
  renderGrid();
  updateSummary();
}

function buildFilterBar() {
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex-shrink:0;padding-bottom:8px;';

  // Row 1: Status filters
  var row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;gap:6px;';

  _filterEls.status = {};
  var statusOpts = [
    { label: 'UNADJUSTED', key: 'unadjusted' },
    { label: 'ALL', key: 'all' },
  ];
  statusOpts.forEach(function(o) {
    var pair = makeFilterBtn(o.label, statusFilter === o.key, function() {
      statusFilter = o.key;
      updateAllFilters();
    });
    row1.appendChild(pair.wrap);
    _filterEls.status[o.key] = pair;
  });
  bar.appendChild(row1);

  // Row 2: Card type filters
  var row2 = document.createElement('div');
  row2.style.cssText = 'display:flex;gap:6px;';

  _filterEls.card = {};
  var cardOpts = ['ALL', 'VISA', 'MC', 'AMEX', 'DISC'];
  cardOpts.forEach(function(label) {
    var key = label.toLowerCase();
    var pair = makeFilterBtn(label, cardFilter === key, function() {
      cardFilter = key;
      updateAllFilters();
    });
    row2.appendChild(pair.wrap);
    _filterEls.card[key] = pair;
  });
  bar.appendChild(row2);

  // Row 3: Server filter (manager mode only)
  if (_role === 'manager') {
    var row3 = document.createElement('div');
    row3.style.cssText = 'display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;';
    row3.id = 'ta-server-filter-row';
    bar.appendChild(row3);
  }

  return bar;
}

function populateServerFilter() {
  if (_role !== 'manager') return;
  var row = document.getElementById('ta-server-filter-row');
  if (!row) return;
  row.innerHTML = '';

  _filterEls.server = {};
  var servers = [{ id: 'all', name: 'ALL SERVERS' }].concat(uniqueServers());

  servers.forEach(function(s) {
    var pair = makeFilterBtn(s.name, serverFilter === s.id, function() {
      serverFilter = s.id;
      updateAllFilters();
    });
    row.appendChild(pair.wrap);
    _filterEls.server[s.id] = pair;
  });
}

// == RIGHT PANEL =======================================

function buildSummaryCard(title, valueColor) {
  var card = document.createElement('div');
  card.style.cssText = 'clip-path:' + chamfer(6) + ';overflow:hidden;';

  var hdr = document.createElement('div');
  hdr.style.cssText = [
    'background:' + T.mint + ';',
    'padding:4px 10px;',
    'font-family:' + T.fb + ';font-size:12px;color:' + T.bgDark + ';',
  ].join('');
  hdr.textContent = title;
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.style.cssText = [
    'background:' + T.bgDark + ';',
    'padding:12px 10px;',
    'text-align:center;',
  ].join('');

  var val = document.createElement('div');
  val.style.cssText = 'font-family:' + T.fb + ';font-size:32px;color:' + valueColor + ';';
  body.appendChild(val);
  card.appendChild(body);

  return { el: card, valueEl: val };
}

function buildRightPanel() {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:28%;min-width:180px;',
    'display:flex;flex-direction:column;gap:12px;',
    'flex-shrink:0;',
  ].join('');

  // Unadjusted count card
  var unadj = buildSummaryCard('UNADJUSTED', T.lime);
  unadj.valueEl.textContent = '0';
  _unadjCountEl = unadj.valueEl;
  panel.appendChild(unadj.el);

  // Tip total card
  var total = buildSummaryCard('TIP TOTAL', T.gold);
  total.valueEl.textContent = '$0.00';
  _tipTotalEl = total.valueEl;
  panel.appendChild(total.el);

  // Spacer
  var spacer = document.createElement('div');
  spacer.style.flex = '1';
  panel.appendChild(spacer);

  // SET ALL TO $0 button
  var setZeroBtn = buildButton('SET ALL TO $0', {
    fill: T.darkBtn, color: T.lime, fontSize: '16px',
    height: 40,
    onTap: function() { openSetAllZero(); },
  });
  setZeroBtn.style.width = '100%';
  setZeroBtn.style.outline = '2px solid ' + T.lime;
  setZeroBtn.style.outlineOffset = '-2px';
  panel.appendChild(setZeroBtn);

  return panel;
}

// == SCENE BUILDER =====================================

function buildScene(container, params) {
  container.style.cssText = [
    'display:flex;flex-direction:column;',
    'width:100%;height:100%;',
    'padding:' + T.scenePad + 'px;',
    'box-sizing:border-box;',
    'position:relative;',
  ].join('');

  // Filter bar
  container.appendChild(buildFilterBar());

  // Main area (grid + right panel)
  var main = document.createElement('div');
  main.style.cssText = 'display:flex;gap:12px;flex:1;min-height:0;overflow:hidden;';

  // Check grid
  _gridEl = document.createElement('div');
  _gridEl.style.cssText = [
    'flex:1;min-width:0;',
    'display:grid;',
    'grid-template-columns:repeat(3, 1fr);',
    'gap:8px;',
    'grid-auto-rows:110px;',
    'align-content:start;',
    'overflow-y:auto;',
    'scrollbar-width:none;',
  ].join('');
  // Hide scrollbar for WebKit
  if (!document.getElementById('ta-grid-style')) {
    var style = document.createElement('style');
    style.id = 'ta-grid-style';
    style.textContent = '.ta-grid::-webkit-scrollbar{display:none}';
    document.head.appendChild(style);
  }
  _gridEl.classList.add('ta-grid');
  main.appendChild(_gridEl);

  // Right panel
  main.appendChild(buildRightPanel());
  container.appendChild(main);

  // Version stamp
  var stamp = document.createElement('div');
  stamp.style.cssText = [
    'position:absolute;bottom:4px;right:8px;',
    'font-family:' + T.fb + ';font-size:9px;color:' + T.gold + ';',
    'opacity:0.35;pointer-events:none;',
  ].join('');
  stamp.textContent = 'v1.0';
  container.appendChild(stamp);

  // Fetch data
  fetchChecks(params).then(function(data) {
    checks = data;
    if (_role === 'manager') populateServerFilter();
    renderGrid();
    updateSummary();
  });
}

// == ACTIONS ===========================================

function openTipEntry(c) {
  SceneManager.interrupt('tip-entry', {
    onConfirm: function(tipAmount) {
      // POST to API
      fetch('/api/v1/tips/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_id: c.check_id, tip_amount: tipAmount }),
      }).catch(function(err) {
        console.error('[KINDpos] Tip adjust failed:', err);
      });

      // Update local data
      c.tip_amount = tipAmount;

      // Animate card out (150ms fade + collapse)
      var cardEl = _gridEl ? _gridEl.querySelector('[data-check-id="' + c.check_id + '"]') : null;
      if (cardEl) {
        cardEl.style.transition = 'opacity 150ms, transform 150ms';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'scale(0.95)';
        setTimeout(function() {
          renderGrid();
          updateSummary();
        }, 150);
      } else {
        renderGrid();
        updateSummary();
      }
    },
    onCancel: function() {},
    params: {
      check_id: c.check_id,
      check_num: c.check_num || c.check_id,
      amount: c.amount,
      time: c.time,
      card_type: c.card_type,
      last_four: c.last_four,
    },
  });
}

function openSetAllZero() {
  var unadj = getUnadjChecks();
  if (unadj.length === 0) return;

  SceneManager.interrupt('confirm-set-all-zero', {
    onConfirm: function() {
      var ids = unadj.map(function(c) { return c.check_id; });

      // POST batch
      fetch('/api/v1/tips/adjust-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_ids: ids, tip_amount: 0 }),
      }).catch(function(err) {
        console.error('[KINDpos] Batch tip adjust failed:', err);
      });

      // Update local data
      unadj.forEach(function(c) { c.tip_amount = 0; });

      renderGrid();
      updateSummary();
    },
    onCancel: function() {},
    params: { count: unadj.length },
  });
}

// == REGISTRATION - Main Scene =========================

SceneManager.register({
  name: 'tip-adjustment',

  mount: function(container, params) {
    params = params || {};
    checks = [];
    _filterEls = { status: {}, card: {}, server: {} };
    _gridEl = null;
    _unadjCountEl = null;
    _tipTotalEl = null;

    _role = params.role || 'server';
    statusFilter = params.filter || 'unadjusted';
    cardFilter = 'all';
    serverFilter = 'all';

    if (_role === 'manager') {
      _sceneName = 'Tip Adjustment: ALL SERVERS';
    } else {
      _sceneName = 'Tip Adjustment: ' + (params.employeeName || 'Server');
    }
    _params = params;

    setSceneName(_sceneName);
    setHeaderBack({
      back: true,
      x: true,
      onBack: function() { SceneManager.closeTransactional('tip-adjustment'); },
    });

    // 1-second clock interval
    _clockIv = setInterval(function() { setSceneName(_sceneName); }, 1000);

    buildScene(container, params);
  },

  unmount: function() {
    if (_clockIv) { clearInterval(_clockIv); _clockIv = null; }
    checks = [];
    _gridEl = null;
    _unadjCountEl = null;
    _tipTotalEl = null;
    _filterEls = { status: {}, card: {}, server: {} };
    _role = 'server';
    _sceneName = '';
    _params = {};
    statusFilter = 'unadjusted';
    cardFilter = 'all';
    serverFilter = 'all';
  },

  cache: false,
  timeoutMs: 0,
});

// == REGISTRATION - Tip Entry Interrupt ================

SceneManager.register({
  name: 'tip-entry',

  mount: function(container, params) {
    var tipCents = 0;
    var presetActive = false;
    var activePreset = null;

    container.style.flexDirection = 'column';
    container.style.gap = '8px';

    // Card frame (gold border)
    var card = document.createElement('div');
    card.style.cssText = [
      'background:' + T.bg + ';',
      'border:3px solid ' + T.gold + ';',
      'padding:16px 20px;',
      'max-width:420px;width:380px;',
      'clip-path:' + chamfer(10) + ';',
    ].join('');

    // Context bar
    var ctx = document.createElement('div');
    ctx.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.mint + ';margin-bottom:4px;';
    ctx.textContent = 'Check #' + params.check_num + '  \u00B7  ' + fmt(params.amount) + '  \u00B7  ' + params.time;
    card.appendChild(ctx);

    var ctx2 = document.createElement('div');
    ctx2.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.sage + ';margin-bottom:10px;';
    ctx2.textContent = params.card_type + ' \u00B7\u00B7\u00B7\u00B7' + params.last_four;
    card.appendChild(ctx2);

    // Preset buttons
    var presetRow = document.createElement('div');
    presetRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';

    var presetPairs = {};
    var presets = [
      { label: '15%', pct: 0.15 },
      { label: '18%', pct: 0.18 },
      { label: '20%', pct: 0.20 },
      { label: 'CUSTOM', pct: null },
    ];

    function updatePresetStyles() {
      Object.keys(presetPairs).forEach(function(key) {
        var pp = presetPairs[key];
        if (activePreset === key) {
          pp.inner.style.color = T.mint;
          pp.wrap.style.outline = '2px solid ' + T.mint;
          pp.wrap.style.outlineOffset = '-2px';
        } else {
          pp.inner.style.color = T.textPrimary;
          pp.wrap.style.outline = 'none';
        }
      });
    }

    function updateDisplay() {
      displayWrap.textContent = '$' + (tipCents / 100).toFixed(2);
    }

    presets.forEach(function(p) {
      var pair = buildStyledButton(T.darkBtn);
      pair.wrap.style.height = '34px';
      pair.wrap.style.flex = '1';
      pair.inner.style.fontFamily = T.fb;
      pair.inner.style.fontSize = '14px';
      pair.inner.style.color = T.textPrimary;
      pair.inner.textContent = p.label;

      pair.wrap.addEventListener('pointerup', function() {
        if (p.pct != null) {
          tipCents = Math.round(params.amount * p.pct * 100);
          presetActive = true;
          activePreset = p.label;
        } else {
          tipCents = 0;
          presetActive = false;
          activePreset = 'CUSTOM';
        }
        updatePresetStyles();
        updateDisplay();
      });

      presetPairs[p.label] = pair;
      presetRow.appendChild(pair.wrap);
    });
    card.appendChild(presetRow);

    // Tip amount display
    var displayWrap = document.createElement('div');
    displayWrap.style.cssText = [
      'background:' + T.bgDark + ';',
      'padding:8px;',
      'text-align:center;',
      'font-family:' + T.fb + ';font-size:28px;color:' + T.gold + ';',
      'clip-path:' + chamfer(4) + ';',
      'margin-bottom:6px;',
      'height:44px;display:flex;align-items:center;justify-content:center;',
    ].join('');
    displayWrap.textContent = '$0.00';
    card.appendChild(displayWrap);

    // Numpad keys (custom build for preset support)
    var keyGrid = document.createElement('div');
    keyGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;margin-bottom:8px;';

    var keys = ['1','2','3','4','5','6','7','8','9','CLR','0','>>>'];
    keys.forEach(function(key) {
      var pair = buildStyledButton(T.darkBtn);
      pair.wrap.style.height = '48px';
      pair.inner.style.fontFamily = key.match(/\d/) ? T.fh : T.fb;
      pair.inner.style.fontSize = key.match(/\d/) ? '24px' : '18px';
      pair.inner.style.color = key === 'CLR' ? T.mint : key === '>>>' ? T.mint : T.gold;
      pair.inner.textContent = key;

      if (key.match(/\d/)) {
        pair.wrap.addEventListener('pointerup', function() {
          if (presetActive) {
            tipCents = parseInt(key);
            presetActive = false;
            activePreset = 'CUSTOM';
          } else {
            if (tipCents > 99999) return;
            tipCents = tipCents * 10 + parseInt(key);
          }
          updateDisplay();
          updatePresetStyles();
        });
      } else if (key === 'CLR') {
        var _timer = null;
        var _fired = false;
        pair.wrap.addEventListener('pointerdown', function() {
          _fired = false;
          _timer = setTimeout(function() {
            _fired = true;
            tipCents = 0;
            presetActive = false;
            activePreset = null;
            updateDisplay();
            updatePresetStyles();
          }, 500);
        });
        pair.wrap.addEventListener('pointerup', function() {
          if (_timer) { clearTimeout(_timer); _timer = null; }
          if (!_fired) {
            tipCents = Math.floor(tipCents / 10);
            if (presetActive) { presetActive = false; activePreset = null; }
            updateDisplay();
            updatePresetStyles();
          }
        });
        pair.wrap.addEventListener('pointercancel', function() {
          if (_timer) { clearTimeout(_timer); _timer = null; }
        });
      } else if (key === '>>>') {
        pair.wrap.addEventListener('pointerup', function() {
          params.onConfirm(tipCents / 100);
        });
      }

      keyGrid.appendChild(pair.wrap);
    });
    card.appendChild(keyGrid);

    // Action buttons
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:12px;justify-content:space-between;';

    actions.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px',
      height: 38, width: 140,
      onTap: function() { params.onCancel(); },
    }));

    actions.appendChild(buildButton('CONFIRM', {
      fill: T.green, color: T.gold, fontSize: '16px',
      height: 38, width: 140,
      onTap: function() { params.onConfirm(tipCents / 100); },
    }));

    card.appendChild(actions);
    container.appendChild(card);
  },

  unmount: function() {},
});

// == REGISTRATION - Set All Zero Interrupt =============

SceneManager.register({
  name: 'confirm-set-all-zero',

  mount: function(container, params) {
    container.style.flexDirection = 'column';
    container.style.gap = '16px';

    var card = document.createElement('div');
    card.style.cssText = [
      'background:' + T.bg + ';',
      'border:3px solid ' + T.vermillion + ';',
      'padding:24px 32px;',
      'text-align:center;',
      'max-width:400px;',
      'clip-path:' + chamfer(10) + ';',
    ].join('');

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';margin-bottom:6px;';
    msg.textContent = 'Set ' + params.count + ' unadjusted tips to $0?';
    card.appendChild(msg);

    var warn = document.createElement('div');
    warn.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.subtleText + ';margin-bottom:16px;';
    warn.textContent = 'This cannot be undone.';
    card.appendChild(warn);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';

    btns.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: '16px',
      width: 120, height: 40,
      onTap: function() { params.onCancel(); },
    }));

    btns.appendChild(buildButton('CONFIRM', {
      fill: T.vermillion, color: T.embVermLabel, fontSize: '16px',
      width: 120, height: 40,
      onTap: function() { params.onConfirm(); },
    }));

    card.appendChild(btns);
    container.appendChild(card);
  },

  unmount: function() {},
});
