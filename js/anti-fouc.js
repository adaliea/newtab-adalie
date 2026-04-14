var h = new Date().getHours();
var isDark = (h >= 19 || h < 6);
document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
document.documentElement.style.setProperty('--color-sky-text', isDark ? '#c8cdd3' : '#1e3044');
document.documentElement.style.setProperty('--color-sky-muted', isDark ? '#8a94a0' : '#3d5a70');
