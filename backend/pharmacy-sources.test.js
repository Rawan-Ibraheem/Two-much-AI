const test = require('node:test');
const assert = require('node:assert/strict');
const { pharmacySources, getPharmacySource, canCrawl } = require('./pharmacy-sources');

test('source registry contains the nine requested pharmacies', () => {
  assert.equal(pharmacySources.length, 9);
  assert.deepEqual(pharmacySources.map((source) => source.id), [
    'tay', 'el-ezaby', 'el-kattan', 'el-kahlily', 'khalil',
    'sabry', 'haggag', 'seif', 'anwar'
  ]);
  assert.ok(pharmacySources.every((source) => [
    'demo_source', 'catalog_available', 'manual', 'external'
  ].includes(source.status)));
  assert.equal(getPharmacySource('el-ezaby').status, 'demo_source');
  assert.equal(getPharmacySource('el-ezaby').dataStatus, 'demo_catalog_unverified');
});

test('all nine sources are Alexandria, Egypt pharmacies', () => {
  for (const source of pharmacySources) {
    assert.equal(source.city, 'Alexandria', `${source.id} is missing its target city`);
    assert.equal(source.country, 'Egypt', `${source.id} is missing its country`);
  }
});

test('no source claims a live connection or granted permission', () => {
  for (const source of pharmacySources) {
    assert.equal(source.authorization, 'not_granted', `${source.id} claims permission`);
    assert.notEqual(source.status, 'connected', `${source.id} claims a live connection`);
  }
});

test('El Kahlily is recorded as an external listing, not its own website', () => {
  const kahlily = getPharmacySource('el-kahlily');

  assert.equal(kahlily.website, null);
  assert.equal(kahlily.websiteUrl, null);
  assert.equal(kahlily.sourceType, 'external_marketplace');
  assert.match(kahlily.externalListingUrl, /talabat\.com/);
  // A Talabat URL must never be presented as the pharmacy's own site.
  assert.ok(!/talabat/.test(String(kahlily.website)));
});

test('source registry allows only conservative catalog paths', () => {
  const tay = getPharmacySource('tay');
  const seif = getPharmacySource('seif');

  assert.equal(canCrawl(tay, '/product/panadol'), true);
  assert.equal(canCrawl(tay, '/cart'), false);
  assert.equal(canCrawl(seif, '/en/product/panadol'), true);
  assert.equal(canCrawl(getPharmacySource('el-ezaby'), '/product/panadol'), false);
  assert.equal(canCrawl(getPharmacySource('el-kattan'), '/'), false);
});