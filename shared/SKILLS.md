IMPORTANT HACKATHON RULES

We have only 4 hours.

Prioritize:

1. Working code
2. Demo functionality
3. Simple implementation
4. Clean UI
5. Reliability

Do NOT overengineer.

Do NOT introduce new frameworks.

Do NOT add infrastructure unless absolutely necessary.

Do NOT implement future production architecture.

Do NOT refactor unrelated code.

Do NOT build features outside the current task.

If something is difficult, implement the simplest reliable version that demonstrates the concept.

After completing each requested task:

- run/test it
- fix obvious errors
- STOP
- wait for the next task

Never implement the entire project in one response.

# Egyptian Medicine Search — Project Notes

## Goal

Build a website for Egypt where users can search for a medicine and compare its availability and prices across multiple pharmacies.

The platform should work like **Google/Booking.com for finding medicines**.

---

## MVP

User searches for a medicine and gets:

- Medicine name
- Price
- Availability
- Pharmacy
- Branch/location
- Distance from user
- Last checked time
- Pharmacy product link
- Call/contact option

Users can:

- Search in Arabic or English
- Use Egyptian Arabic / Franco / phonetic spelling
- Search by brand or active ingredient
- Compare pharmacy prices
- Sort by cheapest, nearest, best match, or freshest
- Filter by price, location, availability, strength, package size, dosage form
- View pharmacy-level and branch-level results
- Use a Research mode for fresh verification

No purchasing inside our platform. "Buy" redirects to the pharmacy website.

No diagnosis, prescription, or medical advice.

---

## Search

Use hybrid search:

1. Exact/keyword search
2. Vector/semantic search
3. Claude AI for normalization when needed
4. Structured medicine matching
5. Return verified pharmacy offers

Search must understand:

- Arabic
- English
- Egyptian Arabic
- Franco Arabic
- Misspellings
- Different transliterations
- Brand names
- Generic/active ingredients
- Strengths and units

---

## Medicine Matching

Medicine identity must be structured and accurate.

Important fields:

- Brand
- Active ingredient
- Strength
- Dosage form
- Package quantity
- Manufacturer
- Generic/brand relationship
- Prescription status

Different strengths, package sizes, forms, and products must remain separate.

Preferred matching flow:

`Barcode/GTIN → Structured fields → AI fallback → Verification`

AI must never be the only authority for medicine equivalence.

---

## Results

Results are **product-first**.

Example:

```text
Panadol Extra

Pharmacy A — 85 EGP
Pharmacy B — 92 EGP
Pharmacy C — 110 EGP

Show:

Cheapest price
All available offers
Savings
Pharmacy
Branch
Distance
Last checked

If nothing is available:

Not currently available

Do not present related medicines as equivalent.

Pharmacies

MVP starts with 3–5 pharmacy websites.

Use public pharmacy websites where allowed.

Prefer official APIs/data feeds when available.

Architecture must support adding hundreds of pharmacies later.

Each pharmacy has its own connector:

PharmacyConnector
├── PharmacyAAdapter
├── PharmacyBAdapter
├── PharmacyCAdapter
└── ...

Common scraper infrastructure handles:

Retries
Rate limits
Caching
Logging
Normalization
Playwright fallback
Monitoring

Scraping:

HTTP request → HTML parser
                    ↓
              if JavaScript required
                    ↓
                 Playwright

Respect robots.txt, terms, rate limits, and website stability.

Freshness

Normal search:

Cached data
    ↓
Show immediately
    ↓
If stale → background refresh

Show Last checked.

If refresh fails, mark the data as stale/unverified.

Never present failed/stale data as freshly verified.

Research Mode

Research = fresh verification.

When Research is requested:

Re-check relevant pharmacies
Search for missed products
Normalize/match products
Verify results
Return only confidently verified results

Uncertain results should not be shown as confirmed matches.

Location

Users can search across all Egypt.

If location is available:

Rank nearby pharmacies higher
Calculate distance
Show nearby branches

If location is unavailable:

Let user choose governorate/city
Maps

Use Google Maps Platform for:

Pharmacy locations
Branch maps
Geocoding
Distance calculations
Nearby ranking
Frontend

React + Vite + TypeScript

Main pages/features:

Home/Search
Search Results
Medicine Details
Pharmacy Details
Map
Research
Login/Register
User Dashboard
Admin Dashboard

UI:

Arabic + English
RTL support
Simple homepage
Large medicine search bar
Backend

NestJS + TypeScript

Modules:

Auth
Medicines
Search
Pharmacies
Branches
Offers
Scrapers
Research
Alerts
Users
Admin
Analytics

API: REST

Database

PostgreSQL + pgvector

Main data:

Users
Medicines
Ingredients
Brands
Pharmacies
Branches
Products
Offers
Price
Availability
Last checked
Embeddings
Scraper status
Research jobs
Alerts

For MVP, store current price/availability only, not full price history.

Background Jobs

Redis + BullMQ

NestJS
  ↓
Redis + BullMQ
  ↓
Scraper Workers
  ↓
Pharmacy Websites
  ↓
PostgreSQL

Jobs:

Pharmacy search
Pharmacy refresh
Research
Price check
Availability check
Alerts
AI

Use Anthropic API / Claude for:

Query normalization
Arabic/English understanding
Egyptian Arabic / Franco understanding
Misspelling handling
Product matching assistance
Ambiguous product resolution
Scraper extraction assistance
Research assistance

AI assists the system but does not replace structured verification.

Authentication

Optional accounts.

Use:

Google OAuth
Email/password

Accounts can eventually support:

Saved medicines
Favorite pharmacies
Search history
Price alerts
Availability alerts

Alerts should be backend-ready but limited/hidden in MVP.

Admin Dashboard

Admin can manage:

Pharmacies
Pharmacy connectors
Medicines
Product mappings
Prices/availability
Scraper status
Users
Analytics

MVP pharmacy onboarding is admin-only.

Pharmacy Directory

Future feature:

Browse pharmacies across Egypt with:

Governorate
City
Branches
Map
Pharmacy information
Tech Stack
Component	Technology
Frontend	React + Vite + TypeScript
Backend	NestJS + TypeScript
API	REST
Database	PostgreSQL
Vector Search	pgvector
Queue	BullMQ
Queue Backend	Redis
AI	Anthropic API / Claude
AI Coding	Claude Code
Scraping	HTTP + HTML parser → Playwright
Maps	Google Maps Platform
Auth	Google OAuth + Email/Password
Languages	Arabic + English
Pharmacy Sources	Public pharmacy websites
Initial Pharmacies	3–5
Core Rules
Accuracy over AI cleverness
Never confuse different strengths/packages/forms
AI is not the only authority for medicine matching
Normal search must be fast
Research must perform fresh verification
Show transparent price/location/freshness information
No medical advice
No direct purchasing in MVP
Start with 3–5 pharmacies
Architecture must allow hundreds of pharmacies later
Stale data must be clearly marked
Use Claude Code to build the project
MVP Priority
Must have
Medicine search
Arabic/English search
Medicine normalization
3–5 pharmacy connectors
Product matching
Price comparison
Availability
Pharmacy + branch information
Location/distance
Last checked
Search filters/sorting
Research mode
Admin dashboard
PostgreSQL
NestJS API
React frontend
Scraper workers
Later
Pharmacy self-registration
Pharmacy APIs/data feeds
Price history
Price alerts
Availability alerts
Full pharmacy directory
More pharmacies
Advanced user accounts
Advanced analytics
Direct pharmacy integrations
```
