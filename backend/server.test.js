const test = require('node:test');
const assert = require('node:assert/strict');
// Keep the suite offline and deterministic: no live Claude calls from tests.
process.env.AI_ASSIST = 'off';
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
  assert.equal(body.count, 3);
  assert.deepEqual(body.results.map((medicine) => medicine.id), [
    'panadol-extra-500',
    'congestal-20',
    'panadol-advance-24'
  ]);
  assert.equal(body.sort, 'best-match');
  assert.equal(body.availableOnly, false);
});

test('medicine search supports Arabic aliases and English misspellings', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const arabicResponse = await fetch(`http://127.0.0.1:${port}/api/medicines?q=بانادول%20إكسترا`);
  const arabicBody = await arabicResponse.json();
  const typoResponse = await fetch(`http://127.0.0.1:${port}/api/medicines?q=paracetmol`);
  const typoBody = await typoResponse.json();

  assert.equal(arabicBody.originalQuery, 'بانادول إكسترا');
  assert.equal(arabicBody.query, 'بانادول اكسترا');
  assert.deepEqual(arabicBody.results.map((medicine) => medicine.id), ['panadol-extra-500']);
  assert.deepEqual(typoBody.results.map((medicine) => medicine.id), [
    'panadol-extra-500',
    'congestal-20',
    'panadol-advance-24'
  ]);
});

test('empty search explains that live connectors are not active', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?q=medicine-that-does-not-exist`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.count, 0);
  assert.equal(body.dataStatus, 'catalog_only_no_match');
  assert.match(body.nextStep, /approved source or API/);
});

test('expanded mock catalog searches medicines beyond the original demo records', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?q=amoxicillin%20500`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.results.map((medicine) => medicine.id), ['amoxicillin-500-21']);
  assert.equal(body.results[0].offers[0].pharmacy, 'El Ezaby');
});

test('medicine search supports cheapest sorting and available-only filtering', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?sort=cheapest&availableOnly=true`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.results[0].id, 'omeprazole-20-14');
  assert.equal(body.results.length, 15);
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
  assert.equal(body.results.length, 3);
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

test('OCR analysis extracts bilingual medicines and keeps unmatched lines for review', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/ocr/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'receipt.txt',
      mimeType: 'text/plain',
      text: 'Panadol Extra 24 tablets\nبانادول اكسترا\nUnknown medicine'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.analysisStatus, 'ready_for_confirmation');
  assert.deepEqual(body.requests.map((request) => request.medicineId), ['panadol-extra-500']);
  assert.equal(body.requests[0].needsReview, true);
  assert.deepEqual(body.unmatchedLines, ['Unknown medicine']);
});

test('OCR analysis requires image data for image receipts', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/ocr/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'receipt.jpg', mimeType: 'image/jpeg', text: 'Panadol Extra' })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Image data is required/);
});

test('unknown routes return a JSON 404', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Route not found.' });
});

// --- contract the React frontend depends on ---------------------------------

test('every offer carries the branch metadata the frontend renders', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?q=panadol`);
  const body = await response.json();
  assert.ok(body.results.length > 0);

  for (const medicine of body.results) {
    // Display fields the UI shows as their own chips.
    assert.equal(typeof medicine.strength, 'string');
    assert.match(medicine.arabicName, /[؀-ۿ]/);

    for (const offer of medicine.offers) {
      assert.ok(offer.branchInfo, `${offer.pharmacy}/${offer.branch} has no branchInfo`);
      assert.equal(typeof offer.branchInfo.phone, 'string');
      assert.match(offer.branchInfo.mapsUrl, /^https:\/\/www\.google\.com\/maps/);
      assert.match(offer.branchInfo.pharmacyUrl, /^https?:\/\//);
      assert.equal(typeof offer.branchInfo.city, 'string');
      // Demo data must never claim to be freshly verified.
      assert.equal(offer.branchInfo.verificationStatus, 'unverified');
    }
  }
});

test('search responses label the data as unverified demo stock', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const body = await (await fetch(`http://127.0.0.1:${port}/api/medicines?q=panadol`)).json();
  assert.equal(body.dataSource, 'demo_catalog');
  assert.match(body.freshnessNote, /not live-verified/i);
});

test('freshest sorting orders products by their most recent check', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const body = await (await fetch(`http://127.0.0.1:${port}/api/medicines?q=&sort=freshest`)).json();
  assert.equal(body.sort, 'freshest');

  const freshness = body.results.map((medicine) =>
    Math.max(...medicine.offers.map((offer) => Date.parse(offer.lastChecked)))
  );
  const sorted = [...freshness].sort((left, right) => right - left);
  assert.deepEqual(freshness, sorted);
});

test('cheapest and nearest sorting produce genuinely different orders', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const location = 'lat=30.0488&lon=31.2016'; // on top of the Mohandessin branch

  const cheapest = await (await fetch(`http://127.0.0.1:${port}/api/medicines?q=paracetamol&sort=cheapest&${location}`)).json();
  const nearest = await (await fetch(`http://127.0.0.1:${port}/api/medicines?q=paracetamol&sort=nearest&${location}`)).json();

  const cheapestPrices = cheapest.results.map((medicine) => Math.min(...medicine.offers.map((offer) => offer.price)));
  assert.deepEqual(cheapestPrices, [...cheapestPrices].sort((a, b) => a - b));

  const nearestDistances = nearest.results.map((medicine) => Math.min(...medicine.offers.map((offer) => offer.distanceKm)));
  assert.deepEqual(nearestDistances, [...nearestDistances].sort((a, b) => a - b));
  // Distances are recomputed from the supplied coordinates, not the canned values.
  assert.ok(nearestDistances[0] < 0.5, `expected a near-zero distance, got ${nearestDistances[0]}`);
});

test('AI assist reports itself disabled rather than failing the search', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const body = await (await fetch(`http://127.0.0.1:${port}/api/medicines?q=zzzqqqxxx`)).json();
  assert.equal(body.count, 0);
  assert.equal(body.dataStatus, 'catalog_only_no_match');
  assert.equal(body.aiAssist.status, 'disabled');
});