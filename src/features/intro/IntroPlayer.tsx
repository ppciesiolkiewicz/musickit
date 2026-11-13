"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { SCRIPT, VOICE } from "./data";
import { SCENES } from "./scenes";
import { clock, sceneAt, timeline, totalLength } from "./timeline";

const W = 960;
const H = 540;

/** Keyframes the scenes use (Tailwind's arbitrary `animate-[…]` names them). */
const KEYFRAMES = `
@keyframes intro-drop { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
@keyframes intro-wobble { 0%, 60%, 100% { transform: rotate(0) } 70% { transform: rotate(-14deg) } 80% { transform: rotate(12deg) } 90% { transform: rotate(-6deg) } }
`;

/**
 * The quick tour: a 16:9 stage of animated scenes, timed to the narration (one MP3 per scene from `voice.json`) or, for a
 * scene not recorded yet, to an estimate, playing silent with its caption. The clock follows the audio while a scene's take
 * plays and the frame clock otherwise, so the picture never runs ahead of the voice. `spaceKey` lets Space play and pause
 * anywhere on the page; off on a page where Space should scroll (the home page). `compact` drops the scene chips and the
 * caption, for a small player beside other content (the demos page).
 */
export default function IntroPlayer({ spaceKey = true, compact = false }: { spaceKey?: boolean; compact?: boolean }) {
  const scenes = useMemo(() => timeline(SCRIPT, VOICE), []);
  const total = totalLength(scenes);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const tRef = useRef(0);
  const index = sceneAt(scenes, t);
  const scene = scenes[index];
  const local = t - scene.start;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // the scene's take: loaded when the scene changes, started at the scene's own time
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (!scene.audio) {
      a.removeAttribute("src");
      a.load();
      return;
    }
    if (!a.src.endsWith(scene.audio)) a.src = scene.audio;
    const offset = tRef.current - scene.start;
    if (Math.abs(a.currentTime - offset) > 0.25) a.currentTime = Math.max(0, offset);
    if (playing) a.play().catch(() => {});
    else a.pause();
  }, [scene, playing]);

  useEffect(() => {
    if (audio.current) audio.current.muted = muted;
  }, [muted]);

  // the clock
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const cur = tRef.current;
      const s = scenes[sceneAt(scenes, cur)];
      const a = audio.current;
      let next = cur + dt;
      if (s.audio && a && !a.paused && !a.ended && a.src.endsWith(s.audio)) next = s.start + a.currentTime;
      if (next >= total) {
        tRef.current = total;
        setT(total);
        setPlaying(false);
        return;
      }
      tRef.current = next;
      setT(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, scenes, total]);

  const seek = (to: number) => {
    const v = Math.max(0, Math.min(total - 0.01, to));
    tRef.current = v;
    setT(v);
    const s = scenes[sceneAt(scenes, v)];
    if (audio.current && s.audio && audio.current.src.endsWith(s.audio)) audio.current.currentTime = v - s.start;
  };

  const toggle = () => {
    setStarted(true);
    if (!playing && tRef.current >= total - 0.05) seek(0);
    setPlaying((p) => !p);
  };

  useEffect(() => {
    if (!spaceKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, button, [contenteditable=true]")) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const Scene = SCENES[scene.id];
  const silent = !scenes.some((s) => s.audio);

  return (
    <div className="grid gap-4">
      <style>{KEYFRAMES}</style>
      <audio ref={audio} preload="auto" />
      <div ref={box} className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <div aria-hidden={!started} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <div key={scene.id} className="relative h-full w-full animate-[intro-drop_0.5s_ease-out]">
            {Scene && <Scene local={local} at={scene.at} />}
          </div>
        </div>
        {!started && (
          <button type="button" onClick={toggle} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 text-slate-100 backdrop-blur-[2px]">
            <span className={`flex items-center justify-center rounded-full bg-sky-500 text-white shadow-xl ${compact ? "h-14 w-14" : "h-20 w-20"}`}><Icon name="play" size={compact ? 24 : 34} /></span>
            <span className={compact ? "text-sm" : "text-lg"}>Play the tour · {clock(total)}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} title={spaceKey ? (playing ? "Pause (Space)" : "Play (Space)") : playing ? "Pause" : "Play"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400">
          <Icon name={playing ? "pause" : "play"} size={18} />
        </button>
        <input
          type="range"
          min={0}
          max={total}
          step={0.05}
          value={t}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Position in the tour"
          className="min-w-0 flex-1 accent-sky-400"
        />
        <span className="w-24 shrink-0 text-right text-sm tabular-nums text-slate-400">{clock(t)} / {clock(total)}</span>
        {!silent && (
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Turn the sound on" : "Mute"} title={muted ? "Turn the sound on" : "Mute"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-200">
            <Icon name={muted ? "volume-x" : "volume-2"} size={18} />
          </button>
        )}
      </div>

      {!compact && <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Jump to a part">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => seek(s.start)}
            aria-current={i === index ? "step" : undefined}
            className={`rounded-full border px-3 py-1 text-sm transition ${i === index ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
          >
            {s.caption}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="min-h-[3.5rem] text-lg leading-relaxed text-slate-200">{started ? scene.text : ""}</p>
      </>}
    </div>
  );
}
