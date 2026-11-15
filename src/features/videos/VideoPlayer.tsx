"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Notice } from "@/components/ui";
import { aspectOf, libraryVideo, videoUrl } from "./library";
import { VideoComingSoon } from "./Placeholder";
import type { VideoRef } from "./ref";
import { useDataSource } from "@/features/userData/client/useDataSource";
import { videoFileUrl } from "./serverVideos";
import { getVideo } from "./store";

/** `server`: the file route's URL, which answers 404 when the video is gone or this viewer may not watch it. */
type Source = { url: string; aspect: number; server?: boolean } | { missing: string } | null;

/** What a failed `<video>` means: `gone` when the server says 404 for its file, else the connection. */
async function whyFailed(url: string): Promise<"gone" | "failed"> {
  try {
    const res = await fetch(url, { headers: { range: "bytes=0-0" } });
    void res.body?.cancel();
    return res.status === 404 ? "gone" : "failed";
  } catch {
    return "failed";
  }
}

/**
 * The file behind a ref: a library URL at once; a recording read from this browser when it is here (a queued take, or one kept
 * without accounts: an object URL, revoked when it goes), else, with accounts on, the file from the server (the owner's upload, or one
 * a visitor may watch through a shared note).
 */
function useSource(video: Exclude<VideoRef, { source: "placeholder" }>): Source {
  const lib = video.source === "library" ? libraryVideo(video.id) : null;
  const libUrl = lib ? videoUrl(lib) : null;
  const [rec, setRec] = useState<Source>(null);
  const recId = video.source === "recording" ? video.id : null;
  const recTitle = video.source === "recording" ? video.title : "";
  const { source, ready } = useDataSource();
  // signed in, or a visitor reading a shared note: the server decides who may watch
  const server = source !== "local";
  useEffect(() => {
    if (!recId || !ready) return;
    let url: string | null = null, live = true;
    void getVideo(recId).then((v) => {
      if (!live) return;
      if (!v && server) return setRec({ url: videoFileUrl(recId), aspect: 16 / 9, server: true });
      if (!v) return setRec({ missing: `“${recTitle}” is not in this browser. A video you record is kept only in the browser that recorded it.` });
      url = URL.createObjectURL(v.blob);
      setRec({ url, aspect: v.width > 0 && v.height > 0 ? v.width / v.height : 16 / 9 });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
      setRec(null);
    };
  }, [recId, recTitle, ready, server]);
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
  const [failed, setFailed] = useState<"gone" | "failed" | null>(null);
  // an uploaded video's shape is known once its metadata loads
  const [shape, setShape] = useState<number | null>(null);
  if (!src) return <div className="aspect-video w-full animate-pulse rounded-lg bg-slate-900" />;
  if ("missing" in src) return <Notice tone="warn" icon={<Icon name="alert-triangle" size={16} />}>{src.missing}</Notice>;
  if (failed === "gone") return <Notice tone="warn" icon={<Icon name="alert-triangle" size={16} />}>This video is gone. It was deleted, or it isn&apos;t shared with you.</Notice>;
  if (failed) return <Notice tone="warn" icon={<Icon name="alert-triangle" size={16} />}>This video could not be loaded. Check your connection, then reload the page.</Notice>;
  const aspect = shape ?? src.aspect;
  const tall = aspect < 1;
  return (
    <div className="flex justify-center">
      <video
        key={src.url}
        src={src.url}
        controls
        playsInline
        preload="metadata"
        onError={() => {
          if (!src.server) return setFailed("failed");
          void whyFailed(src.url).then(setFailed);
        }}
        onLoadedMetadata={(e) => {
          const { videoWidth: w, videoHeight: h } = e.currentTarget;
          if (w > 0 && h > 0) setShape(w / h);
        }}
        style={{ aspectRatio: String(aspect) }}
        className={`${tall ? "w-full max-w-[420px]" : "w-full"} rounded-lg bg-black`}
      />
    </div>
  );
}

export default VideoPlayer;
