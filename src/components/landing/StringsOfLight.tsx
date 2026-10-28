"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { DISPLAY } from "./Display";
import { onSilence } from "@/features/sound";
import { MODE_PAGES } from "@/features/theory/scales";
import { scaleHref } from "@/features/theory/keySlug";
import { playMoodPhrase } from "./moodPhrase";

/**
 * Six moods from brightest to darkest. `rgb` tints the light; `drift` is how the dust moves (up floats, down sinks),
 * `sparkle` makes it twinkle.
 */
const MOODS = [
  { mode: 3, name: "Dreamy", feel: "floating, like a film score", rgb: [56, 189, 248], drift: 0.25, sparkle: 0 },
  { mode: 0, name: "Bright", feel: "happy and settled", rgb: [251, 191, 36], drift: 0.6, sparkle: 1 },
  { mode: 4, name: "Bluesy", feel: "bright, with a swagger", rgb: [52, 211, 153], drift: 0.45, sparkle: 0.3 },
  { mode: 1, name: "Soulful", feel: "minor, but warm", rgb: [45, 212, 191], drift: 0.35, sparkle: 0 },
  { mode: 5, name: "Sad", feel: "heartfelt and serious", rgb: [167, 139, 250], drift: -0.15, sparkle: 0 },
  { mode: 2, name: "Dark", feel: "tense, with Spanish fire", rgb: [251, 113, 133], drift: -0.4, sparkle: 0 },
];
/** before any mood: a dim, cool glow and dust that barely rises */
const IDLE = { rgb: [125, 160, 210], drift: 0.12, sparkle: 0 };

/** the phrases are in A */
const TONIC_PC = 9;
/** low E to high e */
const OPEN = [40, 45, 50, 55, 59, 64];

/** The string a note is played on: the one that puts it nearest the 7th fret, as a player in that position would. */
function place(midi: number) {
  let best = { s: 5, f: Math.max(0, Math.min(12, midi - OPEN[5])), d: Infinity };
  OPEN.forEach((open, s) => {
    const f = midi - open;
    if (f >= 0 && f <= 12 && Math.abs(f - 7) < best.d) best = { s, f, d: Math.abs(f - 7) };
  });
  return best;
}

const FADE = "radial-gradient(closest-side, black 55%, transparent)";
/** frosted glass tinted by the mood: a coloured frame, a faint sheen and a soft glow of the same colour */
const glass = ([r, g, b]: number[]): CSSProperties => ({
  borderColor: `rgba(${r},${g},${b},0.45)`,
  background: `linear-gradient(135deg, rgba(${r},${g},${b},0.16), rgba(255,255,255,0.02) 45%, rgba(${r},${g},${b},0.08))`,
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 0 40px -8px rgba(${r},${g},${b},0.35), 0 24px 60px -20px rgba(0,0,0,0.5)`,
});

type Rgb = number[];
const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const toward = (c: Rgb, to: number, k: number) => c.map((v) => v + (to - v) * k);

/**
 * The home page's picture of sound: six strings of light running behind a pane of frosted glass whose frame takes on the mood. Pick a mood and its phrase
 * plays; every note plucks its string, which shakes, flares and sends out a ripple, while the colour and the drifting dust
 * take on the mood. Nothing sounds until a mood is picked.
 *
 * Replaced FretWalk (the scale walking the A string on a flat neck) as the hero.
 */
export default function StringsOfLight() {
  const [mood, setMood] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // what the drawing loop reads; kept out of React state so a note never re-renders the page
  const scene = useRef({ look: IDLE as { rgb: Rgb; drift: number; sparkle: number }, plucks: [] as { s: number; f: number }[] });
  const stop = useRef<(() => void) | null>(null);

  // any other sound in the app (or leaving the page) ends the phrase
  useEffect(() => {
    const off = onSilence(() => {
      stop.current?.();
      stop.current = null;
    });
    return () => {
      off();
      stop.current?.();
    };
  }, []);

  const pick = (i: number) => {
    setMood(i);
    scene.current.look = MOODS[i];
    // each note, as it sounds, plucks its string
    stop.current = playMoodPhrase(i, (midi) => scene.current.plucks.push(place(midi)));
  };

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = el.clientWidth;
      H = el.clientHeight;
      el.width = W * dpr;
      el.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(el);

    const strings = OPEN.map((_, s) => ({ amp: 0, phase: 0, freq: 3 + s, at: 0.5 }));
    // dust at depths 0 (far) to 1 (near): nearer motes are bigger, brighter and faster, which gives the scene its depth
    const dust = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), seed: Math.random() * 20 }));
    const rings: { x: number; y: number; age: number }[] = [];
    const tint = [...IDLE.rgb];
    const stringY = (s: number, x: number) => H / 2 + (2.5 - s) * H * 0.105 - (x - W / 2) * 0.05;
    // inside the faded edges of the (wider than its column) canvas
    const fretX = (f: number) => W * (0.22 + (f / 12) * 0.56);

    let visible = true;
    const seen = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    seen.observe(el);

    // light styles (Surf): added light vanishes on a pale page, so the strings are drawn as deeper ink instead
    const isLight = () => getComputedStyle(document.documentElement).colorScheme.includes("light");
    let light = isLight();
    const restyle = new MutationObserver(() => (light = isLight()));
    restyle.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    /** the mood's colour pushed toward the page's far end: white on dark, black on light */
    const hi = (k: number) => toward(tint, light ? 0 : 255, light ? k * 0.7 : k);

    let raf = 0, last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (!visible) return;
      const { look } = scene.current;
      tint.forEach((v, i) => (tint[i] = v + (look.rgb[i] - v) * Math.min(1, dt * 1.5)));

      for (const p of scene.current.plucks.splice(0)) {
        const st = strings[p.s];
        st.amp = H * 0.06;
        st.at = (fretX(p.f) + 20) / (W + 40);
        rings.push({ x: fretX(p.f), y: stringY(p.s, fretX(p.f)), age: 0 });
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";

      // a soft wash of the mood's colour behind everything
      const wash = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
      wash.addColorStop(0, rgba(tint, 0.12));
      wash.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, W, H);

      for (const d of dust) {
        if (!still) {
          d.y -= (dt * look.drift * (0.3 + d.z) * 40) / H;
          d.x += (Math.sin(now / 3000 + d.seed) * dt * 6) / W;
          if (d.y < -0.02) d.y = 1.02;
          if (d.y > 1.02) d.y = -0.02;
        }
        const twinkle = look.sparkle ? 0.5 + 0.5 * Math.sin(now / 180 + d.seed * 7) * look.sparkle : 1;
        ctx.fillStyle = rgba(tint, (0.15 + d.z * 0.55) * twinkle);
        ctx.beginPath();
        ctx.arc(d.x * W, d.y * H, 0.6 + d.z * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      const core = rgba(hi(0.45), 0.9);
      strings.forEach((st, s) => {
        st.amp *= Math.pow(0.18, dt);
        st.phase += dt * st.freq * Math.PI * 2;
        ctx.beginPath();
        for (let i = 0; i <= 80; i++) {
          const k = i / 80;
          const x = -20 + k * (W + 40);
          // the shape of a plucked string: biggest at the pluck, pinned at both ends
          const bend = k < st.at ? k / st.at : (1 - k) / (1 - st.at);
          const y = stringY(s, x) + st.amp * bend * Math.sin(Math.PI * k) * Math.sin(st.phase);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        const loud = Math.min(1, st.amp / (H * 0.03));
        ctx.strokeStyle = rgba(tint, 0.12 + loud * 0.2);
        ctx.lineWidth = 7 + s * 0.6;
        ctx.stroke();
        ctx.strokeStyle = core;
        ctx.lineWidth = 2.2 - s * 0.25;
        ctx.stroke();
      });

      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.age += dt;
        const k = r.age / 1.6;
        if (k >= 1) {
          rings.splice(i, 1);
          continue;
        }
        const flare = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, H * 0.12);
        flare.addColorStop(0, rgba(hi(0.6), (light ? 0.35 : 0.8) * Math.max(0, 1 - k * 1.4)));
        flare.addColorStop(1, rgba(tint, 0));
        ctx.fillStyle = flare;
        ctx.fillRect(r.x - H * 0.12, r.y - H * 0.12, H * 0.24, H * 0.24);
        ctx.strokeStyle = rgba(tint, 0.9 * (1 - k));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 8 + k * H * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      restyle.disconnect();
    };
  }, []);

  const m = mood === null ? null : MOODS[mood];
  const page = m && MODE_PAGES.find((p) => p.familyIndex === 0 && p.modeIndex === m.mode);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative h-72 sm:h-80 lg:h-96">
        {/* wider than the column and faded at every edge, so the light melts into the page instead of sitting in a box */}
        <canvas ref={canvas} aria-hidden className="absolute inset-y-0 left-[-10%] h-full w-[120%]" style={{ maskImage: FADE, WebkitMaskImage: FADE }} />
        {/* the pane the strings run behind, its frame taking on the mood's colour: they stay sharp to its left and soften through it */}
        <div className="absolute inset-y-[12%] left-[14%] right-0 flex flex-col justify-end gap-1 rounded-3xl border p-5 backdrop-blur-[3px] sm:backdrop-blur-md transition-[border-color,box-shadow,background] duration-700 sm:p-6" style={glass(m ? m.rgb : IDLE.rgb)}>
          {m && (
            <p key={mood} className="landing-fade text-3xl text-slate-50 sm:text-4xl" style={{ ...DISPLAY, fontStyle: "var(--style-italic, italic)" as CSSProperties["fontStyle"], fontVariationSettings: 'var(--style-display-variation, "SOFT" 100)' }}>
              {m.name}
            </p>
          )}
          <p className="text-sm text-slate-300" aria-live="polite">{m?.feel}</p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Feeling" className="flex flex-wrap gap-1.5">
        {MOODS.map((x, i) => (
          <button
            key={x.name}
            type="button"
            role="radio"
            aria-checked={i === mood}
            onClick={() => pick(i)}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${i === mood ? "border-slate-300 bg-slate-100 font-semibold text-slate-950" : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100"}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `rgb(${x.rgb.join(" ")})` }} />
            {x.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link href="/theory" className="inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-50 transition hover:bg-emerald-500/25">
          Start training <Icon name="chevron-right" size={14} />
        </Link>
        {m && page && (
          <Link key={page.slug} href={scaleHref(page.slug, TONIC_PC)} className="landing-fade text-sm text-slate-400 underline decoration-slate-700 underline-offset-4 hover:text-slate-200">
            Learn to play {m.name.toLowerCase()} on the neck →
          </Link>
        )}
      </div>
    </div>
  );
}
