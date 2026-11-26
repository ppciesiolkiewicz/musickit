import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";

/** A control of the sing-along player drawn inline in the text, as it looks on the screen: its icon and label. Not a button. */
function Control({ icon, children }: { icon: IconName; children?: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 whitespace-nowrap rounded-md border border-slate-600/70 bg-slate-800/80 px-1.5 py-0.5 align-middle text-xs font-medium text-slate-100 shadow-sm shadow-black/30">
      <Icon name={icon} size={13} />
      {children}
    </span>
  );
}

/**
 * The sing-along player's controls, said once for a singing article (`{ type: "player" }`): the view, the sounds, the loop,
 * full screen and the Accuracy setting, each with the control drawn inline as it is on the screen (labels from
 * `exercises/basics/sing-along/SingAlong.tsx` and `settings/rows.tsx`).
 */
export default function PlayerControls() {
  return (
    <aside aria-label="The player's controls" className="metal-panel flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-slate-300 sm:p-5">
      <p className="font-semibold text-slate-50">The runs play in a player with a few handy controls:</p>
      <ul className="flex flex-col gap-2 pl-1">
        <li><Control icon="music">Staff</Control> or <Control icon="piano">Piano roll</Control> shows the notes as written, or as bars at their pitch. The piano roll keeps the line your voice took.</li>
        <li><Control icon="piano">Tune</Control> <Control icon="music">Chords</Control> <Control icon="metronome">Click</Control> mute or bring back each sound. Once you know a run, mute the tune and sing it over the chords alone.</li>
        <li><Control icon="repeat" /> loops a part: drag the two markers on the strip above the staff round the hard bit.</li>
        <li><Control icon="maximize" /> Full screen makes the notes big, so you can step back and sing.</li>
        <li><Control icon="sliders-horizontal" /> holds <strong className="text-slate-50">Accuracy</strong>, how close counts as on the note: Easy, Medium, Hard or Pro. Start on Easy and make it stricter as you improve.</li>
      </ul>
    </aside>
  );
}
