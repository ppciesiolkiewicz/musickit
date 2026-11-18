/**
 * The save notice's words that depend on who is reading (`SaveNotice.tsx`), pure so they are tested. A document can be
 * changed elsewhere by the player's other tab or device; only a teacher's student (`Account.taught`) has a teacher
 * who can change it too, so only they are told so.
 */

/** A save refused because the document changed since this page loaded (`stale`): the page reloads with the newer version. */
export function staleWords(taught: boolean): { title: string; body: string } {
  const where = taught ? "in another tab, on another device or by your teacher" : "in another tab or on another device";
  return {
    title: "Your last change wasn't saved.",
    body: `Your data was changed ${where}, so this page is reloading with the newer version.`,
  };
}
