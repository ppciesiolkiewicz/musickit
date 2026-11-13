"use client";

import { VideoPlayer } from "@/features/videos/VideoPlayer";
import type { VideoRef } from "@/features/videos/ref";

/** A video in an exercise or a note (`video` tool): the player alone; the text says what to do with it. A note's recording or placeholder comes as `videoRef`. */
export function View({ video, videoRef }: { video?: string; videoRef?: Exclude<VideoRef, { source: "library" }> }) {
  return (
    <div data-tour="video-player">
      <VideoPlayer video={videoRef ?? { source: "library", id: video ?? "" }} />
    </div>
  );
}
