const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./server');

test('health endpoint reports a running API', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'medicine-search-api'
  });
});

test('medicine search filters by name or ingredient', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?q=paracetamol`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.count, 2);
  assert.deepEqual(body.results.map((medicine) => medicine.id), [
    'panadol-extra-500',
    'congestal-20'
  ]);
});

test('unknown routes return a JSON 404', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Route not found.' });
});