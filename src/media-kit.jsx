const themeButton = document.querySelector('.theme-toggle');

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#172635' : '#e8eef4');

  if (themeButton) {
    themeButton.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
    themeButton.setAttribute('aria-pressed', String(isDark));
    themeButton.setAttribute('title', isDark ? 'Modo claro' : 'Modo escuro');
    themeButton.querySelector('span').textContent = isDark ? '☀️' : '🌙';
  }

  try {
    localStorage.setItem('mottameister-theme', theme);
  } catch {
    // The selected theme still applies when storage is unavailable.
  }
}

applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
themeButton?.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function formatStat(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  if (number >= 1_000_000) return `${(number / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  if (number >= 1_000) return `${(number / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`;
  return String(number);
}

const cacheHour = new Date().toISOString().slice(0, 13);

fetch(`/api/community-stats?hour=${cacheHour}`)
  .then((response) => response.ok ? response.json() : null)
  .then((stats) => {
    if (!stats?.ok) return;
    const values = {
      followers: formatStat(stats.instagram?.followers),
      views: formatStat(stats.instagramViews?.totalViews),
      discord: formatStat(stats.discord?.members),
    };
    Object.entries(values).forEach(([name, value]) => {
      if (!value) return;
      document.querySelectorAll(`[data-community-stat="${name}"]`).forEach((element) => {
        element.textContent = value;
      });
    });
  })
  .catch(() => {});
