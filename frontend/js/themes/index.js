// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Theme Registry
//  Import any theme and pass to setTheme() to apply
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

export { SammysPizza }    from './sammys-pizza.js';
export { NeonDiner }      from './neon-diner.js';
export { Steakhouse }     from './steakhouse.js';
export { TikiBar }        from './tiki-bar.js';
export { RamenShop }      from './ramen-shop.js';
export { BBQPit }         from './bbq-pit.js';
export { SeafoodShack }   from './seafood-shack.js';
export { Speakeasy }      from './speakeasy.js';
export { FarmTable }      from './farm-table.js';
export { RooftopBar }     from './rooftop-bar.js';
export { AtomicPurple }   from './atomic-purple.js';

// Theme catalog for settings UI
export var THEMES = [
  { id: 'terminal-glow',  label: 'Terminal Glow',   theme: null },        // default — use resetTheme()
  { id: 'sammys-pizza',   label: "Sammy's Pizza",   loader: function() { return import('./sammys-pizza.js').then(function(m) { return m.SammysPizza; }); } },
  { id: 'neon-diner',     label: 'Neon Diner',      loader: function() { return import('./neon-diner.js').then(function(m) { return m.NeonDiner; }); } },
  { id: 'steakhouse',     label: 'Steakhouse',      loader: function() { return import('./steakhouse.js').then(function(m) { return m.Steakhouse; }); } },
  { id: 'tiki-bar',       label: 'Tiki Bar',        loader: function() { return import('./tiki-bar.js').then(function(m) { return m.TikiBar; }); } },
  { id: 'ramen-shop',     label: 'Ramen Shop',      loader: function() { return import('./ramen-shop.js').then(function(m) { return m.RamenShop; }); } },
  { id: 'bbq-pit',        label: 'BBQ Pit',         loader: function() { return import('./bbq-pit.js').then(function(m) { return m.BBQPit; }); } },
  { id: 'seafood-shack',  label: 'Seafood Shack',   loader: function() { return import('./seafood-shack.js').then(function(m) { return m.SeafoodShack; }); } },
  { id: 'speakeasy',      label: 'Speakeasy',       loader: function() { return import('./speakeasy.js').then(function(m) { return m.Speakeasy; }); } },
  { id: 'farm-table',     label: 'Farm Table',      loader: function() { return import('./farm-table.js').then(function(m) { return m.FarmTable; }); } },
  { id: 'rooftop-bar',    label: 'Rooftop Bar',     loader: function() { return import('./rooftop-bar.js').then(function(m) { return m.RooftopBar; }); } },
  { id: 'atomic-purple',  label: 'Atomic Purple',   loader: function() { return import('./atomic-purple.js').then(function(m) { return m.AtomicPurple; }); } },
];
