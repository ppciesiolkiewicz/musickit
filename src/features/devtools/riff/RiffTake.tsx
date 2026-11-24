"use client";

import { useEffect, useRef, useState } from "react";
import { getAudioContext, getOutputBus, playSequence, readDeviceChoice, silence, wakeAudio, type Player } from "@/features/sound";
import { clockTime } from "@/features/recorder/recorder";
import { pickVideoType, videoFileName } from "@/features/videos/recording";
import { asciiTab, midiOf, type RiffNote } from "./riff";
import { deleteTake, getTake, saveTake, type RiffTake as Take } from "./takes";
import { hearNotes, toRiff } from "./transcribe";
import NeckView, { MARKER_PAGE } from "./NeckView";

type Phase = "off" | "starting" | "ready" | "recording";
/** where the take on screen stands in this browser's storage */
type Stored = "saving" | "saved" | "failed";

/** A take stops itself here, so a forgotten one doesn't fill the disk. */
const MAX_SECONDS = 180;
const btn = "rounded bg-slate-800 px-3 py-1 text-sm disabled:opacity-40";
/**
 * A click at `bpm` on the AudioContext clock, louder on beat 1 of each 4/4 bar, to the speakers only: the take records the input
 * stream, so the click is heard and never recorded (unless a microphone picks it up from the room). Returns a stop function.
 */
function startClick(bpm: number, anchor: number): () => void {
  const ctx = getAudioContext();
  const out = ctx.createGain();
  out.gain.value = 0.6;
  out.connect(getOutputBus());
  const period = 60 / bpm;
  let next = 0;
  const tick = () => {
    while (anchor + next * period < ctx.currentTime + 0.12) {
      const t = anchor + next * period, accent = next % 4 === 0;
      const osc = ctx.createOscillator(), env = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = accent ? 1760 : 1175;
      env.gain.setValueAtTime(accent ? 0.5 : 0.3, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      osc.connect(env).connect(out);
      osc.start(t);
      osc.stop(t + 0.045);
      next++;
    }
  };
  tick();
  const id = window.setInterval(tick, 25);
  return () => { window.clearInterval(id); try { out.disconnect(); } catch { /* already gone */ } };
}

/** Riff notes as a sequence to play: rests advance the time, notes together start together. */
function stepsOf(notes: RiffNote[], bpm: number) {
  const ms = 60000 / bpm;
  let at = 0, last = 0;
  return notes.flatMap((n) => {
    const start = n.with ? last : at;
    if (!n.with) { last = at; at += n.beats * ms; }
    const midi = midiOf(n);
    return midi === null ? [] : [{ note: midi, at: start, hold: n.beats * ms * 0.95 }];
  });
}

const CAMERA_KEY = "musickit.riff.camera";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Records the riff being played, with the camera and the audio input, and keeps the take with the riff in this browser: it is saved
 * when the recording stops, and **Save file** downloads it. **Transcribe** hears the take's notes (`transcribe.ts`) and hands them to
 * `onNotes`, to replace the riff's notes or to follow them.
 */
export default function RiffTake({ riff, name, bpm, pos, bars, player, onNotes }: {
  riff: string; name: string; bpm: number; pos: number;
  /** the riff's length in 4/4 bars: what a take is expected to fill */
  bars: number;
  /** the riff maker's sound, to play back what Transcribe heard */
  player: () => Player;
  onNotes: (notes: RiffNote[], replace: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("off");
  const [problem, setProblem] = useState("");
  // the take and its address for the player
  const [shown, setShown] = useState<{ take: Take; url: string } | null>(null);
  const take = shown?.take ?? null;
  const url = shown?.url ?? "";
  const shownUrl = useRef("");
  const [stored, setStored] = useState<Stored>("saved");
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<RiffNote[] | null>(null);
  // the take a new recording replaced, kept in memory until the next recording, so a worse retake can be undone
  const [previous, setPrevious] = useState<Take | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const live = useRef<HTMLVideoElement>(null);
  const [click, setClick] = useState(true);
  // the cameras the browser offers (an iPhone through Continuity Camera among them), and the one picked, kept in this browser
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState(() => { try { return localStorage.getItem(CAMERA_KEY) ?? ""; } catch { return ""; } });
  const listCameras = async () => {
    try { setCameras((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput")); } catch { /* the list stays as it was */ }
  };
  const pickCamera = (id: string) => {
    setCameraId(id);
    try { localStorage.setItem(CAMERA_KEY, id); } catch { /* kept for this visit only */ }
  };
  // optional: markers and hands drawn over the take (NeckView)
  const [readNeck, setReadNeck] = useState(false);
  const [takeVideo, setTakeVideo] = useState<HTMLVideoElement | null>(null);
  const [countIn, setCountIn] = useState(1);
  // the expected length follows the riff's until it is typed in
  const [typedLength, setLength] = useState<number | null>(null);
  const length = typedLength ?? bars;
  const stopClick = useRef<(() => void) | null>(null);
  // the click's grid while recording to it, and where the playing stands on it, read every frame
  const grid = useRef<{ anchor: number; period: number; countIn: number; bars: number } | null>(null);
  const [beatNow, setBeatNow] = useState<{ beat: number; bars: number; countIn: number } | null>(null);
  const endClick = () => { stopClick.current?.(); stopClick.current = null; };

  /** Put a take (or none) on screen, letting go of the last one's address. */
  const show = (t: Take | null) => {
    if (shownUrl.current) URL.revokeObjectURL(shownUrl.current);
    shownUrl.current = t ? URL.createObjectURL(t.blob) : "";
    setShown(t ? { take: t, url: shownUrl.current } : null);
  };
  const stopCamera = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };

  // the take kept with this riff
  useEffect(() => {
    let gone = false;
    void getTake(riff).then((t) => { if (!gone && t) { show(t); setStored("saved"); } });
    return () => { gone = true; if (shownUrl.current) URL.revokeObjectURL(shownUrl.current); shownUrl.current = ""; };
  }, [riff]);
  // let go of the camera when the panel closes
  // a camera plugged in or an iPhone coming near shows up in the list
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) return;
    const list = () => md.enumerateDevices().then((all) => setCameras(all.filter((d) => d.kind === "videoinput")), () => {});
    void list();
    md.addEventListener("devicechange", list);
    return () => md.removeEventListener("devicechange", list);
  }, []);
  useEffect(() => () => { endClick(); if (recorder.current?.state === "recording") { recorder.current.onstop = null; recorder.current.stop(); } stopCamera(); }, []);
  useEffect(() => { if (live.current && (phase === "ready" || phase === "recording")) live.current.srcObject = stream.current; }, [phase]);
  useEffect(() => {
    if (phase !== "recording") return;
    const from = performance.now();
    const id = window.setInterval(() => {
      const s = (performance.now() - from) / 1000;
      setSeconds(s);
      if (s >= MAX_SECONDS) recorder.current?.stop();
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "recording") return;
    let id = 0;
    const frame = () => {
      const g = grid.current;
      // beats from beat 1: negative in the count-in
      setBeatNow(g ? { beat: (getAudioContext().currentTime - g.anchor) / g.period - g.countIn * 4, bars: g.bars, countIn: g.countIn } : null);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(id); setBeatNow(null); };
  }, [phase]);

  const store = async (t: Take) => {
    setStored("saving");
    try { await saveTake(t); setStored("saved"); } catch (e) { setStored("failed"); setProblem(`The browser didn't store this take: ${message(e)}. Press Save to try again, or Save file to keep it on disk.`); }
  };

  const startCamera = async (id = cameraId) => {
    setProblem("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { setProblem("This browser can't record video."); return; }
    setPhase("starting");
    try {
      // the guitar as it is: no echo cancelling, noise removal or level riding, which smear the picks and bend the pitch
      const input = readDeviceChoice().input;
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, ...(id ? { deviceId: { exact: id } } : {}) },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, ...(input ? { deviceId: { ideal: input.id } } : {}) },
      });
      setPhase("ready");
      void listCameras();
    } catch (e) {
      setPhase("off");
      if (id && e instanceof Error && e.name === "OverconstrainedError") {
        pickCamera("");
        setProblem("The camera picked in the Camera list isn't connected. It's back on Browser default: press Start camera, or pick another camera.");
        return;
      }
      setProblem(`The camera or the microphone didn't open: ${message(e)}. Allow both in the address bar, then press Start camera.`);
    }
  };

  const record = async () => {
    const s = stream.current;
    if (!s) return;
    const type = pickVideoType((t) => MediaRecorder.isTypeSupported(t));
    const chunks: Blob[] = [];
    let r: MediaRecorder;
    try { r = new MediaRecorder(s, type ? { mimeType: type } : undefined); } catch (e) { setProblem(`The recording didn't start: ${message(e)}.`); return; }
    const ctx = getAudioContext();
    await wakeAudio();
    const period = 60 / bpm;
    // with the click on: beat 1 after the count-in, and the take stops itself a moment after the expected length
    const timed = click;
    const anchor = ctx.currentTime + 0.15;
    const downbeatAt = anchor + countIn * 4 * period;
    let recStart = ctx.currentTime;
    let stopTimer = 0;
    let from = 0;
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onerror = () => setProblem("The recording stopped with an error. Record the take again.");
    r.onstart = () => { recStart = ctx.currentTime; from = performance.now(); };
    r.onstop = () => {
      window.clearTimeout(stopTimer);
      grid.current = null;
      endClick();
      const recorded = r.mimeType || type || "video/webm";
      // a note played on the click reaches the take late by the output and input latency
      const lag = (ctx.outputLatency || ctx.baseLatency || 0) + ((s.getAudioTracks()[0]?.getSettings() as { latency?: number }).latency ?? 0);
      const t: Take = {
        id: riff, blob: new Blob(chunks, { type: recorded }), type: recorded, seconds: Math.round((performance.now() - from) / 1000), at: Date.now(),
        ...(timed ? { downbeat: Math.max(0, downbeatAt - recStart + lag), bpm, bars: length } : {}),
      };
      // the camera stays open, so the next take is one press away
      setPhase(stream.current ? "ready" : "off");
      setHeard(null);
      if (take) setPrevious(take);
      show(t);
      void store(t);
      // a take recorded to the click is read straight away
      if (t.downbeat !== undefined) void transcribe(t);
    };
    recorder.current = r;
    if (timed) {
      stopClick.current = startClick(bpm, anchor);
      grid.current = { anchor, period, countIn, bars: length };
      stopTimer = window.setTimeout(() => { if (r.state === "recording") r.stop(); }, (downbeatAt - ctx.currentTime + length * 4 * period + 0.5) * 1000);
    }
    r.start(1000);
    setSeconds(0);
    setProblem("");
    setPhase("recording");
  };

  const remove = async () => {
    setProblem("");
    try { await deleteTake(riff); show(null); setHeard(null); } catch (e) { setProblem(`The take wasn't deleted: ${message(e)}.`); }
  };

  const download = () => {
    if (!take) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = videoFileName(name, take.type);
    a.click();
  };

  const transcribe = async (take: Take | null = shown?.take ?? null) => {
    if (!take) return;
    setBusy(true);
    setProblem("");
    try {
      const audio = await getAudioContext().decodeAudioData(await take.blob.arrayBuffer());
      // both channels as one: an interface often carries the guitar on one side only
      const mono = new Float32Array(audio.length);
      for (let c = 0; c < audio.numberOfChannels; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i]; }
      // a take recorded to the click is read on its own grid: beat 1 after the count-in, as many bars as were expected
      const timed = take.downbeat !== undefined && take.bpm && take.bars;
      setHeard(timed ? toRiff(hearNotes(mono, audio.sampleRate), take.bpm!, pos, 0.25, { from: take.downbeat, beats: take.bars! * 4 }) : toRiff(hearNotes(mono, audio.sampleRate), bpm, pos));
    } catch (e) {
      setProblem(`The take's sound couldn't be read: ${message(e)}.`);
    }
    setBusy(false);
  };

  const undo = () => {
    if (!previous) return;
    show(previous);
    void store(previous);
    setPrevious(null);
    setHeard(null);
  };

  // R records and stops, unless typing in a field; bound again each render so it sees the current phase
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key.toLowerCase() !== "r" || e.repeat || e.metaKey || e.ctrlKey || e.altKey || el?.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      if (phase === "ready") void record();
      else if (phase === "recording") recorder.current?.stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const camera = phase === "ready" || phase === "recording";
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-800 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 font-semibold">Take</h2>
        {phase === "off" && <button onClick={() => void startCamera()} className={btn}>Start camera</button>}
        <details className="w-full order-last text-slate-300">
          <summary className="cursor-pointer text-slate-400">How takes work</summary>
          <div className="mt-2 flex flex-col gap-2">
            <p>
              Press Start camera above to open the camera and your audio input, then press Record to play the riff. The take is saved in
              this browser with the riff. Press Transcribe to turn what it heard into notes. The sound comes from the audio input you last
              picked in the app. The picture comes from the browser&apos;s camera.
            </p>
            <p>
              To film with an iPhone, turn on Continuity Camera on the phone (Settings → General → AirPlay &amp; Continuity), with the Mac and
              the phone on the same Apple ID. Put the phone near the Mac in landscape, locked, with the back camera on the guitar. Press
              Start camera once so the browser allows the camera, then pick the iPhone in the Camera list above: the camera switches
              to it. If the iPhone isn&apos;t in the list, quit Chrome (Cmd+Q) and open it again.
            </p>
            <p>
              Read the neck, on a saved take, draws your fingertips and the markers it sees over the video. Recording and Transcribe need no
              markers. Markers are small black-and-white squares, like QR codes, that the camera can find. Open
              {" "}<a href={MARKER_PAGE} target="_blank" rel="noreferrer" className="text-sky-400 underline">Print markers</a>{" "}
              and print a few: the page is already set to the right kind (ARUCO_MIP_36h12), and other kinds won&apos;t be seen. Stick them on
              the guitar neck, a few frets apart, where the camera can see them. For now it only shows
              what it finds; placing the frets from the markers comes next.
            </p>
          </div>
        </details>
        {phase === "starting" && <span className="text-slate-400">Starting the camera…</span>}
        {phase === "ready" && <button onClick={() => void record()} className="rounded bg-rose-700 px-3 py-1 text-sm">{take ? "Record again" : "Record"} <kbd className="ml-1 rounded bg-rose-900 px-1 text-xs">R</kbd></button>}
        {phase === "ready" && <button onClick={() => { stopCamera(); setPhase("off"); }} className={btn}>Close camera</button>}
        {(phase === "off" || phase === "ready") && (
          <label className="flex items-center gap-1.5 text-slate-300" title="The list fills once the camera has been allowed. Changing it restarts the camera.">Camera
            <select value={cameraId} onFocus={() => void listCameras()} onPointerDown={() => void listCameras()}
              onChange={(e) => { const id = e.target.value; pickCamera(id); if (phase === "ready") { stopCamera(); void startCamera(id); } }}
              className="max-w-48 rounded bg-slate-800 px-1 py-0.5">
              <option value="">Browser default</option>
              {cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
              {cameraId && !cameras.some((c) => c.deviceId === cameraId) && <option value={cameraId}>Last picked camera</option>}
            </select>
          </label>
        )}
        {(phase === "off" || phase === "ready") && (
          <label className="flex items-center gap-1.5 text-slate-300" title="Clicks through the speakers while you record. Only the input is recorded: use headphones if you record with a microphone.">
            <input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} /> Click at {bpm} bpm
          </label>
        )}
        {(phase === "off" || phase === "ready") && click && (
          <>
            <label className="flex items-center gap-1.5 text-slate-300">Count-in
              <select value={countIn} onChange={(e) => setCountIn(+e.target.value)} className="rounded bg-slate-800 px-1 py-0.5">
                {[0, 1, 2].map((n) => <option key={n} value={n}>{n} {n === 1 ? "bar" : "bars"}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-slate-300" title="The recording stops by itself after this many bars.">Length
              <input type="number" min={1} max={32} value={length} onChange={(e) => setLength(Math.min(32, Math.max(1, Math.round(+e.target.value) || 1)))} className="w-14 rounded bg-slate-800 px-1 py-0.5" /> bars
            </label>
          </>
        )}
        {phase === "recording" && <button onClick={() => recorder.current?.stop()} className="rounded bg-rose-700 px-3 py-1 text-sm">Stop <kbd className="ml-1 rounded bg-rose-900 px-1 text-xs">R</kbd></button>}
        {phase === "recording" && <span className="font-mono text-rose-300">{clockTime(seconds)} / {clockTime(MAX_SECONDS)}</span>}
        {phase === "ready" && take && !previous && <span className="text-slate-400">A new recording replaces this riff&apos;s take.</span>}
        {previous && phase !== "recording" && <button onClick={undo} className={btn} title={`Recorded ${new Date(previous.at).toLocaleTimeString()}, ${clockTime(previous.seconds)}`}>Back to the previous take</button>}
        {take && phase !== "recording" && (
          <>
            <button onClick={() => void transcribe()} disabled={busy} className="rounded bg-emerald-700 px-3 py-1 text-sm disabled:opacity-40">{busy ? "Listening…" : "Transcribe"}</button>
            <button onClick={() => void store(take)} disabled={stored !== "failed"} className={btn}>Save</button>
            <button onClick={download} className={btn}>Save file</button>
            <button onClick={() => void remove()} className={btn}>Delete take</button>
            <label className="flex items-center gap-1.5 text-slate-300" title="Draws the neck markers and your fingertips over the take. Needs ArUco markers (ARUCO_MIP_36h12) stuck on the neck.">
              <input type="checkbox" checked={readNeck} onChange={(e) => setReadNeck(e.target.checked)} /> Read the neck
            </label>
            {readNeck && <a href={MARKER_PAGE} target="_blank" rel="noreferrer" className="text-sky-400 underline">Print markers</a>}
            <span className={stored === "failed" ? "text-rose-400" : "text-slate-400"}>
              {clockTime(take.seconds)} · {stored === "saved" ? "Saved in this browser" : stored === "saving" ? "Saving…" : "Not saved"}
            </span>
          </>
        )}
      </div>
      {problem && <p role="alert" className="text-rose-400">{problem}</p>}
      {!camera && !take && <p className="text-slate-400">Record yourself playing the riff. The take is saved with the riff in this browser, and Transcribe turns its notes into tab at {bpm} bpm. One note at a time: chords aren&apos;t heard.</p>}
      {phase === "recording" && beatNow && <BeatView {...beatNow} />}
      {/* the take to review, and beside it the camera, ready for the next one; while recording the camera alone */}
      {(camera || (take && url)) && (
        <div className="flex flex-wrap items-start gap-3">
          {phase !== "recording" && take && url && (
            <div className="relative w-full max-w-xl">
              <video key={url} ref={setTakeVideo} src={url} controls playsInline className="max-h-80 w-full rounded bg-black" />
              {readNeck && <NeckView key={url} video={takeVideo} />}
            </div>
          )}
          {camera && (
            <div className="relative">
              <video ref={live} autoPlay muted playsInline className={`rounded bg-black ${phase === "recording" || !take ? "max-h-80 w-full max-w-xl" : "max-h-40 w-56"}`} />
              <span className={`absolute left-2 top-2 rounded px-1.5 text-xs ${phase === "recording" ? "bg-rose-700 text-white" : "bg-slate-900/80 text-slate-300"}`}>{phase === "recording" ? "● Recording" : "Camera"}</span>
            </div>
          )}
        </div>
      )}
      {heard && (
        heard.length === 0
          ? <p className="text-amber-300">No notes heard in this take. Chords and very quiet playing aren&apos;t picked up.</p>
          : (
            <div className="flex flex-col gap-2">
              <p className="text-slate-400">Heard {heard.filter((n) => n.string !== null).length} notes, on a 1/16 grid at {take?.bpm ?? bpm} bpm {take?.downbeat !== undefined ? `from beat 1, ${take.bars} bars` : "from the first note"}, placed at position {pos}.</p>
              <pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">{asciiTab(heard)}</pre>
              <div className="flex gap-2">
                <button onClick={() => playSequence(stepsOf(heard, take?.bpm ?? bpm), player())} className="rounded bg-emerald-700 px-3 py-1 text-sm">Play</button>
                <button onClick={() => silence()} className={btn}>Stop</button>
                <button onClick={() => { onNotes(heard, true); setHeard(null); }} className={btn}>Replace the riff&apos;s notes</button>
                <button onClick={() => { onNotes(heard, false); setHeard(null); }} className={btn}>Add after the riff&apos;s notes</button>
                <button onClick={() => setHeard(null)} className={btn}>Discard</button>
              </div>
            </div>
          )
      )}
    </section>
  );
}

/**
 * Where the playing stands on the click while a take records: the count-in counting down, then the bar and beat, four beat lights
 * (beat 1 brighter) and a strip of the expected bars filling up. `beat` counts from beat 1, negative in the count-in.
 */
function BeatView({ beat, bars, countIn }: { beat: number; bars: number; countIn: number }) {
  if (beat < -countIn * 4 - 1e-3) return null; // before the first click
  const counting = beat < 0;
  const whole = Math.floor(beat);
  const inBar = ((whole % 4) + 4) % 4;
  const bar = Math.floor(whole / 4) + 1;
  const done = beat >= bars * 4;
  const big = counting ? `${Math.ceil(-beat)}` : done ? "Done" : `Bar ${bar} of ${bars}`;
  const tone = counting ? "text-amber-300" : done ? "text-slate-400" : "text-emerald-300";
  return (
    <div className="flex max-w-xl flex-col gap-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={`min-w-28 font-mono text-2xl font-semibold tabular-nums ${tone}`}>{big}</span>
        <span className="text-slate-400">{counting ? "Count-in: play on beat 1" : done ? "Stopping…" : `Beat ${inBar + 1}`}</span>
        <div className="ml-auto flex gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map((b) => {
            const on = !done && b === inBar && beat - whole < 0.35;
            return <span key={b} className={`size-4 rounded-full transition-colors duration-75 ${on ? (b === 0 ? "bg-white" : counting ? "bg-amber-400" : "bg-emerald-400") : "bg-slate-700"}`} />;
          })}
        </div>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: bars }, (_, i) => {
          const fill = Math.min(1, Math.max(0, beat / 4 - i));
          return (
            <span key={i} className="relative h-2 flex-1 overflow-hidden rounded bg-slate-800">
              <span className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${fill * 100}%` }} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
