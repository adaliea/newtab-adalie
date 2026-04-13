import { getGoogleToken, removeCachedToken } from '../lib/google-auth.js';
import { fetchJSON } from '../lib/api.js';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export async function initCalendar(container) {
  const content = container.querySelector('.widget-content');

  try {
    const token = await getGoogleToken(false);
    await loadEvents(content, token);
  } catch {
    content.className = 'widget-content';
    content.innerHTML = `
      <button class="btn-connect" id="connect-calendar">Connect Google Calendar</button>
    `;
    document.getElementById('connect-calendar').addEventListener('click', async () => {
      try {
        const token = await getGoogleToken(true);
        content.className = 'widget-content widget-loading';
        content.textContent = 'Loading...';
        await loadEvents(content, token);
      } catch (err) {
        content.className = 'widget-content widget-error';
        content.textContent = `Could not connect: ${err.message}`;
      }
    });
  }
}

async function loadEvents(el, token) {
  const now = new Date();
  const endOfTomorrow = new Date(now);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  endOfTomorrow.setHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: endOfTomorrow.toISOString(),
    maxResults: '10',
    singleEvents: 'true',
    orderBy: 'startTime'
  });

  try {
    const data = await fetchJSON(
      `${CALENDAR_API}/calendars/primary/events?${params}`,
      { Authorization: `Bearer ${token}` }
    );
    renderEvents(el, data.items || []);
  } catch (err) {
    if (err.message.includes('401')) {
      await removeCachedToken(token);
      const newToken = await getGoogleToken(true);
      const data = await fetchJSON(
        `${CALENDAR_API}/calendars/primary/events?${params}`,
        { Authorization: `Bearer ${newToken}` }
      );
      renderEvents(el, data.items || []);
    } else {
      throw err;
    }
  }
}

function renderEvents(el, events) {
  el.className = 'widget-content';

  if (events.length === 0) {
    el.innerHTML = '<div class="widget-empty">No upcoming events</div>';
    return;
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const list = events.map((event) => {
    const isAllDay = !!event.start.date;
    let timeStr;

    if (isAllDay) {
      timeStr = 'All day';
    } else {
      const start = new Date(event.start.dateTime);
      const dayLabel = isSameDay(start, today) ? 'Today' : isSameDay(start, tomorrow) ? 'Tomorrow' : '';
      const time = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
      timeStr = dayLabel ? `${dayLabel} ${time}` : time;
    }

    const location = event.location ? `<span class="widget-item-sub"> · ${event.location}</span>` : '';

    return `<li>
      <div class="widget-item-title">${escapeHtml(event.summary || '(No title)')}</div>
      <div class="widget-item-meta">${timeStr}${location}</div>
    </li>`;
  }).join('');

  el.innerHTML = `<ul class="widget-list">${list}</ul>`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
