// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Modifier Panel
//  Tab-based modifier builder for menu items
//  Overlays on the hex-canvas in order-entry scene
//  All state is ephemeral until SEND
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, applySunkenStyle, chamfer, shadowColor } from './tokens.js';
import { showKeyboard } from './keyboard.js';

// ── Standard allergen list (FDA/industry standard colors) ──
var ALLERGENS = [
  { id: 'dairy',     label: 'Dairy',        color: '#4A90D9' },
  { id: 'eggs',      label: 'Eggs',         color: '#F5C518' },
  { id: 'fish',      label: 'Fish',         color: '#1B3A5C', light: true },
  { id: 'gluten',    label: 'Gluten',       color: '#A0794A' },
  { id: 'nuts',      label: 'Nuts',         color: '#E87C1E' },
  { id: 'shellfish', label: 'Shellfish',    color: '#D94040' },
  { id: 'soy',       label: 'Soy',          color: '#5AAE3A' },
  { id: 'other',     label: 'Other / Note', color: '#8855BB' },
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
  var catColor = opts.catColor || T.mint;

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

  // ── Build tab list ──
  // Tabs: MAND, INCL, OPT, PREP, NOTE, ALRG
  var tabs = [];
  if (mandatoryGroups.length > 0) {
    tabs.push({ type: 'mandatory', key: '_mandatory', label: 'MAND', tabColor: catColor });
  }
  if (includedItems.length > 0) {
    tabs.push({ type: 'included', key: '_included', label: 'INCL', tabColor: _lightenHex(catColor, 0.3) });
  }
  var nonPrepGroups = [];
  var prepGroups = [];
  optionalGroups.forEach(function(g) {
    if (g.key === 'prep') { prepGroups.push(g); }
    else { nonPrepGroups.push(g); }
  });
  if (nonPrepGroups.length > 0) {
    tabs.push({ type: 'optional', key: '_optional', label: 'OPT', tabColor: T.mint, groups: nonPrepGroups });
  }
  if (prepGroups.length > 0) {
    tabs.push({ type: 'optional', key: '_prep', label: 'PREP', tabColor: T.mint, groups: prepGroups });
  }
  tabs.push({ type: 'note', key: '_note', label: 'NOTE', tabColor: T.gold });
  tabs.push({ type: 'allergen', key: '_allergen', label: 'ALRG', tabColor: T.vermillion, tabTextActive: '#ffffff' });

  var activeTabKey = tabs.length > 0 ? tabs[0].key : null;
  var activeOptPrefix = 'ADD';
  var activePlacement = 'whole';
  var expandedMandatory = null; // key of the expanded mandatory card

  // ── DOM refs ──
  var rootEl = null;
  var tabBarEl = null;
  var topBarEl = null;
  var pickerEl = null;
  var prefixBarEl = null;
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
    ].join('');

    // Inner card: beveled border (light top-left, dark bottom-right)
    var card = document.createElement('div');
    card.style.cssText = [
      'width:100%;height:100%;',
      'background:' + T.bg + ';',
      'border-top:7px solid ' + _lightenHex(T.numpadChassis, 0.2) + ';',
      'border-left:7px solid ' + _lightenHex(T.numpadChassis, 0.2) + ';',
      'border-bottom:7px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
      'border-right:7px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
      'display:flex;flex-direction:column;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');
    card.style.clipPath = chamfer(10);
    rootEl.appendChild(card);

    // ── Main body: tabs | top+picker | prefixes ──
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;display:flex;overflow:hidden;min-height:0;';

    // Vertical tab bar (left)
    tabBarEl = document.createElement('div');
    tabBarEl.style.cssText = [
      'width:80px;flex-shrink:0;display:flex;flex-direction:column;',
      'gap:4px;padding:6px;',
      'overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
      'background:' + T.bgDark + ';',
      'border-right:3px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
    ].join('');
    body.appendChild(tabBarEl);

    // Center content area: top bar + picker
    var centerArea = document.createElement('div');
    centerArea.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

    // Top bar (placement only now)
    topBarEl = document.createElement('div');
    topBarEl.style.cssText = [
      'flex-shrink:0;padding:6px;',
      'display:flex;flex-direction:column;gap:4px;',
      'background:' + T.bgDark + ';',
      'border-bottom:3px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
    ].join('');
    centerArea.appendChild(topBarEl);

    // Picker area
    pickerEl = document.createElement('div');
    pickerEl.style.cssText = [
      'flex:1;',
      'overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
      'padding:6px;',
    ].join('');
    centerArea.appendChild(pickerEl);

    body.appendChild(centerArea);

    // Prefix bar (right side — only visible for optional tabs)
    prefixBarEl = document.createElement('div');
    prefixBarEl.style.cssText = [
      'width:70px;flex-shrink:0;display:flex;flex-direction:column;',
      'gap:4px;padding:6px;',
      'background:' + T.bgDark + ';',
      'border-left:3px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
    ].join('');
    body.appendChild(prefixBarEl);

    card.appendChild(body);

    // ── Bottom action bar: CANCEL + SEND ──
    var actionBar = document.createElement('div');
    actionBar.style.cssText = [
      'display:flex;gap:8px;flex-shrink:0;',
      'padding:6px 8px 8px 8px;',
      'border-top:3px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
      'background:' + T.bgDark + ';',
    ].join('');

    var undoPair = buildStyledButton({ label: '<<<', variant: 'dark', size: 'md', onClick: function() { onCancel(); } });
    undoPair.inner.style.color = T.textPrimary;
    undoPair.wrap.style.flex = '1';
    var confirmPair = buildStyledButton({ label: 'CONFIRM', variant: 'mint', size: 'md', onClick: function() { handleSend(); } });
    confirmPair.wrap.style.flex = '2';

    actionBar.appendChild(undoPair.wrap);
    actionBar.appendChild(confirmPair.wrap);
    card.appendChild(actionBar);

    container.appendChild(rootEl);
    renderTabs();
    renderTopBar();
    renderPrefixBar();
    renderPicker();
  }

  // ═══ VERTICAL TAB BAR ═══
  function renderTabs() {
    tabBarEl.innerHTML = '';
    tabs.forEach(function(tab) {
      var isActive = tab.key === activeTabKey;

      var labelText = tab.label;
      if (tab.type === 'note' && activeItem.note.length > 0) {
        labelText = 'NOTE\u2022';
      }

      var pair = buildStyledButton({ label: labelText, variant: 'ghost', size: 'sm' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';
      pair.inner.style.fontSize = '12px';
      pair.inner.style.letterSpacing = '1px';
      pair.inner.style.padding = '6px 4px';
      if (isActive) {
        pair.wrap.style.background = tab.tabColor;
        pair.inner.style.color = tab.tabTextActive || T.bgDark;
      } else {
        pair.inner.style.color = tab.tabColor;
      }

      pair.wrap.addEventListener('pointerup', function() {
        activeTabKey = tab.key;
        expandedMandatory = null;
        if (tab.type === 'optional') activeOptPrefix = 'ADD';
        renderTabs();
        renderTopBar();
        renderPrefixBar();
        renderPicker();
      });

      tabBarEl.appendChild(pair.wrap);
    });
  }

  // ═══ TOP BAR (placement only) ═══
  function renderTopBar() {
    topBarEl.innerHTML = '';
    var tab = _activeTab();
    if (!tab) return;

    // Placement bar — for optional and mandatory tabs
    if (tab.type !== 'optional' && tab.type !== 'mandatory') return;

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
        'background:' + (isActive ? T.numpadChassis : 'transparent') + ';',
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

  }

  function _refreshPlacement(segs) {
    PLACEMENTS.forEach(function(pl) {
      var seg = segs[pl.id];
      if (!seg) return;
      var isActive = activePlacement === pl.id;
      seg.style.background = isActive ? T.numpadChassis : 'transparent';
      seg.style.color = isActive ? T.bgDark : T.mutedText;
    });
  }

  // ═══ PREFIX BAR (right side — optional tabs only) ═══
  function renderPrefixBar() {
    prefixBarEl.innerHTML = '';
    var tab = _activeTab();

    // Only show for optional tabs
    if (!tab || tab.type !== 'optional') {
      prefixBarEl.style.display = 'none';
      return;
    }
    prefixBarEl.style.display = '';

    OPT_PREFIXES.forEach(function(pfx) {
      var isActive = activeOptPrefix === pfx.id;
      var v = isActive ? pfx.variant : 'dark';
      var pair = buildStyledButton({ label: pfx.label, variant: v, size: 'sm' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';
      pair.inner.style.fontSize = '10px';
      pair.inner.style.letterSpacing = '1px';
      pair.inner.style.padding = '6px 2px';

      pair.wrap.addEventListener('pointerup', function() {
        activeOptPrefix = pfx.id;
        renderPrefixBar();
      });

      prefixBarEl.appendChild(pair.wrap);
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
    // Show all mandatory groups as expandable cards
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    mandatoryGroups.forEach(function(group) {
      var isExpanded = expandedMandatory === group.key;
      var currentSel = activeItem.mandatorySelections[group.key];
      var selLabel = currentSel ? currentSel.label : '\u2014';

      // Card header — tap to expand/collapse
      var headerVariant = currentSel ? 'dark' : 'gold';
      var headerLabel = group.label + ': ' + selLabel;
      var headerPair = buildStyledButton({ label: headerLabel, variant: headerVariant, size: 'sm' });
      headerPair.wrap.style.width = '100%';
      headerPair.wrap.style.minWidth = '0';
      headerPair.inner.style.fontSize = '12px';
      headerPair.inner.style.justifyContent = 'space-between';
      headerPair.inner.style.padding = '4px 8px';

      // Arrow indicator
      var arrow = document.createElement('span');
      arrow.style.cssText = 'margin-left:6px;font-size:10px;';
      arrow.textContent = isExpanded ? '\u25B2' : '\u25BC';
      headerPair.inner.appendChild(arrow);

      headerPair.wrap.addEventListener('pointerup', function() {
        expandedMandatory = isExpanded ? null : group.key;
        renderPicker();
      });

      wrap.appendChild(headerPair.wrap);

      // Expanded options grid
      if (isExpanded) {
        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px 0;';

        var currentKey = currentSel ? currentSel.key : null;

        (group.options || []).forEach(function(opt) {
          var isSelected = opt.key === currentKey;
          var variant = isSelected ? 'mint' : 'dark';
          var pair = buildStyledButton({ label: opt.label, variant: variant, size: 'md' });
          pair.wrap.style.width = '100%';
          pair.wrap.style.minWidth = '0';
          pair.inner.style.fontSize = '20px';
          pair.inner.style.padding = '4px 3px';
          pair.inner.style.lineHeight = '1.1';
          if (isSelected) {
            pair.wrap.style.background = T.numpadChassis;
            pair.inner.style.color = T.bgDark;
          }

          if (typeof opt.price === 'number' && opt.price !== 0) {
            var priceEl = document.createElement('div');
            priceEl.style.cssText = 'font-size:8px;color:' + T.gold + ';margin-top:1px;';
            priceEl.textContent = (opt.price > 0 ? '+' : '') + '$' + Math.abs(opt.price).toFixed(2);
            pair.inner.appendChild(priceEl);
          }

          pair.wrap.addEventListener('pointerup', function() {
            onMandatoryChange(group.key, opt);
          });

          grid.appendChild(pair.wrap);
        });

        wrap.appendChild(grid);
      }
    });

    pickerEl.appendChild(wrap);
  }

  function onMandatoryChange(groupKey, newSelection) {
    activeItem.mandatorySelections[groupKey] = {
      key: newSelection.key, label: newSelection.label, price: newSelection.price || 0,
    };

    // Reprice optional modifiers against ALL mandatory selections
    activeItem.optionalModifiers = activeItem.optionalModifiers.map(function(mod) {
      if (mod.priceMap) {
        var resolved;
        // Try each mandatory selection key against the priceMap
        var mandKeys = Object.keys(activeItem.mandatorySelections);
        for (var i = 0; i < mandKeys.length; i++) {
          var mk = activeItem.mandatorySelections[mandKeys[i]].key;
          if (mod.priceMap[mk] !== undefined) {
            resolved = mod.priceMap[mk];
            break;
          }
        }
        if (resolved === undefined) resolved = mod.priceMap['default'];
        if (resolved === undefined) resolved = mod.price;
        return Object.assign({}, mod, { price: resolved });
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
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;';

    includedItems.slice().sort(function(a, b) { return a.label.localeCompare(b.label); }).forEach(function(incl) {
      var isRemoved = activeItem.includedRemovals.indexOf(incl.id) !== -1;
      var variant = isRemoved ? 'vermillion' : 'dark';
      var label = isRemoved ? 'NO ' + incl.label : incl.label;
      var pair = buildStyledButton({ label: label, variant: variant, size: 'md' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';
      pair.inner.style.fontSize = '20px';
      pair.inner.style.fontFamily = T.fb;

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
    var groups = tab.groups || (tab.group ? [tab.group] : []);
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;';

    var mandKey = _currentMandatoryKey();

    // Merge all groups' options, tag each with its groupKey, sort alphabetically
    var allOpts = [];
    groups.forEach(function(g) {
      (g.options || []).forEach(function(opt) {
        allOpts.push({ opt: opt, groupKey: g.key });
      });
    });
    allOpts.sort(function(a, b) {
      return a.opt.label.localeCompare(b.opt.label);
    });

    allOpts.forEach(function(entry) {
      var opt = entry.opt;
      var price = _resolvePrice(opt, mandKey);
      var pair = buildStyledButton({ label: opt.label, variant: 'dark', size: 'md' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';
      pair.inner.style.fontSize = '20px';
      pair.inner.style.fontFamily = T.fb;
      pair.inner.style.padding = '4px 3px';
      pair.inner.style.lineHeight = '1.1';

      // Specials get yellow border to stand out
      if (opt.special) {
        pair.wrap.style.outline = '2px solid ' + T.gold;
        pair.wrap.style.outlineOffset = '-2px';
      }

      if (price > 0) {
        var priceEl = document.createElement('div');
        priceEl.style.cssText = 'font-size:8px;color:' + T.gold + ';margin-top:1px;';
        priceEl.textContent = '+$' + price.toFixed(2);
        pair.inner.appendChild(priceEl);
      }

      pair.wrap.addEventListener('pointerup', function() {
        applyOptionalMod(entry.groupKey, opt, mandKey);
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
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;';

    ALLERGENS.slice().sort(function(a, b) { return a.label.localeCompare(b.label); }).forEach(function(a) {
      if (a.id === 'other') {
        var isActive = activeItem.allergenNote.length > 0;
        var pair = buildStyledButton({ label: a.label, variant: 'dark', size: 'md' });
        pair.wrap.style.width = '100%';
        pair.wrap.style.minWidth = '0';
        pair.inner.style.fontSize = '20px';
        pair.wrap.style.background = a.color;
        pair.inner.style.color = a.light ? '#ffffff' : T.bgDark;
        if (isActive) {
          pair.wrap.style.outline = '3px solid ' + T.numpadChassis;
          pair.wrap.style.outlineOffset = '-3px';
        }
        pair.wrap.addEventListener('pointerup', function() {
          showKeyboard({
            placeholder: 'Describe allergen...',
            initialValue: activeItem.allergenNote,
            maxLength: 60,
            onDone: function(val) {
              activeItem.allergenNote = val || '';
              fireUpdate();
              renderPicker();
            },
            onDismiss: function() {},
            dismissOnDone: true,
          });
        });
        grid.appendChild(pair.wrap);
        return;
      }

      var selected = activeItem.allergens.indexOf(a.id) !== -1;
      var pair = buildStyledButton({ label: a.label, variant: 'dark', size: 'md' });
      pair.wrap.style.width = '100%';
      pair.wrap.style.minWidth = '0';
      pair.inner.style.fontSize = '20px';
      pair.wrap.style.background = a.color;
      pair.inner.style.color = a.light ? '#ffffff' : T.bgDark;
      if (selected) {
        pair.wrap.style.outline = '3px solid ' + T.numpadChassis;
        pair.wrap.style.outlineOffset = '-3px';
      }

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

    // Show current allergen note if set
    if (activeItem.allergenNote) {
      var noteDisplay = document.createElement('div');
      noteDisplay.style.cssText = [
        'margin-top:6px;padding:6px 10px;',
        'font-family:' + T.fb + ';font-size:14px;',
        'background:' + T.bgDark + ';color:' + T.textPrimary + ';',
        'border:2px solid ' + T.red + ';border-radius:5px;',
      ].join('');
      noteDisplay.textContent = '\u26A0 ' + activeItem.allergenNote;
      pickerEl.appendChild(noteDisplay);
    }
  }

  // ═══ NOTE TAB ═══
  function renderNote(tab) {
    var noteArea = document.createElement('div');
    noteArea.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:8px;padding:4px;';

    // Show current note if set
    if (activeItem.note) {
      var noteDisplay = document.createElement('div');
      noteDisplay.style.cssText = [
        'padding:10px 14px;',
        'font-family:' + T.fb + ';font-size:16px;',
        'background:' + T.bgDark + ';color:' + T.textPrimary + ';',
        'border-radius:5px;',
      ].join('');
      noteDisplay.textContent = activeItem.note;
      noteArea.appendChild(noteDisplay);
    }

    // Button to open keyboard
    var editPair = buildStyledButton({
      label: activeItem.note ? 'EDIT NOTE' : 'ADD NOTE',
      variant: 'dark', size: 'md',
      onClick: function() {
        showKeyboard({
          placeholder: 'Special instructions...',
          initialValue: activeItem.note,
          maxLength: 100,
          onDone: function(val) {
            activeItem.note = val || '';
            fireUpdate();
            renderTabs();
            renderPicker();
          },
          onDismiss: function() {},
          dismissOnDone: true,
        });
      },
    });
    editPair.wrap.style.width = '100%';
    noteArea.appendChild(editPair.wrap);

    // Clear button if note exists
    if (activeItem.note) {
      var clearPair = buildStyledButton({
        label: 'CLEAR NOTE', variant: 'vermillion', size: 'sm',
        onClick: function() {
          activeItem.note = '';
          fireUpdate();
          renderTabs();
          renderPicker();
        },
      });
      clearPair.wrap.style.width = '100%';
      noteArea.appendChild(clearPair.wrap);
    }

    pickerEl.appendChild(noteArea);
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

    var mandPrice = 0;
    Object.keys(mands).forEach(function(k) { mandPrice += mands[k].price || 0; });

    // Mandatory selections as modifier lines
    var mods = [];
    mandatoryGroups.forEach(function(g) {
      if (mands[g.key]) {
        mods.push({
          name: mands[g.key].label,
          price: mands[g.key].price || 0,
          charged: (mands[g.key].price || 0) > 0,
          prefix: null,
        });
      }
    });
    activeItem.optionalModifiers.forEach(function(m) {
      var halfSide = m.placement === '1st' ? 'Left' : m.placement === '2nd' ? 'Right' : null;
      mods.push({
        name: m.prefix + ' ' + m.label,
        price: m.prefix === 'NO' ? 0 : m.price,
        charged: m.prefix !== 'NO' && m.price > 0,
        prefix: halfSide,
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

    return {
      itemLabel: activeItem.itemLabel,
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

