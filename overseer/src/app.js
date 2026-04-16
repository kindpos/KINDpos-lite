/* ============================================
   KINDpos Overseer — Boot Sequence
   Nice. Dependable. Yours.
   ============================================ */

import { SceneManager }              from './components/scene-manager.js';
import { T }                          from './components/tokens.js';

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
            { id: 'configure-modifiers', label: 'Modifiers'         },
            { id: 'menu-availability',   label: 'Availability'      },
            { id: 'pricing-specials',    label: 'Pricing & Specials' },
            { id: 'display-order',       label: 'Display Order'     },
            { id: 'menu-import',         label: 'Import Menu'       },
        ]
    },
    {
        id: 'employees',
        label: 'EMPLOYEES',
        subs: [
            { id: 'employee-list',    label: 'Staff List'        },
            { id: 'time-attendance',  label: 'Time & Attendance' },
            { id: 'payroll-tips',     label: 'Payroll & Tips'    },
            { id: 'shift-config',     label: 'Shift Config'      },
        ]
    },
    {
        id: 'hardware',
        label: 'HARDWARE',
        subs: [
            { id: 'printer-setup',  label: 'Printer Setup'  },
            { id: 'printer-config', label: 'Printer Config' },
        ]
    },
    {
        id: 'system',
        label: 'SYSTEM',
        subs: [
            { id: 'system-testing', label: 'System Testing' },
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
   SECTION REGISTRATION
------------------------------------------ */
function registerAllSections() {
    // Register-pattern sections (pass SceneManager directly)
    registerSalesReports(SceneManager);
    registerMenuImport(SceneManager);
    registerEmployeeSections(SceneManager);
    registerSystemTesting(SceneManager);
    registerMenuCategories(SceneManager);
    registerMenuAvailability(SceneManager);
    registerConfigureModifiers(SceneManager);
    registerPricingSpecials(SceneManager);
    registerDisplayOrder(SceneManager);
    registerPrinterConfig(SceneManager);
    registerPrinterSetup(SceneManager);

    // Build-pattern sections (wrap manually)
    SceneManager.register({
        name: 'payroll-tips',
        mount: (container) => buildPayrollTipsScene(container),
        unmount: (container) => cleanupPayrollTips(container),
    });
    SceneManager.register({
        name: 'time-attendance',
        mount: (container) => buildTimeAttendanceScene(container),
        unmount: (container) => cleanupTimeAttendance(container),
    });
    SceneManager.register({
        name: 'shift-config',
        mount: (container) => buildShiftConfigScene(container),
        unmount: (container) => cleanupShiftConfig(container),
    });
}

/* ------------------------------------------
   BOOT
------------------------------------------ */
async function boot() {
    console.log('[Overseer] Booting...');

    SceneManager.init();
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