import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createServer } from '../server.js';

test('local server serves the app with correct types and confines requests to public files', async (t) => {
  const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const [path,type] of [['/','text/html'],['/styles.css','text/css'],['/js/game.js','text/javascript'],['/js/renderer.js','text/javascript'],['/js/world.js','text/javascript'],['/favicon.svg','image/svg+xml']]){
    const response=await fetch(base+path);assert.equal(response.status,200,path);assert.ok(response.headers.get('content-type').startsWith(type));assert.ok((await response.text()).length>50);
  }
  const head=await fetch(base,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  const missing=await fetch(`${base}/missing.js`);assert.equal(missing.status,404);
  const post=await fetch(base,{method:'POST'});assert.equal(post.status,405);assert.equal(post.headers.get('allow'),'GET, HEAD');
  const bad=await fetch(`${base}/%ZZ`);assert.equal(bad.status,400);
  const traversal=await new Promise((resolve,reject)=>{
    http.get(`${base}/..%2fpackage.json`,response=>{response.resume();resolve(response.statusCode);}).on('error',reject);
  });
  assert.equal(traversal,403);
});