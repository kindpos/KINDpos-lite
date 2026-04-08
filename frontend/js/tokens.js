// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Design Tokens
//  Single source of truth for all visual values
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

export const T = {
  bg:       '#333333',
  bgDark:   '#1a1a1a',
  bgLight:  '#5a5a5a',
  bgEdge:   '#151515',
  bg2:      '#222222',
  bg3:      '#2a2a2a',
  bg4:      '#2e2e2e',
  bg5:      '#262626',
  border:   '#444444',
  dimText:  '#555555',
  mutedText:'#888888',
  subtleText:'#999999',
  darkBtn:  '#3a3632',
  darkBtnL: '#564f48',
  darkBtnD: '#1e1b18',
  mint:     '#C6FFBB',
  mintEdgeL:'#e5ffe0',
  mintEdgeD:'#5a7a52',
  goGreen:  '#7ac943',
  greenL:   '#ade87a',
  greenD:   '#345a1c',
  red:      '#da331c',
  redL:     '#f26858',
  redD:     '#5e160c',
  gold:     '#fcbe40',
  goldL:    '#fdd67a',
  goldD:    '#7a5a18',
  cyan:     '#33ffff',
  cyanL:    '#88ffff',
  cyanD:    '#197a7a',
  lavender: '#b48efa',
  lavenderL:'#d0b8ff',
  lavenderD:'#5a3f7a',
  grayBtn:  '#aaaaaa',
  grayBtnL: '#cccccc',
  grayBtnD: '#555555',
  yellow:   '#ffff00',
  mintB:    '#7bed9f',
  redB:     '#ff4757',
  catProteins:  '#ff4757',
  catProteinsL: '#ff7a87',
  catProteinsD: '#7a1f28',
  catVegetables:'#C6FFBB',   // alias T.mint
  catBeverages: '#70a1ff',
  catBeveragesL:'#a0c4ff',
  catBeveragesD:'#354d7a',
  catSauces:    '#ffa502',
  catSaucesL:   '#ffc04d',
  catSaucesD:   '#7a5001',
  catDesserts:  '#b48efa',   // alias T.lavender
  catStarches:  '#7bed9f',
  catStarchesL: '#aff4c4',
  catStarchesD: '#3a7a4d',
  // Vz1.2 login/numpad tokens
  numpadChassis: '#87f79c',
  numpadChassisL:'#b8ffd0',
  numpadChassisD:'#2e8040',
  pinFieldBg:'#1a1a1a',
  pinDot:    '#fbb03b',
  digitColor:'#fbb03b',
  clrColor:  '#ff4422',
  submitColor:'#39b54a',
  sage:      '#6bc987',
  lime:      '#ccff33',
  electricPink:'#ff66cc',
  vermillion:'#ff4422',
  fh:   'Alien Encounters Solid Bold, monospace',
  fhr:  'Alien Encounters Solid Regular, monospace',
  fb:   'Sevastopol Interface, monospace',
  fsQuick:  '70px',
  fsMgmt:   '60px',
  fsNumpad: '100px',
  fsHeader: '70px',
  fsClr:    '70px',
  fsSmall:  '25px',
  fsItem:   '35px',
  fsMod:    '35px',
  fsBtn:    '35px',
  fsBtnSm:  '30px',
  appW:     1024,
  appH:     600,
  headerH:  34,
  scenePad: 20,
  colGap:   20,
  bevel:    7,
  bevelBtn: 4,
  chamfer:  8,
  shadowX:  3,
  shadowY:  4,

  // Scrim opacities
  scrimWorking:     'rgba(26, 26, 26, 0.60)',
  scrimInterrupt:   'rgba(26, 26, 26, 0.85)',
  scrimGate:        'rgba(26, 26, 26, 1.00)',

  // Layer z-indexes
  zWorking:         10,
  zTransactional:   20,
  zInterrupt:       30,
  zGate:            100,

  // Overlay frame colors
  frameTransactional:      '#C6FFBB',  // mint
  frameInterruptDecision:  '#fcbe40',  // gold
  frameInterruptCritical:  '#da331c',  // red
};

// Default palette: Terminal Glow
// This will become operator-configurable via Overseer settings
T.categoryPalette = {
  'PIZZA':  '#ff4757',
  'APPS':   '#ffd93d',
  'SUBS':   '#C6FFBB',
  'SIDES':  '#70a1ff',
  'DRINKS': '#ffa502',
};

T.catColor = (category) => T.categoryPalette[category] || T.mint;

// Text hierarchy
T.textPrimary = '#f5f0e8';
T.textSecondary = '#b0a898';

// Role colors (configurable per location)
T.roles = {
  manager:   '#ff8800',
  server:    '#00aaff',
  busser:    '#cc44ff',
  bartender: '#00ddaa',
  host:      '#ffee00',
  cook:      '#ff4499',
};

// Confirm green
T.green = '#39b54a';

export function chamfer(s) {
  var c = s || T.chamfer;
  return 'polygon(' + c + 'px 0%, calc(100% - ' + c + 'px) 0%, 100% ' + c + 'px, 100% calc(100% - ' + c + 'px), calc(100% - ' + c + 'px) 100%, ' + c + 'px 100%, 0% calc(100% - ' + c + 'px), 0% ' + c + 'px)';
}

export function bevelEdges(fillColor) {
  if (fillColor === T.bg)      return { light: T.bgLight,    dark: T.bgEdge    };
  if (fillColor === T.darkBtn) return { light: T.darkBtnL,   dark: T.darkBtnD  };
  if (fillColor === T.mint)    return { light: T.mintEdgeL,   dark: T.mintEdgeD };
  if (fillColor === T.numpadChassis) return { light: T.numpadChassisL, dark: T.numpadChassisD };
  if (fillColor === T.goGreen) return { light: T.greenL,      dark: T.greenD   };
  if (fillColor === T.gold)    return { light: T.goldL,       dark: T.goldD    };
  if (fillColor === T.red)     return { light: T.redL,        dark: T.redD     };
  if (fillColor === T.cyan)    return { light: T.cyanL,       dark: T.cyanD    };
  if (fillColor === T.lavender)return { light: T.lavenderL,   dark: T.lavenderD};
  if (fillColor === T.catProteins) return { light: T.catProteinsL, dark: T.catProteinsD };
  if (fillColor === T.catBeverages)return { light: T.catBeveragesL,dark: T.catBeveragesD};
  if (fillColor === T.catSauces)   return { light: T.catSaucesL,   dark: T.catSaucesD  };
  if (fillColor === T.catStarches) return { light: T.catStarchesL, dark: T.catStarchesD};
  if (fillColor === T.grayBtn) return { light: T.grayBtnL, dark: T.grayBtnD };
  if (fillColor === T.mintB)  return { light: '#aff4c4', dark: '#3a7a4d' };
  if (fillColor === T.redB)   return { light: '#ff7a87', dark: '#7a1f28' };
  if (fillColor === T.green)  return { light: '#6adc8a', dark: '#246b34' };
  return { light: T.bgLight, dark: T.bgEdge };
}

export function shadowColor(fillColor) {
  // Style D: dark buttons get mint shadow 55% opacity; colored buttons get dark shadow 80%
  if (fillColor === T.bg)       return 'rgba(198, 255, 187, 0.55)';
  if (fillColor === T.darkBtn)  return 'rgba(198, 255, 187, 0.55)';
  if (fillColor === T.mint)     return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.numpadChassis) return 'rgba(0, 0, 0, 0.55)';
  if (fillColor === T.goGreen)  return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.gold)     return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.red)      return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.cyan)     return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.lavender) return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.catProteins) return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.catBeverages)return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.catSauces)   return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.catStarches) return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.grayBtn) return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.mintB)  return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.redB)   return 'rgba(10, 10, 10, 0.8)';
  if (fillColor === T.green)  return 'rgba(10, 10, 10, 0.8)';
  return 'rgba(10, 10, 10, 0.8)';
}

// ═══════════════════════════════════════════════════
//  WRAPPER + INNER BUTTON
//  Shadow lives on wrapper, clip-path on inner
//  This prevents clip-path from clipping the shadow
// ═══════════════════════════════════════════════════

export function buildStyledButton(fillColor) {
  var fill = fillColor || T.darkBtn;
  var edges = bevelEdges(fill);
  var shadow = shadowColor(fill);
  var b = T.bevelBtn;


  var wrap = document.createElement('div');
  wrap.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + shadow + ')';
  wrap.style.transition = 'transform 50ms, filter 50ms';
  wrap.style.cursor = 'pointer';
  wrap.style.userSelect = 'none';
  wrap.style.webkitUserSelect = 'none';
  wrap.style.touchAction = 'manipulation';

  var inner = document.createElement('div');
  inner.style.background = fill;
  inner.style.borderTop    = b + 'px solid ' + edges.light;
  inner.style.borderLeft   = b + 'px solid ' + edges.light;
  inner.style.borderBottom = b + 'px solid ' + edges.dark;
  inner.style.borderRight  = b + 'px solid ' + edges.dark;
  inner.style.clipPath = chamfer();
  inner.style.width = '100%';
  inner.style.height = '100%';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.textAlign = 'center';
  inner.style.boxSizing = 'border-box';
  inner.style.padding = '8px 12px';

  wrap.appendChild(inner);
  wrap._edges = edges;
  wrap._shadow = shadow;
  wrap._inner = inner;
  wrap._bevel = b;

  wrap.addEventListener('pointerdown', _wDown);
  wrap.addEventListener('pointerup', _wUp);
  wrap.addEventListener('pointerleave', _wUp);

  return { wrap: wrap, inner: inner };
}

function _wDown(e) {
  var w = e.currentTarget;
  var b = w._bevel || T.bevelBtn;
  w._inner.style.borderTop    = b + 'px solid ' + w._edges.dark;
  w._inner.style.borderLeft   = b + 'px solid ' + w._edges.dark;
  w._inner.style.borderBottom = b + 'px solid ' + w._edges.light;
  w._inner.style.borderRight  = b + 'px solid ' + w._edges.light;
  w.style.filter = 'drop-shadow(0px 0px 0px transparent)';
  w.style.transform = 'translate(' + T.shadowX + 'px, ' + T.shadowY + 'px)';
}

function _wUp(e) {
  var w = e.currentTarget;
  var b = w._bevel || T.bevelBtn;
  w._inner.style.borderTop    = b + 'px solid ' + w._edges.light;
  w._inner.style.borderLeft   = b + 'px solid ' + w._edges.light;
  w._inner.style.borderBottom = b + 'px solid ' + w._edges.dark;
  w._inner.style.borderRight  = b + 'px solid ' + w._edges.dark;
  w.style.filter = 'drop-shadow(' + T.shadowX + 'px ' + T.shadowY + 'px 0px ' + w._shadow + ')';
  w.style.transform = 'translate(0,0)';
}

export function applySunkenStyle(el) {
  var b = T.bevel;
  el.style.borderTop    = b + 'px solid ' + T.bgEdge;
  el.style.borderLeft   = b + 'px solid ' + T.bgEdge;
  el.style.borderBottom = b + 'px solid ' + T.bgLight;
  el.style.borderRight  = b + 'px solid ' + T.bgLight;
  el.style.clipPath = chamfer();
}

export function applyRaisedStyle(el, fillColor) {
  var fill = fillColor || T.darkBtn;
  var edges = bevelEdges(fill);
  var b = T.bevel;
  el.style.background = fill;
  el.style.borderTop    = b + 'px solid ' + edges.light;
  el.style.borderLeft   = b + 'px solid ' + edges.light;
  el.style.borderBottom = b + 'px solid ' + edges.dark;
  el.style.borderRight  = b + 'px solid ' + edges.dark;
  el.style.clipPath = chamfer(10);
}
