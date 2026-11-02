/** Colour family a tool's nav tab and index card are drawn in; tools of one kind share one. */
export type DevTone = "index" | "prompt" | "stories" | "notes";

/** One local tool under /dev. */
export interface DevTool {
  href: string;
  label: string;
  desc: string;
  tone: DevTone;
}

/** Literal class strings per tone, so Tailwind sees them. */
export const TONE_CLASSES: Record<DevTone, { tab: string; active: string; card: string; label: string }> = {
  index: {
    tab: "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
    active: "bg-slate-700/60 text-slate-100",
    card: "border-slate-700 hover:border-slate-400/70",
    label: "text-slate-100",
  },
  prompt: {
    tab: "text-violet-300/80 hover:bg-violet-500/10 hover:text-violet-200",
    active: "bg-violet-500/20 text-violet-100",
    card: "border-violet-500/30 hover:border-violet-400/70",
    label: "text-violet-200",
  },
  stories: {
    tab: "text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-200",
    active: "bg-emerald-500/20 text-emerald-100",
    card: "border-emerald-500/30 hover:border-emerald-400/70",
    label: "text-emerald-200",
  },
  notes: {
    tab: "text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200",
    active: "bg-amber-500/20 text-amber-100",
    card: "border-amber-500/30 hover:border-amber-400/70",
    label: "text-amber-200",
  },
};

/** The /dev index; a new tool is one entry here and one page under src/app/dev. */
export const DEV_TOOLS: DevTool[] = [
  { href: "/dev/prompt", label: "Prompt studio", tone: "prompt", desc: "The autoplan prompt as labelled parts: edit them, run it with the local Claude, see the plan it writes." },
  { href: "/dev/examples", label: "Prompt examples", tone: "prompt", desc: "Every example the prompt carries, rendered as the player would see it." },
  { href: "/dev/stories", label: "Component stories", tone: "stories", desc: "Every exercise component in the set-ups the examples use, Storybook-style: controls from its documented props, or edit the JSON." },
  { href: "/dev/notes", label: "Copy notes", tone: "notes", desc: "The notes made on any page with the Notes button, by page in sitemap order: copy, re-pin or clear them." },
];
