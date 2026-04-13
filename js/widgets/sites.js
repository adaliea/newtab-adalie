const PINNED_KEY = 'pinnedSites';

export async function initSites(container) {
  const grid = container.querySelector('#sites-grid');
  const addBtn = container.querySelector('#add-site-btn');
  const pinForm = container.querySelector('#pin-form');
  const pinName = container.querySelector('#pin-name');
  const pinUrl = container.querySelector('#pin-url');
  const pinSave = container.querySelector('#pin-save');
  const pinCancel = container.querySelector('#pin-cancel');

  const pinned = await getPinnedSites();
  const topSites = await getTopSites();

  render(grid, pinned, topSites);

  addBtn.addEventListener('click', () => {
    pinForm.hidden = !pinForm.hidden;
    if (!pinForm.hidden) pinName.focus();
  });

  pinCancel.addEventListener('click', () => {
    pinForm.hidden = true;
    pinName.value = '';
    pinUrl.value = '';
  });

  pinSave.addEventListener('click', async () => {
    const name = pinName.value.trim();
    const url = pinUrl.value.trim();
    if (!name || !url) return;

    const updated = await getPinnedSites();
    updated.push({ title: name, url });
    await chrome.storage.sync.set({ [PINNED_KEY]: updated });

    pinName.value = '';
    pinUrl.value = '';
    pinForm.hidden = true;

    render(grid, updated, topSites);
  });
}

function render(grid, pinned, topSites) {
  const pinnedHtml = pinned.map((site, i) =>
    siteCard(site, true, i)
  ).join('');

  // Show top sites that aren't already pinned, up to fill ~8 total
  const pinnedUrls = new Set(pinned.map((s) => normalizeUrl(s.url)));
  const filtered = topSites.filter((s) => !pinnedUrls.has(normalizeUrl(s.url)));
  const remaining = Math.max(0, 8 - pinned.length);
  const topHtml = filtered.slice(0, remaining).map((site) =>
    siteCard(site, false)
  ).join('');

  grid.innerHTML = pinnedHtml + topHtml;

  grid.querySelectorAll('.site-unpin').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const updated = await getPinnedSites();
      updated.splice(idx, 1);
      await chrome.storage.sync.set({ [PINNED_KEY]: updated });
      const topSites = await getTopSites();
      render(grid, updated, topSites);
    });
  });
}

function siteCard(site, isPinned, index) {
  const domain = getDomain(site.url);
  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const unpin = isPinned
    ? `<button class="site-unpin" data-index="${index}" title="Unpin">&times;</button>`
    : '';
  const pinBadge = isPinned ? '<span class="site-pin-badge"></span>' : '';

  return `<a href="${site.url}" class="site-card" title="${escapeAttr(site.title)}">
    ${unpin}
    ${pinBadge}
    <img class="site-favicon" src="${favicon}" alt="" width="24" height="24">
    <span class="site-label">${escapeHtml(site.title || domain)}</span>
  </a>`;
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.replace(/\/$/, '');
  } catch { return url; }
}

async function getPinnedSites() {
  const result = await chrome.storage.sync.get({ [PINNED_KEY]: [] });
  return result[PINNED_KEY];
}

async function getTopSites() {
  try {
    return await chrome.topSites.get();
  } catch {
    return [];
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
