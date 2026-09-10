const test = require('node:test');
const assert = require('node:assert/strict');
const { getRecommendations } = require('./recommender');
const { SYMPTOM_RECOMMENDATIONS } = require('./medical-data');
const { createServer, medicines } = require('../../server');

test('headache: "I have a headache" recommends real catalog medicines', () => {
  const outcome = getRecommendations('I have a headache', medicines);
  assert.equal(outcome.status, 'ok');
  assert.deepEqual(outcome.interpretedSymptoms, ['headache']);
  assert.deepEqual(outcome.recommendations.map((r) => r.medicineId), SYMPTOM_RECOMMENDATIONS.headache.medicineIds);
  assert.ok(outcome.disclaimer.length > 0);
});

test('"my head hurts" is understood as a headache without the word "headache"', () => {
  const outcome = getRecommendations('my head hurts', medicines);
  assert.equal(outcome.status, 'ok');
  assert.deepEqual(outcome.interpretedSymptoms, ['headache']);
});

test('fever: "I have fever" recommends real catalog medicines', () => {
  const outcome = getRecommendations('I have fever', medicines);
  assert.equal(outcome.status, 'ok');
  assert.deepEqual(outcome.interpretedSymptoms, ['fever']);
  assert.deepEqual(outcome.recommendations.map((r) => r.medicineId), SYMPTOM_RECOMMENDATIONS.fever.medicineIds);
});

test('Arabic symptom phrases are understood', () => {
  const headache = getRecommendations('عندي صداع', medicines);
  assert.equal(headache.status, 'ok');
  assert.deepEqual(headache.interpretedSymptoms, ['headache']);

  const fever = getRecommendations('عندي حرارة', medicines);
  assert.equal(fever.status, 'ok');
  assert.deepEqual(fever.interpretedSymptoms, ['fever']);
});

test('multiple symptoms in one message are all interpreted, with no duplicate medicine IDs', () => {
  const outcome = getRecommendations('I have a headache and fever', medicines);
  assert.equal(outcome.status, 'ok');
  assert.deepEqual(outcome.interpretedSymptoms, ['headache', 'fever']);

  const ids = outcome.recommendations.map((r) => r.medicineId);
  assert.equal(new Set(ids).size, ids.length, 'medicine IDs should not repeat across merged symptoms');
  // brufen-400-30 is listed under both headache and fever - it must appear once.
  assert.equal(ids.filter((id) => id === 'brufen-400-30').length, 1);
});

test('an unknown/vague message does not invent a recommendation', () => {
  const vague = getRecommendations('I feel weird and something is wrong', medicines);
  assert.equal(vague.status, 'needs_more_information');
  assert.equal(vague.recommendations, undefined);

  const nonsense = getRecommendations('xyz disease abc', medicines);
  assert.equal(nonsense.status, 'needs_more_information');

  const empty = getRecommendations('', medicines);
  assert.equal(empty.status, 'needs_more_information');
});

test('red flags return an urgent status instead of a medicine recommendation', () => {
  const outcome = getRecommendations('Sudden severe headache and confusion', medicines);
  assert.equal(outcome.status, 'urgent');
  assert.equal(outcome.recommendations, undefined);
  assert.match(outcome.message, /urgent/i);
});

test('red flags win even when an ordinary symptom is also mentioned', () => {
  const outcome = getRecommendations('I have a headache and chest pain', medicines);
  assert.equal(outcome.status, 'urgent');
});

test('catalog integrity: every recommended medicine ID exists in the real catalog', () => {
  const catalogIds = new Set(medicines.map((medicine) => medicine.id));
  for (const entry of Object.values(SYMPTOM_RECOMMENDATIONS)) {
    for (const medicineId of entry.medicineIds) {
      assert.ok(catalogIds.has(medicineId), `${medicineId} in medical-data.js is not a real catalog medicine`);
    }
  }

  const outcomes = [
    getRecommendations('I have a headache', medicines),
    getRecommendations('I have fever', medicines),
    getRecommendations('cold and runny nose', medicines)
  ];
  for (const outcome of outcomes) {
    assert.equal(outcome.status, 'ok');
    for (const recommendation of outcome.recommendations) {
      assert.ok(catalogIds.has(recommendation.medicineId));
    }
  }
});

// --- endpoint integration: recommendation -> medicine ID -> real offers ----

test('POST /api/assistant/recommend returns real pharmacy/branch/offer data for a headache', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/assistant/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'I have a headache' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.deepEqual(body.interpretedSymptoms, ['headache']);
  assert.ok(body.recommendations.length > 0);
  assert.match(body.disclaimer, /not a diagnosis/i);

  const recommendedIds = body.recommendations.map((r) => r.medicineId);
  assert.deepEqual(body.pharmacyResults.map((result) => result.id).sort(), [...recommendedIds].sort());

  for (const result of body.pharmacyResults) {
    assert.ok(Array.isArray(result.offers) && result.offers.length > 0, `${result.id} should carry real offer data`);
    for (const offer of result.offers) {
      assert.equal(typeof offer.pharmacy, 'string');
      assert.equal(typeof offer.branch, 'string');
      assert.equal(typeof offer.price, 'number');
      assert.equal(typeof offer.available, 'boolean');
      assert.ok(offer.branchInfo, 'offer should carry the same branchInfo /api/medicines returns');
    }
    // The recommender must never invent these fields itself.
    assert.equal(result.pharmacy, undefined);
    assert.equal(result.price, undefined);
  }
});

test('POST /api/assistant/recommend returns urgent status without recommendations for red flags', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/assistant/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Sudden severe headache and confusion' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'urgent');
  assert.equal(body.recommendations, undefined);
  assert.equal(body.pharmacyResults, undefined);
});

test('POST /api/assistant/recommend requires a non-empty message', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/assistant/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '   ' })
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /message is required/);
});
