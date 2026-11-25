import script from "./script.json";
import charlie from "./voices/charlie.json";
import type { IntroScript, VoiceManifest } from "./timeline";

/** The two tours: one for students, one for teachers. */
export type VideoId = "solo" | "teachers";

/** Each tour's script, typed (JSON imports type every scene's cues apart). Scene ids are unique across both, so one voice manifest holds every take. */
export const VIDEOS = script.videos as unknown as Record<VideoId, IntroScript>;

/** The tours in the order a switch shows them, with the words on the switch. */
export const VIDEO_LIST: { id: VideoId; label: string }[] = [
  { id: "solo", label: "Students" },
  { id: "teachers", label: "Teachers" },
];

/** The tours' one narrator, Charlie: every scene's take, as scripts/intro/voice.mjs recorded it. */
export const VOICE = charlie as unknown as VoiceManifest;
