// =======================================================
//  KINDpos Terminal - Tip Adjustment Scene (v3 Manager-Style)
//  Accordion server groups | Stacked check cards | Side numpad
//  Nice. Dependable. Yours.
// =======================================================

import { T, chamfer, buildStyledButton, bevelEdges } from '../../tokens.js';
import { buildButton, showToast } from '../../components.js';
import { SceneManager } from '../../scene-manager.js';
import { setSceneName, setHeaderBack } from '../../app.js';
import { buildNumpad } from '../../numpad.js';

// == State =============================================
var checks = [];
var _clockIv = null;
var _role = 'server';
var _sceneName = '';
var _params = {};

// DOM refs
var _mainRow = null;        // flex row: content + numpad side
var _contentPanel = null;   // left scrollable content
var _numpadSide = null;     // right numpad panel (appears on tap)
var _statStripEl = null;    // stat strip at top
var _checksWrap = null;     // scrollable check cards area
var _expandedSrv = {};      // which server accordions are open (manager mode)
var _tipCallback = null;    // callback after numpad entry

// == HELPERS ============================================

function fmt(n) { return '$' + (n || 0).toFixed(2); }

function isUnadjusted(c) { return c.tip_amount == null; }

function getUnadjCount() {
  return checks.filter(function(c) { return isUnadjusted(c); }).length;
}

function getTipTotal() {
  return checks.filter(function(c) { return !isUnadjusted(c); })
    .reduce(function(s, c) { return s + c.tip_amount; }, 0);
}

function getServerGroups() {
  var groups = {};
  var order = [];
  checks.forEach(function(c) {
    var key = c.server_id || '_self';
    if (!groups[key]) {
      groups[key] = { id: key, name: c.server_name || (_role === 'manager' ? 'Unknown' : ''), checks: [] };
      order.push(key);
    }
    groups[key].checks.push(c);
  });
  return order.map(function(k) { return groups[k]; });
}

function getGroupUnadjCount(group) {
  return group.checks.filter(function(c) { return isUnadjusted(c); }).length;
}

function getGroupTipTotal(group) {
  return group.checks.filter(function(c) { return !isUnadjusted(c); })
    .reduce(function(s, c) { return s + c.tip_amount; }, 0);
}

// == FETCH =============================================

function fetchChecks(params) {
  var url = '/api/v1/orders/day-summary';
  if (params.employeeId && _role !== 'manager') url += '?server_id=' + encodeURIComponent(params.employeeId);
  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var raw = data.checks || [];
      return raw.filter(function(c) {
        return c.status === 'closed' && c.method === 'card';
      }).map(function(c) {
        return {
          check_id: c.checkId,
          check_num: c.checkLabel || c.checkId,
          payment_id: c.paymentId,
          amount: c.amount,
          time: c.time,
          card_type: c.cardType || null,
          last_four: c.lastFour || null,
          server_name: c.serverName || null,
          server_id: c.serverId || null,
          tip_amount: c.adjusted ? c.tip : null,
        };
      });
    })
    .catch(function() { return []; });
}

// == STAT STRIP (horizontal, top) ======================

function buildStatStrip() {
  var groups = getServerGroups();
  var items = [];
  if (_role === 'manager') {
    items.push({ label: 'SERVERS', value: '' + groups.length, color: T.lime });
  }
  items.push({ label: 'UNADJ TIPS', value: '' + getUnadjCount(), color: T.mint });
  items.push({ label: 'TOTAL TIPS', value: fmt(getTipTotal()), color: T.gold });

  var strip = document.createElement('div');
  strip.style.cssText = 'display:flex;gap:2px;padding:8px;flex-shrink:0;';
  for (var i = 0; i < items.length; i++) {
    var box = document.createElement('div');
    box.style.cssText = 'flex:1;background:' + T.bgDark + ';padding:6px 4px;text-align:center;overflow:hidden;min-width:0;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:14px;color:' + T.mutedText + ';letter-spacing:1px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    lbl.textContent = items[i].label;
    box.appendChild(lbl);
    var val = document.createElement('div');
    val.style.cssText = 'font-family:' + T.fb + ';font-size:24px;font-weight:bold;color:' + items[i].color + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    val.textContent = items[i].value;
    box.appendChild(val);
    strip.appendChild(box);
  }
  return strip;
}

function updateStatStrip() {
  if (!_statStripEl || !_statStripEl.parentNode) return;
  var parent = _statStripEl.parentNode;
  var newStrip = buildStatStrip();
  parent.replaceChild(newStrip, _statStripEl);
  _statStripEl = newStrip;
}

// == CHECK CARD (full-width stacked) ===================

function buildCheckCard(c) {
  var unadj = isUnadjusted(c);
  var borderColor = unadj ? T.mint : T.green;

  var card = document.createElement('div');
  card.dataset.checkId = c.check_id;
  card.style.cssText = [
    'background:#111;',
    'border:3px solid ' + borderColor + ';',
    'padding:10px 12px;',
    'margin-bottom:8px;',
    'font-family:' + T.fb + ';',
    unadj ? 'cursor:pointer;' : '',
  ].join('');

  // Row 1: Check # + time
  var r1 = document.createElement('div');
  r1.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;white-space:nowrap;';
  var chkEl = document.createElement('span');
  chkEl.style.cssText = 'font-size:20px;color:#ffffff;font-weight:bold;';
  chkEl.textContent = c.check_num || c.check_id;
  r1.appendChild(chkEl);
  var timeEl = document.createElement('span');
  timeEl.style.cssText = 'font-size:18px;color:#aaaaaa;';
  timeEl.textContent = c.time || '';
  r1.appendChild(timeEl);
  card.appendChild(r1);

  // Row 2: Check Total + amount
  var r2 = document.createElement('div');
  r2.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;white-space:nowrap;';
  var totalLabel = document.createElement('span');
  totalLabel.style.cssText = 'font-size:18px;color:#ffffff;';
  totalLabel.textContent = 'Check Total';
  r2.appendChild(totalLabel);
  var amtEl = document.createElement('span');
  amtEl.style.cssText = 'font-size:20px;color:' + T.gold + ';font-weight:bold;';
  amtEl.textContent = fmt(c.amount);
  r2.appendChild(amtEl);
  card.appendChild(r2);

  if (!unadj) {
    // Row 3: Tip row
    var r3 = document.createElement('div');
    r3.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:2px;white-space:nowrap;';
    var tipLabel = document.createElement('span');
    tipLabel.style.cssText = 'font-size:18px;color:#ffffff;';
    tipLabel.textContent = 'Tip';
    r3.appendChild(tipLabel);
    var tipVal = document.createElement('span');
    tipVal.style.cssText = 'font-size:20px;color:' + T.green + ';font-weight:bold;';
    tipVal.textContent = fmt(c.tip_amount);
    r3.appendChild(tipVal);
    card.appendChild(r3);

    // Row 4: Final Total
    var r4 = document.createElement('div');
    r4.style.cssText = 'display:flex;justify-content:space-between;border-top:1px solid #333;padding-top:4px;white-space:nowrap;';
    var ftLabel = document.createElement('span');
    ftLabel.style.cssText = 'font-size:18px;color:#ffffff;font-weight:bold;';
    ftLabel.textContent = 'Final Total';
    r4.appendChild(ftLabel);
    var ftVal = document.createElement('span');
    ftVal.style.cssText = 'font-size:22px;color:' + T.gold + ';font-weight:bold;';
    ftVal.textContent = fmt(c.amount + c.tip_amount);
    r4.appendChild(ftVal);
    card.appendChild(r4);
  } else {
    // Tap to adjust prompt
    var prompt = document.createElement('div');
    prompt.style.cssText = 'font-size:18px;color:' + T.mint + ';text-align:center;margin-top:4px;';
    prompt.textContent = '\u26A0 TAP TO ADJUST TIP';
    card.appendChild(prompt);

    card.addEventListener('pointerup', function() {
      openSideNumpad(c);
    });
  }

  return card;
}

// == SERVER SECTION (accordion — manager mode) =========

function buildServerSection(group) {
  var ut = getGroupUnadjCount(group);
  var allAdjusted = ut === 0;

  var section = document.createElement('div');
  section.style.cssText = 'background:#161616;border:3px solid ' + T.mint + ';margin-bottom:10px;';

  // Header — tap to expand/collapse
  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:#2a2a2a;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;';
  var nameEl = document.createElement('span');
  nameEl.style.cssText = 'font-family:' + T.fb + ';font-size:24px;color:#ffffff;font-weight:bold;';
  nameEl.textContent = group.name || 'Server';
  hdr.appendChild(nameEl);

  var badge = document.createElement('span');
  badge.style.cssText = 'font-family:' + T.fb + ';font-size:18px;padding:2px 8px;border:2px solid;';
  if (allAdjusted) {
    badge.style.color = T.green;
    badge.style.borderColor = T.green;
    badge.textContent = '\u2713 ALL ADJUSTED';
  } else {
    badge.style.color = T.mint;
    badge.style.borderColor = T.mint;
    badge.textContent = '\u26A0 ' + ut + ' UNADJ';
  }
  hdr.appendChild(badge);

  hdr.addEventListener('pointerup', function(e) {
    e.stopPropagation();
    _expandedSrv[group.id] = !_expandedSrv[group.id];
    renderChecksContent();
  });
  section.appendChild(hdr);

  // Expanded content
  if (_expandedSrv[group.id]) {
    var content = document.createElement('div');
    content.style.cssText = 'padding:10px;';

    // "UNADJUSTED TIPS" label
    if (ut > 0) {
      var label = document.createElement('div');
      label.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';letter-spacing:2px;margin-bottom:6px;';
      label.textContent = 'UNADJUSTED TIPS';
      content.appendChild(label);
    }

    // Check cards
    for (var i = 0; i < group.checks.length; i++) {
      content.appendChild(buildCheckCard(group.checks[i]));
    }

    // "Adjust Remaining to $0" shortcut
    if (!allAdjusted) {
      content.appendChild(buildAdjustRemainingBtn(group));
    }

    section.appendChild(content);
  }

  return section;
}

// == FLAT CHECK LIST (server mode — single server) =====

function buildFlatCheckList() {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:10px;';

  var unadjChecks = checks.filter(function(c) { return isUnadjusted(c); });
  var adjChecks = checks.filter(function(c) { return !isUnadjusted(c); });

  // Unadjusted section
  if (unadjChecks.length > 0) {
    var label = document.createElement('div');
    label.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';letter-spacing:2px;margin-bottom:6px;';
    label.textContent = 'UNADJUSTED TIPS';
    wrap.appendChild(label);

    for (var i = 0; i < unadjChecks.length; i++) {
      wrap.appendChild(buildCheckCard(unadjChecks[i]));
    }

    // Adjust remaining button
    wrap.appendChild(buildAdjustRemainingBtn(null));
  }

  // Adjusted section
  if (adjChecks.length > 0) {
    var adjLabel = document.createElement('div');
    adjLabel.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.green + ';letter-spacing:2px;margin:12px 0 6px;';
    adjLabel.textContent = 'ADJUSTED';
    wrap.appendChild(adjLabel);

    for (var j = 0; j < adjChecks.length; j++) {
      wrap.appendChild(buildCheckCard(adjChecks[j]));
    }
  }

  // Empty state
  if (checks.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mutedText + ';text-align:center;padding:40px 0;';
    empty.textContent = 'No card checks to adjust';
    wrap.appendChild(empty);
  } else if (unadjChecks.length === 0) {
    var allDone = document.createElement('div');
    allDone.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.green + ';text-align:center;padding:20px 0;';
    allDone.textContent = '\u2713 All tips adjusted';
    wrap.insertBefore(allDone, wrap.firstChild);
  }

  return wrap;
}

// == ADJUST REMAINING TO $0.00 BUTTON ==================

function buildAdjustRemainingBtn(group) {
  var btn = document.createElement('div');
  btn.style.cssText = [
    'font-family:' + T.fb + ';font-size:18px;letter-spacing:1px;text-align:center;padding:8px;cursor:pointer;margin-bottom:8px;',
    'color:' + T.gold + ';border:2px solid ' + T.gold + ';background:#1a1400;',
  ].join('');
  btn.textContent = 'ADJUST REMAINING TO $0.00';

  btn.addEventListener('pointerup', function(e) {
    e.stopPropagation();
    var targets = group ? group.checks : checks;
    var unadj = targets.filter(function(c) { return isUnadjusted(c); });
    if (unadj.length === 0) return;

    // POST batch zero
    var zeroUrl = '/api/v1/payments/zero-unadjusted';
    if (_params.employeeId && _role !== 'manager') {
      zeroUrl += '?server_id=' + encodeURIComponent(_params.employeeId);
    } else if (group && group.id !== '_self') {
      zeroUrl += '?server_id=' + encodeURIComponent(group.id);
    }

    fetch(zeroUrl, { method: 'POST' }).catch(function(err) {
      console.error('[KINDpos] Batch tip adjust failed:', err);
    });

    // Update local data
    unadj.forEach(function(c) { c.tip_amount = 0; });

    showToast('Remaining tips set to $0.00', { bg: T.gold, duration: 2000 });
    renderChecksContent();
    updateStatStrip();
  });

  return btn;
}

// == SIDE NUMPAD PANEL =================================

function openSideNumpad(check) {
  if (_numpadSide) closeSideNumpad();

  // Shrink content panel
  if (_contentPanel) {
    _contentPanel.style.maxWidth = '480px';
    _contentPanel.style.flex = '0 0 480px';
  }

  var side = document.createElement('div');
  side.style.cssText = [
    'flex:0 0 380px;',
    'background:' + T.bgDark + ';',
    'padding:16px;',
    'display:flex;flex-direction:column;align-items:center;gap:10px;',
    'border-top:7px solid ' + T.numpadChassisL + ';',
    'border-left:7px solid ' + T.numpadChassisL + ';',
    'border-bottom:7px solid ' + T.numpadChassisD + ';',
    'border-right:7px solid ' + T.numpadChassisD + ';',
    'clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px);',
    'filter:drop-shadow(3px 4px 0px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(135,247,156,0.15));',
    'align-self:flex-start;',
  ].join('');

  // Header
  var header = document.createElement('div');
  header.style.cssText = 'font-family:' + T.fb + ';font-size:22px;color:' + T.gold + ';letter-spacing:2px;text-align:center;';
  header.textContent = 'ENTER TIP AMOUNT';
  side.appendChild(header);

  var numpad = buildNumpad({
    maxDigits: 6,
    masked: false,
    displayFormat: function(digits) {
      var cents = parseInt(digits || '0', 10);
      return '$' + (cents / 100).toFixed(2);
    },
    displayColor: T.gold,
    chassisColor: T.numpadChassis,
    digitColor: T.digitColor,
    displayH: 60,
    gap: 16,
    keyH: 84,
    keyGap: 12,
    cardPad: 18,
    chassisChamfer: 6,
    chassisBevel: 5,
    onSubmit: function(digits) {
      var cents = parseInt(digits || '0', 10);
      var tipAmount = cents / 100;
      closeSideNumpad();

      // POST to API
      fetch('/api/v1/payments/tip-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: check.check_id, payment_id: check.payment_id, tip_amount: tipAmount }),
      }).catch(function(err) {
        console.error('[KINDpos] Tip adjust failed:', err);
      });

      // Update local data
      check.tip_amount = tipAmount;

      showToast('Tip adjusted', { bg: T.green, duration: 1500 });
      renderChecksContent();
      updateStatStrip();
    },
    onCancel: function() {
      closeSideNumpad();
    },
  });
  side.appendChild(numpad);

  _numpadSide = side;
  if (_mainRow) _mainRow.appendChild(side);
}

function closeSideNumpad() {
  if (_numpadSide && _numpadSide.parentNode) _numpadSide.parentNode.removeChild(_numpadSide);
  _numpadSide = null;
  // Restore content panel width
  if (_contentPanel) {
    _contentPanel.style.maxWidth = '';
    _contentPanel.style.flex = '1';
  }
}

// == RENDER ============================================

function renderChecksContent() {
  if (!_checksWrap) return;
  _checksWrap.innerHTML = '';

  if (_role === 'manager') {
    // Server accordion groups
    var groups = getServerGroups();
    for (var i = 0; i < groups.length; i++) {
      _checksWrap.appendChild(buildServerSection(groups[i]));
    }
    if (groups.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mutedText + ';text-align:center;padding:40px 0;';
      empty.textContent = 'No card checks to adjust';
      _checksWrap.appendChild(empty);
    }
  } else {
    // Single server — flat list
    _checksWrap.appendChild(buildFlatCheckList());
  }
}

// == SCENE BUILDER =====================================

function buildScene(container, params) {
  container.style.cssText = [
    'display:flex;flex-direction:column;',
    'width:100%;height:100%;',
    'background:' + T.bg + ';',
    'padding:' + T.scenePad + 'px;',
    'box-sizing:border-box;',
    'position:relative;',
  ].join('');

  // Stat strip
  _statStripEl = buildStatStrip();
  container.appendChild(_statStripEl);

  // Main row: content panel + optional numpad side panel
  _mainRow = document.createElement('div');
  _mainRow.style.cssText = 'display:flex;gap:12px;flex:1;min-height:0;overflow:hidden;transition:all 0.3s ease;';

  // Content panel (scrollable check cards area)
  _contentPanel = document.createElement('div');
  _contentPanel.style.cssText = [
    'flex:1;',
    'overflow-y:auto;',
    'scrollbar-width:none;',
    'transition:max-width 0.3s ease,flex 0.3s ease;',
  ].join('');

  _checksWrap = document.createElement('div');
  _contentPanel.appendChild(_checksWrap);
  _mainRow.appendChild(_contentPanel);

  container.appendChild(_mainRow);

  // Version stamp
  var stamp = document.createElement('div');
  stamp.style.cssText = [
    'position:absolute;bottom:4px;right:8px;',
    'font-family:' + T.fb + ';font-size:9px;color:' + T.gold + ';',
    'opacity:0.35;pointer-events:none;',
  ].join('');
  stamp.textContent = 'v3.0';
  container.appendChild(stamp);

  // Fetch data
  fetchChecks(params).then(function(data) {
    checks = data;
    // Auto-expand first server in manager mode
    if (_role === 'manager') {
      var groups = getServerGroups();
      if (groups.length > 0) _expandedSrv[groups[0].id] = true;
    }
    renderChecksContent();
    updateStatStrip();
  });
}

// == REGISTRATION - Main Scene =========================

SceneManager.register({
  name: 'tip-adjustment',

  mount: function(container, params) {
    params = params || {};
    checks = [];
    _mainRow = null;
    _contentPanel = null;
    _numpadSide = null;
    _statStripEl = null;
    _checksWrap = null;
    _expandedSrv = {};
    _tipCallback = null;

    _role = params.role || 'server';

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
      onBack: function() {
        closeSideNumpad();
        SceneManager.closeTransactional('tip-adjustment');
      },
    });

    // 1-second clock interval
    _clockIv = setInterval(function() { setSceneName(_sceneName); }, 1000);

    buildScene(container, params);
  },

  unmount: function() {
    if (_clockIv) { clearInterval(_clockIv); _clockIv = null; }
    closeSideNumpad();
    checks = [];
    _mainRow = null;
    _contentPanel = null;
    _numpadSide = null;
    _statStripEl = null;
    _checksWrap = null;
    _expandedSrv = {};
    _tipCallback = null;
    _role = 'server';
    _sceneName = '';
    _params = {};
  },

  cache: false,
  timeoutMs: 0,
});
