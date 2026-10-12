/**
 * What a click on the menu button does. With a mouse, hovering already opened the menu, so the click that usually follows
 * must keep it open rather than toggle it shut. Touch and keyboard clicks toggle.
 */
export function menuClick({ open, hoverOpenedAt, now, pointerType }: { open: boolean; hoverOpenedAt: number | null; now: number; pointerType: string }): boolean {
  if (pointerType === "mouse" && open && hoverOpenedAt !== null && now - hoverOpenedAt < 800) return true;
  return !open;
}
