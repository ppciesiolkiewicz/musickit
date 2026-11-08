import type { ReactNode } from "react";

/**
 * Draws the eye to one round button until it has been used: while `active` it wobbles now and then and sends out two
 * staggered rings (the `tour-wobble` / `tour-ring` keyframes in globals.css). With reduced motion it is a still outline
 * instead. Inactive, it is just the child.
 */
export function AttentionRing({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return <>{children}</>;
  return (
    <span className="tour-wobble relative inline-flex shrink-0 rounded-full">
      {children}
      <span aria-hidden className="tour-ring pointer-events-none absolute inset-0 rounded-full border-2 border-sky-400" />
      <span aria-hidden className="tour-ring pointer-events-none absolute inset-0 rounded-full border-2 border-sky-400" style={{ animationDelay: "1.2s" }} />
    </span>
  );
}
