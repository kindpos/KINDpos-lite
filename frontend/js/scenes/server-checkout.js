// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Server Checkout Scene
//  Receipt preview left | 6 accordion cards middle | Alert + buttons right
//  Two blockers: open checks + unadjusted tips
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { registerScene, push, pop, overlay, dismissOverlay, interrupt, resolveInterrupt, cancelInterrupt } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── Layout ────────────────────────────────────────
var RECEIPT_W   = 290;
var CARDS_W     = 472;
var RIGHT_W     = 250;
var COL_GAP     = 13;
var SCENE_PAD   = 13;
var CARD_H      = 82;       // collapsed card height
var CARD_GAP    = 6;
var PRINT_H     = 84;
var FINALIZE_H  = 100;

// ── Scene state — reset in onExit ────────────────
var _state         = null;
var _openCardBody  = null;  // currently expanded card body element
var _openChevron   = null;  // chevron span of the open card
var _finalizeWrap  = null;  // finalize button wrapper (for state update)
var _alertContent  = null;  // alert panel inner content (for state update)
var _receiptScroll = null;  // receipt scrollable area (for state update)
var _cardsCol      = null;  // cards column el (for rebuild after adjust)

// ─────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function isBlocked(state) {
  return state.openChecks > 0 || state.unadjustedTips > 0;
}

function recalcTipOut(state) {
  var total = 0;
  state.tipOutRoles.forEach(function(r) {
    var basis = r.basis === 'Liquor Sales' ? state.liquorSales : state.netSales;
    r.basisAmt = basis;
    r.amount   = parseFloat((basis * r.percent / 100).toFixed(2));
    total += r.amount;
  });
  if (state.oneTimeRole && state.oneTimeRole.percent > 0) {
    var otb = state.oneTimeRole.basis === 'Liquor Sales' ? state.liquorSales : state.netSales;
    state.oneTimeRole.basisAmt = otb;
    state.oneTimeRole.amount   = parseFloat((otb * state.oneTimeRole.percent / 100).toFixed(2));
    total += state.oneTimeRole.amount;
  }
  state.tipOutTotal = parseFloat(total.toFixed(2));
  state.takeHome    = parseFloat((state.cardTips - state.tipOutTotal).toFixed(2));
}

// ─────────────────────────────────────────────────
//  MOCK STATE — replace with API call
// ─────────────────────────────────────────────────

function buildMockState(params) {
  var netSales    = 151.50;
  var liquorSales =  42.00;
  var cashSales   =  55.00;
  var cardSales   =  96.50;
  var cardTips    =  28.00;

  var state = {
    employeeId:    params.employeeId   || 'EMP-001',
    employeeName:  params.employeeName || 'Server',
    date: (function() {
      var d = new Date();
      return (d.getMonth()+1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2);
    })(),
    netSales:      netSales,
    liquorSales:   liquorSales,
    cashSales:     cashSales,
    cardSales:     cardSales,
    totalChecks:   4,
    avgCheck:      37.88,
    openChecks:    1,          // set to 0 for clean state
    cardTips:      cardTips,
    unadjustedTips: 3,         // set to 0 for clean state
    tipOutRoles: [
      { label: 'Barback', percent: 2, basis: 'Liquor Sales', basisAmt: liquorSales, amount: 0.84 },
      { label: 'Busser',  percent: 2, basis: 'Net Sales',    basisAmt: netSales,    amount: 3.03 },
    ],
    oneTimeRole: null,         // { label, percent, basis, basisAmt, amount } or null
    tipOutTotal: 3.87,
    takeHome:    24.13,
    cashReceived: cashSales,
    cashExpected: parseFloat((cashSales - cardTips).toFixed(2)),
  };

  recalcTipOut(state);
  return state;
}

// ─────────────────────────────────────────────────
//  RECEIPT PANEL (left)
// ─────────────────────────────────────────────────

function buildReceiptContent(state) {
  var BASE   = '30px';
  var HEADER = '32px';
  var SMALL  = '20px';
  var COL    = '#1a1a1a';
  var DIM    = '#447744';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 14px;font-family:' + T.fb + ';color:' + COL + ';display:flex;flex-direction:column;gap:0;';

  // Section header (full-width bold label)
  function sectionHeader(text) {
    var el = document.createElement('div');
    el.style.cssText = 'font-size:' + HEADER + ';font-weight:bold;margin-top:8px;margin-bottom:2px;';
    el.textContent = text;
    return el;
  }

  // Two-column data row: label left, value right
  function row(label, value) {
    var el = document.createElement('div');
    el.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-size:' + BASE + ';padding:1px 0;';
    var l = document.createElement('span');
    l.textContent = label;
    var v = document.createElement('span');
    v.style.fontWeight = 'bold';
    v.textContent = value;
    el.appendChild(l);
    el.appendChild(v);
    return el;
  }

  // Divider line
  function divider() {
    var el = document.createElement('div');
    el.style.cssText = 'border-top:1px dashed ' + DIM + ';margin:6px 0;';
    return el;
  }

  // Top identity block
  var id = document.createElement('div');
  id.style.cssText = 'text-align:center;margin-bottom:8px;';
  var r1 = document.createElement('div');
  r1.style.cssText = 'font-size:' + HEADER + ';font-weight:bold;';
  r1.textContent = 'KINDpos Restaurant';
  var r2 = document.createElement('div');
  r2.style.cssText = 'font-size:' + BASE + ';font-weight:bold;';
  r2.textContent = 'SERVER CHECKOUT';
  id.appendChild(r1);
  id.appendChild(r2);
  wrap.appendChild(id);

  wrap.appendChild(row('Server:', state.employeeName));
  wrap.appendChild(row('Date:', state.date));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('SALES SUMMARY'));
  wrap.appendChild(row('Net Sales', fmt(state.netSales)));
  wrap.appendChild(row('Liquor Sales', fmt(state.liquorSales)));
  wrap.appendChild(row('Cash Sales', fmt(state.cashSales)));
  wrap.appendChild(row('Card Sales', fmt(state.cardSales)));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('CHECK STATS'));
  wrap.appendChild(row('Total Checks', String(state.totalChecks)));
  wrap.appendChild(row('Average Check', fmt(state.avgCheck)));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('TIPS'));
  wrap.appendChild(row('Card Tips', fmt(state.cardTips)));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('TIP-OUT'));
  state.tipOutRoles.forEach(function(r) {
    wrap.appendChild(row(r.label + ' ' + r.percent + '% ' + r.basis, fmt(r.amount)));
  });
  if (state.oneTimeRole && state.oneTimeRole.percent > 0) {
    var ot = state.oneTimeRole;
    wrap.appendChild(row((ot.label || 'One-Time') + ' ' + ot.percent + '%', fmt(ot.amount)));
  }
  wrap.appendChild(row('Tip-Out Total', fmt(state.tipOutTotal)));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('TAKE-HOME'));
  wrap.appendChild(row('Card Tips', fmt(state.cardTips)));
  wrap.appendChild(row('Tip-Out', '− ' + fmt(state.tipOutTotal)));
  wrap.appendChild(row('Take-Home', fmt(state.takeHome)));
  wrap.appendChild(divider());

  wrap.appendChild(sectionHeader('CASH EXPECTED'));
  wrap.appendChild(row('Cash Received', fmt(state.cashReceived)));
  wrap.appendChild(row('Card Tips Owed', '− ' + fmt(state.cardTips)));
  wrap.appendChild(row('Cash Expected', fmt(state.cashExpected)));
  wrap.appendChild(divider());

  var footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;margin-top:6px;font-size:' + SMALL + ';color:#555;';
  footer.innerHTML = 'Terminal: T-001<br>** CONFIDENTIAL **';
  wrap.appendChild(footer);

  return wrap;
}



function buildReceiptPanel(state) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:' + RECEIPT_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'background:#c8f0b8;',
    'border-right:4px solid #a0d898;',
    'overflow:hidden;',
  ].join('');

  // Header label
  var header = document.createElement('div');
  header.style.cssText = [
    'flex-shrink:0;padding:6px 12px;',
    'background:#a0d898;',
    'font-family:' + T.fb + ';font-size:11px;color:#1a1a1a;',
    'letter-spacing:0.1em;text-align:center;',
  ].join('');
  header.textContent = 'PRINT PREVIEW';
  panel.appendChild(header);

  // Scrollable receipt content
  _receiptScroll = document.createElement('div');
  _receiptScroll.style.cssText = 'flex:1;overflow-y:auto;';
  _receiptScroll.appendChild(buildReceiptContent(state));
  panel.appendChild(_receiptScroll);

  return panel;
}

// ─────────────────────────────────────────────────
//  ACCORDION CARDS (middle)
// ─────────────────────────────────────────────────

function collapseOpenCard() {
  if (_openCardBody) {
    _openCardBody.style.display = 'none';
    _openCardBody = null;
  }
  if (_openChevron) {
    _openChevron.textContent = '›';
    _openChevron = null;
  }
}

function buildCardShell(opts) {
  // opts: { accent, border, bg, bgHot, index }
  var wrap = document.createElement('div');
  wrap.style.cssText = [
    'flex-shrink:0;',
    'border:2px solid ' + (opts.border || '#444') + ';',
    'background:' + (opts.bg || T.bgDark) + ';',
    'display:flex;flex-direction:column;',
    'overflow:hidden;',
  ].join('');

  // Left accent bar
  var accent = document.createElement('div');
  accent.style.cssText = [
    'position:absolute;left:0;top:0;bottom:0;width:6px;',
    'background:' + (opts.accent || T.mint) + ';',
  ].join('');

  return { wrap: wrap, accent: accent };
}

// Header row — always visible, tappable
function buildCardHeader(opts) {
  // opts: { index, title, accent, value, subtext, statusColor, onToggle }
  var header = document.createElement('div');
  header.style.cssText = [
    'position:relative;',
    'height:' + CARD_H + 'px;',
    'flex-shrink:0;',
    'display:flex;align-items:center;',
    'padding:0 14px 0 20px;',
    'cursor:pointer;user-select:none;-webkit-user-select:none;',
    'gap:10px;',
  ].join('');

  // Accent bar
  var accentBar = document.createElement('div');
  accentBar.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:6px;background:' + (opts.accent || T.mint) + ';';
  header.appendChild(accentBar);

  // Index number
  var num = document.createElement('div');
  num.style.cssText = 'font-family:' + T.fb + ';font-size:11px;color:#555;flex-shrink:0;width:18px;';
  num.textContent = String(opts.index).padStart(2, '0');
  header.appendChild(num);

  // Title + sub
  var titleWrap = document.createElement('div');
  titleWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0;';

  var titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:' + T.fb + ';font-size:15px;color:' + T.mint + ';font-weight:bold;';
  titleEl.textContent = opts.title || '';
  titleWrap.appendChild(titleEl);

  if (opts.subtext) {
    var sub = document.createElement('div');
    sub.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    sub.textContent = opts.subtext;
    titleWrap.appendChild(sub);
  }

  header.appendChild(titleWrap);

  // Right: value + status dot + chevron
  var rightWrap = document.createElement('div');
  rightWrap.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';

  if (opts.value != null) {
    var val = document.createElement('div');
    val.style.cssText = 'font-family:' + T.fb + ';font-size:' + (opts.valueLarge ? '22px' : '15px') + ';color:' + T.gold + ';font-weight:bold;text-align:right;';
    val.textContent = opts.value;
    rightWrap.appendChild(val);
  }

  // Status dot
  var dot = document.createElement('div');
  dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + (opts.statusColor || T.mint) + ';opacity:' + (opts.statusColor ? '1' : '0.5') + ';flex-shrink:0;';
  rightWrap.appendChild(dot);

  // Chevron
  var chevron = document.createElement('div');
  chevron.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:#555;flex-shrink:0;width:14px;';
  chevron.textContent = '›';
  rightWrap.appendChild(chevron);

  header.appendChild(rightWrap);

  // Press animation
  header.addEventListener('pointerdown', function() {
    header.style.background = 'rgba(255,255,255,0.03)';
  });
  header.addEventListener('pointerleave', function() {
    header.style.background = '';
  });
  header.addEventListener('pointerup', function() {
    header.style.background = '';
    if (opts.onToggle) opts.onToggle(chevron);
  });

  return { el: header, chevron: chevron };
}

// Card body container
function buildCardBody() {
  var body = document.createElement('div');
  body.style.cssText = [
    'display:none;',
    'border-top:1px solid #333;',
    'background:' + T.bgDark + ';',
    'padding:14px 20px;',
    'flex-direction:column;gap:8px;',
  ].join('');
  return body;
}

// Generic info row inside card body
function bodyRow(label, value, valueColor) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-family:' + T.fb + ';';

  var lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:13px;color:#888;';
  lbl.textContent = label;

  var val = document.createElement('span');
  val.style.cssText = 'font-size:14px;color:' + (valueColor || T.gold) + ';font-weight:bold;';
  val.textContent = value;

  row.appendChild(lbl);
  row.appendChild(val);
  return row;
}

// Inline jump button
function buildJumpButton(label, fill, textColor, onTap) {
  var pair = buildStyledButton(fill);
  pair.wrap.style.width = '100%';
  pair.wrap.style.height = '36px';
  pair.wrap.style.marginTop = '6px';
  pair.inner.style.fontFamily = T.fb;
  pair.inner.style.fontSize = '13px';
  pair.inner.style.color = textColor;
  pair.inner.textContent = label;
  pair.wrap.addEventListener('pointerup', onTap);
  return pair.wrap;
}

// ── Toggle helper used by all cards ──────────────
function makeToggle(body) {
  return function(chevron) {
    if (body.style.display === 'none' || body.style.display === '') {
      if (body.style.display === '') {
        // Already open — close it
        body.style.display = 'none';
        chevron.textContent = '›';
        _openCardBody = null;
        _openChevron = null;
        return;
      }
    }
    // Close previously open card
    collapseOpenCard();
    // Open this one
    body.style.display = 'flex';
    chevron.textContent = '▾';
    _openCardBody = body;
    _openChevron = chevron;
  };
}

// ─────────────────────────────────────────────────
//  CARD 01 — Sales Summary
// ─────────────────────────────────────────────────

function buildCard01(state) {
  var body = buildCardBody();
  var toggle = makeToggle(body);

  var h = buildCardHeader({
    index: 1, title: 'Sales Summary',
    subtext: 'Net / Liquor / Cash / Card',
    value: fmt(state.netSales),
    accent: T.mint, statusColor: null,
    onToggle: toggle,
  });

  body.style.display = 'none';
  body.appendChild(bodyRow('Net Sales',     fmt(state.netSales)));
  body.appendChild(bodyRow('Liquor Sales',  fmt(state.liquorSales)));
  body.appendChild(bodyRow('Cash Sales',    fmt(state.cashSales)));
  body.appendChild(bodyRow('Card Sales',    fmt(state.cardSales)));

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid #444;background:' + T.bgDark + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 02 — Check Stats  (RED if open checks)
// ─────────────────────────────────────────────────

function buildCard02(state, sceneEl) {
  var blocked = state.openChecks > 0;
  var body = buildCardBody();
  var toggle = makeToggle(body);

  var borderColor  = blocked ? T.red    : '#444';
  var accentColor  = blocked ? T.red    : T.mint;
  var bgColor      = blocked ? '#1a0a0a' : T.bgDark;
  var statusColor  = blocked ? T.red    : null;
  var subtext      = blocked
    ? '⚠  ' + state.openChecks + ' open check' + (state.openChecks > 1 ? 's' : '') + ' — must close'
    : state.totalChecks + ' checks · ' + fmt(state.avgCheck) + ' avg';

  var h = buildCardHeader({
    index: 2, title: 'Check Stats',
    subtext: subtext,
    value: fmt(state.avgCheck),
    accent: accentColor, statusColor: statusColor,
    onToggle: toggle,
  });

  // Override subtext color if blocked
  if (blocked) {
    var subEl = h.el.querySelectorAll('div')[2];
    if (subEl) subEl.style.color = T.red;
  }

  body.style.display = 'none';
  body.appendChild(bodyRow('Total Checks', String(state.totalChecks), T.mint));
  body.appendChild(bodyRow('Avg Check',    fmt(state.avgCheck)));

  if (blocked) {
    body.appendChild(buildJumpButton(
      '→ Open Checks', T.red, '#fff',
      function() {
        // TODO: push('order-entry') or open checks scene when available
        console.log('[CHECKOUT] Navigate to open checks — stub');
      }
    ));
  }

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + borderColor + ';background:' + bgColor + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 03 — Tips Received  (YELLOW if unadjusted)
// ─────────────────────────────────────────────────

function buildCard03(state) {
  var blocked = state.unadjustedTips > 0;
  var body = buildCardBody();
  var toggle = makeToggle(body);

  var borderColor = blocked ? T.yellow  : '#444';
  var accentColor = blocked ? T.yellow  : T.gold;
  var bgColor     = blocked ? '#1a1400' : T.bgDark;
  var statusColor = blocked ? T.yellow  : null;
  var subtext     = blocked
    ? '⚠  ' + state.unadjustedTips + ' unadjusted — adjust or enter $0.00'
    : 'Card tips this shift';

  var h = buildCardHeader({
    index: 3, title: 'Tips Received',
    subtext: subtext,
    value: fmt(state.cardTips),
    accent: accentColor, statusColor: statusColor,
    onToggle: toggle,
  });

  if (blocked) {
    var subEl = h.el.querySelectorAll('div')[2];
    if (subEl) subEl.style.color = T.yellow;
  }

  body.style.display = 'none';
  body.appendChild(bodyRow('Card Tips', fmt(state.cardTips), blocked ? T.yellow : T.gold));

  if (blocked) {
    body.appendChild(buildJumpButton(
      '→ Tip Adjustment  (' + state.unadjustedTips + ' remaining)',
      T.bgDark, T.yellow,
      function() {
        // Return here after adjustment via pop()
        push('tip-adjustment', {
          employeeId:   state.employeeId,
          employeeName: state.employeeName,
          role: 'server',
        });
      }
    ));
    // Add yellow border to jump button
  }

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + borderColor + ';background:' + bgColor + ';display:flex;flex-direction:column;';
  if (blocked) {
    // Yellow border override on jump button
    var jBtn = body.querySelector('[style]');
  }
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 04 — Tip-Out
// ─────────────────────────────────────────────────

function buildCard04(state) {
  var body = buildCardBody();
  var toggle = makeToggle(body);

  var roleNames = state.tipOutRoles.map(function(r) { return r.label; }).join(' / ');

  var h = buildCardHeader({
    index: 4, title: 'Tip-Out',
    subtext: roleNames,
    value: fmt(state.tipOutTotal),
    accent: T.gold, statusColor: null,
    onToggle: toggle,
  });

  body.style.display = 'none';

  state.tipOutRoles.forEach(function(r) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;font-family:' + T.fb + ';font-size:13px;';

    var nameEl = document.createElement('span');
    nameEl.style.cssText = 'color:#e0e0e0;min-width:60px;';
    nameEl.textContent = r.label;

    var dash = document.createElement('span');
    dash.style.cssText = 'color:#555;';
    dash.textContent = '–';

    // Percent badge
    var badge = document.createElement('div');
    badge.style.cssText = 'border:2px solid ' + T.gold + ';padding:2px 8px;font-family:' + T.fb + ';font-size:12px;color:' + T.gold + ';min-width:36px;text-align:center;';
    badge.textContent = r.percent + '%';

    var basisEl = document.createElement('span');
    basisEl.style.cssText = 'color:#888;flex:1;';
    basisEl.textContent = r.basis;

    var amtEl = document.createElement('span');
    amtEl.style.cssText = 'color:' + T.mint + ';margin-left:auto;';
    amtEl.textContent = fmt(r.amount);

    row.appendChild(nameEl);
    row.appendChild(dash);
    row.appendChild(badge);
    row.appendChild(basisEl);
    row.appendChild(amtEl);
    body.appendChild(row);
  });

  // One-time role if set
  if (state.oneTimeRole && state.oneTimeRole.percent > 0) {
    var ot = state.oneTimeRole;
    var otRow = document.createElement('div');
    otRow.style.cssText = 'display:flex;align-items:center;gap:8px;font-family:' + T.fb + ';font-size:13px;';
    otRow.innerHTML =
      '<span style="color:#e0e0e0;min-width:60px;">' + (ot.label || 'One-Time') + '</span>' +
      '<span style="color:#555;">–</span>' +
      '<div style="border:2px solid ' + T.gold + ';padding:2px 8px;font-family:' + T.fb + ';font-size:12px;color:' + T.gold + ';min-width:36px;text-align:center;">' + ot.percent + '%</div>' +
      '<span style="color:#888;flex:1;">' + ot.basis + '</span>' +
      '<span style="color:' + T.mint + ';margin-left:auto;">' + fmt(ot.amount) + '</span>';
    body.appendChild(otRow);
  }

  // Divider
  var div = document.createElement('div');
  div.style.cssText = 'border-top:1px solid #333;margin:6px 0;';
  body.appendChild(div);

  // Total row
  body.appendChild(bodyRow('Total Tip-Out', fmt(state.tipOutTotal)));

  // Adjust % button
  body.appendChild(buildJumpButton('Adjust %', T.gold, '#1a1a1a', function() {
    openAdjustOverlay(state);
  }));

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid #555;background:' + T.bgDark + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 05 — Take-Home  (hero number)
// ─────────────────────────────────────────────────

function buildCard05(state) {
  var body = buildCardBody();
  var toggle = makeToggle(body);

  var h = buildCardHeader({
    index: 5, title: 'Take-Home',
    subtext: 'Card Tips − Tip-Out',
    value: fmt(state.takeHome),
    valueLarge: true,
    accent: T.gold, statusColor: null,
    onToggle: toggle,
  });

  body.style.display = 'none';
  body.appendChild(bodyRow('Card Tips',  fmt(state.cardTips)));
  body.appendChild(bodyRow('Tip-Out',    '− ' + fmt(state.tipOutTotal), T.red));

  var divEl = document.createElement('div');
  divEl.style.cssText = 'border-top:1px solid #444;margin:4px 0;';
  body.appendChild(divEl);

  body.appendChild(bodyRow('Take-Home', fmt(state.takeHome), T.gold));

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + T.gold + ';background:#1f1a0a;display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 06 — Cash Expected
// ─────────────────────────────────────────────────

function buildCard06(state) {
  var body = buildCardBody();
  var toggle = makeToggle(body);

  var h = buildCardHeader({
    index: 6, title: 'Cash Expected',
    subtext: 'Cash Received − Card Tips',
    value: fmt(state.cashExpected),
    valueLarge: true,
    accent: T.mint, statusColor: null,
    onToggle: toggle,
  });

  body.style.display = 'none';
  body.appendChild(bodyRow('Cash Received',  fmt(state.cashReceived)));
  body.appendChild(bodyRow('Card Tips Owed', '− ' + fmt(state.cardTips), T.red));

  var divEl = document.createElement('div');
  divEl.style.cssText = 'border-top:1px solid #444;margin:4px 0;';
  body.appendChild(divEl);

  body.appendChild(bodyRow('Cash Expected', fmt(state.cashExpected)));

  var infoEl = document.createElement('div');
  infoEl.style.cssText = 'font-family:' + T.fb + ';font-size:10px;color:#555;margin-top:6px;';
  infoEl.textContent = 'Informational — no action required';
  body.appendChild(infoEl);

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid #444;background:' + T.bgDark + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARDS COLUMN
// ─────────────────────────────────────────────────

function buildCardsColumn(state, sceneEl) {
  var col = document.createElement('div');
  col.style.cssText = [
    'width:' + CARDS_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'gap:' + CARD_GAP + 'px;',
    'overflow-y:auto;',
  ].join('');

  col.appendChild(buildCard01(state));
  col.appendChild(buildCard02(state, sceneEl));
  col.appendChild(buildCard03(state));
  col.appendChild(buildCard04(state));
  col.appendChild(buildCard05(state));
  col.appendChild(buildCard06(state));

  return col;
}

// ─────────────────────────────────────────────────
//  ALERT SUMMARY PANEL (right, top)
// ─────────────────────────────────────────────────

function buildAlertPanel(state) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'flex:1;',
    'border:1px solid #222;',
    'background:#111;',
    'display:flex;flex-direction:column;',
    'overflow:hidden;',
  ].join('');

  function rebuildContent() {
    panel.innerHTML = '';
    var blocked = isBlocked(state);

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = [
      'flex-shrink:0;padding:10px 14px;',
      'background:' + (blocked ? '#1a0000' : '#0a1a0a') + ';',
      'font-family:' + T.fb + ';font-size:13px;font-weight:bold;text-align:center;',
      'color:' + (blocked ? T.red : T.mint) + ';',
    ].join('');
    hdr.textContent = blocked ? '⚠  Resolve to finalize' : '✓  Ready to finalize';
    panel.appendChild(hdr);

    var list = document.createElement('div');
    list.style.cssText = 'padding:12px 14px;display:flex;flex-direction:column;gap:10px;flex:1;';

    function alertItem(color, text) {
      var item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:8px;font-family:' + T.fb + ';font-size:11px;color:' + color + ';';
      var dot = document.createElement('div');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:' + color + ';flex-shrink:0;';
      var txt = document.createElement('span');
      txt.textContent = text;
      item.appendChild(dot);
      item.appendChild(txt);
      return item;
    }

    // Blockers
    if (state.openChecks > 0) {
      list.appendChild(alertItem(T.red, state.openChecks + ' open check' + (state.openChecks > 1 ? 's' : '') + ' not closed'));
    }
    if (state.unadjustedTips > 0) {
      list.appendChild(alertItem(T.yellow, state.unadjustedTips + ' unadjusted tip' + (state.unadjustedTips > 1 ? 's' : '')));
    }

    // Separator if mixed
    if (blocked) {
      var sep = document.createElement('div');
      sep.style.cssText = 'border-top:1px solid #222;margin:4px 0;';
      list.appendChild(sep);
    }

    // Clean items
    function cleanItem(text) {
      list.appendChild(alertItem('#444', text));
    }
    if (state.openChecks === 0)    cleanItem('Check Stats ✓');
    if (state.unadjustedTips === 0) cleanItem('Tips Received ✓');
    cleanItem('Sales Summary ✓');
    cleanItem('Tip-Out ✓');
    cleanItem('Take-Home ✓');
    cleanItem('Cash Expected ✓');

    panel.appendChild(list);

    // Manager approval gate stub
    var mgr = document.createElement('div');
    mgr.style.cssText = 'flex-shrink:0;padding:8px;border-top:1px solid #1a1a1a;font-family:' + T.fb + ';font-size:9px;color:#333;text-align:center;';
    mgr.textContent = '[ manager approval gate — stub ]';
    panel.appendChild(mgr);
  }

  rebuildContent();
  panel._rebuild = rebuildContent;
  _alertContent = panel;
  return panel;
}

// ─────────────────────────────────────────────────
//  RIGHT COLUMN (alert + buttons)
// ─────────────────────────────────────────────────

function buildRightColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = [
    'width:' + RIGHT_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'gap:8px;',
  ].join('');

  // Alert panel — flex:1 fills space above buttons
  col.appendChild(buildAlertPanel(state));

  // PRINT — always available
  var printPair = buildStyledButton(T.bgLight);
  printPair.wrap.style.width = '100%';
  printPair.wrap.style.height = PRINT_H + 'px';
  printPair.inner.style.fontFamily = T.fb;
  printPair.inner.style.fontSize = '22px';
  printPair.inner.style.color = T.mint;
  printPair.inner.textContent = '//PRINT//';
  printPair.wrap.addEventListener('pointerup', function() {
    // TODO: POST /api/v1/checkout/print
    console.log('[CHECKOUT] Print triggered');
  });
  col.appendChild(printPair.wrap);

  // Manager gate label
  var mgLabel = document.createElement('div');
  mgLabel.style.cssText = 'font-family:' + T.fb + ';font-size:9px;color:#333;text-align:center;flex-shrink:0;';
  mgLabel.textContent = '[ manager approval gate ]';
  col.appendChild(mgLabel);

  // FINALIZE
  col.appendChild(buildFinalizeButton(state));

  return col;
}

function buildFinalizeButton(state) {
  var blocked = isBlocked(state);
  var fill     = blocked ? T.bgDark  : T.gold;
  var textColor = blocked ? '#554400' : '#1a1a1a';
  var label    = '//FINALIZE//';

  var pair = buildStyledButton(fill);
  pair.wrap.style.width = '100%';
  pair.wrap.style.height = FINALIZE_H + 'px';
  pair.inner.style.fontFamily = T.fb;
  pair.inner.style.fontSize = '20px';
  pair.inner.style.color = textColor;
  pair.inner.textContent = label;

  if (blocked) {
    // Dashed border overlay to signal disabled
    pair.wrap.style.outline = '2px dashed #554400';
    pair.wrap.style.outlineOffset = '-4px';
    pair.wrap.style.pointerEvents = 'none';
  } else {
    pair.wrap.addEventListener('pointerup', function() {
      doFinalize(state);
    });
  }

  _finalizeWrap = pair.wrap;
  return pair.wrap;
}

// ─────────────────────────────────────────────────
//  ADJUST % OVERLAY
// ─────────────────────────────────────────────────

function openAdjustOverlay(state) {
  // Working copy of roles
  var workingRoles = state.tipOutRoles.map(function(r) {
    return { label: r.label, percent: r.percent, basis: r.basis };
  });
  var workingOneTime = state.oneTimeRole
    ? { label: state.oneTimeRole.label, percent: state.oneTimeRole.percent, basis: state.oneTimeRole.basis }
    : { label: 'One-Time', percent: 0, basis: 'Net Sales' };

  overlay('adjust-pct', {
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '0';

      var card = document.createElement('div');
      card.style.cssText = [
        'background:' + T.bg + ';',
        'border:3px solid ' + T.gold + ';',
        'padding:0;width:520px;',
        'clip-path:' + chamfer(12) + ';',
        'display:flex;flex-direction:column;',
        'overflow:hidden;',
      ].join('');

      // Overlay header
      var ovHdr = document.createElement('div');
      ovHdr.style.cssText = 'background:' + T.gold + ';padding:12px 20px;font-family:' + T.fb + ';font-size:18px;color:#1a1a1a;font-weight:bold;text-align:center;';
      ovHdr.textContent = 'Adjust Tip-Out %';
      card.appendChild(ovHdr);

      var body = document.createElement('div');
      body.style.cssText = 'padding:16px 20px;display:flex;flex-direction:column;gap:12px;';

      // Per-role rows
      workingRoles.forEach(function(r) {
        body.appendChild(buildAdjustRow(r));
      });

      // Divider
      var sep = document.createElement('div');
      sep.style.cssText = 'border-top:1px solid #444;';
      body.appendChild(sep);

      // One-time row
      var otLabel = document.createElement('div');
      otLabel.style.cssText = 'font-family:' + T.fb + ';font-size:11px;color:#555;';
      otLabel.textContent = 'ONE-TIME (this checkout only)';
      body.appendChild(otLabel);
      body.appendChild(buildAdjustRow(workingOneTime));

      card.appendChild(body);

      // Confirm / Cancel buttons
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:0;border-top:2px solid #444;';

      var cancelPair = buildStyledButton(T.bgDark);
      cancelPair.wrap.style.flex = '1';
      cancelPair.wrap.style.height = '52px';
      cancelPair.inner.style.fontFamily = T.fb;
      cancelPair.inner.style.fontSize = '16px';
      cancelPair.inner.style.color = T.mint;
      cancelPair.inner.textContent = 'CANCEL';
      cancelPair.wrap.addEventListener('pointerup', function() {
        dismissOverlay();
      });

      var confirmPair = buildStyledButton(T.gold);
      confirmPair.wrap.style.flex = '1';
      confirmPair.wrap.style.height = '52px';
      confirmPair.inner.style.fontFamily = T.fb;
      confirmPair.inner.style.fontSize = '16px';
      confirmPair.inner.style.color = '#1a1a1a';
      confirmPair.inner.textContent = 'CONFIRM';
      confirmPair.wrap.addEventListener('pointerup', function() {
        // Write back to state
        workingRoles.forEach(function(r, i) {
          state.tipOutRoles[i].percent = r.percent;
        });
        state.oneTimeRole = workingOneTime.percent > 0 ? {
          label: workingOneTime.label,
          percent: workingOneTime.percent,
          basis: workingOneTime.basis,
          basisAmt: 0, amount: 0,
        } : null;
        recalcTipOut(state);
        dismissOverlay();
        refreshAfterAdjust(state);
      });

      btnRow.appendChild(cancelPair.wrap);
      btnRow.appendChild(confirmPair.wrap);
      card.appendChild(btnRow);

      el.appendChild(card);
    },
  });
}

function buildAdjustRow(role) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:10px;font-family:' + T.fb + ';';

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-size:14px;color:' + T.mint + ';min-width:80px;';
  nameEl.textContent = role.label;

  // Basis selector (simple toggle: Net Sales ↔ Liquor Sales)
  var basisBtn = document.createElement('div');
  basisBtn.style.cssText = 'font-size:11px;color:#888;cursor:pointer;min-width:90px;padding:4px 6px;border:1px solid #444;text-align:center;';
  basisBtn.textContent = role.basis;
  basisBtn.addEventListener('pointerup', function() {
    role.basis = role.basis === 'Net Sales' ? 'Liquor Sales' : 'Net Sales';
    basisBtn.textContent = role.basis;
  });

  // − button
  var decBtn = buildStyledButton(T.bgDark);
  decBtn.wrap.style.width = '36px';
  decBtn.wrap.style.height = '36px';
  decBtn.inner.style.fontFamily = T.fb;
  decBtn.inner.style.fontSize = '20px';
  decBtn.inner.style.color = T.mint;
  decBtn.inner.textContent = '−';
  decBtn.wrap.addEventListener('pointerup', function() {
    if (role.percent > 0) { role.percent = parseFloat((role.percent - 0.5).toFixed(1)); pctEl.textContent = role.percent + '%'; }
  });

  // % display
  var pctEl = document.createElement('div');
  pctEl.style.cssText = 'min-width:48px;text-align:center;font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';border:2px solid ' + T.gold + ';padding:4px 6px;';
  pctEl.textContent = role.percent + '%';

  // + button
  var incBtn = buildStyledButton(T.bgDark);
  incBtn.wrap.style.width = '36px';
  incBtn.wrap.style.height = '36px';
  incBtn.inner.style.fontFamily = T.fb;
  incBtn.inner.style.fontSize = '20px';
  incBtn.inner.style.color = T.mint;
  incBtn.inner.textContent = '+';
  incBtn.wrap.addEventListener('pointerup', function() {
    if (role.percent < 20) { role.percent = parseFloat((role.percent + 0.5).toFixed(1)); pctEl.textContent = role.percent + '%'; }
  });

  row.appendChild(nameEl);
  row.appendChild(decBtn.wrap);
  row.appendChild(pctEl);
  row.appendChild(incBtn.wrap);
  row.appendChild(basisBtn);
  return row;
}

// ─────────────────────────────────────────────────
//  REFRESH AFTER ADJUST (rebuild affected elements)
// ─────────────────────────────────────────────────

function refreshAfterAdjust(state) {
  // Rebuild receipt
  if (_receiptScroll) {
    _receiptScroll.innerHTML = '';
    _receiptScroll.appendChild(buildReceiptContent(state));
  }
  // Rebuild cards column
  if (_cardsCol) {
    collapseOpenCard();
    _cardsCol.innerHTML = '';
    _cardsCol.appendChild(buildCard01(state));
    _cardsCol.appendChild(buildCard02(state, null));
    _cardsCol.appendChild(buildCard03(state));
    _cardsCol.appendChild(buildCard04(state));
    _cardsCol.appendChild(buildCard05(state));
    _cardsCol.appendChild(buildCard06(state));
  }
  // Rebuild alert
  if (_alertContent && _alertContent._rebuild) {
    _alertContent._rebuild();
  }
}

// ─────────────────────────────────────────────────
//  FINALIZE ACTION
// ─────────────────────────────────────────────────

function doFinalize(state) {
  // Manager approval gate — stub using interrupt
  interrupt('manager-approval', {
    reason: 'finalize-checkout',
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '16px';

      var card = document.createElement('div');
      card.style.cssText = [
        'background:' + T.bg + ';',
        'border:3px solid ' + T.gold + ';',
        'padding:28px 36px;text-align:center;max-width:400px;',
        'clip-path:' + chamfer(10) + ';',
      ].join('');

      var msg = document.createElement('div');
      msg.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mint + ';margin-bottom:8px;';
      msg.textContent = 'Manager approval required';
      card.appendChild(msg);

      var sub = document.createElement('div');
      sub.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:#555;margin-bottom:24px;';
      sub.textContent = '[ PIN entry / messenger — stub ]';
      card.appendChild(sub);

      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';

      btns.appendChild(buildButton('Approve (stub)', {
        fill: T.gold, color: '#1a1a1a', fontSize: '16px',
        width: 150, height: 44,
        onTap: function() {
          resolveInterrupt(true);
          // TODO: POST /api/v1/checkout/finalize
          console.log('[CHECKOUT] Finalize committed', state);
          pop(); // Return to reporting / login
        },
      }));

      btns.appendChild(buildButton('Cancel', {
        fill: T.bgDark, color: T.mint, fontSize: '16px',
        width: 120, height: 44,
        onTap: function() { cancelInterrupt(); },
      }));

      card.appendChild(btns);
      el.appendChild(card);
    },
  }).catch(function() {
    // Interrupt cancelled — do nothing
  });
}

// ─────────────────────────────────────────────────
//  BUILD SCENE
// ─────────────────────────────────────────────────

function buildScene(el, params) {
  _state = buildMockState(params);
  collapseOpenCard();

  el.style.cssText = [
    'width:100%;height:100%;',
    'display:flex;gap:' + COL_GAP + 'px;',
    'padding:' + SCENE_PAD + 'px;',
    'box-sizing:border-box;',
    'overflow:hidden;',
  ].join('');

  el.appendChild(buildReceiptPanel(_state));

  _cardsCol = buildCardsColumn(_state, el);
  el.appendChild(_cardsCol);

  el.appendChild(buildRightColumn(_state));
}

// ─────────────────────────────────────────────────
//  REGISTRATION
// ─────────────────────────────────────────────────

registerScene('server-checkout', {
  onEnter: function(el, params) {
    setSceneName('Checkout: ' + (params.employeeName || ''));
    setHeaderBack(true);
    buildScene(el, params);
  },
  onExit: function() {
    _state         = null;
    _openCardBody  = null;
    _openChevron   = null;
    _finalizeWrap  = null;
    _alertContent  = null;
    _receiptScroll = null;
    _cardsCol      = null;
  },
  cache: false,
  timeoutMs: 0,
});