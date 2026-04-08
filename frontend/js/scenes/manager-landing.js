// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Manager Landing Scene
//  3-column command center: Sales | Checks | Operations
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton } from '../tokens.js';
import { buildButton, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── Module State ──────────────────────────────────
var _el = null;
var _params = null;
var _clockTimer = null;
var _expandedCard = null;
var _expandOrigin = null;
var _drillEl = null;

// Stub data — replaced by API in Chunk 9
var _salesData = null;

// COB% escalation thresholds (configurable)
var COB_WARNING = 30;
var COB_CRITICAL = 35;

// DOM refs for partial re-renders
var _leftCol = null;
var _centerCol = null;
var _rightCol = null;
var _headerLabel = null;

// ── Helpers ───────────────────────────────────────

function fmtDateTime() {
  var now = new Date();
  var mm = String(now.getMonth() + 1).padStart(2, '0');
  var dd = String(now.getDate()).padStart(2, '0');
  var yy = String(now.getFullYear()).slice(2);
  var h = now.getHours();
  var ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  var min = String(now.getMinutes()).padStart(2, '0');
  return mm + '/' + dd + '/' + yy + ' // ' + h + ':' + min + ampm;
}

function managerName() {
  if (!_params) return 'Manager';
  var emp = _params.emp || _params;
  return emp.name || emp.employeeName || 'Manager';
}

function updateHeaderLabel() {
  if (_headerLabel) {
    _headerLabel.textContent = fmtDateTime() + ' // ' + managerName();
  }
}

// ── Scene Header Bar ─────────────────────────────

function buildSceneHeader() {
  var bar = document.createElement('div');
  bar.style.cssText = 'height:34px;background:' + T.mint + ';display:flex;align-items:center;justify-content:space-between;padding:0 10px;flex-shrink:0;';
  bar.style.clipPath = chamfer(4);

  // Left: date // time // managerName
  _headerLabel = document.createElement('div');
  _headerLabel.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.bgDark + ';letter-spacing:1px;';
  updateHeaderLabel();
  bar.appendChild(_headerLabel);

  // Right: X button → returns to login
  var xPair = buildStyledButton(T.darkBtn);
  xPair.wrap.style.width = '36px';
  xPair.wrap.style.height = '24px';
  xPair.inner.style.fontFamily = T.fb;
  xPair.inner.style.fontSize = '16px';
  xPair.inner.style.color = T.mint;
  xPair.inner.textContent = 'X';
  xPair.wrap.addEventListener('pointerup', function() {
    SceneManager.closeAllTransactional();
    SceneManager.unmountWorking('manager-landing');
    SceneManager.openGate('login');
  });
  bar.appendChild(xPair.wrap);

  return bar;
}

// ── Stub Data ────────────────────────────────────

function loadStubData() {
  _salesData = {
    net_sales: 4872.50,
    avg_check: 38.25,
    active_checks: 7,
    total_covers: 42,
    labor_cob: 27.4,
  };
}

// ── Formatting ───────────────────────────────────

function fmt(n) {
  return '$' + Math.abs(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Card UI Builders ─────────────────────────────

function buildCardHeader(label) {
  var bar = document.createElement('div');
  bar.style.cssText = 'background:' + T.mint + ';padding:5px 10px;flex-shrink:0;';
  bar.style.clipPath = chamfer(4);
  var txt = document.createElement('div');
  txt.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + T.bgDark + ';letter-spacing:2px;';
  txt.textContent = '// ' + label + ' //';
  bar.appendChild(txt);
  return bar;
}

function statRow(label, value, color) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;padding:2px 8px;';
  var l = document.createElement('span');
  l.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.textPrimary + ';';
  l.textContent = label;
  var v = document.createElement('span');
  v.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + color + ';font-weight:bold;';
  v.textContent = value;
  row.appendChild(l);
  row.appendChild(v);
  return row;
}

// ── COB% Escalation ──────────────────────────────

function cobColor(pct) {
  if (pct >= COB_CRITICAL) return T.vermillion;
  if (pct >= COB_WARNING) return T.yellow;
  return T.lime;
}

function cobFrameColor(pct) {
  if (pct >= COB_CRITICAL) return T.vermillion;
  if (pct >= COB_WARNING) return T.yellow;
  return T.mint;
}

// ═══════════════════════════════════════════════════
//  LEFT COLUMN
// ═══════════════════════════════════════════════════

function buildLeftColumn() {
  var col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';

  col.appendChild(buildSalesOverviewCard());

  return col;
}

// ── SALES OVERVIEW Card ──────────────────────────

function buildSalesOverviewCard() {
  var d = _salesData || {};
  var cob = d.labor_cob || 0;
  var frameColor = cobFrameColor(cob);

  var card = document.createElement('div');
  card.style.cssText = 'background:' + T.bgDark + ';border:1px solid ' + frameColor + ';display:flex;flex-direction:column;flex:0 0 auto;';
  card.style.clipPath = chamfer(6);
  card.appendChild(buildCardHeader('SALES OVERVIEW'));

  var body = document.createElement('div');
  body.style.cssText = 'padding:6px 0;';
  body.appendChild(statRow('Net Sales:', fmt(d.net_sales), T.gold));
  body.appendChild(statRow('Check Avg:', fmt(d.avg_check), T.gold));
  body.appendChild(statRow('Active Checks:', String(d.active_checks || 0), T.lime));
  body.appendChild(statRow('Total Covers:', String(d.total_covers || 0), T.lime));
  body.appendChild(statRow('Labor COB%:', cob.toFixed(1) + '%', cobColor(cob)));
  card.appendChild(body);

  // >>> drill-down button
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;justify-content:flex-end;padding:4px 8px 2px;';
  btnRow.appendChild(buildButton('>>>', {
    fill: T.darkBtn, color: T.mint, fontSize: '14px', fontFamily: T.fb,
    width: 48, height: 24,
    onTap: function() {
      _expandOrigin = card.getBoundingClientRect();
      _expandedCard = 'sales-overview';
      showDrillDown();
    },
  }));
  card.appendChild(btnRow);

  return card;
}

// ═══════════════════════════════════════════════════
//  DRILL-DOWN OVERLAY (>>> / <<<)
//  Pure CSS expand/collapse — not SceneManager overlay
// ═══════════════════════════════════════════════════

function showDrillDown() {
  if (_drillEl) _drillEl.remove();
  if (!_el) return;
  var d = _salesData || {};
  var rect = _expandOrigin;
  var parentRect = _el.getBoundingClientRect();

  _drillEl = document.createElement('div');
  _drillEl.style.cssText = 'position:absolute;background:' + T.bgDark + ';border:2px solid ' + T.mint + ';display:flex;flex-direction:column;overflow:hidden;z-index:5;transition:top 220ms ease-out,left 220ms ease-out,width 220ms ease-out,height 220ms ease-out;';
  _drillEl.style.clipPath = chamfer(8);

  // Start at card's position
  if (rect) {
    _drillEl.style.top = (rect.top - parentRect.top) + 'px';
    _drillEl.style.left = (rect.left - parentRect.left) + 'px';
    _drillEl.style.width = rect.width + 'px';
    _drillEl.style.height = rect.height + 'px';
  } else {
    _drillEl.style.top = '0';
    _drillEl.style.left = '0';
    _drillEl.style.width = '100%';
    _drillEl.style.height = '100%';
  }

  // Header
  _drillEl.appendChild(buildCardHeader('SALES OVERVIEW'));

  // Expanded content
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;padding:12px;overflow-y:auto;';

  if (_expandedCard === 'sales-overview') {
    var cob = d.labor_cob || 0;
    content.appendChild(statRow('Net Sales:', fmt(d.net_sales), T.gold));
    content.appendChild(statRow('Check Avg:', fmt(d.avg_check), T.gold));
    content.appendChild(statRow('Active Checks:', String(d.active_checks || 0), T.lime));
    content.appendChild(statRow('Total Covers:', String(d.total_covers || 0), T.lime));
    content.appendChild(statRow('Labor COB%:', cob.toFixed(1) + '%', cobColor(cob)));
    // Expanded detail rows
    content.appendChild(statRow('Gross Sales:', fmt(d.gross_sales || 0), T.gold));
    content.appendChild(statRow('Cash Sales:', fmt(d.cash_total || 0), T.gold));
    content.appendChild(statRow('Card Sales:', fmt(d.card_total || 0), T.gold));
    content.appendChild(statRow('Discounts:', fmt(d.discount_total || 0), T.vermillion));
    content.appendChild(statRow('Voids:', fmt(d.void_total || 0), T.vermillion));
    content.appendChild(statRow('Tax:', fmt(d.tax_total || 0), T.gold));
  }
  _drillEl.appendChild(content);

  // <<< close button
  var closeRow = document.createElement('div');
  closeRow.style.cssText = 'display:flex;justify-content:flex-end;padding:6px 10px;flex-shrink:0;';
  closeRow.appendChild(buildButton('<<<', {
    fill: T.darkBtn, color: T.mint, fontSize: '14px', fontFamily: T.fb,
    width: 48, height: 24,
    onTap: function() { hideDrillDown(); },
  }));
  _drillEl.appendChild(closeRow);

  _el.appendChild(_drillEl);

  // Animate to full viewport on next frame
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      _drillEl.style.top = '0';
      _drillEl.style.left = '0';
      _drillEl.style.width = '100%';
      _drillEl.style.height = '100%';
    });
  });
}

function hideDrillDown() {
  if (!_drillEl) return;
  var el = _drillEl;

  if (_expandOrigin && _el) {
    var parentRect = _el.getBoundingClientRect();
    el.style.transition = 'top 220ms ease-in,left 220ms ease-in,width 220ms ease-in,height 220ms ease-in';
    el.style.top = (_expandOrigin.top - parentRect.top) + 'px';
    el.style.left = (_expandOrigin.left - parentRect.left) + 'px';
    el.style.width = _expandOrigin.width + 'px';
    el.style.height = _expandOrigin.height + 'px';
    el.addEventListener('transitionend', function() { el.remove(); }, { once: true });
  } else {
    el.remove();
  }
  _drillEl = null;
  _expandedCard = null;
  _expandOrigin = null;
}

// ═══════════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════════

function renderScene() {
  if (!_el || !_params) return;

  _el.innerHTML = '';
  _el.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;background:' + T.bgDark + ';';

  // ── Scene header bar (34px, mint) ──
  _el.appendChild(buildSceneHeader());

  // ── 3-column grid ──
  var grid = document.createElement('div');
  grid.style.cssText = 'flex:1;display:grid;grid-template-columns:22% 50% 28%;gap:' + T.colGap + 'px;padding:' + T.scenePad + 'px;box-sizing:border-box;overflow:hidden;';

  _leftCol = buildLeftColumn();

  _centerCol = document.createElement('div');
  _centerCol.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;';

  _rightCol = document.createElement('div');
  _rightCol.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';

  grid.appendChild(_leftCol);
  grid.appendChild(_centerCol);
  grid.appendChild(_rightCol);
  _el.appendChild(grid);

  // Start clock updates
  if (_clockTimer) clearInterval(_clockTimer);
  _clockTimer = setInterval(updateHeaderLabel, 30000);
}

// ═══════════════════════════════════════════════════
//  SCENE REGISTRATION
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'manager-landing',

  mount: function(container, params) {
    _el = container;
    _params = params;

    loadStubData();

    var emp = params.emp || params;
    setSceneName(emp.name || emp.employeeName || 'Manager');
    setHeaderBack({
      x: true,
      onClose: function() {
        SceneManager.closeAllTransactional();
        SceneManager.unmountWorking('manager-landing');
        SceneManager.openGate('login');
      },
    });

    renderScene();
  },

  unmount: function() {
    if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null; }
    if (_drillEl) { _drillEl.remove(); _drillEl = null; }
    _el = null;
    _params = null;
    _salesData = null;
    _expandedCard = null;
    _expandOrigin = null;
    _leftCol = null;
    _centerCol = null;
    _rightCol = null;
    _headerLabel = null;
  },
});
