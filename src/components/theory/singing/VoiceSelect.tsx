"use client";

import { useState } from "react";
import { Button, Modal, Select } from "@/components/ui";
import RangeFinder from "@/features/plan/intake/ui/RangeFinder";
import { VOICES, type Voice } from "@/features/theory/singing";
import { noteName } from "@/features/theory/voiceRange";
import { usePlayerVoice } from "@/features/userData/client/usePlayerVoice";

const span = (r: { low: number; high: number }) => `${noteName(r.low)}–${noteName(r.high)}`;
const TYPES = (Object.keys(VOICES) as Voice[]).map((v) => ({ value: v as Voice | "own", label: `${VOICES[v].label} · ${span(VOICES[v])}` }));

/**
 * The Voice setting of the singing pages: the player's voice (`usePlayerVoice`, kept with their account), as a voice
 * type or as their own range, with Find my range beside it (the range finder, in a dialog). `fallback` is the type
 * shown while no voice is known; nothing is stored until the player picks.
 */
export default function VoiceSelect({ fallback }: { fallback: Voice }) {
  const { voice, range, set } = usePlayerVoice();
  const [finding, setFinding] = useState(false);
  const own = voice?.range && range ? [{ value: "own" as const, label: `Your range · ${span(range)}` }] : [];
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Select size="sm" value={own.length ? "own" : voice?.type ?? fallback} onChange={(v) => { if (v !== "own") set({ type: v }); }} aria-label="Voice" options={[...own, ...TYPES]} />
      <Button size="sm" onClick={() => setFinding(true)}>Find my range</Button>
      {finding && (
        <Modal title="Find my range" narrow onClose={() => setFinding(false)}>
          <RangeFinder current={voice?.range ?? null} onRange={(r) => set({ range: r })} />
        </Modal>
      )}
    </span>
  );
}
