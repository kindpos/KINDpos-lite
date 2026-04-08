// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Clock-In Scene
//  Transactional overlay: staff role selection + clock-in
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, chamfer, shadowColor } from '../tokens.js';
import { showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';

var API = '/api/v1';
var _selectedRole = null;

// ── Helpers ──────────────────────────────────────

function _greeting() {
  var h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

function _payPeriodRange() {
  var now = new Date();
  var day = now.getDay();
  var start = new Date(now);
  start.setDate(now.getDate() - ((day + 6) % 7));
  var end = new Date(start);
  end.setDate(start.getDate() + 6);
  function fmt(d) {
    return String(d.getMonth() + 1).padStart(2, '0') + '/' +
           String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getFullYear()).slice(2);
  }
  return fmt(start) + ' \u2013 ' + fmt(end);
}

function _hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function _darkenHex(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var f = 1 - pct;
  return '#' + [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
    .map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

function _lightenHex(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return '#' + [
    Math.min(255, Math.round(r + (255 - r) * pct)),
    Math.min(255, Math.round(g + (255 - g) * pct)),
    Math.min(255, Math.round(b + (255 - b) * pct)),
  ].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

// ── Role Button Builder ─────────────────────────

function _buildRoleButton(roleName, roleColor, onSelect) {
  var b = T.bevelBtn;
  var bevelLight = _hexToRgba(roleColor, 0.7);
  var bevelDark = _darkenHex(roleColor, 0.4);
  var glowDefault = _hexToRgba(roleColor, 0.8);
  var baseShadow = shadowColor(T.bg);

  var wrap = document.createElement('div');
  wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + baseShadow + ') drop-shadow(0 0 8px ' + glowDefault + ')';
  wrap.style.transition = 'transform 50ms, filter 50ms';
  wrap.style.cursor = 'pointer';
  wrap.style.userSelect = 'none';
  wrap.style.webkitUserSelect = 'none';
  wrap.style.touchAction = 'manipulation';

  var inner = document.createElement('div');
  inner.style.background = T.bg;
  inner.style.borderTop = b + 'px solid ' + bevelLight;
  inner.style.borderLeft = b + 'px solid ' + bevelLight;
  inner.style.borderBottom = b + 'px solid ' + bevelDark;
  inner.style.borderRight = b + 'px solid ' + bevelDark;
  inner.style.clipPath = chamfer();
  inner.style.width = '100%';
  inner.style.height = '100%';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.boxSizing = 'border-box';
  inner.style.padding = '8px 12px';
  inner.style.fontFamily = T.fb;
  inner.style.fontSize = T.fsBtn;
  inner.style.fontWeight = 'bold';
  inner.style.color = T.textPrimary;
  inner.style.textTransform = 'uppercase';
  inner.style.letterSpacing = '2px';
  inner.textContent = roleName.toUpperCase();

  wrap.appendChild(inner);
  wrap._roleName = roleName;
  wrap._selected = false;

  function _applyDefault() {
    inner.style.background = T.bg;
    inner.style.color = T.textPrimary;
    inner.style.borderTop = b + 'px solid ' + bevelLight;
    inner.style.borderLeft = b + 'px solid ' + bevelLight;
    inner.style.borderBottom = b + 'px solid ' + bevelDark;
    inner.style.borderRight = b + 'px solid ' + bevelDark;
    wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + baseShadow + ') drop-shadow(0 0 8px ' + glowDefault + ')';
    wrap.style.transform = 'translate(0,0)';
  }

  function _applySelected() {
    var selBevelLight = _lightenHex(roleColor, 0.3);
    var selBevelDark = _darkenHex(roleColor, 0.3);
    var glowFull = _hexToRgba(roleColor, 1.0);
    inner.style.background = roleColor;
    inner.style.color = T.bg;
    inner.style.borderTop = b + 'px solid ' + selBevelLight;
    inner.style.borderLeft = b + 'px solid ' + selBevelLight;
    inner.style.borderBottom = b + 'px solid ' + selBevelDark;
    inner.style.borderRight = b + 'px solid ' + selBevelDark;
    wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + baseShadow + ') drop-shadow(0 0 8px ' + glowFull + ')';
    wrap.style.transform = 'translate(0,0)';
  }

  wrap._resetVisual = function() {
    if (wrap._selected) _applySelected();
    else _applyDefault();
  };

  // Press animation
  wrap.addEventListener('pointerdown', function() {
    var curLight = wrap._selected ? _lightenHex(roleColor, 0.3) : bevelLight;
    var curDark = wrap._selected ? _darkenHex(roleColor, 0.3) : bevelDark;
    inner.style.borderTop = b + 'px solid ' + curDark;
    inner.style.borderLeft = b + 'px solid ' + curDark;
    inner.style.borderBottom = b + 'px solid ' + curLight;
    inner.style.borderRight = b + 'px solid ' + curLight;
    wrap.style.filter = 'drop-shadow(0px 0px 0px transparent)';
    wrap.style.transform = 'translate(' + T.shadowX + 'px, ' + T.shadowY + 'px)';
  });

  wrap.addEventListener('pointerup', function() {
    onSelect(roleName);
  });

  wrap.addEventListener('pointerleave', function() {
    wrap._resetVisual();
  });

  return wrap;
}

// ═══════════════════════════════════════════════════
//  SCENE REGISTRATION
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'clock-in',

  mount: function(el, params) {
    params = params || {};
    var emp = params.emp || {};
    _selectedRole = null;

    setSceneName('Clock In');
    setHeaderBack({
      back: true,
      onBack: function() { SceneManager.closeTransactional('clock-in'); SceneManager.openGate('login'); },
    });

    el.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';

    // ── Main Panel ──────────────────────────
    var panel = document.createElement('div');
    panel.style.cssText = [
      'width:960px;height:500px;',
      'background:' + T.bgDark + ';',
      'border:2px solid ' + T.mint + ';',
      'display:flex;flex-direction:column;',
      'box-sizing:border-box;padding:20px;',
      'position:relative;',
    ].join('');
    panel.style.clipPath = chamfer(10);
    el.appendChild(panel);

    // ── TOP ROW ─────────────────────────────
    var topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;margin-bottom:12px;';
    panel.appendChild(topRow);

    // Left: Greeting
    var greetWrap = document.createElement('div');

    var greetHeading = document.createElement('div');
    greetHeading.style.cssText = 'font-family:' + T.fh + ';font-size:42px;color:' + T.gold + ';font-style:italic;line-height:1.1;';
    var firstName = (emp.name || 'TEAM').split(' ')[0].toUpperCase();
    greetHeading.textContent = _greeting() + ', ' + firstName + '!';
    greetWrap.appendChild(greetHeading);

    var greetSub = document.createElement('div');
    greetSub.style.cssText = 'font-family:' + T.fb + ';font-size:22px;color:' + T.textPrimary + ';margin-top:8px;';
    greetSub.textContent = 'Please select a role below';
    greetWrap.appendChild(greetSub);

    topRow.appendChild(greetWrap);

    // Right: Pay Period Card
    var payCard = document.createElement('div');
    payCard.style.cssText = [
      'background:' + T.bgDark + ';',
      'border:2px solid ' + T.mint + ';',
      'padding:12px 16px;',
      'display:flex;flex-direction:column;gap:6px;',
    ].join('');
    payCard.style.clipPath = chamfer(6);

    var payLine = document.createElement('div');
    payLine.style.cssText = 'font-family:' + T.fb + ';font-size:20px;';
    var payLabel = document.createElement('span');
    payLabel.style.color = T.textPrimary;
    payLabel.textContent = 'Pay Period: ';
    var payValue = document.createElement('span');
    payValue.style.color = T.textSecondary;
    payValue.textContent = _payPeriodRange();
    payLine.appendChild(payLabel);
    payLine.appendChild(payValue);
    payCard.appendChild(payLine);

    var hoursLine = document.createElement('div');
    hoursLine.style.cssText = 'font-family:' + T.fb + ';font-size:20px;';
    var hoursLabel = document.createElement('span');
    hoursLabel.style.color = T.textPrimary;
    hoursLabel.textContent = 'Total Hours: ';
    var hoursValue = document.createElement('span');
    hoursValue.style.color = T.gold;
    hoursValue.textContent = '--';
    hoursLine.appendChild(hoursLabel);
    hoursLine.appendChild(hoursValue);
    payCard.appendChild(hoursLine);

    topRow.appendChild(payCard);

    // ── MIDDLE — Role Buttons ───────────────
    var roleArea = document.createElement('div');
    roleArea.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px;min-height:0;';
    panel.appendChild(roleArea);

    var roles = emp.roles || ['server'];
    var roleBtns = [];
    var offsets = [0, 220, 50, 270, 100, 320];

    roles.forEach(function(role, i) {
      var roleColor = T.roles[role] || T.mint;
      var btn = _buildRoleButton(role, roleColor, function(selectedRole) {
        _selectedRole = selectedRole;
        roleBtns.forEach(function(rb) {
          rb._selected = (rb._roleName === selectedRole);
          rb._resetVisual();
        });
        _updateClockInBtn();
      });
      btn.style.width = '260px';
      btn.style.height = '75px';
      btn.style.marginLeft = (offsets[i % offsets.length]) + 'px';
      btn.style.flexShrink = '0';
      roleBtns.push(btn);
      roleArea.appendChild(btn);
    });

    // ── BOTTOM — CLOCK IN Button ────────────
    var bottomRow = document.createElement('div');
    bottomRow.style.cssText = 'display:flex;justify-content:flex-end;flex-shrink:0;margin-top:8px;';
    panel.appendChild(bottomRow);

    var clockPair = buildStyledButton(T.green);
    var clockBtn = clockPair.wrap;
    clockBtn.style.width = '180px';
    clockBtn.style.height = '56px';
    clockPair.inner.style.fontFamily = T.fb;
    clockPair.inner.style.fontSize = T.fsBtn;
    clockPair.inner.style.fontWeight = 'bold';
    clockPair.inner.style.color = T.bg;
    clockPair.inner.style.letterSpacing = '2px';
    clockPair.inner.textContent = 'CLOCK IN';

    // Start disabled
    clockBtn.style.opacity = '0.4';
    clockBtn.style.filter = 'none';
    clockBtn.style.pointerEvents = 'none';

    function _restoreClockGlow() {
      var greenGlow = _hexToRgba(T.green, 0.8);
      clockBtn.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + clockBtn._shadow + ') drop-shadow(0 0 8px ' + greenGlow + ')';
    }

    function _updateClockInBtn() {
      if (_selectedRole) {
        clockBtn.style.opacity = '1';
        clockBtn.style.pointerEvents = 'auto';
        _restoreClockGlow();
      } else {
        clockBtn.style.opacity = '0.4';
        clockBtn.style.filter = 'none';
        clockBtn.style.pointerEvents = 'none';
      }
    }

    // Restore glow after press release (fires after built-in _wUp handler)
    clockBtn.addEventListener('pointerup', function() {
      if (_selectedRole) _restoreClockGlow();
    });
    clockBtn.addEventListener('pointerleave', function() {
      if (_selectedRole) _restoreClockGlow();
    });

    // Clock-in action
    clockBtn.addEventListener('pointerup', function() {
      if (!_selectedRole) return;

      clockBtn.style.opacity = '0.6';
      clockBtn.style.pointerEvents = 'none';

      fetch(API + '/servers/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: emp.id,
          employee_name: emp.name,
          pin: emp.pin,
        }),
      })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw new Error(d.detail || 'Clock-in failed'); });
        return r.json();
      })
      .then(function() {
        showToast(emp.name + ' clocked in as ' + _selectedRole.toUpperCase(), { bg: T.goGreen, duration: 3000 });
        SceneManager.closeTransactional('clock-in');
        SceneManager.openGate('login');
      })
      .catch(function(err) {
        showToast(err.message || 'Clock-in failed', { bg: T.red, duration: 4000 });
        clockBtn.style.opacity = '1';
        clockBtn.style.pointerEvents = 'auto';
      });
    });

    bottomRow.appendChild(clockBtn);

    // ── Fetch Hours ─────────────────────────
    var today = new Date();
    var dateStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    fetch(API + '/reports/labor-summary?date=' + dateStr + '&server_id=' + encodeURIComponent(emp.id))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        hoursValue.textContent = (data.weekly_hours || 0).toFixed(2);
      })
      .catch(function() {
        hoursValue.textContent = '0.00';
      });

    // ── Version stamp ───────────────────────
    var version = document.createElement('div');
    version.style.cssText = 'position:absolute;bottom:4px;right:12px;font-family:' + T.fb + ';font-size:25px;color:' + T.numpadChassis + ';';
    version.textContent = 'KINDpos/lite_Vz1.2';
    panel.appendChild(version);
  },

  unmount: function() {
    _selectedRole = null;
  },
});
