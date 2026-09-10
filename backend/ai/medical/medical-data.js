// Small, deliberately narrow symptom -> catalog-medicine dataset for the MVP
// medical recommender.
//
// Every medicineId listed here is expected to exist in the real catalog
// (backend/mock-medicines.js plus the base records in backend/server.js).
// recommender.js re-checks this at runtime against the actual medicine list
// and silently drops any ID that isn't found there, so a typo in this file
// can never surface an invented medicine to a user.
//
// This intentionally covers only three common, low-risk symptom groups for
// the hackathon MVP. It is NOT meant to grow into general medical coverage,
// and it never assigns a diagnosis - only "may be used for this symptom".

const SYMPTOM_RECOMMENDATIONS = {
  headache: {
    label: 'headache',
    medicineIds: ['panadol-extra-500', 'brufen-400-30'],
    reason: 'May be commonly used for simple headache symptoms, but this does not diagnose the cause.'
  },
  fever: {
    label: 'fever',
    medicineIds: ['panadol-advance-24', 'brufen-400-30'],
    reason: 'May be commonly used to help reduce fever, but this does not diagnose the cause.'
  },
  cold: {
    label: 'cold symptoms',
    medicineIds: ['congestal-20', 'otrin-adult-15'],
    reason: 'May be commonly used to relieve simple cold/congestion symptoms, but this does not diagnose the cause.'
  }
};

// Phrases are compared after the same normalizeSearchText() folding
// medicine-matcher.js uses (Arabic diacritics/hamza/ta-marbuta folding, case
// folding, Arabic-Indic digits), so plain English/Arabic spelling is enough -
// recommender.js does not need a second normalization pass per phrase.
const SYMPTOM_KEYWORDS = {
  headache: [
    'headache', 'headaches', 'head ache', 'head hurts', 'head hurt', 'head pain', 'head is hurting',
    'صداع', 'وصداع', 'صداع في الراس', 'دماغي بتوجعني', 'وجعني دماغي', 'راسي بيوجعني', 'وجعني راسي'
  ],
  fever: [
    'fever', 'high temperature', 'i have a temperature', 'running a temperature',
    'حرارة', 'سخونية', 'عندي سخونة', 'جسمي سخن', 'حرارتي عالية'
  ],
  cold: [
    'cold', 'common cold', 'runny nose', 'stuffy nose', 'blocked nose', 'flu symptoms', 'sore throat',
    'زكام', 'رشح', 'انفي مسدود'
  ]
};

module.exports = { SYMPTOM_RECOMMENDATIONS, SYMPTOM_KEYWORDS };
