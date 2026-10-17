'use strict';
document.querySelector('#exit').onclick=async()=>{const button=document.querySelector('#exit');button.disabled=true;try{const r=await fetch('/juegos/leave',{method:'POST',headers:{'X-TFI-Request':'purchase-code'}});if(r.ok){location.reload();return}}catch{}button.disabled=false;button.textContent='Reintentar salida'};
