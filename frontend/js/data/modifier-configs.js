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

// ── Shared pizza modifier config ──
// All pizza sizes share the same crust, toppings, prep, and specials.
// Each size gets its own entry keyed by its menu label.
var PIZZA_CRUST = {
  key: 'crust', label: 'CRUST',
  defaultKey: 'THIN',
  options: [
    { key: 'THIN',    label: 'Thin Crust',    price: 0 },
    { key: 'THICK',   label: 'Thick Crust',   price: 0 },
    { key: 'STUFFED', label: 'Stuffed Crust', price: 2.00 },
    { key: 'GF',      label: 'Sub GF Crust',  price: 3.00 },
  ],
};

var PIZZA_INCLUDED = [
  { id: 'cheese', label: 'Cheese' },
  { id: 'sauce',  label: 'Sauce' },
];

// ── Price maps by size key for toppings ──
var PM_STD  = { SLICE: 0.50, SM: 0.75, MED: 1.00, LG: 1.00, XL: 1.50, CALZONE: 1.00, default: 1.00 };
var PM_PREM = { SLICE: 0.75, SM: 1.00, MED: 1.50, LG: 1.50, XL: 2.00, CALZONE: 1.50, default: 1.50 };
var PM_LUX  = { SLICE: 1.00, SM: 1.50, MED: 2.00, LG: 2.00, XL: 2.50, CALZONE: 2.00, default: 2.00 };
var PM_HALF = { SLICE: 0.25, SM: 0.50, MED: 0.50, LG: 0.50, XL: 0.75, CALZONE: 0.50, default: 0.50 };

var PIZZA_TOPPINGS = {
  key: 'toppings', label: 'TOPPINGS',
  options: [
    // Regular toppings — standard pricing
    { id: 'banana-peppers',  label: 'Banana Peppers',  price: 1.00, priceMap: PM_STD },
    { id: 'black-olives',    label: 'Black Olives',     price: 1.00, priceMap: PM_STD },
    { id: 'garlic',          label: 'Garlic',           price: 0.50, priceMap: PM_HALF },
    { id: 'green-olives',    label: 'Green Olives',     price: 1.00, priceMap: PM_STD },
    { id: 'green-peppers',   label: 'Green Peppers',    price: 1.00, priceMap: PM_STD },
    { id: 'jalapenos',       label: 'Jalape\u00f1os',   price: 1.00, priceMap: PM_STD },
    { id: 'mushroom',        label: 'Mushroom',         price: 1.00, priceMap: PM_STD },
    { id: 'onion',           label: 'Onion',            price: 1.00, priceMap: PM_STD },
    { id: 'pineapple',       label: 'Pineapple',       price: 1.00, priceMap: PM_STD },
    { id: 'spinach',         label: 'Spinach',          price: 1.00, priceMap: PM_STD },
    { id: 'tomatoe',         label: 'Tomatoe',          price: 1.00, priceMap: PM_STD },
    // Premium toppings
    { id: 'beef',            label: 'Beef',             price: 1.50, priceMap: PM_PREM },
    { id: 'canadian-bacon',  label: 'Canadian Bacon',   price: 1.50, priceMap: PM_PREM },
    { id: 'cheddar',         label: 'Cheddar',          price: 1.50, priceMap: PM_PREM },
    { id: 'ground-beef',     label: 'Ground Beef',      price: 1.50, priceMap: PM_PREM },
    { id: 'mozzarella',      label: 'Mozzarella',       price: 1.50, priceMap: PM_PREM },
    { id: 'pepperoni',       label: 'Pepperoni',        price: 1.50, priceMap: PM_PREM },
    { id: 'sausage',         label: 'Sausage',          price: 1.50, priceMap: PM_PREM },
    // Luxury toppings
    { id: 'chicken',         label: 'Chicken',          price: 2.00, priceMap: PM_LUX },
    // Specials (yellow border)
    { id: 'bianco',          label: 'Bianco',          price: 0, special: true },
    { id: 'breakfast-bacon', label: 'Breakfast Bacon', price: 0, special: true },
    { id: 'cheeseburger',    label: 'Cheeseburger',   price: 0, special: true },
    { id: 'chicken-alfredo', label: 'Chicken Alfredo', price: 0, special: true },
    { id: 'crew',            label: 'Crew',            price: 0, special: true },
    { id: 'hawaiian',        label: 'Hawaiian',        price: 0, special: true },
    { id: 'house',           label: 'House',           price: 0, special: true },
    { id: 'kosher',          label: 'Kosher',          price: 0, special: true },
    { id: 'mac-n-cheese',    label: 'Mac N Cheese',    price: 0, special: true },
    { id: 'moccho',          label: 'Moccho',          price: 0, special: true },
    { id: 'nick-special',    label: 'Nick Special',    price: 0, special: true },
    { id: 'primo',           label: 'Primo',           price: 0, special: true },
    { id: 'sammys-special',  label: "Sammy's Special", price: 0, special: true },
    { id: 'taco',            label: 'Taco',            price: 0, special: true },
    { id: 'veggie',          label: 'Veggie',          price: 0, special: true },
  ],
};

var PIZZA_PREP = {
  key: 'prep', label: 'PREP',
  options: [
    { id: 'bbq-sauce',    label: 'BBQ Sauce',    price: 0 },
    { id: 'cut-square',   label: 'Cut Square',   price: 0 },
    { id: 'extra-sauce',  label: 'Extra Sauce',  price: 0 },
    { id: 'light-bake',   label: 'Light Bake',   price: 0 },
    { id: 'light-sauce',  label: 'Light Sauce',  price: 0 },
    { id: 'no-cut',       label: 'No Cut',       price: 0 },
    { id: 'no-sauce',     label: 'No Sauce',     price: 0 },
    { id: 'sub-gf-crust', label: 'Sub GF Crust', price: 3.00 },
    { id: 'well-done',    label: 'Well Done',    price: 0 },
    { id: 'white-sauce',  label: 'White Sauce',  price: 0 },
  ],
};

// PIZZA_SPECIALS merged into PIZZA_TOPPINGS with special: true flag

var PIZZA_SIZE = {
  key: 'size', label: 'SIZE',
  options: [
    { key: 'SLICE',   label: 'Slice',       price: 3.75 },
    { key: 'SM',      label: 'S 10\u2033',  price: 10.00 },
    { key: 'MED',     label: 'MED 14\u2033', price: 12.00 },
    { key: 'LG',      label: 'LG 18\u2033',  price: 14.00 },
    { key: 'XL',      label: 'XL 20\u2033',  price: 18.00 },
    { key: 'CALZONE', label: 'Calzone',     price: 12.00 },
  ],
};

var MODIFIER_CONFIGS = {

  // ── Pizza — single entry, SIZE is mandatory ──
  'Pizza': {
    mandatoryGroups: [PIZZA_SIZE, PIZZA_CRUST],
    includedItems: PIZZA_INCLUDED,
    optionalGroups: [PIZZA_TOPPINGS, PIZZA_PREP],
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
