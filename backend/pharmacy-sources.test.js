const test = require('node:test');
const assert = require('node:assert/strict');
const { pharmacySources, getPharmacySource, canCrawl } = require('./pharmacy-sources');

test('source registry keeps blocked sites disabled', () => {
  assert.equal(getPharmacySource('yodawy').status, 'blocked');
  assert.equal(getPharmacySource('rakizah').status, 'blocked');
  assert.equal(canCrawl(getPharmacySource('yodawy'), '/'), false);
});

test('source registry allows only conservative review-required paths', () => {
  const chefaa = getPharmacySource('chefaa');
  const seif = getPharmacySource('seif');

  assert.equal(canCrawl(chefaa, '/eg-ar/nowProduct/panadol'), true);
  assert.equal(canCrawl(chefaa, '/eg-ar/nowProduct/panadol?sort=price'), false);
  assert.equal(canCrawl(seif, '/en/product/panadol'), true);
  assert.equal(canCrawl(getPharmacySource('eldoctorz'), '/product/panadol'), false);
  assert.equal(pharmacySources.length, 7);
});