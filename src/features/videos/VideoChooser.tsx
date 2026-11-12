"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Button, btnBaseSm } from "@/components/ui";
import { clockTime } from "@/features/recorder/recorder";
import { lengthLabel, publishedVideos } from "./library";
import type { VideoRef } from "./ref";
import { videoFileName } from "./recording";
import { deleteVideo, getVideo, listVideos, onVideosChange, type SavedVideoInfo } from "./store";
import { VideoPlayer } from "./VideoPlayer";
import { VideoRecorder } from "./VideoRecorder";

export type ChooserTab = "library" | "mine" | "record";
const TABS: { id: ChooserTab; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "mine", label: "My videos" },
  { id: "record", label: "Record" },
];

const add = `${btnBaseSm} border-sky-500 bg-sky-600 text-white hover:bg-sky-500`;

/**
 * Picks a video to add: one from the library, one of the teacher's own (kept in this browser), or a new one recorded here. `addTo`
 * names where it goes ("the note"); `onPick` gets the video.
 */
export function VideoChooser({ start = "library", addTo, onPick }: { start?: ChooserTab; addTo: string; onPick: (ref: VideoRef) => void }) {
  const [tab, setTab] = useState<ChooserTab>(start);
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Where the video comes from" className="flex gap-2">
        {TABS.map((t) => (
          <Button key={t.id} role="tab" aria-selected={tab === t.id} pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>
      {tab === "library" && <Library addTo={addTo} onPick={onPick} />}
      {tab === "mine" && <Mine addTo={addTo} onPick={onPick} onRecord={() => setTab("record")} />}
      {tab === "record" && <VideoRecorder addTo={addTo} onSaved={onPick} />}
    </div>
  );
}

function Library({ addTo, onPick }: { addTo: string; onPick: (ref: VideoRef) => void }) {
  const videos = publishedVideos();
  const [watching, setWatching] = useState<string | null>(null);
  if (!videos.length) return <p className="text-sm text-slate-400">The library has no videos yet. Press Record above to make your own.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {videos.map((v) => (
        <li key={v.id} className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-sm font-semibold text-slate-100">{v.title}</h3>
            <span className="text-xs text-slate-500">{v.area === "voice" ? "Singing" : "Guitar"} · {lengthLabel(v.seconds)}</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">{v.about}</p>
          {watching === v.id && <VideoPlayer video={{ source: "library", id: v.id }} />}
          <div className="flex gap-2">
            <button type="button" onClick={() => onPick({ source: "library", id: v.id })} className={add}>
              <Icon name="plus" size={12} /> Add to {addTo}
            </button>
            <Button size="sm" pressed={watching === v.id} onClick={() => setWatching(watching === v.id ? null : v.id)}>
              <Icon name="play" size={12} /> {watching === v.id ? "Hide" : "Watch"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Mine({ addTo, onPick, onRecord }: { addTo: string; onPick: (ref: VideoRef) => void; onRecord: () => void }) {
  const [videos, setVideos] = useState<SavedVideoInfo[] | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [watching, setWatching] = useState<string | null>(null);
  useEffect(() => {
    const load = () => void listVideos().then(setVideos);
    load();
    return onVideosChange(load);
  }, []);

  const download = async (v: SavedVideoInfo) => {
    const saved = await getVideo(v.id);
    if (!saved) return;
    const url = URL.createObjectURL(saved.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = videoFileName(v.title, v.type);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (videos === null) return <p className="text-sm text-slate-500">Loading your videos…</p>;
  if (!videos.length)
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-slate-400">You have no videos yet. Record one, and it is kept here, in this browser.</p>
        <Button onClick={onRecord}>
          <Icon name="video" size={14} /> Record a video
        </Button>
      </div>
    );
  return (
    <ul className="flex flex-col gap-3">
      {videos.map((v) => {
        const ref: VideoRef = { source: "recording", id: v.id, title: v.title };
        return (
          <li key={v.id} className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h3 className="text-sm font-semibold text-slate-100">{v.title}</h3>
              <span className="text-xs text-slate-500">{clockTime(v.seconds)} · saved {new Date(v.savedAt).toLocaleDateString()}</span>
            </div>
            {watching === v.id && <VideoPlayer video={ref} />}
            {asking === v.id ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                Delete “{v.title}”? A note that holds it can no longer play it.
                <button type="button" onClick={() => void deleteVideo(v.id).then(() => setAsking(null))} className={`${btnBaseSm} border-rose-500 bg-rose-600 text-white hover:bg-rose-500`}>
                  Delete video
                </button>
                <Button size="sm" onClick={() => setAsking(null)}>Keep it</Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onPick(ref)} className={add}>
                  <Icon name="plus" size={12} /> Add to {addTo}
                </button>
                <Button size="sm" pressed={watching === v.id} onClick={() => setWatching(watching === v.id ? null : v.id)}>
                  <Icon name="play" size={12} /> {watching === v.id ? "Hide" : "Watch"}
                </Button>
                <Button size="sm" onClick={() => void download(v)}>
                  <Icon name="download" size={12} /> Download
                </Button>
                <Button size="sm" onClick={() => setAsking(v.id)}>
                  <Icon name="trash" size={12} /> Delete
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default VideoChooser;
