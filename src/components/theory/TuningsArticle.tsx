"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { strum } from "@/features/sound";
import { A4_PRESETS, instrumentById, midiToHz, type InstrumentId, type Tuning } from "@/features/theory";
import { btnSm } from "@/components/ui";

const H2 = ({ id, children }: { id: string; children: ReactNode }) => <h2 id={id} className="mt-4 scroll-mt-4 text-lg font-light text-slate-100">{children}</h2>;
const P = ({ children }: { children: ReactNode }) => <p className="max-w-3xl text-sm leading-relaxed text-slate-300">{children}</p>;

/** One tuning: its strings with their pitch at A440, a button to hear them low to high, and a link that opens the tuner on it. */
function TuningCard({ instrument, tuning }: { instrument: InstrumentId; tuning: Tuning }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-slate-100">{tuning.name}</h3>
        <span className="ml-auto flex gap-1.5">
          <button type="button" className={`cursor-pointer ${btnSm}`} onClick={() => strum(tuning.strings.map((s) => s.midi), { gapMs: 220, holdMs: 2200 })}>▶ Hear</button>
          <Link className={btnSm} href={`/tuner?instrument=${instrument}&tuning=${tuning.id}`}>Tune</Link>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tuning.strings.map((s, i) => (
          <button key={i} type="button" onClick={() => strum([s.midi], { gapMs: 0, holdMs: 1500 })} title={`Hear ${s.name}${s.octave}`}
            className="cursor-pointer flex min-w-12 flex-col items-center rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-1 hover:border-slate-600">
            <span className="text-sm text-slate-100">{s.name}<span className="text-[10px] text-slate-500">{s.octave}</span></span>
            <span className="text-[10px] tabular-nums text-slate-500">{midiToHz(s.midi).toFixed(1)}</span>
          </button>
        ))}
      </div>
      {tuning.note && <p className="text-xs text-slate-400">{tuning.note}</p>}
    </div>
  );
}

function Tunings({ instrument, only }: { instrument: InstrumentId; only?: string[] }) {
  const inst = instrumentById(instrument)!;
  const list = only ? inst.tunings.filter((t) => only.includes(t.id)) : inst.tunings;
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((t) => <TuningCard key={t.id} instrument={instrument} tuning={t} />)}
    </div>
  );
}

const SECTIONS = [
  ["what", "What a tuning is"],
  ["reference", "The reference pitch: A4"],
  ["guitar", "Guitar"],
  ["bass", "Bass"],
  ["ukulele", "Ukulele"],
  ["fifths", "Violin, viola, cello, mandolin"],
  ["banjo", "Banjo"],
  ["tips", "Tuning tips"],
];

/** The Tunings article: reference pitch, then each instrument's standard and alternate tunings, every one playable and openable in the tuner. */
export default function TuningsArticle() {
  return (
    <article className="flex flex-col gap-3">
      <nav aria-label="On this page" className="flex flex-wrap gap-1.5">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className={btnSm}>{label}</a>)}
      </nav>

      <H2 id="what">What a tuning is</H2>
      <P>
        A tuning is the set of notes the open strings of an instrument are set to. It decides which chords fall under the fingers, how far a
        hand can reach and how the instrument rings. The intervals between the strings matter more than the notes themselves: tune every string
        of a guitar down a semitone and every shape you know still works, it just sounds lower. Change one interval and the shapes change.
      </P>
      <P>
        Strings are named from the lowest (thickest) to the highest. The number after a note is its octave: A4 is the A above middle C (C4).
        Click any string below to hear it, ▶ Hear to hear the whole tuning, or Tune to open the <Link href="/tuner" className="text-sky-300 hover:underline">tuner</Link> on it.
      </P>

      <H2 id="reference">The reference pitch: A4</H2>
      <P>
        Every note is tuned relative to one reference, the A above middle C. Today that is almost always <b>440 Hz</b> (an international standard
        since 1955, ISO 16). In equal temperament every semitone is the twelfth root of two (about 1.0595) times the one below, and a semitone is
        divided into 100 <b>cents</b>, so once A4 is fixed every other note follows: f = A4 × 2<sup>(n − 69) / 12</sup> for MIDI note n.
      </P>
      <div>
        <table className="w-full max-w-3xl text-left text-xs text-slate-300">
          <thead className="text-slate-500">
            <tr><th className="py-1 pr-4 font-normal">A4</th><th className="py-1 pr-4 font-normal">Used for</th><th className="py-1 pr-4 font-normal">Low E (E2)</th><th className="py-1 font-normal">vs 440</th></tr>
          </thead>
          <tbody>
            {A4_PRESETS.map((p) => (
              <tr key={p.hz} className="border-t border-slate-800">
                <td className="py-1 pr-4 tabular-nums">{p.hz} Hz</td>
                <td className="py-1 pr-4">{p.note}</td>
                <td className="py-1 pr-4 tabular-nums">{midiToHz(40, p.hz).toFixed(2)} Hz</td>
                <td className="py-1 tabular-nums">{p.hz === 440 ? "–" : `${p.hz > 440 ? "+" : ""}${Math.round(1200 * Math.log2(p.hz / 440))} cents`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        Many orchestras tune a little higher, to 442 or 443 Hz (some up to 444), for a brighter sound. Early-music groups play Baroque repertoire
        at 415 Hz, almost exactly a semitone below 440, which is why harpsichords often have a transposing keyboard. 432 Hz has a following that
        credits it with special properties; there is no evidence for them, but it is a perfectly good choice if you want to sound a third of a
        semitone low. What matters is that everyone playing together uses the same A. The tuner lets you pick any of these, or type your own.
      </P>

      <H2 id="guitar">Guitar</H2>
      <P>
        Standard tuning, E A D G B E, has a perfect fourth between neighbouring strings except one major third between G and B. Fourths keep scale
        shapes compact; the one third makes common chords fit under four fingers. The cost is that every shape shifts by a fret when it crosses
        the G–B pair. Alternate tunings fall into a few families:
      </P>
      <ul className="max-w-3xl list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li><b>Lowered</b>: standard shifted down (half step, whole step). Same shapes, lower pitch, slacker strings for easier bends; also suits a singer&apos;s range.</li>
        <li><b>Drop</b>: only the lowest string goes down a tone (Drop D, Drop C). Power chords become one finger, and you gain a low note.</li>
        <li><b>Open</b>: the open strings form a major chord (Open G, D, E, C). Barre one finger across for any chord: the home of slide guitar.</li>
        <li><b>Modal</b>: open strings that leave the third out, like DADGAD (a Dsus4), so they ring under both major and minor melodies.</li>
      </ul>
      <Tunings instrument="guitar" />

      <H2 id="bass">Bass</H2>
      <P>
        The bass is tuned like the four lowest guitar strings an octave down, all in fourths. Five-string basses add a low B; drop and lowered
        tunings work just like on the guitar. The lowest notes sit around 31–41 Hz, close to the bottom of hearing, which is why a tuner listens
        more slowly for them.
      </P>
      <Tunings instrument="bass" />

      <H2 id="ukulele">Ukulele</H2>
      <P>
        The ukulele uses the same intervals as the top four guitar strings, moved up a fourth: G C E A. Its standard tuning is <b>re-entrant</b>:
        the G string, nearest your chin, is tuned higher than the C next to it, so the strings do not run low to high. That gives the bright,
        close-voiced strum. Low G tuning swaps in a G an octave lower for a fuller range. The baritone ukulele is tuned exactly like the top four
        strings of a guitar.
      </P>
      <Tunings instrument="ukulele" />

      <H2 id="fifths">Violin, viola, cello, mandolin</H2>
      <P>
        The bowed strings are tuned in perfect fifths, a wider interval than the guitar&apos;s fourths: each string covers more notes, and every
        string pair has the same shape, so fingerings move across the neck unchanged. The violin is G D A E; the viola drops the E and adds a C
        below (C G D A); the cello is the viola an octave lower. The mandolin borrows the violin tuning, doubled into four pairs of strings, so
        violin fingerings and fiddle tunes carry straight over.
      </P>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(["violin", "viola", "cello", "mandolin"] as const).map((id) => (
          <div key={id} className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-slate-500">{instrumentById(id)!.name}</span>
            <TuningCard instrument={id} tuning={instrumentById(id)!.tunings[0]} />
          </div>
        ))}
      </div>

      <H2 id="banjo">Banjo</H2>
      <P>
        The five-string banjo is usually in open G with a twist: the fifth string is short, starts at the fifth fret, and is tuned to a high G.
        Played by the thumb, it is a drone that rings through bluegrass rolls. Double C lowers the fourth and second strings for tunes in C.
      </P>
      <Tunings instrument="banjo" />

      <H2 id="tips">Tuning tips</H2>
      <ul className="max-w-3xl list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li><b>Tune up to the note.</b> If a string is sharp, go below the note and come back up: the gear and string settle and hold better.</li>
        <li><b>Go round twice</b> after a big change (an open tuning, new strings). The neck bends with the new tension and pulls the first strings out again.</li>
        <li><b>Pluck, then wait.</b> The first instant of a note is sharp and noisy; read the tuner once the note settles.</li>
        <li><b>Lower tunings like heavier strings.</b> A tone or more down, thin strings flap and buzz; a heavier set keeps the feel.</li>
        <li><b>Tune to the band, not to 440,</b> when playing with a piano or an orchestra that uses another A: set the tuner&apos;s A4 to match.</li>
      </ul>
    </article>
  );
}
