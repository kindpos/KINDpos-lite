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
    mint:       '#C6FFBB',
    mintHover:  '#d4ffca',
    mintFaded:  'rgba(198, 255, 187, 0.8)',
    mintGhost:  'rgba(198, 255, 187, 0.4)',
    yellow:     '#FBDE42',
    yellowFaded:'rgba(251, 222, 66, 0.4)',
    red:        '#FF3333',
    redFaded:   'rgba(255, 51, 51, 0.3)',
    dark:       '#333333',
    grey:       '#999999',
    white:      '#FFFFFF',
};

/* ------------------------------------------
   TEST DATA
   5 categories, ~25 items for realistic
   browsing. Will be replaced by API call
   when backend integration happens.
------------------------------------------ */
const TEST_MENU_DATA = {
    categories: [
        { id: 'cat_appetizers',  name: 'Appetizers',  emoji: '🍕', display_order: 1 },
        { id: 'cat_pasta',       name: 'Pasta',       emoji: '🍝', display_order: 2 },
        { id: 'cat_entrees',     name: 'Entrees',     emoji: '🥩', display_order: 3 },
        { id: 'cat_desserts',    name: 'Desserts',    emoji: '🍰', display_order: 4 },
        { id: 'cat_beverages',   name: 'Beverages',   emoji: '🥤', display_order: 5 },
    ],

    items: [
        // --- Appetizers ---
        { id: 'item_mozz_sticks',   name: 'Mozzarella Sticks',  price: 8.99,  description: '6 breaded mozzarella sticks served with marinara sauce',                       category_id: 'cat_appetizers', active: true, display_order: 1 },
        { id: 'item_wings',         name: 'Buffalo Wings',       price: 12.99, description: '10pc wings with choice of sauce: buffalo, BBQ, or honey mustard',              category_id: 'cat_appetizers', active: true, display_order: 2 },
        { id: 'item_nachos',        name: 'Nachos Supreme',      price: 10.99, description: 'Tortilla chips with cheese, jalapeños, sour cream, salsa',                     category_id: 'cat_appetizers', active: true, display_order: 3 },
        { id: 'item_bruschetta',    name: 'Bruschetta',          price: 9.99,  description: 'Toasted bread with fresh tomatoes, basil, garlic, olive oil',                   category_id: 'cat_appetizers', active: true, display_order: 4 },
        { id: 'item_calamari',      name: 'Fried Calamari',      price: 13.99, description: 'Lightly breaded calamari rings with lemon aioli',                               category_id: 'cat_appetizers', active: true, display_order: 5 },
        { id: 'item_spinach_dip',   name: 'Spinach Artichoke Dip', price: 11.49, description: 'Creamy spinach and artichoke dip with tortilla chips',                        category_id: 'cat_appetizers', active: true, display_order: 6 },

        // --- Pasta ---
        { id: 'item_spaghetti',     name: 'Spaghetti & Meatballs', price: 15.99, description: 'House-made meatballs with marinara over spaghetti',                          category_id: 'cat_pasta', active: true, display_order: 1 },
        { id: 'item_fettuccine',    name: 'Fettuccine Alfredo',    price: 14.99, description: 'Creamy parmesan alfredo sauce over fettuccine',                                category_id: 'cat_pasta', active: true, display_order: 2 },
        { id: 'item_penne_vodka',   name: 'Penne alla Vodka',      price: 16.99, description: 'Penne in a creamy tomato vodka sauce with fresh basil',                        category_id: 'cat_pasta', active: true, display_order: 3 },
        { id: 'item_lasagna',       name: 'Lasagna',                price: 17.99, description: 'Layered pasta with beef, ricotta, mozzarella, and marinara',                   category_id: 'cat_pasta', active: true, display_order: 4 },
        { id: 'item_carbonara',     name: 'Carbonara',              price: 16.49, description: 'Spaghetti with pancetta, egg, parmesan, black pepper',                         category_id: 'cat_pasta', active: true, display_order: 5 },

        // --- Entrees ---
        { id: 'item_grilled_salmon',name: 'Grilled Salmon',         price: 22.99, description: 'Atlantic salmon with lemon dill butter, seasonal vegetables',                  category_id: 'cat_entrees', active: true, display_order: 1 },
        { id: 'item_ribeye',        name: '12oz Ribeye Steak',      price: 28.99, description: 'USDA Choice ribeye, grilled to order with garlic butter',                      category_id: 'cat_entrees', active: true, display_order: 2 },
        { id: 'item_chicken_parm',  name: 'Chicken Parmesan',       price: 18.99, description: 'Breaded chicken cutlet with marinara and melted mozzarella',                    category_id: 'cat_entrees', active: true, display_order: 3 },
        { id: 'item_fish_chips',    name: 'Fish & Chips',           price: 16.99, description: 'Beer-battered cod with fries, coleslaw, tartar sauce',                          category_id: 'cat_entrees', active: true, display_order: 4 },
        { id: 'item_burger',        name: 'Classic Burger',          price: 14.99, description: 'Half-pound Angus beef, lettuce, tomato, onion, pickle, brioche bun',            category_id: 'cat_entrees', active: true, display_order: 5 },

        // --- Desserts ---
        { id: 'item_tiramisu',      name: 'Tiramisu',               price: 9.99,  description: 'Classic Italian tiramisu with espresso-soaked ladyfingers',                      category_id: 'cat_desserts', active: true, display_order: 1 },
        { id: 'item_cheesecake',    name: 'NY Cheesecake',          price: 10.99, description: 'New York-style cheesecake with strawberry compote',                              category_id: 'cat_desserts', active: true, display_order: 2 },
        { id: 'item_brownie',       name: 'Brownie Sundae',         price: 8.99,  description: 'Warm chocolate brownie with vanilla ice cream and hot fudge',                    category_id: 'cat_desserts', active: true, display_order: 3 },
        { id: 'item_cannoli',       name: 'Cannoli',                price: 7.99,  description: 'Crispy shell filled with sweet ricotta, chocolate chips',                        category_id: 'cat_desserts', active: true, display_order: 4 },

        // --- Beverages ---
        { id: 'item_soda',          name: 'Fountain Soda',          price: 2.99,  description: 'Coke, Diet Coke, Sprite, Dr Pepper, Lemonade',                                  category_id: 'cat_beverages', active: true, display_order: 1 },
        { id: 'item_iced_tea',      name: 'Iced Tea',               price: 2.99,  description: 'Fresh-brewed, sweetened or unsweetened',                                          category_id: 'cat_beverages', active: true, display_order: 2 },
        { id: 'item_coffee',        name: 'Coffee',                 price: 3.49,  description: 'Regular or decaf, served with cream and sugar',                                   category_id: 'cat_beverages', active: true, display_order: 3 },
        { id: 'item_juice',         name: 'Fresh Juice',            price: 4.99,  description: 'Orange, apple, or cranberry',                                                     category_id: 'cat_beverages', active: true, display_order: 4 },
        { id: 'item_water',         name: 'Bottled Water',          price: 1.99,  description: 'Still or sparkling',                                                               category_id: 'cat_beverages', active: true, display_order: 5 },
    ]
};

/* ------------------------------------------
   MODULE-LEVEL STATE
   These persist for the lifetime of the scene.
   Reset in onExit.
------------------------------------------ */
let currentWrapper = null;

/** Working copy of menu data (cloned from test data on enter) */
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
                color: rgba(198, 255, 187, 0.5);
                margin-top: 4px;
            ">Sample Data · Connect to backend for live menu</div>
        </div>
    `;

    // + Add Item button
    const addBtn = document.createElement('button');
    addBtn.style.cssText = `
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
    addBtn.textContent = '+ Add Item';
    addBtn.addEventListener('mouseenter', () => {
        addBtn.style.background = COLORS.mintHover;
        addBtn.style.transform = 'translateY(-1px)';
    });
    addBtn.addEventListener('mouseleave', () => {
        addBtn.style.background = COLORS.mint;
        addBtn.style.transform = 'translateY(0)';
    });
    addBtn.addEventListener('click', () => openAddModal());
    header.appendChild(addBtn);
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
        background: rgba(198, 255, 187, 0.08);
        border: 1px solid rgba(198, 255, 187, 0.2);
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
        searchInput.style.borderColor = 'rgba(198, 255, 187, 0.2)';
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
        background: rgba(198, 255, 187, 0.08);
        border: 1px solid rgba(198, 255, 187, 0.2);
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
        `;
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
            card.style.boxShadow = '0 4px 12px rgba(198, 255, 187, 0.3)';
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
        border-bottom: 1px solid rgba(198, 255, 187, 0.15);
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
        background: rgba(198, 255, 187, 0.08);
        border: 1px solid rgba(198, 255, 187, 0.25);
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
        input.style.borderColor = 'rgba(198, 255, 187, 0.25)';
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
        deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.background = 'rgba(255, 51, 51, 0.5)'; });
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
            background: rgba(198, 255, 187, 0.08);
            border: 1px solid rgba(198, 255, 187, 0.25);
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
        dupeBtn.addEventListener('mouseenter', () => { dupeBtn.style.background = 'rgba(198, 255, 187, 0.15)'; });
        dupeBtn.addEventListener('mouseleave', () => { dupeBtn.style.background = 'rgba(198, 255, 187, 0.08)'; });
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
            border-top: 1px solid rgba(198, 255, 187, 0.1);
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
   MODAL: ADD NEW ITEM
------------------------------------------ */
function openAddModal() {
    openModal('Add New Item', (content) => {
        const categoryChoices = menuData.categories
            .sort((a, b) => a.display_order - b.display_order)
            .map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }));

        const nameField   = buildFormField(content, 'Item Name', 'text', '', { required: true, fieldName: 'name', placeholder: 'Enter item name...' });
        const priceField  = buildFormField(content, 'Price', 'number', '0.00', { required: true, fieldName: 'price' });
        const catField    = buildFormField(content, 'Category', 'select', menuData.categories[0]?.id, { fieldName: 'category_id', choices: categoryChoices });
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
            border-top: 1px solid rgba(198, 255, 187, 0.1);
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
            border-top: 1px solid rgba(198, 255, 187, 0.1);
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
   SAVE: Generate Events & Log
   Phase 1: Console log only
   Phase 2: POST to /api/v1/menu/events
------------------------------------------ */
function handleSaveChanges() {
    const events = generateMenuEvents(pendingChanges);

    console.log('%c[KINDpos] Menu Events Generated', 'background: #333; color: #FBDE42; font-size: 14px; padding: 2px 8px;');
    console.log(`Batch contains ${events.length} events:`);
    events.forEach((evt, i) => {
        console.log(`  ${i + 1}. ${evt.event_type} — ${JSON.stringify(evt.payload)}`);
    });

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

    // New items → menu.item_created
    changes.new.forEach(item => {
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
        onEnter(container) {
            console.log('[MenuCategories] Scene loaded — initializing...');

            // Inject CSS animations
            injectAnimations();

            // Clone test data into working copy
            menuData = clone(TEST_MENU_DATA);
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