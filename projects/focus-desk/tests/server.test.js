import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { readdir } from 'node:fs/promises';
import { createFocusDeskServer, handleRequest } from '../server.mjs';

async function browserModules() {
  const sourceDirectory = new URL('../src/', import.meta.url);
  const modules = (await readdir(sourceDirectory))
    .filter(file => file.endsWith('.js'))
    .map(file => `/src/${file}`)
    .sort();
  assert.ok(modules.length > 0, 'expected browser modules in src');
  return modules;
}

function handle(path) {
  return new Promise(resolve => {
    const response = {
      writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
      end(body) { resolve({ body: body?.toString('utf8') ?? '', headers: this.headers, statusCode: this.statusCode }); }
    };
    handleRequest({ method: 'GET', url: path }, response);
  });
}

function request(port, path) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        body: Buffer.concat(chunks).toString('utf8'),
        headers: response.headers,
        statusCode: response.statusCode
      }));
    });
    request.on('error', reject);
  });
}

test('the server routes every browser module', async () => {
  for (const modulePath of await browserModules()) {
    const response = await handle(modulePath);
    assert.equal(response.statusCode, 200, `${modulePath} should be available`);
    assert.match(response.headers['Content-Type'], /^text\/javascript;/, `${modulePath} should have a JavaScript content type`);
    assert.notEqual(response.body, '', `${modulePath} should have a response body`);
  }
});

test('the local server serves every browser module', async t => {
  const server = createFocusDeskServer();
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {
    if (error.code === 'EPERM') {
      t.skip('loopback listeners are restricted in this environment');
      return;
    }
    throw error;
  }
  t.after(() => new Promise(resolve => server.close(resolve)));

  const { port } = server.address();
  for (const modulePath of await browserModules()) {
    const response = await request(port, modulePath);
    assert.equal(response.statusCode, 200, `${modulePath} should be available`);
    assert.match(response.headers['content-type'], /^text\/javascript;/, `${modulePath} should have a JavaScript content type`);
    assert.notEqual(response.body, '', `${modulePath} should have a response body`);
  }
});
