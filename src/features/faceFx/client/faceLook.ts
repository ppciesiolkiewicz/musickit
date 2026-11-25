import { FACE_OVAL, KEEP_SHARP, LEFT_EYE, MARGIN, RIGHT_EYE, faceFrame, slimAt, slimRow, slimX, toFace, type Pt } from "../model/face";
import type { FaceEffect } from "../model/settings";

/** How tall each strip Slim face moves is (px). */
const STRIP = 2;

const canvas = () => { const c = document.createElement("canvas"); return { c, x: c.getContext("2d")! }; };

/**
 * The face effects, drawn over the video in the face's place. The face is cut out of the frame upright (in its own frame,
 * `model/face.ts`) onto a small canvas, made over there (Slim face, Bright eyes, Smooth skin, Face light, in that order), and
 * drawn back with its edges faded, so only the face and a margin round it change. `filter` is the video's CSS filter, so the
 * patch is graded like the picture under it.
 */
export function createFaceLook() {
  const crop = canvas(), work = canvas(), tmp = canvas(), mask = canvas();

  /** Paints `paths` (rings of points in the crop) white on the mask, cutting out `holes`. */
  const paint = (paths: Pt[][], holes: Pt[][] = []) => {
    const m = mask.x;
    m.globalCompositeOperation = "source-over"; m.clearRect(0, 0, mask.c.width, mask.c.height); m.fillStyle = "white";
    const ring = (r: Pt[]) => { m.beginPath(); r.forEach((p, i) => (i ? m.lineTo(p.x, p.y) : m.moveTo(p.x, p.y))); m.closePath(); m.fill(); };
    paths.forEach(ring);
    m.globalCompositeOperation = "destination-out"; holes.forEach(ring);
    m.globalCompositeOperation = "source-over";
  };
  /** `work` once more through `filter`, kept where the mask is (its edges blurred by `feather`), laid over `work` at `alpha`. */
  const lay = (filter: string, feather: number, alpha: number) => {
    const t = tmp.x;
    t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, tmp.c.width, tmp.c.height);
    t.filter = filter; t.drawImage(work.c, 0, 0); t.filter = "none";
    t.globalCompositeOperation = "destination-in"; t.filter = `blur(${feather.toFixed(1)}px)`; t.drawImage(mask.c, 0, 0);
    t.filter = "none"; t.globalCompositeOperation = "source-over";
    work.x.globalAlpha = Math.min(1, alpha); work.x.drawImage(tmp.c, 0, 0); work.x.globalAlpha = 1;
  };

  return function draw(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, lm: Pt[], on: Set<FaceEffect>, strength: Record<FaceEffect, number>, filter: string) {
    const f = faceFrame(lm);
    if (!f || f.halfW < 12 || !on.size) return;
    const reach = f.halfW * (1 + MARGIN), top = f.top - f.halfW * 0.6, bottom = f.bottom + f.halfW * 0.4;
    const W = Math.ceil(2 * reach), H = Math.ceil(bottom - top);
    for (const k of [crop, work, tmp, mask]) if (k.c.width !== W || k.c.height !== H) { k.c.width = W; k.c.height = H; }
    // the crop's pixel (i, j) is the face's (i − reach, j + top)
    const toCrop = (p: Pt) => { const q = toFace(f, p); return { x: q.x + reach, y: q.y - top }; };

    // the face cut out upright, graded like the video
    const cx = crop.x;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, W, H);
    cx.setTransform(f.u.x, f.v.x, f.u.y, f.v.y, reach - (f.c.x * f.u.x + f.c.y * f.u.y), -top - (f.c.x * f.v.x + f.c.y * f.v.y));
    cx.filter = filter || "none"; cx.drawImage(video, 0, 0); cx.filter = "none";
    cx.setTransform(1, 0, 0, 1, 0, 0);

    // Slim face: each strip of rows moved in toward the middle, the crop's edges kept
    const wx = work.x;
    wx.clearRect(0, 0, W, H);
    const slim = on.has("slim") ? strength.slim : 0;
    const dOf = (b: number) => (slim ? slimAt(f, b, slim) : 0);
    if (slim) {
      for (let y = 0; y < H; y += STRIP) {
        const d = dOf(y + STRIP / 2 + top), h = Math.min(STRIP, H - y);
        if (d < 0.05) { wx.drawImage(crop.c, 0, y, W, h, 0, y, W, h); continue; }
        // a hair of overlap between pieces, so no seam shows
        for (const { from, to } of slimRow(reach, f.halfW, d)) {
          const sw = from[1] - from[0], dw = to[1] - to[0];
          wx.drawImage(crop.c, from[0] + reach, y, sw, h, to[0] + reach - 0.25, y, dw + 0.5, h);
        }
      }
    } else wx.drawImage(crop.c, 0, 0);
    // the landmarks where the warp put them
    const ring = (idx: number[]) => idx.map((i) => { const p = toCrop(lm[i]); return { x: slimX(p.x - reach, reach, f.halfW, dOf(p.y + top)) + reach, y: p.y }; });
    const oval = ring(FACE_OVAL), scale = f.halfW / 100;
    /** A ring grown by `k` round its middle. */
    const grown = (r: Pt[], k: number) => { const m = r.reduce((t, p) => ({ x: t.x + p.x / r.length, y: t.y + p.y / r.length }), { x: 0, y: 0 }); return r.map((p) => ({ x: m.x + (p.x - m.x) * k, y: m.y + (p.y - m.y) * k })); };

    if (on.has("eyes")) {
      const s = strength.eyes;
      paint([ring(RIGHT_EYE), ring(LEFT_EYE)]);
      lay(`brightness(${1 + 0.18 * s}) contrast(${1 + 0.1 * s}) saturate(${1 + 0.15 * s})`, 2 * scale, 0.8);
    }
    if (on.has("smooth")) {
      // the skin blurred, kept off the eyes, brows and lips, laid back over at part strength so the skin keeps some grain
      const s = strength.smooth;
      paint([oval], KEEP_SHARP.map((r, i) => grown(ring(r), i < 2 ? 1.7 : i < 4 ? 1.5 : 1.3)));
      lay(`blur(${(2 + 1.5 * s) * scale}px) brightness(1.02)`, 4 * scale, 0.3 + 0.25 * s);
    }
    if (on.has("light")) {
      const s = strength.light;
      paint([oval]);
      lay(`brightness(${1 + 0.1 * s}) sepia(${0.12 * s}) saturate(${1 + 0.08 * s}) contrast(${1 - 0.04 * s})`, 14 * scale, 0.9);
    }

    // kept only in a soft ellipse round the face and the margin Slim face stretches: outside it the picture is left as it
    // was, since every pass through the crop softens it a little
    const m = mask.x, half = (f.bottom - f.top) / 2;
    m.clearRect(0, 0, W, H); m.fillStyle = "white";
    m.beginPath(); m.ellipse(reach, (f.top + f.bottom) / 2 - top, reach * 0.9, half * 1.15, 0, 0, Math.PI * 2); m.fill();
    wx.globalCompositeOperation = "destination-in"; wx.filter = `blur(${(W * 0.03).toFixed(1)}px)`; wx.drawImage(mask.c, 0, 0);
    wx.filter = "none"; wx.globalCompositeOperation = "source-over";

    ctx.save();
    ctx.setTransform(f.u.x, f.u.y, f.v.x, f.v.y, f.c.x - reach * f.u.x + top * f.v.x, f.c.y - reach * f.u.y + top * f.v.y);
    ctx.drawImage(work.c, 0, 0);
    ctx.restore();
  };
}
