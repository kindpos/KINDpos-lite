// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Close Day Scene
//  Receipt preview left | 6 accordion cards middle | Alert + buttons right
//  One blocker: open checks
//  Buttons: PRINT / SUBMIT BATCH / CLOSE DAY
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { registerScene, push, pop, overlay, dismissOverlay, interrupt, resolveInterrupt, cancelInterrupt } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── Layout ────────────────────────────────────────
var RECEIPT_W  = 290;
var CARDS_W    = 452;
var RIGHT_W    = 250;
var COL_GAP    = 13;
var SCENE_PAD  = 13;
var CARD_H     = 82;
var CARD_GAP   = 6;
var BTN_H      = 78;

// ── Scene state ───────────────────────────────────
var _state         = null;
var _openCardBody  = null;
var _openChevron   = null;
var _closeWrap     = null;
var _alertContent  = null;
var _receiptScroll = null;
var _cardsCol      = null;
var _batchSettled  = false;

// ─────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function isBlocked(state) {
  return state.openChecks > 0;
}

// ─────────────────────────────────────────────────
//  FETCH STATE from day-summary API
// ─────────────────────────────────────────────────

function fetchDayState(params) {
  return fetch('/api/v1/orders/day-summary').then(function(r) { return r.json(); }).then(function(d) {
    var today = new Date();
    return {
      date: (today.getMonth()+1) + '/' + today.getDate() + '/' + String(today.getFullYear()).slice(2),
      terminalId: 'T-001',
      printedBy:  params.managerName || 'Manager',

      // Revenue
      grossSales:    d.gross_sales   || 0,
      voidsTotal:    d.void_total    || 0,  voidsCount: d.void_count || 0,
      compsTotal:    0,                     compsCount: 0,
      discTotal:     d.discount_total || 0, discCount:  0,
      netSales:      d.net_sales     || 0,
      taxCollected:  d.tax_total     || 0,

      // Payments
      cashSales:     d.cash_total  || 0, cashCount: d.cash_count || 0,
      cardSales:     d.card_total  || 0, cardCount: d.card_count || 0,
      totalPayments: (d.cash_total || 0) + (d.card_total || 0),
      totalTips:     d.total_tips  || 0,

      // Categories
      categories:    d.categories || [],

      // Check stats
      totalChecks:   d.total_checks || 0,
      avgCheck:      d.avg_check    || 0,
      covers:        0,

      // Dayparts
      dayparts:      [],

      // Tips
      totalTipOut:   0,

      // Batch
      batchTransactions: (d.cash_count || 0) + (d.card_count || 0),
      batchTotal:    (d.cash_total || 0) + (d.card_total || 0),

      // Blocker
      openChecks:    d.open_orders || 0,
    };
  });
}

// ─────────────────────────────────────────────────
//  RECEIPT CONTENT (mirrors SalesRecapTemplate)
// ─────────────────────────────────────────────────

function buildReceiptContent(state) {
  var BASE   = '28px';
  var HEADER = '30px';
  var SMALL  = '18px';
  var COL    = '#1a1a1a';
  var DIM    = '#447744';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 14px;font-family:' + T.fb + ';color:' + COL + ';display:flex;flex-direction:column;gap:0;';

  function sectionHeader(text) {
    var el = document.createElement('div');
    el.style.cssText = 'font-size:' + HEADER + ';font-weight:bold;margin-top:10px;margin-bottom:2px;';
    el.textContent = text;
    return el;
  }

  function row(label, value, valueColor) {
    var el = document.createElement('div');
    el.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-size:' + BASE + ';padding:1px 0;';
    var l = document.createElement('span');
    l.textContent = label;
    var v = document.createElement('span');
    v.style.fontWeight = 'bold';
    if (valueColor) v.style.color = valueColor;
    v.textContent = value;
    el.appendChild(l);
    el.appendChild(v);
    return el;
  }

  function divider() {
    var el = document.createElement('div');
    el.style.cssText = 'border-top:1px dashed ' + DIM + ';margin:6px 0;';
    return el;
  }

  // Identity
  var id = document.createElement('div');
  id.style.cssText = 'text-align:center;margin-bottom:10px;';
  var r1 = document.createElement('div');
  r1.style.cssText = 'font-size:' + HEADER + ';font-weight:bold;';
  r1.textContent = 'KINDpos Restaurant';
  var r2 = document.createElement('div');
  r2.style.cssText = 'font-size:' + BASE + ';font-weight:bold;';
  r2.textContent = 'SALES RECAP';
  id.appendChild(r1);
  id.appendChild(r2);
  wrap.appendChild(id);

  wrap.appendChild(row('Date:', state.date));
  wrap.appendChild(row('Printed by:', state.printedBy));
  wrap.appendChild(divider());

  // Revenue
  wrap.appendChild(sectionHeader('REVENUE'));
  wrap.appendChild(row('Gross Sales',  fmt(state.grossSales)));
  wrap.appendChild(row('Voids (' + state.voidsCount + ')',  '− ' + fmt(state.voidsTotal)));
  wrap.appendChild(row('Comps (' + state.compsCount + ')',  '− ' + fmt(state.compsTotal)));
  wrap.appendChild(row('Discounts (' + state.discCount + ')', '− ' + fmt(state.discTotal)));
  wrap.appendChild(divider());
  wrap.appendChild(row('NET SALES',    fmt(state.netSales)));
  wrap.appendChild(row('Tax Collected', fmt(state.taxCollected)));
  wrap.appendChild(divider());

  // Payments
  wrap.appendChild(sectionHeader('PAYMENTS'));
  wrap.appendChild(row('Cash (' + state.cashCount + ')',  fmt(state.cashSales)));
  wrap.appendChild(row('Card (' + state.cardCount + ')',  fmt(state.cardSales)));
  wrap.appendChild(divider());
  wrap.appendChild(row('Total Payments', fmt(state.totalPayments)));
  wrap.appendChild(row('Total Tips (CC)', fmt(state.totalTips)));
  wrap.appendChild(divider());

  // Categories
  wrap.appendChild(sectionHeader('BY CATEGORY'));
  state.categories.forEach(function(c) {
    wrap.appendChild(row(c.name + ' (' + c.count + ')', fmt(c.total)));
  });
  wrap.appendChild(divider());

  // Check stats
  wrap.appendChild(sectionHeader('CHECK STATS'));
  wrap.appendChild(row('Total Checks', String(state.totalChecks)));
  wrap.appendChild(row('Average Check', fmt(state.avgCheck)));
  wrap.appendChild(row('Covers', String(state.covers)));
  wrap.appendChild(divider());

  // Dayparts
  wrap.appendChild(sectionHeader('DAYPART'));
  state.dayparts.forEach(function(d) {
    wrap.appendChild(row(d.name + ' (' + d.checks + ' chk)', fmt(d.sales)));
  });
  wrap.appendChild(divider());

  // Tips
  wrap.appendChild(sectionHeader('TIPS'));
  wrap.appendChild(row('Total Tips (CC)', fmt(state.totalTips)));
  wrap.appendChild(row('Total Tip-Out',   '− ' + fmt(state.totalTipOut)));
  wrap.appendChild(divider());

  var footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;margin-top:8px;font-size:' + SMALL + ';color:' + T.dimText + ';';
  footer.innerHTML = 'Terminal: ' + state.terminalId + '<br>** MANAGER REPORT — CONFIDENTIAL **';
  wrap.appendChild(footer);

  return wrap;
}

function buildReceiptPanel(state) {
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:' + RECEIPT_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'background:' + T.mint + ';',
    'border-right:4px solid ' + T.mintEdgeD + ';',
    'overflow:hidden;',
  ].join('');

  var header = document.createElement('div');
  header.style.cssText = [
    'flex-shrink:0;padding:6px 12px;',
    'background:' + T.mintEdgeD + ';',
    'font-family:' + T.fb + ';font-size:11px;color:#1a1a1a;',
    'letter-spacing:0.1em;text-align:center;',
  ].join('');
  header.textContent = 'PRINT PREVIEW';
  panel.appendChild(header);

  _receiptScroll = document.createElement('div');
  _receiptScroll.style.cssText = 'flex:1;overflow-y:auto;';
  _receiptScroll.appendChild(buildReceiptContent(state));
  panel.appendChild(_receiptScroll);

  return panel;
}

// ─────────────────────────────────────────────────
//  ACCORDION HELPERS (shared pattern)
// ─────────────────────────────────────────────────

function collapseOpenCard() {
  if (_openCardBody)  { _openCardBody.style.display = 'none'; _openCardBody = null; }
  if (_openChevron)   { _openChevron.textContent = '›';       _openChevron  = null; }
}

function makeToggle(body) {
  return function(chevron) {
    if (body.style.display !== 'none') {
      body.style.display = 'none';
      chevron.textContent = '›';
      _openCardBody = null; _openChevron = null;
      return;
    }
    collapseOpenCard();
    body.style.display = 'flex';
    chevron.textContent = '▾';
    _openCardBody = body; _openChevron = chevron;
  };
}

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

function buildCardHeader(opts) {
  var header = document.createElement('div');
  header.style.cssText = [
    'position:relative;height:' + CARD_H + 'px;flex-shrink:0;',
    'display:flex;align-items:center;',
    'padding:0 14px 0 20px;cursor:pointer;',
    'user-select:none;-webkit-user-select:none;gap:10px;',
  ].join('');

  var accentBar = document.createElement('div');
  accentBar.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:6px;background:' + (opts.accent || T.mint) + ';';
  header.appendChild(accentBar);

  var num = document.createElement('div');
  num.style.cssText = 'font-family:' + T.fb + ';font-size:11px;color:' + T.dimText + ';flex-shrink:0;width:18px;';
  num.textContent = String(opts.index).padStart(2, '0');
  header.appendChild(num);

  var titleWrap = document.createElement('div');
  titleWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0;';

  var titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:' + T.fb + ';font-size:15px;color:' + T.mint + ';font-weight:bold;';
  titleEl.textContent = opts.title || '';
  titleWrap.appendChild(titleEl);

  if (opts.subtext) {
    var sub = document.createElement('div');
    sub.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.mutedText + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    sub.textContent = opts.subtext;
    if (opts.subtextColor) sub.style.color = opts.subtextColor;
    titleWrap.appendChild(sub);
  }

  header.appendChild(titleWrap);

  var rightWrap = document.createElement('div');
  rightWrap.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';

  if (opts.value != null) {
    var val = document.createElement('div');
    val.style.cssText = 'font-family:' + T.fb + ';font-size:' + (opts.valueLarge ? '20px' : '15px') + ';color:' + T.gold + ';font-weight:bold;text-align:right;';
    val.textContent = opts.value;
    rightWrap.appendChild(val);
  }

  var dot = document.createElement('div');
  dot.style.cssText = 'width:10px;height:10px;clip-path:circle(50%);background:' + (opts.statusColor || T.mint) + ';opacity:' + (opts.statusColor ? '1' : '0.4') + ';flex-shrink:0;';
  rightWrap.appendChild(dot);

  var chevron = document.createElement('div');
  chevron.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.dimText + ';flex-shrink:0;width:14px;';
  chevron.textContent = '›';
  rightWrap.appendChild(chevron);

  header.appendChild(rightWrap);

  header.addEventListener('pointerdown', function() { header.style.background = 'rgba(255,255,255,0.03)'; });
  header.addEventListener('pointerleave', function() { header.style.background = ''; });
  header.addEventListener('pointerup', function() {
    header.style.background = '';
    if (opts.onToggle) opts.onToggle(chevron);
  });

  return { el: header, chevron: chevron };
}

function bodyRow(label, value, valueColor) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-family:' + T.fb + ';';
  var lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:13px;color:' + T.mutedText + ';';
  lbl.textContent = label;
  var val = document.createElement('span');
  val.style.cssText = 'font-size:14px;color:' + (valueColor || T.gold) + ';font-weight:bold;';
  val.textContent = value;
  row.appendChild(lbl);
  row.appendChild(val);
  return row;
}

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

// ─────────────────────────────────────────────────
//  CARD 01 — Revenue Summary
// ─────────────────────────────────────────────────

function buildCard01(state) {
  var body = buildCardBody();
  var h = buildCardHeader({
    index: 1, title: 'Revenue Summary',
    subtext: 'Gross / Voids / Comps / Net',
    value: fmt(state.netSales), valueLarge: true,
    accent: T.mint,
    onToggle: makeToggle(body),
  });

  body.appendChild(bodyRow('Gross Sales',             fmt(state.grossSales)));
  body.appendChild(bodyRow('Voids (' + state.voidsCount + ')',  '− ' + fmt(state.voidsTotal), T.red));
  body.appendChild(bodyRow('Comps (' + state.compsCount + ')',  '− ' + fmt(state.compsTotal), T.red));
  body.appendChild(bodyRow('Discounts (' + state.discCount + ')', '− ' + fmt(state.discTotal), T.red));
  var div = document.createElement('div');
  div.style.cssText = 'border-top:1px solid #333;margin:4px 0;';
  body.appendChild(div);
  body.appendChild(bodyRow('Net Sales',    fmt(state.netSales),     T.gold));
  body.appendChild(bodyRow('Tax Collected', fmt(state.taxCollected), T.mint));

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + T.border + ';background:' + T.bgDark + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 02 — Payment Breakdown
// ─────────────────────────────────────────────────

function buildCard02(state) {
  var body = buildCardBody();
  var h = buildCardHeader({
    index: 2, title: 'Payment Breakdown',
    subtext: 'Cash / Card / Tips',
    value: fmt(state.totalPayments),
    accent: T.gold,
    onToggle: makeToggle(body),
  });

  body.appendChild(bodyRow('Cash (' + state.cashCount + ')', fmt(state.cashSales)));
  body.appendChild(bodyRow('Card (' + state.cardCount + ')', fmt(state.cardSales)));
  var div = document.createElement('div');
  div.style.cssText = 'border-top:1px solid #333;margin:4px 0;';
  body.appendChild(div);
  body.appendChild(bodyRow('Total Payments', fmt(state.totalPayments), T.gold));
  body.appendChild(bodyRow('Total Tips (CC)', fmt(state.totalTips)));

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + T.border + ';background:' + T.bgDark + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 03 — Category Sales
// ─────────────────────────────────────────────────

function buildCard03(state) {
  var body = buildCardBody();
  var topCat = state.categories[0] ? state.categories[0].name : '—';
  var h = buildCardHeader({
    index: 3, title: 'Category Sales',
    subtext: state.categories.map(function(c) { return c.name; }).join(' / '),
    value: fmt(state.netSales),
    accent: T.mint,
    onToggle: makeToggle(body),
  });

  state.categories.forEach(function(c) {
    body.appendChild(bodyRow(c.name + ' (' + c.count + ')', fmt(c.total)));
  });

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + T.border + ';background:' + T.bgDark + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 04 — Check Stats  (RED if open checks)
// ─────────────────────────────────────────────────

function buildCard04(state) {
  var blocked     = state.openChecks > 0;
  var borderColor = blocked ? T.red    : T.border;
  var bgColor     = blocked ? '#1a0a0a' : T.bgDark;
  var accentColor = blocked ? T.red    : T.mint;
  var subtext     = blocked
    ? '⚠  ' + state.openChecks + ' open check' + (state.openChecks > 1 ? 's' : '') + ' — must close'
    : state.totalChecks + ' checks · ' + state.covers + ' covers';

  var body = buildCardBody();
  var h = buildCardHeader({
    index: 4, title: 'Check Stats',
    subtext: subtext, subtextColor: blocked ? T.red : null,
    value: fmt(state.avgCheck),
    accent: accentColor, statusColor: blocked ? T.red : null,
    onToggle: makeToggle(body),
  });

  body.appendChild(bodyRow('Total Checks', String(state.totalChecks), T.mint));
  body.appendChild(bodyRow('Average Check', fmt(state.avgCheck)));
  body.appendChild(bodyRow('Covers', String(state.covers), T.mint));

  if (blocked) {
    body.appendChild(buildJumpButton(
      '→ Open Checks', T.red, '#fff',
      function() { }
    ));
  }

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + borderColor + ';background:' + bgColor + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 05 — Daypart Summary
// ─────────────────────────────────────────────────

function buildCard05(state) {
  var body = buildCardBody();
  var h = buildCardHeader({
    index: 5, title: 'Daypart Summary',
    subtext: state.dayparts.map(function(d) { return d.name; }).join(' / '),
    value: fmt(state.netSales),
    accent: T.mint,
    onToggle: makeToggle(body),
  });

  state.dayparts.forEach(function(d) {
    body.appendChild(bodyRow(d.name + ' (' + d.checks + ' chk)', fmt(d.sales)));
  });

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + T.border + ';background:' + T.bgDark + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD 06 — Tips & Gratuity
// ─────────────────────────────────────────────────

function buildCard06(state) {
  var body = buildCardBody();
  var h = buildCardHeader({
    index: 6, title: 'Tips & Gratuity',
    subtext: 'Total collected · Total tip-out paid',
    value: fmt(state.totalTips),
    accent: T.gold,
    onToggle: makeToggle(body),
  });

  body.appendChild(bodyRow('Total Tips (CC)', fmt(state.totalTips)));
  body.appendChild(bodyRow('Total Tip-Out Paid', '− ' + fmt(state.totalTipOut), T.red));
  var div = document.createElement('div');
  div.style.cssText = 'border-top:1px solid #333;margin:4px 0;';
  body.appendChild(div);
  var net = parseFloat((state.totalTips - state.totalTipOut).toFixed(2));
  body.appendChild(bodyRow('Server Net Tips', fmt(net), T.gold));

  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:2px solid ' + T.dimText + ';background:' + T.bgDark + ';display:flex;flex-direction:column;';
  wrap.appendChild(h.el);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARDS COLUMN
// ─────────────────────────────────────────────────

function buildCardsColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = [
    'width:' + CARDS_W + 'px;flex-shrink:0;',
    'display:flex;flex-direction:column;',
    'gap:' + CARD_GAP + 'px;',
    'overflow-y:auto;',
  ].join('');

  col.appendChild(buildCard01(state));
  col.appendChild(buildCard02(state));
  col.appendChild(buildCard03(state));
  col.appendChild(buildCard04(state));
  col.appendChild(buildCard05(state));
  col.appendChild(buildCard06(state));

  return col;
}

// ─────────────────────────────────────────────────
//  ALERT PANEL
// ─────────────────────────────────────────────────

function buildAlertPanel(state) {
  var panel = document.createElement('div');
  panel.style.cssText = 'flex:1;border:1px solid ' + T.bg2 + ';background:' + T.bgDark + ';display:flex;flex-direction:column;overflow:hidden;';

  function rebuild() {
    panel.innerHTML = '';
    var blocked = isBlocked(state);

    var hdr = document.createElement('div');
    hdr.style.cssText = [
      'flex-shrink:0;padding:10px 14px;',
      'background:' + (blocked ? '#1a0000' : '#0a1a0a') + ';',
      'font-family:' + T.fb + ';font-size:13px;font-weight:bold;text-align:center;',
      'color:' + (blocked ? T.red : T.mint) + ';',
    ].join('');
    hdr.textContent = blocked ? '⚠  Resolve to close' : '✓  Ready to close';
    panel.appendChild(hdr);

    var list = document.createElement('div');
    list.style.cssText = 'padding:12px 14px;display:flex;flex-direction:column;gap:10px;flex:1;';

    function alertItem(color, text) {
      var item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:8px;font-family:' + T.fb + ';font-size:11px;color:' + color + ';';
      var dot = document.createElement('div');
      dot.style.cssText = 'width:8px;height:8px;clip-path:circle(50%);background:' + color + ';flex-shrink:0;';
      var txt = document.createElement('span');
      txt.textContent = text;
      item.appendChild(dot);
      item.appendChild(txt);
      return item;
    }

    if (state.openChecks > 0) {
      list.appendChild(alertItem(T.red, state.openChecks + ' open check' + (state.openChecks > 1 ? 's' : '') + ' not closed'));
    }

    var sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid ' + T.bg2 + ';margin:2px 0;';
    list.appendChild(sep);

    ['Revenue Summary', 'Payment Breakdown', 'Category Sales',
     state.openChecks === 0 ? 'Check Stats ✓' : null,
     'Daypart Summary', 'Tips & Gratuity'].forEach(function(label) {
      if (label) list.appendChild(alertItem(T.border, label + (label.includes('✓') ? '' : ' ✓')));
    });

    panel.appendChild(list);

    var mgr = document.createElement('div');
    mgr.style.cssText = 'flex-shrink:0;padding:8px;border-top:1px solid #1a1a1a;font-family:' + T.fb + ';font-size:9px;color:#333;text-align:center;';
    mgr.textContent = '[ manager approval required ]';
    panel.appendChild(mgr);
  }

  rebuild();
  panel._rebuild = rebuild;
  _alertContent = panel;
  return panel;
}

// ─────────────────────────────────────────────────
//  BATCH SETTLEMENT OVERLAY (Win98 style)
// ─────────────────────────────────────────────────

function openBatchOverlay(state, onSettled) {
  overlay('batch-settlement', {
    onBuild: function(el) {
      el.style.flexDirection = 'column';

      // KINDpos gold chamfer frame
      var frame = document.createElement('div');
      frame.style.cssText = [
        'background:' + T.gold + ';',
        'padding:7px;',
        'clip-path:' + chamfer(12) + ';',
        'filter:drop-shadow(4px 6px 0px rgba(0,0,0,0.7));',
      ].join('');

      // Win98-style dialog in KINDpos colors
      var dialog = document.createElement('div');
      dialog.style.cssText = [
        'background:#333;width:480px;',
        'border-top:2px solid #5a5a5a;border-left:2px solid #5a5a5a;',
        'border-bottom:2px solid #0a0a0a;border-right:2px solid #0a0a0a;',
        'font-family:' + T.fb + ';',
      ].join('');

      // Title bar
      var titleBar = document.createElement('div');
      titleBar.style.cssText = 'background:linear-gradient(to right,#1a1a1a,#2a2a2a);padding:5px 8px;display:flex;align-items:center;justify-content:space-between;';

      var titleLeft = document.createElement('div');
      titleLeft.style.cssText = 'display:flex;align-items:center;gap:8px;';

      var icon = document.createElement('div');
      icon.style.cssText = 'width:16px;height:16px;background:' + T.gold + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:#1a1a1a;clip-path:' + chamfer(3) + ';';
      icon.textContent = '$';

      var titleText = document.createElement('span');
      titleText.style.cssText = 'font-family:' + T.fb + ';font-size:13px;color:' + T.mint + ';font-weight:bold;letter-spacing:0.05em;';
      titleText.textContent = 'Batch Settlement — KINDpos/lite';

      var closeBtn = document.createElement('div');
      closeBtn.style.cssText = [
        'width:18px;height:16px;background:' + T.red + ';',
        'border-top:1px solid #f26858;border-left:1px solid #f26858;',
        'border-bottom:1px solid #5e160c;border-right:1px solid #5e160c;',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:11px;color:' + T.mint + ';cursor:pointer;font-weight:bold;',
        'clip-path:' + chamfer(3) + ';',
      ].join('');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('pointerup', function() {
        if (running) return;
        dismissOverlay();
      });

      titleLeft.appendChild(icon);
      titleLeft.appendChild(titleText);
      titleBar.appendChild(titleLeft);
      titleBar.appendChild(closeBtn);
      dialog.appendChild(titleBar);

      // Body
      var body = document.createElement('div');
      body.style.cssText = 'padding:16px 20px 14px;display:flex;flex-direction:column;gap:12px;';

      // Info panel (sunken)
      var infoPanel = document.createElement('div');
      infoPanel.style.cssText = [
        'background:#1a1a1a;',
        'border-top:2px solid #0a0a0a;border-left:2px solid #0a0a0a;',
        'border-bottom:2px solid #5a5a5a;border-right:2px solid #5a5a5a;',
        'padding:10px 14px;display:flex;flex-direction:column;gap:6px;',
      ].join('');

      function infoRow(label, value) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:13px;';
        var l = document.createElement('span');
        l.style.color = T.mutedText;
        l.textContent = label;
        var v = document.createElement('span');
        v.style.cssText = 'font-weight:bold;color:' + T.gold + ';';
        v.textContent = value;
        row.appendChild(l);
        row.appendChild(v);
        return row;
      }

      infoPanel.appendChild(infoRow('Transactions:', String(state.batchTransactions)));
      infoPanel.appendChild(infoRow('Batch Total:', fmt(state.batchTotal)));
      infoPanel.appendChild(infoRow('Processor:', 'Dejavoo SPIN'));
      body.appendChild(infoPanel);

      // Status text
      var statusEl = document.createElement('div');
      statusEl.style.cssText = 'font-family:' + T.fb + ';font-size:13px;color:' + T.mint + ';min-height:18px;';
      statusEl.textContent = 'Ready to submit batch to processor.';
      body.appendChild(statusEl);

      // Progress bar
      var progWrap = document.createElement('div');

      var progContainer = document.createElement('div');
      progContainer.style.cssText = [
        'border-top:2px solid #0a0a0a;border-left:2px solid #0a0a0a;',
        'border-bottom:2px solid #5a5a5a;border-right:2px solid #5a5a5a;',
        'height:26px;background:#1a1a1a;padding:3px;overflow:hidden;',
      ].join('');

      var progFill = document.createElement('div');
      progFill.style.cssText = 'height:100%;display:flex;gap:2px;align-items:stretch;';

      var TOTAL_SEGS = 26;
      var segments = [];
      for (var i = 0; i < TOTAL_SEGS; i++) {
        var seg = document.createElement('div');
        seg.style.cssText = 'width:14px;flex-shrink:0;background:' + T.mint + ';opacity:0;transition:opacity 0.05s;';
        progFill.appendChild(seg);
        segments.push(seg);
      }

      progContainer.appendChild(progFill);
      progWrap.appendChild(progContainer);

      var pctEl = document.createElement('div');
      pctEl.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.mutedText + ';text-align:right;margin-top:2px;';
      pctEl.textContent = '0%';
      progWrap.appendChild(pctEl);
      body.appendChild(progWrap);

      // Buttons
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;justify-content:center;gap:8px;margin-top:4px;';

      function makeDialogBtn(label, fill, textColor) {
        var pair = buildStyledButton(fill);
        pair.wrap.style.width = '100px';
        pair.wrap.style.height = '36px';
        pair.inner.style.fontFamily = T.fb;
        pair.inner.style.fontSize = '13px';
        pair.inner.style.color = textColor;
        pair.inner.textContent = label;
        return pair;
      }

      var submitPair = makeDialogBtn('Submit', T.bg, T.mint);
      var cancelPair = makeDialogBtn('Cancel', T.bgDark, T.mint);
      var okPair     = makeDialogBtn('OK', T.goGreen, '#fff');
      okPair.wrap.style.display = 'none';

      btnRow.appendChild(submitPair.wrap);
      btnRow.appendChild(cancelPair.wrap);
      btnRow.appendChild(okPair.wrap);
      body.appendChild(btnRow);
      dialog.appendChild(body);
      frame.appendChild(dialog);
      el.appendChild(frame);

      // ── Animation logic ──────────────────────────
      var running = false;
      var animTimer = null;
      var currentSeg = 0;

      var statusMessages = [
        'Connecting to Dejavoo SPIN...',
        'Authenticating with processor...',
        'Sending transaction batch...',
        'Processing ' + state.batchTransactions + ' transactions...',
        'Verifying totals...',
        'Awaiting processor confirmation...',
        'Finalizing settlement...',
        'Settlement complete.',
      ];

      submitPair.wrap.addEventListener('pointerup', function() {
        if (running) return;
        running = true;
        currentSeg = 0;
        submitPair.wrap.style.display = 'none';
        cancelPair.wrap.style.display = 'none';

        var msgIdx = 0;
        statusEl.textContent = statusMessages[0];

        animTimer = setInterval(function() {
          currentSeg++;
          // Update segments
          for (var j = 0; j < TOTAL_SEGS; j++) {
            segments[j].style.opacity = j < currentSeg ? '1' : '0';
          }
          pctEl.textContent = Math.round((currentSeg / TOTAL_SEGS) * 100) + '%';

          var newMsgIdx = Math.floor((currentSeg / TOTAL_SEGS) * (statusMessages.length - 1));
          if (newMsgIdx !== msgIdx) {
            msgIdx = newMsgIdx;
            statusEl.textContent = statusMessages[msgIdx];
          }

          if (currentSeg >= TOTAL_SEGS) {
            clearInterval(animTimer);
            running = false;
            _batchSettled = true;
            statusEl.textContent = '✓  Batch settled. ' + fmt(state.batchTotal) + ' submitted.';
            statusEl.style.color = T.mint;
            pctEl.textContent = '100%';
            titleBar.style.background = 'linear-gradient(to right,#1a3a1a,#2a5a2a)';
            titleText.textContent = 'Batch Settlement — Complete';
            okPair.wrap.style.display = '';
          }
        }, 80);
      });

      cancelPair.wrap.addEventListener('pointerup', function() {
        if (running) return;
        dismissOverlay();
      });

      okPair.wrap.addEventListener('pointerup', function() {
        dismissOverlay();
        if (onSettled) onSettled();
      });
    },
  });
}

// ─────────────────────────────────────────────────
//  RIGHT COLUMN
// ─────────────────────────────────────────────────

function buildRightColumn(state) {
  var col = document.createElement('div');
  col.style.cssText = 'width:' + RIGHT_W + 'px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;';

  col.appendChild(buildAlertPanel(state));

  // PRINT
  var printPair = buildStyledButton(T.bgLight);
  printPair.wrap.style.cssText = 'width:100%;height:' + BTN_H + 'px;flex-shrink:0;';
  printPair.inner.style.fontFamily = T.fb;
  printPair.inner.style.fontSize = '20px';
  printPair.inner.style.color = T.mint;
  printPair.inner.textContent = '//PRINT//';
  printPair.wrap.addEventListener('pointerup', function() {
  });
  col.appendChild(printPair.wrap);

  // SUBMIT BATCH
  var batchPair = buildStyledButton(T.darkBtn);
  batchPair.wrap.style.cssText = 'width:100%;height:' + BTN_H + 'px;flex-shrink:0;';
  batchPair.inner.style.fontFamily = T.fb;
  batchPair.inner.style.fontSize = '17px';
  batchPair.inner.style.color = T.cyan;
  batchPair.inner.textContent = '//SUBMIT BATCH//';
  batchPair.wrap.addEventListener('pointerup', function() {
    openBatchOverlay(state, function() {
      // After batch settled — update batch button style
      batchPair.inner.textContent = '✓ BATCH SETTLED';
      batchPair.inner.style.color = T.mint;
      batchPair.wrap.style.pointerEvents = 'none';
    });
  });
  col.appendChild(batchPair.wrap);

  // Manager gate label
  var mgLabel = document.createElement('div');
  mgLabel.style.cssText = 'font-family:' + T.fb + ';font-size:9px;color:#333;text-align:center;flex-shrink:0;';
  mgLabel.textContent = '[ manager approval gate ]';
  col.appendChild(mgLabel);

  // CLOSE DAY
  col.appendChild(buildCloseDayButton(state));

  return col;
}

function buildCloseDayButton(state) {
  var blocked = isBlocked(state);
  var pair = buildStyledButton(blocked ? T.bgDark : T.gold);
  pair.wrap.style.cssText = 'width:100%;height:' + BTN_H + 'px;flex-shrink:0;';
  pair.inner.style.fontFamily = T.fb;
  pair.inner.style.fontSize = '18px';
  pair.inner.style.color = blocked ? '#554400' : '#1a1a1a';
  pair.inner.textContent = '//CLOSE DAY//';

  if (blocked) {
    pair.wrap.style.outline = '2px dashed #554400';
    pair.wrap.style.outlineOffset = '-4px';
    pair.wrap.style.pointerEvents = 'none';
  } else {
    pair.wrap.addEventListener('pointerup', function() {
      doCloseDay(state);
    });
  }

  _closeWrap = pair.wrap;
  return pair.wrap;
}

// ─────────────────────────────────────────────────
//  CLOSE DAY ACTION
// ─────────────────────────────────────────────────

function doCloseDay(state) {
  interrupt('manager-approval', {
    reason: 'close-day',
    onBuild: function(el) {
      el.style.flexDirection = 'column';
      el.style.gap = '16px';

      var card = document.createElement('div');
      card.style.cssText = [
        'background:' + T.bg + ';',
        'border:3px solid ' + T.gold + ';',
        'padding:28px 36px;text-align:center;max-width:420px;',
        'clip-path:' + chamfer(10) + ';',
      ].join('');

      var msg = document.createElement('div');
      msg.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mint + ';margin-bottom:8px;';
      msg.textContent = 'Manager approval required';
      card.appendChild(msg);

      var sub = document.createElement('div');
      sub.style.cssText = 'font-family:' + T.fb + ';font-size:12px;color:' + T.dimText + ';margin-bottom:24px;';
      sub.textContent = 'Enter manager PIN to confirm';
      card.appendChild(sub);

      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:16px;justify-content:center;';

      btns.appendChild(buildButton('Approve', {
        fill: T.gold, color: '#1a1a1a', fontSize: '16px',
        width: 160, height: 44,
        onTap: function() {
          resolveInterrupt(true);
          // TODO: POST /api/v1/day/close
          pop();
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
  }).catch(function() {});
}

// ─────────────────────────────────────────────────
//  BUILD SCENE
// ─────────────────────────────────────────────────

function buildScene(el, params) {
  _batchSettled = false;
  collapseOpenCard();

  el.style.cssText = [
    'width:100%;height:100%;',
    'display:flex;gap:' + COL_GAP + 'px;',
    'padding:' + SCENE_PAD + 'px;',
    'box-sizing:border-box;overflow:hidden;',
  ].join('');

  fetchDayState(params).then(function(state) {
    _state = state;
    el.appendChild(buildReceiptPanel(_state));
    _cardsCol = buildCardsColumn(_state);
    el.appendChild(_cardsCol);
    el.appendChild(buildRightColumn(_state));
  });
}

// ─────────────────────────────────────────────────
//  REGISTRATION
// ─────────────────────────────────────────────────

registerScene('close-day', {
  onEnter: function(el, params) {
    setSceneName('Close Day');
    setHeaderBack(true);
    buildScene(el, params);
  },
  onExit: function() {
    _state         = null;
    _openCardBody  = null;
    _openChevron   = null;
    _closeWrap     = null;
    _alertContent  = null;
    _receiptScroll = null;
    _cardsCol      = null;
    _batchSettled  = false;
  },
  cache: false,
  timeoutMs: 0,
});