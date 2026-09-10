// Claude-assisted query normalization.
//
// This is deliberately an *assist*, not an authority: Claude only rewrites the
// user's raw query into candidate catalog names. The deterministic matcher in
// server.js then re-runs against those candidates, so a hallucinated medicine
// name simply fails to match and changes nothing. AI never decides medicine
// equivalence, never invents an offer, and never touches price/availability.
//
// Fails open in every direction - no key, no network, bad JSON, timeout: the
// caller keeps the deterministic (zero-result) answer.

const DEFAULT_MODEL = 'claude-opus-5';
const REQUEST_TIMEOUT_MS = 12_000;

const SYSTEM_PROMPT = `You normalize medicine search queries for an Egyptian pharmacy price-comparison site.

The user query may be English, Modern Standard Arabic, Egyptian Arabic, Franco Arabic (Arabic typed in Latin letters, e.g. "banadol", "3ilag"), or misspelled.

You are given the exact list of medicine names in the catalog. Your only job is to decide which catalog names the user most likely meant.

Rules:
- Only ever return names copied verbatim from the provided catalog list.
- Return an empty list if nothing in the catalog plausibly matches. Guessing is worse than returning nothing.
- Never merge different strengths, pack sizes or dosage forms - if unsure between two, return both.
- Do not invent medicines, prices, pharmacies or availability.

Reply with JSON only, no prose, in exactly this shape:
{"candidates": ["<catalog name>", ...], "interpretation": "<short note on how you read the query>"}`;

let cachedClient;

function getClient() {
  if (cachedClient !== undefined) return cachedClient;
  // AI_ASSIST=off keeps the tests hermetic and gives the demo a kill switch if
  // the network is unreliable on the day.
  if (process.env.AI_ASSIST === 'off' || !process.env.ANTHROPIC_API_KEY) {
    cachedClient = null;
    return cachedClient;
  }
  try {
    const sdk = require('@anthropic-ai/sdk');
    const Anthropic = sdk.default || sdk;
    cachedClient = new Anthropic();
  } catch {
    // SDK not installed - the demo still runs on deterministic search only.
    cachedClient = null;
  }
  return cachedClient;
}

function isConfigured() {
  return Boolean(getClient());
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{status: string, candidates: string[], interpretation: string|null, model?: string}>}
 */
async function normalizeQuery(rawQuery, catalogNames) {
  const client = getClient();
  if (!client) {
    return { status: 'disabled', candidates: [], interpretation: null };
  }
  if (!rawQuery || !rawQuery.trim()) {
    return { status: 'skipped', candidates: [], interpretation: null };
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  try {
    const response = await client.messages.create(
      {
        model,
        max_tokens: 2048,
        // Simple lookup task - low effort keeps the search path fast and cheap.
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Catalog names:\n${catalogNames.map((name) => `- ${name}`).join('\n')}\n\nUser query: ${rawQuery}`
          }
        ]
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    if (response.stop_reason === 'refusal') {
      return { status: 'refused', candidates: [], interpretation: null, model };
    }

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.candidates)) {
      return { status: 'unparsable', candidates: [], interpretation: null, model };
    }

    // Only names that really exist in the catalog survive.
    const allowed = new Set(catalogNames);
    const candidates = parsed.candidates
      .filter((name) => typeof name === 'string' && allowed.has(name));

    return {
      status: candidates.length ? 'matched' : 'no_candidates',
      candidates,
      interpretation: typeof parsed.interpretation === 'string' ? parsed.interpretation : null,
      model
    };
  } catch (error) {
    return {
      status: 'error',
      candidates: [],
      interpretation: null,
      model,
      error: error?.message || 'Claude request failed.'
    };
  }
}

module.exports = { normalizeQuery, isConfigured, DEFAULT_MODEL };
