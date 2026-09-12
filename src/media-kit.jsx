import { createRoot } from 'react-dom/client';
import Particles from './components/Particles';

function formatStat(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  if (number >= 1_000_000) return `${(number / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  if (number >= 1_000) return `${(number / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`;
  return String(number);
}

fetch('/api/community-stats')
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

const root = document.getElementById('media-kit-particles');

if (root) {
  createRoot(root).render(
    <Particles
      particleColors={['#5d526f', '#b517ff', '#43d9ff', '#f7f2ff']}
      particleCount={420}
      particleSpread={11}
      speed={0.075}
      particleBaseSize={90}
      sizeRandomness={1.2}
      moveParticlesOnHover
      particleHoverFactor={0.35}
      alphaParticles
      pixelRatio={Math.min(window.devicePixelRatio, 1.7)}
    />
  );
}
