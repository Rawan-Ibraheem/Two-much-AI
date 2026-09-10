# DawaaFinder

Medicine **price and availability comparison for Egypt** — search for a medicine
in Arabic, English or Franco Arabic and see which pharmacy branches carry it,
what they charge, how far away they are and when the data was last checked.

Hackathon project. Requirements live in [`shared/SKILLS.md`](./shared/SKILLS.md).

## Repository layout

| Path | What's in it |
|---|---|
| [`frontend/dawaa-finder/`](./frontend/dawaa-finder) | **The product UI.** React + Vite + TypeScript + Tailwind. Bilingual (AR/EN) with RTL. Talks to the API below. |
| [`backend/`](./backend) | **The running API.** Dependency-light Node HTTP server (`server.js`). Bilingual, typo-tolerant search, distance ranking, research mode, Claude-assisted query normalization. [Setup + endpoints](./backend/README.md). |
| [`backend/nest/`](./backend/nest) | Parallel **NestJS + Postgres** track with real Talabat price data. Not wired into the demo, and its `npm install` does not currently complete — see [its README](./backend/nest/README.md). |
| [`frontend/`](./frontend) | Plain-HTML API harness (`index.html` + `app.js`). Exercises every endpoint directly, including the receipt-OCR and branch-coverage flows the React UI doesn't surface. |
| [`shared/SKILLS.md`](./shared/SKILLS.md) | Project requirements and conventions. |

## Quick start

Two terminals:

```bash
# 1. API on http://localhost:3000  (no install and no database needed)
npm --prefix backend start
```

```bash
# 2. UI on http://localhost:5173
cd frontend/dawaa-finder
npm install
npm run dev
```

Then open <http://localhost:5173> and search for `Panadol Extra`.

To enable Claude-assisted query normalization, put an `ANTHROPIC_API_KEY` in
`backend/.env` or `shared/.env` (both are git-ignored) — see
[`backend/.env.example`](./backend/.env.example). Search works without it.

## Tests

```bash
npm --prefix backend test                        # 22 API tests
cd frontend/dawaa-finder && npm run smoke        # 16 end-to-end DOM checks
```

The smoke test boots the real API, loads the built frontend bundle in jsdom and
asserts that API data reaches the DOM.

## Data honesty

Pharmacy offers in `backend/` are **demo data**, not a live pharmacy feed. The
API labels every response (`dataSource: "demo_catalog"`, `verificationStatus:
"unverified"`) and the UI surfaces that label, because presenting unverified
stock as freshly verified is explicitly out of bounds in `shared/SKILLS.md`.
Branch coordinates and pharmacy hotlines are real, so distance ranking and the
call/map actions behave like the finished product.

`backend/nest/` holds real EGP prices captured from Talabat storefronts on
2026-09-10 — a point-in-time snapshot, also not a live sync.

## Not built yet

Authentication, admin dashboard, dedicated medicine/pharmacy detail pages,
embedded map view, live pharmacy scrapers, pgvector semantic search, and the
BullMQ/Redis job queue. See the audit notes in `backend/README.md`.
