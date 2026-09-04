import { fetchJSON } from '../lib/api.js';
import { getCacheEntry, setCache, showRefreshing, hideRefreshing, showStale, hideStale } from '../lib/cache.js';

const ASSIGN_CACHE = 'canvasAssignmentsCache';
const ANNOUNCE_CACHE = 'canvasAnnouncementsCache';

export async function initCanvas(assignmentsContainer, announcementsContainer, settings) {
  const assignContent = assignmentsContainer.querySelector('.widget-content');
  const announceContent = announcementsContainer.querySelector('.widget-content');

  if (!settings.canvasUrl) {
    const msg = 'Add your <a href="settings.html">Canvas URL</a> to see data.';
    assignContent.className = 'widget-content setup-message';
    assignContent.innerHTML = msg;
    announceContent.className = 'widget-content setup-message';
    announceContent.innerHTML = msg;
    return;
  }

  const [cachedAssignEntry, cachedAnnounceEntry] = await Promise.all([
    getCacheEntry(ASSIGN_CACHE),
    getCacheEntry(ANNOUNCE_CACHE)
  ]);
  const cachedAssign = cachedAssignEntry?.data ?? null;
  const cachedAnnounce = cachedAnnounceEntry?.data ?? null;

  const baseUrl = settings.canvasUrl.replace(/\/+$/, '');
  const headers = settings.canvasToken
    ? { Authorization: `Bearer ${settings.canvasToken}` }
    : {};
  const requestOptions = settings.canvasToken
    ? {}
    : { credentials: 'include' };
  const origin = new URL(baseUrl).origin;
  const plannerUrl = `${baseUrl}/api/v1/planner/items?start_date=${new Date().toISOString().split('T')[0]}&order=asc&per_page=15`;
  const activityUrl = `${baseUrl}/api/v1/users/self/activity_stream?only_active_courses=true&per_page=20`;

  if (cachedAssign) {
    renderAssignments(assignContent, cachedAssign, origin);
    showLastUpdated(assignmentsContainer, cachedAssignEntry.timestamp);
    showRefreshing(assignmentsContainer);
  }
  if (cachedAnnounce) {
    renderAnnouncements(announceContent, cachedAnnounce, origin);
    showLastUpdated(announcementsContainer, cachedAnnounceEntry.timestamp);
    showRefreshing(announcementsContainer);
  }

  try {
    const [plannerItems, activityStream] = await fetchCanvasData({
      urls: [plannerUrl, activityUrl],
      headers,
      requestOptions,
      origin,
      useToken: Boolean(settings.canvasToken)
    });

    const assignments = plannerItems.filter(
      (item) => item.plannable_type === 'assignment' || item.plannable_type === 'quiz'
    );
    const announcements = activityStream.filter(
      (item) => item.type === 'Announcement'
    ).slice(0, 5);

    const updatedAt = Date.now();
    await Promise.all([
      setCache(ASSIGN_CACHE, assignments, updatedAt),
      setCache(ANNOUNCE_CACHE, announcements, updatedAt)
    ]);

    hideStale(assignmentsContainer);
    hideStale(announcementsContainer);
    renderAssignments(assignContent, assignments, origin);
    renderAnnouncements(announceContent, announcements, origin);
    showLastUpdated(assignmentsContainer, updatedAt);
    showLastUpdated(announcementsContainer, updatedAt);
  } catch (err) {
    if (hasUsefulCache(cachedAssign)) {
      showStale(assignmentsContainer, 'Showing cached data — refresh failed');
    } else {
      assignContent.className = 'widget-content widget-error';
      renderCanvasError(assignContent, origin, err);
    }
    if (hasUsefulCache(cachedAnnounce)) {
      showStale(announcementsContainer, 'Showing cached data — refresh failed');
    } else {
      announceContent.className = 'widget-content widget-error';
      renderCanvasError(announceContent, origin, err);
    }
  } finally {
    hideRefreshing(assignmentsContainer);
    hideRefreshing(announcementsContainer);
  }
}

async function fetchCanvasData({ urls, headers, requestOptions, origin, useToken }) {
  try {
    return await Promise.all(urls.map(url => fetchJSON(url, headers, requestOptions)));
  } catch (directError) {
    if (useToken) throw directError;
    return fetchCanvasViaOpenTab(urls, origin, directError);
  }
}

async function fetchCanvasViaOpenTab(urls, origin, directError) {
  if (!chrome.tabs || !chrome.scripting) throw directError;

  const tabs = await chrome.tabs.query({ url: `${origin}/*` });
  const canvasTab = tabs.find(tab => Number.isInteger(tab.id));
  if (!canvasTab) {
    const error = new Error('Open Canvas in a browser tab and sign in, then open a new tab again.');
    error.code = 'CANVAS_TAB_REQUIRED';
    throw error;
  }

  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: canvasTab.id },
    func: fetchCanvasInPage,
    args: [urls]
  });
  const result = injectionResults[0]?.result;

  if (!result?.ok) {
    const error = new Error(result?.message || directError.message);
    error.status = result?.status ?? directError.status;
    throw error;
  }

  return result.data;
}

async function fetchCanvasInPage(urls) {
  try {
    const data = await Promise.all(urls.map(async (url) => {
      const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        const error = new Error(`Canvas returned HTTP ${response.status}.`);
        error.status = response.status;
        throw error;
      }
      if (!contentType.toLowerCase().includes('json')) {
        throw new Error('Canvas returned a sign-in page instead of data.');
      }

      return response.json();
    }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: error.message, status: error.status ?? null };
  }
}

function hasUsefulCache(data) {
  return Array.isArray(data) ? data.length > 0 : Boolean(data);
}

function renderCanvasError(el, origin, err) {
  if (err.code === 'CANVAS_TAB_REQUIRED') {
    el.innerHTML = `<a href="${origin}" target="_blank" rel="noopener">Open and sign in to Canvas</a>, then open a new tab.`;
    return;
  }

  if (err.status === 401 || err.status === 403 || err.message.includes('Expected JSON') || err.message.includes('sign-in page')) {
    el.innerHTML = `Canvas sign-in needed. <a href="${origin}" target="_blank" rel="noopener">Log in to Canvas</a>, then open a new tab.`;
    return;
  }

  el.textContent = `Could not load Canvas data: ${err.message}`;
}

function showLastUpdated(container, timestamp) {
  if (!timestamp) return;

  const header = container.querySelector('.widget-header');
  if (!header) return;

  let el = header.querySelector('.widget-updated');
  if (!el) {
    el = document.createElement('time');
    el.className = 'widget-updated';
    header.appendChild(el);
  }

  const updated = new Date(timestamp);
  el.dateTime = updated.toISOString();
  el.textContent = `Updated ${updated.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}`;
  el.title = `Last updated ${updated.toLocaleString()}`;
}

function renderAssignments(el, assignments, origin) {
  el.className = 'widget-content';

  if (assignments.length === 0) {
    el.innerHTML = '<div class="widget-empty">No upcoming assignments</div>';
    return;
  }

  el.innerHTML = `<ul class="widget-list">${assignments.map(a => renderAssignment(a, origin)).join('')}</ul>`;
}

function renderAnnouncements(el, announcements, origin) {
  el.className = 'widget-content';

  if (announcements.length === 0) {
    el.innerHTML = '<div class="widget-empty">No recent announcements</div>';
    return;
  }

  el.innerHTML = `<ul class="widget-list">${announcements.map(a => renderAnnouncement(a, origin)).join('')}</ul>`;
}

function renderAssignment(item, origin) {
  const course = item.context_name || '';
  const title = item.plannable?.title || item.plannable_type || 'Untitled';
  const dueAt = item.plannable?.due_at;
  let dueStr = '';

  if (dueAt) {
    const due = new Date(dueAt);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isSameDay(due, today)) {
      dueStr = `Today ${due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (isSameDay(due, tomorrow)) {
      dueStr = `Tomorrow ${due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      dueStr = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }

  const rawUrl = item.html_url || item.plannable?.html_url || '';
  const url = resolveCanvasUrl(rawUrl, origin);
  const titleHtml = url
    ? `<a href="${url}">${escapeHtml(title)}</a>`
    : escapeHtml(title);

  return `<li>
    <div class="widget-item-sub">${escapeHtml(course)}</div>
    <div class="widget-item-title">${titleHtml}</div>
    ${dueStr ? `<div class="widget-item-meta">${dueStr}</div>` : ''}
  </li>`;
}

function renderAnnouncement(item, origin) {
  const course = item.context_type === 'Course' ? (item.course?.name || '') : '';
  const title = item.title || 'Untitled';
  const rawUrl = item.html_url || '';
  const url = resolveCanvasUrl(rawUrl, origin);
  const posted = new Date(item.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  const titleHtml = url
    ? `<a href="${url}">${escapeHtml(title)}</a>`
    : escapeHtml(title);

  return `<li>
    <div class="widget-item-sub">${escapeHtml(course)}</div>
    <div class="widget-item-title">${titleHtml}</div>
    <div class="widget-item-meta">${posted}</div>
  </li>`;
}

function resolveCanvasUrl(url, origin) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return origin + (url.startsWith('/') ? '' : '/') + url;
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
