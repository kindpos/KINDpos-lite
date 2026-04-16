/* ============================================
   KINDpos Overseer — Payroll & Tips

   View Stack:
     payroll-summary → tip-pool-config

   Features:
     - Pay period selector
     - Labor summary dashboard with cost %
     - Employee breakdown table (sortable)
     - One-click export (ADP/Gusto/Paychex/QB/CSV)
     - Tip pooling configuration
     - Labor cost % benchmarks

   "Nice. Dependable. Yours."
   ============================================ */

import {
    PAY_PERIODS, PAY_SCHEDULE, PAYROLL_SUMMARY,
    TIP_POOL_CONFIG, EXPORT_FORMATS, LABOR_BENCHMARKS,
} from '../data/sample-payroll.js';
import { getRoleLabel } from '../data/sample-employees.js';

/* ------------------------------------------
   COLOR PALETTE
------------------------------------------ */
const C = {
    mint:       '#C6FFBB',
    mintFaded:  'rgba(198, 255, 187, 0.4)',
    mintGhost:  'rgba(198, 255, 187, 0.15)',
    mintBorder: 'rgba(198, 255, 187, 0.25)',
    mintHover:  'rgba(198, 255, 187, 0.12)',
    yellow:     '#FBDE42',
    red:        '#FF3333',
    redFaded:   'rgba(255, 51, 51, 0.3)',
    dark:       '#333333',
    white:      '#FFFFFF',
    green:      '#00FF00',
    orange:     '#FFA500',
    grey:       '#888888',
    backdrop:   'rgba(0, 0, 0, 0.75)',
};

/* ------------------------------------------
   MODULE STATE
------------------------------------------ */
let viewHistory = [];
let currentContainer = null;
let tipPoolConfig = null; // mutable working copy
let sortField = 'totalComp';
let sortDir = 'desc';

const VIEW_REGISTRY = {
    'payroll-summary': buildPayrollSummary,
    'tip-pool-config': buildTipPoolConfig,
};

/* ------------------------------------------
   VIEW STACK
------------------------------------------ */
function pushView(viewName, data) {
    if (!currentContainer) return;
    const wrapper = currentContainer.querySelector('#pt-view-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const builder = VIEW_REGISTRY[viewName];
    if (builder) {
        builder(wrapper, data);
        viewHistory.push({ name: viewName, data });
    }
}

function popView() {
    if (viewHistory.length <= 1) return;
    viewHistory.pop();
    const prev = viewHistory[viewHistory.length - 1];
    viewHistory.pop();
    pushView(prev.name, prev.data);
}

/* ------------------------------------------
   BACK BUTTON
------------------------------------------ */
function buildBackButton(wrapper, label) {
    const btn = document.createElement('button');
    btn.textContent = `← Back to ${label}`;
    btn.style.cssText = `
        background: transparent; border: 1px solid ${C.mintBorder};
        color: ${C.mint}; padding: 10px 20px; border-radius: 8px;
        font-size: 22px; cursor: pointer; margin-bottom: 20px;
        font-family: var(--font-body, 'Sevastopol Interface', Arial, sans-serif);
        transition: all 0.2s ease;
    `;
    btn.addEventListener('mouseenter', () => btn.style.background = C.mintHover);
    btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
    btn.addEventListener('click', popView);
    wrapper.appendChild(btn);
}

/* ------------------------------------------
   TOAST
------------------------------------------ */
function showToast(message, type = 'success') {
    if (!currentContainer) return;
    const old = currentContainer.querySelector('.pt-toast');
    if (old) old.remove();

    const colors = {
        success: { bg: 'rgba(0, 255, 0, 0.15)', border: C.green, text: C.green },
        error:   { bg: 'rgba(255, 51, 51, 0.15)', border: C.red, text: C.red },
        info:    { bg: 'rgba(198, 255, 187, 0.15)', border: C.mint, text: C.mint },
    };
    const tc = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.className = 'pt-toast';
    toast.style.cssText = `
        position: fixed; top: 24px; right: 24px; z-index: 10000;
        background: ${tc.bg}; border: 1px solid ${tc.border};
        color: ${tc.text}; padding: 14px 24px; border-radius: 8px;
        font-family: var(--font-body, 'Sevastopol Interface', Arial, sans-serif);
        font-size: 25px; backdrop-filter: blur(8px);
        animation: toastSlideIn 0.3s ease-out; max-width: 450px;
    `;
    toast.textContent = message;
    currentContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ------------------------------------------
   EVENT SIMULATION
------------------------------------------ */
function emitEvent(eventType, payload) {
    const event = {
        event_type: eventType,
        event_id: `evt_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        terminal_id: 'overseer_001',
        manager_id: 'mgr_tyler',
        payload,
    };
    console.log(`[KINDpos Event] ${eventType}`, event);
    return event;
}

/* ------------------------------------------
   FORMAT HELPERS
------------------------------------------ */
function fmt$(val) { return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtHrs(val) { return val.toFixed(2) + 'h'; }
function fmtPct(val) { return val.toFixed(1) + '%'; }

function fmtDateRange(start, end) {
    const s = new Date(start + 'T12:00:00');
    const e = new Date(end + 'T12:00:00');
    const opts = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}, ${e.getFullYear()}`;
}

function laborCostColor(pct) {
    if (pct <= LABOR_BENCHMARKS.excellent) return C.green;
    if (pct <= LABOR_BENCHMARKS.good) return C.mint;
    if (pct <= LABOR_BENCHMARKS.warning) return C.yellow;
    if (pct <= LABOR_BENCHMARKS.danger) return C.orange;
    return C.red;
}

function laborCostLabel(pct) {
    if (pct <= LABOR_BENCHMARKS.excellent) return 'Excellent';
    if (pct <= LABOR_BENCHMARKS.good) return 'Good';
    if (pct <= LABOR_BENCHMARKS.warning) return 'Watch';
    if (pct <= LABOR_BENCHMARKS.danger) return 'High';
    return 'Critical';
}

/* ------------------------------------------
   SORT HELPERS
------------------------------------------ */
function toggleSort(field) {
    if (sortField === field) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortDir = 'desc';
    }
    refreshEmployeeTable();
}

function sortArrow(field) {
    if (sortField !== field) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
}

function getSortedEmployees() {
    return [...PAYROLL_SUMMARY.employees].sort((a, b) => {
        let av = a[sortField] ?? 0;
        let bv = b[sortField] ?? 0;
        if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

function refreshEmployeeTable() {
    if (!currentContainer) return;
    const tableWrap = currentContainer.querySelector('#pt-emp-table');
    if (tableWrap) {
        tableWrap.innerHTML = '';
        buildEmployeeTable(tableWrap);
    }
}

/* ==========================================
   VIEW 1: PAYROLL SUMMARY
   ========================================== */
function buildPayrollSummary(wrapper) {
    wrapper.style.cssText = 'padding: 0 8px; max-width: 1200px; margin: 0 auto;';

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex; justify-content: space-between; align-items: flex-start;
        margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
    `;
    header.innerHTML = `
        <div>
            <div style="font-family: var(--font-display, 'Alien Encounters', monospace);
                        font-size: 36px; color: ${C.yellow};">
                Payroll & Tips
            </div>
            <div style="font-size: 25px; color: rgba(198, 255, 187, 0.5); margin-top: 4px;">
                ${fmtDateRange(PAYROLL_SUMMARY.period.start, PAYROLL_SUMMARY.period.end)}
            </div>
        </div>
        <div style="font-size: 22px; color: rgba(198, 255, 187, 0.3);">
            ⚠ Sample Data
        </div>
    `;
    wrapper.appendChild(header);

    // ── Action Tabs ──
    const tabs = document.createElement('div');
    tabs.style.cssText = 'display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;';

    tabs.appendChild(buildTab('Payroll Summary', true));
    tabs.appendChild(buildTab('Tip Pool Config', false, () => pushView('tip-pool-config')));

    // Export button (special styling)
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '⬇ Export Payroll';
    exportBtn.style.cssText = `
        padding: 12px 24px; border-radius: 8px; font-size: 22px; cursor: pointer;
        font-family: var(--font-body, 'Sevastopol Interface', Arial, sans-serif);
        background: ${C.yellow}; color: ${C.dark}; border: none;
        font-weight: bold; transition: all 0.2s ease; margin-left: auto;
    `;
    exportBtn.addEventListener('mouseenter', () => exportBtn.style.background = '#fce566');
    exportBtn.addEventListener('mouseleave', () => exportBtn.style.background = C.yellow);
    exportBtn.addEventListener('click', () => showExportModal());
    tabs.appendChild(exportBtn);

    wrapper.appendChild(tabs);

    // ── Labor Cost % Dashboard ──
    const laborSection = document.createElement('div');
    laborSection.style.cssText = `
        background: rgba(198, 255, 187, 0.04); border: 1px solid ${C.mintBorder};
        border-radius: 10px; padding: 24px; margin-bottom: 20px;
    `;

    const lab = PAYROLL_SUMMARY.laborSummary;
    const costColor = laborCostColor(lab.laborCostPct);
    const costLabel = laborCostLabel(lab.laborCostPct);

    laborSection.innerHTML = `
        <div style="font-family: var(--font-display, 'Alien Encounters', monospace);
                    font-size: 26px; color: ${C.mint}; letter-spacing: 1px; margin-bottom: 20px;">
            LABOR COST DASHBOARD
        </div>

        <div style="display: flex; align-items: center; gap: 32px; margin-bottom: 24px; flex-wrap: wrap;">
            <div style="text-align: center;">
                <div style="font-size: 20px; color: ${C.mintFaded}; text-transform: uppercase; margin-bottom: 8px;">Labor Cost %</div>
                <div style="font-size: 56px; color: ${costColor}; font-family: var(--font-display, monospace);">
                    ${fmtPct(lab.laborCostPct)}
                </div>
                <div style="font-size: 22px; color: ${costColor}; margin-top: 4px;">${costLabel}</div>
            </div>

            <div style="flex: 1; min-width: 300px;">
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 20px; color: ${C.mint};">Labor: ${fmt$(lab.totalLabor)}</span>
                        <span style="font-size: 20px; color: ${C.mint};">Sales: ${fmt$(PAYROLL_SUMMARY.totalSales)}</span>
                    </div>
                    <div style="background: rgba(198, 255, 187, 0.1); border-radius: 8px; height: 28px; overflow: hidden; position: relative;">
                        <div style="background: ${costColor}; height: 100%; width: ${Math.min(lab.laborCostPct, 100)}%;
                                    border-radius: 8px; transition: width 0.5s ease;"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 20px; font-size: 18px; color: ${C.grey}; flex-wrap: wrap;">
                    <span>■ <span style="color: ${C.green};">≤30%</span> Excellent</span>
                    <span>■ <span style="color: ${C.mint};">≤35%</span> Good</span>
                    <span>■ <span style="color: ${C.yellow};">≤40%</span> Watch</span>
                    <span>■ <span style="color: ${C.orange};">≤45%</span> High</span>
                    <span>■ <span style="color: ${C.red};">>45%</span> Critical</span>
                </div>
            </div>
        </div>
    `;
    wrapper.appendChild(laborSection);

    // ── Summary Cards ──
    const cards = document.createElement('div');
    cards.style.cssText = `
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 12px; margin-bottom: 20px;
    `;
    cards.appendChild(buildSummaryCard('Total Hours', fmtHrs(lab.totalHours), C.mint));
    cards.appendChild(buildSummaryCard('Total Wages', fmt$(lab.totalWages), C.mint));
    cards.appendChild(buildSummaryCard('Total Tips', fmt$(lab.totalTips), C.yellow));
    cards.appendChild(buildSummaryCard('Overtime', fmtHrs(lab.overtimeHours), lab.overtimeHours > 0 ? C.orange : C.green));
    wrapper.appendChild(cards);

    // ── Tip Pool Status Card ──
    if (tipPoolConfig.enabled) {
        const poolCard = document.createElement('div');
        poolCard.style.cssText = `
            background: rgba(198, 255, 187, 0.04); border: 1px solid ${C.mintBorder};
            border-radius: 10px; padding: 20px; margin-bottom: 20px;
            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
        `;

        const poolRulesHTML = tipPoolConfig.rules
            .filter(r => r.poolPct > 0)
            .map(r => `<span style="color: ${C.mint};">${getRoleLabel(r.role)}: ${r.poolPct}% to pool</span>`)
            .join(' · ');

        poolCard.innerHTML = `
            <div>
                <div style="font-size: 22px; color: ${C.green}; margin-bottom: 6px;">
                    ✓ Tip Pooling Active
                </div>
                <div style="font-size: 20px; color: ${C.grey};">
                    ${poolRulesHTML}
                </div>
                <div style="font-size: 18px; color: rgba(198, 255, 187, 0.4); margin-top: 4px;">
                    Enforcement: ${tipPoolConfig.enforcementMode === 'required' ? 'Required at checkout' : 'Suggested'}
                    · Method: ${tipPoolConfig.calculationMethod}
                </div>
            </div>
        `;

        const configBtn = document.createElement('button');
        configBtn.textContent = 'Configure →';
        configBtn.style.cssText = `
            background: transparent; color: ${C.mint}; border: 1px solid ${C.mintBorder};
            padding: 10px 20px; border-radius: 8px; font-size: 22px; cursor: pointer;
            font-family: var(--font-body, 'Sevastopol Interface', Arial, sans-serif);
            transition: all 0.2s ease;
        `;
        configBtn.addEventListener('mouseenter', () => { configBtn.style.background = C.mint; configBtn.style.color = C.dark; });
        configBtn.addEventListener('mouseleave', () => { configBtn.style.background = 'transparent'; configBtn.style.color = C.mint; });
        configBtn.addEventListener('click', () => pushView('tip-pool-config'));
        poolCard.appendChild(configBtn);

        wrapper.appendChild(poolCard);
    }

    // ── Employee Breakdown Table ──
    const tableSection = document.createElement('div');
    tableSection.style.cssText = `
        background: rgba(198, 255, 187, 0.04); border: 1px solid ${C.mintBorder};
        border-radius: 10px; overflow: hidden;
    `;

    const tableHeader = document.createElement('div');
    tableHeader.style.cssText = `
        padding: 16px 20px; border-bottom: 1px solid ${C.mintBorder};
        font-family: var(--font-display, 'Alien Encounters', monospace);
        font-size: 26px; color: ${C.mint}; letter-spacing: 1px;
    `;
    tableHeader.textContent = `EMPLOYEE BREAKDOWN [${PAYROLL_SUMMARY.employees.length}]`;
    tableSection.appendChild(tableHeader);

    const tableWrap = document.createElement('div');
    tableWrap.id = 'pt-emp-table';
    tableSection.appendChild(tableWrap);
    buildEmployeeTable(tableWrap);

    wrapper.appendChild(tableSection);
}

/* ------------------------------------------
   EMPLOYEE BREAKDOWN TABLE
------------------------------------------ */
function buildEmployeeTable(wrapper) {
    const table = document.createElement('div');
    table.style.cssText = 'overflow-x: auto;';

    // Header
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
        display: grid;
        grid-template-columns: 2fr 1fr 0.9fr 0.9fr 1fr 1fr 1fr 1.1fr;
        padding: 14px 20px; gap: 6px;
        background: rgba(198, 255, 187, 0.08);
        border-bottom: 1px solid ${C.mintBorder};
        font-size: 20px; color: ${C.mintFaded};
        text-transform: uppercase; letter-spacing: 1px;
        min-width: 950px;
    `;

    const columns = [
        { field: 'lastName',      label: 'Employee' },
        { field: 'role',          label: 'Role' },
        { field: 'totalHours',    label: 'Hours' },
        { field: 'overtimeHours', label: 'OT Hrs' },
        { field: 'grossPay',     label: 'Wages' },
        { field: 'tips',          label: 'Tips' },
        { field: 'totalComp',     label: 'Total' },
        { field: 'shiftsWorked',  label: 'Shifts' },
    ];

    columns.forEach(col => {
        const cell = document.createElement('div');
        cell.style.cssText = 'cursor: pointer; user-select: none; transition: color 0.2s;';
        cell.textContent = col.label + sortArrow(col.field);
        cell.addEventListener('click', () => toggleSort(col.field));
        cell.addEventListener('mouseenter', () => cell.style.color = C.mint);
        cell.addEventListener('mouseleave', () => cell.style.color = C.mintFaded);
        headerRow.appendChild(cell);
    });
    table.appendChild(headerRow);

    // Data rows
    const sorted = getSortedEmployees();
    sorted.forEach((emp, i) => {
        const stripeBg = i % 2 === 0 ? 'transparent' : 'rgba(198, 255, 187, 0.03)';
        const row = document.createElement('div');
        row.style.cssText = `
            display: grid;
            grid-template-columns: 2fr 1fr 0.9fr 0.9fr 1fr 1fr 1fr 1.1fr;
            padding: 16px 20px; gap: 6px; align-items: center;
            border-bottom: 1px solid rgba(198, 255, 187, 0.08);
            background: ${stripeBg}; transition: background 0.15s ease;
            min-width: 950px;
        `;
        row.addEventListener('mouseenter', () => row.style.background = C.mintHover);
        row.addEventListener('mouseleave', () => row.style.background = stripeBg);

        const otBadge = emp.overtimeHours > 0
            ? ` <span style="font-size: 15px; color: ${C.red}; background: ${C.redFaded};
                 padding: 2px 6px; border-radius: 4px; vertical-align: middle;">OT</span>`
            : '';

        row.innerHTML = `
            <div style="color: ${C.white}; font-size: 25px;">
                ${emp.firstName} ${emp.lastName}${otBadge}
            </div>
            <div style="color: ${C.mint}; font-size: 22px;">${getRoleLabel(emp.role)}</div>
            <div style="color: rgba(198, 255, 187, 0.6); font-size: 22px;">${fmtHrs(emp.totalHours)}</div>
            <div style="color: ${emp.overtimeHours > 0 ? C.orange : C.grey}; font-size: 22px;">
                ${emp.overtimeHours > 0 ? fmtHrs(emp.overtimeHours) : '—'}
            </div>
            <div style="color: rgba(198, 255, 187, 0.6); font-size: 22px;">${fmt$(emp.grossPay)}</div>
            <div style="color: ${C.yellow}; font-size: 22px;">${emp.tips > 0 ? fmt$(emp.tips) : '—'}</div>
            <div style="color: ${C.white}; font-size: 25px; font-weight: bold;">${fmt$(emp.totalComp)}</div>
            <div style="color: rgba(198, 255, 187, 0.6); font-size: 22px; text-align: center;">${emp.shiftsWorked}</div>
        `;
        table.appendChild(row);
    });

    // Totals row
    const totals = PAYROLL_SUMMARY.laborSummary;
    const totalRow = document.createElement('div');
    totalRow.style.cssText = `
        display: grid;
        grid-template-columns: 2fr 1fr 0.9fr 0.9fr 1fr 1fr 1fr 1.1fr;
        padding: 16px 20px; gap: 6px; align-items: center;
        background: rgba(198, 255, 187, 0.08); border-top: 2px solid ${C.mintBorder};
        min-width: 950px;
    `;
    const totalShifts = PAYROLL_SUMMARY.employees.reduce((s, e) => s + e.shiftsWorked, 0);

    totalRow.innerHTML = `
        <div style="color: ${C.yellow}; font-size: 25px; font-family: var(--font-display, monospace);">TOTALS</div>
        <div></div>
        <div style="color: ${C.mint}; font-size: 22px; font-weight: bold;">${fmtHrs(totals.totalHours)}</div>
        <div style="color: ${C.orange}; font-size: 22px; font-weight: bold;">${fmtHrs(totals.overtimeHours)}</div>
        <div style="color: ${C.mint}; font-size: 22px; font-weight: bold;">${fmt$(totals.totalWages)}</div>
        <div style="color: ${C.yellow}; font-size: 22px; font-weight: bold;">${fmt$(totals.totalTips)}</div>
        <div style="color: ${C.white}; font-size: 25px; font-weight: bold;">${fmt$(totals.totalLabor)}</div>
        <div style="color: rgba(198, 255, 187, 0.6); font-size: 22px; text-align: center;">${totalShifts}</div>
    `;
    table.appendChild(totalRow);

    wrapper.appendChild(table);
}

/* ==========================================
   VIEW 2: TIP POOL CONFIGURATION
   ========================================== */
function buildTipPoolConfig(wrapper) {
    wrapper.style.cssText = 'padding: 0 8px; max-width: 900px; margin: 0 auto;';

    buildBackButton(wrapper, 'Payroll Summary');

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 24px;';
    header.innerHTML = `
        <div style="font-family: var(--font-display, 'Alien Encounters', monospace);
                    font-size: 36px; color: ${C.yellow}; margin-bottom: 4px;">
            Tip Pool Configuration
        </div>
        <div style="font-size: 25px; color: rgba(198, 255, 187, 0.5);">
            Set how tips are distributed among your team
        </div>
    `;
    wrapper.appendChild(header);

    // ── Enable/Disable Toggle ──
    const toggleSection = document.createElement('div');
    toggleSection.style.cssText = `
        background: rgba(198, 255, 187, 0.04); border: 1px solid ${C.mintBorder};
        border-radius: 10px; padding: 24px; margin-bottom: 20px;
        display: flex; justify-content: space-between; align-items: center;
    `;
    toggleSection.innerHTML = `
        <div>
            <div style="font-size: 25px; color: ${C.white}; margin-bottom: 4px;">Tip Pooling</div>
            <div style="font-size: 20px; color: ${C.grey};">
                Automatically calculate and enforce tip distribution at checkout
            </div>
        </div>
    `;

    const toggle = document.createElement('button');
    toggle.id = 'tp-toggle';
    toggle.style.cssText = `
        width: 80px; height: 40px; border-radius: 20px; border: none; cursor: pointer;
        background: ${tipPoolConfig.enabled ? C.green : C.grey};
        position: relative; transition: background 0.3s ease;
    `;
    toggle.innerHTML = `
        <span style="width: 32px; height: 32px; background: white; border-radius: 50%;
                     position: absolute; top: 4px;
                     ${tipPoolConfig.enabled ? 'right: 4px;' : 'left: 4px;'}
                     transition: all 0.3s ease;"></span>
    `;
    toggle.addEventListener('click', () => {
        tipPoolConfig.enabled = !tipPoolConfig.enabled;
        emitEvent('TIP_POOL_CONFIG_UPDATED', { enabled: tipPoolConfig.enabled });
        showToast(tipPoolConfig.enabled ? 'Tip pooling enabled' : 'Tip pooling disabled', 'info');
        // Re-render
        const ptWrapper = currentContainer.querySelector('#pt-view-wrapper');
        if (ptWrapper) { ptWrapper.innerHTML = ''; buildTipPoolConfig(ptWrapper); viewHistory.push({ name: 'tip-pool-config' }); }
    });
    toggleSection.appendChild(toggle);
    wrapper.appendChild(toggleSection);

    if (!tipPoolConfig.enabled) {
        const disabled = document.createElement('div');
        disabled.style.cssText = `
            text-align: center; padding: 60px 20px; color: ${C.grey}; font-size: 25px;
        `;
        disabled.textContent = 'Tip pooling is disabled. Enable it above to configure distribution rules.';
        wrapper.appendChild(disabled);
        return;
    }

    // ── Calculation Method ──
    const methodSection = document.createElement('div');
    methodSection.style.cssText = `
        background: rgba(198, 255, 187, 0.04); border: 1px solid ${C.mintBorder};
        border-radius: 10px; padding: 24px; margin-bottom: 20px;
    `;
    methodSection.innerHTML = `
        <div style="font-family: var(--font-display, 'Alien Encounters', monospace);
                    font-size: 26px; color: ${C.mint}; letter-spacing: 1px; margin-bottom: 16px;">
            CALCULATION METHOD
        </div>
    `;

    const methods = [
        { id: 'percentage', label: 'Percentage', desc: 'Each role contributes/receives a % of tips' },
        { id: 'points',     label: 'Point System', desc: 'Roles assigned point values, tips split by points' },
        { id: 'hours',      label: 'Hours Worked', desc: 'Pool distributed proportional to hours worked' },
    ];

    const methodGrid = document.createElement('div');
    methodGrid.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

    methods.forEach(m => {
        const card = document.createElement('button');
        const isActive = tipPoolConfig.calculationMethod === m.id;
        card.style.cssText = `
            flex: 1; min-width: 200px; padding: 16px 20px; border-radius: 10px; cursor: pointer;
            text-align: left; transition: all 0.2s ease;
            background: ${isActive ? 'rgba(198, 255, 187, 0.12)' : 'transparent'};
            border: 2px solid ${isActive ? C.mint : C.mintBorder};
            color: ${C.mint};
        `;
        card.innerHTML = `
            <div style="font-size: 22px; color: ${isActive ? C.mint : C.white}; margin-bottom: 6px;
                        font-weight: ${isActive ? 'bold' : 'normal'};">${m.label}</div>
            <div style="font-size: 18px; color: ${C.grey};">${m.desc}</div>
        `;
        card.addEventListener('click', () => {
            tipPoolConfig.calculationMethod = m.id;
            emitEvent('TIP_POOL_CONFIG_UPDATED', { calculationMethod: m.id });
            const ptWrapper = currentContainer.querySelector('#pt-view-wrapper');
            if (ptWrapper) { ptWrapper.innerHTML = ''; buildTipPoolConfig(ptWrapper); viewHistory.push({ name: 'tip-pool-config' }); }
        });
        methodGrid.appendChild(card);
    });
    methodSection.appendChild(methodGrid);
    wrapper.appendChild(methodSection);

    // ── Role Distribution Rules ──
    const rulesSection = document.createElement('div');
    rulesSection.style.cssText = `
        background: rgba(198, 255, 187, 0.04); border: 1px solid ${C.mintBorder};
        border-radius: 10px; overflow: hidden; margin-bottom: 20px;
    `;

    const rulesHeader = document.createElement('div');
    rulesHeader.style.cssText = `
        padding: 16px 20px; border-bottom: 1px solid ${C.mintBorder};
        font-family: var(--font-display, 'Alien Encounters', monospace);
        font-size: 26px; color: ${C.mint}; letter-spacing: 1px;
    `;
    rulesHeader.textContent = 'ROLE DISTRIBUTION RULES';
    rulesSection.appendChild(rulesHeader);

    // Table header
    const ruleColHeader = document.createElement('div');
    ruleColHeader.style.cssText = `
        display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.5fr;
        padding: 14px 20px; gap: 8px;
        background: rgba(198, 255, 187, 0.08);
        border-bottom: 1px solid ${C.mintBorder};
        font-size: 20px; color: ${C.mintFaded};
        text-transform: uppercase; letter-spacing: 1px;
    `;
    ['Role', 'Keeps', 'Contributes', 'From Pool'].forEach(label => {
        const cell = document.createElement('div');
        cell.textContent = label;
        ruleColHeader.appendChild(cell);
    });
    rulesSection.appendChild(ruleColHeader);

    // Rule rows
    tipPoolConfig.rules.forEach((rule, i) => {
        const stripeBg = i % 2 === 0 ? 'transparent' : 'rgba(198, 255, 187, 0.03)';
        const ruleRow = document.createElement('div');
        ruleRow.style.cssText = `
            display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.5fr;
            padding: 16px 20px; gap: 8px; align-items: center;
            border-bottom: 1px solid rgba(198, 255, 187, 0.08);
            background: ${stripeBg};
        `;

        const receivesText = rule.receivesFromPool
            ? `<span style="color: ${C.green};">✓ Receives ${rule.poolSharePct}%</span>`
            : `<span style="color: ${C.grey};">—</span>`;

        ruleRow.innerHTML = `
            <div style="color: ${C.white}; font-size: 25px;">${getRoleLabel(rule.role)}</div>
            <div style="color: ${C.mint}; font-size: 25px;">${rule.keepPct}%</div>
            <div style="color: ${rule.poolPct > 0 ? C.yellow : C.grey}; font-size: 25px;">
                ${rule.poolPct > 0 ? rule.poolPct + '%' : '—'}
            </div>
            <div style="font-size: 22px;">${receivesText}</div>
        `;
        rulesSection.appendChild(ruleRow);
    });
    wrapper.appendChild(rulesSection);

    // ── Enforcement Mode ──
    const enforceSection = document.createElement('div');
    enforceSection.style.cssText = `
        background: rgba(198, 255, 187, 0.04); border: 1px solid ${C.mintBorder};
        border-radius: 10px; padding: 24px; margin-bottom: 20px;
    `;
    enforceSection.innerHTML = `
        <div style="font-family: var(--font-display, 'Alien Encounters', monospace);
                    font-size: 26px; color: ${C.mint}; letter-spacing: 1px; margin-bottom: 16px;">
            ENFORCEMENT
        </div>
    `;

    const enforceGrid = document.createElement('div');
    enforceGrid.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

    const enforceModes = [
        { id: 'required',  label: 'Required',  desc: 'Cannot close shift without completing tip-out' },
        { id: 'suggested', label: 'Suggested',  desc: 'Shows tip-out at checkout but can be skipped' },
        { id: 'off',       label: 'Manual',     desc: 'No automatic tip-out — manager handles manually' },
    ];

    enforceModes.forEach(m => {
        const card = document.createElement('button');
        const isActive = tipPoolConfig.enforcementMode === m.id;
        card.style.cssText = `
            flex: 1; min-width: 200px; padding: 16px 20px; border-radius: 10px; cursor: pointer;
            text-align: left; transition: all 0.2s ease;
            background: ${isActive ? 'rgba(198, 255, 187, 0.12)' : 'transparent'};
            border: 2px solid ${isActive ? C.mint : C.mintBorder};
        `;
        card.innerHTML = `
            <div style="font-size: 22px; color: ${isActive ? C.mint : C.white}; margin-bottom: 6px;
                        font-weight: ${isActive ? 'bold' : 'normal'};">${m.label}</div>
            <div style="font-size: 18px; color: ${C.grey};">${m.desc}</div>
        `;
        card.addEventListener('click', () => {
            tipPoolConfig.enforcementMode = m.id;
            emitEvent('TIP_POOL_CONFIG_UPDATED', { enforcementMode: m.id });
            showToast(`Enforcement set to: ${m.label}`, 'success');
            const ptWrapper = currentContainer.querySelector('#pt-view-wrapper');
            if (ptWrapper) { ptWrapper.innerHTML = ''; buildTipPoolConfig(ptWrapper); viewHistory.push({ name: 'tip-pool-config' }); }
        });
        enforceGrid.appendChild(card);
    });
    enforceSection.appendChild(enforceGrid);
    wrapper.appendChild(enforceSection);

    // ── Audit Notice ──
    const notice = document.createElement('div');
    notice.style.cssText = `
        padding: 16px 20px; background: rgba(198, 255, 187, 0.06);
        border: 1px solid ${C.mintBorder}; border-radius: 10px;
        color: ${C.grey}; font-size: 20px; line-height: 1.5;
    `;
    notice.innerHTML = `🔒 Every tip pool configuration change creates a permanent <span style="color: ${C.mint};">TIP_POOL_CONFIG_UPDATED</span> event. All tip distributions are tracked via <span style="color: ${C.mint};">TIP_OUT_COMPLETED</span> events with full audit trail.`;
    wrapper.appendChild(notice);
}

/* ==========================================
   EXPORT MODAL
   One-click payroll export
   ========================================== */
function showExportModal() {
    if (!currentContainer) return;

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
        position: fixed; inset: 0; z-index: 5000;
        background: ${C.backdrop}; display: flex;
        align-items: center; justify-content: center;
        animation: modalFadeIn 0.25s ease-out;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: ${C.dark}; border: 1px solid ${C.mintBorder};
        border-radius: 12px; width: 520px; max-width: 95vw;
        animation: modalSlideIn 0.25s ease-out;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 20px 24px; border-bottom: 1px solid ${C.mintBorder};
        font-family: var(--font-display, 'Alien Encounters', monospace);
        font-size: 26px; color: ${C.yellow}; letter-spacing: 1px;
    `;
    header.textContent = 'EXPORT PAYROLL';
    modal.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.style.cssText = 'padding: 24px;';

    // Period info
    body.innerHTML = `
        <div style="font-size: 22px; color: ${C.mint}; margin-bottom: 6px;">
            ${fmtDateRange(PAYROLL_SUMMARY.period.start, PAYROLL_SUMMARY.period.end)}
        </div>
        <div style="font-size: 20px; color: ${C.grey}; margin-bottom: 24px;">
            ${PAYROLL_SUMMARY.employees.length} employees · ${fmtHrs(PAYROLL_SUMMARY.laborSummary.totalHours)} · ${fmt$(PAYROLL_SUMMARY.laborSummary.totalLabor)} total labor
        </div>
        <div style="font-size: 20px; color: ${C.mintFaded}; text-transform: uppercase; margin-bottom: 12px;">
            SELECT FORMAT
        </div>
    `;

    // Format options
    const formatGrid = document.createElement('div');
    formatGrid.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;';

    let selectedFormat = null;

    EXPORT_FORMATS.forEach(fmt => {
        const option = document.createElement('button');
        option.style.cssText = `
            display: flex; align-items: center; gap: 16px;
            width: 100%; padding: 16px 20px; border-radius: 10px;
            background: transparent; border: 2px solid ${C.mintBorder};
            color: ${C.mint}; cursor: pointer; text-align: left;
            font-family: var(--font-body, 'Sevastopol Interface', Arial, sans-serif);
            transition: all 0.2s ease;
        `;
        option.innerHTML = `
            <span style="font-size: 28px;">${fmt.icon}</span>
            <div style="flex: 1;">
                <div style="font-size: 22px; color: ${C.white};">${fmt.label}</div>
                <div style="font-size: 18px; color: ${C.grey};">Export as ${fmt.ext}</div>
            </div>
        `;

        option.addEventListener('click', () => {
            // Deselect all
            formatGrid.querySelectorAll('button').forEach(b => {
                b.style.borderColor = C.mintBorder;
                b.style.background = 'transparent';
            });
            // Select this one
            option.style.borderColor = C.mint;
            option.style.background = 'rgba(198, 255, 187, 0.12)';
            selectedFormat = fmt;
        });

        option.addEventListener('mouseenter', () => {
            if (selectedFormat?.id !== fmt.id) option.style.background = C.mintHover;
        });
        option.addEventListener('mouseleave', () => {
            if (selectedFormat?.id !== fmt.id) option.style.background = 'transparent';
        });

        formatGrid.appendChild(option);
    });
    body.appendChild(formatGrid);
    modal.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 16px 24px; border-top: 1px solid ${C.mintBorder};
        display: flex; justify-content: flex-end; gap: 12px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        background: transparent; color: ${C.grey}; border: 1px solid ${C.grey};
        padding: 12px 28px; border-radius: 8px; font-size: 25px; cursor: pointer;
        font-family: var(--font-body, 'Sevastopol Interface', Arial, sans-serif);
    `;
    cancelBtn.addEventListener('click', () => backdrop.remove());

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '⬇ Export';
    exportBtn.style.cssText = `
        background: ${C.yellow}; color: ${C.dark}; border: none;
        padding: 12px 28px; border-radius: 8px; font-size: 25px; cursor: pointer;
        font-family: var(--font-body, 'Sevastopol Interface', Arial, sans-serif);
        font-weight: bold; transition: all 0.2s ease;
    `;
    exportBtn.addEventListener('click', () => {
        if (!selectedFormat) {
            showToast('Please select an export format.', 'error');
            return;
        }

        emitEvent('PAYROLL_EXPORTED', {
            format: selectedFormat.id,
            period_start: PAYROLL_SUMMARY.period.start,
            period_end: PAYROLL_SUMMARY.period.end,
            employee_count: PAYROLL_SUMMARY.employees.length,
            total_hours: PAYROLL_SUMMARY.laborSummary.totalHours,
            total_wages: PAYROLL_SUMMARY.laborSummary.totalWages,
            total_tips: PAYROLL_SUMMARY.laborSummary.totalTips,
        });

        backdrop.remove();
        showToast(`Payroll exported to ${selectedFormat.label} (${selectedFormat.ext})`, 'success');
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(exportBtn);
    modal.appendChild(footer);

    backdrop.appendChild(modal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

    const escHandler = (e) => {
        if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    currentContainer.appendChild(backdrop);
}

/* ------------------------------------------
   REUSABLE UI COMPONENTS
------------------------------------------ */
function buildTab(label, active, onClick) {
    const tab = document.createElement('button');
    tab.textContent = label;
    tab.style.cssText = `
        padding: 12px 24px; border-radius: 8px; font-size: 22px; cursor: pointer;
        font-family: var(--font-body, 'Sevastopol Interface', Arial, sans-serif);
        transition: all 0.2s ease; border: 1px solid ${active ? C.mint : C.mintBorder};
        background: ${active ? C.mint : 'transparent'};
        color: ${active ? C.dark : C.mint};
        font-weight: ${active ? 'bold' : 'normal'};
    `;
    if (!active && onClick) {
        tab.addEventListener('click', onClick);
        tab.addEventListener('mouseenter', () => tab.style.background = C.mintHover);
        tab.addEventListener('mouseleave', () => tab.style.background = 'transparent');
    }
    return tab;
}

function buildSummaryCard(label, value, color) {
    const card = document.createElement('div');
    card.style.cssText = `
        background: rgba(198, 255, 187, 0.04); border: 1px solid ${C.mintBorder};
        border-radius: 10px; padding: 16px 20px; text-align: center;
    `;
    card.innerHTML = `
        <div style="font-size: 20px; color: ${C.mintFaded}; text-transform: uppercase;
                    letter-spacing: 0.5px; margin-bottom: 8px;">${label}</div>
        <div style="font-size: 32px; color: ${color};
                    font-family: var(--font-display, monospace);">${value}</div>
    `;
    return card;
}

/* ==========================================
   EXPORTS
   ========================================== */
export function buildPayrollTipsScene(container) {
    currentContainer = container;
    viewHistory = [];
    sortField = 'totalComp';
    sortDir = 'desc';

    // Clone tip pool config for mutable editing
    tipPoolConfig = JSON.parse(JSON.stringify(TIP_POOL_CONFIG));

    const viewWrapper = document.createElement('div');
    viewWrapper.id = 'pt-view-wrapper';
    container.appendChild(viewWrapper);

    pushView('payroll-summary');
}

export function cleanupPayrollTips(container) {
    container.innerHTML = '';
    viewHistory = [];
    currentContainer = null;
    tipPoolConfig = null;
}