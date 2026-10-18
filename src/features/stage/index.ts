/**
 * The stage: what goes in the teacher studio's 16:9 frame.
 *
 *   model/    subjects, layers (frame fractions), palette search, keys: pure and tested
 *   render/   a subject as a live widget (StageWidget), injectable so the editor can replay the widget track
 *   StageFrame   the frame and its layers
 *
 * Imports theory, sound, instruments (public index), the creator's public index, chordKit and shared components. Nothing here
 * knows about recording or the studio page.
 */
export { default as StageFrame } from "./StageFrame";
export * from "./model/subject";
export * from "./model/layers";
export { searchPalette } from "./model/search";
export * from "./model/keys";
export { stageCommand } from "./model/commands";
export { default as StageWidget, type StageWidgetProps } from "./render/StageWidget";
export { CameraLayer, ScreenLayer } from "./render/MediaLayer";
