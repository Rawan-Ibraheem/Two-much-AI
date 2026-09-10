const http = require('node:http');
const { URL } = require('node:url');
const { pharmacySources: sourceRegistry } = require('./pharmacy-sources');

const checkedRecently = new Date().toISOString();
const branchCoordinates = {
  'El Ezaby: Dokki': { latitude: 30.0381, longitude: 31.2118 },
  'Seif Pharmacy: Mohandessin': { latitude: 30.0488, longitude: 31.2016 },
  '19011 Pharmacy: Agouza': { latitude: 30.0309, longitude: 31.2152 }
};
const pharmacySources = {
  'El Ezaby: Dokki': { sourceId: 'el-ezaby', connector: 'mock-public-catalog', sourceUrl: 'mock://el-ezaby/dokki', verificationStatus: 'unverified' },
  'Seif Pharmacy: Mohandessin': { sourceId: 'seif', connector: 'mock-public-catalog', sourceUrl: 'mock://seif/mohandessin', verificationStatus: 'unverified' },
  '19011 Pharmacy: Agouza': { sourceId: '19011', connector: 'mock-public-catalog', sourceUrl: 'mock://19011/agouza', verificationStatus: 'unverified' }
};

const medicines = [
  {
    id: 'panadol-extra-500',
    name: 'Panadol Extra',
    ingredient: 'Paracetamol 500mg + Caffeine 65mg',
    form: 'Tablets',
    packageSize: 24,
    offers: [
      {
        pharmacy: 'El Ezaby', branch: 'Dokki', price: 85, currency: 'EGP', available: true,
        distanceKm: 1.8, lastChecked: checkedRecently
      },
      {
        pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 92, currency: 'EGP', available: true,
        distanceKm: 3.2, lastChecked: checkedRecently
      }
    ]
  },
  {
    id: 'congestal-20',
    name: 'Congestal',
    ingredient: 'Paracetamol 500mg + Pseudoephedrine 30mg',
    form: 'Tablets',
    packageSize: 20,
    offers: [
      {
        pharmacy: 'El Ezaby', branch: 'Dokki', price: 48, currency: 'EGP', available: true,
        distanceKm: 1.8, lastChecked: checkedRecently
      },
      {
        pharmacy: '19011 Pharmacy', branch: 'Agouza', price: 52, currency: 'EGP', available: false,
        distanceKm: 2.4, lastChecked: checkedRecently
      }
    ]
  },
  {
    id: 'vitamin-d3-30',
    name: 'Vitamin D3',
    ingredient: 'Cholecalciferol 1000 IU',
    form: 'Capsules',
    packageSize: 30,
    offers: [
      {
        pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 120, currency: 'EGP', available: true,
        distanceKm: 3.2, lastChecked: checkedRecently
      }
    ]
  }
];

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  response.end(JSON.stringify(body));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function getLocation(requestUrl) {
  const latitudeValue = requestUrl.searchParams.get('lat');
  const longitudeValue = requestUrl.searchParams.get('lon');
  if (latitudeValue === null && longitudeValue === null) return null;

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: 'lat and lon must be valid geographic coordinates.' };
  }
  return { latitude, longitude };
}

function distanceInKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const latitude = radians(from.latitude);
  const targetLatitude = radians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function searchMedicines(requestUrl) {
  const query = (requestUrl.searchParams.get('q') || '').trim().toLowerCase();
  const availableOnly = requestUrl.searchParams.get('availableOnly') === 'true';
  const sort = requestUrl.searchParams.get('sort') || 'best-match';
  const location = getLocation(requestUrl);
  if (location?.error) return { error: location.error };
  const results = medicines
    .filter((medicine) => {
      const matchesQuery = !query || `${medicine.name} ${medicine.ingredient}`.toLowerCase().includes(query);
      const hasAvailableOffer = medicine.offers.some((offer) => offer.available);
      return matchesQuery && (!availableOnly || hasAvailableOffer);
    })
    .map((medicine) => ({
      ...medicine,
      offers: (availableOnly ? medicine.offers.filter((offer) => offer.available) : medicine.offers).map((offer) => ({
        ...offer,
        distanceKm: location
          ? Number(distanceInKm(location, branchCoordinates[`${offer.pharmacy}: ${offer.branch}`]).toFixed(2))
          : offer.distanceKm
      }))
    }));

  if (sort === 'cheapest') {
    results.sort((left, right) => Math.min(...left.offers.map((offer) => offer.price)) - Math.min(...right.offers.map((offer) => offer.price)));
  } else if (sort === 'nearest') {
    results.sort((left, right) => Math.min(...left.offers.map((offer) => offer.distanceKm)) - Math.min(...right.offers.map((offer) => offer.distanceKm)));
  }

  return { query, sort, availableOnly, location, results };
}

function buildCoverage(items) {
  const requestedIds = [...new Set(items)];
  const requestedMedicines = requestedIds
    .map((id) => medicines.find((medicine) => medicine.id === id))
    .filter(Boolean);
  const candidates = new Map();

  for (const medicine of requestedMedicines) {
    for (const offer of medicine.offers.filter((candidate) => candidate.available)) {
      const key = `${offer.pharmacy}:${offer.branch}`;
      const candidate = candidates.get(key) || {
        pharmacy: offer.pharmacy,
        branch: offer.branch,
        distanceKm: offer.distanceKm,
        coveredMedicineIds: [],
        offers: []
      };
      candidate.coveredMedicineIds.push(medicine.id);
      candidate.offers.push({ medicineId: medicine.id, name: medicine.name, price: offer.price, currency: offer.currency });
      candidates.set(key, candidate);
    }
  }

  return [...candidates.values()]
    .map((candidate) => {
      const coveredMedicineIds = [...new Set(candidate.coveredMedicineIds)];
      const missingMedicineIds = requestedIds.filter((id) => !coveredMedicineIds.includes(id));
      return {
        ...candidate,
        coveredMedicineIds,
        missingMedicineIds,
        complete: requestedIds.length > 0 && missingMedicineIds.length === 0,
        totalPrice: candidate.offers.reduce((total, offer) => total + offer.price, 0),
        lastChecked: checkedRecently
      };
    })
    .sort((left, right) => Number(right.complete) - Number(left.complete) || left.totalPrice - right.totalPrice);
}

function researchAvailability({ query, location, radiusKm }) {
  const normalizedQuery = (query || '').trim().toLowerCase();
  const medicinesToResearch = medicines.filter((medicine) =>
    !normalizedQuery || `${medicine.name} ${medicine.ingredient}`.toLowerCase().includes(normalizedQuery)
  );
  const results = medicinesToResearch.map((medicine) => ({
    medicineId: medicine.id,
    medicineName: medicine.name,
    offers: medicine.offers
      .map((offer) => {
        const branchKey = `${offer.pharmacy}: ${offer.branch}`;
        const distanceKm = Number(distanceInKm(location, branchCoordinates[branchKey]).toFixed(2));
        return {
          ...offer,
          distanceKm,
          source: pharmacySources[branchKey],
          checkedAt: checkedRecently
        };
      })
      .filter((offer) => offer.distanceKm <= radiusKm)
  })).filter((result) => result.offers.length > 0);

  return {
    mode: 'research',
    query: normalizedQuery,
    radiusKm,
    location,
    sourcePolicy: 'Mock public catalog only; live scraping requires an approved source URL and connector.',
    results
  };
}

function createServer() {
  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      });
      return response.end();
    }

    if (request.method !== 'GET') {
      if (request.method !== 'POST' || !['/api/search/coverage', '/api/research/availability'].includes(requestUrl.pathname)) {
        return sendJson(response, 405, { error: 'Only GET and supported POST requests are accepted.' });
      }
    }

    if (requestUrl.pathname === '/api/health') {
      return sendJson(response, 200, { status: 'ok', service: 'medicine-search-api' });
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/pharmacy-sources') {
      return sendJson(response, 200, { sources: sourceRegistry });
    }

    if (requestUrl.pathname === '/api/medicines') {
      const search = searchMedicines(requestUrl);
      if (search.error) return sendJson(response, 400, { error: search.error });

      return sendJson(response, 200, {
        query: search.query,
        sort: search.sort,
        availableOnly: search.availableOnly,
        location: search.location,
        count: search.results.length,
        lastChecked: new Date().toISOString(),
        results: search.results
      });
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/search/coverage') {
      return readJsonBody(request)
        .then((body) => {
          if (!Array.isArray(body.items) || body.items.some((item) => typeof item !== 'string')) {
            return sendJson(response, 400, { error: 'items must be an array of medicine IDs.' });
          }
          const requestedIds = [...new Set(body.items)];
          const unknownIds = requestedIds.filter((id) => !medicines.some((medicine) => medicine.id === id));
          if (unknownIds.length > 0) {
            return sendJson(response, 400, { error: 'Unknown medicine IDs.', unknownIds });
          }
          return sendJson(response, 200, {
            requestedMedicineIds: requestedIds,
            candidates: buildCoverage(requestedIds)
          });
        })
        .catch((error) => sendJson(response, 400, { error: error.message }));
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/research/availability') {
      return readJsonBody(request)
        .then((body) => {
          const location = body.location;
          const latitude = Number(location?.latitude);
          const longitude = Number(location?.longitude);
          const radiusKm = Number(body.radiusKm ?? 10);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return sendJson(response, 400, { error: 'A valid location is required for pharmacy research.' });
          }
          if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50) {
            return sendJson(response, 400, { error: 'radiusKm must be between 0 and 50.' });
          }
          return sendJson(response, 200, researchAvailability({
            query: body.query,
            location: { latitude, longitude },
            radiusKm
          }));
        })
        .catch((error) => sendJson(response, 400, { error: error.message }));
    }

    return sendJson(response, 404, { error: 'Route not found.' });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Medicine search API listening on http://localhost:${port}`);
  });
}

module.exports = { createServer };