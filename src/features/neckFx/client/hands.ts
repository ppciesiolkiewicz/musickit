import type { HandLandmarker } from "@mediapipe/tasks-vision";

/** The hand model and its runtime, fetched on first use (dev tool only). */
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** MediaPipe's Hand Landmarker for video, two hands, shared by both readers (only one runs at a time). */
let hands: Promise<HandLandmarker> | null = null;
export function loadHands(): Promise<HandLandmarker> {
  hands ??= import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, HandLandmarker }) =>
    HandLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(WASM), {
      baseOptions: { modelAssetPath: HAND_MODEL }, runningMode: "VIDEO", numHands: 2,
    }));
  hands.catch(() => { hands = null; });
  return hands;
}
