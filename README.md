# DawaaFinder

DawaaFinder is a medicine search and comparison app for Egypt. It helps users look up a medicine in Arabic, English, or Franco-Arabic and compare pharmacies by price, branch availability, distance, and freshness of the data.

This repository contains the product UI, the backend API, a separate NestJS prototype, and the project requirements that define the product constraints.

## Project goals

- Search medicines using Arabic, English, and Franco-Arabic variants
- Compare pharmacy offers across branches
- Sort results by best match, price, distance, or freshness
- Surface data-source and verification labels to keep the app honest
- Support research and availability checks without pretending the data is live

Requirements and product constraints live in [shared/SKILLS.md](./shared/SKILLS.md).

## Repository layout

| Path                                              | Description                                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [frontend/dawaa-finder/](./frontend/dawaa-finder) | React + Vite + TypeScript UI for the main product experience. Includes bilingual English/Arabic support and RTL layout.                                                                          |
| [backend/](./backend)                             | Node.js API used by the product. Includes typo-tolerant search, distance ranking, research mode, and optional Claude-assisted query normalization. See [backend/README.md](./backend/README.md). |
| [backend/nest/](./backend/nest)                   | Separate NestJS + Postgres track with Talabat data snapshot. Not wired into the demo flow. See [backend/nest/README.md](./backend/nest/README.md).                                               |
| [frontend/](./frontend)                           | Static HTML harness used to exercise API endpoints directly, including the OCR and branch-coverage flows.                                                                                        |
| [shared/SKILLS.md](./shared/SKILLS.md)            | Project requirements, guardrails, and product conventions.                                                                                                                                       |

## Quick start

Run the API and UI in two terminals:

```bash
# Terminal 1: API on http://localhost:3000
npm --prefix backend start
```

```bash
# Terminal 2: UI on http://localhost:5173
cd frontend/dawaa-finder
npm install
npm run dev
```

Then open <http://localhost:5173> and search for `Panadol Extra`.

To enable Claude-assisted query normalization, add `ANTHROPIC_API_KEY` to `backend/.env` or `shared/.env` (both are git-ignored). A sample file is available at [backend/.env.example](./backend/.env.example). Search still works without it.

## Testing

```bash
npm --prefix backend test
cd frontend/dawaa-finder && npm run smoke
```

The backend test suite covers API behavior, and the frontend smoke test boots the real API and validates that data reaches the DOM correctly.

## Data honesty

The demo data in [backend/](./backend) is not a live pharmacy feed. Responses are labeled with values such as `dataSource: "demo_catalog"` and `verificationStatus: "unverified"`, and the UI surfaces those labels. This is intentional and is required by the project guardrails in [shared/SKILLS.md](./shared/SKILLS.md).

Branch coordinates and pharmacy hotlines are real, so distance ranking and map/call actions behave like a finished product. However, prices and availability are synthetic and should not be presented as live-verified stock.

The NestJS prototype in [backend/nest/](./backend/nest) contains a real Talabat price snapshot captured on 2026-09-10, but it is also not a live sync.

## Not yet built

The project intentionally does not include:

- authentication
- admin dashboard
- dedicated medicine and pharmacy detail pages
- embedded map experience
- live pharmacy scraping
- pgvector semantic search
- BullMQ/Redis job queue

See [backend/README.md](./backend/README.md) for the audit notes and implementation details.

Demo and Presentation:
https://drive.google.com/drive/folders/1iYnxFTbQtH5JtoC9L0yOkrDzLbkoxNux?usp=drive_link
