import { createRoot } from 'react-dom/client';
import Particles from './components/Particles';

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
