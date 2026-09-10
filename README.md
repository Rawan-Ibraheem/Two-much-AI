# DawaSearch

Medicine **price and availability comparison for Egypt** — search for a medicine,
see which pharmacies have it and what they charge, cheapest first.

Hackathon project. Backend-only so far; the frontend is next.

## Repository layout

| Path | What's in it |
|---|---|
| [`dawasearch-backend/`](./dawasearch-backend) | NestJS + TypeORM + Postgres API. Setup instructions in its [README](./dawasearch-backend/README.md). |
| [`dawasearch-backend/API.md`](./dawasearch-backend/API.md) | **API reference for frontend work** — endpoints, response shapes, errors, limitations. |

## Quick start

```bash
cd dawasearch-backend
docker compose up -d     # Postgres on host port 5433 (not 5432 — see backend README)
cp .env.example .env
npm install
npm run seed
npm run start:dev        # API on http://localhost:3000
```

Then:

```bash
curl "http://localhost:3000/medicines/search?q=panadol"
```

Full setup notes and troubleshooting: [`dawasearch-backend/README.md`](./dawasearch-backend/README.md).

## Status

**Working:** `GET /health`, `GET /medicines/search?q=`, Postgres schema + demo seed
data, CORS enabled for a Vite frontend on `http://localhost:5173`.

**Not built yet:** frontend, pagination, pharmacy branches/maps, Arabic and
fuzzy search, scraping, auth.
