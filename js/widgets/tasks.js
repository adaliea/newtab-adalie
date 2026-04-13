import { getGoogleToken, removeCachedToken } from '../lib/google-auth.js';
import { fetchJSON } from '../lib/api.js';

const TASKS_API = 'https://www.googleapis.com/tasks/v1';

export async function initTasks(container) {
  const content = container.querySelector('.widget-content');

  try {
    const token = await getGoogleToken(false);
    await loadTasks(content, token);
  } catch {
    content.className = 'widget-content';
    content.innerHTML = `
      <button class="btn-connect" id="connect-tasks">Connect Google Tasks</button>
    `;
    document.getElementById('connect-tasks').addEventListener('click', async () => {
      try {
        const token = await getGoogleToken(true);
        content.className = 'widget-content widget-loading';
        content.textContent = 'Loading...';
        await loadTasks(content, token);
      } catch (err) {
        content.className = 'widget-content widget-error';
        content.textContent = `Could not connect: ${err.message}`;
      }
    });
  }
}

async function loadTasks(el, token) {
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const lists = await fetchJSON(`${TASKS_API}/users/@me/lists`, headers);
    const taskLists = lists.items || [];
    if (taskLists.length === 0) {
      el.className = 'widget-content widget-empty';
      el.textContent = 'No task lists found';
      return;
    }

    const defaultList = taskLists[0];
    const params = new URLSearchParams({
      showCompleted: 'false',
      maxResults: '15'
    });

    const tasks = await fetchJSON(
      `${TASKS_API}/lists/${defaultList.id}/tasks?${params}`,
      headers
    );

    renderTasks(el, tasks.items || [], taskLists, defaultList.id, token);
  } catch (err) {
    if (err.message.includes('401')) {
      await removeCachedToken(token);
      const newToken = await getGoogleToken(true);
      await loadTasks(el, newToken);
    } else {
      throw err;
    }
  }
}

function renderTasks(el, tasks, taskLists, activeListId, token) {
  el.className = 'widget-content';

  // Task list switcher
  let switcher = '';
  if (taskLists.length > 1) {
    const options = taskLists.map((list) =>
      `<option value="${list.id}" ${list.id === activeListId ? 'selected' : ''}>${escapeHtml(list.title)}</option>`
    ).join('');
    switcher = `<select class="task-list-switcher">${options}</select>`;
  }

  if (tasks.length === 0) {
    el.innerHTML = `${switcher}<div class="widget-empty">All caught up!</div>`;
    attachSwitcher(el, taskLists, token);
    return;
  }

  const items = tasks
    .filter((t) => t.title)
    .map((task) => {
      const due = task.due
        ? `<span class="widget-item-meta">${formatDueDate(task.due)}</span>`
        : '';
      return `<li>
        <div class="widget-item-title">${escapeHtml(task.title)}</div>
        ${due}
      </li>`;
    }).join('');

  el.innerHTML = `${switcher}<ul class="widget-list">${items}</ul>`;
  attachSwitcher(el, taskLists, token);
}

function attachSwitcher(el, taskLists, token) {
  const select = el.querySelector('.task-list-switcher');
  if (!select) return;

  select.addEventListener('change', async () => {
    const listId = select.value;
    const params = new URLSearchParams({
      showCompleted: 'false',
      maxResults: '15'
    });
    const tasks = await fetchJSON(
      `${TASKS_API}/lists/${listId}/tasks?${params}`,
      { Authorization: `Bearer ${token}` }
    );
    renderTasks(el, tasks.items || [], taskLists, listId, token);
  });
}

function formatDueDate(isoDate) {
  const date = new Date(isoDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameDay(date, today)) return 'Due today';
  if (isSameDay(date, tomorrow)) return 'Due tomorrow';

  return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
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
