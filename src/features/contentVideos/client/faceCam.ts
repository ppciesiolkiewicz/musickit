import type { FaceDetector } from "@mediapipe/tasks-vision";
import { circleAt, cropFor, ease, median, steady, type Crop, type FaceLook } from "../model/faceCircle";

/**
 * The face camera on the record page: the guitar camera's picture with the face camera's face cut out as a circle in a
 * corner (`model/faceCircle.ts`), drawn on a canvas each frame. The take records the canvas (`track`), so both cameras
 * are in the file. The face is found with MediaPipe's Face Detector ten times a second and the crop follows it slowly
 * (its size the median of the last second's looks, moving only when the face moves or leans in or back clearly: `steady`);
 * until a face is found (or if the model doesn't load) the circle shows the middle of the face camera.
 * A canvas only draws while its tab is in front: the take freezes if the tab is hidden.
 */

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
/** how often the face is looked for (ms) */
const DETECT_MS = 100;
/** how far the crop moves toward its target each frame: its place, and (slower) its zoom */
const FOLLOW = 0.08, ZOOM_FOLLOW = 0.025;
/** the face's size is the median of this many looks (about a second), so one odd box doesn't count */
const SIZE_LOOKS = 10;
const FPS = 30;

let detector: Promise<FaceDetector> | null = null;
function loadDetector(): Promise<FaceDetector> {
  detector ??= import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, FaceDetector }) =>
    FaceDetector.createFromOptions(await FilesetResolver.forVisionTasks(WASM), {
      baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: "VIDEO", minDetectionConfidence: 0.5,
    }));
  detector.catch(() => { detector = null; });
  return detector;
}

export interface FaceCam {
  /** the picture with the circle, to show in place of the guitar camera */
  canvas: HTMLCanvasElement;
  /** the canvas as a video track: what the take records */
  track: MediaStreamTrack;
  setLook(look: FaceLook): void;
  stop(): void;
}

/** Draws `guitar` with `faceStream`'s face in a circle onto a new canvas until `stop`. `onProblem` hears a model that didn't load. */
export function startFaceCam(guitar: HTMLVideoElement, faceStream: MediaStream, look: FaceLook, onProblem: (text: string) => void): FaceCam {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  const face = document.createElement("video");
  face.muted = true;
  face.playsInline = true;
  face.srcObject = faceStream;
  void face.play().catch(() => { /* drawn once it plays */ });

  let current = look;
  let crop: Crop | null = null;
  let target: Crop | null = null;
  const sizes: number[] = [];
  let found: FaceDetector | null = null;
  let lastDetect = 0;
  let lastStamp = 0;
  let frame = 0;
  let stopped = false;
  loadDetector().then((d) => { found = d; }, (e) => { if (!stopped) onProblem(`The face finder didn't load (${e instanceof Error ? e.message : String(e)}), so the circle shows the middle of the face camera.`); });

  const draw = () => {
    if (stopped) return;
    frame = requestAnimationFrame(draw);
    const gw = guitar.videoWidth, gh = guitar.videoHeight;
    if (!gw || !gh) return;
    if (canvas.width !== gw || canvas.height !== gh) { canvas.width = gw; canvas.height = gh; }
    ctx.drawImage(guitar, 0, 0, gw, gh);
    const fw = face.videoWidth, fh = face.videoHeight;
    if (!fw || !fh || face.readyState < 2) return;
    const now = performance.now();
    if (found && now - lastDetect >= DETECT_MS) {
      lastDetect = now;
      // timestamps must keep rising for VIDEO mode
      const stamp = Math.max(lastStamp + 1, Math.round(now));
      lastStamp = stamp;
      try {
        const box = found.detectForVideo(face, stamp).detections[0]?.boundingBox;
        if (box) {
          sizes.push(Math.max(box.width, box.height));
          if (sizes.length > SIZE_LOOKS) sizes.shift();
          // the face's box squared to the median size of late, round its centre
          const size = median(sizes), x = box.originX + box.width / 2, y = box.originY + box.height / 2;
          target = steady(target, cropFor({ x: x - size / 2, y: y - size / 2, w: size, h: size }, fw, fh), fw, fh);
        }
      } catch { /* the next look */ }
    }
    const goal = target ?? cropFor(null, fw, fh);
    crop = crop ? ease(crop, goal, FOLLOW, ZOOM_FOLLOW) : goal;
    const { cx, cy, r } = circleAt(current, gw, gh);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(face, crop.x, crop.y, crop.side, crop.side, cx - r, cy - r, 2 * r, 2 * r);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, gh / 240);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
  };
  frame = requestAnimationFrame(draw);
  const track = canvas.captureStream(FPS).getVideoTracks()[0];

  return {
    canvas,
    track,
    setLook: (l) => { current = l; },
    stop: () => {
      stopped = true;
      cancelAnimationFrame(frame);
      track.stop();
      face.pause();
      face.srcObject = null;
    },
  };
}
