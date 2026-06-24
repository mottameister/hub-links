import { useEffect, useRef, useState } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import './SideRays.css';

const hexToRgb = hex => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match
    ? [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255]
    : [1, 1, 1];
};

const originToFlip = origin => {
  switch (origin) {
    case 'top-left': return [1, 0];
    case 'bottom-right': return [0, 1];
    case 'bottom-left': return [1, 1];
    default: return [0, 0];
  }
};

export default function SideRays({
  speed = 2.5,
  rayColor1 = '#EAB308',
  rayColor2 = '#96c8ff',
  intensity = 2,
  spread = 2,
  origin = 'top-right',
  tilt = 0,
  saturation = 1.5,
  blend = 0.75,
  falloff = 1.6,
  opacity = 1,
  className = ''
}) {
  const containerRef = useRef(null);
  const cleanupRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!isVisible || !container) return undefined;

    let animationId;
    let disposed = false;
    let renderer;

    const initialize = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      if (disposed || !containerRef.current) return;

      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio, 2),
        alpha: true
      });

      const gl = renderer.gl;
      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';
      container.replaceChildren(gl.canvas);

      const vertex = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      const fragment = `
        precision highp float;

        uniform float iTime;
        uniform vec2 iResolution;
        uniform float iSpeed;
        uniform vec3 iRayColor1;
        uniform vec3 iRayColor2;
        uniform float iIntensity;
        uniform float iSpread;
        uniform float iFlipX;
        uniform float iFlipY;
        uniform float iTilt;
        uniform float iSaturation;
        uniform float iBlend;
        uniform float iFalloff;
        uniform float iOpacity;

        float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speedValue) {
          vec2 sourceToCoord = coord - raySource;
          float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
          return clamp(
            (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speedValue)) +
            (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speedValue)),
            0.0, 1.0
          ) * clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
        }

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
          if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

          vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
          vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

          float tiltRad = iTilt * 3.14159265 / 180.0;
          float cs = cos(tiltRad);
          float sn = sin(tiltRad);
          vec2 rel = coord - rayPos;
          vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

          float halfSpread = iSpread * 0.275;
          vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
          vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

          vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
          vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);
          vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

          float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
          float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
          color.rgb *= brightness;

          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          color.rgb = mix(vec3(gray), color.rgb, iSaturation);
          color.a = max(color.r, max(color.g, color.b)) * iOpacity;
          gl_FragColor = color;
        }
      `;

      const [flipX, flipY] = originToFlip(origin);
      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        iSpeed: { value: speed },
        iRayColor1: { value: hexToRgb(rayColor1) },
        iRayColor2: { value: hexToRgb(rayColor2) },
        iIntensity: { value: intensity },
        iSpread: { value: spread },
        iFlipX: { value: flipX },
        iFlipY: { value: flipY },
        iTilt: { value: tilt },
        iSaturation: { value: saturation },
        iBlend: { value: blend },
        iFalloff: { value: falloff },
        iOpacity: { value: opacity }
      };

      const geometry = new Triangle(gl);
      const program = new Program(gl, { vertex, fragment, uniforms });
      const mesh = new Mesh(gl, { geometry, program });

      const updateSize = () => {
        if (!containerRef.current) return;
        renderer.dpr = Math.min(window.devicePixelRatio, 2);
        const { clientWidth: width, clientHeight: height } = containerRef.current;
        renderer.setSize(width, height);
        uniforms.iResolution.value = [width * renderer.dpr, height * renderer.dpr];
      };

      const loop = time => {
        if (disposed) return;
        uniforms.iTime.value = time * 0.001;
        renderer.render({ scene: mesh });
        animationId = requestAnimationFrame(loop);
      };

      window.addEventListener('resize', updateSize);
      updateSize();
      animationId = requestAnimationFrame(loop);

      cleanupRef.current = () => {
        window.removeEventListener('resize', updateSize);
        cancelAnimationFrame(animationId);
        try {
          renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
          renderer.gl.canvas.remove();
        } catch {
          // Context may already be gone during navigation.
        }
      };
    };

    initialize();

    return () => {
      disposed = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [blend, falloff, intensity, isVisible, opacity, origin, rayColor1, rayColor2, saturation, speed, spread, tilt]);

  return <div ref={containerRef} className={`side-rays-container ${className}`.trim()} />;
}
