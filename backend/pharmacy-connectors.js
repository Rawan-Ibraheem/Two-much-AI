// Real, live pharmacy search connectors.
//
// Each connector calls an actual public endpoint on the pharmacy's own
// website/store and maps the real response into a small, honest offer shape.
// Nothing here ever invents a product, price, or availability value - if the
// live request fails, times out, or the source isn't wired up, the caller
// gets a clear status instead of a guessed result.
//
// Deliberately excluded (see pharmacy-sources.js `capability`/`notes` for
// why): el-ezaby, el-kattan (no public catalog reachable), khalil, haggag,
// seif (client-rendered/SPA or an undocumented private API - out of scope
// for a hackathon-safe connector).
//
// Connected sources, each verified live on 2026-09-10 (see pharmacy-sources.js):
//   - tay:   WooCommerce Store API (public, unauthenticated)
//   - sabry: Shopify predictive search (public, unauthenticated)
//   - anwar: Shopify predictive search (public, unauthenticated)

const DEFAULT_TIMEOUT_MS = 8_000;
const { matchesSearch, normalizeSearchText } = require('./ai/medicine-matcher');

function withTimeout(promiseFactory, timeoutMs, signal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return promiseFactory(controller.signal).finally(() => {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  });
}

async function fetchJson(url, { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  return withTimeout(async (abortSignal) => {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DawaaFinderBot/1.0)' },
      signal: abortSignal
    });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.httpStatus = response.status;
      throw error;
    }
    return response.json();
  }, timeoutMs, signal);
}

// WooCommerce Store API: https://taypharmacies.com/wp-json/wc/store/v1/products?search=<q>
async function searchTay(query, options) {
  const url = `https://taypharmacies.com/wp-json/wc/store/v1/products?search=${encodeURIComponent(query)}&per_page=10`;
  const products = await fetchJson(url, options);
  return products.map((product) => {
    const minorUnit = Number(product.prices?.currency_minor_unit ?? 2);
    const rawPrice = Number(product.prices?.price);
    return {
      name: product.name,
      price: Number.isFinite(rawPrice) ? rawPrice / 10 ** minorUnit : null,
      currency: product.prices?.currency_code || 'EGP',
      available: product.is_in_stock !== false && product.stock_status?.class !== 'out-of-stock',
      productUrl: product.permalink || null,
      pharmacy: 'Tay Pharmacy',
      sourceId: 'tay'
    };
  });
}

// Shopify predictive search: https://<store>/search/suggest.json?q=<q>&resources[type]=product
function shopifyConnector(domain, pharmacyName, sourceId) {
  return async function search(query, options) {
    const url = `https://${domain}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=10`;
    const data = await fetchJson(url, options);
    const products = data.resources?.results?.products || [];
    return products
      .filter((product) => matchesSearch(
        { name: product.title || '', ingredient: '', searchTerms: [] },
        normalizeSearchText(query)
      ))
      .map((product) => ({
      name: product.title,
      price: Number.isFinite(Number(product.price)) ? Number(product.price) : null,
      currency: 'EGP',
      available: product.available !== false,
      productUrl: product.url ? `https://${domain}${product.url}` : null,
      pharmacy: pharmacyName,
      sourceId
      }));
  };
}

// One entry per source with `capability: 'public_api'` in pharmacy-sources.js.
const LIVE_CONNECTORS = {
  tay: searchTay,
  sabry: shopifyConnector('pharmacysabry.com', 'Sabry Pharmacy', 'sabry'),
  anwar: shopifyConnector('anwar.store', 'Anwar Pharmacy', 'anwar')
};

/**
 * Query every connected live source for `query`, independently. One source
 * failing/timing out never affects another - each result reports its own
 * honest status instead of being silently dropped or replaced with a guess.
 *
 * @param {string} query
 * @param {{ timeoutMs?: number, connectors?: typeof LIVE_CONNECTORS }} [options]
 * @returns {Promise<Array<{
 *   sourceId: string, status: 'ok' | 'timeout' | 'error', offers: object[],
 *   error?: string, checkedAt: string
 * }>>}
 */
async function searchLiveSources(query, options = {}) {
  const connectors = options.connectors || LIVE_CONNECTORS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return Promise.all(
    Object.entries(connectors).map(async ([sourceId, connector]) => {
      const checkedAt = new Date().toISOString();
      try {
        const offers = await connector(query, { timeoutMs });
        return { sourceId, status: 'ok', offers, checkedAt };
      } catch (error) {
        const isAbort = error?.name === 'AbortError';
        return {
          sourceId,
          status: isAbort ? 'timeout' : 'error',
          offers: [],
          error: isAbort ? `Timed out after ${timeoutMs}ms` : error.message,
          checkedAt
        };
      }
    })
  );
}

module.exports = { LIVE_CONNECTORS, searchLiveSources, searchTay, shopifyConnector };
