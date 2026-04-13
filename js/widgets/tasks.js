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

  let switcher = '';
  if (taskLists.length > 1) {
    const options = taskLists.map((list) =>
      `<option value="${list.id}" ${list.id === activeListId ? 'selected' : ''}>${escapeHtml(list.title)}</option>`
    ).join('');
    switcher = `<select class="task-list-switcher">${options}</select>`;
  }

  const addForm = `<div class="task-add-form">
    <input type="text" class="task-add-input" placeholder="Add a task..." data-list-id="${activeListId}">
  </div>`;

  if (tasks.length === 0) {
    el.innerHTML = `${switcher}${addForm}<div class="widget-empty">All caught up!</div>`;
    attachSwitcher(el, taskLists, token);
    attachAddForm(el, taskLists, activeListId, token);
    return;
  }

  const items = tasks
    .filter((t) => t.title)
    .map((task) => {
      const due = task.due
        ? `<span class="widget-item-meta">${formatDueDate(task.due)}</span>`
        : '';
      return `<li data-list-id="${activeListId}" data-task-id="${task.id}">
        <label class="task-row">
          <input type="checkbox" class="task-checkbox">
          <span class="task-text">
            <span class="widget-item-title">${escapeHtml(task.title)}</span>
            ${due}
          </span>
        </label>
      </li>`;
    }).join('');

  el.innerHTML = `${switcher}${addForm}<ul class="widget-list task-list">${items}</ul>`;

  attachSwitcher(el, taskLists, token);
  attachAddForm(el, taskLists, activeListId, token);
  attachCheckboxes(el, taskLists, activeListId, token);
}

function attachAddForm(el, taskLists, activeListId, token) {
  const input = el.querySelector('.task-add-input');
  if (!input) return;

  input.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const title = input.value.trim();
    if (!title) return;

    input.disabled = true;
    try {
      await fetch(`${TASKS_API}/lists/${activeListId}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });

      input.value = '';
      input.disabled = false;
      await loadTasks(el, token);
    } catch {
      input.disabled = false;
    }
  });
}

function attachCheckboxes(el, taskLists, activeListId, token) {
  el.querySelectorAll('.task-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const li = checkbox.closest('li');
      const listId = li.dataset.listId;
      const taskId = li.dataset.taskId;

      li.classList.add('task-completing');
      checkbox.disabled = true;

      try {
        await fetch(`${TASKS_API}/lists/${listId}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'completed' })
        });

        li.classList.add('task-completed');
        setTimeout(() => {
          li.remove();
          const remaining = el.querySelectorAll('.task-list li');
          if (remaining.length === 0) {
            const list = el.querySelector('.task-list');
            if (list) {
              list.insertAdjacentHTML('afterend', '<div class="widget-empty">All caught up!</div>');
              list.remove();
            }
          }
        }, 400);
      } catch {
        checkbox.checked = false;
        checkbox.disabled = false;
        li.classList.remove('task-completing');
      }
    });
  });
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
