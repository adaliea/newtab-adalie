# Adalie's New Tab

A minimal Chrome new tab page with weather, Google Calendar, Google Tasks, GitHub, and Canvas LMS integrations.

## Installation

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select this folder
5. Open a new tab — you should see the extension

## Setup

Click the gear icon (top-right of the new tab page) or right-click the extension icon and choose **Options** to configure:

### Weather
- Get a free API key from [OpenWeatherMap](https://openweathermap.org/appid)
- Paste it in Settings > Weather

### Google Calendar & Tasks
- Create a project at [Google Cloud Console](https://console.cloud.google.com)
- Enable the **Google Calendar API** and **Google Tasks API**
- Go to Credentials > Create Credentials > OAuth 2.0 Client ID
- Choose **Chrome Extension** as the application type
- Enter your extension ID (visible on `chrome://extensions`)
- Copy the Client ID and replace `YOUR_CLIENT_ID.apps.googleusercontent.com` in `manifest.json`
- Reload the extension, then open a new tab — you'll be prompted to authorize

### GitHub
- Create a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo,read:org&description=New+Tab) with `repo` and `read:org` scopes
- Paste it in Settings > GitHub

### Canvas
- In Canvas, go to Account > Settings > New Access Token
- Paste your institution's Canvas URL and the token in Settings > Canvas
