const http = require('node:http');
const { URL } = require('node:url');

const medicines = [
  {
    id: 'panadol-extra-500',
    name: 'Panadol Extra',
    ingredient: 'Paracetamol 500mg + Caffeine 65mg',
    form: 'Tablets',
    packageSize: 24,
    offers: [
      { pharmacy: 'El Ezaby', price: 85, currency: 'EGP', available: true },
      { pharmacy: 'Seif Pharmacy', price: 92, currency: 'EGP', available: true }
    ]
  },
  {
    id: 'congestal-20',
    name: 'Congestal',
    ingredient: 'Paracetamol 500mg + Pseudoephedrine 30mg',
    form: 'Tablets',
    packageSize: 20,
    offers: [
      { pharmacy: 'El Ezaby', price: 48, currency: 'EGP', available: true },
      { pharmacy: '19011 Pharmacy', price: 52, currency: 'EGP', available: false }
    ]
  },
  {
    id: 'vitamin-d3-30',
    name: 'Vitamin D3',
    ingredient: 'Cholecalciferol 1000 IU',
    form: 'Capsules',
    packageSize: 30,
    offers: [
      { pharmacy: 'Seif Pharmacy', price: 120, currency: 'EGP', available: true }
    ]
  }
];

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  response.end(JSON.stringify(body));
}

function createServer() {
  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');

    if (request.method !== 'GET') {
      return sendJson(response, 405, { error: 'Only GET requests are supported.' });
    }

    if (requestUrl.pathname === '/api/health') {
      return sendJson(response, 200, { status: 'ok', service: 'medicine-search-api' });
    }

    if (requestUrl.pathname === '/api/medicines') {
      const query = (requestUrl.searchParams.get('q') || '').trim().toLowerCase();
      const results = query
        ? medicines.filter((medicine) =>
            `${medicine.name} ${medicine.ingredient}`.toLowerCase().includes(query)
          )
        : medicines;

      return sendJson(response, 200, {
        query,
        count: results.length,
        lastChecked: new Date().toISOString(),
        results
      });
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