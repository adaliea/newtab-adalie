var h = new Date().getHours();
document.documentElement.dataset.theme = (h >= 19 || h < 6) ? 'dark' : 'light';
