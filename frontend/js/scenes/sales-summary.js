// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Sales Summary Scene
//  Read-only sales overview for current shift
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { registerScene, pop } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var PAD   = 16;
var GAP   = 12;
var BTN_H = 50;
var API   = '/api/v1';

function fmt(n) {
  return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// ═══════════════════════════════════════════════════
//  SCENE
// ═══════════════════════════════════════════════════

registerScene('sales-summary', {
  onEnter: function(el, params) {
    var role = params.role || 'server';

    setSceneName('Sales Summary');
    setHeaderBack({ back: true });

    el.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;flex-direction:column;',
      'padding:' + PAD + 'px;gap:' + GAP + 'px;',
      'box-sizing:border-box;',
    ].join('');

    // ── Title bar ──
    var titleBar = document.createElement('div');
    titleBar.style.cssText = [
      'display:flex;justify-content:space-between;align-items:center;',
      'padding:10px 14px;flex-shrink:0;',
      'background:' + T.bg4 + ';',
      'border:2px solid ' + T.bgLight + ';',
      'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
    ].join('');

    var titleLabel = document.createElement('span');
    titleLabel.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.dimText + ';letter-spacing:0.1em;';
    titleLabel.textContent = 'SALES SUMMARY';

    var roleLabel = document.createElement('span');
    roleLabel.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.gold + ';letter-spacing:0.06em;';
    roleLabel.textContent = role === 'manager' ? 'ALL SERVERS' : 'YOUR SALES';

    titleBar.appendChild(titleLabel);
    titleBar.appendChild(roleLabel);
    el.appendChild(titleBar);

    // ── Content area (populated after fetch) ──
    var grid = document.createElement('div');
    grid.style.cssText = [
      'flex:1;',
      'display:grid;grid-template-columns:1fr 1fr;',
      'gap:' + GAP + 'px;',
      'overflow-y:auto;',
    ].join('');

    // Loading indicator
    var loading = document.createElement('div');
    loading.style.cssText = [
      'grid-column:1/3;display:flex;align-items:center;justify-content:center;',
      'font-family:' + T.fb + ';font-size:24px;color:' + T.dimText + ';',
    ].join('');
    loading.textContent = 'Loading...';
    grid.appendChild(loading);
    el.appendChild(grid);

    // ── Back button ──
    var backBtn = buildButton('\u2190 BACK', {
      fill: T.darkBtn, color: T.mint, fontSize: '28px',
      height: BTN_H,
      onTap: function() { pop(); },
    });
    el.appendChild(backBtn);

    // ── Fetch from API ──
    var url = API + '/reporting/sales-summary?date=' + todayStr();
    if (role !== 'manager' && params.employeeId) {
      url += '&server_id=' + encodeURIComponent(params.employeeId);
    }

    fetch(url)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        grid.innerHTML = '';
        renderStats(grid, data, role);
      })
      .catch(function(err) {
        console.error('[KINDpos] Sales summary fetch failed:', err);
        grid.innerHTML = '';
        var errMsg = document.createElement('div');
        errMsg.style.cssText = [
          'grid-column:1/3;display:flex;align-items:center;justify-content:center;',
          'font-family:' + T.fb + ';font-size:20px;color:' + T.red + ';',
        ].join('');
        errMsg.textContent = 'Failed to load sales data';
        grid.appendChild(errMsg);
      });
  },
  onExit: function() {},
  cache: false,
  timeoutMs: 0,
});

// ═══════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════

function renderStats(grid, data, role) {
  var net      = data.net_sales || 0;
  var checks   = data.total_checks || 0;
  var avgCheck = data.check_avg || 0;
  var cash     = data.cash_total || 0;
  var card     = data.card_total || 0;
  var tips     = data.tips_collected || data.total_tips || 0;

  // Left column — Sales breakdown
  var salesRows = [
    { label: 'Net Sales',     value: fmt(net), color: T.gold, big: true },
    { label: 'Total Checks',  value: '' + checks, color: T.mint },
    { label: 'Avg Check',     value: fmt(avgCheck), color: T.dimText },
  ];

  if (role !== 'manager' && data.total_guests != null) {
    salesRows.push({ label: 'Guests',  value: '' + data.total_guests, color: T.mint });
    salesRows.push({ label: 'Tables',  value: '' + data.total_tables, color: T.dimText });
  }

  grid.appendChild(buildSection('SALES', salesRows));

  // Right column — Payment breakdown
  var payRows = [
    { label: 'Cash',   value: fmt(cash), color: T.mint },
    { label: 'Card',   value: fmt(card), color: T.gold },
  ];

  if (tips > 0) {
    payRows.push({ label: 'Tips', value: fmt(tips), color: T.gold, big: true });
  }
  if (data.tipout_amount != null) {
    payRows.push({ label: 'Tipout', value: '-' + fmt(data.tipout_amount), color: T.red });
  }
  if (data.take_home != null) {
    payRows.push({ label: 'Take Home', value: fmt(data.take_home), color: T.mint, big: true });
  }

  grid.appendChild(buildSection('PAYMENTS', payRows));
}

// ═══════════════════════════════════════════════════
//  SECTION BUILDER
// ═══════════════════════════════════════════════════

function buildSection(title, rows) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'display:flex;flex-direction:column;',
    'background:' + T.bgDark + ';',
    'border:2px solid ' + T.bgLight + ';',
    'box-shadow:inset 2px 2px 0 #151515,inset -2px -2px 0 #5a5a5a;',
  ].join('');

  // Header
  var header = document.createElement('div');
  header.style.cssText = [
    'padding:8px 14px;',
    'border-bottom:2px solid ' + T.bgLight + ';',
    'background:' + T.bg4 + ';',
    'font-family:' + T.fb + ';font-size:14px;color:' + T.dimText + ';',
    'letter-spacing:0.12em;',
  ].join('');
  header.textContent = title;
  panel.appendChild(header);

  // Rows
  var body = document.createElement('div');
  body.style.cssText = 'padding:10px 14px;display:flex;flex-direction:column;gap:6px;';

  rows.forEach(function(r) {
    var row = document.createElement('div');
    var fontSize = r.big ? '22px' : '18px';
    row.style.cssText = [
      'display:flex;justify-content:space-between;align-items:baseline;',
      'font-family:' + T.fb + ';font-size:' + fontSize + ';',
      'padding:' + (r.big ? '6px 0' : '2px 0') + ';',
    ].join('');

    if (r.big) {
      row.style.borderTop = '1px solid ' + T.bgLight;
      row.style.marginTop = '4px';
      row.style.paddingTop = '8px';
    }

    var label = document.createElement('span');
    label.style.color = T.dimText;
    label.textContent = r.label;

    var value = document.createElement('span');
    value.style.color = r.color || T.mint;
    value.textContent = r.value;

    row.appendChild(label);
    row.appendChild(value);
    body.appendChild(row);
  });

  panel.appendChild(body);
  return panel;
}
