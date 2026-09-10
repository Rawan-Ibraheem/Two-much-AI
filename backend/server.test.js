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

test('nearest sorting uses the optional user location', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?sort=nearest&lat=30.038&lon=31.212`);
  const body = await response.json();
  const firstOffer = body.results[0].offers[0];

  assert.equal(response.status, 200);
  assert.deepEqual(body.location, { latitude: 30.038, longitude: 31.212 });
  assert.equal(body.results[0].name, 'Panadol Extra');
  assert.ok(firstOffer.distanceKm < 1);
});

test('search rejects incomplete or invalid coordinates', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?lat=91&lon=31`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'lat and lon must be valid geographic coordinates.'
  });
});

test('pharmacy research returns nearby source and freshness metadata', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/research/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'paracetamol',
      location: { latitude: 30.038, longitude: 31.212 },
      radiusKm: 2
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, 'research');
  assert.equal(body.results.length, 2);
  assert.ok(body.results.every((result) => result.offers.length > 0));
  assert.equal(body.results[0].offers[0].source.connector, 'mock-public-catalog');
  assert.equal(body.results[0].offers[0].source.verificationStatus, 'unverified');
  assert.ok(body.results[0].offers[0].checkedAt);
});

test('pharmacy research requires a valid location and radius', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/research/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Panadol', location: { latitude: 30, longitude: 31 }, radiusKm: 100 })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'radiusKm must be between 0 and 50.' });
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