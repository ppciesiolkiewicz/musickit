"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { openRecordInput, type RecordInput } from "@/features/sound";
import RecordInputSelect from "@/components/RecordInputSelect";
import { clockTime } from "@/features/recorder/recorder";
import { MAX_TAKE_SECONDS, pickVideoType } from "@/features/videos/recording";
import { ToolClockListener } from "@/components/practice/toolClock";
import { NoAutoScroll } from "@/components/practice/bringIntoView";
import { CONTROLS_TOOLS, ToolControls } from "@/components/practice/toolControls";
import type { PlanTool } from "@/features/plan/model/tools";
import { CvControls, FxControls, NeckCvView, NeckView, useCv, useFx } from "@/features/neckFx";
import { FaceControls, FaceView, useFace } from "@/features/faceFx";
import { saveContentVideo } from "../client/api";
import { burnOverlay, canBurn, noChange, type Burned } from "../client/burn";
import { ToolOverVideo, useDrawTool } from "./OverlayVideo";
import { squeeze, type Sample } from "../model/clock";
import { BGS, DEFAULT_BOX, DEFAULT_LOOK, PLACES, SIZES, fitBox, hasOverlay, readLook, type Look, type Overlay } from "../model/overlay";
import { BG_WORDS, PLACE_WORDS, SIZE_WORDS, panelBg, panelClass, panelStyle } from "./lookPanel";
import Scaled from "./Scaled";
import { stepGroups, toolName, wouldLose } from "../model/coverage";
import type { ContentVideoInfo } from "../server/access";

/**
 * The record page's recorder (/admin/content/videos/record): the camera fills the frame and the tool (`children`, drawn by
 * the page) sits over it, started and stopped with its own controls. Record and Stop (or R), the take to watch back, its
 * title and note, the levels it is for (or This block only, when opened from a block's tool) with which video loses a
 * level, and Save for players. The take stays on this page until it is saved: a failed save can be tried again.
 */

type Phase = "off" | "starting" | "ready" | "recording";
interface Take {
  id: string; blob: Blob; type: string; seconds: number; url: string; width: number; height: number; fileUp: boolean; saved: boolean; overlay: Overlay | null;
  /** Export with overlay: the take with the tool and the neck effects burned in, saved for players in its place */
  burned: Burned | null;
}

/** how often the tool's beat is read while a take records */
const SAMPLE_MS = 50;

const CAMERA_KEY = "musickit.content.camera";
/** where the tool sits over the camera, and whether its controls show: kept in this browser */
const LOOK_KEY = "musickit.content.toolLook";
const CONTROLS_KEY = "musickit.content.toolControls";
const stored = (key: string): unknown => { try { const v = localStorage.getItem(key); return v === null ? null : JSON.parse(v); } catch { return null; } };
const store = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* this visit only */ } };
const btn = "rounded-md bg-slate-800 px-3 py-1 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40";
const rec = "inline-flex items-center gap-2 rounded-md bg-rose-700 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-40";
const input = "rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export interface RecordFor {
  tool: string;
  /** the steps ticked when the page opened */
  steps: string[];
  /** opened from a curated block's tool cell: This block only is offered, and ticked */
  block: { id: string; cell: number; title: string } | null;
}

export default function RecordVideo({ target, videos, children, drawn }: {
  target: RecordFor;
  videos: ContentVideoInfo[];
  /** the tool drawn over the camera, or a line saying why there is none */
  children: ReactNode;
  /** the settings of the tool in `children`: a tool with an overlay has its beat saved with the take, to be drawn over the video in step */
  drawn: PlanTool | null;
}) {
  const { tool, block } = target;
  const groups = stepGroups(tool);
  const all = groups.flatMap((g) => g.steps);
  const laddered = all.some((s) => s.step !== null);
  const names = new Map(all.map((s) => [s.step, s.name]));
  const [phase, setPhase] = useState<Phase>("off");
  const [problem, setProblem] = useState("");
  const [take, setTake] = useState<Take | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState(`${toolName(tool)}${block ? ` · ${block.title}` : ""}`);
  const [note, setNote] = useState("");
  const [ticked, setTicked] = useState<string[]>(target.steps);
  const [own, setOwn] = useState(block !== null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState(() => { try { return localStorage.getItem(CAMERA_KEY) ?? ""; } catch { return ""; } });
  const [toolShown, setToolShown] = useState(true);
  const [look, setLookState] = useState<Look>(() => readLook(stored(LOOK_KEY), DEFAULT_LOOK));
  const setLook = (part: Partial<Look>) => setLookState((l) => { const next = { ...l, ...part }; store(LOOK_KEY, next); return next; });
  const [controlsShown, setControlsShownState] = useState(() => stored(CONTROLS_KEY) !== false);
  const setControlsShown = (on: boolean) => { setControlsShownState(on); store(CONTROLS_KEY, on); };
  const free = look.place === "free";
  const frame = useRef<HTMLDivElement | null>(null);
  // Free: the bar on top of the tool moves it, the corner sizes it, as shares of the camera's picture; kept when let go
  const dragBox = (mode: "move" | "size") => (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height || e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    const panel = el.parentElement?.getBoundingClientRect();
    // the height follows the scaled tool (`Scaled`): read it off the screen, and keep the tool's proportions when sizing
    const box0 = look.box ?? DEFAULT_BOX;
    const from = panel?.height ? { ...box0, h: panel.height / rect.height } : box0;
    const tall = from.h / from.w;
    const [sx, sy] = [e.clientX, e.clientY];
    el.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent) => {
      const dx = (m.clientX - sx) / rect.width;
      const dy = (m.clientY - sy) / rect.height;
      // the corner follows whichever way the pointer went further, across or down
      const w = Math.min(1 - from.x, (1 - from.y) / tall, Math.max(from.w + dx, from.w + dy / tall));
      const box = fitBox(mode === "move" ? { ...from, x: from.x + dx, y: from.y + dy } : { ...from, w, h: w * tall });
      setLookState((l) => ({ ...l, box }));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setLookState((l) => { store(LOOK_KEY, l); return l; });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const canHide = drawn !== null && CONTROLS_TOOLS.includes(drawn.type);
  const stream = useRef<MediaStream | null>(null);
  // the input recorded with the camera, opened apart from it (`openRecordInput`)
  const mic = useRef<RecordInput | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const live = useRef<HTMLVideoElement | null>(null);
  // the live video as state too, so NeckView can read the camera
  const [liveVideo, setLiveVideo] = useState<HTMLVideoElement | null>(null);
  const liveRef = useCallback((el: HTMLVideoElement | null) => { live.current = el; setLiveVideo(el); }, []);
  // optional, for testing: the neck read from printed markers, with effects drawn over the camera (not while recording)
  const [readNeck, setReadNeck] = useState(false);
  // or the OpenCV reader instead: frets and their numbers (NeckCvView); one reader at a time
  const [readCv, setReadCv] = useState(false);
  const [cvFx, setCvFx] = useCv();
  const [fx, setFx] = useFx();
  const [face, setFace] = useFace();
  const takeUrl = useRef("");
  // the take's video and its box (the video and what is drawn over it): what Export with overlay records
  const [takeVideo, setTakeVideo] = useState<HTMLVideoElement | null>(null);
  const takeBox = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState<number | null>(null);
  const stopExport = useRef<AbortController | null>(null);
  // read after hydration: the server has no browser to ask
  const burnable = useSyncExternalStore(noChange, canBurn, () => false);
  const draw = useDrawTool();
  // the tool's beat as it tells it (`useToolClock`), and the take's samples of it
  const beat = useRef<number | null>(null);
  const samples = useRef<Sample[]>([]);
  const onBeat = useCallback((b: number | null) => { beat.current = b; }, []);

  const stopCamera = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; mic.current?.close(); mic.current = null; };
  const listCameras = async () => {
    try { setCameras((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput")); } catch { /* the list stays */ }
  };
  const pickCamera = (id: string) => { setCameraId(id); try { localStorage.setItem(CAMERA_KEY, id); } catch { /* this visit only */ } };

  useEffect(() => () => {
    if (recorder.current?.state === "recording") { recorder.current.onstop = null; recorder.current.stop(); }
    stopCamera();
    if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
  }, []);
  useEffect(() => { if (live.current && (phase === "ready" || phase === "recording")) live.current.srcObject = stream.current; }, [phase]);
  useEffect(() => {
    if (phase !== "recording") return;
    const from = performance.now();
    const id = window.setInterval(() => {
      const s = (performance.now() - from) / 1000;
      setSeconds(s);
      if (s >= MAX_TAKE_SECONDS) recorder.current?.stop();
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);
  // a take not saved for players yet is lost when the page closes: the browser asks first
  const unsaved = take !== null && !take.saved;
  useEffect(() => {
    if (!unsaved) return;
    const ask = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [unsaved]);

  /** Open the app's input for the take (see `openRecordInput`) and put it with the camera's picture. */
  const openMic = async () => {
    mic.current?.close();
    mic.current = null;
    const m = await openRecordInput();
    mic.current = m;
    const video = stream.current?.getVideoTracks() ?? [];
    stream.current = new MediaStream([...video, m.track]);
    if (live.current) live.current.srcObject = stream.current;
  };
  /** The Input list changed while the camera is open: the take records the new input from now on. */
  const switchMic = async () => {
    if (!stream.current || recorder.current?.state === "recording") return;
    setProblem("");
    try { await openMic(); } catch (e) { setProblem(`The microphone didn't open: ${message(e)}. Pick another input, or allow the microphone in the address bar.`); }
  };

  const startCamera = async (id = cameraId) => {
    setProblem("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { setProblem("This browser can't record video."); return; }
    setPhase("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, ...(id ? { deviceId: { exact: id } } : {}) },
        audio: false,
      });
    } catch (e) {
      setPhase("off");
      if (id && e instanceof Error && e.name === "OverconstrainedError") {
        pickCamera("");
        setProblem("The camera picked in the Camera list isn't connected. It's back on Browser default: press Start camera, or pick another camera.");
        return;
      }
      setProblem(`The camera didn't open: ${message(e)}. Allow it in the address bar, then press Start camera.`);
      return;
    }
    try {
      await openMic();
    } catch (e) {
      stopCamera();
      setPhase("off");
      setProblem(`The microphone didn't open: ${message(e)}. Allow it in the address bar or pick another input, then press Start camera.`);
      return;
    }
    setPhase("ready");
    void listCameras();
  };

  const record = () => {
    const s = stream.current;
    if (!s) return;
    const type = pickVideoType((t) => MediaRecorder.isTypeSupported(t));
    const chunks: Blob[] = [];
    let r: MediaRecorder;
    try { r = new MediaRecorder(s, type ? { mimeType: type } : undefined); } catch (e) { setProblem(`The recording didn't start: ${message(e)}.`); return; }
    let from = 0;
    let sampler = 0;
    const tool = drawn && hasOverlay(drawn) ? drawn : null;
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onerror = () => setProblem("The recording stopped with an error. Record the take again.");
    r.onstart = () => {
      from = performance.now();
      samples.current = [];
      if (!tool) return;
      const read = () => samples.current.push({ t: (performance.now() - from) / 1000, beat: beat.current });
      read();
      sampler = window.setInterval(read, SAMPLE_MS);
    };
    r.onstop = () => {
      window.clearInterval(sampler);
      // a tool never started in the take has nothing to show in step: the video plays without it
      const overlay = tool && samples.current.some((x) => x.beat !== null) ? { tool, clock: squeeze(samples.current) } : null;
      const recorded = r.mimeType || type || "video/webm";
      const blob = new Blob(chunks, { type: recorded });
      if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
      takeUrl.current = URL.createObjectURL(blob);
      const settings = s.getVideoTracks()[0]?.getSettings();
      setTake({ id: crypto.randomUUID(), blob, type: recorded, seconds: Math.max(1, Math.round((performance.now() - from) / 1000)), url: takeUrl.current, width: settings?.width ?? 0, height: settings?.height ?? 0, fileUp: false, saved: false, overlay, burned: null });
      setDone("");
      setPhase(stream.current ? "ready" : "off");
    };
    recorder.current = r;
    r.start(1000);
    setSeconds(0);
    setProblem("");
    setPhase("recording");
  };

  // R records and stops, unless typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key.toLowerCase() !== "r" || e.repeat || e.metaKey || e.ctrlKey || e.altKey || el?.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      if (phase === "ready" && !sending && exporting === null) record();
      else if (phase === "recording") recorder.current?.stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const steps: string[] | null = laddered ? all.flatMap((s) => (s.step !== null && ticked.includes(s.step) ? [s.step] : [])) : null;
  const losers = own ? [] : wouldLose(tool, steps, videos);
  const byId = new Map(videos.map((v) => [v.id, v]));
  const levelsOf = (list: string[]) => list.map((s) => names.get(s) ?? s).join(", ");
  const nothingTicked = !own && laddered && !steps?.length;

  /** Play the take once and record it with the tool and the neck effects over it burned in. */
  const exportTake = async () => {
    const box = takeBox.current;
    if (!take || !takeVideo || !box || exporting !== null || sending || take.saved) return;
    setProblem("");
    const ctrl = new AbortController();
    stopExport.current = ctrl;
    setExporting(0);
    try {
      const burned = await burnOverlay(box, takeVideo, take.seconds, { onProgress: setExporting, signal: ctrl.signal });
      // a new file: an upload of the plain take started before is not reused
      setTake((t) => (t && t.id === take.id ? { ...t, burned, id: crypto.randomUUID(), fileUp: false } : t));
    } catch (e) {
      setProblem(e instanceof Error && e.name === "NotAllowedError"
        ? "The export didn't start: the share dialog was closed. Press Export with overlay, then pick this tab."
        : `The take wasn't exported: ${message(e)}`);
    } finally {
      stopExport.current = null;
      setExporting(null);
    }
  };

  const save = async () => {
    if (!take || sending || nothingTicked || exporting !== null) return;
    if (!take.width || !take.height) { setProblem("The take's picture size couldn't be read. Record the take again."); return; }
    setProblem("");
    setSending(true);
    // the exported take has the tool in its picture: it is saved with no overlay, so the tool isn't drawn twice
    const file = take.burned ?? take;
    const out = await saveContentVideo({
      id: take.id, blob: file.blob, type: file.type, title: title.trim() || toolName(tool), note, seconds: take.seconds, width: file.width, height: file.height,
      madeFor: own && block ? block.id : `tool:${tool}`,
      target: own && block ? { kind: "cell", blockId: block.id, cell: block.cell, tool } : { kind: "tool", tool, steps },
      fileUp: take.fileUp,
      // where the tool sits now: the video plays back with it there
      overlay: take.burned ? null : take.overlay && { ...take.overlay, look },
    });
    setSending(false);
    if (!out.ok) {
      setTake((t) => (t && t.id === take.id ? { ...t, fileUp: out.fileUp } : t));
      setProblem(out.error);
      return;
    }
    setTake((t) => (t && t.id === take.id ? { ...t, fileUp: true, saved: true } : t));
    const where = own && block ? `with ${block.title} only` : steps === null ? `with every exercise that uses ${toolName(tool)}` : `with ${toolName(tool)} at ${levelsOf(steps)}`;
    const lost = out.lost.map((l) => `“${l.title}” no longer shows at ${l.steps.length ? levelsOf(l.steps) : "this tool"}${l.emptied ? " and now shows nowhere" : ""}.`).join(" ");
    setDone(`Saved. Players see it now ${where}. ${lost}`.trim());
  };

  const camera = phase === "ready" || phase === "recording";
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "off" && <button type="button" onClick={() => void startCamera()} className={btn}>Start camera</button>}
        {phase === "starting" && <span className="text-slate-400">Starting the camera…</span>}
        {phase === "ready" && <button type="button" onClick={record} disabled={sending || exporting !== null} className={rec}><span className="size-2 rounded-full bg-white" />{take ? "Record again" : "Record"} <kbd className="rounded bg-rose-900/80 px-1 text-xs font-normal">R</kbd></button>}
        {phase === "recording" && <button type="button" onClick={() => recorder.current?.stop()} className={rec}><span className="size-2 bg-white" />Stop <kbd className="rounded bg-rose-900/80 px-1 text-xs font-normal">R</kbd></button>}
        {phase === "recording" && <span className="font-mono tabular-nums text-rose-300">{clockTime(seconds)}</span>}
        {phase === "ready" && <button type="button" onClick={() => { stopCamera(); setPhase("off"); }} className={btn}>Close camera</button>}
        {phase !== "recording" && (
          <label className="flex items-center gap-1.5 text-slate-300" title="The list fills once the camera has been allowed. Changing it restarts the camera.">Camera
            <select value={cameraId} onFocus={() => void listCameras()} onChange={(e) => { const id = e.target.value; pickCamera(id); if (phase === "ready") { stopCamera(); void startCamera(id); } }} className={`${input} max-w-48`}>
              <option value="">Browser default</option>
              {cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
              {cameraId && !cameras.some((c) => c.deviceId === cameraId) && <option value={cameraId}>Last picked camera</option>}
            </select>
          </label>
        )}
        {phase !== "recording" && <RecordInputSelect onPick={() => void switchMic()} />}
        <label className="flex items-center gap-1.5 text-slate-300"><input type="checkbox" checked={toolShown} onChange={(e) => setToolShown(e.target.checked)} className="accent-emerald-500" /> Tool over the camera</label>
        <label className="flex items-center gap-1.5 text-slate-300" title="Draws the neck markers, your fingertips and the effects ticked over the camera and the take. Not while recording: Export with overlay puts them in the take. Needs ArUco markers (ARUCO_MIP_36h12) stuck on the guitar.">
          <input type="checkbox" checked={readNeck} onChange={(e) => { setReadNeck(e.target.checked); if (e.target.checked) setReadCv(false); }} className="accent-sky-500" /> Read the neck
        </label>
        <label className="flex items-center gap-1.5 text-slate-300" title="Finds the fret markers with OpenCV and draws each fret with its number above and below. Turns Read the neck off. OpenCV downloads the first time, about 10 MB.">
          <input type="checkbox" checked={readCv} onChange={(e) => { setReadCv(e.target.checked); if (e.target.checked) setReadNeck(false); }} className="accent-sky-500" /> Read the neck (OpenCV)
        </label>
      </div>
      {readNeck && <FxControls fx={fx} set={setFx} />}
      {readCv && <CvControls cv={cvFx} set={setCvFx} />}
      <FaceControls face={face} set={setFace} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-300">
        <label className="flex items-center gap-1.5">Place
          <select value={look.place} onChange={(e) => setLook({ place: e.target.value as Look["place"] })} className={input}>{PLACES.map((p) => <option key={p} value={p}>{PLACE_WORDS[p]}</option>)}</select>
        </label>
        <label className="flex items-center gap-1.5" title={free ? "With Free, drag the corner of the tool to size it." : undefined}>Size
          <select value={look.size} disabled={free} onChange={(e) => setLook({ size: e.target.value as Look["size"] })} className={`${input} disabled:opacity-40`}>{SIZES.map((s) => <option key={s} value={s}>{SIZE_WORDS[s]}</option>)}</select>
        </label>
        <label className="flex items-center gap-1.5">Background
          <select value={look.bg} onChange={(e) => setLook({ bg: e.target.value as Look["bg"] })} className={input}>{BGS.map((b) => <option key={b} value={b}>{BG_WORDS[b]}</option>)}</select>
        </label>
        <label className="flex items-center gap-1.5" title={canHide ? "With the controls hidden, press Space to start and stop the tool." : "This tool's controls can't be hidden yet."}>
          <input type="checkbox" checked={canHide ? controlsShown : true} disabled={!canHide} onChange={(e) => setControlsShown(e.target.checked)} className="accent-emerald-500" /> Tool controls
        </label>
        {free && <span className="text-xs text-slate-500">Drag the bar on top of the tool to move it, and its corner to size it.</span>}
        {canHide && !controlsShown && <span className="text-xs text-slate-500">Press Space to start and stop the tool.</span>}
      </div>
      {phase === "ready" && take && !take.saved && <p className="text-xs text-slate-500">A new recording replaces the take below.</p>}
      {problem && <p role="alert" className="text-rose-400">{problem}</p>}

      <div ref={frame} className="relative w-full max-w-5xl overflow-hidden rounded-lg bg-black">
        {camera ? <video ref={liveRef} autoPlay muted playsInline className="aspect-video w-full object-cover" /> : <div className="flex aspect-video w-full items-center justify-center text-slate-500">{phase === "starting" ? "Starting the camera…" : "Press Start camera above to see the camera here."}</div>}
        {phase === "recording" && <span className="absolute left-2 top-2 rounded bg-rose-700 px-1.5 text-xs text-white">● Recording</span>}
        {/* not while recording: the hand and face models would compete with the recorder and the tool's beat */}
        {camera && phase !== "recording" && <FaceView video={liveVideo} face={face} fit="cover" />}
        {camera && readNeck && phase !== "recording" && <NeckView video={liveVideo} fx={fx} live fit="cover" />}
        {camera && readCv && phase !== "recording" && <NeckCvView video={liveVideo} markers={fx.markers} cv={cvFx} live fit="cover" />}
        {/* one tree for every place, so changing the place never restarts the tool */}
        <div className={`${free ? "absolute" : panelClass(look, "record")} ${toolShown ? "" : "hidden"}`} style={panelStyle(look)}>
          <div className={free ? `${panelBg(look)} pt-4` : undefined}>
            <Scaled on={free} className="p-2"><NoAutoScroll><ToolControls hidden={canHide && !controlsShown}><ToolClockListener onBeat={onBeat}>{children}</ToolClockListener></ToolControls></NoAutoScroll></Scaled>
          </div>
          {free && <div onPointerDown={dragBox("move")} title="Drag to move the tool" className="absolute inset-x-0 top-0 h-4 cursor-move touch-none bg-slate-600/80 hover:bg-slate-500/90"><span className="mx-auto mt-1.5 block h-1 w-10 rounded-full bg-slate-300/70" /></div>}
          {free && <div onPointerDown={dragBox("size")} title="Drag to size the tool" className="absolute bottom-0 right-0 size-5 cursor-se-resize touch-none border-b-4 border-r-4 border-slate-300/80 hover:border-white" />}
        </div>
      </div>

      {take && phase !== "recording" && (
        <section className="flex flex-col gap-3 rounded-xl border border-slate-800 p-3">
          <h2 className="font-semibold text-slate-100">The take · {clockTime(take.seconds)}</h2>
          {/* framed like the camera above, so the tool sits where it sat there */}
          <div ref={takeBox} className="relative isolate aspect-video w-full max-w-3xl overflow-hidden rounded bg-black">
            <video key={take.url} ref={setTakeVideo} src={take.url} controls playsInline className="absolute inset-0 h-full w-full object-cover"
              onLoadedMetadata={(e) => { const { videoWidth, videoHeight } = e.currentTarget; if (videoWidth && videoHeight) setTake((t) => (t && t.url === take.url ? { ...t, width: videoWidth, height: videoHeight } : t)); }} />
            <FaceView key={`face-${take.url}`} video={takeVideo} face={face} fit="cover" bare={exporting !== null} />
            {readNeck && <NeckView key={take.url} video={takeVideo} fx={fx} fit="cover" bare={exporting !== null} />}
            {readCv && <NeckCvView key={take.url} video={takeVideo} markers={fx.markers} cv={cvFx} fit="cover" bare={exporting !== null} />}
            {take.overlay && draw && <ToolOverVideo video={takeVideo} overlay={{ ...take.overlay, look }} draw={draw} hidden={!toolShown} />}
          </div>
          <p className="text-xs text-slate-400">{take.burned ? "Exported with overlay: players see this take with the tool and the effects in the picture." : overlayWords(take.overlay, drawn)}</p>
          {!take.saved && (
            <div className="flex flex-wrap items-center gap-2">
              {exporting !== null ? (
                <>
                  <span className="font-mono text-xs tabular-nums text-sky-300">Exporting… {Math.round(exporting * 100)}%</span>
                  <button type="button" onClick={() => stopExport.current?.abort()} className={btn}>Stop export</button>
                </>
              ) : burnable ? (
                <button type="button" onClick={() => void exportTake()} disabled={sending} className={btn}>{take.burned ? "Export with overlay again" : "Export with overlay"}</button>
              ) : <span className="text-xs text-slate-500">This browser can&apos;t export the overlay. Use Chrome 132 or newer.</span>}
              {take.burned && exporting === null && <button type="button" onClick={() => setTake((t) => (t && t.id === take.id ? { ...t, burned: null, id: crypto.randomUUID(), fileUp: false } : t))} disabled={sending} className={btn}>Use the take without overlay</button>}
              {exporting === null && <span className="text-xs text-slate-500">Export plays the take once and records it with what is over it now: the tool, and the neck effects with Read the neck on. Pick this tab in the share dialog and keep it in front until the take ends.</span>}
            </div>
          )}
          <label className="flex max-w-xl flex-col gap-1 text-xs text-slate-400">Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} disabled={take.saved} className={input} /></label>
          <label className="flex max-w-xl flex-col gap-1 text-xs text-slate-400">Note: what the video shows<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} disabled={take.saved} className={input} /></label>

          <fieldset className="flex flex-col gap-1.5" disabled={take.saved}>
            <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Show this video with</legend>
            {block && (
              <label className="flex items-center gap-1.5 text-slate-300"><input type="radio" checked={own} onChange={() => setOwn(true)} className="accent-emerald-500" /> This block only: {block.title}</label>
            )}
            {block && <label className="flex items-center gap-1.5 text-slate-300"><input type="radio" checked={!own} onChange={() => setOwn(false)} className="accent-emerald-500" /> {toolName(tool)} in every exercise, at the levels ticked</label>}
            {!own && laddered && (
              <div className="flex flex-col gap-1 pl-1">
                <div className="flex gap-1">
                  <button type="button" onClick={() => setTicked(all.flatMap((s) => (s.step ? [s.step] : [])))} className={btn}>All levels</button>
                  <button type="button" onClick={() => setTicked([])} className={btn}>None</button>
                </div>
                {groups.map((g) => (
                  <div key={g.ladder ?? g.label} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="w-full text-xs text-slate-500">{g.label}</span>
                    {g.steps.map((s) => s.step !== null && (
                      <label key={s.step} className="flex items-center gap-1.5 text-slate-300">
                        <input type="checkbox" checked={ticked.includes(s.step)} onChange={(e) => setTicked((t) => (e.target.checked ? [...t, s.step!] : t.filter((x) => x !== s.step)))} className="accent-emerald-500" />
                        {s.name}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {!own && !laddered && <p className="text-slate-300">Every exercise that uses {toolName(tool)}. This tool has no levels.</p>}
          </fieldset>
          {!take.saved && losers.length > 0 && (
            <ul className="text-xs text-amber-200">
              {losers.map((l) => <li key={l.id}>Saving takes {l.steps ? levelsOf(l.steps) : "this tool"} off “{byId.get(l.id)?.title ?? "another video"}”.</li>)}
            </ul>
          )}
          {!take.saved && own && block && <p className="text-xs text-slate-400">This replaces the video this block had for this tool, if it had one. The old video is kept.</p>}
          {nothingTicked && !take.saved && <p className="text-xs text-amber-200">Tick at least one level, or press All levels.</p>}
          <div className="flex flex-wrap items-center gap-2">
            {!take.saved && <button type="button" onClick={() => void save()} disabled={sending || nothingTicked || exporting !== null} className={btn}>{sending ? "Uploading…" : take.fileUp ? "Save for players again" : "Save for players"}</button>}
            {done && <p role="status" className="text-slate-200">{done}</p>}
            {take.saved && <Link href={`/admin/content/videos#${encodeURIComponent(tool)}`} className="text-sky-400 hover:underline">Back to Tools videos</Link>}
          </div>
        </section>
      )}
    </div>
  );
}

/** What the take panel says about the tool over the video. */
function overlayWords(overlay: Overlay | null, drawn: PlanTool | null): string {
  if (overlay) return "The tool's Play and Stop are saved with the take: players see the tool move with the video.";
  if (drawn && hasOverlay(drawn)) return "The tool wasn't started during the take, so players see the video without it. To show it, record again and press Play on the tool.";
  return "Players see the video without the tool: only the guitar play-along and the melody singer are drawn over a video.";
}
