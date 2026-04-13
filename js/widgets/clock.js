import { getCached } from '../lib/cache.js';

export async function initClock(container, settings) {
  const greetingEl = container.querySelector('.greeting');
  const timeEl = container.querySelector('.time');
  const dateEl = container.querySelector('.date');

  const weather = await getCached('weatherCache');
  const now = new Date();
  const name = settings.userName || 'human';
  greetingEl.textContent = pickGreeting(now, weather, name);

  function update() {
    const now = new Date();

    timeEl.textContent = now.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  update();
  setInterval(update, 1000);
}

function pickGreeting(now, weather, name) {
  const hour = now.getHours();
  const day = now.getDay();
  const weatherId = weather?.weather?.[0]?.id;
  const rawTemp = weather?.main?.temp;
  const temp = rawTemp !== undefined
    ? (weather._units === 'imperial' ? (rawTemp - 32) * 5 / 9 : rawTemp)
    : undefined;

  // Weather-aware greetings
  if (weatherId) {
    if (weatherId >= 200 && weatherId < 300) {
      return pick([
        `Thunder rumbles outside, ${name}`,
        `Stormy vibes today, ${name}`,
        `Stay cozy ${name}, it's storming out`,
        `Wild weather out there, ${name}`,
      ]);
    }
    if ((weatherId >= 300 && weatherId < 400) || (weatherId >= 500 && weatherId < 600)) {
      return pick([
        `Rainy day energy, ${name}`,
        `Perfect day to stay in, ${name}`,
        `Grab an umbrella, ${name}`,
        `Cozy rainy day, ${name}`,
        `The rain is talking, ${name} — listen`,
      ]);
    }
    if (weatherId >= 600 && weatherId < 700) {
      return pick([
        `Snow day, ${name}!`,
        `Bundle up ${name}, it's snowing`,
        `Winter wonderland outside, ${name}`,
        `Hot cocoa weather, ${name}`,
      ]);
    }
    if (weatherId === 800) {
      if (hour >= 6 && hour < 10) return pick([
        `Beautiful morning, ${name}`,
        `Clear skies to start your day, ${name}`,
        `Sunshine and possibilities, ${name}`,
      ]);
      if (hour >= 10 && hour < 17) return pick([
        `Gorgeous day outside, ${name}`,
        `Not a cloud in the sky, ${name}`,
        `Perfect day to be alive, ${name}`,
      ]);
      if (hour >= 17 && hour < 21) return pick([
        `Clear skies tonight, ${name}`,
        `Beautiful evening, ${name}`,
        `What a lovely evening, ${name}`,
      ]);
    }
  }

  // Temperature-aware (normalized to Celsius)
  if (temp !== undefined) {
    if (temp < 0) {
      return pick([
        `Brrr, stay warm ${name}`,
        `Freezing out there — bundle up, ${name}`,
        `Cold one today, ${name}`,
      ]);
    }
    if (temp > 33) {
      return pick([
        `It's scorching, ${name}`,
        `Stay hydrated today, ${name}`,
        `Hot hot hot, ${name}`,
      ]);
    }
  }

  // Late night (midnight - 4am)
  if (hour >= 0 && hour < 4) {
    return pick([
      `Burning the midnight oil, ${name}?`,
      `The world is quiet, ${name}`,
      `Still going strong, ${name}`,
      `Night owl hours, ${name}`,
      `Up late, ${name}?`,
      `The stars are out, ${name}`,
      `Can't sleep, ${name}?`,
    ]);
  }

  // Early morning (4am - 7am)
  if (hour >= 4 && hour < 7) {
    return pick([
      `You're up early, ${name}!`,
      `Early bird gets the worm, ${name}`,
      `Rise and shine, ${name}`,
      `The early hours are magic, ${name}`,
      `Fresh start today, ${name}`,
    ]);
  }

  // Morning (7am - 12pm)
  if (hour >= 7 && hour < 12) {
    const greetings = [
      `Good morning, ${name}`,
      `Ready for the day, ${name}?`,
      `Let's make today count, ${name}`,
      `A new day awaits, ${name}`,
      `Morning, ${name}!`,
      `Top of the morning, ${name}`,
    ];
    if (day === 1) greetings.push(`Happy Monday ${name} — you've got this`);
    if (day === 5) greetings.push(`Happy Friday, ${name}!`, `TGIF, ${name}!`);
    if (day === 0 || day === 6) greetings.push(`Enjoy your weekend, ${name}!`, `Lazy weekend morning, ${name}`);
    return pick(greetings);
  }

  // Afternoon (12pm - 5pm)
  if (hour >= 12 && hour < 17) {
    const greetings = [
      `Good afternoon, ${name}`,
      `Keep it up, ${name}`,
      `Hope your day's going well, ${name}`,
      `Afternoon, ${name}`,
      `Halfway there, ${name}`,
    ];
    if (day === 5) greetings.push(`Almost the weekend, ${name}!`);
    if (day === 0 || day === 6) greetings.push(`Weekend vibes, ${name}`);
    return pick(greetings);
  }

  // Evening (5pm - 9pm)
  if (hour >= 17 && hour < 21) {
    const greetings = [
      `Good evening, ${name}`,
      `Winding down, ${name}?`,
      `Hope you had a good day, ${name}`,
      `Evening, ${name}`,
      `Time to relax, ${name}`,
    ];
    if (day === 5) greetings.push(`Friday night, ${name}!`);
    if (day === 0) greetings.push(`Rest up for tomorrow, ${name}`);
    return pick(greetings);
  }

  // Night (9pm - midnight)
  return pick([
    `Good night, ${name}`,
    `Wrapping up, ${name}?`,
    `Almost bedtime, ${name}`,
    `Winding down, ${name}`,
    `One more thing before bed, ${name}?`,
  ]);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
