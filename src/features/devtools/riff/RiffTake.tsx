"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAudioContext, getOutputBus, readDeviceChoice, wakeAudio } from "@/features/sound";
import { clockTime } from "@/features/recorder/recorder";
import { pickVideoType, videoFileName } from "@/features/videos/recording";
import { riffTimes, type RiffNote } from "./riff";
import { deleteTake, getTake, saveTake, type RiffTake as Take } from "./takes";
import NeckView from "./NeckView";
import { LiveNote, StillNotes, OVERLAY_MODES, TakeNotes, WINDOW_BARS, barGrid, type OverlayMode, type WindowBars } from "./NoteOverlay";
import DetectLog, { addNeckRead } from "./DetectLog";
import type { NeckRead, TakeLog } from "./takes";

type Phase = "off" | "starting" | "ready" | "recording";
/** where the take on screen stands in this browser's storage */
type Stored = "saving" | "saved" | "failed";

/** A take stops itself here, so a forgotten one doesn't fill the disk. */
const MAX_SECONDS = 180;
const btn = "rounded-md bg-slate-800 px-3 py-1 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40";
const rec = "inline-flex items-center gap-2 rounded-md bg-rose-700 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-rose-600";
const kbd = "rounded bg-rose-900/80 px-1 text-xs font-normal";
const group = "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-slate-800 bg-slate-900/40 px-3 pb-2 pt-1";
const legend = "px-1 text-xs font-medium uppercase tracking-wide text-slate-500";
const field = "flex items-center gap-1.5 text-slate-300";
const input = "rounded bg-slate-800 px-1.5 py-0.5 text-slate-200";
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

const MARKERS_KEY = "musickit-dev-riff-markers";
const CAMERA_KEY = "musickit.riff.camera";
const OVERLAY_KEY = "musickit.riff.overlay";
const WINDOW_KEY = "musickit.riff.windowBars";
/** Show the take at `t` seconds, paused. */
const seek = (v: HTMLVideoElement, t: number) => { v.currentTime = t; v.pause(); };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Records the riff being played, with the camera and the audio input, and keeps the take with the riff in this browser: it is saved
 * when the recording stops, and **Save file** downloads it. The riff's own notes are drawn over the take on its beat grid (beat 1
 * after the count-in, at the take's tempo), and over the camera while recording: nothing is heard from the take.
 */
export default function RiffTake({ riff, name, bpm, bars, notes }: {
  riff: string; name: string; bpm: number;
  /** the riff's length in 4/4 bars: what a take is expected to fill */
  bars: number;
  notes: RiffNote[];
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
  // the take a new recording replaced, kept in memory until the next recording, so a worse retake can be undone
  const [previous, setPrevious] = useState<Take | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const live = useRef<HTMLVideoElement | null>(null);
  // the live video as state too, so NeckView can read the camera
  const [liveVideo, setLiveVideo] = useState<HTMLVideoElement | null>(null);
  const liveRef = useCallback((el: HTMLVideoElement | null) => { live.current = el; setLiveVideo(el); }, []);
  const [click, setClick] = useState(true);
  // how the riff is drawn over the video, kept in this browser
  const [overlay, setOverlay] = useState<OverlayMode>(() => { try { return (localStorage.getItem(OVERLAY_KEY) as OverlayMode | null) ?? "tab"; } catch { return "tab"; } });
  const [windowBars, setWindowBars] = useState<WindowBars>(() => { try { const v = Number(localStorage.getItem(WINDOW_KEY)); return (WINDOW_BARS as readonly number[]).includes(v) ? (v as WindowBars) : 1; } catch { return 1; } });
  const pickWindow = (b: WindowBars) => { setWindowBars(b); try { localStorage.setItem(WINDOW_KEY, String(b)); } catch { /* kept for this visit only */ } };
  const pickOverlay = (m: OverlayMode) => { setOverlay(m); try { localStorage.setItem(OVERLAY_KEY, m); } catch { /* kept for this visit only */ } };
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
  // which marker sits at which fret, "id@fret, …", kept in this browser
  const [markers, setMarkers] = useState(() => { try { return localStorage.getItem(MARKERS_KEY) ?? "0@0, 1@17"; } catch { return "0@0, 1@17"; } });
  const placeMarkers = (v: string) => { setMarkers(v); try { localStorage.setItem(MARKERS_KEY, v); } catch { /* kept for this visit only */ } };
  const [takeVideo, setTakeVideo] = useState<HTMLVideoElement | null>(null);
  const [countIn, setCountIn] = useState(1);
  // the expected length follows the riff's until it is typed in
  const [typedLength, setLength] = useState<number | null>(null);
  const length = typedLength ?? bars;
  const stopClick = useRef<(() => void) | null>(null);
  // the click's grid while recording to it, and where the playing stands on it, read every frame
  const grid = useRef<{ anchor: number; period: number; countIn: number; bars: number } | null>(null);
  const [beatNow, setBeatNow] = useState<{ beat: number; bars: number; countIn: number } | null>(null);
  /** Change the shown take's detection log; it is saved in this browser a moment after the last change. */
  const setLog = useCallback((fn: (l: TakeLog) => TakeLog) => {
    setShown((s) => (s ? { ...s, take: { ...s.take, log: fn(s.take.log ?? {}) } } : s));
  }, []);
  const onNeckRead = useCallback((r: NeckRead) => setLog((l) => {
    const neck = addNeckRead(l.neck ?? [], r);
    return neck === l.neck ? l : { ...l, neck };
  }), [setLog]);
  const loggedTake = shown?.take;
  useEffect(() => {
    if (!loggedTake?.log) return;
    const id = window.setTimeout(() => {
      saveTake(loggedTake).catch((e: unknown) => setProblem(`The detection log wasn't saved in this browser: ${message(e)}. Copy log keeps it.`));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [loggedTake]);
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
      if (take) setPrevious(take);
      show(t);
      void store(t);
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
    try { await deleteTake(riff); show(null); } catch (e) { setProblem(`The take wasn't deleted: ${message(e)}.`); }
  };

  const download = () => {
    if (!take) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = videoFileName(name, take.type);
    a.click();
  };

  const undo = () => {
    if (!previous) return;
    show(previous);
    void store(previous);
    setPrevious(null);
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
  // the riff on the take's grid; a take recorded without the click starts at its first second, at the riff's tempo
  const takeNotes = useMemo(() => riffTimes(notes, take?.bpm ?? bpm, take?.downbeat ?? 0), [notes, take?.bpm, take?.downbeat, bpm]);
  const liveNotes = useMemo(() => riffTimes(notes, bpm), [notes, bpm]);
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
              this browser with the riff. The riff&apos;s notes are shown over the camera while you record, and over the take as it plays,
              lined up from beat 1 after the count-in. Record with the click on, or the notes start at the take&apos;s first second. The sound comes from the audio input you last
              picked in the app. The picture comes from the browser&apos;s camera.
            </p>
            <p>
              To film with an iPhone, turn on Continuity Camera on the phone (Settings → General → AirPlay &amp; Continuity), with the Mac and
              the phone on the same Apple ID. Put the phone near the Mac in landscape, locked, with the back camera on the guitar. Press
              Start camera once so the browser allows the camera, then pick the iPhone in the Camera list above: the camera switches
              to it. If the iPhone isn&apos;t in the list, quit Chrome (Cmd+Q) and open it again.
            </p>
            <p>
              Read the neck draws your fingertips and the markers it sees over the camera and over a saved take. Recording needs no
              markers. Markers are small black-and-white squares, like QR codes, that the camera can find. Print the 
              <a href="/riff/neck-markers-a4.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">A4 markers</a> or the 
              <a href="/riff/neck-markers-a3.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">A3 markers</a>: they are the kind the camera reads (ARUCO_MIP_36h12), and other kinds won&apos;t be seen. For now it only shows
              what it finds; placing the frets from the markers comes next.
            </p>
            <p className="font-medium text-slate-200">Printing and placing markers</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Print the sheet for your paper: <a href="/riff/neck-markers-a4.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">A4 markers</a> or{" "}
                <a href="/riff/neck-markers-a3.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">A3 markers</a>. Each has markers
                from 40 mm down to 25 mm, the black square only, each with its own number. Use 30 mm where it fits, and 25 mm where it doesn&apos;t: smaller ones drop out.
              </li>
              <li>Print on matte paper at 100% (&quot;Actual size&quot;, not &quot;Fit to page&quot;). Measure one with a ruler: it should be 30 mm on every side.</li>
              <li>Cut around each marker so a white edge about 3 mm wide stays on all sides. The camera needs that edge to find the square.</li>
              <li>
                Stick them off the fretboard, where your fingers won&apos;t cover them, with each one&apos;s centre level with a fret wire (or the nut).
                On a Squier Stratocaster or Telecaster (25.5&quot; scale) the frets are about 36 mm apart at the nut, 27 mm at fret 5 and
                18 mm at fret 12, so a 30 mm marker fits inside one fret only near the nut.
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  <li>One on the headstock face, just above the nut (fret 0).</li>
                  <li>One on the body just past the neck joint, lined up with fret 17.</li>
                  <li>Skip the side of the neck: it is only about 20 mm deep, and a marker that small drops out.</li>
                </ul>
                Type each marker&apos;s number and the fret it lines up with into Markers, as number@fret, with the headstock one as fret 0 and its size in mm after a slash, since its centre sits past the nut (so 0@0/25, 1@17): the log uses it to read the fret your hand is at.
              </li>
              <li>Test from where the camera will stand: press Start camera, turn on Read the neck, and play. Each marker&apos;s number should stay in the Markers label at the top left of the camera. If one keeps dropping out, print it bigger or move the camera closer.</li>
            </ol>
          </div>
        </details>
        {phase === "starting" && <span className="text-slate-400">Starting the camera…</span>}
        {phase === "ready" && <button onClick={() => void record()} className={rec}><span className="size-2 rounded-full bg-white" />{take ? "Record again" : "Record"} <kbd className={kbd}>R</kbd></button>}
        {phase === "recording" && <button onClick={() => recorder.current?.stop()} className={rec}><span className="size-2 bg-white" />Stop <kbd className={kbd}>R</kbd></button>}
        {phase === "recording" && <span className="font-mono tabular-nums text-rose-300">{clockTime(seconds)} / {clockTime(MAX_SECONDS)}</span>}
        {phase === "ready" && <button onClick={() => { stopCamera(); setPhase("off"); }} className={btn}>Close camera</button>}
        {previous && phase !== "recording" && <button onClick={undo} className={btn} title={`Recorded ${new Date(previous.at).toLocaleTimeString()}, ${clockTime(previous.seconds)}`}>Back to the previous take</button>}
        {take && phase !== "recording" && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className={`text-xs ${stored === "failed" ? "text-rose-400" : "text-slate-400"}`}>
              {clockTime(take.seconds)} · {stored === "saved" ? "Saved in this browser" : stored === "saving" ? "Saving…" : "Not saved"}
            </span>
            {stored === "failed" && <button onClick={() => void store(take)} className={btn}>Save</button>}
            <button onClick={download} className={btn}>Save file</button>
            <button onClick={() => void remove()} className={`${btn} hover:bg-rose-900/60 hover:text-rose-200`}>Delete take</button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
          {(phase === "off" || phase === "ready") && (
            <fieldset className={group}>
              <legend className={legend}>Recording</legend>
              <label className={field} title="The list fills once the camera has been allowed. Changing it restarts the camera.">Camera
                <select value={cameraId} onFocus={() => void listCameras()} onPointerDown={() => void listCameras()}
                  onChange={(e) => { const id = e.target.value; pickCamera(id); if (phase === "ready") { stopCamera(); void startCamera(id); } }}
                  className={`${input} max-w-48`}>
                  <option value="">Browser default</option>
                  {cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
                  {cameraId && !cameras.some((c) => c.deviceId === cameraId) && <option value={cameraId}>Last picked camera</option>}
                </select>
              </label>
              <label className={field} title="Clicks through the speakers while you record. Only the input is recorded: use headphones if you record with a microphone.">
                <input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} className="accent-sky-500" /> Click at {bpm} bpm
              </label>
              {click && (
                <>
                  <label className={field}>Count-in
                    <select value={countIn} onChange={(e) => setCountIn(+e.target.value)} className={input}>
                      {[0, 1, 2].map((n) => <option key={n} value={n}>{n} {n === 1 ? "bar" : "bars"}</option>)}
                    </select>
                  </label>
                  <label className={field} title="The recording stops by itself after this many bars.">Length
                    <input type="number" min={1} max={32} value={length} onChange={(e) => setLength(Math.min(32, Math.max(1, Math.round(+e.target.value) || 1)))} className={`${input} w-14`} /> bars
                  </label>
                </>
              )}
            </fieldset>
          )}
          <fieldset className={group}>
            <legend className={legend}>Over the video</legend>
            <label className={field} title="How the riff's notes are drawn over the camera and the take">Riff
              <select value={overlay} onChange={(e) => pickOverlay(e.target.value as OverlayMode)} className={input}>
                {OVERLAY_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            {overlay === "bar" && (
              <label className={field} title="How many bars Bar by bar shows at once">Bars shown
                <select value={windowBars} onChange={(e) => pickWindow(Number(e.target.value) as WindowBars)} className={input}>
                  {WINDOW_BARS.map((b) => <option key={b} value={b}>{b === 1.5 ? "1½" : b}</option>)}
                </select>
              </label>
            )}
            {(camera || take) && phase !== "recording" && (
              <label className={field} title="Draws the neck markers and your fingertips over the camera and the take. Needs ArUco markers (ARUCO_MIP_36h12) stuck on the guitar.">
                <input type="checkbox" checked={readNeck} onChange={(e) => setReadNeck(e.target.checked)} className="accent-sky-500" /> Read the neck
              </label>
            )}
            {(camera || take) && phase !== "recording" && readNeck && (
              <label className={field} title="For each marker, its number and the fret wire its centre is level with. A headstock marker touching the nut is fret 0 with its size in mm: 0@0/25.">
                Markers
                <input value={markers} onChange={(e) => placeMarkers(e.target.value)} placeholder="0@0/25, 1@17" className={`${input} w-32`} />
              </label>
            )}
          </fieldset>
      </div>
      {phase === "ready" && take && !previous && <p className="text-xs text-slate-500">A new recording replaces this riff&apos;s take.</p>}
      {problem && <p role="alert" className="text-rose-400">{problem}</p>}
      {!camera && !take && <p className="text-slate-400">Record yourself playing the riff. The take is saved with the riff in this browser, with the riff&apos;s notes shown over it.</p>}
      {phase === "recording" && beatNow && <BeatView {...beatNow} />}
      {/* the take to review, and beside it the camera, ready for the next one; while recording the camera alone */}
      {(camera || (take && url)) && (
        <div className="flex flex-wrap items-start gap-3">
          {phase !== "recording" && take && url && (
            <div className="relative w-full max-w-4xl">
              <video key={url} ref={setTakeVideo} src={url} controls playsInline className="max-h-[32rem] w-full rounded bg-black" />
              {readNeck && <NeckView key={url} video={takeVideo} onRead={onNeckRead} />}
              <TakeNotes video={takeVideo} notes={takeNotes} mode={overlay} grid={barGrid(take.bpm ?? bpm, take.downbeat ?? 0, windowBars)} />
            </div>
          )}
          {camera && (
            <div className="relative">
              <video ref={liveRef} autoPlay muted playsInline className={`rounded bg-black ${phase === "recording" || !take ? "max-h-[32rem] w-full max-w-4xl" : "max-h-40 w-56"}`} />
              {phase === "recording" && beatNow && <LiveNote notes={liveNotes} t={beatNow.beat * 60 / bpm} mode={overlay} grid={barGrid(bpm, 0, windowBars)} />}
              {phase === "ready" && !take && <StillNotes notes={liveNotes} mode={overlay} grid={barGrid(bpm, 0, windowBars)} />}
              {/* not while recording: the hand model would compete with the recorder and the beat */}
              {readNeck && phase !== "recording" ? <NeckView video={liveVideo} /> : (
                <span className={`absolute left-2 top-2 rounded px-1.5 text-xs ${phase === "recording" ? "bg-rose-700 text-white" : "bg-slate-900/80 text-slate-300"}`}>{phase === "recording" ? "● Recording" : "Camera"}</span>
              )}
            </div>
          )}
        </div>
      )}
      {take && phase !== "recording" && (
        <DetectLog log={take.log ?? {}} notes={takeNotes} markers={markers} onSeek={(t) => takeVideo && seek(takeVideo, t)} />
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
