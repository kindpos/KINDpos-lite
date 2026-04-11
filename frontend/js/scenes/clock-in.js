// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Clock-In Scene
//  Transactional overlay: staff role selection + clock-in
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton } from '../tokens.js';
import { showToast, buildRoleButton } from '../components.js';
import { buildCard } from '../theme-manager.js';
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

    el.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:' + T.bg + ';';

    // ── Main Panel ──────────────────────��───
    var mainCard = buildCard({ width: '960px', height: '500px' });
    mainCard.card.style.display = 'flex';
    mainCard.card.style.flexDirection = 'column';
    mainCard.card.style.position = 'relative';
    var panel = mainCard.card;
    el.appendChild(mainCard.wrap);

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
    greetSub.style.cssText = 'font-family:' + T.fb + ';font-size:38px;color:' + T.textPrimary + ';margin-top:8px;';
    greetSub.textContent = 'Please select a role below';
    greetWrap.appendChild(greetSub);

    topRow.appendChild(greetWrap);

    // Right: Pay Period Card
    var payPair = buildCard({ chamferSize: 8, padding: '20px 32px', glow: false });
    var payWrap = payPair.wrap;
    var payCard = payPair.card;
    payCard.style.display = 'flex';
    payCard.style.flexDirection = 'column';
    payCard.style.gap = '12px';

    var payLine = document.createElement('div');
    payLine.style.cssText = 'font-family:' + T.fb + ';font-size:32px;';
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
    hoursLine.style.cssText = 'font-family:' + T.fb + ';font-size:32px;';
    var hoursLabel = document.createElement('span');
    hoursLabel.style.color = T.textPrimary;
    hoursLabel.textContent = 'Total Hours: ';
    var hoursValue = document.createElement('span');
    hoursValue.style.color = T.gold;
    hoursValue.textContent = '--';
    hoursLine.appendChild(hoursLabel);
    hoursLine.appendChild(hoursValue);
    payCard.appendChild(hoursLine);

    topRow.appendChild(payWrap);

    // ── MIDDLE — Role Buttons ───────────────
    var roleArea = document.createElement('div');
    roleArea.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px;min-height:0;';
    panel.appendChild(roleArea);

    var roles = emp.roles || ['server'];
    var roleBtns = [];
    var offsets = [0, 260, 80, 340, 140, 400];

    roles.forEach(function(role, i) {
      var roleColor = T.roles[role] || T.mint;
      var btn = buildRoleButton(role, roleColor, function(selectedRole) {
        _selectedRole = selectedRole;
        roleBtns.forEach(function(rb) {
          rb._selected = (rb._roleName === selectedRole);
          rb._resetVisual();
        });
        _updateClockInBtn();
      });
      btn.style.width = '380px';
      btn.style.height = '90px';
      if (roles.length === 1) {
        btn.style.alignSelf = 'center';
      } else {
        btn.style.marginLeft = (offsets[i % offsets.length]) + 'px';
      }
      btn.style.flexShrink = '0';
      roleBtns.push(btn);
      roleArea.appendChild(btn);
    });

    // ── BOTTOM ROW — CLOCK IN ──
    var bottomRow = document.createElement('div');
    bottomRow.style.cssText = 'display:flex;justify-content:flex-end;flex-shrink:0;margin-top:8px;';
    panel.appendChild(bottomRow);

    var clockPair = buildStyledButton({ label: 'CLOCK IN', variant: 'gold', size: 'lg', disabled: true });
    var clockBtn = clockPair.wrap;

    function _updateClockInBtn() {
      clockBtn.setDisabled(!_selectedRole);
    }

    // Clock-in action
    clockBtn.addEventListener('pointerup', function() {
      if (!_selectedRole) return;

      clockBtn.setDisabled(true);

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
        clockBtn.setDisabled(false);
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

  },

  unmount: function() {
    _selectedRole = null;
  },
});
