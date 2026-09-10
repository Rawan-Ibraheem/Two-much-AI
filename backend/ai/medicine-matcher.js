// Independent, deterministic medicine matcher.
//
// This replaces the old Claude-assisted query normalization (ai-normalizer.js,
// now removed) with a self-contained module: no network calls, no external
// LLM/API, no randomness. It only ever resolves a query to a medicine ID that
// already exists in the catalog passed in - it never invents a medicine,
// price, pharmacy, or offer.
//
// `normalizeSearchText`, `editDistance` and `matchesSearch` are the same
// normalization/fuzzy logic server.js already used for `/api/medicines`
// (Arabic diacritics/hamza folding, Arabic-Indic digits, bounded Levenshtein
// fallback per token). They now live here so the list-filtering endpoint and
// the single-best-match `matchMedicine` helper share one implementation
// instead of two copies that could drift apart.

function normalizeSearchText(value) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? diagonal
        : Math.min(diagonal, row[rightIndex - 1], previous) + 1;
      diagonal = previous;
    }
  }
  return row[right.length];
}

// Classifies whether/why `medicine` matches an already-normalized query.
// Returns null for no match, or { matchType, confidence } ranked per the
// matching priority: exact name > alias (Arabic/English/Franco/brand) >
// active ingredient > partial substring > strength-aware fuzzy match.
function scoreMedicineMatch(medicine, normalizedQuery) {
  if (!normalizedQuery) return null;

  const nameNorm = normalizeSearchText(medicine.name);
  const ingredientNorm = medicine.ingredient ? normalizeSearchText(medicine.ingredient) : '';
  const aliasNorms = (medicine.searchTerms || []).map(normalizeSearchText);

  // 1 & 2. Exact medicine name (raw and normalized collapse to the same
  // comparison once both sides are run through normalizeSearchText).
  if (nameNorm === normalizedQuery) return { matchType: 'exact', confidence: 1 };

  // 3. Arabic/English/Franco alias or brand name, listed verbatim in the catalog.
  if (aliasNorms.includes(normalizedQuery)) return { matchType: 'alias', confidence: 0.95 };

  // 4. Exact generic/active ingredient match.
  if (ingredientNorm && ingredientNorm === normalizedQuery) return { matchType: 'ingredient', confidence: 0.9 };

  const allTerms = [nameNorm, ingredientNorm, ...aliasNorms].filter(Boolean);

  // Substring containment, attributed to whichever field actually contains
  // it so the caller can tell a generic-ingredient hit from a brand/name hit.
  if (allTerms.some((term) => term.includes(normalizedQuery))) {
    if (ingredientNorm && ingredientNorm.includes(normalizedQuery)) {
      return { matchType: 'ingredient', confidence: 0.88 };
    }
    return { matchType: 'partial', confidence: 0.85 };
  }

  // 5 & 6. Strength-aware deterministic fuzzy matching, token by token.
  // Short tokens (<4 chars) must match exactly, except a bare numeric query
  // token ("40") which may match a term token carrying that strength with a
  // unit ("40mg"). Longer tokens tolerate a bounded edit distance so brand
  // typos ("nexiam" -> "nexium", "klaritin" -> "claritin") still resolve.
  const queryTokens = normalizedQuery.split(' ');
  let usedStrengthToken = false;
  let usedFuzzyToken = false;

  const allTokensMatch = queryTokens.every((queryToken) => allTerms.some((term) => term.split(' ').some((termToken) => {
    if (queryToken.length < 4 || termToken.length < 4) {
      if (termToken === queryToken) return true;
      if (/^\d+$/.test(queryToken) && /^\d/.test(termToken) && termToken.startsWith(queryToken)) {
        usedStrengthToken = true;
        return true;
      }
      return false;
    }
    const allowedDistance = queryToken.length >= 8 ? 2 : 1;
    if (editDistance(queryToken, termToken) <= allowedDistance) {
      if (termToken !== queryToken) usedFuzzyToken = true;
      return true;
    }
    return false;
  })));

  if (!allTokensMatch) return null;
  if (usedStrengthToken) return { matchType: 'strength', confidence: usedFuzzyToken ? 0.82 : 0.87 };
  if (usedFuzzyToken) return { matchType: 'fuzzy', confidence: 0.75 };
  // Every token matched some term token exactly, just not as one contiguous
  // substring (e.g. word order differs) - still a genuine exact match.
  return { matchType: 'exact', confidence: 0.97 };
}

// Boolean filter used by the list-search endpoint (`/api/medicines`). Kept
// here so it shares one normalization/fuzzy implementation with
// `matchMedicine` instead of a second, divergent copy.
function matchesSearch(medicine, normalizedQuery) {
  if (!normalizedQuery) return true;
  return scoreMedicineMatch(medicine, normalizedQuery) !== null;
}

/**
 * Resolve a free-text query to the single best-matching medicine already
 * present in `medicines`. Never invents a medicine: only returns a result
 * that maps 1:1 to a catalog record, and returns null when nothing in the
 * catalog is a confident match (an unknown medicine stays unknown instead of
 * being guessed at).
 *
 * @param {string} query - raw user text (English, Arabic, Franco Arabic, etc).
 * @param {Array<{id: string, name: string, ingredient?: string, searchTerms?: string[]}>} medicines
 * @returns {{ medicineId: string, medicineName: string, confidence: number, matchType: string } | null}
 */
function matchMedicine(query, medicines) {
  const normalizedQuery = normalizeSearchText(String(query || '').trim());
  if (!normalizedQuery || !Array.isArray(medicines)) return null;

  let best = null;
  for (const medicine of medicines) {
    const score = scoreMedicineMatch(medicine, normalizedQuery);
    if (!score) continue;
    if (!best || score.confidence > best.confidence) {
      best = {
        medicineId: medicine.id,
        medicineName: medicine.name,
        confidence: score.confidence,
        matchType: score.matchType
      };
    }
  }
  return best;
}

module.exports = { normalizeSearchText, editDistance, matchesSearch, matchMedicine };
