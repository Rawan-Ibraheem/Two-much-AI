# Medicine Search Backend

Dependency-light Node.js REST API: native `node:http`, `fetch` and `node:test`.
No Express, no database, no build step. The only runtime dependency is the
Anthropic SDK, used for the optional query-normalization fallback.

This is the API the React frontend (`frontend/dawaa-finder`) talks to.

## Run

```bash
npm --prefix backend start          # http://localhost:3000
```

`npm install` is only needed for the Claude fallback; every other endpoint runs
straight from source. Set `PORT` to change the port.

## Test

```bash
npm --prefix backend test           # 22 tests, offline (AI_ASSIST=off)
npm --prefix backend run check      # syntax check every module
```

## Configuration

Copy `.env.example` to `.env`. `server.js` also reads `../shared/.env`, so a key
already sitting there is picked up automatically. Both files are git-ignored.

| Variable            | Required             | Purpose                                                                                |
| ------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `PORT`              | no (3000)            | Listen port.                                                                           |
| `ANTHROPIC_API_KEY` | no                   | Enables Claude query normalization. **Backend only** — never expose it to the browser. |
| `ANTHROPIC_MODEL`   | no (`claude-opus-5`) | Model override.                                                                        |
| `AI_ASSIST`         | no                   | `off` disables the Claude fallback (used by the tests; also a demo kill switch).       |

## Endpoints

| Method | Route                        | Purpose                                                                                  |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/api/health`                | Liveness probe.                                                                          |
| GET    | `/api/medicines`             | Main search. `q`, `sort`, `availableOnly`, `lat`, `lon`.                                 |
| GET    | `/api/pharmacy-sources`      | Source registry: robots/authorization status per pharmacy site.                          |
| POST   | `/api/research/availability` | Research mode — re-check branches within `radiusKm` of a location.                       |
| POST   | `/api/search/coverage`       | Find one branch that stocks a whole list of medicine IDs.                                |
| POST   | `/api/ocr/analyze`           | Extract medicine candidates from receipt text or a JPG/PNG/WEBP image (local Tesseract). |

### `GET /api/medicines`

| Param           | Default      | Notes                                                                                                                     |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `q`             | `''`         | Free text. Empty returns the whole catalog.                                                                               |
| `sort`          | `best-match` | `best-match` \| `cheapest` \| `nearest` \| `freshest`                                                                     |
| `availableOnly` | `false`      | `true` drops out-of-stock offers and medicines with none in stock.                                                        |
| `lat` / `lon`   | —            | Both or neither. Present ⇒ `distanceKm` is recomputed per branch with the haversine formula. Invalid coordinates ⇒ `400`. |

Response envelope:

```jsonc
{
  "count": 2,
  "dataStatus": "catalog_match", // | "ai_assisted_match" | "catalog_only_no_match"
  "dataSource": "demo_catalog",
  "freshnessNote": "Demo catalog offers. Prices and availability are not live-verified.",
  "aiAssist": { "status": "not_needed" },
  "results": [
    {
      "id": "panadol-extra-500",
      "name": "Panadol Extra",
      "arabicName": "بانادول اكسترا", // derived from searchTerms
      "ingredient": "Paracetamol 500mg + Caffeine 65mg",
      "strength": "500mg + 65mg", // derived from ingredient
      "form": "Tablets",
      "packageSize": 24,
      "offers": [
        {
          "pharmacy": "El Ezaby",
          "branch": "Smouha",
          "price": 85,
          "currency": "EGP",
          "available": true,
          "distanceKm": 1.8,
          "lastChecked": "2026-09-10T…Z",
          "branchInfo": {
            "city": "Alexandria",
            "governorate": "Alexandria",
            "latitude": 31.215,
            "longitude": 29.955,
            "phone": "19600",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=…",
            "pharmacyUrl": "https://elezabypharmacy.com",
            "sourceId": "el-ezaby",
            "sourceStatus": "demo_source",
            "verificationStatus": "unverified",
          },
        },
      ],
    },
  ],
}
```

An unmatched query is **200 with `count: 0`**, not an error.

## Search behaviour

Deterministic, in `server.js`:

1. Unicode NFKC + lowercase; strips Arabic diacritics and tatweel; folds
   `أإآ→ا`, `ى→ي`, `ة→ه`; converts Arabic-Indic digits.
2. Substring match against name, ingredient and per-medicine `searchTerms`
   (which carry the Arabic and Franco aliases).
3. Levenshtein fallback per token — distance ≤1 for short tokens, ≤2 from eight
   characters up. This is what makes `banadol` and `congstal` resolve.

So `بانادول اكسترا`, `banadol`, `congstal` and `paracetamol` all match without
any AI involvement.

### Claude fallback

Only when the deterministic pass returns **zero** results and
`ANTHROPIC_API_KEY` is set: `ai-normalizer.js` asks Claude which _catalog_ names
the query most likely meant, then the same deterministic matcher re-runs against
those names.

Claude can therefore widen recall but can never invent a medicine, price,
pharmacy or availability — anything it returns that isn't literally in the
catalog is discarded. Any failure (no key, no network, malformed JSON, timeout,
refusal) leaves the original empty result untouched, and the response reports
what happened in `aiAssist.status`.

Observed: `nexiam 40` → `Nexium 40mg`; `دواء الصداع بانادول الاحمر` →
`Panadol Extra`; `zzzqqq` → no candidates, no hallucination.

## Data

`mock-medicines.js` plus three base records in `server.js`: **15 medicines**
across two active Alexandria branches (El Ezaby Smouha and Seif Sidi Gaber).

Branch coordinates and hotlines in `pharmacy-directory.js` are real, so distance
ranking and the call/map buttons behave like production. **Prices and
availability are synthetic** and every response says so.

`pharmacy-sources.js` records the nine configured pharmacy sources, their public
catalog observations, and conservative path policies. Every source carries
`authorization: "not_granted"` — no pharmacy has granted data-collection
permission, so no connector may fetch from any of them.

## The NestJS track

`nest/` holds a separate NestJS + TypeORM + Postgres implementation with real
Talabat prices. It is not part of the running demo — see `nest/README.md`.
