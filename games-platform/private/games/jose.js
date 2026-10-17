'use strict';
const threadColors=[{name:'Dorado',hex:'#efb947',symbol:'★'},{name:'Azul',hex:'#467bd8',symbol:'●'},{name:'Coral',hex:'#e87972',symbol:'◆'},{name:'Verde',hex:'#4c9c85',symbol:'■'}];
function wheatIcon(value=1){return `<svg viewBox="0 0 72 72" class="wheat-sack" aria-hidden="true"><path d="m23 10 7 12c-14 8-21 33-11 40h34c10-7 3-32-11-40l7-12z" fill="#dab56c"/><path d="M25 24h22M22 58h29" stroke="#a97b38" stroke-width="4"/><path d="M36 34v16m0-8-7-6m7 11 7-6" stroke="#9b712d" stroke-width="3"/><text x="36" y="65" font-family="Arial,sans-serif" font-weight="bold" font-size="15" text-anchor="middle" fill="#624018">${value}</text></svg>`}
function joseGranaryGame(){
 const configs=[{bags:[1,1,2,2],needs:[3,3]},{bags:[1,1,2,2,3,3],needs:[4,4,4]},{bags:[1,1,1,2,2,2,3,3],needs:[3,4,4,4]}];
 const cfg=configs[level-1],bags=shuffle(cfg.bags).map((value,id)=>({value,id,family:null})),needs=shuffle(cfg.needs);
 let chosen=null,locked=false,moves=0;
 shell('Reparte todos los sacos. Elige uno y toca una familia. Cada familia necesita la cantidad indicada.');
 $('#play').innerHTML='<div class="jose-scene"><span>El granero de Egipto</span></div><div class="granary-guide"><span>1. Elige un saco</span><span>2. Elige una familia</span></div><div id="grain-stock" class="grain-stock"></div><div class="grain-families"></div><button class="primary sam-submit" id="grain-check">Comprobar reparto</button>';
 const amount=f=>bags.filter(b=>b.family===f).reduce((s,b)=>s+b.value,0);
 function draw(){
  $('#stats').textContent=`Familias atendidas: ${needs.filter((n,f)=>amount(f)===n).length} / ${needs.length} · Repartos: ${moves}`;
  $('#grain-stock').innerHTML=bags.filter(b=>b.family===null).map(b=>`<button class="grain-pick ${chosen===b.id?'chosen':''}" data-bag="${b.id}" aria-pressed="${chosen===b.id}" aria-label="Elegir saco de ${b.value} raciones">${wheatIcon(b.value)}<span>${b.value} ${b.value===1?'ración':'raciones'}</span></button>`).join('')||'<p>Todos los sacos están repartidos</p>';
  $('.grain-families').innerHTML=needs.map((need,f)=>`<div class="grain-family ${amount(f)===need?'grain-ready':''}"><button class="family-target" data-family="${f}" aria-label="Dar el saco a la familia ${f+1}, necesita ${need}, tiene ${amount(f)}"><span class="family-house" aria-hidden="true">⌂</span><strong>Familia ${f+1}</strong><span class="family-amount">${amount(f)} / ${need}</span><small>${amount(f)===need?'¡Lista!':'raciones'}</small></button><div class="family-bags">${bags.filter(b=>b.family===f).map(b=>`<button data-return="${b.id}" aria-label="Retirar saco de ${b.value} raciones de la familia ${f+1}">${wheatIcon(b.value)}<span>−</span></button>`).join('')}</div></div>`).join('');
  app.querySelectorAll('[data-bag]').forEach(b=>b.onclick=()=>{if(locked)return;chosen=Number(b.dataset.bag);draw();feedback('Ahora elige la familia que recibirá este saco.');$(`[data-bag="${chosen}"]`)?.focus({preventScroll:true})});
  app.querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>{
   if(locked)return;if(chosen===null){feedback('Elige primero un saco del granero.');return}
   const f=Number(b.dataset.family),sack=bags[chosen];
   if(amount(f)+sack.value>needs[f]){feedback('Ese saco supera lo que necesita esta familia. Prueba otra combinación.');tone(false);return}
   sack.family=f;chosen=null;moves++;draw();feedback('¡Un reparto más! Revisa las cantidades que faltan.',true);
  });
  app.querySelectorAll('[data-return]').forEach(b=>b.onclick=()=>{if(locked)return;bags[Number(b.dataset.return)].family=null;chosen=null;draw();feedback('El saco volvió al granero. Puedes probar otra combinación.')});
 }
 draw();
 $('#grain-check').onclick=()=>{if(locked)return;if(bags.some(b=>b.family===null)||needs.some((n,f)=>amount(f)!==n)){feedback('Todavía quedan raciones por repartir. Puedes retirar sacos y reorganizarlos.');tone(false);return}locked=true;$('#grain-check').disabled=true;feedback('¡Todas las familias recibieron sus raciones!',true);later(win,1000)};
 hintAction=()=>{
  if(locked)return;const pending=needs.map((n,f)=>({family:f,need:n-amount(f)})).filter(v=>v.need>0);
  const exact=bags.find(b=>b.family===null&&pending.some(v=>v.need===b.value));
  if(exact){const f=pending.find(v=>v.need===exact.value);$(`[data-bag="${exact.id}"]`).classList.add('hint-glow');feedback(`Este saco completa lo que falta a la familia ${f.family+1}.`)}
  else feedback('Combina sacos de distintas cantidades. Si una combinación se complica, retira alguno y prueba otra.');
 };
}
function joseCoatGame(){
 const rows=[2,3,4][level-1],cols=5,pattern=shuffle([0,1,2,3]).slice(0,level===1?2:3),fixed=2;
 const expected=Array.from({length:rows*cols},(_,i)=>pattern[(i%cols+(level===3?Math.floor(i/cols):0))%pattern.length]);
 const filled=new Set(expected.map((v,i)=>i).filter(i=>i%cols<fixed));let selected=pattern[0],done=false,painted=0;
 shell('Completa las franjas de la túnica. Observa el patrón de cada fila, elige un color y pinta los espacios claros.');
 $('#play').innerHTML=`<div class="coat-legend"><span>Observa</span><span>Elige</span><span>Completa</span></div><div class="pattern-model"><span>Patrón de la primera fila</span><div>${pattern.map(v=>`<span style="background:${threadColors[v].hex}" aria-label="${threadColors[v].name}">${threadColors[v].symbol}</span>`).join('')}<b>↻</b></div></div><div class="coat-frame"><div class="coat-collar" aria-hidden="true"></div><div class="coat-board" role="group" aria-label="Túnica de colores, ${rows} filas"></div></div><div class="thread-palette" aria-label="Colores del telar"></div>`;
 function draw(){
  const remaining=rows*cols-filled.size;$('#stats').textContent=`Espacios por completar: ${remaining} · Patrones: ${rows} filas`;
  $('.coat-board').innerHTML=expected.map((v,i)=>{const c=threadColors[v],clue=i%cols<fixed;return `<button class="coat-cell ${filled.has(i)?'painted':''}" data-thread="${i}" ${filled.has(i)?'disabled':''} style="${filled.has(i)?'--thread:'+c.hex:''}" aria-label="${clue?'Muestra '+c.name:filled.has(i)?'Color '+c.name:'Pintar fila '+(Math.floor(i/cols)+1)+', espacio '+(i%cols+1)}"><span>${filled.has(i)?c.symbol:'+'}</span>${clue?'<small>•</small>':''}</button>`}).join('');
  $('.thread-palette').innerHTML=pattern.map(v=>`<button class="thread-choice ${selected===v?'selected':''}" data-color="${v}" aria-pressed="${selected===v}" style="--thread:${threadColors[v].hex}"><span>${threadColors[v].symbol}</span><strong>${threadColors[v].name}</strong></button>`).join('');
  app.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{if(done)return;selected=Number(b.dataset.color);draw();feedback(`Hilo ${threadColors[selected].name.toLowerCase()} seleccionado.`);$(`[data-color="${selected}"]`).focus({preventScroll:true})});
  app.querySelectorAll('[data-thread]').forEach(b=>b.onclick=()=>{
   if(done||b.disabled)return;const i=Number(b.dataset.thread);
   if(expected[i]!==selected){feedback('Observa cómo se repiten los símbolos de esta fila. Prueba otro hilo.');tone(false);b.classList.add('try-again');return}
   filled.add(i);painted++;draw();feedback('¡El patrón continúa!',true);if(filled.size===rows*cols){done=true;feedback('¡Completaste todos los patrones de la túnica!',true);later(win,1000)}
  });
 }
 draw();hintAction=()=>{if(done)return;const i=expected.findIndex((v,j)=>!filled.has(j)),c=threadColors[expected[i]];selected=expected[i];draw();$(`[data-thread="${i}"]`).classList.add('hint-glow');feedback(`Sigue esta fila con el hilo ${c.name.toLowerCase()}, símbolo ${c.symbol}.`)};
}
