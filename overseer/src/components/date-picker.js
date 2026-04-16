/* ============================================
   KINDpos Overseer — Date Picker Component
   Single date + date range selector.
   Styled to match Overseer theme variables.
   ============================================ */

function fmt(date) {
    return date.toISOString().slice(0, 10);
}

function display(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

function shiftDate(dateStr, days) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return fmt(d);
}

/**
 * Build a single-date picker with prev/next arrows.
 * @param {object} opts
 * @param {string} opts.value - initial date (YYYY-MM-DD)
 * @param {function} opts.onChange - called with new date string
 * @returns {HTMLElement}
 */
export function buildDatePicker({ value, onChange }) {
    let current = value || fmt(new Date());

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(var(--color-mint-rgb), 0.06);
        border: 1px solid rgba(var(--color-mint-rgb), 0.2);
        border-radius: 6px; padding: 6px 12px;
    `;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '\u25C0';
    prevBtn.style.cssText = `
        background: none; border: none; color: var(--color-mint);
        font-size: 18px; cursor: pointer; padding: 4px 8px;
    `;

    const label = document.createElement('span');
    label.style.cssText = `
        font-family: var(--font-body); font-size: 20px;
        color: var(--color-gold); min-width: 160px; text-align: center;
    `;

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '\u25B6';
    nextBtn.style.cssText = prevBtn.style.cssText;

    function update(newDate) {
        current = newDate;
        label.textContent = display(current);
        nextBtn.disabled = current >= fmt(new Date());
        nextBtn.style.opacity = nextBtn.disabled ? '0.3' : '1';
        if (onChange) onChange(current);
    }

    prevBtn.addEventListener('click', () => update(shiftDate(current, -1)));
    nextBtn.addEventListener('click', () => update(shiftDate(current, 1)));
    label.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = current;
        input.max = fmt(new Date());
        input.style.cssText = `
            background: var(--color-bg-dark); color: var(--color-mint);
            border: 1px solid var(--color-mint); border-radius: 4px;
            font-family: var(--font-body); font-size: 18px; padding: 4px 8px;
        `;
        input.addEventListener('change', () => {
            if (input.value) update(input.value);
            input.replaceWith(label);
        });
        input.addEventListener('blur', () => input.replaceWith(label));
        label.replaceWith(input);
        input.focus();
    });

    wrapper.appendChild(prevBtn);
    wrapper.appendChild(label);
    wrapper.appendChild(nextBtn);

    update(current);
    return wrapper;
}

/**
 * Build a date range picker (start + end).
 * @param {object} opts
 * @param {string} opts.start - initial start date
 * @param {string} opts.end - initial end date
 * @param {function} opts.onChange - called with { start, end }
 * @returns {HTMLElement}
 */
export function buildDateRangePicker({ start, end, onChange }) {
    let currentStart = start || shiftDate(fmt(new Date()), -7);
    let currentEnd = end || fmt(new Date());

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(var(--color-mint-rgb), 0.06);
        border: 1px solid rgba(var(--color-mint-rgb), 0.2);
        border-radius: 6px; padding: 6px 12px;
    `;

    function makeInput(val, max, onSet) {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = val;
        if (max) input.max = max;
        input.style.cssText = `
            background: var(--color-bg-dark); color: var(--color-mint);
            border: 1px solid rgba(var(--color-mint-rgb), 0.2);
            border-radius: 4px; font-family: var(--font-body);
            font-size: 18px; padding: 4px 8px; cursor: pointer;
        `;
        input.addEventListener('change', () => {
            if (input.value) onSet(input.value);
        });
        return input;
    }

    const startInput = makeInput(currentStart, fmt(new Date()), (v) => {
        currentStart = v;
        if (currentStart > currentEnd) {
            currentEnd = currentStart;
            endInput.value = currentEnd;
        }
        if (onChange) onChange({ start: currentStart, end: currentEnd });
    });

    const sep = document.createElement('span');
    sep.textContent = '\u2192';
    sep.style.cssText = 'color: rgba(var(--color-mint-rgb), 0.5); font-size: 20px; padding: 0 4px;';

    const endInput = makeInput(currentEnd, fmt(new Date()), (v) => {
        currentEnd = v;
        if (currentEnd < currentStart) {
            currentStart = currentEnd;
            startInput.value = currentStart;
        }
        if (onChange) onChange({ start: currentStart, end: currentEnd });
    });

    // Quick presets
    const presets = document.createElement('div');
    presets.style.cssText = 'display: flex; gap: 4px; margin-left: 8px;';

    const presetDefs = [
        { label: '7d', days: 7 },
        { label: '14d', days: 14 },
        { label: '30d', days: 30 },
    ];

    presetDefs.forEach(p => {
        const btn = document.createElement('button');
        btn.textContent = p.label;
        btn.style.cssText = `
            background: rgba(var(--color-mint-rgb), 0.1); border: 1px solid rgba(var(--color-mint-rgb), 0.15);
            border-radius: 4px; color: var(--color-mint); font-family: var(--font-body);
            font-size: 16px; padding: 2px 8px; cursor: pointer;
        `;
        btn.addEventListener('click', () => {
            currentEnd = fmt(new Date());
            currentStart = shiftDate(currentEnd, -p.days);
            startInput.value = currentStart;
            endInput.value = currentEnd;
            if (onChange) onChange({ start: currentStart, end: currentEnd });
        });
        presets.appendChild(btn);
    });

    wrapper.appendChild(startInput);
    wrapper.appendChild(sep);
    wrapper.appendChild(endInput);
    wrapper.appendChild(presets);

    return wrapper;
}
