import type { CSSProperties } from "react";
import Icon from "@/components/Icon";
import Photo, { type PhotoKey } from "./Photo";
import { DOT_INK, degreeColour } from "@/features/theory/scales";

/* Drawn pictures of private lessons inside the kit, not screenshots, so they follow the theme. */

const DISPLAY: CSSProperties = { fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' };

/** A minor pentatonic, box 1 at the 5th fret: [string row from high e, fret offset, degree index, label] */
const BOX: [number, number, number, string][] = [
  [0, 0, 0, "R"], [0, 3, 2, "♭3"], [1, 0, 4, "5"], [1, 3, 6, "♭7"], [2, 0, 2, "♭3"], [2, 2, 3, "4"],
  [3, 0, 6, "♭7"], [3, 2, 0, "R"], [4, 0, 3, "4"], [4, 2, 4, "5"], [5, 0, 0, "R"], [5, 3, 2, "♭3"],
];

function PentatonicBox({ highlight }: { highlight?: [number, number] }) {
  return (
    <svg viewBox="0 0 260 132" className="w-full" role="img" aria-label="A minor pentatonic box at the 5th fret, notes coloured by degree">
      <rect x={20} y={6} width={232} height={120} rx={6} fill="var(--color-slate-900)" />
      {[0, 1, 2, 3, 4].map((f) => <line key={f} x1={20 + f * 58} x2={20 + f * 58} y1={6} y2={126} stroke="var(--color-slate-700)" strokeWidth={2} />)}
      {[0, 1, 2, 3, 4, 5].map((s) => <line key={s} x1={20} x2={252} y1={16 + s * 20} y2={16 + s * 20} stroke="var(--color-slate-500)" strokeOpacity={0.7} strokeWidth={0.8 + s * 0.3} />)}
      <text x={8} y={70} fontSize={10} fill="var(--color-slate-500)" textAnchor="middle">5</text>
      {BOX.map(([s, f, d, l]) => {
        const lit = highlight && highlight[0] === s && highlight[1] === f;
        return (
          <g key={`${s}-${f}`}>
            {lit && <circle cx={49 + f * 58} cy={16 + s * 20} r={15} fill="none" stroke={degreeColour(d)} strokeWidth={2.5} className="wheel-ripple" style={{ animationIterationCount: "infinite", animationDuration: "1.6s" }} />}
            <circle cx={49 + f * 58} cy={16 + s * 20} r={lit ? 11 : 9} fill={degreeColour(d)} stroke={d === 0 ? "var(--color-slate-50)" : "none"} strokeWidth={2} />
            <text x={49 + f * 58} y={16.5 + s * 20} fontSize={l.length > 1 ? 7.5 : 9} fontWeight={700} fill={DOT_INK} textAnchor="middle" dominantBaseline="central">{l}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** What a student gets after a lesson: the shape, the exercises, what comes next. */
export function LessonNoteMock() {
  return (
    <div className="relative rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 shadow-2xl shadow-black/30 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Lesson note · week 3</p>
          <p className="text-lg text-slate-100" style={DISPLAY}>Minor pentatonic, box 1</p>
        </div>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">Preview</span>
      </div>
      <PentatonicBox />
      <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
        {[
          { done: true, t: "Box 1 up and down, landing on R" },
          { done: true, t: "Bend the 4 up to the 5" },
          { done: false, t: "Improvise over the A minor loop, 5 min a day" },
        ].map((x) => (
          <li key={x.t} className="flex items-start gap-2">
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${x.done ? "bg-emerald-500 text-slate-950" : "border border-slate-600"}`}>{x.done && <Icon name="check" size={11} />}</span>
            <span className={x.done ? "text-slate-400 line-through decoration-slate-600" : ""}>{x.t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">Next time: add the ♭5 and it becomes the blues scale.</p>
    </div>
  );
}

/** A video call tile: a cropped stock photo framed on the face, with the name tag and a mic dot like a real call. */
function Tile({ label, photo, focus, zoom = 1, speaking = false }: { label: string; photo: PhotoKey; focus: string; zoom?: number; speaking?: boolean }) {
  return (
    <div className={`relative aspect-4/3 overflow-hidden rounded-xl ${speaking ? "ring-2 ring-emerald-400" : "ring-1 ring-slate-700"}`}>
      {/* zoomed in round the face, so a wide shot reads as a webcam */}
      <div className="h-full w-full" style={{ transform: `scale(${zoom})`, transformOrigin: focus }}>
        <Photo name={photo} focus={focus} width={600} sizes="240px" credit={false} className="h-full w-full" />
      </div>
      <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-slate-950/70 px-1.5 text-[10px] text-slate-100">
        {speaking && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
        {label}
      </span>
    </div>
  );
}

/** A lesson in progress: teacher and student on camera, and between them the neck the teacher just brought up, a note pointed at. */
export function LiveLessonMock() {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-3 shadow-2xl shadow-black/30 backdrop-blur sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        <span className="font-medium text-slate-200">Live lesson</span>
        <span className="tabular-nums">24:10</span>
        <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5">Preview</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <div className="relative rounded-xl border border-slate-800 bg-slate-950/60 p-2">
          <p className="mb-1 px-1 text-[11px] text-slate-500">Your teacher is showing <b className="font-medium text-slate-300">A minor pentatonic</b></p>
          <PentatonicBox highlight={[2, 2]} />
          {/* the teacher's pointer, as in a shared document */}
          <div className="pointer-events-none absolute left-[52%] top-[50%] flex items-start gap-1" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 1l5.5 13 1.8-5.2L13.5 7z" fill="var(--color-sky-400)" stroke="var(--color-slate-950)" strokeWidth="1" /></svg>
            <span className="mt-3 whitespace-nowrap rounded-md bg-sky-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">Bend this one</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Tile label="Teacher" photo="teacherSmile" focus="40% 32%" zoom={1.7} speaking />
          <Tile label="You" photo="couch" focus="50% 25%" zoom={1.5} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {[
          { l: "Scales", c: "border-amber-500/40 text-amber-200" },
          { l: "Chords", c: "border-sky-500/40 text-sky-200" },
          { l: "Drone", c: "border-violet-500/40 text-violet-200" },
          { l: "Looper", c: "border-teal-500/40 text-teal-200" },
          { l: "Tuner", c: "border-emerald-500/40 text-emerald-200" },
        ].map((t) => (
          <span key={t.l} className={`rounded-full border px-2 py-0.5 ${t.c}`}>{t.l}</span>
        ))}
        <span className="text-slate-500">one click away</span>
      </div>
    </div>
  );
}
