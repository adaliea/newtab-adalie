import { fetchJSON } from '../lib/api.js';

const CACHE_KEY = 'weatherCache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function initWeather(container, settings) {
  const content = container.querySelector('.widget-content');

  if (!settings.weatherApiKey) {
    content.className = 'widget-content setup-message';
    content.innerHTML = 'Add your <a href="settings.html">OpenWeatherMap API key</a> to see weather.';
    return;
  }

  try {
    const cached = await getCachedWeather();
    if (cached) {
      render(content, cached, settings.weatherUnits);
      return;
    }

    const position = await getPosition();
    const { latitude: lat, longitude: lon } = position.coords;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${settings.weatherApiKey}&units=${settings.weatherUnits}`;
    const data = await fetchJSON(url);

    await cacheWeather(data);
    render(content, data, settings.weatherUnits);
  } catch (err) {
    content.className = 'widget-content widget-error';
    if (err.message.includes('denied') || err.message.includes('permission')) {
      content.textContent = 'Location access denied. Allow location to see weather.';
    } else {
      content.textContent = `Could not load weather: ${err.message}`;
    }
  }
}

function render(el, data, units) {
  const unitSymbol = units === 'imperial' ? 'F' : 'C';
  const temp = Math.round(data.main.temp);
  const high = Math.round(data.main.temp_max);
  const low = Math.round(data.main.temp_min);
  const desc = data.weather[0].description;
  const icon = data.weather[0].icon;
  const city = data.name;

  el.className = 'widget-content';
  el.innerHTML = `
    <div class="weather-main">
      <img class="weather-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">
      <div>
        <div class="weather-temp">${temp}°${unitSymbol}</div>
        <div class="weather-details">${city}</div>
      </div>
    </div>
    <div class="weather-details">${capitalize(desc)} · H: ${high}° L: ${low}°</div>
  `;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: CACHE_TTL
    });
  });
}

async function getCachedWeather() {
  const result = await chrome.storage.local.get(CACHE_KEY);
  const cached = result[CACHE_KEY];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

async function cacheWeather(data) {
  await chrome.storage.local.set({
    [CACHE_KEY]: { data, timestamp: Date.now() }
  });
}
