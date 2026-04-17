// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Theme Registry
//  Terminal Glow is the only built-in. Users build
//  their own themes via the Overseer appearance editor;
//  saved themes live in localStorage and are replayed
//  through setTheme() on boot.
// ═══════════════════════════════════════════════════

import { T, setTheme, resetTheme, onThemeChange } from '../tokens.js';

export const STORAGE_KEY = 'kindpos-custom-themes';

// ── Curated slot contract ───────────────────────────
// Each slot is one color the user picks. Edge tokens
// (e.g. numpadChassisL/D) are derived at apply time.
export const THEME_SLOTS = [
  { key: 'bg',            group: 'Cards & Background', label: 'Screen background', hint: 'The color behind everything on screen.' },
  { key: 'numpadChassis', group: 'Cards & Background', label: 'Card border',       hint: 'The frame around each card.' },
  { key: 'gold',          group: 'Cards & Background', label: 'Highlight',         hint: 'Prices, titles, and important labels.' },
  { key: 'headerBg',      group: 'Headers',            label: 'Header bar',        hint: 'The strip at the top of the screen and on each card.' },
  { key: 'headerText',    group: 'Headers',            label: 'Header text',       hint: 'Text inside those strips.' },
  { key: 'mint',          group: 'Accents',            label: 'Main accent',       hint: 'Confirm buttons and structural highlights.' },
  { key: 'cyan',          group: 'Accents',            label: 'Secondary accent',  hint: 'A cooler secondary tone.' },
  { key: 'textPrimary',   group: 'Text',               label: 'Body text',         hint: 'Item names, descriptions, numbers.' },
  { key: 'textSecondary', group: 'Text',               label: 'Secondary text',    hint: 'Captions under the body text.' },
  { key: 'mutedText',     group: 'Text',               label: 'Muted text',        hint: 'Timestamps and subtle labels.' },
  { key: 'goGreen',       group: 'Text',               label: 'Money',             hint: 'Totals and paid amounts.' },
  { key: 'red',           group: 'Text',               label: 'Warning',           hint: 'Voids, alerts, destructive actions.' },
];

// Fallback slot values used when creating a new theme
// (mirrors Terminal Glow defaults from tokens.js).
export const DEFAULT_SLOTS = {
  bg:            '#333333',
  numpadChassis: '#87f79c',
  gold:          '#fcbe40',
  headerBg:      '#87f79c',
  headerText:    '#1a1a1a',
  mint:          '#C6FFBB',
  cyan:          '#33ffff',
  textPrimary:   '#f5f0e8',
  textSecondary: '#b0a898',
  mutedText:     '#888888',
  goGreen:       '#7ac943',
  red:           '#da331c',
};

// ── Color math (duplicated to avoid a cycle with theme-manager)
function _lighten(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return '#' + [
    Math.min(255, Math.round(r + (255 - r) * pct)),
    Math.min(255, Math.round(g + (255 - g) * pct)),
    Math.min(255, Math.round(b + (255 - b) * pct)),
  ].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}
function _darken(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var f = 1 - pct;
  return '#' + [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
    .map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

// Expand a 10-slot custom theme into the full token overrides setTheme() consumes.
export function expandOverrides(slots) {
  var s = Object.assign({}, DEFAULT_SLOTS, slots || {});
  return {
    bg:             s.bg,
    bgDark:         _darken(s.bg, 0.35),
    bgLight:        _lighten(s.bg, 0.35),
    bgEdge:         _darken(s.bg, 0.55),

    numpadChassis:  s.numpadChassis,
    numpadChassisL: _lighten(s.numpadChassis, 0.2),
    numpadChassisD: _darken(s.numpadChassis, 0.3),

    mint:           s.mint,
    mintEdgeL:      _lighten(s.mint, 0.2),
    mintEdgeD:      _darken(s.mint, 0.3),

    cyan:           s.cyan,
    cyanL:          _lighten(s.cyan, 0.2),
    cyanD:          _darken(s.cyan, 0.3),

    gold:           s.gold,
    goldL:          _lighten(s.gold, 0.2),
    goldD:          _darken(s.gold, 0.3),

    headerBg:       s.headerBg,
    headerBgL:      _lighten(s.headerBg, 0.2),
    headerBgD:      _darken(s.headerBg, 0.3),
    headerText:     s.headerText,

    goGreen:        s.goGreen,
    greenL:         _lighten(s.goGreen, 0.2),
    greenD:         _darken(s.goGreen, 0.3),

    red:            s.red,
    redL:           _lighten(s.red, 0.2),
    redD:           _darken(s.red, 0.3),

    textPrimary:    s.textPrimary,
    textSecondary:  s.textSecondary,
    mutedText:      s.mutedText,

    // Transactional frame tracks the primary accent.
    frameTransactional: s.mint,
    frameInterruptCritical: s.red,
  };
}

// ── LocalStorage schema ─────────────────────────────
// {
//   activeId: 'terminal-glow' | '<uuid>',
//   themes:   { '<uuid>': { id, label, slots: {...} } }
// }

function _readStore() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeId: 'terminal-glow', themes: {} };
    var parsed = JSON.parse(raw);
    if (!parsed.themes) parsed.themes = {};
    if (!parsed.activeId) parsed.activeId = 'terminal-glow';
    return parsed;
  } catch (e) {
    return { activeId: 'terminal-glow', themes: {} };
  }
}

function _writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listCustomThemes() {
  var store = _readStore();
  return Object.keys(store.themes).map(function(id) { return store.themes[id]; });
}

export function getActiveThemeId() {
  return _readStore().activeId;
}

export function getCustomTheme(id) {
  return _readStore().themes[id] || null;
}

export function saveCustomTheme(theme) {
  if (!theme || !theme.id || !theme.label) throw new Error('theme requires id and label');
  var store = _readStore();
  store.themes[theme.id] = {
    id: theme.id,
    label: theme.label,
    slots: Object.assign({}, DEFAULT_SLOTS, theme.slots || {}),
  };
  _writeStore(store);
}

export function deleteCustomTheme(id) {
  var store = _readStore();
  delete store.themes[id];
  if (store.activeId === id) store.activeId = 'terminal-glow';
  _writeStore(store);
}

export function setActiveTheme(id) {
  var store = _readStore();
  if (id === 'terminal-glow' || store.themes[id]) {
    store.activeId = id;
    _writeStore(store);
  }
}

// Mirror the subset of T that stylesheets (base.css) read via
// CSS custom properties. Must be called after setTheme/resetTheme
// so the shell header and other CSS-driven surfaces repaint.
function _syncCssVars() {
  if (typeof document === 'undefined') return;
  var root = document.documentElement.style;
  root.setProperty('--header-bg',    T.headerBg   || T.numpadChassis);
  root.setProperty('--header-bg-l',  T.headerBgL  || T.numpadChassisL);
  root.setProperty('--header-bg-d',  T.headerBgD  || T.numpadChassisD);
  root.setProperty('--header-text',  T.headerText || T.bgDark);
}

// Register once so any setTheme/resetTheme call repaints CSS surfaces.
onThemeChange(_syncCssVars);

// Apply the currently active theme to T. Called by terminal boot
// and by the Overseer editor after Save.
export function applyActiveTheme() {
  var store = _readStore();
  if (store.activeId === 'terminal-glow') {
    resetTheme();
    _syncCssVars();
    return;
  }
  var entry = store.themes[store.activeId];
  if (!entry) {
    resetTheme();
    _syncCssVars();
    return;
  }
  setTheme(expandOverrides(entry.slots));
  _syncCssVars();
}

// Built-in theme catalog — Terminal Glow only.
// Custom themes live alongside it via listCustomThemes().
export var THEMES = [
  { id: 'terminal-glow', label: 'Terminal Glow', builtin: true },
];

export function newThemeId() {
  return 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
