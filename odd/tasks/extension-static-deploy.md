# Extension + Static Deploy — GitHub Pages

## Goal

Replace Express/Playwright/CDP backend with a Chromium MV3 extension so the
existing dashboard can run as a static site on GitHub Pages. The user's Uber
session stays in their browser; no secrets leave the client.

## Architecture

```
GitHub Pages (static HTML/CSS/JS)
         │
         │  chrome.runtime.sendMessage(EXTENSION_ID, ...)
         ▼
MV3 Extension (background service worker)
         │
         │  chrome.tabs.sendMessage → content script
         ▼
Content script on riders.uber.com
         │
         │  fetch('https://riders.uber.com/graphql', {credentials:'include'})
         ▼
Uber GraphQL (uses existing session cookies)
```

## Constraints

- Reuse `public/index.html` as the dashboard; minimal changes.
- Chart.js CDN stays (or bundle locally — decide during T02).
- Extension is personal/unpacked; no store publication required.
- No backend, no server, no Playwright, no CDP.
- Privacy: no real trip data in repo; `trips.json` stays gitignored.
- Deploy target: GitHub Pages on this repo.

## Tasks

| ID  | Title | Status |
|-----|-------|--------|
| T01 | Create minimal MV3 extension skeleton | pending |
| T02 | Adapt dashboard to talk to the extension instead of Express | pending |
| T03 | Add extension detection and install guidance UX | pending |
| T04 | Configure GitHub Pages deployment | pending |
| T05 | End-to-end verification and cleanup | pending |

### T01 — Minimal MV3 extension

- `extension/manifest.json`: MV3, `externally_connectable` with the GH Pages
  origin and `localhost` for dev, background service worker, content script
  matching `riders.uber.com`.
- `extension/background.js`: listens for messages from the dashboard, forwards
  to content script, relays response back.
- `extension/content.js`: receives query command, runs `fetch()` against Uber
  GraphQL with `credentials: 'include'`, returns results.
- Move GraphQL queries (ACTIVITIES_QUERY, GET_TRIP_QUERY) and normalization
  helpers into the content script.
- No persistence, no jobs, no storage permission.

### T02 — Dashboard → extension communication

- Replace `checkStatus()` → detect extension via handshake message.
- Replace `searchTrips()` POST to `/api/trips` → send message to extension
  with `{command: 'fetch-trips', from, to}`.
- Extension content script does the pagination loop and returns normalized trips.
- Keep all rendering, filtering, export logic untouched.
- Remove Chart.js CDN in favor of local copy if needed for offline; or keep CDN.

### T03 — Extension detection and guidance UX

- On page load, attempt handshake with extension.
- If not found: show install instructions (link to repo, how to load unpacked).
- If found but no Uber tab: show "Abrí riders.uber.com y logueate".
- If found + Uber tab + not logged in: show auth prompt.
- If everything OK: enable search button.

### T04 — GitHub Pages deployment

- Add `docs/` or configure GH Pages from root/`public/`.
- Ensure `index.html` loads correctly from the Pages URL.
- Update extension `externally_connectable` with the actual `*.github.io` origin.
- Add deploy instructions to README.

### T05 — Verification and cleanup

- Remove `server.js` dependency on Playwright/CDP (or move to legacy/).
- Remove `playwright-core` from dependencies.
- Test full flow: install extension → open GH Pages → search → see trips.
- Ensure `trips.json` is not deployed.
- Update README with new architecture and setup instructions.

## Progress

| Evidence | State |
|----------|-------|
| Extension created | pending |
| Dashboard adapted | pending |
| GH Pages live | pending |
| E2E verified | pending |
