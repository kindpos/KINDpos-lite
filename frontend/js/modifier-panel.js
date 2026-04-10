// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Modifier Panel
//  Tab-based modifier builder for menu items
//  Mounts in the right half of order-entry scene
//  All state is ephemeral until SEND
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, applySunkenStyle } from './tokens.js';
import { buildButton } from './components.js';

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
  { id: 'ADD',     label: 'ADD',     color: T.goGreen,  textColor: '#1a2a1a' },
  { id: 'NO',      label: 'NO',      color: T.red,      textColor: '#fff'    },
  { id: 'EXTRA',   label: 'EXTRA',   color: T.cyan,     textColor: '#001a1a' },
  { id: 'ON SIDE', label: 'ON SIDE', color: T.gold,     textColor: '#1a1000' },
  { id: 'SUB',     label: 'SUB',     color: T.lavender, textColor: '#1a0030' },
];

/**
 * ModifierPanel — builds and manages the modifier panel UI
 *
 * @param {HTMLElement} container — where to mount (replaces content)
 * @param {object} opts
 *   opts.item       — menu item { label, price, modifierConfig }
 *   opts.onUpdate   — fn(activeItem) called on every state change for live ticket
 *   opts.onSend     — fn(activeItem) called when SEND is tapped
 *   opts.onCancel   — fn() called when cancelled
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
  // Mandatory first (in config order), then INCLUDED → ALLERGEN → NOTE → optional groups
  var tabs = [];
  mandatoryGroups.forEach(function(g) {
    tabs.push({ type: 'mandatory', key: g.key, label: g.label, group: g });
  });
  if (includedItems.length > 0) {
    tabs.push({ type: 'included', key: '_included', label: 'INCLUDED' });
  }
  tabs.push({ type: 'allergen', key: '_allergen', label: 'ALLERGEN' });
  tabs.push({ type: 'note', key: '_note', label: 'NOTE' });
  optionalGroups.forEach(function(g) {
    tabs.push({ type: 'optional', key: g.key, label: g.label, group: g });
  });

  var activeTabKey = tabs.length > 0 ? tabs[0].key : null;
  var activeOptPrefix = 'ADD'; // default prefix for optional tabs

  // ── DOM refs ──
  var rootEl = null;
  var tabBarEl = null;
  var leftColEl = null;
  var pickerEl = null;
  var _allergenNoteInput = null;

  // ── Build the panel ──
  function build() {
    rootEl = document.createElement('div');
    rootEl.style.cssText = [
      'flex:1;display:flex;flex-direction:column;',
      'background:' + T.bg5 + ';',
      'border:7px solid ' + T.gold + ';',
      'overflow:hidden;',
    ].join('');

    // Tab bar
    tabBarEl = document.createElement('div');
    tabBarEl.style.cssText = [
      'display:flex;gap:2px;flex-shrink:0;',
      'padding:4px 4px 0 4px;',
      'overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;',
    ].join('');
    rootEl.appendChild(tabBarEl);

    // Body: left column + picker area
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;display:flex;overflow:hidden;min-height:0;padding:4px;gap:4px;';

    leftColEl = document.createElement('div');
    leftColEl.style.cssText = [
      'width:40%;flex-shrink:0;display:flex;flex-direction:column;',
      'overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
    ].join('');
    body.appendChild(leftColEl);

    pickerEl = document.createElement('div');
    pickerEl.style.cssText = [
      'flex:1;display:flex;flex-direction:column;',
      'overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
    ].join('');
    body.appendChild(pickerEl);

    rootEl.appendChild(body);

    // Bottom action bar: CANCEL + SEND
    var actionBar = document.createElement('div');
    actionBar.style.cssText = [
      'display:flex;gap:6px;flex-shrink:0;',
      'padding:4px 6px 6px 6px;',
      'border-top:2px solid ' + T.border + ';',
      'background:' + T.bgDark + ';',
    ].join('');

    var cancelBtn = buildButton('CANCEL', {
      fill: T.darkBtn, color: T.red, fontSize: '24px', fontFamily: T.fh,
      onTap: function() { onCancel(); },
    });
    cancelBtn.style.flex = '1';
    cancelBtn.style.height = '42px';

    var sendBtn = buildButton('SEND', {
      fill: T.darkBtn, color: T.goGreen, fontSize: '24px', fontFamily: T.fh,
      onTap: function() { handleSend(); },
    });
    sendBtn.style.flex = '2';
    sendBtn.style.height = '42px';

    actionBar.appendChild(cancelBtn);
    actionBar.appendChild(sendBtn);
    rootEl.appendChild(actionBar);

    container.appendChild(rootEl);
    renderTabs();
    renderContent();
  }

  // ── Tab bar rendering ──
  function renderTabs() {
    tabBarEl.innerHTML = '';
    tabs.forEach(function(tab) {
      var isActive = tab.key === activeTabKey;
      var tabEl = document.createElement('div');

      // Build label text
      var labelText = tab.label;
      if (tab.type === 'mandatory' && activeItem.mandatorySelections[tab.key]) {
        labelText = tab.label + ': ' + activeItem.mandatorySelections[tab.key].label;
      }
      if (tab.type === 'note' && activeItem.note.length > 0) {
        labelText = 'NOTE \u2022';
      }

      tabEl.style.cssText = [
        'flex:0 0 auto;height:34px;padding:0 12px;',
        'display:flex;align-items:center;justify-content:center;',
        'font-family:' + T.fh + ';font-size:18px;cursor:pointer;',
        'white-space:nowrap;',
        'border:2px solid ' + T.gold + ';',
        'border-bottom:' + (isActive ? 'none' : '2px solid ' + T.gold) + ';',
        'background:' + (isActive ? T.bg5 : T.bgDark) + ';',
        'color:' + (isActive ? T.gold : T.mutedText) + ';',
        'transition:background 80ms,color 80ms;',
      ].join('');
      tabEl.textContent = labelText;

      tabEl.addEventListener('pointerup', function() {
        activeTabKey = tab.key;
        // Reset prefix to ADD when switching to optional tab
        if (tab.type === 'optional') activeOptPrefix = 'ADD';
        renderTabs();
        renderContent();
      });

      tabBarEl.appendChild(tabEl);
    });
  }

  // ── Content rendering (left col + picker) ──
  function renderContent() {
    leftColEl.innerHTML = '';
    pickerEl.innerHTML = '';

    var tab = tabs.find(function(t) { return t.key === activeTabKey; });
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
    // Left column: empty
    var emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'padding:12px;font-family:' + T.fb + ';font-size:18px;color:' + T.mutedText + ';';
    emptyMsg.textContent = '';
    leftColEl.appendChild(emptyMsg);

    // Picker: options grid, single-select
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:4px;';

    var group = tab.group;
    var currentKey = activeItem.mandatorySelections[group.key]
      ? activeItem.mandatorySelections[group.key].key
      : null;

    (group.options || []).forEach(function(opt) {
      var isSelected = opt.key === currentKey;
      var btn = document.createElement('div');
      btn.style.cssText = [
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'min-height:56px;cursor:pointer;padding:6px;',
        'font-family:' + T.fb + ';font-weight:bold;text-align:center;',
        'border:3px solid ' + T.gold + ';',
        'background:' + (isSelected ? T.gold : T.darkBtn) + ';',
        'color:' + (isSelected ? T.bgDark : T.gold) + ';',
        'transition:background 80ms,color 80ms;',
      ].join('');

      var label = document.createElement('div');
      label.style.fontSize = '20px';
      label.textContent = opt.label;
      btn.appendChild(label);

      if (typeof opt.price === 'number' && opt.price !== 0) {
        var priceEl = document.createElement('div');
        priceEl.style.cssText = 'font-size:16px;opacity:0.8;';
        priceEl.textContent = (opt.price > 0 ? '+' : '') + '$' + opt.price.toFixed(2);
        btn.appendChild(priceEl);
      }

      btn.addEventListener('pointerup', function() {
        onMandatoryChange(group.key, opt);
      });

      grid.appendChild(btn);
    });

    pickerEl.appendChild(grid);
  }

  function onMandatoryChange(groupKey, newSelection) {
    activeItem.mandatorySelections[groupKey] = {
      key: newSelection.key,
      label: newSelection.label,
      price: newSelection.price || 0,
    };

    // Re-key optional modifiers against new mandatory selection (reprice)
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
    renderContent();
  }

  // ═══ INCLUDED TAB ═══
  function renderIncluded(tab) {
    // Left column: empty
    leftColEl.appendChild(_emptyLeft());

    // Picker: list of included items with toggle
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:4px;';

    includedItems.forEach(function(incl) {
      var isRemoved = activeItem.includedRemovals.indexOf(incl.id) !== -1;
      var btn = document.createElement('div');
      btn.style.cssText = [
        'display:flex;align-items:center;justify-content:center;',
        'min-height:52px;cursor:pointer;padding:6px;',
        'font-family:' + T.fb + ';font-size:20px;font-weight:bold;text-align:center;',
        'border:3px solid ' + (isRemoved ? T.red : T.goGreen) + ';',
        'background:' + (isRemoved ? T.redD : T.darkBtn) + ';',
        'color:' + (isRemoved ? T.redL : T.goGreen) + ';',
        'transition:background 80ms,color 80ms;',
      ].join('');
      btn.textContent = isRemoved ? 'NO ' + incl.label : incl.label;

      btn.addEventListener('pointerup', function() {
        var idx = activeItem.includedRemovals.indexOf(incl.id);
        if (idx !== -1) {
          activeItem.includedRemovals.splice(idx, 1);
        } else {
          activeItem.includedRemovals.push(incl.id);
        }
        fireUpdate();
        renderContent();
      });

      grid.appendChild(btn);
    });

    pickerEl.appendChild(grid);
  }

  // ═══ OPTIONAL TAB ═══
  function renderOptional(tab) {
    var group = tab.group;

    // Left column: prefix strip + active selections
    var prefixStrip = document.createElement('div');
    prefixStrip.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:8px;';

    OPT_PREFIXES.forEach(function(pfx) {
      var isActive = activeOptPrefix === pfx.id;
      var btn = document.createElement('div');
      btn.style.cssText = [
        'height:38px;display:flex;align-items:center;justify-content:center;',
        'cursor:pointer;font-family:' + T.fh + ';font-size:18px;font-weight:bold;',
        'border:2px solid ' + pfx.color + ';',
        'background:' + (isActive ? pfx.color : T.darkBtn) + ';',
        'color:' + (isActive ? pfx.textColor : pfx.color) + ';',
        'transition:background 80ms,color 80ms;',
      ].join('');
      btn.textContent = pfx.label;

      btn.addEventListener('pointerup', function() {
        activeOptPrefix = pfx.id;
        renderContent();
      });

      prefixStrip.appendChild(btn);
    });

    leftColEl.appendChild(prefixStrip);

    // Active selections list for this group
    var selectionsEl = document.createElement('div');
    selectionsEl.style.cssText = [
      'flex:1;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
      'background:' + T.bgDark + ';padding:4px;',
    ].join('');
    applySunkenStyle(selectionsEl);

    var groupMods = activeItem.optionalModifiers.filter(function(m) {
      return m.groupKey === group.key;
    });

    if (groupMods.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-family:' + T.fb + ';font-size:16px;color:' + T.mutedText + ';padding:8px;text-align:center;';
      empty.textContent = 'No selections';
      selectionsEl.appendChild(empty);
    } else {
      groupMods.forEach(function(mod, idx) {
        var row = document.createElement('div');
        row.style.cssText = [
          'display:flex;justify-content:space-between;align-items:center;',
          'padding:3px 4px;cursor:pointer;',
          'font-family:' + T.fb + ';font-size:16px;color:' + T.gold + ';',
          'border-bottom:1px solid ' + T.border + ';',
        ].join('');

        var pfxDef = OPT_PREFIXES.find(function(p) { return p.id === mod.prefix; });
        var pfxColor = pfxDef ? pfxDef.color : T.gold;

        var label = document.createElement('span');
        label.innerHTML = '<span style="color:' + pfxColor + ';font-weight:bold;">' + mod.prefix + '</span> ' + mod.label;
        row.appendChild(label);

        var priceLabel = document.createElement('span');
        priceLabel.style.cssText = 'flex-shrink:0;margin-left:4px;';
        if (mod.price > 0) {
          priceLabel.textContent = '+$' + mod.price.toFixed(2);
        }
        row.appendChild(priceLabel);

        // Tap to remove
        row.addEventListener('pointerup', function() {
          activeItem.optionalModifiers.splice(
            activeItem.optionalModifiers.indexOf(mod), 1
          );
          fireUpdate();
          renderContent();
        });

        selectionsEl.appendChild(row);
      });
    }

    leftColEl.appendChild(selectionsEl);

    // Picker: options grid
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:4px;';

    // Get current mandatory key for pricing
    var mandKey = _currentMandatoryKey();

    (group.options || []).forEach(function(opt) {
      var price = _resolvePrice(opt, mandKey);
      var btn = document.createElement('div');
      btn.style.cssText = [
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'min-height:52px;cursor:pointer;padding:6px;',
        'font-family:' + T.fb + ';font-weight:bold;text-align:center;',
        'border:3px solid ' + T.gold + ';',
        'background:' + T.darkBtn + ';',
        'color:' + T.gold + ';',
        'transition:background 80ms;',
      ].join('');

      var label = document.createElement('div');
      label.style.fontSize = '20px';
      label.textContent = opt.label;
      btn.appendChild(label);

      if (price > 0) {
        var priceEl = document.createElement('div');
        priceEl.style.cssText = 'font-size:16px;opacity:0.8;';
        priceEl.textContent = '+$' + price.toFixed(2);
        btn.appendChild(priceEl);
      }

      btn.addEventListener('pointerdown', function() {
        btn.style.background = T.gold;
        btn.style.color = T.bgDark;
      });
      btn.addEventListener('pointerup', function() {
        btn.style.background = T.darkBtn;
        btn.style.color = T.gold;
        applyOptionalMod(group.key, opt, mandKey);
      });
      btn.addEventListener('pointerleave', function() {
        btn.style.background = T.darkBtn;
        btn.style.color = T.gold;
      });

      grid.appendChild(btn);
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
    });
    fireUpdate();
    renderContent();
  }

  // ═══ ALLERGEN TAB ═══
  function renderAllergen(tab) {
    leftColEl.appendChild(_emptyLeft());

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:4px;';

    ALLERGENS.forEach(function(a) {
      if (a.id === 'other') {
        // OTHER / NOTE button
        var isActive = activeItem.allergenNote.length > 0;
        var btn = document.createElement('div');
        btn.style.cssText = [
          'display:flex;align-items:center;justify-content:center;',
          'min-height:52px;cursor:pointer;padding:6px;',
          'font-family:' + T.fb + ';font-size:20px;font-weight:bold;text-align:center;',
          'border:3px solid ' + T.red + ';',
          'background:' + (isActive ? T.red : T.darkBtn) + ';',
          'color:' + (isActive ? '#fff' : T.red) + ';',
          'transition:background 80ms;',
        ].join('');
        btn.textContent = a.label;
        btn.addEventListener('pointerup', function() {
          showAllergenNoteInput();
        });
        grid.appendChild(btn);
        return;
      }

      var selected = activeItem.allergens.indexOf(a.id) !== -1;
      var btn = document.createElement('div');
      btn.style.cssText = [
        'display:flex;align-items:center;justify-content:center;',
        'min-height:52px;cursor:pointer;padding:6px;',
        'font-family:' + T.fb + ';font-size:20px;font-weight:bold;text-align:center;',
        'border:3px solid ' + T.red + ';',
        'background:' + (selected ? T.red : T.darkBtn) + ';',
        'color:' + (selected ? '#fff' : T.red) + ';',
        'transition:background 80ms;',
      ].join('');
      btn.textContent = a.label;

      btn.addEventListener('pointerup', function() {
        var idx = activeItem.allergens.indexOf(a.id);
        if (idx !== -1) {
          activeItem.allergens.splice(idx, 1);
        } else {
          activeItem.allergens.push(a.id);
        }
        fireUpdate();
        renderContent();
      });

      grid.appendChild(btn);
    });

    pickerEl.appendChild(grid);

    // Show allergen note input if it's open
    if (_allergenNoteInput) {
      var noteArea = document.createElement('div');
      noteArea.style.cssText = 'padding:8px 4px;';
      var input = document.createElement('input');
      input.type = 'text';
      input.value = activeItem.allergenNote;
      input.placeholder = 'Describe allergen...';
      input.style.cssText = [
        'width:100%;box-sizing:border-box;padding:8px 12px;',
        'font-family:' + T.fb + ';font-size:20px;',
        'background:' + T.bgDark + ';color:' + T.gold + ';',
        'border:2px solid ' + T.red + ';outline:none;',
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

  function showAllergenNoteInput() {
    _allergenNoteInput = true;
    renderContent();
  }

  // ═══ NOTE TAB ═══
  function renderNote(tab) {
    leftColEl.appendChild(_emptyLeft());

    var noteArea = document.createElement('div');
    noteArea.style.cssText = 'flex:1;display:flex;flex-direction:column;padding:8px;';

    var label = document.createElement('div');
    label.style.cssText = 'font-family:' + T.fh + ';font-size:20px;color:' + T.gold + ';margin-bottom:8px;';
    label.textContent = 'Special Instructions';
    noteArea.appendChild(label);

    var textarea = document.createElement('textarea');
    textarea.value = activeItem.note;
    textarea.placeholder = 'Special instructions...';
    textarea.style.cssText = [
      'flex:1;width:100%;box-sizing:border-box;padding:10px 14px;',
      'font-family:' + T.fb + ';font-size:20px;',
      'background:' + T.bgDark + ';color:' + T.gold + ';',
      'border:2px solid ' + T.gold + ';outline:none;',
      'resize:none;',
    ].join('');
    textarea.addEventListener('input', function() {
      activeItem.note = textarea.value;
      fireUpdate();
      renderTabs(); // update NOTE dot indicator
    });
    noteArea.appendChild(textarea);
    pickerEl.appendChild(noteArea);

    requestAnimationFrame(function() { textarea.focus(); });
  }

  // ═══ SEND ═══
  function handleSend() {
    // Validate mandatory selections
    var unsatisfied = mandatoryGroups.filter(function(g) {
      return !activeItem.mandatorySelections[g.key];
    });
    if (unsatisfied.length > 0) {
      // Switch to first unsatisfied mandatory tab
      activeTabKey = unsatisfied[0].key;
      renderTabs();
      renderContent();
      return;
    }

    onSend(activeItem);
  }

  // ═══ HELPERS ═══
  function _emptyLeft() {
    var el = document.createElement('div');
    el.style.cssText = 'flex:1;';
    return el;
  }

  function _currentMandatoryKey() {
    // Return the first mandatory selection key for pricing lookups
    var keys = Object.keys(activeItem.mandatorySelections);
    if (keys.length > 0) {
      return activeItem.mandatorySelections[keys[0]].key;
    }
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
    // Build display-ready item for ticket preview
    var mands = activeItem.mandatorySelections;
    var mandLabels = [];
    mandatoryGroups.forEach(function(g) {
      if (mands[g.key]) mandLabels.push(mands[g.key].label);
    });

    var mandPrice = 0;
    Object.keys(mands).forEach(function(k) {
      mandPrice += mands[k].price || 0;
    });

    var mods = [];
    activeItem.optionalModifiers.forEach(function(m) {
      mods.push({
        name: m.prefix + ' ' + m.label,
        price: m.prefix === 'NO' ? 0 : m.price,
        charged: m.prefix !== 'NO' && m.price > 0,
        prefix: null,
      });
    });

    // Include removals as NO mods
    activeItem.includedRemovals.forEach(function(rid) {
      var incl = includedItems.find(function(i) { return i.id === rid; });
      if (incl) {
        mods.push({ name: 'NO ' + incl.label, price: 0, charged: false, prefix: null });
      }
    });

    // Allergens as special mod lines
    activeItem.allergens.forEach(function(aId) {
      var a = ALLERGENS.find(function(x) { return x.id === aId; });
      if (a) {
        mods.push({ name: '\u26A0 ALLERGEN: ' + a.label, price: 0, charged: false, prefix: null });
      }
    });
    if (activeItem.allergenNote) {
      mods.push({ name: '\u26A0 ALLERGEN: ' + activeItem.allergenNote, price: 0, charged: false, prefix: null });
    }

    // Note
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
    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl);
    }
    rootEl = null;
  };

  self.getActiveItem = function() {
    return activeItem;
  };

  self.getOutputItem = function() {
    return buildOutputItem();
  };

  // Build on construction
  build();
  // Fire initial update for ticket preview
  fireUpdate();
}
