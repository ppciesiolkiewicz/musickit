"use client";

import { useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { boardMarkers, guessPlace, midiAt, onWire, placeOnNeck, spotOf, type BoardMarker, type Neck } from "../model/cvFrets";
import { PULSE_S, STRING_WORDS, chordOf, flicker, heatAt, numbered, pulsesAt, type CvSettings, type TakeNote } from "../model/cvFx";
import { MARKER_MM, OFF_BOARD, noteHue, noteName } from "../model/fx";
import { parsePlaced, type Pt } from "../model/grid";
import { loadCvReader, type CvReader } from "../client/cv";
import { loadHands } from "../client/hands";
import { listenForPicks } from "../client/listen";

/** How long the neck stays once the markers are gone (s), and how far toward a new read it moves each read. */
const KEEP = 0.5, EASE = 0.45;
/** Frames are read at most this long on their long side: the reader is tuned in px for a 1280 × 720 camera, and a bigger one
 * (Continuity Camera sends 1920 wide whatever is asked) would put the board's far edge outside the strip and read slower. */
const READ_SIDE = 1280;
/** The fingertips (not the thumb), as MediaPipe numbers a hand's points. */
const TIPS = [8, 12, 16, 20];
/** How long a heard note lights its place and shakes its string (s); the most embers in the air. */
const RING = 1.6, MAX_EMBERS = 400;

type Place = { string: number; fret: number };
type Heard = Place & { midi: number; level: number; at: number };
/** A note Pick pulse draws: how long since it was played (s) and whether it still sounds. */
type Pulse = Place & { midi: number; level: number; age: number; held: boolean };
/** Live, a heard note counts as sounding this long (s): picks and strums heard this close together make a chord. */
const LIVE_HOLD = 0.6;
type Ember = { x: number; y: number; vx: number; vy: number; age: number; life: number; hue: number; size: number };
/** A wisp of flame drifting along an edge toward the body: where along (fret position) and which edge, how old. */
type Wisp = { edge: 0 | 1; fr: number; age: number; life: number; ph: number };

const ease = (a: Pt, b: Pt) => ({ x: a.x + (b.x - a.x) * EASE, y: a.y + (b.y - a.y) * EASE });
function easeNeck(prev: Neck | null, next: Neck): Neck {
  if (!prev || prev.wires.length !== next.wires.length || prev.strings.length !== next.strings.length) return next;
  return {
    wires: next.wires.map((w, i) => ({ top: ease(prev.wires[i].top, w.top), bottom: ease(prev.wires[i].bottom, w.bottom) })),
    strings: next.strings.map((s, i) => ({ a: ease(prev.strings[i].a, s.a), b: ease(prev.strings[i].b, s.b) })),
  };
}
const unit = (a: Pt, b: Pt) => { const l = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }; };
const lerp = (a: Pt, b: Pt, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** A flame tongue, white at its root to clear at its tip, in a colour: drawn once per hue and kept. */
const tongues = new Map<number, HTMLCanvasElement>();
function tongue(hue: number): HTMLCanvasElement {
  const key = Math.round(hue / 10) * 10;
  let c = tongues.get(key);
  if (c) return c;
  c = document.createElement("canvas"); c.width = 32; c.height = 96;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(16, 84, 1, 16, 70, 64);
  g.addColorStop(0, `hsla(${key + 25} 100% 92% / 1)`);
  g.addColorStop(0.25, `hsla(${key + 10} 100% 62% / 0.85)`);
  g.addColorStop(0.6, `hsla(${key} 100% 45% / 0.35)`);
  g.addColorStop(1, `hsla(${key - 10} 100% 30% / 0)`);
  x.fillStyle = g;
  // a teardrop: round at the root, drawn up to a point
  x.beginPath(); x.moveTo(16, 0); x.bezierCurveTo(30, 40, 32, 72, 16, 94); x.bezierCurveTo(0, 72, 2, 40, 16, 0); x.fill();
  tongues.set(key, c);
  return c;
}

/**
 * Over a video (the live camera or a take), the OpenCV reader: the fret markers it finds, each fret wire across the board,
 * and what `cv` ticks: fret numbers above and below the board, the strings, the note under each fingertip (MediaPipe's hand
 * model), Neck fire, and Pick pulse: a ring from each note's place as it is played (a take: on its riff's string and fret, on
 * the video's clock, so it holds through a seek and an export), its name while it sounds, and the chord the notes sounding make. A note heard (live: from `video`'s stream; a take: `notes` at their times) is placed by the fingers
 * and lights its spot and string. Markers come from `markers` (each one's size from Markers or the A3 layout).
 */
export default function NeckCvView({ video, markers, cv, live = false, notes, fit = "contain", bare = false }: {
  video: HTMLVideoElement | null;
  /** "id@fret, …" (the Markers setting) */
  markers: string;
  cv: CvSettings;
  /** the video is the live camera: notes are heard in its stream's sound */
  live?: boolean;
  /** a take's notes, at their times in the video, with their string and fret when the riff has them */
  notes?: TakeNote[];
  fit?: "contain" | "cover";
  /** no status line: the take is being exported with the drawing in it */
  bare?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const placed = useRef<BoardMarker[]>([]);
  useEffect(() => {
    const list = parsePlaced(markers);
    placed.current = boardMarkers(list, (id) => list.find((p) => p.id === id)?.mm ?? MARKER_MM.get(id), OFF_BOARD);
  }, [markers]);
  const settings = useRef(cv);
  useEffect(() => { settings.current = cv; }, [cv]);
  const timed = useRef(notes);
  useEffect(() => { timed.current = notes; }, [notes]);
  const picks = useRef<{ midi: number | null; level: number }[]>([]);
  const [status, setStatus] = useState("Loading OpenCV…");
  const [problem, setProblem] = useState("");
  const [heardWords, setHeardWords] = useState("");
  const [deaf, setDeaf] = useState("");
  const [chordWords, setChordWords] = useState("");

  // live: the notes picked, heard in the camera's sound
  const listens = live && (cv.notes || cv.fire || cv.pulse);
  useEffect(() => {
    if (!listens || !video) return;
    let stop: (() => void) | null = null, gone = false;
    const start = () => {
      const stream = video.srcObject;
      if (stop || gone || !(stream instanceof MediaStream)) return;
      stop = () => undefined;
      listenForPicks(stream, (p) => { picks.current.push(p); })
        .then((s) => { if (gone) s(); else stop = s; })
        .catch((e: unknown) => { if (!gone) setDeaf(`Notes aren't heard: ${e instanceof Error ? e.message : String(e)}.`); });
    };
    start();
    video.addEventListener("loadedmetadata", start);
    return () => { gone = true; video.removeEventListener("loadedmetadata", start); stop?.(); setDeaf(""); };
  }, [listens, video]);

  useEffect(() => {
    if (!video) return;
    let gone = false, id = 0, lastTime = -1, reader: CvReader | null = null, hand: HandLandmarker | null = null, handLoading = false;
    const drawn = canvas.current;
    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d", { willReadFrequently: true })!;
    // all in read units (the frame scaled to READ_SIDE): drawn scaled up by 1 / k
    let k = 1;
    let seen: { corners: Pt[]; followed: boolean }[] = [];
    let neck: Neck | null = null, neckAt = -Infinity;
    let fingers: (Place & { at: Pt })[] = [], handFret: number | null = null;
    const heard: Heard[] = [];
    const embers: Ember[] = [];
    const wisps: Wisp[] = [];
    let energy = 0, lastNow = -1;
    // the chord on screen: its name and colour, where, when it came and when it stopped sounding
    let shownChord = "";
    let chord: { name: string; hue: number; at: Pt; from: number; until: number } | null = null;

    void loadCvReader().then((r) => {
      if (gone) { r.close(); return; }
      reader = r;
      setStatus("Play the take to read it.");
      const frame = () => {
        if (gone) return;
        id = requestAnimationFrame(frame);
        const c = canvas.current;
        if (!c || !video.videoWidth) return;
        const w = video.videoWidth, h = video.videoHeight;
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        const now = performance.now() / 1000, dt = lastNow < 0 ? 0 : Math.min(0.1, now - lastNow);
        lastNow = now;
        const set = settings.current;
        const wantHands = set.notes || set.fire || set.pulse;
        if (wantHands && !hand && !handLoading) {
          handLoading = true;
          loadHands().then((m) => { hand = m; }).catch(() => setDeaf("The hand model didn't load: notes under fingers are off.")).finally(() => { handLoading = false; });
        }

        if (video.currentTime !== lastTime) {
          const before = lastTime;
          lastTime = video.currentTime;
          k = Math.min(1, READ_SIDE / Math.max(w, h));
          const rw = Math.round(w * k), rh = Math.round(h * k);
          if (scratch.width !== rw || scratch.height !== rh) { scratch.width = rw; scratch.height = rh; }
          sctx.drawImage(video, 0, 0, rw, rh);
          const read = r.read(sctx.getImageData(0, 0, rw, rh), placed.current);
          seen = read.markers.map((m) => ({ corners: m.corners, followed: read.followed.includes(m.id) }));
          if (read.neck) { neck = easeNeck(neck, read.neck); neckAt = now; }
          else if (now - neckAt > KEEP) neck = null;

          // the fingertips on the board: the hand with most of them is the fretting hand
          fingers = []; handFret = null;
          if (wantHands && hand && neck) {
            const n = neck;
            const hands = hand.detectForVideo(video, performance.now()).landmarks.map((lm) =>
              TIPS.flatMap((t) => { const at = { x: lm[t].x * rw, y: lm[t].y * rh }, p = placeOnNeck(n, at); return p ? [{ ...p, at }] : []; }));
            fingers = hands.sort((a, b) => b.length - a.length)[0] ?? [];
            if (fingers.length) handFret = [...fingers.map((f) => f.fret)].sort((a, b) => a - b)[Math.floor(fingers.length / 2)];
          }

          // notes heard: a take's as the video passes them (not on a seek), live ones from the sound
          const passed = before >= 0 && lastTime > before && lastTime - before < 0.5
            ? (timed.current ?? []).filter((x) => x.start > before && x.start <= lastTime).map((x) => ({ midi: x.midi as number | null, level: 0.7, at: x.string !== undefined && x.fret !== undefined ? { string: x.string, fret: x.fret } : null })) : [];
          for (const p of [...passed, ...picks.current.splice(0).map((x) => ({ ...x, at: null }))]) {
            energy = Math.min(1, energy + 0.12 + 0.25 * p.level);
            if (p.midi === null) continue;
            const place = p.at ?? guessPlace(p.midi, fingers);
            if (!place) continue;
            heard.push({ ...place, midi: p.midi, level: p.level, at: now });
            setHeardWords(`Heard: ${noteName(p.midi)} · ${place.fret ? `${STRING_WORDS[place.string]} string, fret ${place.fret}` : `open ${STRING_WORDS[place.string]} string`}`);
            // a burst of embers from where it was played
            if (set.fire && neck) {
              const at = spotOf(neck, place.string, place.fret), along = unit(neck.strings[place.string].a, neck.strings[place.string].b);
              for (let i = Math.round(14 + 30 * p.level * set.fireStrength); i > 0 && embers.length < MAX_EMBERS; i--) {
                const v = 60 + Math.random() * 260, a = (Math.random() - 0.5) * 1.6;
                embers.push({ x: at.x, y: at.y, vx: (along.x * Math.cos(a) - along.y * Math.sin(a)) * v, vy: (along.y * Math.cos(a) + along.x * Math.sin(a)) * v - 40,
                  age: 0, life: 0.5 + Math.random() * 0.9, hue: noteHue(p.midi) + (Math.random() - 0.5) * 30, size: 1.5 + Math.random() * 2.5 });
              }
            }
          }
          while (heard.length && now - heard[0].at > RING) heard.shift();
          const ids = read.markers.map((m) => m.id).sort((a, b) => a - b);
          setStatus(`OpenCV · ${w} × ${h} · Markers: ${ids.length ? ids.join(", ") : "none"} · ${read.neck ? "Frets found" : ids.length >= 2 ? "No frets: the board's edges weren't found" : "No frets: under two fret markers seen"} · ${Math.round(read.ms)} ms a frame`);
        }
        energy *= Math.exp(-0.5 * dt);

        const ctx = c.getContext("2d")!;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.setTransform(1 / k, 0, 0, 1 / k, 0, 0);
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (const m of seen) {
          ctx.strokeStyle = m.followed ? "rgba(251,146,60,0.8)" : "rgba(232,121,249,0.8)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); m.corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
        }
        // embers fly on with the board out of view
        if (embers.length) {
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          for (let i = embers.length - 1; i >= 0; i--) {
            const e = embers[i];
            e.age += dt;
            if (e.age > e.life) { embers.splice(i, 1); continue; }
            e.vx *= Math.exp(-1.8 * dt); e.vy = e.vy * Math.exp(-1.8 * dt) - 70 * dt;
            e.x += e.vx * dt; e.y += e.vy * dt;
            const fade = 1 - e.age / e.life;
            ctx.fillStyle = `hsla(${e.hue} 100% ${60 + 30 * fade}% / ${fade})`;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.4 + fade), 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
        if (!neck) return;
        const n = neck, W = n.wires;
        const last = heard.at(-1), kick = last ? Math.exp(-3.5 * (now - last.at)) : 0;

        if (set.fire) {
          // flames off both edges, out from the board, hottest round the fretting hand, leaping on each note heard; the note's
          // colour runs through them while it rings. Each tongue has its own height, speed and lean, and they overlap, so the
          // edge burns unevenly; a soft glow runs under them and licks break off where it is hottest.
          const st = set.fireStrength, noteTint = last ? noteHue(last.midi) : 0;
          const STEPS = 3;
          // waves of heat roll along the neck from the nut toward the body
          const wave = (fr: number) => 0.72 + 0.4 * Math.sin(fr * 0.7 - now * 2.4) + 0.12 * Math.sin(fr * 1.9 - now * 4.1);
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          for (const edge of ["top", "bottom"] as const) {
            const other = edge === "top" ? "bottom" : "top";
            // the glow under the flames: a wide soft line along the edge, brighter where hotter
            for (let f = 0; f < W.length - 1; f++) {
              const heat = heatAt(f + 0.5, handFret, energy, kick) * st * wave(f + 0.5);
              const a = W[f][edge], b = W[f + 1][edge], out = unit(W[f][other], a);
              const width = Math.hypot(a.x - W[f][other].x, a.y - W[f][other].y), off = width * 0.12;
              ctx.strokeStyle = `hsla(${22 + 10 * heat} 100% 55% / ${Math.min(0.5, 0.18 * heat)})`;
              ctx.lineWidth = width * (0.18 + 0.2 * heat); ctx.shadowColor = "hsl(20 100% 50%)"; ctx.shadowBlur = 20;
              ctx.beginPath(); ctx.moveTo(a.x + out.x * off, a.y + out.y * off); ctx.lineTo(b.x + out.x * off, b.y + out.y * off); ctx.stroke();
            }
            ctx.shadowBlur = 0;
            for (let f = 0; f < W.length - 1; f++) for (let j = 0; j < STEPS; j++) {
              const t = j / STEPS, fr = f + t, i = f * STEPS + j + (edge === "top" ? 0 : 1000);
              const ph = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
              const p = lerp(W[f][edge], W[f + 1][edge], t), q = lerp(W[f][other], W[f + 1][other], t);
              const out = unit(q, p), toBody = unit(W[f][edge], W[f + 1][edge]);
              const width = Math.hypot(p.x - q.x, p.y - q.y), gapPx = Math.hypot(W[f + 1][edge].x - W[f][edge].x, W[f + 1][edge].y - W[f][edge].y) / STEPS;
              const heat = heatAt(fr, handFret, energy, kick) * st * wave(fr);
              const own = 0.5 + 0.5 * Math.sin(now * (1.6 + 2 * ph) + ph * 40), fl = flicker(fr * 0.9 + ph * 3, now * 0.8);
              const len = width * (0.35 + 0.95 * heat) * (0.45 + 0.8 * own * own) * (0.85 + 0.25 * fl);
              if (len < 2) continue;
              // tips lean toward the body, as if the neck moved through the air, and sway
              const lean = 0.12 + 0.12 * Math.sin(now * 1.3 + ph * 9) + 0.1 * fl;
              const dir = unit({ x: 0, y: 0 }, { x: out.x + toBody.x * lean, y: out.y + toBody.y * lean });
              const root = { x: p.x + out.x * width * 0.08, y: p.y + out.y * width * 0.08 };
              const angle = Math.atan2(dir.y, dir.x) + Math.PI / 2;
              const draw = (hue: number, alpha: number, wScale: number, hScale: number) => {
                ctx.globalAlpha = Math.min(1, alpha);
                ctx.setTransform(1 / k, 0, 0, 1 / k, 0, 0);
                ctx.translate(root.x, root.y); ctx.rotate(angle);
                const tw = Math.max(gapPx * 1.7, 5) * wScale, th = len * hScale, img = tongue(hue), SL = 6, sh = img.height / SL;
                for (let sl = 0; sl < SL; sl++) {
                  const up = (sl + 0.5) / SL, off = tw * 0.9 * up ** 1.5 * Math.sin(now * 4.2 - sl * 0.85 + ph * 6);
                  ctx.drawImage(img, 0, img.height - (sl + 1) * sh, img.width, sh, -tw / 2 + off, -th * (sl + 1) / SL, tw, th / SL + 0.5);
                }
              };
              draw(4, 0.3 + 0.2 * heat, 1.5, 1.25);
              draw(20 + 12 * heat, 0.4 + 0.3 * heat, 1, 1);
              draw(42, 0.35 * heat, 0.55, 0.55);
              if (kick > 0.05) draw(noteTint, kick * 0.85, 1.2, 1.1);
              // a lick breaks off the tip now and then where it is hot
              if (heat > 0.7 && embers.length < MAX_EMBERS && Math.random() < dt * 1.6 * (heat - 0.6)) {
                const tip = { x: root.x + dir.x * len * 0.8, y: root.y + dir.y * len * 0.8 }, v = 30 + 50 * heat;
                embers.push({ x: tip.x, y: tip.y, vx: dir.x * v + toBody.x * 20, vy: dir.y * v + toBody.y * 20, age: 0, life: 0.4 + 0.5 * Math.random(),
                  hue: kick > 0.3 ? noteTint : 25 + 15 * Math.random(), size: 1.5 + 2 * Math.random() });
              }
            }
          }
          // wisps drift along both edges toward the body, rising off the board and fading as they go
          for (let e = 0; e < 2; e++) for (let i = Math.floor(dt * 26 * st + Math.random()); i > 0 && wisps.length < 160; i--)
            wisps.push({ edge: e as 0 | 1, fr: Math.random() * (W.length - 1), age: 0, life: 0.9 + Math.random() * 0.9, ph: Math.random() });
          for (let i = wisps.length - 1; i >= 0; i--) {
            const wp = wisps[i];
            wp.age += dt;
            const heat = heatAt(wp.fr, handFret, energy, kick) * st * wave(wp.fr);
            wp.fr += dt * (1.2 + 2.5 * heat);
            if (wp.age > wp.life || wp.fr >= W.length - 1) { wisps.splice(i, 1); continue; }
            const f = Math.floor(wp.fr), t = wp.fr - f, edge = wp.edge ? "bottom" : "top", other = wp.edge ? "top" : "bottom";
            const p = lerp(W[f][edge], W[f + 1][edge], t), q = lerp(W[f][other], W[f + 1][other], t), out = unit(q, p), toBody = unit(W[f][edge], W[f + 1][edge]);
            const width = Math.hypot(p.x - q.x, p.y - q.y), life = wp.age / wp.life, rise = width * (0.1 + 0.9 * life * (0.5 + heat));
            const sway = width * 0.25 * Math.sin(wp.age * 5 + wp.ph * 9);
            const at = { x: p.x + out.x * rise + toBody.x * sway, y: p.y + out.y * rise + toBody.y * sway };
            const size = width * (0.35 + 0.4 * heat) * (1 - 0.6 * life);
            ctx.globalAlpha = Math.min(1, 0.55 * Math.sin(Math.PI * life) * (0.4 + heat));
            ctx.setTransform(1 / k, 0, 0, 1 / k, 0, 0);
            ctx.translate(at.x, at.y); ctx.rotate(Math.atan2(out.y, out.x) + Math.PI / 2 + 0.6 * Math.sin(wp.age * 3 + wp.ph * 7));
            ctx.drawImage(tongue(kick > 0.3 ? noteTint : 14 + 20 * wp.ph), -size * 0.3, -size, size * 0.6, size);
          }
          ctx.restore();
          ctx.setTransform(1 / k, 0, 0, 1 / k, 0, 0);
        } else wisps.length = 0;

        if (set.strings) {
          ctx.strokeStyle = "rgba(226,232,240,0.45)"; ctx.lineWidth = 1;
          for (const s of n.strings) { ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); ctx.stroke(); }
        }
        W.forEach((wire, f) => {
          ctx.strokeStyle = f === 0 ? "rgba(253,224,71,0.9)" : "rgba(134,239,172,0.7)"; ctx.lineWidth = f === 0 ? 3 : 1.2;
          ctx.beginPath(); ctx.moveTo(wire.top.x, wire.top.y); ctx.lineTo(wire.bottom.x, wire.bottom.y); ctx.stroke();
        });

        // the heard note's string shakes from where it was played to the end of the board, in the note's colour
        for (const e of heard) {
          const age = now - e.at, s = n.strings[e.string], from = e.fret ? onWire(n, e.string, e.fret) : s.a;
          const along = unit(from, s.b), across = { x: -along.y, y: along.x }, len = Math.hypot(s.b.x - from.x, s.b.y - from.y);
          const gap = Math.hypot(n.strings[1].a.x - n.strings[0].a.x, n.strings[1].a.y - n.strings[0].a.y);
          const amp = gap * 0.45 * (0.5 + e.level) * Math.exp(-2.6 * age), hue = noteHue(e.midi);
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          for (const [lw, a, blur] of [[6, 0.25, 18], [2.5, 0.9, 6]] as const) {
            ctx.strokeStyle = `hsla(${hue} 100% 65% / ${a * Math.exp(-1.2 * age)})`; ctx.lineWidth = lw; ctx.shadowColor = `hsl(${hue} 100% 60%)`; ctx.shadowBlur = blur;
            ctx.beginPath();
            for (let i = 0; i <= 40; i++) {
              const u = i / 40, o = amp * Math.sin(Math.PI * u) * (Math.sin(age * 55 + u * 2) + 0.4 * Math.sin(age * 110 + u * 9));
              const x = from.x + along.x * len * u + across.x * o, y = from.y + along.y * len * u + across.y * o;
              if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        const font = 24;
        ctx.font = `bold ${font}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (const f of numbered(set.numbers)) {
          if (f >= W.length) continue;
          for (const [edge, other] of [["top", "bottom"], ["bottom", "top"]] as const) {
            const p = lerp(W[f - 1][edge], W[f][edge], 0.5), q = lerp(W[f - 1][other], W[f][other], 0.5), out = unit(q, p);
            const at = { x: p.x + out.x * font * 0.95, y: p.y + out.y * font * 0.95 };
            ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.strokeText(String(f), at.x, at.y);
            ctx.fillStyle = "white"; ctx.fillText(String(f), at.x, at.y);
          }
        }

        if (set.notes) {
          ctx.font = "bold 12px sans-serif";
          for (const f of fingers) {
            const at = spotOf(n, f.string, f.fret), midi = midiAt(f.string, f.fret);
            ctx.fillStyle = `hsla(${noteHue(midi)} 90% 55% / 0.85)`; ctx.beginPath(); ctx.arc(at.x, at.y, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "white"; ctx.fillText(noteName(midi), at.x, at.y + 0.5);
          }
          for (const e of heard) {
            const age = now - e.at, fade = 1 - age / RING, at = spotOf(n, e.string, e.fret), hue = noteHue(e.midi);
            ctx.strokeStyle = `hsla(${hue} 100% 70% / ${fade})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(at.x, at.y, 10 + 26 * (age / RING), 0, Math.PI * 2); ctx.stroke();
          }
          if (last && !set.pulse) {
            const fade = 1 - (now - last.at) / RING, at = spotOf(n, last.string, last.fret);
            ctx.font = "bold 30px sans-serif"; ctx.lineWidth = 4; ctx.strokeStyle = `rgba(0,0,0,${0.6 * fade})`; ctx.fillStyle = `hsla(${noteHue(last.midi)} 100% 85% / ${fade})`;
            ctx.strokeText(noteName(last.midi), at.x, at.y - 34); ctx.fillText(noteName(last.midi), at.x, at.y - 34);
          }
        }

        if (set.pulse) {
          // a take's notes on the video's clock (so a ring is where the riff puts it, frame for frame); live, the notes heard
          const take = timed.current;
          const pulses: Pulse[] = take?.length
            ? pulsesAt(take, video.currentTime).flatMap((x) => {
              const place = x.string !== undefined && x.fret !== undefined ? { string: x.string, fret: x.fret } : guessPlace(x.midi, fingers);
              return place ? [{ ...place, midi: x.midi, level: 0.7, age: x.age, held: x.held }] : [];
            })
            : heard.map((e) => ({ ...e, age: now - e.at, held: now - e.at < LIVE_HOLD }));
          const gap = Math.hypot(n.strings[1].a.x - n.strings[0].a.x, n.strings[1].a.y - n.strings[0].a.y) || 12;
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          for (const p of pulses) {
            if (p.age >= PULSE_S) continue;
            const t = p.age / PULSE_S, at = spotOf(n, p.string, p.fret), hue = noteHue(p.midi);
            // two rings out from the place, the second just behind the first, bigger when louder
            for (const [lag, lw] of [[0, 5], [0.18, 2.5]] as const) {
              const u = t - lag;
              if (u <= 0) continue;
              ctx.strokeStyle = `hsla(${hue} 100% 65% / ${(1 - u) ** 1.5})`; ctx.lineWidth = lw * (1 - 0.5 * u);
              ctx.shadowColor = `hsl(${hue} 100% 60%)`; ctx.shadowBlur = 16;
              ctx.beginPath(); ctx.arc(at.x, at.y, gap * (0.6 + (3 + 4 * p.level) * Math.sqrt(u)), 0, Math.PI * 2); ctx.stroke();
            }
          }
          ctx.restore();
          // each note sounding: a dot on its place with its name, bigger the moment it lands
          ctx.font = `bold ${Math.round(gap * 0.75)}px sans-serif`;
          for (const p of pulses) {
            if (!p.held) continue;
            const at = spotOf(n, p.string, p.fret), pop = 1 + 0.5 * Math.exp(-12 * p.age), rad = gap * 0.62 * pop;
            ctx.fillStyle = `hsla(${noteHue(p.midi)} 90% 50% / 0.92)`; ctx.beginPath(); ctx.arc(at.x, at.y, rad, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.stroke();
            ctx.fillStyle = "white"; ctx.fillText(noteName(p.midi), at.x, at.y + 0.5);
          }
          // the chord the notes sounding make, above the board over them; it stays while they sound and fades after
          const held = pulses.filter((p) => p.held), named = chordOf(held.map((p) => p.midi));
          if (named) {
            const spots = held.map((p) => spotOf(n, p.string, p.fret));
            const mid = { x: spots.reduce((a, p) => a + p.x, 0) / spots.length, y: spots.reduce((a, p) => a + p.y, 0) / spots.length };
            const fr = Math.min(W.length - 1, Math.max(0, Math.round(held.reduce((a, p) => a + p.fret, 0) / held.length)));
            const up = W[fr].top.y < W[fr].bottom.y ? W[fr].top : W[fr].bottom, width = Math.hypot(W[fr].top.x - W[fr].bottom.x, W[fr].top.y - W[fr].bottom.y);
            const dir = unit(W[fr].top === up ? W[fr].bottom : W[fr].top, up);
            const at = { x: mid.x + dir.x * (width * 0.5 + 64), y: Math.max(40, mid.y + dir.y * (width * 0.5 + 64)) };
            if (chord?.name !== named.name || now - chord.until > 0.15) chord = { name: named.name, hue: noteHue(named.rootPc), at, from: now, until: now };
            else { chord.at = ease(chord.at, at); chord.until = now; }
          }
          if (chord) {
            const fade = Math.max(0, 1 - (now - chord.until) / 0.5);
            if (fade <= 0) chord = null;
            else {
              const pop = 1 + 0.35 * Math.exp(-10 * (now - chord.from)), size = Math.round(44 * pop);
              ctx.font = `bold ${size}px sans-serif`; ctx.lineWidth = 6;
              ctx.strokeStyle = `rgba(0,0,0,${0.7 * fade})`; ctx.strokeText(chord.name, chord.at.x, chord.at.y);
              ctx.save(); ctx.shadowColor = `hsl(${chord.hue} 100% 55%)`; ctx.shadowBlur = 24 * fade;
              ctx.fillStyle = `hsla(${chord.hue} 100% 82% / ${fade})`; ctx.fillText(chord.name, chord.at.x, chord.at.y);
              ctx.restore();
            }
          }
          const words = chord ? `Chord: ${chord.name}` : "";
          if (words !== shownChord) { shownChord = words; setChordWords(words); }
        } else if (shownChord) { shownChord = ""; chord = null; setChordWords(""); }
      };
      id = requestAnimationFrame(frame);
    }).catch((e: unknown) => {
      if (!gone) setProblem(`OpenCV didn't load: ${e instanceof Error ? e.message : String(e)}. Check the connection, then turn Read the neck (OpenCV) off and on.`);
    });
    return () => {
      gone = true; cancelAnimationFrame(id); reader?.close();
      const ctx = drawn?.getContext("2d");
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
      ctx?.clearRect(0, 0, drawn!.width, drawn!.height);
    };
  }, [video]);

  return (
    <>
      <canvas ref={canvas} className={`pointer-events-none absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} />
      {!bare && <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-1.5 text-xs text-slate-300">{problem || [status, heardWords, chordWords, deaf].filter(Boolean).join(" · ")}</span>}
    </>
  );
}
