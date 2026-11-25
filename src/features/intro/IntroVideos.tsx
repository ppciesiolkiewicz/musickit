"use client";

import { useState } from "react";
import IntroPlayer from "./IntroPlayer";
import { VIDEO_LIST, type VideoId } from "./data";

/** Both quick tours on one page, with a switch between them: "attunr for [Students | Teachers]". One player at a time, so Space plays the one shown. */
export default function IntroVideos({ first = "solo" }: { first?: VideoId }) {
  const [video, setVideo] = useState<VideoId>(first);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-400">attunr for</span>
        <span role="group" aria-label="attunr for" className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 p-1">
          {VIDEO_LIST.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVideo(v.id)}
              aria-pressed={v.id === video}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-sky-400 ${v.id === video ? "bg-sky-400 text-slate-950" : "text-slate-300 hover:text-slate-50"}`}
            >
              {v.label}
            </button>
          ))}
        </span>
      </div>
      {/* the key starts the other tour from its beginning */}
      <IntroPlayer key={video} video={video} />
    </div>
  );
}
