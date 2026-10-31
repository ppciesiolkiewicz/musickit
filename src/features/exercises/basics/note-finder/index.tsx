"use client";

import dynamic from "next/dynamic";
import { parseNoteSettings } from "@/lib/practice/noteGame";

const NoteGame = dynamic(() => import("@/components/practice/NoteGame"), { ssr: false, loading: () => <p className="p-3 text-sm text-slate-500">Loading…</p> });

/** The note game, set up by its settings query string (as stored in a plan). */
export function View({ query }: { query: string }) {
  return <NoteGame initial={parseNoteSettings(new URLSearchParams(query))} syncUrl={false} bare />;
}
