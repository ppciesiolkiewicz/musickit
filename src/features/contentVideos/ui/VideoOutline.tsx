import { LATER_PLANS, NO_VIDEO, VIDEO_PLANS, type Beat } from "../model/recordPlan";

/**
 * A tool's planned video (`model/recordPlan.ts`): for one of the first videos its script, part by part (what to show,
 * then the words to say); for a later one its notes. On the Tools videos page under a tool and on the record page above
 * the camera. A tool with no video planned says why; a key the plan doesn't know draws nothing.
 */

/** A script, part by part: what is on camera and on screen, then the words to say. */
export function Script({ beats }: { beats: Beat[] }) {
  return (
    <ol className="mt-2 flex flex-col gap-3">
      {beats.map((b, i) => (
        <li key={i} className="grid gap-x-3 gap-y-0.5 sm:grid-cols-[1.5rem_1fr]">
          <span className="text-xs text-slate-500 sm:pt-0.5 sm:text-right">{i + 1}</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-slate-400"><span className="font-semibold uppercase tracking-wide text-slate-500">Show </span>{b.show}</p>
            <p className="max-w-3xl whitespace-pre-line text-slate-200">{b.say}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Notes({ notes }: { notes: string[] }) {
  return <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-slate-300">{notes.map((s) => <li key={s}>{s}</li>)}</ol>;
}

const box = "rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm";

export default function VideoOutline({ tool, open = true }: { tool: string; open?: boolean }) {
  if (Object.hasOwn(NO_VIDEO, tool)) return <p className={`${box} text-slate-400`}>No video is planned for this tool. {NO_VIDEO[tool]}</p>;
  if (Object.hasOwn(VIDEO_PLANS, tool)) {
    const plan = VIDEO_PLANS[tool];
    return (
      <details open={open} className={box}>
        <summary className="cursor-pointer text-slate-200">Script <span className="text-xs text-slate-500">· “{plan.title}” · about {plan.minutes} min · one video for every level</span></summary>
        <Script beats={plan.script} />
      </details>
    );
  }
  if (Object.hasOwn(LATER_PLANS, tool)) {
    const plan = LATER_PLANS[tool];
    return (
      <details open={open} className={box}>
        <summary className="cursor-pointer text-slate-200">Notes for a later video <span className="text-xs text-slate-500">· “{plan.title}” · no script yet</span></summary>
        <Notes notes={plan.notes} />
      </details>
    );
  }
  return null;
}
