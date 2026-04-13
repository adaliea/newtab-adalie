import { getGoogleToken, removeCachedToken } from '../lib/google-auth.js';
import { fetchJSON } from '../lib/api.js';
import { getCached, setCache, showRefreshing, hideRefreshing, showStale, hideStale } from '../lib/cache.js';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CACHE_KEY = 'calendarCache';

export async function initCalendar(container) {
  const content = container.querySelector('.widget-content');

  const cached = await getCached(CACHE_KEY);
  if (cached) {
    renderEvents(content, cached);
    showRefreshing(container);
  }

  try {
    const token = await getGoogleToken(false);
    await loadEvents(container, content, token, !!cached);
  } catch {
    if (!cached) {
      content.className = 'widget-content';
      content.innerHTML = `
        <button class="btn-connect" id="connect-calendar">Connect Google Calendar</button>
      `;
      document.getElementById('connect-calendar').addEventListener('click', async () => {
        try {
          const token = await getGoogleToken(true);
          content.className = 'widget-content widget-loading';
          content.textContent = 'Loading...';
          await loadEvents(container, content, token, false);
        } catch (err) {
          content.className = 'widget-content widget-error';
          content.textContent = `Could not connect: ${err.message}`;
        }
      });
    }
    hideRefreshing(container);
  }
}

async function loadEvents(container, el, token, hasCached) {
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
    const events = data.items || [];
    await setCache(CACHE_KEY, events);
    hideStale(container);
    renderEvents(el, events);
  } catch (err) {
    if (err.message.includes('401')) {
      await removeCachedToken(token);
      const newToken = await getGoogleToken(true);
      const data = await fetchJSON(
        `${CALENDAR_API}/calendars/primary/events?${params}`,
        { Authorization: `Bearer ${newToken}` }
      );
      const events = data.items || [];
      await setCache(CACHE_KEY, events);
      hideStale(container);
      renderEvents(el, events);
    } else if (hasCached) {
      showStale(container, 'Showing cached data — refresh failed');
    } else {
      throw err;
    }
  } finally {
    hideRefreshing(container);
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

    const link = event.htmlLink;
    const title = escapeHtml(event.summary || '(No title)');
    const titleHtml = link
      ? `<a class="widget-item-title" href="${escapeHtml(link)}" target="_blank" rel="noopener">${title}</a>`
      : `<div class="widget-item-title">${title}</div>`;

    return `<li>
      ${titleHtml}
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
