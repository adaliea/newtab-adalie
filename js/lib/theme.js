const GRADIENT_STOPS = [
  { hour: 0,  top: '#0d1b2a', bottom: '#1b1464', text: '#c8cdd3', muted: '#8a94a0' },
  { hour: 5,  top: '#0d1b2a', bottom: '#1b1464', text: '#c8cdd3', muted: '#8a94a0' },
  { hour: 6,  top: '#ffd1dc', bottom: '#bde0fe', text: '#3a2a2f', muted: '#6b4f58' },
  { hour: 7,  top: '#ffc8d6', bottom: '#bde0fe', text: '#2e3640', muted: '#556270' },
  { hour: 8,  top: '#bde0fe', bottom: '#e8f4f8', text: '#2a3540', muted: '#4e6070' },
  { hour: 10, top: '#bde0fe', bottom: '#fff9c4', text: '#2a3540', muted: '#4e6070' },
  { hour: 12, top: '#87ceeb', bottom: '#f0f4f8', text: '#1e3044', muted: '#3d5a70' },
  { hour: 17, top: '#87ceeb', bottom: '#f0f4f8', text: '#1e3044', muted: '#3d5a70' },
  { hour: 18, top: '#ffb347', bottom: '#d4a5e5', text: '#3a2200', muted: '#5c3d1a' },
  { hour: 19, top: '#4a2560', bottom: '#1f1a56', text: '#e0d4e8', muted: '#a898b5' },
  { hour: 20, top: '#7b2d8e', bottom: '#1a237e', text: '#d4c0db', muted: '#9a82a4' },
  { hour: 22, top: '#0d1b2a', bottom: '#1b1464', text: '#c8cdd3', muted: '#8a94a0' },
  { hour: 24, top: '#0d1b2a', bottom: '#1b1464', text: '#c8cdd3', muted: '#8a94a0' },
];

let themeInterval = null;

export function initTheme(settings) {
  update(settings);
  if (themeInterval) clearInterval(themeInterval);
  themeInterval = setInterval(() => update(settings), 60 * 1000);
}

function update(settings) {
  const hour = getCurrentHourFraction();
  const mode = settings?.themeMode || 'auto';
  localStorage.setItem('themeMode', mode);

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
  const text = lerpColor(lower.text, upper.text, t);
  const muted = lerpColor(lower.muted, upper.muted, t);

  const el = document.getElementById('sky-gradient');
  if (el) {
    el.style.background = `linear-gradient(to bottom, ${top}, ${bottom})`;
  }

  const root = document.documentElement;
  root.style.setProperty('--color-sky-text', text);
  root.style.setProperty('--color-sky-muted', muted);
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
