"use client";

import { VideoPlayer } from "@/features/videos/VideoPlayer";
import type { VideoProps } from "./video.props";

/** A library video in an exercise (`video` tool): the player alone; the exercise's text says what to do with it. */
export function View({ video }: VideoProps) {
  return (
    <div data-tour="video-player">
      <VideoPlayer video={{ source: "library", id: video }} />
    </div>
  );
}
