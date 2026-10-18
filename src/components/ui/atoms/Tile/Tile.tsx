import type { ReactNode } from "react";
import { HUE_TONES, hueClass, type Hue } from "../Hue";

/**
 * One option of a grid of picture buttons (an icon over a name), colour coded by `hue`. Pass `radio` inside a
 * role="radiogroup" to mark it with aria-checked; otherwise it is a toggle with aria-pressed.
 */
export function Tile({ hue, on, onClick, icon, children, title, radio }: {
  hue: Hue; on: boolean; onClick: () => void; icon: ReactNode; children: ReactNode; title?: string; radio?: boolean;
}) {
  const [rest, lit] = HUE_TONES[hue].disc;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      {...(radio ? { role: "radio", "aria-checked": on } : { "aria-pressed": on })}
      className={`group flex flex-col items-center gap-1.5 rounded-xl border px-1 pb-2 pt-2.5 text-[11px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${hueClass(hue, on)}`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-full transition ${on ? lit : `${rest} group-hover:scale-105`}`}>{icon}</span>
      {children}
    </button>
  );
}
