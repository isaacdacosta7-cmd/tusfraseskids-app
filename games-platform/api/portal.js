'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {get,put,BlobPreconditionFailedError}=require('@vercel/blob');
const root=path.resolve(__dirname,'..','private');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'access-codes.json'),'utf8'));
const allowed=new Set(catalog.codes.filter(c=>c.active).map(c=>c.hash));
const SESSION_SECONDS=90*24*60*60;
function secret(){const key=process.env.TFI_ACCESS_SECRET;if(!key||key.length<40)throw Error('Access configuration missing');return key}
function digest(context,value){return crypto.createHmac('sha256',secret()).update(context+':'+value).digest('hex')}
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b))}
function cookieValue(req,name){const item=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return item?.slice(name.length+1)}
function session(req){
 try{const token=cookieValue(req,'tfi_session');if(!token||token.length>800)return null;const [body,sig]=token.split('.');if(!equal(sig,digest('session',body)))return null;
 const data=JSON.parse(Buffer.from(body,'base64url').toString());if(data.exp<Date.now()/1000||!allowed.has(data.code))return null;return data;
 }catch{return null}
}
function headers(res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('CDN-Cache-Control','no-store');res.setHeader('Vercel-CDN-Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))}
function setCookie(res,value,maxAge=SESSION_SECONDS){res.setHeader('Set-Cookie',`tfi_session=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`)}
async function body(req){
 if(Number(req.headers['content-length']||0)>1024)throw Error('body too large');
 if(req.body!==undefined){const text=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(text.length>1024)throw Error('body too large');return JSON.parse(text)}
 let text='';for await(const chunk of req){text+=chunk;if(text.length>1024)throw Error('body too large')}return JSON.parse(text||'{}');
}
async function consumeAttempt(req){
 // Durable, atomic counters across serverless instances. Raw IPs are never stored.
 const ip=process.env.VERCEL?(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown'):req.socket?.remoteAddress||'local';
 const id=digest('ip',String(ip).split(',')[0].trim()),key=`access-attempts/${id}.json`,now=Date.now();
 for(let retry=0;retry<4;retry++){
  const previous=await get(key,{access:'private',useCache:false});
  const data=previous?.statusCode===200?JSON.parse(await new Response(previous.stream).text()):{start:now,count:0,day:Math.floor(now/86400000),daily:0};
  if(now-data.start>=900000){data.start=now;data.count=0}
  if(data.day!==Math.floor(now/86400000)){data.day=Math.floor(now/86400000);data.daily=0}
  if(data.count>=8||data.daily>=60)return {limited:true,retryAfter:data.daily>=60?Math.ceil((86400000-now%86400000)/1000):Math.max(1,Math.ceil((900000-(now-data.start))/1000))};
  data.count++;data.daily++;
  try{await put(key,JSON.stringify(data),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!previous,cacheControlMaxAge:60,...(previous?{ifMatch:previous.blob.etag}:{})});return {limited:false}}
  catch(e){if(e instanceof BlobPreconditionFailedError||/already exists/i.test(e.message))continue;throw e}
 }
 return {limited:true,retryAfter:30};
}
function serve(res,file,type){res.setHeader('Content-Type',type);res.end(fs.readFileSync(file))}
module.exports=async function portal(req,res){
 headers(res);
 try{
  const url=new URL(req.url,'https://portal.local');
  const asset=String(req.query?.asset??url.searchParams.get('asset')??'');
  const action=String(req.query?.action??url.searchParams.get('action')??'');
  if(action==='enter'){
   if(req.method!=='POST')return json(res,405,{error:'Método inválido.'});
   // Require a same-origin browser request. The fetch header is also a CSRF barrier.
   const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
   if(req.headers['x-tfi-request']!=='purchase-code'||!origin||new URL(origin).host!==host)return json(res,403,{error:'Actualiza la página e inténtalo otra vez.'});
   let payload;try{payload=await body(req)}catch{return json(res,400,{error:'Escribe el código de seis caracteres.'})}
   const rate=await consumeAttempt(req);if(rate.limited){res.setHeader('Retry-After',String(rate.retryAfter));return json(res,429,{error:'Hiciste varios intentos. Espera un momento para volver a probar.',retryAfter:rate.retryAfter})}
   const code=typeof payload.code==='string'?payload.code.trim().toUpperCase():'';
   const hash=digest('purchase',code);
   if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)||!allowed.has(hash))return json(res,401,{error:'Revisa tu código de compra y vuelve a intentarlo.'});
   const data={code:hash,exp:Math.floor(Date.now()/1000)+SESSION_SECONDS,nonce:crypto.randomBytes(12).toString('hex')};
   const encoded=Buffer.from(JSON.stringify(data)).toString('base64url');setCookie(res,encoded+'.'+digest('session',encoded));return json(res,200,{ok:true});
  }
  if(action==='leave'){
   if(req.method!=='POST'||req.headers['x-tfi-request']!=='purchase-code')return json(res,405,{error:'Método inválido.'});setCookie(res,'',0);return json(res,200,{ok:true});
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Método inválido.'});
  const authed=session(req);
  if(!asset||asset==='index.html')return serve(res,path.join(root,authed?'games/index.html':'gate.html'),'text/html; charset=utf-8');
  // Whitelist filenames, reject encoded traversal and absolute paths.
  if(!authed)return json(res,401,{error:'Introduce tu código de compra para jugar.'});
  if(!/^(app\.js|samaritano\.js|jose\.js|assets\/[a-z0-9-]+\.webp)$/.test(asset))return json(res,404,{error:'Recurso inexistente.'});
  const file=path.join(root,'games',asset);if(!fs.existsSync(file))return json(res,404,{error:'Recurso inexistente.'});
  return serve(res,file,asset.endsWith('.js')?'text/javascript; charset=utf-8':'image/webp');
 }catch(e){console.error('portal_error',e.name);return json(res,503,{error:'Estamos preparando tu acceso. Inténtalo nuevamente en un momento.'})}
};
