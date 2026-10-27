"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { FORMATS, FPS, parseVideoConfig, type FormatId, type VideoConfig } from "./model/config";
import { formatMs, frameAt, momentLabel, tuneStarts } from "./model/preview";
import { buildScore, frameCount, type Score } from "./model/score";
import { VideoFrame } from "./VideoRender";

/** a file picked with Chrome's file picker: it can be read again, so the preview follows the file as it is saved */
export interface VideoFile {
  name: string;
  getFile(): Promise<File>;
}

declare global {
  interface Window {
    showOpenFilePicker?: (o?: { types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<VideoFile[]>;
  }
}

/** Asks for a video config (`videos/*.json`); null when cancelled. */
export async function pickVideoConfig(): Promise<VideoFile | null> {
  try {
    const [file] = await window.showOpenFilePicker!({ types: [{ description: "Video config", accept: { "application/json": [".json"] } }] });
    return file ?? null;
  } catch {
    return null;
  }
}

/** how often the file is checked for a new save */
const WATCH_MS = 1000;
/** room under the frame for the controls, and the page's padding */
const CONTROLS_PX = 150;

type Loaded = { config: VideoConfig; score: Score; version: number };

const isField = (el: Element | null) => !!el && (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable || (el.tagName === "INPUT" && (el as HTMLInputElement).type !== "range"));

/**
 * A video config played in the browser: the frame the render would draw, scaled to fit, with a slider to any moment and
 * play/pause under it. No sound. Saving the file reloads it; a save that does not parse shows its error over the last good one.
 */
export default function VideoPreview({ file, pluginIds, onClose }: { file: VideoFile; pluginIds: string[]; onClose: () => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<FormatId>("16x9");
  const [ms, setMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const t = useRef(0);
  const time = useCallback(() => t.current, []);
  const seek = useCallback((to: number) => {
    t.current = to;
    setMs(to);
  }, []);

  // read now, then again whenever the file's save time moves
  useEffect(() => {
    let live = true;
    let seen = -1;
    let version = 0;
    const read = async () => {
      let f: File;
      try {
        f = await file.getFile();
      } catch {
        if (live) setError("the file can no longer be read");
        return;
      }
      if (!live || f.lastModified === seen) return;
      seen = f.lastModified;
      try {
        const config = parseVideoConfig(JSON.parse(await f.text()), pluginIds);
        if (!live) return;
        const score = buildScore(config);
        setLoaded({ config, score, version: ++version });
        setError(null);
        setFormat((was) => (config.formats[was] ? was : (Object.keys(config.formats)[0] as FormatId)));
        if (t.current > score.durationMs) seek(score.durationMs);
      } catch (e) {
        if (live) setError(e instanceof SyntaxError ? `not valid JSON: ${e.message}` : e instanceof Error ? e.message : String(e));
      }
    };
    void read();
    const id = setInterval(() => void read(), WATCH_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [file, pluginIds, seek]);

  const duration = loaded?.score.durationMs ?? 0;

  // playing: real time from where the slider is, stopping at the end
  useEffect(() => {
    if (!playing) return;
    const from = t.current >= duration ? 0 : t.current;
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const at = Math.min(duration, from + now - start);
      seek(at);
      if (at >= duration) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, seek]);

  // Space plays or pauses; arrows step a frame, with Shift a second
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isField(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey) return;
      const step = e.shiftKey ? 1000 : 1000 / FPS;
      if (e.code === "Space") setPlaying((p) => !p);
      else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        setPlaying(false);
        // on a frame's own time, so stepping lands on the frames the render draws
        const frame = frameAt(t.current + 1e-6) + (e.code === "ArrowRight" ? 1 : -1) * Math.round(step / (1000 / FPS));
        seek(Math.max(0, Math.min(duration, (frame * 1000) / FPS)));
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration, seek]);

  // the frame at its real pixel size, scaled down to the column's width and the window's height
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setRoom({ w: el.clientWidth, h: window.innerHeight - CONTROLS_PX });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const size = FORMATS[format];
  const scale = Math.max(0, Math.min(room.w / size.width, room.h / size.height));

  const score = loaded?.score;
  const formats = loaded ? (Object.keys(loaded.config.formats) as FormatId[]) : [];
  return (
    <div ref={box} className="flex w-full flex-col items-center gap-3">
      {loaded && loaded.config.formats[format] ? (
        <div className="relative overflow-hidden rounded-sm ring-1 ring-slate-800" style={{ width: size.width * scale, height: size.height * scale }}>
          <VideoFrame
            key={`${loaded.version}/${format}`}
            config={loaded.config}
            score={loaded.score}
            format={format}
            time={time}
            className="absolute left-0 top-0 origin-top-left"
            style={{ transform: `scale(${scale})` }}
          />
        </div>
      ) : (
        <div className="grid aspect-video w-full place-items-center rounded-sm ring-1 ring-slate-800 text-sm text-slate-400">{error ? "This file does not render." : "Loading…"}</div>
      )}

      <div className="flex w-full flex-col gap-1.5" style={{ maxWidth: Math.max(size.width * scale, 640) }}>
        {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 font-mono text-xs text-rose-200">{file.name}: {error}</p>}
        <div className="flex items-center gap-2">
          <button type="button" disabled={!score} onClick={() => setPlaying((p) => !p)} title={playing ? "Pause (Space)" : "Play (Space)"} aria-label={playing ? "Pause" : "Play"} className="rounded-md border border-slate-700 p-1.5 text-slate-200 hover:border-slate-500 disabled:opacity-40">
            <Icon name={playing ? "pause" : "play"} size={14} fill />
          </button>
          <div className="relative min-w-0 flex-1">
            <input
              type="range"
              aria-label="Time in the video"
              min={0}
              max={duration}
              step={1000 / FPS}
              value={Math.min(ms, duration)}
              disabled={!score}
              onChange={(e) => {
                setPlaying(false);
                seek(Number(e.target.value));
              }}
              className="w-full accent-sky-500"
            />
            {/* each tune's count-in, to jump to */}
            <div className="relative h-4">
              {score &&
                tuneStarts(score).map((at, i) => (
                  <button
                    key={i}
                    type="button"
                    title={`Tune ${i + 1}: ${score.segments[i].caption}`}
                    onClick={() => {
                      setPlaying(false);
                      seek(at);
                    }}
                    className="absolute -translate-x-1/2 rounded px-0.5 font-mono text-[10px] leading-4 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                    style={{ left: `${(at / duration) * 100}%` }}
                  >
                    {i + 1}
                  </button>
                ))}
            </div>
          </div>
          {formats.length > 1 &&
            formats.map((f) => (
              <button key={f} type="button" aria-pressed={f === format} onClick={() => setFormat(f)} className={`rounded-md border px-1.5 py-0.5 font-mono text-xs ${f === format ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-400 hover:border-slate-600"}`}>
                {f.replace("x", ":")}
              </button>
            ))}
          <button type="button" onClick={onClose} title="Close the preview and go back to the stage" aria-label="Close the preview" className="rounded-md border border-slate-800 p-1.5 text-slate-400 hover:text-slate-100">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span className="truncate">
            <span className="text-slate-200">{file.name}</span>
            {score && <> · {momentLabel(score, ms)}</>}
          </span>
          {score && (
            <span className="shrink-0 font-mono tabular-nums">
              {formatMs(ms)} / {formatMs(duration)} · frame {Math.min(frameAt(ms), frameCount(score) - 1)} / {frameCount(score) - 1}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500">Space plays or pauses · ← → a frame, with ⇧ a second · no sound · saving the file reloads it</p>
      </div>
    </div>
  );
}
