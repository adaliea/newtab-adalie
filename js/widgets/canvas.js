import { fetchJSON } from '../lib/api.js';
import { getCached, setCache, showRefreshing, hideRefreshing, showStale, hideStale } from '../lib/cache.js';

const ASSIGN_CACHE = 'canvasAssignmentsCache';
const ANNOUNCE_CACHE = 'canvasAnnouncementsCache';

export async function initCanvas(assignmentsContainer, announcementsContainer, settings) {
  const assignContent = assignmentsContainer.querySelector('.widget-content');
  const announceContent = announcementsContainer.querySelector('.widget-content');

  if (!settings.canvasUrl || !settings.canvasToken) {
    const msg = 'Add your <a href="settings.html">Canvas URL and token</a> to see data.';
    assignContent.className = 'widget-content setup-message';
    assignContent.innerHTML = msg;
    announceContent.className = 'widget-content setup-message';
    announceContent.innerHTML = msg;
    return;
  }

  const cachedAssign = await getCached(ASSIGN_CACHE);
  const cachedAnnounce = await getCached(ANNOUNCE_CACHE);

  const baseUrl = settings.canvasUrl.replace(/\/+$/, '');
  const headers = { Authorization: `Bearer ${settings.canvasToken}` };
  const origin = new URL(baseUrl).origin;

  if (cachedAssign) {
    renderAssignments(assignContent, cachedAssign, origin);
    showRefreshing(assignmentsContainer);
  }
  if (cachedAnnounce) {
    renderAnnouncements(announceContent, cachedAnnounce, origin);
    showRefreshing(announcementsContainer);
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const [plannerItems, activityStream] = await Promise.all([
      fetchJSON(
        `${baseUrl}/api/v1/planner/items?start_date=${today}&order=asc&per_page=15`,
        headers
      ).catch(() => []),
      fetchJSON(
        `${baseUrl}/api/v1/users/self/activity_stream?only_active_courses=true&per_page=20`,
        headers
      ).catch(() => [])
    ]);

    const assignments = plannerItems.filter(
      (item) => item.plannable_type === 'assignment' || item.plannable_type === 'quiz'
    );
    const announcements = activityStream.filter(
      (item) => item.type === 'Announcement'
    ).slice(0, 5);

    await setCache(ASSIGN_CACHE, assignments);
    await setCache(ANNOUNCE_CACHE, announcements);

    hideStale(assignmentsContainer);
    hideStale(announcementsContainer);
    renderAssignments(assignContent, assignments, origin);
    renderAnnouncements(announceContent, announcements, origin);
  } catch (err) {
    if (cachedAssign) {
      showStale(assignmentsContainer, 'Showing cached data — refresh failed');
    } else {
      assignContent.className = 'widget-content widget-error';
      assignContent.textContent = `Could not load Canvas data: ${err.message}`;
    }
    if (cachedAnnounce) {
      showStale(announcementsContainer, 'Showing cached data — refresh failed');
    } else {
      announceContent.className = 'widget-content widget-error';
      announceContent.textContent = `Could not load Canvas data: ${err.message}`;
    }
  } finally {
    hideRefreshing(assignmentsContainer);
    hideRefreshing(announcementsContainer);
  }
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
    ? `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(title)}</a>`
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
    ? `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(title)}</a>`
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
