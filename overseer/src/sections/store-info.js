/* ============================================
   KINDpos Overseer — Store Information
   Edits restaurant name, address, contact, receipt text.
   Persists via POST /api/v1/config/store/info.
   ============================================ */

import { pushChanges } from '../services/config-push.js';

let currentContainer = null;
let storeInfo = null;

async function loadStoreInfo() {
    try {
        const res = await fetch('/api/v1/config/store');
        if (!res.ok) return {};
        const bundle = await res.json();
        return bundle.info || {};
    } catch (e) {
        console.warn('[StoreInfo] Load failed:', e);
        return {};
    }
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    const color = type === 'error' ? 'var(--color-vermillion)' : 'var(--color-green)';
    toast.style.cssText = `position:fixed;top:24px;right:24px;z-index:10000;background:rgba(0,0,0,0.85);border:1px solid ${color};color:${color};padding:14px 24px;border-radius:8px;font-family:var(--font-body);font-size:22px;`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function field(label, id, value, placeholder = '', type = 'text') {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom: 16px;';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = 'display:block;font-family:var(--font-body);font-size:18px;color:var(--color-mint);margin-bottom:6px;';
    lbl.htmlFor = id;
    wrap.appendChild(lbl);

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.value = value || '';
    if (placeholder) input.placeholder = placeholder;
    input.style.cssText = `
        width: 100%; box-sizing: border-box;
        background: var(--color-bg-dark); color: var(--color-mint);
        border: 1px solid rgba(var(--color-mint-rgb), 0.25);
        border-radius: 6px; padding: 10px 14px; font-size: 22px;
        font-family: var(--font-body); outline: none;
        color-scheme: dark;
    `;
    input.addEventListener('focus', () => input.style.borderColor = 'var(--color-mint)');
    input.addEventListener('blur', () => input.style.borderColor = 'rgba(var(--color-mint-rgb), 0.25)');
    wrap.appendChild(input);
    return { wrap, input };
}

function row(...children) {
    const r = document.createElement('div');
    r.style.cssText = 'display: flex; gap: 12px;';
    children.forEach(c => { c.wrap.style.flex = '1'; r.appendChild(c.wrap); });
    return r;
}

async function mount(container) {
    currentContainer = container;
    storeInfo = await loadStoreInfo();

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width: 800px; margin: 0 auto; padding: 30px 24px 60px;';

    wrapper.innerHTML = `
        <div style="font-family:var(--font-heading);font-size:44px;color:var(--color-gold);margin-bottom:4px;">
            \u{1F3EA} Store Information
        </div>
        <div style="font-size:18px;color:rgba(var(--color-mint-rgb),0.5);margin-bottom:28px;">
            Restaurant details shown on receipts and reports
        </div>
    `;
    container.appendChild(wrapper);

    const nameField = field('Restaurant Name *', 'si-name', storeInfo.restaurant_name, 'e.g. Sammy\'s Pizza');
    const legalField = field('Legal Entity', 'si-legal', storeInfo.legal_entity_name, 'Legal business name (optional)');
    wrapper.appendChild(nameField.wrap);
    wrapper.appendChild(legalField.wrap);

    // Address section
    const addrHdr = document.createElement('div');
    addrHdr.style.cssText = 'font-family:var(--font-heading);font-size:22px;color:var(--color-mint);margin:20px 0 12px 0;';
    addrHdr.textContent = 'ADDRESS';
    wrapper.appendChild(addrHdr);

    const line1Field = field('Street', 'si-line1', storeInfo.address_line_1);
    const line2Field = field('Suite / Apt (optional)', 'si-line2', storeInfo.address_line_2);
    wrapper.appendChild(line1Field.wrap);
    wrapper.appendChild(line2Field.wrap);

    const cityField = field('City', 'si-city', storeInfo.city);
    const stateField = field('State', 'si-state', storeInfo.state);
    const zipField = field('ZIP', 'si-zip', storeInfo.zip);
    wrapper.appendChild(row(cityField, stateField, zipField));

    // Contact section
    const contactHdr = document.createElement('div');
    contactHdr.style.cssText = 'font-family:var(--font-heading);font-size:22px;color:var(--color-mint);margin:20px 0 12px 0;';
    contactHdr.textContent = 'CONTACT';
    wrapper.appendChild(contactHdr);

    const phoneField = field('Phone', 'si-phone', storeInfo.phone, '(555) 123-4567', 'tel');
    const emailField = field('Email', 'si-email', storeInfo.email, 'contact@example.com', 'email');
    const webField = field('Website', 'si-web', storeInfo.website, 'https://example.com', 'url');
    wrapper.appendChild(row(phoneField, emailField));
    wrapper.appendChild(webField.wrap);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save Store Information';
    saveBtn.style.cssText = `
        background: var(--color-mint); color: var(--color-bg);
        border: none; border-radius: 8px; padding: 14px 32px;
        font-family: var(--font-body); font-size: 22px; font-weight: bold;
        cursor: pointer; margin-top: 24px;
    `;
    saveBtn.addEventListener('click', async () => {
        const name = nameField.input.value.trim();
        if (!name) { showToast('Restaurant name is required', 'error'); return; }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const payload = {
            restaurant_name: name,
            legal_entity_name: legalField.input.value.trim() || null,
            address_line_1: line1Field.input.value.trim(),
            address_line_2: line2Field.input.value.trim() || null,
            city: cityField.input.value.trim(),
            state: stateField.input.value.trim(),
            zip: zipField.input.value.trim(),
            phone: phoneField.input.value.trim(),
            email: emailField.input.value.trim() || null,
            website: webField.input.value.trim() || null,
        };

        const result = await pushChanges([{
            event_type: 'store.info_updated',
            payload,
        }]);

        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Store Information';
        if (!result.ok) {
            showToast('Failed to save', 'error');
        } else {
            showToast('Store information saved');
            storeInfo = payload;
        }
    });
    wrapper.appendChild(saveBtn);
}

export function buildStoreInfoScene(container) {
    mount(container).catch(e => console.error('[StoreInfo] Mount error:', e));
}

export function cleanupStoreInfo(container) {
    if (container) container.innerHTML = '';
    currentContainer = null;
    storeInfo = null;
}
