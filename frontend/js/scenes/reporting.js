// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Reporting Scene
//  2×2 dashboard grid, role-driven
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, chamfer, buildStyledButton, applySunkenStyle, bevelEdges } from '../tokens.js';
import { buildButton, buildGap } from '../components.js';
import { registerScene, push, pop } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

// ── Stats — fresh-day zeros ──────────────────────
function getStats(role) {
  return {
    unadjustedTips: 0,
    totalTips: 0,
    netSales: 0,
    totalChecks: 0,
  };
}

function fmt(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// ═══════════════════════════════════════════════════
//  CARD BUILDER
//  Thick colored border, dark inner, title + info lines
// ═══════════════════════════════════════════════════

function buildCard(opts) {
  var borderColor = opts.borderColor || T.mint;
  var title       = opts.title       || '';
  var titleColor  = opts.titleColor  || T.mint;
  var infoLines   = opts.infoLines   || [];
  var onTap       = opts.onTap       || null;
  var borderW     = opts.borderWidth || 12;

  // Outer wrapper — the colored border
  var outer = document.createElement('div');
  outer.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;-webkit-user-select:none;';
  outer.style.background = borderColor;
  outer.style.padding = borderW + 'px';
  outer.style.clipPath = chamfer(10);
  outer.style.transition = 'transform 80ms';

  // Inner dark card
  var inner = document.createElement('div');
  inner.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;';
  inner.style.background = T.bg;
  inner.style.clipPath = chamfer(6);
  inner.style.padding = '16px';

  // Inner border (the second border visible in mockup)
  inner.style.border = '3px solid ' + borderColor;

  // Title text
  var titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:' + T.fb + ';font-size:42px;color:' + titleColor + ';text-align:center;line-height:1.1;white-space:pre-line;';
  titleEl.textContent = title;
  inner.appendChild(titleEl);

  // Info lines
  if (infoLines.length > 0) {
    var infoWrap = document.createElement('div');
    infoWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;margin-top:8px;';

    infoLines.forEach(function(line) {
      var span = document.createElement('span');
      span.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + (line.color || T.mint) + ';';
      span.textContent = line.text;
      infoWrap.appendChild(span);
    });

    inner.appendChild(infoWrap);
  }

  outer.appendChild(inner);

  // Press animation
  outer.addEventListener('pointerdown', function() {
    outer.style.transform = 'translate(' + T.shadowX + 'px, ' + T.shadowY + 'px)';
  });
  outer.addEventListener('pointerup', function() {
    outer.style.transform = 'translate(0,0)';
    if (onTap) onTap();
  });
  outer.addEventListener('pointerleave', function() {
    outer.style.transform = 'translate(0,0)';
  });

  return outer;
}

// ═══════════════════════════════════════════════════
//  BUILD SCENE
// ═══════════════════════════════════════════════════

function buildScene(el, params) {
  var role = params.role || 'server';
  var stats = getStats(role);

  el.style.display = 'grid';
  el.style.gridTemplateColumns = '1fr 1fr';
  el.style.gridTemplateRows = '1fr 1fr';
  el.style.gap = '16px';
  el.style.padding = '20px';
  el.style.height = '100%';
  el.style.boxSizing = 'border-box';

  // ── TOP LEFT: Tip Adjustment (mint) ──
  var tipInfoLines = [
    { text: 'Unadjusted: ' + stats.unadjustedTips, color: T.cyan },
    { text: 'Total Tips: ' + fmt(stats.totalTips),  color: T.gold },
  ];
  if (role === 'manager') {
    tipInfoLines[0].text = 'Unadjusted: ' + stats.unadjustedTips + ' (all servers)';
  }

  el.appendChild(buildCard({
    borderColor: T.mint,
    title: 'Tip\nAdjustment',
    titleColor: T.mint,
    infoLines: tipInfoLines,
    onTap: function() {
      push('tip-adjustment', {
        employeeId: params.employeeId,
        employeeName: params.employeeName,
        role: role,
      });
    },
  }));

  // ── TOP RIGHT: Checkout (server) / Close Day (manager) ──
  if (role === 'manager') {
    el.appendChild(buildCard({
      borderColor: T.red,
      title: 'Close Day',
      titleColor: T.mint,
      infoLines: [],
      onTap: function() {
        push('close-day', { pin: params.pin });
      },
    }));
  } else {
    el.appendChild(buildCard({
      borderColor: T.red,
      title: 'Checkout',
      titleColor: T.mint,
      infoLines: [],
      onTap: function() {
        push('server-checkout', {
          employeeId: params.employeeId,
          employeeName: params.employeeName,
        });
      },
    }));
  }

  // ── BOTTOM LEFT: Sales Summary (mint) ──
  el.appendChild(buildCard({
    borderColor: T.mint,
    title: 'Sales\nSummary',
    titleColor: T.mint,
    infoLines: [
      { text: 'Net Sales: ' + fmt(stats.netSales),  color: T.gold },
      { text: 'Checks: ' + stats.totalChecks,       color: T.cyan },
    ],
    onTap: function() {
      push('sales-summary', { role: role });
    },
  }));

  // ── BOTTOM RIGHT: empty (batch settlement lives in Close Day) ──
  var empty = document.createElement('div');
  el.appendChild(empty);
}

// ═══════════════════════════════════════════════════
//  REGISTRATION
// ═══════════════════════════════════════════════════

registerScene('reporting', {
  onEnter: function(el, params) {
    setSceneName('Reporting');
    setHeaderBack(true);
    buildScene(el, params);
  },
  onExit: function() {},
  cache: false,
  timeoutMs: 0,
});