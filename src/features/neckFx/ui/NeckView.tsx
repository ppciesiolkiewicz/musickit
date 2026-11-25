"use client";

import { useEffect, useRef, useState } from "react";
import { SCALE_MM, distOf, gridOf, parsePlaced, placeByHand, type Grid, type NeckRead, type Pt } from "../model/grid";
import {
  FILTER_CSS, across, coveredNow, easeGrid, filtersOn, MARKER_MM, acrossPxPerMm, frettingTips, grow, hexHue, neckWidthMm, noteHue, noteName, parseButtons, pxPerMm,
  ringColour, spaceAt, wireAt, type Filter, type FxSettings,
} from "../model/fx";
import { CALM, QUIET, easeMood, keyOf, moodColour, moodFilter, moodTarget, stepBeat, type Beat, type Heard, type Mood } from "../model/mood";
import { listenForPicks, type Pick } from "../client/listen";
import { loadHands } from "../client/hands";

/** Marker detection runs on a frame this wide, for speed. */
const DETECT_WIDTH = 640;
const TIPS = [4, 8, 12, 16, 20];
const DOTS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
/** How long a grid is kept once its markers are gone, and how long a flash and a pulse last (s). */
const KEEP_GRID = 0.5, FLASH = 0.6, PULSE = 0.5, TRAIL = 14;
/** How long notes are kept for the mood (s), the most sparks at once, and how fast a beat bump settles (per s). */
const KEEP_HEARD = 8, MAX_SPARKS = 700, MAX_FLAMES = 300, BUMP_DECAY = 10;
/** How long a marker stays painted out after it was last seen (s): detection drops a frame now and then. */
const KEEP_PATCH = 0.4;
/** Effects that need the picks heard live. */
const HEARING = new Set(["flash", "pulse", "mood", "heat", "sparks", "bump"]);
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; hue: number; size: number; spin?: number };

type Marker = { id: number; corners: { x: number; y: number }[] };
type Detector = { detect: (img: ImageData) => Marker[] };

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
    // the Mood light's edge ring, drawn small and scaled up
    const edgeCv = document.createElement("canvas");
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
    // each marker seen lately, painted out in the colour around it (Hide markers)
    // licks of flame flying off Neck heat
    const flames: Spark[] = [];
    const patches = new Map<number, { corners: Pt[]; rgb: [number, number, number]; at: number }>();
    let bump = 0, beat: Beat = QUIET, pickedNow = 0;
    // which side of the markers' line the neck is on: the side the fretting hand is (+1 or −1), kept once seen
    let neckSide = 1;
    // how many frame units a mm is across the neck, from the markers' size on screen, and how far in from the board's near
    // edge their middles are (mm): eased over frames
    let crossMm: number | null = null, insetMm = 10;
    // the beat as the flames feel it: rising quickly and sinking slowly, so they swell and settle instead of snapping
    const flare = { heat: 0, glow: 0 };
    const easeFlare = (from: number, to: number, dt: number) => from + (to - from) * (1 - Math.exp(-(to > from ? 14 : 3) * dt));
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
          const img = sctx.getImageData(0, 0, scratch.width, scratch.height);
          found = markers.detect(img);
          if (fxNow.effects.includes("hide")) for (const m of found) {
            const rgb = ringColour(img.data, img.width, img.height, m.corners);
            if (rgb) patches.set(m.id, { corners: grow(m.corners.map((p) => ({ x: p.x / k, y: p.y / k })), 1.3), rgb, at: now });
          }
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
          if (grid && found.length) {
            const placed = parsePlaced(fxNow.markers);
            const mmOf = (id: number) => placed.find((p) => p.id === id)?.mm ?? MARKER_MM.get(id);
            const seen = found.map((m) => ({ id: m.id, corners: m.corners.map((p) => ({ x: p.x / k, y: p.y / k })) }));
            const fresh = acrossPxPerMm(seen, across(grid), mmOf);
            if (fresh) crossMm = crossMm === null ? fresh : crossMm + (fresh - crossMm) * 0.2;
            // fret markers sit just inside the board's near edge
            const onBoard = placed.filter((p) => p.fret > 0 && found.some((m) => m.id === p.id)).map((p) => mmOf(p.id)).filter((v): v is number => !!v);
            if (onBoard.length) insetMm = onBoard.reduce((t, v) => t + v, 0) / onBoard.length / 2 + 1;
          }
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
        const videoFilter = [...(on.has("mood") ? [moodFilter(mood, strength.mood, beat.beat * follows.mood)] : []), ...filters.map((f) => FILTER_CSS[f])].join(" ");
        video.style.filter = videoFilter;
        bump *= Math.exp(-BUMP_DECAY * dt);
        // a tense note shakes the picture a little while it lasts
        const shake = mood.tension > 0.5 ? (mood.tension - 0.5) * (2 + 8 * e) * strength.bump : 0;
        const zoom = on.has("bump") && (bump > 0.0005 || shake > 0.2)
          ? `scale(${(1 + bump).toFixed(4)}) translate(${((Math.random() - 0.5) * shake).toFixed(1)}px, ${((Math.random() - 0.5) * shake).toFixed(1)}px)` : "";
        video.style.transform = zoom; c.style.transform = zoom;

        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);
        for (const [id, p] of patches) if (now - p.at > KEEP_PATCH) patches.delete(id);
        if (on.has("hide")) {
          // under everything else, and graded like the video so the patch matches it
          ctx.save(); ctx.filter = videoFilter || "none";
          for (const p of patches.values()) {
            const colour = `rgb(${p.rgb.join(" ")})`, size = Math.hypot(p.corners[1].x - p.corners[0].x, p.corners[1].y - p.corners[0].y);
            ctx.fillStyle = colour; ctx.shadowColor = colour; ctx.shadowBlur = size * 0.35;
            ctx.beginPath();
            p.corners.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
            ctx.closePath(); ctx.fill(); ctx.fill();
          }
          ctx.restore();
        } else patches.clear();
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

        // an effect's colour: the one picked for it, at the mood's lightness, or the mood's
        const colourOf = (picked: string | null) => { const p = picked ? hexHue(picked) : null; return p ? { ...mc, ...p } : mc; };
        if (on.has("mood")) {
          const mc = colourOf(fxNow.colour.mood);
          const col = (a: number, dl = 0) => `hsla(${mc.hue} ${mc.sat}% ${Math.min(95, mc.light + dl)}% / ${a})`;
          const sm = strength.mood, kick = beat.beat * follows.mood, r = Math.hypot(w, h) / 2;
          // lights drifting over the picture in the mood's colour and its neighbours, faster and bigger as the energy climbs,
          // swelling on the beat; a tense note brings in a light across the colour wheel
          const spread = 30 + 25 * e;
          const lights = [-spread, 0, spread, ...(mood.tension > 0.3 ? [150] : [])];
          lights.forEach((dh, i) => {
            const sp = (0.12 + 0.45 * e) * (1 + 0.35 * i), ph = i * 2.1;
            const x = w * (0.5 + 0.42 * Math.sin(now * sp + ph)), y = h * (0.5 + 0.38 * Math.cos(now * sp * 1.3 + ph * 1.7));
            const rad = r * (0.35 + 0.2 * e + 0.25 * kick);
            const a = Math.min(0.7, sm * (0.1 + 0.2 * e + 0.25 * kick) * (dh === 150 ? mood.tension : 1));
            const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
            g.addColorStop(0, `hsla(${(mc.hue + dh + 360) % 360} ${mc.sat}% ${mc.light + 5}% / ${a})`);
            g.addColorStop(1, `hsla(${(mc.hue + dh + 360) % 360} ${mc.sat}% ${mc.light}% / 0)`);
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          });
          // the last note's colour glows from the hand and fades
          const struck = [...flashes].reverse().find((f) => f.midi !== null);
          if (struck && struck.midi !== null) {
            const age = now - struck.at, at = struck.hand ?? { x: w / 2, y: h / 2 };
            if (age < 1.2) {
              const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r * (0.3 + 0.3 * kick));
              g.addColorStop(0, `hsla(${noteHue(struck.midi)} 95% 60% / ${Math.min(0.6, sm * 0.35 * (1 - age / 1.2) * (0.5 + struck.level))})`);
              g.addColorStop(1, `hsla(${noteHue(struck.midi)} 95% 60% / 0)`);
              ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            }
          }
          // edges: dark when calm; else a ring of the mood's colours turning round the picture, faster as the energy
          // climbs, pushed in on the beat
          const ew = Math.max(1, Math.round(w / 4)), eh = Math.max(1, Math.round(h / 4));
          if (edgeCv.width !== ew || edgeCv.height !== eh) { edgeCv.width = ew; edgeCv.height = eh; }
          const ec = edgeCv.getContext("2d")!;
          ec.globalCompositeOperation = "source-over"; ec.clearRect(0, 0, ew, eh);
          const calm = e < 0.3 && kick < 0.3;
          if (calm) { ec.fillStyle = `rgba(5,5,20,${Math.min(0.9, sm * (0.75 * (1 - e / 0.3) + 0.3))})`; ec.fillRect(0, 0, ew, eh); }
          else {
            const ring = ec.createConicGradient(now * (0.2 + 1.5 * e), ew / 2, eh / 2);
            const ea = Math.min(0.95, sm * (0.4 + 0.45 * e + 0.35 * kick));
            [0, spread, 0, -spread, 0].forEach((dh, i, all) => ring.addColorStop(i / (all.length - 1), `hsla(${(mc.hue + dh + 360) % 360} ${mc.sat}% ${Math.min(90, mc.light + 5 * kick)}% / ${ea})`));
            ec.fillStyle = ring; ec.fillRect(0, 0, ew, eh);
          }
          // cut the middle out: clear in the centre, the ring only at the edges
          const er = Math.hypot(ew, eh) / 2;
          const hole = ec.createRadialGradient(ew / 2, eh / 2, 0, ew / 2, eh / 2, er);
          hole.addColorStop(0, "rgba(0,0,0,1)");
          hole.addColorStop(Math.max(0.1, 0.55 - 0.2 * e - 0.15 * kick), "rgba(0,0,0,1)");
          hole.addColorStop(1, "rgba(0,0,0,0)");
          ec.globalCompositeOperation = "destination-out"; ec.fillStyle = hole; ec.fillRect(0, 0, ew, eh);
          ctx.drawImage(edgeCv, 0, 0, w, h);
          const breath = 0.5 + 0.5 * Math.sin(now * (0.8 + 5 * e) * Math.PI);
          if (!calm) { ctx.globalAlpha = 0.25 * breath * sm; ctx.drawImage(edgeCv, 0, 0, w, h); ctx.globalAlpha = 1; }
          // a wash on each pick, stronger when wild
          const last = flashes[flashes.length - 1];
          if (last && now - last.at < 0.3) {
            const wa = Math.min(0.6, sm * (0.12 + 0.25 * e + 0.15 * kick) * last.level * (1 - (now - last.at) / 0.3));
            ctx.fillStyle = last.midi === null ? col(wa, 20) : `hsla(${noteHue(last.midi)} 90% 70% / ${wa})`; ctx.fillRect(0, 0, w, h);
          }
          // landing on the home note: a soft light that settles
          if (last && last.midi !== null && keyTonic !== null && ((last.midi - keyTonic) % 12 + 12) % 12 === 0 && now - last.at < 0.8) {
            ctx.fillStyle = `rgba(255,250,235,${Math.min(0.5, 0.18 * sm * (1 - (now - last.at) / 0.8))})`; ctx.fillRect(0, 0, w, h);
          }
        }
        // flames off both edges of the fretboard between two frets, the board itself left clear: a wide glow, then tongues
        // hotter and paler toward the board; `swell` makes them taller toward `to`, `size` is their height in mm, `gap` how far
        // out from the board's edge they start (mm), `rest` how big they are between beats (1 = full), `soft` how see-through and
        // how few licks (1 = full); licks break off, a burst on each beat
        const burn = (g: Grid, from: number, to: number, c: { hue: number; sat: number; light: number }, size: number, swell: boolean, kick: number, heat: number, strong: number, gap = 0, rest = 1, soft = 1) => {
          // mm along the neck sizes the flames; mm across it (often shorter: the board is seen at a slant) places the board
          const mm = pxPerMm(g), cross = crossMm ?? mm, n = across(g);
          // the markers sit just inside the board's near edge, so its middle is half a board's width on from there, on the
          // fretting hand's side
          const edgeAt = (f: number, side: number, out: number) => {
            const p = wireAt(g, f), d = neckSide * (neckWidthMm(f) / 2 - insetMm) * cross + side * ((neckWidthMm(f) / 2) * cross + gap * mm + out);
            return { x: p.x + n.x * d, y: p.y + n.y * d };
          };
          const span = Math.max(0.01, to - from);
          // a flame's height (px) at fret f: slow waves rolling along the neck toward the bridge, tapering at both ends
          const tongue = (f: number, side: number) => {
            const u = (distOf(f) * SCALE_MM) / 12 + side * 3.7, t = now;
            const flick = 0.6 + 0.25 * Math.sin(u * 0.55 - t * 2.2) + 0.13 * Math.sin(u * 1.3 - t * 3.4 + side) + 0.06 * Math.sin(u * 2.9 - t * 5.5);
            const along = (f - from) / span, ends = Math.min(1, along * (swell ? 4 : 3)) * Math.min(1, (1 - along) * (swell ? 6 : 3) + (swell ? 0.15 : 0));
            return Math.max(0, flick) * ends * (swell ? 0.5 + 0.5 * along : 1) * size * strong * (rest + 2.5 * kick) * mm;
          };
          const STEPS = Math.max(12, Math.round(span * 6));
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          ctx.shadowBlur = Math.min(60, (10 + 30 * kick) * strong * soft);
          for (const [reach, alpha, lift, hueShift] of [[rest < 1 ? 2.8 : 2.2, 0.14, -10, -15], [1, 0.5, 0, 0], [0.6, 0.55, 18, 25], [0.28, 0.7, 35, 45]] as const) {
            const col = `hsla(${(c.hue + hueShift * (c.hue > 180 ? -1 : 1) + 360) % 360} ${c.sat}% ${Math.min(92, c.light + lift + 10 * kick)}% / ${Math.min(1, soft * alpha * (0.6 + 0.4 * heat) * Math.min(1.6, rest + 1.2 * kick))})`;
            ctx.fillStyle = col; ctx.shadowColor = col;
            for (const side of [1, -1]) {
              ctx.beginPath();
              for (let i = 0; i <= STEPS; i++) { const p = edgeAt(from + (span * i) / STEPS, side, 0); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
              // the tips sway along the neck, so the flames lean and flow
              const tips = Array.from({ length: STEPS + 1 }, (_, j) => {
                const i = STEPS - j, f = from + (span * i) / STEPS, h = tongue(f, side) * reach, p = edgeAt(f, side, h);
                const lean = h * 0.45 * Math.sin(now * 0.9 + (distOf(f) * SCALE_MM) / 40 + side);
                return { x: p.x + g.dir.x * lean, y: p.y + g.dir.y * lean };
              });
              // a smooth curve through the tips
              for (let j = 0; j < tips.length - 1; j++) {
                const m = { x: (tips[j].x + tips[j + 1].x) / 2, y: (tips[j].y + tips[j + 1].y) / 2 };
                if (j === 0) ctx.lineTo(tips[0].x, tips[0].y);
                ctx.quadraticCurveTo(tips[j].x, tips[j].y, m.x, m.y);
              }
              ctx.lineTo(tips[tips.length - 1].x, tips[tips.length - 1].y);
              ctx.closePath(); ctx.fill();
            }
          }
          ctx.restore();
          const rate = (15 + 60 * heat) * strong * soft * (rest + 6 * kick) * Math.min(1, span / 4);
          for (let i = Math.floor(rate * dt + Math.random()); i > 0 && flames.length < MAX_FLAMES; i--) {
            const f = from + span * (swell ? Math.sqrt(Math.random()) : Math.random()), side = Math.random() < 0.5 ? 1 : -1;
            const p = edgeAt(f, side, tongue(f, side) * 0.5), v = (20 + Math.random() * 60) * (1 + 1.2 * kick) * mm, drift = (Math.random() * 30 + 10) * mm;
            flames.push({ x: p.x, y: p.y, vx: n.x * side * v + g.dir.x * drift, vy: n.y * side * v + g.dir.y * drift, age: 0, life: 0.6 + Math.random() * 0.7, size: (3 + Math.random() * 5) * (1 + kick) * mm, hue: c.hue, spin: (Math.random() - 0.5) * 4 });
          }
        };
        if (on.has("heat") && grid && handFret !== null) {
          // from the nut to the hand, a little way out from the board, taller toward the hand and the higher up it is: low
          // between beats and leaping on each one, running a couple of frets past the hand (with Beat at 0%, full all the time)
          flare.heat = easeFlare(flare.heat, beat.beat * follows.heat, dt);
          const kick = flare.heat, to = Math.max(1, handFret + 0.5 + 2.5 * kick), heat = Math.min(1, to / 14);
          const rest = 1 - 0.75 * Math.min(1, follows.heat);
          burn(grid, 0, to, colourOf(fxNow.colour.heat), 11 + 24 * heat, true, kick, heat, strength.heat, 8, rest, 0.5);
        }
        if (on.has("glow") && grid) {
          // round the frets under the fingertips, in the last note's colour
          const tips = frettingTips(grid, handsSeen);
          if (tips) {
            flare.glow = easeFlare(flare.glow, beat.beat * follows.glow, dt);
            const kick = flare.glow, lo = Math.min(...tips.frets), hi = Math.max(...tips.frets);
            const picked = fxNow.colour.glow ? hexHue(fxNow.colour.glow) : null;
            const c = picked ? { ...mc, ...picked } : lastNote === null ? mc : { hue: noteHue(lastNote), sat: 90, light: 58 };
            burn(grid, Math.max(0, lo - 0.6 - 0.5 * kick), hi + 0.6 + 0.5 * kick, c, 14, false, kick, Math.max(0.5, e), strength.glow);
          }
        }
        if (flames.length) {
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          for (let i = flames.length - 1; i >= 0; i--) {
            const p = flames[i];
            p.age += dt;
            if (p.age > p.life || !on.has("heat")) { flames.splice(i, 1); continue; }
            // a lick curls as it drifts and slows
            if (p.spin) { const a = p.spin * dt, cs = Math.cos(a), sn = Math.sin(a); [p.vx, p.vy] = [p.vx * cs - p.vy * sn, p.vx * sn + p.vy * cs]; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-1.2 * dt); p.vy *= Math.exp(-1.2 * dt);
            const fade = 1 - p.age / p.life;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (0.6 + fade));
            g.addColorStop(0, `hsla(${p.hue} 100% ${55 + 35 * fade}% / ${0.8 * fade})`);
            g.addColorStop(1, `hsla(${p.hue} 100% 50% / 0)`);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + fade), 0, Math.PI * 2); ctx.fill();
          }
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
