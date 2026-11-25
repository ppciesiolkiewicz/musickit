import { axisOf, keepMarkers, readStrip, stripOf, toFrame, STRIP_HALF, type BoardMarker, type Carry, type Seen } from "../model/cvFrets";
import type { Pt } from "../model/grid";

/**
 * The OpenCV neck reader in the browser: OpenCV.js (fetched from jsDelivr on first use, about 10 MB) finds the markers and
 * does the image work; `model/cvFrets.ts` does the maths. One reader per video: it keeps the last frame to follow a marker
 * missed for a few frames.
 */
const CV_URL = "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js";
/** How many frames a missed marker is followed from where it was. */
const FOLLOW = 8;

// OpenCV.js ships no types for the build loaded here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cv = any;
// kept wrapped: the module is a thenable that resolves to itself, so a promise must never resolve to it directly
let loading: Promise<{ cv: Cv }> | null = null;
function loadCv(): Promise<{ cv: Cv }> {
  loading ??= new Promise<{ cv: Cv }>((resolve, reject) => {
    const w = window as unknown as { cv?: Cv };
    const ready = (cv: Cv) => {
      if (cv?.Mat) resolve({ cv });
      else if (typeof cv?.then === "function") cv.then((m: Cv) => resolve({ cv: m }));
      else if (cv) cv.onRuntimeInitialized = () => resolve({ cv });
      else reject(new Error("OpenCV.js loaded without cv"));
    };
    if (w.cv) { ready(w.cv); return; }
    const s = document.createElement("script");
    s.src = CV_URL; s.async = true;
    s.onload = () => ready(w.cv);
    s.onerror = () => reject(new Error("OpenCV.js didn't download"));
    document.head.appendChild(s);
  });
  loading.catch(() => { loading = null; });
  return loading;
}

/** A frame read: the markers seen (and which were followed, not found), and each wire's two ends on the board's edges. */
export interface CvRead { markers: Seen[]; followed: number[]; wires: { top: Pt; bottom: Pt }[] | null; ms: number }
export interface CvReader { read(img: ImageData, board: BoardMarker[]): CvRead; close(): void }

export async function loadCvReader(): Promise<CvReader> {
  const { cv } = await loadCv();
  const p = new cv.aruco_DetectorParameters();
  // several threshold sizes for small markers; strings across a marker are blurred away before this, and a few wrong bits
  // are corrected
  Object.assign(p, {
    adaptiveThreshWinSizeMin: 5, adaptiveThreshWinSizeMax: 35, adaptiveThreshWinSizeStep: 10, minMarkerPerimeterRate: 0.03,
    polygonalApproxAccuracyRate: 0.05, perspectiveRemovePixelPerCell: 8, perspectiveRemoveIgnoredMarginPerCell: 0.25,
    maxErroneousBitsInBorderRate: 0.5, errorCorrectionRate: 0.6, cornerRefinementMethod: cv.CORNER_REFINE_SUBPIX,
  });
  const det = new cv.aruco_ArucoDetector(cv.getPredefinedDictionary(cv.DICT_ARUCO_MIP_36h12), p, new cv.aruco_RefineParameters(10, 3, true));
  const rgba = new cv.Mat(), gray = new cv.Mat(), prev = new cv.Mat(), med = new cv.Mat(), ids = new cv.Mat();
  const corners = new cv.MatVector(), rejected = new cv.MatVector();
  const strip = new cv.Mat(), blur = new cv.Mat(), blurF = new cv.Mat(), gy = new cv.Mat(), valid = new cv.Mat();
  const kernel = cv.Mat.ones(9, 9, cv.CV_8U);
  const crit = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 30, 0.01);
  let last = new Map<number, { corners: Pt[]; age: number }>();
  const carry: Carry = {};
  let hasPrev = false;

  /** Follow a marker's corners from the last frame to this one; null unless every corner comes back to where it was. */
  const follow = (pts: Pt[]): Pt[] | null => {
    const from = cv.matFromArray(4, 1, cv.CV_32FC2, pts.flatMap((q) => [q.x, q.y]));
    const to = new cv.Mat(), back = new cv.Mat(), st = new cv.Mat(), st2 = new cv.Mat(), err = new cv.Mat();
    try {
      cv.calcOpticalFlowPyrLK(prev, gray, from, to, st, err, new cv.Size(21, 21), 3, crit);
      cv.calcOpticalFlowPyrLK(gray, prev, to, back, st2, err, new cv.Size(21, 21), 3, crit);
      for (let i = 0; i < 4; i++) {
        if (!st.data[i] || !st2.data[i]) return null;
        if (Math.hypot(back.data32F[2 * i] - pts[i].x, back.data32F[2 * i + 1] - pts[i].y) > 1) return null;
      }
      return [0, 1, 2, 3].map((i) => ({ x: to.data32F[2 * i], y: to.data32F[2 * i + 1] }));
    } finally { for (const m of [from, to, back, st, st2, err]) m.delete(); }
  };

  return {
    read(img, board) {
      const t0 = performance.now();
      const fresh = cv.matFromImageData(img);
      fresh.copyTo(rgba); fresh.delete();
      cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
      // the median blur wipes the strings off the markers
      cv.medianBlur(gray, med, 5);
      det.detectMarkers(med, corners, ids, rejected);
      const raw: Seen[] = [];
      for (let i = 0; i < ids.rows; i++) {
        const one = corners.get(i), c = one.data32F;
        raw.push({ id: ids.data32S[i], corners: [0, 1, 2, 3].map((k) => ({ x: c[2 * k], y: c[2 * k + 1] })) });
        one.delete();
      }
      const wanted = new Set(board.map((b) => b.id));
      const found = keepMarkers(raw, img.width * 0.012).filter((m) => wanted.has(m.id));
      const next = new Map(found.map((m) => [m.id, { corners: m.corners, age: 0 }]));
      const followed: number[] = [];
      if (hasPrev) for (const [id, l] of last) {
        if (next.has(id) || l.age >= FOLLOW) continue;
        const moved = follow(l.corners);
        if (moved) { next.set(id, { corners: moved, age: l.age + 1 }); followed.push(id); }
      }
      last = next;
      gray.copyTo(prev); hasPrev = true;
      const markers = [...next].map(([id, l]) => ({ id, corners: l.corners }));

      let wires: CvRead["wires"] = null;
      const ax = axisOf(markers, board), st = ax && stripOf(ax);
      if (ax && st) {
        const size = new cv.Size(st.len, 2 * STRIP_HALF);
        const M = cv.matFromArray(2, 3, cv.CV_64F, st.toFrame);
        cv.warpAffine(gray, strip, M, size, cv.INTER_LINEAR | cv.WARP_INVERSE_MAP, cv.BORDER_REPLICATE, new cv.Scalar());
        // where the strip is off the frame: no edges there
        const full = new cv.Mat(gray.rows, gray.cols, cv.CV_8U, new cv.Scalar(255));
        cv.warpAffine(full, valid, M, size, cv.INTER_NEAREST | cv.WARP_INVERSE_MAP, cv.BORDER_CONSTANT, new cv.Scalar(0));
        full.delete(); M.delete();
        cv.erode(valid, valid, kernel);
        cv.GaussianBlur(strip, blur, new cv.Size(0, 0), 2);
        blur.convertTo(blurF, cv.CV_32F);
        cv.Sobel(blurF, gy, cv.CV_32F, 0, 1, 5);
        const g = gy.data32F as Float32Array, v = valid.data as Uint8Array;
        for (let i = 0; i < g.length; i++) if (!v[i]) g[i] = 0;
        const read = readStrip(ax, st, strip.data as Uint8Array, g, carry);
        wires = read && read.map((w) => ({ top: toFrame(st, w.top), bottom: toFrame(st, w.bottom) }));
      }
      return { markers, followed, wires, ms: performance.now() - t0 };
    },
    close() {
      for (const m of [rgba, gray, prev, med, ids, corners, rejected, strip, blur, blurF, gy, valid, kernel, det, p]) m.delete();
    },
  };
}
