// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Theme Registry
//  Terminal Glow is the only built-in. Users build
//  their own themes via the Overseer appearance editor;
//  saved themes live in localStorage and are replayed
//  through setTheme() on boot.
// ═══════════════════════════════════════════════════

import { setTheme, resetTheme } from '../tokens.js';

export const STORAGE_KEY = 'kindpos-custom-themes';

// ── Curated slot contract ───────────────────────────
// Each slot is one color the user picks. Edge tokens
// (e.g. numpadChassisL/D) are derived at apply time.
export const THEME_SLOTS = [
  { key: 'bg',            group: 'Card',       label: 'Scene background',  hint: 'Main terminal background behind all cards.' },
  { key: 'numpadChassis', group: 'Card',       label: 'Card border',       hint: 'Bevel color on every beveled card (login, numpad, panels).' },
  { key: 'gold',          group: 'Card',       label: 'Header accent',     hint: 'Scene titles, section headings, money labels.' },
  { key: 'mint',          group: 'Accents',    label: 'Primary accent',    hint: 'Structural — chassis, transactional overlay frame.' },
  { key: 'cyan',          group: 'Accents',    label: 'Secondary accent',  hint: 'Info / cool counterpoint to the primary accent.' },
  { key: 'textPrimary',   group: 'Typography', label: 'Title text',        hint: 'Primary body/heading color.' },
  { key: 'textSecondary', group: 'Typography', label: 'Subtitle text',     hint: 'Secondary captions and supporting labels.' },
  { key: 'mutedText',     group: 'Typography', label: 'Data / muted',      hint: 'Metadata, axis labels, dim content.' },
  { key: 'goGreen',       group: 'Typography', label: 'Money / positive',  hint: 'Totals, confirms, positive deltas.' },
  { key: 'red',           group: 'Typography', label: 'Warning / negative',hint: 'Voids, alerts, destructive actions.' },
];

// Fallback slot values used when creating a new theme
// (mirrors Terminal Glow defaults from tokens.js).
export const DEFAULT_SLOTS = {
  bg:            '#333333',
  numpadChassis: '#87f79c',
  gold:          '#fcbe40',
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

// Apply the currently active theme to T. Called by terminal boot
// and by the Overseer editor after Save.
export function applyActiveTheme() {
  var store = _readStore();
  if (store.activeId === 'terminal-glow') {
    resetTheme();
    return;
  }
  var entry = store.themes[store.activeId];
  if (!entry) {
    resetTheme();
    return;
  }
  setTheme(expandOverrides(entry.slots));
}

// Built-in theme catalog — Terminal Glow only.
// Custom themes live alongside it via listCustomThemes().
export var THEMES = [
  { id: 'terminal-glow', label: 'Terminal Glow', builtin: true },
];

export function newThemeId() {
  return 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
