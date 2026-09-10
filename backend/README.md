# Medicine Search Node.js Backend

This backend is a dependency-light Node.js REST API. It uses the native Node
HTTP server, `fetch`, and `node:test`; no Express or database is required for
the current demo slice.

## Run

From the repository root:

```bash
npm --prefix backend start
```

The API listens on `http://localhost:3000` by default. Set `PORT` to use a
different port.

## Test

```bash
npm --prefix backend test
npm --prefix backend run check
```

## Endpoints

- `GET /api/health`: service health.
- `GET /api/medicines?q=...`: bilingual, typo-tolerant catalog search with
  sorting, availability filtering, and optional `lat`/`lon` distance values.
- `POST /api/ocr/analyze`: analyze text or JPG/PNG/WEBP receipt images with
  local Tesseract Arabic-English OCR, then return medicine candidates for review.
- `POST /api/search/coverage`: find branches covering confirmed medicine IDs.
- `POST /api/research/availability`: return nearby mock research offers with
  freshness and source status.
- `GET /api/pharmacy-sources`: inspect source crawl policies and statuses.

The current pharmacy offers are synthetic demo data. Live source connectors
remain disabled until a pharmacy provides an approved API, feed, or written
permission for the limited public fields this project needs.