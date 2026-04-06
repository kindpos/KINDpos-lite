// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Sales Summary Scene
//  Read-only sales overview for current shift
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton } from '../tokens.js';
import { buildButton } from '../components.js';
import { registerScene, pop } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var PAD   = 16;
var GAP   = 12;
var BTN_H = 50;

// ── Mock stats — replace with API call ──────────
function getStats(role) {
  if (role === 'manager') {
    return {
      grossSales:   4812.00,
      voids:        135.00,
      comps:         57.00,
      discounts:     12.00,
      netSales:     4608.00,
      taxCollected:  322.56,
      cashSales:    1240.00,
      cashCount:    18,
      cardSales:    3368.00,
      cardCount:    29,
      totalChecks:  47,
      avgCheck:     102.38,
      totalTips:    487.25,
    };
  }
  return {
    grossSales:   1320.00,
    voids:         72.50,
    comps:          0.00,
    discounts:      0.00,
    netSales:     1247.50,
    taxCollected:   87.33,
    cashSales:     380.00,
    cashCount:      5,
    cardSales:     867.50,
    cardCount:     11,
    totalChecks:   16,
    avgCheck:       77.97,
    totalTips:    145.50,
  };
}

function fmt(n) {
  return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ═══════════════════════════════════════════════════
//  SCENE
// ═══════════════════════════════════════════════════

registerScene('sales-summary', {
  onEnter: function(el, params) {
    var role  = params.role || 'server';
    var stats = getStats(role);

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

    // ── Stats grid ──
    var grid = document.createElement('div');
    grid.style.cssText = [
      'flex:1;',
      'display:grid;grid-template-columns:1fr 1fr;',
      'gap:' + GAP + 'px;',
      'overflow-y:auto;',
    ].join('');

    // Left column — Sales breakdown
    grid.appendChild(buildSection('SALES', [
      { label: 'Gross Sales',    value: fmt(stats.grossSales), color: T.mint },
      { label: 'Voids',          value: '-' + fmt(stats.voids), color: T.red },
      { label: 'Comps',          value: '-' + fmt(stats.comps), color: T.red },
      { label: 'Discounts',      value: '-' + fmt(stats.discounts), color: T.red },
      { label: 'Net Sales',      value: fmt(stats.netSales), color: T.gold, big: true },
      { label: 'Tax Collected',  value: fmt(stats.taxCollected), color: T.dimText },
    ]));

    // Right column — Payment breakdown
    grid.appendChild(buildSection('PAYMENTS', [
      { label: 'Cash (' + stats.cashCount + ')',  value: fmt(stats.cashSales), color: T.mint },
      { label: 'Card (' + stats.cardCount + ')',  value: fmt(stats.cardSales), color: T.gold },
      { label: 'Total Checks',                    value: '' + stats.totalChecks, color: T.mint },
      { label: 'Avg Check',                       value: fmt(stats.avgCheck), color: T.dimText },
      { label: 'Total Tips',                      value: fmt(stats.totalTips), color: T.gold, big: true },
    ]));

    el.appendChild(grid);

    // ── Back button ──
    var backBtn = buildButton('\u2190 BACK', {
      fill: T.bgLight, color: T.mint, fontSize: '28px',
      height: BTN_H,
      onTap: function() { pop(); },
    });
    el.appendChild(backBtn);
  },
  cache: false,
  timeoutMs: 0,
});

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
