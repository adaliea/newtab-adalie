import { getCached, setCache, showRefreshing, hideRefreshing, showStale, hideStale } from '../lib/cache.js';

const CACHE_KEY = 'lastfmCache';

export async function initLastfm(container, settings) {
  const content = container.querySelector('.widget-content');

  if (!settings.lastfmApiKey || !settings.lastfmUsername) {
    content.className = 'widget-content setup-message';
    content.innerHTML = 'Add your <a href="settings.html">Last.fm API key & username</a> to see recent tracks.';
    return;
  }

  const cached = await getCached(CACHE_KEY);
  if (cached) {
    render(content, cached);
    showRefreshing(container);
  }

  try {
    const data = await fetchTracks(settings.lastfmApiKey, settings.lastfmUsername);
    await setCache(CACHE_KEY, data);
    hideStale(container);
    render(content, data);
  } catch (err) {
    if (cached) {
      showStale(container, 'Showing cached tracks — refresh failed');
    } else {
      content.className = 'widget-content widget-error';
      content.textContent = `Could not load Last.fm: ${err.message}`;
    }
  } finally {
    hideRefreshing(container);
  }
}

async function fetchTracks(apiKey, username) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.recenttracks?.track || [];
}

function render(el, tracks) {
  el.className = 'widget-content';

  if (!tracks.length) {
    el.innerHTML = '<div class="widget-empty">No recent tracks.</div>';
    return;
  }

  el.innerHTML = tracks.map(track => {
    const isNowPlaying = track['@attr']?.nowplaying === 'true';
    const art = track.image?.[1]?.['#text'] || '';
    const artHtml = art
      ? `<img class="lastfm-art" src="${art}" alt="">`
      : `<div class="lastfm-art"></div>`;
    const nowBadge = isNowPlaying
      ? `<span class="lastfm-now-playing"><span class="lastfm-now-dot"></span> Now playing</span>`
      : '';
    const artist = track.artist?.['#text'] || track.artist;
    const ytmQuery = encodeURIComponent(`${track.name} ${artist}`);
    const ytmUrl = `https://music.youtube.com/search?q=${ytmQuery}`;

    return `
      <a class="lastfm-track" href="${ytmUrl}">
        ${artHtml}
        <div class="lastfm-track-info">
          <div class="lastfm-track-name">${escapeHtml(track.name)}</div>
          <div class="lastfm-track-artist">${escapeHtml(artist)}</div>
          ${nowBadge}
        </div>
      </a>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
