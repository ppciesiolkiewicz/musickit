import { createContext } from "react";
import type { VideoRef } from "@/features/videos/ref";

/**
 * How a host that can add videos (the studio, the notes creator) opens its Add a video dialog on the recorder: `onPick` gets the video
 * made or picked there. Absent (a note being read, the editor replay): a placeholder reads "Video coming soon".
 */
export const VideoPickContext = createContext<((onPick: (video: VideoRef) => void) => void) | null>(null);
