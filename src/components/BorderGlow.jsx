import { useCallback, useEffect, useRef } from 'react';

function parseHSL(hslStr) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 270, s: 90, l: 70 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  return Object.fromEntries(opacities.map((opacity, index) => [
    `--glow-color${keys[index]}`,
    `hsl(${base} / ${Math.min(opacity * intensity, 100)}%)`
  ]));
}

const positions = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const keys = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const colorMap = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {
  const vars = {};
  keys.forEach((key, index) => {
    const color = colors[Math.min(colorMap[index], colors.length - 1)];
    vars[key] = `radial-gradient(at ${positions[index]}, ${color} 0px, transparent 50%)`;
  });
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

export default function BorderGlow({
  children,
  className = '',
  as: Element = 'div',
  edgeSensitivity = 24,
  glowColor = '280 92 72',
  backgroundColor = 'rgba(13, 11, 22, .78)',
  borderRadius = 24,
  glowRadius = 34,
  glowIntensity = 0.85,
  coneSpread = 25,
  colors = ['#b517ff', '#ff4fd8', '#43d9ff'],
  fillOpacity = 0.32,
  ...props
}) {
  const cardRef = useRef(null);

  const handlePointerMove = useCallback((event) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
    const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
    card.style.setProperty('--pointer-x', `${x.toFixed(1)}px`);
    card.style.setProperty('--pointer-y', `${y.toFixed(1)}px`);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    const reset = () => card.style.setProperty('--edge-proximity', '0');
    card.addEventListener('pointerleave', reset);
    return () => card.removeEventListener('pointerleave', reset);
  }, []);

  return (
    <Element
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`border-glow-card ${className}`}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': edgeSensitivity,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': coneSpread,
        '--fill-opacity': fillOpacity,
        ...buildGlowVars(glowColor, glowIntensity),
        ...buildGradientVars(colors)
      }}
      {...props}
    >
      <span className="edge-light" aria-hidden="true" />
      <span className="cursor-wash" aria-hidden="true" />
      <div className="border-glow-inner">{children}</div>
    </Element>
  );
}
