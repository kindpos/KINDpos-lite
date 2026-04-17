/* ============================================
   KINDpos Overseer — Theme Bridge
   Thin wrapper over the terminal's theme registry.
   Overseer chrome is fixed to Terminal Glow — the
   editor here just saves custom themes that the
   terminal consumes on boot.
   ============================================ */

import {
  THEME_SLOTS,
  DEFAULT_SLOTS,
  expandOverrides,
  listCustomThemes,
  getActiveThemeId,
  getCustomTheme,
  saveCustomTheme,
  deleteCustomTheme,
  setActiveTheme,
  newThemeId,
} from '../../js/themes/index.js';

export {
  THEME_SLOTS,
  DEFAULT_SLOTS,
  expandOverrides,
  listCustomThemes,
  getActiveThemeId,
  getCustomTheme,
  saveCustomTheme,
  deleteCustomTheme,
  setActiveTheme,
  newThemeId,
};

// Kept for backwards compatibility with app.js boot — no-op now
// that themes don't recolor Overseer's own chrome.
export async function initThemeBridge() {}
