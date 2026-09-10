const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { URL } = require('node:url');
const { pharmacySources: sourceRegistry } = require('./pharmacy-sources');
const { mockMedicines } = require('./mock-medicines');
const { branches: branchDirectory, describeBranch } = require('./pharmacy-directory');
const { normalizeSearchText, matchesSearch } = require('./ai/medicine-matcher');
const { getRecommendations } = require('./ai/medical/recommender');
const { searchLiveSources } = require('./pharmacy-connectors');
const { startHourlyRefresh } = require('./pharmacy-refresh');
const cachedPharmacyData = require('./data/cached-pharmacy-data.json');
const execFileAsync = promisify(execFile);

// Minimal .env reader. The backend is intentionally dependency-light, so rather
// than pulling in dotenv we read `backend/.env` directly. Nothing read here is
// ever sent to the browser.
function loadEnvFile(envPath) {
  let contents;
  try {
    contents = require('node:fs').readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  for (const line of contents.split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}
loadEnvFile(path.join(__dirname, '.env'));

const checkedRecently = new Date().toISOString();
const branchCoordinates = Object.fromEntries(
  Object.entries(branchDirectory).map(([key, record]) => [
    key,
    { latitude: record.latitude, longitude: record.longitude }
  ])
);
const pharmacySources = {
  'El Ezaby: Smouha': { sourceId: 'el-ezaby', connector: 'mock-public-catalog', sourceUrl: 'mock://el-ezaby/smouha', verificationStatus: 'unverified' },
  'Seif Pharmacy: Sidi Gaber': { sourceId: 'seif', connector: 'mock-public-catalog', sourceUrl: 'mock://seif/sidi-gaber', verificationStatus: 'unverified' }
};

const baseMedicines = [
  {
    id: 'panadol-extra-500',
    name: 'Panadol Extra',
    ingredient: 'Paracetamol 500mg + Caffeine 65mg',
    form: 'Tablets',
    packageSize: 24,
    searchTerms: ['panadol extra', 'بانادول اكسترا', 'بانادول إكسترا', 'paracetamol', 'باراسيتامول'],
    offers: [
      {
        pharmacy: 'El Ezaby', branch: 'Smouha', price: 85, currency: 'EGP', available: true,
        distanceKm: 1.8, lastChecked: checkedRecently
      },
      {
        pharmacy: 'Seif Pharmacy', branch: 'Sidi Gaber', price: 92, currency: 'EGP', available: true,
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
    searchTerms: ['congestal', 'كونجستال', 'paracetamol', 'باراسيتامول'],
    offers: [
      {
        pharmacy: 'El Ezaby', branch: 'Smouha', price: 48, currency: 'EGP', available: true,
        distanceKm: 1.8, lastChecked: checkedRecently
      },
    ]
  },
  {
    id: 'vitamin-d3-30',
    name: 'Vitamin D3',
    ingredient: 'Cholecalciferol 1000 IU',
    form: 'Capsules',
    packageSize: 30,
    searchTerms: ['vitamin d3', 'فيتامين د', 'فيتامين د3', 'cholecalciferol'],
    offers: [
      {
        pharmacy: 'Seif Pharmacy', branch: 'Sidi Gaber', price: 120, currency: 'EGP', available: true,
        distanceKm: 3.2, lastChecked: checkedRecently
      }
    ]
  }
];
const medicines = [...baseMedicines, ...mockMedicines];

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  response.end(JSON.stringify(body));
}

function cachedOffersForQuery(query) {
  const normalizedQuery = normalizeSearchText(query);
  return cachedPharmacyData
    .filter((entry) => matchesSearch(
      { name: entry.name, ingredient: '', searchTerms: [] },
      normalizedQuery
    ))
    .map((entry) => ({
      ...entry,
      checkedAt: entry.downloadedAt
    }));
}

function readJsonBody(request, maxBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
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

async function runLocalOcr(imageBase64, mimeType) {
  const extension = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'medicine-ocr-'));
  const imagePath = path.join(temporaryDirectory, `receipt${extension}`);
  try {
    await fs.writeFile(imagePath, Buffer.from(imageBase64, 'base64'));
    const { stdout } = await execFileAsync('tesseract', [imagePath, 'stdout', '-l', 'ara+eng', '--psm', '6'], {
      timeout: 30_000,
      maxBuffer: 500_000
    });
    return stdout;
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
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

// The catalog keeps strength inside the ingredient string ("Paracetamol 500mg +
// Caffeine 65mg"). The UI shows it as its own chip, so derive it here instead of
// duplicating the dose in the data.
function deriveStrength(ingredient) {
  const matches = (ingredient || '').match(/\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/gi);
  return matches ? matches.join(' + ') : '';
}

function deriveArabicName(medicine) {
  const arabic = (medicine.searchTerms || []).find((term) => /[؀-ۿ]/.test(term));
  return arabic || medicine.name;
}

function resolveDistance(location, offer) {
  const coordinates = branchCoordinates[`${offer.pharmacy}: ${offer.branch}`];
  if (!location || !coordinates) return offer.distanceKm;
  return Number(distanceInKm(location, coordinates).toFixed(2));
}

function offerFreshness(offer) {
  const parsed = Date.parse(offer.lastChecked);
  return Number.isFinite(parsed) ? parsed : 0;
}

// normalizeSearchText and matchesSearch (Arabic/Franco/typo/strength-aware
// deterministic matching) now live in ./ai/medicine-matcher, alongside
// matchMedicine() which resolves a query to a single best medicine ID. This
// endpoint keeps using matchesSearch directly since it needs to filter and
// return the whole list of matching medicines, not just the best one.

function extractMedicineRequests(text) {
  const lines = text.split(/\r?\n|[,;|]/).map((line) => line.trim()).filter(Boolean);
  const requests = [];
  const unmatchedLines = [];
  for (const rawText of lines) {
    const normalizedLine = normalizeSearchText(rawText);
    const medicine = medicines.find((candidate) => {
      const terms = [candidate.name, ...(candidate.searchTerms || [])].map(normalizeSearchText);
      return terms.some((term) => normalizedLine.includes(term));
    });
    if (medicine) {
      requests.push({
        medicineId: medicine.id,
        name: medicine.name,
        rawText,
        confidence: 0.98,
        needsReview: true
      });
    } else {
      unmatchedLines.push(rawText);
    }
  }
  const uniqueRequests = [...new Map(requests.map((request) => [request.medicineId, request])).values()];
  return { requests: uniqueRequests, unmatchedLines };
}

function searchMedicines(requestUrl) {
  const originalQuery = (requestUrl.searchParams.get('q') || '').trim();
  const query = normalizeSearchText(originalQuery);
  const availableOnly = requestUrl.searchParams.get('availableOnly') === 'true';
  const sort = requestUrl.searchParams.get('sort') || 'best-match';
  const location = getLocation(requestUrl);
  if (location?.error) return { error: location.error };
  const results = medicines
    .filter((medicine) => {
      const matchesQuery = matchesSearch(medicine, query);
      const hasAvailableOffer = medicine.offers.some((offer) => offer.available);
      return matchesQuery && (!availableOnly || hasAvailableOffer);
    })
    .map((medicine) => ({
      ...medicine,
      strength: deriveStrength(medicine.ingredient),
      arabicName: deriveArabicName(medicine),
      offers: (availableOnly ? medicine.offers.filter((offer) => offer.available) : medicine.offers).map((offer) => ({
        ...offer,
        distanceKm: resolveDistance(location, offer),
        branchInfo: describeBranch(offer.pharmacy, offer.branch)
      }))
    }));

  if (sort === 'cheapest') {
    results.sort((left, right) => Math.min(...left.offers.map((offer) => offer.price)) - Math.min(...right.offers.map((offer) => offer.price)));
  } else if (sort === 'nearest') {
    results.sort((left, right) => Math.min(...left.offers.map((offer) => offer.distanceKm)) - Math.min(...right.offers.map((offer) => offer.distanceKm)));
  } else if (sort === 'freshest') {
    results.sort((left, right) => Math.max(...right.offers.map(offerFreshness)) - Math.max(...left.offers.map(offerFreshness)));
  }

  return { originalQuery, query, sort, availableOnly, location, results };
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
          source: {
            ...pharmacySources[branchKey],
            websiteUrl: sourceRegistry.find((source) => source.id === pharmacySources[branchKey].sourceId)?.websiteUrl
          },
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
      if (request.method !== 'POST' || !['/api/search/coverage', '/api/ocr/analyze', '/api/research/availability', '/api/assistant/recommend'].includes(requestUrl.pathname)) {
        return sendJson(response, 405, { error: 'Only GET and supported POST requests are accepted.' });
      }
    }

    if (requestUrl.pathname === '/api/health') {
      return sendJson(response, 200, { status: 'ok', service: 'medicine-search-api' });
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/pharmacy-sources') {
      return sendJson(response, 200, {
        sources: sourceRegistry.map((source) => ({
          ...source,
          connectorStatus: source.status,
          searchable: source.capability === 'public_api' && source.connector !== null,
          lastError: source.lastError ?? null,
          cachedCatalogAvailable: cachedPharmacyData.some((entry) => entry.sourceId === source.id),
          cachedCatalogDownloadedAt: cachedPharmacyData
            .filter((entry) => entry.sourceId === source.id)
            .map((entry) => entry.downloadedAt)
            .sort()
            .at(-1) ?? null,
          cachedProductCount: cachedPharmacyData.filter((entry) => entry.sourceId === source.id).length
        }))
      });
    }

    if (requestUrl.pathname === '/api/medicines') {
      const search = searchMedicines(requestUrl);
      if (search.error) return sendJson(response, 400, { error: search.error });

      return sendJson(response, 200, {
        query: search.query,
        originalQuery: search.originalQuery,
        sort: search.sort,
        availableOnly: search.availableOnly,
        location: search.location,
        count: search.results.length,
        dataStatus: search.results.length ? 'catalog_match' : 'catalog_only_no_match',
        nextStep: search.results.length
          ? 'Review offers and freshness before relying on availability.'
          : 'Live pharmacy connectors are not active; add an approved source or API to search this medicine.',
        dataSource: 'demo_catalog',
        freshnessNote: 'Demo catalog offers. Prices and availability are not live-verified.',
        lastChecked: new Date().toISOString(),
        results: search.results
      });
    }

    // Real, live pharmacy search - queries only the sources with a verified
    // public search endpoint (see pharmacy-sources.js `capability`), never
    // the demo/mock catalog above. An offer only appears here if it came
    // back in that source's own live response.
    if (request.method === 'GET' && requestUrl.pathname === '/api/medicines/live') {
      const originalQuery = (requestUrl.searchParams.get('q') || '').trim();
      if (!originalQuery) {
        return sendJson(response, 400, { error: 'q is required for a live pharmacy search.' });
      }

      return searchLiveSources(originalQuery)
        .then((sourceResults) => {
          const sourcesSummary = sourceResults.map((result) => {
            const registryEntry = sourceRegistry.find((source) => source.id === result.sourceId);
            return {
              sourceId: result.sourceId,
              name: registryEntry?.name || result.sourceId,
              status: result.status,
              error: result.error || null,
              checkedAt: result.checkedAt
            };
          });

          const liveOffers = sourceResults
            .filter((result) => result.status === 'ok')
            .flatMap((result) => result.offers.map((offer) => ({
              ...offer,
              dataStatus: 'real_live_verified',
              checkedAt: result.checkedAt,
              verificationStatus: 'live_verified'
            })));
          const cachedOffers = cachedOffersForQuery(originalQuery);
          const offers = [...liveOffers, ...cachedOffers];

          return sendJson(response, 200, {
            query: originalQuery,
            dataSource: 'real_pharmacy_website_and_public_cache',
            dataStatus: liveOffers.length
              ? (cachedOffers.length ? 'live_and_cached' : 'live_verified')
              : (cachedOffers.length ? 'cached_only' : 'live_checked_no_match'),
            note: 'Live offers came from connected pharmacy websites. Cached offers came from public catalog URLs and may have changed; they are never presented as live.',
            sources: sourcesSummary,
            count: offers.length,
            offers
          });
        })
        .catch((error) => sendJson(response, 502, { error: error.message }));
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

    if (request.method === 'POST' && requestUrl.pathname === '/api/ocr/analyze') {
      return readJsonBody(request, 10_000_000)
        .then(async (body) => {
          const supportedTypes = ['text/plain', 'application/json'];
          const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (imageTypes.includes(body.mimeType)) {
            if (typeof body.imageBase64 !== 'string' || !body.imageBase64.trim()) {
              return sendJson(response, 400, { error: 'Image data is required for image OCR.' });
            }
            if (body.imageBase64.length > 8_000_000) {
              return sendJson(response, 400, { error: 'Receipt image is too large.' });
            }
            body.text = await runLocalOcr(body.imageBase64, body.mimeType);
          }
          if (typeof body.text !== 'string' || !body.text.trim()) {
            return sendJson(response, 400, { error: 'OCR text is required for analysis.' });
          }
          if (body.text.length > 100_000) {
            return sendJson(response, 400, { error: 'OCR text is too large.' });
          }
          if (body.mimeType && !supportedTypes.includes(body.mimeType) && !imageTypes.includes(body.mimeType)) {
            return sendJson(response, 415, {
              error: 'Unsupported receipt type. Use JPG, PNG, WEBP, TXT, or JSON.'
            });
          }
          const extraction = extractMedicineRequests(body.text);
          return sendJson(response, 200, {
            analysisStatus: extraction.requests.length ? 'ready_for_confirmation' : 'partially_parsed',
            limitation: 'Document analysis is not prescription validation. Confirm every item with a pharmacist when needed.',
            filename: typeof body.filename === 'string' ? body.filename : null,
            requests: extraction.requests,
            unmatchedLines: extraction.unmatchedLines
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

    if (request.method === 'POST' && requestUrl.pathname === '/api/assistant/recommend') {
      return readJsonBody(request)
        .then((body) => {
          if (typeof body.message !== 'string' || !body.message.trim()) {
            return sendJson(response, 400, { error: 'message is required.' });
          }

          let location = null;
          if (body.location !== undefined && body.location !== null) {
            const latitude = Number(body.location.latitude);
            const longitude = Number(body.location.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
              return sendJson(response, 400, { error: 'location, if provided, must have valid latitude and longitude.' });
            }
            location = { latitude, longitude };
          }

          // The recommender only ever returns medicine IDs (or a
          // needs_more_information/urgent status) - it never sees or invents
          // pharmacy/offer data.
          const outcome = getRecommendations(body.message, medicines);
          if (outcome.status !== 'ok') {
            return sendJson(response, 200, outcome);
          }

          // Resolve those IDs through the exact same per-medicine enrichment
          // /api/medicines uses (strength/arabicName derivation, offer
          // distance + branchInfo). This is not a second pharmacy search
          // implementation, just the existing one applied to the medicine
          // IDs the recommender picked.
          const pharmacyResults = outcome.recommendations
            .map((recommendation) => medicines.find((medicine) => medicine.id === recommendation.medicineId))
            .filter(Boolean)
            .map((medicine) => ({
              ...medicine,
              strength: deriveStrength(medicine.ingredient),
              arabicName: deriveArabicName(medicine),
              offers: medicine.offers.map((offer) => ({
                ...offer,
                distanceKm: resolveDistance(location, offer),
                branchInfo: describeBranch(offer.pharmacy, offer.branch)
              }))
            }));

          return sendJson(response, 200, {
            status: 'ok',
            interpretedSymptoms: outcome.interpretedSymptoms,
            recommendations: outcome.recommendations,
            pharmacyResults,
            disclaimer: outcome.disclaimer
          });
        })
        .catch((error) => sendJson(response, 400, { error: error.message }));
    }

    return sendJson(response, 404, { error: 'Route not found.' });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  startHourlyRefresh();
  createServer().listen(port, () => {
    console.log(`Medicine search API listening on http://localhost:${port}`);
  });
}

module.exports = { createServer, medicines, cachedOffersForQuery };