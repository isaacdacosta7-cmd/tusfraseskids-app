'use strict';
const form=document.querySelector('#access-form'),input=document.querySelector('#purchase-code'),message=document.querySelector('#access-message'),submit=form.querySelector('button');
input.addEventListener('input',()=>{input.value=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);input.removeAttribute('aria-invalid');message.textContent=''});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(input.value.length!==6){message.textContent='Escribe los seis caracteres de tu código.';input.focus();return}
 submit.disabled=true;submit.textContent='Validando tu acceso…';message.textContent='';
 try{const r=await fetch('/juegos/enter',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-TFI-Request':'purchase-code'},body:JSON.stringify({code:input.value})});
 const data=await r.json();if(r.ok){submit.textContent='¡Tu aventura comienza!';location.reload();return}
 message.textContent=data.error||'Inténtalo otra vez.';input.setAttribute('aria-invalid','true');input.focus();
 }catch{message.textContent='Comprueba tu conexión y vuelve a intentarlo.'}
 submit.disabled=false;submit.textContent='Abrir mis aventuras';
});
