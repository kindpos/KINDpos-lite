// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Scene Manager v2
//  Three-tier navigation: Scenes / Overlays / Interrupts
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

const DEBOUNCE_MS = 200;
const SLOW_THRESHOLD_MS = 500;

// ── Registry ──────────────────────────────────────
const scenes = {};

// ── State ─────────────────────────────────────────
const navStack = [];
let activeScene = null;
let cachedEls = {};
let overlayStack = [];
let activeInterrupt = null;
let lastNavTime = 0;
let timeoutTimers = {};
let lastInteraction = {};

// ── DOM Containers ────────────────────────────────
let sceneContainer = null;
let overlayContainer = null;
let interruptContainer = null;

// ── Diagnostics ───────────────────────────────────
let diagnosticFn = null;

function emit(type, data) {
  if (diagnosticFn) diagnosticFn({ type, ...data, timestamp: Date.now() });
}

function recordInteraction() {
  if (activeScene) lastInteraction[activeScene] = Date.now();
}

function debounceCheck() {
  const now = Date.now();
  if (now - lastNavTime < DEBOUNCE_MS) return false;
  lastNavTime = now;
  return true;
}

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════

export function init(opts = {}) {
  sceneContainer = opts.sceneContainer || document.getElementById('scene-container');
  overlayContainer = opts.overlayContainer || document.getElementById('overlay-container');
  interruptContainer = opts.interruptContainer || document.getElementById('interrupt-container');
  diagnosticFn = opts.onDiagnostic || null;

  document.addEventListener('pointerdown', recordInteraction);
  document.addEventListener('keydown', recordInteraction);
}

// ═══════════════════════════════════════════════════
//  REGISTRATION
// ═══════════════════════════════════════════════════

export function registerScene(name, config) {
  scenes[name] = {
    onEnter:    config.onEnter,
    onExit:     config.onExit    || null,
    onPause:    config.onPause   || null,
    onResume:   config.onResume  || null,
    canExit:    config.canExit   || null,
    cache:      config.cache     || false,
    prefetch:   config.prefetch  || [],
    timeoutMs:  config.timeoutMs || 0,
    onTimeout:  config.onTimeout || null,
  };
}

// ═══════════════════════════════════════════════════
//  SCENE NAVIGATION
// ═══════════════════════════════════════════════════

export async function push(name, params = {}) {
  if (!debounceCheck()) return;
  if (!scenes[name]) return console.error(`Scene "${name}" not registered`);

  const from = activeScene;
  const t0 = performance.now();

  // Exit guard
  if (from && scenes[from].canExit) {
    const allowed = await Promise.resolve(scenes[from].canExit());
    if (!allowed) {
      emit('NAV.EXIT_BLOCKED', { scene: from, target: name });
      return;
    }
  }

  // Pause or teardown current scene
  if (from) {
    clearTimeout(timeoutTimers[from]);
    if (scenes[from].cache) {
      if (scenes[from].onPause) scenes[from].onPause();
      const el = sceneContainer.querySelector(`[data-scene="${from}"]`);
      if (el) { el.style.display = 'none'; cachedEls[from] = el; }
    } else {
      if (scenes[from].onExit) scenes[from].onExit();
      const el = sceneContainer.querySelector(`[data-scene="${from}"]`);
      if (el) el.remove();
    }
  }

  navStack.push({ name, params });
  activeScene = name;

  // Restore from cache or build fresh
  if (cachedEls[name]) {
    cachedEls[name].style.display = '';
    if (scenes[name].onResume) scenes[name].onResume();
  } else {
    const el = document.createElement('div');
    el.dataset.scene = name;
    el.style.width = '100%';
    el.style.height = '100%';
    sceneContainer.appendChild(el);
    scenes[name].onEnter(el, params);
  }

  // Start timeout timer
  startTimeout(name);

  // Prefetch
  scenes[name].prefetch.forEach(pre => {
    if (scenes[pre] && !cachedEls[pre]) {
      const hidden = document.createElement('div');
      hidden.dataset.scene = pre;
      hidden.style.display = 'none';
      sceneContainer.appendChild(hidden);
      scenes[pre].onEnter(hidden, {});
      cachedEls[pre] = hidden;
    }
  });

  const ms = Math.round(performance.now() - t0);
  emit(ms > SLOW_THRESHOLD_MS ? 'NAV.TRANSITION_SLOW' : 'NAV.SCENE_PUSH', {
    from, to: name, params, transitionMs: ms, stackDepth: navStack.length
  });
}

export async function pop() {
  if (!debounceCheck()) return;
  if (navStack.length <= 1) return; // Can't pop the root

  const from = activeScene;

  // Exit guard
  if (from && scenes[from].canExit) {
    const allowed = await Promise.resolve(scenes[from].canExit());
    if (!allowed) {
      emit('NAV.EXIT_BLOCKED', { scene: from, target: 'pop' });
      return;
    }
  }

  // Teardown current
  clearTimeout(timeoutTimers[from]);
  if (scenes[from].onExit) scenes[from].onExit();
  const el = sceneContainer.querySelector(`[data-scene="${from}"]`);
  if (el) el.remove();
  delete cachedEls[from];

  navStack.pop();
  const prev = navStack[navStack.length - 1];
  activeScene = prev.name;

  // Restore previous
  if (cachedEls[prev.name]) {
    cachedEls[prev.name].style.display = '';
    if (scenes[prev.name].onResume) scenes[prev.name].onResume();
  } else {
    const newEl = document.createElement('div');
    newEl.dataset.scene = prev.name;
    newEl.style.width = '100%';
    newEl.style.height = '100%';
    sceneContainer.appendChild(newEl);
    scenes[prev.name].onEnter(newEl, prev.params);
  }

  startTimeout(prev.name);
  emit('NAV.SCENE_POP', { from, to: prev.name, stackDepth: navStack.length });
}

export async function replace(name, params = {}) {
  if (!debounceCheck()) return;
  if (!scenes[name]) return console.error(`Scene "${name}" not registered`);

  const from = activeScene;

  // Teardown current (no exit guard on replace)
  if (from) {
    clearTimeout(timeoutTimers[from]);
    if (scenes[from].onExit) scenes[from].onExit();
    const el = sceneContainer.querySelector(`[data-scene="${from}"]`);
    if (el) el.remove();
    delete cachedEls[from];
  }

  // Replace top of stack
  if (navStack.length > 0) navStack[navStack.length - 1] = { name, params };
  else navStack.push({ name, params });

  activeScene = name;

  const el = document.createElement('div');
  el.dataset.scene = name;
  el.style.width = '100%';
  el.style.height = '100%';
  sceneContainer.appendChild(el);
  scenes[name].onEnter(el, params);

  startTimeout(name);
  emit('NAV.SCENE_REPLACE', { from, to: name, params });
}

// ═══════════════════════════════════════════════════
//  OVERLAYS
// ═══════════════════════════════════════════════════

export function overlay(name, params = {}) {
  if (scenes[activeScene] && scenes[activeScene].onPause) {
    scenes[activeScene].onPause();
  }

  // Dim layer
  const dim = document.createElement('div');
  dim.className = 'overlay-dim';
  dim.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:100;';
  overlayContainer.appendChild(dim);

  // Overlay content
  const el = document.createElement('div');
  el.className = 'overlay-content';
  el.style.cssText = 'position:absolute;inset:0;z-index:101;display:flex;align-items:center;justify-content:center;';
  overlayContainer.appendChild(el);

  const entry = { name, params, el, dim };
  overlayStack.push(entry);

  // Let caller build UI inside el
  if (params.onBuild) params.onBuild(el);

  emit('NAV.OVERLAY_OPEN', { name, sceneBelow: activeScene });
  return el;
}

export function dismissOverlay() {
  if (overlayStack.length === 0) return;

  const entry = overlayStack.pop();
  entry.el.remove();
  entry.dim.remove();

  if (overlayStack.length === 0 && scenes[activeScene] && scenes[activeScene].onResume) {
    scenes[activeScene].onResume();
  }

  emit('NAV.OVERLAY_DISMISS', { name: entry.name, sceneBelow: activeScene });
}

// ═══════════════════════════════════════════════════
//  INTERRUPTS
// ═══════════════════════════════════════════════════

export function interrupt(name, params = {}) {
  return new Promise((resolve, reject) => {
    if (activeInterrupt) {
      reject(new Error('Interrupt already active'));
      return;
    }

    // Dim everything
    const dim = document.createElement('div');
    dim.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.7);z-index:200;';
    interruptContainer.appendChild(dim);

    // Interrupt content
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;inset:0;z-index:201;display:flex;align-items:center;justify-content:center;';
    interruptContainer.appendChild(el);

    activeInterrupt = { name, params, el, dim, resolve, reject };

    if (params.onBuild) params.onBuild(el);

    emit('NAV.INTERRUPT_TRIGGERED', { name, reason: params.reason || '' });
  });
}

export function resolveInterrupt(value) {
  if (!activeInterrupt) return;
  const { name, el, dim, resolve } = activeInterrupt;
  el.remove();
  dim.remove();
  activeInterrupt = null;
  resolve(value);
  emit('NAV.INTERRUPT_RESOLVED', { name });
}

export function cancelInterrupt() {
  if (!activeInterrupt) return;
  const { name, el, dim, reject } = activeInterrupt;
  el.remove();
  dim.remove();
  activeInterrupt = null;
  reject(new Error('Interrupt cancelled'));
  emit('NAV.INTERRUPT_CANCELLED', { name });
}

// ═══════════════════════════════════════════════════
//  TIMEOUT
// ═══════════════════════════════════════════════════

function startTimeout(name) {
  clearTimeout(timeoutTimers[name]);
  const scene = scenes[name];
  if (!scene || !scene.timeoutMs || !scene.onTimeout) return;

  lastInteraction[name] = Date.now();
  timeoutTimers[name] = setInterval(() => {
    const idle = Date.now() - (lastInteraction[name] || 0);
    if (idle >= scene.timeoutMs) {
      clearInterval(timeoutTimers[name]);
      emit('NAV.TIMEOUT', { scene: name, idleMs: idle });
      scene.onTimeout();
    }
  }, 5000); // Check every 5s
}

// ═══════════════════════════════════════════════════
//  GETTERS
// ═══════════════════════════════════════════════════

export function getActiveScene() { return activeScene; }
export function getStack() { return [...navStack]; }
export function getOverlayCount() { return overlayStack.length; }
export function hasInterrupt() { return activeInterrupt !== null; }