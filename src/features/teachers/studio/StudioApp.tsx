"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeardNote } from "@/components/chordKit/heardNote";
import Icon from "@/components/Icon";
import { PLUGINS } from "@/features/creator";
import { CameraLayer, DEFAULT_VIEW, MicContext, sanitiseAudioInput, useAudioInput, NUDGE, NUDGE_BIG, ScreenLayer, StageFrame, StageWidget, mediaState, isControl, isPage, shortcutFor, stageCommand, subjectTitle, takesMic, toggleFull, type AudioInputSetup, type Layer, type MicInput, type PaletteResult, type StudioCommand, type Subject } from "@/features/stage";
import { VideoPreview, pickVideoConfig, type VideoFile } from "@/features/teachers/video";
import { isStudioSupported } from "./browserSupport";
import KeysPanel, { KeysOverlay } from "./KeysPanel";
import useCamera from "./media/useCamera";
import useScreenShare from "./media/useScreenShare";
import ControlBadge, { MicBadge, PageBadge } from "./ControlBadge";
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
function savedFolded(): boolean {
  try {
    return window.localStorage.getItem(PANEL_STORE) === "on";
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

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/** The teacher studio: the 16:9 frame in the middle, its layers on the left, the keys that work on the right. */
export default function StudioApp() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [stage, dispatch] = useStage(PLUGIN_IDS);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  // a video config previewed in place of the stage
  const [video, setVideo] = useState<VideoFile | null>(null);
  const openVideo = async () => {
    const f = await pickVideoConfig();
    if (f) setVideo(f);
  };
  // the page renders nothing until the browser check, so reading storage here cannot mismatch the server's render
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser check needs window, after hydration
    setSupported(isStudioSupported());
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
      else runCommand(r.action.command);
    },
    [dispatch, runCommand],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // the preview has its own keys; the stage's would move widgets nobody can see
      if (palette || video) return;
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
  }, [palette, help, video, dispatch, runCommand]);

  if (supported === null) return null;
  if (!supported) return <p className="mx-auto mt-24 max-w-md text-center text-slate-300">The studio needs desktop Chrome or Edge.</p>;

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

  return (
    <div className={`grid min-h-screen gap-4 p-4 ${folded ? "grid-cols-[52px_minmax(0,1fr)]" : "grid-cols-[220px_minmax(0,1fr)]"}`}>
      {folded ? (
        <aside data-chrome aria-label="Layers" className="flex flex-col items-center gap-1">
          <button type="button" title="Unfold the panel" aria-label="Unfold the panel" aria-expanded={false} onClick={toggleFolded} className="rounded-md border border-slate-800 p-1 text-slate-400 hover:text-slate-100">
            <Icon name="chevron-right" size={14} />
          </button>
          <button type="button" title="Add a widget (/ or ⌘K)" aria-label="Add a widget" onClick={() => setPalette(true)} className="rounded-md border border-slate-700 p-1 text-slate-200 hover:border-slate-500">
            <Icon name="plus" size={14} />
          </button>
          <button type="button" title="Preview a video config" aria-label="Preview a video config" aria-pressed={!!video} onClick={() => void openVideo()} className={`rounded-md border p-1 hover:border-slate-500 ${video ? "border-sky-500/60 text-sky-200" : "border-slate-700 text-slate-200"}`}>
            <Icon name="play" size={14} />
          </button>
          <ul className="mt-1 flex flex-col gap-1">
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
        <aside data-chrome aria-label="Layers" className="flex flex-col gap-2">
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
            {[...stage.layers].reverse().map((l) => (
              <li key={l.id}>
                <div className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${stage.selected === l.id ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}>
                  <button type="button" className={`flex min-w-0 flex-1 items-center gap-1.5 text-left ${l.visible ? "" : "opacity-50"}`} onClick={() => dispatch({ type: "select", id: l.id })}>
                    <span className="truncate">{subjectTitle(l.subject)}</span>
                    {isControl(l.subject) && <ControlBadge />}
                    {isPage(l.subject) && <PageBadge />}
                    {takesMic(l.subject) && <MicBadge />}
                  </button>
                  <button type="button" title={l.onTop ? "Unpin" : "Pin over the other widgets (the audio input lights its notes)"} aria-pressed={!!l.onTop} onClick={() => dispatch({ type: "togglePin", id: l.id })} className={`p-0.5 hover:text-slate-100 ${l.onTop ? "text-sky-300" : "text-slate-400"}`}>
                    <Icon name="pin" size={14} />
                  </button>
                  <button type="button" title={l.visible ? "Hide" : "Show"} onClick={() => dispatch({ type: "toggle", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                    <Icon name="eye" size={14} />
                  </button>
                  <button type="button" title="Bring forward" onClick={() => dispatch({ type: "raise", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                    <Icon name="chevron-down" size={14} className="rotate-180" />
                  </button>
                  <button type="button" title="Send backward" onClick={() => dispatch({ type: "lower", id: l.id })} className="p-0.5 text-slate-400 hover:text-slate-100">
                    <Icon name="chevron-down" size={14} />
                  </button>
                  <button type="button" title="Delete" onClick={() => dispatch({ type: "remove", id: l.id })} className="p-0.5 text-slate-400 hover:text-rose-300">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
          <button
            type="button"
            onClick={() => void openVideo()}
            title="Play a video config (videos/*.json) in the frame, with a slider to any moment. Saving the file reloads it."
            className={`mt-2 flex items-center gap-2 rounded-md border px-2 py-1 text-left text-xs hover:border-slate-600 ${video ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}
          >
            <Icon name="play" size={12} />
            <span className="min-w-0 flex-1 truncate">{video ? `Video: ${video.name}` : "Preview a video…"}</span>
          </button>
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

      <main className="flex min-w-0 flex-col items-center gap-3">
        <h1 className="sr-only">Studio</h1>
        {/* as wide as the column, but never taller than the window */}
        <div className="w-full" style={{ maxWidth: "calc((100vh - 2rem) * 16 / 9)" }}>
          {video ? (
            <VideoPreview file={video} pluginIds={PLUGIN_IDS} onClose={() => setVideo(null)} />
          ) : (
            <MicContext.Provider value={mic}>
              <StageFrame stage={stage} renderLayer={renderLayer} onAction={dispatch} keepShape={keepShape} />
            </MicContext.Provider>
          )}
        </div>
      </main>

      {palette && <Palette pluginIds={PLUGIN_IDS} stageKey={stage.key} media={media} layers={stage.layers} onPick={onPick} onRemove={(id) => dispatch({ type: "remove", id })} onClose={() => setPalette(false)} />}
      {help && <KeysOverlay onClose={() => setHelp(false)} />}
    </div>
  );
}
