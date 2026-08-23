# Jobfindr

A stripped-down, standalone job **aggregator** (Next.js App Router). Search
multiple job boards through their APIs, filter to exactly what you want, and
export the results to CSV to apply later.

## Features

- **Local mode (default) / Remote mode** toggle.
- **Search bar** for keywords, a **location** dropdown (local mode), and
  **work mode** (remote / hybrid / on-site) + **work basis** (full-time /
  part-time / contract / internship) filters.
- **API-only** sources — no scraping. Local boards are preferred for local mode.
- Results are deduplicated (stable fingerprint) and filtered by your parameters.
- **Export to CSV** — one click, opens in Excel/Sheets.

## Sources

| Source | Mode | Key |
|---|---|---|
| NaJobs, Jobs in Namibia (WordPress REST) | local (Namibia) | none |
| The Muse (location-aware) | local + remote | none |
| Adzuna | local (covered countries) | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` (optional) |
| Remotive, Remote OK, Arbeitnow, Himalayas | remote | none |

Adding another country's local board is one entry in
`lib/sources/wordpress.ts` (`wordpressBoard({ id, name, baseUrl, country, cities })`)
plus the country in `lib/constants.ts` — many small boards run on WordPress and
expose `/wp-json/wp/v2/posts`.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional Adzuna keys go in `.env` (see `.env.example`). No keys are required.

## How it works

1. `POST /api/search` with `{ mode, keywords, location, workMode, workBasis }`.
2. The server reads matching jobs from Firestore (shared cache) **in parallel**
   with live board requests. A failing board is skipped, not fatal.
3. Raw live jobs are normalized + fingerprint-deduped, then `applyFilters`
   keeps listings matching keywords, location, work mode, and work basis.
4. Cached hits and live hits are merged (new live listings are added; the same
   fingerprint is refreshed from live). The merged set is written back to
   Firestore so the next search — same user or someone else — can reuse it.
5. The client renders the results and can export them to CSV.

The browser never talks to Firestore. Only the Next.js server uses the
Firebase Admin SDK against the same project as shanda (`shanfa-afbf4`).
Jobs are stored in `liteJobs` / `liteQueries` so they do not collide with
shanda's collections. Point `GOOGLE_APPLICATION_CREDENTIALS` at shanda's
`serviceAccount.json` (see `.env.example`). Search still works without
credentials; the cache is simply skipped.

