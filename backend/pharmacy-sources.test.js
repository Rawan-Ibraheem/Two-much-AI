const test = require('node:test');
const assert = require('node:assert/strict');
const { pharmacySources, getPharmacySource, canCrawl } = require('./pharmacy-sources');
const { shopifyConnector } = require('./pharmacy-connectors');

test('source registry contains exactly the eight intended pharmacies', () => {
  assert.equal(pharmacySources.length, 8);
  assert.deepEqual(pharmacySources.map((source) => source.id), [
    'tay', 'el-ezaby', 'el-kattan', 'khalil',
    'sabry', 'haggag', 'seif', 'anwar'
  ]);
});

test('el-kahlily/elkhallili and its Talabat listing were removed entirely', () => {
  assert.equal(getPharmacySource('el-kahlily'), undefined);
  assert.equal(getPharmacySource('el-khalily'), undefined);
  const serialized = JSON.stringify(pharmacySources).toLowerCase();
  assert.ok(!serialized.includes('kahlily'));
  assert.ok(!serialized.includes('khalily'));
  assert.ok(!serialized.includes('khallili'));
  assert.ok(!serialized.includes('talabat'));
});

test('no reference to the old 19011 hotline/source remains', () => {
  assert.ok(!JSON.stringify(pharmacySources).includes('19011'));
});

test('all eight sources are Alexandria, Egypt pharmacies', () => {
  for (const source of pharmacySources) {
    assert.equal(source.city, 'Alexandria', `${source.id} is missing its target city`);
    assert.equal(source.country, 'Egypt', `${source.id} is missing its country`);
  }
});

test('no source claims permission was granted', () => {
  for (const source of pharmacySources) {
    assert.equal(source.authorization, 'not_granted', `${source.id} claims permission`);
  }
});

test('status/capability only ever use the honest, documented vocabulary', () => {
  const allowedStatus = ['connected', 'unavailable', 'requires_browser', 'not_searchable', 'error'];
  const allowedCapability = ['public_api', 'requires_browser', 'not_searchable'];
  for (const source of pharmacySources) {
    assert.ok(allowedStatus.includes(source.status), `${source.id} has an unrecognized status: ${source.status}`);
    assert.ok(allowedCapability.includes(source.capability), `${source.id} has an unrecognized capability: ${source.capability}`);
  }
});

test('every public_api source has a connector describing the real endpoint it uses', () => {
  for (const source of pharmacySources) {
    if (source.capability === 'public_api') {
      assert.ok(source.connector, `${source.id} claims public_api but has no connector`);
      assert.match(source.connector.searchUrl, /^https:\/\//);
    } else {
      assert.equal(source.connector, null, `${source.id} is not public_api but has a connector`);
    }
  }
});

test('exactly Tay, Sabry and Anwar are connected via a real, verified public API', () => {
  const connected = pharmacySources.filter((source) => source.status === 'connected').map((source) => source.id).sort();
  assert.deepEqual(connected, ['anwar', 'sabry', 'tay']);
});

test('source registry allows only conservative catalog paths', () => {
  const tay = getPharmacySource('tay');

  assert.equal(canCrawl(tay, '/product/panadol'), true);
  assert.equal(canCrawl(tay, '/cart'), false);
  assert.equal(canCrawl(getPharmacySource('el-ezaby'), '/product/panadol'), false);
  assert.equal(canCrawl(getPharmacySource('el-kattan'), '/'), false);
});

test('Shopify connectors discard suggestions that do not match the query', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({
    resources: {
      results: {
        products: [
          { title: 'Vividol ES Hair Ampoules', price: '395', available: true, url: '/products/vividol' },
          { title: 'Panadol Extra 24 Tablets', price: '58', available: true, url: '/products/panadol-extra' }
        ]
      }
    }
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const connector = shopifyConnector('example.test', 'Example Pharmacy', 'example');
    const offers = await connector('Panadol Extra');
    assert.deepEqual(offers.map((offer) => offer.name), ['Panadol Extra 24 Tablets']);
  } finally {
    global.fetch = originalFetch;
  }
});
