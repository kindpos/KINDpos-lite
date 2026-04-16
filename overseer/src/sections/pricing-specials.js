/* ============================================
   KINDpos Overseer - Pricing & Specials
   Promotions, Day-Parts, Order Types, Comps

   "Show your work" — every discount, comp,
   and override is an immutable event with
   a complete audit trail.

   Nice. Dependable. Yours.
   ============================================ */

/* ------------------------------------------
   COLORS
------------------------------------------ */
const COLORS = {
    mint:       '#C6FFBB',
    mintHover:  '#d4ffca',
    mintDim:    'rgba(198, 255, 187, 0.15)',
    mintGhost:  'rgba(198, 255, 187, 0.4)',
    yellow:     '#FBDE42',
    yellowFaded:'rgba(251, 222, 66, 0.4)',
    red:        '#FF3333',
    redFaded:   'rgba(255, 51, 51, 0.3)',
    dark:       '#333333',
    grey:       '#999999',
    white:      '#FFFFFF',
    green:      '#4CAF50',
    greenFaded: 'rgba(76, 175, 80, 0.3)',
    purple:     '#CE93D8',
    purpleFaded:'rgba(156, 39, 176, 0.2)',
    blue:       '#64B5F6',
    blueFaded:  'rgba(100, 181, 246, 0.2)',
    orange:     '#FFB74D',
    orangeFaded:'rgba(255, 183, 77, 0.2)',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ------------------------------------------
   TEST DATA
------------------------------------------ */
const TEST_DATA = {
    specials: [
        {
            id: 'spec_happy_hour',
            name: 'Happy Hour',
            discount_type: 'fixed_price',   // 'percentage' | 'flat' | 'fixed_price' | 'combo'
            discount_value: 5.00,
            schedule_mode: 'auto',           // 'auto' | 'manual'
            time_start: '4:00 PM',
            time_end: '6:00 PM',
            active_days: [true, true, true, true, true, false, false],
            date_start: '',
            date_end: '',
            scope: 'categories',             // 'all' | 'categories' | 'items'
            scope_ids: ['cat_beverages'],
            stacking: false,
            requires_approval: false,
            priority: 1,
            active: true,
        },
        {
            id: 'spec_taco_tuesday',
            name: 'Taco Tuesday',
            discount_type: 'percentage',
            discount_value: 25,
            schedule_mode: 'auto',
            time_start: '11:00 AM',
            time_end: '10:00 PM',
            active_days: [false, true, false, false, false, false, false],
            date_start: '',
            date_end: '',
            scope: 'categories',
            scope_ids: ['cat_appetizers'],
            stacking: false,
            requires_approval: false,
            priority: 2,
            active: true,
        },
        {
            id: 'spec_early_bird',
            name: 'Early Bird Special',
            discount_type: 'percentage',
            discount_value: 15,
            schedule_mode: 'auto',
            time_start: '4:00 PM',
            time_end: '5:30 PM',
            active_days: [true, true, true, true, true, true, true],
            date_start: '',
            date_end: '',
            scope: 'categories',
            scope_ids: ['cat_entrees'],
            stacking: false,
            requires_approval: false,
            priority: 3,
            active: false,
        },
    ],

    day_parts: [
        { id: 'dp_lunch',  name: 'Lunch',      time_start: '11:00 AM', time_end: '3:00 PM',  adjustment_type: 'none', adjustment_value: 0, active: true },
        { id: 'dp_dinner', name: 'Dinner',      time_start: '5:00 PM',  time_end: '10:00 PM', adjustment_type: 'flat', adjustment_value: 3.00, active: true },
        { id: 'dp_late',   name: 'Late Night',  time_start: '10:00 PM', time_end: '1:00 AM',  adjustment_type: 'percentage', adjustment_value: -10, active: false },
    ],

    day_part_overrides: [
        { id: 'dpo_bev', category_id: 'cat_beverages', category_name: 'Beverages', dp_id: 'dp_dinner', adjustment_type: 'none', adjustment_value: 0 },
    ],

    order_types: [
        { id: 'ot_dinein',   name: 'Dine-In',   adjustment: 0,  active: true },
        { id: 'ot_takeout',  name: 'Takeout',    adjustment: 0,  active: true },
        { id: 'ot_delivery', name: 'Delivery',   adjustment: 15, active: true },
    ],

    order_type_overrides: [
        { id: 'oto_bev_del', category_id: 'cat_beverages', category_name: 'Beverages', order_type_id: 'ot_delivery', adjustment: 0 },
    ],

    employee_discount: {
        id: 'emp_disc',
        percentage: 20,
        applies_to: 'food_only',           // 'everything' | 'food_only' | 'drinks_only' | 'categories'
        exclude_categories: ['cat_beverages'],
        on_duty_rate: 50,
        off_duty_rate: 20,
        separate_rates: true,
        requires_approval: true,
        active: true,
    },

    comp_reasons: [
        { id: 'comp_complaint', name: 'Customer Complaint',  requires_pin: true,  max_amount: null, active: true },
        { id: 'comp_kitchen',   name: 'Kitchen Error',       requires_pin: false, max_amount: null, active: true },
        { id: 'comp_manager',   name: 'Manager Discretion',  requires_pin: true,  max_amount: 50.00, active: true },
        { id: 'comp_vip',       name: 'VIP Guest',           requires_pin: true,  max_amount: null, active: true },
        { id: 'comp_quality',   name: 'Quality Issue',       requires_pin: false, max_amount: 25.00, active: true },
    ],

    categories: [
        { id: 'cat_appetizers', name: 'Appetizers', emoji: '🍕' },
        { id: 'cat_pasta',      name: 'Pasta',      emoji: '🍝' },
        { id: 'cat_entrees',    name: 'Entrees',    emoji: '🥩' },
        { id: 'cat_desserts',   name: 'Desserts',   emoji: '🍰' },
        { id: 'cat_beverages',  name: 'Beverages',  emoji: '🥤' },
    ],
};

/* ------------------------------------------
   MODULE STATE
------------------------------------------ */
let currentWrapper = null;
let pricingData = null;
let pendingChanges = { specials: [], day_parts: [], day_part_overrides: [], order_types: [], order_type_overrides: [], employee: [], comp_reasons: [] };
let activeSection = null; // track expanded sections

/* ------------------------------------------
   HELPERS
------------------------------------------ */
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function fmtPrice(p) { const n = Number(p); return (n >= 0 ? '+' : '-') + '$' + Math.abs(n).toFixed(2); }
function fmtPct(p) { return (Number(p) >= 0 ? '+' : '') + Number(p) + '%'; }

function getPendingCount() {
    return Object.values(pendingChanges).reduce((sum, arr) => sum + arr.length, 0);
}

function getAllWorking(collection) {
    const key = collection;
    const base = Array.isArray(pricingData[collection])
        ? pricingData[collection].map(item => {
            const pending = pendingChanges[key]?.find(p => p.id === item.id);
            return pending || clone(item);
        })
        : [];
    const newItems = (pendingChanges[key] || []).filter(p => !pricingData[collection]?.some(b => b.id === p.id));
    return [...base, ...newItems];
}

function trackChange(key, updated) {
    const arr = pendingChanges[key];
    if (!arr) return;
    const idx = arr.findIndex(i => i.id === updated.id);
    if (idx !== -1) arr[idx] = updated;
    else arr.push(updated);
    updateFooter();
}

function formatTimeString(raw) {
    if (!raw || !raw.trim()) return '';
    let cleaned = raw.trim().toUpperCase();
    const numOnly = cleaned.match(/^(\d{1,2})$/);
    if (numOnly) { const h = parseInt(numOnly[1]); if (h <= 12) return `${h}:00 ${h < 7 || h === 12 ? 'PM' : 'AM'}`; return `${h - 12}:00 PM`; }
    const noAmPm = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (noAmPm) { const h = parseInt(noAmPm[1]); const m = noAmPm[2]; if (h <= 12) return `${h}:${m} ${h < 7 || h === 12 ? 'PM' : 'AM'}`; return `${h - 12}:${m} PM`; }
    const withAmPm = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/);
    if (withAmPm) return `${withAmPm[1]}:${withAmPm[2] || '00'} ${withAmPm[3]}`;
    return raw.trim();
}

/* ------------------------------------------
   SHARED COMPONENTS
------------------------------------------ */
function buildSectionBlock(container, title, subtitle, onAdd, contentId) {
    const section = document.createElement('div');
    section.style.cssText = `margin-bottom: 40px;`;

    const header = document.createElement('div');
    header.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;`;
    header.innerHTML = `
        <div>
            <div style="font-family: var(--font-display); font-size: 28px; color: ${COLORS.yellow}; padding-bottom: 4px;">${title}</div>
            <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey};">${subtitle}</div>
        </div>
    `;

    if (onAdd) {
        const addBtn = document.createElement('button');
        addBtn.style.cssText = `padding: 10px 20px; background: ${COLORS.mint}; color: ${COLORS.dark}; border: none; border-radius: 8px; font-family: var(--font-body); font-size: 22px; font-weight: bold; cursor: pointer; transition: all 0.2s ease;`;
        addBtn.textContent = '+ Add';
        addBtn.addEventListener('mouseenter', () => { addBtn.style.background = COLORS.mintHover; });
        addBtn.addEventListener('mouseleave', () => { addBtn.style.background = COLORS.mint; });
        addBtn.addEventListener('click', onAdd);
        header.appendChild(addBtn);
    }

    section.appendChild(header);

    const content = document.createElement('div');
    content.id = contentId;
    section.appendChild(content);

    container.appendChild(section);
    return content;
}

function buildToggleSwitch(isOn, onChange, colorOn = COLORS.mint, colorOff = 'rgba(255, 51, 51, 0.5)') {
    const track = document.createElement('div');
    track.style.cssText = `
        width: 56px; height: 30px;
        background: ${isOn ? colorOn : colorOff};
        border-radius: 15px; position: relative;
        cursor: pointer; transition: background 0.2s ease; flex-shrink: 0;
    `;
    const thumb = document.createElement('div');
    thumb.style.cssText = `
        width: 24px; height: 24px; background: ${COLORS.white};
        border-radius: 50%; position: absolute; top: 3px;
        left: ${isOn ? '29px' : '3px'};
        transition: left 0.2s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    `;
    track.appendChild(thumb);
    track.addEventListener('click', (e) => { e.stopPropagation(); onChange(!isOn); });
    return track;
}

function buildSmallButton(label, onClick, isDanger = false) {
    const btn = document.createElement('button');
    btn.style.cssText = `
        padding: 6px 16px;
        background: ${isDanger ? COLORS.redFaded : 'rgba(198, 255, 187, 0.08)'};
        border: 1px solid ${isDanger ? COLORS.red : 'rgba(198, 255, 187, 0.2)'};
        border-radius: 6px; color: ${isDanger ? COLORS.red : COLORS.mint};
        font-family: var(--font-body); font-size: 18px;
        cursor: pointer; transition: all 0.2s ease;
    `;
    btn.textContent = label;
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return btn;
}

function buildTimeInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = '3:00 PM';
    input.style.cssText = `
        width: 140px; padding: 10px 12px;
        background: rgba(198, 255, 187, 0.12);
        border: 1px solid rgba(198, 255, 187, 0.35);
        border-radius: 8px; color: ${COLORS.white};
        font-family: var(--font-body); font-size: 22px;
        text-align: center; outline: none;
        transition: border-color 0.2s ease;
    `;
    input.addEventListener('focus', () => { input.style.borderColor = COLORS.mint; });
    input.addEventListener('blur', () => {
        input.style.borderColor = 'rgba(198, 255, 187, 0.35)';
        input.value = formatTimeString(input.value);
        if (onChange) onChange(input.value);
    });
    return input;
}

function buildDayCheckboxes(container, activeDays, onChange) {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; gap: 8px; margin-top: 10px; margin-bottom: 10px;`;

    DAYS.forEach((day, i) => {
        const btn = document.createElement('button');
        const isOn = activeDays[i];
        btn.style.cssText = `
            width: 56px; padding: 8px 0;
            background: ${isOn ? COLORS.mint : 'transparent'};
            border: 2px solid ${isOn ? COLORS.mint : 'rgba(198, 255, 187, 0.2)'};
            border-radius: 8px; color: ${isOn ? COLORS.dark : COLORS.grey};
            font-family: var(--font-body); font-size: 18px;
            font-weight: ${isOn ? 'bold' : 'normal'};
            cursor: pointer; transition: all 0.15s ease; text-align: center;
        `;
        btn.textContent = day;
        btn.addEventListener('click', () => {
            activeDays[i] = !activeDays[i];
            onChange(activeDays);
            btn.style.background = activeDays[i] ? COLORS.mint : 'transparent';
            btn.style.borderColor = activeDays[i] ? COLORS.mint : 'rgba(198, 255, 187, 0.2)';
            btn.style.color = activeDays[i] ? COLORS.dark : COLORS.grey;
            btn.style.fontWeight = activeDays[i] ? 'bold' : 'normal';
        });
        row.appendChild(btn);
    });

    // Every Day toggle
    const allOn = activeDays.every(d => d);
    const everyBtn = document.createElement('button');
    everyBtn.style.cssText = `
        padding: 8px 14px;
        background: ${allOn ? COLORS.yellowFaded : 'transparent'};
        border: 2px solid ${allOn ? COLORS.yellow : 'rgba(198, 255, 187, 0.15)'};
        border-radius: 8px; color: ${allOn ? COLORS.yellow : COLORS.grey};
        font-family: var(--font-body); font-size: 18px;
        cursor: pointer; margin-left: 8px; transition: all 0.15s ease;
    `;
    everyBtn.textContent = 'Every Day';
    everyBtn.addEventListener('click', () => {
        const setTo = !allOn;
        for (let i = 0; i < activeDays.length; i++) activeDays[i] = setTo;
        onChange(activeDays);
        // Re-render the whole row is easier
        const parent = row.parentElement;
        row.remove();
        buildDayCheckboxes(parent, activeDays, onChange);
    });
    row.appendChild(everyBtn);

    container.appendChild(row);
}

/* ==========================================
   MODAL SYSTEM
   ========================================== */
function openModal(titleText, contentBuilder, width = 600) {
    const overlay = document.createElement('div');
    overlay.id = 'pricing-modal-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.75); z-index: 100;
        display: flex; align-items: center; justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: ${COLORS.dark}; border: 2px solid ${COLORS.yellow};
        border-radius: 12px; width: ${width}px; max-height: 85vh;
        overflow-y: auto; padding: 0;
    `;

    const header = document.createElement('div');
    header.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(198, 255, 187, 0.15);`;
    header.innerHTML = `<div style="font-family: var(--font-display); font-size: 28px; color: ${COLORS.yellow};">${titleText}</div>`;
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `background: none; border: none; color: ${COLORS.grey}; font-size: 30px; cursor: pointer; padding: 4px 8px; line-height: 1;`;
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => closeModal());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding: 24px;`;
    contentBuilder(content);
    modal.appendChild(content);

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    overlay._escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', overlay._escHandler);
    document.body.appendChild(overlay);
}

function closeModal() {
    const overlay = document.getElementById('pricing-modal-overlay');
    if (overlay) {
        if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
        overlay.remove();
    }
}

function buildModalField(container, label, type, value, opts = {}) {
    const group = document.createElement('div');
    group.style.cssText = `margin-bottom: 20px;`;
    const labelEl = document.createElement('label');
    labelEl.style.cssText = `display: block; font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 6px;`;
    labelEl.textContent = label + (opts.required ? ' *' : '');
    group.appendChild(labelEl);

    const inputStyle = `
        width: 100%; padding: 12px 14px;
        background: rgba(198, 255, 187, 0.08);
        border: 1px solid rgba(198, 255, 187, 0.25);
        border-radius: 8px; color: ${COLORS.white};
        font-family: var(--font-body); font-size: 25px;
        outline: none; box-sizing: border-box;
    `;

    let input;
    if (type === 'select') {
        input = document.createElement('select');
        input.style.cssText = inputStyle + 'cursor: pointer;';
        (opts.options || []).forEach(o => {
            const optEl = document.createElement('option');
            optEl.value = o.value;
            optEl.textContent = o.label;
            optEl.style.background = COLORS.dark;
            if (o.value === value) optEl.selected = true;
            input.appendChild(optEl);
        });
    } else {
        input = document.createElement('input');
        input.type = type || 'text';
        input.value = value ?? '';
        input.style.cssText = inputStyle;
        if (opts.placeholder) input.placeholder = opts.placeholder;
        if (opts.step) input.step = opts.step;
    }
    input.addEventListener('focus', () => { input.style.borderColor = COLORS.mint; });
    input.addEventListener('blur', () => { input.style.borderColor = 'rgba(198, 255, 187, 0.25)'; });

    group.appendChild(input);
    container.appendChild(group);
    return input;
}

function buildCheckboxList(container, label, items, selectedIds) {
    const group = document.createElement('div');
    group.style.cssText = `margin-bottom: 20px;`;
    group.innerHTML = `<div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 10px;">${label}</div>`;

    const listBox = document.createElement('div');
    listBox.style.cssText = `max-height: 200px; overflow-y: auto; border: 1px solid rgba(198, 255, 187, 0.15); border-radius: 8px; padding: 8px;`;

    const selected = new Set(selectedIds);
    items.forEach(item => {
        const row = document.createElement('label');
        row.style.cssText = `display: flex; align-items: center; gap: 12px; padding: 8px 12px; cursor: pointer; border-radius: 6px; transition: background 0.15s ease;`;
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(198, 255, 187, 0.06)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selected.has(item.id);
        cb.style.cssText = `width: 20px; height: 20px; accent-color: ${COLORS.mint}; cursor: pointer;`;
        cb.addEventListener('change', () => { if (cb.checked) selected.add(item.id); else selected.delete(item.id); });
        row.appendChild(cb);

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `font-family: var(--font-body); font-size: 22px; color: ${COLORS.mint};`;
        nameSpan.textContent = item.display || item.name;
        row.appendChild(nameSpan);

        listBox.appendChild(row);
    });

    group.appendChild(listBox);
    container.appendChild(group);
    return { getSelected: () => [...selected] };
}

function buildModalFooter(container, onSave, saveLabel = 'Save') {
    const footer = document.createElement('div');
    footer.style.cssText = `display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(198, 255, 187, 0.1);`;

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = `padding: 12px 28px; background: transparent; border: 1px solid ${COLORS.grey}; border-radius: 8px; color: ${COLORS.grey}; font-family: var(--font-body); font-size: 22px; cursor: pointer;`;
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => closeModal());
    footer.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.style.cssText = `padding: 12px 28px; background: ${COLORS.mint}; border: none; border-radius: 8px; color: ${COLORS.dark}; font-family: var(--font-body); font-size: 22px; font-weight: bold; cursor: pointer; transition: all 0.2s ease;`;
    saveBtn.textContent = saveLabel;
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = COLORS.mintHover; });
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = COLORS.mint; });
    saveBtn.addEventListener('click', onSave);
    footer.appendChild(saveBtn);

    container.appendChild(footer);
}

/* ==========================================
   MAIN VIEW
   ========================================== */
function buildMainView(wrapper) {
    wrapper.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.style.cssText = `margin-bottom: 28px;`;
    header.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 34px; color: ${COLORS.yellow};">Pricing & Specials</div>
        <div style="font-family: var(--font-body); font-size: 18px; color: rgba(198, 255, 187, 0.5); margin-top: 4px;">Promotions, day-parts, order types & comps</div>
    `;
    wrapper.appendChild(header);

    // Footer (append early so getElementById works)
    const footer = document.createElement('div');
    footer.id = 'pricing-change-footer';
    footer.style.cssText = `
        position: sticky; bottom: 0; padding: 16px 32px;
        background: rgba(51, 51, 51, 0.97);
        border-top: 2px solid ${COLORS.yellow};
        display: none; justify-content: space-between;
        align-items: center; z-index: 50; margin-top: 24px;
    `;

    // Section 1: Specials
    const specContent = buildSectionBlock(wrapper, 'Specials & Promotions', 'Happy hours, discounts, time-based promos — auto-apply, auto-stop', () => openSpecialModal(), 'specials-list');
    renderSpecialsList();

    // Divider
    wrapper.appendChild(buildDivider());

    // Section 2: Day-Part Pricing
    const dpContent = buildSectionBlock(wrapper, 'Day-Part Pricing', 'Same item, different price at lunch vs dinner', () => openDayPartModal(), 'daypart-list');
    renderDayPartList();

    // Divider
    wrapper.appendChild(buildDivider());

    // Section 3: Order-Type Pricing
    buildSectionBlock(wrapper, 'Order-Type Pricing', 'Adjust prices for dine-in, takeout, delivery', null, 'ordertype-list');
    renderOrderTypeList();

    // Divider
    wrapper.appendChild(buildDivider());

    // Section 4: Employee & Comp Discounts
    buildSectionBlock(wrapper, 'Employee Discounts', 'Staff meal rates, on/off duty, approval gating', null, 'employee-discount');
    renderEmployeeDiscount();

    // Comp Reasons
    buildSectionBlock(wrapper, 'Comp Reason Codes', 'Manager comps with audit trail — every comp is an event', () => openCompReasonModal(), 'comp-reasons-list');
    renderCompReasons();

    wrapper.appendChild(footer);
    updateFooter();
}

function buildDivider() {
    const d = document.createElement('div');
    d.style.cssText = `border-bottom: 2px solid rgba(198, 255, 187, 0.1); margin-bottom: 32px;`;
    return d;
}

/* ==========================================
   SECTION 1: SPECIALS & PROMOTIONS
   ========================================== */
function renderSpecialsList() {
    const container = document.getElementById('specials-list');
    if (!container) return;
    container.innerHTML = '';

    const specials = getAllWorking('specials');
    if (specials.length === 0) {
        container.innerHTML = `<div style="color: ${COLORS.grey}; font-family: var(--font-body); font-size: 20px; padding: 20px; font-style: italic;">No specials configured</div>`;
        return;
    }

    specials.forEach(spec => {
        if (spec._deleted) return;
        const hasPending = pendingChanges.specials.some(p => p.id === spec.id);
        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(198, 255, 187, 0.04);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.1)'};
            border-radius: 10px; padding: 20px; margin-bottom: 12px;
            cursor: pointer; transition: all 0.2s ease;
            opacity: ${spec.active ? '1' : '0.5'};
        `;
        card.addEventListener('mouseenter', () => { card.style.background = 'rgba(198, 255, 187, 0.08)'; });
        card.addEventListener('mouseleave', () => { card.style.background = 'rgba(198, 255, 187, 0.04)'; });
        card.addEventListener('click', () => openSpecialModal(spec));

        // Type badge colors
        const typeBadges = {
            percentage: { bg: COLORS.blueFaded, color: COLORS.blue, text: `${spec.discount_value}% Off` },
            flat: { bg: COLORS.orangeFaded, color: COLORS.orange, text: `-$${Number(spec.discount_value).toFixed(2)}` },
            fixed_price: { bg: COLORS.purpleFaded, color: COLORS.purple, text: `Fixed $${Number(spec.discount_value).toFixed(2)}` },
            combo: { bg: COLORS.greenFaded, color: COLORS.green, text: 'Combo Deal' },
        };
        const badge = typeBadges[spec.discount_type] || typeBadges.percentage;

        // Schedule summary
        const activeDayNames = DAYS.filter((_, i) => spec.active_days[i]).join(', ');
        const schedSummary = spec.schedule_mode === 'auto'
            ? `${spec.time_start} – ${spec.time_end} · ${activeDayNames || 'No days'}`
            : 'Manual activation';

        // Scope summary
        const scopeText = spec.scope === 'all' ? 'All Items'
            : spec.scope === 'categories' ? spec.scope_ids.map(id => pricingData.categories.find(c => c.id === id)?.name || id).join(', ')
            : `${spec.scope_ids.length} items`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-family: var(--font-body); font-size: 25px; font-weight: bold; color: ${COLORS.mint};">${spec.name}</span>
                    <span style="padding: 4px 12px; background: ${badge.bg}; border-radius: 8px; font-family: var(--font-body); font-size: 18px; font-weight: bold; color: ${badge.color};">${badge.text}</span>
                    ${spec.schedule_mode === 'auto' ? `<span style="padding: 4px 10px; background: ${COLORS.mintDim}; border-radius: 6px; font-family: var(--font-body); font-size: 16px; color: ${COLORS.mint};">AUTO</span>` : `<span style="padding: 4px 10px; background: ${COLORS.yellowFaded}; border-radius: 6px; font-family: var(--font-body); font-size: 16px; color: ${COLORS.yellow};">MANUAL</span>`}
                    ${spec.requires_approval ? `<span style="padding: 4px 10px; background: ${COLORS.redFaded}; border-radius: 6px; font-family: var(--font-body); font-size: 16px; color: ${COLORS.red};">PIN</span>` : ''}
                </div>
                <span style="font-family: var(--font-body); font-size: 18px; color: ${spec.active ? COLORS.green : COLORS.grey}; font-weight: bold;">${spec.active ? '● ACTIVE' : '○ INACTIVE'}</span>
            </div>
            <div style="display: flex; gap: 24px;">
                <div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">🕒 ${schedSummary}</div>
                <div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">📂 ${scopeText}</div>
                ${!spec.stacking ? `<div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">🚫 No stacking · Priority ${spec.priority}</div>` : `<div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">✓ Can stack</div>`}
            </div>
        `;
        container.appendChild(card);
    });
}

function openSpecialModal(existing) {
    const isEdit = !!existing;
    openModal(isEdit ? 'Edit Special' : 'Add Special', (content) => {
        const nameInput = buildModalField(content, 'Name', 'text', existing?.name || '', { required: true, placeholder: 'Happy Hour, Taco Tuesday...' });

        const typeInput = buildModalField(content, 'Discount Type', 'select', existing?.discount_type || 'percentage', {
            options: [
                { value: 'percentage', label: 'Percentage Off (e.g. 20% off)' },
                { value: 'flat', label: 'Flat Amount Off (e.g. -$2.00)' },
                { value: 'fixed_price', label: 'Fixed Price (e.g. $5.00 wells)' },
                { value: 'combo', label: '🔒 Combo Price (Coming Soon)' },
            ]
        });

        const valueInput = buildModalField(content, 'Value', 'number', existing?.discount_value ?? '', { required: true, placeholder: '20', step: '0.01' });

        // Schedule
        const schedLabel = document.createElement('div');
        schedLabel.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 10px;`;
        schedLabel.textContent = 'Schedule';
        content.appendChild(schedLabel);

        // Auto/Manual toggle
        let schedMode = existing?.schedule_mode || 'auto';
        const modeRow = document.createElement('div');
        modeRow.style.cssText = `display: flex; gap: 10px; margin-bottom: 16px;`;
        ['auto', 'manual'].forEach(mode => {
            const btn = document.createElement('button');
            const active = schedMode === mode;
            btn.style.cssText = `
                flex: 1; padding: 12px;
                background: ${active ? COLORS.mintDim : 'transparent'};
                border: 2px solid ${active ? COLORS.mint : 'rgba(198, 255, 187, 0.15)'};
                border-radius: 8px; color: ${active ? COLORS.mint : COLORS.grey};
                font-family: var(--font-body); font-size: 22px; cursor: pointer;
            `;
            btn.textContent = mode === 'auto' ? '⏰ Auto (time-based)' : '🔘 Manual (on/off)';
            btn.addEventListener('click', () => {
                schedMode = mode;
                modeRow.querySelectorAll('button').forEach((b, i) => {
                    const a = (mode === 'auto' && i === 0) || (mode === 'manual' && i === 1);
                    b.style.background = a ? COLORS.mintDim : 'transparent';
                    b.style.borderColor = a ? COLORS.mint : 'rgba(198, 255, 187, 0.15)';
                    b.style.color = a ? COLORS.mint : COLORS.grey;
                });
                schedDetails.style.display = mode === 'auto' ? 'block' : 'none';
            });
            modeRow.appendChild(btn);
        });
        content.appendChild(modeRow);

        // Schedule details (shown only for auto)
        const schedDetails = document.createElement('div');
        schedDetails.style.cssText = `display: ${schedMode === 'auto' ? 'block' : 'none'}; margin-bottom: 16px;`;

        // Time row
        const timeRow = document.createElement('div');
        timeRow.style.cssText = `display: flex; align-items: center; gap: 12px; margin-bottom: 4px;`;
        const fromLabel = document.createElement('span');
        fromLabel.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};`;
        fromLabel.textContent = 'From';
        timeRow.appendChild(fromLabel);
        const startInput = buildTimeInput(existing?.time_start || '');
        timeRow.appendChild(startInput);
        const toLabel = document.createElement('span');
        toLabel.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};`;
        toLabel.textContent = 'to';
        timeRow.appendChild(toLabel);
        const endInput = buildTimeInput(existing?.time_end || '');
        timeRow.appendChild(endInput);
        schedDetails.appendChild(timeRow);

        // Day checkboxes
        const activeDays = existing?.active_days ? [...existing.active_days] : [true, true, true, true, true, true, true];
        buildDayCheckboxes(schedDetails, activeDays, () => {});

        // Date range (optional)
        const dateRow = document.createElement('div');
        dateRow.style.cssText = `display: flex; align-items: center; gap: 12px; margin-top: 12px;`;
        dateRow.innerHTML = `<span style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey};">Date range (optional):</span>`;
        const dateStartInput = document.createElement('input');
        dateStartInput.type = 'date';
        dateStartInput.value = existing?.date_start || '';
        dateStartInput.style.cssText = `padding: 8px; background: rgba(198,255,187,0.08); border: 1px solid rgba(198,255,187,0.25); border-radius: 6px; color: ${COLORS.white}; font-family: var(--font-body); font-size: 18px;`;
        dateRow.appendChild(dateStartInput);
        dateRow.innerHTML += `<span style="color: ${COLORS.grey};">to</span>`;
        const dateEndInput = document.createElement('input');
        dateEndInput.type = 'date';
        dateEndInput.value = existing?.date_end || '';
        dateEndInput.style.cssText = dateStartInput.style.cssText;
        dateRow.appendChild(dateEndInput);
        schedDetails.appendChild(dateRow);

        content.appendChild(schedDetails);

        // Scope
        const scopeInput = buildModalField(content, 'Applies To', 'select', existing?.scope || 'all', {
            options: [
                { value: 'all', label: 'All Items' },
                { value: 'categories', label: 'Specific Categories' },
                { value: 'items', label: 'Specific Items' },
            ]
        });

        const scopeListArea = document.createElement('div');
        scopeListArea.id = 'scope-list-area';
        content.appendChild(scopeListArea);

        function renderScopeList() {
            scopeListArea.innerHTML = '';
            if (scopeInput.value === 'categories') {
                const items = pricingData.categories.map(c => ({ id: c.id, name: `${c.emoji} ${c.name}` }));
                const cb = buildCheckboxList(scopeListArea, '', items, existing?.scope_ids || []);
                scopeListArea._getCb = cb;
            } else if (scopeInput.value === 'items') {
                scopeListArea.innerHTML = `<div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; font-style: italic; padding: 8px;">Item selection available when connected to menu data</div>`;
                scopeListArea._getCb = { getSelected: () => existing?.scope_ids || [] };
            } else {
                scopeListArea._getCb = { getSelected: () => [] };
            }
        }
        scopeInput.addEventListener('change', renderScopeList);
        renderScopeList();

        // Stacking & Priority
        const rulesRow = document.createElement('div');
        rulesRow.style.cssText = `display: flex; gap: 20px;`;

        const stackGroup = document.createElement('div');
        stackGroup.style.cssText = `flex: 1; margin-bottom: 20px;`;
        stackGroup.innerHTML = `<div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 10px;">Stacking</div>`;
        let stacking = existing?.stacking ?? false;
        const stackRow = document.createElement('div');
        stackRow.style.cssText = `display: flex; align-items: center; gap: 12px;`;
        const stackToggle = buildToggleSwitch(stacking, (v) => { stacking = v; });
        stackRow.appendChild(stackToggle);
        const stackLabel = document.createElement('span');
        stackLabel.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};`;
        stackLabel.textContent = 'Can combine with other specials';
        stackRow.appendChild(stackLabel);
        stackGroup.appendChild(stackRow);
        rulesRow.appendChild(stackGroup);

        const prioGroup = document.createElement('div');
        prioGroup.style.cssText = `flex: 0 0 140px;`;
        const prioInput = buildModalField(prioGroup, 'Priority', 'number', existing?.priority ?? 1, { placeholder: '1 = highest' });
        rulesRow.appendChild(prioGroup);

        content.appendChild(rulesRow);

        // Requires approval
        const approvalGroup = document.createElement('div');
        approvalGroup.style.cssText = `margin-bottom: 20px; display: flex; align-items: center; gap: 12px;`;
        let reqApproval = existing?.requires_approval ?? false;
        const approvalToggle = buildToggleSwitch(reqApproval, (v) => { reqApproval = v; });
        approvalGroup.appendChild(approvalToggle);
        const approvalLabel = document.createElement('span');
        approvalLabel.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};`;
        approvalLabel.textContent = 'Requires Manager PIN';
        approvalGroup.appendChild(approvalLabel);
        content.appendChild(approvalGroup);

        // Active toggle
        const activeGroup = document.createElement('div');
        activeGroup.style.cssText = `margin-bottom: 10px; display: flex; align-items: center; gap: 12px;`;
        let isActive = existing?.active ?? true;
        const activeToggle = buildToggleSwitch(isActive, (v) => { isActive = v; });
        activeGroup.appendChild(activeToggle);
        const activeLabel = document.createElement('span');
        activeLabel.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};`;
        activeLabel.textContent = 'Active';
        activeGroup.appendChild(activeLabel);
        content.appendChild(activeGroup);

        buildModalFooter(content, () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.style.borderColor = COLORS.red; return; }

            const item = {
                id: existing?.id || `spec_${Date.now()}`,
                name,
                discount_type: typeInput.value,
                discount_value: parseFloat(valueInput.value) || 0,
                schedule_mode: schedMode,
                time_start: startInput.value,
                time_end: endInput.value,
                active_days: activeDays,
                date_start: dateStartInput.value,
                date_end: dateEndInput.value,
                scope: scopeInput.value,
                scope_ids: scopeListArea._getCb?.getSelected() || [],
                stacking,
                requires_approval: reqApproval,
                priority: parseInt(prioInput.value) || 1,
                active: isActive,
            };
            trackChange('specials', item);
            closeModal();
            renderSpecialsList();
        }, isEdit ? 'Save' : 'Create');
    }, 640);
}

/* ==========================================
   SECTION 2: DAY-PART PRICING
   ========================================== */
function renderDayPartList() {
    const container = document.getElementById('daypart-list');
    if (!container) return;
    container.innerHTML = '';

    const parts = getAllWorking('day_parts');

    parts.forEach(dp => {
        if (dp._deleted) return;
        const hasPending = pendingChanges.day_parts.some(p => p.id === dp.id);
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px;
            background: rgba(198, 255, 187, 0.04);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.08)'};
            border-radius: 8px; margin-bottom: 8px;
            transition: all 0.2s ease; cursor: pointer;
            opacity: ${dp.active ? '1' : '0.5'};
        `;
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(198, 255, 187, 0.08)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'rgba(198, 255, 187, 0.04)'; });
        row.addEventListener('click', () => openDayPartModal(dp));

        const adjustText = dp.adjustment_type === 'none' ? 'Base price'
            : dp.adjustment_type === 'flat' ? fmtPrice(dp.adjustment_value)
            : fmtPct(dp.adjustment_value);

        const adjustColor = dp.adjustment_type === 'none' ? COLORS.grey
            : dp.adjustment_value > 0 ? COLORS.yellow
            : dp.adjustment_value < 0 ? COLORS.green : COLORS.grey;

        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <span style="font-family: var(--font-body); font-size: 25px; font-weight: bold; color: ${COLORS.mint};">${dp.name}</span>
                <span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">${dp.time_start} – ${dp.time_end}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-family: var(--font-body); font-size: 22px; font-weight: bold; color: ${adjustColor};">${adjustText}</span>
            </div>
        `;
        container.appendChild(row);
    });

    // Overrides
    const overrides = getAllWorking('day_part_overrides');
    if (overrides.length > 0) {
        const overLabel = document.createElement('div');
        overLabel.style.cssText = `font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-top: 16px; margin-bottom: 8px;`;
        overLabel.textContent = 'Category Overrides';
        container.appendChild(overLabel);

        overrides.forEach(ovr => {
            if (ovr._deleted) return;
            const dp = parts.find(p => p.id === ovr.dp_id);
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 20px; background: rgba(251, 222, 66, 0.05);
                border: 1px dashed rgba(251, 222, 66, 0.3);
                border-radius: 6px; margin-bottom: 6px;
            `;
            row.innerHTML = `
                <span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.yellow};">${ovr.category_name} during ${dp ? dp.name : ovr.dp_id}</span>
                <span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">${ovr.adjustment_type === 'none' ? 'No adjustment' : ovr.adjustment_type === 'flat' ? fmtPrice(ovr.adjustment_value) : fmtPct(ovr.adjustment_value)}</span>
            `;
            container.appendChild(row);
        });
    }
}

function openDayPartModal(existing) {
    const isEdit = !!existing;
    openModal(isEdit ? 'Edit Day-Part' : 'Add Day-Part', (content) => {
        const nameInput = buildModalField(content, 'Name', 'text', existing?.name || '', { required: true, placeholder: 'Lunch, Dinner, Late Night...' });

        // Time
        const timeRow = document.createElement('div');
        timeRow.style.cssText = `display: flex; align-items: center; gap: 12px; margin-bottom: 20px;`;
        timeRow.innerHTML = `<span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">From</span>`;
        const startInput = buildTimeInput(existing?.time_start || '');
        timeRow.appendChild(startInput);
        timeRow.innerHTML += `<span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">to</span>`;
        const endInput = buildTimeInput(existing?.time_end || '');
        timeRow.appendChild(endInput);
        content.appendChild(timeRow);

        // Adjustment type
        const adjType = buildModalField(content, 'Price Adjustment', 'select', existing?.adjustment_type || 'none', {
            options: [
                { value: 'none', label: 'No adjustment (base price)' },
                { value: 'flat', label: 'Flat dollar amount (+$3.00, -$2.00)' },
                { value: 'percentage', label: 'Percentage (+15%, -10%)' },
            ]
        });

        const adjValue = buildModalField(content, 'Amount', 'number', existing?.adjustment_value ?? 0, { step: '0.01', placeholder: '0.00' });

        // Active
        const activeRow = document.createElement('div');
        activeRow.style.cssText = `display: flex; align-items: center; gap: 12px; margin-bottom: 10px;`;
        let isActive = existing?.active ?? true;
        const activeToggle = buildToggleSwitch(isActive, (v) => { isActive = v; });
        activeRow.appendChild(activeToggle);
        activeRow.innerHTML += `<span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};">Active</span>`;
        content.appendChild(activeRow);

        buildModalFooter(content, () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.style.borderColor = COLORS.red; return; }
            const item = {
                id: existing?.id || `dp_${Date.now()}`,
                name,
                time_start: startInput.value,
                time_end: endInput.value,
                adjustment_type: adjType.value,
                adjustment_value: parseFloat(adjValue.value) || 0,
                active: isActive,
            };
            trackChange('day_parts', item);
            closeModal();
            renderDayPartList();
        }, isEdit ? 'Save' : 'Create');
    });
}

/* ==========================================
   SECTION 3: ORDER-TYPE PRICING
   ========================================== */
function renderOrderTypeList() {
    const container = document.getElementById('ordertype-list');
    if (!container) return;
    container.innerHTML = '';

    const types = getAllWorking('order_types');
    const icons = { 'Dine-In': '🍽️', 'Takeout': '🥡', 'Delivery': '🚗' };

    types.forEach(ot => {
        const hasPending = pendingChanges.order_types.some(p => p.id === ot.id);
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px;
            background: rgba(198, 255, 187, 0.04);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.08)'};
            border-radius: 8px; margin-bottom: 8px;
        `;

        const left = document.createElement('div');
        left.style.cssText = `display: flex; align-items: center; gap: 16px;`;
        left.innerHTML = `
            <span style="font-size: 26px;">${icons[ot.name] || '📋'}</span>
            <span style="font-family: var(--font-body); font-size: 25px; font-weight: bold; color: ${COLORS.mint};">${ot.name}</span>
        `;
        row.appendChild(left);

        const right = document.createElement('div');
        right.style.cssText = `display: flex; align-items: center; gap: 16px;`;

        // Adjustment input
        const adjInput = document.createElement('input');
        adjInput.type = 'number';
        adjInput.step = '0.1';
        adjInput.value = ot.adjustment;
        adjInput.style.cssText = `
            width: 80px; padding: 8px; text-align: center;
            background: rgba(198, 255, 187, 0.08);
            border: 1px solid rgba(198, 255, 187, 0.25);
            border-radius: 6px; color: ${COLORS.yellow};
            font-family: var(--font-body); font-size: 22px; outline: none;
        `;
        adjInput.addEventListener('change', () => {
            const updated = clone(ot);
            updated.adjustment = parseFloat(adjInput.value) || 0;
            trackChange('order_types', updated);
            pctLabel.textContent = updated.adjustment === 0 ? 'Base price' : `${updated.adjustment > 0 ? '+' : ''}${updated.adjustment}%`;
        });
        right.appendChild(adjInput);

        const pctLabel = document.createElement('span');
        pctLabel.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${ot.adjustment === 0 ? COLORS.grey : COLORS.yellow}; width: 100px;`;
        pctLabel.textContent = ot.adjustment === 0 ? 'Base price' : `${ot.adjustment > 0 ? '+' : ''}${ot.adjustment}%`;
        right.appendChild(pctLabel);

        // Active toggle
        const toggle = buildToggleSwitch(ot.active, (newVal) => {
            const updated = clone(ot);
            updated.active = newVal;
            trackChange('order_types', updated);
            renderOrderTypeList();
        });
        right.appendChild(toggle);

        row.appendChild(right);
        container.appendChild(row);
    });

    // Overrides
    const overrides = getAllWorking('order_type_overrides');
    if (overrides.length > 0) {
        const overLabel = document.createElement('div');
        overLabel.style.cssText = `font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-top: 16px; margin-bottom: 8px;`;
        overLabel.textContent = 'Category Overrides';
        container.appendChild(overLabel);

        overrides.forEach(ovr => {
            const ot = types.find(t => t.id === ovr.order_type_id);
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 20px; background: rgba(251, 222, 66, 0.05);
                border: 1px dashed rgba(251, 222, 66, 0.3);
                border-radius: 6px; margin-bottom: 6px;
            `;
            row.innerHTML = `
                <span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.yellow};">${ovr.category_name} for ${ot ? ot.name : ovr.order_type_id}</span>
                <span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.grey};">${ovr.adjustment === 0 ? 'No markup' : `${ovr.adjustment > 0 ? '+' : ''}${ovr.adjustment}%`}</span>
            `;
            container.appendChild(row);
        });
    }
}

/* ==========================================
   SECTION 4: EMPLOYEE & COMP DISCOUNTS
   ========================================== */
function renderEmployeeDiscount() {
    const container = document.getElementById('employee-discount');
    if (!container) return;
    container.innerHTML = '';

    const emp = pendingChanges.employee.length > 0
        ? pendingChanges.employee[0]
        : clone(pricingData.employee_discount);

    const card = document.createElement('div');
    card.style.cssText = `
        background: rgba(198, 255, 187, 0.04);
        border: 1px solid ${pendingChanges.employee.length > 0 ? COLORS.yellow : 'rgba(198, 255, 187, 0.1)'};
        border-radius: 10px; padding: 24px;
    `;

    // Rate display
    const rateSection = document.createElement('div');
    rateSection.style.cssText = `display: flex; gap: 40px; margin-bottom: 20px;`;

    if (emp.separate_rates) {
        rateSection.innerHTML = `
            <div>
                <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-bottom: 4px;">On-Duty Rate</div>
                <div style="font-family: var(--font-display); font-size: 36px; color: ${COLORS.mint};">${emp.on_duty_rate}%</div>
            </div>
            <div>
                <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-bottom: 4px;">Off-Duty Rate</div>
                <div style="font-family: var(--font-display); font-size: 36px; color: ${COLORS.yellow};">${emp.off_duty_rate}%</div>
            </div>
        `;
    } else {
        rateSection.innerHTML = `
            <div>
                <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-bottom: 4px;">Discount Rate</div>
                <div style="font-family: var(--font-display); font-size: 36px; color: ${COLORS.mint};">${emp.percentage}%</div>
            </div>
        `;
    }
    card.appendChild(rateSection);

    // Info row
    const appliesText = { everything: 'Everything', food_only: 'Food Only', drinks_only: 'Drinks Only', categories: 'Specific Categories' };
    const excludeText = emp.exclude_categories.map(id => pricingData.categories.find(c => c.id === id)?.name || id).join(', ');

    card.innerHTML += `
        <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
            <div style="padding: 6px 14px; background: ${COLORS.mintDim}; border-radius: 8px; font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};">Applies to: ${appliesText[emp.applies_to]}</div>
            ${excludeText ? `<div style="padding: 6px 14px; background: ${COLORS.redFaded}; border-radius: 8px; font-family: var(--font-body); font-size: 20px; color: ${COLORS.red};">Excludes: ${excludeText}</div>` : ''}
            ${emp.requires_approval ? `<div style="padding: 6px 14px; background: ${COLORS.yellowFaded}; border-radius: 8px; font-family: var(--font-body); font-size: 20px; color: ${COLORS.yellow};">Requires PIN</div>` : ''}
            ${emp.separate_rates ? `<div style="padding: 6px 14px; background: ${COLORS.blueFaded}; border-radius: 8px; font-family: var(--font-body); font-size: 20px; color: ${COLORS.blue};">Separate on/off duty rates</div>` : ''}
        </div>
    `;

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.style.cssText = `
        padding: 10px 24px; background: rgba(198, 255, 187, 0.08);
        border: 1px solid rgba(198, 255, 187, 0.2); border-radius: 8px;
        color: ${COLORS.mint}; font-family: var(--font-body); font-size: 20px;
        cursor: pointer; transition: all 0.2s ease;
    `;
    editBtn.textContent = 'Edit Settings';
    editBtn.addEventListener('click', () => openEmployeeModal(emp));
    card.appendChild(editBtn);

    container.appendChild(card);
}

function openEmployeeModal(existing) {
    openModal('Employee Discount Settings', (content) => {
        // Separate rates toggle
        let separateRates = existing.separate_rates;
        const sepGroup = document.createElement('div');
        sepGroup.style.cssText = `display: flex; align-items: center; gap: 12px; margin-bottom: 20px;`;
        const sepToggle = buildToggleSwitch(separateRates, (v) => {
            separateRates = v;
            singleGroup.style.display = v ? 'none' : 'block';
            dualGroup.style.display = v ? 'flex' : 'none';
        });
        sepGroup.appendChild(sepToggle);
        sepGroup.innerHTML += `<span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};">Separate on-duty / off-duty rates</span>`;
        content.appendChild(sepGroup);

        // Single rate
        const singleGroup = document.createElement('div');
        singleGroup.style.display = separateRates ? 'none' : 'block';
        const pctInput = buildModalField(singleGroup, 'Discount Percentage', 'number', existing.percentage, { step: '1' });
        content.appendChild(singleGroup);

        // Dual rates
        const dualGroup = document.createElement('div');
        dualGroup.style.cssText = `display: ${separateRates ? 'flex' : 'none'}; gap: 20px;`;
        const onDutyGroup = document.createElement('div');
        onDutyGroup.style.cssText = `flex: 1;`;
        const onInput = buildModalField(onDutyGroup, 'On-Duty %', 'number', existing.on_duty_rate, { step: '1' });
        dualGroup.appendChild(onDutyGroup);
        const offDutyGroup = document.createElement('div');
        offDutyGroup.style.cssText = `flex: 1;`;
        const offInput = buildModalField(offDutyGroup, 'Off-Duty %', 'number', existing.off_duty_rate, { step: '1' });
        dualGroup.appendChild(offDutyGroup);
        content.appendChild(dualGroup);

        // Applies to
        const appliesToInput = buildModalField(content, 'Applies To', 'select', existing.applies_to, {
            options: [
                { value: 'everything', label: 'Everything' },
                { value: 'food_only', label: 'Food Only' },
                { value: 'drinks_only', label: 'Drinks Only' },
            ]
        });

        // Exclude categories
        const catItems = pricingData.categories.map(c => ({ id: c.id, name: `${c.emoji} ${c.name}` }));
        const excludeCb = buildCheckboxList(content, 'Exclude Categories', catItems, existing.exclude_categories);

        // Requires approval
        const approvalGroup = document.createElement('div');
        approvalGroup.style.cssText = `display: flex; align-items: center; gap: 12px; margin-bottom: 10px;`;
        let reqApproval = existing.requires_approval;
        const approvalToggle = buildToggleSwitch(reqApproval, (v) => { reqApproval = v; });
        approvalGroup.appendChild(approvalToggle);
        approvalGroup.innerHTML += `<span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};">Requires Manager PIN</span>`;
        content.appendChild(approvalGroup);

        buildModalFooter(content, () => {
            const item = {
                id: existing.id,
                percentage: parseInt(pctInput.value) || 20,
                applies_to: appliesToInput.value,
                exclude_categories: excludeCb.getSelected(),
                on_duty_rate: parseInt(onInput.value) || 50,
                off_duty_rate: parseInt(offInput.value) || 20,
                separate_rates: separateRates,
                requires_approval: reqApproval,
                active: true,
            };
            trackChange('employee', item);
            closeModal();
            renderEmployeeDiscount();
        });
    });
}

/* ==========================================
   COMP REASONS
   ========================================== */
function renderCompReasons() {
    const container = document.getElementById('comp-reasons-list');
    if (!container) return;
    container.innerHTML = '';

    const reasons = getAllWorking('comp_reasons');

    reasons.forEach(reason => {
        if (reason._deleted) return;
        const hasPending = pendingChanges.comp_reasons.some(p => p.id === reason.id);
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 20px;
            background: rgba(198, 255, 187, 0.04);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.08)'};
            border-radius: 8px; margin-bottom: 6px;
            cursor: pointer; transition: all 0.2s ease;
        `;
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(198, 255, 187, 0.08)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'rgba(198, 255, 187, 0.04)'; });
        row.addEventListener('click', () => openCompReasonModal(reason));

        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-family: var(--font-body); font-size: 25px; color: ${COLORS.mint};">${reason.name}</span>
                ${reason.requires_pin ? `<span style="padding: 3px 10px; background: ${COLORS.yellowFaded}; border-radius: 6px; font-family: var(--font-body); font-size: 16px; color: ${COLORS.yellow};">PIN</span>` : ''}
                ${reason.max_amount !== null ? `<span style="padding: 3px 10px; background: ${COLORS.redFaded}; border-radius: 6px; font-family: var(--font-body); font-size: 16px; color: ${COLORS.red};">Max $${Number(reason.max_amount).toFixed(2)}</span>` : ''}
            </div>
        `;

        const delBtn = buildSmallButton('Delete', () => {
            showConfirmDialog('Delete Comp Reason?', `Remove "${reason.name}"?`, 'Delete', () => {
                pricingData.comp_reasons = pricingData.comp_reasons.filter(r => r.id !== reason.id);
                trackChange('comp_reasons', { id: reason.id, _deleted: true });
                renderCompReasons();
            });
        }, true);
        row.appendChild(delBtn);

        container.appendChild(row);
    });
}

function openCompReasonModal(existing) {
    const isEdit = !!existing;
    openModal(isEdit ? 'Edit Comp Reason' : 'Add Comp Reason', (content) => {
        const nameInput = buildModalField(content, 'Reason Name', 'text', existing?.name || '', { required: true, placeholder: 'Customer Complaint, Kitchen Error...' });

        // Requires PIN
        const pinGroup = document.createElement('div');
        pinGroup.style.cssText = `display: flex; align-items: center; gap: 12px; margin-bottom: 20px;`;
        let reqPin = existing?.requires_pin ?? true;
        const pinToggle = buildToggleSwitch(reqPin, (v) => { reqPin = v; });
        pinGroup.appendChild(pinToggle);
        pinGroup.innerHTML += `<span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};">Requires Manager PIN</span>`;
        content.appendChild(pinGroup);

        // Max amount
        const maxInput = buildModalField(content, 'Max Comp Amount (blank = unlimited)', 'number', existing?.max_amount ?? '', { step: '0.01', placeholder: 'Leave blank for no limit' });

        buildModalFooter(content, () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.style.borderColor = COLORS.red; return; }
            const item = {
                id: existing?.id || `comp_${Date.now()}`,
                name,
                requires_pin: reqPin,
                max_amount: maxInput.value ? parseFloat(maxInput.value) : null,
                active: true,
            };
            trackChange('comp_reasons', item);
            closeModal();
            renderCompReasons();
        }, isEdit ? 'Save' : 'Create');
    });
}

/* ==========================================
   FOOTER: CHANGE TRACKER
   ========================================== */
function updateFooter() {
    const footer = document.getElementById('pricing-change-footer');
    if (!footer) return;

    const count = getPendingCount();
    if (count === 0) { footer.style.display = 'none'; return; }

    footer.style.display = 'flex';
    footer.innerHTML = '';

    const counter = document.createElement('div');
    counter.style.cssText = `font-family: var(--font-body); font-size: 22px; color: ${COLORS.yellow}; display: flex; align-items: center; gap: 8px;`;
    counter.innerHTML = `⚠️ <strong>${count} unsaved change${count !== 1 ? 's' : ''}</strong>`;
    footer.appendChild(counter);

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = `display: flex; gap: 12px;`;

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = `padding: 12px 24px; background: transparent; border: 1px solid ${COLORS.grey}; border-radius: 8px; color: ${COLORS.grey}; font-family: var(--font-body); font-size: 22px; cursor: pointer;`;
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.borderColor = COLORS.red; cancelBtn.style.color = COLORS.red; });
    cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.borderColor = COLORS.grey; cancelBtn.style.color = COLORS.grey; });
    cancelBtn.addEventListener('click', () => {
        showConfirmDialog('Discard Changes?', `You have ${count} unsaved change${count !== 1 ? 's' : ''}. This cannot be undone.`, 'Discard', () => {
            pendingChanges = { specials: [], day_parts: [], day_part_overrides: [], order_types: [], order_type_overrides: [], employee: [], comp_reasons: [] };
            pricingData = clone(TEST_DATA);
            buildMainView(currentWrapper);
        });
    });
    btnGroup.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.style.cssText = `padding: 12px 24px; background: ${COLORS.mint}; border: none; border-radius: 8px; color: ${COLORS.dark}; font-family: var(--font-body); font-size: 22px; font-weight: bold; cursor: pointer; transition: all 0.2s ease;`;
    saveBtn.textContent = 'Save Changes';
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = COLORS.mintHover; });
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = COLORS.mint; });
    saveBtn.addEventListener('click', () => handleSaveChanges());
    btnGroup.appendChild(saveBtn);

    footer.appendChild(btnGroup);
}

/* ==========================================
   SAVE: EVENT GENERATION
   ========================================== */
function handleSaveChanges() {
    const events = [];
    const batch_id = `pricing_batch_${Date.now()}`;
    const ts = new Date().toISOString();

    Object.entries(pendingChanges).forEach(([key, items]) => {
        items.forEach(item => {
            if (item._deleted) {
                events.push({ event_type: `pricing.${key}_deleted`, batch_id, timestamp: ts, payload: { id: item.id } });
            } else {
                events.push({ event_type: `pricing.${key}_updated`, batch_id, timestamp: ts, payload: item });
            }
        });
    });

    console.log('%c[KINDpos] Pricing Events Generated', 'background: #333; color: #FBDE42; font-size: 14px; padding: 2px 8px;');
    console.log(`Batch contains ${events.length} events:`);
    events.forEach((evt, i) => {
        console.log(`  ${i + 1}. ${evt.event_type}`);
    });

    // Apply to base
    pendingChanges.specials.forEach(item => {
        if (item._deleted) { pricingData.specials = pricingData.specials.filter(i => i.id !== item.id); return; }
        const idx = pricingData.specials.findIndex(i => i.id === item.id);
        if (idx !== -1) pricingData.specials[idx] = clone(item);
        else pricingData.specials.push(clone(item));
    });
    pendingChanges.day_parts.forEach(item => {
        if (item._deleted) { pricingData.day_parts = pricingData.day_parts.filter(i => i.id !== item.id); return; }
        const idx = pricingData.day_parts.findIndex(i => i.id === item.id);
        if (idx !== -1) pricingData.day_parts[idx] = clone(item);
        else pricingData.day_parts.push(clone(item));
    });
    pendingChanges.order_types.forEach(item => {
        const idx = pricingData.order_types.findIndex(i => i.id === item.id);
        if (idx !== -1) pricingData.order_types[idx] = clone(item);
    });
    if (pendingChanges.employee.length > 0) {
        pricingData.employee_discount = clone(pendingChanges.employee[0]);
    }
    pendingChanges.comp_reasons.forEach(item => {
        if (item._deleted) { pricingData.comp_reasons = pricingData.comp_reasons.filter(i => i.id !== item.id); return; }
        const idx = pricingData.comp_reasons.findIndex(i => i.id === item.id);
        if (idx !== -1) pricingData.comp_reasons[idx] = clone(item);
        else pricingData.comp_reasons.push(clone(item));
    });

    pendingChanges = { specials: [], day_parts: [], day_part_overrides: [], order_types: [], order_type_overrides: [], employee: [], comp_reasons: [] };
    buildMainView(currentWrapper);
    showToast(`${events.length} change${events.length !== 1 ? 's' : ''} saved successfully`);
}

/* ==========================================
   CONFIRM DIALOG
   ========================================== */
function showConfirmDialog(title, message, confirmLabel, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); z-index: 300; display: flex; align-items: center; justify-content: center;`;

    const dialog = document.createElement('div');
    dialog.style.cssText = `background: ${COLORS.dark}; border: 2px solid ${COLORS.red}; border-radius: 12px; padding: 32px; width: 420px; text-align: center;`;
    dialog.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 28px; color: ${COLORS.red}; margin-bottom: 16px;">${title}</div>
        <div style="font-family: var(--font-body); font-size: 22px; color: ${COLORS.grey}; margin-bottom: 28px; line-height: 1.5;">${message}</div>
    `;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = `display: flex; gap: 12px; justify-content: center;`;

    const keepBtn = document.createElement('button');
    keepBtn.style.cssText = `padding: 12px 28px; background: transparent; border: 1px solid ${COLORS.mint}; border-radius: 8px; color: ${COLORS.mint}; font-family: var(--font-body); font-size: 22px; cursor: pointer;`;
    keepBtn.textContent = 'Keep Editing';
    keepBtn.addEventListener('click', () => overlay.remove());
    btnRow.appendChild(keepBtn);

    const discardBtn = document.createElement('button');
    discardBtn.style.cssText = `padding: 12px 28px; background: ${COLORS.redFaded}; border: 2px solid ${COLORS.red}; border-radius: 8px; color: ${COLORS.white}; font-family: var(--font-body); font-size: 22px; font-weight: bold; cursor: pointer;`;
    discardBtn.textContent = confirmLabel;
    discardBtn.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    btnRow.appendChild(discardBtn);

    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);

    const escHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

/* ==========================================
   TOAST
   ========================================== */
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 24px; right: 24px; padding: 16px 28px; background: ${COLORS.mint}; color: ${COLORS.dark}; font-family: var(--font-body); font-size: 22px; font-weight: bold; border-radius: 8px; z-index: 200; box-shadow: 0 4px 20px rgba(0,0,0,0.3);`;
    toast.textContent = `✓ ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 2500);
}

/* ==========================================
   PUBLIC: Register scene
   ========================================== */
export function registerPricingSpecials(sceneManager) {
    sceneManager.register('pricing-specials', {
        type: 'detail',
        title: 'Pricing & Specials',
        parent: 'menu-subs',
        onEnter(container) {
            console.log('[PricingSpecials] Scene loaded — initializing...');

            pricingData = clone(TEST_DATA);
            pendingChanges = { specials: [], day_parts: [], day_part_overrides: [], order_types: [], order_type_overrides: [], employee: [], comp_reasons: [] };

            currentWrapper = document.createElement('div');
            currentWrapper.style.cssText = `max-width: 1100px; margin: 0 auto; padding: 10px 20px 40px 20px;`;
            container.appendChild(currentWrapper);

            buildMainView(currentWrapper);

            console.log(`[PricingSpecials] Loaded ${pricingData.specials.length} specials, ${pricingData.day_parts.length} day-parts, ${pricingData.comp_reasons.length} comp reasons.`);
            console.log('[PricingSpecials] Ready.');
        },
        onExit(container) {
            currentWrapper = null;
            pricingData = null;
            pendingChanges = { specials: [], day_parts: [], day_part_overrides: [], order_types: [], order_type_overrides: [], employee: [], comp_reasons: [] };
            container.innerHTML = '';
            closeModal();
        },
    });
}