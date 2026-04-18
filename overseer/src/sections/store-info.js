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
        if (!res.ok) return { info: {}, branding: {} };
        const bundle = await res.json();
        return { info: bundle.info || {}, branding: bundle.branding || {} };
    } catch (e) {
        console.warn('[StoreInfo] Load failed:', e);
        return { info: {}, branding: {} };
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

async function uploadLogo(file) {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
        showToast('Logo must be PNG, JPG, WEBP, or GIF', 'error');
        return null;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast('Logo must be under 2 MB', 'error');
        return null;
    }
    // Read as base64 (strip the data: prefix the FileReader prepends).
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const s = reader.result || '';
            const idx = s.indexOf(',');
            resolve(idx === -1 ? s : s.slice(idx + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
    const res = await fetch('/api/v1/config/store/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: file.name,
            mime_type: file.type,
            content_base64: base64,
        }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        showToast('Logo upload failed' + (text ? `: ${text}` : ''), 'error');
        return null;
    }
    return await res.json();
}

function brandingSection(branding) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin: 8px 0 24px; padding: 16px; border: 1px solid rgba(var(--color-mint-rgb), 0.15); border-radius: 8px;';

    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-family:var(--font-heading);font-size:22px;color:var(--color-mint);margin-bottom:12px;';
    hdr.textContent = 'BRANDING';
    wrap.appendChild(hdr);

    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:14px;color:rgba(var(--color-mint-rgb),0.5);margin-bottom:14px;';
    sub.textContent = 'Logo shown on the terminal login screen. PNG/JPG/WEBP/GIF, under 2 MB.';
    wrap.appendChild(sub);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:20px;';

    const preview = document.createElement('img');
    preview.alt = 'Current store logo';
    preview.style.cssText = 'width:120px;height:120px;object-fit:contain;background:var(--color-bg-dark);border:1px solid rgba(var(--color-mint-rgb),0.2);border-radius:6px;';
    if (branding && branding.logo_url) {
        preview.src = branding.logo_url + (branding.logo_url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    } else {
        preview.src = '/assets/images/palm.jpg';
    }
    row.appendChild(preview);

    const controls = document.createElement('div');
    controls.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:10px;';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
    fileInput.style.cssText = 'color:var(--color-mint);font-family:var(--font-body);font-size:16px;';
    controls.appendChild(fileInput);

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.textContent = 'Upload Logo';
    uploadBtn.style.cssText = `
        align-self: flex-start;
        background: var(--color-mint); color: var(--color-bg);
        border: none; border-radius: 6px; padding: 10px 22px;
        font-family: var(--font-body); font-size: 16px; font-weight: bold;
        cursor: pointer;
    `;
    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) { showToast('Pick a file first', 'error'); return; }
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        const result = await uploadLogo(file);
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Logo';
        if (result && result.logo_url) {
            preview.src = result.logo_url;
            fileInput.value = '';
            showToast('Logo updated');
        }
    });
    controls.appendChild(uploadBtn);

    row.appendChild(controls);
    wrap.appendChild(row);
    return wrap;
}

async function mount(container) {
    currentContainer = container;
    const loaded = await loadStoreInfo();
    storeInfo = loaded.info;
    const branding = loaded.branding;

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

    wrapper.appendChild(brandingSection(branding));

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
