"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { getAudioContext, openRecordInput, wakeAudio, type RecordInput } from "@/features/sound";
import RecordInputSelect from "@/components/RecordInputSelect";
import { NumberField } from "@/components/ui";
import RecordSoundSelect, { useRecordSound } from "@/components/RecordSoundSelect";
import { clockTime } from "@/features/recorder/recorder";
import { MAX_TAKE_SECONDS, pickVideoType, videoFileName } from "@/features/videos/recording";
import { ToolClockListener } from "@/components/practice/toolClock";
import { NoAutoScroll } from "@/components/practice/bringIntoView";
import { CONTROLS_TOOLS, ToolControls } from "@/components/practice/toolControls";
import type { PlanTool } from "@/features/plan/model/tools";
import { CvControls, FxControls, NeckCvView, NeckView, useCv, useFx } from "@/features/neckFx";
import { saveContentVideo } from "../client/api";
import { startFaceCam, type FaceCam } from "../client/faceCam";
import { FACE_CORNERS, FACE_SIZES, readFaceLook, type FaceLook } from "../model/faceCircle";
import { burnOverlay, canBurn, noChange, type Burned } from "../client/burn";
import { startClick } from "../client/click";
import { deleteKeptTake, getKeptTake, saveKeptTake, type KeptTake, type NeckRead, type TakeLog } from "../client/takes";
import { ToolOverVideo, useDrawTool } from "./OverlayVideo";
import type { Sample } from "../model/clock";
import { BGS, DEFAULT_BOX, DEFAULT_LOOK, NARROW_BOX, PLACES, SIZES, hasOverlay, readLook, type Look } from "../model/overlay";
import { takeKey } from "../model/takeKey";
import { takeOverlay, withClickOverlay } from "../model/takeClock";
import { BG_WORDS, PLACE_WORDS, SIZE_WORDS } from "./lookPanel";
import ToolBox, { LiveView, ViewOverTake } from "./ToolBox";
import { TOOL_VIEW, takeClock, useKitView, useTakeNotes, type RecordKit } from "./kit";
import BeatView from "./BeatView";
import DetectLog, { addNeckRead } from "./DetectLog";
import { stepGroups, toolName, wouldLose } from "../model/coverage";
import type { ContentVideoInfo } from "../server/access";

/**
 * The record page's recorder (/admin/content/videos/record): the camera fills the frame and the tool (`children`, drawn by
 * the page) sits over it, started and stopped with its own controls, or played to the click. Record and Stop (or R), the
 * take to watch back, its title and note, the levels it is for (or This block only, when opened from a block's tool) with
 * which video loses a level, and Save for players. The take is kept in this browser, one per target (`takeKey`), until the
 * next one replaces it; the one it replaced can be brought back until the page closes.
 */

type Phase = "off" | "starting" | "ready" | "recording";
/** where the take on screen stands in this browser's storage */
type Stored = "saving" | "saved" | "failed";

/** how often the tool's beat is read while a take records */
const SAMPLE_MS = 50;
/** the click's typed tempo, for tools with no tempo: kept in this browser */
const CLICK_KEY = "musickit.content.click";
/** the click's on/off for one tool (`musickit.content.click.<tool>`): kept in this browser, and wins over the page's default */
const clickOnKey = (tool: string) => `${CLICK_KEY}.${tool}`;
interface ClickChoice { bpm?: number }
const clampBpm = (n: number) => Math.min(300, Math.max(30, Math.round(n) || 80));

const CAMERA_KEY = "musickit.content.camera";
/** the second camera, on the face, and where its circle sits: kept in this browser */
const FACE_CAMERA_KEY = "musickit.content.faceCamera";
const FACE_LOOK_KEY = "musickit.content.faceLook";
const CORNER_WORDS: Record<FaceLook["corner"], string> = { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right" };
const FACE_SIZE_WORDS: Record<FaceLook["size"], string> = { small: "Small", medium: "Medium", large: "Large" };
/** where the tool sits over the camera, and whether its controls show: kept in this browser */
const LOOK_KEY = "musickit.content.toolLook";
const CONTROLS_KEY = "musickit.content.toolControls";
/** tools far narrower than a Free box (a row of chord boxes): laid out at their own width there, not `FREE_WIDTH` */
const NARROW_TOOLS: readonly string[] = ["chord-shapes"];
const stored = (key: string): unknown => { try { const v = localStorage.getItem(key); return v === null ? null : JSON.parse(v); } catch { return null; } };
const store = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* this visit only */ } };
const btn = "rounded-md bg-slate-800 px-3 py-1 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40";
const rec = "inline-flex items-center gap-2 rounded-md bg-rose-700 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-40";
const input = "rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200";
const group = "flex min-w-0 flex-col gap-2 rounded-lg border border-slate-800 p-3 text-slate-300";
const legend = "px-1 text-xs font-medium uppercase tracking-wide text-slate-500";
/** Show the take at `t` seconds, paused. */
const seek = (v: HTMLVideoElement, t: number) => { v.currentTime = t; v.pause(); };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export interface RecordFor {
  tool: string;
  /** the steps ticked when the page opened */
  steps: string[];
  /** opened from a curated block's tool cell: This block only is offered, and ticked */
  block: { id: string; cell: number; title: string } | null;
}

export default function RecordVideo({ target, videos, children, drawn, tempo, oldTakeKey, kit }: {
  target: RecordFor;
  videos: ContentVideoInfo[];
  /** the tool drawn over the camera, or a line saying why there is none */
  children: ReactNode;
  /** the settings of the tool in `children`: a tool with an overlay has its beat saved with the take, to be drawn over the video in step */
  drawn: PlanTool | null;
  /** the tool's tempo and length: the click plays at it, on by default when `click` says so (off when absent). None: the click is off by default and its tempo is typed */
  tempo?: { bpm: number; bars: number; click?: boolean };
  /** where an older page kept this target's take (a riff's block id): opened when none is kept under its take key */
  oldTakeKey?: string;
  /** what the tool gives beside its drawing: other views for its box, its notes for the neck readers, what to offer on a take */
  kit?: RecordKit;
}) {
  const { tool, block } = target;
  const key = takeKey(target);
  const groups = stepGroups(tool);
  const all = groups.flatMap((g) => g.steps);
  const laddered = all.some((s) => s.step !== null);
  const names = new Map(all.map((s) => [s.step, s.name]));
  const [phase, setPhase] = useState<Phase>("off");
  const [problem, setProblem] = useState("");
  // the take on screen and its address for the player (this page only, let go of when replaced)
  const [shown, setShown] = useState<{ take: KeptTake; url: string } | null>(null);
  const take = shown?.take ?? null;
  const url = shown?.url ?? "";
  const [inBrowser, setInBrowser] = useState<Stored>("saved");
  // the take a new recording replaced, kept in memory until the next recording, so a worse retake can be undone
  const [previous, setPrevious] = useState<KeptTake | null>(null);
  // the take on screen for `record`'s stop, which runs after renders it didn't see
  const latest = useRef<KeptTake | null>(null);
  useEffect(() => { latest.current = take; }, [take]);
  const [clickChoice, setClickChoice] = useState<ClickChoice>(() => { const v = stored(CLICK_KEY); return v && typeof v === "object" ? (v as ClickChoice) : {}; });
  const pickClick = (part: ClickChoice) => setClickChoice((c) => { const next = { ...c, ...part }; store(CLICK_KEY, next); return next; });
  // the on/off picked for this tool, else the one stored for it, else the page's default
  const [clickOn, setClickOn] = useState<{ tool: string; on: boolean } | null>(null);
  const pickClickOn = (on: boolean) => { setClickOn({ tool, on }); store(clickOnKey(tool), on); };
  const storedOn = stored(clickOnKey(tool));
  const click = (clickOn?.tool === tool ? clickOn.on : null) ?? (typeof storedOn === "boolean" ? storedOn : null) ?? tempo?.click ?? false;
  const bpm = tempo?.bpm ?? clampBpm(clickChoice.bpm ?? 80);
  const [countIn, setCountIn] = useState(1);
  // the expected length follows the tool's until it is typed in
  const [typedLength, setLength] = useState<number | null>(null);
  const length = typedLength ?? tempo?.bars ?? 4;
  const stopClick = useRef<(() => void) | null>(null);
  const endClick = () => { stopClick.current?.(); stopClick.current = null; };
  // the click's grid while recording to it, and where the playing stands on it, read every frame
  const grid = useRef<{ anchor: number; period: number; countIn: number; bars: number } | null>(null);
  const [beatNow, setBeatNow] = useState<{ beat: number; bars: number; countIn: number } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState(`${toolName(tool)}${block ? ` · ${block.title}` : ""}`);
  const [note, setNote] = useState("");
  const [ticked, setTicked] = useState<string[]>(target.steps);
  const [own, setOwn] = useState(block !== null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState(() => { try { return localStorage.getItem(CAMERA_KEY) ?? ""; } catch { return ""; } });
  // "": no face camera; else its device id
  const [faceId, setFaceId] = useState(() => { try { return localStorage.getItem(FACE_CAMERA_KEY) ?? ""; } catch { return ""; } });
  const [faceLook, setFaceLookState] = useState<FaceLook>(() => readFaceLook(stored(FACE_LOOK_KEY)));
  const setFaceLook = (part: Partial<FaceLook>) => setFaceLookState((l) => { const next = { ...l, ...part }; store(FACE_LOOK_KEY, next); return next; });
  const faceStream = useRef<MediaStream | null>(null);
  // the guitar camera with the face circle, drawn on a canvas: what the take records while the face camera is open
  const faceCam = useRef<FaceCam | null>(null);
  const [faceOpen, setFaceOpen] = useState(false);
  const faceHolder = useRef<HTMLDivElement | null>(null);
  const [toolShown, setToolShown] = useState(true);
  const [look, setLookState] = useState<Look>(() => readLook(stored(LOOK_KEY), DEFAULT_LOOK));
  const setLook = (part: Partial<Look>) => setLookState((l) => { const next = { ...l, ...part }; store(LOOK_KEY, next); return next; });
  const [controlsShown, setControlsShownState] = useState(() => stored(CONTROLS_KEY) !== false);
  const setControlsShown = (on: boolean) => { setControlsShownState(on); store(CONTROLS_KEY, on); };
  const free = look.place === "free";
  // a narrow tool is laid out at its own width when Free, so it fills the box instead of sitting in its corner
  const narrow = drawn !== null && NARROW_TOOLS.includes(drawn.type);
  const unsetBox = narrow ? NARROW_BOX : DEFAULT_BOX;
  const frame = useRef<HTMLDivElement | null>(null);
  // a kit view picked in the View list is drawn in the tool's box instead of the tool, which stays mounted, hidden
  const [kitView, viewId, pickView] = useKitView(tool, kit);
  const canHide = drawn !== null && CONTROLS_TOOLS.includes(drawn.type);
  const stream = useRef<MediaStream | null>(null);
  // the input recorded with the camera, opened apart from it (`openRecordInput`)
  const mic = useRef<RecordInput | null>(null);
  // the looper's guitar and vocal effects on that input: the take records it through them
  const sound = useRecordSound();
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
  // a kit view's beat over the camera: the click's while recording to it, else the tool's
  const liveBeat = useCallback(() => {
    const g = grid.current;
    return g ? (getAudioContext().currentTime - g.anchor) / g.period - g.countIn * 4 : beat.current;
  }, []);
  // the take's clock (its overlay's, else the click's grid) and the kit's notes timed onto it, for the neck readers and the log
  const clock = useMemo(() => takeClock(take?.overlay, take?.click), [take?.overlay, take?.click]);
  const notes = useTakeNotes(kit, clock, take?.seconds ?? 0);
  // over the camera, the kit's notes on the beat the kit views read (the click's while recording to it, else the tool's), in
  // seconds at the tempo, so Read the neck (OpenCV) lights each note on its place in time with the playing
  const liveClock = useCallback(() => { const b = liveBeat(); return b === null ? null : (b * 60) / bpm; }, [liveBeat, bpm]);
  const liveNotes = useTakeNotes(kit, useMemo(() => [[0, 0, bpm / 60]], [bpm]), MAX_TAKE_SECONDS);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; mic.current?.close(); mic.current = null;
    faceStream.current?.getTracks().forEach((t) => t.stop()); faceStream.current = null; setFaceOpen(false);
  };
  const listCameras = async () => {
    try { setCameras((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput")); } catch { /* the list stays */ }
  };
  const pickCamera = (id: string) => { setCameraId(id); try { localStorage.setItem(CAMERA_KEY, id); } catch { /* this visit only */ } };
  const pickFace = (id: string) => { setFaceId(id); try { localStorage.setItem(FACE_CAMERA_KEY, id); } catch { /* this visit only */ } };

  /** Put a take (or none) on screen, letting go of the last one's address. */
  const show = useCallback((t: KeptTake | null) => {
    if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
    takeUrl.current = t ? URL.createObjectURL(t.blob) : "";
    setShown(t ? { take: t, url: takeUrl.current } : null);
  }, []);
  const keep = async (t: KeptTake) => {
    setInBrowser("saving");
    try { await saveKeptTake(t); setInBrowser("saved"); } catch (e) { setInBrowser("failed"); setProblem(`The browser didn't store this take: ${message(e)}. Press Save to try again, or Save file to keep it on disk.`); }
  };
  /** Change the shown take's detection log; it is stored in this browser a moment after the last change. */
  const onNeckRead = useCallback((r: NeckRead) => setShown((s) => {
    if (!s) return s;
    const log: TakeLog = s.take.log ?? {};
    const neck = addNeckRead(log.neck ?? [], r);
    return neck === log.neck ? s : { ...s, take: { ...s.take, log: { ...log, neck } } };
  }), []);
  const loggedTake = take?.log ? take : null;
  useEffect(() => {
    if (!loggedTake) return;
    const id = window.setTimeout(() => {
      saveKeptTake(loggedTake).catch((e: unknown) => setProblem(`The detection log wasn't saved in this browser: ${message(e)}. Copy log keeps it.`));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [loggedTake]);

  // the take kept for this target; one an older page kept (`oldTakeKey`) is kept under the take key from its next change.
  // One recorded to the click with no overlay (the old riff Take panel's) gets the tool as drawn when it opens, on the click's grid
  const drawnNow = useRef(drawn);
  useEffect(() => { drawnNow.current = drawn; }, [drawn]);
  useEffect(() => {
    let gone = false;
    void getKeptTake(key, oldTakeKey).then((t) => { if (!gone && t) { show(withClickOverlay({ ...t, id: key }, drawnNow.current)); setInBrowser("saved"); } });
    return () => { gone = true; };
  }, [key, oldTakeKey, show]);
  useEffect(() => () => {
    endClick();
    if (recorder.current?.state === "recording") { recorder.current.onstop = null; recorder.current.stop(); }
    stopCamera();
    if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
  }, []);
  useEffect(() => { if (live.current && (phase === "ready" || phase === "recording")) live.current.srcObject = stream.current; }, [phase]);
  // the face camera open and the guitar camera on screen: draw both on one canvas, shown over the guitar camera
  useEffect(() => {
    const face = faceStream.current;
    if (!faceOpen || !face || !liveVideo) return;
    const cam = startFaceCam(liveVideo, face, faceLook, setProblem);
    cam.canvas.className = "absolute inset-0 h-full w-full object-cover";
    faceHolder.current?.appendChild(cam.canvas);
    faceCam.current = cam;
    return () => { cam.stop(); cam.canvas.remove(); faceCam.current = null; };
    // the look changes through setLook, below, without restarting the canvas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceOpen, liveVideo]);
  useEffect(() => { faceCam.current?.setLook(faceLook); }, [faceLook]);
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
  // a take neither saved for players nor kept in this browser is lost when the page closes: the browser asks first
  const unsaved = take !== null && !take.saved && inBrowser !== "saved";
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
    const m = await openRecordInput({ through: sound.through });
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

  const startCamera = async (id = cameraId, faceFrom = faceId) => {
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
    if (faceFrom) await openFace(faceFrom);
    setPhase("ready");
    void listCameras();
  };

  /** Open the face camera beside the guitar camera; if it won't open, the guitar camera records alone and the page says why. */
  const openFace = async (id: string) => {
    faceStream.current?.getTracks().forEach((t) => t.stop());
    faceStream.current = null;
    setFaceOpen(false);
    const guitar = stream.current?.getVideoTracks()[0]?.getSettings().deviceId;
    if (guitar && guitar === id) { setProblem("The face camera is the same camera as the Camera list. Pick another face camera."); return; }
    try {
      faceStream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, deviceId: { exact: id } }, audio: false });
      setFaceOpen(true);
    } catch (e) {
      if (e instanceof Error && e.name === "OverconstrainedError") { pickFace(""); setProblem("The face camera isn't connected. Face camera is back on None."); return; }
      setProblem(`The face camera didn't open: ${message(e)}. The take records the guitar camera only.`);
    }
  };

  // a Record press (or R) while the last one is still starting, waiting for the sound to wake, is ignored: one recorder, one click
  const starting = useRef(false);
  const record = async () => {
    if (starting.current || recorder.current?.state === "recording") return;
    starting.current = true;
    try { await startRecording(); } finally { starting.current = false; }
  };
  const startRecording = async () => {
    const cam = stream.current;
    if (!cam) return;
    // with the face camera, the canvas holding both cameras; else the camera itself
    const picture = faceCam.current?.track ?? cam.getVideoTracks()[0];
    const s = new MediaStream([...(picture ? [picture] : []), ...cam.getAudioTracks()]);
    const type = pickVideoType((t) => MediaRecorder.isTypeSupported(t));
    const chunks: Blob[] = [];
    let r: MediaRecorder;
    try { r = new MediaRecorder(s, type ? { mimeType: type } : undefined); } catch (e) { setProblem(`The recording didn't start: ${message(e)}.`); return; }
    // with the click on: beat 1 after the count-in, and the take stops itself a moment after the expected length
    const timed = click;
    const ctx = getAudioContext();
    if (timed) await wakeAudio();
    const period = 60 / bpm;
    const anchor = ctx.currentTime + 0.15;
    const downbeatAt = anchor + countIn * 4 * period;
    let recStart = ctx.currentTime;
    let stopTimer = 0;
    let from = 0;
    let sampler = 0;
    // to the click, the tool needn't be started: its overlay follows the click (`takeOverlay`)
    const sampled = !timed && drawn !== null && hasOverlay(drawn);
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onerror = () => setProblem("The recording stopped with an error. Record the take again.");
    r.onstart = () => {
      recStart = ctx.currentTime;
      from = performance.now();
      samples.current = [];
      if (!sampled) return;
      const read = () => samples.current.push({ t: (performance.now() - from) / 1000, beat: beat.current });
      read();
      sampler = window.setInterval(read, SAMPLE_MS);
    };
    r.onstop = () => {
      window.clearInterval(sampler);
      window.clearTimeout(stopTimer);
      grid.current = null;
      endClick();
      const recorded = r.mimeType || type || "video/webm";
      // a note played on the click reaches the take late by the output and input latency
      const lag = (ctx.outputLatency || ctx.baseLatency || 0) + (mic.current?.latency ?? 0);
      const clicked = timed ? { downbeat: Math.max(0, downbeatAt - recStart + lag), bpm, bars: length } : undefined;
      const settings = faceCam.current ? { width: faceCam.current.canvas.width, height: faceCam.current.canvas.height } : cam.getVideoTracks()[0]?.getSettings();
      const t: KeptTake = {
        id: key, at: Date.now(), blob: new Blob(chunks, { type: recorded }), type: recorded, seconds: Math.max(1, Math.round((performance.now() - from) / 1000)),
        width: settings?.width ?? 0, height: settings?.height ?? 0, fileUp: false, saved: false,
        // a tool never started in a take without the click has nothing to show in step: the video plays without it
        overlay: takeOverlay(drawn, clicked, samples.current), burned: null,
        ...(clicked ? { click: clicked } : {}),
      };
      if (latest.current) setPrevious(latest.current);
      show(t);
      void keep(t);
      setDone("");
      // the camera stays open, so the next take is one press away
      setPhase(stream.current ? "ready" : "off");
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

  // R records and stops, unless typing in a field. Heard first (capture) and marked handled when it acts, so a page's own
  // keys (the riff maker's r for a rest) can leave that press alone
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key.toLowerCase() !== "r" || e.repeat || e.metaKey || e.ctrlKey || e.altKey || el?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (phase === "ready" && !sending && exporting === null) { e.preventDefault(); void record(); }
      else if (phase === "recording") { e.preventDefault(); recorder.current?.stop(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const steps: string[] | null = laddered ? all.flatMap((s) => (s.step !== null && ticked.includes(s.step) ? [s.step] : [])) : null;
  const losers = own ? [] : wouldLose(tool, steps, videos);
  const byId = new Map(videos.map((v) => [v.id, v]));
  const levelsOf = (list: string[]) => list.map((s) => names.get(s) ?? s).join(", ");
  const nothingTicked = !own && laddered && !steps?.length;

  /** Set fields on the take recorded at `at`, on screen and in this browser (over what is stored, so a newer log is kept). */
  const mark = async (at: number, fields: Partial<KeptTake>) => {
    setShown((s) => (s && s.take.at === at ? { ...s, take: { ...s.take, ...fields } } : s));
    setPrevious((p) => (p && p.at === at ? { ...p, ...fields } : p));
    // never over another take: a newer recording may be stored for this target now. The take as pressed only when none is stored.
    const kept = await getKeptTake(key);
    const base = kept ? (kept.at === at ? kept : null) : take && take.at === at ? take : null;
    if (base) { await saveKeptTake({ ...base, ...fields, id: key }); setInBrowser("saved"); }
  };

  /** Play the take once and record it with the tool and the neck effects over it burned in. */
  const exportTake = async () => {
    const box = takeBox.current;
    if (!take || !takeVideo || !box || exporting !== null || sending || take.saved) return;
    setProblem("");
    const ctrl = new AbortController();
    stopExport.current = ctrl;
    setExporting(0);
    let burned: Burned;
    try {
      burned = await burnOverlay(box, takeVideo, take.seconds, { onProgress: setExporting, signal: ctrl.signal });
    } catch (e) {
      setProblem(e instanceof Error && e.name === "NotAllowedError"
        ? "The export didn't start: the share dialog was closed. Press Export with overlay, then pick this tab."
        : `The take wasn't exported: ${message(e)}`);
      return;
    } finally {
      stopExport.current = null;
      setExporting(null);
    }
    // a new file for players: an upload of the plain take started before is not reused
    await mark(take.at, { burned, videoId: undefined, fileUp: false }).catch((e: unknown) => setProblem(`The browser didn't store the take: ${message(e)}.`));
  };
  const dropOverlay = () => {
    if (!take || sending) return;
    void mark(take.at, { burned: null, videoId: undefined, fileUp: false }).catch((e: unknown) => setProblem(`The browser didn't store the take: ${message(e)}.`));
  };

  /** Upload the take: its video id is given and stored first, so a retry reuses it. */
  const save = async () => {
    if (!take || sending || nothingTicked || exporting !== null) return;
    if (!take.width || !take.height) { setProblem("The take's picture size couldn't be read. Record the take again."); return; }
    setProblem("");
    setSending(true);
    try {
      const at = take.at;
      const videoId = take.videoId ?? crypto.randomUUID();
      if (!take.videoId) {
        try { await mark(at, { videoId }); } catch (e) { setProblem(`The browser didn't store this take, so it wasn't uploaded: ${message(e)}. Press Save for players again.`); return; }
      }
      // the exported take has the tool in its picture: it is saved with no overlay, so the tool isn't drawn twice
      const file = take.burned ?? take;
      const out = await saveContentVideo({
        id: videoId, blob: file.blob, type: file.type, title: title.trim() || toolName(tool), note, seconds: take.seconds, width: file.width, height: file.height,
        madeFor: own && block ? block.id : `tool:${tool}`,
        target: own && block ? { kind: "cell", blockId: block.id, cell: block.cell, tool } : { kind: "tool", tool, steps },
        fileUp: take.fileUp,
        // where the tool sits now: the video plays back with it there
        overlay: take.burned ? null : take.overlay && { ...take.overlay, look },
      });
      const fields: Partial<KeptTake> = out.ok ? { fileUp: true, saved: true } : { fileUp: out.fileUp };
      await mark(at, fields).catch((e: unknown) => setProblem(`${out.ok ? "" : `${out.error} `}The browser didn't store where the upload stands: ${message(e)}.`));
      if (!out.ok) { setProblem((p) => p || out.error); return; }
      const where = own && block ? `with ${block.title} only` : steps === null ? `with every exercise that uses ${toolName(tool)}` : `with ${toolName(tool)} at ${levelsOf(steps)}`;
      const lost = out.lost.map((l) => `“${l.title}” no longer shows at ${l.steps.length ? levelsOf(l.steps) : "this tool"}${l.emptied ? " and now shows nowhere" : ""}.`).join(" ");
      setDone(`Saved. Players see it now ${where}. ${lost}`.trim());
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    setProblem("");
    try {
      await deleteKeptTake(key);
      if (oldTakeKey) await deleteKeptTake(oldTakeKey);
      show(null);
      setInBrowser("saved");
      setDone("");
    } catch (e) { setProblem(`The take wasn't deleted: ${message(e)}.`); }
  };

  const download = () => {
    if (!take) return;
    const a = document.createElement("a");
    const file = take.burned;
    const name = title.trim() || toolName(tool);
    a.href = file ? URL.createObjectURL(file.blob) : url;
    a.download = videoFileName(file ? `${name} with overlay` : name, file?.type ?? take.type);
    a.click();
    if (file) window.setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  };

  const undo = () => {
    if (!previous || sending) return;
    show(previous);
    void keep(previous);
    setPrevious(null);
    setDone("");
  };

  const camera = phase === "ready" || phase === "recording";
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "off" && <button type="button" onClick={() => void startCamera()} className={btn}>Start camera</button>}
        {phase === "starting" && <span className="text-slate-400">Starting the camera…</span>}
        {phase === "ready" && <button type="button" onClick={() => void record()} disabled={sending || exporting !== null} className={rec}><span className="size-2 rounded-full bg-white" />{take ? "Record again" : "Record"} <kbd className="rounded bg-rose-900/80 px-1 text-xs font-normal">R</kbd></button>}
        {phase === "recording" && <button type="button" onClick={() => recorder.current?.stop()} className={rec}><span className="size-2 bg-white" />Stop <kbd className="rounded bg-rose-900/80 px-1 text-xs font-normal">R</kbd></button>}
        {phase === "recording" && <span className="font-mono tabular-nums text-rose-300">{clockTime(seconds)}</span>}
        {phase === "ready" && <button type="button" onClick={() => { stopCamera(); setPhase("off"); }} className={btn}>Close camera</button>}
        {previous && phase !== "recording" && <button type="button" onClick={undo} disabled={sending || exporting !== null} className={btn} title={`Recorded ${new Date(previous.at).toLocaleTimeString()}, ${clockTime(previous.seconds)}`}>Back to the previous take</button>}
      </div>
      <div className="grid max-w-5xl gap-3 md:grid-cols-2">
        {phase !== "recording" && (
          <fieldset className={group}>
            <legend className={legend}>Cameras</legend>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-1.5 text-slate-300" title="The list fills once the camera has been allowed. Changing it restarts the camera.">Camera
                <select value={cameraId} onFocus={() => void listCameras()} onChange={(e) => { const id = e.target.value; pickCamera(id); if (phase === "ready") { stopCamera(); void startCamera(id); } }} className={`${input} max-w-48`}>
                  <option value="">Browser default</option>
                  {cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
                  {cameraId && !cameras.some((c) => c.deviceId === cameraId) && <option value={cameraId}>Last picked camera</option>}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-slate-300" title="A second camera on your face: the take shows it as a circle in a corner, cut round your face. Keep this tab in front while recording.">Face camera
                <select value={faceId} onFocus={() => void listCameras()} onChange={(e) => { const id = e.target.value; pickFace(id); if (phase === "ready") { setProblem(""); if (id) void openFace(id); else { faceStream.current?.getTracks().forEach((t) => t.stop()); faceStream.current = null; setFaceOpen(false); } } }} className={`${input} max-w-48`}>
                  <option value="">None</option>
                  {cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
                  {faceId && !cameras.some((c) => c.deviceId === faceId) && <option value={faceId}>Last picked camera</option>}
                </select>
              </label>
              {faceId && (
                <>
                  <label className="flex items-center gap-1.5 text-slate-300">Face corner
                    <select value={faceLook.corner} onChange={(e) => setFaceLook({ corner: e.target.value as FaceLook["corner"] })} className={input}>{FACE_CORNERS.map((c) => <option key={c} value={c}>{CORNER_WORDS[c]}</option>)}</select>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300">Face size
                    <select value={faceLook.size} onChange={(e) => setFaceLook({ size: e.target.value as FaceLook["size"] })} className={input}>{FACE_SIZES.map((s) => <option key={s} value={s}>{FACE_SIZE_WORDS[s]}</option>)}</select>
                  </label>
                </>
              )}
            </div>
          </fieldset>
        )}
        {phase !== "recording" && (
          <fieldset className={group}>
            <legend className={legend}>Sound</legend>
            <RecordInputSelect onPick={() => void switchMic()} />
            <RecordSoundSelect sound={sound} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-1.5" title="Clicks through the speakers while you record. Only the input is recorded: use headphones if you record with a microphone.">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={click} onChange={(e) => pickClickOn(e.target.checked)} className="accent-sky-500" /> Click at{tempo ? ` ${bpm} bpm` : ""}</label>
                {!tempo && <><NumberField min={30} max={300} value={bpm} onCommit={(v) => pickClick({ bpm: v })} aria-label="Click tempo in bpm" className={`${input} w-16`} /> bpm</>}
              </span>
              {click && (
                <>
                  <label className="flex items-center gap-1.5">Count-in
                    <select value={countIn} onChange={(e) => setCountIn(+e.target.value)} className={input}>
                      {[0, 1, 2].map((n) => <option key={n} value={n}>{n} {n === 1 ? "bar" : "bars"}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5" title="The recording stops by itself after this many bars.">Length
                    <NumberField min={1} max={32} value={length} onCommit={setLength} aria-label="Length in bars" className={`${input} w-16`} /> bars
                  </label>
                </>
              )}
            </div>
          </fieldset>
        )}
        <fieldset className={group}>
          <legend className={legend}>Tool</legend>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-300">
            <label className="flex items-center gap-1.5 text-slate-300"><input type="checkbox" checked={toolShown} onChange={(e) => setToolShown(e.target.checked)} className="accent-emerald-500" /> Tool over the camera</label>
            {!!kit?.views?.length && (
              <label className="flex items-center gap-1.5" title="What the tool's box shows over the camera and the take. Players see this view only in a take saved after Export with overlay; otherwise they see Tool.">View
                <select value={viewId} onChange={(e) => pickView(e.target.value)} className={input}>
                  <option value={TOOL_VIEW}>Tool</option>
                  {kit.views.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
            )}
            <label className="flex items-center gap-1.5">Place
              <select value={look.place} onChange={(e) => setLook({ place: e.target.value as Look["place"] })} className={input}>{PLACES.map((p) => <option key={p} value={p}>{PLACE_WORDS[p]}</option>)}</select>
            </label>
            <label className="flex items-center gap-1.5" title={free ? "With Free, drag a bottom corner of the tool to size it." : undefined}>Size
              <select value={look.size} disabled={free} onChange={(e) => setLook({ size: e.target.value as Look["size"] })} className={`${input} disabled:opacity-40`}>{SIZES.map((s) => <option key={s} value={s}>{SIZE_WORDS[s]}</option>)}</select>
            </label>
            <label className="flex items-center gap-1.5">Background
              <select value={look.bg} onChange={(e) => setLook({ bg: e.target.value as Look["bg"] })} className={input}>{BGS.map((b) => <option key={b} value={b}>{BG_WORDS[b]}</option>)}</select>
            </label>
            <label className="flex items-center gap-1.5" title={canHide ? "With the controls hidden, press Space to start and stop the tool." : "This tool's controls can't be hidden yet."}>
              <input type="checkbox" checked={canHide ? controlsShown : true} disabled={!canHide} onChange={(e) => setControlsShown(e.target.checked)} className="accent-emerald-500" /> Tool controls
            </label>
            {free && <span className="text-xs text-slate-500">Drag the bar on top of the tool to move it, and a bottom corner to size it.</span>}
            {canHide && !controlsShown && <span className="text-xs text-slate-500">Press Space to start and stop the tool.</span>}
          </div>
        </fieldset>
        <fieldset className={group}>
          <legend className={legend}>Neck</legend>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-1.5 text-slate-300" title="Draws the neck markers, your fingertips and the effects ticked over the camera and the take. Not while recording: Export with overlay puts them in the take. Needs ArUco markers (ARUCO_MIP_36h12) stuck on the guitar.">
              <input type="checkbox" checked={readNeck} onChange={(e) => { setReadNeck(e.target.checked); if (e.target.checked) setReadCv(false); }} className="accent-sky-500" /> Read the neck
            </label>
            <label className="flex items-center gap-1.5 text-slate-300" title="Finds the fret markers with OpenCV and draws each fret with its number above and below. While the tool or the click plays, it lights each of the tool's notes on its fret, in time. Turns Read the neck off. OpenCV downloads the first time, about 10 MB.">
              <input type="checkbox" checked={readCv} onChange={(e) => { setReadCv(e.target.checked); if (e.target.checked) setReadNeck(false); }} className="accent-sky-500" /> Read the neck (OpenCV)
            </label>
          </div>
          {readNeck && <FxControls fx={fx} set={setFx} />}
          {readCv && <CvControls cv={cvFx} set={setCvFx} hasKey={!!kit?.key} />}
        </fieldset>
      </div>
      {phase === "ready" && take && !take.saved && !previous && <p className="text-xs text-slate-500">A new recording replaces the take below.</p>}
      {problem && <p role="alert" className="text-rose-400">{problem}</p>}
      {phase === "recording" && beatNow && <BeatView {...beatNow} />}

      <div ref={frame} className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-black [container-type:size]">
        {camera ? <video ref={liveRef} autoPlay muted playsInline className="aspect-video w-full object-cover" /> : <div className="flex aspect-video w-full items-center justify-center text-slate-500">{phase === "starting" ? "Starting the camera…" : "Press Start camera above to see the camera here."}</div>}
        {/* the face camera's canvas (both cameras) goes here, over the guitar camera */}
        {camera && <div ref={faceHolder} className="pointer-events-none absolute inset-0" />}
        {phase === "recording" && <span className="absolute left-2 top-2 rounded bg-rose-700 px-1.5 text-xs text-white">● Recording</span>}
        {/* Read the neck not while recording: its hand model would compete with the recorder and the tool's beat. The OpenCV
            reader runs on: while the tool or the click runs it draws the kit's notes, timed, not what it hears */}
        {camera && readNeck && phase !== "recording" && <NeckView video={liveVideo} fx={fx} live fit="cover" />}
        {camera && readCv && <NeckCvView video={liveVideo} markers={fx.markers} cv={cvFx} keyOf={kit?.key} live notes={liveNotes} clock={liveNotes ? liveClock : undefined} fit="cover" />}
        {/* one tree for every place and every view, so changing either never restarts the tool */}
        <ToolBox look={look} unsetBox={unsetBox} narrow={narrow} shown={toolShown} frame={frame}
          onBox={(box) => setLookState((l) => ({ ...l, box }))} onLetGo={() => setLookState((l) => { store(LOOK_KEY, l); return l; })}>
          <NoAutoScroll><ToolControls hidden={canHide && !controlsShown}><ToolClockListener onBeat={onBeat}><div className={kitView ? "hidden" : "contents"}>{children}</div></ToolClockListener></ToolControls></NoAutoScroll>
          {kitView && <LiveView view={kitView} read={liveBeat} />}
        </ToolBox>
      </div>

      {take && phase !== "recording" && (
        <section className="flex flex-col gap-3 rounded-xl border border-slate-800 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-semibold text-slate-100">The take · {clockTime(take.seconds)}</h2>
            <span role="status" className={`text-xs ${inBrowser === "failed" ? "text-rose-400" : "text-slate-400"}`}>{inBrowser === "saved" ? "Saved in this browser" : inBrowser === "saving" ? "Saving…" : "Not saved"}</span>
            {inBrowser === "failed" && <button type="button" onClick={() => void keep(take)} className={btn}>Save</button>}
            <button type="button" onClick={download} className={btn}>Save file</button>
            <button type="button" onClick={() => void remove()} disabled={sending || exporting !== null} className={`${btn} hover:bg-rose-900/60 hover:text-rose-200`}>Delete take</button>
          </div>
          {/* framed like the camera above, so the tool sits where it sat there */}
          <div ref={takeBox} className="relative isolate aspect-video w-full max-w-3xl overflow-hidden rounded bg-black [container-type:size]">
            <video key={url} ref={setTakeVideo} src={url} controls playsInline className="absolute inset-0 h-full w-full object-cover"
              onLoadedMetadata={(e) => { const { videoWidth, videoHeight } = e.currentTarget; if (videoWidth && videoHeight) setShown((s) => (s && s.url === url ? { ...s, take: { ...s.take, width: videoWidth, height: videoHeight } } : s)); }} />
            {readNeck && <NeckView key={url} video={takeVideo} fx={fx} notes={notes} fit="cover" onRead={onNeckRead} bare={exporting !== null} />}
            {readCv && <NeckCvView key={url} video={takeVideo} markers={fx.markers} cv={cvFx} keyOf={kit?.key} notes={notes} fit="cover" bare={exporting !== null} />}
            {kitView
              ? <ViewOverTake video={takeVideo} clock={clock} view={kitView} look={look} hidden={!toolShown} />
              : take.overlay && draw && <ToolOverVideo video={takeVideo} overlay={{ ...take.overlay, look }} draw={draw} hidden={!toolShown} />}
          </div>
          <p className="text-xs text-slate-400">{take.burned ? "Exported with overlay: players see this take with the tool and the effects in the picture." : overlayWords(take, drawn, bpm)}</p>
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
              {take.burned && exporting === null && <button type="button" onClick={dropOverlay} disabled={sending} className={btn}>Use the take without overlay</button>}
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
          {kit?.afterTake?.(take, takeVideo)}
          {(readNeck || !!take.log?.neck?.length) && (
            <DetectLog log={take.log ?? {}} notes={notes ?? []} markers={fx.markers} onSeek={(t) => takeVideo && seek(takeVideo, t)} />
          )}
        </section>
      )}
    </div>
  );
}

/** What the take panel says about the tool over the video. */
function overlayWords(take: KeptTake, drawn: PlanTool | null, bpm: number): string {
  if (take.overlay && take.click) return "Recorded to the click: players see the tool move with the video, from beat 1 after the count-in.";
  if (take.overlay) return "The tool's Play and Stop are saved with the take: players see the tool move with the video.";
  if (drawn && hasOverlay(drawn)) return `The tool wasn't started during the take, so players see the video without it. To show it, record again with Click at ${bpm} bpm ticked, or press Play on the tool.`;
  return "Players see the video without the tool: only the guitar play-along and the melody singer are drawn over a video.";
}
