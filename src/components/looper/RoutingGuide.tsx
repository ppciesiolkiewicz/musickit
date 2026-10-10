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

/** Temporary explainer of the looper's routing, from an input device (an interface, or a BOSS RC-505 used as one) to the output. */
export default function RoutingGuide() {
  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Section title="The path">
        <Step title="Input device (e.g. BOSS RC-505)" tone="amber">
          An audio interface, a USB device such as the RC-505, or a mic. Whatever it plays comes into the computer as audio channels.
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
        <Section title="The RC-505 is an input device">
          <p className="text-sm text-slate-300">
            The app treats the RC-505 like any other input: its stereo sound (over USB or from its outputs into your interface) comes in as
            one input. Add it with Add, Input, Hardware and pick <strong>Inputs 1-2</strong>. Everything it plays (its loops, its rhythm, its own
            effects) arrives as that one sound, and the input strip&rsquo;s effects, buses and destinations apply to all of it.
          </p>
        </Section>

        <Section title="Any interface">
          <p className="text-sm text-slate-300">
            Nothing here is specific to BOSS. Any device that is not the computer&rsquo;s own mic, a headset or a camera is treated as an
            audio interface and preferred. Each jack is a channel: plug in, open Add, Hardware, play, and the meters show which channel is yours.
          </p>
        </Section>
      </div>
    </div>
  );
}
