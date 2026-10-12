"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import DroneControls from "@/components/looper/DroneControls";
import { getAudioContext, getOutputBus } from "@/features/sound";
import { DEFAULT_DRONE, DroneVoice, clampDrone, droneName, type DroneParams } from "@/lib/looper/drone";

const KEY = "musickit.drone";

const load = (): DroneParams => {
  try {
    return clampDrone(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    return DEFAULT_DRONE;
  }
};

/**
 * The Drone as a widget for the theory pages: one held note to practise a scale, a mode or an arpeggio against. It plays straight to
 * the speakers; there is no group here. (In the looper the same sound is a stage instrument that plays through its group.)
 * It starts only when a person presses play, because the browser needs that before it makes any sound.
 */
export default function DroneWidget() {
  const [params, setParams] = useState<DroneParams>(DEFAULT_DRONE);
  const [on, setOn] = useState(false);
  const voice = useRef<DroneVoice | null>(null);
  const latest = useRef(params);
  latest.current = params;

  useEffect(() => {
    setParams(load());
    return () => {
      voice.current?.dispose();
      voice.current = null;
    };
  }, []);

  const change = (patch: Partial<DroneParams>) => {
    const next = clampDrone(patch, latest.current);
    setParams(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    voice.current?.update(next);
  };

  const toggle = async () => {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    if (!voice.current) voice.current = new DroneVoice(ctx, getOutputBus());
    if (on) voice.current.stop();
    else voice.current.start(latest.current);
    setOn(!on);
  };

  return (
    <section aria-label="Drone" className="flex max-w-3xl flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => void toggle()} aria-pressed={on} aria-label={on ? "Stop the drone" : "Start the drone"} className={`grid h-12 w-12 place-items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"}`}>
          <Icon name={on ? "square" : "play"} size={20} fill />
        </button>
        <div>
          <p className="text-2xl font-light tabular-nums text-slate-50">{droneName(params)}</p>
          <p className="text-xs text-slate-400">{on ? "Sounding" : "Stopped"}</p>
        </div>
      </div>
      <DroneControls value={params} onChange={change} />
    </section>
  );
}
