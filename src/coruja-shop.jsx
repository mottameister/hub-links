import { createRoot } from 'react-dom/client';
import Dither from './components/Dither';

const root = document.getElementById('coruja-shop-dither');

if (root) {
  createRoot(root).render(
    <Dither
      waveColor={[0.3647, 0, 1]}
      enableMouseInteraction
      mouseRadius={0.8}
      colorNum={6.6}
      pixelSize={2}
      waveAmplitude={0.23}
      waveFrequency={4}
      waveSpeed={0.02}
    />
  );
}
