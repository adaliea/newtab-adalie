import { fetchJSON } from '../lib/api.js';
import { getCached, setCache, showStale, hideStale } from '../lib/cache.js';
import { getWeatherIconPath } from '../lib/weather-icons.js';

const CACHE_KEY = 'weatherCache';

export async function initWeather(container, settings) {
  if (!settings.weatherApiKey) {
    container.innerHTML = '<div class="setup-message">Add your <a href="settings.html">OpenWeatherMap API key</a> to see weather.</div>';
    return;
  }

  const cached = await getCached(CACHE_KEY);
  if (cached) {
    render(container, cached, settings.weatherUnits);
    addSpinner(container);
  }

  try {
    const position = await getPosition();
    const { latitude: lat, longitude: lon } = position.coords;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${settings.weatherApiKey}&units=${settings.weatherUnits}`;
    const data = await fetchJSON(url);

    await setCache(CACHE_KEY, { ...data, _units: settings.weatherUnits });
    hideStale(container);
    render(container, data, settings.weatherUnits);
  } catch (err) {
    if (cached) {
      showStale(container, 'Showing cached data — refresh failed');
    } else {
      if (err.message.includes('denied') || err.message.includes('permission')) {
        container.innerHTML = '<div class="widget-error">Location access denied. Allow location to see weather.</div>';
      } else {
        container.innerHTML = `<div class="widget-error">Could not load weather: ${err.message}</div>`;
      }
    }
  } finally {
    removeSpinner(container);
  }
}

function render(el, data, units) {
  const unitSymbol = units === 'imperial' ? 'F' : 'C';
  const speedUnit = units === 'imperial' ? 'mph' : 'm/s';
  const temp = Math.round(data.main.temp);
  const feelsLike = Math.round(data.main.feels_like);
  const humidity = data.main.humidity;
  const wind = Math.round(data.wind.speed);
  const desc = data.weather[0].description;
  const icon = data.weather[0].icon;
  const iconPath = getWeatherIconPath(icon);

  el.innerHTML = `
    <img class="hero-weather-icon" src="${iconPath}" alt="${desc}">
    <div class="hero-weather-info">
      <div class="hero-weather-temp">${temp}°${unitSymbol}</div>
      <div class="hero-weather-desc">${desc}</div>
      <div class="hero-weather-details">Feels like ${feelsLike}° · ${humidity}% humidity · ${wind} ${speedUnit}</div>
    </div>
  `;
}

function addSpinner(container) {
  if (container.querySelector('.widget-spinner')) return;
  container.insertAdjacentHTML('beforeend', '<span class="widget-spinner" style="align-self:center"></span>');
}

function removeSpinner(container) {
  const s = container.querySelector('.widget-spinner');
  if (s) s.remove();
}

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 30 * 60 * 1000
    });
  });
}
