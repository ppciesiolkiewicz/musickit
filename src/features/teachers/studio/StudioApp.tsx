"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeardNote } from "@/components/chordKit/heardNote";
import Icon from "@/components/Icon";
import { PLUGINS } from "@/features/creator";
import { CameraLayer, DEFAULT_VIEW, MicContext, VideoPickContext, sanitiseAudioInput, useAudioInput, NUDGE, NUDGE_BIG, ScreenLayer, StageFrame, StageWidget, gridLayers, layoutOf, mediaState, isControl, isPage, shortcutFor, stageCommand, subjectTitle, takesMic, toggleFull, type AudioInputSetup, type Layer, type MicInput, type PaletteResult, type StudioCommand, type Subject } from "@/features/stage";
import { VideoPreview, pickVideoConfig, type VideoFile } from "@/features/teachers/video";
import KeysPanel, { KeysOverlay } from "./KeysPanel";
import LayoutSelector from "./LayoutSelector";
import useCamera from "./media/useCamera";
import useScreenShare from "./media/useScreenShare";
import ControlBadge, { MicBadge, PageBadge } from "./ControlBadge";
import { noteFromHash } from "./notes";
import NoteJson from "./NoteJson";
import SharePopover from "./SharePopover";
import { Modal } from "@/components/ui";
import { VideoChooser, type ChooserTab } from "@/features/videos/VideoChooser";
import type { VideoRef } from "@/features/videos/ref";
import NoteView, { NoteReader } from "./NoteView";
import { BackToEditing, NOTE_COLUMN, useNoteViewMode } from "./NoteViewMode";
import { noteHeader } from "./notes";
import { VoicePicker } from "@/features/exercises/basics/voiceChoice";
import { devUi } from "@/features/devtools/gate";
import { presetStage, savePresetDraft } from "./presetNotes";
import Palette from "./Palette";
import useStage from "./useStage";

const PLUGIN_IDS = PLUGINS.map((p) => p.id);
const SHAPE_STORE = "musickit.studio.keepShape";
const PANEL_STORE = "musickit.studio.panelFolded";
const INPUT_STORE = "musickit.studio.audioInput";

/** the audio input's sources (guitar and voice: device and channel) and which listens, as saved */
function savedAudioInput(): AudioInputSetup {
  try {
    return sanitiseAudioInput(JSON.parse(window.localStorage.getItem(INPUT_STORE) ?? "null"));
  } catch {
    return sanitiseAudioInput(null);
  }
}

/** whether the side panel is folded to a letter or two per widget: open unless folded before */
/** Tailwind's md: below it the panel sits above the frame */
const PHONE_WIDTH = 768;

function savedFolded(): boolean {
  try {
    const saved = window.localStorage.getItem(PANEL_STORE);
    // never chosen: on a phone the frame gets the room
    return saved === null ? window.innerWidth < PHONE_WIDTH : saved === "on";
  } catch {
    return false;
  }
}

/** whether widget frames keep their content's shape: on unless turned off (a switch for trying both) */
function savedKeepShape(): boolean {
  try {
    return window.localStorage.getItem(SHAPE_STORE) !== "off";
  } catch {
    return true;
  }
}

/** a widget's name in a letter or two, for the folded panel: the first letters of its first two words (Fretboard positions: FP), or of its one word (Tuner: Tu) */
function initials(title: string): string {
  const words = title.split(" · ")[0].split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : (words[0] ?? "?").slice(0, 2);
}

/** Whether a field has the keys, looked for through shadow roots: a browser extension's own box (a writing or AI helper) sits in one. */
const isTyping = () => {
  let el = document.activeElement as HTMLElement | null;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement as HTMLElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/** The notes creator's steps, over the page. Each names a control by its label. */
const NOTE_STEPS = [
  "Press Add a widget to put a scale, a chord box, a neck, a video or some text on the page.",
  "Drag a widget to move it up or down the page.",
  "Press View as a note to see the page as your students will.",
];

/** The studio, or in the notes creator a shared note's link opened as an article to read (`NoteView`). */
export default function StudioApp({ notes = false, preset }: {
  notes?: boolean;
  /** a preset note's slug (`presetNotes.ts`): the notes creator opens on that note and stores nothing; as a dev demo its changes are kept in memory until a reload, so the note's page shows them */
  preset?: string;
}) {
  // the link's hash is known only in the browser: until then nothing is drawn, as the studio itself waits for hydration
  const [note, setNote] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is read after hydration
    setNote(notes ? noteFromHash(window.location.hash) : null);
  }, [notes]);
  if (note === undefined) return null;
  return note ? <NoteView note={note} /> : <Studio notes={notes} preset={preset} />;
}

/** The teacher studio: the 16:9 frame in the middle, its layers on the left, the keys that work on the right. */
function Studio({ notes = false, preset }: {
  /** the notes creator (?notes=1): the same stage without video, camera, screen or microphone, shared as a link, inside the site's page frame */
  notes?: boolean;
  preset?: string;
}) {
  const [mounted, setMounted] = useState(false);
  // a preset starts as this tab last left it (dev demo), read once, and every change is kept in memory as it is made
  const [start] = useState(() => (preset ? presetStage(preset) : null));
  const keep = useCallback((s: Parameters<typeof savePresetDraft>[1]) => { if (preset) savePresetDraft(preset, s); }, [preset]);
  const [stage, dispatch, load] = useStage(PLUGIN_IDS, notes, start, keep);
  const [json, setJson] = useState(false);
  /** the Add a video dialog, open on this tab; `onPick` puts the video in a placeholder instead of adding a widget */
  const [videoPick, setVideoPick] = useState<{ tab: ChooserTab; onPick?: (video: VideoRef) => void } | null>(null);
  const pickIntoPlaceholder = useCallback((onPick: (video: VideoRef) => void) => setVideoPick({ tab: "record", onPick }), []);
  const grid = layoutOf(stage) === "grid";
  // the Layers list on the grid: the page top to bottom, then what is not on the grid (the brand marks keep their corner)
  const onPage = grid ? gridLayers(stage) : [];
  const listed = grid ? [...onPage, ...stage.layers.filter((l) => !onPage.includes(l))] : [...stage.layers].reverse();
  // sharing is not open in the demo: Share as a note says so (links made before still open)
  const [shareInfo, setShareInfo] = useState(false);
  const closeShareInfo = useCallback(() => setShareInfo(false), []);
  // the notes creator's View as a note: the note as a demo note's page draws it, in place of the editor. The page's header follows it
  // when the page shares the mode (`NoteViewProvider`); without one the creator keeps its own
  const mode = useNoteViewMode();
  const [ownViewing, setOwnViewing] = useState(false);
  const viewing = mode ? mode.viewing : ownViewing;
  const setViewing = mode ? mode.setViewing : setOwnViewing;
  const setModeStage = mode?.setStage;
  useEffect(() => setModeStage?.(viewing ? stage : null), [setModeStage, viewing, stage]);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  // a video config previewed in place of the stage
  const [video, setVideo] = useState<VideoFile | null>(null);
  const openVideo = async () => {
    const f = await pickVideoConfig();
    if (f) setVideo(f);
  };
  // the page renders nothing until it is mounted, so reading storage here cannot mismatch the server's render
  const [keepShape, setKeepShape] = useState(() => (typeof window === "undefined" ? true : savedKeepShape()));
  const toggleKeepShape = () => {
    const next = !keepShape;
    setKeepShape(next);
    try {
      window.localStorage.setItem(SHAPE_STORE, next ? "on" : "off");
    } catch {}
  };
  const [folded, setFolded] = useState(() => (typeof window === "undefined" ? false : savedFolded()));
  const toggleFolded = () => {
    const next = !folded;
    setFolded(next);
    try {
      window.localStorage.setItem(PANEL_STORE, next ? "on" : "off");
    } catch {}
  };
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- what is stored and the window's width are known only after hydration
    setMounted(true);
  }, []);

  const camera = useCamera();
  const removeKind = useCallback(
    (kind: Subject["kind"]) => {
      const l = stageRef.current.layers.find((x) => x.subject.kind === kind);
      if (l) dispatch({ type: "remove", id: l.id });
    },
    [dispatch],
  );
  const screen = useScreenShare(useCallback(() => removeKind("screen"), [removeKind]));
  const startScreen = useCallback(async () => {
    if (await screen.start()) dispatch({ type: "addSubject", id: crypto.randomUUID(), subject: { kind: "screen" } });
  }, [screen, dispatch]);

  // a camera or screen layer deleted (trash, ⌫, clear) lets go of its stream
  const hasCamera = stage.layers.some((l) => l.subject.kind === "camera");
  const hasScreen = stage.layers.some((l) => l.subject.kind === "screen");
  const { stop: stopCamera, stream: cameraStream } = camera;
  const { stop: stopScreen, stream: screenStream } = screen;
  useEffect(() => {
    if (!hasCamera && cameraStream) stopCamera();
  }, [hasCamera, cameraStream, stopCamera]);
  useEffect(() => {
    if (!hasScreen && screenStream) stopScreen();
  }, [hasScreen, screenStream, stopScreen]);

  // the studio's one audio input lives here, not in its widget, so hiding the widget keeps it listening; deleting it (and the Tuner) stops it
  const [micOn, setMicOn] = useState(false);
  const [inputSetup, setInputSetup] = useState(() => (typeof window === "undefined" ? sanitiseAudioInput(null) : savedAudioInput()));
  const onInputSetup = useCallback((s: AudioInputSetup) => {
    setInputSetup(s);
    try {
      window.localStorage.setItem(INPUT_STORE, JSON.stringify(s));
    } catch {}
  }, []);
  const { status: micStatus, heard, hz } = useAudioInput(micOn, inputSetup);
  // the Audio input widget and the Tuner both listen to it: it stops when neither is left
  const hasListener = stage.layers.some((l) => l.subject.kind === "mic" || l.subject.kind === "tuner");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the input follows its widgets out of the stage
    if (!hasListener) setMicOn(false);
  }, [hasListener]);
  const mic = useMemo<MicInput>(
    () => ({ status: micStatus, heard, hz, setup: inputSetup, onSetup: onInputSetup, onToggle: () => setMicOn((on) => !on) }),
    [micStatus, heard, hz, inputSetup, onInputSetup],
  );

  const runCommand = useCallback(
    (cmd: StudioCommand) => {
      if (cmd === "screen-share") void startScreen();
      else if (cmd === "video-add") setVideoPick({ tab: "mine" });
      else if (cmd === "video-record") setVideoPick({ tab: "record" });
      else for (const a of stageCommand(stageRef.current, cmd, () => crypto.randomUUID())) dispatch(a);
    },
    [dispatch, startScreen],
  );

  const onPick = useCallback(
    (r: PaletteResult) => {
      if (r.action.type === "add") {
        dispatch({ type: "addSubject", id: crypto.randomUUID(), subject: r.action.subject });
        // picking the audio input is the click that starts it
        if (r.action.subject.kind === "mic") setMicOn(true);
      }
      // a family row never reaches here: its step two in the palette turns it into an `add`
      else if (r.action.type === "command") runCommand(r.action.command);
    },
    [dispatch, runCommand],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // the preview has its own keys; the stage's would move widgets nobody can see
      if (palette || video || videoPick || viewing) return;
      if (help) {
        setHelp(false);
        e.preventDefault();
        return;
      }
      const s = stageRef.current;
      const sc = shortcutFor(e, { typing: isTyping(), hasSelection: s.selected !== null });
      if (!sc) return;
      e.preventDefault();
      const id = s.selected;
      const step = e.shiftKey ? NUDGE_BIG : NUDGE;
      switch (sc) {
        case "palette":
          setPalette(true);
          break;
        case "help":
          setHelp(true);
          break;
        case "camera-corner":
          runCommand("camera-corner");
          break;
        case "camera-toggle":
        case "screen-toggle": {
          const cmd = toggleFull(sc === "camera-toggle" ? "camera" : "screen", mediaState(s));
          if (cmd) runCommand(cmd);
          break;
        }
        case "deselect":
          dispatch({ type: "select", id: null });
          break;
      }
      if (!id) return;
      switch (sc) {
        case "delete":
          dispatch({ type: "remove", id });
          break;
        case "reset-zoom":
          dispatch({ type: "setView", id, view: DEFAULT_VIEW });
          break;
        case "nudge-left":
          dispatch({ type: "move", id, dx: -step, dy: 0 });
          break;
        case "nudge-right":
          dispatch({ type: "move", id, dx: step, dy: 0 });
          break;
        case "nudge-up":
          dispatch({ type: "move", id, dx: 0, dy: -step });
          break;
        case "nudge-down":
          dispatch({ type: "move", id, dx: 0, dy: step });
          break;
        case "grow-w":
          dispatch({ type: "resize", id, dw: step, dh: 0 });
          break;
        case "shrink-w":
          dispatch({ type: "resize", id, dw: -step, dh: 0 });
          break;
        case "grow-h":
          dispatch({ type: "resize", id, dw: 0, dh: step });
          break;
        case "shrink-h":
          dispatch({ type: "resize", id, dw: 0, dh: -step });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette, help, video, videoPick, viewing, dispatch, runCommand]);

  if (!mounted) return null;

  const media = mediaState(stage);
  // the audio input feeds the pinned widgets and the selected one
  const renderLayer = (l: Layer) => (
    <HeardNote.Provider value={l.onTop || stage.selected === l.id ? heard : null}>
      <StageWidget
        subject={l.subject}
        onSubjectChange={(subject) => dispatch({ type: "swap", id: l.id, subject })}
        stageKey={stage.key}
        onStageKey={(key) => dispatch({ type: "setStageKey", key })}
        renderMedia={(s) => {
          const kind = s.kind === "camera" ? "camera" : "screen";
          const full = media[kind] === "full";
          const controls = {
            full,
            name: kind === "camera" ? "camera" : "screen share",
            onToggleFull: () => runCommand(kind === "camera" ? (full ? "camera-corner" : "camera-full") : full ? "screen-corner" : "screen-full"),
            onClose: () => runCommand(kind === "camera" ? "camera-off" : "screen-stop"),
            ...(kind === "camera" ? { mirrored: camera.mirrored, onToggleMirror: camera.toggleMirror } : {}),
          };
          return kind === "camera" ? (
            <CameraLayer stream={camera.stream} error={camera.error} onStart={() => void camera.start()} controls={controls} />
          ) : (
            <ScreenLayer stream={screen.stream} onStart={() => void startScreen()} controls={controls} />
          );
        }}
      />
    </HeardNote.Provider>
  );

  // PageShell already holds the notes creator's <main>
  if (notes && viewing) {
    // the page's header already shows the note's title and line; without a shared mode the article keeps them
    const body = mode ? noteHeader(stage).body : stage;
    return (
      <div className={NOTE_COLUMN}>
        {/* the page's header carries Back to editing when it shares the mode */}
        {!mode && <BackToEditing onBack={() => setViewing(false)} />}
        <VoicePicker data={body}>
          <NoteReader stage={body} footer={false} />
        </VoicePicker>
      </div>
    );
  }

  const Main = notes ? "div" : "main";
  return (
    <div className={`grid gap-4 max-md:grid-cols-1 max-md:gap-2 ${notes ? "relative" : "min-h-screen p-4 max-md:p-2"} ${folded ? "grid-cols-[52px_minmax(0,1fr)]" : "grid-cols-[220px_minmax(0,1fr)]"}`}>
      {/* in the notes creator the site's nav holds the window's corner, so the button stays in the tool's own */}
      <button data-chrome type="button" title="Keys (?)" aria-label="Show the keys" onClick={() => setHelp(true)} className={`${notes ? "absolute right-0 top-0" : "fixed right-3 top-3"} z-30 max-md:hidden rounded-md border border-slate-800 bg-slate-950/80 p-1 text-slate-400 hover:text-slate-100`}>
        <Icon name="info" size={14} />
      </button>
      {folded ? (
        <aside data-chrome aria-label="Layers" className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col items-center gap-1 self-start overflow-y-auto max-md:static max-md:max-h-none max-md:flex-row max-md:flex-wrap max-md:self-auto">
          <button type="button" title="Unfold the panel" aria-label="Unfold the panel" aria-expanded={false} onClick={toggleFolded} className="rounded-md border border-slate-800 p-1 text-slate-400 hover:text-slate-100">
            <Icon name="chevron-right" size={14} />
          </button>
          <button type="button" title="Add a widget (/ or ⌘K)" aria-label="Add a widget" onClick={() => setPalette(true)} className="rounded-md border border-slate-700 p-1 text-slate-200 hover:border-slate-500">
            <Icon name="plus" size={14} />
          </button>
          <button type="button" title="Share as a note" aria-label="Share as a note" onClick={() => { setShareInfo(true); toggleFolded(); }} className="rounded-md border border-slate-700 p-1 text-slate-200 hover:border-slate-500">
            <Icon name="share-2" size={14} />
          </button>
          {notes && (
            <button type="button" title={viewing ? "Back to editing" : "View as a note"} aria-label={viewing ? "Back to editing" : "View as a note"} aria-pressed={viewing} onClick={() => setViewing(!viewing)} className={`rounded-md border p-1 hover:border-slate-500 ${viewing ? "border-sky-500/60 text-sky-200" : "border-slate-700 text-slate-200"}`}>
              <Icon name="eye" size={14} />
            </button>
          )}
          {!notes && (
            <button type="button" title="Preview a video config" aria-label="Preview a video config" aria-pressed={!!video} onClick={() => void openVideo()} className={`rounded-md border p-1 hover:border-slate-500 ${video ? "border-sky-500/60 text-sky-200" : "border-slate-700 text-slate-200"}`}>
              <Icon name="play" size={14} />
            </button>
          )}
          <ul className="mt-1 flex flex-col gap-1 max-md:mt-0 max-md:flex-row max-md:flex-wrap">
            {[...stage.layers].reverse().map((l) => (
              <li key={l.id} className="flex items-center gap-0.5">
                <button
                  type="button"
                  title={subjectTitle(l.subject)}
                  aria-label={subjectTitle(l.subject)}
                  onClick={() => dispatch({ type: "select", id: l.id })}
                  className={`grid h-6 w-7 place-items-center rounded border font-mono text-[11px] ${stage.selected === l.id ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300 hover:border-slate-600"} ${l.visible ? "" : "opacity-50"}`}
                >
                  {initials(subjectTitle(l.subject))}
                </button>
                <button type="button" title="Delete" aria-label="Delete" onClick={() => dispatch({ type: "remove", id: l.id })} className="p-0.5 text-slate-500 hover:text-rose-300">
                  <Icon name="trash" size={12} />
                </button>
              </li>
            ))}
          </ul>
        </aside>
      ) : (
        <aside data-chrome aria-label="Layers" className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col gap-2 self-start overflow-y-auto max-md:static max-md:max-h-none max-md:self-auto">
          <div className="flex items-stretch gap-1">
            <div className="min-w-0 flex-1">
              <KeysPanel onAdd={() => setPalette(true)} />
            </div>
            <button type="button" title="Fold the panel to a letter or two per widget" aria-label="Fold the panel" aria-expanded onClick={toggleFolded} className="rounded-md border border-slate-800 px-1 text-slate-400 hover:text-slate-100">
              <Icon name="chevron-left" size={14} />
            </button>
          </div>
          <h2 className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">Layers</h2>
          {stage.layers.length === 0 && <p className="text-xs text-slate-500">Nothing on the stage yet.</p>}
          <ul className="flex flex-col gap-1">
            {/* on the grid the list is the page, top to bottom; on Free it is the stack, the top widget first */}
            {listed.map((l, i) => {
              const name = subjectTitle(l.subject);
              return (
              <li key={l.id}>
                <div className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${stage.selected === l.id ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}>
                  <button type="button" className={`flex min-w-0 flex-1 items-center gap-1.5 text-left ${l.visible ? "" : "opacity-50"}`} onClick={() => dispatch({ type: "select", id: l.id })}>
                    {i < onPage.length && <span className="w-4 shrink-0 text-right text-xs tabular-nums text-slate-500">{i + 1}</span>}
                    <span className="truncate">{name}</span>
                    {isControl(l.subject) && <ControlBadge />}
                    {isPage(l.subject) && <PageBadge />}
                    {takesMic(l.subject) && <MicBadge />}
                  </button>
                  {!notes && (
                  <button type="button" title={l.onTop ? "Unpin" : "Pin over the other widgets (the audio input lights its notes)"} aria-label={`${l.onTop ? "Unpin" : "Pin"} ${name}`} aria-pressed={!!l.onTop} onClick={() => dispatch({ type: "togglePin", id: l.id })} className={`p-0.5 hover:text-slate-100 ${l.onTop ? "text-sky-300" : "text-slate-400"}`}>
                    <Icon name="pin" size={14} />
                  </button>
                  )}
                  <button type="button" title={l.visible ? "Hide" : "Show"} aria-label={`${l.visible ? "Hide" : "Show"} ${name}`} onClick={() => dispatch({ type: "toggle", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                    <Icon name="eye" size={14} />
                  </button>
                  {i < onPage.length && (
                  <>
                  <button type="button" title="Move up the page" aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => dispatch({ type: "reorder", id: l.id, over: onPage[i - 1].id })} className="p-0.5 text-slate-400 hover:text-slate-100 disabled:opacity-30">
                    <Icon name="chevron-down" size={14} className="rotate-180" />
                  </button>
                  <button type="button" title="Move down the page" aria-label={`Move ${name} down`} disabled={i === onPage.length - 1} onClick={() => dispatch({ type: "reorder", id: l.id, over: onPage[i + 1].id })} className="p-0.5 text-slate-400 hover:text-slate-100 disabled:opacity-30">
                    <Icon name="chevron-down" size={14} />
                  </button>
                  </>
                  )}
                  {!grid && (
                  <>
                  <button type="button" title="Bring forward" aria-label={`Bring ${name} forward`} onClick={() => dispatch({ type: "raise", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                    <Icon name="chevron-down" size={14} className="rotate-180" />
                  </button>
                  <button type="button" title="Send backward" aria-label={`Send ${name} backward`} onClick={() => dispatch({ type: "lower", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                    <Icon name="chevron-down" size={14} />
                  </button>
                  </>
                  )}
                  <button type="button" title="Delete" aria-label={`Delete ${name}`} onClick={() => dispatch({ type: "remove", id: l.id })} className="p-0.5 text-slate-400 hover:text-rose-300">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
          {layoutOf(stage) === "free" && (
          <button
            type="button"
            role="switch"
            aria-checked={keepShape}
            onClick={toggleKeepShape}
            title={
              keepShape
                ? "On: each widget's frame takes the shape of what it shows, so there is no empty margin around it, and resizing from a corner keeps that shape. Click to drag frames to any shape instead."
                : "Off: a widget's frame can be any shape, and the widget sits centred in it. Click to make every frame take its widget's shape."
            }
            className="mt-2 flex items-center justify-between gap-2 rounded-md border border-slate-800 px-2 py-1 text-left text-xs text-slate-300 hover:border-slate-600"
          >
            Keep widget shapes
            <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${keepShape ? "bg-sky-500" : "bg-slate-700"}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${keepShape ? "left-3.5" : "left-0.5"}`} />
            </span>
          </button>
          )}
          <SharePopover open={shareInfo} onClose={closeShareInfo} onView={notes ? () => setViewing(true) : undefined}>
            <button type="button" onClick={() => setShareInfo((s) => !s)} aria-expanded={shareInfo} aria-label="Share as a note" title="Sharing isn't open yet in this demo" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-sky-500/20 transition hover:bg-sky-400">
              <Icon name="share-2" size={12} />
              <span className="min-w-0 truncate">Share as a note</span>
            </button>
          </SharePopover>
          {notes && (
          <button type="button" onClick={() => setViewing(!viewing)} aria-pressed={viewing} aria-label={viewing ? "Back to editing" : "View as a note"} title={viewing ? "Back to the editor" : "See the note as your students will: read-only, one column"} className={`flex items-center gap-2 rounded-md border px-2 py-1 text-left text-xs hover:border-slate-600 ${viewing ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}>
            <Icon name={viewing ? "pencil" : "eye"} size={12} />
            <span className="min-w-0 flex-1 truncate">{viewing ? "Back to editing" : "View as a note"}</span>
          </button>
          )}
          {notes && grid && devUi() && (
          <button type="button" onClick={() => setJson(true)} aria-label="Edit as JSON (dev)" title="The whole note as text: its key and its widgets in page order, to read, change and apply in one go. Development only." className="flex items-center gap-2 rounded-md border border-slate-800 px-2 py-1 text-left text-xs text-slate-300 hover:border-slate-600">
            <Icon name="pencil" size={12} />
            <span className="min-w-0 flex-1 truncate">Edit as JSON (dev)</span>
          </button>
          )}
          {!notes && (
          <button
            type="button"
            onClick={() => void openVideo()}
            title="Play a video config (videos/*.json) in the frame, with a slider to any moment. Saving the file reloads it."
            className={`mt-2 flex items-center gap-2 rounded-md border px-2 py-1 text-left text-xs hover:border-slate-600 ${video ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}
          >
            <Icon name="play" size={12} />
            <span className="min-w-0 flex-1 truncate">{video ? `Video: ${video.name}` : "Preview a video…"}</span>
          </button>
          )}
          {camera.stream && camera.devices.length > 1 && (
            <label className="mt-2 flex flex-col gap-1 text-xs text-slate-400">
              Camera
              <select value={camera.deviceId ?? ""} onChange={(e) => void camera.start(e.target.value)} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200">
                {camera.devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
                ))}
              </select>
            </label>
          )}
        </aside>
      )}

      <Main className="flex min-w-0 flex-col items-center gap-3">
        {!notes && <h1 className="sr-only">Studio</h1>}
        {/* as wide as the column, but never taller than the window */}
        <div className="w-full max-w-[calc((100vh-4rem)*16/9)] max-md:max-w-none">
          {video && !notes ? (
            <VideoPreview file={video} pluginIds={PLUGIN_IDS} onClose={() => setVideo(null)} />
          ) : notes ? (
            <>
              {/* pr-6 keeps clear of the keys button in the corner */}
              <ol className="mb-3 grid gap-x-6 gap-y-1 pr-6 text-sm text-slate-400 sm:grid-cols-3 max-md:pr-0">
                {NOTE_STEPS.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-200">{i + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
              <VideoPickContext.Provider value={pickIntoPlaceholder}>
                <MicContext.Provider value={mic}>
                  <StageFrame stage={stage} renderLayer={renderLayer} onAction={dispatch} keepShape={keepShape} pin={false} />
                </MicContext.Provider>
              </VideoPickContext.Provider>
            </>
          ) : (
            <>
              {/* pr-6 keeps clear of the keys button in the window's corner */}
              <div className="sticky top-2 z-30 mb-2 flex justify-end pr-6 max-md:pr-0">
                <LayoutSelector layout={layoutOf(stage)} hasWidgets={stage.layers.length > 0} gridSwitch={false} gridAuto={!!stage.gridAuto} onLayout={(layout) => dispatch({ type: "setLayout", layout })} onAutoLayout={() => dispatch({ type: "autoLayout" })} />
              </div>
              <VideoPickContext.Provider value={pickIntoPlaceholder}>
                <MicContext.Provider value={mic}>
                  <StageFrame stage={stage} renderLayer={renderLayer} onAction={dispatch} keepShape={keepShape} />
                </MicContext.Provider>
              </VideoPickContext.Provider>
            </>
          )}
        </div>
      </Main>

      {palette && <Palette notes={notes} pluginIds={PLUGIN_IDS} stageKey={stage.key} media={media} layers={stage.layers} onPick={onPick} onUpdate={(id, subject) => dispatch({ type: "swap", id, subject })} onRemove={(id) => dispatch({ type: "remove", id })} onClose={() => setPalette(false)} />}
      {help && <KeysOverlay onClose={() => setHelp(false)} />}
      {videoPick && (
        <Modal title="Add a video" medium onClose={() => setVideoPick(null)}>
          <VideoChooser
            start={videoPick.tab}
            addTo={notes ? "the note" : "the stage"}
            onPick={(video) => {
              if (videoPick.onPick) videoPick.onPick(video);
              else dispatch({ type: "addSubject", id: crypto.randomUUID(), subject: { kind: "video", video } });
              setVideoPick(null);
            }}
          />
        </Modal>
      )}
      {json && <NoteJson stage={stage} pluginIds={PLUGIN_IDS} onApply={load} onClose={() => setJson(false)} />}
    </div>
  );
}
