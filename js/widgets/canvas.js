import { fetchJSON } from '../lib/api.js';

export async function initCanvas(container, settings) {
  const content = container.querySelector('.widget-content');

  if (!settings.canvasUrl || !settings.canvasToken) {
    content.className = 'widget-content setup-message';
    content.innerHTML = 'Add your <a href="settings.html">Canvas URL and token</a> to see assignments.';
    return;
  }

  const baseUrl = settings.canvasUrl.replace(/\/+$/, '');
  const headers = {
    Authorization: `Bearer ${settings.canvasToken}`
  };

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

    render(content, assignments, announcements);
  } catch (err) {
    content.className = 'widget-content widget-error';
    content.textContent = `Could not load Canvas data: ${err.message}`;
  }
}

function render(el, assignments, announcements) {
  el.className = 'widget-content';

  if (assignments.length === 0 && announcements.length === 0) {
    el.innerHTML = '<div class="widget-empty">No upcoming assignments or announcements</div>';
    return;
  }

  let html = '';

  if (assignments.length > 0) {
    html += '<div class="github-section-label">Upcoming</div>';
    html += `<ul class="widget-list">${assignments.map(renderAssignment).join('')}</ul>`;
  }

  if (announcements.length > 0) {
    if (assignments.length > 0) html += '<div style="margin-top: var(--spacing-sm)"></div>';
    html += '<div class="github-section-label">Announcements</div>';
    html += `<ul class="widget-list">${announcements.map(renderAnnouncement).join('')}</ul>`;
  }

  el.innerHTML = html;
}

function renderAssignment(item) {
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

  return `<li>
    <div class="widget-item-sub">${escapeHtml(course)}</div>
    <div class="widget-item-title">${escapeHtml(title)}</div>
    ${dueStr ? `<div class="widget-item-meta">${dueStr}</div>` : ''}
  </li>`;
}

function renderAnnouncement(item) {
  const course = item.context_type === 'Course' ? (item.course?.name || '') : '';
  const title = item.title || 'Untitled';
  const posted = new Date(item.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  return `<li>
    <div class="widget-item-sub">${escapeHtml(course)}</div>
    <div class="widget-item-title">${escapeHtml(title)}</div>
    <div class="widget-item-meta">${posted}</div>
  </li>`;
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
