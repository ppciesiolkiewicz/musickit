"use client";

import { useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { gridOf, parsePlaced, placeByHand, type Grid, type NeckRead, type Pt } from "../model/grid";
import {
  FILTER_CSS, across, coveredNow, easeGrid, filtersOn, frettingTips, neckWidthMm, noteHue, noteName, parseButtons, pxPerMm,
  spaceAt, wireAt, type Filter, type FxSettings,
} from "../model/fx";
import { CALM, QUIET, easeMood, keyOf, moodColour, moodFilter, moodTarget, stepBeat, type Beat, type Heard, type Mood } from "../model/mood";
import { listenForPicks, type Pick } from "../client/listen";

/** The hand model and its runtime, fetched on first use (dev tool only). */
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
/** Marker detection runs on a frame this wide, for speed. */
const DETECT_WIDTH = 640;
const TIPS = [4, 8, 12, 16, 20];
const DOTS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
/** How long a grid is kept once its markers are gone, and how long a flash and a pulse last (s). */
const KEEP_GRID = 0.5, FLASH = 0.6, PULSE = 0.5, TRAIL = 14;
/** How long notes are kept for the mood (s), the most sparks at once, and how fast a beat bump settles (per s). */
const KEEP_HEARD = 8, MAX_SPARKS = 700, BUMP_DECAY = 10;
/** Effects that need the picks heard live. */
const HEARING = new Set(["flash", "pulse", "mood", "heat", "sparks", "bump"]);
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; hue: number; size: number };

type Marker = { id: number; corners: { x: number; y: number }[] };
type Detector = { detect: (img: ImageData) => Marker[] };

let hands: Promise<HandLandmarker> | null = null;
function loadHands() {
  hands ??= import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, HandLandmarker }) =>
    HandLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(WASM), {
      baseOptions: { modelAssetPath: HAND_MODEL }, runningMode: "VIDEO", numHands: 2,
    }));
  hands.catch(() => { hands = null; });
  return hands;
}
async function loadMarkers(): Promise<Detector> {
  // CommonJS: the library puts AR on `this`, which is its exports under Turbopack and the page's global under webpack
  type Lib = { AR?: { Detector: new (o: object) => Detector } };
  // under webpack aruco.js finds CV only on the global, so cv.js goes first
  await import("js-aruco2/src/cv");
  const mod = (await import("js-aruco2")) as unknown as Lib & { default?: Lib };
  const AR = mod.AR ?? mod.default?.AR ?? (globalThis as Lib).AR;
  if (!AR) throw new Error("the marker reader didn't load");
  return new AR.Detector({ dictionaryName: "ARUCO_MIP_36h12" });
}

const FILTER_WORDS: Record<Filter, string> = { mono: "Mono", neon: "Neon", warm: "Warm", cold: "Cold", invert: "Invert", blur: "Blur" };

/**
 * Over a video (the live camera or a take): the ArUco markers seen on the neck and the hands, the fret grid from the placed
 * markers, and the effects ticked in `fx`. Covering a marker listed in `fx.buttons` turns on its filter. Picks come from
 * `stream`'s sound (live) or from `notes` at their times in the video (a take).
 */
export default function NeckView({ video, fx, live = false, notes, onRead, fit = "contain", bare = false }: {
  video: HTMLVideoElement | null;
  /** how the video fills its box (its object-fit), so the drawing lines up with it */
  fit?: "contain" | "cover";
  fx: FxSettings;
  /** the video is the live camera: the sound of its stream gives the picks for Note flash and Pick pulse */
  live?: boolean;
  /** a take's notes, at their times in the video */
  notes?: { start: number; midi: number }[];
  /** each frame read, for the take's log */
  onRead?: (r: NeckRead) => void;
  /** no status line over the picture: the take is being exported with the effects in it */
  bare?: boolean;
}) {
  const report = useRef(onRead);
  useEffect(() => { report.current = onRead; }, [onRead]);
  const settings = useRef(fx);
  useEffect(() => { settings.current = fx; }, [fx]);
  const timed = useRef(notes);
  useEffect(() => { timed.current = notes; }, [notes]);
  const picks = useRef<(Pick & { at: number })[]>([]);
  // the loudest sound heard live since the last animation frame (null: nothing heard, or a take)
  const loudest = useRef<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Loading the hand model…");
  const [problem, setProblem] = useState("");
  const [deaf, setDeaf] = useState("");
  // the last pick heard, shown in the status line
  const [heard, setHeard] = useState("");

  const listens = live && fx.effects.some((e) => HEARING.has(e));
  useEffect(() => {
    if (!listens || !video) return;
    let stop: (() => void) | null = null, gone = false;
    // the page gives the video its stream once the camera is open, which can be after this runs
    const start = () => {
      const stream = video.srcObject;
      if (stop || gone || !(stream instanceof MediaStream)) return;
      stop = () => undefined;
      listenForPicks(stream, (p) => { picks.current.push({ ...p, at: performance.now() / 1000 }); setHeard(p.midi === null ? "?" : noteName(p.midi)); },
        (rms) => { loudest.current = Math.max(loudest.current ?? 0, rms); })
        .then((s) => { if (gone) s(); else stop = s; })
        .catch((e: unknown) => { if (!gone) setDeaf(`Picks aren't heard: ${e instanceof Error ? e.message : String(e)}.`); });
    };
    start();
    video.addEventListener("loadedmetadata", start);
    return () => { gone = true; video.removeEventListener("loadedmetadata", start); stop?.(); loudest.current = null; setDeaf(""); setHeard(""); };
  }, [listens, video]);

  useEffect(() => {
    if (!video) return;
    let gone = false, id = 0, lastTime = -1;
    const drawn = canvas.current;
    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d", { willReadFrequently: true })!;
    // what the last frame read: drawn every animation frame, so effects fade while the video is paused
    let found: Marker[] = [], k = 1, handsSeen: Pt[][] = [], landmarks: { x: number; y: number }[][] = [];
    let grid: Grid | null = null, gridAt = -Infinity;
    const seenAt = new Map<number, number>();
    let coveredBefore: number[] = [];
    const toggled = new Set<Filter>();
    let filters: Filter[] = [];
    const trails: Pt[][] = [];
    const flashes: { at: number; space: number | null; midi: number | null; level: number; hand: Pt | null }[] = [];
    // the mood: notes heard lately, the eased mood, the fret the hand is at, sparks in the air and the last beat bump
    const heard: Heard[] = [];
    let mood: Mood = CALM, moodAt = -1, handFret: number | null = null, keyName = "", keyTonic: number | null = null;
    const sparks: Spark[] = [];
    let bump = 0, beat: Beat = QUIET, pickedNow = 0;
    // which side of the markers' line the neck is on: the side the fretting hand is (+1 or −1), kept once seen
    let neckSide = 1;
    void Promise.all([loadHands(), loadMarkers()]).then(([hand, markers]) => {
      if (gone) return;
      setStatus("Play the take to read it.");
      const frame = () => {
        if (gone) return;
        id = requestAnimationFrame(frame);
        const c = canvas.current;
        if (!c || !video.videoWidth) return;
        const w = video.videoWidth, h = video.videoHeight;
        if (c.width !== w) { c.width = w; c.height = h; }
        const now = performance.now() / 1000;
        const fxNow = settings.current;
        const on = new Set(fxNow.effects);

        if (video.currentTime !== lastTime) {
          const before = lastTime;
          lastTime = video.currentTime;
          k = Math.min(1, DETECT_WIDTH / w);
          scratch.width = Math.round(w * k); scratch.height = Math.round(h * k);
          sctx.drawImage(video, 0, 0, scratch.width, scratch.height);
          found = markers.detect(sctx.getImageData(0, 0, scratch.width, scratch.height));
          const res = hand.detectForVideo(video, performance.now());
          landmarks = res.landmarks;
          handsSeen = res.landmarks.map((lm) => TIPS.map((t) => ({ x: lm[t].x * w, y: lm[t].y * h })));

          const centre = (m: Marker) => ({ x: m.corners.reduce((t, p) => t + p.x, 0) / 4 / k, y: m.corners.reduce((t, p) => t + p.y, 0) / 4 / k });
          const fresh = gridOf(found.map((m) => ({ id: m.id, c: centre(m) })), parsePlaced(fxNow.markers));
          if (fresh) { grid = easeGrid(grid, fresh); gridAt = now; }
          else if (now - gridAt > KEEP_GRID) grid = null;

          const buttons = parseButtons(fxNow.buttons);
          const covered = coveredNow(seenAt, found.map((m) => m.id), now, buttons.map((b) => b.id));
          filters = filtersOn(buttons, covered, coveredBefore, fxNow.mode, toggled);
          coveredBefore = covered;

          for (const [i, tips] of handsSeen.entries()) for (const [j, p] of tips.entries()) {
            const trail = (trails[i * 5 + j] ??= []);
            trail.push(p);
            if (trail.length > TRAIL) trail.shift();
          }
          for (let i = handsSeen.length * 5; i < trails.length; i++) trails[i] = [];

          // a take's notes as the video passes them (not on a seek)
          const passed = before >= 0 && lastTime > before && lastTime - before < 0.5
            ? (timed.current ?? []).filter((n) => n.start > before && n.start <= lastTime) : [];
          for (const n of [...passed.map((n) => ({ midi: n.midi, level: 0.7 })), ...picks.current.splice(0)]) {
            const tips = grid ? frettingTips(grid, handsSeen) : null;
            const placed = n.midi !== null && tips ? placeByHand(n.midi, tips.frets) : null;
            const middle = tips ? { x: tips.tips.reduce((t, p) => t + p.x, 0) / tips.tips.length, y: tips.tips.reduce((t, p) => t + p.y, 0) / tips.tips.length } : handsSeen[0]?.[2] ?? null;
            flashes.push({ at: now, space: placed && placed.fret > 0 ? placed.fret : null, midi: n.midi, level: n.level, hand: middle });
            heard.push({ t: now, midi: n.midi, level: n.level });
            pickedNow = Math.max(pickedNow, Math.min(1, n.level * 1.4));
            // sparks and a bump, sized by the mood: few and slow when calm, a burst when wild
            const from = grid && placed && placed.fret > 0 ? spaceAt(grid, placed.fret) : middle ?? { x: w / 2, y: h * 0.6 };
            const { hue: sHue } = moodColour(mood), e = mood.energy, ss = fxNow.strength.sparks, scale = (w / 1280) * (0.6 + 0.4 * ss);
            if (on.has("sparks")) for (let i = Math.round((6 + 40 * e * (0.5 + n.level)) * ss); i > 0 && sparks.length < MAX_SPARKS; i--) {
              const a = Math.random() * Math.PI * 2, v = (80 + Math.random() * (150 + 550 * e)) * scale;
              sparks.push({ x: from.x, y: from.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120 * e * scale, age: 0, life: 0.5 + Math.random() * (0.4 + 1.2 * e), hue: sHue + (Math.random() - 0.5) * 50, size: (2 + Math.random() * (2 + 5 * e)) * scale });
            }
            if (on.has("bump")) bump = Math.max(bump, (0.008 + 0.05 * e * (0.4 + n.level)) * fxNow.strength.bump);
          }
          while (heard.length && now - heard[0].t > KEEP_HEARD) heard.shift();
          const tipsNow = grid ? frettingTips(grid, handsSeen) : null;
          handFret = tipsNow ? [...tipsNow.frets].sort((a, b) => a - b)[Math.floor(tipsNow.frets.length / 2)] : null;
          if (grid && tipsNow) {
            const n = across(grid);
            const off = tipsNow.tips.reduce((t, p) => t + (p.x - grid!.origin.x) * n.x + (p.y - grid!.origin.y) * n.y, 0);
            if (Math.abs(off) > 1) neckSide = Math.sign(off);
          }
          const key = keyOf(heard, now);
          keyName = key?.name ?? ""; keyTonic = key?.tonic ?? null;

          const r2 = (v: number) => Math.round(v * 1000) / 1000;
          report.current?.({
            t: video.currentTime,
            markers: found.map((m) => m.id).sort((a, b) => a - b),
            at: found.map((m) => { const p = centre(m); return { id: m.id, x: r2(p.x / w), y: r2(p.y / w) }; }),
            hands: handsSeen.map((tips) => tips.map((p) => ({ x: r2(p.x / w), y: r2(p.y / w) }))),
          });
          const shown = filters.map((f) => FILTER_WORDS[f]).join(", ");
          const moody = ["mood", "heat", "sparks", "bump"].some((e) => on.has(e as never));
          setStatus(`Markers: ${found.length ? found.map((m) => m.id).sort((a, b) => a - b).join(", ") : "none"} · Hands: ${landmarks.length}${grid ? "" : " · No frets: under two placed markers seen"}${shown ? ` · ${shown}` : ""}${moody ? ` · Energy: ${Math.round(mood.energy * 100)}%${keyName ? ` · ${keyName} · Tension: ${Math.round(mood.tension * 100)}%` : ""}` : ""}`);
        }
        while (flashes.length && now - flashes[0].at > Math.max(FLASH, PULSE)) flashes.shift();
        const dt = moodAt < 0 ? 0 : Math.min(0.1, now - moodAt);
        moodAt = now;
        mood = easeMood(mood, moodTarget(heard, now, handFret), dt);
        beat = stepBeat(beat, loudest.current, pickedNow, dt);
        if (loudest.current !== null) loudest.current = 0;
        pickedNow = 0;
        const mc = moodColour(mood), e = mood.energy, { strength, beat: follows } = fxNow;
        const col = (a: number, dl = 0) => `hsla(${mc.hue} ${mc.sat}% ${Math.min(95, mc.light + dl)}% / ${a})`;
        video.style.filter = [...(on.has("mood") ? [moodFilter(mood, strength.mood, beat.beat * follows.mood)] : []), ...filters.map((f) => FILTER_CSS[f])].join(" ");
        bump *= Math.exp(-BUMP_DECAY * dt);
        // a tense note shakes the picture a little while it lasts
        const shake = mood.tension > 0.5 ? (mood.tension - 0.5) * (2 + 8 * e) * strength.bump : 0;
        const zoom = on.has("bump") && (bump > 0.0005 || shake > 0.2)
          ? `scale(${(1 + bump).toFixed(4)}) translate(${((Math.random() - 0.5) * shake).toFixed(1)}px, ${((Math.random() - 0.5) * shake).toFixed(1)}px)` : "";
        video.style.transform = zoom; c.style.transform = zoom;

        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);
        const lastNote = [...flashes].reverse().find((f) => f.midi !== null)?.midi ?? null;
        const hue = lastNote === null ? 190 : noteHue(lastNote);
        // how wide the neck looks: from the markers' size on screen
        const side = found.length ? found.reduce((t, m) => t + Math.hypot(m.corners[1].x - m.corners[0].x, m.corners[1].y - m.corners[0].y), 0) / found.length / k : w / 20;
        const half = Math.max(30, side * 1.4);
        const band = (g: Grid, from: number, to: number) => {
          const a = wireAt(g, from), b = wireAt(g, to), n = across(g);
          ctx.beginPath();
          ctx.moveTo(a.x + n.x * half, a.y + n.y * half); ctx.lineTo(b.x + n.x * half, b.y + n.y * half);
          ctx.lineTo(b.x - n.x * half, b.y - n.y * half); ctx.lineTo(a.x - n.x * half, a.y - n.y * half);
          ctx.closePath();
        };

        if (on.has("mood")) {
          const sm = strength.mood, kick = beat.beat * follows.mood;
          // the whole picture tinted the mood's colour, more as the energy climbs and on the beat
          ctx.fillStyle = col(Math.min(0.45, sm * (0.06 + 0.12 * e + 0.12 * kick))); ctx.fillRect(0, 0, w, h);
          // edges: dark and still when calm, the mood's colour breathing faster as the energy climbs, pushed in on the beat
          const breath = 0.5 + 0.5 * Math.sin(now * (0.8 + 5 * e) * Math.PI);
          const r = Math.hypot(w, h) / 2;
          const g = ctx.createRadialGradient(w / 2, h / 2, r * Math.max(0.1, 0.55 - 0.2 * e - 0.15 * kick), w / 2, h / 2, r);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(1, e < 0.3 && kick < 0.3
            ? `rgba(5,5,20,${Math.min(0.9, sm * (0.75 * (1 - e / 0.3) + 0.3))})`
            : col(Math.min(0.95, sm * (0.35 + 0.45 * e * (0.6 + 0.4 * breath) + 0.35 * kick)), 5 * kick));
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          // a wash on each pick, stronger when wild
          const last = flashes[flashes.length - 1];
          if (last && now - last.at < 0.3) { ctx.fillStyle = col(Math.min(0.6, sm * (0.12 + 0.25 * e) * last.level * (1 - (now - last.at) / 0.3)), 20); ctx.fillRect(0, 0, w, h); }
          // landing on the home note: a soft light that settles
          if (last && last.midi !== null && keyTonic !== null && ((last.midi - keyTonic) % 12 + 12) % 12 === 0 && now - last.at < 0.8) {
            ctx.fillStyle = `rgba(255,250,235,${Math.min(0.5, 0.18 * sm * (1 - (now - last.at) / 0.8))})`; ctx.fillRect(0, 0, w, h);
          }
        }
        if (on.has("heat") && grid && handFret !== null) {
          // the fretboard lit from the nut to the hand, hotter the higher up it is; on the beat it flares and runs past the hand
          const sh = strength.heat, kick = beat.beat * follows.heat;
          const to = Math.max(1, handFret + 0.5 + 2.5 * kick), heat = Math.min(1, to / 14);
          const flicker = 0.85 + 0.15 * Math.sin(now * (6 + 20 * e));
          const mm = pxPerMm(grid), n = across(grid);
          // the markers sit on the fretboard's near edge: its middle is half a board's width over, on the hand's side
          const edge = (f: number) => { const p = wireAt(grid!, f), d = neckSide * (neckWidthMm(f) / 2) * mm; return { x: p.x + n.x * d, y: p.y + n.y * d }; };
          const halfAt = (f: number) => (neckWidthMm(f) / 2) * mm * (0.9 + 0.25 * kick);
          const a = edge(0), b = edge(to), ha = halfAt(0), hb = halfAt(to);
          const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          g.addColorStop(0, col(0));
          g.addColorStop(0.6, col(Math.min(1, sh * (0.12 + 0.3 * heat) * flicker * (1 + kick)), 15 * heat));
          g.addColorStop(1, col(Math.min(1, sh * (0.25 + 0.5 * heat) * flicker * (1 + 1.2 * kick)), 25 * heat + 20 * kick));
          ctx.save();
          ctx.shadowColor = col(Math.min(1, 0.8 * sh), 10); ctx.shadowBlur = Math.min(hb * 1.2, (8 + 25 * Math.max(heat, e) + 40 * kick) * sh);
          ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(a.x + n.x * ha, a.y + n.y * ha); ctx.lineTo(b.x + n.x * hb, b.y + n.y * hb);
          ctx.lineTo(b.x - n.x * hb, b.y - n.y * hb); ctx.lineTo(a.x - n.x * ha, a.y - n.y * ha);
          ctx.closePath(); ctx.fill();
          // a hot spot under the hand that pops on the beat
          const spot = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, hb * (1.2 + kick));
          spot.addColorStop(0, col(Math.min(1, sh * (0.3 + 0.6 * kick)), 30));
          spot.addColorStop(1, col(0));
          ctx.shadowBlur = 0; ctx.fillStyle = spot;
          ctx.beginPath(); ctx.arc(b.x, b.y, hb * (1.2 + kick), 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        if (on.has("sparks")) {
          // embers rise off the picture when the energy is high
          const scale = w / 1280;
          if (e > 0.5 && sparks.length < MAX_SPARKS) for (let i = Math.floor((e - 0.5) * 80 * strength.sparks * dt + Math.random()); i > 0; i--) {
            sparks.push({ x: Math.random() * w, y: h + 10, vx: (Math.random() - 0.5) * 40 * scale, vy: -(60 + Math.random() * 160 * e) * scale, age: 0, life: 1.5 + Math.random() * 2, hue: mc.hue + (Math.random() - 0.5) * 40, size: (1.5 + Math.random() * 3) * scale });
          }
          // calm sparks fall, wild ones float up
          const gravity = 260 * (1 - 1.6 * e) * scale;
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          for (let i = sparks.length - 1; i >= 0; i--) {
            const p = sparks[i];
            p.age += dt;
            if (p.age > p.life) { sparks.splice(i, 1); continue; }
            p.vx *= Math.exp(-1.5 * dt); p.vy = p.vy * Math.exp(-1.5 * dt) + gravity * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            const fade = 1 - p.age / p.life;
            ctx.fillStyle = `hsla(${p.hue} 100% ${60 + 30 * fade}% / ${fade})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + fade), 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        } else sparks.length = 0;
        if (on.has("markers")) {
          ctx.lineWidth = 3; ctx.font = "bold 22px sans-serif";
          ctx.strokeStyle = "#34d399"; ctx.fillStyle = "#34d399";
          for (const m of found) {
            ctx.beginPath();
            m.corners.forEach((p, i) => (i ? ctx.lineTo(p.x / k, p.y / k) : ctx.moveTo(p.x / k, p.y / k)));
            ctx.closePath(); ctx.stroke();
            ctx.fillText(String(m.id), m.corners[0].x / k, m.corners[0].y / k - 6);
          }
          ctx.fillStyle = "#fbbf24";
          for (const lm of landmarks) {
            for (const p of lm) ctx.fillRect(p.x * w - 2, p.y * h - 2, 4, 4);
            for (const t of TIPS) { ctx.beginPath(); ctx.arc(lm[t].x * w, lm[t].y * h, 7, 0, Math.PI * 2); ctx.fill(); }
          }
        }
        if (on.has("frets") && grid) {
          const n = across(grid);
          ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.fillStyle = "white"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
          for (let f = 0; f <= 22; f++) {
            const p = wireAt(grid, f);
            if (p.x < -w || p.x > 2 * w || p.y < -h || p.y > 2 * h) continue;
            ctx.lineWidth = f === 0 ? 5 : 2;
            ctx.beginPath(); ctx.moveTo(p.x + n.x * half, p.y + n.y * half); ctx.lineTo(p.x - n.x * half, p.y - n.y * half); ctx.stroke();
          }
          for (const f of DOTS) { const p = spaceAt(grid, f); ctx.fillText(String(f), p.x + n.x * (half + 16), p.y + n.y * (half + 16) + 6); }
          ctx.textAlign = "start";
        }
        if (on.has("glow") && grid) {
          const tips = frettingTips(grid, handsSeen);
          if (tips) {
            const at = [...tips.frets].sort((a, b) => a - b)[Math.floor(tips.frets.length / 2)];
            const space = Math.max(1, Math.ceil(at));
            ctx.save(); ctx.shadowColor = `hsl(${hue} 90% 60%)`; ctx.shadowBlur = 30; ctx.fillStyle = `hsla(${hue} 90% 60% / 0.35)`;
            band(grid, space - 1, space); ctx.fill(); ctx.restore();
          }
        }
        if (on.has("trails")) {
          ctx.lineCap = "round";
          for (const trail of trails) for (let i = 1; i < trail.length; i++) {
            ctx.strokeStyle = `hsla(${hue} 95% 65% / ${i / trail.length})`; ctx.lineWidth = 2 + 8 * (i / trail.length);
            ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
          }
        }
        for (const f of flashes) {
          const age = now - f.at;
          const fHue = f.midi === null ? hue : noteHue(f.midi);
          if (on.has("flash") && age < FLASH && f.midi !== null) {
            const fade = 1 - age / FLASH;
            ctx.save(); ctx.shadowColor = `hsl(${fHue} 95% 60%)`; ctx.shadowBlur = 40; ctx.fillStyle = `hsla(${fHue} 95% 60% / ${0.6 * fade})`;
            if (grid && f.space) { band(grid, f.space - 1, f.space); ctx.fill(); }
            ctx.restore();
            // above its fret space, else above the hand, else at the top of the picture
            const p = grid && f.space ? spaceAt(grid, f.space) : f.hand;
            const at = p ? { x: p.x, y: Math.max(48, p.y - half - 12) } : { x: w / 2, y: 60 };
            ctx.fillStyle = `hsla(${fHue} 100% 85% / ${fade})`; ctx.font = "bold 40px sans-serif"; ctx.textAlign = "center";
            ctx.fillText(noteName(f.midi), at.x, at.y); ctx.textAlign = "start";
          }
          if (on.has("pulse") && age < PULSE && f.hand) {
            const r = 20 + (60 + 160 * f.level) * (age / PULSE);
            ctx.strokeStyle = `hsla(${fHue} 95% 65% / ${1 - age / PULSE})`; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(f.hand.x, f.hand.y, r, 0, Math.PI * 2); ctx.stroke();
          }
        }
      };
      id = requestAnimationFrame(frame);
    }).catch((e: unknown) => {
      if (!gone) setProblem(`The neck reader didn't load: ${e instanceof Error ? e.message : String(e)}. Check the connection, then turn Read the neck off and on.`);
    });
    return () => {
      gone = true; cancelAnimationFrame(id);
      video.style.filter = ""; video.style.transform = "";
      if (drawn) drawn.style.transform = "";
      drawn?.getContext("2d")?.clearRect(0, 0, drawn.width, drawn.height);
    };
  }, [video]);

  return (
    <>
      <canvas ref={canvas} className={`pointer-events-none absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} />
      {!bare && <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-1.5 text-xs text-slate-300">{problem || [status, heard && `Heard: ${heard}`, deaf].filter(Boolean).join(" · ")}</span>}
    </>
  );
}
