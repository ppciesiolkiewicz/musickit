import { CAMERA_CORNER, FULL, SCREEN_CORNER, type FrameRect, type Stage, type StageAction } from "./layers";
import type { StudioCommand } from "./subject";

/** where the camera or the screen share is: not on the stage, minimized (anywhere smaller than the frame), or full frame */
export type MediaPlace = "none" | "corner" | "full";
export interface MediaState {
  camera: MediaPlace;
  screen: MediaPlace;
}

export const NO_MEDIA: MediaState = { camera: "none", screen: "none" };

const isFull = (r: FrameRect) => Math.abs(r.x) < 1e-6 && Math.abs(r.y) < 1e-6 && Math.abs(r.w - 1) < 1e-6 && Math.abs(r.h - 1) < 1e-6;

export function mediaState(stage: Stage): MediaState {
  const place = (kind: "camera" | "screen"): MediaPlace => {
    const l = stage.layers.find((x) => x.subject.kind === kind);
    return !l ? "none" : isFull(l.rect) ? "full" : "corner";
  };
  return { camera: place("camera"), screen: place("screen") };
}

/** the command that flips camera or screen between full frame and minimized; null for a screen that is not shared */
export function toggleFull(kind: "camera" | "screen", m: MediaState): StudioCommand | null {
  if (kind === "camera") return m.camera === "full" ? "camera-corner" : "camera-full";
  if (m.screen === "none") return null;
  return m.screen === "full" ? "screen-corner" : "screen-full";
}

/**
 * What a studio command does to the stage: camera and screen presets, close, clear. Opening streams (the camera's own button,
 * Chrome's screen picker) is the host's job, so `screen-share` changes no layers here, and screen presets never add a layer.
 */
export function stageCommand(stage: Stage, cmd: StudioCommand, newId: () => string): StageAction[] {
  const camera = stage.layers.find((l) => l.subject.kind === "camera");
  const screen = stage.layers.find((l) => l.subject.kind === "screen");
  switch (cmd) {
    case "camera-corner":
    case "camera-full": {
      const rect = cmd === "camera-full" ? FULL : CAMERA_CORNER;
      if (camera) return [{ type: "setRect", id: camera.id, rect }, { type: "select", id: camera.id }];
      const id = newId();
      return [{ type: "addSubject", id, subject: { kind: "camera" } }, { type: "setRect", id, rect }];
    }
    case "camera-off":
      return camera ? [{ type: "remove", id: camera.id }] : [];
    case "screen-corner":
    case "screen-full":
      return screen ? [{ type: "setRect", id: screen.id, rect: cmd === "screen-full" ? FULL : SCREEN_CORNER }, { type: "select", id: screen.id }] : [];
    case "screen-stop":
      return screen ? [{ type: "remove", id: screen.id }] : [];
    case "clear":
      return [{ type: "clear" }];
    case "screen-share":
      return [];
  }
}
