import { getSettings } from './lib/storage.js';
import { initClock } from './widgets/clock.js';
import { initQuickLinks } from './widgets/quick-links.js';
import { initSites } from './widgets/sites.js';
import { initWeather } from './widgets/weather.js';
import { initCalendar } from './widgets/calendar.js';
import { initTasks } from './widgets/tasks.js';
import { initGitHub } from './widgets/github.js';
import { initCanvas } from './widgets/canvas.js';

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getSettings();

  initClock(document.getElementById('widget-clock'), settings);
  initQuickLinks(document.getElementById('quick-links'), settings);
  initSites(document.getElementById('sites-section'));
  initWeather(document.getElementById('widget-weather'), settings);
  initCalendar(document.getElementById('widget-calendar'));
  initTasks(document.getElementById('widget-tasks'));
  initGitHub(document.getElementById('widget-github'), settings);
  initCanvas(
    document.getElementById('widget-canvas'),
    document.getElementById('widget-announcements'),
    settings
  );
});
