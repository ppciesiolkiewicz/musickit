"use client";

import dynamic from "next/dynamic";
import { parseEarSettings } from "@/lib/practice/earGame";
import { parseNoteSettings } from "@/lib/practice/noteGame";
import type { Embed } from "../model/embed";

// Each tool is a whole page's worth of code (and sound): loaded only when an exercise opens it.
const loading = () => <p className="p-4 text-sm text-slate-500">Loading…</p>;
const PentatonicPage = dynamic(() => import("@/components/chordKit/PentatonicPage"), { ssr: false, loading });
const ScalePage = dynamic(() => import("@/components/chordKit/ScalePage"), { ssr: false, loading });
const NoteGame = dynamic(() => import("@/components/practice/NoteGame"), { ssr: false, loading });
const EarGame = dynamic(() => import("@/components/practice/EarGame"), { ssr: false, loading });
const Jam = dynamic(() => import("@/features/instruments").then((m) => m.Jam), { ssr: false, loading });

/** The attunr tool for an exercise, on the plan page. Pages that sync the address bar are told not to. */
export default function ExerciseEmbed({ embed }: { embed: Embed }) {
  switch (embed.kind) {
    case "pentatonic":
      return <PentatonicPage slug={embed.slug} initialKey={embed.pc} syncUrl={false} />;
    case "scale":
      return <ScalePage familyIndex={embed.familyIndex} modeIndex={embed.modeIndex} initialKey={embed.pc} syncUrl={false} />;
    case "notes":
      return <NoteGame initial={parseNoteSettings(new URLSearchParams(embed.query))} syncUrl={false} />;
    case "ears":
      return <EarGame initial={parseEarSettings(new URLSearchParams(embed.query))} syncUrl={false} />;
    case "metronome":
      return <Jam />;
  }
}
