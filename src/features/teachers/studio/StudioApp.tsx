"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { PLUGINS } from "@/features/creator";
import { CameraLayer, DEFAULT_VIEW, NUDGE, NUDGE_BIG, ScreenLayer, StageFrame, StageWidget, mediaState, shortcutFor, stageCommand, subjectTitle, toggleFull, type Layer, type PaletteResult, type StudioCommand, type Subject } from "@/features/stage";
import { isStudioSupported } from "./browserSupport";
import KeysPanel, { KeysOverlay } from "./KeysPanel";
import useCamera from "./media/useCamera";
import useScreenShare from "./media/useScreenShare";
import Palette from "./Palette";
import useStage from "./useStage";

const PLUGIN_IDS = PLUGINS.map((p) => p.id);

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

  const runCommand = useCallback(
    (cmd: StudioCommand) => {
      if (cmd === "screen-share") void startScreen();
      else for (const a of stageCommand(stageRef.current, cmd, () => crypto.randomUUID())) dispatch(a);
    },
    [dispatch, startScreen],
  );

  const onPick = useCallback(
    (r: PaletteResult) => {
      if (r.action.type === "add") dispatch({ type: "addSubject", id: crypto.randomUUID(), subject: r.action.subject });
      else runCommand(r.action.command);
    },
    [dispatch, runCommand],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (palette) return;
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
  }, [palette, help, dispatch, runCommand]);

  if (supported === null) return null;
  if (!supported) return <p className="mx-auto mt-24 max-w-md text-center text-slate-300">The studio needs desktop Chrome or Edge.</p>;

  const media = mediaState(stage);
  const renderLayer = (l: Layer) => (
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
  );

  return (
    <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)] gap-4 p-4">
      <aside data-chrome aria-label="Layers" className="flex flex-col gap-2">
        <KeysPanel onAdd={() => setPalette(true)} />
        <h2 className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">Layers</h2>
        {stage.layers.length === 0 && <p className="text-xs text-slate-500">Nothing on the stage yet.</p>}
        <ul className="flex flex-col gap-1">
          {[...stage.layers].reverse().map((l) => (
            <li key={l.id}>
              <div className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${stage.selected === l.id ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}>
                <button type="button" className={`min-w-0 flex-1 truncate text-left ${l.visible ? "" : "opacity-50"}`} onClick={() => dispatch({ type: "select", id: l.id })}>
                  {subjectTitle(l.subject)}
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

      <main className="flex min-w-0 flex-col items-center gap-3">
        <h1 className="sr-only">Studio</h1>
        {/* as wide as the column, but never taller than the window */}
        <div className="w-full" style={{ maxWidth: "calc((100vh - 2rem) * 16 / 9)" }}>
          <StageFrame stage={stage} renderLayer={renderLayer} onAction={dispatch} />
        </div>
      </main>

      {palette && <Palette pluginIds={PLUGIN_IDS} stageKey={stage.key} media={media} layers={stage.layers} onPick={onPick} onRemove={(id) => dispatch({ type: "remove", id })} onClose={() => setPalette(false)} />}
      {help && <KeysOverlay onClose={() => setHelp(false)} />}
    </div>
  );
}
