// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Modifier Panel
//  Single-screen modifier builder for menu items
//  Overlays on the hex-canvas in order-entry scene
//  All state is ephemeral until SEND
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, applySunkenStyle, chamfer, shadowColor } from './tokens.js';
import { showKeyboard } from './keyboard.js';
import { SceneManager } from './scene-manager.js';
import { defineScene } from './scene-manager-2.js';
import { buildCard, applyCardBevel } from './theme-manager.js';

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

// ── Prefix definitions for optional section ──
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
 * ModifierPanel — single-screen modifier builder
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │  Item Name: Modifiers                    │
 *   ├──────────────────────────────────────────┤
 *   │  [1st | Whole | 2nd]                     │
 *   ├──────────────────────────────────────────┤
 *   │ ┌─ Mandatory: ────────────────────────┐  │
 *   │ │ Size: [Sm][Med][Lg][XL]             │  │
 *   │ └────────────────────────────────────-┘  │
 *   │ ┌─ Included: ────────────────────────┐   │
 *   │ │  [Cheese] [Sauce]                  │   │
 *   │ └────────────────────────────────────-┘  │
 *   │ ┌─ Optional: ────────────────────────┐   │
 *   │ │  [grid of options]                 │   │
 *   │ │  [ADD][NO][EXTRA][ON SIDE][SUB]    │   │
 *   │ └────────────────────────────────────-┘  │
 *   ├──────────────────────────────────────────┤
 *   │  [<<<]  [NOTE] [ALRG]    [CONFIRM]      │
 *   └──────────────────────────────────────────┘
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

  var activeOptPrefix = 'ADD';
  var activePlacement = 'whole';
  var expandedSection = mandatoryGroups.length > 0 ? 'mandatory' : null;
  var expandedMandGroup = null; // key of expanded mandatory group card

  // ── DOM refs ──
  var rootEl = null;
  var placementBarEl = null;
  var mandatorySectionEl = null;
  var mandatoryContentEl = null;
  var includedSectionEl = null;
  var includedContentEl = null;
  var optionalSectionEl = null;
  var optionalContentEl = null;
  var prefixBarEl = null;
  var _notePairRef = null;
  var _alrgPairRef = null;

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

  // ── Build a collapsible section card ──
  function _buildSection(label, sectionKey) {
    var pair = buildCard({ bg: T.bgDark, padding: '0', chamferSize: 6, borderWidth: 4, glow: false });
    var section = pair.card;
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.overflow = 'hidden';
    pair.wrap.style.overflow = 'hidden';

    var hdr = document.createElement('div');
    hdr.style.cssText = [
      'flex-shrink:0;padding:8px 12px;cursor:pointer;user-select:none;',
      'font-family:' + T.fh + ';font-size:18px;font-weight:bold;color:' + T.textPrimary + ';',
      'display:flex;justify-content:space-between;align-items:center;',
    ].join('');
    var hdrLabel = document.createElement('span');
    hdrLabel.textContent = label;
    var hdrArrow = document.createElement('span');
    hdrArrow.style.fontSize = '10px';
    hdr.appendChild(hdrLabel);
    hdr.appendChild(hdrArrow);
    hdr.addEventListener('pointerup', function() {
      expandedSection = expandedSection === sectionKey ? null : sectionKey;
      _applySectionStates();
    });
    section.appendChild(hdr);
    section._hdrArrow = hdrArrow;

    var content = document.createElement('div');
    content.style.cssText = [
      'flex:1;min-height:0;',
      'overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
      'padding:8px 10px;',
    ].join('');
    section.appendChild(content);
    section._content = content;
    section._sectionKey = sectionKey;

    pair.wrap._section = section;
    return pair;
  }

  // ── Expand/collapse section states ──
  function _applySectionStates() {
    var sections = [
      { key: 'mandatory', wrap: mandatorySectionEl, card: mandatorySectionEl ? mandatorySectionEl._section : null },
      { key: 'included', wrap: includedSectionEl, card: includedSectionEl ? includedSectionEl._section : null },
      { key: 'optional', wrap: optionalSectionEl, card: optionalSectionEl ? optionalSectionEl._section : null },
    ];
    var hasExpanded = expandedSection !== null;
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      if (!s.wrap || !s.card) continue;
      var isExpanded = expandedSection === s.key;
      s.card._hdrArrow.textContent = isExpanded ? '\u25B2' : '\u25BC';
      // Always show content — collapsed sections show preview, expanded scroll
      s.card._content.style.display = '';
      if (isExpanded) {
        // Expanded: takes remaining space, scrolls
        s.wrap.style.flex = '1 1 0';
        s.wrap.style.minHeight = '0';
        s.wrap.style.overflow = 'hidden';
        s.card._content.style.overflowY = 'auto';
      } else if (hasExpanded) {
        // Collapsed while another is expanded: header + compact preview
        s.wrap.style.flex = '0 0 auto';
        s.wrap.style.minHeight = '';
        s.wrap.style.overflow = 'hidden';
        s.card._content.style.overflowY = 'hidden';
        s.card._content.style.maxHeight = '40px';
      } else {
        // All collapsed: equal height, show content
        s.wrap.style.flex = '1';
        s.wrap.style.minHeight = '0';
        s.wrap.style.overflow = 'hidden';
        s.card._content.style.overflowY = 'auto';
        s.card._content.style.maxHeight = '';
      }
      // Reset maxHeight for expanded
      if (isExpanded) {
        s.card._content.style.maxHeight = '';
      }
    }
    // Prefix bar always visible when optional groups exist
    if (prefixBarEl) {
      prefixBarEl.style.display = '';
    }
  }

  // ── Build the panel ──
  function build() {
    rootEl = document.createElement('div');
    rootEl.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:5;';

    // Inner card: beveled border
    var card = document.createElement('div');
    card.style.cssText = [
      'width:100%;height:100%;',
      'background:' + T.bg + ';',
      'border-top:5px solid ' + _lightenHex(T.numpadChassis, 0.2) + ';',
      'border-left:5px solid ' + _lightenHex(T.numpadChassis, 0.2) + ';',
      'border-bottom:5px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
      'border-right:5px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
      'display:flex;flex-direction:column;',
      'box-sizing:border-box;overflow:hidden;',
    ].join('');
    card.style.clipPath = chamfer(8);
    rootEl.appendChild(card);

    // ── Header: "Item Name: Modifiers" (compact) ──
    var headerEl = document.createElement('div');
    headerEl.style.cssText = [
      'flex-shrink:0;padding:4px 10px;',
      'font-family:' + T.fh + ';font-size:18px;',
      'border-bottom:2px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
      'background:' + T.bgDark + ';',
    ].join('');
    var nameSpan = document.createElement('span');
    nameSpan.style.color = catColor;
    nameSpan.textContent = activeItem.itemLabel;
    var modSpan = document.createElement('span');
    modSpan.style.color = T.textPrimary;
    modSpan.textContent = ': Modifiers';
    headerEl.appendChild(nameSpan);
    headerEl.appendChild(modSpan);
    card.appendChild(headerEl);

    // ── Sections area: Mandatory / Included / Optional ──
    var sectionsArea = document.createElement('div');
    sectionsArea.style.cssText = [
      'flex:1;display:flex;flex-direction:column;',
      'gap:4px;padding:4px;',
      'overflow:hidden;min-height:0;',
    ].join('');

    if (mandatoryGroups.length > 0) {
      var mandPair = _buildSection('Mandatory:', 'mandatory');
      mandatorySectionEl = mandPair.wrap;
      mandatoryContentEl = mandPair.card._content;
      sectionsArea.appendChild(mandPair.wrap);
    }

    if (includedItems.length > 0) {
      var inclPair = _buildSection('Included:', 'included');
      includedSectionEl = inclPair.wrap;
      includedContentEl = inclPair.card._content;
      sectionsArea.appendChild(inclPair.wrap);
    }

    if (optionalGroups.length > 0) {
      var optPair = _buildSection('Optional:', 'optional');
      optionalSectionEl = optPair.wrap;
      optionalContentEl = optPair.card._content;
      sectionsArea.appendChild(optPair.wrap);
    }

    card.appendChild(sectionsArea);

    // ── Prefix bar (horizontal, above placement bar) ──
    if (optionalGroups.length > 0) {
      prefixBarEl = document.createElement('div');
      prefixBarEl.style.cssText = [
        'flex-shrink:0;display:flex;gap:4px;',
        'padding:2px 4px;',
        'background:' + T.bgDark + ';',
      ].join('');
      card.appendChild(prefixBarEl);
    }

    // ── Placement bar (compact, above action buttons) ──
    placementBarEl = document.createElement('div');
    placementBarEl.style.cssText = [
      'flex-shrink:0;padding:1px 4px;',
      'background:' + T.bgDark + ';',
    ].join('');
    card.appendChild(placementBarEl);

    // ── Bottom action bar: <<< | NOTE | ALRG | CONFIRM (compact) ──
    var actionBar = document.createElement('div');
    actionBar.style.cssText = [
      'display:flex;gap:4px;flex-shrink:0;',
      'padding:3px 4px 4px 4px;',
      'border-top:2px solid ' + _darkenHex(T.numpadChassis, 0.3) + ';',
      'background:' + T.bgDark + ';',
    ].join('');

    // Cancel/Undo button
    var undoPair = buildStyledButton({ label: '<<<', variant: 'vermillion', size: 'sm' });
    undoPair.inner.style.color = '#ffffff';
    undoPair.wrap.style.flex = '1';

    var _backTimer = null;
    var _backDidHold = false;
    var holdFill = document.createElement('div');
    holdFill.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,0.25);pointer-events:none;z-index:1;transition:none;';
    undoPair.wrap.style.position = 'relative';
    undoPair.wrap.style.overflow = 'hidden';
    undoPair.wrap.appendChild(holdFill);

    undoPair.wrap.addEventListener('pointerdown', function(e) {
      e.stopPropagation();
      _backDidHold = false;
      holdFill.style.transition = 'width 600ms linear';
      holdFill.style.width = '100%';
      _backTimer = setTimeout(function() {
        _backDidHold = true;
        holdFill.style.transition = 'none';
        holdFill.style.width = '0';
        onCancel();
      }, 600);
    });
    undoPair.wrap.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      clearTimeout(_backTimer);
      holdFill.style.transition = 'none';
      holdFill.style.width = '0';
      if (!_backDidHold) {
        if (activeItem.optionalModifiers.length > 0) {
          activeItem.optionalModifiers.pop();
        } else if (activeItem.includedRemovals.length > 0) {
          activeItem.includedRemovals.pop();
        } else if (activeItem.allergens.length > 0) {
          activeItem.allergens.pop();
        } else if (activeItem.allergenNote) {
          activeItem.allergenNote = '';
        } else if (activeItem.note) {
          activeItem.note = '';
        }
        fireUpdate();
        renderAll();
        _refreshNoteBtn();
        _refreshAlrgBtn();
      }
    });
    undoPair.wrap.addEventListener('pointerleave', function() {
      clearTimeout(_backTimer);
      holdFill.style.transition = 'none';
      holdFill.style.width = '0';
    });

    // NOTE button
    _notePairRef = buildStyledButton({ label: 'NOTE', variant: 'gold', size: 'sm', onClick: function() {
      showKeyboard({
        placeholder: 'Special instructions...',
        initialValue: activeItem.note,
        maxLength: 100,
        onDone: function(val) {
          activeItem.note = val || '';
          fireUpdate();
          _refreshNoteBtn();
        },
        onDismiss: function() {},
        dismissOnDone: true,
      });
    }});
    _notePairRef.wrap.style.flex = '0.7';
    _refreshNoteBtn();

    // ALRG button
    _alrgPairRef = buildStyledButton({ label: 'ALRG', variant: 'vermillion', size: 'sm', onClick: function() {
      SceneManager.interrupt('allergen-select', {
        onConfirm: function() {
          fireUpdate();
          _refreshAlrgBtn();
        },
        onCancel: function() {
          fireUpdate();
          _refreshAlrgBtn();
        },
        params: { activeItem: activeItem, fireUpdate: fireUpdate },
      });
    }});
    _alrgPairRef.wrap.style.flex = '0.7';
    _alrgPairRef.inner.style.color = '#ffffff';
    _refreshAlrgBtn();

    // CONFIRM button
    var confirmPair = buildStyledButton({ label: 'CONFIRM', variant: 'mint', size: 'sm', onClick: function() { handleSend(); } });
    confirmPair.wrap.style.flex = '2';

    actionBar.appendChild(undoPair.wrap);
    actionBar.appendChild(_notePairRef.wrap);
    actionBar.appendChild(_alrgPairRef.wrap);
    actionBar.appendChild(confirmPair.wrap);
    card.appendChild(actionBar);

    container.appendChild(rootEl);

    _applySectionStates();
    renderAll();
  }

  // ═══ REFRESH ACTION BAR INDICATORS ═══
  function _refreshNoteBtn() {
    if (!_notePairRef) return;
    _notePairRef.inner.textContent = activeItem.note ? 'NOTE\u2022' : 'NOTE';
  }
  function _refreshAlrgBtn() {
    if (!_alrgPairRef) return;
    _alrgPairRef.inner.textContent = (activeItem.allergens.length > 0 || activeItem.allergenNote) ? 'ALRG\u2022' : 'ALRG';
  }

  // ═══ RENDER ALL SECTIONS ═══
  function renderAll() {
    renderPlacement();
    renderMandatory();
    renderIncluded();
    renderOptional();
    renderPrefixBar();
  }

  // ═══ PLACEMENT BAR (compact, above action buttons) ═══
  function renderPlacement() {
    placementBarEl.innerHTML = '';
    if (optionalGroups.length === 0 && mandatoryGroups.length === 0) {
      placementBarEl.style.display = 'none';
      return;
    }
    placementBarEl.style.display = '';

    var placeWrap = buildStyledButton({ variant: 'dark' });
    placeWrap.wrap.style.width = '100%';
    placeWrap.inner.style.height = '18px';
    placeWrap.inner.style.display = 'flex';
    placeWrap.inner.style.alignItems = 'stretch';
    placeWrap.inner.style.justifyContent = 'stretch';
    placeWrap.inner.style.padding = '0';

    var placeSegs = {};
    PLACEMENTS.forEach(function(pl, i) {
      if (i > 0) {
        var div = document.createElement('div');
        div.style.cssText = 'width:1px;background:' + T.bgEdge + ';flex-shrink:0;align-self:stretch;';
        placeWrap.inner.appendChild(div);
      }

      var isActive = activePlacement === pl.id;
      var seg = document.createElement('div');
      seg.style.cssText = [
        'flex:' + (pl.id === 'whole' ? '2' : '1') + ';',
        'display:flex;align-items:center;justify-content:center;',
        'font-family:' + T.fb + ';font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;',
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

    placementBarEl.appendChild(placeWrap.wrap);
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

  // ═══ PREFIX BAR (horizontal row above placement bar) ═══
  function renderPrefixBar() {
    if (!prefixBarEl) return;
    prefixBarEl.innerHTML = '';

    OPT_PREFIXES.forEach(function(pfx) {
      var isActive = activeOptPrefix === pfx.id;
      var v = isActive ? pfx.variant : 'dark';
      var pair = buildStyledButton({ label: pfx.label, variant: v, size: 'sm' });
      pair.wrap.style.flex = '1';
      pair.wrap.style.minWidth = '0';
      pair.inner.style.fontSize = '11px';
      pair.inner.style.letterSpacing = '1px';
      pair.inner.style.padding = '2px 4px';

      pair.wrap.addEventListener('pointerup', function(e) {
        e.stopPropagation();
        activeOptPrefix = pfx.id;
        renderPrefixBar();
      });

      prefixBarEl.appendChild(pair.wrap);
    });
  }

  // ═══ MANDATORY SECTION ═══
  function renderMandatory() {
    if (!mandatoryContentEl) return;
    mandatoryContentEl.innerHTML = '';

    // Grid of group cards
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(' + Math.min(mandatoryGroups.length, 3) + ',1fr);gap:6px;';

    mandatoryGroups.forEach(function(group) {
      var currentSel = activeItem.mandatorySelections[group.key];
      var hasSelection = !!currentSel;
      var isExpanded = expandedMandGroup === group.key;

      // Each group is its own card
      var groupCard = document.createElement('div');
      var borderColor = hasSelection ? T.numpadChassis : T.vermillion;
      groupCard.style.cssText = [
        'display:flex;flex-direction:column;',
        'border:2px solid ' + borderColor + ';',
        'background:' + T.bgDark + ';',
        'cursor:pointer;user-select:none;',
        'overflow:hidden;',
      ].join('');
      groupCard.style.clipPath = chamfer(5);

      // Card header — shows group name or selection name
      var hdr = document.createElement('div');
      hdr.style.cssText = [
        'padding:4px 8px;',
        'font-family:' + T.fh + ';font-size:14px;font-weight:bold;',
        'color:' + (hasSelection ? T.bgDark : T.textPrimary) + ';',
        'background:' + (hasSelection ? T.numpadChassis : 'transparent') + ';',
        'text-align:center;',
      ].join('');
      hdr.textContent = hasSelection ? currentSel.label : group.label;
      groupCard.appendChild(hdr);

      // Tap header to toggle expansion
      hdr.addEventListener('pointerup', function(e) {
        e.stopPropagation();
        expandedMandGroup = isExpanded ? null : group.key;
        renderMandatory();
      });

      // Expanded: show option buttons
      if (isExpanded) {
        var optionsWrap = document.createElement('div');
        optionsWrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;padding:4px;';

        (group.options || []).forEach(function(opt) {
          var isSelected = currentSel && currentSel.key === opt.key;
          var pair = buildStyledButton({
            label: opt.label,
            variant: isSelected ? 'mint' : 'dark',
            size: 'sm',
          });
          pair.wrap.style.width = '100%';
          pair.inner.style.fontSize = '13px';
          pair.inner.style.padding = '4px 6px';
          if (isSelected) {
            pair.wrap.style.background = T.numpadChassis;
            pair.inner.style.color = T.bgDark;
          }

          pair.wrap.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            expandedMandGroup = null; // collapse after selection
            onMandatoryChange(group.key, opt);
          });

          optionsWrap.appendChild(pair.wrap);
        });

        groupCard.appendChild(optionsWrap);
      }

      // If expanded, span full row
      if (isExpanded) {
        groupCard.style.gridColumn = '1 / -1';
      }

      grid.appendChild(groupCard);
    });

    mandatoryContentEl.appendChild(grid);
  }

  function onMandatoryChange(groupKey, newSelection) {
    activeItem.mandatorySelections[groupKey] = {
      key: newSelection.key, label: newSelection.label, price: newSelection.price || 0,
    };

    // Reprice optional modifiers against ALL mandatory selections
    activeItem.optionalModifiers = activeItem.optionalModifiers.map(function(mod) {
      if (mod.priceMap) {
        var resolved;
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
    renderAll();
  }

  // ═══ INCLUDED SECTION ═══
  function renderIncluded() {
    if (!includedContentEl) return;
    includedContentEl.innerHTML = '';

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;';

    includedItems.slice().sort(function(a, b) { return a.label.localeCompare(b.label); }).forEach(function(incl) {
      var isRemoved = activeItem.includedRemovals.indexOf(incl.id) !== -1;

      var card = document.createElement('div');
      card.style.cssText = [
        'border:2px solid ' + (isRemoved ? T.vermillion : T.numpadChassis) + ';',
        'background:' + (isRemoved ? T.vermillion : T.numpadChassis) + ';',
        'padding:5px 8px;text-align:center;cursor:pointer;user-select:none;',
        'font-family:' + T.fh + ';font-size:14px;font-weight:bold;',
        'color:' + T.bgDark + ';',
      ].join('');
      card.style.clipPath = chamfer(5);
      card.textContent = isRemoved ? 'NO ' + incl.label : incl.label;

      card.addEventListener('pointerup', function() {
        var idx = activeItem.includedRemovals.indexOf(incl.id);
        if (idx !== -1) { activeItem.includedRemovals.splice(idx, 1); }
        else { activeItem.includedRemovals.push(incl.id); }
        fireUpdate();
        renderIncluded();
      });

      grid.appendChild(card);
    });

    includedContentEl.appendChild(grid);
  }

  // ═══ OPTIONAL SECTION ═══
  function renderOptional() {
    if (!optionalContentEl) return;
    optionalContentEl.innerHTML = '';

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding-bottom:16px;';

    var mandKey = _currentMandatoryKey();

    // Merge all optional groups, tag each with groupKey, sort alphabetically
    var allOpts = [];
    optionalGroups.forEach(function(g) {
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

      // Card-style button matching mandatory theme
      var card = document.createElement('div');
      var borderColor = opt.special ? T.gold : T.numpadChassis;
      card.style.cssText = [
        'border:2px solid ' + borderColor + ';',
        'background:' + T.bgDark + ';',
        'padding:5px 4px;text-align:center;cursor:pointer;user-select:none;',
        'font-family:' + T.fh + ';font-size:13px;font-weight:bold;',
        'color:' + T.textPrimary + ';',
      ].join('');
      card.style.clipPath = chamfer(5);
      card.textContent = opt.label;

      // Special: short tap = add, long press = customize popout
      if (opt.special && opt.includes) {
        var _holdTimer = null;
        var _didHold = false;
        card.addEventListener('pointerdown', function(e) {
          _didHold = false;
          _holdTimer = setTimeout(function() {
            _didHold = true;
            var existing = _findSpecialMod(opt.id);
            if (!existing) {
              applyOptionalMod(entry.groupKey, opt, mandKey);
              existing = _findSpecialMod(opt.id);
            }
            if (existing) showSpecialPopout(existing, opt);
          }, 400);
        });
        card.addEventListener('pointerup', function() {
          clearTimeout(_holdTimer);
          if (!_didHold) applyOptionalMod(entry.groupKey, opt, mandKey);
        });
        card.addEventListener('pointerleave', function() {
          clearTimeout(_holdTimer);
        });
      } else {
        card.addEventListener('pointerup', function() {
          applyOptionalMod(entry.groupKey, opt, mandKey);
        });
      }

      grid.appendChild(card);
    });

    optionalContentEl.appendChild(grid);
  }

  function applyOptionalMod(groupKey, opt, mandKey) {
    var price = _resolvePrice(opt, mandKey);
    var modId = opt.id || opt.label.toLowerCase().replace(/\s+/g, '-');

    var _restorePrefix = false;
    if (activeOptPrefix === 'ADD') {
      var hasAdd = false;
      var hasExtra = false;
      for (var i = 0; i < activeItem.optionalModifiers.length; i++) {
        var em = activeItem.optionalModifiers[i];
        if (em.modifierId === modId && em.placement === activePlacement) {
          if (em.prefix === 'ADD') hasAdd = true;
          if (em.prefix === 'EXTRA') hasExtra = true;
        }
      }
      if (hasAdd && !hasExtra) {
        activeOptPrefix = 'EXTRA';
        _restorePrefix = true;
      }
      if (hasAdd && hasExtra) {
        return;
      }
    }

    var mod = {
      prefix: activeOptPrefix,
      modifierId: modId,
      label: opt.label,
      price: price,
      priceMap: opt.priceMap || null,
      groupKey: groupKey,
      placement: activePlacement,
    };
    if (opt.special && opt.includes) {
      mod.special = true;
      mod.includes = opt.includes.slice();
      mod.exclusions = [];
    }
    activeItem.optionalModifiers.push(mod);
    if (_restorePrefix) activeOptPrefix = 'ADD';
    fireUpdate();
    renderOptional();
    renderPrefixBar();
  }

  function _findSpecialMod(modId) {
    for (var i = activeItem.optionalModifiers.length - 1; i >= 0; i--) {
      if (activeItem.optionalModifiers[i].modifierId === modId && activeItem.optionalModifiers[i].special) {
        return activeItem.optionalModifiers[i];
      }
    }
    return null;
  }

  // ═══ SPECIAL POPOUT (long-press customization) ═══
  function showSpecialPopout(mod, opt) {
    SceneManager.interrupt('special-customize', {
      onConfirm: function() {
        fireUpdate();
        renderOptional();
      },
      onCancel: function() {
        fireUpdate();
        renderOptional();
      },
      params: { mod: mod, fireUpdate: fireUpdate },
    });
  }

  // ═══ SEND ═══
  function handleSend() {
    var unsatisfied = mandatoryGroups.filter(function(g) {
      return !activeItem.mandatorySelections[g.key];
    });
    if (unsatisfied.length > 0) {
      // Re-render mandatory to show red borders on unselected groups
      renderMandatory();
      return;
    }
    onSend(activeItem);
  }

  // ═══ HELPERS ═══

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
      var parentMod = {
        name: m.prefix + ' ' + m.label,
        price: m.prefix === 'NO' ? 0 : m.price,
        charged: m.prefix !== 'NO' && m.price > 0,
        prefix: halfSide,
        children: [],
      };
      // Special exclusions become child mods
      if (m.special && m.exclusions && m.exclusions.length > 0) {
        m.exclusions.forEach(function(ex) {
          parentMod.children.push({ name: 'NO ' + ex, price: 0, charged: false });
        });
      }
      mods.push(parentMod);
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
      basePrice: activeItem.basePrice,
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

// ═══════════════════════════════════════════════════
//  SPECIAL CUSTOMIZE — Interrupt Scene (SM2)
//  Long-press a special to toggle its included toppings
// ═══════════════════════════════════════════════════

function _lightenH(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return '#' + [
    Math.min(255, Math.round(r + (255 - r) * pct)),
    Math.min(255, Math.round(g + (255 - g) * pct)),
    Math.min(255, Math.round(b + (255 - b) * pct)),
  ].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}
function _darkenH(hex, pct) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var f = 1 - pct;
  return '#' + [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
    .map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
}

defineScene({
  name: 'special-customize',
  render: function(container, params) {
    var mod = params.mod;
    var fireUpdate = params.fireUpdate;
    var onConfirm = params.onConfirm;
    var onCancel = params.onCancel;
    var savedExclusions = mod.exclusions.slice();

    var panel = document.createElement('div');
    panel.style.cssText = [
      'width:90%;max-width:600px;',
      'background:' + T.bg + ';',
      'border-top:7px solid ' + _lightenH(T.gold, 0.2) + ';',
      'border-left:7px solid ' + _lightenH(T.gold, 0.2) + ';',
      'border-bottom:7px solid ' + _darkenH(T.gold, 0.3) + ';',
      'border-right:7px solid ' + _darkenH(T.gold, 0.3) + ';',
      'display:flex;flex-direction:column;overflow:hidden;',
      'max-height:90%;',
    ].join('');
    panel.style.clipPath = chamfer(10);

    var header = document.createElement('div');
    header.style.cssText = [
      'background:' + T.gold + ';padding:12px 16px;flex-shrink:0;',
      'font-family:' + T.fh + ';font-size:22px;color:' + T.bgDark + ';',
    ].join('');
    header.textContent = mod.label;
    panel.appendChild(header);

    var gridWrap = document.createElement('div');
    gridWrap.style.cssText = [
      'flex:1;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
      'padding:8px;',
    ].join('');

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;';

    function renderGrid() {
      grid.innerHTML = '';
      (mod.includes || []).forEach(function(incLabel) {
        var isExcluded = mod.exclusions.indexOf(incLabel) !== -1;
        var variant = isExcluded ? 'vermillion' : 'dark';
        var label = isExcluded ? 'NO ' + incLabel : incLabel;
        var pair = buildStyledButton({ label: label, variant: variant, size: 'md' });
        pair.wrap.style.width = '100%';
        pair.wrap.style.minWidth = '0';
        pair.inner.style.fontSize = '18px';
        pair.inner.style.fontFamily = T.fb;

        pair.wrap.addEventListener('pointerup', function() {
          var idx = mod.exclusions.indexOf(incLabel);
          if (idx !== -1) { mod.exclusions.splice(idx, 1); }
          else { mod.exclusions.push(incLabel); }
          if (fireUpdate) fireUpdate();
          renderGrid();
        });

        grid.appendChild(pair.wrap);
      });
    }
    renderGrid();
    gridWrap.appendChild(grid);
    panel.appendChild(gridWrap);

    var actionBar = document.createElement('div');
    actionBar.style.cssText = [
      'flex-shrink:0;padding:8px;',
      'border-top:3px solid ' + _darkenH(T.gold, 0.3) + ';',
      'background:' + T.bgDark + ';',
      'display:flex;gap:8px;',
    ].join('');
    var cancelPair = buildStyledButton({ label: 'CANCEL', variant: 'vermillion', size: 'md',
      onClick: function() {
        mod.exclusions.length = 0;
        for (var i = 0; i < savedExclusions.length; i++) {
          mod.exclusions.push(savedExclusions[i]);
        }
        onCancel();
      },
    });
    cancelPair.wrap.style.flex = '1';
    actionBar.appendChild(cancelPair.wrap);
    var donePair = buildStyledButton({ label: 'DONE', variant: 'mint', size: 'md',
      onClick: function() { onConfirm(); },
    });
    donePair.wrap.style.flex = '1';
    actionBar.appendChild(donePair.wrap);
    panel.appendChild(actionBar);

    container.appendChild(panel);
  },
});

// ═══════════════════════════════════════════════════
//  ALLERGEN SELECT — Interrupt Scene (SM2)
//  Opened from ALRG button in modifier panel action bar
// ═══════════════════════════════════════════════════

defineScene({
  name: 'allergen-select',
  render: function(container, params) {
    var activeItem = params.activeItem;
    var fireUpdate = params.fireUpdate;
    var onConfirm = params.onConfirm;
    var onCancel = params.onCancel;
    var savedAllergens = activeItem.allergens.slice();
    var savedNote = activeItem.allergenNote;

    var panel = document.createElement('div');
    panel.style.cssText = [
      'width:90%;max-width:600px;',
      'background:' + T.bg + ';',
      'border-top:7px solid ' + _lightenH(T.vermillion, 0.2) + ';',
      'border-left:7px solid ' + _lightenH(T.vermillion, 0.2) + ';',
      'border-bottom:7px solid ' + _darkenH(T.vermillion, 0.3) + ';',
      'border-right:7px solid ' + _darkenH(T.vermillion, 0.3) + ';',
      'display:flex;flex-direction:column;overflow:hidden;',
      'max-height:90%;',
    ].join('');
    panel.style.clipPath = chamfer(10);

    var header = document.createElement('div');
    header.style.cssText = [
      'background:' + T.vermillion + ';padding:12px 16px;flex-shrink:0;',
      'font-family:' + T.fh + ';font-size:22px;color:#ffffff;',
    ].join('');
    header.textContent = 'Allergens';
    panel.appendChild(header);

    var gridWrap = document.createElement('div');
    gridWrap.style.cssText = [
      'flex:1;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;',
      'padding:8px;',
    ].join('');

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;';

    var noteDisplay = document.createElement('div');
    noteDisplay.style.cssText = [
      'margin-top:6px;padding:6px 10px;display:none;',
      'font-family:' + T.fb + ';font-size:14px;',
      'background:' + T.bgDark + ';color:' + T.textPrimary + ';',
      'border:2px solid ' + T.red + ';',
    ].join('');
    noteDisplay.style.clipPath = chamfer(6);

    function renderAllergenGrid() {
      grid.innerHTML = '';
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
                if (fireUpdate) fireUpdate();
                renderAllergenGrid();
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
          if (fireUpdate) fireUpdate();
          renderAllergenGrid();
        });

        grid.appendChild(pair.wrap);
      });

      // Allergen note display
      if (activeItem.allergenNote) {
        noteDisplay.textContent = '\u26A0 ' + activeItem.allergenNote;
        noteDisplay.style.display = '';
      } else {
        noteDisplay.style.display = 'none';
      }
    }

    renderAllergenGrid();
    gridWrap.appendChild(grid);
    gridWrap.appendChild(noteDisplay);
    panel.appendChild(gridWrap);

    var actionBar = document.createElement('div');
    actionBar.style.cssText = [
      'flex-shrink:0;padding:8px;',
      'border-top:3px solid ' + _darkenH(T.vermillion, 0.3) + ';',
      'background:' + T.bgDark + ';',
      'display:flex;gap:8px;',
    ].join('');
    var cancelPair = buildStyledButton({ label: 'CANCEL', variant: 'vermillion', size: 'md',
      onClick: function() {
        activeItem.allergens.length = 0;
        for (var i = 0; i < savedAllergens.length; i++) {
          activeItem.allergens.push(savedAllergens[i]);
        }
        activeItem.allergenNote = savedNote;
        onCancel();
      },
    });
    cancelPair.wrap.style.flex = '1';
    actionBar.appendChild(cancelPair.wrap);
    var donePair = buildStyledButton({ label: 'DONE', variant: 'mint', size: 'md',
      onClick: function() { onConfirm(); },
    });
    donePair.wrap.style.flex = '1';
    actionBar.appendChild(donePair.wrap);
    panel.appendChild(actionBar);

    container.appendChild(panel);
  },
});

