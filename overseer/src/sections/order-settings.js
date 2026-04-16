/* ============================================
   KINDpos Overseer — Order & Service Settings
   Order types, operating hours, auto-gratuity.
   ============================================ */

import { pushChanges } from '../services/config-push.js';

const DAYS = [
    { id: 'monday',    label: 'Monday'    },
    { id: 'tuesday',   label: 'Tuesday'   },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday',  label: 'Thursday'  },
    { id: 'friday',    label: 'Friday'    },
    { id: 'saturday',  label: 'Saturday'  },
    { id: 'sunday',    label: 'Sunday'    },
];

const ORDER_TYPES = [
    { id: 'dine_in',   label: 'Dine-In'   },
    { id: 'takeout',   label: 'Takeout'   },
    { id: 'delivery',  label: 'Delivery'  },
    { id: 'drive_thru', label: 'Drive-Thru' },
];

let config = null;

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    const color = type === 'error' ? 'var(--color-vermillion)' : 'var(--color-green)';
    toast.style.cssText = `position:fixed;top:24px;right:24px;z-index:10000;background:rgba(0,0,0,0.85);border:1px solid ${color};color:${color};padding:14px 24px;border-radius:8px;font-family:var(--font-body);font-size:22px;`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function loadConfig() {
    try {
        const res = await fetch('/api/v1/config/store');
        if (!res.ok) return {};
        return await res.json();
    } catch { return {}; }
}

function sectionHeader(text) {
    const h = document.createElement('div');
    h.style.cssText = 'font-family:var(--font-heading);font-size:22px;color:var(--color-mint);margin:24px 0 12px 0;';
    h.textContent = text;
    return h;
}

function checkboxChip(id, label, checked) {
    const chip = document.createElement('label');
    chip.style.cssText = `
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 16px; border-radius: 6px; cursor: pointer;
        background: ${checked ? 'rgba(var(--color-mint-rgb), 0.2)' : 'var(--color-bg-dark)'};
        border: 1px solid ${checked ? 'var(--color-mint)' : 'rgba(var(--color-mint-rgb), 0.15)'};
        color: var(--color-mint); font-family: var(--font-body); font-size: 20px;
        transition: all 0.15s ease;
    `;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = id;
    cb.checked = !!checked;
    cb.style.cssText = 'accent-color: var(--color-mint); width:18px; height:18px;';
    cb.addEventListener('change', () => {
        chip.style.background = cb.checked ? 'rgba(var(--color-mint-rgb), 0.2)' : 'var(--color-bg-dark)';
        chip.style.borderColor = cb.checked ? 'var(--color-mint)' : 'rgba(var(--color-mint-rgb), 0.15)';
    });
    chip.appendChild(cb);
    chip.appendChild(document.createTextNode(label));
    return { chip, cb };
}

async function mount(container) {
    config = await loadConfig();

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width: 900px; margin: 0 auto; padding: 30px 24px 60px;';
    wrapper.innerHTML = `
        <div style="font-family:var(--font-heading);font-size:44px;color:var(--color-gold);margin-bottom:4px;">
            \u{1F4CB} Order & Service Settings
        </div>
        <div style="font-size:18px;color:rgba(var(--color-mint-rgb),0.5);margin-bottom:20px;">
            Order types, operating hours, and auto-gratuity rules
        </div>
    `;
    container.appendChild(wrapper);

    // ── ORDER TYPES ────────────────────────────
    wrapper.appendChild(sectionHeader('ORDER TYPES'));
    const ordTypesGrid = document.createElement('div');
    ordTypesGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;';
    const enabledTypes = (config.order_types && config.order_types.enabled_types) || [];
    const typeChips = {};
    ORDER_TYPES.forEach(t => {
        const { chip, cb } = checkboxChip(t.id, t.label, enabledTypes.includes(t.id));
        typeChips[t.id] = cb;
        ordTypesGrid.appendChild(chip);
    });
    wrapper.appendChild(ordTypesGrid);

    // ── OPERATING HOURS ────────────────────────
    wrapper.appendChild(sectionHeader('OPERATING HOURS'));
    const hoursTable = document.createElement('div');
    hoursTable.style.cssText = 'display:grid;grid-template-columns:120px 1fr 1fr 80px;gap:10px;align-items:center;';
    const hours = (config.operating_hours) || {};
    const hoursInputs = {};
    DAYS.forEach(day => {
        const dayLabel = document.createElement('div');
        dayLabel.textContent = day.label;
        dayLabel.style.cssText = 'color:var(--color-mint);font-family:var(--font-body);font-size:20px;';
        hoursTable.appendChild(dayLabel);

        const h = hours[day.id] || { open: '11:00', close: '22:00', enabled: false };

        const openI = document.createElement('input');
        openI.type = 'time';
        openI.value = h.open || '11:00';
        openI.className = 'kp-date-input';
        hoursTable.appendChild(openI);

        const closeI = document.createElement('input');
        closeI.type = 'time';
        closeI.value = h.close || '22:00';
        closeI.className = 'kp-date-input';
        hoursTable.appendChild(closeI);

        const enabledCb = document.createElement('input');
        enabledCb.type = 'checkbox';
        enabledCb.checked = !!h.enabled;
        enabledCb.style.cssText = 'accent-color:var(--color-mint);width:22px;height:22px;';
        hoursTable.appendChild(enabledCb);

        hoursInputs[day.id] = { open: openI, close: closeI, enabled: enabledCb };
    });
    wrapper.appendChild(hoursTable);

    // ── AUTO-GRATUITY ──────────────────────────
    wrapper.appendChild(sectionHeader('AUTO-GRATUITY'));
    const ag = config.auto_gratuity || { enabled: false, party_size_threshold: 6, rate_percent: 20, applies_to_order_types: ['dine_in'] };

    const agRow = document.createElement('div');
    agRow.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;align-items:end;margin-bottom:12px;';

    const { chip: agChip, cb: agEnabled } = checkboxChip('ag-enabled', 'Enable auto-gratuity', ag.enabled);
    agRow.appendChild(agChip);

    const partyWrap = document.createElement('div');
    partyWrap.innerHTML = `<div style="color:var(--color-mint);font-size:16px;margin-bottom:4px;">Party size threshold</div>`;
    const partyI = document.createElement('input');
    partyI.type = 'number';
    partyI.min = '2';
    partyI.max = '20';
    partyI.value = ag.party_size_threshold;
    partyI.className = 'kp-date-input';
    partyI.style.cssText += 'width:80px;';
    partyWrap.appendChild(partyI);
    agRow.appendChild(partyWrap);

    const rateWrap = document.createElement('div');
    rateWrap.innerHTML = `<div style="color:var(--color-mint);font-size:16px;margin-bottom:4px;">Rate %</div>`;
    const rateI = document.createElement('input');
    rateI.type = 'number';
    rateI.min = '0';
    rateI.max = '50';
    rateI.step = '0.5';
    rateI.value = ag.rate_percent;
    rateI.className = 'kp-date-input';
    rateI.style.cssText += 'width:80px;';
    rateWrap.appendChild(rateI);
    agRow.appendChild(rateWrap);

    wrapper.appendChild(agRow);

    // ── SAVE ───────────────────────────────────
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save Settings';
    saveBtn.style.cssText = `
        background: var(--color-mint); color: var(--color-bg);
        border: none; border-radius: 8px; padding: 14px 32px;
        font-family: var(--font-body); font-size: 22px; font-weight: bold;
        cursor: pointer; margin-top: 24px;
    `;
    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const events = [];

        const selectedTypes = Object.entries(typeChips).filter(([, cb]) => cb.checked).map(([id]) => id);
        events.push({ event_type: 'store.order_types_updated', payload: { enabled_types: selectedTypes } });

        const hoursPayload = {};
        DAYS.forEach(day => {
            const inp = hoursInputs[day.id];
            hoursPayload[day.id] = { open: inp.open.value, close: inp.close.value, enabled: inp.enabled.checked };
        });
        events.push({ event_type: 'store.operating_hours_updated', payload: { hours: hoursPayload } });

        events.push({
            event_type: 'store.auto_gratuity_updated',
            payload: {
                enabled: agEnabled.checked,
                party_size_threshold: parseInt(partyI.value) || 6,
                rate_percent: parseFloat(rateI.value) || 20,
                applies_to_order_types: selectedTypes.length > 0 ? selectedTypes : ['dine_in'],
            },
        });

        const result = await pushChanges(events);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Settings';
        if (result.ok) showToast('Settings saved');
        else showToast('Failed to save', 'error');
    });
    wrapper.appendChild(saveBtn);
}

export function buildOrderSettingsScene(container) {
    mount(container).catch(e => console.error('[OrderSettings] Mount error:', e));
}

export function cleanupOrderSettings(container) {
    if (container) container.innerHTML = '';
    config = null;
}
