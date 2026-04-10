// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Reporting Scene
//  Manager's operational dashboard — three-column grid
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════

import { T, buildStyledButton, shadowColor } from '../tokens.js';
import { showToast } from '../components.js';
import { SceneManager } from '../scene-manager.js';
import { setSceneName, setHeaderBack } from '../app.js';
import { CHART, createSVG, svgEl, drawBarChart, drawStackedArea, drawParetoChart, drawHorizontalBars, drawTrendLine, drawProgressBar, drawStackedColumn, drawHistogram, drawHeatmap, drawParetoHBar, buildChartPanel, buildChartGrid } from '../chart-helpers.js';
import { DATA } from '../chart-colors.js';
import { PAT, GLOW } from '../chart-patterns.js';

// ── Constants ──────────────────────────────────────

var NS = 'http://www.w3.org/2000/svg';
var FONT = T.fb;
var HOURS = ['11A','12P','1P','2P','3P','4P','5P','6P'];

var C = {
  mint:'#87f79c', gold:'#fbb03b', lime:'#ccff33', pink:'#ff66cc',
  verm:'#ff4422', green:'#39b54a', dim:'#555555',
  bg:'#222222', dark:'#1a1a1a', border:'#333333',
  well:'#111111', wellBrd:'#2a2a2a',
  axis:'rgba(255,255,255,0.7)', grid:'rgba(255,255,255,0.1)',
  label:'rgba(255,255,255,0.65)', overlay:'rgba(18,18,18,0.94)',
};

var CAT = {PIZZA:'#ff5533',SUBS:'#4499ff',GENERAL:'#bb44ff',DRINKS:'#ff9900',SPECIALS:'#00bbcc'};
var CATS_STACK = ['SPECIALS','DRINKS','GENERAL','SUBS','PIZZA']; // bottom→top
var CATS_DISPLAY = ['PIZZA','SUBS','GENERAL','DRINKS','SPECIALS'];

// ── Demo Data ──────────────────────────────────────

var D_TODAY = [18,50.5,65,43,34,39.5,38,17.75];
var D_LASTW = [14,38,55,40,28,36,44,25];
var D_CAVG = [4.50,5.20,6.10,5.80,5.40,5.90,5.70,4.40];
var D_ORD = [
  {name:'DINE-IN',color:'#4499ff',cashPct:0.70,total:156.00},
  {name:'TO-GO',color:'#ff9900',cashPct:0.60,total:110.75},
  {name:'ONLINE',color:'#bb44ff',cashPct:0.15,total:39.00},
];
var D_HR = {
  PIZZA:[8,22,28,18,14,16,18,8], SUBS:[5,14,18,12,10,11,10,4.5],
  GENERAL:[3,7,9,6,5,6,5,2.75], DRINKS:[2,4.5,6,4,3,3.5,3,1.5],
  SPECIALS:[0,3,4,3,2,3,2,1],
};
var D_ITEMS = {
  PIZZA:[{n:'Pepperoni Slice',q:10,p:6.00},{n:'Margherita Slice',q:8,p:5.50},{n:'Supreme Slice',q:4,p:7.00}],
  SUBS:[{n:'Classic Italian',q:8,p:5.50},{n:'Club Sub',q:5,p:6.50},{n:'Mini Sub',q:2,p:4.00}],
  GENERAL:[{n:'Fries',q:5,p:4.25},{n:'Onion Rings',q:3,p:7.50}],
  DRINKS:[{n:'Soda',q:15,p:1.50},{n:'Water',q:2,p:1.00},{n:'Lemonade',q:1,p:3.00}],
  SPECIALS:[{n:'Daily Special',q:3,p:5.00},{n:"Chef's Choice",q:2,p:1.50}],
};
var D_SERVERS = [{
  name:'ALEX', color:'#4499ff',
  openChecks:[{id:'CHK-042',table:'T3',total:24.50},{id:'CHK-057',table:'T7',total:18.75}],
  tips:[{id:'CHK-031',amt:32.00,tip:null},{id:'CHK-035',amt:28.50,tip:null},{id:'CHK-039',amt:15.00,tip:null}],
}];
var D_HSALES = [18,50.5,65,43,34,39.5,38,17.75];
var D_HLAB = [8,17,17,17,17,9,9,9];
var D_EMP = [
  {name:'ALEX',role:'SERVER',rate:9,hours:7,sched:'12P\u20136P',cost:63,cob:20.6,share:61.2,color:'#4499ff'},
  {name:'JAMIE',role:'COOK',rate:8,hours:5,sched:'11A\u20133P',cost:40,cob:13.1,share:38.8,color:'#ff9900'},
];
var D_CHECKS = [
  {id:'CHK-042',srv:'ALEX',hr:'1P',tbl:'T3',type:'DINE-IN',total:24.50,status:'OPEN',items:['Pepperoni Slice x2','Soda x2']},
  {id:'CHK-057',srv:'ALEX',hr:'2P',tbl:'T7',type:'DINE-IN',total:18.75,status:'OPEN',items:['Margherita Slice x1','Fries x1']},
  {id:'CHK-031',srv:'ALEX',hr:'12P',tbl:null,type:'TO-GO',total:32.00,status:'CLOSED',items:['Supreme Slice x2','Lemonade x1']},
  {id:'CHK-035',srv:'ALEX',hr:'12P',tbl:'T2',type:'DINE-IN',total:28.50,status:'CLOSED',items:['Classic Italian x1','Onion Rings x1']},
  {id:'CHK-039',srv:'ALEX',hr:'1P',tbl:null,type:'ONLINE',total:15.00,status:'CLOSED',items:['Mini Sub x1','Water x1']},
  {id:'CHK-044',srv:'JAMIE',hr:'11A',tbl:'T1',type:'DINE-IN',total:22.00,status:'CLOSED',items:['Pepperoni Slice x1','Club Sub x1']},
  {id:'CHK-048',srv:'JAMIE',hr:'12P',tbl:null,type:'TO-GO',total:19.25,status:'CLOSED',items:['Daily Special x1','Soda x1']},
];
var D_HEAT = {
  servers:['ALEX','JAMIE'],
  data:{ALEX:[0,3,4,2,2,2,1,1],JAMIE:[2,2,3,2,1,2,2,1]},
};

// ── Module State ───────────────────────────────────

var curEl = null;
var activeOverlay = null;
var hmFilter = null; // {server,hour} or null — heatmap→allchecks filter
var hmExpanded = false; // heatmap full-width across top
var closeDayEl = null;
var allChecksEl = null;
var heatmapEl = null;
var closeState = { settled: false, closed: false };

// ── SVG + DOM Helpers ──────────────────────────────

function mk(tag, a, t) {
  var e = document.createElementNS(NS, tag);
  if (a) { var k = Object.keys(a); for (var i = 0; i < k.length; i++) e.setAttribute(k[i], a[k[i]]); }
  if (t !== undefined) e.textContent = t;
  return e;
}

function el(tag, css, t) {
  var e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (t !== undefined) e.textContent = t;
  return e;
}

function fmt(n) { return '$' + Math.abs(n).toFixed(2); }
function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }

function addDefs(svg, uid) {
  var defs = mk('defs');
  // dot-grid background
  var bg = mk('pattern', { id:'bg_'+uid, width:'4', height:'4', patternUnits:'userSpaceOnUse' });
  bg.appendChild(mk('rect', { width:'4', height:'4', fill:'#111' }));
  var corners = [[0,0],[4,0],[0,4],[4,4]];
  for (var i = 0; i < corners.length; i++)
    bg.appendChild(mk('circle', { cx:corners[i][0], cy:corners[i][1], r:'0.5', fill:'#1c1c1c' }));
  bg.appendChild(mk('circle', { cx:'2', cy:'2', r:'0.4', fill:'#181818' }));
  defs.appendChild(bg);
  // win98 dither
  var dit = mk('pattern', { id:'dit_'+uid, width:'2', height:'2', patternUnits:'userSpaceOnUse' });
  dit.appendChild(mk('rect', { x:'0', y:'0', width:'1', height:'1', fill:'rgba(0,0,0,0.22)' }));
  dit.appendChild(mk('rect', { x:'1', y:'1', width:'1', height:'1', fill:'rgba(0,0,0,0.22)' }));
  defs.appendChild(dit);
  svg.appendChild(defs);
}

function chartFrame(svg, x0, y0, W, H, uid) {
  // chart well with dot-grid bg
  svg.appendChild(mk('rect', { x:x0, y:y0, width:W, height:H,
    fill:'url(#bg_'+uid+')', stroke:'#2a2a2a', 'stroke-width':'1' }));
  // horizontal grid at 25/50/75%
  for (var f = 1; f <= 3; f++) {
    svg.appendChild(mk('line', { x1:x0, y1:y0+H-f*H/4, x2:x0+W, y2:y0+H-f*H/4,
      stroke:'rgba(255,255,255,0.1)', 'stroke-width':'1' }));
  }
  // axes
  svg.appendChild(mk('line', { x1:x0, y1:y0, x2:x0, y2:y0+H,
    stroke:'rgba(255,255,255,0.5)', 'stroke-width':'1.5' }));
  svg.appendChild(mk('line', { x1:x0, y1:y0+H, x2:x0+W, y2:y0+H,
    stroke:'rgba(255,255,255,0.5)', 'stroke-width':'1.5' }));
}

function xLabels(svg, x0, W, bot, fs) {
  var step = W / (HOURS.length - 1);
  for (var i = 0; i < HOURS.length; i++) {
    svg.appendChild(mk('text', { x:(x0+i*step).toFixed(1), y:bot+12,
      'text-anchor':'middle', fill:'rgba(255,255,255,0.45)', 'font-size':fs||'17', 'font-family':FONT }, HOURS[i]));
  }
}

function xLabelsCentered(svg, x0, W, n, bot, fs) {
  var step = W / n;
  for (var i = 0; i < HOURS.length; i++) {
    svg.appendChild(mk('text', { x:(x0+i*step+step/2).toFixed(1), y:bot+12,
      'text-anchor':'middle', fill:'rgba(255,255,255,0.45)', 'font-size':fs||'17', 'font-family':FONT }, HOURS[i]));
  }
}

function getGate() {
  var oc = 0, ut = 0;
  for (var i = 0; i < D_SERVERS.length; i++) {
    oc += D_SERVERS[i].openChecks.length;
    for (var j = 0; j < D_SERVERS[i].tips.length; j++) {
      if (D_SERVERS[i].tips[j].tip === null) ut++;
    }
  }
  var resolved = (oc === 0 ? 1 : 0) + (ut === 0 ? 1 : 0);
  return { open: oc, unadj: ut, total: 2, resolved: resolved };
}

function refreshCloseDay() { if (closeDayEl) { closeDayEl.innerHTML = ''; buildCloseDayBody(closeDayEl); } }
function refreshAllChecks() { if (allChecksEl) { allChecksEl.innerHTML = ''; buildAllChecksBody(allChecksEl); } }

// ── Overlay System ─────────────────────────────────

function openOverlay(builderFn) {
  if (activeOverlay) closeOverlay();
  var ov = el('div', 'position:fixed;top:0;left:0;right:0;bottom:0;background:' + C.overlay + ';z-index:50;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px 0;');
  var panel = el('div', 'border:2px solid ' + C.mint + ';width:min(96vw,700px);margin:0 auto;background:' + C.dark + ';');
  builderFn(panel);
  ov.appendChild(panel);
  ov.addEventListener('click', function(e) { if (e.target === ov) closeOverlay(); });
  document.body.appendChild(ov);
  activeOverlay = ov;
}

function closeOverlay() {
  if (activeOverlay && activeOverlay.parentNode) activeOverlay.parentNode.removeChild(activeOverlay);
  activeOverlay = null;
}

// ── Stat Strip ─────────────────────────────────────

function buildStatStrip(items) {
  var strip = el('div', 'display:flex;gap:2px;padding:8px;');
  for (var i = 0; i < items.length; i++) {
    var box = el('div', 'flex:1;background:' + C.bg + ';padding:8px 6px;text-align:center;');
    box.appendChild(el('div', 'font-family:' + FONT + ';font-size:18px;color:' + C.dim + ';letter-spacing:1px;margin-bottom:4px;', items[i].label));
    box.appendChild(el('div', 'font-family:' + FONT + ';font-size:28px;font-weight:bold;color:' + items[i].color + ';', items[i].value));
    strip.appendChild(box);
  }
  return strip;
}

// ── Card Builder ───────────────────────────────────

function buildCard(title, bodyFn, overlayFn) {
  var card = el('div', 'background:' + C.bg + ';border:2px solid ' + C.border + ';display:flex;flex-direction:column;overflow:hidden;flex:1;min-height:0;');
  var header = el('div', 'background:' + C.mint + ';color:' + C.dark + ';font-family:' + FONT + ';font-size:18px;font-weight:bold;padding:4px 10px;letter-spacing:2px;flex-shrink:0;', title);
  card.appendChild(header);
  card._header = header;
  var body = el('div', 'flex:1;overflow:hidden;padding:4px;cursor:pointer;min-height:0;');
  bodyFn(body);
  card.appendChild(body);
  card._body = body;
  if (overlayFn) {
    body.addEventListener('pointerup', function() { openOverlay(overlayFn); });
  }
  return card;
}

// ── Numpad (for tip adjustment) ────────────────────

function showNumpad(callback) {
  var ov = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:60;display:flex;align-items:center;justify-content:center;');
  var frame = el('div', 'border:3px solid ' + C.gold + ';background:' + C.dark + ';padding:16px;width:260px;');
  var display = el('div', 'background:#111;padding:10px;font-family:' + FONT + ';font-size:28px;color:' + C.gold + ';text-align:right;margin-bottom:10px;min-height:36px;', '$0.00');
  frame.appendChild(display);
  var val = '';
  function upd() { display.textContent = '$' + (parseFloat(val || '0') / 100).toFixed(2); }
  var grid = el('div', 'display:grid;grid-template-columns:repeat(3,1fr);gap:5px;');
  var keys = ['7','8','9','4','5','6','1','2','3','CLR','0','OK'];
  for (var i = 0; i < keys.length; i++) {
    (function(k) {
      var bg = k === 'OK' ? C.green : k === 'CLR' ? C.verm : '#333';
      var fg = k === 'OK' || k === 'CLR' ? C.dark : '#fff';
      var btn = el('div', 'background:' + bg + ';color:' + fg + ';font-family:' + FONT + ';font-size:20px;font-weight:bold;text-align:center;padding:12px 0;cursor:pointer;', k);
      btn.addEventListener('pointerup', function() {
        if (k === 'CLR') { val = ''; upd(); }
        else if (k === 'OK') { ov.parentNode && ov.parentNode.removeChild(ov); callback(parseFloat(val || '0') / 100); }
        else if (val.length < 6) { val += k; upd(); }
      });
      grid.appendChild(btn);
    })(keys[i]);
  }
  frame.appendChild(grid);
  var dismiss = el('div', 'text-align:center;margin-top:10px;font-family:' + FONT + ';font-size:12px;color:' + C.dim + ';cursor:pointer;', 'DISMISS');
  dismiss.addEventListener('pointerup', function() { ov.parentNode && ov.parentNode.removeChild(ov); });
  frame.appendChild(dismiss);
  ov.addEventListener('click', function(e) { if (e.target === ov) { ov.parentNode && ov.parentNode.removeChild(ov); } });
  document.body.appendChild(ov);
}

// ═══════════════════════════════════════════════════
//  CARD BODY + OVERLAY BUILDERS (stubs — filled in next)
// ═══════════════════════════════════════════════════

// Card 1 — Sales Overview
function buildSalesOverviewBody(body) {
  var svg = mk('svg', { viewBox:'0 0 300 148', width:'100%', height:'100%', preserveAspectRatio:'xMidYMid meet' });
  addDefs(svg, 'card');
  var x0 = 28, y0 = 10, W = 256, H = 106;
  var bot = y0 + H;
  var maxVal = 65; // peak of today data
  function tx(i) { return x0 + (i / 7) * W; }
  function ty(v) { return y0 + H - (v / maxVal) * H; }

  chartFrame(svg, x0, y0, W, H, 'card');
  xLabels(svg, x0, W, bot, '8');

  // Last week (pink dashed, behind)
  var lwPts = [];
  for (var i = 0; i < 8; i++) lwPts.push(tx(i).toFixed(1) + ',' + ty(D_LASTW[i]).toFixed(1));
  svg.appendChild(mk('polyline', { points: lwPts.join(' '), fill:'none', stroke:C.pink, 'stroke-width':'1.5', 'stroke-dasharray':'5,3' }));
  for (var i = 0; i < 8; i++) svg.appendChild(mk('rect', { x:tx(i)-2, y:ty(D_LASTW[i])-2, width:'4', height:'4', fill:C.pink }));

  // Today area fill
  var areaD = 'M' + tx(0).toFixed(1) + ',' + bot;
  for (var i = 0; i < 8; i++) areaD += ' L' + tx(i).toFixed(1) + ',' + ty(D_TODAY[i]).toFixed(1);
  areaD += ' L' + tx(7).toFixed(1) + ',' + bot + ' Z';
  svg.appendChild(mk('path', { d:areaD, fill:C.lime, opacity:'0.08' }));

  // Today glow + solid
  var tPts = [];
  for (var i = 0; i < 8; i++) tPts.push(tx(i).toFixed(1) + ',' + ty(D_TODAY[i]).toFixed(1));
  svg.appendChild(mk('polyline', { points:tPts.join(' '), fill:'none', stroke:C.lime, 'stroke-width':'4', 'stroke-opacity':'0.3' }));
  svg.appendChild(mk('polyline', { points:tPts.join(' '), fill:'none', stroke:C.lime, 'stroke-width':'2' }));
  for (var i = 0; i < 8; i++) svg.appendChild(mk('rect', { x:tx(i)-2.5, y:ty(D_TODAY[i])-2.5, width:'5', height:'5', fill:C.lime }));

  // Net callout top-right
  svg.appendChild(mk('text', { x:282, y:20, fill:C.lime, 'font-size':'14', 'font-weight':'bold', 'font-family':FONT, 'text-anchor':'end' }, fmt(sum(D_TODAY))));
  svg.appendChild(mk('text', { x:282, y:30, fill:'rgba(255,255,255,0.35)', 'font-size':'18', 'font-family':FONT, 'text-anchor':'end' }, 'NET SALES TODAY'));

  // Legend
  svg.appendChild(mk('rect', { x:x0+30, y:bot+22, width:'8', height:'8', fill:C.lime }));
  svg.appendChild(mk('text', { x:x0+42, y:bot+29, fill:C.label, 'font-size':'18', 'font-family':FONT }, 'TODAY'));
  svg.appendChild(mk('rect', { x:x0+100, y:bot+22, width:'8', height:'8', fill:C.pink }));
  svg.appendChild(mk('text', { x:x0+112, y:bot+29, fill:C.label, 'font-size':'18', 'font-family':FONT }, 'LAST WEEK'));

  body.appendChild(svg);
}

function buildSalesOverviewOverlay(panel) {
  var netT = sum(D_TODAY), netLW = sum(D_LASTW);
  var variance = ((netT - netLW) / netLW * 100).toFixed(1);

  // Stat strip
  panel.appendChild(buildStatStrip([
    { label:'NET TODAY', value:fmt(netT), color:C.gold },
    { label:'LAST WEEK', value:fmt(netLW), color:C.pink },
    { label:'VARIANCE', value:'+' + variance + '%', color:C.green },
    { label:'CHECK AVG', value:'$5.50', color:C.gold },
  ]));

  // Chart A — Net Sales Line (large)
  var secA = el('div', 'padding:8px;');
  secA.appendChild(el('div', 'font-family:' + FONT + ';font-size:22px;color:' + C.mint + ';margin-bottom:6px;letter-spacing:1px;', 'NET SALES — TODAY vs LAST WEEK'));
  var svgA = mk('svg', { viewBox:'0 0 660 200', width:'100%', preserveAspectRatio:'xMidYMid meet' });
  addDefs(svgA, 'soa');
  var ax=44,ay=12,aw=596,ah=150,aMax=65;
  function atx(i){return ax+(i/7)*aw;} function aty(v){return ay+ah-(v/aMax)*ah;}
  chartFrame(svgA,ax,ay,aw,ah,'soa');
  xLabels(svgA,ax,aw,ay+ah,'15');

  // Last week
  var lwP=[];for(var i=0;i<8;i++)lwP.push(atx(i).toFixed(1)+','+aty(D_LASTW[i]).toFixed(1));
  svgA.appendChild(mk('polyline',{points:lwP.join(' '),fill:'none',stroke:C.pink,'stroke-width':'1.5','stroke-dasharray':'5,3'}));
  for(var i=0;i<8;i++)svgA.appendChild(mk('rect',{x:atx(i)-3,y:aty(D_LASTW[i])-3,width:'6',height:'6',fill:C.pink}));

  // Today
  var areaA='M'+atx(0).toFixed(1)+','+(ay+ah);
  for(var i=0;i<8;i++)areaA+=' L'+atx(i).toFixed(1)+','+aty(D_TODAY[i]).toFixed(1);
  areaA+=' L'+atx(7).toFixed(1)+','+(ay+ah)+' Z';
  svgA.appendChild(mk('path',{d:areaA,fill:C.lime,opacity:'0.08'}));
  var tP=[];for(var i=0;i<8;i++)tP.push(atx(i).toFixed(1)+','+aty(D_TODAY[i]).toFixed(1));
  svgA.appendChild(mk('polyline',{points:tP.join(' '),fill:'none',stroke:C.lime,'stroke-width':'4','stroke-opacity':'0.3'}));
  svgA.appendChild(mk('polyline',{points:tP.join(' '),fill:'none',stroke:C.lime,'stroke-width':'2'}));
  for(var i=0;i<8;i++)svgA.appendChild(mk('rect',{x:atx(i)-3,y:aty(D_TODAY[i])-3,width:'6',height:'6',fill:C.lime}));

  // Peak hour label
  svgA.appendChild(mk('text',{x:atx(2),y:aty(65)-8,fill:C.lime,'font-size':'17','font-weight':'bold','font-family':FONT,'text-anchor':'middle'},'$65'));

  // Legend
  svgA.appendChild(mk('rect',{x:ax+160,y:ah+30,width:'8',height:'8',fill:C.lime}));
  svgA.appendChild(mk('text',{x:ax+172,y:ah+38,fill:C.label,'font-size':'18','font-family':FONT},'TODAY '+fmt(netT)));
  svgA.appendChild(mk('rect',{x:ax+320,y:ah+30,width:'8',height:'8',fill:C.pink}));
  svgA.appendChild(mk('text',{x:ax+332,y:ah+38,fill:C.label,'font-size':'18','font-family':FONT},'LAST WEEK '+fmt(netLW)));
  secA.appendChild(svgA);
  panel.appendChild(secA);

  // Chart B — Check Average Bar + Target Line
  var secB = el('div', 'padding:8px;');
  secB.appendChild(el('div', 'font-family:' + FONT + ';font-size:22px;color:' + C.mint + ';margin-bottom:6px;letter-spacing:1px;', 'CHECK AVERAGE BY HOUR'));
  var svgB = mk('svg', { viewBox:'0 0 660 148', width:'100%', preserveAspectRatio:'xMidYMid meet' });
  addDefs(svgB, 'sob');
  var bx=44,by=12,bw=596,bh=100,bMax=7;
  var target = sum(D_CAVG)/D_CAVG.length;
  chartFrame(svgB,bx,by,bw,bh,'sob');
  xLabels(svgB,bx,bw,by+bh,'15');
  var barW = bw/8*0.55;
  for(var i=0;i<8;i++){
    var bx2=bx+(i/7)*bw-barW/2;
    var barH=(D_CAVG[i]/bMax)*bh;
    var barY=by+bh-barH;
    var above=D_CAVG[i]>=target;
    svgB.appendChild(mk('rect',{x:bx2,y:barY,width:barW,height:barH,fill:C.gold,opacity:above?'1':'0.38'}));
    svgB.appendChild(mk('text',{x:bx+(i/7)*bw,y:barY-4,fill:C.gold,'font-size':'18','font-family':FONT,'text-anchor':'middle',opacity:above?'1':'0.5'},fmt(D_CAVG[i])));
  }
  // Target line
  var tgtY=by+bh-(target/bMax)*bh;
  svgB.appendChild(mk('line',{x1:bx,y1:tgtY,x2:bx+bw,y2:tgtY,stroke:C.lime,'stroke-width':'1.5','stroke-dasharray':'5,3'}));
  svgB.appendChild(mk('text',{x:bx+bw+4,y:tgtY+4,fill:C.lime,'font-size':'18','font-family':FONT},'AVG '+fmt(target)));
  // Legend
  svgB.appendChild(mk('rect',{x:bx+100,y:bh+28,width:'8',height:'8',fill:C.gold}));
  svgB.appendChild(mk('text',{x:bx+112,y:bh+36,fill:C.label,'font-size':'17','font-family':FONT},'CHECK AVG \u2014 dimmed bars below daily target'));
  secB.appendChild(svgB);
  panel.appendChild(secB);

  // Chart C — Order Type Split Bars
  var secC = el('div', 'padding:8px;');
  secC.appendChild(el('div', 'font-family:' + FONT + ';font-size:22px;color:' + C.mint + ';margin-bottom:6px;letter-spacing:1px;', 'ORDER TYPE — CASH vs CARD'));
  var svgC = mk('svg', { viewBox:'0 0 660 162', width:'100%', preserveAspectRatio:'xMidYMid meet' });
  var ocx=88,ocy=14,ocw=500,och=110;
  var oMax=156; // max order type total
  // Vertical grid
  for(var g=1;g<=4;g++){
    var gx=ocx+(g/4)*ocw;
    svgC.appendChild(mk('line',{x1:gx,y1:ocy,x2:gx,y2:ocy+och,stroke:C.grid,'stroke-width':'1'}));
    svgC.appendChild(mk('text',{x:gx,y:ocy-3,fill:C.label,'font-size':'17','font-family':FONT,'text-anchor':'middle'},fmt(oMax*g/4)));
  }
  var rowH=och/3;
  for(var i=0;i<D_ORD.length;i++){
    var o=D_ORD[i];
    var ry=ocy+i*rowH+4;
    var bH=rowH-12;
    var totalW=(o.total/oMax)*ocw;
    var cashW=totalW*o.cashPct;
    var cardW=totalW*(1-o.cashPct);
    // Label
    svgC.appendChild(mk('text',{x:ocx-6,y:ry+bH/2+4,fill:o.color,'font-size':'20','font-weight':'bold','font-family':FONT,'text-anchor':'end'},o.name));
    // Cash segment
    svgC.appendChild(mk('rect',{x:ocx,y:ry,width:cashW,height:bH,fill:C.gold}));
    if(cashW>=32) svgC.appendChild(mk('text',{x:ocx+cashW/2,y:ry+bH/2+4,fill:C.dark,'font-size':'18','font-family':FONT,'text-anchor':'middle'},Math.round(o.cashPct*100)+'%'));
    // Card segment
    svgC.appendChild(mk('rect',{x:ocx+cashW,y:ry,width:cardW,height:bH,fill:C.pink}));
    if(cardW>=32) svgC.appendChild(mk('text',{x:ocx+cashW+cardW/2,y:ry+bH/2+4,fill:C.dark,'font-size':'18','font-family':FONT,'text-anchor':'middle'},Math.round((1-o.cashPct)*100)+'%'));
    // Divider
    svgC.appendChild(mk('line',{x1:ocx+cashW,y1:ry,x2:ocx+cashW,y2:ry+bH,stroke:C.dark,'stroke-width':'1'}));
    // Total after bar
    svgC.appendChild(mk('text',{x:ocx+totalW+6,y:ry+bH/2+4,fill:o.color,'font-size':'20','font-weight':'bold','font-family':FONT},fmt(o.total)));
  }
  // Legend
  svgC.appendChild(mk('rect',{x:ocx+120,y:och+26,width:'8',height:'8',fill:C.gold}));
  svgC.appendChild(mk('text',{x:ocx+132,y:och+34,fill:C.label,'font-size':'17','font-family':FONT},'CASH'));
  svgC.appendChild(mk('rect',{x:ocx+200,y:och+26,width:'8',height:'8',fill:C.pink}));
  svgC.appendChild(mk('text',{x:ocx+212,y:och+34,fill:C.label,'font-size':'17','font-family':FONT},'CARD'));
  secC.appendChild(svgC);
  panel.appendChild(secC);
}

// Card 2 — Sales Breakdown
function buildSalesBreakdownBody(body) {
  var svg = mk('svg', { viewBox:'0 0 300 148', width:'100%', height:'100%', preserveAspectRatio:'xMidYMid meet' });
  addDefs(svg, 'sb');
  var cx=28, cy=10, cw=256, ch=108, maxY=65;
  function tx(i){return cx+(i/7)*cw;} function ty(v){return cy+ch-(v/maxY)*ch;}

  chartFrame(svg,cx,cy,cw,ch,'sb');
  xLabels(svg,cx,cw,cy+ch,'14');
  // Y labels
  svg.appendChild(mk('text',{x:cx-3,y:cy+ch+2,fill:C.label,'font-size':'14','font-family':FONT,'text-anchor':'end'},'$0'));
  svg.appendChild(mk('text',{x:cx-3,y:cy+6,fill:C.label,'font-size':'14','font-family':FONT,'text-anchor':'end'},'$'+maxY));

  // Build cumulative stacks
  var cum = [0,0,0,0,0,0,0,0];
  for (var s=0;s<CATS_STACK.length;s++){
    var cat=CATS_STACK[s];
    var bottom=cum.slice();
    for(var i=0;i<8;i++) cum[i]+=D_HR[cat][i];
    // Polygon
    var d='M'+tx(0).toFixed(1)+','+ty(cum[0]).toFixed(1);
    for(var i=1;i<8;i++) d+=' L'+tx(i).toFixed(1)+','+ty(cum[i]).toFixed(1);
    for(var i=7;i>=0;i--) d+=' L'+tx(i).toFixed(1)+','+ty(bottom[i]).toFixed(1);
    d+=' Z';
    svg.appendChild(mk('path',{d:d,fill:CAT[cat],opacity:'0.75'}));
    svg.appendChild(mk('path',{d:d,fill:'url(#dit_sb)'}));
    // Top edge
    var tp=[];for(var i=0;i<8;i++)tp.push(tx(i).toFixed(1)+','+ty(cum[i]).toFixed(1));
    svg.appendChild(mk('polyline',{points:tp.join(' '),fill:'none',stroke:CAT[cat],'stroke-width':'1'}));
  }
  body.appendChild(svg);
}

function buildSalesBreakdownOverlay(panel) {
  var catTotals={};var totalRev=0;var totalItems=0;
  for(var c=0;c<CATS_DISPLAY.length;c++){
    var cat=CATS_DISPLAY[c];
    catTotals[cat]=sum(D_HR[cat]);
    totalRev+=catTotals[cat];
    var items=D_ITEMS[cat];for(var j=0;j<items.length;j++)totalItems+=items[j].q;
  }
  // Peak hour
  var peakVal=0,peakHr='';
  for(var i=0;i<8;i++){var ht=0;for(var c=0;c<CATS_DISPLAY.length;c++)ht+=D_HR[CATS_DISPLAY[c]][i];if(ht>peakVal){peakVal=ht;peakHr=HOURS[i];}}

  panel.appendChild(buildStatStrip([
    {label:'TOTAL REVENUE',value:fmt(totalRev),color:C.gold},
    {label:'TOP CATEGORY',value:'PIZZA',color:CAT.PIZZA},
    {label:'PEAK HOUR',value:peakHr,color:C.lime},
    {label:'TOTAL ITEMS',value:''+totalItems,color:C.lime},
  ]));

  // Filter state (scoped to overlay)
  var activeCat=null;

  // Refs for re-render
  var areaWrap=el('div','padding:8px;');
  var chipWrap=el('div','padding:0 8px;');
  var tableWrap=el('div','padding:8px;');

  function renderArea(){
    areaWrap.innerHTML='';
    areaWrap.appendChild(el('div','font-family:'+FONT+';font-size:12px;color:'+C.mint+';margin-bottom:4px;letter-spacing:1px;','STACKED REVENUE BY CATEGORY'));
    var svg=mk('svg',{viewBox:'0 0 660 220',width:'100%',preserveAspectRatio:'xMidYMid meet'});
    addDefs(svg,'sba');
    var ax=40,ay=12,aw=600,ah=175,maxY2=65;
    function tx2(i){return ax+(i/7)*aw;}function ty2(v){return ay+ah-(v/maxY2)*ah;}
    chartFrame(svg,ax,ay,aw,ah,'sba');
    xLabels(svg,ax,aw,ay+ah,'15');
    var cum2=[0,0,0,0,0,0,0,0];
    for(var s=0;s<CATS_STACK.length;s++){
      var cat=CATS_STACK[s];
      var bottom=cum2.slice();
      for(var i=0;i<8;i++)cum2[i]+=D_HR[cat][i];
      var isActive=!activeCat||activeCat===cat;
      var d='M'+tx2(0).toFixed(1)+','+ty2(cum2[0]).toFixed(1);
      for(var i=1;i<8;i++)d+=' L'+tx2(i).toFixed(1)+','+ty2(cum2[i]).toFixed(1);
      for(var i=7;i>=0;i--)d+=' L'+tx2(i).toFixed(1)+','+ty2(bottom[i]).toFixed(1);
      d+=' Z';
      svg.appendChild(mk('path',{d:d,fill:CAT[cat],opacity:isActive?'0.75':'0.12'}));
      if(isActive)svg.appendChild(mk('path',{d:d,fill:'url(#dit_sba)'}));
      var tp=[];for(var i=0;i<8;i++)tp.push(tx2(i).toFixed(1)+','+ty2(cum2[i]).toFixed(1));
      svg.appendChild(mk('polyline',{points:tp.join(' '),fill:'none',stroke:CAT[cat],'stroke-width':'1',opacity:isActive?'1':'0.3'}));
      // Clickable transparent overlay
      (function(catName){
        var hit=mk('path',{d:d,fill:'transparent',cursor:'pointer'});
        hit.addEventListener('pointerup',function(){
          activeCat=activeCat===catName?null:catName;
          renderArea();renderChips();renderTables();
        });
        svg.appendChild(hit);
      })(cat);
    }
    areaWrap.appendChild(svg);
  }

  // Chart B — Tender Split Bar
  function renderTender(){
    var tender=el('div','padding:8px;');
    tender.appendChild(el('div','font-family:'+FONT+';font-size:12px;color:'+C.mint+';margin-bottom:4px;letter-spacing:1px;','TENDER SPLIT'));
    var svg=mk('svg',{viewBox:'0 0 600 44',width:'100%',preserveAspectRatio:'xMidYMid meet'});
    addDefs(svg,'sbt');
    var cashPct=0.81,cashAmt=247.62,cardAmt=58.13;
    var bw=580,bx=10,by=6,bh=24;
    var cashW=bw*cashPct,cardW=bw*(1-cashPct);
    svg.appendChild(mk('rect',{x:bx,y:by,width:cashW,height:bh,fill:C.gold}));
    svg.appendChild(mk('rect',{x:bx,y:by,width:cashW,height:bh,fill:'url(#dit_sbt)'}));
    svg.appendChild(mk('text',{x:bx+cashW/2,y:by+bh/2+4,fill:C.dark,'font-size':'20','font-weight':'bold','font-family':FONT,'text-anchor':'middle'},'CASH '+fmt(cashAmt)+' 81%'));
    svg.appendChild(mk('rect',{x:bx+cashW,y:by,width:cardW,height:bh,fill:C.pink}));
    svg.appendChild(mk('rect',{x:bx+cashW,y:by,width:cardW,height:bh,fill:'url(#dit_sbt)'}));
    svg.appendChild(mk('text',{x:bx+cashW+cardW/2,y:by+bh/2+4,fill:C.dark,'font-size':'20','font-weight':'bold','font-family':FONT,'text-anchor':'middle'},'CARD 19%'));
    tender.appendChild(svg);
    panel.appendChild(tender);
  }

  function renderChips(){
    chipWrap.innerHTML='';
    var row=el('div','display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;');
    for(var c=0;c<CATS_DISPLAY.length;c++){
      var cat=CATS_DISPLAY[c];
      var isAct=activeCat===cat;
      var chip=el('div','border:2px solid '+CAT[cat]+';color:'+CAT[cat]+';font-family:'+FONT+';font-size:20px;padding:5px 12px;cursor:pointer;opacity:'+((!activeCat||isAct)?'1':'0.2')+';',cat);
      (function(cn){chip.addEventListener('pointerup',function(){
        activeCat=activeCat===cn?null:cn;renderArea();renderChips();renderTables();
      });})(cat);
      row.appendChild(chip);
    }
    if(activeCat){
      var clr=el('div','border:2px solid '+C.verm+';color:'+C.verm+';font-family:'+FONT+';font-size:20px;padding:5px 12px;cursor:pointer;','CLEAR');
      clr.addEventListener('pointerup',function(){activeCat=null;renderArea();renderChips();renderTables();});
      row.appendChild(clr);
    }
    chipWrap.appendChild(row);
  }

  function renderTables(){
    tableWrap.innerHTML='';
    var cats=activeCat?[activeCat]:CATS_DISPLAY;
    for(var c=0;c<cats.length;c++){
      var cat=cats[c];
      var sec=el('div','margin-bottom:14px;');
      var hdr=el('div','display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:2px solid '+C.border+';');
      var dot=el('span','display:inline-block;width:12px;height:12px;background:'+CAT[cat]+';margin-right:8px;vertical-align:middle;');
      var lbl=el('span','font-family:'+FONT+';font-size:22px;font-weight:bold;color:'+CAT[cat]+';',cat);
      var ltotal=el('span','font-family:'+FONT+';font-size:22px;font-weight:bold;color:'+C.gold+';',fmt(catTotals[cat]));
      var left2=el('span','');left2.appendChild(dot);left2.appendChild(lbl);
      hdr.appendChild(left2);hdr.appendChild(ltotal);sec.appendChild(hdr);

      // Column headers
      var colH=el('div','display:flex;padding:4px 0;font-family:'+FONT+';font-size:18px;color:'+C.dim+';');
      colH.innerHTML='<span style="flex:2">ITEM</span><span style="flex:1;text-align:center">QTY</span><span style="flex:1;text-align:right">UNIT</span><span style="flex:1;text-align:right">TOTAL</span>';
      sec.appendChild(colH);

      var items=D_ITEMS[cat];
      for(var j=0;j<items.length;j++){
        var row2=el('div','display:flex;padding:4px 0;font-family:'+FONT+';font-size:20px;color:#ffffff;');
        row2.innerHTML='<span style="flex:2">'+items[j].n+'</span><span style="flex:1;text-align:center">'+items[j].q+'</span><span style="flex:1;text-align:right">'+fmt(items[j].p)+'</span><span style="flex:1;text-align:right;color:'+C.gold+'">'+fmt(items[j].q*items[j].p)+'</span>';
        sec.appendChild(row2);
      }
      tableWrap.appendChild(sec);
    }
  }

  renderArea();
  panel.appendChild(areaWrap);
  renderTender();
  renderChips();
  panel.appendChild(chipWrap);
  renderTables();
  panel.appendChild(tableWrap);
}

// Center — Server Load Heatmap
// Collapsed: shows last 2 hours + current (3 columns)
// Expanded: full width across top, all 8 hours
function getCurrentHourIdx() {
  var now = new Date();
  var h = now.getHours();
  // Map to HOURS index: 11A=0, 12P=1, 1P=2, 2P=3, 3P=4, 4P=5, 5P=6, 6P=7
  var hourMap = [11,12,13,14,15,16,17,18];
  var idx = 0;
  for (var i = 0; i < hourMap.length; i++) { if (h >= hourMap[i]) idx = i; }
  return Math.min(idx, 7);
}

function buildHeatmapBody(body) {
  var servers = D_HEAT.servers;
  var data = D_HEAT.data;
  var maxVal = 0;
  for (var s = 0; s < servers.length; s++)
    for (var h = 0; h < 8; h++) { var v = data[servers[s]][h]; if (v > maxVal) maxVal = v; }
  if (maxVal === 0) maxVal = 1;

  // Determine visible hours
  var visibleHours;
  if (hmExpanded) {
    visibleHours = [0,1,2,3,4,5,6,7];
  } else {
    var cur = getCurrentHourIdx();
    var start = Math.max(0, cur - 2);
    visibleHours = [];
    for (var i = start; i <= Math.min(start + 2, 7); i++) visibleHours.push(i);
  }

  var wrap = el('div', 'display:flex;flex-direction:column;gap:2px;height:100%;');

  // Hour header row
  var hdrRow = el('div', 'display:flex;gap:2px;padding-left:44px;');
  for (var h = 0; h < visibleHours.length; h++) {
    hdrRow.appendChild(el('div', 'flex:1;text-align:center;font-family:' + FONT + ';font-size:10px;color:#ffffff;letter-spacing:1px;', HOURS[visibleHours[h]]));
  }
  wrap.appendChild(hdrRow);

  for (var s = 0; s < servers.length; s++) {
    var row = el('div', 'display:flex;gap:2px;flex:1;align-items:stretch;');
    row.appendChild(el('div', 'width:42px;display:flex;align-items:center;justify-content:flex-end;padding-right:4px;font-family:' + FONT + ';font-size:10px;color:' + C.mint + ';font-weight:bold;letter-spacing:1px;', servers[s]));
    for (var h = 0; h < visibleHours.length; h++) {
      (function(srv, hrIdx, val) {
        var intensity = val / maxVal;
        var bg = 'rgba(135,247,156,' + (intensity * 0.8 + 0.05).toFixed(2) + ')';
        var isActive = hmFilter && hmFilter.server === srv && hmFilter.hour === HOURS[hrIdx];
        var cell = el('div', 'flex:1;background:' + bg + ';cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:' + FONT + ';font-size:12px;color:' + C.dark + ';font-weight:bold;' + (isActive ? 'outline:2px solid ' + C.lime + ';outline-offset:-2px;' : ''));
        if (val > 0) cell.textContent = val;
        cell.addEventListener('pointerup', function(e) {
          e.stopPropagation();
          if (hmFilter && hmFilter.server === srv && hmFilter.hour === HOURS[hrIdx]) {
            hmFilter = null;
          } else {
            hmFilter = { server: srv, hour: HOURS[hrIdx] };
          }
          if (heatmapEl) { heatmapEl.innerHTML = ''; buildHeatmapBody(heatmapEl); }
          refreshAllChecks();
        });
        row.appendChild(cell);
      })(servers[s], visibleHours[h], data[servers[s]][visibleHours[h]]);
    }
    wrap.appendChild(row);
  }
  body.appendChild(wrap);
}

// Card 6 — All Checks (grid of check tiles)
function buildAllChecksBody(body) {
  var filtered = D_CHECKS;
  if (hmFilter) {
    filtered = D_CHECKS.filter(function(c) { return c.srv === hmFilter.server && c.hr === hmFilter.hour; });
  }

  var wrap = el('div', 'height:100%;overflow-y:auto;display:flex;flex-direction:column;');

  // Filter badge
  if (hmFilter) {
    var badge = el('div', 'display:flex;justify-content:space-between;align-items:center;padding:4px 6px;background:#2a1800;border:1px solid ' + C.gold + ';margin-bottom:4px;flex-shrink:0;');
    badge.appendChild(el('span', 'font-family:' + FONT + ';font-size:11px;color:' + C.lime + ';letter-spacing:1px;', 'SERVER: ' + hmFilter.server + '  HOUR: ' + hmFilter.hour));
    var clrBtn = el('span', 'font-family:' + FONT + ';font-size:11px;color:' + C.verm + ';cursor:pointer;letter-spacing:1px;', 'CLEAR');
    clrBtn.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      hmFilter = null;
      if (heatmapEl) { heatmapEl.innerHTML = ''; buildHeatmapBody(heatmapEl); }
      refreshAllChecks();
    });
    badge.appendChild(clrBtn);
    wrap.appendChild(badge);
  }

  // Grid of check tiles
  var grid = el('div', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px;flex:1;overflow-y:auto;align-content:start;');
  for (var i = 0; i < filtered.length; i++) {
    var c = filtered[i];
    var statusColor = c.status === 'OPEN' ? C.verm : C.green;
    var borderColor = c.status === 'OPEN' ? C.verm : C.border;
    var tile = el('div', 'background:' + C.dark + ';border:1px solid ' + borderColor + ';padding:5px 6px;font-family:' + FONT + ';cursor:pointer;');
    // Top row: ID + status
    var top = el('div', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;');
    top.appendChild(el('span', 'font-size:10px;color:' + C.mint + ';letter-spacing:1px;', c.id));
    top.appendChild(el('span', 'font-size:8px;color:' + statusColor + ';font-weight:bold;', c.status));
    tile.appendChild(top);
    // Middle: server + table
    tile.appendChild(el('div', 'font-size:8px;color:#ffffff;', c.srv + ' \u00B7 ' + (c.tbl || c.type)));
    // Bottom: total
    tile.appendChild(el('div', 'font-size:11px;color:' + C.gold + ';font-weight:bold;text-align:right;margin-top:2px;', fmt(c.total)));
    grid.appendChild(tile);
  }
  if (filtered.length === 0) {
    grid.appendChild(el('div', 'grid-column:1/-1;font-family:' + FONT + ';font-size:12px;color:' + C.dim + ';text-align:center;padding:16px;', 'No checks match filter'));
  }
  wrap.appendChild(grid);
  body.appendChild(wrap);
}

function buildAllChecksOverlay(panel) {
  var title = el('div', 'background:' + C.mint + ';color:' + C.dark + ';font-family:' + FONT + ';font-size:24px;font-weight:bold;padding:8px 14px;letter-spacing:2px;', 'ALL CHECKS — DETAIL');
  panel.appendChild(title);

  var wrap = el('div', 'padding:8px;max-height:500px;overflow-y:auto;');
  for (var i = 0; i < D_CHECKS.length; i++) {
    var c = D_CHECKS[i];
    var statusColor = c.status === 'OPEN' ? C.verm : C.green;
    var card = el('div', 'background:' + C.bg + ';border:1px solid ' + C.border + ';padding:8px;margin-bottom:6px;');
    var hdr = el('div', 'display:flex;justify-content:space-between;margin-bottom:4px;');
    hdr.innerHTML = '<span style="font-family:' + FONT + ';font-size:20px;font-weight:bold;color:' + C.mint + '">' + c.id + '</span>' +
      '<span style="font-family:' + FONT + ';font-size:20px;font-weight:bold;color:' + statusColor + '">' + c.status + '</span>';
    card.appendChild(hdr);

    var meta = el('div', 'font-family:' + FONT + ';font-size:18px;color:#ffffff;margin-bottom:4px;');
    meta.textContent = 'Server: ' + c.srv + ' | Hour: ' + c.hr + ' | ' + (c.tbl || 'N/A') + ' | ' + c.type;
    card.appendChild(meta);

    var itemList = el('div', 'font-family:' + FONT + ';font-size:20px;color:' + C.dim + ';margin-bottom:4px;');
    itemList.textContent = c.items.join(', ');
    card.appendChild(itemList);

    card.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;font-weight:bold;color:' + C.gold + ';text-align:right;', fmt(c.total)));
    wrap.appendChild(card);
  }
  panel.appendChild(wrap);
}

// Card 3 — Server Checkouts (horizontal overlapping bars per server)
function buildServerCheckoutsBody(body) {
  var servers = D_SERVERS;
  var maxCount = 5; // scale max for bar width

  var wrap = el('div', 'height:100%;display:flex;flex-direction:column;gap:2px;overflow-y:auto;');

  for (var s = 0; s < servers.length; s++) {
    var srv = servers[s];
    var oc = srv.openChecks.length;
    var ut = 0; for (var j = 0; j < srv.tips.length; j++) if (srv.tips[j].tip === null) ut++;

    var row = el('div', 'flex-shrink:0;');
    // Server name + status
    var hdr = el('div', 'display:flex;align-items:center;gap:6px;margin-bottom:2px;');
    hdr.appendChild(el('span', 'font-family:' + FONT + ';font-size:10px;color:' + C.mint + ';letter-spacing:1px;font-weight:bold;', srv.name));
    hdr.appendChild(el('span', 'font-family:' + FONT + ';font-size:8px;color:' + C.verm + ';', '\u25CF ACTIVE'));
    row.appendChild(hdr);

    // Bar track
    var track = el('div', 'position:relative;height:18px;background:' + C.dark + ';border:1px solid #2a2a2a;');
    // Tips bar (mint, full height, back layer)
    var tipsPct = (ut / maxCount * 100).toFixed(0);
    track.appendChild(el('div', 'position:absolute;top:0;left:0;height:100%;width:' + tipsPct + '%;background:' + C.mint + ';'));
    // Checks bar (vermillion, inset, front layer)
    var checksPct = (oc / maxCount * 100).toFixed(0);
    track.appendChild(el('div', 'position:absolute;top:3px;left:0;height:calc(100% - 6px);width:' + checksPct + '%;background:' + C.verm + ';z-index:1;'));
    row.appendChild(track);

    // Labels below bar
    var labels = el('div', 'display:flex;justify-content:space-between;font-family:' + FONT + ';font-size:7px;margin-top:1px;');
    labels.appendChild(el('span', 'color:' + C.verm + ';', oc + ' open checks'));
    labels.appendChild(el('span', 'color:' + C.mint + ';', ut + ' unadjusted tips'));
    row.appendChild(labels);

    wrap.appendChild(row);
  }

  // Legend
  var leg = el('div', 'display:flex;gap:12px;margin-top:auto;padding-top:4px;font-family:' + FONT + ';font-size:7px;');
  leg.innerHTML = '<span><span style="display:inline-block;width:8px;height:6px;background:' + C.verm + ';vertical-align:middle;margin-right:3px;"></span><span style="color:' + C.verm + '">OPEN CHECKS</span></span>' +
    '<span><span style="display:inline-block;width:8px;height:6px;background:' + C.mint + ';vertical-align:middle;margin-right:3px;"></span><span style="color:' + C.mint + '">UNADJ TIPS</span></span>';
  wrap.appendChild(leg);
  body.appendChild(svg);
}

function buildServerCheckoutsOverlay(panel) {
  var title = el('div', 'background:' + C.mint + ';color:' + C.dark + ';font-family:' + FONT + ';font-size:24px;font-weight:bold;padding:8px 14px;letter-spacing:2px;', 'SERVER CHECKOUTS');
  panel.appendChild(title);

  var wrap = el('div', 'padding:8px;');

  function renderServerSections() {
    wrap.innerHTML = '';
    for (var s = 0; s < D_SERVERS.length; s++) {
      var srv = D_SERVERS[s];
      var section = el('div', 'border:1px solid ' + C.border + ';margin-bottom:8px;');

      // Server header
      var sHdr = el('div', 'background:' + C.bg + ';padding:6px 10px;font-family:' + FONT + ';font-size:20px;font-weight:bold;color:' + srv.color + ';display:flex;justify-content:space-between;align-items:center;');
      sHdr.appendChild(el('span', '', srv.name));

      // Checkout button
      var hasOpen = srv.openChecks.length > 0;
      var coBtn = el('div', 'font-family:' + FONT + ';font-size:14px;padding:4px 12px;cursor:pointer;' +
        (hasOpen ? 'background:' + C.dim + ';color:' + C.dark + ';' : 'background:' + C.mint + ';color:' + C.dark + ';'),
        hasOpen ? 'BLOCKED' : 'CHECKOUT');
      if (!hasOpen) {
        coBtn.addEventListener('pointerup', function() {
          showToast('Server checked out', { bg: C.green, duration: 2000 });
        });
      }
      sHdr.appendChild(coBtn);
      section.appendChild(sHdr);

      var content = el('div', 'display:flex;gap:8px;padding:8px;');

      // Left — Open Checks
      var leftP = el('div', 'flex:1;');
      leftP.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;color:' + C.verm + ';margin-bottom:4px;font-weight:bold;', 'OPEN CHECKS (' + srv.openChecks.length + ')'));
      if (srv.openChecks.length === 0) {
        leftP.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;color:' + C.green + ';', '\u2713 All checks closed'));
      }
      for (var j = 0; j < srv.openChecks.length; j++) {
        var ck = srv.openChecks[j];
        var row = el('div', 'display:flex;justify-content:space-between;padding:3px 0;font-family:' + FONT + ';font-size:14px;border-bottom:1px solid ' + C.border + ';');
        row.innerHTML = '<span style="color:' + C.verm + '">' + ck.id + '</span><span style="color:#ffffff">' + ck.table + '</span><span style="color:' + C.gold + '">' + fmt(ck.total) + '</span>';
        leftP.appendChild(row);
      }
      if (srv.openChecks.length > 0) {
        leftP.appendChild(el('div', 'font-family:' + FONT + ';font-size:13px;color:' + C.verm + ';margin-top:4px;', '\u26A0 Close all checks before checkout'));
      }
      content.appendChild(leftP);

      // Right — Tip Status
      var rightP = el('div', 'flex:1;');
      var utCount = 0; for (var j2 = 0; j2 < srv.tips.length; j2++) if (srv.tips[j2].tip === null) utCount++;
      rightP.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;color:' + C.mint + ';margin-bottom:4px;font-weight:bold;', 'TIP STATUS (' + utCount + ' unadjusted)'));
      for (var j = 0; j < srv.tips.length; j++) {
        (function(tipIdx, srvIdx) {
          var tip = D_SERVERS[srvIdx].tips[tipIdx];
          var row = el('div', 'display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-family:' + FONT + ';font-size:14px;border-bottom:1px solid ' + C.border + ';cursor:pointer;');
          var left2 = el('span', 'color:#ffffff', tip.id + ' ' + fmt(tip.amt));
          var right2;
          if (tip.tip === null) {
            right2 = el('span', 'color:' + C.verm + ';font-weight:bold;', '\u26A0 UNADJUSTED');
            row.addEventListener('pointerup', function() {
              showNumpad(function(val) {
                D_SERVERS[srvIdx].tips[tipIdx].tip = val;
                renderServerSections();
                refreshCloseDay();
              });
            });
          } else {
            right2 = el('span', 'color:' + C.green + ';font-weight:bold;', '\u2713 ' + fmt(tip.tip));
          }
          row.appendChild(left2);
          row.appendChild(right2);
          rightP.appendChild(row);
        })(j, s);
      }
      content.appendChild(rightP);
      section.appendChild(content);
      wrap.appendChild(section);
    }
  }

  renderServerSections();
  panel.appendChild(wrap);
}

// Card 4 — Labor COB%
function buildLaborCobBody(body) {
  var totalLab = sum(D_HLAB), totalSales = sum(D_HSALES);
  var cobPct = (totalLab / totalSales * 100);
  var tgtPct = 25;

  var svg = mk('svg', { viewBox: '0 0 300 148', width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
  var cxA = 150, cyA = 106, R = 72;

  function arcPath(pStart, pEnd) {
    var a1 = (180 - (pStart / 40) * 180) * Math.PI / 180;
    var a2 = (180 - (pEnd / 40) * 180) * Math.PI / 180;
    var x1 = cxA + R * Math.cos(a1), y1 = cyA - R * Math.sin(a1);
    var x2 = cxA + R * Math.cos(a2), y2 = cyA - R * Math.sin(a2);
    var large = (a1 - a2) > Math.PI ? 1 : 0;
    return 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' A' + R + ',' + R + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ',' + y2.toFixed(1);
  }

  // Background track
  svg.appendChild(mk('path', { d: arcPath(0, 40), fill: 'none', stroke: '#2a2a2a', 'stroke-width': '16', 'stroke-linecap': 'butt' }));
  // Zone arcs
  svg.appendChild(mk('path', { d: arcPath(0, 20), fill: 'none', stroke: C.green, 'stroke-width': '16', opacity: '0.75', 'stroke-linecap': 'butt' }));
  svg.appendChild(mk('path', { d: arcPath(20, 30), fill: 'none', stroke: '#ffdd44', 'stroke-width': '16', opacity: '0.75', 'stroke-linecap': 'butt' }));
  svg.appendChild(mk('path', { d: arcPath(30, 40), fill: 'none', stroke: C.verm, 'stroke-width': '16', opacity: '0.75', 'stroke-linecap': 'butt' }));

  // Target tick at 25%
  var tgtA = (180 - (tgtPct / 40) * 180) * Math.PI / 180;
  var tgtX1 = cxA + (R - 12) * Math.cos(tgtA), tgtY1 = cyA - (R - 12) * Math.sin(tgtA);
  var tgtX2 = cxA + (R + 12) * Math.cos(tgtA), tgtY2 = cyA - (R + 12) * Math.sin(tgtA);
  svg.appendChild(mk('line', { x1: tgtX1.toFixed(1), y1: tgtY1.toFixed(1), x2: tgtX2.toFixed(1), y2: tgtY2.toFixed(1), stroke: C.lime, 'stroke-width': '2' }));
  svg.appendChild(mk('text', { x: tgtX2.toFixed(1), y: (tgtY2 - 4).toFixed(1), fill: C.lime, 'font-size': '14', 'font-family': FONT, 'text-anchor': 'middle' }, 'TGT'));

  // Needle
  var clampPct = Math.min(40, Math.max(0, cobPct));
  var needleA = (180 - (clampPct / 40) * 180) * Math.PI / 180;
  var nX = cxA + R * Math.cos(needleA), nY = cyA - R * Math.sin(needleA);
  var needleColor = cobPct <= 20 ? C.green : cobPct <= 30 ? '#ffdd44' : C.verm;
  svg.appendChild(mk('line', { x1: cxA, y1: cyA, x2: nX.toFixed(1), y2: nY.toFixed(1), stroke: needleColor, 'stroke-width': '2' }));
  svg.appendChild(mk('circle', { cx: cxA, cy: cyA, r: '5', fill: needleColor }));

  // Center readout
  svg.appendChild(mk('text', { x: cxA, y: cyA - 22, fill: needleColor, 'font-size': '24', 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, cobPct.toFixed(1) + '%'));
  svg.appendChild(mk('text', { x: cxA, y: cyA - 6, fill: C.mint, 'font-size': '7', 'font-family': FONT, 'text-anchor': 'middle' }, 'LABOR COB'));

  // Stat strip below arc
  svg.appendChild(mk('line', { x1: 30, y1: cyA + 12, x2: 270, y2: cyA + 12, stroke: C.border, 'stroke-width': '1' }));
  var statY = cyA + 24;
  var statusText = cobPct > 30 ? 'HIGH' : 'OK';
  var statusColor = cobPct > 30 ? C.verm : C.green;
  svg.appendChild(mk('text', { x: 60, y: statY, fill: C.label, 'font-size': '6', 'font-family': FONT, 'text-anchor': 'middle' }, 'LABOR'));
  svg.appendChild(mk('text', { x: 60, y: statY + 10, fill: C.gold, 'font-size': '8', 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle' }, fmt(totalLab)));
  svg.appendChild(mk('text', { x: 150, y: statY, fill: C.label, 'font-size': '6', 'font-family': FONT, 'text-anchor': 'middle' }, 'SALES'));
  svg.appendChild(mk('text', { x: 150, y: statY + 10, fill: C.gold, 'font-size': '8', 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle' }, fmt(totalSales)));
  svg.appendChild(mk('text', { x: 240, y: statY, fill: C.label, 'font-size': '6', 'font-family': FONT, 'text-anchor': 'middle' }, 'STATUS'));
  svg.appendChild(mk('text', { x: 240, y: statY + 10, fill: statusColor, 'font-size': '8', 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle' }, statusText));

  body.appendChild(svg);
}

function buildLaborCobOverlay(panel) {
  var totalLab = sum(D_HLAB), totalSales = sum(D_HSALES);
  var cobPct = (totalLab / totalSales * 100);
  var tgtPct = 25;
  var variance = cobPct - tgtPct;

  panel.appendChild(buildStatStrip([
    { label: 'CURRENT COB%', value: cobPct.toFixed(1) + '%', color: '#ffdd44' },
    { label: 'TARGET', value: tgtPct.toFixed(1) + '%', color: C.lime },
    { label: 'VARIANCE', value: '+' + variance.toFixed(1) + '%', color: C.verm },
    { label: 'TOTAL LABOR', value: fmt(totalLab), color: C.gold },
  ]));

  // Chart A — Hourly COB% Bars + Target Line
  var secA = el('div', 'padding:8px;');
  secA.appendChild(el('div', 'font-family:' + FONT + ';font-size:22px;color:' + C.mint + ';margin-bottom:6px;letter-spacing:1px;', 'HOURLY COB% — BAR + TARGET'));
  var svgA = mk('svg', { viewBox: '0 0 660 162', width: '100%', preserveAspectRatio: 'xMidYMid meet' });
  addDefs(svgA, 'lca');
  var ax = 44, ay = 12, aw = 596, ah = 110;
  var cobMax = 60; // max Y for COB%
  chartFrame(svgA, ax, ay, aw, ah, 'lca');
  xLabels(svgA, ax, aw, ay + ah, '10');
  // Y labels
  for (var g = 0; g <= 4; g++) {
    var gy = ay + ah - (g / 4) * ah;
    svgA.appendChild(mk('text', { x: ax - 4, y: gy + 3, fill: C.label, 'font-size': '14', 'font-family': FONT, 'text-anchor': 'end' }, Math.round(cobMax * g / 4) + '%'));
  }

  var barW2 = aw / 8 * 0.55;
  for (var i = 0; i < 8; i++) {
    var hCob = D_HLAB[i] / D_HSALES[i] * 100;
    var bx2 = ax + (i / 7) * aw - barW2 / 2;
    var bH = (Math.min(hCob, cobMax) / cobMax) * ah;
    var bY = ay + ah - bH;
    var above = hCob > tgtPct;
    svgA.appendChild(mk('rect', { x: bx2, y: bY, width: barW2, height: bH, fill: above ? C.gold : C.verm }));
    svgA.appendChild(mk('text', { x: ax + (i / 7) * aw, y: bY - 4, fill: above ? C.gold : C.verm, 'font-size': '8', 'font-family': FONT, 'text-anchor': 'middle' }, hCob.toFixed(1) + '%'));
  }
  // Target line
  var tgtY = ay + ah - (tgtPct / cobMax) * ah;
  svgA.appendChild(mk('line', { x1: ax, y1: tgtY, x2: ax + aw, y2: tgtY, stroke: C.lime, 'stroke-width': '1.5', 'stroke-dasharray': '5,3' }));
  svgA.appendChild(mk('text', { x: ax + aw + 4, y: tgtY + 4, fill: C.lime, 'font-size': '14', 'font-family': FONT }, 'TARGET 25%'));
  // Legend
  svgA.appendChild(mk('rect', { x: ax + 80, y: ah + 32, width: '8', height: '8', fill: C.gold }));
  svgA.appendChild(mk('text', { x: ax + 92, y: ah + 40, fill: C.label, 'font-size': '8', 'font-family': FONT }, 'ABOVE TARGET'));
  svgA.appendChild(mk('rect', { x: ax + 220, y: ah + 32, width: '8', height: '8', fill: C.verm }));
  svgA.appendChild(mk('text', { x: ax + 232, y: ah + 40, fill: C.label, 'font-size': '8', 'font-family': FONT }, 'AT / BELOW TARGET'));
  secA.appendChild(svgA);
  panel.appendChild(secA);

  // Chart B — Labor Cost by Employee
  var secB = el('div', 'padding:8px;');
  secB.appendChild(el('div', 'font-family:' + FONT + ';font-size:22px;color:' + C.mint + ';margin-bottom:6px;letter-spacing:1px;', 'LABOR COST BY EMPLOYEE'));
  var svgB = mk('svg', { viewBox: '0 0 660 148', width: '100%', preserveAspectRatio: 'xMidYMid meet' });
  addDefs(svgB, 'lcb');
  var ebx = 88, eby = 14, ebw = 500, ebh = 80;
  var empMax = 63; // max employee cost
  // Vertical grid
  for (var g = 1; g <= 4; g++) {
    var gx = ebx + (g / 4) * ebw;
    svgB.appendChild(mk('line', { x1: gx, y1: eby, x2: gx, y2: eby + ebh, stroke: C.grid, 'stroke-width': '1' }));
    svgB.appendChild(mk('text', { x: gx, y: eby - 3, fill: C.label, 'font-size': '8', 'font-family': FONT, 'text-anchor': 'middle' }, fmt(empMax * g / 4)));
  }
  var eRowH = ebh / D_EMP.length;
  for (var i = 0; i < D_EMP.length; i++) {
    var emp = D_EMP[i];
    var ey = eby + i * eRowH + 4;
    var eH = eRowH - 10;
    var eW = (emp.cost / empMax) * ebw;
    // Name + role label
    svgB.appendChild(mk('text', { x: ebx - 4, y: ey + eH / 2 + 2, fill: emp.color, 'font-size': '15', 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'end' }, emp.name));
    svgB.appendChild(mk('text', { x: ebx - 4, y: ey + eH / 2 + 12, fill: C.dim, 'font-size': '7', 'font-family': FONT, 'text-anchor': 'end' }, emp.role));
    // Bar
    svgB.appendChild(mk('rect', { x: ebx, y: ey, width: eW, height: eH, fill: emp.color }));
    svgB.appendChild(mk('rect', { x: ebx, y: ey, width: eW, height: eH, fill: 'url(#dit_lcb)' }));
    // Inside label
    if (eW > 120) {
      svgB.appendChild(mk('text', { x: ebx + 6, y: ey + eH / 2 + 3, fill: C.dark, 'font-size': '8', 'font-weight': 'bold', 'font-family': FONT }, fmt(emp.cost) + '  \u00B7  ' + emp.hours + 'hr  \u00B7  ' + emp.share.toFixed(0) + '% of labor'));
    }
    // After bar
    svgB.appendChild(mk('text', { x: ebx + eW + 6, y: ey + eH / 2 + 3, fill: C.label, 'font-size': '8', 'font-family': FONT }, 'COB: ' + emp.cob + '%  ' + emp.sched + '  $' + emp.rate + '/hr'));
  }
  // Total bar
  var totalBarY = eby + ebh + 6;
  svgB.appendChild(mk('rect', { x: ebx, y: totalBarY, width: ebw, height: 14, fill: C.gold, opacity: '0.6' }));
  svgB.appendChild(mk('text', { x: ebx + 6, y: totalBarY + 11, fill: C.dark, 'font-size': '14', 'font-weight': 'bold', 'font-family': FONT }, fmt(totalLab) + '  \u00B7  COB ' + cobPct.toFixed(1) + '%'));
  secB.appendChild(svgB);
  panel.appendChild(secB);
}

// Card 5 — Close Day
function buildCloseDayBody(body) {
  var gate = getGate();
  var unlocked = gate.resolved === gate.total;

  if (unlocked && !closeState.closed) {
    // Show CLOSE DAY button state
    var svg = mk('svg', { viewBox: '0 0 300 130', width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
    // Filled hex
    svg.appendChild(mk('polygon', { points: '150,20 200,50 200,100 150,130 100,100 100,50', fill: C.mint }));
    svg.appendChild(mk('text', { x: 150, y: 68, fill: C.dark, 'font-size': '18', 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle' }, 'CLOSE'));
    svg.appendChild(mk('text', { x: 150, y: 88, fill: C.dark, 'font-size': '18', 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle' }, 'DAY'));
    body.appendChild(svg);

    // Update card styling
    if (closeDayEl && closeDayEl.parentNode) {
      var card = closeDayEl.parentNode;
      card.style.borderColor = C.mint;
      if (card._header) {
        card._header.style.background = C.mint;
        card._header.textContent = 'CLOSE DAY \u2014 TAP \u25B6';
      }
    }
    // Make tappable for overlay
    body.style.cursor = 'pointer';
    body.onclick = function() { openOverlay(buildCloseDayOverlay); };
    return;
  }

  // Hex ring state
  var svg = mk('svg', { viewBox: '0 0 300 130', width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
  var hexPath = 'M55,27 L87.9,46 L87.9,84 L55,103 L22.1,84 L22.1,46 Z';
  var perim = 228;
  var progress = gate.resolved / gate.total;

  // Background track
  svg.appendChild(mk('path', { d: hexPath, fill: 'none', stroke: '#2a2a2a', 'stroke-width': '14' }));
  // Progress arc
  var offset = perim * (1 - progress);
  svg.appendChild(mk('path', { d: hexPath, fill: 'none', stroke: C.mint, 'stroke-width': '14', 'stroke-dasharray': '' + perim, 'stroke-dashoffset': '' + offset.toFixed(1) }));
  // Inner punch
  svg.appendChild(mk('polygon', { points: '55,41 75.8,53 75.8,77 55,89 34.2,77 34.2,53', fill: C.dark }));
  // Counter
  var counterColor = gate.resolved === gate.total ? C.mint : C.verm;
  svg.appendChild(mk('text', { x: 55, y: 68, fill: counterColor, 'font-size': '20', 'font-weight': 'bold', 'font-family': FONT, 'text-anchor': 'middle' }, '' + gate.resolved));
  svg.appendChild(mk('text', { x: 55, y: 82, fill: C.dim, 'font-size': '15', 'font-family': FONT, 'text-anchor': 'middle' }, 'OF ' + gate.total));

  // Checklist (right of hex)
  var checkX = 110, checkY = 42;
  // Row 1: Server checkout
  var srvDone = gate.open === 0;
  svg.appendChild(mk('text', { x: checkX, y: checkY, fill: srvDone ? C.green : C.verm, 'font-size': '12', 'font-family': FONT }, srvDone ? '\u2713 SERVER CHECKED OUT' : '\u2717 ' + gate.open + ' CHECK' + (gate.open > 1 ? 'S' : '') + ' OPEN'));
  // Row 2: Tips
  var tipsDone = gate.unadj === 0;
  svg.appendChild(mk('text', { x: checkX, y: checkY + 22, fill: tipsDone ? C.green : C.verm, 'font-size': '12', 'font-family': FONT }, tipsDone ? '\u2713 TIPS ADJUSTED' : '\u2717 ' + gate.unadj + ' TIPS UNADJUSTED'));

  body.appendChild(svg);
}

function buildCloseDayOverlay(panel) {
  var gate = getGate();
  if (gate.resolved < gate.total) {
    panel.appendChild(el('div', 'padding:20px;text-align:center;font-family:' + FONT + ';font-size:20px;color:' + C.verm + ';', 'Resolve all gate items before closing day'));
    return;
  }

  var title = el('div', 'background:' + C.mint + ';color:' + C.dark + ';font-family:' + FONT + ';font-size:24px;font-weight:bold;padding:8px 14px;letter-spacing:2px;', 'CLOSE DAY');
  panel.appendChild(title);

  // Stat strip
  var cardSettledVal = closeState.settled ? '$35.85' : 'PENDING';
  panel.appendChild(buildStatStrip([
    { label: 'NET SALES', value: '$219.47', color: C.gold },
    { label: 'CASH DUE', value: '$183.62', color: C.gold },
    { label: 'CARD SETTLED', value: cardSettledVal, color: closeState.settled ? C.green : C.dim },
  ]));

  var wrap = el('div', 'padding:8px;');

  // Action Card 1 — Settle Batch
  var ac1 = el('div', 'border:1px solid ' + (closeState.settled ? C.green : C.border) + ';padding:10px;margin-bottom:10px;' + (closeState.settled ? 'opacity:0.65;' : ''));
  var ac1Hdr = el('div', 'display:flex;align-items:center;gap:8px;margin-bottom:6px;');
  var badge1Bg = closeState.settled ? C.green : '#ffdd44';
  var badge1Text = closeState.settled ? '\u2713 SETTLED' : 'PENDING';
  ac1Hdr.appendChild(el('span', 'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:2px solid ' + (closeState.settled ? C.green : C.mint) + ';font-family:' + FONT + ';font-size:12px;font-weight:bold;color:' + (closeState.settled ? C.green : C.mint) + ';', closeState.settled ? '\u2713' : '1'));
  ac1Hdr.appendChild(el('span', 'font-family:' + FONT + ';font-size:20px;font-weight:bold;color:#fff;', 'SETTLE BATCH'));
  ac1Hdr.appendChild(el('span', 'font-family:' + FONT + ';font-size:13px;padding:2px 8px;background:' + badge1Bg + ';color:' + C.dark + ';font-weight:bold;', badge1Text));
  ac1.appendChild(ac1Hdr);

  ac1.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;color:#ffffff;margin-bottom:6px;', '4 card transactions  \u00B7  $35.85 total  \u00B7  Dejavoo P8'));

  if (!closeState.settled) {
    var settleBtn = el('div', 'background:transparent;border:2px solid ' + C.mint + ';color:' + C.mint + ';font-family:' + FONT + ';font-size:15px;font-weight:bold;text-align:center;padding:8px;cursor:pointer;letter-spacing:2px;', 'SETTLE BATCH \u25B6');
    settleBtn.addEventListener('pointerup', function() {
      closeState.settled = true;
      closeOverlay();
      openOverlay(buildCloseDayOverlay);
    });
    ac1.appendChild(settleBtn);
  } else {
    ac1.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;color:' + C.green + ';', '\u2713 $35.85 SETTLED TO DEJAVOO P8'));
  }
  wrap.appendChild(ac1);

  // Action Card 2 — Finalize Close Day
  var locked = !closeState.settled;
  var closed = closeState.closed;
  var ac2 = el('div', 'border:1px solid ' + (closed ? C.green : locked ? C.dim : C.border) + ';padding:10px;' + (locked ? 'opacity:0.4;pointer-events:none;' : '') + (closed ? 'opacity:0.65;' : ''));
  var ac2Hdr = el('div', 'display:flex;align-items:center;gap:8px;margin-bottom:6px;');
  var badge2Bg = closed ? C.green : locked ? C.dim : '#ffdd44';
  var badge2Text = closed ? '\u2713 CLOSED' : locked ? 'LOCKED' : 'READY';
  ac2Hdr.appendChild(el('span', 'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:2px solid ' + (closed ? C.green : locked ? C.dim : C.mint) + ';font-family:' + FONT + ';font-size:12px;font-weight:bold;color:' + (closed ? C.green : locked ? C.dim : C.mint) + ';', closed ? '\u2713' : '2'));
  ac2Hdr.appendChild(el('span', 'font-family:' + FONT + ';font-size:20px;font-weight:bold;color:#fff;', 'FINALIZE CLOSE DAY'));
  ac2Hdr.appendChild(el('span', 'font-family:' + FONT + ';font-size:13px;padding:2px 8px;background:' + badge2Bg + ';color:' + C.dark + ';font-weight:bold;', badge2Text));
  ac2.appendChild(ac2Hdr);

  if (locked) {
    ac2.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;color:' + C.dim + ';', 'SETTLE BATCH FIRST'));
    ac2.appendChild(el('div', 'background:' + C.dark + ';color:' + C.dim + ';font-family:' + FONT + ';font-size:15px;text-align:center;padding:8px;letter-spacing:2px;', 'FINALIZE CLOSE DAY'));
  } else if (!closed) {
    ac2.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;color:#ffffff;margin-bottom:4px;', 'Net: $219.47  \u00B7  Cash to safe: $183.62  \u00B7  Tips: $35.85'));
    ac2.appendChild(el('div', 'font-family:' + FONT + ';font-size:13px;color:#ffdd44;margin-bottom:6px;', 'MGR AUTHORIZED \u00B7 IRREVERSIBLE'));
    var finalBtn = el('div', 'background:' + C.gold + ';color:' + C.dark + ';font-family:' + FONT + ';font-size:16px;font-weight:bold;text-align:center;padding:10px;cursor:pointer;letter-spacing:4px;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);', 'FINALIZE CLOSE DAY');
    finalBtn.addEventListener('pointerup', function() {
      closeState.closed = true;
      showToast('Day closed — ledger sealed', { bg: C.green, duration: 3000 });
      closeOverlay();
      openOverlay(buildCloseDayOverlay);
      refreshCloseDay();
    });
    ac2.appendChild(finalBtn);
  } else {
    ac2.appendChild(el('div', 'font-family:' + FONT + ';font-size:20px;color:' + C.green + ';', '\u2713 LEDGER SEALED \u00B7 HASH CHAIN CLOSED'));
  }
  wrap.appendChild(ac2);
  panel.appendChild(wrap);
}

// ═══════════════════════════════════════════════════
//  SCENE LAYOUT
// ═══════════════════════════════════════════════════

function buildScene(container) {
  container.innerHTML = '';
  container.style.cssText = 'display:grid;gap:6px;padding:6px;height:100%;box-sizing:border-box;' +
    (hmExpanded
      ? 'grid-template-columns:1fr 1fr 1fr;grid-template-rows:auto 1fr 1fr;'
      : 'grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr;');

  // Heatmap card — when expanded, spans full width across top
  var hmCard = buildCard('SERVER LOAD HEATMAP', function(b) { heatmapEl = b; buildHeatmapBody(b); }, null);
  if (hmExpanded) {
    hmCard.style.gridColumn = '1 / -1';
    hmCard.style.gridRow = '1';
  } else {
    hmCard.style.gridColumn = '2';
    hmCard.style.gridRow = '1';
  }
  // Tap header to toggle expand/collapse
  hmCard._header.style.cursor = 'pointer';
  hmCard._header.textContent = hmExpanded ? 'SERVER LOAD HEATMAP \u25BC' : 'SERVER LOAD HEATMAP \u25B6';
  hmCard._header.addEventListener('pointerup', function(e) {
    e.stopPropagation();
    hmExpanded = !hmExpanded;
    buildScene(container);
  });
  container.appendChild(hmCard);

  // Left column cards
  var salesOv = buildCard('SALES OVERVIEW', buildSalesOverviewBody, buildSalesOverviewOverlay);
  salesOv.style.gridColumn = '1';
  salesOv.style.gridRow = hmExpanded ? '2' : '1';
  container.appendChild(salesOv);

  var salesBd = buildCard('SALES BREAKDOWN', buildSalesBreakdownBody, buildSalesBreakdownOverlay);
  salesBd.style.gridColumn = '1';
  salesBd.style.gridRow = hmExpanded ? '3' : '2';
  container.appendChild(salesBd);

  // Center — All Checks
  var allCk = buildCard('ALL CHECKS', function(b) { allChecksEl = b; buildAllChecksBody(b); }, buildAllChecksOverlay);
  allCk.style.gridColumn = '2';
  allCk.style.gridRow = hmExpanded ? '2 / 4' : '2';
  container.appendChild(allCk);

  // Right column cards
  var srvCo = buildCard('SERVER CHECKOUTS', buildServerCheckoutsBody, buildServerCheckoutsOverlay);
  srvCo.style.gridColumn = '3';
  srvCo.style.gridRow = hmExpanded ? '2' : '1';
  container.appendChild(srvCo);

  var labCob = buildCard('LABOR COB%', buildLaborCobBody, buildLaborCobOverlay);
  labCob.style.gridColumn = '3';
  labCob.style.gridRow = hmExpanded ? '3' : '2 / 3';
  container.appendChild(labCob);

  var cdCard = buildCard('CLOSE DAY', function(b) { closeDayEl = b; buildCloseDayBody(b); }, null);
  cdCard._cdCard = true;
  if (!hmExpanded) {
    // In collapsed mode, close day shares row 2 with labor cob in right col
    // Use a wrapper to stack labor+closeday in the right column
    labCob.style.gridRow = '2';
    cdCard.style.gridColumn = '3';
    cdCard.style.gridRow = '3';
  } else {
    cdCard.style.display = 'none'; // hide in expanded mode to save space
  }
  container.appendChild(cdCard);
}

// ═══════════════════════════════════════════════════
//  SCENE REGISTRATION
// ═══════════════════════════════════════════════════

SceneManager.register({
  name: 'reporting',
  mount: function(container, params) {
    curEl = container;
    // Reset state
    hmFilter = null;
    hmExpanded = false;
    closeState = { settled: false, closed: false };
    closeDayEl = null;
    allChecksEl = null;
    heatmapEl = null;

    setSceneName('REPORTING');
    setHeaderBack({
      back: true,
      x: true,
      onBack: function() {
        var role = params && params.role;
        if (role === 'server') SceneManager.mountWorking('server-landing', params);
        else SceneManager.mountWorking('manager-landing', params);
      },
    });

    buildScene(container);
  },
  unmount: function() {
    if (activeOverlay) closeOverlay();
    curEl = null;
    closeDayEl = null;
    allChecksEl = null;
    heatmapEl = null;
  },
});

// ═══════════════════════════════════════════════════
//  LEGACY EXPORTS — used by landing.js
// ═══════════════════════════════════════════════════

function hrLabel(h) {
  var hr = typeof h === 'string' ? parseInt(h.split(':')[0]) : h;
  if (hr === 0 || hr === 24) return '12a';
  if (hr === 12) return '12p';
  return hr > 12 ? (hr - 12) + 'p' : hr + 'a';
}

function fetchData(params) {
  var today = new Date().toISOString().slice(0, 10);
  var salesUrl = '/api/v1/reports/sales-summary?date=' + today;
  var laborUrl = '/api/v1/reports/labor-summary?date=' + today;
  if (params.role === 'server' && params.employeeId) {
    salesUrl += '&server_id=' + encodeURIComponent(params.employeeId);
    laborUrl += '&server_id=' + encodeURIComponent(params.employeeId);
  }
  return Promise.all([
    fetch(salesUrl).then(function(r) { return r.json(); }).catch(function() { return null; }),
    fetch(laborUrl).then(function(r) { return r.json(); }).catch(function() { return null; }),
  ]).then(function(results) {
    return { sales: results[0], labor: results[1] };
  });
}

function buildCardWrap(cardInner) {
  var btn = buildStyledButton(T.darkBtn);
  btn.inner.style.padding = '0';
  btn.inner.appendChild(cardInner);
  btn.wrap.style.flex = '1';
  btn.wrap.style.maxHeight = '85%';
  btn.wrap.style.maxWidth = '46%';
  btn.wrap.style.height = '100%';
  var shadow = shadowColor(T.darkBtn);
  btn.wrap.style.filter = 'drop-shadow(6px 8px 2px ' + shadow + ')';
  btn.wrap._shadow = shadow;
  return btn.wrap;
}

function buildLeftCard(params, sales, labor) {
  var compact = params.compact;
  var titleFs = compact ? '44px' : '75px';
  var kpiFs = compact ? '24px' : '40px';
  var subFs = compact ? '18px' : T.fsBtn;
  var btnFs = compact ? '18px' : T.fsSmall;
  var pad = compact ? '10px 12px' : '16px 20px';
  var btnPad = compact ? '3px 8px' : '4px 10px';
  var card = document.createElement('div');
  card.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;background:' + T.bgDark + ';cursor:pointer;user-select:none;-webkit-user-select:none;padding:' + pad + ';box-sizing:border-box;overflow:hidden;';
  var s = sales;
  if (params.role === 'manager') {
    var title = document.createElement('div');
    title.style.cssText = 'font-family:' + T.fh + ';font-size:' + titleFs + ';font-weight:bold;font-style:italic;color:' + T.gold + ';margin-bottom:4px;';
    title.textContent = 'SALES';
    card.appendChild(title);
    var g = T.gold;
    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:2px;font-family:' + T.fb + ';font-size:' + kpiFs + ';color:' + T.mint + ';';
    kpis.innerHTML = '<div>Net: <span style="color:' + g + '">' + (s ? fmt(s.net_sales) : '--') + '</span></div><div>Checks: <span style="color:' + g + '">' + (s ? s.total_checks : '--') + '</span></div><div>Avg: <span style="color:' + g + '">' + (s ? fmt(s.check_avg) : '--') + '</span></div>';
    card.appendChild(kpis);
    if (s) {
      var total = s.cash_total + s.card_total;
      var cashPct = total > 0 ? (s.cash_total / total * 100).toFixed(0) : 0;
      var cardPct = total > 0 ? (s.card_total / total * 100).toFixed(0) : 0;
      var breakdown = document.createElement('div');
      breakdown.style.cssText = 'margin-top:4px;font-family:' + T.fb + ';font-size:' + subFs + ';color:' + T.mint + ';';
      breakdown.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span>Cash: <span style="color:' + g + '">' + fmt(s.cash_total) + '</span></span><span>Card: <span style="color:' + g + '">' + fmt(s.card_total) + '</span></span></div><div style="display:flex;height:' + (compact ? '10' : '16') + 'px;background:' + T.bg + ';"><div style="width:' + cashPct + '%;height:100%;background:' + g + ';opacity:0.8;"></div><div style="width:' + cardPct + '%;height:100%;background:' + T.cyan + ';opacity:0.8;"></div></div>';
      card.appendChild(breakdown);
    }
    if (!compact) {
      var btnArea = document.createElement('div');
      btnArea.style.cssText = 'margin-top:auto;align-self:stretch;display:flex;flex-direction:column;gap:4px;';
      [['Sales Detail','sales-summary'],['Close Day','close-day'],['Tip Adjustment','tip-adjustment']].forEach(function(b) {
        var pair = buildStyledButton(T.darkBtn);
        pair.inner.textContent = b[0]; pair.inner.style.fontFamily = T.fh; pair.inner.style.fontSize = btnFs; pair.inner.style.color = T.mint; pair.inner.style.padding = btnPad; pair.wrap.style.alignSelf = 'stretch';
        pair.wrap.addEventListener('pointerup', function(e) { e.stopPropagation(); SceneManager.openTransactional(b[1], b[1] === 'sales-summary' ? { role: params.role, employeeId: params.employeeId } : params); });
        btnArea.appendChild(pair.wrap);
      });
      card.appendChild(btnArea);
    }
  } else {
    var title = document.createElement('div');
    title.style.cssText = 'font-family:' + T.fh + ';font-size:' + titleFs + ';font-weight:bold;font-style:italic;color:' + T.gold + ';margin-bottom:4px;';
    title.textContent = 'SHIFT';
    card.appendChild(title);
    var g = T.gold;
    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:2px;font-family:' + T.fb + ';font-size:' + kpiFs + ';color:' + T.mint + ';';
    kpis.innerHTML = '<div>Guests: <span style="color:' + g + '">' + (s ? (s.total_guests || '--') : '--') + '</span></div><div>Tables: <span style="color:' + g + '">' + (s ? (s.total_tables || '--') : '--') + '</span></div><div>Avg: <span style="color:' + g + '">' + (s ? fmt(s.check_avg) : '--') + '</span></div><div style="margin-top:2px">Tips: <span style="color:' + g + '">' + (s ? fmt(s.tips_collected || 0) : '--') + '</span></div><div>Out: <span style="color:' + g + '">' + (s ? fmt(s.tipout_amount || 0) : '--') + '</span></div>';
    card.appendChild(kpis);
    if (!compact) {
      var btnArea = document.createElement('div');
      btnArea.style.cssText = 'margin-top:auto;align-self:stretch;display:flex;flex-direction:column;gap:4px;';
      [['Checkout','server-checkout'],['Tip Adjustment','tip-adjustment']].forEach(function(b) {
        var pair = buildStyledButton(T.darkBtn);
        pair.inner.textContent = b[0]; pair.inner.style.fontFamily = T.fh; pair.inner.style.fontSize = btnFs; pair.inner.style.color = T.mint; pair.inner.style.padding = btnPad; pair.wrap.style.alignSelf = 'stretch';
        pair.wrap.addEventListener('pointerup', function(e) { e.stopPropagation(); SceneManager.openTransactional(b[1], params); });
        btnArea.appendChild(pair.wrap);
      });
      card.appendChild(btnArea);
    }
  }
  return card;
}

function buildLeftCardButtons(params, sales) {
  var s = sales;
  var btnFs = '18px';
  var btnPad = '3px 8px';
  var btnArea = document.createElement('div');
  btnArea.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-self:stretch;';
  var buttons = params.role === 'manager'
    ? [['Sales Detail','sales-summary'],['Close Day','close-day'],['Tip Adjustment','tip-adjustment']]
    : [['Checkout','server-checkout'],['Tip Adjustment','tip-adjustment']];
  buttons.forEach(function(b) {
    var pair = buildStyledButton(T.darkBtn);
    pair.inner.textContent = b[0]; pair.inner.style.fontFamily = T.fh; pair.inner.style.fontSize = btnFs; pair.inner.style.color = T.mint; pair.inner.style.padding = btnPad; pair.wrap.style.alignSelf = 'stretch';
    pair.wrap.addEventListener('pointerup', function(e) { e.stopPropagation(); SceneManager.openTransactional(b[1], b[1] === 'sales-summary' ? { role: params.role, employeeId: params.employeeId } : params); });
    btnArea.appendChild(pair.wrap);
  });
  var activeChecks = document.createElement('div');
  activeChecks.style.cssText = 'font-family:' + T.fb + ';font-size:' + btnFs + ';color:' + T.mint + ';text-align:center;';
  var checkCount = s ? s.total_checks : 0;
  activeChecks.textContent = checkCount + ' active check' + (checkCount !== 1 ? 's' : '');
  btnArea.appendChild(activeChecks);
  return btnArea;
}

function buildVerticalRail(text, color, compact) {
  var fs = compact ? '44px' : '75px';
  var rail = document.createElement('div');
  rail.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-family:' + T.fh + ';font-size:' + fs + ';font-weight:bold;color:' + color + ';flex-shrink:0;padding-right:' + (compact ? '6' : '10') + 'px;';
  for (var i = 0; i < text.length; i++) {
    var ch = document.createElement('div');
    ch.style.cssText = 'line-height:1;';
    ch.textContent = text[i];
    rail.appendChild(ch);
  }
  return rail;
}

function buildRightCard(params, sales, labor) {
  var compact = params.compact;
  var kpiFs = compact ? '24px' : '40px';
  var subFs = compact ? '18px' : T.fsBtn;
  var pad = compact ? '10px 12px' : '16px 20px';
  var card = document.createElement('div');
  card.style.cssText = 'display:flex;width:100%;height:100%;background:' + T.bgDark + ';cursor:pointer;user-select:none;-webkit-user-select:none;padding:' + pad + ';gap:' + (compact ? '6' : '10') + 'px;box-sizing:border-box;overflow:hidden;';
  var l = labor;
  if (params.role === 'manager') {
    var lc = '#33ff99';
    card.appendChild(buildVerticalRail('LABOR', lc, compact));
    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex:1;font-family:' + T.fb + ';font-size:' + kpiFs + ';color:' + T.mint + ';justify-content:center;';
    var otAlert = '--';
    if (l && l.ot_alerts && l.ot_alerts.length > 0) otAlert = l.ot_alerts.length + ' warning(s)';
    else if (l) otAlert = 'All clear';
    kpis.innerHTML = '<div>Hrs: <span style="color:' + lc + '">' + (l ? l.total_hours : '--') + '</span></div><div>Tips: <span style="color:' + T.gold + '">' + (l ? fmt(l.tip_pool) : '--') + '</span></div><div>COB: <span style="color:' + lc + '">' + (l ? l.cob_percent + '%' : '--') + '</span></div><div style="margin-top:2px;font-size:' + subFs + '">OT: <span style="color:' + T.gold + '">' + otAlert + '</span></div>';
    card.appendChild(kpis);
  } else {
    var hc = '#33ff99';
    card.appendChild(buildVerticalRail('HOURS', hc, compact));
    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex:1;font-family:' + T.fb + ';font-size:' + kpiFs + ';color:' + T.mint + ';justify-content:center;';
    var otAlert = '--';
    if (l) { if (l.ot_status === 'warning') otAlert = 'Warning'; else if (l.ot_status === 'over') otAlert = 'OVERTIME'; else otAlert = 'All clear'; }
    kpis.innerHTML = '<div>In: <span style="color:' + hc + '">' + (l ? l.clock_in : '--') + '</span></div><div>Out: <span style="color:' + hc + '">' + (l ? (l.clock_out || 'active') : '--') + '</span></div><div>Today: <span style="color:' + hc + '">' + (l ? l.today_hours + 'h' : '--') + '</span></div><div>Week: <span style="color:' + hc + '">' + (l ? l.weekly_hours + 'h' : '--') + '</span></div><div style="margin-top:2px;font-size:' + subFs + '">OT: <span style="color:' + T.gold + '">' + otAlert + '</span></div>';
    card.appendChild(kpis);
  }
  return card;
}

function buildManagerSalesPanels(sales, fullSize) {
  var s = sales || {};
  var hourly = s.hourly_sales || [];
  var lastWeek = s.last_week_hourly || [];
  var topItems = s.top_items || [];
  var svgW = fullSize ? 900 : 400;
  var svgH = fullSize ? 380 : 160;
  var p1 = buildChartPanel('SALES BY HOUR', s.net_sales ? fmt(s.net_sales) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [];
    for (var i = 0; i < hourly.length; i++) data.push({ label: hrLabel(hourly[i].hour), food: hourly[i].food || hourly[i].net || 0, drink: hourly[i].drink || 0, other: hourly[i].other || 0 });
    drawStackedColumn(svg, data, { width: svgW, height: svgH, showCumulative: true, lineColor: DATA.coral, series: [{ key: 'food', color: DATA.orange, pattern: PAT.orange }, { key: 'drink', color: DATA.pink, pattern: PAT.pink }, { key: 'other', color: DATA.violet, pattern: PAT.violet }] });
    body.appendChild(svg);
  }, [{ label: 'Food', color: DATA.orange }, { label: 'Drink', color: DATA.pink }, { label: 'Other', color: DATA.violet }]);
  var p2 = buildChartPanel('PEAK HOURS', s.total_checks || '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var peakData = s.peak_hours || [];
    var colLabels = [], heatGrid = [];
    if (peakData.length > 0 && peakData[0].hours) {
      for (var c = 0; c < peakData[0].hours.length; c++) colLabels.push(hrLabel(peakData[0].hours[c].hour));
      for (var r = 0; r < peakData.length; r++) { var row = []; for (var c = 0; c < peakData[r].hours.length; c++) row.push(peakData[r].hours[c].value || 0); heatGrid.push(row); }
    } else {
      for (var i = 0; i < hourly.length; i++) colLabels.push(hrLabel(hourly[i].hour));
      for (var r = 0; r < 7; r++) { var row = []; for (var c = 0; c < hourly.length; c++) row.push(hourly[c].checks || hourly[c].net || 0); heatGrid.push(row); }
    }
    var rowLabels = peakData.length > 0 ? peakData.map(function(d) { return d.day; }) : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    drawHeatmap(svg, heatGrid, { width: svgW, height: svgH, rows: rowLabels, cols: colLabels });
    body.appendChild(svg);
  });
  var p3 = buildChartPanel('TODAY vs LAST WK', s.check_avg ? fmt(s.check_avg) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [], compare = [];
    var lwByHour = {};
    for (var j = 0; j < lastWeek.length; j++) lwByHour[lastWeek[j].hour] = lastWeek[j];
    for (var i = 0; i < hourly.length; i++) { var label = hrLabel(hourly[i].hour); data.push({ label: label, value: hourly[i].net || 0 }); var lw = lwByHour[hourly[i].hour]; compare.push({ label: label, value: lw ? lw.net : 0 }); }
    drawTrendLine(svg, data, { color: DATA.orange, compareData: compare, compareColor: DATA.blue, width: svgW, height: svgH, shaded: true, areaPatternFill: PAT.coral, compareAreaPatternFill: PAT.blue });
    body.appendChild(svg);
  }, [{ label: 'Today', color: DATA.orange }, { label: 'Last Wk', color: DATA.blue }]);
  var paretoData = [];
  for (var i = 0; i < topItems.length; i++) { var item = topItems[i]; paretoData.push({ label: item.name || item.label, value: item.revenue || item.value || 0, color: T.catColor((item.category || '').toUpperCase()) }); }
  var p4 = buildChartPanel('TOP ITEMS', s.net_sales ? fmt(s.net_sales) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = paretoData.length > 0 ? paretoData : hourly.slice(0, 8).map(function(h) { return { label: h.hour + '', value: h.net || 0, color: DATA.orange }; });
    drawParetoHBar(svg, data, { width: svgW, height: svgH });
    body.appendChild(svg);
  });
  return [p1, p2, p3, p4];
}

function buildManagerLaborPanels(labor, fullSize) {
  var l = labor || {};
  var employees = l.employees || [];
  var cobTrend = l.cob_trend || [];
  var otAlerts = l.ot_alerts || [];
  var svgW = fullSize ? 900 : 400, svgH = fullSize ? 380 : 160, lblW = fullSize ? 120 : 80;
  var p1 = buildChartPanel('TOTAL HRS', l.total_hours ? l.total_hours + 'h' : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = employees.map(function(e) { return { label: e.name, value: e.hours, sublabel: e.hours + 'h (' + e.clock_in + '-' + e.clock_out + ')', color: DATA.orange }; });
    drawHorizontalBars(svg, data, { width: svgW, height: svgH, labelWidth: lblW });
    body.appendChild(svg);
  });
  var p2 = buildChartPanel('TIP POOL', l.tip_pool ? fmt(l.tip_pool) : '--', function(body) {
    var chartH = fullSize ? 300 : 120;
    var svg = createSVG(svgW, chartH);
    var data = employees.map(function(e) { return { label: e.name, value: e.tips, sublabel: fmt(e.tips), color: DATA.coral }; });
    drawHorizontalBars(svg, data, { width: svgW, height: chartH, labelWidth: lblW });
    body.appendChild(svg);
  });
  var p3 = buildChartPanel('COB %', l.cob_percent ? l.cob_percent + '%' : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = cobTrend.map(function(d) { return { label: d.day, value: d.percent }; });
    drawTrendLine(svg, data, { color: DATA.orange, width: svgW, height: svgH, thresholds: [{ value: 35, color: DATA.warning }, { value: 45, color: DATA.critical }] });
    body.appendChild(svg);
  });
  var otStatus = otAlerts.length > 0 ? 'Warning' : 'All clear';
  var p4 = buildChartPanel('OT ALERT', otStatus, function(body) {
    var svg = createSVG(svgW, svgH);
    var data = employees.map(function(e) { var c = DATA.orange; if (e.weekly_hours > 40) c = DATA.critical; else if (e.weekly_hours >= 35) c = DATA.warning; return { label: e.name, value: e.weekly_hours, sublabel: e.weekly_hours + 'h', color: c }; });
    drawHorizontalBars(svg, data, { width: svgW, height: svgH, labelWidth: lblW });
    body.appendChild(svg);
  });
  return [p1, p2, p3, p4];
}

function buildServerShiftPanels(sales, fullSize) {
  var s = sales || {};
  var hourly = s.hourly_sales || [];
  var lastWeek = s.last_week_hourly || [];
  var topItems = s.top_items || [];
  var tipBuckets = s.tip_buckets || [];
  var svgW = fullSize ? 900 : 400, svgH = fullSize ? 380 : 160;
  var p1 = buildChartPanel('SALES BY HOUR', s.net_sales ? fmt(s.net_sales || 0) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = hourly.map(function(h) { return { label: hrLabel(h.hour), food: h.food || h.net || 0, drink: h.drink || 0 }; });
    drawStackedColumn(svg, data, { width: svgW, height: svgH, showCumulative: true, lineColor: DATA.coral, series: [{ key: 'food', color: DATA.orange, pattern: PAT.orange }, { key: 'drink', color: DATA.pink, pattern: PAT.pink }] });
    body.appendChild(svg);
  }, [{ label: 'Food', color: DATA.orange }, { label: 'Drink', color: DATA.pink }]);
  var p2 = buildChartPanel('TIP DISTRIBUTION', s.tips_collected ? fmt(s.tips_collected) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = tipBuckets.length > 0 ? tipBuckets.map(function(b) { return { label: b.range || b.label, count: b.count || 0 }; }) : ['$0-3','$3-5','$5-8','$8-12','$12-15','$15-20','$20+'].map(function(r) { return { label: r, count: 0 }; });
    drawHistogram(svg, data, { width: svgW, height: svgH, avgValue: s.tip_avg || 0 });
    body.appendChild(svg);
  });
  var p3 = buildChartPanel('TODAY vs LAST WK', s.check_avg ? fmt(s.check_avg) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = [], compare = [];
    var lwByHour = {};
    for (var j = 0; j < lastWeek.length; j++) lwByHour[lastWeek[j].hour] = lastWeek[j];
    for (var i = 0; i < hourly.length; i++) { var label = hrLabel(hourly[i].hour); data.push({ label: label, value: hourly[i].net || 0 }); var lw = lwByHour[hourly[i].hour]; compare.push({ label: label, value: lw ? lw.net : 0 }); }
    drawTrendLine(svg, data, { color: DATA.orange, compareData: compare, compareColor: DATA.blue, width: svgW, height: svgH, shaded: true, areaPatternFill: PAT.coral, compareAreaPatternFill: PAT.blue });
    body.appendChild(svg);
  }, [{ label: 'Today', color: DATA.orange }, { label: 'Last Wk', color: DATA.blue }]);
  var paretoData = topItems.map(function(item) { return { label: item.name || item.label, value: item.revenue || item.value || 0, color: T.catColor((item.category || '').toUpperCase()) }; });
  var p4 = buildChartPanel('TOP ITEMS', s.net_sales ? fmt(s.net_sales || 0) : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = paretoData.length > 0 ? paretoData : hourly.slice(0, 8).map(function(h) { return { label: h.hour + '', value: h.net || 0, color: DATA.orange }; });
    drawParetoHBar(svg, data, { width: svgW, height: svgH });
    body.appendChild(svg);
  });
  return [p1, p2, p3, p4];
}

function buildServerHoursPanels(sales, labor, fullSize) {
  var l = labor || {};
  var weekly = l.weekly_breakdown || [];
  var svgW = fullSize ? 900 : 400, svgH = fullSize ? 380 : 160;
  var fontSize = fullSize ? T.fsSmall : T.fsBtn;
  var progW = fullSize ? 860 : 380;
  var p1 = buildChartPanel("TODAY'S SHIFT", l.today_hours ? l.today_hours + 'h' : '--', function(body) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:8px 12px;font-family:' + T.fb + ';display:flex;flex-direction:column;gap:4px;';
    wrap.innerHTML = '<div style="font-size:' + fontSize + ';color:' + DATA.orange + '">Time In</div><div style="font-size:40px;color:' + DATA.orange + '">' + (l.clock_in || '--') + '</div><div style="font-size:' + fontSize + ';color:' + DATA.coral + '">Time Out</div><div style="font-size:40px;color:' + DATA.coral + '">' + (l.clock_out || 'active') + '</div>';
    body.appendChild(wrap);
    var svg = createSVG(progW, 24);
    drawProgressBar(svg, l.today_hours || 0, 12, { width: progW, height: 24, color: DATA.orange });
    svg.style.marginLeft = '12px';
    body.appendChild(svg);
  });
  var p2 = buildChartPanel('WEEKLY HOURS', l.weekly_hours ? l.weekly_hours + 'h' : '--', function(body) {
    var svg = createSVG(svgW, svgH);
    var data = weekly.map(function(d) { return { label: d.day, value: d.hours || 0 }; });
    drawBarChart(svg, data, { color: DATA.orange, patternFill: PAT.orange, width: svgW, height: svgH, showLabels: true, showValueAbove: true });
    body.appendChild(svg);
  });
  var p3 = buildChartPanel('TOTAL HRS', l.weekly_hours ? l.weekly_hours + '/40h' : '--', function(body) {
    var svg = createSVG(progW, 28);
    drawProgressBar(svg, l.weekly_hours || 0, 48, { width: progW, height: 28, color: DATA.orange, warnAt: 35, critAt: 40 });
    svg.style.margin = '4px 12px';
    body.appendChild(svg);
  });
  var otStatus = l.ot_status || 'clear';
  var statusLabel = otStatus === 'warning' ? 'WARNING' : otStatus === 'over' ? 'OVERTIME' : 'All clear';
  var statusColor = otStatus === 'warning' ? DATA.warning : otStatus === 'over' ? DATA.critical : DATA.orange;
  var p4 = buildChartPanel('OT ALERT', statusLabel, function(body) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:8px 12px;font-family:' + T.fb + ';display:flex;flex-direction:column;gap:6px;';
    var statusBox = document.createElement('div');
    statusBox.style.cssText = 'border:2px solid ' + statusColor + ';padding:8px;text-align:center;font-size:' + fontSize + ';font-weight:bold;color:' + statusColor + ';';
    statusBox.textContent = statusLabel;
    wrap.appendChild(statusBox);
    body.appendChild(wrap);
  });
  return [p1, p2, p3, p4];
}

export { fetchData as fetchReportData, buildLeftCard, buildLeftCardButtons, buildRightCard, buildCardWrap, buildServerShiftPanels, buildServerHoursPanels, buildManagerSalesPanels, buildManagerLaborPanels };
