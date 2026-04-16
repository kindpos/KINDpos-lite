/* ============================================
   KINDpos Overseer - Menu Import Section
   Excel Template Import via SheetJS

   "Nice. Dependable. Yours." — import your
   menu in minutes, not hours. No cloud needed.
   ============================================ */

import { parseMenuTemplate, getSummary } from '../services/excel-parser.js';

/* ------------------------------------------
   COLOR PALETTE (shared with reporting.js)
   Duplicated here to keep modules independent.
------------------------------------------ */
const COLORS = {
    mint:       '#C6FFBB',
    mintFaded:  'rgba(198, 255, 187, 0.8)',
    mintGhost:  'rgba(198, 255, 187, 0.4)',
    yellow:     '#FBDE42',
    yellowFaded:'rgba(251, 222, 66, 0.4)',
    red:        '#FF3333',
    redFaded:   'rgba(255, 51, 51, 0.3)',
    dark:       '#333333',
    white:      '#FFFFFF',
};

/* ------------------------------------------
   VIEW STACK STATE
   Same architecture as the reporting
   drill-downs — views swap inside a single
   scene container.
------------------------------------------ */
let viewHistory = [];
let currentWrapper = null;

/** Parsed data flows between views */
let parsedData = null;
let parseErrors = [];
let parseWarnings = [];

/** Reference to the selected File object */
let selectedFile = null;

/* ------------------------------------------
   VIEW REGISTRY
------------------------------------------ */
const VIEW_REGISTRY = {
    'file-select':  buildFileSelect,
    'parsing':      buildParsing,
    'preview':      buildPreview,
    'success':      buildSuccess,
    'error':        buildError,
};

/* ------------------------------------------
   VIEW STACK NAVIGATION
------------------------------------------ */
function pushView(viewName, data) {
    if (!currentWrapper) return;

    currentWrapper.innerHTML = '';
    viewHistory.push({ name: viewName, data: data });

    const builder = VIEW_REGISTRY[viewName];
    if (builder) {
        builder(currentWrapper, data);
    } else {
        buildComingSoon(currentWrapper, viewName);
    }

    currentWrapper.scrollTop = 0;
}

function popView() {
    if (viewHistory.length <= 1) return;

    viewHistory.pop();
    const prev = viewHistory[viewHistory.length - 1];
    viewHistory.pop();

    pushView(prev.name, prev.data);
}

/* ------------------------------------------
   BACK BUTTON BUILDER
------------------------------------------ */
function buildBackButton(container, label) {
    const btn = document.createElement('button');
    btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        margin-bottom: 16px;
        background: rgba(198, 255, 187, 0.06);
        border: 1px solid rgba(198, 255, 187, 0.15);
        border-radius: 4px;
        color: ${COLORS.mint};
        font-family: var(--font-body);
        font-size: 22px;
        cursor: pointer;
        transition: background 0.2s ease;
    `;
    btn.textContent = `← Back to ${label}`;
    btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(198, 255, 187, 0.15)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(198, 255, 187, 0.06)';
    });
    btn.addEventListener('click', () => popView());
    container.appendChild(btn);
}

/* ------------------------------------------
   COMING SOON PLACEHOLDER
------------------------------------------ */
function buildComingSoon(container, viewName) {
    buildBackButton(container, 'File Select');

    const notice = document.createElement('div');
    notice.style.cssText = 'text-align: center; padding: 80px 20px;';

    const displayName = viewName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    notice.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 40px; color: ${COLORS.yellow}; margin-bottom: 16px;">
            ${displayName}
        </div>
        <div style="font-size: 25px; color: rgba(198, 255, 187, 0.5);">
            Coming soon — this step is next in the build queue.
        </div>
    `;
    container.appendChild(notice);
}

/* ==========================================
   FILE SELECT VIEW (default)

   Large tappable drop zone with dashed
   border. Tap opens the native file picker,
   drag-drop works as a bonus on desktop.
   Mirrors the PyQt5 admin wizard design.
   ========================================== */
function buildFileSelect(wrapper) {
    // Header
    const header = document.createElement('div');
    header.style.cssText = 'text-align: center; margin-bottom: 32px;';
    header.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 40px; color: ${COLORS.yellow};">
            Import Menu Template
        </div>
        <div style="font-size: 22px; color: rgba(198, 255, 187, 0.6); margin-top: 8px;">
            Select your completed KINDpos menu template file
        </div>
    `;
    wrapper.appendChild(header);

    // Hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls';
    fileInput.style.display = 'none';
    fileInput.id = 'menu-file-input';
    wrapper.appendChild(fileInput);

    // Drop zone
    const dropZone = document.createElement('div');
    dropZone.style.cssText = `
        border: 3px dashed rgba(198, 255, 187, 0.4);
        border-radius: 15px;
        padding: 60px 40px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.2s ease, background 0.2s ease;
        max-width: 600px;
        margin: 0 auto 24px auto;
    `;

    // Drop zone content
    const dzIcon = document.createElement('div');
    dzIcon.style.cssText = `font-size: 50px; margin-bottom: 16px;`;
    dzIcon.textContent = '📄';

    const dzText = document.createElement('div');
    dzText.style.cssText = `
        font-family: var(--font-body);
        font-size: 25px;
        color: ${COLORS.mint};
        margin-bottom: 12px;
    `;
    dzText.textContent = 'Tap to browse or drag & drop your file here';

    const dzFormats = document.createElement('div');
    dzFormats.style.cssText = `
        font-size: 18px;
        color: rgba(198, 255, 187, 0.4);
    `;
    dzFormats.textContent = 'Supported: .xlsx, .xls';

    // Selected file display (hidden initially)
    const dzSelected = document.createElement('div');
    dzSelected.style.cssText = `
        display: none;
        margin-top: 20px;
        padding: 12px 20px;
        background: rgba(198, 255, 187, 0.08);
        border: 1px solid rgba(198, 255, 187, 0.2);
        border-radius: 4px;
        font-size: 22px;
        color: ${COLORS.yellow};
        font-family: var(--font-display);
    `;
    dzSelected.id = 'selected-file-name';

    dropZone.appendChild(dzIcon);
    dropZone.appendChild(dzText);
    dropZone.appendChild(dzFormats);
    dropZone.appendChild(dzSelected);
    wrapper.appendChild(dropZone);

    // --- Import button (hidden until file selected) ---
    const importBtn = document.createElement('button');
    importBtn.style.cssText = `
        display: none;
        margin: 0 auto;
        padding: 14px 40px;
        background: ${COLORS.mint};
        border: none;
        border-radius: 8px;
        color: ${COLORS.dark};
        font-family: var(--font-display);
        font-size: 28px;
        cursor: pointer;
        transition: background 0.2s ease;
    `;
    importBtn.textContent = 'Import Template →';
    importBtn.id = 'import-btn';
    importBtn.addEventListener('mouseenter', () => {
        importBtn.style.background = COLORS.yellow;
    });
    importBtn.addEventListener('mouseleave', () => {
        importBtn.style.background = COLORS.mint;
    });
    importBtn.addEventListener('click', () => {
        if (selectedFile) {
            pushView('parsing');
        }
    });
    wrapper.appendChild(importBtn);

    // --- Format note ---
    const note = document.createElement('div');
    note.style.cssText = `
        text-align: center;
        margin-top: 32px;
        font-size: 18px;
        color: rgba(198, 255, 187, 0.3);
    `;
    note.textContent = 'Use the KINDpos Excel template for best results';
    wrapper.appendChild(note);

    // --- Event Handlers ---

    // Tap to browse
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File selected via browser
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelected(e.target.files[0], dzSelected, importBtn, dzText, dzIcon);
        }
    });

    // Drag & drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = COLORS.yellow;
        dropZone.style.background = 'rgba(251, 222, 66, 0.05)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(198, 255, 187, 0.4)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(198, 255, 187, 0.4)';
        dropZone.style.background = 'transparent';

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'xlsx' || ext === 'xls') {
                handleFileSelected(file, dzSelected, importBtn, dzText, dzIcon);
            } else {
                dzText.textContent = 'Please select an .xlsx or .xls file';
                dzText.style.color = COLORS.red;
                setTimeout(() => {
                    dzText.textContent = 'Tap to browse or drag & drop your file here';
                    dzText.style.color = COLORS.mint;
                }, 2000);
            }
        }
    });
}

/**
 * Handle a file being selected (from browse or drag-drop).
 * Updates the UI and stores the file reference.
 */
function handleFileSelected(file, dzSelected, importBtn, dzText, dzIcon) {
    selectedFile = file;

    // Update drop zone to show selected file
    dzIcon.textContent = '✓';
    dzIcon.style.color = COLORS.mint;
    dzText.textContent = 'File selected — ready to import';
    dzText.style.color = COLORS.mint;

    // Show filename
    dzSelected.textContent = file.name;
    dzSelected.style.display = 'block';

    // Show import button
    importBtn.style.display = 'block';
}

/* ==========================================
   PLACEHOLDER VIEWS
   Will be replaced in Sections 2–4.
   ========================================== */

function buildParsing(wrapper) {
    // --- Loading UI ---
    const container = document.createElement('div');
    container.style.cssText = 'text-align: center; padding: 40px 20px;';

    const header = document.createElement('div');
    header.style.cssText = `
        font-family: var(--font-display);
        font-size: 40px;
        color: ${COLORS.yellow};
        margin-bottom: 12px;
    `;
    header.textContent = 'Processing Template...';

    const fileName = document.createElement('div');
    fileName.style.cssText = `
        font-size: 22px;
        color: rgba(198, 255, 187, 0.6);
        margin-bottom: 40px;
    `;
    fileName.textContent = selectedFile ? `File: ${selectedFile.name}` : '';

    // Progress steps container
    const stepsBox = document.createElement('div');
    stepsBox.style.cssText = `
        max-width: 500px;
        margin: 0 auto;
        padding: 30px;
        background: rgba(198, 255, 187, 0.06);
        border: 1px solid rgba(198, 255, 187, 0.15);
        border-radius: 10px;
        text-align: left;
    `;

    const steps = [
        'Reading file...',
        'Validating restaurant info...',
        'Processing tax rules...',
        'Loading categories...',
        'Importing menu items...',
        'Checking discounts...',
    ];

    const stepElements = [];
    steps.forEach(stepText => {
        const step = document.createElement('div');
        step.style.cssText = `
            font-size: 22px;
            color: rgba(198, 255, 187, 0.3);
            padding: 6px 0;
            font-family: var(--font-body);
        `;
        step.textContent = `⏳ ${stepText}`;
        stepsBox.appendChild(step);
        stepElements.push(step);
    });

    container.appendChild(header);
    container.appendChild(fileName);
    container.appendChild(stepsBox);
    wrapper.appendChild(container);

    // --- Run parser with animated steps ---
    if (!selectedFile) {
        header.textContent = 'No file selected';
        header.style.color = COLORS.red;
        return;
    }

    // Check for SheetJS
    if (typeof XLSX === 'undefined') {
        header.textContent = 'SheetJS library not loaded';
        header.style.color = COLORS.red;
        const hint = document.createElement('div');
        hint.style.cssText = `font-size: 20px; color: rgba(198, 255, 187, 0.5); margin-top: 20px;`;
        hint.textContent = 'Add xlsx.mini.min.js to assets/js/ and load it in index.html';
        container.appendChild(hint);

        // Back button so they're not stuck
        const backBtn = document.createElement('button');
        backBtn.style.cssText = `
            margin-top: 24px;
            padding: 10px 24px;
            background: rgba(198, 255, 187, 0.06);
            border: 1px solid rgba(198, 255, 187, 0.15);
            border-radius: 4px;
            color: ${COLORS.mint};
            font-family: var(--font-body);
            font-size: 20px;
            cursor: pointer;
        `;
        backBtn.textContent = '← Back to File Select';
        backBtn.addEventListener('click', () => popView());
        container.appendChild(backBtn);
        return;
    }

    // Animate steps then parse
    animateSteps(stepElements, header).then(() => {
        return parseMenuTemplate(selectedFile);
    }).then(result => {
        // Store results in module state
        parsedData = result.data;
        parseErrors = result.errors;
        parseWarnings = result.warnings;

        if (result.success) {
            const summary = getSummary(result.data);
            console.log(`[MenuImport] ✓ Parsed: ${summary.restaurant_name} — ${summary.categories_count} categories, ${summary.items_count} items`);
            pushView('preview');
        } else {
            console.warn('[MenuImport] Parse errors:', result.errors);
            pushView('error');
        }
    }).catch(err => {
        console.error('[MenuImport] Unexpected error:', err);
        parseErrors = [`Unexpected error: ${err.message}`];
        pushView('error');
    });
}

/**
 * Animate progress steps with short delays for visual feedback.
 * Each step lights up green before the next starts.
 */
function animateSteps(stepElements, header) {
    return new Promise(resolve => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < stepElements.length) {
                stepElements[i].textContent = stepElements[i].textContent.replace('⏳', '✓');
                stepElements[i].style.color = COLORS.mint;
                i++;
            } else {
                clearInterval(interval);
                header.textContent = 'Parsing complete!';
                header.style.color = COLORS.mint;
                setTimeout(resolve, 300);
            }
        }, 150);
    });
}

function buildPreview(wrapper) {
    if (!parsedData) {
        buildComingSoon(wrapper, 'preview');
        return;
    }

    const data = parsedData;
    const summary = getSummary(data);

    // Back button (resets file selection)
    const backBtn = document.createElement('button');
    backBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        margin-bottom: 16px;
        background: rgba(198, 255, 187, 0.06);
        border: 1px solid rgba(198, 255, 187, 0.15);
        border-radius: 4px;
        color: ${COLORS.mint};
        font-family: var(--font-body);
        font-size: 22px;
        cursor: pointer;
        transition: background 0.2s ease;
    `;
    backBtn.textContent = '← Back to File Select';
    backBtn.addEventListener('mouseenter', () => { backBtn.style.background = 'rgba(198, 255, 187, 0.15)'; });
    backBtn.addEventListener('mouseleave', () => { backBtn.style.background = 'rgba(198, 255, 187, 0.06)'; });
    backBtn.addEventListener('click', () => {
        selectedFile = null;
        parsedData = null;
        parseErrors = [];
        parseWarnings = [];
        viewHistory = [];
        pushView('file-select');
    });
    wrapper.appendChild(backBtn);

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'text-align: center; margin-bottom: 24px;';
    header.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 36px; color: ${COLORS.mint};">
            Import Preview
        </div>
        <div style="font-family: var(--font-display); font-size: 44px; color: ${COLORS.yellow}; margin-top: 8px;">
            ${summary.restaurant_name}
        </div>
    `;
    wrapper.appendChild(header);

    // --- Summary stats bar ---
    const statsBar = document.createElement('div');
    statsBar.style.cssText = `
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
    `;

    const statItems = [
        { label: 'Categories', count: summary.categories_count, icon: '📂' },
        { label: 'Items',      count: summary.items_count,      icon: '🍕' },
        { label: 'Tax Rules',  count: summary.tax_rules_count,  icon: '📋' },
        { label: 'Discounts',  count: summary.discounts_count,  icon: '💰' },
    ];

    statItems.forEach(stat => {
        const card = document.createElement('div');
        card.style.cssText = `
            flex: 1;
            min-width: 120px;
            background: rgba(198, 255, 187, 0.8);
            border-radius: 6px;
            padding: 12px;
            text-align: center;
        `;
        card.innerHTML = `
            <div style="font-size: 16px; color: ${COLORS.dark}; text-transform: uppercase; letter-spacing: 1px;">${stat.icon} ${stat.label}</div>
            <div style="font-size: 34px; color: ${COLORS.dark}; font-family: var(--font-display);">${stat.count}</div>
        `;
        statsBar.appendChild(card);
    });
    wrapper.appendChild(statsBar);

    // --- Collapsible sections ---

    // Restaurant Info (open by default)
    buildCollapsibleSection(wrapper, '🏪 Restaurant Info', true, (content) => {
        const info = data.restaurant_info || {};
        const fields = [
            ['Restaurant Name', info['Restaurant Name']],
            ['Address',         info['Address']],
            ['City / State / ZIP', `${info['City'] || ''}, ${info['State'] || ''} ${info['ZIP Code'] || ''}`],
            ['Phone',           info['Phone']],
            ['Email',           info['Email']],
            ['Website',         info['Website']],
            ['Restaurant Type', info['Restaurant Type']],
            ['Serves Alcohol',  info['Serves Alcohol']],
        ];
        fields.forEach(([label, value]) => {
            if (value && value.trim() && value.trim() !== ',') {
                const row = document.createElement('div');
                row.style.cssText = `
                    display: flex;
                    padding: 6px 0;
                    border-bottom: 1px solid rgba(198, 255, 187, 0.06);
                    font-size: 22px;
                `;
                row.innerHTML = `
                    <span style="color: rgba(198, 255, 187, 0.5); min-width: 200px;">${label}</span>
                    <span style="color: ${COLORS.mint}; flex: 1;">${value}</span>
                `;
                content.appendChild(row);
            }
        });
    });

    // Tax Rules (collapsed)
    buildCollapsibleSection(wrapper, `📋 Tax Rules (${(data.tax_rules || []).length})`, false, (content) => {
        const rules = data.tax_rules || [];
        if (rules.length === 0) {
            content.innerHTML = `<div style="color: rgba(198, 255, 187, 0.4); font-size: 20px;">No tax rules defined</div>`;
            return;
        }
        rules.forEach(tax => {
            const flags = [];
            if (tax.dine_in)  flags.push('Dine-In');
            if (tax.takeout)  flags.push('Takeout');
            if (tax.delivery) flags.push('Delivery');

            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(198, 255, 187, 0.06);
                font-size: 22px;
            `;
            row.innerHTML = `
                <span style="color: ${COLORS.mint}; flex: 1;">${tax.name}</span>
                <span style="color: ${COLORS.yellow}; font-family: var(--font-display); min-width: 70px; text-align: right;">${tax.rate}%</span>
                <span style="color: rgba(198, 255, 187, 0.4); min-width: 180px; text-align: right; font-size: 18px;">${flags.join(' · ')}</span>
            `;
            content.appendChild(row);
        });
    });

    // Categories (collapsed)
    buildCollapsibleSection(wrapper, `📂 Categories (${(data.categories || []).length})`, false, (content) => {
        const cats = data.categories || [];
        if (cats.length === 0) {
            content.innerHTML = `<div style="color: rgba(198, 255, 187, 0.4); font-size: 20px;">No categories defined</div>`;
            return;
        }
        cats.forEach(cat => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(198, 255, 187, 0.06);
                font-size: 22px;
            `;
            row.innerHTML = `
                <span style="width: 20px; height: 20px; border-radius: 3px; background: ${cat.color}; flex-shrink: 0;"></span>
                <span style="color: ${COLORS.mint}; flex: 1;">${cat.name}</span>
                <span style="color: rgba(198, 255, 187, 0.4); font-size: 18px;">#${cat.display_order}</span>
                <span style="color: rgba(198, 255, 187, 0.4); font-size: 18px;">${cat.tax_category || ''}</span>
                <span style="color: ${cat.active ? COLORS.mint : COLORS.red}; font-size: 18px;">${cat.active ? '✓' : '✗'}</span>
            `;
            content.appendChild(row);
        });
    });

    // Items grouped by category (collapsed)
    buildCollapsibleSection(wrapper, `🍕 Menu Items (${(data.items || []).length})`, false, (content) => {
        const items = data.items || [];
        if (items.length === 0) {
            content.innerHTML = `<div style="color: rgba(198, 255, 187, 0.4); font-size: 20px;">No items defined</div>`;
            return;
        }

        // Group by category
        const grouped = {};
        items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });

        // Render each group
        Object.keys(grouped).forEach(catName => {
            const catItems = grouped[catName];

            const catHeading = document.createElement('div');
            catHeading.style.cssText = `
                font-family: var(--font-display);
                font-size: 26px;
                color: ${COLORS.yellow};
                margin: 16px 0 8px 0;
                padding-bottom: 4px;
                border-bottom: 1px solid rgba(198, 255, 187, 0.1);
            `;
            catHeading.textContent = `${catName}: ${catItems.length} items`;
            content.appendChild(catHeading);

            // Show first 5 items, then truncate
            const showCount = 5;
            const displayed = catItems.slice(0, showCount);

            displayed.forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 6px 8px;
                    font-size: 22px;
                `;
                const priceStr = '$' + item.price.toFixed(2);
                const descStr = item.description ? ` — ${item.description}` : '';
                row.innerHTML = `
                    <span style="color: ${COLORS.mint}; flex: 1;">${item.name}</span>
                    <span style="color: ${COLORS.yellow}; font-family: var(--font-display); min-width: 80px; text-align: right;">${priceStr}</span>
                `;
                // Tooltip-style description on hover
                if (item.description) {
                    row.title = item.description;
                }
                content.appendChild(row);
            });

            if (catItems.length > showCount) {
                const more = document.createElement('div');
                more.style.cssText = `
                    font-size: 20px;
                    color: rgba(198, 255, 187, 0.4);
                    padding: 4px 8px;
                    font-style: italic;
                `;
                more.textContent = `...and ${catItems.length - showCount} more`;
                content.appendChild(more);
            }
        });
    });

    // Discounts (collapsed)
    buildCollapsibleSection(wrapper, `💰 Discounts (${(data.discounts || []).length})`, false, (content) => {
        const discounts = data.discounts || [];
        if (discounts.length === 0) {
            content.innerHTML = `<div style="color: rgba(198, 255, 187, 0.4); font-size: 20px;">No discounts defined</div>`;
            return;
        }
        discounts.forEach(disc => {
            const amountStr = disc.type === 'Percentage'
                ? `${disc.amount}% off`
                : `$${disc.amount.toFixed(2)} off`;

            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(198, 255, 187, 0.06);
                font-size: 22px;
            `;
            row.innerHTML = `
                <span style="color: ${COLORS.mint}; flex: 1;">${disc.name}</span>
                <span style="color: ${COLORS.yellow}; font-family: var(--font-display); min-width: 100px; text-align: right;">${amountStr}</span>
                <span style="color: rgba(198, 255, 187, 0.4); min-width: 100px; text-align: right; font-size: 18px;">${disc.schedule}</span>
                ${disc.requires_approval ? `<span style="color: ${COLORS.red}; font-size: 18px;">🔒 Approval</span>` : ''}
            `;
            content.appendChild(row);
        });
    });

    // --- Warnings ---
    if (parseWarnings.length > 0) {
        const warnBox = document.createElement('div');
        warnBox.style.cssText = `
            background: rgba(251, 222, 66, 0.06);
            border: 1px solid rgba(251, 222, 66, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        `;
        const warnHeading = document.createElement('div');
        warnHeading.style.cssText = `font-family: var(--font-display); font-size: 24px; color: ${COLORS.yellow}; margin-bottom: 8px;`;
        warnHeading.textContent = `Warnings (${parseWarnings.length})`;
        warnBox.appendChild(warnHeading);

        parseWarnings.forEach(warn => {
            const line = document.createElement('div');
            line.style.cssText = `font-size: 20px; color: rgba(198, 255, 187, 0.6); padding: 3px 0;`;
            line.textContent = `⚠ ${warn}`;
            warnBox.appendChild(line);
        });
        wrapper.appendChild(warnBox);
    }

    // --- Confirm Import Button ---
    const confirmBtn = document.createElement('button');
    confirmBtn.style.cssText = `
        display: block;
        margin: 28px auto 0 auto;
        padding: 16px 50px;
        background: ${COLORS.mint};
        border: none;
        border-radius: 8px;
        color: ${COLORS.dark};
        font-family: var(--font-display);
        font-size: 30px;
        cursor: pointer;
        transition: background 0.2s ease;
    `;
    confirmBtn.textContent = 'Confirm Import →';
    confirmBtn.addEventListener('mouseenter', () => { confirmBtn.style.background = COLORS.yellow; });
    confirmBtn.addEventListener('mouseleave', () => { confirmBtn.style.background = COLORS.mint; });
    confirmBtn.addEventListener('click', () => {
        pushView('success');
    });
    wrapper.appendChild(confirmBtn);

    // Ready to import note
    const readyNote = document.createElement('div');
    readyNote.style.cssText = `
        text-align: center;
        margin-top: 12px;
        font-size: 18px;
        color: rgba(198, 255, 187, 0.3);
    `;
    readyNote.textContent = `Ready to import: ${summary.categories_count} categories, ${summary.items_count} items, ${summary.tax_rules_count} tax rules, ${summary.discounts_count} discounts`;
    wrapper.appendChild(readyNote);
}

/* ------------------------------------------
   COLLAPSIBLE SECTION BUILDER

   Tappable header that toggles content
   visibility. Prevents scroll overload
   on the 1280×800 tablet screen.
------------------------------------------ */
function buildCollapsibleSection(wrapper, title, startOpen, contentBuilder) {
    const section = document.createElement('div');
    section.style.cssText = `
        margin-bottom: 8px;
        border: 1px solid rgba(198, 255, 187, 0.12);
        border-radius: 6px;
        overflow: hidden;
    `;

    // Header (tappable)
    const header = document.createElement('button');
    header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 12px 16px;
        background: rgba(198, 255, 187, 0.06);
        border: none;
        color: ${COLORS.mint};
        font-family: var(--font-display);
        font-size: 26px;
        cursor: pointer;
        transition: background 0.2s ease;
        text-align: left;
    `;

    const arrow = document.createElement('span');
    arrow.style.cssText = 'font-size: 18px; transition: transform 0.2s ease; display: inline-block;';
    arrow.textContent = '▶';
    if (startOpen) arrow.style.transform = 'rotate(90deg)';

    const titleSpan = document.createElement('span');
    titleSpan.style.cssText = 'flex: 1;';
    titleSpan.textContent = title;

    header.appendChild(arrow);
    header.appendChild(titleSpan);

    header.addEventListener('mouseenter', () => { header.style.background = 'rgba(198, 255, 187, 0.12)'; });
    header.addEventListener('mouseleave', () => { header.style.background = 'rgba(198, 255, 187, 0.06)'; });

    // Content
    const content = document.createElement('div');
    content.style.cssText = `
        padding: 12px 16px;
        display: ${startOpen ? 'block' : 'none'};
    `;

    // Build content via callback
    contentBuilder(content);

    // Toggle on click
    header.addEventListener('click', () => {
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
        arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
    });

    section.appendChild(header);
    section.appendChild(content);
    wrapper.appendChild(section);
}

function buildSuccess(wrapper) {
    if (!parsedData) {
        buildComingSoon(wrapper, 'success');
        return;
    }

    const data = parsedData;
    const summary = getSummary(data);

    // Calculate event count preview
    // (1 restaurant_configured + N tax_rules + N categories + N items + N discounts + 1 import_completed)
    const eventCount = 1
        + (data.tax_rules || []).length
        + (data.categories || []).length
        + (data.items || []).length
        + (data.discounts || []).length
        + 1;

    // --- Big checkmark + header ---
    const header = document.createElement('div');
    header.style.cssText = 'text-align: center; margin-bottom: 12px; padding-top: 20px;';
    header.innerHTML = `
        <div style="font-size: 80px; margin-bottom: 8px;">✓</div>
        <div style="font-family: var(--font-display); font-size: 44px; color: ${COLORS.yellow};">
            Import Successful!
        </div>
    `;
    wrapper.appendChild(header);

    // Restaurant name
    const restName = document.createElement('div');
    restName.style.cssText = `
        text-align: center;
        font-family: var(--font-display);
        font-size: 34px;
        color: ${COLORS.mint};
        margin-bottom: 28px;
    `;
    restName.textContent = summary.restaurant_name;
    wrapper.appendChild(restName);

    // --- Stats summary ---
    const statsBar = document.createElement('div');
    statsBar.style.cssText = `
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
    `;

    const statItems = [
        { label: 'Categories', count: summary.categories_count },
        { label: 'Items',      count: summary.items_count },
        { label: 'Tax Rules',  count: summary.tax_rules_count },
        { label: 'Discounts',  count: summary.discounts_count },
    ];

    statItems.forEach(stat => {
        const card = document.createElement('div');
        card.style.cssText = `
            flex: 1;
            min-width: 120px;
            background: rgba(198, 255, 187, 0.8);
            border-radius: 6px;
            padding: 12px;
            text-align: center;
        `;
        card.innerHTML = `
            <div style="font-size: 34px; color: ${COLORS.dark}; font-family: var(--font-display);">${stat.count}</div>
            <div style="font-size: 16px; color: ${COLORS.dark}; text-transform: uppercase; letter-spacing: 1px;">${stat.label}</div>
        `;
        statsBar.appendChild(card);
    });
    wrapper.appendChild(statsBar);

    // --- Event generation note ---
    const eventBox = document.createElement('div');
    eventBox.style.cssText = `
        background: rgba(198, 255, 187, 0.06);
        border: 1px solid rgba(198, 255, 187, 0.15);
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        margin-bottom: 24px;
    `;
    eventBox.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 40px; color: ${COLORS.yellow}; margin-bottom: 8px;">
            ${eventCount} events
        </div>
        <div style="font-size: 20px; color: rgba(198, 255, 187, 0.5);">
            ready for the event ledger
        </div>
    `;
    wrapper.appendChild(eventBox);

    // --- What's next box ---
    const nextBox = document.createElement('div');
    nextBox.style.cssText = `
        background: rgba(251, 222, 66, 0.05);
        border: 1px solid rgba(251, 222, 66, 0.15);
        border-radius: 8px;
        padding: 16px 20px;
        text-align: center;
        margin-bottom: 32px;
    `;
    nextBox.innerHTML = `
        <div style="font-size: 22px; color: ${COLORS.yellow}; margin-bottom: 4px;">What's Next</div>
        <div style="font-size: 20px; color: rgba(198, 255, 187, 0.5); line-height: 1.5;">
            Events will be written to the local event ledger<br>
            and synced to your terminals automatically.
        </div>
    `;
    wrapper.appendChild(nextBox);

    // --- Action buttons ---
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
        display: flex;
        gap: 16px;
        justify-content: center;
        flex-wrap: wrap;
    `;

    // Primary: Edit Menu Now
    const editBtn = document.createElement('button');
    editBtn.style.cssText = `
        padding: 14px 36px;
        background: ${COLORS.mint};
        border: none;
        border-radius: 8px;
        color: ${COLORS.dark};
        font-family: var(--font-display);
        font-size: 26px;
        cursor: pointer;
        transition: background 0.2s ease;
    `;
    editBtn.textContent = 'Edit Menu Now →';
    editBtn.addEventListener('mouseenter', () => { editBtn.style.background = COLORS.yellow; });
    editBtn.addEventListener('mouseleave', () => { editBtn.style.background = COLORS.mint; });
    editBtn.addEventListener('click', () => {
        // Navigate to Categories & Items scene
        if (window._sm) {
            window._sm.navigateTo('menu-categories');
        }
    });

    // Secondary: Import Another
    const anotherBtn = document.createElement('button');
    anotherBtn.style.cssText = `
        padding: 14px 36px;
        background: transparent;
        border: 2px solid ${COLORS.mint};
        border-radius: 8px;
        color: ${COLORS.mint};
        font-family: var(--font-display);
        font-size: 26px;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease;
    `;
    anotherBtn.textContent = 'Import Another';
    anotherBtn.addEventListener('mouseenter', () => {
        anotherBtn.style.background = 'rgba(198, 255, 187, 0.08)';
        anotherBtn.style.borderColor = COLORS.yellow;
    });
    anotherBtn.addEventListener('mouseleave', () => {
        anotherBtn.style.background = 'transparent';
        anotherBtn.style.borderColor = COLORS.mint;
    });
    anotherBtn.addEventListener('click', () => {
        selectedFile = null;
        parsedData = null;
        parseErrors = [];
        parseWarnings = [];
        viewHistory = [];
        pushView('file-select');
    });

    // Tertiary: Done
    const doneBtn = document.createElement('button');
    doneBtn.style.cssText = `
        padding: 14px 36px;
        background: transparent;
        border: 1px solid rgba(198, 255, 187, 0.2);
        border-radius: 8px;
        color: rgba(198, 255, 187, 0.5);
        font-family: var(--font-body);
        font-size: 22px;
        cursor: pointer;
        transition: background 0.2s ease;
    `;
    doneBtn.textContent = '← Done';
    doneBtn.addEventListener('mouseenter', () => { doneBtn.style.background = 'rgba(198, 255, 187, 0.06)'; });
    doneBtn.addEventListener('mouseleave', () => { doneBtn.style.background = 'transparent'; });
    doneBtn.addEventListener('click', () => {
        // Go back to Menu subcategory screen
        if (window._sm) {
            window._sm.navigateTo('menu-subs');
        }
    });

    buttonRow.appendChild(editBtn);
    buttonRow.appendChild(anotherBtn);
    buttonRow.appendChild(doneBtn);
    wrapper.appendChild(buttonRow);
}

/* ------------------------------------------
   ERROR SCREEN
   Shows parse errors and warnings with a
   "Try Another File" button.
------------------------------------------ */
function buildError(wrapper) {
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        text-align: center;
        margin-bottom: 24px;
    `;
    header.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 40px; color: ${COLORS.red};">
            Import Errors
        </div>
        <div style="font-size: 22px; color: rgba(198, 255, 187, 0.5); margin-top: 8px;">
            The template could not be parsed. Please check the errors below.
        </div>
    `;
    wrapper.appendChild(header);

    // Errors
    if (parseErrors.length > 0) {
        const errBox = document.createElement('div');
        errBox.style.cssText = `
            background: rgba(255, 51, 51, 0.08);
            border: 1px solid rgba(255, 51, 51, 0.25);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        `;

        const errHeading = document.createElement('div');
        errHeading.style.cssText = `
            font-family: var(--font-display);
            font-size: 28px;
            color: ${COLORS.red};
            margin-bottom: 12px;
        `;
        errHeading.textContent = `Errors (${parseErrors.length})`;
        errBox.appendChild(errHeading);

        parseErrors.forEach(err => {
            const line = document.createElement('div');
            line.style.cssText = `
                font-size: 22px;
                color: ${COLORS.mint};
                padding: 4px 0;
            `;
            line.textContent = `✗ ${err}`;
            errBox.appendChild(line);
        });

        wrapper.appendChild(errBox);
    }

    // Warnings
    if (parseWarnings.length > 0) {
        const warnBox = document.createElement('div');
        warnBox.style.cssText = `
            background: rgba(251, 222, 66, 0.06);
            border: 1px solid rgba(251, 222, 66, 0.2);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        `;

        const warnHeading = document.createElement('div');
        warnHeading.style.cssText = `
            font-family: var(--font-display);
            font-size: 28px;
            color: ${COLORS.yellow};
            margin-bottom: 12px;
        `;
        warnHeading.textContent = `Warnings (${parseWarnings.length})`;
        warnBox.appendChild(warnHeading);

        parseWarnings.forEach(warn => {
            const line = document.createElement('div');
            line.style.cssText = `
                font-size: 22px;
                color: rgba(198, 255, 187, 0.6);
                padding: 4px 0;
            `;
            line.textContent = `⚠ ${warn}`;
            warnBox.appendChild(line);
        });

        wrapper.appendChild(warnBox);
    }

    // Try another file button
    const retryBtn = document.createElement('button');
    retryBtn.style.cssText = `
        display: block;
        margin: 24px auto 0 auto;
        padding: 14px 40px;
        background: ${COLORS.mint};
        border: none;
        border-radius: 8px;
        color: ${COLORS.dark};
        font-family: var(--font-display);
        font-size: 26px;
        cursor: pointer;
        transition: background 0.2s ease;
    `;
    retryBtn.textContent = '← Try Another File';
    retryBtn.addEventListener('mouseenter', () => { retryBtn.style.background = COLORS.yellow; });
    retryBtn.addEventListener('mouseleave', () => { retryBtn.style.background = COLORS.mint; });
    retryBtn.addEventListener('click', () => {
        // Reset state and go back to file select
        selectedFile = null;
        parsedData = null;
        parseErrors = [];
        parseWarnings = [];
        viewHistory = [];
        pushView('file-select');
    });
    wrapper.appendChild(retryBtn);
}

/* ------------------------------------------
   PUBLIC: Register scene with scene manager

   Overrides the auto-generated placeholder
   for 'import-excel' in app.js.
------------------------------------------ */
export function registerMenuImport(sceneManager) {
    sceneManager.register('import-excel', {
        type: 'detail',
        title: 'Import from Excel',
        parent: 'menu-subs',
        onEnter(container) {
            currentWrapper = document.createElement('div');
            currentWrapper.style.cssText = `
                max-width: 900px;
                margin: 0 auto;
                padding: 10px 20px 40px 20px;
            `;
            container.appendChild(currentWrapper);

            // Reset state
            parsedData = null;
            parseErrors = [];
            parseWarnings = [];
            selectedFile = null;

            pushView('file-select');
        },
        onExit(container) {
            viewHistory = [];
            currentWrapper = null;
            parsedData = null;
            parseErrors = [];
            parseWarnings = [];
            selectedFile = null;
            container.innerHTML = '';
        },
    });
}