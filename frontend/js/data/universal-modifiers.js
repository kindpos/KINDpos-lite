// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Universal Modifier Data
//  HexNav-compatible structure grouped by menu category
//  Ethereal colors — faded echoes of their parent category
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

export var PREFIXES = [
  { id: 'no',      label: 'No'      },
  { id: 'add',     label: 'Add'     },
  { id: 'sub',     label: 'Sub'     },
  { id: 'extra',   label: 'Extra'   },
  { id: 'on-side', label: 'On Side' },
];

// ── Ethereal palette — 30-40% opacity ghosts of category colors ──
// PIZZA  (#ff4757) → faded rose
// APPS   (#ffd93d) → faded amber
// SUBS   (#C6FFBB) → faded mint
// SIDES  (#70a1ff) → faded periwinkle
// DRINKS (#ffa502) → faded tangerine
// PREP   (universal) → faded lavender

var MOD_COLORS = {
  pizza:  { color: '#7a2832', textColor: '#ffb3b8' },
  apps:   { color: '#7a6a1e', textColor: '#ffe699' },
  subs:   { color: '#4a7a44', textColor: '#d9ffcc' },
  sides:  { color: '#3a5080', textColor: '#b3ccff' },
  drinks: { color: '#7a5201', textColor: '#ffd480' },
  prep:   { color: '#5a3f7a', textColor: '#d0b8ff' },
};

// ── Pizza placement options ──
export var PIZZA_PLACEMENTS = [
  { id: 'whole', label: 'Whole' },
  { id: 'left',  label: 'Left'  },
  { id: 'right', label: 'Right' },
];

// ── Modifier categories in HexNav format ──
// Each category becomes a hex; its items become child hexes on drill-down
// Categories are filtered at runtime by union of selected ticket item categories

var ALL_MOD_CATEGORIES = [
  {
    id: 'mod-prep', label: 'PREP', menuCategories: ['*'],
    color: MOD_COLORS.prep.color, textColor: MOD_COLORS.prep.textColor,
    subcats: [{ id: 'prep-items', label: 'Prep', items: [
      { label: 'Salt',    id: 'salt' },
      { label: 'Pepper',  id: 'pepper' },
      { label: 'Butter',  id: 'butter' },
      { label: 'Oil',     id: 'oil' },
      { label: 'Garlic',  id: 'garlic' },
      { label: 'Lemon',   id: 'lemon-prep' },
    ]}],
  },
  {
    id: 'mod-pizza', label: 'PIZZA', menuCategories: ['pizza'],
    color: MOD_COLORS.pizza.color, textColor: MOD_COLORS.pizza.textColor,
    subcats: [{ id: 'pizza-mod-items', label: 'Pizza', items: [
      { label: 'Pepperoni',  id: 'pepperoni' },
      { label: 'Sausage',    id: 'sausage' },
      { label: 'Mushrooms',  id: 'mushrooms' },
      { label: 'Onions',     id: 'onions' },
      { label: 'Peppers',    id: 'peppers' },
      { label: 'Xtra Cheese',id: 'x-cheese' },
      { label: 'Sauce',      id: 'sauce' },
      { label: 'Olives',     id: 'olives' },
      { label: 'Bacon',      id: 'bacon-pizza' },
      { label: 'Anchovies',  id: 'anchovies' },
    ]}],
  },
  {
    id: 'mod-apps', label: 'APPS', menuCategories: ['apps'],
    color: MOD_COLORS.apps.color, textColor: MOD_COLORS.apps.textColor,
    subcats: [{ id: 'apps-mod-items', label: 'Apps', items: [
      { label: 'Sauce',   id: 'sauce-apps' },
      { label: 'Ranch',   id: 'ranch' },
      { label: 'Cheese',  id: 'cheese-apps' },
      { label: 'Bacon',   id: 'bacon-apps' },
      { label: 'Onion',   id: 'onion-apps' },
    ]}],
  },
  {
    id: 'mod-subs', label: 'SUBS', menuCategories: ['subs'],
    color: MOD_COLORS.subs.color, textColor: MOD_COLORS.subs.textColor,
    subcats: [{ id: 'subs-mod-items', label: 'Subs', items: [
      { label: 'Lettuce',   id: 'lettuce' },
      { label: 'Tomato',    id: 'tomato-subs' },
      { label: 'Onion',     id: 'onion-subs' },
      { label: 'Peppers',   id: 'peppers-subs' },
      { label: 'Cheese',    id: 'cheese-subs' },
      { label: 'Mayo',      id: 'mayo' },
      { label: 'Mustard',   id: 'mustard' },
      { label: 'Oil & Vin', id: 'oil-vin' },
      { label: 'Bacon',     id: 'bacon-subs' },
    ]}],
  },
  {
    id: 'mod-sides', label: 'SIDES', menuCategories: ['sides'],
    color: MOD_COLORS.sides.color, textColor: MOD_COLORS.sides.textColor,
    subcats: [{ id: 'sides-mod-items', label: 'Sides', items: [
      { label: 'Dressing', id: 'dressing' },
      { label: 'Ranch',    id: 'ranch-sides' },
      { label: 'Croutons', id: 'croutons' },
      { label: 'Cheese',   id: 'cheese-sides' },
      { label: 'Bacon',    id: 'bacon-sides' },
      { label: 'Onion',    id: 'onion-sides' },
      { label: 'Tomato',   id: 'tomato-sides' },
    ]}],
  },
  {
    id: 'mod-drinks', label: 'DRINKS', menuCategories: ['drinks'],
    color: MOD_COLORS.drinks.color, textColor: MOD_COLORS.drinks.textColor,
    subcats: [{ id: 'drinks-mod-items', label: 'Drinks', items: [
      { label: 'Ice',    id: 'ice' },
      { label: 'Lemon',  id: 'lemon' },
      { label: 'Straw',  id: 'straw' },
      { label: 'Lid',    id: 'lid' },
    ]}],
  },
];

// ── Runtime filter: return HexNav data for given menu category IDs ──
export function getModHexData(categoryIds) {
  return ALL_MOD_CATEGORIES.filter(function(cat) {
    return cat.menuCategories.indexOf('*') !== -1 ||
      cat.menuCategories.some(function(c) { return categoryIds.indexOf(c) !== -1; });
  });
}

// ── Check if any selected category is pizza (for placement flow) ──
export function hasPizzaCategory(categoryIds) {
  return categoryIds.indexOf('pizza') !== -1;
}

export { MOD_COLORS };
