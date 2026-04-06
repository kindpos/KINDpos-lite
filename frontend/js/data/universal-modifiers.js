// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Universal Modifier Data
//  Category-aware modifier pool for batch application
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

export var PREFIXES = [
  { id: 'no',    label: 'No'      },
  { id: 'add',   label: 'Add'     },
  { id: 'sub',   label: 'Sub'     },
  { id: 'extra', label: 'Extra'   },
  { id: 'on-side', label: 'On Side' },
];

export var MODIFIERS = [
  // Universal pool — always shown regardless of category
  { id: 'salt',     label: 'Salt',     categories: ['*'] },
  { id: 'pepper',   label: 'Pepper',   categories: ['*'] },

  // Category-scoped
  { id: 'onion',    label: 'Onion',    categories: ['pizza', 'apps', 'subs', 'sides'] },
  { id: 'tomato',   label: 'Tomato',   categories: ['pizza', 'subs', 'sides'] },
  { id: 'cheese',   label: 'Cheese',   categories: ['pizza', 'subs', 'apps'] },
  { id: 'bacon',    label: 'Bacon',    categories: ['pizza', 'subs', 'apps', 'sides'] },
  { id: 'pepperoni',label: 'Pepperoni',categories: ['pizza', 'subs'] },
  { id: 'sausage',  label: 'Sausage',  categories: ['pizza', 'subs'] },
  { id: 'mushrooms',label: 'Mushrooms',categories: ['pizza', 'subs', 'sides'] },
  { id: 'peppers',  label: 'Peppers',  categories: ['pizza', 'subs', 'sides'] },
  { id: 'lettuce',  label: 'Lettuce',  categories: ['subs', 'sides'] },
  { id: 'mayo',     label: 'Mayo',     categories: ['subs'] },
  { id: 'mustard',  label: 'Mustard',  categories: ['subs'] },
  { id: 'dressing', label: 'Dressing', categories: ['sides'] },
  { id: 'croutons', label: 'Croutons', categories: ['sides'] },
  { id: 'sauce',    label: 'Sauce',    categories: ['pizza', 'apps'] },
  { id: 'x-cheese', label: 'Xtra Cheese', categories: ['pizza'] },
  { id: 'ranch',    label: 'Ranch',    categories: ['apps', 'sides'] },
  { id: 'ice',      label: 'Ice',      categories: ['drinks'] },
  { id: 'lemon',    label: 'Lemon',    categories: ['drinks'] },
  { id: 'straw',    label: 'Straw',    categories: ['drinks'] },
];

export function getModifiersForCategories(categoryIds) {
  return MODIFIERS.filter(function(m) {
    return m.categories.indexOf('*') !== -1 ||
      m.categories.some(function(c) { return categoryIds.indexOf(c) !== -1; });
  });
}
