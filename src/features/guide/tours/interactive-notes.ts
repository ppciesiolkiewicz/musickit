import type { TourStep } from "../tour";

/**
 * The Interactive notes page tour (the notes creator, /teachers/studio?notes=1): add a widget, the note itself, View as a note and
 * Share as a note. The steps in the page's own list say the same in a line each; the tour shows where each control is.
 */
export const INTERACTIVE_NOTES_TOUR: TourStep[] = [
  {
    target: "notes-add",
    title: "Add a widget",
    text: "Press Add a widget to put a scale, a chord box, a neck, a video or some text in the note. You can also press / or ⌘K.",
  },
  {
    target: "notes-note",
    title: "Your note",
    text: "Type a title at the top. Change a widget with the Settings under it. Drag a widget by its handle to move it. The buttons over a widget add a new one above or below it, or delete it.",
  },
  {
    target: "notes-view",
    title: "View as a note",
    text: "Press View as a note to see the page as your students will. Press Back to editing to return here.",
  },
  {
    target: "notes-share",
    title: "Share as a note",
    text: "Sharing isn't open yet. Once it opens, press Share as a note to send this note to your students.",
  },
];
