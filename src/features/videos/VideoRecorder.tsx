"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Button, Notice, btnBase } from "@/components/ui";
import { clockTime } from "@/features/recorder/recorder";
import { cleanTitle, type VideoRef } from "./ref";
import { MAX_TAKE_SECONDS, pickVideoType, takeTitle, videoFileName } from "./recording";
import { saveVideo } from "./store";

type Phase = "off" | "starting" | "ready" | "recording" | "review" | "saving";
interface Take { blob: Blob; url: string; type: string; seconds: number; width: number; height: number }

const primary = `${btnBase} border-sky-500 bg-sky-600 text-white hover:bg-sky-500`;
const record = `${btnBase} border-rose-500 bg-rose-600 text-white hover:bg-rose-500`;

/**
 * Records the teacher with the camera and the microphone, then plays the take back to name it and save it in this browser
 * (`store.ts`), or download it. Asks for the camera only on **Start camera**; lets go of it when it closes. `addTo` names where a
 * saved take goes ("the note"); `onSaved` gets it.
 */
export function VideoRecorder({ addTo, onSaved }: { addTo: string; onSaved: (ref: VideoRef) => void }) {
  const [phase, setPhase] = useState<Phase>("off");
  const [problem, setProblem] = useState<string | null>(null);
  const [take, setTake] = useState<Take | null>(null);
  const [title, setTitle] = useState("");
  const [seconds, setSeconds] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const live = useRef<HTMLVideoElement>(null);
  const takeUrl = useRef<string | null>(null);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  const dropTake = () => {
    if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
    takeUrl.current = null;
    setTake(null);
  };
  // let go of the camera and the take when the recorder closes
  useEffect(() => () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    stopCamera();
    if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
  }, []);

  // the live picture follows the stream
  useEffect(() => {
    if (live.current && (phase === "ready" || phase === "recording")) live.current.srcObject = stream.current;
  }, [phase]);

  // the clock while recording; a take stops itself at the limit
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

  const startCamera = async () => {
    setProblem(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setProblem("This browser can't record video. Open the page in Chrome, Firefox or Safari.");
      return;
    }
    setPhase("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      setPhase("ready");
    } catch {
      setPhase("off");
      setProblem("The browser didn't allow the camera or the microphone. Allow both in the address bar, then press Start camera.");
    }
  };

  const startRecording = () => {
    const s = stream.current;
    if (!s) return;
    const type = pickVideoType((t) => MediaRecorder.isTypeSupported(t));
    const chunks: Blob[] = [];
    let r: MediaRecorder;
    try {
      r = new MediaRecorder(s, type ? { mimeType: type } : undefined);
    } catch {
      setProblem("This browser can't record video. Open the page in Chrome, Firefox or Safari.");
      return;
    }
    const from = performance.now();
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      const recorded = r.mimeType || type || "video/webm";
      const blob = new Blob(chunks, { type: recorded });
      const settings = s.getVideoTracks()[0]?.getSettings() ?? {};
      const url = URL.createObjectURL(blob);
      takeUrl.current = url;
      setTake({ blob, url, type: recorded, seconds: Math.round((performance.now() - from) / 1000), width: settings.width ?? 1280, height: settings.height ?? 720 });
      setTitle(takeTitle(new Date()));
      stopCamera();
      setPhase("review");
    };
    recorder.current = r;
    r.start(1000);
    setSeconds(0);
    setPhase("recording");
  };

  const again = () => {
    dropTake();
    void startCamera();
  };

  const save = async () => {
    if (!take) return;
    setPhase("saving");
    setProblem(null);
    const name = cleanTitle(title);
    const id = await saveVideo({ title: name, type: take.type, blob: take.blob, seconds: take.seconds, width: take.width, height: take.height });
    if (!id) {
      setPhase("review");
      setProblem("The video could not be saved. The browser may be out of space or in a private window. Press Download to keep it as a file.");
      return;
    }
    onSaved({ source: "recording", id, title: name });
  };

  const download = () => {
    if (!take) return;
    const a = document.createElement("a");
    a.href = take.url;
    a.download = videoFileName(cleanTitle(title), take.type);
    a.click();
  };

  return (
    <div className="flex flex-col gap-3">
      {problem && <Notice tone="warn" icon={<Icon name="alert-triangle" size={16} />}>{problem}</Notice>}

      {(phase === "off" || phase === "starting") && (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-center">
          <p className="max-w-sm text-sm text-slate-400">Record yourself with the camera and the microphone. Press Start camera to see yourself first.</p>
          <Button onClick={() => void startCamera()} disabled={phase === "starting"}>
            <Icon name="video" size={14} /> {phase === "starting" ? "Starting the camera…" : "Start camera"}
          </Button>
        </div>
      )}

      {(phase === "ready" || phase === "recording") && (
        <>
          {/* mirrored, like a mirror; the take itself is not */}
          <video ref={live} autoPlay muted playsInline className="aspect-video w-full -scale-x-100 rounded-lg bg-black object-cover" />
          <div className="flex items-center gap-3">
            {phase === "ready" ? (
              <button type="button" onClick={startRecording} className={record}>
                <Icon name="circle" size={12} fill /> Record
              </button>
            ) : (
              <button type="button" onClick={() => recorder.current?.stop()} className={record}>
                <Icon name="square" size={12} fill /> Stop
              </button>
            )}
            <span className={`font-mono text-sm tabular-nums ${phase === "recording" ? "text-rose-300" : "text-slate-500"}`} aria-live="off">
              {clockTime(phase === "recording" ? seconds : 0)} / {clockTime(MAX_TAKE_SECONDS)}
            </span>
          </div>
        </>
      )}

      {(phase === "review" || phase === "saving") && take && (
        <>
          <video src={take.url} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Name
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void save()} disabled={phase === "saving"} className={primary}>
              <Icon name="check" size={12} /> {phase === "saving" ? "Saving…" : `Save and add to ${addTo}`}
            </button>
            <Button onClick={again} disabled={phase === "saving"}>
              <Icon name="rotate-ccw" size={12} /> Record again
            </Button>
            <Button onClick={download}>
              <Icon name="download" size={12} /> Download
            </Button>
          </div>
        </>
      )}

      <p className="text-xs leading-relaxed text-slate-500">
        Your videos are saved in this browser only. A note you share plays them only in this browser: send the file to anyone else with Download.
      </p>
    </div>
  );
}

export default VideoRecorder;
