import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
const appHtml = await readFile(new URL('../index.html', import.meta.url));
const evidenceDir = new URL('../evidence/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
let chromePath;
for (const path of candidates) {
  try { await access(path); chromePath = path; break; } catch {}
}
if (!chromePath) throw new Error('Chrome/Chromium not found. Set CHROME_PATH to its executable.');

const temp = await mkdtemp(join(tmpdir(), 'roompacker-browser-'));
const profile = join(temp, 'profile');
const server = createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(appHtml);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const url = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(chromePath, [
  '--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--remote-debugging-pipe', `--user-data-dir=${profile}`,
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });

let buffer = '';
let sequence = 0;
let sessionId;
let stderr = '';
const pending = new Map();
const errors = [];
browser.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-8000); });
browser.on('error', (error) => {
  for (const request of pending.values()) request.reject(error);
});
browser.stdio[4].on('data', (chunk) => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf('\0')) !== -1) {
    const raw = buffer.slice(0, end);
    buffer = buffer.slice(end + 1);
    if (!raw) continue;
    const message = JSON.parse(raw);
    if (message.id) {
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id);
        clearTimeout(request.timer);
        message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
      }
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails);
    } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      errors.push(message.params.entry);
    }
  }
});

function send(method, params = {}, session = sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Chrome timed out: ${method}\n${stderr}`));
    }, 60000);
    pending.set(id, { resolve, reject, timer });
    browser.stdio[3].write(`${JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) })}\0`);
  });
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression, message) {
  const started = Date.now();
  while (Date.now() - started < 60000) {
    if (await evaluate(expression)) return;
    await sleep(80);
  }
  throw new Error(`Timed out: ${message}`);
}

try {
  const version = await send('Browser.getVersion', {}, null);
  console.log(`Testing with ${version.product}`);
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, null);
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Log.enable')]);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await waitFor('document.readyState === "complete" && typeof THREE !== "undefined" && typeof pieces !== "undefined"', '3D scene initialization');
  assert.equal(await evaluate('document.title'), 'Room Packer 3D — 64³');
  assert.equal(await evaluate('Object.keys(FACES).length'), 6);
  assert.equal(await evaluate('SIZE'), 64);
  assert.equal(await evaluate('renderer.getContext().isContextLost()'), false);
  assert.equal(await evaluate('document.getElementById("btn-table").disabled'), true);

  // Use actual pointer events to place the first sofa on the top face.
  await evaluate('document.getElementById("btn-couch").click()');
  const point = await evaluate(`(() => {
    const p = faceCellCenter('top', 32, 32, 0.06).project(camera);
    const r = canvas.getBoundingClientRect();
    return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
  })()`);
  await send('Input.dispatchMouseEvent', {type:'mouseMoved', ...point});
  await send('Input.dispatchMouseEvent', {type:'mousePressed', button:'left', clickCount:1, ...point});
  await send('Input.dispatchMouseEvent', {type:'mouseReleased', button:'left', clickCount:1, ...point});
  assert.equal(await evaluate('pieces.length'), 1, 'pointer placement creates a sofa');
  assert.equal(await evaluate('pieces[0].type'), 'couch');
  await evaluate('deactivateAll(); selectPiece(pieces[0])');

  async function key(k, code) {
    await send('Input.dispatchKeyEvent', {type:'keyDown',key:k,code});
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:k,code});
  }
  const startU = await evaluate('selectedPiece.uMin');
  await key('ArrowRight','ArrowRight');
  assert.equal(await evaluate('selectedPiece.uMin'), startU+1);
  await key('w','KeyW');
  assert.equal(await evaluate('selectedPiece.floatDepth'), 1);
  await key('s','KeyS');
  assert.equal(await evaluate('selectedPiece.floatDepth'), 0);
  const dimensions = await evaluate('[selectedPiece.uMax-selectedPiece.uMin,selectedPiece.vMax-selectedPiece.vMin]');
  await key('e','KeyE');
  assert.deepEqual(await evaluate('[selectedPiece.uMax-selectedPiece.uMin,selectedPiece.vMax-selectedPiece.vMin]'), dimensions.reverse());
  await evaluate(`colorPickerEl.value='#336699'; colorPickerEl.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.equal(await evaluate('selectedPiece.color'), 0x336699);

  // Seed a deterministic pair to test merge guards and replacement independently of picking.
  const merge = await evaluate(`(() => {
    deactivateAll(); for(const p of [...pieces])deletePiece(p);
    nextColor=0x336699;
    const table=placeTable('top',20,20,22,22), chair=placeChair('top',24,20);
    const otherFace=placeChair('front',24,20);
    const crossFaceRejected=!canMerge(table,otherFace); deletePiece(otherFace);
    const samePieceRejected=!canMerge(table,table);
    selectPiece(table); const enabled=!btnMerge.disabled;
    btnMerge.click(); const entered=mergeMode; exitMergeMode();
    doMerge(table,chair);
    return {crossFaceRejected,samePieceRejected,enabled,entered,count:pieces.length,
      type:selectedPiece.type,cells:selectedPiece.cells.length,height:selectedPiece.height,color:selectedPiece.color};
  })()`);
  assert.deepEqual(merge, {crossFaceRejected:true,samePieceRejected:true,enabled:true,entered:true,count:1,type:'merged',cells:10,height:2,color:0x336699});
  await evaluate('document.getElementById("face-front").click()');
  assert.equal(await evaluate('activeFace'), 'front');
  await evaluate('document.getElementById("face-top").click(); selectPiece(pieces[0])');
  await key('d','KeyD');
  assert.equal(await evaluate('pieces.length'), 0);
  await evaluate('btnChaos.click()');
  assert.equal(await evaluate('chaosMode'), true);
  await evaluate('btnChaos.click()');
  assert.equal(await evaluate('chaosMode'), false);
  assert.deepEqual(errors, [], 'no uncaught JavaScript or console errors');

  await evaluate("nextColor=0xe07b54; selectPiece(placeTable('top',28,28,36,34)); nextColor=0x5b9bd5; placeCouch('top',39,28,42,29,'h'); refreshAllColors(); renderer.render(scene,camera)");
  const shot = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
  await writeFile(new URL('browser-desktop.png',evidenceDir), Buffer.from(shot.data,'base64'));
  await writeFile(new URL('browser-smoke.json',evidenceDir), JSON.stringify({
    status:'passed', browser:version.product, checks:[
      'six 64-by-64 faces and live WebGL context','sofa placement via pointer events',
      'arrow movement','outward/inward floating','quarter-turn rotation','color-picker input',
      'merge self/cross-face rejection and same-color eligibility','merge replacement, union and maximum height',
      'face switching','deletion','Chaos toggle','no JavaScript or console errors'
    ], limitations:['Desktop smoke coverage only; Chaos timing, game-over paths and every furniture shape are not exhaustively tested.'], errors
  },null,2)+'\n');
  console.log('Roompacker browser smoke checks passed; evidence/browser-smoke.json and browser-desktop.png written.');

} catch (error) {
  console.error('Captured browser errors:', JSON.stringify(errors, null, 2));
  throw error;
} finally {
  for (const request of pending.values()) clearTimeout(request.timer);
  browser.kill('SIGTERM');
  await Promise.race([once(browser, 'exit'), sleep(3000)]);
  if (browser.exitCode === null && browser.signalCode === null) browser.kill('SIGKILL');
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }).catch(() => {});
}
