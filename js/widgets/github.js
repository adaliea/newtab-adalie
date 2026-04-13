import { fetchJSON } from '../lib/api.js';

export async function initGitHub(container, settings) {
  const content = container.querySelector('.widget-content');

  if (!settings.githubToken) {
    content.className = 'widget-content setup-message';
    content.innerHTML = 'Add your <a href="settings.html">GitHub token</a> to see assigned work.';
    return;
  }

  const headers = {
    Authorization: `Bearer ${settings.githubToken}`,
    Accept: 'application/vnd.github.v3+json'
  };

  try {
    const [issues, prs] = await Promise.all([
      fetchJSON('https://api.github.com/issues?filter=assigned&state=open&per_page=10', headers),
      fetchJSON('https://api.github.com/search/issues?q=is:pr+is:open+assignee:@me&per_page=10', headers)
    ]);

    // Filter out pull requests from the issues endpoint
    const realIssues = issues.filter((i) => !i.pull_request);
    const pullRequests = prs.items || [];

    render(content, realIssues, pullRequests);
  } catch (err) {
    content.className = 'widget-content widget-error';
    content.textContent = `Could not load GitHub data: ${err.message}`;
  }
}

function render(el, issues, prs) {
  el.className = 'widget-content';

  if (issues.length === 0 && prs.length === 0) {
    el.innerHTML = '<div class="widget-empty">No assigned issues or PRs</div>';
    return;
  }

  let html = '';

  if (issues.length > 0) {
    html += '<div class="github-section-label">Issues</div>';
    html += `<ul class="widget-list">${issues.map(renderIssue).join('')}</ul>`;
  }

  if (prs.length > 0) {
    if (issues.length > 0) html += '<div style="margin-top: var(--spacing-sm)"></div>';
    html += '<div class="github-section-label">Pull Requests</div>';
    html += `<ul class="widget-list">${prs.map(renderIssue).join('')}</ul>`;
  }

  el.innerHTML = html;
}

function renderIssue(item) {
  const repoName = item.repository_url
    ? item.repository_url.split('/').slice(-2).join('/')
    : (item.repository?.full_name || '');

  const labels = (item.labels || []).map((label) => {
    const bg = `#${label.color}`;
    const fg = isLight(label.color) ? '#24292e' : '#ffffff';
    return `<span class="label-pill" style="background:${bg};color:${fg}">${escapeHtml(label.name)}</span>`;
  }).join(' ');

  return `<li>
    <div class="widget-item-sub">${escapeHtml(repoName)}</div>
    <div class="widget-item-title">
      <a href="${item.html_url}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
    </div>
    ${labels ? `<div style="margin-top:2px">${labels}</div>` : ''}
  </li>`;
}

function isLight(hexColor) {
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
