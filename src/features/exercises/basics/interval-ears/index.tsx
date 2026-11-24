"use client";

import dynamic from "next/dynamic";
import { parseEarSettings } from "@/lib/practice/earGame";

const EarGame = dynamic(() => import("@/components/practice/EarGame"), { ssr: false, loading: () => <p className="p-3 text-sm text-slate-500">Loading…</p> });

/** the ear game in an exercise: three stages of five questions, then the exercise is complete */
const STAGES = { count: 3, questions: 5 };

/** The ear game, set up by its settings query string (as stored in a plan), played in stages. */
export function View({ query }: { query: string }) {
  return <EarGame initial={parseEarSettings(new URLSearchParams(query))} syncUrl={false} bare stages={STAGES} />;
}
