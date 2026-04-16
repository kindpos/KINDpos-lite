/* ============================================
   KINDpos Overseer — Floor Plan & Sections
   Basic section editor (name, color, active).
   ============================================ */

import { pushChanges } from '../services/config-push.js';

const SECTION_COLORS = [
    '#ff4757', '#fcbe40', '#3742fa', '#2ed573', '#ff6348',
    '#7bed9f', '#70a1ff', '#b48efa', '#ff6b81', '#ffa502',
    '#C6FFBB', '#33ffff', '#ffff00',
];

let currentContainer = null;

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    const color = type === 'error' ? 'var(--color-vermillion)' : 'var(--color-green)';
    toast.style.cssText = `position:fixed;top:24px;right:24px;z-index:10000;background:rgba(0,0,0,0.85);border:1px solid ${color};color:${color};padding:14px 24px;border-radius:8px;font-family:var(--font-body);font-size:22px;`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function fetchSections() {
    try {
        const res = await fetch('/api/v1/config/floorplan/sections');
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

function openSectionModal(section, onSave) {
    const isEdit = !!section;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:5000;display:flex;align-items:center;justify-content:center;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--color-bg);border:2px solid var(--color-gold);border-radius:12px;width:480px;max-height:85vh;overflow-y:auto;padding:24px;';
    modal.innerHTML = `<div style="font-family:var(--font-heading);font-size:28px;color:var(--color-gold);margin-bottom:16px;">${isEdit ? 'Edit' : 'Add'} Section</div>`;

    const nameWrap = document.createElement('div');
    nameWrap.style.cssText = 'margin-bottom: 16px;';
    nameWrap.innerHTML = `<label style="display:block;font-family:var(--font-body);font-size:16px;color:var(--color-mint);margin-bottom:4px;">Section Name *</label>`;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = section?.name || '';
    nameInput.placeholder = 'e.g. Dining Room, Bar, Patio';
    nameInput.className = 'kp-date-input';
    nameInput.style.cssText += 'width:100%;font-size:20px;';
    nameWrap.appendChild(nameInput);
    modal.appendChild(nameWrap);

    let selectedColor = section?.color || '#fcbe40';
    const colorLabel = document.createElement('div');
    colorLabel.style.cssText = 'font-size:16px;color:var(--color-mint);margin-bottom:8px;';
    colorLabel.textContent = 'Color';
    modal.appendChild(colorLabel);

    const colorGrid = document.createElement('div');
    colorGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;';
    SECTION_COLORS.forEach(hex => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.style.cssText = `width:36px;height:36px;border-radius:6px;border:2px solid ${hex === selectedColor ? 'var(--color-mint)' : 'transparent'};background:${hex};cursor:pointer;`;
        swatch.addEventListener('click', () => {
            selectedColor = hex;
            colorGrid.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
            swatch.style.borderColor = 'var(--color-mint)';
        });
        colorGrid.appendChild(swatch);
    });
    modal.appendChild(colorGrid);

    const activeWrap = document.createElement('label');
    activeWrap.style.cssText = 'display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:6px;cursor:pointer;background:var(--color-bg-dark);border:1px solid rgba(var(--color-mint-rgb),0.15);color:var(--color-mint);font-family:var(--font-body);font-size:20px;margin-bottom:14px;';
    const activeCb = document.createElement('input');
    activeCb.type = 'checkbox';
    activeCb.checked = section?.active !== false;
    activeCb.style.cssText = 'accent-color:var(--color-mint);width:18px;height:18px;';
    activeWrap.appendChild(activeCb);
    activeWrap.appendChild(document.createTextNode('Active'));
    modal.appendChild(activeWrap);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:12px;margin-top:20px;';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:12px 24px;background:transparent;border:1px solid #888;border-radius:8px;color:#888;font-family:var(--font-body);font-size:20px;cursor:pointer;';
    cancelBtn.addEventListener('click', () => overlay.remove());
    btnRow.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = isEdit ? 'Save' : 'Add Section';
    saveBtn.style.cssText = 'padding:12px 24px;background:var(--color-mint);border:none;border-radius:8px;color:var(--color-bg);font-family:var(--font-body);font-size:20px;font-weight:bold;cursor:pointer;';
    saveBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        if (!name) { showToast('Section name is required', 'error'); return; }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const sectionId = section?.section_id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        const payload = { section_id: sectionId, name, color: selectedColor, active: activeCb.checked };
        const result = await pushChanges([{
            event_type: isEdit ? 'floorplan.section_updated' : 'floorplan.section_created',
            payload,
        }]);
        if (result.ok) {
            overlay.remove();
            showToast(`Section ${isEdit ? 'updated' : 'added'}`);
            onSave();
        } else {
            saveBtn.disabled = false;
            saveBtn.textContent = isEdit ? 'Save' : 'Add Section';
            showToast('Failed to save', 'error');
        }
    });
    btnRow.appendChild(saveBtn);
    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

async function render(container) {
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width:900px;margin:0 auto;padding:30px 24px 60px;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:12px;';
    header.innerHTML = `
        <div>
            <div style="font-family:var(--font-heading);font-size:44px;color:var(--color-gold);">\u{1F5FA}\u{FE0F} Floor Plan</div>
            <div style="font-size:18px;color:rgba(var(--color-mint-rgb),0.5);margin-top:4px;">Sections for organizing tables and servers</div>
        </div>
    `;
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = '+ Add Section';
    addBtn.style.cssText = 'background:var(--color-mint);color:var(--color-bg);border:none;border-radius:8px;padding:12px 24px;font-family:var(--font-body);font-size:20px;font-weight:bold;cursor:pointer;';
    addBtn.addEventListener('click', () => openSectionModal(null, () => render(container)));
    header.appendChild(addBtn);
    wrapper.appendChild(header);

    const note = document.createElement('div');
    note.style.cssText = 'padding:14px 18px;background:rgba(var(--color-gold-rgb),0.08);border:1px solid rgba(var(--color-gold-rgb),0.25);border-radius:6px;color:rgba(var(--color-mint-rgb),0.7);font-size:18px;margin-bottom:20px;';
    note.innerHTML = '\u{1F4A1} Table-level layout (positions, shapes, walls) will be added in a future release.';
    wrapper.appendChild(note);

    const sections = await fetchSections();
    if (sections.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:60px 20px;text-align:center;color:rgba(var(--color-mint-rgb),0.4);font-size:22px;';
        empty.textContent = 'No sections defined. Click + Add Section to begin.';
        wrapper.appendChild(empty);
    } else {
        sections.forEach(s => {
            const id = s.section_id || s.id;
            const card = document.createElement('div');
            card.style.cssText = `background:rgba(var(--color-mint-rgb),0.06);border-left:6px solid ${s.color || '#fcbe40'};border-top:1px solid rgba(var(--color-mint-rgb),0.1);border-right:1px solid rgba(var(--color-mint-rgb),0.1);border-bottom:1px solid rgba(var(--color-mint-rgb),0.1);border-radius:8px;padding:16px 22px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:16px;`;
            card.innerHTML = `
                <div style="flex:1;">
                    <div style="font-family:var(--font-heading);color:${s.color || 'var(--color-gold)'};font-size:26px;">${s.name}${!s.active ? ' <span style="font-size:16px;color:rgba(var(--color-mint-rgb),0.4);">(inactive)</span>' : ''}</div>
                    <div style="font-family:var(--font-mono,monospace);font-size:16px;color:rgba(var(--color-mint-rgb),0.5);margin-top:2px;">${id}</div>
                </div>
            `;
            const actions = document.createElement('div');
            actions.style.cssText = 'display:flex;gap:8px;';
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.textContent = 'Edit';
            editBtn.style.cssText = 'padding:8px 16px;background:rgba(var(--color-mint-rgb),0.1);border:1px solid rgba(var(--color-mint-rgb),0.25);border-radius:6px;color:var(--color-mint);font-family:var(--font-body);font-size:18px;cursor:pointer;';
            editBtn.addEventListener('click', () => openSectionModal(s, () => render(container)));
            actions.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.textContent = 'Delete';
            delBtn.style.cssText = 'padding:8px 16px;background:transparent;border:1px solid var(--color-vermillion);border-radius:6px;color:var(--color-vermillion);font-family:var(--font-body);font-size:18px;cursor:pointer;';
            delBtn.addEventListener('click', async () => {
                if (!confirm(`Delete section "${s.name}"?`)) return;
                const result = await pushChanges([{
                    event_type: 'floorplan.section_deleted',
                    payload: { section_id: id },
                }]);
                if (result.ok) { showToast('Section deleted'); render(container); }
                else showToast('Failed to delete', 'error');
            });
            actions.appendChild(delBtn);
            card.appendChild(actions);
            wrapper.appendChild(card);
        });
    }

    container.appendChild(wrapper);
}

export function buildFloorPlanScene(container) {
    currentContainer = container;
    render(container).catch(e => console.error('[FloorPlan] Mount error:', e));
}

export function cleanupFloorPlan(container) {
    if (container) container.innerHTML = '';
    currentContainer = null;
}
