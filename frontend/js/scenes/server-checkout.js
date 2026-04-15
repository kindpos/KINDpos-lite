// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Server Checkout Scene (SM2)
//  Uses OrderSummary left panel + shared card grid from checkout-core
//  Two blockers: open checks + unadjusted tips
//  Buttons: PRINT → FINALIZE
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, buildGap, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { defineScene } from '../scene-manager-2.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';
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
//  FETCH STATE
// ─────────────────────────────────────────────────

function fetchServerState(params) {
  var summaryUrl = '/api/v1/orders/day-summary';
  if (params.employeeId) summaryUrl += '?server_id=' + encodeURIComponent(params.employeeId);

  return Promise.all([
    fetch(summaryUrl).then(function(r) { return r.json(); }),
    fetch('/api/v1/config/tipout').then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/v1/config/store').then(function(r) { return r.json(); }).catch(function() { return {}; }),
  ]).then(function(results) {
    var d = results[0];
    var rules = results[1];
    var store = results[2];
    var today = new Date();

    var tipOutRoles = [];
    if (Array.isArray(rules)) {
      tipOutRoles = rules.map(function(r) {
        return {
          label: r.role_to || r.role_from || 'Tipout',
          percent: r.percentage || 0,
          basis: r.calculation_base || 'Net Sales',
        };
      });
    }

    var state = {
      employeeId:    params.employeeId   || '',
      employeeName:  params.employeeName || '',
      date: (today.getMonth()+1) + '/' + today.getDate() + '/' + String(today.getFullYear()).slice(2),
      netSales:      d.net_sales    || 0,
      liquorSales:   0,
      cashSales:     d.cash_total   || 0,
      cardSales:     d.card_total   || 0,
      totalChecks:   d.total_checks || 0,
      avgCheck:      d.avg_check    || 0,
      openChecks:    d.open_orders  || 0,
      cardTips:      d.card_tips    || 0,
      cashTips:      d.cash_tips    || 0,
      unadjustedTips: d.unadjusted_tips || 0,
      tipOutRoles:   tipOutRoles,
      oneTimeRole:   null,
      tipOutTotal:   0,
      takeHome:      d.card_tips    || 0,
      cashExpected:  parseFloat(((d.cash_total || 0) - (d.card_tips || 0)).toFixed(2)),
      closedOrders:  d.closed_order_ids || [],
      checks:        d.checks || [],
      restaurantName: (store.info && store.info.restaurant_name) || 'KINDpos',
      terminalId: '',
    };
    recalcTipOut(state);
    return state;
  });
}

// ─────────────────────────────────────────────────
//  CARD DEFINITIONS — 6 cards in 2×3 grid
// ─────────────────────────────────────────────────

function getCardDefs(state, opts) {
  return [
    {
      title: 'Sales Summary',
      hero: fmt(state.netSales),
      heroColor: T.gold,
      subtitle: state.totalChecks + ' checks \u2022 ' + fmt(state.avgCheck) + ' avg',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Net Sales',    fmt(state.netSales)));
        el.appendChild(detailRow('Cash Sales',   fmt(state.cashSales)));
        el.appendChild(detailRow('Card Sales',   fmt(state.cardSales)));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Total Checks', String(state.totalChecks), T.mint));
        el.appendChild(detailRow('Avg Check',    fmt(state.avgCheck)));
        if (state.openChecks > 0) {
          el.appendChild(detailRow('Open Checks', String(state.openChecks), RED));
        }
      },
    },
    {
      title: 'Check Stats',
      hero: String(state.totalChecks),
      heroColor: T.mint,
      subtitle: fmt(state.avgCheck) + ' avg check',
      border: T.border,
      statusColor: state.openChecks > 0 ? T.yellow : null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Total Checks', String(state.totalChecks)));
        el.appendChild(detailRow('Avg Check',    fmt(state.avgCheck)));
        if (state.openChecks > 0) {
          el.appendChild(detailRow('Open Checks', String(state.openChecks), RED));
        }
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Closed',       String(state.closedOrders.length)));
      },
    },
    {
      title: 'Tip Summary',
      hero: fmt(state.cardTips + state.cashTips),
      heroColor: T.gold,
      subtitle: 'card tips \u2022 cash tips',
      border: T.border,
      statusColor: state.unadjustedTips > 0 ? T.yellow : null,
      buildShortcuts: opts && opts.buildShortcuts ? function() { return opts.buildShortcuts(state); } : null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Card Tips',    fmt(state.cardTips)));
        el.appendChild(detailRow('Cash Tips',    fmt(state.cashTips)));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Total Tips',   fmt(state.cardTips + state.cashTips), T.gold));
        if (state.unadjustedTips > 0) {
          el.appendChild(detailRow('Unadjusted', String(state.unadjustedTips), T.yellow));
        }
        if (opts && opts.buildShortcuts) {
          el.appendChild(buildGap(8));
          el.appendChild(opts.buildShortcuts(state));
        }
      },
    },
    {
      title: 'Tip-Out Calc',
      hero: '\u2212' + fmt(state.tipOutTotal),
      heroColor: RED,
      subtitle: (state.tipOutRoles.length ? state.tipOutRoles[0].percent + '% rate' : '0%') + ' \u2022 editable',
      border: T.border,
      statusColor: null,
      buildExpanded: function(el) {
        state.tipOutRoles.forEach(function(r) {
          el.appendChild(detailRow(r.label + ' (' + r.percent + '% ' + r.basis + ')', fmt(r.amount)));
        });
        if (state.oneTimeRole && state.oneTimeRole.percent > 0) {
          var ot = state.oneTimeRole;
          el.appendChild(detailRow((ot.label || 'One-Time') + ' ' + ot.percent + '%', fmt(ot.amount)));
        }
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Total Tip-Out', fmt(state.tipOutTotal)));

        var adjPair = buildStyledButton(T.darkBtn);
        adjPair.wrap.style.cssText = 'width:100%;height:36px;margin-top:8px;';
        adjPair.inner.style.fontFamily = T.fb;
        adjPair.inner.style.fontSize = T.fsSmall;
        adjPair.inner.style.color = T.mint;
        adjPair.inner.textContent = 'Adjust %';
        adjPair.wrap.addEventListener('pointerup', function() {
          openAdjustOverlay(state);
        });
        el.appendChild(adjPair.wrap);
      },
    },
    {
      title: 'Take-Home',
      hero: fmt(state.takeHome),
      heroColor: T.gold,
      subtitle: 'tips \u2212 tipout + cash',
      border: T.gold,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Card Tips',    fmt(state.cardTips)));
        el.appendChild(detailRow('Tip-Out',      '\u2212 ' + fmt(state.tipOutTotal), RED));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Take-Home',    fmt(state.takeHome), T.gold));
      },
    },
    {
      title: 'Cash Expected',
      hero: fmt(state.cashExpected),
      heroColor: T.gold,
      subtitle: 'cash sales \u2212 card tips',
      border: T.gold,
      statusColor: null,
      buildExpanded: function(el) {
        el.appendChild(detailRow('Cash Sales',   fmt(state.cashSales)));
        el.appendChild(detailRow('Card Tips',    '\u2212 ' + fmt(state.cardTips), RED));
        el.appendChild(detailDivider());
        el.appendChild(detailRow('Cash Expected', fmt(state.cashExpected), T.gold));
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
    SceneManager.openTransactional('co-tip-adjust', { serverId: state.employeeId, onDone: refreshFn });
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
      var url = '/api/v1/payments/zero-unadjusted';
      if (state.employeeId) url += '?server_id=' + encodeURIComponent(state.employeeId);
      fetch(url, { method: 'POST' })
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
//  ACTION BAR (PRINT → FINALIZE)
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
    fetch('/api/v1/print/server-checkout/' + encodeURIComponent(state.employeeId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server_name: state.employeeName || '' }),
    }).catch(function(err) { console.warn('[KINDpos] Print failed:', err); });
  });
  bar.appendChild(printPair.wrap);
  bar.appendChild(arrow());

  // FINALIZE
  var blocked = isBlocked(state);
  var finPair = buildStyledButton(T.darkBtn);
  finPair.wrap.style.cssText = 'flex:1;height:100%;';

  if (blocked) {
    finPair.inner.style.fontFamily = T.fb;
    finPair.inner.style.fontSize = T.fsSmall;
    finPair.inner.style.color = T.dimText;
    finPair.inner.textContent = '\uD83D\uDD12 //FINALIZE//';
    finPair.wrap.style.pointerEvents = 'none';
    finPair.wrap.style.opacity = '0.5';
  } else if (!sceneState.pinUnlocked) {
    finPair.inner.style.fontFamily = T.fb;
    finPair.inner.style.fontSize = T.fsSmall;
    finPair.inner.style.color = T.mutedText;
    finPair.inner.textContent = '\uD83D\uDD12 //FINALIZE//';
    finPair.wrap.addEventListener('pointerup', function() {
      SceneManager.interrupt('co-manager-pin', {
        onConfirm: function() {
          sceneState.pinUnlocked = true;
          if (bar.parentNode) {
            var newBar = buildActionBar(state, sceneState, refreshFn);
            bar.parentNode.replaceChild(newBar, bar);
          }
        },
        onCancel: function() {},
        params: {},
      });
    });
  } else {
    finPair.inner.style.fontFamily = T.fb;
    finPair.inner.style.fontSize = T.fsSmall;
    finPair.inner.style.color = T.bgDark;
    finPair.inner.textContent = '//FINALIZE//';
    finPair.wrap.addEventListener('pointerup', function() {
      if (isBlocked(state)) return;
      doFinalize(state);
    });
  }
  bar.appendChild(finPair.wrap);

  return bar;
}

// ─────────────────────────────────────────────────
//  FINALIZE FLOW
// ─────────────────────────────────────────────────

function completeFinalizeAfterTips(state) {
  fetch('/api/v1/orders/close-batch', { method: 'POST' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      OrderSummary.hide();
      SceneManager.closeTransactional('server-checkout');
    })
    .catch(function(err) {
      console.error('[KINDpos] Finalize failed:', err);
      showToast('Checkout failed \u2014 check connection');
    });
}

function doFinalize(state) {
  SceneManager.interrupt('cash-tip-declare', {
    onConfirm: function(amount) {
      if (amount != null && amount > 0) {
        fetch('/api/v1/servers/declare-cash-tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ server_id: state.employeeId, amount: amount }),
        }).then(function() { completeFinalizeAfterTips(state); })
          .catch(function() { completeFinalizeAfterTips(state); });
      } else {
        completeFinalizeAfterTips(state);
      }
    },
    onCancel: function() {
      completeFinalizeAfterTips(state);
    },
    params: {},
  });
}

// ─────────────────────────────────────────────────
//  ADJUST % OVERLAY
// ─────────────────────────────────────────────────

function openAdjustOverlay(state) {
  var workingRoles = state.tipOutRoles.map(function(r) {
    return { label: r.label, percent: r.percent, basis: r.basis };
  });
  var workingOneTime = state.oneTimeRole
    ? { label: state.oneTimeRole.label, percent: state.oneTimeRole.percent, basis: state.oneTimeRole.basis }
    : { label: 'One-Time', percent: 0, basis: 'Net Sales' };

  SceneManager.openTransactional('adjust-pct', {
    workingRoles: workingRoles,
    workingOneTime: workingOneTime,
    state: state,
    recalcTipOut: recalcTipOut,
  });
}

// ─────────────────────────────────────────────────
//  OrderSummary HELPERS
// ─────────────────────────────────────────────────

function buildSections(state) {
  var sections = [
    {
      title: 'SALES',
      rows: [
        { label: 'Checks Closed', value: String(state.totalChecks) },
        { label: 'Net Sales', value: fmt(state.netSales) },
        { label: 'Cash Sales', value: fmt(state.cashSales) },
        { label: 'Card Sales', value: fmt(state.cardSales) },
      ],
    },
    {
      title: 'TIPS',
      rows: [
        { label: 'Card Tips', value: fmt(state.cardTips) },
        { label: 'Cash Tips', value: fmt(state.cashTips) },
        { label: 'Total Tips', value: fmt(state.cardTips + state.cashTips) },
      ],
    },
    {
      title: 'TIP-OUT',
      rows: state.tipOutRoles.map(function(r) {
        return { label: r.label + ' ' + r.percent + '%', value: fmt(r.amount) };
      }).concat([
        { label: 'Tip-Out Total', value: '\u2212 ' + fmt(state.tipOutTotal) },
      ]),
    },
    {
      title: 'TAKE-HOME',
      rows: [
        { label: 'Take-Home', value: fmt(state.takeHome) },
      ],
    },
  ];

  if (state.openChecks > 0) {
    sections.push({
      title: 'OPEN',
      rows: [{ label: 'Open Checks', value: String(state.openChecks) }],
    });
  }
  if (state.unadjustedTips > 0) {
    sections.push({
      title: 'UNADJUSTED',
      rows: [{ label: 'Unadjusted Tips', value: String(state.unadjustedTips) }],
    });
  }

  return sections;
}

function showSummaryPanel(state) {
  OrderSummary.showCheckout({
    title: 'CHECKOUT RECAP',
    label: state.employeeName || state.date,
    sections: buildSections(state),
    cardSales: state.cardSales,
    tips: state.cardTips + state.cashTips,
    cashExpected: state.cashExpected,
  });
}

function updateSummaryPanel(state) {
  OrderSummary.updateCheckout({
    label: state.employeeName || state.date,
    sections: buildSections(state),
    cardSales: state.cardSales,
    tips: state.cardTips + state.cashTips,
    cashExpected: state.cashExpected,
  });
}

// ═══════════════════════════════════════════════════
//  MAIN SCENE (SM2)
// ═══════════════════════════════════════════════════

defineScene({
  name: 'server-checkout',
  state: {
    data: null,
    expandedIdx: null,
    gridContainer: null,
    rightCol: null,
    pinUnlocked: false,
    accordionCooldown: false,
  },
  render: function(container, params, state) {
    setSceneName('Checkout: ' + (params.employeeName || ''));
    setHeaderBack({ back: true, x: true, onBack: function() {
      OrderSummary.hide();
      SceneManager.closeTransactional('server-checkout');
    }});

    container.style.cssText = [
      'width:100%;height:100%;',
      'display:flex;flex-direction:column;gap:8px;',
      'padding:' + SCENE_PAD + 'px;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');

    function refreshScene() {
      if (!state.rightCol || !state.data) return;
      fetchServerState({ employeeId: state.data.employeeId, employeeName: state.data.employeeName }).then(function(newState) {
        newState.restaurantName = state.data.restaurantName;
        newState.terminalId = state.data.terminalId;
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
        columns: 2,
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
        columns: 2,
        buildShortcuts: function(s) { return buildShortcutRow(s, refreshScene); },
        onExpand: function(i) { expandCard(i); },
        onCollapse: function() { collapseToGrid(); },
      };
      var defs = getCardDefs(state.data, cardOpts);
      state.gridContainer.appendChild(buildCardGrid(defs, cardOpts));
    }

    // Fetch and build
    fetchServerState(params).then(function(data) {
      state.data = data;

      // Left: OrderSummary panel
      showSummaryPanel(state.data);

      // Right: card grid + banner + action bar inside main card
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
//  TRANSACTIONAL: adjust-pct (SM2)
// ─────────────────────────────────────────────────

function buildAdjustRow(role) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:10px;font-family:' + T.fb + ';';

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-size:' + T.fsMed + ';color:' + T.mint + ';min-width:80px;';
  nameEl.textContent = role.label;

  var basisBtn = document.createElement('div');
  basisBtn.style.cssText = 'font-size:' + T.fsMed + ';color:' + T.mint + ';cursor:pointer;min-width:90px;padding:4px 6px;border:1px solid ' + T.border + ';text-align:center;';
  basisBtn.textContent = role.basis;
  basisBtn.addEventListener('pointerup', function() {
    role.basis = role.basis === 'Net Sales' ? 'Liquor Sales' : 'Net Sales';
    basisBtn.textContent = role.basis;
  });

  var decBtn = buildStyledButton(T.bgDark);
  decBtn.wrap.style.width = '36px'; decBtn.wrap.style.height = '36px';
  decBtn.inner.style.fontFamily = T.fb; decBtn.inner.style.fontSize = T.fsBtn; decBtn.inner.style.color = T.mint;
  decBtn.inner.textContent = '\u2212';
  decBtn.wrap.addEventListener('pointerup', function() {
    if (role.percent > 0) { role.percent = parseFloat((role.percent - 0.5).toFixed(1)); pctEl.textContent = role.percent + '%'; }
  });

  var pctEl = document.createElement('div');
  pctEl.style.cssText = 'min-width:48px;text-align:center;font-family:' + T.fb + ';font-size:' + T.fsMed + ';color:' + T.gold + ';border:2px solid ' + T.gold + ';padding:4px 6px;';
  pctEl.textContent = role.percent + '%';

  var incBtn = buildStyledButton(T.bgDark);
  incBtn.wrap.style.width = '36px'; incBtn.wrap.style.height = '36px';
  incBtn.inner.style.fontFamily = T.fb; incBtn.inner.style.fontSize = T.fsBtn; incBtn.inner.style.color = T.mint;
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

defineScene({
  name: 'adjust-pct',
  render: function(container, params) {
    setHeaderBack({ back: true, onBack: function() {
      SceneManager.closeTransactional('adjust-pct');
    }});

    container.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;padding:' + T.scenePad + 'px;box-sizing:border-box;';

    var title = document.createElement('div');
    title.style.cssText = 'font-family:' + T.fh + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';letter-spacing:1px;margin-bottom:' + T.colGapSm + 'px;';
    title.textContent = 'ADJUST TIP-OUT %';
    container.appendChild(title);

    var scrollArea = document.createElement('div');
    scrollArea.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:' + T.colGapSm + 'px;';

    var roles = params.workingRoles || [];
    for (var i = 0; i < roles.length; i++) {
      scrollArea.appendChild(buildAdjustRow(roles[i]));
    }

    if (params.workingOneTime) {
      var divider = document.createElement('div');
      divider.style.cssText = 'height:1px;background:' + T.border + ';margin:8px 0;';
      scrollArea.appendChild(divider);

      var otLabel = document.createElement('div');
      otLabel.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';margin-bottom:4px;';
      otLabel.textContent = 'ONE-TIME';
      scrollArea.appendChild(otLabel);
      scrollArea.appendChild(buildAdjustRow(params.workingOneTime));
    }

    container.appendChild(scrollArea);

    var actionBar = document.createElement('div');
    actionBar.style.cssText = 'flex-shrink:0;display:flex;gap:10px;justify-content:flex-end;padding-top:10px;';

    actionBar.appendChild(buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsBtn, width: 120, height: 40,
      onTap: function() { SceneManager.closeTransactional('adjust-pct'); },
    }));
    actionBar.appendChild(buildButton('SAVE', {
      fill: T.darkBtn, color: T.gold, fontSize: T.fsBtn, width: 120, height: 40,
      onTap: function() {
        var st = params.state;
        if (st) {
          st.tipOutRoles = roles;
          if (params.workingOneTime) st.oneTimeRole = params.workingOneTime;
          if (params.recalcTipOut) params.recalcTipOut(st);
        }
        var payload = roles.map(function(r) { return { label: r.label, percent: r.percent, basis: r.basis }; });
        fetch('/api/v1/config/tipout', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(function(err) { console.error('[KINDpos] Tipout save failed:', err); });

        SceneManager.closeTransactional('adjust-pct');
      },
    }));
    container.appendChild(actionBar);
  },
});

// ─────────────────────────────────────────────────
//  INTERRUPT: cash-tip-declare (SM2)
// ─────────────────────────────────────────────────

defineScene({
  name: 'cash-tip-declare',
  render: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + T.gold + ';padding:' + T.scenePad + 'px;min-width:300px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsMed + ';color:' + T.gold + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// CASH TIPS //';
    panel.appendChild(lbl);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;margin-bottom:8px;';
    msg.textContent = 'Declare cash tips received this shift:';
    panel.appendChild(msg);

    var display = document.createElement('div');
    display.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsMed + ';color:' + T.gold + ';background:' + T.bgDark + ';padding:10px;margin-bottom:' + T.colGapSm + 'px;min-height:52px;min-width:200px;text-align:center;border:2px solid ' + T.border + ';';
    display.textContent = '$0.00';
    panel.appendChild(display);

    var buffer = '';
    function updateDisplay() {
      var cents = parseInt(buffer || '0', 10);
      display.textContent = '$' + (cents / 100).toFixed(2);
    }

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;';
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];
    for (var k = 0; k < keys.length; k++) {
      (function(key) {
        grid.appendChild(buildButton(key, {
          fill: T.darkBtn,
          color: key === 'CLR' ? T.vermillion : (key === 'DEL' ? T.gold : T.mint),
          fontSize: T.fsSmall, fontFamily: T.fb, height: 44,
          onTap: function() {
            if (key === 'CLR') { buffer = ''; }
            else if (key === 'DEL') { buffer = buffer.slice(0, -1); }
            else { if (buffer.length < 8) buffer += key; }
            updateDisplay();
          },
        }));
      })(keys[k]);
    }
    panel.appendChild(grid);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';
    btns.appendChild(buildButton('DECLARE', {
      fill: T.darkBtn, color: T.gold, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() {
        var cents = parseInt(buffer || '0', 10);
        params.onConfirm(cents / 100);
      },
    }));
    btns.appendChild(buildButton('SKIP', {
      fill: T.darkBtn, color: T.mutedText, fontSize: T.fsBtn, width: 130, height: 44,
      onTap: function() { params.onCancel(); },
    }));
    panel.appendChild(btns);
    container.appendChild(panel);
  },
});
