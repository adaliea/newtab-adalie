const DEFAULTS = {
  userName: '',
  weatherApiKey: '',
  weatherUnits: 'metric',
  githubToken: '',
  canvasUrl: '',
  canvasToken: '',
  pinnedSites: []
};

export async function getSettings() {
  return chrome.storage.sync.get(DEFAULTS);
}

export async function saveSettings(settings) {
  return chrome.storage.sync.set(settings);
}
