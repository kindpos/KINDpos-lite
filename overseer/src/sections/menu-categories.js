import { pushChanges } from '../services/config-push.js';

/* ============================================
   KINDpos Overseer - Menu Categories & Items
   Browse, Add, Edit, Duplicate, Delete

   "Local-first editing with batch event
   generation. Make all your changes, then
   commit when you're ready."

   Nice. Dependable. Yours.
   ============================================ */

/* ------------------------------------------
   COLORS (consistent with Overseer palette)
------------------------------------------ */
const COLORS = {
    mint:       'var(--color-mint)',
    mintHover:  '#d4ffca',
    mintFaded:  'rgba(var(--color-mint-rgb), 0.8)',
    mintGhost:  'rgba(var(--color-mint-rgb), 0.4)',
    yellow:     'var(--color-gold)',
    yellowFaded:'rgba(var(--color-gold-rgb), 0.4)',
    red:        'var(--color-vermillion)',
    redFaded:   'rgba(var(--color-vermillion-rgb), 0.3)',
    dark:       'var(--color-bg)',
    grey:       '#999999',
    white:      '#FFFFFF',
};

/* ------------------------------------------
   MENU DATA (fetched from /api/v1/config/menu/*)
------------------------------------------ */
async function fetchMenuData() {
    try {
        const [catRes, itemRes] = await Promise.all([
            fetch('/api/v1/config/menu/categories'),
            fetch('/api/v1/config/menu/items'),
        ]);
        const categories = catRes.ok ? await catRes.json() : [];
        const items = itemRes.ok ? await itemRes.json() : [];

        const cats = categories.map((c, i) => ({
            id: c.category_id || c.id || `cat_${i}`,
            name: c.name || c.label,
            emoji: '',
            display_order: c.display_order || i + 1,
            color: c.hex_color || c.color || null,
        }));

        // Build name→id lookup so items with category="Pizza" resolve to id="pizza"
        const nameToId = {};
        cats.forEach(c => {
            nameToId[c.name.toLowerCase()] = c.id;
            nameToId[c.id.toLowerCase()] = c.id;
        });

        const resolveCategory = (raw) => {
            if (!raw) return '';
            return nameToId[raw.toLowerCase()] || raw;
        };

        return {
            categories: cats,
            items: items.map((item, i) => ({
                id: item.item_id || item.id || `item_${i}`,
                name: item.name,
                price: parseFloat(item.price) || 0,
                description: item.description || '',
                category_id: resolveCategory(item.category_id || item.category),
                active: item.active !== false,
                display_order: item.display_order || i + 1,
            })),
        };
    } catch (e) {
        console.warn('[MenuCategories] Failed to fetch menu data:', e);
        return { categories: [], items: [] };
    }
}

/* ------------------------------------------
   MODULE-LEVEL STATE
   These persist for the lifetime of the scene.
   Reset in onExit.
------------------------------------------ */
let currentWrapper = null;

/** Working copy of menu data (fetched from API on enter) */
let menuData = { categories: [], items: [] };

/** Tracks all uncommitted changes */
let pendingChanges = { new: [], edited: [], deleted: [] };

/** Display filters */
let displayState = { searchTerm: '', filterCategory: 'all' };

/* ------------------------------------------
   HELPERS
------------------------------------------ */

/** Deep-clone an object (simple JSON round-trip) */
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/** Get total count of pending changes */
function getPendingCount() {
    return pendingChanges.new.length
         + pendingChanges.edited.length
         + pendingChanges.deleted.length;
}

/** Get the working copy of an item (checks pending edits/new first) */
function getWorkingItem(itemId) {
    const inNew = pendingChanges.new.find(i => i.id === itemId);
    if (inNew) return inNew;

    const inEdited = pendingChanges.edited.find(i => i.id === itemId);
    if (inEdited) return inEdited;

    return menuData.items.find(i => i.id === itemId);
}

/** Get all working items (merges base data with pending changes) */
function getAllWorkingItems() {
    // Start with base items, apply edits, remove deleted, add new
    let items = menuData.items.map(item => {
        const edited = pendingChanges.edited.find(e => e.id === item.id);
        return edited ? edited : clone(item);
    });

    // Remove deleted
    items = items.filter(item => !pendingChanges.deleted.includes(item.id));

    // Add new items
    items = items.concat(pendingChanges.new);

    return items;
}

/** Format price with $ and 2 decimals */
function formatPrice(price) {
    return '$' + Number(price).toFixed(2);
}

/* ------------------------------------------
   RENDER: MAIN VIEW
   Header + Search + Card Grid + Footer
------------------------------------------ */
function buildMainView(wrapper) {
    wrapper.innerHTML = '';

    // --- HEADER ROW ---
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    `;
    header.innerHTML = `
        <div>
            <div style="
                font-family: var(--font-display);
                font-size: 34px;
                color: ${COLORS.yellow};
            ">Menu Categories & Items</div>
            <div style="
                font-family: var(--font-body);
                font-size: 18px;
                color: rgba(var(--color-mint-rgb), 0.5);
                margin-top: 4px;
            ">${menuData.categories.length} categories · ${menuData.items.length} items</div>
        </div>
    `;

    // + Add Category button
    const addCatBtn = document.createElement('button');
    addCatBtn.style.cssText = `
        padding: 12px 24px;
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
    addCatBtn.textContent = '+ Add Category';
    addCatBtn.addEventListener('mouseenter', () => {
        addCatBtn.style.background = COLORS.mintHover;
        addCatBtn.style.transform = 'translateY(-1px)';
    });
    addCatBtn.addEventListener('mouseleave', () => {
        addCatBtn.style.background = COLORS.mint;
        addCatBtn.style.transform = 'translateY(0)';
    });
    addCatBtn.addEventListener('click', () => openAddCategoryModal());
    header.appendChild(addCatBtn);
    wrapper.appendChild(header);

    // --- SEARCH / FILTER ROW ---
    const filterRow = document.createElement('div');
    filterRow.style.cssText = `
        display: flex;
        gap: 16px;
        align-items: center;
        margin-bottom: 24px;
    `;

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search items...';
    searchInput.value = displayState.searchTerm;
    searchInput.style.cssText = `
        flex: 1;
        padding: 12px 16px;
        background: rgba(var(--color-mint-rgb), 0.08);
        border: 1px solid rgba(var(--color-mint-rgb), 0.2);
        border-radius: 8px;
        color: ${COLORS.mint};
        font-family: var(--font-body);
        font-size: 22px;
        outline: none;
        transition: border-color 0.2s ease;
    `;
    searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = COLORS.mint;
    });
    searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = 'rgba(var(--color-mint-rgb), 0.2)';
    });
    searchInput.addEventListener('input', (e) => {
        displayState.searchTerm = e.target.value;
        renderCardGrid();
    });
    filterRow.appendChild(searchInput);

    // Category filter dropdown
    const filterSelect = document.createElement('select');
    filterSelect.style.cssText = `
        padding: 12px 16px;
        background: rgba(var(--color-mint-rgb), 0.08);
        border: 1px solid rgba(var(--color-mint-rgb), 0.2);
        border-radius: 8px;
        color: ${COLORS.mint};
        font-family: var(--font-body);
        font-size: 22px;
        cursor: pointer;
        outline: none;
    `;
    filterSelect.innerHTML = `<option value="all">All Categories</option>`;
    menuData.categories
        .sort((a, b) => a.display_order - b.display_order)
        .forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.emoji} ${cat.name}`;
            opt.style.background = COLORS.dark;
            if (displayState.filterCategory === cat.id) opt.selected = true;
            filterSelect.appendChild(opt);
        });
    filterSelect.addEventListener('change', (e) => {
        displayState.filterCategory = e.target.value;
        renderCardGrid();
    });
    filterRow.appendChild(filterSelect);
    wrapper.appendChild(filterRow);

    // --- CARD GRID CONTAINER ---
    const gridContainer = document.createElement('div');
    gridContainer.id = 'menu-card-grid';
    wrapper.appendChild(gridContainer);

    // --- FOOTER (change tracker) ---
    const footer = document.createElement('div');
    footer.id = 'menu-change-footer';
    footer.style.cssText = `
        position: sticky;
        bottom: 0;
        padding: 16px 32px;
        background: rgba(51, 51, 51, 0.97);
        border-top: 2px solid ${COLORS.yellow};
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 50;
        transition: all 0.3s ease;
        margin-top: 24px;
    `;
    wrapper.appendChild(footer);

    // Initial renders
    renderCardGrid();
    updateFooter();
}

/* ------------------------------------------
   RENDER: CARD GRID
   Groups items by category, applies filters
------------------------------------------ */
function renderCardGrid() {
    const container = document.getElementById('menu-card-grid');
    if (!container) return;

    container.innerHTML = '';

    const allItems = getAllWorkingItems();
    const categories = menuData.categories
        .sort((a, b) => a.display_order - b.display_order);

    // Filter by category
    const visibleCategories = displayState.filterCategory === 'all'
        ? categories
        : categories.filter(c => c.id === displayState.filterCategory);

    visibleCategories.forEach(cat => {
        let catItems = allItems.filter(item => item.category_id === cat.id);

        // Filter by search term
        if (displayState.searchTerm.trim()) {
            const term = displayState.searchTerm.toLowerCase().trim();
            catItems = catItems.filter(item =>
                item.name.toLowerCase().includes(term) ||
                (item.description && item.description.toLowerCase().includes(term))
            );
        }

        // Sort by display_order
        catItems.sort((a, b) => (a.display_order || 999) - (b.display_order || 999));

        // Skip empty categories when searching
        if (catItems.length === 0 && displayState.searchTerm.trim()) return;

        // --- Category Header ---
        const catHeader = document.createElement('div');
        catHeader.style.cssText = `
            font-family: var(--font-display);
            font-size: 34px;
            color: ${COLORS.yellow};
            margin: 32px 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 3px solid ${COLORS.yellow};
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        catHeader.innerHTML = `
            <span>${cat.emoji}</span>
            <span>${cat.name.toUpperCase()}</span>
            <span style="
                font-family: var(--font-body);
                font-size: 20px;
                color: ${COLORS.grey};
                margin-left: 8px;
            ">(${catItems.length} items)</span>
            <span style="flex: 1;"></span>
        `;
        const addItemBtn = document.createElement('button');
        addItemBtn.textContent = '+ Add Item';
        addItemBtn.style.cssText = `
            padding: 6px 14px; background: rgba(var(--color-mint-rgb), 0.1);
            border: 1px solid rgba(var(--color-mint-rgb), 0.25); border-radius: 6px;
            color: var(--color-mint); font-family: var(--font-body); font-size: 18px;
            cursor: pointer; transition: all 0.15s ease;
        `;
        addItemBtn.addEventListener('mouseenter', () => addItemBtn.style.background = 'rgba(var(--color-mint-rgb), 0.2)');
        addItemBtn.addEventListener('mouseleave', () => addItemBtn.style.background = 'rgba(var(--color-mint-rgb), 0.1)');
        addItemBtn.addEventListener('click', () => openAddModal(cat.id));
        catHeader.appendChild(addItemBtn);
        container.appendChild(catHeader);

        if (catItems.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = `
                color: ${COLORS.grey};
                font-family: var(--font-body);
                font-size: 22px;
                padding: 20px 0;
                font-style: italic;
            `;
            empty.textContent = 'No items in this category';
            container.appendChild(empty);
            return;
        }

        // --- Card Row (flex wrap) ---
        const cardRow = document.createElement('div');
        cardRow.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 16px;
        `;

        catItems.forEach(item => {
            const card = buildItemCard(item);
            cardRow.appendChild(card);
        });

        container.appendChild(cardRow);
    });
}

/* ------------------------------------------
   RENDER: SINGLE ITEM CARD
------------------------------------------ */
function buildItemCard(item) {
    const isNew = pendingChanges.new.some(i => i.id === item.id);
    const isEdited = pendingChanges.edited.some(i => i.id === item.id);
    const isDeleted = pendingChanges.deleted.includes(item.id);

    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.style.cssText = `
        background: ${isDeleted ? COLORS.redFaded : COLORS.mint};
        border: 2px ${isNew ? 'dashed' : 'solid'} ${isDeleted ? COLORS.red : (isEdited ? COLORS.yellow : COLORS.grey)};
        border-radius: 12px;
        padding: 20px;
        width: calc(33.333% - 14px);
        min-height: 200px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        opacity: ${isDeleted ? '0.6' : '1'};
    `;

    // Hover effects (only if not deleted)
    if (!isDeleted) {
        card.addEventListener('mouseenter', () => {
            card.style.background = COLORS.mintHover;
            card.style.borderColor = COLORS.yellow;
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 12px rgba(var(--color-mint-rgb), 0.3)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.background = COLORS.mint;
            card.style.borderColor = isEdited ? COLORS.yellow : COLORS.grey;
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        });
    }

    // --- Badge (NEW or PENDING DELETION) ---
    if (isNew || isDeleted) {
        const badge = document.createElement('div');
        badge.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 4px 10px;
            border-radius: 6px;
            font-family: var(--font-body);
            font-size: 16px;
            font-weight: bold;
            color: ${COLORS.white};
            background: ${isDeleted ? COLORS.red : '#2196F3'};
        `;
        badge.textContent = isDeleted ? 'PENDING DELETION' : 'NEW';
        card.appendChild(badge);
    }

    // --- Item Name ---
    const nameEl = document.createElement('div');
    nameEl.style.cssText = `
        font-family: var(--font-body);
        font-size: 25px;
        font-weight: bold;
        color: ${COLORS.dark};
        margin-bottom: 8px;
        ${isDeleted ? 'text-decoration: line-through;' : ''}
    `;
    nameEl.textContent = item.name;
    card.appendChild(nameEl);

    // --- Description (truncated) ---
    if (item.description) {
        const descEl = document.createElement('div');
        descEl.style.cssText = `
            font-family: var(--font-body);
            font-size: 20px;
            color: #555;
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            margin-bottom: 12px;
            flex: 1;
        `;
        descEl.textContent = item.description;
        card.appendChild(descEl);
    }

    // --- Bottom Row: Price + Edit ---
    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
    `;

    const priceEl = document.createElement('div');
    priceEl.style.cssText = `
        font-family: var(--font-body);
        font-size: 30px;
        font-weight: bold;
        color: ${COLORS.dark};
    `;
    priceEl.textContent = formatPrice(item.price);
    bottomRow.appendChild(priceEl);

    const editBtn = document.createElement('button');
    editBtn.style.cssText = `
        padding: 8px 20px;
        background: ${COLORS.dark};
        color: ${COLORS.mint};
        border: none;
        border-radius: 6px;
        font-family: var(--font-body);
        font-size: 20px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('mouseenter', () => {
        editBtn.style.background = '#555';
    });
    editBtn.addEventListener('mouseleave', () => {
        editBtn.style.background = COLORS.dark;
    });
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(item.id);
    });
    bottomRow.appendChild(editBtn);

    card.appendChild(bottomRow);

    // Click anywhere on card also opens edit
    card.addEventListener('click', () => {
        if (!isDeleted) {
            openEditModal(item.id);
        }
    });

    return card;
}

/* ------------------------------------------
   MODAL: OVERLAY SYSTEM
   Shared by Edit and Add modals
------------------------------------------ */
function openModal(titleText, contentBuilder) {
    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'menu-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.15s ease;
    `;

    // Modal box
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: ${COLORS.dark};
        border: 2px solid ${COLORS.yellow};
        border-radius: 12px;
        width: 560px;
        max-height: 85vh;
        overflow-y: auto;
        padding: 0;
        animation: slideUp 0.2s ease;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(var(--color-mint-rgb), 0.15);
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
        font-family: var(--font-display);
        font-size: 28px;
        color: ${COLORS.yellow};
    `;
    titleEl.textContent = titleText;
    header.appendChild(titleEl);

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: ${COLORS.grey};
        font-size: 30px;
        cursor: pointer;
        padding: 4px 8px;
        line-height: 1;
        transition: color 0.2s ease;
    `;
    closeBtn.textContent = '×';
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = COLORS.red; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = COLORS.grey; });
    closeBtn.addEventListener('click', () => closeModal());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Content area
    const content = document.createElement('div');
    content.style.cssText = `padding: 24px;`;
    contentBuilder(content);
    modal.appendChild(content);

    overlay.appendChild(modal);

    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // ESC key to close
    overlay._escHandler = (e) => {
        if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', overlay._escHandler);

    document.body.appendChild(overlay);
}

function closeModal() {
    const overlay = document.getElementById('menu-modal-overlay');
    if (overlay) {
        if (overlay._escHandler) {
            document.removeEventListener('keydown', overlay._escHandler);
        }
        overlay.remove();
    }
}

/* ------------------------------------------
   FORM FIELD BUILDERS
   Shared by Edit and Add modals
------------------------------------------ */
function buildFormField(container, label, inputType, value, options = {}) {
    const group = document.createElement('div');
    group.style.cssText = `margin-bottom: 20px;`;

    const labelEl = document.createElement('label');
    labelEl.style.cssText = `
        display: block;
        font-family: var(--font-body);
        font-size: 20px;
        color: ${COLORS.mint};
        margin-bottom: 6px;
    `;
    labelEl.textContent = label + (options.required ? ' *' : '');
    group.appendChild(labelEl);

    const inputStyle = `
        width: 100%;
        padding: 12px 14px;
        background: rgba(var(--color-mint-rgb), 0.08);
        border: 1px solid rgba(var(--color-mint-rgb), 0.25);
        border-radius: 8px;
        color: ${COLORS.mint};
        font-family: var(--font-body);
        font-size: 25px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
    `;

    let input;

    if (inputType === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
        input.style.cssText = inputStyle + `resize: vertical;`;
    } else if (inputType === 'select') {
        input = document.createElement('select');
        input.style.cssText = inputStyle + `cursor: pointer;`;
        (options.choices || []).forEach(choice => {
            const opt = document.createElement('option');
            opt.value = choice.value;
            opt.textContent = choice.label;
            opt.style.background = COLORS.dark;
            if (choice.value === value) opt.selected = true;
            input.appendChild(opt);
        });
    } else if (inputType === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!value;
        input.style.cssText = `
            width: 22px;
            height: 22px;
            cursor: pointer;
            accent-color: ${COLORS.mint};
        `;
        labelEl.style.cssText += `display: flex; align-items: center; gap: 12px; cursor: pointer;`;
        labelEl.textContent = '';
        labelEl.appendChild(input);
        const labelText = document.createElement('span');
        labelText.textContent = label;
        labelEl.appendChild(labelText);
        group.innerHTML = '';
        group.appendChild(labelEl);
        input._fieldName = options.fieldName || label;
        return { group, input };
    } else {
        input = document.createElement('input');
        input.type = inputType || 'text';
        input.style.cssText = inputStyle;
    }

    if (inputType !== 'select') {
        input.value = value || '';
    }

    if (options.placeholder) input.placeholder = options.placeholder;

    // Focus styling
    input.addEventListener('focus', () => {
        input.style.borderColor = COLORS.mint;
    });
    input.addEventListener('blur', () => {
        input.style.borderColor = 'rgba(var(--color-mint-rgb), 0.25)';
    });

    input._fieldName = options.fieldName || label;
    group.appendChild(input);
    container.appendChild(group);

    return { group, input };
}

/* ------------------------------------------
   MODAL: EDIT ITEM
------------------------------------------ */
function openEditModal(itemId) {
    const item = getWorkingItem(itemId);
    if (!item) return;

    openModal(`Edit Item: ${item.name}`, (content) => {
        const categoryChoices = menuData.categories
            .sort((a, b) => a.display_order - b.display_order)
            .map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }));

        const nameField   = buildFormField(content, 'Item Name', 'text', item.name, { required: true, fieldName: 'name' });
        const priceField  = buildFormField(content, 'Price', 'number', item.price, { required: true, fieldName: 'price' });
        const catField    = buildFormField(content, 'Category', 'select', item.category_id, { fieldName: 'category_id', choices: categoryChoices });
        const descField   = buildFormField(content, 'Description', 'textarea', item.description, { fieldName: 'description' });
        const activeField = buildFormField(content, 'Active', 'checkbox', item.active, { fieldName: 'active' });

        // --- Action Buttons: Delete + Duplicate ---
        const actionsArea = document.createElement('div');
        actionsArea.style.cssText = `
            margin-top: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.style.cssText = `
            width: 100%;
            padding: 14px;
            background: ${COLORS.redFaded};
            border: 1px solid ${COLORS.red};
            border-radius: 8px;
            color: ${COLORS.white};
            font-family: var(--font-body);
            font-size: 22px;
            cursor: pointer;
            text-align: left;
            transition: background 0.2s ease;
        `;
        deleteBtn.innerHTML = `
            <div style="font-weight: bold;">🗑 Delete Item</div>
            <div style="font-size: 18px; opacity: 0.8; margin-top: 4px;">This will mark the item for deletion</div>
        `;
        deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.background = 'rgba(var(--color-vermillion-rgb), 0.5)'; });
        deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.background = COLORS.redFaded; });
        deleteBtn.addEventListener('click', () => {
            handleDelete(item.id);
            closeModal();
        });
        actionsArea.appendChild(deleteBtn);

        // Duplicate button
        const dupeBtn = document.createElement('button');
        dupeBtn.style.cssText = `
            width: 100%;
            padding: 14px;
            background: rgba(var(--color-mint-rgb), 0.08);
            border: 1px solid rgba(var(--color-mint-rgb), 0.25);
            border-radius: 8px;
            color: ${COLORS.mint};
            font-family: var(--font-body);
            font-size: 22px;
            cursor: pointer;
            text-align: left;
            transition: background 0.2s ease;
        `;
        dupeBtn.innerHTML = `
            <div style="font-weight: bold;">📋 Duplicate Item</div>
            <div style="font-size: 18px; opacity: 0.6; margin-top: 4px;">Create copy with same settings</div>
        `;
        dupeBtn.addEventListener('mouseenter', () => { dupeBtn.style.background = 'rgba(var(--color-mint-rgb), 0.15)'; });
        dupeBtn.addEventListener('mouseleave', () => { dupeBtn.style.background = 'rgba(var(--color-mint-rgb), 0.08)'; });
        dupeBtn.addEventListener('click', () => {
            handleDuplicate(item);
            closeModal();
        });
        actionsArea.appendChild(dupeBtn);
        content.appendChild(actionsArea);

        // --- Footer Buttons: Cancel + Save ---
        const footerBtns = document.createElement('div');
        footerBtns.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid rgba(var(--color-mint-rgb), 0.1);
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = `
            padding: 12px 28px;
            background: transparent;
            border: 1px solid ${COLORS.grey};
            border-radius: 8px;
            color: ${COLORS.grey};
            font-family: var(--font-body);
            font-size: 22px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => closeModal());
        footerBtns.appendChild(cancelBtn);

        const saveBtn = document.createElement('button');
        saveBtn.style.cssText = `
            padding: 12px 28px;
            background: ${COLORS.mint};
            border: none;
            border-radius: 8px;
            color: ${COLORS.dark};
            font-family: var(--font-body);
            font-size: 22px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = COLORS.mintHover; });
        saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = COLORS.mint; });
        saveBtn.addEventListener('click', () => {
            const updatedItem = {
                ...clone(item),
                name:        nameField.input.value.trim(),
                price:       parseFloat(priceField.input.value) || 0,
                category_id: catField.input.value,
                description: descField.input.value.trim(),
                active:      activeField.input.checked,
            };

            // Validate
            if (!updatedItem.name) {
                nameField.input.style.borderColor = COLORS.red;
                return;
            }
            if (updatedItem.price < 0) {
                priceField.input.style.borderColor = COLORS.red;
                return;
            }

            handleEdit(updatedItem);
            closeModal();
        });
        footerBtns.appendChild(saveBtn);
        content.appendChild(footerBtns);
    });
}

/* ------------------------------------------
   MODAL: ADD NEW CATEGORY
------------------------------------------ */
const CATEGORY_COLORS = [
    '#ff4757', '#fcbe40', '#3742fa', '#2ed573', '#ff6348',
    '#7bed9f', '#70a1ff', '#b48efa', '#ff6b81', '#ffa502',
    '#1e90ff', '#2f3542', '#a4b0be', '#57606f', '#ff4422',
    '#C6FFBB', '#33ffff', '#ffff00',
];

function openAddCategoryModal() {
    openModal('Add New Category', (content) => {
        const nameField = buildFormField(content, 'Category Name', 'text', '', { required: true, fieldName: 'name', placeholder: 'e.g. Pizza, Appetizers, Drinks...' });

        // Color grid
        let selectedColor = '#fcbe40';
        const colorLabel = document.createElement('div');
        colorLabel.style.cssText = 'font-size: 20px; color: var(--color-mint); margin: 12px 0 8px 0; font-family: var(--font-body);';
        colorLabel.textContent = 'Color';
        content.appendChild(colorLabel);

        const colorGrid = document.createElement('div');
        colorGrid.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;';
        CATEGORY_COLORS.forEach(hex => {
            const swatch = document.createElement('button');
            swatch.style.cssText = `
                width: 36px; height: 36px; border-radius: 6px; border: 2px solid transparent;
                background: ${hex}; cursor: pointer; transition: border-color 0.15s;
            `;
            if (hex === selectedColor) swatch.style.borderColor = 'var(--color-mint)';
            swatch.addEventListener('click', () => {
                selectedColor = hex;
                colorGrid.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
                swatch.style.borderColor = 'var(--color-mint)';
                hexInput.value = hex;
            });
            colorGrid.appendChild(swatch);
        });
        content.appendChild(colorGrid);

        const hexInput = document.createElement('input');
        hexInput.type = 'text';
        hexInput.value = selectedColor;
        hexInput.placeholder = '#hex (optional)';
        hexInput.className = 'kp-date-input';
        hexInput.style.cssText += 'width: 120px; font-size: 16px;';
        hexInput.addEventListener('input', () => { if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) selectedColor = hexInput.value; });
        content.appendChild(hexInput);

        // Footer buttons
        const footerBtns = document.createElement('div');
        footerBtns.style.cssText = 'display:flex;justify-content:flex-end;gap:12px;margin-top:28px;padding-top:20px;border-top:1px solid rgba(var(--color-mint-rgb),0.1);';

        const cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = `padding:12px 28px;background:transparent;border:1px solid ${COLORS.grey};border-radius:8px;color:${COLORS.grey};font-family:var(--font-body);font-size:22px;cursor:pointer;`;
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => closeModal());
        footerBtns.appendChild(cancelBtn);

        const createBtn = document.createElement('button');
        createBtn.style.cssText = `padding:12px 28px;background:${COLORS.mint};border:none;border-radius:8px;color:${COLORS.dark};font-family:var(--font-body);font-size:22px;font-weight:bold;cursor:pointer;`;
        createBtn.textContent = 'Create Category';
        createBtn.addEventListener('click', async () => {
            const name = nameField.getValue().trim();
            if (!name) { showToast('Category name is required', 'error'); return; }

            createBtn.disabled = true;
            createBtn.textContent = 'Saving...';

            const catId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
            const event = {
                event_type: 'menu.category_created',
                payload: { category_id: catId, name, display_order: menuData.categories.length + 1, color: selectedColor },
            };
            const result = await pushChanges([event]);
            if (!result.ok) {
                createBtn.disabled = false;
                createBtn.textContent = 'Create Category';
                showToast('Failed to save category', 'error');
                return;
            }

            menuData.categories.push({ id: catId, name, emoji: '', display_order: menuData.categories.length + 1, color: selectedColor });
            closeModal();
            renderCardGrid();
            updateFooter();
            showToast(`Category "${name}" created`);
        });
        footerBtns.appendChild(createBtn);
        content.appendChild(footerBtns);
    });
}

/* ------------------------------------------
   MODAL: ADD NEW ITEM
------------------------------------------ */
function openAddModal(preselectedCategoryId) {
    openModal('Add New Item', (content) => {
        const categoryChoices = menuData.categories
            .sort((a, b) => a.display_order - b.display_order)
            .map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }));

        const defaultCat = preselectedCategoryId || menuData.categories[0]?.id;
        const nameField   = buildFormField(content, 'Item Name', 'text', '', { required: true, fieldName: 'name', placeholder: 'Enter item name...' });
        const priceField  = buildFormField(content, 'Price', 'number', '0.00', { required: true, fieldName: 'price' });
        const catField    = buildFormField(content, 'Category', 'select', defaultCat, { fieldName: 'category_id', choices: categoryChoices });
        const descField   = buildFormField(content, 'Description', 'textarea', '', { fieldName: 'description', placeholder: 'Optional description...' });
        const activeField = buildFormField(content, 'Active', 'checkbox', true, { fieldName: 'active' });

        // Required fields note
        const reqNote = document.createElement('div');
        reqNote.style.cssText = `
            font-family: var(--font-body);
            font-size: 18px;
            color: ${COLORS.grey};
            margin-top: 8px;
        `;
        reqNote.textContent = '* Required fields';
        content.appendChild(reqNote);

        // --- Footer Buttons: Cancel + Create ---
        const footerBtns = document.createElement('div');
        footerBtns.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid rgba(var(--color-mint-rgb), 0.1);
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = `
            padding: 12px 28px;
            background: transparent;
            border: 1px solid ${COLORS.grey};
            border-radius: 8px;
            color: ${COLORS.grey};
            font-family: var(--font-body);
            font-size: 22px;
            cursor: pointer;
        `;
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => closeModal());
        footerBtns.appendChild(cancelBtn);

        const createBtn = document.createElement('button');
        createBtn.style.cssText = `
            padding: 12px 28px;
            background: ${COLORS.mint};
            border: none;
            border-radius: 8px;
            color: ${COLORS.dark};
            font-family: var(--font-body);
            font-size: 22px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        createBtn.textContent = 'Create';
        createBtn.addEventListener('mouseenter', () => { createBtn.style.background = COLORS.mintHover; });
        createBtn.addEventListener('mouseleave', () => { createBtn.style.background = COLORS.mint; });
        createBtn.addEventListener('click', () => {
            const newItem = {
                id:           `temp_item_${Date.now()}`,
                name:         nameField.input.value.trim(),
                price:        parseFloat(priceField.input.value) || 0,
                category_id:  catField.input.value,
                description:  descField.input.value.trim(),
                active:       activeField.input.checked,
                display_order: 999,
            };

            // Validate
            if (!newItem.name) {
                nameField.input.style.borderColor = COLORS.red;
                return;
            }
            if (newItem.price < 0) {
                priceField.input.style.borderColor = COLORS.red;
                return;
            }

            handleCreate(newItem);
            closeModal();
        });
        footerBtns.appendChild(createBtn);
        content.appendChild(footerBtns);
    });
}

/* ------------------------------------------
   CHANGE HANDLERS
   Update pendingChanges, re-render affected
   parts of the UI.
------------------------------------------ */

function handleEdit(updatedItem) {
    // If this is a "new" item being edited again, update it in the new array
    const newIdx = pendingChanges.new.findIndex(i => i.id === updatedItem.id);
    if (newIdx !== -1) {
        pendingChanges.new[newIdx] = updatedItem;
    } else {
        // Check if already in edited array
        const editIdx = pendingChanges.edited.findIndex(i => i.id === updatedItem.id);
        if (editIdx !== -1) {
            pendingChanges.edited[editIdx] = updatedItem;
        } else {
            pendingChanges.edited.push(updatedItem);
        }
    }

    renderCardGrid();
    updateFooter();
}

function handleDelete(itemId) {
    // If it's a new item, just remove from new array
    const newIdx = pendingChanges.new.findIndex(i => i.id === itemId);
    if (newIdx !== -1) {
        pendingChanges.new.splice(newIdx, 1);
    } else {
        // Remove from edited if present
        pendingChanges.edited = pendingChanges.edited.filter(i => i.id !== itemId);
        // Add to deleted if not already there
        if (!pendingChanges.deleted.includes(itemId)) {
            pendingChanges.deleted.push(itemId);
        }
    }

    renderCardGrid();
    updateFooter();
}

function handleCreate(newItem) {
    pendingChanges.new.push(newItem);
    renderCardGrid();
    updateFooter();
}

function handleDuplicate(sourceItem) {
    const dupeItem = {
        ...clone(sourceItem),
        id: `temp_item_${Date.now()}`,
        name: sourceItem.name + ' (Copy)',
        display_order: 999,
    };

    // Open add modal pre-populated with duplicated data
    openModal('Add New Item (Duplicated)', (content) => {
        const categoryChoices = menuData.categories
            .sort((a, b) => a.display_order - b.display_order)
            .map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }));

        const nameField   = buildFormField(content, 'Item Name', 'text', dupeItem.name, { required: true, fieldName: 'name' });
        const priceField  = buildFormField(content, 'Price', 'number', dupeItem.price, { required: true, fieldName: 'price' });
        const catField    = buildFormField(content, 'Category', 'select', dupeItem.category_id, { fieldName: 'category_id', choices: categoryChoices });
        const descField   = buildFormField(content, 'Description', 'textarea', dupeItem.description, { fieldName: 'description' });
        const activeField = buildFormField(content, 'Active', 'checkbox', dupeItem.active, { fieldName: 'active' });

        // --- Footer Buttons ---
        const footerBtns = document.createElement('div');
        footerBtns.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid rgba(var(--color-mint-rgb), 0.1);
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = `
            padding: 12px 28px;
            background: transparent;
            border: 1px solid ${COLORS.grey};
            border-radius: 8px;
            color: ${COLORS.grey};
            font-family: var(--font-body);
            font-size: 22px;
            cursor: pointer;
        `;
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => closeModal());
        footerBtns.appendChild(cancelBtn);

        const createBtn = document.createElement('button');
        createBtn.style.cssText = `
            padding: 12px 28px;
            background: ${COLORS.mint};
            border: none;
            border-radius: 8px;
            color: ${COLORS.dark};
            font-family: var(--font-body);
            font-size: 22px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        createBtn.textContent = 'Create';
        createBtn.addEventListener('mouseenter', () => { createBtn.style.background = COLORS.mintHover; });
        createBtn.addEventListener('mouseleave', () => { createBtn.style.background = COLORS.mint; });
        createBtn.addEventListener('click', () => {
            const finalItem = {
                id:            dupeItem.id,
                name:          nameField.input.value.trim(),
                price:         parseFloat(priceField.input.value) || 0,
                category_id:   catField.input.value,
                description:   descField.input.value.trim(),
                active:        activeField.input.checked,
                display_order: 999,
            };

            if (!finalItem.name) {
                nameField.input.style.borderColor = COLORS.red;
                return;
            }

            handleCreate(finalItem);
            closeModal();
        });
        footerBtns.appendChild(createBtn);
        content.appendChild(footerBtns);
    });
}

/* ------------------------------------------
   FOOTER: CHANGE TRACKER
   Shows/hides based on pending count.
   Cancel resets, Save logs events.
------------------------------------------ */
function updateFooter() {
    const footer = document.getElementById('menu-change-footer');
    if (!footer) return;

    const count = getPendingCount();

    if (count === 0) {
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'flex';

    footer.innerHTML = '';

    // Left side: change counter
    const counter = document.createElement('div');
    counter.style.cssText = `
        font-family: var(--font-body);
        font-size: 22px;
        color: ${COLORS.yellow};
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    counter.innerHTML = `⚠️ <strong>${count} unsaved change${count !== 1 ? 's' : ''}</strong>`;
    footer.appendChild(counter);

    // Right side: buttons
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = `display: flex; gap: 12px;`;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = `
        padding: 12px 24px;
        background: transparent;
        border: 1px solid ${COLORS.grey};
        border-radius: 8px;
        color: ${COLORS.grey};
        font-family: var(--font-body);
        font-size: 22px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.borderColor = COLORS.red;
        cancelBtn.style.color = COLORS.red;
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.borderColor = COLORS.grey;
        cancelBtn.style.color = COLORS.grey;
    });
    cancelBtn.addEventListener('click', () => {
        if (confirm(`Discard ${count} unsaved change${count !== 1 ? 's' : ''}?`)) {
            pendingChanges = { new: [], edited: [], deleted: [] };
            renderCardGrid();
            updateFooter();
        }
    });
    btnGroup.appendChild(cancelBtn);

    // Save Changes button
    const saveBtn = document.createElement('button');
    saveBtn.style.cssText = `
        padding: 12px 24px;
        background: ${COLORS.mint};
        border: none;
        border-radius: 8px;
        color: ${COLORS.dark};
        font-family: var(--font-body);
        font-size: 22px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    saveBtn.textContent = 'Save Changes';
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = COLORS.mintHover; });
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = COLORS.mint; });
    saveBtn.addEventListener('click', () => {
        handleSaveChanges();
    });
    btnGroup.appendChild(saveBtn);

    footer.appendChild(btnGroup);
}

/* ------------------------------------------
   SAVE: Generate Events & POST to backend
------------------------------------------ */
async function handleSaveChanges() {
    const events = generateMenuEvents(pendingChanges);

    const result = await pushChanges(events);
    if (!result.ok) {
        showToast('Failed to save changes — try again', 'error');
        return;
    }

    // Apply changes to base data so they persist in this session
    // New items → add to menuData
    pendingChanges.new.forEach(item => {
        menuData.items.push(clone(item));
    });

    // Edited items → update in menuData
    pendingChanges.edited.forEach(edited => {
        const idx = menuData.items.findIndex(i => i.id === edited.id);
        if (idx !== -1) {
            menuData.items[idx] = clone(edited);
        }
    });

    // Deleted items → remove from menuData
    pendingChanges.deleted.forEach(deletedId => {
        menuData.items = menuData.items.filter(i => i.id !== deletedId);
    });

    // Clear pending
    pendingChanges = { new: [], edited: [], deleted: [] };

    // Re-render
    renderCardGrid();
    updateFooter();

    // Success toast
    showToast(`${events.length} change${events.length !== 1 ? 's' : ''} saved successfully`);
}

/* ------------------------------------------
   EVENT GENERATION
   Creates event objects matching the KINDpos
   event-sourced architecture. These will be
   POSTed to the backend when integrated.
------------------------------------------ */
function generateMenuEvents(changes) {
    const events = [];
    const batch_id = `menu_batch_${Date.now()}`;

    // New categories → menu.category_created
    changes.new.filter(c => c._isCategory).forEach(cat => {
        events.push({
            event_type: 'menu.category_created',
            batch_id: batch_id,
            timestamp: new Date().toISOString(),
            payload: {
                category_id: cat.id,
                name: cat.name,
                display_order: cat.display_order,
                color: cat.color || '#fcbe40',
            }
        });
    });

    // New items → menu.item_created
    changes.new.filter(i => !i._isCategory).forEach(item => {
        events.push({
            event_type: 'menu.item_created',
            batch_id: batch_id,
            timestamp: new Date().toISOString(),
            payload: {
                item_id: item.id.replace('temp_', ''),
                name: item.name,
                price: item.price,
                description: item.description,
                category_id: item.category_id,
                active: item.active,
            }
        });
    });

    // Edited items → menu.item_updated
    changes.edited.forEach(item => {
        events.push({
            event_type: 'menu.item_updated',
            batch_id: batch_id,
            timestamp: new Date().toISOString(),
            payload: {
                item_id: item.id,
                changes: {
                    name: item.name,
                    price: item.price,
                    description: item.description,
                    category_id: item.category_id,
                    active: item.active,
                }
            }
        });
    });

    // Deleted items → menu.item_deleted
    changes.deleted.forEach(item_id => {
        events.push({
            event_type: 'menu.item_deleted',
            batch_id: batch_id,
            timestamp: new Date().toISOString(),
            payload: {
                item_id: item_id,
            }
        });
    });

    return events;
}

/* ------------------------------------------
   TOAST NOTIFICATION
   Brief success/error message
------------------------------------------ */
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        padding: 16px 28px;
        background: ${COLORS.mint};
        color: ${COLORS.dark};
        font-family: var(--font-body);
        font-size: 22px;
        font-weight: bold;
        border-radius: 8px;
        z-index: 200;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = `✓ ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/* ------------------------------------------
   CSS ANIMATIONS
   Injected once when scene loads
------------------------------------------ */
function injectAnimations() {
    if (document.getElementById('menu-categories-animations')) return;

    const style = document.createElement('style');
    style.id = 'menu-categories-animations';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(20px); }
            to   { opacity: 1; transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);
}

/* ------------------------------------------
   PUBLIC: Register scene with scene manager

   Overrides the auto-generated placeholder
   for 'menu-categories' in app.js.
------------------------------------------ */
export function registerMenuCategories(sceneManager) {
    sceneManager.register('menu-categories', {
        type: 'detail',
        title: 'Categories & Items',
        parent: 'menu-subs',
        async onEnter(container) {
            console.log('[MenuCategories] Scene loaded — initializing...');

            // Inject CSS animations
            injectAnimations();

            // Fetch menu data from API
            menuData = await fetchMenuData();
            pendingChanges = { new: [], edited: [], deleted: [] };
            displayState = { searchTerm: '', filterCategory: 'all' };

            // Build main container
            currentWrapper = document.createElement('div');
            currentWrapper.style.cssText = `
                max-width: 1100px;
                margin: 0 auto;
                padding: 10px 20px 40px 20px;
            `;
            container.appendChild(currentWrapper);

            // Render the main view
            buildMainView(currentWrapper);

            console.log(`[MenuCategories] Loaded ${menuData.categories.length} categories, ${menuData.items.length} items.`);
            console.log('[MenuCategories] Ready.');
        },
        onExit(container) {
            // Clean up
            currentWrapper = null;
            menuData = { categories: [], items: [] };
            pendingChanges = { new: [], edited: [], deleted: [] };
            displayState = { searchTerm: '', filterCategory: 'all' };
            container.innerHTML = '';

            // Remove any lingering modal
            closeModal();
        },
    });
}