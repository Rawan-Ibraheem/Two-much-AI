// Conservative, deterministic red-flag detector for the medical recommender.
//
// This is NOT a triage system - it recognizes a small, explicit list of
// phrases that should stop automatic medicine suggestions and point the user
// toward urgent care instead. Over-triggering (a false "urgent") is an
// acceptable, safe outcome here; silently recommending an OTC medicine for a
// genuine emergency is not. So, unlike the word-boundary symptom matching in
// medical-data.js/recommender.js, matching here is deliberately loose
// substring matching.

const { normalizeSearchText } = require('../medicine-matcher');

const RED_FLAG_PHRASES = [
  // Severe / sudden headache
  'severe headache', 'sudden headache', 'worst headache', 'thunderclap headache',

  // Cardiac / respiratory
  'chest pain', 'difficulty breathing', 'trouble breathing', 'shortness of breath', 'unable to breathe',

  // Loss of consciousness
  'faint', 'passed out', 'unconscious', 'unresponsive',

  // Allergic reaction
  'severe allergic reaction', 'anaphyla', 'throat swelling', 'swollen throat',

  // Neurological / stroke-like
  'confusion', 'confused', 'disoriented', 'seizure', 'convuls',
  'slurred speech', 'face drooping', 'numbness on one side', 'weakness on one side', 'stroke',

  // Bleeding
  'severe bleeding', 'heavy bleeding', 'uncontrolled bleeding',

  // Pregnancy - only flagged when explicitly combined with an urgent symptom.
  'pregnant and bleeding', 'pregnancy bleeding', 'bleeding during pregnancy', 'severe pain and pregnant',

  // Egyptian/Arabic equivalents
  'صداع شديد ومفاجئ', 'صداع شديد جدا', 'الم شديد في الصدر', 'ضيق في التنفس', 'صعوبة في التنفس',
  'فقدان الوعي', 'اغمي عليه', 'اغمى عليه', 'تشنج', 'نزيف شديد', 'جلطة', 'تشوش'
];

/**
 * @param {string} text - raw or already-normalized user message.
 * @returns {boolean} true if the text contains an explicit red-flag phrase.
 */
function checkRedFlags(text) {
  const normalized = normalizeSearchText(String(text || ''));
  if (!normalized) return false;
  return RED_FLAG_PHRASES.some((phrase) => normalized.includes(normalizeSearchText(phrase)));
}

module.exports = { checkRedFlags, RED_FLAG_PHRASES };
