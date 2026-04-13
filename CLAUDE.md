# CLAUDE.md

## What This Is

A Chrome new tab extension (Manifest V3) for Adalie. Vanilla HTML/CSS/JS with ES modules — no build step, no bundler. Loads directly as an unpacked extension.

## Architecture

**Entry points:**
- `newtab.html` → `js/newtab.js` (main page)
- `settings.html` → `js/settings.js` (options page)
- `js/anti-fouc.js` — synchronous script in `<head>` that sets dark/light theme before paint (MV3 forbids inline scripts)

**Shared libraries (`js/lib/`):**
- `storage.js` — settings defaults + `getSettings()`/`saveSettings()` via `chrome.storage.sync`
- `cache.js` — stale-while-revalidate pattern via `chrome.storage.local`. All widgets use `getCached()`/`setCache()` + spinner/stale indicator helpers
- `theme.js` — auto dark/light based on hour, gradient sky interpolation between color stops, exports `initTheme()`, `getTimeOfDay()`, `isDark()`
- `weather-icons.js` — maps OWM icon codes to Meteocons SVG file paths in `icons/weather/`
- `doodles.js` — loads `icons/doodles/meta.json`, builds a pool of simple/sheet/complex SVGs, scatters them randomly around page edges with random rotation/position/size/opacity
- `google-auth.js` — wraps `chrome.identity.getAuthToken()` with token caching and refresh
- `api.js` — simple `fetchJSON()` wrapper

**Widgets (`js/widgets/`):**
- `clock.js` — greeting + time + date in the hero section. Greeting uses weather cache data for context-aware messages. Name defaults to "human" if empty.
- `weather.js` — renders into hero (not a widget card). Uses Meteocons icons from `icons/weather/`. Saves `_units` with cache for temp normalization.
- `calendar.js` — Google Calendar events via OAuth. Events link to Google Calendar.
- `tasks.js` — Google Tasks with list switcher, add task, complete task (PATCH). Full CRUD.
- `github.js` — assigned issues/PRs via personal access token.
- `canvas.js` — Canvas LMS assignments (planner API) + announcements (activity stream). URLs are resolved against the Canvas origin since the API returns relative paths.
- `xkcd.js` — latest/random comic with buttons.
- `lastfm.js` — recent tracks with album art. Track links go to YouTube Music search.
- `quick-links.js` — pill-shaped links to Calendar, Tasks, GitHub, Canvas.
- `sites.js` — `chrome.topSites` + pinned sites with add/unpin UI.

## Layout

Two-column grid: productivity left (2-col sub-grid), fun right, with a subtle divider. Weather is in the hero alongside the clock, not in a widget card. Corner doodles are `position: fixed` scattered around edges.

## Key Patterns

- **Stale-while-revalidate**: Every widget shows cached data immediately, fetches fresh data in the background, shows a spinner during refresh, and a ⚠ stale indicator if refresh fails.
- **No inline scripts**: MV3 CSP. Use external `.js` files only.
- **Canvas URL resolution**: Canvas API returns relative `html_url` paths — must prepend the user's Canvas origin before rendering as links.
- **Weather icons**: Use Meteocons package (`@meteocons/svg` in node_modules, copied to `icons/weather/`). Do NOT generate custom SVG icons.
- **Doodle art**: User provides real SVG art in `icons/doodles/`. Sheets are sprite grids with `cols`/`rows`/`inset` defined in `meta.json`. Do NOT generate AI art — use only the user's provided SVGs.
- **Dark mode**: `[data-theme="dark"]` on `<html>`. Set by `anti-fouc.js` immediately, then maintained by `theme.js`. Widgets get `backdrop-filter: blur(12px)` in dark mode.

## Settings Storage

All in `chrome.storage.sync` via `js/lib/storage.js`:
`userName`, `weatherApiKey`, `weatherUnits`, `githubToken`, `canvasUrl`, `canvasToken`, `lastfmApiKey`, `lastfmUsername`, `themeMode`, `pinnedSites`

## Permissions

- `identity` — Google OAuth
- `storage` — settings + cache
- `topSites` — frequently visited sites
- `host_permissions` — OWM, GitHub, Google APIs, xkcd, Last.fm
- `optional_host_permissions` — `https://*/*` for Canvas (requested at runtime)

## Fonts

Quicksand (display/headers) + DM Sans (body). Loaded from Google Fonts in both `newtab.html` and `settings.html`.
