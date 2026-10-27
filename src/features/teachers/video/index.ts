/**
 * Widget videos: the hidden render page (`/teachers/video/render`) the render script drives, the studio's preview of a
 * config, and the pure model behind them. Imports the stage, the creator's public index, sound and theory; nothing imports it
 * except its page and the studio (the preview).
 */
export { default as VideoRender } from "./VideoRender";
export { default as VideoPreview, pickVideoConfig, type VideoFile } from "./VideoPreview";
