import type { ReactNode } from "react";

/** One box of the signal path. */
function Step({ title, children, tone = "slate" }: { title: string; children: ReactNode; tone?: "slate" | "amber" | "sky" | "emerald" }) {
  const tones = {
    slate: "border-slate-700 bg-slate-900",
    amber: "border-amber-500/50 bg-amber-500/10",
    sky: "border-sky-500/50 bg-sky-500/10",
    emerald: "border-emerald-500/50 bg-emerald-500/10",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <h3 className="text-sm font-medium text-slate-100">{title}</h3>
      <div className="mt-1 text-xs leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

const Arrow = () => <div className="text-center text-slate-500" aria-hidden>↓</div>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-light text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

/** Temporary explainer of the looper's routing, for a BOSS RC-505 (or any interface) feeding the app. */
export default function RoutingGuide() {
  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Section title="The path">
        <Step title="BOSS RC-505" tone="amber">
          Your mic and instrument, its input and track effects, the five tracks and the rhythm (drum kit) are mixed <em>inside</em> the RC-505
          by its output mixer. It sends that mix out of MAIN OUT, SUB OUT 1 and 2, the phones, and over USB as an audio device.
        </Step>
        <Arrow />
        <Step title="The computer and the browser">
          The browser opens the device and hands the app its channels. Chrome gives at most 2 channels per device, whatever the
          device has; so from one device the app gets one stereo pair (Inputs 1-2).
        </Step>
        <Arrow />
        <Step title="Input strip" tone="sky">
          One strip per thing you want to treat separately. Each strip picks its channels (Input 1, Input 2, Inputs 1-2 in stereo or mixed
          to mono, and Inputs 3-4 … on bigger interfaces), and has its own volume, mute, solo, &ldquo;Hear it&rdquo; and effects, before or after the fader.
        </Step>
        <Arrow />
        <Step title="The strip's buses (in its block)">
          A guitar or piano strip can have tone buses inside its block (Clean, Crunch, the amps…), one or several on at a time. Their sound is
          the strip&rsquo;s one output, which goes where &ldquo;Output goes to&rdquo; says: the master, and the recorder of any group.
        </Step>
        <Arrow />
        <Step title="Looping: groups and loops" tone="emerald">
          A take records what is sent to that group. The loop plays back through its group&rsquo;s bus (effects, volume). Sequencers (the
          app&rsquo;s own drums and bass) sit in a group and play through its bus too.
        </Step>
        <Arrow />
        <Step title="Master bus → output">Master effects and volume, then the output device (your interface&rsquo;s outputs or the computer).</Step>
      </Section>

      <div className="flex flex-col gap-8">
        <Section title="What the app hears from the RC-505">
          <p className="text-sm text-slate-300">
            Over USB (and from MAIN OUT) the RC-505 sends <strong>one finished stereo mix</strong>: drum kit, loops and live input together. The
            app cannot pull the drums back out of that mix. An effect you add on that strip (say a reverb) goes on everything in it, drums
            included. Effects inside the RC-505 (input FX, track FX) are already printed into the sound before the app sees it.
          </p>
        </Section>

        <Section title="Effects on the drums and the loops separately">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-300">
            <li>On the RC-505, send the rhythm (and any tracks you want apart) to a SUB OUT, and the rest to MAIN, in its output routing settings.</li>
            <li>
              Get both pairs into the computer. With Chrome the easy way is two devices: the RC-505&rsquo;s USB audio (one pair) plus SUB OUT
              cabled into your audio interface (another pair). A browser that gives more than 2 channels per device can also take a
              4-input interface fed with MAIN and SUB.
            </li>
            <li>In the looper: Add, Hardware, pick a device. The channel meters show which channels have sound, and the one you play into is picked for you.</li>
            <li>
              Pick <strong>Every channel separately</strong> for one strip per channel, or one stereo pair per strip (Inputs 1-2, Inputs 3-4).
              Each strip gets its own effects, so the drums can have one chain and the loops another.
            </li>
          </ol>
        </Section>

        <Section title="Hearing it once, without feedback">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
            <li>
              Listen in <strong>one</strong> place. If the RC-505&rsquo;s MAIN OUT goes to your speakers and the strip&rsquo;s &ldquo;Hear it&rdquo; is on too,
              you hear everything twice, the app&rsquo;s copy a little late. Either listen to the RC-505 directly and turn &ldquo;Hear it&rdquo; off (the
              app&rsquo;s effects are then only in what it records), or listen only through the app.
            </li>
            <li>
              If the app&rsquo;s output device is the RC-505 itself, make sure the RC-505 does not send the sound coming from the computer back
              to the computer (its USB routing), or the sound goes round in a loop.
            </li>
          </ul>
        </Section>

        <Section title="Timing">
          <p className="text-sm text-slate-300">
            The RC-505&rsquo;s rhythm and the app&rsquo;s metronome and sequencers run on separate clocks: there is no MIDI clock sync yet. Set the same
            tempo on both and start them together, or let the RC-505 keep time and record its output into the app as plain loops.
          </p>
        </Section>

        <Section title="Any other interface">
          <p className="text-sm text-slate-300">
            Nothing here is specific to BOSS. Any device that is not the computer&rsquo;s own mic, a headset or a camera is treated as an
            audio interface and preferred. Each jack is a channel: plug in, open Add, Hardware, play, and the meters show which channel is yours.
          </p>
        </Section>
      </div>
    </div>
  );
}
