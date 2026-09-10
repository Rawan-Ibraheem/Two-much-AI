const test = require('node:test');
const assert = require('node:assert/strict');
const { matchMedicine } = require('./medicine-matcher');
const { createServer, medicines } = require('../server');

test('exact English name resolves with full confidence', () => {
  const match = matchMedicine('Panadol Extra', medicines);
  assert.deepEqual(match, {
    medicineId: 'panadol-extra-500',
    medicineName: 'Panadol Extra',
    confidence: 1,
    matchType: 'exact'
  });
});

test('Arabic alias already in the catalog resolves to the same medicine', () => {
  const match = matchMedicine('بانادول اكسترا', medicines);
  assert.equal(match.medicineId, 'panadol-extra-500');
  assert.equal(match.matchType, 'alias');
  assert.ok(match.confidence >= 0.9);

  // A different alef-hamza spelling normalizes to the same alias.
  const hamzaVariant = matchMedicine('بانادول إكسترا', medicines);
  assert.equal(hamzaVariant.medicineId, 'panadol-extra-500');
});

test('Franco Arabic spelling resolves via deterministic fuzzy matching', () => {
  const match = matchMedicine('banadol', medicines);
  assert.equal(match.medicineId, 'panadol-extra-500');
  assert.equal(match.matchType, 'fuzzy');
  assert.ok(match.confidence > 0 && match.confidence < 1);
});

test('a realistic misspelling still resolves to the intended medicine', () => {
  const match = matchMedicine('klaritin', medicines); // Claritin, phonetic typo
  assert.equal(match.medicineId, 'claritin-10-10');
  assert.equal(match.matchType, 'fuzzy');
});

test('brand typo plus strength resolves to the matching-strength record', () => {
  const match = matchMedicine('Nexiam 40', medicines);
  assert.equal(match.medicineId, 'nexium-40-14');
  assert.equal(match.matchType, 'strength');

  const bareStrength = matchMedicine('nexium 40', medicines);
  assert.equal(bareStrength.medicineId, 'nexium-40-14');
});

test('generic/active ingredient queries resolve to the medicine that contains them', () => {
  const exactIngredient = matchMedicine('Metronidazole 500mg', medicines);
  assert.equal(exactIngredient.medicineId, 'flagyl-500-20');
  assert.equal(exactIngredient.matchType, 'ingredient');

  // Not listed as a brand alias, only present inside the ingredient string.
  const partialIngredient = matchMedicine('diclofenac potassium', medicines);
  assert.equal(partialIngredient.medicineId, 'cataflam-50-20');
  assert.equal(partialIngredient.matchType, 'ingredient');
});

test('an unknown medicine returns no result instead of guessing', () => {
  assert.equal(matchMedicine('completely unknown medicine xyz', medicines), null);
  assert.equal(matchMedicine('', medicines), null);
  assert.equal(matchMedicine('   ', medicines), null);
});

test('every match returned by the matcher maps to a real catalog record', () => {
  const queries = ['Panadol Extra', 'بانادول اكسترا', 'banadol', 'klaritin', 'Nexiam 40', 'Metronidazole 500mg'];
  for (const query of queries) {
    const match = matchMedicine(query, medicines);
    assert.ok(match, `expected a match for "${query}"`);
    assert.ok(medicines.some((medicine) => medicine.id === match.medicineId), `"${match.medicineId}" is not a real catalog ID`);
    assert.ok(match.confidence > 0 && match.confidence <= 1);
  }
});

// --- regression: the existing search endpoint keeps returning full offer data ---

test('regression: /api/medicines still returns pharmacy/branch/offer data for a matcher-resolved medicine', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const { port } = server.address();

  const match = matchMedicine('Nexiam 40', medicines);
  assert.equal(match.medicineId, 'nexium-40-14');

  const response = await fetch(`http://127.0.0.1:${port}/api/medicines?q=${encodeURIComponent('nexiam 40')}`);
  const body = await response.json();

  assert.equal(response.status, 200);
  const resolved = body.results.find((medicine) => medicine.id === match.medicineId);
  assert.ok(resolved, 'matcher-resolved medicine should be present in the search results');
  assert.ok(resolved.offers.length > 0, 'resolved medicine should carry offer data');
  for (const offer of resolved.offers) {
    assert.equal(typeof offer.pharmacy, 'string');
    assert.equal(typeof offer.branch, 'string');
    assert.equal(typeof offer.price, 'number');
    assert.equal(typeof offer.available, 'boolean');
  }
});
