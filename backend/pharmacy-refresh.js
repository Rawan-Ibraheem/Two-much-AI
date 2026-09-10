// Hourly pharmacy source refresh.
//
// This does NOT re-fetch or cache medicine offers (searches stay fully live,
// per request, in /api/medicines/live). It only re-checks that each
// connected pharmacy source's real endpoint still answers, and updates that
// source's `status`/`lastChecked` in pharmacy-sources.js accordingly.
//
// Safety rules, enforced below:
//   - every source is checked independently with its own timeout
//   - one source failing/timing out never stops or crashes the others
//   - a failed check NEVER erases the last known-good `lastChecked`
//   - successes and failures are both logged, by source id

const { pharmacySources } = require('./pharmacy-sources');
const { LIVE_CONNECTORS } = require('./pharmacy-connectors');

const HOURLY_MS = 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8_000;
// A neutral probe term used only to confirm a source's real search endpoint
// still responds. Its results are discarded - it is never shown to a user
// and never treated as a real medicine match.
const HEALTH_CHECK_QUERY = 'a';

/**
 * @param {{ sources?: object[], connectors?: Record<string, Function>, timeoutMs?: number, query?: string }} [options]
 * @returns {Promise<{ succeeded: string[], failed: { id: string, reason: string }[] }>}
 */
async function refreshAllSources(options = {}) {
  const sources = options.sources || pharmacySources;
  const connectors = options.connectors || LIVE_CONNECTORS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const query = options.query ?? HEALTH_CHECK_QUERY;

  const connectableSources = sources.filter(
    (source) => source.capability === 'public_api' && typeof connectors[source.id] === 'function'
  );

  const succeeded = [];
  const failed = [];

  await Promise.all(
    connectableSources.map(async (source) => {
      try {
        // Only proves the endpoint is alive; the offers themselves are
        // discarded here - real searches happen per-request, live.
        await connectors[source.id](query, { timeoutMs });
        source.status = 'connected';
        source.lastChecked = new Date().toISOString();
        delete source.lastError;
        succeeded.push(source.id);
      } catch (error) {
        const isTimeout = error?.name === 'AbortError';
        source.status = isTimeout ? 'unavailable' : 'error';
        source.lastError = isTimeout ? `Timed out after ${timeoutMs}ms` : String(error?.message || error);
        // lastChecked is intentionally left untouched: a failed refresh must
        // never overwrite the last time this source was verified working.
        failed.push({ id: source.id, reason: source.lastError });
      }
    })
  );

  for (const { id, reason } of failed) {
    console.error(`[pharmacy-refresh] ${id} failed: ${reason}`);
  }
  if (succeeded.length > 0) {
    console.log(`[pharmacy-refresh] refreshed: ${succeeded.join(', ')}`);
  }

  return { succeeded, failed };
}

let intervalHandle = null;

/**
 * Runs refreshAllSources() once immediately, then every `intervalMs`
 * (default 1 hour). Only ever called from server.js when the process is
 * actually running the server (guarded by `require.main === module`), so
 * `npm test` never triggers a real network call from this module.
 */
function startHourlyRefresh(intervalMs = HOURLY_MS) {
  stopHourlyRefresh();
  void refreshAllSources();
  intervalHandle = setInterval(() => void refreshAllSources(), intervalMs);
  // Don't let the timer keep the process alive by itself.
  intervalHandle.unref?.();
  return intervalHandle;
}

function stopHourlyRefresh() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { refreshAllSources, startHourlyRefresh, stopHourlyRefresh, HOURLY_MS };
