import type { FaceLandmarker } from "@mediapipe/tasks-vision";

/** The face model and its runtime, fetched the first time a face effect is ticked (dev tool only). */
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** MediaPipe's Face Landmarker for video, one face. */
let faces: Promise<FaceLandmarker> | null = null;
export function loadFaces(): Promise<FaceLandmarker> {
  faces ??= import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, FaceLandmarker }) =>
    FaceLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(WASM), {
      baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: "VIDEO", numFaces: 1,
    }));
  faces.catch(() => { faces = null; });
  return faces;
}
