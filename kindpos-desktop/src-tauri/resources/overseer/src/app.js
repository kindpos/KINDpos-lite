/* ============================================
   KINDpos Overseer — Boot Sequence
   Nice. Dependable. Yours.
   ============================================ */

import { SceneManager }              from './components/scene-manager.js';
import { T }                          from './components/tokens.js';
import { initThemeBridge, applyTheme, getCurrentThemeId, getThemeCatalog }
                                      from './theme-bridge.js';
import { loadEmployeeData }           from './sample-data/sample-employees.js';
import { loadReportData }             from './sample-data/sample-reports.js';
import { loadTimeData }               from './sample-data/sample-timedata.js';
import { loadPayrollData }            from './sample-data/sample-payroll.js';
import { loadShiftData }              from './sample-data/sample-shifts.js';

import { registerSalesReports }       from './sections/reporting.js';
import { registerMenuImport }         from './sections/menu-import.js';
import { registerEmployeeSections }   from './sections/employees.js';
import { registerSystemTesting }      from './sections/system-testing.js';
import { registerMenuCategories }     from './sections/menu-categories.js';
import { registerMenuAvailability }   from './sections/menu-availability.js';
import { registerConfigureModifiers } from './sections/configure-modifiers.js';
import { registerPricingSpecials }    from './sections/pricing-specials.js';
import { registerDisplayOrder }       from './sections/display-order.js';
import { registerPrinterConfig }      from './sections/printer-config.js';
import { registerPrinterSetup }       from './sections/printer-setup.js';

// Build-pattern sections (no register wrapper — wrap manually below)
import { buildStoreInfoScene,     cleanupStoreInfo     } from './sections/store-info.js';
import { buildOrderSettingsScene, cleanupOrderSettings } from './sections/order-settings.js';
import { buildCardReadersScene,  cleanupCardReaders  } from './sections/card-readers.js';
import { buildReceiptSettingsScene, cleanupReceiptSettings } from './sections/receipt-settings.js';
import { buildTerminalSettingsScene, cleanupTerminalSettings } from './sections/terminal-settings.js';
import { buildLaborReportsScene,  cleanupLaborReports  } from './sections/labor-reports.js';
import { buildMenuPerformanceScene, cleanupMenuPerformance } from './sections/menu-performance.js';
import { buildFloorPlanScene,    cleanupFloorPlan    } from './sections/floor-plan.js';
import { buildPayrollTipsScene,    cleanupPayrollTips    } from './sections/payroll-tips.js';
import { buildTimeAttendanceScene, cleanupTimeAttendance } from './sections/time-attendance.js';
import { buildShiftConfigScene,    cleanupShiftConfig    } from './sections/shift-config.js';

/* ------------------------------------------
   NAVIGATION STRUCTURE
------------------------------------------ */
const NAV = [
    {
        id: 'reporting',
        label: 'REPORTING',
        subs: [
            { id: 'sales-reports',    label: 'Sales Reports'    },
            { id: 'labor-reports',    label: 'Labor Reports'    },
            { id: 'menu-performance', label: 'Menu Performance' },
        ]
    },
    {
        id: 'menu',
        label: 'MENU',
        subs: [
            { id: 'menu-categories',     label: 'Categories'        },
            { id: 'modifier-groups',      label: 'Modifiers'         },
            { id: 'menu-availability',   label: 'Availability'      },
            { id: 'pricing-specials',    label: 'Pricing & Specials' },
            { id: 'display-order',       label: 'Display Order'     },
            { id: 'import-excel',        label: 'Import Menu'       },
        ]
    },
    {
        id: 'employees',
        label: 'EMPLOYEES',
        subs: [
            { id: 'employee-management', label: 'Staff List'     },
            { id: 'time-attendance',  label: 'Time & Attendance' },
            { id: 'payroll-tips',     label: 'Payroll & Tips'    },
            { id: 'shift-config',     label: 'Shift Config'      },
        ]
    },
    {
        id: 'store',
        label: 'STORE',
        subs: [
            { id: 'store-info',      label: 'Store Information' },
            { id: 'floor-plan',      label: 'Floor Plan'        },
            { id: 'order-settings',  label: 'Order Settings'    },
        ]
    },
    {
        id: 'hardware',
        label: 'HARDWARE',
        subs: [
            { id: 'printer-setup',    label: 'Printer Setup'    },
            { id: 'printer-config',   label: 'Printer Config'   },
            { id: 'card-readers',     label: 'Card Readers'     },
            { id: 'receipt-settings', label: 'Receipt Settings'  },
        ]
    },
    {
        id: 'system',
        label: 'SYSTEM',
        subs: [
            { id: 'system-testing',     label: 'System Testing'    },
            { id: 'terminal-settings',  label: 'Terminal Settings'  },
            { id: 'system-appearance',  label: 'Appearance'         },
        ]
    },
];

/* ------------------------------------------
   STATE
------------------------------------------ */
let _activeSection = null;
let _activeScene   = null;

/* ------------------------------------------
   SIDEBAR NAV BUILDER
------------------------------------------ */
function buildNav() {
    const container = document.getElementById('nav-sections');
    if (!container) return;
    container.innerHTML = '';

    NAV.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'nav-section';
        sectionEl.dataset.id = section.id;

        const headerEl = document.createElement('div');
        headerEl.className = 'nav-section-header';
        headerEl.textContent = section.label;
        headerEl.addEventListener('click', () => toggleSection(section.id));
        sectionEl.appendChild(headerEl);

        const subsEl = document.createElement('div');
        subsEl.className = 'nav-section-subs';
        subsEl.dataset.sectionId = section.id;

        section.subs.forEach(sub => {
            const subEl = document.createElement('div');
            subEl.className = 'nav-sub-item';
            subEl.dataset.id = sub.id;
            subEl.textContent = sub.label;
            subEl.addEventListener('click', () => navigateTo(sub.id));
            subsEl.appendChild(subEl);
        });

        sectionEl.appendChild(subsEl);
        container.appendChild(sectionEl);
    });
}

function toggleSection(sectionId) {
    document.querySelectorAll('.nav-section-subs').forEach(el => {
        const isTarget = el.dataset.sectionId === sectionId;
        el.classList.toggle('open', isTarget && !el.classList.contains('open'));
    });
    document.querySelectorAll('.nav-section-header').forEach(el => {
        const section = el.closest('.nav-section');
        el.classList.toggle('active', section && section.dataset.id === sectionId);
    });
    _activeSection = sectionId;
}

function setActiveNavItem(sceneId) {
    document.querySelectorAll('.nav-sub-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === sceneId);
    });
}

/* ------------------------------------------
   NAVIGATION
------------------------------------------ */
function navigateTo(sceneId) {
    if (sceneId === _activeScene) return;
    _activeScene = sceneId;
    setActiveNavItem(sceneId);
    SceneManager.mountWorking(sceneId);
}

/* ------------------------------------------
   HEADER BADGES
------------------------------------------ */
async function refreshBadges() {
    try {
        const [menuRes, staffRes] = await Promise.all([
            fetch('/api/v1/menu/items'),
            fetch('/api/v1/staff'),
        ]);
        if (menuRes.ok) {
            const menu = await menuRes.json();
            const el = document.getElementById('badge-menu-items');
            if (el) el.textContent = `Menu Items: ${menu.length ?? '--'}`;
        }
        if (staffRes.ok) {
            const staff = await staffRes.json();
            const el = document.getElementById('badge-employees');
            if (el) el.textContent = `Employees: ${staff.length ?? '--'}`;
        }
        const syncEl = document.getElementById('badge-sync');
        if (syncEl) syncEl.textContent = `Last Sync: ${new Date().toLocaleTimeString()}`;
    } catch (e) {
        console.warn('[Overseer] Badge refresh failed:', e);
    }
}

async function setVersionStamp() {
    try {
        const res = await fetch('/api/v1/system/version');
        if (res.ok) {
            const data = await res.json();
            const el = document.getElementById('version-stamp');
            if (el) el.textContent = `KINDpos Overseer // ${data.version ?? 'Vz?'}`;
        }
    } catch {
        const el = document.getElementById('version-stamp');
        if (el) el.textContent = 'KINDpos Overseer';
    }
}

/* ------------------------------------------
   LEGACY REGISTRATION ADAPTER

   Sections use the old sm.register(name, config) format
   with { onEnter, onExit } callbacks.
   SceneManager v3 expects register({ name, mount, unmount }).
   This adapter bridges the two without modifying section files.
------------------------------------------ */
function createLegacyAdapter(nameOverrides) {
    return {
        register(name, config) {
            const resolvedName = (nameOverrides && nameOverrides[name]) || name;
            let activeContainer = null;
            SceneManager.register({
                name: resolvedName,
                mount(container, params) {
                    activeContainer = container;
                    if (config.onEnter) config.onEnter(container, params);
                },
                unmount() {
                    if (config.onExit && activeContainer) config.onExit(activeContainer);
                    activeContainer = null;
                },
            });
        }
    };
}

/* ------------------------------------------
   SECTION REGISTRATION
------------------------------------------ */
function registerAllSections() {
    const adapter = createLegacyAdapter();

    // Register-pattern sections (use adapter to bridge old format)
    registerSalesReports(adapter);
    registerMenuImport(adapter);
    registerEmployeeSections(adapter);
    registerSystemTesting(adapter);
    registerMenuCategories(adapter);
    registerMenuAvailability(adapter);
    registerConfigureModifiers(adapter);
    registerPricingSpecials(adapter);
    registerDisplayOrder(adapter);
    registerPrinterConfig(adapter);

    // printer-setup.js registers as 'printer-config' in source — remap to
    // 'printer-setup' so it doesn't overwrite the real printer-config scene
    registerPrinterSetup(createLegacyAdapter({ 'printer-config': 'printer-setup' }));

    // Build-pattern sections (already use correct format)
    SceneManager.register({
        name: 'payroll-tips',
        mount: (container) => buildPayrollTipsScene(container),
        unmount: () => cleanupPayrollTips(),
    });
    SceneManager.register({
        name: 'time-attendance',
        mount: (container) => buildTimeAttendanceScene(container),
        unmount: () => cleanupTimeAttendance(),
    });
    SceneManager.register({
        name: 'shift-config',
        mount: (container) => buildShiftConfigScene(container),
        unmount: () => cleanupShiftConfig(),
    });
    SceneManager.register({
        name: 'store-info',
        mount: (container) => buildStoreInfoScene(container),
        unmount: (container) => cleanupStoreInfo(container),
    });
    SceneManager.register({
        name: 'order-settings',
        mount: (container) => buildOrderSettingsScene(container),
        unmount: (container) => cleanupOrderSettings(container),
    });
    SceneManager.register({
        name: 'card-readers',
        mount: (container) => buildCardReadersScene(container),
        unmount: (container) => cleanupCardReaders(container),
    });
    SceneManager.register({
        name: 'receipt-settings',
        mount: (container) => buildReceiptSettingsScene(container),
        unmount: (container) => cleanupReceiptSettings(container),
    });
    SceneManager.register({
        name: 'terminal-settings',
        mount: (container) => buildTerminalSettingsScene(container),
        unmount: (container) => cleanupTerminalSettings(container),
    });
    SceneManager.register({
        name: 'labor-reports',
        mount: (container) => buildLaborReportsScene(container),
        unmount: (container) => cleanupLaborReports(container),
    });
    SceneManager.register({
        name: 'menu-performance',
        mount: (container) => buildMenuPerformanceScene(container),
        unmount: (container) => cleanupMenuPerformance(container),
    });
    SceneManager.register({
        name: 'floor-plan',
        mount: (container) => buildFloorPlanScene(container),
        unmount: (container) => cleanupFloorPlan(container),
    });

    registerSystemAppearance();
}

/* ------------------------------------------
   SYSTEM APPEARANCE (theme picker scene)
------------------------------------------ */
function registerSystemAppearance() {
    SceneManager.register({
        name: 'system-appearance',
        mount(container) { mountThemePicker(container); },
        unmount() {},
    });
}

/* ------------------------------------------
   THEME PICKER SCENE
------------------------------------------ */
function mountThemePicker(container) {
    const themes = getThemeCatalog();
    const activeId = getCurrentThemeId();

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width:900px;margin:0 auto;padding:30px 24px;';

    wrapper.innerHTML = `
        <div style="font-family:var(--font-heading);font-size:44px;color:var(--color-gold);margin-bottom:4px;">
            Appearance
        </div>
        <div style="font-size:20px;color:rgba(var(--color-mint-rgb),0.4);margin-bottom:24px;">
            Select a theme — applies instantly across the Overseer.
        </div>
        <div id="theme-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;"></div>
    `;
    container.appendChild(wrapper);

    const grid = wrapper.querySelector('#theme-grid');

    themes.forEach(entry => {
        const isActive = entry.id === activeId;
        const card = document.createElement('button');
        card.dataset.themeId = entry.id;
        card.style.cssText = `
            display:flex;flex-direction:column;align-items:center;gap:8px;
            padding:16px;background:${isActive ? 'rgba(var(--color-mint-rgb),0.12)' : 'rgba(var(--color-mint-rgb),0.04)'};
            border:2px solid ${isActive ? 'var(--color-mint)' : 'rgba(var(--color-mint-rgb),0.1)'};
            border-radius:6px;cursor:pointer;transition:all 0.2s ease;
            font-family:var(--font-body);color:var(--color-mint);font-size:20px;
        `;
        card.innerHTML = `
            <span style="font-size:24px;font-family:var(--font-heading);color:${isActive ? 'var(--color-gold)' : 'var(--color-mint)'};">
                ${entry.label}
            </span>
            <span style="font-size:14px;color:rgba(var(--color-mint-rgb),0.35);text-transform:uppercase;letter-spacing:1px;">
                ${isActive ? 'Active' : 'Click to apply'}
            </span>
        `;
        card.addEventListener('mouseenter', () => {
            if (entry.id !== getCurrentThemeId()) {
                card.style.background = 'rgba(var(--color-mint-rgb),0.1)';
                card.style.borderColor = 'rgba(var(--color-mint-rgb),0.3)';
            }
        });
        card.addEventListener('mouseleave', () => {
            if (entry.id !== getCurrentThemeId()) {
                card.style.background = 'rgba(var(--color-mint-rgb),0.04)';
                card.style.borderColor = 'rgba(var(--color-mint-rgb),0.1)';
            }
        });
        card.addEventListener('click', async () => {
            await applyTheme(entry.id);
            // Re-render to update active state
            container.innerHTML = '';
            mountThemePicker(container);
        });
        grid.appendChild(card);
    });
}

/* ------------------------------------------
   BOOT
------------------------------------------ */
async function boot() {
    console.log('[Overseer] Booting...');

    SceneManager.init({
        layers: {
            working:       document.getElementById('working-layer'),
            transactional: document.getElementById('transactional-layer'),
            interrupt:     document.getElementById('interrupt-layer'),
            gate:          document.getElementById('gate-layer'),
        }
    });
    await initThemeBridge();
    await loadEmployeeData();
    await Promise.all([loadReportData(), loadTimeData(), loadPayrollData(), loadShiftData()]);
    buildNav();
    registerAllSections();

    await refreshBadges();
    await setVersionStamp();

    const first = NAV[0];
    if (first && first.subs.length) {
        toggleSection(first.id);
        navigateTo(first.subs[0].id);
    }

    setInterval(refreshBadges, 60_000);
    console.log('[Overseer] Boot complete.');
}

window._overseerNav = navigateTo;
document.addEventListener('DOMContentLoaded', boot);