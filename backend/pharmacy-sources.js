// Public-source registry. robots.txt is permission guidance, not a substitute
// for written commercial authorization or an official API agreement.
const pharmacySources = [
  {
    id: 'chefaa',
    name: 'Chefaa',
    baseUrl: 'https://chefaa.com',
    robotsUrl: 'https://chefaa.com/robots.txt',
    status: 'review-required',
    authorization: 'No commercial scraping authorization found',
    robots: 'Public store paths allowed; query-string URLs and cart/account paths disallowed',
    allowedPaths: ['/eg-ar/nowProduct/', '/eg-en/nowProduct/', '/eg-ar/now/category/'],
    blockedPatterns: ['?', '/cart', '/login', '/account', '/order', '/prescription'],
    rateLimit: { requests: 1, perMilliseconds: 2000 },
    notes: 'Use only public product pages. Request written permission or an official feed before production use.'
  },
  {
    id: 'seif',
    name: 'Seif Pharmacies',
    baseUrl: 'https://seif-online.com',
    robotsUrl: 'https://www.seif-online.com/robots.txt',
    status: 'review-required',
    authorization: 'No commercial scraping authorization found',
    robots: 'User-agent * allows / and declares search=yes, use=reference',
    allowedPaths: ['/en/product/', '/ar/product/', '/en/medicine', '/ar/medicine'],
    blockedPatterns: ['?', '/cart', '/checkout', '/account', '/login', '/prescriptions'],
    rateLimit: { requests: 1, perMilliseconds: 2000 },
    notes: 'Public product pages are discoverable; obtain written approval before collecting live availability.'
  },
  {
    id: 'el-ezaby',
    name: 'El Ezaby Pharmacy',
    baseUrl: 'https://elezabypharmacy.com',
    robotsUrl: 'https://www.elezabypharmacy.com/robots.txt',
    status: 'manual-only',
    authorization: 'No commercial scraping authorization or public product feed found',
    robots: 'Allows public pages and sitemap; no product availability contract identified',
    allowedPaths: [],
    blockedPatterns: ['/wp-admin', '/account', '/checkout'],
    rateLimit: { requests: 1, perMilliseconds: 5000 },
    notes: 'Use branch/contact information only until El Ezaby provides an API or written permission.'
  },
  {
    id: 'yodawy',
    name: 'Yodawy',
    baseUrl: 'https://yodawy.com',
    robotsUrl: 'https://yodawy.com/robots.txt',
    status: 'blocked',
    authorization: 'Not available',
    robots: 'User-agent * Disallow: /',
    allowedPaths: [],
    blockedPatterns: ['/'],
    rateLimit: null,
    notes: 'Do not scrape. Pursue a partnership or official API instead.'
  },
  {
    id: 'rakizah',
    name: 'Rakizah',
    baseUrl: 'https://www.rakizah.com',
    robotsUrl: 'https://www.rakizah.com/robots.txt',
    status: 'blocked',
    authorization: 'Not available',
    robots: 'AI and scraping bots are explicitly disallowed',
    allowedPaths: [],
    blockedPatterns: ['/'],
    rateLimit: null,
    notes: 'Do not scrape. Pursue a partnership or official feed instead.'
  },
  {
    id: 'eldoctorz',
    name: 'El Doctorz',
    baseUrl: 'https://www.eldoctorz.com',
    robotsUrl: 'https://www.eldoctorz.com/robots.txt',
    status: 'manual-only',
    authorization: 'Robots permits search reference; terms prohibit commercial third-party use without explicit permission',
    robots: 'Content-Signal search=yes, use=reference; AI crawlers disallowed',
    allowedPaths: ['/product/', '/shop/'],
    blockedPatterns: ['?', '/cart', '/checkout', '/my-account'],
    rateLimit: { requests: 1, perMilliseconds: 5000 },
    notes: 'Not a pharmacy availability network. Do not activate for the medicine offer pipeline without written permission.'
  },
  {
    id: '19011',
    name: '19011 Pharmacy',
    baseUrl: 'https://19011.com',
    robotsUrl: 'https://19011.com/robots.txt',
    status: 'manual-only',
    authorization: 'Robots policy unavailable during verification; no public API found',
    robots: 'Could not verify robots.txt (origin returned 522)',
    allowedPaths: [],
    blockedPatterns: ['/'],
    rateLimit: null,
    notes: 'Do not scrape until the site owner provides an approved API or written permission.'
  }
];

function getPharmacySource(id) {
  return pharmacySources.find((source) => source.id === id);
}

function canCrawl(source, path) {
  if (!source || source.status !== 'review-required') return false;
  if (!source.allowedPaths.some((allowedPath) => path.startsWith(allowedPath))) return false;
  return !source.blockedPatterns.some((blockedPattern) => path.includes(blockedPattern));
}

module.exports = { pharmacySources, getPharmacySource, canCrawl };