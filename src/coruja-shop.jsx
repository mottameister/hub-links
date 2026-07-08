import { createRoot } from 'react-dom/client';
import Dither from './components/Dither';

const root = document.getElementById('coruja-shop-dither');

if (root) {
  createRoot(root).render(
    <Dither
      waveColor={[0.48627450980392156, 0.22745098039215686, 0.9294117647058824]}
      enableMouseInteraction
      mouseRadius={0.3}
      colorNum={8}
      pixelSize={2}
      waveAmplitude={0.5}
      waveFrequency={2.5}
      waveSpeed={0.03}
    />
  );
}
