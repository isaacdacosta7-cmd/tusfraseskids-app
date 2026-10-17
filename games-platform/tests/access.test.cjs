const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..'),secret='test-only-secret-with-at-least-forty-characters',validCode='ABC234';
function fixture(){
 const records=new Map();let version=0;
 class BlobPreconditionFailedError extends Error{}
 const codeHash=crypto.createHmac('sha256',secret).update('purchase:'+validCode).digest('hex');
 const storage={BlobPreconditionFailedError,get:async k=>{const value=records.get(k);return value?{statusCode:200,stream:new Response(value.body).body,blob:{etag:value.etag}}:null},put:async(k,body,o)=>{const value=records.get(k);if(value&&(!o.allowOverwrite||value.etag!==o.ifMatch))throw new BlobPreconditionFailedError();records.set(k,{body,etag:String(++version)})}};
 const mockedFs={...fs,readFileSync:(p,encoding)=>String(p).endsWith('access-codes.json')?JSON.stringify({codes:[{hash:codeHash,active:true}]}):fs.readFileSync(p,encoding)};
 const sandbox={require:n=>n==='@vercel/blob'?storage:n==='node:fs'?mockedFs:require(n),process:{env:{TFI_ACCESS_SECRET:secret},cwd:()=>root},module:{exports:{}},Buffer,Response,URL,console:{error:()=>{}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'api/portal.js'),'utf8'),sandbox);
 async function request({action='',asset='',code=validCode,cookie='',method='POST',origin='https://test.local',marker='purchase-code'}={}){
  const headers={host:'test.local',origin,'x-tfi-request':marker,cookie};const req={url:'/api/portal',query:{action,asset},headers,method,body:{code},socket:{remoteAddress:'127.0.0.1'}};
  const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k.toLowerCase()]=v},end(body){this.body=body}};await sandbox.module.exports(req,res);return res;
 }
 return {request,records};
}
test('private game assets require a valid signed session',async()=>{
 const {request}=fixture();assert.equal((await request({asset:'app.js',method:'GET'})).statusCode,401);
 const login=await request({action:'enter'});assert.equal(login.statusCode,200);const cookie=login.headers['set-cookie'];assert.match(cookie,/HttpOnly; Secure; SameSite=Lax/);
 const authorized=await request({asset:'app.js',method:'GET',cookie});assert.equal(authorized.statusCode,200);assert.match(authorized.headers['cache-control'],/no-store/);
 const token=cookie.split(';')[0],tampered=token.replace('tfi_session=','tfi_session=x');assert.equal((await request({asset:'app.js',method:'GET',cookie:tampered})).statusCode,401);
 assert.equal((await request({asset:'../access-codes.json',method:'GET',cookie})).statusCode,404);
});
test('invalid and cross-origin codes never create sessions',async()=>{
 const {request}=fixture();const bad=await request({action:'enter',code:'ZZZ999'});assert.equal(bad.statusCode,401);assert.equal(bad.headers['set-cookie'],undefined);
 assert.equal((await request({action:'enter',origin:'https://other.local'})).statusCode,403);assert.equal((await request({action:'enter',marker:''})).statusCode,403);
});
test('attempt budget survives independent requests',async()=>{
 const {request,records}=fixture();for(let i=0;i<8;i++)assert.equal((await request({action:'enter',code:'ZZZ999'})).statusCode,401);
 const result=await request({action:'enter'});assert.equal(result.statusCode,429);assert.ok(Number(result.headers['retry-after'])>0);assert.equal(records.size,1);
 const stored=[...records.values()][0].body;assert.equal(stored.includes('127.0.0.1'),false);assert.equal(stored.includes(validCode),false);
});
test('conditional writes cannot exceed budget under concurrent requests',async()=>{
 const {request}=fixture();const results=await Promise.all(Array.from({length:20},()=>request({action:'enter'})));assert.ok(results.filter(r=>r.statusCode===200).length<=8);assert.ok(results.some(r=>r.statusCode===429));
});
