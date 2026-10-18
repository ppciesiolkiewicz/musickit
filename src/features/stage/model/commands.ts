import { CAMERA_CORNER, FULL, type Stage, type StageAction } from "./layers";
import type { StudioCommand } from "./subject";

/**
 * What a studio command does to the stage (camera presets, camera off, clear). Starting and stopping streams (camera, screen share)
 * is the host's job; those commands change no layers here.
 */
export function stageCommand(stage: Stage, cmd: StudioCommand, newId: () => string): StageAction[] {
  const camera = stage.layers.find((l) => l.subject.kind === "camera");
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
    case "clear":
      return [{ type: "clear" }];
    default:
      return [];
  }
}
