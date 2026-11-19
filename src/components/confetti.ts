/**
 * A burst of confetti over the whole page, for a moment worth celebrating (a teacher invite opened, then joined).
 * No library: one fixed canvas, added to <body> for the burst and removed when the last piece has fallen. Colours are the
 * theme's tokens read at the moment of the burst, so every theme gets its own. Does nothing when the visitor asked for
 * reduced motion, or outside a browser.
 */
const TOKENS = ["--color-sky-300", "--color-sky-400", "--color-amber-300", "--color-rose-300", "--color-emerald-300", "--color-violet-300"];
const FALLBACK = ["#7dd3fc", "#38bdf8", "#fcd34d", "#fda4af", "#6ee7b7", "#c4b5fd"];

type Piece = { x: number; y: number; vx: number; vy: number; w: number; h: number; spin: number; angle: number; tilt: number; color: string; round: boolean };

export function confetti({ count = 140, origin = { x: 0.5, y: 0.35 } }: { count?: number; origin?: { x: number; y: number } } = {}): void {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const style = getComputedStyle(document.documentElement);
  const colors = TOKENS.map((t, i) => style.getPropertyValue(t).trim() || FALLBACK[i]);

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "9999" });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const ox = origin.x * W;
  const oy = origin.y * H;
  const speed = Math.min(W, 900) / 60;
  const pieces: Piece[] = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1; // mostly upward, fanned out
    const v = speed * (0.5 + Math.random() * 0.8);
    return {
      x: ox, y: oy,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.3,
      tilt: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() < 0.25,
    };
  });

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 16.67, 3); // in 60 fps frames, capped after a stalled tab
    last = now;
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of pieces) {
      p.vy += 0.25 * dt;
      p.vx *= 0.985 ** dt;
      p.vy *= 0.985 ** dt;
      p.x += p.vx * dt + Math.sin(p.tilt) * 0.6;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      p.tilt += 0.08 * dt;
      if (p.y > H + 20) continue;
      alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.scale(1, Math.cos(p.tilt)); // the flutter: a piece turning edge-on
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
