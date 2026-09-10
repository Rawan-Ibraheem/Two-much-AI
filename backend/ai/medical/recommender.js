// Independent medical recommendation engine.
//
// Responsibility boundary: this module answers "given a symptom description,
// which controlled catalog medicine IDs may be relevant?" It never decides
// "find this specific medicine" (that's backend/ai/medicine-matcher.js) and
// it never invents or looks up pharmacy names, prices, availability,
// branches, addresses, distances or URLs - callers resolve the medicine IDs
// this module returns against the real catalog/offer data themselves.
//
// No LLM, no network call, no randomness: symptom detection is deterministic
// keyword/phrase matching, and every recommended ID is re-checked against the
// actual medicine list passed in before it is ever returned.

const { normalizeSearchText } = require('../medicine-matcher');
const { SYMPTOM_RECOMMENDATIONS, SYMPTOM_KEYWORDS } = require('./medical-data');
const { checkRedFlags } = require('./safety-rules');

const NOT_UNDERSTOOD = {
  status: 'needs_more_information',
  message: "I couldn't confidently understand the symptom."
};

const URGENT = {
  status: 'urgent',
  message: 'These symptoms may require urgent medical attention. Please seek medical care immediately or contact a doctor/emergency service - do not rely on this tool.'
};

const DISCLAIMER = 'This is not a diagnosis or medical advice. If symptoms persist, worsen, or you are unsure, consult a pharmacist or doctor.';

// Whole word/phrase containment: pads both sides with spaces so a keyword
// like "cold" doesn't fire inside an unrelated word, while still allowing
// multi-word phrases like "head hurts" to match as a contiguous sequence.
function containsPhrase(normalizedMessage, phrase) {
  const normalizedPhrase = normalizeSearchText(phrase);
  if (!normalizedPhrase) return false;
  return ` ${normalizedMessage} `.includes(` ${normalizedPhrase} `);
}

function detectSymptomKeys(normalizedMessage) {
  const matched = [];
  for (const [key, phrases] of Object.entries(SYMPTOM_KEYWORDS)) {
    if (phrases.some((phrase) => containsPhrase(normalizedMessage, phrase))) {
      matched.push(key);
    }
  }
  return matched;
}

/**
 * @param {string} message - free-text symptom description (English, Arabic, Franco/Egyptian Arabic).
 * @param {Array<{id: string, name: string}>} medicines - the real, existing medicine catalog.
 * @returns {
 *   | { status: 'needs_more_information', message: string }
 *   | { status: 'urgent', message: string }
 *   | { status: 'ok', interpretedSymptoms: string[], recommendations: {medicineId: string, medicineName: string, reason: string}[], disclaimer: string }
 * }
 */
function getRecommendations(message, medicines) {
  const normalizedMessage = normalizeSearchText(String(message || ''));
  if (!normalizedMessage) return NOT_UNDERSTOOD;

  // Safety first: never let a red-flag message reach the recommendation step.
  if (checkRedFlags(normalizedMessage)) return URGENT;

  const symptomKeys = detectSymptomKeys(normalizedMessage);
  if (symptomKeys.length === 0) return NOT_UNDERSTOOD;

  const catalog = Array.isArray(medicines) ? medicines : [];
  const catalogById = new Map(catalog.map((medicine) => [medicine.id, medicine]));

  const interpretedSymptoms = [];
  const recommendations = [];
  const seenMedicineIds = new Set();

  for (const key of symptomKeys) {
    const entry = SYMPTOM_RECOMMENDATIONS[key];
    if (!entry) continue;
    interpretedSymptoms.push(entry.label);

    for (const medicineId of entry.medicineIds) {
      if (seenMedicineIds.has(medicineId)) continue;
      const medicine = catalogById.get(medicineId);
      // Never recommend an ID that doesn't actually exist in the catalog.
      if (!medicine) continue;
      seenMedicineIds.add(medicineId);
      recommendations.push({ medicineId, medicineName: medicine.name, reason: entry.reason });
    }
  }

  if (recommendations.length === 0) return NOT_UNDERSTOOD;

  return { status: 'ok', interpretedSymptoms, recommendations, disclaimer: DISCLAIMER };
}

module.exports = { getRecommendations, DISCLAIMER };
