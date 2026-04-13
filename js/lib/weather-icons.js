const OWM_MAP = {
  '01d': 'clear-day',
  '01n': 'clear-night',
  '02d': 'partly-cloudy-day',
  '02n': 'partly-cloudy-night',
  '03d': 'cloudy',
  '03n': 'cloudy',
  '04d': 'overcast',
  '04n': 'overcast',
  '09d': 'drizzle',
  '09n': 'drizzle',
  '10d': 'rain',
  '10n': 'rain',
  '11d': 'thunderstorms-rain',
  '11n': 'thunderstorms-rain',
  '13d': 'snow',
  '13n': 'snow',
  '50d': 'mist',
  '50n': 'fog',
};

export function getWeatherIconPath(owmIconCode) {
  const name = OWM_MAP[owmIconCode] || 'cloudy';
  return `icons/weather/${name}.svg`;
}
