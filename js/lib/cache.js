export async function getCached(key) {
  const result = await chrome.storage.local.get(key);
  return result[key]?.data ?? null;
}

export async function setCache(key, data) {
  await chrome.storage.local.set({
    [key]: { data, timestamp: Date.now() }
  });
}

export function showRefreshing(container) {
  const header = container.querySelector('.widget-header');
  if (!header || header.querySelector('.widget-spinner')) return;
  header.insertAdjacentHTML('beforeend', '<span class="widget-spinner"></span>');
}

export function hideRefreshing(container) {
  const spinner = container.querySelector('.widget-spinner');
  if (spinner) spinner.remove();
}

export function showStale(container, message) {
  const header = container.querySelector('.widget-header');
  if (!header || header.querySelector('.widget-stale')) return;
  header.insertAdjacentHTML('beforeend',
    `<span class="widget-stale" title="${message}">&#9888;</span>`
  );
}

export function hideStale(container) {
  const el = container.querySelector('.widget-stale');
  if (el) el.remove();
}
