// Pharmacy source registry.
//
// Three independent facts, deliberately kept apart:
//
//   city/country  - the market this pharmacy operates in. All nine are
//                   Alexandria, Egypt. This is NOT verified branch data.
//   status        - how the app may use the source today. Only 'demo_source'
//                   feeds the demo; nothing here is live-connected.
//   dataStatus    - what was actually observed on the public site. A public
//                   catalog does not mean the app may collect prices or stock.
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
    sourceType: 'http_catalog_parser',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: 'https://taypharmacies.com/shop',
    branchesUrl: 'https://taypharmacies.com/عناوين-فروع-الطيبي',
    phone: null,
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    status: 'catalog_available',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://taypharmacies.com/robots.txt',
    allowedPaths: ['/shop', '/product/'],
    blockedPatterns: ['/cart', '/checkout', '/my-account'],
    notes: 'Public shop pages expose product names, prices, product IDs, categories and branch-address navigation. No application connector is enabled.'
  },
  {
    id: 'el-ezaby',
    name: 'El Ezaby Pharmacy',
    arabicName: 'صيدليات العزبي',
    website: 'https://elezabypharmacy.com/',
    websiteUrl: 'https://elezabypharmacy.com/',
    sourceType: 'demo_catalog',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: null,
    branchesUrl: 'https://elezabypharmacy.com/the-app-2/',
    phone: '19600',
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    // Not a live connection: this is the source the demo catalog is attributed
    // to. Its offers are synthetic, so 'connected' would overstate it.
    status: 'demo_source',
    dataStatus: 'demo_catalog_unverified',
    lastChecked: null,
    robotsUrl: 'https://www.elezabypharmacy.com/robots.txt',
    allowedPaths: [],
    blockedPatterns: ['/wp-admin', '/account', '/checkout'],
    notes: 'Remains the existing working demo source. Offers are synthetic and unverified; the public site inspection found services, branch-network claims and hotline information, not a public product catalog.'
  },
  {
    id: 'el-kattan',
    name: 'El Kattan Pharmacy',
    arabicName: 'صيدليات القطان',
    website: 'https://elkattanpharmacies.com/',
    websiteUrl: 'https://elkattanpharmacies.com/',
    sourceType: 'manual',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: null,
    // The notes below record that no branch directory was found, so there is no
    // branches URL to claim - the bare homepage is not one.
    branchesUrl: null,
    phone: '19291',
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    status: 'manual',
    dataStatus: 'service_site_only',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://elkattanpharmacies.com/robots.txt',
    allowedPaths: [],
    blockedPatterns: ['/wp-admin', '/wp-login'],
    notes: 'The public page describes Alexandria delivery and services and exposes a hotline, but no medicine catalog, prices, stock, product IDs or branch directory were observed.'
  },
  {
    id: 'el-kahlily',
    name: 'El Kahlily Pharmacy',
    arabicName: 'صيدليات الخليلي',
    // The only URL supplied for this pharmacy is a Talabat marketplace listing,
    // not its own site, so `website` stays null and the listing is recorded
    // separately. Do not present the Talabat page as the pharmacy's website.
    website: null,
    websiteUrl: null,
    externalListingUrl: 'https://www.talabat.com/ar/egypt/pharmacy/786864/elkhallili-pharmacies-montazah?aid=7129',
    sourceType: 'external_marketplace',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: 'https://www.talabat.com/ar/egypt/pharmacy/786864/elkhallili-pharmacies-montazah?aid=7129',
    branchesUrl: null,
    phone: null,
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    status: 'external',
    dataStatus: 'external_reference_only',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://www.talabat.com/robots.txt',
    allowedPaths: [],
    blockedPatterns: ['?aid=', '/cart', '/checkout'],
    notes: 'The supplied Talabat URL redirected to a tracking endpoint during inspection. No catalog, price, stock, branch or API data was treated as verified.'
  },
  {
    id: 'khalil',
    name: 'Khalil Pharmacy',
    arabicName: 'صيدليات خليل',
    website: 'https://www.khalilpharmacy.com/en',
    websiteUrl: 'https://www.khalilpharmacy.com/en',
    sourceType: 'http_catalog_parser',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: 'https://www.khalilpharmacy.com/en/product/medication',
    branchesUrl: null,
    phone: '19040',
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    status: 'catalog_available',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://www.khalilpharmacy.com/robots.txt',
    allowedPaths: ['/en/product/', '/en/products/'],
    blockedPatterns: ['/cart', '/checkout', '/account'],
    notes: 'Public pages expose product URLs, prices, categories, pagination parameters and out-of-stock labels. Alexandria branch coverage was not verified from the inspected page.'
  },
  {
    id: 'sabry',
    name: 'Sabry Pharmacy',
    arabicName: 'صيدلية صبري',
    website: 'https://pharmacysabry.com/',
    websiteUrl: 'https://pharmacysabry.com/',
    sourceType: 'shopify_catalog',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: 'https://pharmacysabry.com/collections/all-products',
    branchesUrl: null,
    phone: '035428101',
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    status: 'catalog_available',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://pharmacysabry.com/robots.txt',
    allowedPaths: ['/products/', '/collections/'],
    blockedPatterns: ['/cart', '/account', '/checkout'],
    notes: 'Shopify-style public catalog exposes product URLs, prices, sale prices, categories and sold-out labels. The inspected footer identifies Roshdy, Alexandria; branch coordinates were not verified.'
  },
  {
    id: 'haggag',
    name: 'Dr. Haggag Pharmacy',
    arabicName: 'صيدلية حجاج',
    website: 'https://haggagstores.com/',
    websiteUrl: 'https://haggagstores.com/',
    sourceType: 'http_catalog_parser',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: 'https://haggagstores.com/',
    branchesUrl: null,
    phone: '+201001267006',
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    status: 'catalog_available',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://haggagstores.com/robots.txt',
    allowedPaths: ['/'],
    blockedPatterns: ['/account', '/cart', '/checkout'],
    notes: 'Public storefront exposes product names, prices, discounts, categories and product images. The inspected page did not establish Alexandria branch addresses or a public API.'
  },
  {
    id: 'seif',
    name: 'Seif Pharmacy',
    arabicName: 'صيدليات سيف',
    website: 'https://seif-online.com/en',
    websiteUrl: 'https://seif-online.com/en',
    sourceType: 'http_catalog_parser',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: 'https://seif-online.com/en/category/medicine',
    branchesUrl: null,
    phone: '19199',
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    status: 'catalog_available',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://www.seif-online.com/robots.txt',
    allowedPaths: ['/en/product/', '/ar/product/', '/en/category/', '/ar/category/'],
    blockedPatterns: ['/cart', '/checkout', '/account', '/login', '/prescriptions'],
    notes: 'Public pages expose medicine categories, product pages, brand pages, product links and hotline. Live price/stock and Alexandria branch records were not verified from the inspected page.'
  },
  {
    id: 'anwar',
    name: 'Anwar Pharmacy',
    arabicName: 'صيدليات أنور',
    website: 'https://anwar.store/',
    websiteUrl: 'https://anwar.store/',
    sourceType: 'shopify_catalog',
    city: 'Alexandria',
    country: 'Egypt',
    catalogUrl: 'https://anwar.store/collections',
    branchesUrl: 'https://anwar.store/pages/contact-us',
    phone: '01203337999',
    // No pharmacy has granted data-collection permission yet.
    authorization: 'not_granted',
    status: 'catalog_available',
    dataStatus: 'public_catalog_observed',
    lastChecked: '2026-09-10',
    robotsUrl: 'https://anwar.store/robots.txt',
    allowedPaths: ['/products/', '/collections/'],
    blockedPatterns: ['/cart', '/account', '/checkout'],
    notes: 'Public Shopify catalog exposes product URLs, prices, sale prices, categories and search. The page lists Alexandria neighborhoods with map links, but complete branch addresses and coordinates were not added to the demo.'
  }
];

function getPharmacySource(id) {
  return pharmacySources.find((source) => source.id === id);
}

/**
 * Path policy only: is `path` inside the conservative allow-list recorded for
 * this source? This is NOT a permission check - every source currently has
 * `authorization: 'not_granted'`, so no connector may actually fetch from any
 * of them. A connector must check `authorization` as well.
 */
function canCrawl(source, path) {
  if (!source || source.status !== 'catalog_available') return false;
  if (!source.allowedPaths.some((allowedPath) => path.startsWith(allowedPath))) return false;
  return !source.blockedPatterns.some((blockedPattern) => path.includes(blockedPattern));
}

module.exports = { pharmacySources, getPharmacySource, canCrawl };
