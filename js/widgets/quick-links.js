export function initQuickLinks(container, settings) {
  const links = [
    { label: 'Calendar', url: 'https://calendar.google.com', icon: '📅' },
    { label: 'Tasks', url: 'https://tasks.google.com', icon: '✅' },
    { label: 'GitHub', url: 'https://github.com', icon: '💻' },
  ];

  if (settings.canvasUrl) {
    links.push({
      label: 'Canvas',
      url: settings.canvasUrl,
      icon: '🎓'
    });
  }

  container.innerHTML = links.map((link) =>
    `<a href="${link.url}" class="quick-link">
      <span class="quick-link-icon">${link.icon}</span>
      <span class="quick-link-label">${link.label}</span>
    </a>`
  ).join('');
}
