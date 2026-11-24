
'use strict';
const {Pool}=require('pg');
const {randomBytes,randomUUID,createHash,createHmac,timingSafeEqual,scrypt:nodeScrypt}=require('crypto');
const {promisify}=require('node:util');
const scrypt=promisify(nodeScrypt);
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

const BUYER_COOKIE='tfi_buyer';
const BUYER_SESSION_SECONDS=30*24*60*60;
const cleanPhone=x=>String(x||'').replace(/[^0-9]/g,'');
const validEmail=x=>typeof x==='string'&&x.length<=160&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x);
const validPass=x=>typeof x==='string'&&x.length>=10&&x.length<=128;
function buyerSession(req){
 try{
  const raw=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(BUYER_COOKIE+'='));
  if(!raw)return null;
  const token=decodeURIComponent(raw.slice(BUYER_COOKIE.length+1));
  const parts=token.split('.');if(parts.length!==2)return null;
  const [payload,signature]=parts;
  if(payload.length>600||!/^[a-f0-9]{64}$/.test(signature))return null;
  const key=process.env.STORE_SESSION_SECRET;if(!key)return null;
  const expected=createHmac('sha256',key).update('buyer-session:'+payload).digest('hex');
  if(!eq(expected,signature))return null;
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
  if(!uuid(data.id)||!validEmail(data.email)||!Number.isInteger(data.exp)||data.exp<Date.now()/1000)return null;
  return {id:data.id,email:data.email};
 }catch{return null}
}
function setBuyerSession(res,id,email){
 const now=Math.floor(Date.now()/1000);
 const payload=Buffer.from(JSON.stringify({id,email,exp:now+BUYER_SESSION_SECONDS,nonce:randomBytes(12).toString('hex')})).toString('base64url');
 const sig=createHmac('sha256',process.env.STORE_SESSION_SECRET).update('buyer-session:'+payload).digest('hex');
 res.setHeader('Set-Cookie',BUYER_COOKIE+'='+encodeURIComponent(payload+'.'+sig)+'; Path=/; Max-Age='+BUYER_SESSION_SECONDS+'; HttpOnly; Secure; SameSite=Lax');
}
async function passwordDigest(pass,salt){
 return (await scrypt(pass,salt,64)).toString('hex');
}
function equalHex(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==128||b.length!==128)return false;
 return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
async function verifyPassword(pass,user){
 return equalHex(await passwordDigest(pass,user.password_salt),user.password_hash);
}
async function consumeAuthAttempt(req){
 const raw=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 const key=createHmac('sha256',String(process.env.STORE_SESSION_SECRET||'')).update('buyer-attempt:'+raw).digest('hex');
 const q=await db.query("INSERT INTO store_customer_auth_attempts(attempt_key,attempts,window_start) VALUES($1,1,now()) ON CONFLICT(attempt_key) DO UPDATE SET attempts=CASE WHEN store_customer_auth_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE store_customer_auth_attempts.attempts+1 END, window_start=CASE WHEN store_customer_auth_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE store_customer_auth_attempts.window_start END RETURNING attempts",[key]);
 return q.rows[0].attempts<=12;
}
async function ownedOrder(req,id,access){
 if(!uuid(id))return null;
 const session=buyerSession(req),validAccess=typeof access==='string'&&/^[a-f0-9]{64}$/i.test(access);
 if(!session&&!validAccess)return null;
 const rows=(await db.query("SELECT id,customer_id,status,total_cents,created_at,(payment_proof_path IS NOT NULL) AS proof_uploaded FROM store_orders WHERE id=$1 AND (($2::uuid IS NOT NULL AND customer_id=$2::uuid) OR ($3::text IS NOT NULL AND access_token_hash=$3::text))",[id,session?.id||null,validAccess?hash(access):null])).rows;
 return rows[0]||null;
}
async function accountForCheckout(req,res,{email,name,whatsapp,password}){
 const session=buyerSession(req);
 if(session){
  if(session.email!==email)throw Object.assign(Error('Inicia sesión con el correo de tu cuenta para comprar.'),{status:401});
  const user=(await db.query('SELECT id FROM store_customers WHERE id=$1 AND email=$2',[session.id,email])).rows[0];
  if(user)return user.id;
 }
 if(!validPass(password))throw Object.assign(Error('Crea una contraseña de 10 caracteres como mínimo para recuperar tus compras.'),{status:400});
 const existing=(await db.query('SELECT id,password_salt,password_hash FROM store_customers WHERE email=$1',[email])).rows[0];
 if(existing){
  if(!await verifyPassword(password,existing))throw Object.assign(Error('Este correo ya tiene cuenta. Utiliza su contraseña o entra a Mis compras.'),{status:401});
  setBuyerSession(res,existing.id,email);
  return existing.id;
 }
 const salt=randomBytes(20).toString('hex'),encoded=await passwordDigest(password,salt),id=randomUUID();
 const result=await db.query('INSERT INTO store_customers(id,email,name,whatsapp,password_salt,password_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO NOTHING RETURNING id',[id,email,name,cleanPhone(whatsapp),salt,encoded]);
 if(!result.rows.length)throw Object.assign(Error('El correo ya está registrado. Inicia sesión con tu contraseña.'),{status:409});
 setBuyerSession(res,id,email);
 return id;
}

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
  if(!buyerSession(req)&&!await consumeAuthAttempt(req))return fail(res,'Demasiados intentos. Prueba nuevamente más tarde.',429);
  let customerId;try{customerId=await accountForCheckout(req,res,{email,name,whatsapp,password:String(b.password||'')});}catch(e){return fail(res,e.message,e.status||400);}
  const count=(await db.query("SELECT count(*)::int AS c FROM store_orders WHERE customer_email=$1 AND created_at>now()-interval '1 hour'",[email])).rows[0].c;
  if(count>=5)return fail(res,'Límite temporal de pedidos alcanzado.',429);
  const regular=p.reduce((sum,item)=>sum+item.price_cents,0);
  const isBundle=ids.length===6&&p.length===6&&p.every(item=>item.price_cents===500);
  const total=isBundle?Math.min(regular,Number(cfg.bundle_price_cents||2400)):regular;
  const perItemPrice=isBundle?Math.floor(total/p.length):0;
  const id=randomUUID(),access=randomBytes(32).toString('hex'),c=await db.connect();
  try{await c.query('BEGIN');await c.query('INSERT INTO store_orders(id,customer_name,customer_email,payment_method,payment_reference,total_cents,access_token_hash,customer_whatsapp,proof_required,customer_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9)',[id,name,email,method,reference,total,hash(access),whatsapp,customerId]);for(let i=0;i<p.length;i++){const x=p[i],itemPrice=isBundle?perItemPrice+(i===0?total-perItemPrice*p.length:0):x.price_cents;await c.query('INSERT INTO store_order_items(order_id,product_slug,price_cents) VALUES($1,$2,$3)',[id,x.slug,itemPrice]);}await c.query('COMMIT');}
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
 if(req.method==='POST'&&a==='customer-login'){
  const email=String(b.email||'').trim().toLowerCase(),pass=String(b.password||'');
  if(!validEmail(email)||pass.length<1||pass.length>128)return fail(res,'Correo o contraseña incorrectos.',401);
  if(!await consumeAuthAttempt(req))return fail(res,'Demasiados intentos. Prueba nuevamente más tarde.',429);
  const user=(await db.query('SELECT id,email,password_salt,password_hash FROM store_customers WHERE email=$1',[email])).rows[0];
  if(!user||!await verifyPassword(pass,user))return fail(res,'Correo o contraseña incorrectos.',401);
  setBuyerSession(res,user.id,email);
  return send(res,{ok:true});
 }
 if(req.method==='POST'&&a==='customer-logout'){
  res.setHeader('Set-Cookie',BUYER_COOKIE+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  return send(res,{ok:true});
 }
 if(req.method==='GET'&&a==='customer-me'){
  const session=buyerSession(req);
  if(!session)return fail(res,'Inicia sesión para consultar tus compras.',401);
  const user=(await db.query('SELECT id,email,name,whatsapp FROM store_customers WHERE id=$1 AND email=$2',[session.id,session.email])).rows[0];
  return user?send(res,{customer:user}):fail(res,'Cuenta no disponible.',401);
 }
 if(req.method==='GET'&&a==='customer-orders'){
  const session=buyerSession(req);
  if(!session)return fail(res,'Inicia sesión para consultar tus compras.',401);
  const rows=(await db.query("SELECT o.id,o.created_at,o.status,o.total_cents,o.payment_method,o.payment_reference,(o.payment_proof_path IS NOT NULL) AS proof_uploaded,coalesce((SELECT json_agg(json_build_object('title',p.title,'slug',p.slug)) FROM store_order_items i JOIN store_products p ON p.slug=i.product_slug WHERE i.order_id=o.id),'[]'::json) AS items FROM store_orders o WHERE o.customer_id=$1 ORDER BY o.created_at DESC LIMIT 100",[session.id])).rows;
  return send(res,{orders:rows});
 }
 if(req.method==='POST'&&a==='customer-claim'){
  const email=String(b.email||'').trim().toLowerCase(),whatsapp=cleanPhone(b.whatsapp),reference=String(b.reference||'').trim(),pass=String(b.password||''),name=String(b.name||'').trim().slice(0,100);
  if(!validEmail(email)||whatsapp.length<10||whatsapp.length>15||reference.length<3||reference.length>100||!validPass(pass)||name.length<3)return fail(res,'Completa los datos de tu compra y una contraseña de al menos 10 caracteres.');
  if(!await consumeAuthAttempt(req))return fail(res,'Demasiados intentos. Prueba nuevamente más tarde.',429);
  const matching=(await db.query("SELECT id FROM store_orders WHERE lower(customer_email)=$1 AND regexp_replace(customer_whatsapp,'[^0-9]','','g')=$2 AND payment_reference=$3 AND customer_id IS NULL LIMIT 1",[email,whatsapp,reference])).rows[0];
  if(!matching)return fail(res,'No encontramos una compra anterior con esos datos. Comprueba la referencia del pago.',404);
  const salt=randomBytes(20).toString('hex'),hashed=await passwordDigest(pass,salt),id=randomUUID();
  const c=await db.connect();
  try{
   await c.query('BEGIN');
   const insert=await c.query('INSERT INTO store_customers(id,email,name,whatsapp,password_salt,password_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO NOTHING RETURNING id',[id,email,name,whatsapp,salt,hashed]);
   if(!insert.rows.length){await c.query('ROLLBACK');return fail(res,'Este correo ya tiene cuenta. Inicia sesión y vincula tu compra anterior.',409);}
   const update=await c.query("UPDATE store_orders SET customer_id=$1 WHERE customer_id IS NULL AND lower(customer_email)=$2 AND regexp_replace(customer_whatsapp,'[^0-9]','','g')=$3",[id,email,whatsapp]);
   if(!update.rowCount){await c.query('ROLLBACK');return fail(res,'Compra anterior no encontrada.',404);}
   await c.query('COMMIT');
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
  setBuyerSession(res,id,email);
  return send(res,{ok:true},201);
 }
 if(req.method==='POST'&&a==='customer-link'){
  const session=buyerSession(req),phone=cleanPhone(b.whatsapp),ref=String(b.reference||'').trim();
  if(!session)return fail(res,'Primero inicia sesión.',401);
  if(phone.length<10||phone.length>15||ref.length<3||ref.length>100)return fail(res,'Introduce WhatsApp y referencia del pago anterior.');
  if(!await consumeAuthAttempt(req))return fail(res,'Demasiados intentos. Prueba nuevamente más tarde.',429);
  const proof=(await db.query("SELECT 1 FROM store_orders WHERE customer_id IS NULL AND lower(customer_email)=$1 AND regexp_replace(customer_whatsapp,'[^0-9]','','g')=$2 AND payment_reference=$3 LIMIT 1",[session.email,phone,ref])).rows[0];
  if(!proof)return fail(res,'Revisa los datos de tu compra anterior.',404);
  const update=await db.query("UPDATE store_orders SET customer_id=$1 WHERE customer_id IS NULL AND lower(customer_email)=$2 AND regexp_replace(customer_whatsapp,'[^0-9]','','g')=$3",[session.id,session.email,phone]);
  return send(res,{linked:update.rowCount});
 }
 if(req.method==='GET'&&a==='order'){
  const id=u.searchParams.get('id'),access=u.searchParams.get('access');
  const owned=await ownedOrder(req,id,access);
  if(!owned)return fail(res,'Accede a Mis compras para recuperar este pedido.',401);
  const items=(await db.query('SELECT p.slug,p.title,p.pages,p.pdf_path IS NOT NULL AS ready FROM store_order_items i JOIN store_products p ON p.slug=i.product_slug WHERE i.order_id=$1 ORDER BY p.position',[id])).rows;
  return send(res,{order:owned,items});
 }
 if(req.method==='GET'&&a==='games'){
  const id=u.searchParams.get('id'), access=u.searchParams.get('access');
  const order=await ownedOrder(req,id,access);
  if(!order||order.status!=='approved')return fail(res,'El acceso a los juegos requiere un pago verificado.',403);
  if(!process.env.STORE_GAME_ACCESS_SECRET)return fail(res,'Acceso en preparación.',503);
  const payload=Buffer.from(JSON.stringify({order:id,exp:Math.floor(Date.now()/1000)+120,nonce:randomBytes(12).toString('hex')})).toString('base64url');
  const sig=createHmac('sha256',process.env.STORE_GAME_ACCESS_SECRET).update('store-ticket:'+payload).digest('hex');
  const url='https://tusfrasesinspiradoras.vercel.app/juegos/claim?ticket='+encodeURIComponent(payload+'.'+sig);
  res.writeHead(302,{Location:url,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});return res.end();
 }
 if(req.method==='GET'&&a==='download'){
  const id=u.searchParams.get('id'),access=u.searchParams.get('access'),book=u.searchParams.get('slug');
  if(!uuid(id)||!slug(book))return fail(res,'Enlace inválido.');
  const order=await ownedOrder(req,id,access);
  if(!order||order.status!=='approved')return fail(res,'El pago requiere verificación para descargar.',403);
  const q=(await db.query('SELECT p.pdf_path FROM store_order_items i JOIN store_products p ON p.slug=i.product_slug WHERE i.order_id=$1 AND p.slug=$2',[id,book])).rows;
  if(!q.length||!q[0].pdf_path)return fail(res,'La descarga requiere un pago verificado.',403);
  // Stream paid PDF files via this trusted same-origin function.
  // Private Blob presigned GET redirects may point browsers to an inaccessible storage endpoint.
  const file=await get(q[0].pdf_path,{access:'private'});
  if(!file||file.statusCode!==200||!file.stream)return fail(res,'El archivo PDF está temporalmente indisponible.',503);
  await db.query('INSERT INTO store_download_log(order_id,product_slug) VALUES($1,$2)',[id,book]).catch(()=>{});
  res.writeHead(200,{
    'Content-Type':'application/pdf',
    'Content-Disposition':'attachment; filename="'+book+'.pdf"',
    'Cache-Control':'private, no-store, max-age=0',
    'CDN-Cache-Control':'no-store',
    'Vercel-CDN-Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer'
  });
  Readable.fromWeb(file.stream).on('error',error=>{console.error('pdf-download-stream',error.message);res.destroy(error);}).pipe(res);
  return;
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
 if(['admin-state','review','payment-settings','upload-ticket','save-asset','price','proof-image'].includes(a)){
  if(!admin(req))return fail(res,'Inicia sesión de administrador.',401);
  if(req.method==='GET'&&a==='proof-image'){
   const id=u.searchParams.get('id');
   if(!uuid(id))return fail(res,'Pedido inválido.');
   const record=(await db.query('SELECT payment_proof_path,payment_proof_mime FROM store_orders WHERE id=$1',[id])).rows[0];
   if(!record?.payment_proof_path)return fail(res,'Comprobante pendiente.',404);
   const blob=await get(record.payment_proof_path,{access:'private'});
   if(!blob||blob.statusCode!==200||!blob.stream)return fail(res,'Imagen temporalmente indisponible.',502);
   res.writeHead(200,{'Content-Type':record.payment_proof_mime||'image/jpeg','Cache-Control':'private, no-store','Content-Disposition':'inline; filename="comprobante.jpg"','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
   Readable.fromWeb(blob.stream).on('error',e=>{console.error('proof-view-stream',e.message);res.destroy(e);}).pipe(res);
   return;
  }
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
