// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Close Day Scene (SM2)
//  Uses OrderSummary left panel + shared card grid from checkout-core
//  One blocker: open checks
//  Buttons: PRINT → SUBMIT BATCH → CLOSE DAY
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, buildGap, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { defineScene } from '../scene-manager-2.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { OrderSummary } from '../order-summary.js';
import { buildCard } from '../theme-manager.js';
import {
  fmt, detailRow, detailDivider, buildMixBar,
  buildCardGrid, buildExpandedCard,
  CARD_GAP, ACTION_H, BANNER_H, COL_GAP, SCENE_PAD, RED,
} from './checkout-core.js';

// ─────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────

function isBlocked(state) {
  return state.openChecks > 0;
}

// ─────────────────────────────────────────────────
//  FETCH STATE
// ─────────────────────────────────────────────────

function fetchDayState(params) {
  return Promise.all([
    fetch('/api/v1/orders/day-summary').then(function(r) { return r.json(); }),
    fetch('/api/v1/config/tipout').then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/v1/config/store').then(function(r) { return r.json(); }).catch(function() { return {}; }),
  ]).then(function(results) {
    var d = results[0];
    var rules = results[1];
    var store = results[2];
    var today = new Date();

    var totalTipOut = 0;
    var cardTips = d.card_tips || 0;
    var netSales = d.net_sales || 0;
    if (Array.isArray(rules)) {
      rules.forEach(function(r) {
        var basis = r.calculation_base === 'Net Sales' ? netSales : cardTips;
        totalTipOut += basis * (r.percentage || 0) / 100;
      });
    }
    totalTipOut = parseFloat(totalTipOut.toFixed(2));

    return {
      date: (today.getMonth()+1) + '/' + today.getDate() + '/' + String(today.getFullYear()).slice(2),
      restaurantName: (store.info && store.info.restaurant_name) || 'KINDpos',
      printedBy: params.managerName || 'Manager',

      // Revenue
      grossSales:    d.gross_sales    || 0,
      voidsTotal:    d.void_total     || 0, voidsCount: d.void_count || 0,
      discTotal:     d.discount_total || 0, discCount:  d.discount_count || 0,
      netSales:      netSales,
      taxCollected:  d.tax_total      || 0,

      // Payments
      cashSales:     d.cash_total  || 0, cashCount: d.cash_count || 0,
      cardSales:     d.card_total  || 0, cardCount: d.card_count || 0,
      totalPayments: (d.cash_total || 0) + (d.card_total || 0),
      totalTips:     d.total_tips  || 0,
      cardTips:      cardTips,
      cashTips:      d.cash_tips   || 0,

      // Categories
      categories: d.categories || [],

      // Check stats
      totalChecks: d.total_checks || 0,
      avgCheck:    d.avg_check    || 0,
      covers:      d.guest_count  || 0,
      openChecks:  d.open_orders  || 0,

      // Dayparts
      dayparts: d.dayparts || [],

      // Tips
      totalTipOut:    totalTipOut,
      unadjustedTips: d.unadjusted_tips || 0,

      // Batch
      batchTransactions: (d.cash_count || 0) + (d.card_count || 0),
      batchTotal:        (d.cash_total || 0) + (d.card_total || 0),

      // Checks
      checks:       d.checks || [],
      closedOrders: d.closed_order_ids || [],
    };
  });
}

// ─────────────────────────────────────────────────
//  CARD DEFINITIONS — 6 cards in 3×2 grid
// ─────────────────────────────────────────────────

function getCardDefs(state, opts) {
  var blocked = state.openChecks > 0;
  return [
    {
      title: 'Revenue Summary',
      hero: fmt(state.netSales),
      heroColor: T.gold,
      subtitle: 'Gross / Voids / Disc / Net',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Gross Sales',  fmt(state.grossSales)));
        el.appendChild(detailRow('Voids (' + state.voidsCount + ')', '\u2212 ' + fmt(state.voidsTotal), RED));
        el.appendChild(detailRow('Discounts (' + state.discCount + ')', '\u2212 ' + fmt(state.discTotal), RED));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Net Sales',    fmt(state.netSales), T.gold));
        el.appendChild(detailRow('Tax Collected', fmt(state.taxCollected), T.mint));
      },
    },
    {
      title: 'Payment Breakdown',
      hero: fmt(state.cardSales),
      heroColor: T.gold,
      subtitle: 'Cash / Card / Tips',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Cash (' + state.cashCount + ')', fmt(state.cashSales)));
        el.appendChild(detailRow('Card (' + state.cardCount + ')', fmt(state.cardSales)));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Total Payments', fmt(state.totalPayments), T.gold));
        el.appendChild(detailRow('Total Tips (CC)', fmt(state.totalTips)));
        var total = state.cashSales + state.cardSales;
        if (total > 0) {
          var pct = Math.round((state.cardSales / total) * 100);
          el.appendChild(buildMixBar(100 - pct, pct));
        }
      },
    },
    {
      title: 'Category Sales',
      hero: fmt(state.netSales),
      heroColor: T.gold,
      subtitle: 'by menu category',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        state.categories.forEach(function(c) {
          el.appendChild(detailRow(c.name + ' (' + c.count + ')', fmt(c.total)));
        });
        if (!state.categories.length) {
          el.appendChild(detailRow('No categories', '\u2014', T.mint));
        }
      },
    },
    {
      title: 'Check Stats',
      hero: blocked ? '\u26A0 ' + state.openChecks : String(state.totalChecks),
      heroColor: blocked ? RED : T.cyan,
      subtitle: blocked ? 'open \u2014 must close' : state.totalChecks + ' checks \u00B7 ' + fmt(state.avgCheck) + ' avg',
      border: blocked ? RED : T.border,
      statusColor: blocked ? RED : null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Total Checks', String(state.totalChecks), T.mint));
        el.appendChild(detailRow('Average Check', fmt(state.avgCheck)));
        el.appendChild(detailRow('Covers', String(state.covers), T.mint));
        if (blocked) {
          el.appendChild(detailRow('Open Checks', String(state.openChecks), RED));
        }
      },
    },
    {
      title: 'Daypart Summary',
      hero: fmt(state.netSales),
      heroColor: T.gold,
      subtitle: 'AM / PM / Late split',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        state.dayparts.forEach(function(dp) {
          el.appendChild(detailRow(dp.name + ' (' + dp.checks + ' chk)', fmt(dp.sales)));
        });
        if (!state.dayparts.length) {
          el.appendChild(detailRow('No daypart data', '\u2014', T.mint));
        }
      },
    },
    {
      title: 'Tips & Gratuity',
      hero: fmt(state.totalTips),
      heroColor: T.gold,
      subtitle: 'collected \u2022 tip-out paid',
      border: T.border,
      statusColor: null,
      buildShortcuts: opts && opts.buildShortcuts ? function() { return opts.buildShortcuts(state); } : null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Total Tips (CC)', fmt(state.totalTips)));
        el.appendChild(detailRow('Total Tip-Out', '\u2212 ' + fmt(state.totalTipOut), RED));
        el.appendChild(detailDivider());
        var net = parseFloat((state.totalTips - state.totalTipOut).toFixed(2));
        el.appendChild(detailRow('Server Net Tips', fmt(net), T.gold));
        if (state.unadjustedTips > 0) {
          el.appendChild(detailRow('Unadjusted', String(state.unadjustedTips), T.yellow));
        }
        if (opts && opts.buildShortcuts) {
          el.appendChild(buildGap(8));
          el.appendChild(opts.buildShortcuts(state));
        }
      },
    },
  ];
}

// ─────────────────────────────────────────────────
//  SHORTCUT ROW (UNADJUSTED + $0 ALL)
// ─────────────────────────────────────────────────

function buildShortcutRow(state, refreshFn) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;';
  row.setAttribute('data-shortcut', '1');

  var uPair = buildStyledButton(T.darkBtn);
  uPair.wrap.style.cssText = 'flex:1;height:34px;';
  uPair.inner.style.fontFamily = T.fb;
  uPair.inner.style.fontSize = T.fsSmall;
  uPair.inner.style.color = T.lavender;
  uPair.inner.textContent = 'UNADJUSTED';
  uPair.wrap.addEventListener('pointerup', function() {
    SceneManager.openTransactional('co-tip-adjust', { onDone: refreshFn });
  });
  row.appendChild(uPair.wrap);

  var zPair = buildStyledButton(T.darkBtn);
  zPair.wrap.style.cssText = 'flex:1;height:34px;';
  zPair.inner.style.fontFamily = T.fb;
  zPair.inner.style.fontSize = T.fsSmall;
  zPair.inner.style.color = RED;
  zPair.inner.textContent = '$0 ALL';
  zPair.wrap.addEventListener('pointerup', function() {
    doZeroAll(state, refreshFn);
  });
  row.appendChild(zPair.wrap);

  return row;
}

function doZeroAll(state, refreshFn) {
  var count = state.unadjustedTips || 0;
  if (count === 0) return;

  SceneManager.interrupt('co-zero-confirm', {
    onConfirm: function() {
      fetch('/api/v1/payments/zero-unadjusted', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function() { if (refreshFn) refreshFn(); })
        .catch(function(err) {
          console.error('[KINDpos] Zero all failed:', err);
          showToast('Zero-all failed \u2014 check connection');
        });
    },
    onCancel: function() {},
    params: { count: count },
  });
}

// ─────────────────────────────────────────────────
//  ACTION BAR (PRINT → SUBMIT BATCH → CLOSE DAY)
// ─────────────────────────────────────────────────

function buildActionBar(state, sceneState, refreshFn) {
  var bar = document.createElement('div');
  bar.style.cssText = 'flex-shrink:0;height:' + ACTION_H + 'px;display:flex;align-items:stretch;gap:8px;';

  function arrow() {
    var el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';flex-shrink:0;';
    el.textContent = '\u2192';
    return el;
  }

  // PRINT
  var printPair = buildStyledButton(T.darkBtn);
  printPair.wrap.style.cssText = 'flex:1;height:100%;';
  printPair.inner.style.fontFamily = T.fb;
  printPair.inner.style.fontSize = '27px';
  printPair.inner.style.color = T.cyan;
  printPair.inner.textContent = '//PRINT//';
  printPair.wrap.addEventListener('pointerup', function() {
    fetch('/api/v1/print/sales-recap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printed_by: state.printedBy || 'Manager' }),
    }).catch(function(err) { console.warn('[KINDpos] Print failed:', err); });
  });
  bar.appendChild(printPair.wrap);
  bar.appendChild(arrow());

  // SUBMIT BATCH
  var batchPair = buildStyledButton(T.darkBtn);
  batchPair.wrap.style.cssText = 'flex:1;height:100%;';
  batchPair.inner.style.fontFamily = T.fb;
  batchPair.inner.style.fontSize = T.fsSmall;
  batchPair.inner.style.color = T.gold;
  batchPair.inner.textContent = sceneState.batchSettled ? '\u2713 SETTLED' : '//SUBMIT BATCH//';
  if (sceneState.batchSettled) {
    batchPair.wrap.style.pointerEvents = 'none';
    batchPair.inner.style.color = T.mint;
  } else {
    batchPair.wrap.addEventListener('pointerup', function() {
      SceneManager.openTransactional('batch-settlement', {
        batchTransactions: state.batchTransactions,
        batchTotal: state.batchTotal,
        onSettled: function() {
          sceneState.batchSettled = true;
          batchPair.inner.textContent = '\u2713 SETTLED';
          batchPair.inner.style.color = T.mint;
          batchPair.wrap.style.pointerEvents = 'none';
        },
      });
    });
  }
  bar.appendChild(batchPair.wrap);
  bar.appendChild(arrow());

  // CLOSE DAY
  var blocked = isBlocked(state);
  var closePair = buildStyledButton(T.darkBtn);
  closePair.wrap.style.cssText = 'flex:1;height:100%;';

  if (blocked) {
    closePair.inner.style.fontFamily = T.fb;
    closePair.inner.style.fontSize = T.fsSmall;
    closePair.inner.style.color = '#555';
    closePair.inner.textContent = '\uD83D\uDD12 //CLOSE DAY//';
    closePair.wrap.style.pointerEvents = 'none';
    closePair.wrap.style.opacity = '0.5';
  } else if (!sceneState.pinUnlocked) {
    closePair.inner.style.fontFamily = T.fb;
    closePair.inner.style.fontSize = T.fsSmall;
    closePair.inner.style.color = '#888';
    closePair.inner.textContent = '\uD83D\uDD12 //CLOSE DAY//';
    closePair.wrap.addEventListener('pointerup', function() {
      SceneManager.interrupt('co-manager-pin', {
        onConfirm: function() {
          sceneState.pinUnlocked = true;
          if (bar.parentNode) {
            bar.parentNode.replaceChild(buildActionBar(state, sceneState, refreshFn), bar);
          }
        },
        onCancel: function() {},
        params: {},
      });
    });
  } else {
    closePair.inner.style.fontFamily = T.fb;
    closePair.inner.style.fontSize = T.fsSmall;
    closePair.inner.style.color = '#1a1a1a';
    closePair.inner.textContent = '//CLOSE DAY//';
    closePair.wrap.addEventListener('pointerup', function() {
      if (isBlocked(state)) return;
      doCloseDay(state);
    });
  }
  bar.appendChild(closePair.wrap);

  return bar;
}

// ─────────────────────────────────────────────────
//  CLOSE DAY ACTION
// ─────────────────────────────────────────────────

function doCloseDay(state) {
  fetch('/api/v1/orders/close-day', { method: 'POST' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      console.log('[KINDpos] Day closed:', data);
      OrderSummary.hide();
      SceneManager.closeTransactional('close-day');
    })
    .catch(function(err) {
      console.error('[KINDpos] Close day failed:', err);
      showToast('Close day failed \u2014 check connection');
    });
}

// ─────────────────────────────────────────────────
//  OrderSummary HELPERS
// ─────────────────────────────────────────────────

function buildSections(state) {
  var sections = [
    {
      title: 'REVENUE',
      rows: [
        { label: 'Gross Sales', value: fmt(state.grossSales) },
        { label: 'Voids (' + state.voidsCount + ')', value: '\u2212 ' + fmt(state.voidsTotal) },
        { label: 'Discounts (' + state.discCount + ')', value: '\u2212 ' + fmt(state.discTotal) },
        { label: 'NET SALES', value: fmt(state.netSales) },
        { label: 'Tax', value: fmt(state.taxCollected) },
      ],
    },
    {
      title: 'PAYMENTS',
      rows: [
        { label: 'Cash (' + state.cashCount + ')', value: fmt(state.cashSales) },
        { label: 'Card (' + state.cardCount + ')', value: fmt(state.cardSales) },
        { label: 'Total', value: fmt(state.totalPayments) },
      ],
    },
    {
      title: 'CHECKS',
      rows: [
        { label: 'Total Checks', value: String(state.totalChecks) },
        { label: 'Average', value: fmt(state.avgCheck) },
        { label: 'Covers', value: String(state.covers) },
      ],
    },
  ];

  if (state.categories && state.categories.length > 0) {
    sections.push({
      title: 'CATEGORIES',
      rows: state.categories.map(function(c) {
        return { label: c.name, value: fmt(c.total) };
      }),
    });
  }

  if (state.dayparts && state.dayparts.length > 0) {
    sections.push({
      title: 'DAYPARTS',
      rows: state.dayparts.map(function(d) {
        return { label: d.name + ' (' + d.checks + ')', value: fmt(d.sales) };
      }),
    });
  }

  sections.push({
    title: 'TIPS',
    rows: [
      { label: 'Total Tips', value: fmt(state.totalTips) },
      { label: 'Card Tips', value: fmt(state.cardTips) },
      { label: 'Cash Tips', value: fmt(state.cashTips) },
      { label: 'Tip-Out', value: '\u2212 ' + fmt(state.totalTipOut) },
    ],
  });

  if (state.openChecks > 0) {
    sections.push({
      title: 'OPEN',
      rows: [
        { label: 'Open Checks', value: String(state.openChecks) },
      ],
    });
  }

  return sections;
}

function showSummaryPanel(state) {
  OrderSummary.showCheckout({
    title: 'CLOSE DAY',
    label: state.date,
    sections: buildSections(state),
    cardSales: state.cardSales,
    tips: state.totalTips,
    cashExpected: state.cashSales + state.cashTips,
  });
}

function updateSummaryPanel(state) {
  OrderSummary.updateCheckout({
    label: state.date,
    sections: buildSections(state),
    cardSales: state.cardSales,
    tips: state.totalTips,
    cashExpected: state.cashSales + state.cashTips,
  });
}

// ═══════════════════════════════════════════════════
//  MAIN SCENE (SM2)
// ═══════════════════════════════════════════════════

defineScene({
  name: 'close-day',
  state: {
    data: null,
    expandedIdx: null,
    gridContainer: null,
    rightCol: null,
    pinUnlocked: false,
    batchSettled: false,
    accordionCooldown: false,
  },
  render: function(container, params, state) {
    setSceneName('Close Day');
    setHeaderBack({ back: true, x: true, onBack: function() {
      OrderSummary.hide();
      SceneManager.closeTransactional('close-day');
    }});

    container.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;flex-direction:column;gap:8px;',
      'padding:' + SCENE_PAD + 'px;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');

    function refreshScene() {
      if (!state.rightCol || !state.data) return;
      fetchDayState({ managerName: state.data.printedBy }).then(function(newState) {
        state.data = newState;
        state.expandedIdx = null;
        updateSummaryPanel(state.data);
        rebuildRight();
      });
    }

    function rebuildRight() {
      state.rightCol.innerHTML = '';
      state.rightCol.style.padding = '8px';
      state.rightCol.style.gap = '8px';
      state.gridContainer = document.createElement('div');
      state.gridContainer.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

      var cardOpts = {
        columns: 3,
        buildShortcuts: function(s) { return buildShortcutRow(s, refreshScene); },
        onExpand: function(idx) { expandCard(idx); },
        onCollapse: function() { collapseToGrid(); },
      };

      var defs = getCardDefs(state.data, cardOpts);
      state.gridContainer.appendChild(buildCardGrid(defs, cardOpts));
      state.rightCol.appendChild(state.gridContainer);
      state.rightCol.appendChild(buildActionBar(state.data, state, refreshScene));
    }

    function expandCard(idx) {
      if (!state.data || !state.gridContainer || state.accordionCooldown) return;
      state.accordionCooldown = true;
      setTimeout(function() { state.accordionCooldown = false; }, 150);
      state.expandedIdx = idx;
      state.gridContainer.innerHTML = '';

      var cardOpts = {
        buildShortcuts: function(s) { return buildShortcutRow(s, refreshScene); },
        onExpand: function(i) { expandCard(i); },
        onCollapse: function() { collapseToGrid(); },
      };
      var defs = getCardDefs(state.data, cardOpts);
      state.gridContainer.appendChild(buildExpandedCard(defs, idx, cardOpts));
    }

    function collapseToGrid() {
      if (!state.data || !state.gridContainer || state.accordionCooldown) return;
      state.accordionCooldown = true;
      setTimeout(function() { state.accordionCooldown = false; }, 150);
      state.expandedIdx = null;
      state.gridContainer.innerHTML = '';

      var cardOpts = {
        columns: 3,
        buildShortcuts: function(s) { return buildShortcutRow(s, refreshScene); },
        onExpand: function(i) { expandCard(i); },
        onCollapse: function() { collapseToGrid(); },
      };
      var defs = getCardDefs(state.data, cardOpts);
      state.gridContainer.appendChild(buildCardGrid(defs, cardOpts));
    }

    fetchDayState(params).then(function(data) {
      state.data = data;

      showSummaryPanel(state.data);

      var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
      pair.card.style.display = 'flex';
      pair.card.style.flexDirection = 'column';
      pair.card.style.flex = '1';
      pair.card.style.overflow = 'hidden';
      pair.wrap.style.flex = '1';
      pair.wrap.style.display = 'flex';

      state.rightCol = pair.card;
      rebuildRight();
      container.appendChild(pair.wrap);
    });
  },
  unmount: function(state) {
    OrderSummary.hide();
  },
});

// ─────────────────────────────────────────────────
//  TRANSACTIONAL: batch-settlement (SM2)
// ─────────────────────────────────────────────────

defineScene({
  name: 'batch-settlement',
  render: function(container, params) {
    var batchPanel = document.createElement('div');
    batchPanel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';padding:' + T.scenePad + 'px;min-width:300px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsMed + ';color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// SUBMIT BATCH //';
    batchPanel.appendChild(lbl);

    var info = document.createElement('div');
    info.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;';
    info.textContent = (params.batchTransactions || 0) + ' transactions \u2014 ' + fmt(params.batchTotal || 0);
    batchPanel.appendChild(info);

    var submitBtn = buildButton('SETTLE', {
      fill: T.darkBtn, color: T.gold, fontSize: T.fsBtnSm, height: 44,
      onTap: function() {
        fetch('/api/v1/payments/batch-settle', { method: 'POST' })
          .then(function(r) { return r.json(); })
          .then(function() {
            if (params.onSettled) params.onSettled();
            SceneManager.closeTransactional('batch-settlement');
          })
          .catch(function(err) {
            console.error('[KINDpos] Batch settle failed:', err);
            showToast('Batch settle failed');
          });
      },
    });
    submitBtn.style.width = '240px';
    batchPanel.appendChild(submitBtn);

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 40,
      onTap: function() { SceneManager.closeTransactional('batch-settlement'); },
    });
    cancelBtn.style.width = '240px';
    batchPanel.appendChild(cancelBtn);
    container.appendChild(batchPanel);
  },
});
