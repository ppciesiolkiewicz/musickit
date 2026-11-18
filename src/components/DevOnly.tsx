import type { ReactNode } from "react";
import { devUi } from "@/features/devtools/gate";

/** The mark on everything a player never sees: the same fuchsia as `DevName`. */
export function DevTag() {
  return <span className="self-start rounded bg-fuchsia-500/15 px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-300">dev</span>;
}

/**
 * A part of a real page that only development shows: nothing in a production build or with NEXT_PUBLIC_DEV_UI=off,
 * else the children under a `dev` tag inside a dashed outline. Every dev-only control on a player's page goes in one.
 * It hides the control only: a route the control calls is closed with `devOnly()` or `devGate()` on the server.
 */
export default function DevOnly({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (!devUi()) return null;
  return (
    <div data-dev-only className={`flex flex-col gap-2 rounded-lg border border-dashed border-fuchsia-500/30 p-2 ${className}`}>
      <DevTag />
      {children}
    </div>
  );
}
