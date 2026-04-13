import { fetchJSON } from '../lib/api.js';
import { getCached, setCache, showRefreshing, hideRefreshing, showStale, hideStale } from '../lib/cache.js';

const CACHE_KEY = 'weatherCache';

export async function initWeather(container, settings) {
  const content = container.querySelector('.widget-content');

  if (!settings.weatherApiKey) {
    content.className = 'widget-content setup-message';
    content.innerHTML = 'Add your <a href="settings.html">OpenWeatherMap API key</a> to see weather.';
    return;
  }

  const cached = await getCached(CACHE_KEY);
  if (cached) {
    render(content, cached, settings.weatherUnits);
    showRefreshing(container);
  }

  try {
    const position = await getPosition();
    const { latitude: lat, longitude: lon } = position.coords;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${settings.weatherApiKey}&units=${settings.weatherUnits}`;
    const data = await fetchJSON(url);

    await setCache(CACHE_KEY, data);
    hideStale(container);
    render(content, data, settings.weatherUnits);
  } catch (err) {
    if (cached) {
      showStale(container, 'Showing cached data — refresh failed');
    } else {
      content.className = 'widget-content widget-error';
      if (err.message.includes('denied') || err.message.includes('permission')) {
        content.textContent = 'Location access denied. Allow location to see weather.';
      } else {
        content.textContent = `Could not load weather: ${err.message}`;
      }
    }
  } finally {
    hideRefreshing(container);
  }
}

function render(el, data, units) {
  const unitSymbol = units === 'imperial' ? 'F' : 'C';
  const speedUnit = units === 'imperial' ? 'mph' : 'm/s';
  const temp = Math.round(data.main.temp);
  const feelsLike = Math.round(data.main.feels_like);
  const high = Math.round(data.main.temp_max);
  const low = Math.round(data.main.temp_min);
  const humidity = data.main.humidity;
  const wind = Math.round(data.wind.speed);
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
    <div class="weather-details">Feels like ${feelsLike}° · Humidity ${humidity}% · Wind ${wind} ${speedUnit}</div>
  `;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 30 * 60 * 1000
    });
  });
}
