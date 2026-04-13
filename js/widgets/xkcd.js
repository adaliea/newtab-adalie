import { getCached, setCache, showRefreshing, hideRefreshing, showStale, hideStale } from '../lib/cache.js';

const CACHE_KEY = 'xkcdCache';
const SIX_HOURS = 6 * 60 * 60 * 1000;

export async function initXkcd(container) {
  const content = container.querySelector('.widget-content');

  const cached = await getCached(CACHE_KEY);
  if (cached) {
    render(content, cached);
    showRefreshing(container);
  }

  try {
    const data = await fetchLatest();
    await setCache(CACHE_KEY, data);
    hideStale(container);
    render(content, data);
  } catch (err) {
    if (cached) {
      showStale(container, 'Showing cached comic — refresh failed');
    } else {
      content.className = 'widget-content widget-error';
      content.textContent = `Could not load xkcd: ${err.message}`;
    }
  } finally {
    hideRefreshing(container);
  }

  content.addEventListener('click', async (e) => {
    const btn = e.target.closest('.xkcd-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    content.style.opacity = '0.5';
    try {
      let data;
      if (action === 'random') {
        const latest = await fetchLatest();
        const num = Math.floor(Math.random() * latest.num) + 1;
        data = await fetchComic(num);
      } else {
        data = await fetchLatest();
      }
      render(content, data);
    } catch (err) {
      // keep current comic on failure
    } finally {
      content.style.opacity = '1';
    }
  });
}

async function fetchLatest() {
  const res = await fetch('https://xkcd.com/info.0.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchComic(num) {
  const res = await fetch(`https://xkcd.com/${num}/info.0.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function render(el, data) {
  el.className = 'widget-content xkcd-comic';
  el.innerHTML = `
    <div class="xkcd-title">#${data.num}: ${data.title}</div>
    <img class="xkcd-img" src="${data.img}" alt="${data.alt}" title="${data.alt}">
    <div class="xkcd-alt">${data.alt}</div>
    <div class="xkcd-buttons">
      <button class="xkcd-btn" data-action="random">Random</button>
      <button class="xkcd-btn" data-action="latest">Latest</button>
    </div>
  `;
}
