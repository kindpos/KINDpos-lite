/* ============================================
   KINDpos Overseer — Theme Bridge
   Connects Overseer to the frontend's 13-theme
   system. Loads themes, syncs CSS custom properties,
   and persists selection to localStorage.
   ============================================ */

import { T, setTheme, resetTheme, onThemeChange } from './components/tokens.js';
import { THEMES } from '../../js/themes/index.js';

const STORAGE_KEY = 'kindpos-overseer-theme';

/* ------------------------------------------
   T → CSS Custom Property Mapping

   Maps T object properties to the CSS variables
   defined in overseer/styles/variables.css so
   stylesheets respond to theme changes.
------------------------------------------ */
const TOKEN_TO_CSS = {
    gold:       '--color-gold',
    mint:       '--color-mint',
    vermillion: '--color-vermillion',
    goGreen:    '--color-green',
    sage:       '--color-sage',
    bg:         '--color-bg',
    bgDark:     '--color-bg-dark',
    bgLight:    '--color-bevel-light',
    bgEdge:     '--color-bevel-dark',
    darkBtn:    '--color-warm-gray',
    fh:         '--font-heading',
    fb:         '--font-body',
};

const TOKEN_TO_CSS_RGB = {
    gold:       '--color-gold-rgb',
    mint:       '--color-mint-rgb',
    vermillion: '--color-vermillion-rgb',
    bg:         '--color-bg-rgb',
    bgDark:     '--color-bg-dark-rgb',
};

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
}

function syncCSSVars() {
    const root = document.documentElement.style;
    for (const [tokenKey, cssVar] of Object.entries(TOKEN_TO_CSS)) {
        if (T[tokenKey] != null) {
            root.setProperty(cssVar, T[tokenKey]);
        }
    }
    for (const [tokenKey, cssVar] of Object.entries(TOKEN_TO_CSS_RGB)) {
        if (T[tokenKey] != null && T[tokenKey].startsWith('#')) {
            root.setProperty(cssVar, hexToRgb(T[tokenKey]));
        }
    }
}

/* ------------------------------------------
   THEME APPLICATION
------------------------------------------ */

let _currentThemeId = 'terminal-glow';

export async function applyTheme(themeId) {
    const entry = THEMES.find(t => t.id === themeId);
    if (!entry) {
        console.warn(`[Theme] Unknown theme: ${themeId}`);
        return;
    }

    if (themeId === 'terminal-glow') {
        resetTheme();
    } else if (entry.loader) {
        const overrides = await entry.loader();
        setTheme(overrides);
    } else if (entry.theme) {
        setTheme(entry.theme);
    }

    _currentThemeId = themeId;
    localStorage.setItem(STORAGE_KEY, themeId);
    syncCSSVars();
}

export function getCurrentThemeId() {
    return _currentThemeId;
}

export function getThemeCatalog() {
    return THEMES;
}

/* ------------------------------------------
   BOOT — Load saved theme + wire listener
------------------------------------------ */

export async function initThemeBridge() {
    // Sync CSS vars whenever theme changes (from any source)
    onThemeChange(() => syncCSSVars());

    // Sync initial defaults
    syncCSSVars();

    // Load saved preference
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== 'terminal-glow') {
        await applyTheme(saved);
    }
}
