/**
 * End-to-end smoke test: boots the real backend, loads the *built* frontend
 * bundle in jsdom with `?q=...`, and asserts that pharmacy offers coming from
 * the API actually reach the DOM.
 *
 * Run with: node smoke-test.mjs   (after `npx vite build`)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(here, 'dist');

process.env.AI_ASSIST = 'off'; // keep the smoke test offline and fast
const { createServer } = await import(
  pathToFileURL(path.join(here, '..', '..', 'backend', 'server.js')).href
);

const api = createServer().listen(0);
await new Promise((resolve) => api.once('listening', resolve));
const apiPort = api.address().port;
const apiBase = `http://127.0.0.1:${apiPort}`;

function bundlePath(extension) {
  const assets = path.join(distDir, 'assets');
  const file = fs.readdirSync(assets).find((name) => name.endsWith(extension));
  assert.ok(file, `no ${extension} bundle in dist/assets - run "npx vite build" first`);
  return path.join(assets, file);
}

// The bundle inlines VITE_API_BASE_URL at build time, so rewrite the default
// localhost:3000 to this test server's ephemeral port.
const bundle = fs
  .readFileSync(bundlePath('.js'), 'utf8')
  .replaceAll('http://localhost:3000', apiBase);

async function render(query) {
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));
  virtualConsole.on('error', (message) => errors.push(String(message)));

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: `http://localhost:5173/?q=${encodeURIComponent(query)}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  });

  // Node's fetch rejects a jsdom-created AbortSignal (cross-realm), so drop it
  // here. Real browsers pair their own AbortController with their own fetch, so
  // this only papers over a jsdom/Node interop gap, not app behaviour.
  dom.window.fetch = (input, init) => fetch(String(input), { ...init, signal: undefined });
  dom.window.eval(bundle);

  // Let React mount and the search request resolve. "Pharmacy Offers" and the
  // empty state only appear once a response has been rendered - unlike "EGP",
  // which is also the price slider's unit.
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const text = dom.window.document.body.textContent || '';
    if (text.includes('Pharmacy Offers') || text.includes('No matches found')) break;
  }

  return { dom, errors, text: dom.window.document.body.textContent || '' };
}

let failures = 0;
function check(label, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) failures += 1;
}

try {
  // --- English brand search --------------------------------------------------
  const panadol = await render('panadol');
  check('no uncaught runtime errors', panadol.errors.length === 0);
  if (panadol.errors.length) console.log('   errors:', panadol.errors.slice(0, 3));
  check('renders the product name from the API', panadol.text.includes('Panadol Extra'));
  check('renders a pharmacy from the API', panadol.text.includes('El Ezaby'));
  check('renders a branch from the API', panadol.text.includes('Dokki'));
  // textContent concatenates adjacent nodes ("In Stock85 EGP"), so match the
  // number immediately preceding the currency rather than a standalone token.
  check('renders a price in EGP', /85\s*EGP/.test(panadol.text));
  check('renders the lowest-price summary', panadol.text.includes('Lowest Price'));
  check('renders availability state', panadol.text.includes('In Stock'));
  check('renders a "last checked" label', /Checked\s+(just now|\d+\s+min)/.test(panadol.text));
  check('renders the cheapest badge', panadol.text.includes('Cheapest'));
  check('renders the freshness disclaimer', panadol.text.includes('not live-verified'));
  check('links to the pharmacy site', panadol.dom.window.document.querySelector('a[href*="elezabypharmacy.com"]') !== null);
  check('links to Google Maps', panadol.dom.window.document.querySelector('a[href*="google.com/maps"]') !== null);
  check('offers a call link', panadol.dom.window.document.querySelector('a[href^="tel:"]') !== null);
  panadol.dom.window.close();

  // --- Arabic search --------------------------------------------------------
  const arabic = await render('بانادول اكسترا');
  check('Arabic query returns a result', arabic.text.includes('Panadol Extra') || arabic.text.includes('بانادول'));
  arabic.dom.window.close();

  // --- Franco / misspelling -------------------------------------------------
  const franco = await render('banadol');
  check('Franco/misspelled query returns a result', franco.text.includes('Panadol'));
  franco.dom.window.close();

  // --- Empty state ----------------------------------------------------------
  const empty = await render('zzzqqqxxx');
  check('unmatched query shows the empty state', empty.text.includes('No matches found'));
  empty.dom.window.close();
} finally {
  api.close();
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
