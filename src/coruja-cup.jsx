import { createRoot } from 'react-dom/client';
import SideRays from './components/SideRays';

const root = document.getElementById('coruja-cup-rays');

if (root) {
  createRoot(root).render(
    <SideRays
      speed={1.4}
      rayColor1="#ff4fd8"
      rayColor2="#7c3aed"
      intensity={1.5}
      spread={1.8}
      origin="top-right"
      tilt={-4}
      saturation={1.35}
      blend={0.68}
      falloff={1.85}
      opacity={0.72}
    />
  );
}
