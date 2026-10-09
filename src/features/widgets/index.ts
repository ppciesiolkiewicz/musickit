/**
 * The widgets module: a board of movable, resizable panels that stay inside it. Layout maths are pure (board.ts, tested);
 * WidgetBoard.tsx is the view. Knows nothing about what the widgets show.
 */
export { default as WidgetBoard, type BoardWidget } from "./WidgetBoard";
export * from "./board";
