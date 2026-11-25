/* Geometría única para la vista SVG y el archivo DXF. Sin dependencias. */
(function (root) {
  'use strict';
  const colors = { RED:'#244c68', PROTECCIONES:'#244c68', TIERRA:'#28713f',
    RESPALDO:'#ad5018', EQUIPOS:'#263238', CAJETIN:'#263238', GABINETE:'#65716a', TEXTO:'#263238' };
  const aci = { RED:5, PROTECCIONES:5, TIERRA:3, RESPALDO:30, EQUIPOS:7, CAJETIN:7, GABINETE:8, TEXTO:7 };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = n => Number(n || 0).toLocaleString('es-CL', {maximumFractionDigits:2});
  function wrap(text, max) {
    const result = [];
    let line = '';
    for (const word of String(text || '').replace(/[\r\n]+/g,' ').split(/\s+/)) {
      if (line && line.length + word.length + 1 > max) { result.push(line); line = ''; }
      let part = word;
      while (part.length > max) { if(line){result.push(line);line='';} result.push(part.slice(0,max)); part=part.slice(max); }
      if (part) line += (line ? ' ' : '') + part;
    }
    if (line) result.push(line);
    return result.length ? result : [''];
  }
  function scene(title, p, r) {
    const s = {width:1300, height:0, title, entities:[], loadIds:[]};
    s.line = (x1,y1,x2,y2,layer='RED') => s.entities.push({type:'line',x1,y1,x2,y2,layer});
    s.circle = (x,y,radius,layer='RED') => s.entities.push({type:'circle',x,y,radius,layer});
    s.rect = (x,y,w,h,layer='PROTECCIONES') => {
      s.line(x,y,x+w,y,layer); s.line(x+w,y,x+w,y+h,layer);
      s.line(x+w,y+h,x,y+h,layer); s.line(x,y+h,x,y,layer);
    };
    s.text = (x,y,text,size=12,layer='TEXTO') => {
      const value=String(text == null ? '' : text).replace(/[\r\n\t]+/g,' ');
      s.entities.push({type:'text',x,y,text:value,size,layer});
      s.width=Math.max(s.width, x+value.length*size*.72+35);
    };
    s.block = (x,y,w,h,label,layer='PROTECCIONES') => {
      s.rect(x,y,w,h,layer); s.text(x+8,y+h/2+4,label,11,layer);
    };
    s.paragraph = (x,y,text,max=140,size=11,layer='TEXTO') => {
      for(const line of wrap(text,max)) { s.text(x,y,line,size,layer); y+=size+6; } return y;
    };
    s.ground = (x,y) => {
      s.line(x,y,x,y+18,'TIERRA');
      [18,12,6].forEach((w,i)=>s.line(x-w/2,y+18+i*5,x+w/2,y+18+i*5,'TIERRA'));
    };
    s.text(30,35,title,21);
    let y=s.paragraph(30,60,p.nombre || 'Proyecto sin nombre',130,13);
    s.line(30,y+5,1260,y+5,'CAJETIN');
    s.finish = bottom => {
      let y=bottom+32;
      s.text(30,y,'OBSERVACIONES DE DISEÑO',12); y+=23;
      const notes = [
        'Esquema de anteproyecto sin escala física. Símbolos simplificados. Calibres y protecciones provienen del cálculo orientativo de la aplicación.',
        'El Excel no define sensibilidad de diferenciales, poder de corte, curvas, neutro, PE, borneras ni dimensiones comerciales. Confirmar en ingeniería.',
        'Generador, ATS y UPS se representan según la configuración del proyecto. Sus capacidades y conexiones no se obtienen del listado de consumos.',
      ];
      if(r.alimFases===3 && r.circuitos.some(c=>c.fases===1)) notes.push('El cálculo original del alimentador supone demanda trifásica equilibrada. Verificar la corriente máxima real por fase antes de dimensionar.');
      if(p.genHabilitado && r.respaldoVA>Number(p.genKva)*1000) notes.push('La carga marcada con respaldo supera la potencia configurada del generador. Revisar selección de cargas y capacidad.');
      if (p.genHabilitado && Number(p.genFases)!==r.alimFases) notes.push('Revisar compatibilidad: generador '+p.genFases+'F y alimentación '+r.alimFases+'F. La transferencia requiere definición de ingeniería.');
      if (r.circuitos.some(c=>c.long==null)) notes.push('Faltan longitudes de circuitos: caída de tensión sin verificar en esos ramales.');
      for(const note of notes) y=s.paragraph(30,y,note,145,11);
      const top=y+12;
      y=top+22;
      const fields=[['Proyecto',p.nombre],['Cliente',p.cliente],['Ubicación',p.ubicacion],['Responsable',p.responsable],['Fecha',p.fecha],['Referencia',p.ref],['Tablero',p.tableroNombre],['Estado','ANTEPROYECTO · SIN ESCALA']];
      for(const [key,val] of fields) y=s.paragraph(42,y,key+': '+(val || 'Por definir'),145,11);
      s.rect(30,top,s.width-60,y-top+10,'CAJETIN');
      s.height=y+45;
      return s;
    };
    return s;
  }
  function equipmentLines(c) {
    return c.items.flatMap(item => wrap((item.origen ? '['+item.origen+'] ' : '') +
      item.tag+' · Cant. '+num(item.cantidad)+' × '+num(item.potUnit)+' W = '+num(item.cantidad*item.potUnit)+' W'+
      (item.lugar ? ' · '+item.lugar : '')+(item.caracteristicas ? ' · '+item.caracteristicas : ''),120));
  }
  function circuitHeader(c) {
    return 'C'+c.n+' · '+c.tipo+' · '+c.fases+'F · '+num(c.breaker)+' A · '+c.conductor.label+' · Id '+num(c.iDiseno)+' A';
  }
  function buildUnifilar(state, r, L) {
    const p=state.proyecto, s=scene('DIAGRAMA UNIFILAR',p,r);
    const hasGen=!!p.genHabilitado, hasUps=!!p.upsHabilitado;
    const unbacked=hasGen && r.circuitos.some(c=>c.items.every(i=>i.respaldado===false));
    s.text(100,103,'RED PÚBLICA',11,'RED'); s.line(140,108,140,115);
    s.circle(140,131,16); s.text(135,135,'M',12,'RED'); s.text(170,135,'Medidor / empalme',12);
    s.line(140,147,140,160);
    if (hasGen) {
      s.line(140,160,140,191); s.block(116,191,48,38,'ATS','RESPALDO');
      s.line(164,210,414,210,'RESPALDO'); s.circle(430,210,16,'RESPALDO');
      s.text(425,214,'G',12,'RESPALDO');
      s.text(465,205,'Generador · '+num(p.genKva)+' kVA · '+p.genFases+'F',13,'RESPALDO');
      s.text(465,226,'Carga con respaldo: '+num(r.respaldoVA/1000)+' kVA',11,'RESPALDO');
      s.line(140,229,140,266);
    } else s.line(140,160,140,266);
    s.block(116,266,48,28,'DIF');
    s.text(180,284,'Diferencial general · sensibilidad / selectividad por definir',12);
    s.line(140,294,140,321);
    s.block(116,321,48,28,''); s.text(90,339,'IG',11,'PROTECCIONES');s.line(122,343,158,327,'PROTECCIONES');
    s.text(180,338,'Interruptor general · '+num(r.dimAlim.breaker)+' A · '+r.dimAlim.conductor.label,13);
    s.text(180,360,p.tableroNombre+' · '+r.alimFases+'F · '+num(p.vfase)+' / '+num(p.vlinea)+' V · '+num(p.hz)+' Hz',12);
    s.line(140,349,140,395);
    s.text(160,395,'Distribución '+(hasGen?'con respaldo':'de red'),11);
    if(unbacked) {s.line(140,160,65,160);s.line(65,160,65,395);s.text(30,384,'Solo red',10);}
    let y=418;const taps=[];
    for(const c of r.circuitos) {
      const layer='CIRCUITO_'+String(c.n).padStart(3,'0');
      const lines=equipmentLines(c), cy=y+18;
      const noBackup=hasGen && c.items.every(i=>i.respaldado===false);
      const bus=noBackup?65:140;
      taps.push({cy,noBackup});
      s.circle(bus,cy,2,layer);
      s.line(bus,cy,200,cy,layer); s.block(200,cy-12,42,24,'',layer);s.text(203,cy-19,'Q'+c.n,10,layer);
      s.line(207,cy+8,235,cy-8,layer);s.line(242,cy,285,cy,layer);
      s.text(300,cy,circuitHeader(c),13,layer);
      let ty=cy+23;
      s.text(300,ty,(noBackup?'Sin respaldo de generador':'Alimentación '+(hasGen?'desde ATS':'de red'))+(c.long==null?' · Longitud por definir':' · Longitud '+num(c.long)+' m'),11,layer);ty+=20;
      for(const line of lines){s.text(300,ty,line,11,layer);ty+=18;}
      s.loadIds.push(...c.items.map(i=>i.id));
      if(hasUps && L.upsSlot===c.n) {
        s.line(265,cy,265,ty+15,'RESPALDO');s.line(265,ty+15,300,ty+15,'RESPALDO');
        s.block(300,ty,90,30,'UPS','RESPALDO');
        ty=s.paragraph(410,ty+19,num(p.upsKva)+' kVA · Alimentada desde C'+c.n+' · Salida: '+(p.upsAlimenta || 'por definir'),103,11,'RESPALDO')+25;
      }
      y=ty+30;
    }
    // A crossing without a junction must not look like a connection to both sources.
    const backed=taps.filter(t=>!t.noBackup),solo=taps.filter(t=>t.noBackup);
    if(backed.length){
      const end=backed[backed.length-1].cy;let from=395;
      for(const t of solo.filter(t=>t.cy<end)){
        s.line(140,from,140,t.cy-6,hasGen?'RESPALDO':'RED');from=t.cy+6;
      }
      s.line(140,from,140,end,hasGen?'RESPALDO':'RED');
    }
    if(solo.length)s.line(65,395,65,solo[solo.length-1].cy,'RED');
    if(!r.circuitos.length){s.text(180,y+20,'Sin circuitos: agregue o importe cargas.',13);y+=65;}
    if(hasUps && !r.circuitos.length){s.text(180,y,'UPS sin circuito de alimentación asignado.',12,'RESPALDO');y+=30;}
    s.line(140,y+8,490,y+8,'TIERRA');s.ground(140,y+8);
    s.text(180,y+30,'Barra PE / PAT · conexiones de protección por definir',12,'TIERRA');
    s.text(180,y+65,'Barra N · distribución y secciones por definir',12);
    s.line(140,y+80,490,y+80,'PROTECCIONES');
    return s.finish(y+110);
  }
  function buildTablero(state,r,L) {
    const p=state.proyecto,s=scene('TABLERO · ESQUEMA DE COMPONENTES',p,r);
    s.text(50,115,p.tableroNombre+' · Alimentación '+r.alimFases+'F · '+num(p.vfase)+' / '+num(p.vlinea)+' V',14);
    s.text(50,140,'Distribución esquemática. No representa dimensiones ni ocupación de módulos DIN.',11);
    s.block(50,165,140,48,'IG '+num(r.dimAlim.breaker)+' A');
    s.block(240,165,150,48,'DIF · por definir');
    s.text(440,184,'Conductor general: '+r.dimAlim.conductor.label,12);
    s.text(440,205,'Corriente de cálculo: '+num(r.iTotal)+' A',12);
    let y=255;
    if(p.genHabilitado) {s.block(50,y,140,34,'ATS','RESPALDO');s.text(220,y+22,'Generador externo · '+num(p.genKva)+' kVA · '+p.genFases+'F',12,'RESPALDO');y+=65;}
    const top=155;
    for(const c of r.circuitos) {
      const layer='CIRCUITO_'+String(c.n).padStart(3,'0'), lines=equipmentLines(c);
      const header=wrap(circuitHeader(c),120);
      const h=35+header.length*19+lines.length*18;
      s.block(50,y+10,95,42,'Q'+c.n+' '+num(c.breaker)+' A',layer);
      let ty=y+22;
      for(const line of header){s.text(175,ty,line,12,layer);ty+=19;}
      const f=c.fases===3?'L1 / L2 / L3':L.fase(c.n);
      s.text(175,ty,'Fase propuesta: '+f+' · '+(c.items.every(i=>i.respaldado===false)?'Sin respaldo':'Con respaldo solicitado'),11,layer);ty+=20;
      for(const line of lines){s.text(175,ty,line,11,layer);ty+=18;}
      s.loadIds.push(...c.items.map(i=>i.id));
      s.line(50,y+h,1240,y+h,'GABINETE');y+=h+15;
    }
    if(!r.circuitos.length){s.text(50,y,'Sin circuitos: agregue o importe cargas.',13);y+=35;}
    if(L.insuficiente){y=s.paragraph(50,y,'Capacidad configurada insuficiente: '+L.polos+' posiciones para '+L.n+' circuitos.',130,12)+15;}
    s.text(50,y+20,'Reservas propuestas: '+Math.max(0,L.total-L.n)+' posiciones de circuito. Módulos y gabinete por definir.',12);y+=55;
    s.block(50,y,180,30,'BARRA N');s.block(270,y,180,30,'BARRA PE','TIERRA');s.ground(420,y+30);y+=80;
    if(p.upsHabilitado){
      s.block(50,y,140,38,'UPS '+num(p.upsKva)+' kVA','RESPALDO');
      y=s.paragraph(220,y+24,(L.upsSlot?'Alimentada desde C'+L.upsSlot:'Alimentación sin asignar')+' · Salida: '+(p.upsAlimenta||'por definir'),120,12,'RESPALDO')+45;
    }
    s.rect(30,top,1230,y-top+5,'GABINETE');
    return s.finish(y+15);
  }
  function toSVG(s) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+s.width+' '+s.height+'" width="'+s.width+'" height="'+s.height+'" role="img" aria-label="'+esc(s.title)+'"><rect width="100%" height="100%" fill="white"/>'+s.entities.map(e=>{
      const color=colors[e.layer] || '#244c68', common=' data-layer="'+esc(e.layer)+'"';
      if(e.type==='line')return '<line'+common+' x1="'+e.x1+'" y1="'+e.y1+'" x2="'+e.x2+'" y2="'+e.y2+'" stroke="'+color+'" stroke-width="1.3"/>';
      if(e.type==='circle')return '<circle'+common+' cx="'+e.x+'" cy="'+e.y+'" r="'+e.radius+'" fill="white" stroke="'+color+'" stroke-width="1.3"/>';
      return '<text'+common+' x="'+e.x+'" y="'+e.y+'" fill="'+color+'" font-family="Consolas,monospace" font-size="'+e.size+'">'+esc(e.text)+'</text>';
    }).join('')+'</svg>';
  }
  function ascii(s) {
    return String(s).replace(/²/g,'2').replace(/×/g,'x').replace(/Δ/g,'d').replace(/→/g,'->').replace(/·/g,'-').replace(/[–—]/g,'-').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');
  }
  function toDXF(s) {
    const out=[],put=(...p)=>out.push(...p.map(String));
    const layers=['0',...new Set(s.entities.map(e=>e.layer))];
    put(0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1009',9,'$EXTMIN',10,0,20,0,30,0,9,'$EXTMAX',10,s.width,20,s.height,30,0,0,'ENDSEC');
    put(0,'SECTION',2,'TABLES',0,'TABLE',2,'LTYPE',70,1,0,'LTYPE',2,'CONTINUOUS',70,0,3,'Solid line',72,65,73,0,40,0,0,'ENDTAB');
    put(0,'TABLE',2,'LAYER',70,layers.length);
    for(const layer of layers)put(0,'LAYER',2,layer,70,0,62,aci[layer] || 7,6,'CONTINUOUS');
    put(0,'ENDTAB',0,'TABLE',2,'STYLE',70,1,0,'STYLE',2,'STANDARD',70,0,40,0,41,1,50,0,71,0,42,2.5,3,'txt',4,'',0,'ENDTAB',0,'ENDSEC');
    put(0,'SECTION',2,'BLOCKS',0,'ENDSEC',0,'SECTION',2,'ENTITIES');
    const y=n=>Number((s.height-n).toFixed(4));
    for(const e of s.entities){
      if(e.type==='line')put(0,'LINE',8,e.layer,10,e.x1,20,y(e.y1),30,0,11,e.x2,21,y(e.y2),31,0);
      else if(e.type==='circle')put(0,'CIRCLE',8,e.layer,10,e.x,20,y(e.y),30,0,40,e.radius);
      else put(0,'TEXT',8,e.layer,10,e.x,20,y(e.y),30,0,40,e.size,1,ascii(e.text),7,'STANDARD');
    }
    put(0,'ENDSEC',0,'EOF');return out.join('\r\n')+'\r\n';
  }
  function parseRows(rows, sheetName) {
    const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
    const header=rows.findIndex(row=>row.some(v=>norm(v)==='cantidad') && row.some(v=>/potencia.*\(w\)/.test(norm(v))) && row.some(v=>/tag.*equipo|^equipo$/.test(norm(v))));
    if(header<0) throw new Error('No se encontraron encabezados de Equipo, Cantidad y Potencia (W) en '+sheetName+'.');
    const h=rows[header].map(norm), col=regex=>h.findIndex(v=>regex.test(v));
    const cols={tipo:col(/tipo.*circuito/),tag:col(/tag.*equipo|^equipo$/),lugar:col(/^lugar|ubicacion/),car:col(/^caracteristicas/),qty:col(/^cantidad$/),power:col(/^potencia.*\(w\)/)};
    const loads=[],errors=[];let currentType='Fuerza';
    for(let i=header+1;i<rows.length;i++){
      const row=rows[i], type=norm(row[cols.tipo]);
      if(/alumbrado/.test(type))currentType='Alumbrado';
      else if(/control/.test(type))currentType='Control';
      else if(/fuerza/.test(type))currentType='Fuerza';
      else if(/tomacorriente/.test(type))currentType='Tomacorrientes';
      const tag=String(row[cols.tag] || '').trim();if(!tag)continue;
      const number=v=>typeof v==='number'?v:(String(v||'').trim().match(/^\d+(,\d+)?$/)?Number(String(v).replace(',','.')):NaN);
      const cantidad=number(row[cols.qty]),potUnit=number(row[cols.power]);
      if(!Number.isInteger(cantidad)||cantidad<=0||!Number.isFinite(potUnit)||potUnit<0){errors.push('Fila '+(i+1)+': cantidad o potencia inválida para '+tag);continue;}
      loads.push({tipo:currentType,tag,lugar:cols.lugar>=0?String(row[cols.lugar]||''):'',caracteristicas:cols.car>=0?String(row[cols.car]||''):'',cantidad,potUnit,origen:sheetName+'!'+(i+1)});
    }
    if(errors.length)throw new Error(errors.join('\n'));
    if(!loads.length)throw new Error('No se encontraron cargas válidas.');
    return loads;
  }
  root.EnergiaCAD={buildUnifilar,buildTablero,toSVG,toDXF,parseRows,wrap};
  if(typeof module!=='undefined')module.exports=root.EnergiaCAD;
})(typeof globalThis!=='undefined'?globalThis:this);
