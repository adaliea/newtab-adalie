# Adalie's New Tab

A custom Chrome new tab page with a pastel aesthetic, time-based gradient sky, kawaii doodles, and integrations for productivity and fun.

Built mostly by [Claude](https://claude.ai) (Anthropic's AI), directed and designed by Adalie.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4a7c6f?style=flat-square&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)

## Features

- **Time-aware gradient sky** — background shifts from dawn pink to day blue to sunset orange to night navy
- **Auto dark/light theme** — switches based on time of day (or set manually)
- **Weather in the hero** — large Meteocons icon with temp, feels-like, humidity, and wind
- **Google Calendar & Tasks** — upcoming events (clickable), task lists with add/complete support
- **GitHub** — issues and PRs assigned to you
- **Canvas LMS** — upcoming assignments and recent announcements (clickable links to Canvas)
- **xkcd** — latest or random comic
- **Last.fm** — recent tracks with album art, links to YouTube Music
- **Pinned sites** — top sites + custom pins
- **Kawaii doodles** — randomly scattered SVG art with rotation and position variation
- **Two-column layout** — productivity widgets on the left, fun stuff on the right

## Installation

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select this folder
5. Open a new tab

## Setup

Click the gear icon (top-right) or right-click the extension > **Options** to configure:

### Weather
- Get a free API key from [OpenWeatherMap](https://openweathermap.org/appid)
- Paste it in Settings > Weather

### Google Calendar & Tasks
- Create a project at [Google Cloud Console](https://console.cloud.google.com)
- Enable the **Google Calendar API** and **Google Tasks API**
- Go to Credentials > Create Credentials > OAuth 2.0 Client ID
- Choose **Chrome Extension** as the application type
- Enter your extension ID (visible on `chrome://extensions`)
- Copy the Client ID and replace the one in `manifest.json`
- Reload the extension, then open a new tab — you'll be prompted to authorize

### GitHub
- Create a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo,read:org&description=New+Tab) with `repo` and `read:org` scopes
- Paste it in Settings > GitHub

### Canvas
- Enter your institution's Canvas URL in Settings > Canvas
- Leave the access token blank to reuse your signed-in Canvas browser session
- If Canvas reports that sign-in is needed, keep a signed-in Canvas tab open and open a new tab again
- A personal access token remains supported as an optional fallback

### Last.fm
- Create a free API account at [Last.fm](https://www.last.fm/api/account/create)
- Paste your API key and username in Settings > Last.fm

## Adding Doodles

Drop SVGs into `icons/doodles/` and update `meta.json`:

- **`simple/`** — small standalone doodles, used generously around edges
- **`complex/`** — larger detailed art, one or two placed near the bottom
- **`sheets/`** — sprite sheets with multiple doodles in a grid. Specify `cols`, `rows`, and optionally `inset` (fraction to crop from cell edges) in `meta.json`

## Tech

- Vanilla HTML/CSS/JS with ES modules (no build step)
- Chrome Extension Manifest V3
- `chrome.identity` for Google OAuth
- `chrome.storage.sync` for settings, `chrome.storage.local` for caching
- Stale-while-revalidate caching across all widgets
- Quicksand + DM Sans typography
- [Meteocons](https://github.com/basmilius/weather-icons) weather icons (MIT)
