import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import { StudioApp } from "@/features/teachers/studio";

export const metadata: Metadata = { title: devTitle("/dev/studio") };

/** The video studio keeps the whole window for its frame, so it has no DevShell around it. */
export default function StudioPage() {
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <StudioApp />
    </div>
  );
}
