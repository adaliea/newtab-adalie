export function initClock(container, settings) {
  const greetingEl = container.querySelector('.greeting');
  const timeEl = container.querySelector('.time');
  const dateEl = container.querySelector('.date');

  function getGreeting(hour) {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function update() {
    const now = new Date();
    const hour = now.getHours();

    const name = settings.userName ? `, ${settings.userName}` : '';
    greetingEl.textContent = `${getGreeting(hour)}${name}`;

    timeEl.textContent = now.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  update();
  setInterval(update, 1000);
}
