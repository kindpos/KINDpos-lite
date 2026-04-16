/* ============================================
   KINDpos Overseer - Configure Modifiers
   Master Lists, Groups & Assignments

   Three tabs, two modifier flows:
   1. Mandatory — direct mod-to-item, blooms
      in hex nav, gates item entry
   2. Universal — groups with options/templates,
      accessed via MOD action on the check

   Nice. Dependable. Yours.
   ============================================ */

/* ------------------------------------------
   COLORS
------------------------------------------ */
const COLORS = {
    mint:       '#C6FFBB',
    mintHover:  '#d4ffca',
    mintFaded:  'rgba(198, 255, 187, 0.8)',
    mintGhost:  'rgba(198, 255, 187, 0.4)',
    mintDim:    'rgba(198, 255, 187, 0.15)',
    yellow:     '#FBDE42',
    yellowFaded:'rgba(251, 222, 66, 0.4)',
    red:        '#FF3333',
    redFaded:   'rgba(255, 51, 51, 0.3)',
    dark:       '#333333',
    grey:       '#999999',
    white:      '#FFFFFF',
    purple:     '#CE93D8',
    purpleFaded:'rgba(156, 39, 176, 0.3)',
};

/* ------------------------------------------
   TEST DATA
------------------------------------------ */
const TEST_DATA = {
    modifiers: [
        { id: 'mod_cheese',     name: 'Cheese',       base_price: 0.00, active: true },
        { id: 'mod_lettuce',    name: 'Lettuce',      base_price: 0.00, active: true },
        { id: 'mod_tomato',     name: 'Tomato',       base_price: 0.00, active: true },
        { id: 'mod_onion',      name: 'Onion',        base_price: 0.00, active: true },
        { id: 'mod_bacon',      name: 'Bacon',        base_price: 2.00, active: true },
        { id: 'mod_avocado',    name: 'Avocado',      base_price: 1.50, active: true },
        { id: 'mod_ranch',      name: 'Ranch',        base_price: 0.00, active: true },
        { id: 'mod_italian',    name: 'Italian',      base_price: 0.00, active: true },
        { id: 'mod_bluecheese', name: 'Blue Cheese',  base_price: 0.00, active: true },
        { id: 'mod_vinaigrette',name: 'Vinaigrette',  base_price: 0.00, active: true },
        { id: 'mod_rare',       name: 'Rare',         base_price: 0.00, active: true },
        { id: 'mod_medrare',    name: 'Medium Rare',  base_price: 0.00, active: true },
        { id: 'mod_medium',     name: 'Medium',       base_price: 0.00, active: true },
        { id: 'mod_medwell',    name: 'Medium Well',  base_price: 0.00, active: true },
        { id: 'mod_welldone',   name: 'Well Done',    base_price: 0.00, active: true },
        { id: 'mod_chicken',    name: 'Chicken',      base_price: 3.00, active: true },
        { id: 'mod_shrimp',     name: 'Shrimp',       base_price: 4.00, active: true },
        { id: 'mod_salad',      name: 'Side Salad',   base_price: 0.00, active: true },
        { id: 'mod_fries',      name: 'Side Fries',   base_price: 0.00, active: true },
        { id: 'mod_rice',       name: 'Side Rice',    base_price: 0.00, active: true },
    ],

    options: [
        { id: 'opt_add',     name: 'Add',      is_default: true,  active: true },
        { id: 'opt_extra',   name: 'Extra',     is_default: false, active: true },
        { id: 'opt_light',   name: 'Light',     is_default: false, active: true },
        { id: 'opt_no',      name: 'No',        is_default: false, active: true },
        { id: 'opt_sub',     name: 'Sub',       is_default: false, active: true },
        { id: 'opt_onside',  name: 'On Side',   is_default: false, active: true },
    ],

    templates: [
        {
            id: 'tmpl_standard',
            name: 'Standard Quantity',
            description: 'For toppings with quantity variations',
            option_ids: ['opt_add', 'opt_extra', 'opt_light', 'opt_no', 'opt_onside'],
            active: true,
        },
        {
            id: 'tmpl_protein',
            name: 'Protein Options',
            description: 'For protein add-ons',
            option_ids: ['opt_add', 'opt_extra', 'opt_no'],
            active: true,
        },
        {
            id: 'tmpl_simple',
            name: 'Simple Add/No',
            description: 'Basic add or remove',
            option_ids: ['opt_add', 'opt_no'],
            active: true,
        },
    ],

    groups: [
        {
            id: 'grp_toppings',
            name: 'Burger Toppings',
            modifier_ids: ['mod_cheese', 'mod_lettuce', 'mod_tomato', 'mod_onion', 'mod_bacon', 'mod_avocado'],
            template_id: 'tmpl_standard',
            min_selections: 0,
            max_selections: 10,
            option_prices: {
                'opt_add': 0.00, 'opt_extra': 1.50, 'opt_light': 0.00,
                'opt_no': 0.00, 'opt_onside': 0.00,
            },
            active: true,
        },
        {
            id: 'grp_dressing',
            name: 'Dressing Choice',
            modifier_ids: ['mod_ranch', 'mod_italian', 'mod_bluecheese', 'mod_vinaigrette'],
            template_id: 'tmpl_simple',
            min_selections: 0,
            max_selections: 1,
            option_prices: { 'opt_add': 0.00, 'opt_no': 0.00 },
            active: true,
        },
        {
            id: 'grp_protein',
            name: 'Protein Add-Ons',
            modifier_ids: ['mod_chicken', 'mod_shrimp'],
            template_id: 'tmpl_protein',
            min_selections: 0,
            max_selections: 3,
            option_prices: { 'opt_add': 0.00, 'opt_extra': 3.00, 'opt_no': 0.00 },
            active: true,
        },
    ],

    // Mandatory: direct mod attachments (no template/options)
    mandatory_assignments: [
        {
            id: 'mand_steak_temp',
            target_type: 'category',     // 'category' or 'item'
            target_id: 'cat_entrees',
            target_name: 'Entrees',
            label: 'Cooking Temperature',
            modifier_ids: ['mod_rare', 'mod_medrare', 'mod_medium', 'mod_medwell', 'mod_welldone'],
            select_mode: 'single',       // 'single' or 'multi'
        },
        {
            id: 'mand_entree_side',
            target_type: 'category',
            target_id: 'cat_entrees',
            target_name: 'Entrees',
            label: 'Side Choice',
            modifier_ids: ['mod_salad', 'mod_fries', 'mod_rice'],
            select_mode: 'single',
        },
    ],

    // Universal: group assignments to categories
    universal_assignments: [
        {
            id: 'univ_app_toppings',
            category_id: 'cat_appetizers',
            category_name: 'Appetizers',
            group_ids: ['grp_toppings'],
        },
        {
            id: 'univ_entree_toppings',
            category_id: 'cat_entrees',
            category_name: 'Entrees',
            group_ids: ['grp_toppings', 'grp_protein'],
        },
        {
            id: 'univ_pasta_protein',
            category_id: 'cat_pasta',
            category_name: 'Pasta',
            group_ids: ['grp_protein'],
        },
    ],

    // Reference categories (same as other scenes)
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
let modData = null;
let pendingChanges = { modifiers: [], options: [], templates: [], groups: [], mandatory: [], universal: [] };
let activeTab = 'master';
let searchState = { modifiers: '', options: '' };

/* ------------------------------------------
   HELPERS
------------------------------------------ */
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function formatPrice(p) { const n = Number(p); return (n >= 0 ? '+' : '') + '$' + Math.abs(n).toFixed(2); }
function formatBasePrice(p) { return '$' + Number(p).toFixed(2); }

function getPendingCount() {
    return Object.values(pendingChanges).reduce((sum, arr) => sum + arr.length, 0);
}

function getWorking(collection, id) {
    const key = collection === 'modifiers' ? 'modifiers' :
                collection === 'options' ? 'options' :
                collection === 'templates' ? 'templates' :
                collection === 'groups' ? 'groups' :
                collection === 'mandatory' ? 'mandatory' : 'universal';
    const pending = pendingChanges[key].find(i => i.id === id);
    return pending || modData[collection === 'mandatory' ? 'mandatory_assignments' :
                              collection === 'universal' ? 'universal_assignments' :
                              collection].find(i => i.id === id);
}

function trackChange(key, updated) {
    const arr = pendingChanges[key];
    const idx = arr.findIndex(i => i.id === updated.id);
    if (idx !== -1) arr[idx] = updated;
    else arr.push(updated);
    updateFooter();
}

function getAllWorking(collection) {
    const key = collection === 'mandatory_assignments' ? 'mandatory' :
                collection === 'universal_assignments' ? 'universal' : collection;
    const base = modData[collection].map(item => {
        const pending = pendingChanges[key].find(p => p.id === item.id);
        return pending || clone(item);
    });
    // Add new items from pending that don't exist in base
    const newItems = pendingChanges[key].filter(p => !modData[collection].some(b => b.id === p.id));
    return [...base, ...newItems];
}

/* ------------------------------------------
   TAB BAR
------------------------------------------ */
function buildTabBar(wrapper) {
    const tabs = [
        { id: 'master',      label: 'Master Lists',  icon: '📋' },
        { id: 'groups',      label: 'Groups',         icon: '🔧' },
        { id: 'assignments', label: 'Assignments',    icon: '🔗' },
    ];

    const bar = document.createElement('div');
    bar.style.cssText = `
        display: flex;
        gap: 4px;
        margin-bottom: 28px;
        border-bottom: 2px solid rgba(198, 255, 187, 0.15);
        padding-bottom: 0;
    `;

    tabs.forEach(tab => {
        const btn = document.createElement('button');
        const isActive = activeTab === tab.id;
        btn.style.cssText = `
            padding: 14px 28px;
            background: ${isActive ? 'rgba(198, 255, 187, 0.12)' : 'transparent'};
            border: none;
            border-bottom: 3px solid ${isActive ? COLORS.yellow : 'transparent'};
            color: ${isActive ? COLORS.mint : COLORS.grey};
            font-family: var(--font-body);
            font-size: 22px;
            font-weight: ${isActive ? 'bold' : 'normal'};
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: -2px;
        `;
        btn.textContent = `${tab.icon} ${tab.label}`;
        btn.addEventListener('mouseenter', () => {
            if (!isActive) btn.style.color = COLORS.mint;
        });
        btn.addEventListener('mouseleave', () => {
            if (!isActive) btn.style.color = COLORS.grey;
        });
        btn.addEventListener('click', () => {
            activeTab = tab.id;
            buildMainView(currentWrapper);
        });
        bar.appendChild(btn);
    });

    wrapper.appendChild(bar);
}

/* ------------------------------------------
   MAIN VIEW
------------------------------------------ */
function buildMainView(wrapper) {
    wrapper.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.style.cssText = `margin-bottom: 8px;`;
    header.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 34px; color: ${COLORS.yellow};">
            Configure Modifiers
        </div>
        <div style="font-family: var(--font-body); font-size: 18px; color: rgba(198, 255, 187, 0.5); margin-top: 4px;">
            Define modifiers, group them, assign to menu
        </div>
    `;
    wrapper.appendChild(header);

    // Tabs
    buildTabBar(wrapper);

    // Content area (appended first so getElementById works in tab builders)
    const content = document.createElement('div');
    content.id = 'mod-tab-content';
    wrapper.appendChild(content);

    // Footer
    const footer = document.createElement('div');
    footer.id = 'mod-change-footer';
    footer.style.cssText = `
        position: sticky;
        bottom: 0;
        padding: 16px 32px;
        background: rgba(51, 51, 51, 0.97);
        border-top: 2px solid ${COLORS.yellow};
        display: none;
        justify-content: space-between;
        align-items: center;
        z-index: 50;
        margin-top: 24px;
    `;
    wrapper.appendChild(footer);

    // Now build tab content (elements are in DOM, getElementById will find them)
    if (activeTab === 'master')       buildMasterListsTab(content);
    else if (activeTab === 'groups')  buildGroupsTab(content);
    else if (activeTab === 'assignments') buildAssignmentsTab(content);

    updateFooter();
}

/* ==========================================
   TAB 1: MASTER LISTS
   Top: Modifier Library
   Bottom: Options Library
   ========================================== */
function buildMasterListsTab(container) {
    // --- MODIFIER LIBRARY ---
    buildSectionHeader(container, 'Modifier Library', 'Individual ingredients and modifications', () => openModifierModal());

    const modSearch = buildSearchInput(container, searchState.modifiers, (val) => {
        searchState.modifiers = val;
        renderModifierList();
    });

    const modList = document.createElement('div');
    modList.id = 'modifier-list';
    container.appendChild(modList);
    renderModifierList();

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.cssText = `height: 40px; border-bottom: 2px solid rgba(198, 255, 187, 0.1); margin-bottom: 32px;`;
    container.appendChild(spacer);

    // --- OPTIONS LIBRARY ---
    buildSectionHeader(container, 'Options Library', 'Actions that can be applied to modifiers (prices set per group)', () => openOptionModal());

    const optList = document.createElement('div');
    optList.id = 'option-list';
    container.appendChild(optList);
    renderOptionList();
}

function renderModifierList() {
    const container = document.getElementById('modifier-list');
    if (!container) return;
    container.innerHTML = '';

    let items = getAllWorking('modifiers');
    if (searchState.modifiers.trim()) {
        const term = searchState.modifiers.toLowerCase();
        items = items.filter(m => m.name.toLowerCase().includes(term));
    }

    if (items.length === 0) {
        container.innerHTML = `<div style="color: ${COLORS.grey}; font-family: var(--font-body); font-size: 20px; padding: 20px; font-style: italic;">No modifiers found</div>`;
        return;
    }

    items.forEach(mod => {
        const hasPending = pendingChanges.modifiers.some(p => p.id === mod.id);
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 20px;
            background: rgba(198, 255, 187, 0.04);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.08)'};
            border-radius: 8px;
            margin-bottom: 6px;
            transition: all 0.2s ease;
        `;
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(198, 255, 187, 0.08)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'rgba(198, 255, 187, 0.04)'; });

        const left = document.createElement('div');
        left.style.cssText = `display: flex; align-items: center; gap: 20px;`;
        left.innerHTML = `
            <span style="font-family: var(--font-body); font-size: 25px; color: ${mod.active ? COLORS.mint : COLORS.grey}; ${mod.active ? '' : 'text-decoration: line-through;'}">${mod.name}</span>
            <span style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.yellow};">${formatBasePrice(mod.base_price)}</span>
        `;
        row.appendChild(left);

        const right = document.createElement('div');
        right.style.cssText = `display: flex; align-items: center; gap: 12px;`;

        const editBtn = buildSmallButton('Edit', () => openModifierModal(mod));
        right.appendChild(editBtn);

        const delBtn = buildSmallButton('Delete', () => handleDeleteItem('modifiers', mod.id), true);
        right.appendChild(delBtn);

        row.appendChild(right);
        container.appendChild(row);
    });
}

function renderOptionList() {
    const container = document.getElementById('option-list');
    if (!container) return;
    container.innerHTML = '';

    const items = getAllWorking('options');

    items.forEach(opt => {
        const hasPending = pendingChanges.options.some(p => p.id === opt.id);
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 20px;
            background: rgba(198, 255, 187, 0.04);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.08)'};
            border-radius: 8px;
            margin-bottom: 6px;
            transition: all 0.2s ease;
        `;
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(198, 255, 187, 0.08)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'rgba(198, 255, 187, 0.04)'; });

        const left = document.createElement('div');
        left.style.cssText = `display: flex; align-items: center; gap: 16px;`;
        left.innerHTML = `
            <span style="font-family: var(--font-body); font-size: 25px; color: ${COLORS.mint};">${opt.name}</span>
            ${opt.is_default ? `<span style="padding: 3px 10px; background: ${COLORS.yellowFaded}; color: ${COLORS.yellow}; border-radius: 12px; font-family: var(--font-body); font-size: 16px; font-weight: bold;">DEFAULT</span>` : ''}
        `;
        row.appendChild(left);

        const right = document.createElement('div');
        right.style.cssText = `display: flex; align-items: center; gap: 12px;`;

        const editBtn = buildSmallButton('Edit', () => openOptionModal(opt));
        right.appendChild(editBtn);

        if (!opt.is_default) {
            const delBtn = buildSmallButton('Delete', () => handleDeleteItem('options', opt.id), true);
            right.appendChild(delBtn);
        }

        row.appendChild(right);
        container.appendChild(row);
    });
}

/* ==========================================
   TAB 2: GROUPS
   Top: Option Templates
   Bottom: Modifier Groups
   ========================================== */
function buildGroupsTab(container) {
    // --- OPTION TEMPLATES ---
    buildSectionHeader(container, 'Option Templates', 'Reusable bundles of options', () => openTemplateModal());

    const tmplGrid = document.createElement('div');
    tmplGrid.id = 'template-grid';
    tmplGrid.style.cssText = `display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 40px;`;
    container.appendChild(tmplGrid);
    renderTemplateGrid();

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.cssText = `height: 8px; border-bottom: 2px solid rgba(198, 255, 187, 0.1); margin-bottom: 32px;`;
    container.appendChild(spacer);

    // --- MODIFIER GROUPS ---
    buildSectionHeader(container, 'Modifier Groups', 'Combine modifiers + template + rules (prices set per group)', () => openGroupModal());

    const grpGrid = document.createElement('div');
    grpGrid.id = 'group-grid';
    grpGrid.style.cssText = `display: flex; flex-wrap: wrap; gap: 16px;`;
    container.appendChild(grpGrid);
    renderGroupGrid();
}

function renderTemplateGrid() {
    const container = document.getElementById('template-grid');
    if (!container) return;
    container.innerHTML = '';

    const templates = getAllWorking('templates');
    const allOptions = getAllWorking('options');

    templates.forEach(tmpl => {
        const hasPending = pendingChanges.templates.some(p => p.id === tmpl.id);
        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(198, 255, 187, 0.06);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.15)'};
            border-radius: 10px;
            padding: 20px;
            width: calc(50% - 8px);
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        card.addEventListener('mouseenter', () => {
            card.style.background = 'rgba(198, 255, 187, 0.1)';
            card.style.borderColor = COLORS.mint;
        });
        card.addEventListener('mouseleave', () => {
            card.style.background = 'rgba(198, 255, 187, 0.06)';
            card.style.borderColor = hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.15)';
        });
        card.addEventListener('click', () => openTemplateModal(tmpl));

        const optNames = tmpl.option_ids
            .map(id => allOptions.find(o => o.id === id))
            .filter(Boolean)
            .map(o => o.name);

        card.innerHTML = `
            <div style="font-family: var(--font-body); font-size: 25px; font-weight: bold; color: ${COLORS.mint}; margin-bottom: 8px;">${tmpl.name}</div>
            <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-bottom: 12px;">${tmpl.description || ''}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${optNames.map(n => `<span style="padding: 4px 10px; background: ${COLORS.mintDim}; border-radius: 6px; font-family: var(--font-body); font-size: 18px; color: ${COLORS.mint};">${n}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

function renderGroupGrid() {
    const container = document.getElementById('group-grid');
    if (!container) return;
    container.innerHTML = '';

    const groups = getAllWorking('groups');
    const allMods = getAllWorking('modifiers');
    const allTemplates = getAllWorking('templates');

    groups.forEach(grp => {
        const hasPending = pendingChanges.groups.some(p => p.id === grp.id);
        const tmpl = allTemplates.find(t => t.id === grp.template_id);
        const modNames = grp.modifier_ids
            .map(id => allMods.find(m => m.id === id))
            .filter(Boolean)
            .map(m => m.name);

        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(198, 255, 187, 0.06);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.15)'};
            border-radius: 10px;
            padding: 20px;
            width: calc(50% - 8px);
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        card.addEventListener('mouseenter', () => {
            card.style.background = 'rgba(198, 255, 187, 0.1)';
            card.style.borderColor = COLORS.mint;
        });
        card.addEventListener('mouseleave', () => {
            card.style.background = 'rgba(198, 255, 187, 0.06)';
            card.style.borderColor = hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.15)';
        });
        card.addEventListener('click', () => openGroupModal(grp));

        // Rules badge
        const isRequired = grp.min_selections > 0;
        const ruleText = grp.min_selections === grp.max_selections && grp.min_selections === 1
            ? 'Pick 1'
            : `${grp.min_selections}–${grp.max_selections}`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-family: var(--font-body); font-size: 25px; font-weight: bold; color: ${COLORS.mint};">${grp.name}</div>
                <div style="display: flex; gap: 8px;">
                    <span style="padding: 4px 10px; background: ${isRequired ? COLORS.mintDim : 'rgba(198, 255, 187, 0.05)'}; border-radius: 6px; font-family: var(--font-body); font-size: 16px; color: ${isRequired ? COLORS.mint : COLORS.grey};">${isRequired ? 'Required' : 'Optional'}</span>
                    <span style="padding: 4px 10px; background: ${COLORS.yellowFaded}; border-radius: 6px; font-family: var(--font-body); font-size: 16px; color: ${COLORS.yellow};">${ruleText}</span>
                </div>
            </div>
            <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-bottom: 10px;">
                Template: ${tmpl ? tmpl.name : 'None'}
            </div>
            <div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mintFaded};">
                ${modNames.slice(0, 5).join(', ')}${modNames.length > 5 ? ` +${modNames.length - 5} more` : ''}
            </div>
            ${Object.keys(grp.option_prices || {}).length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
                    ${Object.entries(grp.option_prices).map(([optId, price]) => {
                        const opt = getAllWorking('options').find(o => o.id === optId);
                        return opt ? `<span style="padding: 3px 8px; background: rgba(251, 222, 66, 0.1); border-radius: 4px; font-family: var(--font-body); font-size: 16px; color: ${COLORS.yellow};">${opt.name} ${formatPrice(price)}</span>` : '';
                    }).join('')}
                </div>
            ` : ''}
        `;
        container.appendChild(card);
    });
}

/* ==========================================
   TAB 3: ASSIGNMENTS
   Top: Mandatory Modifiers
   Bottom: Universal Group Assignments
   ========================================== */
function buildAssignmentsTab(container) {
    // --- MANDATORY MODIFIERS ---
    buildSectionHeader(container, 'Mandatory Modifiers', 'Direct mod-to-item/category — blooms in hex nav, gates item entry', () => openMandatoryModal());

    const mandList = document.createElement('div');
    mandList.id = 'mandatory-list';
    container.appendChild(mandList);
    renderMandatoryList();

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.cssText = `height: 40px; border-bottom: 2px solid rgba(198, 255, 187, 0.1); margin-bottom: 32px;`;
    container.appendChild(spacer);

    // --- UNIVERSAL ASSIGNMENTS ---
    buildSectionHeader(container, 'Universal Group Assignments', 'Attach modifier groups to categories — accessible via MOD action', () => openUniversalModal());

    const univList = document.createElement('div');
    univList.id = 'universal-list';
    container.appendChild(univList);
    renderUniversalList();
}

function renderMandatoryList() {
    const container = document.getElementById('mandatory-list');
    if (!container) return;
    container.innerHTML = '';

    const assignments = getAllWorking('mandatory_assignments');
    const allMods = getAllWorking('modifiers');

    if (assignments.length === 0) {
        container.innerHTML = `<div style="color: ${COLORS.grey}; font-family: var(--font-body); font-size: 20px; padding: 20px; font-style: italic;">No mandatory modifiers configured</div>`;
        return;
    }

    assignments.forEach(asgn => {
        const hasPending = pendingChanges.mandatory.some(p => p.id === asgn.id);
        const modNames = asgn.modifier_ids
            .map(id => allMods.find(m => m.id === id))
            .filter(Boolean)
            .map(m => m.name);

        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(198, 255, 187, 0.06);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.15)'};
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        card.addEventListener('mouseenter', () => { card.style.background = 'rgba(198, 255, 187, 0.1)'; });
        card.addEventListener('mouseleave', () => { card.style.background = 'rgba(198, 255, 187, 0.06)'; });
        card.addEventListener('click', () => openMandatoryModal(asgn));

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="padding: 5px 14px; background: ${COLORS.mintDim}; border: 1px solid ${COLORS.mint}; border-radius: 8px; font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; font-weight: bold;">MANDATORY</span>
                    <span style="font-family: var(--font-body); font-size: 25px; font-weight: bold; color: ${COLORS.mint};">${asgn.label}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="padding: 4px 12px; background: ${COLORS.yellowFaded}; border-radius: 6px; font-family: var(--font-body); font-size: 18px; color: ${COLORS.yellow};">
                        ${asgn.target_type === 'category' ? '📂' : '📄'} ${asgn.target_name}
                    </span>
                    <span style="padding: 4px 12px; background: rgba(198, 255, 187, 0.05); border-radius: 6px; font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey};">
                        ${asgn.select_mode === 'single' ? 'Pick 1' : 'Pick Many'}
                    </span>
                </div>
            </div>
            <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-bottom: 10px;">
                Blooms in hex nav when item is selected — server must choose before item is added to check
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${modNames.map(n => `<span style="padding: 4px 10px; background: ${COLORS.mintDim}; border-radius: 6px; font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};">${n}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

function renderUniversalList() {
    const container = document.getElementById('universal-list');
    if (!container) return;
    container.innerHTML = '';

    const assignments = getAllWorking('universal_assignments');
    const allGroups = getAllWorking('groups');

    if (assignments.length === 0) {
        container.innerHTML = `<div style="color: ${COLORS.grey}; font-family: var(--font-body); font-size: 20px; padding: 20px; font-style: italic;">No universal group assignments configured</div>`;
        return;
    }

    assignments.forEach(asgn => {
        const hasPending = pendingChanges.universal.some(p => p.id === asgn.id);
        const grpNames = asgn.group_ids
            .map(id => allGroups.find(g => g.id === id))
            .filter(Boolean)
            .map(g => g.name);

        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(198, 255, 187, 0.06);
            border: 1px solid ${hasPending ? COLORS.yellow : 'rgba(198, 255, 187, 0.15)'};
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        card.addEventListener('mouseenter', () => { card.style.background = 'rgba(198, 255, 187, 0.1)'; });
        card.addEventListener('mouseleave', () => { card.style.background = 'rgba(198, 255, 187, 0.06)'; });
        card.addEventListener('click', () => openUniversalModal(asgn));

        const cat = modData.categories.find(c => c.id === asgn.category_id);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-size: 28px;">${cat ? cat.emoji : '📂'}</span>
                    <span style="font-family: var(--font-body); font-size: 25px; font-weight: bold; color: ${COLORS.mint};">${asgn.category_name}</span>
                    <span style="padding: 5px 14px; background: ${COLORS.yellowFaded}; border: 1px solid ${COLORS.yellow}; border-radius: 8px; font-family: var(--font-body); font-size: 18px; color: ${COLORS.yellow};">UNIVERSAL</span>
                </div>
            </div>
            <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-bottom: 10px;">
                Available through MOD action on the check for all items in this category
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${grpNames.map(n => `<span style="padding: 6px 14px; background: rgba(198, 255, 187, 0.06); border: 1px solid rgba(198, 255, 187, 0.2); border-radius: 8px; font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint};">${n}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

/* ==========================================
   SHARED UI COMPONENTS
   ========================================== */
function buildSectionHeader(container, title, subtitle, onAdd) {
    const row = document.createElement('div');
    row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    `;

    row.innerHTML = `
        <div>
            <div style="font-family: var(--font-display); font-size: 28px; color: ${COLORS.yellow}; padding-bottom: 4px;">${title}</div>
            <div style="font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey};">${subtitle}</div>
        </div>
    `;

    const addBtn = document.createElement('button');
    addBtn.style.cssText = `
        padding: 10px 20px;
        background: ${COLORS.mint};
        color: ${COLORS.dark};
        border: none;
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 22px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('mouseenter', () => { addBtn.style.background = COLORS.mintHover; });
    addBtn.addEventListener('mouseleave', () => { addBtn.style.background = COLORS.mint; });
    addBtn.addEventListener('click', onAdd);
    row.appendChild(addBtn);

    container.appendChild(row);
}

function buildSearchInput(container, value, onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search...';
    input.value = value;
    input.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        background: rgba(198, 255, 187, 0.08);
        border: 1px solid rgba(198, 255, 187, 0.2);
        border-radius: 8px;
        color: ${COLORS.mint};
        font-family: var(--font-body);
        font-size: 22px;
        outline: none;
        margin-bottom: 16px;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
    `;
    input.addEventListener('focus', () => { input.style.borderColor = COLORS.mint; });
    input.addEventListener('blur', () => { input.style.borderColor = 'rgba(198, 255, 187, 0.2)'; });
    input.addEventListener('input', (e) => onChange(e.target.value));
    container.appendChild(input);
    return input;
}

function buildSmallButton(label, onClick, isDanger = false) {
    const btn = document.createElement('button');
    btn.style.cssText = `
        padding: 6px 16px;
        background: ${isDanger ? COLORS.redFaded : 'rgba(198, 255, 187, 0.08)'};
        border: 1px solid ${isDanger ? COLORS.red : 'rgba(198, 255, 187, 0.2)'};
        border-radius: 6px;
        color: ${isDanger ? COLORS.red : COLORS.mint};
        font-family: var(--font-body);
        font-size: 18px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    btn.textContent = label;
    btn.addEventListener('mouseenter', () => {
        btn.style.background = isDanger ? 'rgba(255,51,51,0.4)' : 'rgba(198,255,187,0.15)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.background = isDanger ? COLORS.redFaded : 'rgba(198,255,187,0.08)';
    });
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return btn;
}

/* ==========================================
   MODAL SYSTEM
   ========================================== */
function openModal(titleText, contentBuilder) {
    const overlay = document.createElement('div');
    overlay.id = 'mod-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: ${COLORS.dark};
        border: 2px solid ${COLORS.yellow};
        border-radius: 12px;
        width: 600px;
        max-height: 85vh;
        overflow-y: auto;
        padding: 0;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(198, 255, 187, 0.15);
    `;
    header.innerHTML = `<div style="font-family: var(--font-display); font-size: 28px; color: ${COLORS.yellow};">${titleText}</div>`;

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `background: none; border: none; color: ${COLORS.grey}; font-size: 30px; cursor: pointer; padding: 4px 8px; line-height: 1;`;
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => closeModal());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Content
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
    const overlay = document.getElementById('mod-modal-overlay');
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
        transition: border-color 0.2s ease;
    `;

    let input;
    if (type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
        input.style.cssText = inputStyle + 'resize: vertical;';
    } else {
        input = document.createElement('input');
        input.type = type || 'text';
        input.style.cssText = inputStyle;
    }
    input.value = value || '';
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener('focus', () => { input.style.borderColor = COLORS.mint; });
    input.addEventListener('blur', () => { input.style.borderColor = 'rgba(198, 255, 187, 0.25)'; });

    group.appendChild(input);
    container.appendChild(group);
    return input;
}

function buildModalFooter(container, onSave, saveLabel = 'Save') {
    const footer = document.createElement('div');
    footer.style.cssText = `
        display: flex; justify-content: flex-end; gap: 12px;
        margin-top: 28px; padding-top: 20px;
        border-top: 1px solid rgba(198, 255, 187, 0.1);
    `;

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

/* Build a multi-select checkbox list */
function buildCheckboxList(container, label, items, selectedIds, opts = {}) {
    const group = document.createElement('div');
    group.style.cssText = `margin-bottom: 20px;`;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 10px;`;
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const listBox = document.createElement('div');
    listBox.style.cssText = `
        max-height: 240px;
        overflow-y: auto;
        border: 1px solid rgba(198, 255, 187, 0.15);
        border-radius: 8px;
        padding: 8px;
    `;

    const selected = new Set(selectedIds);

    items.forEach(item => {
        const row = document.createElement('label');
        row.style.cssText = `
            display: flex; align-items: center; gap: 12px;
            padding: 8px 12px; cursor: pointer; border-radius: 6px;
            transition: background 0.15s ease;
        `;
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(198, 255, 187, 0.06)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selected.has(item.id);
        cb.style.cssText = `width: 20px; height: 20px; accent-color: ${COLORS.mint}; cursor: pointer;`;
        cb.addEventListener('change', () => {
            if (cb.checked) selected.add(item.id);
            else selected.delete(item.id);
        });
        row.appendChild(cb);

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `font-family: var(--font-body); font-size: 22px; color: ${COLORS.mint};`;
        nameSpan.textContent = item.display || item.name;
        row.appendChild(nameSpan);

        if (item.extra) {
            const extraSpan = document.createElement('span');
            extraSpan.style.cssText = `font-family: var(--font-body); font-size: 18px; color: ${COLORS.grey}; margin-left: auto;`;
            extraSpan.textContent = item.extra;
            row.appendChild(extraSpan);
        }

        listBox.appendChild(row);
    });

    group.appendChild(listBox);
    container.appendChild(group);

    return { getSelected: () => [...selected] };
}

/* ==========================================
   MODALS: ADD/EDIT
   ========================================== */

function openModifierModal(existing) {
    const isEdit = !!existing;
    openModal(isEdit ? 'Edit Modifier' : 'Add Modifier', (content) => {
        const nameInput = buildModalField(content, 'Name', 'text', existing?.name || '', { required: true, placeholder: 'e.g. Cheese, Medium Rare...' });
        const priceInput = buildModalField(content, 'Base Price', 'number', existing?.base_price ?? '0.00', { required: true });

        buildModalFooter(content, () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.style.borderColor = COLORS.red; return; }

            const item = {
                id: existing?.id || `mod_${Date.now()}`,
                name,
                base_price: parseFloat(priceInput.value) || 0,
                active: existing?.active ?? true,
            };
            trackChange('modifiers', item);
            closeModal();
            renderModifierList();
        }, isEdit ? 'Save' : 'Create');
    });
}

function openOptionModal(existing) {
    const isEdit = !!existing;
    openModal(isEdit ? 'Edit Option' : 'Add Option', (content) => {
        const nameInput = buildModalField(content, 'Name', 'text', existing?.name || '', { required: true, placeholder: 'e.g. Double, Half Portion...' });

        buildModalFooter(content, () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.style.borderColor = COLORS.red; return; }

            const item = {
                id: existing?.id || `opt_${Date.now()}`,
                name,
                is_default: existing?.is_default || false,
                active: true,
            };
            trackChange('options', item);
            closeModal();
            renderOptionList();
        }, isEdit ? 'Save' : 'Create');
    });
}

function openTemplateModal(existing) {
    const isEdit = !!existing;
    const allOptions = getAllWorking('options');

    openModal(isEdit ? 'Edit Template' : 'Add Template', (content) => {
        const nameInput = buildModalField(content, 'Template Name', 'text', existing?.name || '', { required: true, placeholder: 'e.g. Standard Quantity...' });
        const descInput = buildModalField(content, 'Description', 'textarea', existing?.description || '', { placeholder: 'When to use this template...' });

        const cbList = buildCheckboxList(content, 'Select Options', allOptions, existing?.option_ids || []);

        buildModalFooter(content, () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.style.borderColor = COLORS.red; return; }

            const item = {
                id: existing?.id || `tmpl_${Date.now()}`,
                name,
                description: descInput.value.trim(),
                option_ids: cbList.getSelected(),
                active: true,
            };
            trackChange('templates', item);
            closeModal();
            renderTemplateGrid();
        }, isEdit ? 'Save' : 'Create');
    });
}

function openGroupModal(existing) {
    const isEdit = !!existing;
    const allMods = getAllWorking('modifiers');
    const allTemplates = getAllWorking('templates');
    const allOptions = getAllWorking('options');

    openModal(isEdit ? 'Edit Modifier Group' : 'Add Modifier Group', (content) => {
        const nameInput = buildModalField(content, 'Group Name', 'text', existing?.name || '', { required: true, placeholder: 'e.g. Burger Toppings...' });

        // Modifier multi-select
        const modItems = allMods.map(m => ({ id: m.id, name: m.name, extra: formatBasePrice(m.base_price) }));
        const modCb = buildCheckboxList(content, 'Select Modifiers', modItems, existing?.modifier_ids || []);

        // Template dropdown
        const tmplGroup = document.createElement('div');
        tmplGroup.style.cssText = `margin-bottom: 20px;`;
        tmplGroup.innerHTML = `<div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 6px;">Option Template</div>`;

        const tmplSelect = document.createElement('select');
        tmplSelect.style.cssText = `
            width: 100%; padding: 12px 14px;
            background: rgba(198, 255, 187, 0.08);
            border: 1px solid rgba(198, 255, 187, 0.25);
            border-radius: 8px; color: ${COLORS.white};
            font-family: var(--font-body); font-size: 22px;
            cursor: pointer; outline: none;
        `;
        tmplSelect.innerHTML = `<option value="" style="background: ${COLORS.dark};">None (Direct Select)</option>`;
        allTemplates.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            opt.style.background = COLORS.dark;
            if (existing?.template_id === t.id) opt.selected = true;
            tmplSelect.appendChild(opt);
        });
        tmplGroup.appendChild(tmplSelect);
        content.appendChild(tmplGroup);

        // Option pricing area (dynamic based on template selection)
        const pricingArea = document.createElement('div');
        pricingArea.id = 'group-option-pricing';
        content.appendChild(pricingArea);

        function renderOptionPricing() {
            pricingArea.innerHTML = '';
            const selectedTmplId = tmplSelect.value;
            if (!selectedTmplId) return;

            const tmpl = allTemplates.find(t => t.id === selectedTmplId);
            if (!tmpl) return;

            const pricingLabel = document.createElement('div');
            pricingLabel.style.cssText = `font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 10px;`;
            pricingLabel.textContent = 'Option Prices (for this group)';
            pricingArea.appendChild(pricingLabel);

            tmpl.option_ids.forEach(optId => {
                const opt = allOptions.find(o => o.id === optId);
                if (!opt) return;

                const row = document.createElement('div');
                row.style.cssText = `
                    display: flex; align-items: center; gap: 14px;
                    margin-bottom: 8px; padding: 8px 12px;
                    background: rgba(198, 255, 187, 0.04);
                    border-radius: 6px;
                `;

                const nameEl = document.createElement('span');
                nameEl.style.cssText = `font-family: var(--font-body); font-size: 22px; color: ${COLORS.mint}; width: 140px;`;
                nameEl.textContent = opt.name;
                row.appendChild(nameEl);

                const priceInput = document.createElement('input');
                priceInput.type = 'number';
                priceInput.step = '0.01';
                priceInput.value = existing?.option_prices?.[optId] ?? 0;
                priceInput.dataset.optionId = optId;
                priceInput.className = 'opt-price-input';
                priceInput.style.cssText = `
                    width: 120px; padding: 8px 12px;
                    background: rgba(198, 255, 187, 0.08);
                    border: 1px solid rgba(198, 255, 187, 0.25);
                    border-radius: 6px; color: ${COLORS.yellow};
                    font-family: var(--font-body); font-size: 22px;
                    text-align: center; outline: none;
                `;
                row.appendChild(priceInput);

                pricingArea.appendChild(row);
            });
        }

        tmplSelect.addEventListener('change', renderOptionPricing);
        renderOptionPricing();

        // Min / Max
        const minMaxRow = document.createElement('div');
        minMaxRow.style.cssText = `display: flex; gap: 20px; margin-top: 4px;`;

        const minGroup = document.createElement('div');
        minGroup.style.cssText = `flex: 1;`;
        const minInput = buildModalField(minGroup, 'Min Selections', 'number', existing?.min_selections ?? 0);
        minMaxRow.appendChild(minGroup);

        const maxGroup = document.createElement('div');
        maxGroup.style.cssText = `flex: 1;`;
        const maxInput = buildModalField(maxGroup, 'Max Selections', 'number', existing?.max_selections ?? 10);
        minMaxRow.appendChild(maxGroup);

        content.appendChild(minMaxRow);

        buildModalFooter(content, () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.style.borderColor = COLORS.red; return; }

            // Collect option prices
            const optPrices = {};
            pricingArea.querySelectorAll('.opt-price-input').forEach(inp => {
                optPrices[inp.dataset.optionId] = parseFloat(inp.value) || 0;
            });

            const item = {
                id: existing?.id || `grp_${Date.now()}`,
                name,
                modifier_ids: modCb.getSelected(),
                template_id: tmplSelect.value || null,
                min_selections: parseInt(minInput.value) || 0,
                max_selections: parseInt(maxInput.value) || 10,
                option_prices: optPrices,
                active: true,
            };
            trackChange('groups', item);
            closeModal();
            renderGroupGrid();
        }, isEdit ? 'Save' : 'Create');
    });
}

function openMandatoryModal(existing) {
    const isEdit = !!existing;
    const allMods = getAllWorking('modifiers');

    openModal(isEdit ? 'Edit Mandatory Modifier' : 'Add Mandatory Modifier', (content) => {
        const labelInput = buildModalField(content, 'Label', 'text', existing?.label || '', { required: true, placeholder: 'e.g. Cooking Temperature, Side Choice...' });

        // Target type
        const typeGroup = document.createElement('div');
        typeGroup.style.cssText = `margin-bottom: 20px;`;
        typeGroup.innerHTML = `<div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 10px;">Assign To</div>`;

        const typeRow = document.createElement('div');
        typeRow.style.cssText = `display: flex; gap: 10px; margin-bottom: 12px;`;

        let selectedType = existing?.target_type || 'category';

        ['category', 'item'].forEach(type => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                flex: 1; padding: 12px;
                background: ${selectedType === type ? COLORS.mintDim : 'transparent'};
                border: 2px solid ${selectedType === type ? COLORS.mint : 'rgba(198, 255, 187, 0.15)'};
                border-radius: 8px;
                color: ${selectedType === type ? COLORS.mint : COLORS.grey};
                font-family: var(--font-body); font-size: 22px;
                cursor: pointer; transition: all 0.2s ease;
            `;
            btn.textContent = type === 'category' ? '📂 Category' : '📄 Item';
            btn.addEventListener('click', () => {
                selectedType = type;
                typeRow.querySelectorAll('button').forEach(b => {
                    const isActive = b.textContent.includes(type === 'category' ? 'Category' : 'Item');
                    b.style.background = isActive ? COLORS.mintDim : 'transparent';
                    b.style.borderColor = isActive ? COLORS.mint : 'rgba(198, 255, 187, 0.15)';
                    b.style.color = isActive ? COLORS.mint : COLORS.grey;
                });
            });
            typeRow.appendChild(btn);
        });
        typeGroup.appendChild(typeRow);

        // Target dropdown
        const targetSelect = document.createElement('select');
        targetSelect.style.cssText = `
            width: 100%; padding: 12px 14px;
            background: rgba(198, 255, 187, 0.08);
            border: 1px solid rgba(198, 255, 187, 0.25);
            border-radius: 8px; color: ${COLORS.white};
            font-family: var(--font-body); font-size: 22px;
            cursor: pointer; outline: none;
        `;
        modData.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.emoji} ${cat.name}`;
            opt.style.background = COLORS.dark;
            if (existing?.target_id === cat.id) opt.selected = true;
            targetSelect.appendChild(opt);
        });
        typeGroup.appendChild(targetSelect);
        content.appendChild(typeGroup);

        // Modifier multi-select
        const modItems = allMods.map(m => ({ id: m.id, name: m.name }));
        const modCb = buildCheckboxList(content, 'Select Modifiers (blooms in hex nav)', modItems, existing?.modifier_ids || []);

        // Select mode
        const modeGroup = document.createElement('div');
        modeGroup.style.cssText = `margin-bottom: 20px;`;
        modeGroup.innerHTML = `<div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 10px;">Selection Mode</div>`;

        let selectedMode = existing?.select_mode || 'single';
        const modeRow = document.createElement('div');
        modeRow.style.cssText = `display: flex; gap: 10px;`;

        ['single', 'multi'].forEach(mode => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                flex: 1; padding: 12px;
                background: ${selectedMode === mode ? COLORS.mintDim : 'transparent'};
                border: 2px solid ${selectedMode === mode ? COLORS.mint : 'rgba(198, 255, 187, 0.15)'};
                border-radius: 8px;
                color: ${selectedMode === mode ? COLORS.mint : COLORS.grey};
                font-family: var(--font-body); font-size: 22px;
                cursor: pointer; transition: all 0.2s ease;
            `;
            btn.textContent = mode === 'single' ? 'Pick 1 (e.g. temp)' : 'Pick Many (e.g. sides)';
            btn.addEventListener('click', () => {
                selectedMode = mode;
                modeRow.querySelectorAll('button').forEach(b => {
                    const isActive = (mode === 'single' && b.textContent.includes('Pick 1')) ||
                                     (mode === 'multi' && b.textContent.includes('Pick Many'));
                    b.style.background = isActive ? COLORS.mintDim : 'transparent';
                    b.style.borderColor = isActive ? COLORS.mint : 'rgba(198, 255, 187, 0.15)';
                    b.style.color = isActive ? COLORS.mint : COLORS.grey;
                });
            });
            modeRow.appendChild(btn);
        });
        modeGroup.appendChild(modeRow);
        content.appendChild(modeGroup);

        buildModalFooter(content, () => {
            const label = labelInput.value.trim();
            if (!label) { labelInput.style.borderColor = COLORS.red; return; }

            const selectedCat = modData.categories.find(c => c.id === targetSelect.value);
            const item = {
                id: existing?.id || `mand_${Date.now()}`,
                target_type: selectedType,
                target_id: targetSelect.value,
                target_name: selectedCat ? selectedCat.name : targetSelect.value,
                label,
                modifier_ids: modCb.getSelected(),
                select_mode: selectedMode,
            };
            trackChange('mandatory', item);
            closeModal();
            renderMandatoryList();
        }, isEdit ? 'Save' : 'Create');
    });
}

function openUniversalModal(existing) {
    const isEdit = !!existing;
    const allGroups = getAllWorking('groups');

    openModal(isEdit ? 'Edit Universal Assignment' : 'Add Universal Assignment', (content) => {
        // Category dropdown
        const catGroup = document.createElement('div');
        catGroup.style.cssText = `margin-bottom: 20px;`;
        catGroup.innerHTML = `<div style="font-family: var(--font-body); font-size: 20px; color: ${COLORS.mint}; margin-bottom: 6px;">Category</div>`;

        const catSelect = document.createElement('select');
        catSelect.style.cssText = `
            width: 100%; padding: 12px 14px;
            background: rgba(198, 255, 187, 0.08);
            border: 1px solid rgba(198, 255, 187, 0.25);
            border-radius: 8px; color: ${COLORS.white};
            font-family: var(--font-body); font-size: 22px;
            cursor: pointer; outline: none;
        `;
        modData.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.emoji} ${cat.name}`;
            opt.style.background = COLORS.dark;
            if (existing?.category_id === cat.id) opt.selected = true;
            catSelect.appendChild(opt);
        });
        catGroup.appendChild(catSelect);
        content.appendChild(catGroup);

        // Group multi-select
        const grpItems = allGroups.map(g => ({ id: g.id, name: g.name }));
        const grpCb = buildCheckboxList(content, 'Select Modifier Groups (available via MOD action)', grpItems, existing?.group_ids || []);

        buildModalFooter(content, () => {
            const selectedCat = modData.categories.find(c => c.id === catSelect.value);
            const item = {
                id: existing?.id || `univ_${Date.now()}`,
                category_id: catSelect.value,
                category_name: selectedCat ? selectedCat.name : catSelect.value,
                group_ids: grpCb.getSelected(),
            };
            trackChange('universal', item);
            closeModal();
            renderUniversalList();
        }, isEdit ? 'Save' : 'Create');
    });
}

/* ==========================================
   DELETE HANDLER
   ========================================== */
function handleDeleteItem(collection, id) {
    showConfirmDialog('Delete?', 'This will remove the item. Unsaved until you click Save Changes.', 'Delete', () => {
        // Remove from base data copy
        modData[collection] = modData[collection].filter(i => i.id !== id);
        // Remove from pending too if it was a new addition
        pendingChanges[collection] = pendingChanges[collection].filter(i => i.id !== id);
        // Track as a deletion event
        trackChange(collection, { id, _deleted: true });
        buildMainView(currentWrapper);
    });
}

/* ==========================================
   FOOTER: CHANGE TRACKER
   ========================================== */
function updateFooter() {
    const footer = document.getElementById('mod-change-footer');
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
    cancelBtn.style.cssText = `padding: 12px 24px; background: transparent; border: 1px solid ${COLORS.grey}; border-radius: 8px; color: ${COLORS.grey}; font-family: var(--font-body); font-size: 22px; cursor: pointer; transition: all 0.2s ease;`;
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.borderColor = COLORS.red; cancelBtn.style.color = COLORS.red; });
    cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.borderColor = COLORS.grey; cancelBtn.style.color = COLORS.grey; });
    cancelBtn.addEventListener('click', () => {
        showConfirmDialog('Discard Changes?', `You have ${count} unsaved change${count !== 1 ? 's' : ''}. This cannot be undone.`, 'Discard', () => {
            pendingChanges = { modifiers: [], options: [], templates: [], groups: [], mandatory: [], universal: [] };
            modData = clone(TEST_DATA);
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
    const batch_id = `modifier_batch_${Date.now()}`;
    const ts = new Date().toISOString();

    // Generate events for each change type
    Object.entries(pendingChanges).forEach(([key, items]) => {
        items.forEach(item => {
            if (item._deleted) {
                events.push({ event_type: `modifier.${key}_deleted`, batch_id, timestamp: ts, payload: { id: item.id } });
            } else {
                const exists = TEST_DATA[key === 'mandatory' ? 'mandatory_assignments' : key === 'universal' ? 'universal_assignments' : key]?.some(i => i.id === item.id);
                events.push({
                    event_type: `modifier.${key}_${exists ? 'updated' : 'created'}`,
                    batch_id, timestamp: ts,
                    payload: item,
                });
            }
        });
    });

    console.log('%c[KINDpos] Modifier Events Generated', 'background: #333; color: #FBDE42; font-size: 14px; padding: 2px 8px;');
    console.log(`Batch contains ${events.length} events:`);
    events.forEach((evt, i) => {
        console.log(`  ${i + 1}. ${evt.event_type} — ${JSON.stringify(evt.payload).substring(0, 100)}`);
    });

    // Apply pending to base data
    Object.entries(pendingChanges).forEach(([key, items]) => {
        const dataKey = key === 'mandatory' ? 'mandatory_assignments' : key === 'universal' ? 'universal_assignments' : key;
        items.forEach(item => {
            if (item._deleted) {
                modData[dataKey] = modData[dataKey].filter(i => i.id !== item.id);
            } else {
                const idx = modData[dataKey].findIndex(i => i.id === item.id);
                if (idx !== -1) modData[dataKey][idx] = clone(item);
                else modData[dataKey].push(clone(item));
            }
        });
    });

    pendingChanges = { modifiers: [], options: [], templates: [], groups: [], mandatory: [], universal: [] };
    buildMainView(currentWrapper);
    showToast(`${events.length} change${events.length !== 1 ? 's' : ''} saved successfully`);
}

/* ==========================================
   CONFIRM DIALOG (themed)
   ========================================== */
function showConfirmDialog(title, message, confirmLabel, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.75); z-index: 300;
        display: flex; align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: ${COLORS.dark}; border: 2px solid ${COLORS.red};
        border-radius: 12px; padding: 32px; width: 420px; text-align: center;
    `;
    dialog.innerHTML = `
        <div style="font-family: var(--font-display); font-size: 28px; color: ${COLORS.red}; margin-bottom: 16px;">${title}</div>
        <div style="font-family: var(--font-body); font-size: 22px; color: ${COLORS.grey}; margin-bottom: 28px; line-height: 1.5;">${message}</div>
    `;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = `display: flex; gap: 12px; justify-content: center;`;

    const keepBtn = document.createElement('button');
    keepBtn.style.cssText = `padding: 12px 28px; background: transparent; border: 1px solid ${COLORS.mint}; border-radius: 8px; color: ${COLORS.mint}; font-family: var(--font-body); font-size: 22px; cursor: pointer; transition: all 0.2s ease;`;
    keepBtn.textContent = 'Keep Editing';
    keepBtn.addEventListener('click', () => overlay.remove());
    btnRow.appendChild(keepBtn);

    const discardBtn = document.createElement('button');
    discardBtn.style.cssText = `padding: 12px 28px; background: ${COLORS.redFaded}; border: 2px solid ${COLORS.red}; border-radius: 8px; color: ${COLORS.white}; font-family: var(--font-body); font-size: 22px; font-weight: bold; cursor: pointer; transition: all 0.2s ease;`;
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
    toast.style.cssText = `
        position: fixed; top: 24px; right: 24px;
        padding: 16px 28px; background: ${COLORS.mint};
        color: ${COLORS.dark}; font-family: var(--font-body);
        font-size: 22px; font-weight: bold; border-radius: 8px;
        z-index: 200; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    toast.textContent = `✓ ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/* ==========================================
   PUBLIC: Register scene
   ========================================== */
export function registerConfigureModifiers(sceneManager) {
    sceneManager.register('modifier-groups', {
        type: 'detail',
        title: 'Configure Modifiers',
        parent: 'menu-subs',
        onEnter(container) {
            console.log('[ConfigureModifiers] Scene loaded — initializing...');

            modData = clone(TEST_DATA);
            pendingChanges = { modifiers: [], options: [], templates: [], groups: [], mandatory: [], universal: [] };
            activeTab = 'master';
            searchState = { modifiers: '', options: '' };

            currentWrapper = document.createElement('div');
            currentWrapper.style.cssText = `
                max-width: 1100px;
                margin: 0 auto;
                padding: 10px 20px 40px 20px;
            `;
            container.appendChild(currentWrapper);

            buildMainView(currentWrapper);

            console.log(`[ConfigureModifiers] Loaded ${modData.modifiers.length} modifiers, ${modData.options.length} options, ${modData.templates.length} templates, ${modData.groups.length} groups.`);
            console.log('[ConfigureModifiers] Ready.');
        },
        onExit(container) {
            currentWrapper = null;
            modData = null;
            pendingChanges = { modifiers: [], options: [], templates: [], groups: [], mandatory: [], universal: [] };
            container.innerHTML = '';
            closeModal();
        },
    });
}