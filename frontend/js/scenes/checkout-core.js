// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Checkout Core
//  Shared builders for server-checkout + close-day scenes
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle } from '../tokens.js';
import { buildButton, buildGap, showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { defineScene } from '../scene-manager-2.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { buildNumpad } from '../numpad.js';
import { buildCard } from '../theme-manager.js';

var CHROME = T.numpadChassis;

// ── Layout constants ─────────────────────────────
export var CARD_GAP  = 8;
export var STRIP_H   = 28;
export var ACTION_H  = 48;
export var BANNER_H  = 36;
export var BEVEL     = 4;
export var CHAM      = 8;
export var COL_GAP   = 20;
export var SCENE_PAD = 13;
export var RED       = T.vermillion;

// ─────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────

export function fmt(n) {
  return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function detailRow(label, value, valueColor) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;font-family:' + T.fb + ';padding:2px 0;';
  var lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:40px;color:' + T.mint + ';';
  lbl.textContent = label;
  var val = document.createElement('span');
  val.style.cssText = 'font-size:40px;color:' + (valueColor || T.gold) + ';font-weight:bold;';
  val.textContent = value;
  row.appendChild(lbl);
  row.appendChild(val);
  return row;
}

export function detailDivider() {
  var el = document.createElement('div');
  el.style.cssText = 'border-top:1px solid ' + T.bg + ';margin:4px 0;';
  return el;
}

export function buildMixBar(cashPct, cardPct) {
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;height:16px;margin-top:8px;clip-path:' + chamfer(4) + ';overflow:hidden;';
  var cashSeg = document.createElement('div');
  cashSeg.style.cssText = 'width:' + cashPct + '%;background:' + T.mint + ';';
  var cardSeg = document.createElement('div');
  cardSeg.style.cssText = 'width:' + cardPct + '%;background:' + T.cyan + ';';
  bar.appendChild(cashSeg);
  bar.appendChild(cardSeg);
  var labels = document.createElement('div');
  labels.style.cssText = 'display:flex;justify-content:space-between;font-family:' + T.fb + ';font-size:40px;color:' + T.mint + ';margin-top:2px;';
  labels.innerHTML = '<span>Cash ' + cashPct + '%</span><span>Card ' + cardPct + '%</span>';
  var wrap = document.createElement('div');
  wrap.appendChild(bar);
  wrap.appendChild(labels);
  return wrap;
}

// ─────────────────────────────────────────────────
//  CARD TILE (collapsed card in grid)
//  opts.onExpand(idx) — called on tap
// ─────────────────────────────────────────────────

export function buildCardTile(def, idx, opts) {
  var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  pair.wrap.style.height = '100%';
  var card = pair.card;
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.overflow = 'hidden';
  card.style.cursor = 'pointer';
  card.style.position = 'relative';
  card.style.height = '100%';

  // Chrome header bar
  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:' + CHROME + ';padding:5px 10px;flex-shrink:0;';
  var hdrTxt = document.createElement('div');
  hdrTxt.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + T.bgDark + ';letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;';
  hdrTxt.textContent = def.title;
  hdr.appendChild(hdrTxt);
  card.appendChild(hdr);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 8px;gap:2px;';

  var hero = document.createElement('div');
  hero.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsBtn + ';color:' + (def.heroColor || T.gold) + ';font-weight:bold;text-align:center;';
  hero.textContent = def.hero;
  body.appendChild(hero);

  var sub = document.createElement('div');
  sub.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;';
  sub.textContent = def.subtitle;
  body.appendChild(sub);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;margin-top:1px;';
  hint.textContent = '\u25B8';
  body.appendChild(hint);

  card.appendChild(body);

  // Status dot
  var dot = document.createElement('div');
  dot.style.cssText = 'position:absolute;bottom:8px;right:8px;width:8px;height:8px;clip-path:circle(50%);background:' + (def.statusColor || T.cyan) + ';opacity:' + (def.statusColor ? '1' : '0.4') + ';';
  card.appendChild(dot);

  // Shortcut buttons below body
  if (def.buildShortcuts) {
    var shortcuts = def.buildShortcuts();
    shortcuts.style.cssText += 'padding:0 8px 6px;flex-shrink:0;';
    card.appendChild(shortcuts);
  }

  pair.wrap.addEventListener('pointerup', function(e) {
    if (e.target.closest && e.target.closest('[data-shortcut]')) return;
    if (opts && opts.onExpand) opts.onExpand(idx);
  });

  return pair.wrap;
}

// ─────────────────────────────────────────────────
//  CARD STRIP (thin collapsed label)
// ─────────────────────────────────────────────────

export function buildCardStrip(def, idx, opts) {
  var strip = document.createElement('div');
  strip.style.cssText = [
    'height:' + STRIP_H + 'px;',
    'display:flex;align-items:center;justify-content:space-between;',
    'padding:0 12px;cursor:pointer;',
    'background:' + T.bgDark + ';',
    'border:1px solid ' + T.border + ';',
    'clip-path:' + chamfer(4) + ';',
    'font-family:' + T.fb + ';',
    'user-select:none;-webkit-user-select:none;',
  ].join('');

  var lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:40px;color:' + T.mint + ';';
  lbl.textContent = def.title;
  strip.appendChild(lbl);

  var val = document.createElement('span');
  val.style.cssText = 'font-size:40px;color:' + T.cyan + ';';
  val.textContent = def.hero;
  strip.appendChild(val);

  strip.addEventListener('pointerup', function() {
    if (opts && opts.onExpand) opts.onExpand(idx);
  });

  return strip;
}

// ─────────────────────────────────────────────────
//  CARD GRID (NxM grid of card tiles)
//  opts.columns — grid column count (2 or 3)
//  opts.onExpand(idx) — passed to each tile
// ─────────────────────────────────────────────────

export function buildCardGrid(defs, opts) {
  var cols = (opts && opts.columns) || 2;
  var rows = Math.ceil(defs.length / cols);
  var grid = document.createElement('div');
  grid.style.cssText = [
    'flex:1;',
    'display:grid;',
    'grid-template-columns:repeat(' + cols + ',1fr);',
    'grid-template-rows:repeat(' + rows + ',1fr);',
    'gap:' + CARD_GAP + 'px;',
  ].join('');

  defs.forEach(function(def, i) {
    grid.appendChild(buildCardTile(def, i, opts));
  });

  return grid;
}

// ─────────────────────────────────────────────────
//  EXPANDED CARD VIEW (one card fills area, siblings as strips)
//  opts.onExpand(idx) — for strip taps
//  opts.onCollapse() — for header tap
// ─────────────────────────────────────────────────

export function buildExpandedCard(defs, idx, opts) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;overflow:hidden;';

  for (var i = 0; i < idx; i++) {
    wrap.appendChild(buildCardStrip(defs[i], i, opts));
  }

  var expPair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 8, borderWidth: 5, glow: false });
  var expanded = expPair.card;
  expanded.style.display = 'flex';
  expanded.style.flexDirection = 'column';
  expanded.style.flex = '1';
  expanded.style.overflow = 'hidden';
  expPair.wrap.style.flex = '1';
  expPair.wrap.style.display = 'flex';
  expPair.wrap.style.minHeight = '0';

  // Chrome header bar (tappable to collapse)
  var hdr = document.createElement('div');
  hdr.style.cssText = [
    'background:' + CHROME + ';padding:5px 14px;flex-shrink:0;',
    'display:flex;justify-content:space-between;align-items:center;',
    'cursor:pointer;user-select:none;-webkit-user-select:none;',
  ].join('');
  var hTitle = document.createElement('span');
  hTitle.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + T.bgDark + ';letter-spacing:1px;';
  hTitle.textContent = defs[idx].title;
  var hHint = document.createElement('span');
  hHint.style.cssText = 'font-family:' + T.fh + ';font-size:16px;color:' + T.bgDark + ';';
  hHint.textContent = '\u25BE';
  hdr.appendChild(hTitle);
  hdr.appendChild(hHint);
  hdr.addEventListener('pointerup', function() {
    if (opts && opts.onCollapse) opts.onCollapse();
  });
  expanded.appendChild(hdr);

  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:4px;';
  defs[idx].buildExpanded(content);
  expanded.appendChild(content);

  wrap.appendChild(expPair.wrap);

  for (var j = idx + 1; j < defs.length; j++) {
    wrap.appendChild(buildCardStrip(defs[j], j, opts));
  }

  return wrap;
}

// ─────────────────────────────────────────────────
//  BLOCKER BANNER
//  messages — array of warning strings, empty = all clear
// ─────────────────────────────────────────────────

export function buildBlockerBanner(messages) {
  var el = document.createElement('div');
  el.style.cssText = [
    'flex-shrink:0;height:' + BANNER_H + 'px;',
    'display:flex;align-items:center;justify-content:center;',
    'font-family:' + T.fb + ';font-size:40px;',
    'clip-path:' + chamfer(4) + ';',
  ].join('');

  if (messages && messages.length > 0) {
    el.style.background = 'rgba(255,51,85,0.1)';
    el.style.border = '1px solid ' + RED;
    el.style.color = RED;
    el.textContent = '\u26A0 RESOLVE: ' + messages.join(' + ');
  } else {
    el.style.background = 'rgba(51,255,255,0.08)';
    el.style.border = '1px solid ' + T.cyan;
    el.style.color = T.cyan;
    el.textContent = '\u2713 ALL CLEAR \u2014 ready to finalize';
  }

  return el;
}

// ═══════════════════════════════════════════════════
//  SHARED SUB-SCENES (SM2)
// ═══════════════════════════════════════════════════

// ── Zero-confirm interrupt ───────────────────────
// params.count, params.onConfirm, params.onCancel, params.serverId (optional)

defineScene({
  name: 'co-zero-confirm',
  render: function(container, params) {
    var panel = document.createElement('div');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;background:' + T.bgDark + ';border:4px solid ' + RED + ';padding:' + T.scenePad + 'px;min-width:280px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsMed + ';color:' + RED + ';letter-spacing:2px;margin-bottom:4px;';
    lbl.textContent = '// ZERO ALL TIPS //';
    panel.appendChild(lbl);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mint + ';text-align:center;';
    msg.textContent = 'Set ' + (params.count || 0) + ' unadjusted tip(s) to $0.00?';
    panel.appendChild(msg);

    var confirmBtn = buildButton('CONFIRM', {
      fill: T.darkBtn, color: RED, fontSize: T.fsBtnSm, height: 44,
      onTap: function() { params.onConfirm(); },
    });
    confirmBtn.style.width = '240px';
    panel.appendChild(confirmBtn);

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.mint, fontSize: T.fsSmall, height: 40,
      onTap: function() { params.onCancel(); },
    });
    cancelBtn.style.width = '240px';
    panel.appendChild(cancelBtn);
    container.appendChild(panel);
  },
});

// ── Manager PIN gate interrupt ───────────────────
// params.onConfirm(data), params.onCancel

defineScene({
  name: 'co-manager-pin',
  render: function(container, params) {
    container.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    var numpad = buildNumpad({
      maxDigits: 4,
      masked: true,
      onSubmit: function(pin) {
        fetch('/api/v1/auth/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin }),
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.valid) {
              params.onConfirm(data);
            } else {
              numpad.setError('Invalid PIN');
            }
          })
          .catch(function() { numpad.setError('PIN check failed'); });
      },
      onCancel: function() { params.onCancel(); },
    });
    container.appendChild(numpad);
  },
});

// ── Tip adjustment transactional ─────────────────
// params.serverId (optional), params.onDone

defineScene({
  name: 'co-tip-adjust',
  render: function(container, params) {
    var _selected = null;
    var _checks = [];
    var _listEl = null;

    setSceneName('Adjust Tips');
    setHeaderBack({ back: true, onBack: function() {
      SceneManager.closeTransactional('co-tip-adjust');
      if (params.onDone) params.onDone();
    }});

    container.style.cssText = 'width:100%;height:100%;display:flex;gap:' + COL_GAP + 'px;padding:' + SCENE_PAD + 'px;box-sizing:border-box;';

    // Left: check list
    var leftCol = document.createElement('div');
    leftCol.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

    var header = document.createElement('div');
    header.style.cssText = 'font-family:' + T.fh + ';font-size:18px;color:' + T.gold + ';letter-spacing:0.1em;margin-bottom:8px;';
    header.textContent = 'UNADJUSTED TIPS';
    leftCol.appendChild(header);

    _listEl = document.createElement('div');
    _listEl.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px;';
    leftCol.appendChild(_listEl);
    container.appendChild(leftCol);

    // Right: numpad
    var rightCol = document.createElement('div');
    rightCol.style.cssText = 'flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;';

    var hintEl = document.createElement('div');
    hintEl.style.cssText = 'font-family:' + T.fb + ';font-size:' + T.fsSmall + ';color:' + T.mutedText + ';margin-bottom:8px;text-align:center;';
    hintEl.textContent = 'Tap a check to adjust';
    rightCol.appendChild(hintEl);

    var numpad = buildNumpad({
      masked: false,
      maxDigits: 6,
      submitLabel: 'ent',
      displayFormat: function(digits) {
        var n = parseInt(digits || '0', 10);
        return '$' + (n / 100).toFixed(2);
      },
      canSubmit: function() { return _selected !== null; },
      onSubmit: function(digits) {
        if (!_selected) return;
        var tipAmount = parseInt(digits || '0', 10) / 100;
        fetch('/api/v1/payments/tip-adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: _selected.check_id, payment_id: _selected.payment_id, tip_amount: tipAmount }),
        }).then(function(r) {
          if (r.ok) {
            showToast('Tip adjusted', { bg: T.goGreen });
            _selected.tip_amount = tipAmount;
            _selected = null;
            hintEl.textContent = 'Tap a check to adjust';
            numpad.clear();
            renderList();
          } else {
            showToast('Tip adjust failed', { bg: T.red });
          }
        }).catch(function() { showToast('Tip adjust failed', { bg: T.red }); });
      },
      onCancel: function() {
        SceneManager.closeTransactional('co-tip-adjust');
        if (params.onDone) params.onDone();
      },
    });
    rightCol.appendChild(numpad);
    container.appendChild(rightCol);

    function renderList() {
      _listEl.innerHTML = '';
      var unadj = _checks.filter(function(c) { return c.tip_amount == null; });
      if (unadj.length === 0) {
        var done = document.createElement('div');
        done.style.cssText = 'font-family:' + T.fb + ';font-size:18px;color:' + T.mint + ';text-align:center;padding:20px;';
        done.textContent = '\u2713 All tips adjusted';
        _listEl.appendChild(done);
        return;
      }
      for (var i = 0; i < unadj.length; i++) {
        (function(check) {
          var row = document.createElement('div');
          var isActive = _selected === check;
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;cursor:pointer;background:' + (isActive ? T.bg3 : T.bgDark) + ';border:2px solid ' + (isActive ? T.gold : T.border) + ';';
          applySunkenStyle(row);

          var label = document.createElement('span');
          label.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mint + ';';
          label.textContent = check.check_num || 'CHK';

          var amt = document.createElement('span');
          amt.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';font-weight:bold;';
          amt.textContent = fmt(check.amount || 0);

          row.appendChild(label);
          row.appendChild(amt);
          row.addEventListener('pointerup', function() {
            _selected = check;
            hintEl.textContent = (check.check_num || 'CHK') + ' \u2014 ' + fmt(check.amount || 0);
            numpad.clear();
            renderList();
          });
          _listEl.appendChild(row);
        })(unadj[i]);
      }
    }

    // Fetch unadjusted checks
    var url = '/api/v1/orders/day-summary';
    if (params.serverId) url += '?server_id=' + encodeURIComponent(params.serverId);
    fetch(url).then(function(r) { return r.json(); }).then(function(data) {
      var raw = data.checks || [];
      _checks = raw.filter(function(c) { return c.status === 'closed' && c.method === 'card'; }).map(function(c) {
        return {
          check_id: c.checkId,
          check_num: c.checkLabel || c.checkId,
          payment_id: c.paymentId,
          amount: c.amount,
          tip_amount: c.adjusted ? c.tip : null,
        };
      });
      renderList();
    }).catch(function() {
      _listEl.innerHTML = '';
      var err = document.createElement('div');
      err.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.red + ';padding:20px;text-align:center;';
      err.textContent = 'Failed to load checks';
      _listEl.appendChild(err);
    });
  },
});
