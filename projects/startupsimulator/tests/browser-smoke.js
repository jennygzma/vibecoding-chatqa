import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../server.js';

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

const temp = await mkdtemp(join(tmpdir(), 'startup-simulator-browser-'));
const profile = join(temp, 'profile');
const server = createServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const url = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(chromePath, [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
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
    }, 20000);
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
  while (Date.now() - started < 15000) {
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
  await waitFor('document.readyState === "complete" && document.querySelector("canvas")?.width > 0', 'game initialization');
  await sleep(500);

  assert.equal(await evaluate('document.title'), 'Zero to One');
  assert.equal(await evaluate('document.querySelector("#hud-day").textContent'), 'DAY 1 / 10');
  assert.equal(await evaluate('document.querySelector("#energy-value").textContent'), '80');
  assert.equal(await evaluate('document.querySelector("#elec-value").textContent'), '100');
  assert.equal(await evaluate('document.querySelector("#money-value").textContent'), '$0');
  assert.equal(await evaluate('document.querySelectorAll("[data-task]").length'), 7);

  await evaluate('document.querySelector("#pause-button").click()');
  assert.equal(await evaluate('document.querySelector("#pause-overlay").hidden'), false);
  await evaluate('document.querySelector("#resume-button").click()');
  assert.equal(await evaluate('document.querySelector("#pause-overlay").hidden'), true);

  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD' });
  assert.match(await evaluate('document.querySelector("#toast").textContent'), /Bust a move/);
  assert.deepEqual(errors, [], 'no uncaught JavaScript or console errors');

  const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const screenshot = join(temp, 'startup-simulator.png');
  await writeFile(screenshot, Buffer.from(image.data, 'base64'));
  console.log(`Screenshot: ${screenshot}`);
  console.log('All browser smoke checks passed.');
} finally {
  for (const request of pending.values()) clearTimeout(request.timer);
  browser.kill('SIGTERM');
  await Promise.race([once(browser, 'exit'), sleep(3000)]);
  if (browser.exitCode === null && browser.signalCode === null) browser.kill('SIGKILL');
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }).catch(() => {});
}
