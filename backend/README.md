# dawasearch-backend

Backend for **DawaSearch** — medicine price and availability comparison for Egypt.

NestJS + TypeORM + Postgres. Two endpoints today: a health check and a medicine
search that returns per-pharmacy prices.

**→ Frontend devs: see [API.md](./API.md)** for the full endpoint reference,
response shapes, error shapes, and current limitations.

---

## Prerequisites

- **Node.js 18+** and npm
- **Docker** with Compose (for Postgres) — or your own Postgres 16 if you'd rather

## Setup

From this directory (`dawasearch-backend/`):

```bash
# 1. Start Postgres (pgvector/pg16 image, data persists in a Docker volume)
docker compose up -d

# 2. Create your local env file
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Create the tables and load demo data
npm run seed

# 5. Run the API (watch mode, restarts on file changes)
npm run start:dev
```

The API listens on **http://localhost:3000**.

> ### ⚠️ Postgres is on port 5433, not 5432
> `docker-compose.yml` maps `5433:5432` because a local system Postgres already
> owns 5432 on the original dev machine. `.env.example` already points at 5433, so
> copying it as-is works. If you change the port, change it in **both**
> `docker-compose.yml` and your `.env`.

### Verify it's working

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/medicines/search?q=panadol"
```

The first returns `{"status":"ok",...}`; the second returns Panadol Extra with
three pharmacy offers, cheapest first.

## npm scripts

| Script | What it does |
|---|---|
| `npm run start:dev` | Run the API in watch mode. **Use this for development.** |
| `npm run dev` | Identical alias of `start:dev` — either works, they run the same command. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm start` | Run the compiled build from `dist/` (no watch). Requires `npm run build` first. |
| `npm run seed` | Wipe and repopulate `pharmacies` / `medicines` / `offers` with demo data. Safe to re-run any number of times. |

## Demo data

`npm run seed` loads **real** Egyptian pharmacy listings and EGP prices captured
from Talabat storefronts (`talabat.com/ar/egypt`) on **2026-09-10**: 5 pharmacy
branches, 4 medicines, 17 offers. It's a point-in-time snapshot, not a live sync,
and each offer's `sourceUrl` opens the pharmacy branch's storefront *category*
page rather than a per-product deep link (Talabat has no stable per-product URLs).

Exactly one offer is synthetic — Panadol Advance at Askar Pharmacy, marked
`available: false` — so the out-of-stock UI path stays demoable. It's flagged as
`SYNTHETIC_DEMO_OFFER` in `src/seed/seed.ts`. Everything else is real.
See [API.md](./API.md#data-source) for the full disclosure.

## Project layout

```
src/
├── main.ts                 App bootstrap; CORS is enabled here
├── app.module.ts           Wires ConfigModule + Database + Health + Medicines
├── database/
│   └── database.module.ts  TypeORM connection; also exports the config the seed script reuses
├── health/                 GET /health
├── medicines/
│   ├── entities/           Pharmacy, Medicine, Offer
│   ├── medicines.controller.ts   GET /medicines/search
│   └── medicines.service.ts      ILIKE search + cheapest-first sorting
└── seed/seed.ts            Standalone seed script (runs outside the Nest app)
```

## CORS

`http://localhost:5173` (Vite's default dev origin) is the only allowed origin,
set in `src/main.ts`. If the frontend runs anywhere else, add that origin there or
the browser will block requests.

## Hackathon shortcuts worth knowing

These are deliberate calls made for speed, not oversights:

- **No migrations.** TypeORM `synchronize: true` creates and patches tables from
  the entity classes on boot. Fine for a hackathon, not for production.
- **`offers` holds current state only.** One row per (medicine, pharmacy) with
  today's price. No price history table.
- **One pharmacy = one location.** No branches, addresses, or coordinates.
- **`price` is stored as Postgres `numeric`** and read as a string internally to
  avoid float precision loss, then converted to a real JSON number in the API
  response. API consumers always get numbers — see [API.md](./API.md).
- **Search is plain `ILIKE` keyword matching.** No fuzzy matching, no Arabic
  support, no semantic search yet.
- **No tests, no auth.** Verification is manual via curl.
