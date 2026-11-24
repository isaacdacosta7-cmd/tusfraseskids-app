
'use strict';
const {Pool}=require('pg');
const {randomBytes,randomUUID,createHash,createHmac,timingSafeEqual}=require('crypto');
const {issueSignedToken,presignUrl,head,get}=require('@vercel/blob');
const proofTypes=Object.freeze({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'});
const proofSizeLimit=8*1024*1024;
const {Readable}=require('node:stream');
const db=new Pool({connectionString:process.env.DATABASE_URL,max:4,idleTimeoutMillis:10000});
const hash=x=>createHash('sha256').update(String(x)).digest('hex');
const eq=(a,b)=>timingSafeEqual(Buffer.from(hash(a),'hex'),Buffer.from(hash(b),'hex'));
const send=(r,x,s=200)=>{r.statusCode=s;r.setHeader('Content-Type','application/json; charset=utf-8');r.setHeader('Cache-Control','no-store');r.end(JSON.stringify(x));};
const fail=(r,m,s=400)=>send(r,{error:m},s);
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x);
const slug=x=>typeof x==='string'&&/^[a-z0-9-]{3,75}$/.test(x);
function admin(req){
 const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('tfi_admin='));
 if(!raw||!process.env.STORE_SESSION_SECRET)return false;
 const [t,n,s]=decodeURIComponent(raw.slice(10)).split('.');
 if(!t||!n||!s||!/^\d+$/.test(t)||Math.abs(Date.now()-Number(t))>43200000)return false;
 return eq(s,createHmac('sha256',process.env.STORE_SESSION_SECRET).update(t+'.'+n).digest('hex'));
}
async function settings(){return (await db.query('SELECT * FROM store_settings WHERE id=1')).rows[0];}
async function presign(path,operation,minutes){
 const t=Date.now();
 const token=await issueSignedToken({pathname:path,operations:[operation],validUntil:t+Math.max(minutes,10)*60000});
 return (await presignUrl(token,{pathname:path,operation,validUntil:t+minutes*60000})).presignedUrl;
}
module.exports=async(req,res)=>{
 try{
 const u=new URL(req.url,'https://store.local'),b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
 const a=u.searchParams.get('action')||b.action||'catalog';
 if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return fail(res,'Origen inválido.',403);
 if(req.method==='GET'&&a==='catalog'){
  const p=(await db.query('SELECT slug,title,subtitle,description,pages,price_cents,position,cover_path IS NOT NULL AS has_cover,pdf_path IS NOT NULL AS ready FROM store_products WHERE is_active=true ORDER BY position')).rows;
  const cfg=await settings();const regular=p.reduce((n,x)=>n+x.price_cents,0),bundlePrice=Math.min(regular,Number(cfg.bundle_price_cents||2400));
  return send(res,{products:p,settings:cfg,bundle:{price_cents:bundlePrice,regular_price_cents:regular,savings_cents:regular-bundlePrice,discount_percent:regular?Math.round(100*(regular-bundlePrice)/regular):0,product_count:p.length}});
 }
 if(req.method==='POST'&&a==='checkout'){
  const name=String(b.name||'').trim().slice(0,100),email=String(b.email||'').trim().toLowerCase().slice(0,160),reference=String(b.reference||'').trim().slice(0,100),whatsapp=String(b.whatsapp||'').trim().slice(0,30);
  const method=String(b.method||''),ids=[...new Set(Array.isArray(b.slugs)?b.slugs:[])];
  if(name.length<3||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||reference.length<3||!/^[+\d()\s.-]{10,30}$/.test(whatsapp)||!/^\d{10,15}$/.test(whatsapp.replace(/\D/g,'')))return fail(res,'Completa nombre, correo, WhatsApp y referencia válida.');
  if(!['pago_movil','transferencia','internacional'].includes(method)||ids.length<1||ids.length>6||!ids.every(slug))return fail(res,'Pedido inválido.');
  const cfg=await settings();
  if(!cfg.store_open||!String(cfg[method]||'').trim())return fail(res,'Las compras están en preparación.',409);
  const p=(await db.query('SELECT slug,price_cents,pdf_path FROM store_products WHERE slug=ANY($1::text[]) AND is_active=true',[ids])).rows;
  if(p.length!==ids.length||p.some(x=>!x.pdf_path))return fail(res,'Hay cuentos todavía en preparación.',409);
  const count=(await db.query("SELECT count(*)::int AS c FROM store_orders WHERE customer_email=$1 AND created_at>now()-interval '1 hour'",[email])).rows[0].c;
  if(count>=5)return fail(res,'Límite temporal de pedidos alcanzado.',429);
  const regular=p.reduce((sum,item)=>sum+item.price_cents,0);
  const isBundle=ids.length===6&&p.length===6&&p.every(item=>item.price_cents===500);
  const total=isBundle?Math.min(regular,Number(cfg.bundle_price_cents||2400)):regular;
  const perItemPrice=isBundle?Math.floor(total/p.length):0;
  const id=randomUUID(),access=randomBytes(32).toString('hex'),c=await db.connect();
  try{await c.query('BEGIN');await c.query('INSERT INTO store_orders(id,customer_name,customer_email,payment_method,payment_reference,total_cents,access_token_hash,customer_whatsapp,proof_required) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true)',[id,name,email,method,reference,total,hash(access),whatsapp]);for(let i=0;i<p.length;i++){const x=p[i],itemPrice=isBundle?perItemPrice+(i===0?total-perItemPrice*p.length:0):x.price_cents;await c.query('INSERT INTO store_order_items(order_id,product_slug,price_cents) VALUES($1,$2,$3)',[id,x.slug,itemPrice]);}await c.query('COMMIT');}
  catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  return send(res,{id,access,total_cents:total,bundle_applied:isBundle,status:'pending'},201);
 }
 if(req.method==='POST'&&a==='proof-ticket'){
  const id=String(b.id||''),access=String(b.access||''),size=Number(b.size),mime=String(b.mime||'');
  if(!uuid(id)||access.length!==64||!proofTypes[mime]||!Number.isInteger(size)||size<100||size>proofSizeLimit)return fail(res,'Comprobante inválido. Adjunta JPG, PNG o WebP de hasta 8 MB.');
  const q=await db.query("UPDATE store_orders SET proof_upload_attempts=proof_upload_attempts+1 WHERE id=$1 AND access_token_hash=$2 AND status='pending' AND proof_upload_attempts<12 RETURNING id",[id,hash(access)]);
  if(!q.rowCount)return fail(res,'Pedido inexistente, procesado o con demasiados intentos.',409);
  const path='proofs/'+id+'/'+Date.now()+'-'+randomBytes(8).toString('hex')+proofTypes[mime];
  return send(res,{path,url:await presign(path,'put',10)});
 }
 if(req.method==='POST'&&a==='proof-save'){
  const id=String(b.id||''),access=String(b.access||''),path=String(b.path||''),mime=String(b.mime||'');
  const root='proofs/'+id+'/',name=path.slice(root.length);
  if(!uuid(id)||access.length!==64||!proofTypes[mime]||!path.startsWith(root)||!/^\d{13}-[a-f0-9]{16}\.(jpg|png|webp)$/.test(name)||!path.endsWith(proofTypes[mime]))return fail(res,'Comprobante inválido.');
  const order=(await db.query("SELECT id FROM store_orders WHERE id=$1 AND access_token_hash=$2 AND status='pending'",[id,hash(access)])).rows[0];
  if(!order)return fail(res,'Pedido inexistente o procesado.',409);
  const meta=await head(path,{access:'private'});
  if(!meta||meta.size<100||meta.size>proofSizeLimit||String(meta.contentType||'').split(';')[0]!==mime)return fail(res,'Formato o tamaño incorrecto del comprobante.',400);
  const blob=await get(path,{access:'private'});
  if(!blob||blob.statusCode!==200||!blob.stream)return fail(res,'No se pudo validar el archivo.',502);
  const reader=blob.stream.getReader(),bytes=[];
  try{
   while(bytes.length<12){
    const part=await reader.read();if(part.done)break;
    for(const value of part.value){bytes.push(value);if(bytes.length===12)break;}
   }
  }finally{await reader.cancel().catch(()=>{});}
  const jpeg=mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const png=mime==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const webp=mime==='image/webp'&&[82,73,70,70].every((v,i)=>bytes[i]===v)&&[87,69,66,80].every((v,i)=>bytes[i+8]===v);
  if(!(jpeg||png||webp))return fail(res,'Adjunta una captura de imagen válida en JPG, PNG o WebP.');
  const saved=await db.query("UPDATE store_orders SET payment_proof_path=$3,payment_proof_mime=$4 WHERE id=$1 AND access_token_hash=$2 AND status='pending'",[id,hash(access),path,mime]);
  return saved.rowCount?send(res,{ok:true,proof_uploaded:true}):fail(res,'El pedido ya está procesado.',409);
 }
 if(req.method==='GET'&&a==='order'){
  const id=u.searchParams.get('id'),access=u.searchParams.get('access');
  if(!uuid(id)||!access||access.length!==64)return fail(res,'Enlace inválido.');
  const q=(await db.query('SELECT id,status,total_cents,created_at,(payment_proof_path IS NOT NULL) AS proof_uploaded FROM store_orders WHERE id=$1 AND access_token_hash=$2',[id,hash(access)])).rows;
  if(!q.length)return fail(res,'Pedido inexistente.',404);
  const items=(await db.query('SELECT p.slug,p.title,p.pages,p.pdf_path IS NOT NULL AS ready FROM store_order_items i JOIN store_products p ON p.slug=i.product_slug WHERE i.order_id=$1 ORDER BY p.position',[id])).rows;
  return send(res,{order:q[0],items});
 }
 if(req.method==='GET'&&a==='games'){
  const id=u.searchParams.get('id'), access=u.searchParams.get('access');
  if(!uuid(id)||!access||access.length!==64)return fail(res,'Enlace inválido.');
  const result=await db.query("SELECT 1 FROM store_orders WHERE id=$1 AND access_token_hash=$2 AND status='approved'",[id,hash(access)]);
  if(!result.rows.length)return fail(res,'El acceso a los juegos requiere un pago verificado.',403);
  if(!process.env.STORE_GAME_ACCESS_SECRET)return fail(res,'Acceso en preparación.',503);
  const payload=Buffer.from(JSON.stringify({order:id,exp:Math.floor(Date.now()/1000)+120,nonce:randomBytes(12).toString('hex')})).toString('base64url');
  const sig=createHmac('sha256',process.env.STORE_GAME_ACCESS_SECRET).update('store-ticket:'+payload).digest('hex');
  const url='https://tusfrasesinspiradoras.vercel.app/juegos/claim?ticket='+encodeURIComponent(payload+'.'+sig);
  res.writeHead(302,{Location:url,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});return res.end();
 }
 if(req.method==='GET'&&a==='download'){
  const id=u.searchParams.get('id'),access=u.searchParams.get('access'),book=u.searchParams.get('slug');
  if(!uuid(id)||!access||access.length!==64||!slug(book))return fail(res,'Enlace inválido.');
  const q=(await db.query("SELECT p.pdf_path FROM store_orders o JOIN store_order_items i ON i.order_id=o.id JOIN store_products p ON p.slug=i.product_slug WHERE o.id=$1 AND o.access_token_hash=$2 AND o.status='approved' AND p.slug=$3",[id,hash(access),book])).rows;
  if(!q.length||!q[0].pdf_path)return fail(res,'La descarga requiere un pago verificado.',403);
  const url=await presign(q[0].pdf_path,'get',5);
  await db.query('INSERT INTO store_download_log(order_id,product_slug) VALUES($1,$2)',[id,book]).catch(()=>{});
  res.writeHead(302,{Location:url,'Cache-Control':'no-store'});return res.end();
 }
 if(req.method==='GET'&&a==='cover'){
  const book=u.searchParams.get('slug');if(!slug(book))return fail(res,'Portada inválida.');
  const q=(await db.query('SELECT cover_path FROM store_products WHERE slug=$1 AND is_active=true',[book])).rows;
  if(!q.length||!q[0].cover_path)return fail(res,'Portada pendiente.',404);
  // Public catalog cover, sourced from a private Blob store.
  // Stream through our function so browsers receive the actual JPEG bytes
  // instead of following a redirect into private storage.
  const result=await get(q[0].cover_path,{access:'private',ifNoneMatch:req.headers['if-none-match']||undefined});
  if(!result)return fail(res,'Portada pendiente.',404);
  if(result.statusCode===304){
   res.writeHead(304,{'ETag':result.blob.etag,'Cache-Control':'public, max-age=300'});
   return res.end();
  }
  if(result.statusCode!==200||!result.stream)return fail(res,'No se pudo leer la portada.',502);
  res.writeHead(200,{'Content-Type':result.blob.contentType||'image/jpeg','Cache-Control':'public, max-age=300','ETag':result.blob.etag,'X-Content-Type-Options':'nosniff','Content-Disposition':'inline'});
  Readable.fromWeb(result.stream).on('error',err=>{console.error('cover-stream',err.message);res.destroy(err);}).pipe(res);
  return;
 }
 if(req.method==='POST'&&a==='login'){
  const p=String(b.password||'');
  if(!process.env.STORE_ADMIN_PASSWORD||p.length>200||!eq(p,process.env.STORE_ADMIN_PASSWORD))return fail(res,'Clave incorrecta.',401);
  const t=String(Date.now()),n=randomBytes(12).toString('hex'),s=createHmac('sha256',process.env.STORE_SESSION_SECRET).update(t+'.'+n).digest('hex');
  res.setHeader('Set-Cookie','tfi_admin='+encodeURIComponent(t+'.'+n+'.'+s)+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200');return send(res,{ok:true});
 }
 if(req.method==='POST'&&a==='logout'){res.setHeader('Set-Cookie','tfi_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');return send(res,{ok:true});}
 if(['admin-state','review','payment-settings','upload-ticket','save-asset','price'].includes(a)){
  if(!admin(req))return fail(res,'Inicia sesión de administrador.',401);
  if(req.method==='GET'&&a==='admin-state'){
   const products=(await db.query('SELECT * FROM store_products ORDER BY position')).rows;
   const orders=(await db.query("SELECT o.id,o.customer_name,o.customer_email,o.customer_whatsapp,o.payment_method,o.payment_reference,o.total_cents,o.status,o.created_at,o.proof_required,(o.payment_proof_path IS NOT NULL) AS has_proof,coalesce((SELECT json_agg(json_build_object('slug',i.product_slug,'title',p.title)) FROM store_order_items i JOIN store_products p ON p.slug=i.product_slug WHERE i.order_id=o.id),'[]'::json) AS items FROM store_orders o ORDER BY created_at DESC LIMIT 100")).rows;
   return send(res,{products,orders,settings:await settings()});
  }
  if(req.method!=='POST')return fail(res,'Método inválido.',405);
  if(a==='review'){
   if(!uuid(b.id)||!['approved','rejected'].includes(b.status))return fail(res,'Pedido inválido.');
   if(b.status==='approved'){
    const n=(await db.query('SELECT count(*)::int AS n FROM store_order_items i JOIN store_products p ON p.slug=i.product_slug WHERE i.order_id=$1 AND p.pdf_path IS NULL',[b.id])).rows[0].n;
    if(n)return fail(res,'Primero carga los PDF.',409);
    const proof=(await db.query('SELECT proof_required,payment_proof_path FROM store_orders WHERE id=$1',[b.id])).rows[0];
    if(proof?.proof_required&&!proof.payment_proof_path)return fail(res,'Falta adjuntar el comprobante del pago.',409);
   }
   const r=await db.query("UPDATE store_orders SET status=$2,reviewed_at=now() WHERE id=$1 AND status='pending' AND (proof_required=false OR payment_proof_path IS NOT NULL OR $2='rejected')",[b.id,b.status]);
   return r.rowCount?send(res,{ok:true}):fail(res,'Pedido procesado o inexistente.',409);
  }
  if(a==='payment-settings'){
   const x={};for(const k of ['pago_movil','transferencia','internacional','whatsapp'])x[k]=String(b[k]||'').trim().slice(0,600);
   if(b.store_open===true&&![x.pago_movil,x.transferencia,x.internacional].some(Boolean))return fail(res,'Agrega un método de pago.');
   await db.query('UPDATE store_settings SET pago_movil=$1,transferencia=$2,internacional=$3,whatsapp=$4,store_open=$5 WHERE id=1',[x.pago_movil,x.transferencia,x.internacional,x.whatsapp,b.store_open===true]);
   return send(res,{ok:true});
  }
  if(a==='price'){
   if(!slug(b.slug)||!Number.isInteger(b.price_cents)||b.price_cents<100||b.price_cents>10000)return fail(res,'Precio inválido.');
   await db.query('UPDATE store_products SET price_cents=$2 WHERE slug=$1',[b.slug,b.price_cents]);return send(res,{ok:true});
  }
  if(a==='upload-ticket'){
   const book=String(b.slug||''),kind=String(b.kind||''),size=Number(b.size);
   if(!slug(book)||!['pdf','cover'].includes(kind)||!Number.isInteger(size)||size<1||size>(kind==='pdf'?30*1024*1024:3*1024*1024))return fail(res,'Archivo fuera del límite (PDF 30 MB, portada 3 MB).');
   const q=(await db.query('SELECT 1 FROM store_products WHERE slug=$1',[book])).rows;if(!q.length)return fail(res,'Cuento inexistente.');
   const path='catalog/'+book+'/'+Date.now()+'-'+randomBytes(6).toString('hex')+(kind==='pdf'?'.pdf':'.jpg');
   return send(res,{url:await presign(path,'put',10),path});
  }
  if(a==='save-asset'){
   const book=String(b.slug||''),kind=String(b.kind||''),path=String(b.path||'');
   if(!slug(book)||!['pdf','cover'].includes(kind)||!path.startsWith('catalog/'+book+'/')||path.length>250||!path.endsWith(kind==='pdf'?'.pdf':'.jpg'))return fail(res,'Archivo inválido.');
   await head(path,{access:'private'});
   await db.query('UPDATE store_products SET '+(kind==='pdf'?'pdf_path':'cover_path')+'=$2 WHERE slug=$1',[book,path]);return send(res,{ok:true});
  }
 }
 return fail(res,'Ruta desconocida.',404);
 }catch(e){console.error('tfi-store',e.message||e);return fail(res,'Error temporal. Intenta nuevamente.',500);}
};
