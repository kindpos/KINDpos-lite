// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Modifier Panel Configurations
//  Defines mandatoryGroups, includedItems, and
//  optionalGroups for items that use the modifier panel
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T } from '../tokens.js';

// ── Modifier configs keyed by item label ──
// Items with a modifierConfig will open the modifier panel on selection.
// Items without one go straight to the ticket (existing behavior).

var MODIFIER_CONFIGS = {

  // ── BYO Pizza ──
  'BYO Pizza': {
    mandatoryGroups: [
      {
        key: 'size', label: 'SIZE',
        defaultKey: 'LG',
        options: [
          { key: 'SM',  label: 'Small 10\u2033',  price: -4.00 },
          { key: 'MED', label: 'Medium 14\u2033',  price: -2.00 },
          { key: 'LG',  label: 'Large 18\u2033',   price: 0 },
          { key: 'XL',  label: 'X-Large 20\u2033', price: 4.00 },
        ],
      },
      {
        key: 'crust', label: 'CRUST',
        defaultKey: 'THIN',
        options: [
          { key: 'THIN',    label: 'Thin Crust',    price: 0 },
          { key: 'THICK',   label: 'Thick Crust',   price: 0 },
          { key: 'STUFFED', label: 'Stuffed Crust', price: 2.00 },
          { key: 'GF',      label: 'Gluten Free',   price: 3.00 },
        ],
      },
    ],

    includedItems: [
      { id: 'cheese',    label: 'Cheese' },
      { id: 'sauce',     label: 'Sauce' },
    ],

    optionalGroups: [
      {
        key: 'toppings', label: 'TOPPINGS',
        options: [
          { id: 'pepperoni',     label: 'Pepperoni',     price: 1.50, priceMap: { SM: 0.75, MED: 1.00, LG: 1.50, XL: 2.00, default: 1.50 } },
          { id: 'sausage',       label: 'Sausage',       price: 1.50, priceMap: { SM: 0.75, MED: 1.00, LG: 1.50, XL: 2.00, default: 1.50 } },
          { id: 'mushrooms',     label: 'Mushrooms',     price: 1.00, priceMap: { SM: 0.50, MED: 0.75, LG: 1.00, XL: 1.50, default: 1.00 } },
          { id: 'onions',        label: 'Onions',        price: 1.00, priceMap: { SM: 0.50, MED: 0.75, LG: 1.00, XL: 1.50, default: 1.00 } },
          { id: 'green-peppers', label: 'Green Peppers', price: 1.00, priceMap: { SM: 0.50, MED: 0.75, LG: 1.00, XL: 1.50, default: 1.00 } },
          { id: 'black-olives',  label: 'Black Olives',  price: 1.00, priceMap: { SM: 0.50, MED: 0.75, LG: 1.00, XL: 1.50, default: 1.00 } },
          { id: 'bacon',         label: 'Bacon',         price: 2.00, priceMap: { SM: 1.00, MED: 1.50, LG: 2.00, XL: 2.50, default: 2.00 } },
          { id: 'chicken',       label: 'Chicken',       price: 2.00, priceMap: { SM: 1.00, MED: 1.50, LG: 2.00, XL: 2.50, default: 2.00 } },
          { id: 'extra-cheese',  label: 'Extra Cheese',  price: 1.50, priceMap: { SM: 0.75, MED: 1.00, LG: 1.50, XL: 2.00, default: 1.50 } },
          { id: 'anchovies',     label: 'Anchovies',     price: 1.50, priceMap: { SM: 0.75, MED: 1.00, LG: 1.50, XL: 2.00, default: 1.50 } },
          { id: 'spinach',       label: 'Spinach',       price: 1.00, priceMap: { SM: 0.50, MED: 0.75, LG: 1.00, XL: 1.50, default: 1.00 } },
          { id: 'jalapenos',     label: 'Jalape\u00f1os', price: 1.00, priceMap: { SM: 0.50, MED: 0.75, LG: 1.00, XL: 1.50, default: 1.00 } },
        ],
      },
      {
        key: 'extras', label: 'EXTRAS',
        options: [
          { id: 'garlic-knots',  label: 'Garlic Knots', price: 2.00 },
          { id: 'ranch-cup',     label: 'Ranch Cup',    price: 0.75 },
          { id: 'hot-honey',     label: 'Hot Honey',    price: 1.00 },
          { id: 'parm-packet',   label: 'Parm Packet',  price: 0 },
          { id: 'red-pepper',    label: 'Red Pepper',   price: 0 },
        ],
      },
    ],
  },

  // ── Buffalo Wings ──
  'Buffalo Wings': {
    mandatoryGroups: [
      {
        key: 'sauce', label: 'SAUCE',
        options: [
          { key: 'BUFFALO',     label: 'Buffalo',      price: 0 },
          { key: 'BBQ',         label: 'BBQ',           price: 0 },
          { key: 'GARLIC_PARM', label: 'Garlic Parm',  price: 0 },
          { key: 'PLAIN',       label: 'Plain',         price: 0 },
        ],
      },
      {
        key: 'heat', label: 'HEAT',
        options: [
          { key: 'MILD',   label: 'Mild',      price: 0 },
          { key: 'MEDIUM', label: 'Medium',     price: 0 },
          { key: 'HOT',    label: 'Hot',        price: 0 },
          { key: 'XHOT',   label: 'Extra Hot',  price: 0 },
        ],
      },
    ],

    includedItems: [
      { id: 'celery',     label: 'Celery' },
      { id: 'blue-cheese', label: 'Blue Cheese' },
    ],

    optionalGroups: [
      {
        key: 'wing-extras', label: 'EXTRAS',
        options: [
          { id: 'extra-sauce', label: 'Extra Sauce', price: 0.50 },
          { id: 'ranch',       label: 'Ranch',       price: 0.75 },
          { id: 'fries',       label: 'Side Fries',  price: 3.00 },
        ],
      },
    ],
  },

  // ── House Salad ──
  'House Salad': {
    mandatoryGroups: [
      {
        key: 'dressing', label: 'DRESSING',
        options: [
          { key: 'RANCH',   label: 'Ranch',       price: 0 },
          { key: 'BLUE',    label: 'Blue Cheese',  price: 0 },
          { key: 'ITALIAN', label: 'Italian',      price: 0 },
          { key: 'CAESAR',  label: 'Caesar',       price: 0 },
          { key: 'BALS',    label: 'Balsamic',     price: 0 },
        ],
      },
    ],

    includedItems: [
      { id: 'lettuce',  label: 'Lettuce' },
      { id: 'tomato',   label: 'Tomato' },
      { id: 'onion',    label: 'Onion' },
      { id: 'cucumber', label: 'Cucumber' },
      { id: 'croutons', label: 'Croutons' },
    ],

    optionalGroups: [
      {
        key: 'salad-extras', label: 'EXTRAS',
        options: [
          { id: 'chicken-salad', label: 'Chicken',  price: 3.00 },
          { id: 'bacon-salad',   label: 'Bacon',    price: 2.00 },
          { id: 'cheese-salad',  label: 'Cheese',   price: 1.00 },
          { id: 'avocado-salad', label: 'Avocado',  price: 2.00 },
          { id: 'egg-salad',     label: 'Hard Egg', price: 1.00 },
        ],
      },
    ],
  },

  // ── Italian Sub ──
  'Italian Sub': {
    mandatoryGroups: [],

    includedItems: [
      { id: 'ham',       label: 'Ham' },
      { id: 'salami',    label: 'Salami' },
      { id: 'capicola',  label: 'Capicola' },
      { id: 'provolone', label: 'Provolone' },
      { id: 'lettuce-sub', label: 'Lettuce' },
      { id: 'tomato-sub',  label: 'Tomato' },
      { id: 'onion-sub',   label: 'Onion' },
      { id: 'oil-vin',     label: 'Oil & Vinegar' },
    ],

    optionalGroups: [
      {
        key: 'sub-extras', label: 'EXTRAS',
        options: [
          { id: 'peppers-sub',   label: 'Hot Peppers', price: 0.75 },
          { id: 'mayo-sub',      label: 'Mayo',        price: 0 },
          { id: 'mustard-sub',   label: 'Mustard',     price: 0 },
          { id: 'extra-meat',    label: 'Extra Meat',  price: 3.00 },
          { id: 'extra-cheese-sub', label: 'Extra Cheese', price: 1.50 },
        ],
      },
    ],
  },
};

/**
 * Get modifier config for an item by label.
 * Returns null if item doesn't use the modifier panel.
 */
export function getModifierConfig(itemLabel) {
  return MODIFIER_CONFIGS[itemLabel] || null;
}
