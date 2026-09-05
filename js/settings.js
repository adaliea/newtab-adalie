import { getSettings, saveSettings } from './lib/storage.js';

const FIELDS = ['userName', 'weatherApiKey', 'weatherUnits', 'githubToken', 'canvasUrl', 'canvasToken', 'lastfmApiKey', 'lastfmUsername', 'themeMode'];

async function loadSettings() {
  const settings = await getSettings();
  for (const field of FIELDS) {
    const el = document.getElementById(field);
    if (el) el.value = settings[field] || '';
  }
  checkGoogleStatus();
}

async function checkGoogleStatus() {
  const dot = document.querySelector('.status-dot');
  const text = document.querySelector('.status-text');
  try {
    await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          reject();
        } else {
          resolve(token);
        }
      });
    });
    dot.classList.add('connected');
    dot.classList.remove('disconnected');
    text.textContent = 'Connected';
  } catch {
    dot.classList.add('disconnected');
    dot.classList.remove('connected');
    text.textContent = 'Not connected — will prompt on first use';
  }
}

async function requestCanvasPermission(url) {
  if (!url) return true;
  try {
    const origin = new URL(url).origin + '/*';
    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const values = {};
  for (const field of FIELDS) {
    const el = document.getElementById(field);
    values[field] = el ? el.value.trim() : '';
  }

  if (values.canvasUrl) {
    const granted = await requestCanvasPermission(values.canvasUrl);
    if (!granted) {
      alert('Canvas permission was denied. Canvas integration may not work.');
    }
  }

  await saveSettings(values);
  localStorage.setItem('themeMode', values.themeMode);

  const status = document.getElementById('save-status');
  status.textContent = 'Saved!';
  status.classList.add('visible');
  setTimeout(() => status.classList.remove('visible'), 2000);
});

document.querySelectorAll('.toggle-visibility').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = 'Hide';
    } else {
      input.type = 'password';
      btn.textContent = 'Show';
    }
  });
});

document.addEventListener('DOMContentLoaded', loadSettings);
