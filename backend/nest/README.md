# DawaSearch — NestJS + Postgres track

A second, independent backend implementation: NestJS + TypeORM + Postgres,
seeded with **real EGP prices captured from Talabat storefronts on 2026-09-10**.

**It is not what the demo runs.** The React frontend talks to `../server.js`.
Nothing here is wired into the UI.

## Why it is separate

Both backends were built in parallel and merged into one `backend/` folder. The
merge kept the Node server's `package.json` and silently dropped this app's
dependencies and scripts, which left the whole `src/` tree uncompilable — no
`@nestjs/*`, no `typeorm`, no `nest build`, no `seed`. Moving it into `nest/`
with its own `package.json` and lockfile (both recovered from git history at
`94bee02`) removes that conflict, so the two apps no longer fight over
`backend/package.json`.

## Status: dependencies restored, install unverified

⚠️ `npm install` **and** `npm ci` both abort here with
`FATAL ERROR: Zone Allocation failed - process out of memory` while resolving
this dependency tree — even from the committed lockfile, and with
`NODE_OPTIONS=--max-old-space-size=4096`. Smaller installs on the same machine
succeed, so this looks like a local memory ceiling on a ~600-package tree rather
than a bad manifest, but it means **nothing below has been executed end to end.**

One manifest detail worth a look before trusting it: `package.json` pins
`typeorm: ^1.1.1` while `@nestjs/typeorm@^12.0.1` declares
`typeorm: ^0.3.0 || ^1.0.0-dev`. That resolves in the lockfile, but it is an
unusual pin and a plausible first suspect if the install misbehaves elsewhere.

## Run

```bash
cd backend/nest
docker compose up -d      # Postgres on host port 5433 (not 5432)
cp .env.example .env
npm install
npm run seed
npm run start:dev
```

Set `PORT` to something other than `3000` if the Node API is already running:

```bash
PORT=3001 npm run start:dev
curl "http://localhost:3001/medicines/search?q=panadol"
```

`.env.example` documents `PORT` and `DATABASE_URL`. The host port is 5433
because `docker-compose.yml` maps `5433:5432`.

## What it has

- `GET /health`, `GET /medicines/search?q=`
- Postgres schema: `medicines` / `pharmacies` / `offers`, `synchronize: true`
  (no migrations)
- Seed: 5 pharmacies, 4 medicines, 17 offers (16 real + 1 clearly flagged
  synthetic out-of-stock row)
- Full API reference in [`API.md`](./API.md)
- CORS locked to `http://localhost:5173` in `src/main.ts`

## What it lacks versus the Node API

No Arabic, Franco Arabic or typo tolerance (`ILIKE '%q%'` on name and active
ingredient only — `بانادول` and `panadl` both return `[]`). No branch,
coordinate, distance, phone or map data — the branch is baked into the pharmacy
name string. No sorting or filter parameters, no research mode, no AI assist.

Its advantages are real prices, a real relational schema, and the Postgres +
pgvector foundation `shared/SKILLS.md` asks for. Porting the Node server's
normalization and branch model onto this schema is the natural next step.

## Untouched by the audit

`API.md` documents this app as it was written; it does **not** describe
`../server.js`. Its "CORS is `localhost:5173`" and endpoint notes apply to this
NestJS app only.
