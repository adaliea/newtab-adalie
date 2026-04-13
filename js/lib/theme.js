const GRADIENT_STOPS = [
  { hour: 0,  top: '#0d1b2a', bottom: '#1b1464' },
  { hour: 5,  top: '#0d1b2a', bottom: '#1b1464' },
  { hour: 6,  top: '#ffd1dc', bottom: '#bde0fe' },
  { hour: 7,  top: '#ffc8d6', bottom: '#bde0fe' },
  { hour: 8,  top: '#bde0fe', bottom: '#e8f4f8' },
  { hour: 10, top: '#bde0fe', bottom: '#fff9c4' },
  { hour: 12, top: '#87ceeb', bottom: '#f0f4f8' },
  { hour: 17, top: '#87ceeb', bottom: '#f0f4f8' },
  { hour: 18, top: '#ffb347', bottom: '#d4a5e5' },
  { hour: 20, top: '#7b2d8e', bottom: '#1a237e' },
  { hour: 22, top: '#0d1b2a', bottom: '#1b1464' },
  { hour: 24, top: '#0d1b2a', bottom: '#1b1464' },
];

export function initTheme(settings) {
  update(settings);
  setInterval(() => update(settings), 60 * 1000);
}

function update(settings) {
  const hour = getCurrentHourFraction();
  const mode = settings?.themeMode || 'auto';

  if (mode === 'auto') {
    document.documentElement.dataset.theme = (hour >= 19 || hour < 6) ? 'dark' : 'light';
  } else {
    document.documentElement.dataset.theme = mode;
  }

  updateGradient(hour);
}

function getCurrentHourFraction() {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

function updateGradient(hour) {
  let lower = GRADIENT_STOPS[0];
  let upper = GRADIENT_STOPS[1];

  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    if (hour >= GRADIENT_STOPS[i].hour && hour < GRADIENT_STOPS[i + 1].hour) {
      lower = GRADIENT_STOPS[i];
      upper = GRADIENT_STOPS[i + 1];
      break;
    }
  }

  const range = upper.hour - lower.hour;
  const t = range === 0 ? 0 : (hour - lower.hour) / range;

  const top = lerpColor(lower.top, upper.top, t);
  const bottom = lerpColor(lower.bottom, upper.bottom, t);

  const el = document.getElementById('sky-gradient');
  if (el) {
    el.style.background = `linear-gradient(to bottom, ${top}, ${bottom})`;
  }
}

export function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'sunset';
  if (hour >= 20 && hour < 22) return 'evening';
  return 'night';
}

export function isDark() {
  return document.documentElement.dataset.theme === 'dark';
}

function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);

  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}
