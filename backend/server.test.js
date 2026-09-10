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
  assert.equal(body.sort, 'best-match');
  assert.equal(body.availableOnly, false);
});

test('medicine search supports cheapest sorting and available-only filtering', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?sort=cheapest&availableOnly=true`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.results.map((medicine) => medicine.id), [
    'congestal-20',
    'panadol-extra-500',
    'vitamin-d3-30'
  ]);
  assert.ok(body.results.every((medicine) => medicine.offers.every((offer) => offer.available)));
});

test('coverage identifies a pharmacy branch with every requested medicine', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/search/coverage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: ['panadol-extra-500', 'congestal-20'] })
  });
  const body = await response.json();
  const completeCandidate = body.candidates.find((candidate) => candidate.complete);

  assert.equal(response.status, 200);
  assert.equal(completeCandidate.pharmacy, 'El Ezaby');
  assert.equal(completeCandidate.branch, 'Dokki');
  assert.equal(completeCandidate.totalPrice, 133);
});

test('coverage rejects unknown medicine IDs', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/search/coverage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: ['does-not-exist'] })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'Unknown medicine IDs.',
    unknownIds: ['does-not-exist']
  });
});

test('unknown routes return a JSON 404', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Route not found.' });
});