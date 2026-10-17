'use strict';
// Original, touch-friendly challenges. Story artwork is extracted without its text.
const samSupplies={
 water:{name:'Agua',units:2,color:'#58b8e3',shape:'<path fill="#765333" d="M26 7h12v9H26z"/><path fill="#61c5ed" d="M22 16h20v7h5v33H17V23h5z"/><path fill="#c4f0fa" d="M22 26h7v22h-7z"/><path fill="#3187bc" d="M17 50h30v6H17z"/>'},
 bread:{name:'Pan',units:1,color:'#db9a39',shape:'<path fill="#a45e23" d="M9 27h6v-8h34v8h6v21H9z"/><path fill="#edb55c" d="M15 24h34v19H15z"/><path fill="#ffe0a0" d="M20 24h5v13h-5zm13 0h5v13h-5z"/>'},
 blanket:{name:'Manta',units:2,color:'#ce6248',shape:'<path fill="#853c30" d="M12 13h40v42H12z"/><path fill="#cd664a" d="M12 13h34v36H12z"/><path fill="#f5c685" d="M17 13h6v36h-6zm17 0h6v36h-6z"/><path fill="#e89868" d="M12 21h34v6H12zm0 17h34v6H12z"/>'},
 bandage:{name:'Venda',units:1,color:'#e8dbc1',shape:'<path fill="#b6a482" d="M9 25h46v18H9z"/><path fill="#fff0d5" d="M9 22h46v18H9z"/><path fill="#d7b483" d="M25 22h14v18H25z"/><path fill="#b99164" d="M28 26h3v3h-3zm6 0h3v3h-3zm-6 7h3v3h-3zm6 0h3v3h-3z"/>'},
 rock:{name:'Piedra',units:2,color:'#999385',shape:'<path fill="#6c675e" d="M10 27h8v-8h28v8h8v22H10z"/><path fill="#aaa394" d="M18 22h22v17H18z"/><path fill="#d1cab8" d="M18 22h9v8h-9z"/>'},
 flower:{name:'Flor',units:1,color:'#dda664',shape:'<path fill="#69a24d" d="M29 29h6v29h-6zm6 12h12v7H35z"/><path fill="#f4bf41" d="M20 10h24v24H20z"/><path fill="#ed9442" d="M14 16h36v12H14z"/><path fill="#805234" d="M26 16h12v12H26z"/>'}
};
function samIcon(id){return `<svg viewBox="0 0 64 64" class="sam-icon" role="img" aria-label="${samSupplies[id].name}" shape-rendering="crispEdges">${samSupplies[id].shape}</svg>`}
function samDonkey(){return '<svg viewBox="0 0 100 85" class="sam-donkey" aria-hidden="true" shape-rendering="crispEdges"><path fill="#715f50" d="M12 39h47v25H12zm7 22h9v19h-9zm27 0h9v19h-9z"/><path fill="#a7957e" d="M17 33h42v22H17zm38-8h28v26H55z"/><path fill="#715f50" d="M57 4h7v25h-7zm17 0h7v25h-7z"/><path fill="#ddccb0" d="M59 8h3v17h-3zm17 0h3v17h-3zm-15 27h26v17H61z"/><path fill="#30291f" d="M73 28h5v5h-5z"/><path fill="#b65335" d="M20 29h30v15H20z"/><path fill="#edd089" d="M26 29h6v15h-6zm12 0h6v15h-6z"/><path fill="#41382e" d="M10 37h5v20h-5z"/></svg>'}

function samaritanoPackGame(){
 let round=0,bag=[],recipe={},locked=false;
 const rounds=level,types=[2,3,4][level-1];
 shell('Mira la lista y prepara las provisiones. Toca para añadir; toca la mochila para retirar.');
 function begin(){
  bag=[];locked=false;
  const keys=shuffle(['water','bread','blanket','bandage']).slice(0,types);
  recipe=Object.fromEntries(keys.map((k,j)=>[k,level===3&&j<2?2:level===2&&j===0?2:1]));
  $('#play').innerHTML=`<div class="sam-scene sam-inn"><div class="sam-scene-label">Entrega ${round+1} de ${rounds} · La posada</div></div><div class="sam-list"><h2>La lista de ayuda</h2><div class="sam-needs">${keys.map(k=>`<button class="sam-need" data-need="${k}" aria-label="Escuchar: ${recipe[k]} ${samSupplies[k].name}">${samIcon(k)}<span>${recipe[k]} × ${samSupplies[k].name}</span><small class="sam-tally"></small></button>`).join('')}</div></div><div class="sam-bag-heading"><h2>Tu mochila</h2><span id="sam-space"></span></div><div class="sam-bag" aria-label="Provisiones seleccionadas"></div><h2 class="sam-shelf-title">Elige las provisiones</h2><div class="sam-shelf">${shuffle([...keys,...['water','bread','blanket','bandage','rock','flower'].filter(k=>!keys.includes(k)).slice(0,level+1)]).map(k=>`<button class="sam-supply" data-supply="${k}" aria-label="Añadir ${samSupplies[k].name}, ocupa ${samSupplies[k].units} espacios">${samIcon(k)}<strong>${samSupplies[k].name}</strong><small>${samSupplies[k].units} ${samSupplies[k].units===1?'espacio':'espacios'}</small></button>`).join('')}</div><button class="primary sam-submit" id="sam-deliver">Entregar la mochila</button>`;
  app.querySelectorAll('[data-supply]').forEach(b=>b.onclick=()=>{
   if(locked)return;const k=b.dataset.supply;
   if(used()+samSupplies[k].units>capacity()){feedback('La mochila está llena. Toca una provisión para hacer espacio.');tone(false);return}
   bag.push(k);tone();draw();feedback('Provisión añadida. Revisa las cantidades de la lista.');
  });
  app.querySelectorAll('[data-need]').forEach(b=>b.onclick=()=>{sound=true;updateHeader();speak(`Necesitas ${recipe[b.dataset.need]} ${samSupplies[b.dataset.need].name}.`)});
  $('#sam-deliver').onclick=()=>{
   if(locked)return;
   const extra=bag.find(k=>!recipe[k]||count(k)>recipe[k]);
   if(extra){feedback(`Revisa ${samSupplies[extra].name.toLowerCase()}: retira lo que sobra de la mochila.`);tone(false);return}
   const missing=keys.find(k=>count(k)<recipe[k]);
   if(missing){feedback(`Falta ${samSupplies[missing].name.toLowerCase()}. Mira la cantidad de la lista.`);tone(false);return}
   locked=true;$('#sam-deliver').disabled=true;feedback('¡La ayuda está lista para el viajero!',true);round++;
   later(()=>{if(round===rounds)win();else{begin();feedback('¡Llegó una nueva lista! Prepara la siguiente entrega.')}},1000);
  };
  draw();
 }
 const count=k=>bag.filter(v=>v===k).length;
 const used=()=>bag.reduce((n,k)=>n+samSupplies[k].units,0);
 const capacity=()=>Object.entries(recipe).reduce((n,[k,q])=>n+samSupplies[k].units*q,0);
 function draw(){
  $('#stats').textContent=`Entrega ${round+1} / ${rounds} · Espacio: ${used()} / ${capacity()}`;
  $('#sam-space').textContent=`${used()} / ${capacity()} espacios`;
  app.querySelectorAll('[data-need]').forEach(b=>{const k=b.dataset.need,c=count(k);b.classList.toggle('sam-packed',c===recipe[k]);b.querySelector('.sam-tally').textContent=`${c} / ${recipe[k]} ${c===recipe[k]?'✓':''}`});
  $('.sam-bag').innerHTML=bag.length?bag.map((k,j)=>`<button class="sam-packed-item" data-remove="${j}" aria-label="Retirar ${samSupplies[k].name}">${samIcon(k)}<span>−</span></button>`).join(''):'<p>Tu mochila está lista para llenar</p>';
  app.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(locked)return;bag.splice(Number(b.dataset.remove),1);draw();feedback('Provisión retirada. Ya puedes ajustar tu mochila.')});
 }
 hintAction=()=>{
  if(locked)return;
  const extra=bag.find(k=>!recipe[k]||count(k)>recipe[k]);
  if(extra){feedback(`Retira ${samSupplies[extra].name.toLowerCase()} hasta tener lo que pide la lista.`);return}
  const k=Object.keys(recipe).find(k=>count(k)<recipe[k]);
  if(k){const b=$(`[data-supply="${k}"]`);b.classList.add('hint-glow');feedback(`Busca ${samSupplies[k].name.toLowerCase()}. Todavía falta en la mochila.`);later(()=>b.classList.remove('hint-glow'),2200)}
  else feedback('Las cantidades están completas. Puedes entregar la mochila.');
 };
 begin();
}

function samRoadSvg(ports){
 const pieces=ports.map(d=>[
 '<path d="M32 32V0"/>','<path d="M32 32H64"/>','<path d="M32 32V64"/>','<path d="M32 32H0"/>'
 ][d]).join('');
 return `<svg viewBox="0 0 64 64" aria-hidden="true" shape-rendering="crispEdges"><rect width="64" height="64" fill="#86a555"/><path d="M5 8h9v5H5zm42 39h12v7H47z" fill="#b2c86d"/><g fill="none" stroke="#886238" stroke-width="28">${pieces}</g><g fill="none" stroke="#edcd88" stroke-width="19">${pieces}</g><rect x="27" y="27" width="10" height="10" fill="#f7dfa3"/></svg>`;
}
function makeSamaritanRoad(n){
 const steps=shuffle([...Array(n-1).fill(1),...Array(n-1).fill(2)]),path=[0];
 let pos=0;for(const d of steps){pos+=d===1?1:n;path.push(pos)}
 const tiles=Array.from({length:n*n},()=>({base:Math.random()<.5?[0,1]:[0,2],turn:Math.floor(Math.random()*4)}));
 for(let i=0;i<path.length;i++){
  const prev=i===0?3:path[i-1]===path[i]-1?3:0;
  const next=i===path.length-1?1:path[i+1]===path[i]+1?1:2;
  tiles[path[i]].base=[prev,next];tiles[path[i]].turn=Math.floor(Math.random()*4);
 }
 // First tile always starts disconnected, giving every child a real task.
 tiles[0].turn=tiles[0].base.includes(0)?1:2;
 if(tiles[0].base.map(d=>(d+tiles[0].turn)%4).includes(3))tiles[0].turn=3;
 return {tiles,path};
}
function samaritanoRoadGame(){
 const n=[3,4,5][level-1],{tiles,path}=makeSamaritanRoad(n);
 let turns=0,locked=false;
 shell('Gira las baldosas para unir el burrito con la posada. Después toca Probar camino.');
 $('#play').innerHTML=`<div class="sam-scene sam-outdoors"><div class="sam-scene-label">Un viaje de bondad</div></div><div class="sam-road-labels"><span>${samDonkey()} Salida</span><span>Posada ▰</span></div><div class="sam-road-board" style="--road-size:${n}" role="group" aria-label="Camino de ${n} por ${n} baldosas"></div><button class="primary sam-submit" id="sam-test-road">Probar camino</button><p class="sam-tip">Cada toque gira una baldosa. Los caminos deben encontrarse borde con borde.</p>`;
 const ports=j=>tiles[j].base.map(d=>(d+tiles[j].turn)%4);
 function draw(){
  $('#stats').textContent=`${n} × ${n} baldosas · Giros: ${turns}`;
  $('.sam-road-board').innerHTML=tiles.map((t,j)=>`<button class="sam-road-tile" data-road="${j}" data-ports="${ports(j).join(',')}" aria-label="Girar baldosa, fila ${Math.floor(j/n)+1}, columna ${j%n+1}">${samRoadSvg(ports(j))}${j===0?'<span class="sam-start-marker">▶</span>':j===n*n-1?'<span class="sam-end-marker">▰</span>':''}</button>`).join('');
  app.querySelectorAll('[data-road]').forEach(b=>b.onclick=()=>{if(locked)return;const j=Number(b.dataset.road);tiles[j].turn=(tiles[j].turn+1)%4;turns++;draw();tone();feedback('Baldosa girada. Une la salida con la posada.');$(`[data-road="${j}"]`).focus({preventScroll:true})});
 }
 function trace(){
  let pos=0,entry=3,route=[],visited=new Set();
  while(!visited.has(pos)){
   const p=ports(pos);if(!p.includes(entry))break;
   route.push(pos);visited.add(pos);const exit=p.find(d=>d!==entry);
   if(pos===n*n-1&&exit===1)return {route,success:true};
   const r=Math.floor(pos/n),c=pos%n;
   if(exit===0&&r===0||exit===1&&c===n-1||exit===2&&r===n-1||exit===3&&c===0)break;
   pos+=[-n,1,n,-1][exit];entry=(exit+2)%4;
  }
  return {route,success:false};
 }
 draw();
 $('#sam-test-road').onclick=()=>{
  if(locked)return;locked=true;$('#sam-test-road').disabled=true;
  const result=trace();
  result.route.forEach((j,i)=>later(()=>{const b=$(`[data-road="${j}"]`);b.classList.add('sam-road-connected');app.querySelector('.sam-traveler')?.remove();b.insertAdjacentHTML('beforeend',`<span class="sam-traveler">${samDonkey()}</span>`);tone()},i*220));
  later(()=>{
   if(result.success){feedback('¡El burrito llegó a la posada!',true);later(win,850)}
   else{locked=false;$('#sam-test-road').disabled=false;feedback(result.route.length?'El burrito encontró un corte. Gira las baldosas para continuar.':'Conecta primero el borde izquierdo de la baldosa de salida.');tone(false)}
  },Math.max(result.route.length*220,350));
 };
 hintAction=()=>{
  if(locked)return;
  const j=path.find(k=>tiles[k].base.some(d=>!ports(k).includes(d)));
  if(j===undefined){feedback('La ruta está conectada. Toca Probar camino.');return}
  const b=$(`[data-road="${j}"]`);b.classList.add('hint-glow');feedback('Prueba girando la baldosa que brilla.');later(()=>b.classList.remove('hint-glow'),2400);
 };
}
