# DawaSearch API reference

Base URL in development: `http://localhost:3000`

All responses are JSON. There is no auth — every endpoint is open.

**CORS:** `http://localhost:5173` (the Vite dev server default) is the only allowed
origin. If you run the frontend on a different port, tell the backend dev to add it
in `src/main.ts` — otherwise the browser will block the request.

---

## `GET /health`

Liveness check. Takes no parameters. Useful as a "is the backend up?" probe.

**Request**

```bash
curl http://localhost:3000/health
```

**200 response**

```json
{
  "status": "ok",
  "service": "dawasearch-backend",
  "timestamp": "2026-09-10T13:14:56.758Z"
}
```

`timestamp` is the server's current time as an ISO 8601 UTC string, regenerated per request.

---

## `GET /medicines/search`

The main endpoint. Searches medicines and returns, for each match, every pharmacy
offer for it so the user can compare prices.

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `q` | string | **yes** | Free-text search term. Leading/trailing whitespace is trimmed before searching. Missing, empty, or whitespace-only → `400`. |

There are no other parameters — no pagination, no sorting options, no filters.

### How matching works

`q` is matched case-insensitively as a **substring** (SQL `ILIKE '%q%'`) against
**two** fields:

- the medicine's `name` (e.g. `Panadol Extra`)
- the medicine's `activeIngredient` (e.g. `Paracetamol + Caffeine`)

A medicine is returned if **either** field matches.

### How results are ordered and grouped

- Results are grouped by **distinct medicine**. A brand and a generic that share an
  active ingredient are **always returned as separate entries** — they are never
  merged into one row. Searching `paracetamol` returns three separate products.
- Within each medicine, `offers[]` is sorted by **`price` ascending** (cheapest first).
- The top-level array is sorted by each medicine's **`cheapestPrice` ascending**, so
  the overall cheapest product comes first.

### Response shape

The response is an **array** (not an object wrapper) of:

| Field | Type | Notes |
|---|---|---|
| `medicine.id` | string (uuid) | Stable per seed run, but the seed script regenerates ids every time it runs — don't hardcode them. |
| `medicine.name` | string | e.g. `"Panadol Extra"` |
| `medicine.activeIngredient` | string | e.g. `"Paracetamol + Caffeine"` |
| `medicine.strength` | string | e.g. `"500mg/65mg"` |
| `medicine.form` | string | e.g. `"Tablet"`, `"Capsule"` |
| `medicine.packageSize` | string | e.g. `"20 tablets"` |
| `cheapestPrice` | number \| null | Price of the first entry in `offers[]`. `null` only if the medicine has no offers at all. |
| `offers` | array | Sorted cheapest-first. Can be empty. |
| `offers[].pharmacyName` | string | e.g. `"Seif Pharmacy"` |
| `offers[].city` | string | Plain text, e.g. `"Cairo"`, `"Alexandria"` |
| `offers[].price` | **number** | A real JSON number (`85`, `89.75`) — **not a string**. See the note below. |
| `offers[].available` | boolean | `false` means listed but currently out of stock. |
| `offers[].lastCheckedAt` | string | ISO 8601 UTC timestamp of when this price was last confirmed. |
| `offers[].sourceUrl` | string \| null | Link to the pharmacy branch's storefront page on Talabat. Nullable in the schema, but every seeded offer has one. **Points at a category page, not this exact product** — see below. |

> **`price` is always a JSON number.** Internally the column is Postgres `numeric` and
> the driver hands it to the backend as a string (to avoid float precision loss), but
> the API converts it to a number at the response boundary. You will never receive
> `"85.00"`. Note that JSON drops trailing zeros, so a price of 85.00 arrives as `85`
> — format it for display on the frontend (e.g. `price.toFixed(2)` → `85.00 EGP`).

> **`available: false` offers are included, not filtered out.** The frontend should
> visually distinguish them (grey them out, add a "currently unavailable" label)
> rather than hiding them — knowing a pharmacy carries the product but is out of
> stock is useful to the user. Note that an unavailable offer can still be the
> cheapest one and therefore drive `cheapestPrice`.

> **`sourceUrl` is a storefront page, not a product deep link.** It opens the
> pharmacy branch's product-category page on Talabat — their real online ordering
> page — but Talabat exposes no stable per-product URLs, so the user lands on the
> category listing and still has to find the product row themselves. Label the
> button accordingly ("View on Talabat" / "Order from this pharmacy"), **not**
> "Buy this product" — don't imply more precision than the link actually has.

### Example: brand-name search

```bash
curl "http://localhost:3000/medicines/search?q=panadol"
```

Two separate Panadol products, each with its own offers. Note `Bee Well` is
cheapest on Panadol Advance and `Askar` is the most expensive everywhere it appears.

```json
[
  {
    "medicine": {
      "id": "5f0a…",
      "name": "Panadol Extra with Optizorb",
      "activeIngredient": "Paracetamol + Caffeine",
      "strength": "500mg/65mg",
      "form": "Tablet",
      "packageSize": "24 tablets"
    },
    "cheapestPrice": 58,
    "offers": [
      {
        "pharmacyName": "Bee Well Pharmacies — Haram, Talbiya",
        "city": "Giza",
        "price": 58,
        "available": true,
        "lastCheckedAt": "2026-09-10T13:20:22.752Z",
        "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/761800/bee-well-pharmacies-haram-talbiya-2/medicines/common-symptoms?aid=7668"
      },
      {
        "pharmacyName": "Therapy Pharmacy — Msaken, Masna El Seed",
        "city": "Cairo",
        "price": 58,
        "available": true,
        "lastCheckedAt": "2026-09-10T13:20:22.752Z",
        "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/787087/therapy-pharmacy-msaken-masna-seed/medicines/common-symptoms?aid=7260"
      },
      {
        "pharmacyName": "Al Wassal Pharmacy — Old Maadi",
        "city": "Cairo",
        "price": 58,
        "available": true,
        "lastCheckedAt": "2026-09-10T13:20:22.752Z",
        "sourceUrl": "https://www.talabat.com/ar/egypt/grocery/692231/alwassal-pharmacy-maadi-old/medicines/common-symptoms?aid=7595"
      },
      {
        "pharmacyName": "Askar Pharmacy — Gadila, Toreel",
        "city": "Cairo",
        "price": 67,
        "available": true,
        "lastCheckedAt": "2026-09-10T13:20:22.752Z",
        "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/727666/askar-pharmacy-gadila-toreel/medicines/common-symptoms?aid=8711"
      }
    ]
  },
  {
    "medicine": {
      "id": "8c31…",
      "name": "Panadol Advance",
      "activeIngredient": "Paracetamol",
      "strength": "500mg",
      "form": "Tablet",
      "packageSize": "48 tablets"
    },
    "cheapestPrice": 87.4,
    "offers": [
      { "pharmacyName": "Bee Well Pharmacies — Haram, Talbiya",     "city": "Giza",  "price": 87.4, "available": true,  "lastCheckedAt": "2026-09-10T13:20:22.752Z", "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/761800/bee-well-pharmacies-haram-talbiya-2/medicines/common-symptoms?aid=7668" },
      { "pharmacyName": "Dr Ahmed El Ezaby Pharmacy — Helwan",      "city": "Cairo", "price": 92,   "available": true,  "lastCheckedAt": "2026-09-10T13:20:22.752Z", "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/726709/drahmed-el-ezaby-pharmacy-helwan/medicines/common-symptoms?aid=10486" },
      { "pharmacyName": "Therapy Pharmacy — Msaken, Masna El Seed", "city": "Cairo", "price": 92,   "available": true,  "lastCheckedAt": "2026-09-10T13:20:22.752Z", "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/787087/therapy-pharmacy-msaken-masna-seed/medicines/common-symptoms?aid=7260" },
      { "pharmacyName": "Al Wassal Pharmacy — Old Maadi",           "city": "Cairo", "price": 92,   "available": true,  "lastCheckedAt": "2026-09-10T13:20:22.752Z", "sourceUrl": "https://www.talabat.com/ar/egypt/grocery/692231/alwassal-pharmacy-maadi-old/medicines/common-symptoms?aid=7595" },
      { "pharmacyName": "Askar Pharmacy — Gadila, Toreel",          "city": "Cairo", "price": 95,   "available": false, "lastCheckedAt": "2026-09-10T13:20:22.752Z", "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/727666/askar-pharmacy-gadila-toreel/medicines/common-symptoms?aid=8711" }
    ]
  }
]
```

The last Panadol Advance offer has `available: false` — render it greyed out, not
hidden. (That one row is synthetic; see [Data source](#data-source).)

### Example: active-ingredient search (brand vs. generic stay separate)

```bash
curl "http://localhost:3000/medicines/search?q=paracetamol"
```

Returns **three separate entries**, cheapest first — they are never merged, even
though all three contain paracetamol:

| Entry | Active ingredient | `cheapestPrice` |
|---|---|---|
| Cetal | Paracetamol | 24 |
| Panadol Extra with Optizorb | Paracetamol + Caffeine | 58 |
| Panadol Advance | Paracetamol | 87.4 |

Panadol Extra matches on `activeIngredient` only — the string `paracetamol` does
not appear in its name.

### Example: narrower availability

```bash
curl "http://localhost:3000/medicines/search?q=cetal"
```

Only the three pharmacies that actually carry Cetal are returned — Bee Well and
Al Wassal don't list it, so they're simply absent:

```json
[
  {
    "medicine": {
      "id": "53df…",
      "name": "Cetal",
      "activeIngredient": "Paracetamol",
      "strength": "500mg",
      "form": "Tablet",
      "packageSize": "20 tablets"
    },
    "cheapestPrice": 24,
    "offers": [
      { "pharmacyName": "Dr Ahmed El Ezaby Pharmacy — Helwan",      "city": "Cairo", "price": 24, "available": true, "lastCheckedAt": "2026-09-10T13:20:22.752Z", "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/726709/drahmed-el-ezaby-pharmacy-helwan/medicines/common-symptoms?aid=10486" },
      { "pharmacyName": "Therapy Pharmacy — Msaken, Masna El Seed", "city": "Cairo", "price": 24, "available": true, "lastCheckedAt": "2026-09-10T13:20:22.752Z", "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/787087/therapy-pharmacy-msaken-masna-seed/medicines/common-symptoms?aid=7260" },
      { "pharmacyName": "Askar Pharmacy — Gadila, Toreel",          "city": "Cairo", "price": 28, "available": true, "lastCheckedAt": "2026-09-10T13:20:22.752Z", "sourceUrl": "https://www.talabat.com/ar/egypt/pharmacy/727666/askar-pharmacy-gadila-toreel/medicines/common-symptoms?aid=8711" }
    ]
  }
]
```

A short offer list is a normal case, not an error. Consider showing something like
"available at 3 pharmacies" rather than implying the data is incomplete.

### Example: no matches

```bash
curl "http://localhost:3000/medicines/search?q=xyzxyz"
```

**HTTP 200** with an empty array — an unmatched search is *not* an error:

```json
[]
```

Render an empty state ("no results for …"), not an error toast.

---

## Errors

Every error uses Nest's default JSON shape. There is no custom error envelope.

### `400 Bad Request` — missing or blank `q`

Triggered by `/medicines/search`, `?q=`, or `?q=%20%20` (whitespace only).

```json
{ "message": "q is required", "error": "Bad Request", "statusCode": 400 }
```

### `404 Not Found` — unknown route

Any path that isn't `/health` or `/medicines/search`. Note that `GET /medicines`
(without `/search`) is a 404 — there is no list-all endpoint.

```json
{ "message": "Cannot GET /medicines", "error": "Not Found", "statusCode": 404 }
```

### `500 Internal Server Error` — unexpected failure

E.g. the database is down. Note this shape has **no `error` field** — that's Nest's
default for unhandled exceptions, so don't rely on `error` always being present.

```json
{ "statusCode": 500, "message": "Internal server error" }
```

Key order varies between shapes; parse by key, not position.

---

## Known limitations for the frontend to design around

These are current gaps, not bugs. Design around them for now.

1. **No pagination.** Every match is returned in a single response. A broad query
   (e.g. `a`) returns everything that matches at once. With seed data this is a
   handful of rows, so it's fine — just don't build UI that assumes a page cursor.

2. **No structured branch, address, or map data.** An offer gives you
   `pharmacyName`, `city`, and `sourceUrl` — nothing else. The branch is baked
   into the name string (`Al Wassal Pharmacy — Old Maadi`), so you can display it
   but can't filter or group by it; there is no separate branch, address,
   coordinate, phone, or opening-hours field, and each branch is modelled as its
   own standalone pharmacy row. Don't design a map view or a "nearest branch"
   feature yet.

3. **No `GET /pharmacies` or `GET /medicines` list-all endpoints.** `/medicines/search`
   is the *only* way to get data out of the API. **The homepage should therefore be
   search-first — a search bar — not a browse/listing/category page,** because there
   is no endpoint that can populate a listing.

4. **Search is plain keyword matching only.** It is a case-insensitive substring
   match (`ILIKE`) on medicine name and active ingredient. That means:
   - No typo tolerance or fuzzy matching — `panadl` returns `[]`.
   - No Arabic or Franco-Arabic understanding — `بانادول` and `banadol` return `[]`.
   - No synonyms, no spelling normalization, no semantic/vector search.

   Smarter matching is a later story. **For demos, use the exact seeded English
   names from the cheat sheet below.** Note this bites on real product names:
   `Panadol Extra` matches, but the seeded name is `Panadol Extra with Optizorb`,
   so a user typing `optizorb` matches while `extra optizorb` does not — it's a
   single substring match, not word-by-word.

5. **Prices are current-state only.** There is no price history and no
   "price changed since yesterday" data. `lastCheckedAt` tells you when the price
   was last confirmed, nothing more.

---

## Data source

Seed data reflects **real pharmacy listings and real EGP prices captured from
Talabat storefronts** (`talabat.com/ar/egypt`) on **2026-09-10**, loaded by
`npm run seed` for demo purposes.

Three things to be honest about when presenting this:

1. **It is a point-in-time snapshot, not a live sync.** Nothing re-fetches these
   prices. They were accurate on 2026-09-10 and drift out of date the moment a
   pharmacy changes them. `lastCheckedAt` is the seed run time, not a real
   re-check. Don't label the UI "live prices" or "updated today".
2. **`sourceUrl` is the pharmacy branch's storefront category page, not a
   per-product deep link.** Talabat exposes no stable per-product URLs, so the
   link is an accurate answer to "where do I buy this?" — it opens that branch's
   real online ordering page — but it lands on the category listing, not on the
   exact product row. Don't present it as more precise than that.
3. **One offer is synthetic.** Panadol Advance at Askar Pharmacy (95.00,
   `available: false`) is fabricated so the out-of-stock code path stays
   demoable — Askar does not actually list Panadol Advance. It is flagged in
   `src/seed/seed.ts` as `SYNTHETIC_DEMO_OFFER`. **Every other offer is real.**

---

## Seed data cheat sheet

Populated by `npm run seed` (see the README): **5 pharmacies, 4 medicines,
17 offers** (16 real + 1 synthetic).

### Pharmacies

| Pharmacy | City |
|---|---|
| Dr Ahmed El Ezaby Pharmacy — Helwan | Cairo |
| Bee Well Pharmacies — Haram, Talbiya | Giza |
| Therapy Pharmacy — Msaken, Masna El Seed | Cairo |
| Askar Pharmacy — Gadila, Toreel | Cairo |
| Al Wassal Pharmacy — Old Maadi | Cairo |

Note the branch is part of the `pharmacyName` string (e.g. `— Old Maadi`). There
is no separate branch field to read it from — see limitation 2 above.

### Medicines and prices (EGP)

| Medicine | Ingredient / pack | El Ezaby | Bee Well | Therapy | Askar | Al Wassal |
|---|---|---|---|---|---|---|
| Panadol Extra with Optizorb | Paracetamol + Caffeine, 24 tabs | — | **58** | 58 | 67 | 58 |
| Panadol Advance | Paracetamol, 48 tabs | 92 | **87.40** | 92 | 95 *(synthetic, unavailable)* | 92 |
| Antinal | Nifuroxazide, 24 caps | 52 | **49.40** | 52 | 60 | 52 |
| Cetal | Paracetamol, 20 tabs | **24** | — | 24 | 28 | — |

**Bold** = cheapest. `—` = that branch does not list it, so no offer row exists.
Askar is consistently the most expensive, which makes cheapest-first sorting
visibly meaningful in the demo.

### Queries worth wiring into the demo

| Query | What you get |
|---|---|
| `panadol` | 2 separate medicines; includes the `available: false` row |
| `paracetamol` | 3 separate medicines (Cetal, Panadol Extra, Panadol Advance) |
| `antinal` | 1 medicine, all 5 pharmacies — widest comparison |
| `cetal` | 1 medicine, only 3 pharmacies — narrower footprint |
| `nifuroxazide` | Matches Antinal via active ingredient, not name |
| `xyzxyz` | `[]` — empty state |
| *(omitted)* | `400` — validation error state |
