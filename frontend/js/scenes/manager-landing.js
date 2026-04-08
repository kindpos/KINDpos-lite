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

  _leftCol = document.createElement('div');
  _leftCol.style.cssText = 'display:flex;flex-direction:column;gap:8px;overflow:hidden;';

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
    _el = null;
    _params = null;
    _leftCol = null;
    _centerCol = null;
    _rightCol = null;
    _headerLabel = null;
  },
});
