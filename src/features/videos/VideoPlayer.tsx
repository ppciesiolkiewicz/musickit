"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Notice } from "@/components/ui";
import { aspectOf, libraryVideo, videoUrl } from "./library";
import { VideoComingSoon } from "./Placeholder";
import type { VideoRef } from "./ref";
import { getVideo } from "./store";

type Source = { url: string; aspect: number } | { missing: string } | null;

/** The file behind a ref: a library URL at once, a recording read from this browser (an object URL, revoked when it goes). */
function useSource(video: Exclude<VideoRef, { source: "placeholder" }>): Source {
  const lib = video.source === "library" ? libraryVideo(video.id) : null;
  const libUrl = lib ? videoUrl(lib) : null;
  const [rec, setRec] = useState<Source>(null);
  const recId = video.source === "recording" ? video.id : null;
  const recTitle = video.source === "recording" ? video.title : "";
  useEffect(() => {
    if (!recId) return;
    let url: string | null = null, live = true;
    void getVideo(recId).then((v) => {
      if (!live) return;
      if (!v) return setRec({ missing: `“${recTitle}” is not in this browser. A video you record is kept only in the browser that recorded it.` });
      url = URL.createObjectURL(v.blob);
      setRec({ url, aspect: v.width > 0 && v.height > 0 ? v.width / v.height : 16 / 9 });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
      setRec(null);
    };
  }, [recId, recTitle]);
  if (video.source === "recording") return rec;
  if (!lib || !libUrl) return { missing: "This video is not available yet." };
  return { url: libUrl, aspect: aspectOf(lib.published[0]) };
}

/**
 * A video from the library or the teacher's own, with the browser's controls; a placeholder reads "Video coming soon", with its text under it. A tall (9:16) video stands in the middle at a phone's
 * width. Used by the stage's video widget and the plan's `video` tool.
 */
export function VideoPlayer({ video }: { video: VideoRef }) {
  return video.source === "placeholder" ? <VideoComingSoon text={video.text} /> : <FilePlayer video={video} />;
}

function FilePlayer({ video }: { video: Exclude<VideoRef, { source: "placeholder" }> }) {
  const src = useSource(video);
  const [failed, setFailed] = useState(false);
  if (!src) return <div className="aspect-video w-full animate-pulse rounded-lg bg-slate-900" />;
  if ("missing" in src) return <Notice tone="warn" icon={<Icon name="alert-triangle" size={16} />}>{src.missing}</Notice>;
  if (failed) return <Notice tone="warn" icon={<Icon name="alert-triangle" size={16} />}>This video could not be loaded. Check your connection, then reload the page.</Notice>;
  const tall = src.aspect < 1;
  return (
    <div className="flex justify-center">
      <video
        key={src.url}
        src={src.url}
        controls
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        style={{ aspectRatio: String(src.aspect) }}
        className={`${tall ? "w-full max-w-[420px]" : "w-full"} rounded-lg bg-black`}
      />
    </div>
  );
}

export default VideoPlayer;
