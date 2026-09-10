/**
 * Visibility + behaviour test for the AI Health Assistant panel.
 *
 * Boots the real backend, loads the *built* frontend bundle in jsdom, asserts
 * the assistant is actually rendered (not merely present in the source), then
 * submits "I have a headache" and asserts the backend's own response reaches
 * the DOM.
 *
 * Run with: node assistant-test.mjs   (after `npx vite build`)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(here, 'dist');

process.env.AI_ASSIST = 'off'; // keep the test offline and fast
const { createServer } = await import(
  pathToFileURL(path.join(here, '..', '..', 'backend', 'server.js')).href
);

const api = createServer().listen(0);
await new Promise((resolve) => api.once('listening', resolve));
const apiBase = `http://127.0.0.1:${api.address().port}`;

function bundlePath(extension) {
  const assets = path.join(distDir, 'assets');
  const file = fs.readdirSync(assets).find((name) => name.endsWith(extension));
  assert.ok(file, `no ${extension} bundle in dist/assets - run "npx vite build" first`);
  return path.join(assets, file);
}

const bundle = fs
  .readFileSync(bundlePath('.js'), 'utf8')
  .replaceAll('http://localhost:3000', apiBase);

/** Load the app at `url` and wait for React to mount. */
async function mount(url) {
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));
  virtualConsole.on('error', (message) => errors.push(String(message)));

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  });

  // Node's fetch rejects a jsdom-created AbortSignal (cross-realm), so drop it.
  dom.window.fetch = (input, init) => fetch(String(input), { ...init, signal: undefined });
  dom.window.eval(bundle);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (dom.window.document.querySelector('#assistant-symptoms')) break;
  }
  return { dom, errors };
}

/**
 * React 19 tracks the DOM value via a property descriptor, so assigning
 * `.value` directly is ignored. Use the native setter, then fire `input`.
 */
function typeInto(window, element, value) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  ).set;
  setter.call(element, value);
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

let failures = 0;
function check(label, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) failures += 1;
}

/** Submit a symptom description and wait for the panel to settle. */
async function ask(dom, message) {
  const { document, window } = dom.window;
  const textarea = document.querySelector('#assistant-symptoms');
  const form = textarea.closest('form');

  typeInto(window, textarea, message);
  await new Promise((resolve) => setTimeout(resolve, 50));

  form.querySelector('button[type="submit"]').click();

  const panel = textarea.closest('section');
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const text = panel.textContent || '';
    if (
      text.includes('Possible medicine options') ||
      text.includes('Interpreted symptoms') ||
      text.includes('Urgent') ||
      text.includes('More detail needed') ||
      text.includes('Could not reach')
    ) {
      break;
    }
  }
  return panel.textContent || '';
}

try {
  // --- Visible on the home (main search) page --------------------------------
  const home = await mount('http://localhost:5173/');
  const homeDoc = home.dom.window.document;

  check('no uncaught runtime errors', home.errors.length === 0);
  if (home.errors.length) console.log('   errors:', home.errors.slice(0, 3));

  check('assistant heading is rendered', (homeDoc.body.textContent || '').includes('AI Health Assistant'));
  check(
    'assistant subtitle is rendered',
    (homeDoc.body.textContent || '').includes(
      'Describe your symptoms and get possible medicines to discuss with a pharmacist.'
    )
  );
  check('symptom textarea exists', homeDoc.querySelector('#assistant-symptoms') !== null);

  const submit = homeDoc
    .querySelector('#assistant-symptoms')
    ?.closest('form')
    ?.querySelector('button[type="submit"]');
  check('"Ask Assistant" button exists', (submit?.textContent || '').includes('Ask Assistant'));

  // Visibility, not just presence: the panel must not be display:none/hidden.
  const panel = homeDoc.querySelector('#assistant-symptoms').closest('section');
  const style = home.dom.window.getComputedStyle(panel);
  check(
    'assistant panel is visible (not display:none / visibility:hidden / hidden attr)',
    style.display !== 'none' && style.visibility !== 'hidden' && !panel.hidden && panel.offsetParent !== null
  );

  // --- "I have a headache" ---------------------------------------------------
  const reply = await ask(home.dom, 'I have a headache');
  check('assistant did not error out', !reply.includes('Could not reach the assistant API'));
  check('renders interpreted symptoms', reply.includes('Interpreted symptoms'));
  check('interprets the symptom as headache', /headache/i.test(reply));
  check('renders possible medicine options', reply.includes('Possible medicine options'));
  check('renders at least one medicine from the backend', /Panadol|Paracetamol|Brufen|Ibuprofen/i.test(reply));
  check('renders pharmacy availability', reply.includes('Pharmacy availability'));
  check('renders a disclaimer', /pharmacist|doctor|not medical advice|diagnos/i.test(reply));
  console.log('\n--- assistant panel text ---\n' + reply.trim().slice(0, 900) + '\n');
  home.dom.window.close();

  // --- Still visible on the search results page ------------------------------
  const search = await mount('http://localhost:5173/?q=panadol');
  const searchText = search.dom.window.document.body.textContent || '';
  check('assistant is also visible on the search results page', searchText.includes('AI Health Assistant'));
  check('search results still render alongside it', searchText.includes('Panadol'));
  search.dom.window.close();
} finally {
  api.close();
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
