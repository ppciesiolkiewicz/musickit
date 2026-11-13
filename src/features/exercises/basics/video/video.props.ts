/**
 * A practice video from the app's video library, played with the browser's own controls: play, pause, the time bar, full screen.
 * The student plays or sings along with it. No mic. Pick the video by its id from the list below; write how long it runs into the
 * exercise's time.
 * @component video basic
 */
export interface VideoProps {
  /** the video's id in the library (a string from the list) */
  video: string;
  /** notes only, never in a plan: a teacher's recording or a placeholder ({ "source": "recording", "id", "title" } or { "source": "placeholder", "text" }) in place of `video` */
  ref?: { source: string; id?: string; title?: string; text?: string };
}
