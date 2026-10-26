"use client";

import { flushSync } from "react-dom";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PLUGINS } from "@/features/creator";
import { StageWidget, TimelineContext, type StageTimeline } from "@/features/stage";
import { preloadInstrument, renderOffline } from "@/features/sound";
import { FORMATS, FPS, parseVideoConfig, type FormatId, type VideoConfig } from "./model/config";
import { buildScore, frameCount, momentAt, soundOf, type Moment, type Score } from "./model/score";
import { encodeWav } from "./model/wav";

declare global {
  interface Window {
    /** set by the render script before the page loads */
    __VIDEO_JOB__?: { config: unknown; format: FormatId };
    /** set by the page */
    __video?:
      | { state: "loading" }
      | { state: "error"; message: string }
      | { state: "ready"; durationMs: number; frames: number; fps: number; audio: () => Promise<string /* base64 WAV */> };
  }
}

type Job = { config: VideoConfig; score: Score; format: FormatId };

const NOOP = () => {};

/** what a change of moment redraws: the tune, and the countdown number; the bar itself runs on `gridBeats` */
const momentKey = (m: Moment) => `${m.phase}/${m.segment}/${m.phase === "countdown" ? m.left : 0}`;

const SAMPLE_RATE = 48000;

/** The score's piano and clicks as a base64 WAV. */
async function soundtrack(score: Score): Promise<string> {
  const sound = soundOf(score);
  const buf = await renderOffline({ steps: sound.piano, clicks: sound.clicks, durationMs: score.durationMs, sampleRate: SAMPLE_RATE });
  const wav = encodeWav([buf.getChannelData(0), buf.getChannelData(1)], SAMPLE_RATE);
  // in chunks: spreading a whole song into fromCharCode overflows the call stack
  let bin = "";
  for (let i = 0; i < wav.length; i += 0x8000) bin += String.fromCharCode(...wav.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * The page the render script opens: the config's layers at the format's pixel size, following the score. All time comes from
 * `performance.now()` in this page's own animation-frame loop, so the script can swap in a clock and step it frame by frame.
 */
export default function VideoRender() {
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState("Loading…");
  const t0 = useRef(0);
  const hasJob = useSyncExternalStore(
    () => NOOP,
    () => window.__VIDEO_JOB__ !== undefined,
    () => true,
  );

  useEffect(() => {
    const raw = window.__VIDEO_JOB__;
    if (!raw) return;
    window.__video = { state: "loading" };
    const fail = (message: string) => {
      window.__video = { state: "error", message };
      setStatus(message);
    };
    let config: VideoConfig;
    try {
      config = parseVideoConfig(raw.config, PLUGINS.map((p) => p.id));
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
      return;
    }
    const size = Object.hasOwn(FORMATS, raw.format) ? FORMATS[raw.format] : null;
    if (!size || !config.formats[raw.format]) {
      fail(`format ${String(raw.format)}: the config has no layout for it`);
      return;
    }
    // the render script keeps its own copy of the sizes; this catches the two drifting apart
    if (window.innerWidth !== size.width || window.innerHeight !== size.height) {
      fail(`the window is ${window.innerWidth}x${window.innerHeight}, but ${raw.format} is ${size.width}x${size.height}`);
      return;
    }
    const score = buildScore(config);
    let live = true;
    Promise.all([preloadInstrument("PIANO"), document.fonts.ready]).then(
      () => {
        if (!live) return;
        t0.current = performance.now();
        setJob({ config, score, format: raw.format });
        window.__video = {
          state: "ready",
          durationMs: score.durationMs,
          frames: frameCount(score),
          fps: FPS,
          audio: () => soundtrack(score),
        };
      },
      (e) => {
        if (live) fail(e instanceof Error ? e.message : String(e));
      },
    );
    return () => {
      live = false;
    };
  }, []);

  if (!job) return <div className="app-bg fixed inset-0 z-50 flex items-center justify-center text-sm text-slate-300">{hasJob ? status : "No video job"}</div>;
  return <Frame job={job} t0={t0} />;
}

function Frame({ job, t0 }: { job: Job; t0: { current: number } }) {
  const { config, score, format } = job;
  const { width, height } = FORMATS[format];
  const rects = config.formats[format]!;
  const [shown, setShown] = useState(() => momentAt(score, 0));
  const key = momentKey(shown);

  const timeline = useMemo<StageTimeline>(
    () => ({
      melody: { notes: score.segments[shown.segment].notes, ladder: score.ladder, clef: score.clef, beatMs: score.beatMs },
      // read from the clock itself, so the staff's own frame callback and this page's agree on the time
      gridBeats: () => {
        const m = momentAt(score, performance.now() - t0.current);
        return m.phase === "play" ? m.beats : m.phase === "countdown" ? 0 : null;
      },
      countdown: shown.phase === "countdown" ? { caption: score.segments[shown.segment].caption, left: shown.left } : null,
    }),
    // `key` is the moment's identity: a frame inside the same count or tune keeps the same context
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [score, t0, key],
  );

  useEffect(() => {
    let raf = requestAnimationFrame(function tick() {
      const m = momentAt(score, performance.now() - t0.current);
      // committed inside the tick, so the bar (read from the clock) is never drawn with the last frame's tune or count
      flushSync(() => setShown((p) => (momentKey(p) === momentKey(m) ? p : m)));
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [score, t0]);

  const stageKey = useMemo(() => ({ tonicPc: config.tonicPc, family: 0, mode: 0 }), [config.tonicPc]);
  return (
    // above anything the root layout draws; the frame is exactly the output size
    <div className="app-bg fixed left-0 top-0 z-50 overflow-hidden" style={{ width, height }}>
      {/* the dev server's indicator is not part of the frame */}
      <style>{"nextjs-portal { display: none !important; }"}</style>
      <TimelineContext.Provider value={timeline}>
        {config.layers.map((l, i) => {
          const r = rects[l.id];
          return (
            <div key={l.id} className="absolute" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, zIndex: i }}>
              <StageWidget subject={l.subject} onSubjectChange={NOOP} stageKey={stageKey} onStageKey={NOOP} />
            </div>
          );
        })}
      </TimelineContext.Provider>
    </div>
  );
}
