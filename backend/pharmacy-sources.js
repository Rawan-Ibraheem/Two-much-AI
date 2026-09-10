// Pharmacy source registry.
//
// Four independent facts, deliberately kept apart:
//
//   city/country   - the market this pharmacy operates in. All eight are
//                    Alexandria, Egypt. This is NOT verified branch data.
//   authorization  - has the pharmacy explicitly granted data-collection
//                    permission? A legal/business fact. Every source here is
//                    'not_granted': nothing in this file implies consent.
//   capability     - the STATIC, verified technical answer to "can we reach
//                    real product data with an ordinary HTTP request, no
//                    browser/JS rendering?" ('public_api' | 'requires_browser'
//                    | 'not_searchable'). This was determined by directly
//                    inspecting each live site (robots.txt, homepage HTML,
//                    and - where a plausible public endpoint existed -
//                    actually calling it) on 2026-09-10. It does not change
//                    on its own; only a new inspection changes it.
//   status         - the DYNAMIC, live-refreshed field. Starts equal to
//                    capability's honest baseline and is updated in-memory
//                    by pharmacy-refresh.js every hour: 'connected' while the
//                    live connector answers, 'unavailable'/'error' if a
//                    refresh attempt for a connected source fails, and left
//                    untouched for sources with no connector at all.
//
// `capability: 'public_api'` sources have a matching `connector` describing
// the exact endpoint used. No source may be marked 'public_api' without one.
//
// Verified branch records (addresses, coordinates) live in
// pharmacy-directory.js and exist for only a subset of these pharmacies.
// A source having no branch record does not make it a non-Alexandria pharmacy.
const pharmacySources = [
  {
    id: 'tay',
    name: 'Tay Pharmacy',
    arabicName: 'صيدليات أسامة الطيبي',
    website: 'https://taypharmacies.com/',
    websiteUrl: 'https://taypharmacies.com/',
    city: 'Alexandria',
    country: 'Egypt',
    phone: null,
    authorization: 'not_granted',
    capability: 'public_api',
    connector: {
      type: 'woocommerce_store_api',
      // WooCommerce's public, unauthenticated Store API - meant for headless
      // storefronts. Confirmed live: returns real product name, price (EGP,
      // minor units), stock status and product permalink for a free-text
      // `search` query.
      searchUrl: 'https://taypharmacies.com/wp-json/wc/store/v1/products',
      fields: ['name', 'price', 'currency', 'availability', 'productUrl']
    },
    status: 'connected',
    dataStatus: 'live_verified',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://taypharmacies.com/robots.txt',
    allowedPaths: ['/shop', '/product/', '/wp-json/wc/store/'],
    blockedPatterns: ['/cart', '/checkout', '/my-account'],
    notes: 'Verified live on 2026-09-10: /wp-json/wc/store/v1/products?search=panadol returned real matching products with price and stock status. No public branch/location directory was found, so results carry no distance.'
  },
  {
    id: 'el-ezaby',
    name: 'El Ezaby Pharmacy',
    arabicName: 'صيدليات العزبي',
    website: 'https://elezabypharmacy.com/',
    websiteUrl: 'https://elezabypharmacy.com/',
    city: 'Alexandria',
    country: 'Egypt',
    phone: '19600',
    authorization: 'not_granted',
    capability: 'not_searchable',
    connector: null,
    status: 'not_searchable',
    dataStatus: 'demo_catalog_unverified',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://www.elezabypharmacy.com/robots.txt',
    allowedPaths: [],
    blockedPatterns: ['/wp-admin', '/account', '/checkout'],
    notes: 'WordPress site with no store/e-commerce plugin route active (/wp-json/wc/* returns 404). No public product catalog exists to search. Remains the legacy demo source: the offers attributed to it in mock-medicines.js/server.js are synthetic and are always labeled unverified/demo, never presented as live.'
  },
  {
    id: 'el-kattan',
    name: 'El Kattan Pharmacy',
    arabicName: 'صيدليات القطان',
    website: 'https://elkattanpharmacies.com/',
    websiteUrl: 'https://elkattanpharmacies.com/',
    city: 'Alexandria',
    country: 'Egypt',
    phone: '19291',
    authorization: 'not_granted',
    capability: 'not_searchable',
    connector: null,
    status: 'not_searchable',
    dataStatus: 'service_site_only',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://elkattanpharmacies.com/robots.txt',
    allowedPaths: [],
    blockedPatterns: ['/wp-admin', '/wp-login'],
    notes: 'The public homepage describes Alexandria delivery/services and a hotline, but no medicine catalog. Its own WordPress API path (/wp-json/) returns HTTP 406 from a ModSecurity rule, so no product data is reachable even in principle.'
  },
  {
    id: 'khalil',
    name: 'Khalil Pharmacy',
    arabicName: 'صيدليات خليل',
    website: 'https://www.khalilpharmacy.com/en',
    websiteUrl: 'https://www.khalilpharmacy.com/en',
    city: 'Alexandria',
    country: 'Egypt',
    phone: '19040',
    authorization: 'not_granted',
    capability: 'requires_browser',
    connector: null,
    status: 'requires_browser',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://www.khalilpharmacy.com/robots.txt',
    allowedPaths: [],
    blockedPatterns: ['/cart', '/checkout', '/account'],
    notes: 'Angular single-page app (<app-root>, empty on a plain HTTP fetch) - product data is rendered client-side after JS runs. A bounded search for a documented public data API found none. Not connected without a browser-rendering fallback, which was out of scope for this pass.'
  },
  {
    id: 'sabry',
    name: 'Sabry Pharmacy',
    arabicName: 'صيدلية صبري',
    website: 'https://pharmacysabry.com/',
    websiteUrl: 'https://pharmacysabry.com/',
    city: 'Alexandria',
    country: 'Egypt',
    phone: '035428101',
    authorization: 'not_granted',
    capability: 'public_api',
    connector: {
      type: 'shopify_predictive_search',
      // Shopify's own storefront predictive-search endpoint (what the site's
      // search box calls). Public, unauthenticated, robots.txt-allowed.
      searchUrl: 'https://pharmacysabry.com/search/suggest.json',
      fields: ['name', 'price', 'availability', 'productUrl']
    },
    status: 'connected',
    dataStatus: 'live_verified',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://pharmacysabry.com/robots.txt',
    allowedPaths: ['/products/', '/collections/', '/search/suggest.json'],
    blockedPatterns: ['/cart', '/account', '/checkout'],
    notes: 'Verified live on 2026-09-10: the Shopify catalog is real and searchable, but is overwhelmingly skincare/cosmetics/supplements. Common OTC medicines in this demo (panadol, brufen, augmentin, ...) returned zero matches in testing - an honest "no real offer" rather than a fabricated one.'
  },
  {
    id: 'haggag',
    name: 'Dr. Haggag Pharmacy',
    arabicName: 'صيدلية حجاج',
    website: 'https://haggagstores.com/',
    websiteUrl: 'https://haggagstores.com/',
    city: 'Alexandria',
    country: 'Egypt',
    phone: '+201001267006',
    authorization: 'not_granted',
    capability: 'requires_browser',
    connector: null,
    status: 'requires_browser',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://haggagstores.com/robots.txt',
    allowedPaths: [],
    blockedPatterns: ['/account', '/cart', '/checkout'],
    notes: 'Server-rendered Next.js shell (__NEXT_DATA__) only carries page layout; actual product listings are fetched client-side from an internal, undocumented storefront-platform API ("Sllr"). Reverse-engineering an undocumented private API was treated as out of scope, so this source is not connected.'
  },
  {
    id: 'seif',
    name: 'Seif Pharmacy',
    arabicName: 'صيدليات سيف',
    website: 'https://seif-online.com/en',
    websiteUrl: 'https://seif-online.com/en',
    city: 'Alexandria',
    country: 'Egypt',
    phone: '19199',
    authorization: 'not_granted',
    capability: 'requires_browser',
    connector: null,
    status: 'requires_browser',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://www.seif-online.com/robots.txt',
    allowedPaths: [],
    blockedPatterns: ['/cart', '/checkout', '/account', '/login', '/prescriptions'],
    notes: 'Angular single-page app (<app-root>, empty on a plain HTTP fetch) - product data is rendered client-side after JS runs. A bounded search for a documented public data API found none. Remains one of the two branches in the demo catalog (Seif Pharmacy: Sidi Gaber); those offers stay clearly labeled demo/unverified.'
  },
  {
    id: 'anwar',
    name: 'Anwar Pharmacy',
    arabicName: 'صيدليات أنور',
    website: 'https://anwar.store/',
    websiteUrl: 'https://anwar.store/',
    city: 'Alexandria',
    country: 'Egypt',
    phone: '01203337999',
    authorization: 'not_granted',
    capability: 'public_api',
    connector: {
      type: 'shopify_predictive_search',
      searchUrl: 'https://anwar.store/search/suggest.json',
      fields: ['name', 'price', 'availability', 'productUrl']
    },
    status: 'connected',
    dataStatus: 'live_verified',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://anwar.store/robots.txt',
    allowedPaths: ['/products/', '/collections/', '/search/suggest.json'],
    blockedPatterns: ['/cart', '/account', '/checkout'],
    notes: 'Verified live on 2026-09-10: the Shopify catalog is real and searchable, and did surface a genuine match for "otrivin" (a nasal decongestant already in this demo catalog). Most other demo medicines (panadol, brufen, ...) are not stocked online, so they honestly return zero results.'
  }
];

function getPharmacySource(id) {
  return pharmacySources.find((source) => source.id === id);
}

/**
 * Path policy only: is `path` inside the conservative allow-list recorded for
 * this source? This is NOT a permission check - every source currently has
 * `authorization: 'not_granted'`, so no connector may fetch anything beyond
 * the specific public endpoint already verified for it.
 */
function canCrawl(source, path) {
  if (!source || source.capability === 'not_searchable') return false;
  if (!source.allowedPaths.some((allowedPath) => path.startsWith(allowedPath))) return false;
  return !source.blockedPatterns.some((blockedPattern) => path.includes(blockedPattern));
}

module.exports = { pharmacySources, getPharmacySource, canCrawl };
