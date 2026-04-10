// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Modifier Panel
//  Tab-based modifier builder for menu items
//  Overlays on the hex-canvas in order-entry scene
//  All state is ephemeral until SEND
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, applySunkenStyle, chamfer, shadowColor } from './tokens.js';

// ── Standard allergen list ──
var ALLERGENS = [
  { id: 'nuts',      label: 'Nuts' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'gluten',    label: 'Gluten' },
  { id: 'dairy',     label: 'Dairy' },
  { id: 'soy',       label: 'Soy' },
  { id: 'eggs',      label: 'Eggs' },
  { id: 'fish',      label: 'Fish' },
  { id: 'other',     label: 'Other / Note' },
];

// ── Prefix definitions for optional tabs ──
var OPT_PREFIXES = [
  { id: 'ADD',     label: 'ADD',     variant: 'mint' },
  { id: 'NO',      label: 'NO',      variant: 'vermillion' },
  { id: 'EXTRA',   label: 'EXTRA',   variant: 'dark' },
  { id: 'ON SIDE', label: 'ON SIDE', variant: 'gold' },
  { id: 'SUB',     label: 'SUB',     variant: 'ghost' },
];

// ── Placement segments ──
var PLACEMENTS = [
  { id: '1st',   label: '1st' },
  { id: 'whole', label: 'Whole' },
  { id: '2nd',   label: '2nd' },
];

/**
 * ModifierPanel — builds and manages the modifier panel UI
 *
 * Layout:
 *   ┌────────┬──────────────────────────────┐
 *   │        │  [PREFIX] [PREFIX] ...        │
 *   │  TABS  │  [1st | Whole | 2nd]         │
 *   │  (vert)├──────────────────────────────┤
 *   │        │  PICKER / OPTIONS GRID       │
 *   │        │                              │
 *   ├────────┴──────────────────────────────┤
 *   │  [ CANCEL ]        [ SEND ]           │
 *   └──────────────────────────────────────┘
 */
export function ModifierPanel(container, opts) {
  var self = this;
  var item = opts.item;
  var config = item.modifierConfig || {};
  var onUpdate = opts.onUpdate || function() {};
  var onSend = opts.onSend || function() {};
  var onCancel = opts.onCancel || function() {};

  // ── Active item state (ephemeral until SEND) ──
  var activeItem = {
    itemId: item.id || item.label.toLowerCase().replace(/\s+/g, '-'),
    itemLabel: item.label,
    basePrice: item.price || 0,
    mandatorySelections: {},
    optionalModifiers: [],
    includedRemovals: [],
    allergens: [],
    allergenNote: '',
    note: '',
  };

  // Initialize mandatory defaults
  var mandatoryGroups = config.mandatoryGroups || [];
  mandatoryGroups.forEach(function(g) {
    if (g.defaultKey) {
      var opt = g.options.find(function(o) { return o.key === g.defaultKey; });
      if (opt) {
        activeItem.mandatorySelections[g.key] = { key: opt.key, label: opt.label, price: opt.price || 0 };
      }
    }
  });

  var includedItems = config.includedItems || [];
  var optionalGroups = config.optionalGroups || [];

  // ── Build tab list per spec order ──
  var tabs = [];
  mandatoryGroups.forEach(function(g) {
    tabs.push({ type: 'mandatory', key: g.key, label: g.label, group: g });
  });
  if (includedItems.length > 0) {
    tabs.push({ type: 'included', key: '_included', label: 'INCL' });
  }
  tabs.push({ type: 'allergen', key: '_allergen', label: 'ALLRG' });
  tabs.push({ type: 'note', key: '_note', label: 'NOTE' });
  optionalGroups.forEach(function(g) {
    tabs.push({ type: 'optional', key: g.key, label: g.label, group: g });
  });

  var activeTabKey = tabs.length > 0 ? tabs[0].key : null;
  var activeOptPrefix = 'ADD';
  var activePlacement = 'whole';

  // ── DOM refs ──
  var rootEl = null;
  var tabBarEl = null;
  var topBarEl = null;
  var pickerEl = null;
  var _allergenNoteInput = null;

  // ── Bevel helpers (match clock-in card pattern) ──
  function _lightenHex(hex, pct) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return '#' + [
      Math.min(255, Math.round(r + (255 - r) * pct)),
      Math.min(255, Math.round(g + (255 - g) * pct)),
      Math.min(255, Math.round(b + (255 - b) * pct)),
    ].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
  }
  function _darkenHex(hex, pct) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var f = 1 - pct;
    return '#' + [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
      .map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
  }

  // ── Build the panel ──
  function build() {
    // Outer wrapper: drop-shadow (matches clock-in depth pattern)
    rootEl = document.createElement('div');
    rootEl.style.cssText = [
      'position:absolute;top:0;left:0;right:0;bottom:0;z-index:5;',
      'filter:drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(135,247,156,0.15));',
    ].join('');

    // Inner card: beveled border (light top-left, dark bottom-right)
    var card = document.createElement('div');
    card.style.cssText = [
      'width:100%;height:100%;',
      'background:' + T.bg + ';',
      'border-top:7px solid ' + _lightenHex(T.mint, 0.2) + ';',
      'border-left:7px solid ' + _lightenHex(T.mint, 0.2) + ';',
      'border-bottom:7px solid ' + _darkenHex(T.mint, 0.3) + ';',
      'border-right:7px solid ' + _darkenHex(T.mint, 0.3) + ';',
      'display:flex;flex-direction:column;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');
    card.style.clipPath = chamfer(10);
    rootEl.appendChild(card);

    // ── Main body: vertical tabs left | content right ──
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;display:flex;overflow:hidden;min-height:0;';

    // Vertical tab bar (left side) — wider
    tabBarEl = document.createElement('div');
    tabBarEl.style.cssText = [
      'width:120px;flex-shrink:0;display:flex;flex-direction:column;',
      'gap:4px;padding:6px;',
      'overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
      'background:' + T.bgDark + ';',
      'border-right:3px solid ' + _darkenHex(T.mint, 0.3) + ';',
    ].join('');
    body.appendChild(tabBarEl);

    // Right content area: top bar + picker
    var rightArea = document.createElement('div');
    rightArea.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

    // Top bar (prefixes + placement)
    topBarEl = document.createElement('div');
    topBarEl.style.cssText = [
      'flex-shrink:0;padding:6px;',
      'display:flex;flex-direction:column;gap:4px;',
      'background:' + T.bgDark + ';',
      'border-bottom:3px solid ' + _darkenHex(T.mint, 0.3) + ';',
    ].join('');
    rightArea.appendChild(topBarEl);

    // Picker area
    pickerEl = document.createElement('div');
    pickerEl.style.cssText = [
      'flex:1;',
      'overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
      'padding:6px;',
    ].join('');
    rightArea.appendChild(pickerEl);

    body.appendChild(rightArea);
    card.appendChild(body);

    // ── Bottom action bar: CANCEL + SEND ──
    var actionBar = document.createElement('div');
    actionBar.style.cssText = [
      'display:flex;gap:8px;flex-shrink:0;',
      'padding:6px 8px 8px 8px;',
      'border-top:3px solid ' + _darkenHex(T.mint, 0.3) + ';',
      'background:' + T.bgDark + ';',
    ].join('');

    var undoPair = buildStyledButton({ label: 'UNDO / RESET', variant: 'vermillion', size: 'md', onClick: function() { onCancel(); } });
    undoPair.wrap.style.flex = '1';
    var confirmPair = buildStyledButton({ label: 'CONFIRM', variant: 'mint', size: 'md', onClick: function() { handleSend(); } });
    confirmPair.wrap.style.flex = '2';

    actionBar.appendChild(undoPair.wrap);
    actionBar.appendChild(confirmPair.wrap);
    card.appendChild(actionBar);

    container.appendChild(rootEl);
    renderTabs();
    renderTopBar();
    renderPicker();
  }

  // ═══ VERTICAL TAB BAR ═══
  function renderTabs() {
    tabBarEl.innerHTML = '';
    tabs.forEach(function(tab) {
      var isActive = tab.key === activeTabKey;

      // Build label
      var labelText = tab.label;
      if (tab.type === 'mandatory' && activeItem.mandatorySelections[tab.key]) {
        labelText = activeItem.mandatorySelections[tab.key].label;
      }
      if (tab.type === 'note' && activeItem.note.length > 0) {
        labelText = 'NOTE \u2022';
      }

      var variant = isActive ? 'mint' : 'ghost';
      var pair = buildStyledButton({ label: labelText, variant: variant, size: 'sm' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';
      pair.inner.style.fontSize = '13px';
      pair.inner.style.letterSpacing = '1px';
      pair.inner.style.padding = '4px 6px';
      pair.inner.style.wordBreak = 'break-word';
      pair.inner.style.lineHeight = '1.1';

      pair.wrap.addEventListener('pointerup', function() {
        activeTabKey = tab.key;
        if (tab.type === 'optional') activeOptPrefix = 'ADD';
        renderTabs();
        renderTopBar();
        renderPicker();
      });

      tabBarEl.appendChild(pair.wrap);
    });
  }

  // ═══ TOP BAR (prefixes + placement) ═══
  function renderTopBar() {
    topBarEl.innerHTML = '';
    var tab = _activeTab();
    if (!tab) return;

    // Prefix row — shown on optional and included tabs
    if (tab.type === 'optional') {
      var prefixRow = document.createElement('div');
      prefixRow.style.cssText = 'display:flex;gap:3px;';

      OPT_PREFIXES.forEach(function(pfx) {
        var isActive = activeOptPrefix === pfx.id;
        var v = isActive ? pfx.variant : 'dark';
        var pair = buildStyledButton({ label: pfx.label, variant: v, size: 'sm' });
        pair.wrap.style.flex = '1';
        pair.wrap.style.minWidth = '0';
        pair.inner.style.fontSize = '12px';
        pair.inner.style.padding = '4px';

        pair.wrap.addEventListener('pointerup', function() {
          activeOptPrefix = pfx.id;
          renderTopBar();
        });

        prefixRow.appendChild(pair.wrap);
      });
      topBarEl.appendChild(prefixRow);
    }

    // Placement bar — always visible (1st / Whole / 2nd)
    var placeWrap = buildStyledButton(T.darkBtn);
    placeWrap.wrap.style.width = '100%';
    placeWrap.inner.style.height = '40px';
    placeWrap.inner.style.display = 'flex';
    placeWrap.inner.style.alignItems = 'stretch';
    placeWrap.inner.style.justifyContent = 'stretch';
    placeWrap.inner.style.padding = '0';

    var placeSegs = {};
    PLACEMENTS.forEach(function(pl, i) {
      if (i > 0) {
        var div = document.createElement('div');
        div.style.cssText = 'width:2px;background:' + T.bgEdge + ';flex-shrink:0;align-self:stretch;';
        placeWrap.inner.appendChild(div);
      }

      var isActive = activePlacement === pl.id;
      var seg = document.createElement('div');
      seg.style.cssText = [
        'flex:' + (pl.id === 'whole' ? '2' : '1') + ';',
        'display:flex;align-items:center;justify-content:center;',
        'font-family:' + T.fb + ';font-size:18px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;',
        'background:' + (isActive ? T.mint : 'transparent') + ';',
        'color:' + (isActive ? T.bgDark : T.mutedText) + ';',
        'cursor:pointer;transition:background 80ms,color 80ms;',
      ].join('');
      seg.textContent = pl.label;

      seg.addEventListener('pointerup', function(e) {
        e.stopPropagation();
        activePlacement = pl.id;
        _refreshPlacement(placeSegs);
      });

      placeWrap.inner.appendChild(seg);
      placeSegs[pl.id] = seg;
    });

    topBarEl.appendChild(placeWrap.wrap);

    // Show active selections for optional tab
    if (tab.type === 'optional') {
      var groupMods = activeItem.optionalModifiers.filter(function(m) {
        return m.groupKey === tab.group.key;
      });
      if (groupMods.length > 0) {
        var selList = document.createElement('div');
        selList.style.cssText = [
          'max-height:60px;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
          'background:' + T.bgDark + ';padding:2px 6px;border-radius:5px;',
        ].join('');

        groupMods.forEach(function(mod) {
          var row = document.createElement('div');
          row.style.cssText = [
            'display:flex;justify-content:space-between;align-items:center;',
            'padding:1px 0;cursor:pointer;',
            'font-family:' + T.fb + ';font-size:14px;color:' + T.textPrimary + ';',
          ].join('');

          var label = document.createElement('span');
          label.textContent = mod.prefix + ' ' + mod.label;
          row.appendChild(label);

          var right = document.createElement('span');
          right.style.cssText = 'color:' + T.gold + ';';
          right.textContent = mod.price > 0 ? '+$' + mod.price.toFixed(2) : '';
          row.appendChild(right);

          row.addEventListener('pointerup', function() {
            activeItem.optionalModifiers.splice(activeItem.optionalModifiers.indexOf(mod), 1);
            fireUpdate();
            renderTopBar();
          });

          selList.appendChild(row);
        });
        topBarEl.appendChild(selList);
      }
    }

    // Info line for mandatory tabs
    if (tab.type === 'mandatory') {
      var info = document.createElement('div');
      info.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mutedText + ';padding:4px 2px;';
      info.textContent = 'Select ' + tab.label.toLowerCase();
      topBarEl.appendChild(info);
    }
  }

  function _refreshPlacement(segs) {
    PLACEMENTS.forEach(function(pl) {
      var seg = segs[pl.id];
      if (!seg) return;
      var isActive = activePlacement === pl.id;
      seg.style.background = isActive ? T.mint : 'transparent';
      seg.style.color = isActive ? T.bgDark : T.mutedText;
    });
  }

  // ═══ PICKER AREA ═══
  function renderPicker() {
    pickerEl.innerHTML = '';
    var tab = _activeTab();
    if (!tab) return;

    switch (tab.type) {
      case 'mandatory':  renderMandatory(tab); break;
      case 'included':   renderIncluded(tab);  break;
      case 'optional':   renderOptional(tab);  break;
      case 'allergen':   renderAllergen(tab);  break;
      case 'note':       renderNote(tab);      break;
    }
  }

  // ═══ MANDATORY TAB ═══
  function renderMandatory(tab) {
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;';

    var group = tab.group;
    var currentKey = activeItem.mandatorySelections[group.key]
      ? activeItem.mandatorySelections[group.key].key : null;

    (group.options || []).forEach(function(opt) {
      var isSelected = opt.key === currentKey;
      var variant = isSelected ? 'mint' : 'dark';
      var pair = buildStyledButton({ label: opt.label, variant: variant, size: 'sm' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';

      // Price subtitle
      if (typeof opt.price === 'number' && opt.price !== 0) {
        var priceEl = document.createElement('div');
        priceEl.style.cssText = 'font-size:9px;color:' + T.gold + ';margin-top:1px;';
        priceEl.textContent = (opt.price > 0 ? '+' : '') + '$' + Math.abs(opt.price).toFixed(2);
        pair.inner.appendChild(priceEl);
      }

      pair.wrap.addEventListener('pointerup', function() {
        onMandatoryChange(group.key, opt);
      });

      grid.appendChild(pair.wrap);
    });

    pickerEl.appendChild(grid);
  }

  function onMandatoryChange(groupKey, newSelection) {
    activeItem.mandatorySelections[groupKey] = {
      key: newSelection.key, label: newSelection.label, price: newSelection.price || 0,
    };

    // Reprice optional modifiers
    activeItem.optionalModifiers = activeItem.optionalModifiers.map(function(mod) {
      if (mod.priceMap) {
        var newPrice = mod.priceMap[newSelection.key];
        if (newPrice === undefined) newPrice = mod.priceMap['default'];
        if (newPrice === undefined) newPrice = mod.price;
        return Object.assign({}, mod, { price: newPrice });
      }
      return mod;
    });

    fireUpdate();
    renderTabs();
    renderTopBar();
    renderPicker();
  }

  // ═══ INCLUDED TAB ═══
  function renderIncluded(tab) {
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;';

    includedItems.forEach(function(incl) {
      var isRemoved = activeItem.includedRemovals.indexOf(incl.id) !== -1;
      var variant = isRemoved ? 'vermillion' : 'dark';
      var label = isRemoved ? 'NO ' + incl.label : incl.label;
      var pair = buildStyledButton({ label: label, variant: variant, size: 'sm' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';

      pair.wrap.addEventListener('pointerup', function() {
        var idx = activeItem.includedRemovals.indexOf(incl.id);
        if (idx !== -1) { activeItem.includedRemovals.splice(idx, 1); }
        else { activeItem.includedRemovals.push(incl.id); }
        fireUpdate();
        renderPicker();
      });

      grid.appendChild(pair.wrap);
    });

    pickerEl.appendChild(grid);
  }

  // ═══ OPTIONAL TAB ═══
  function renderOptional(tab) {
    var group = tab.group;
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;';

    var mandKey = _currentMandatoryKey();

    (group.options || []).forEach(function(opt) {
      var price = _resolvePrice(opt, mandKey);
      var pair = buildStyledButton({ label: opt.label, variant: 'dark', size: 'sm' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';

      if (price > 0) {
        var priceEl = document.createElement('div');
        priceEl.style.cssText = 'font-size:9px;color:' + T.gold + ';margin-top:1px;';
        priceEl.textContent = '+$' + price.toFixed(2);
        pair.inner.appendChild(priceEl);
      }

      pair.wrap.addEventListener('pointerup', function() {
        applyOptionalMod(group.key, opt, mandKey);
      });

      grid.appendChild(pair.wrap);
    });

    pickerEl.appendChild(grid);
  }

  function applyOptionalMod(groupKey, opt, mandKey) {
    var price = _resolvePrice(opt, mandKey);
    activeItem.optionalModifiers.push({
      prefix: activeOptPrefix,
      modifierId: opt.id || opt.label.toLowerCase().replace(/\s+/g, '-'),
      label: opt.label,
      price: price,
      priceMap: opt.priceMap || null,
      groupKey: groupKey,
      placement: activePlacement,
    });
    fireUpdate();
    renderTopBar();
    renderPicker();
  }

  // ═══ ALLERGEN TAB ═══
  function renderAllergen(tab) {
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;';

    ALLERGENS.forEach(function(a) {
      if (a.id === 'other') {
        var isActive = activeItem.allergenNote.length > 0;
        var pair = buildStyledButton({ label: a.label, variant: isActive ? 'vermillion' : 'dark', size: 'sm' });
        pair.wrap.style.width = '100%';
        pair.wrap.style.minWidth = '0';
        pair.wrap.addEventListener('pointerup', function() {
          _allergenNoteInput = true;
          renderPicker();
        });
        grid.appendChild(pair.wrap);
        return;
      }

      var selected = activeItem.allergens.indexOf(a.id) !== -1;
      var pair = buildStyledButton({ label: a.label, variant: selected ? 'vermillion' : 'dark', size: 'sm' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';

      pair.wrap.addEventListener('pointerup', function() {
        var idx = activeItem.allergens.indexOf(a.id);
        if (idx !== -1) { activeItem.allergens.splice(idx, 1); }
        else { activeItem.allergens.push(a.id); }
        fireUpdate();
        renderPicker();
      });

      grid.appendChild(pair.wrap);
    });

    pickerEl.appendChild(grid);

    if (_allergenNoteInput) {
      var noteArea = document.createElement('div');
      noteArea.style.cssText = 'padding:8px 0;';
      var input = document.createElement('input');
      input.type = 'text';
      input.value = activeItem.allergenNote;
      input.placeholder = 'Describe allergen...';
      input.style.cssText = [
        'width:100%;box-sizing:border-box;padding:8px 12px;',
        'font-family:' + T.fb + ';font-size:12px;',
        'background:' + T.bgDark + ';color:' + T.textPrimary + ';',
        'border:2px solid ' + T.red + ';border-radius:5px;outline:none;',
      ].join('');
      input.addEventListener('input', function() {
        activeItem.allergenNote = input.value;
        fireUpdate();
      });
      noteArea.appendChild(input);
      pickerEl.appendChild(noteArea);
      requestAnimationFrame(function() { input.focus(); });
    }
  }

  // ═══ NOTE TAB ═══
  function renderNote(tab) {
    var noteArea = document.createElement('div');
    noteArea.style.cssText = 'flex:1;display:flex;flex-direction:column;';

    var textarea = document.createElement('textarea');
    textarea.value = activeItem.note;
    textarea.placeholder = 'Special instructions...';
    textarea.style.cssText = [
      'flex:1;width:100%;box-sizing:border-box;padding:10px 14px;',
      'font-family:' + T.fb + ';font-size:12px;',
      'background:' + T.bgDark + ';color:' + T.textPrimary + ';',
      'border:2px solid ' + T.mint + ';border-radius:5px;outline:none;',
      'resize:none;',
    ].join('');
    textarea.addEventListener('input', function() {
      activeItem.note = textarea.value;
      fireUpdate();
      renderTabs();
    });
    noteArea.appendChild(textarea);
    pickerEl.appendChild(noteArea);
    requestAnimationFrame(function() { textarea.focus(); });
  }

  // ═══ SEND ═══
  function handleSend() {
    var unsatisfied = mandatoryGroups.filter(function(g) {
      return !activeItem.mandatorySelections[g.key];
    });
    if (unsatisfied.length > 0) {
      activeTabKey = unsatisfied[0].key;
      renderTabs();
      renderTopBar();
      renderPicker();
      return;
    }
    onSend(activeItem);
  }

  // ═══ HELPERS ═══
  function _activeTab() {
    return tabs.find(function(t) { return t.key === activeTabKey; });
  }

  function _currentMandatoryKey() {
    var keys = Object.keys(activeItem.mandatorySelections);
    if (keys.length > 0) return activeItem.mandatorySelections[keys[0]].key;
    return 'default';
  }

  function _resolvePrice(opt, mandKey) {
    if (opt.priceMap) {
      var p = opt.priceMap[mandKey];
      if (p !== undefined) return p;
      p = opt.priceMap['default'];
      if (p !== undefined) return p;
    }
    return opt.price || 0;
  }

  function fireUpdate() {
    onUpdate(buildOutputItem());
  }

  function buildOutputItem() {
    var mands = activeItem.mandatorySelections;
    var mandLabels = [];
    mandatoryGroups.forEach(function(g) {
      if (mands[g.key]) mandLabels.push(mands[g.key].label);
    });

    var mandPrice = 0;
    Object.keys(mands).forEach(function(k) { mandPrice += mands[k].price || 0; });

    var mods = [];
    activeItem.optionalModifiers.forEach(function(m) {
      mods.push({
        name: m.prefix + ' ' + m.label,
        price: m.prefix === 'NO' ? 0 : m.price,
        charged: m.prefix !== 'NO' && m.price > 0,
        prefix: null,
      });
    });

    activeItem.includedRemovals.forEach(function(rid) {
      var incl = includedItems.find(function(i) { return i.id === rid; });
      if (incl) mods.push({ name: 'NO ' + incl.label, price: 0, charged: false, prefix: null });
    });

    activeItem.allergens.forEach(function(aId) {
      var a = ALLERGENS.find(function(x) { return x.id === aId; });
      if (a) mods.push({ name: '\u26A0 ALLERGEN: ' + a.label, price: 0, charged: false, prefix: null });
    });
    if (activeItem.allergenNote) {
      mods.push({ name: '\u26A0 ALLERGEN: ' + activeItem.allergenNote, price: 0, charged: false, prefix: null });
    }
    if (activeItem.note) {
      mods.push({ name: '\uD83D\uDCDD ' + activeItem.note, price: 0, charged: false, prefix: null });
    }

    var mandSuffix = mandLabels.length > 0 ? ' \u2014 ' + mandLabels.join(' / ') : '';

    return {
      itemLabel: activeItem.itemLabel + mandSuffix,
      basePrice: activeItem.basePrice + mandPrice,
      mods: mods,
      activeItem: activeItem,
    };
  }

  // ═══ PUBLIC API ═══
  self.destroy = function() {
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
    rootEl = null;
  };

  self.getActiveItem = function() { return activeItem; };
  self.getOutputItem = function() { return buildOutputItem(); };

  build();
  fireUpdate();
}
