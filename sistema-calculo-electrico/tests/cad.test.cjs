const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const CAD = require('../cad.js');
const XLSX = require('../vendor/xlsx.full.min.js');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const code=html.slice(html.indexOf('const BREAKER_SERIES'),html.indexOf('/* ========================= RENDER'));
const layout=html.slice(html.indexOf('function polosAuto('),html.indexOf('function renderUpsCircuitoSelect('));
const context={};vm.createContext(context);
vm.runInContext(code+'\n'+layout+'\nthis.api={state,calcularTodo,tableroLayout,TIPOS_DEFAULT};',context);
const {state,calcularTodo,tableroLayout,TIPOS_DEFAULT}=context.api;
const book=XLSX.read(fs.readFileSync(path.resolve(base,'..','Calculo de consumo Sala El Tabo.xlsx')),{type:'buffer'});
const rows=XLSX.utils.sheet_to_json(book.Sheets.Hoja1,{header:1,defval:'',raw:true,range:0});
const loads=CAD.parseRows(rows,'Hoja1');
assert.equal(loads.length,14);
assert.equal(loads.reduce((n,c)=>n+c.cantidad*c.potUnit,0),11080);
assert.equal(loads.filter(c=>c.tipo==='Fuerza').length,10);
assert.equal(loads.filter(c=>c.tipo==='Alumbrado').length,3);
assert.equal(loads.filter(c=>c.tipo==='Control').length,1);
assert.equal(loads.at(-1).origen,'Hoja1!23');
state.proyecto.nombre='Sala de Monitoreo El Tabo';state.proyecto.fecha='2026-11-23';
state.cargas=loads.map((c,i)=>{
  const t=TIPOS_DEFAULT.find(t=>t.nombre===c.tipo);
  return {...c,id:'c'+(i+1),fp:t.fp,fases:t.fases,continua:false,dedicado:c.cantidad*c.potUnit>1500,longitud:null,respaldado:c.tag!=='Aire Acondicionado'};
});
function validate(s){
  assert.deepEqual([...s.loadIds].sort(),state.cargas.map(c=>c.id).sort());
  const text=s.entities.filter(e=>e.type==='text').map(e=>e.text).join(' ');
  for(const c of state.cargas){assert(text.replace(/\s/g,'').includes(c.tag.replace(/\s/g,'')));assert(text.includes(c.origen));}
  for(const e of s.entities){
    const coords=e.type==='line'?[[e.x1,e.y1],[e.x2,e.y2]]:[[e.x,e.y]];
    for(const [x,y] of coords){assert(Number.isFinite(x)&&Number.isFinite(y));assert(x>=0&&x<s.width);assert(y>=0&&y<s.height);}
  }
  const dxf=CAD.toDXF(s),lines=dxf.trimEnd().split(/\r?\n/);
  assert.equal(lines.length%2,0);assert(dxf.endsWith('0\r\nEOF\r\n'));
  assert(!dxf.includes('NaN'));assert(dxf.includes('mm2'));
  assert.equal(lines.filter((v,i)=>i%2===0&&v==='0'&&['LINE','CIRCLE','TEXT'].includes(lines[i+1])).length,s.entities.length);
  assert.equal((CAD.toSVG(s).match(/data-layer=/g)||[]).length,s.entities.length);
}
let r=calcularTodo(),L=tableroLayout();
assert.equal(r.totalPW,11080);
const unifilar=CAD.buildUnifilar(state,r,L),tablero=CAD.buildTablero(state,r,L);
validate(unifilar);validate(tablero);
// Backup routing is preserved even when loads have equal type and phases.
for(const c of r.circuitos)assert(new Set(c.items.map(i=>i.respaldado)).size===1);
const upsText=unifilar.entities.filter(e=>e.type==='text').map(e=>e.text).join(' ');
assert(upsText.includes('Alimentada desde C'+L.upsSlot));
assert(upsText.includes('generador 1F y alimentación 3F'));
// Stress text wrapping and many circuits, plus metadata that contains XML markup.
const saved=state.cargas;
state.cargas=Array.from({length:60},(_,i)=>({...saved[i%14],id:'large'+i,tag:'Equipo '+i+' '+('X'.repeat(260)),dedicado:true}));
state.proyecto.cliente='<Cliente & prueba>';
r=calcularTodo();L=tableroLayout();validate(CAD.buildUnifilar(state,r,L));validate(CAD.buildTablero(state,r,L));
assert(CAD.toSVG(CAD.buildTablero(state,r,L)).includes('&lt;Cliente &amp; prueba&gt;'));
state.cargas=[];state.proyecto.genHabilitado=false;state.proyecto.upsHabilitado=false;
r=calcularTodo();L=tableroLayout();validate(CAD.buildUnifilar(state,r,L));validate(CAD.buildTablero(state,r,L));
assert.throws(()=>CAD.parseRows([['Equipo','Cantidad','Potencia (W)'],['Malo',-1,5]],'Test'),/cantidad o potencia/);
assert.throws(()=>CAD.parseRows([['Equipo','Cantidad','Potencia (W)'],['Malo',1,'abc']],'Test'),/cantidad o potencia/);
assert.throws(()=>CAD.parseRows([['Sin formato']],'Test'),/encabezados/);
if(process.argv.includes('--export')){
  const out=path.join(base,'entregables');fs.mkdirSync(out,{recursive:true});
  for(const [name,s] of [['El-Tabo-unifilar',unifilar],['El-Tabo-tablero',tablero]]){
    fs.writeFileSync(path.join(out,name+'.dxf'),CAD.toDXF(s));
    fs.writeFileSync(path.join(out,name+'.svg'),CAD.toSVG(s));
  }
}
console.log('OK: Excel real (14 partidas / 11080 W), respaldo separado, UPS, geometría SVG/DXF, textos largos, 60 circuitos, proyecto vacío e importaciones inválidas.');
