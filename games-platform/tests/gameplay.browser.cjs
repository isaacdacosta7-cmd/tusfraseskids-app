const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const legacy=path.resolve(__dirname,'..'),source=legacy+'/private/games',base=process.env.TFI_QA_DIR||path.join(require('node:os').tmpdir(),'tfi-gameplay-qa');fs.mkdirSync(base+'/qa',{recursive:true});
const remote=process.env.TEST_URL;
(async()=>{
 let server;
 if(!remote){server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://local').pathname;let file;
  if(p==='/juegos'||p==='/juegos/')file=source+'/index.html';else if(p==='/juegos/app.js')file=source+'/app.js';else if(p==='/modern.css')file=legacy+'/public/modern.css';else if(p.startsWith('/juegos/'))file=legacy+'/private/games/'+p.slice(8);else file=legacy+'/public'+p;
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.statusCode=404;res.end();return}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.webp')?'image/webp':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(fs.readFileSync(file));
 });await new Promise(resolve=>server.listen(8767,'127.0.0.1',resolve));}
 const url=remote||'http://127.0.0.1:8767/juegos',proxy=remote&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
 const browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),headless:true,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer'],...(proxy?{proxy:{server:proxy}}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:!!proxy}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  let timestamp=0,nextId=0;const frames=new Map();window.requestAnimationFrame=cb=>{frames.set(++nextId,cb);return nextId};window.cancelAnimationFrame=id=>frames.delete(id);
  window.__stepFrame=(delta=1000/60)=>{timestamp+=delta;const pending=[...frames.values()];frames.clear();for(const cb of pending)cb(timestamp)};
  window.__frames=()=>frames.size;Math.random=()=>.5;localStorage.setItem('aventuras-sound','off');
 });
 await page.goto(url,{waitUntil:'networkidle'});
 if(remote){await page.fill('#purchase-code',process.env.TFI_TEST_CODE||'');await page.click('#access-form button');await page.waitForSelector('#app');}
 await page.evaluate(()=>{progress={};save();localStorage.removeItem('aventuras-boat-records-v1')});
 const correct={david:['En Dios','Cinco','Lisas, tomadas del arroyo'],jesus:['Jesús resucitó','A los discípulos','El domingo, primer día de la semana']};
 const questions={david:[/En quién confió/,/Cuántas piedras/,/Cómo eran las piedras/],jesus:[/Qué anunció/,/A quiénes llevaron/,/Qué día de la semana/]};
 for(const story of ['david','jesus']){
  const seen=[];
  for(let level=1;level<=3;level++){
   await page.evaluate(({story,level})=>{storyScreen(story);startGame(story+'-order',level)},{story,level});
   await page.click('[data-choose="1"]');assert.match(await page.locator('#feedback').innerText(),/ocurrió antes/);
   for(let i=0;i<[3,4,6][level-1];i++)await page.click(`[data-choose="${i}"]`);
   await page.waitForSelector('[data-answer]');const q=await page.locator('#instruction').innerText();assert.match(q,questions[story][level-1]);seen.push(q);
   assert.match(await page.locator('#stats').innerText(),new RegExp('nivel '+level));assert.equal(await page.locator('[data-answer]').count(),3);
   const answer=correct[story][level-1],wrong=page.locator('[data-answer]').filter({hasNotText:answer}).first();await wrong.click();assert.match(await page.locator('#feedback').innerText(),/vuelve a intentar/);
   await page.click('#hint');assert.equal(await page.locator('[data-answer]:disabled').count(),1);
   if(level===3)await page.screenshot({path:base+'/qa/'+story+'-new-question.png',fullPage:true});
   await page.locator('[data-answer]').filter({hasText:answer}).click();await page.waitForSelector('.win-panel');assert.equal(await page.locator('[data-answer]').count(),0);assert.match(await page.locator('.eyebrow').innerText(),new RegExp('Nivel '+level));
   console.log('PASS one distinct question, wrong answer, hint, completion:',story,level);
  }
  assert.equal(new Set(seen).size,3);
 }
 function advance(ms){return page.evaluate(ms=>{for(let i=0;i<Math.ceil(ms/(1000/60));i++)__stepFrame()},ms)}
 function autopilot(ms){return page.evaluate(ms=>{
  for(let i=0;i<Math.ceil(ms/(1000/60));i++){
   if(!document.querySelector('.sea-board'))break;
   const approaching=[...document.querySelectorAll('.sea-object')].filter(el=>parseFloat(el.style.top)<91&&parseFloat(el.style.top)>10).sort((a,b)=>parseFloat(b.style.top)-parseFloat(a.style.top))[0];
   const target=approaching?.dataset.kind==='ring'?.5:.09;
   for(let j=0;j<8;j++){const boat=document.querySelector('.boat-player'),x=parseFloat(boat.style.left)/100;if(Math.abs(x-target)<.07)break;document.querySelector(x>target?'#boat-left':'#boat-right').click()}
   __stepFrame();
  }
 },ms)}
 await page.evaluate(()=>{storyScreen('jonas');startGame('jonas-boat',1)});
 assert.equal(await page.locator('#boat-pause').isDisabled(),true);
 await page.click('#boat-right');assert.equal(await page.locator('.boat-player').evaluate(e=>e.style.left),'50%');
 await page.focus('#sail-start');await page.keyboard.press('Space');assert.equal(await page.locator('#sail-start').count(),0);
 await autopilot(125000);assert.ok(Number(await page.locator('#boat-score').innerText())>90);assert.equal(await page.locator('#boat-lives').getAttribute('aria-label'),'3 de 3 vidas');assert.equal(await page.locator('.boat-summary').count(),0);
 const before=await page.locator('#boat-score').innerText();assert.equal(await page.locator('#boat-best').innerText(),before);
 await page.click('#boat-pause');const frozen=await page.locator('.sea-object').evaluateAll(els=>els.map(el=>el.style.top));await advance(10000);assert.deepEqual(await page.locator('.sea-object').evaluateAll(els=>els.map(el=>el.style.top)),frozen);
 const x=await page.locator('.boat-player').evaluate(e=>e.style.left);await page.keyboard.down('ArrowRight');await advance(2000);await page.keyboard.up('ArrowRight');assert.equal(await page.locator('.boat-player').evaluate(e=>e.style.left),x);
 await page.click('#boat-pause');await page.keyboard.down('ArrowRight');await advance(300);await page.keyboard.up('ArrowRight');assert.notEqual(await page.locator('.boat-player').evaluate(e=>e.style.left),x);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.locator('#boat-pause').innerText(),'Continuar');await page.click('#boat-pause');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden});assert.equal(await page.locator('#boat-pause').innerText(),'Continuar');await page.click('#boat-pause');
 await page.screenshot({path:base+'/qa/boat-endless-mobile.png',fullPage:true});
 // Keep the boat in the shared object lane until exactly three lives are lost.
 const hits=await page.evaluate(()=>{
  const history=[3];for(let i=0;i<2400;i++){
   const boat=document.querySelector('.boat-player');if(!boat)break;
   for(let k=0;k<8;k++){const x=parseFloat(boat.style.left)/100;if(Math.abs(x-.5)<.07)break;document.querySelector(x>.5?'#boat-left':'#boat-right').click()}
   __stepFrame();const lives=document.querySelector('#boat-lives');if(lives){const n=Number(lives.getAttribute('aria-label')[0]);if(n!==history.at(-1))history.push(n)}else history.push(0);
  }return history;
 });assert.deepEqual(hits,[3,2,1,0]);await page.waitForSelector('.boat-summary');assert.equal(await page.evaluate(()=>__frames()),0);assert.ok(Number(await page.locator('.boat-result-grid strong').first().innerText())>=Number(before));
 await page.screenshot({path:base+'/qa/boat-result-mobile.png',fullPage:true});
 const best=await page.locator('.boat-result-grid strong').nth(1).innerText();await page.click('#boat-replay');assert.equal(await page.locator('#boat-score').innerText(),'0');assert.equal(await page.locator('#boat-best').innerText(),best);assert.equal(await page.locator('#boat-lives').getAttribute('aria-label'),'3 de 3 vidas');
 await page.click('#sail-start');await autopilot(15000);await page.click('#restart');assert.equal(await page.locator('#boat-score').innerText(),'0');assert.equal(await page.evaluate(()=>__frames()),1);
 await page.reload();await page.waitForSelector('#app');await page.evaluate(()=>startGame('jonas-boat',1));assert.equal(await page.locator('#boat-best').innerText(),best);
 for(const level of [2,3]){
  await page.evaluate(l=>{progress['jonas-boat:'+(l-1)]=true;startGame('jonas-boat',l)},level);assert.equal(await page.locator('#boat-score').innerText(),'0');assert.equal(await page.locator('#boat-best').innerText(),'0');await page.click('#sail-start');await autopilot(90000);assert.ok(Number(await page.locator('#boat-score').innerText())>90);assert.equal(await page.locator('#boat-lives').getAttribute('aria-label'),'3 de 3 vidas');assert.ok(await page.locator('.sea-object').count()<30);
 }
 await page.click('#back');assert.equal(await page.evaluate(()=>__frames()),0);await advance(20000);assert.equal(await page.locator('.story-banner').count(),1);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});await page.evaluate(()=>startGame('jonas-boat',1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('PASS endless scoring beyond previous limits in all 3 modes; three lives; saved per-mode records; pause, visibility, keyboard, restart, cleanup and 320–1280px layouts');
 await browser.close();server?.close();
})().catch(e=>{console.error(e);process.exit(1)});
