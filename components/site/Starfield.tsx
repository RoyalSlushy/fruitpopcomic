'use client';

import { useEffect, useRef } from 'react';

/* The ground. Lives in the layout so it survives navigation.
 *
 * The static build called this from the router on every route change; under
 * client-side navigation there is no resize event, so a taller route would
 * leave the bottom of the document starless. A ResizeObserver on <body> covers
 * route changes and late-loading images alike. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let lastH = -1;

    const paint = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = innerWidth;
      const h = Math.max(innerHeight, document.body.scrollHeight);
      if (h === lastH && cv.width === Math.round(w * dpr)) return;
      lastH = h;

      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const count = Math.round((w * h) / 5200);
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() < 0.88 ? Math.random() * 0.9 + 0.3 : Math.random() * 1.5 + 1;
        ctx.globalAlpha = r > 1.4 ? 0.95 : Math.random() * 0.55 + 0.25;
        ctx.fillStyle = r > 1.4 && Math.random() < 0.35 ? '#82D5ED' : '#fff';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    paint();

    let t: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(t);
      t = setTimeout(paint, 220);
    };

    const ro = new ResizeObserver(debounced);
    ro.observe(document.body);
    addEventListener('resize', debounced);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      removeEventListener('resize', debounced);
    };
  }, []);

  return <canvas id="starfield" ref={ref} aria-hidden="true" />;
}
