/** Colour family a tool's nav tab and index card are drawn in; tools of one kind share one. */
export type DevTone = "index" | "prompt" | "stories" | "notes" | "data" | "pitch";

/** One local tool under /dev. */
export interface DevTool {
  href: string;
  label: string;
  desc: string;
  tone: DevTone;
  /** also on the live site, for anyone logged in (its page sits under src/app/dev/(live)); linked from nowhere there */
  live?: true;
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
  data: {
    tab: "text-sky-300/80 hover:bg-sky-500/10 hover:text-sky-200",
    active: "bg-sky-500/20 text-sky-100",
    card: "border-sky-500/30 hover:border-sky-400/70",
    label: "text-sky-200",
  },
  pitch: {
    tab: "text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200",
    active: "bg-rose-500/20 text-rose-100",
    card: "border-rose-500/30 hover:border-rose-400/70",
    label: "text-rose-200",
  },
};

/** The /dev index; a new tool is one entry here and one page under src/app/dev/(local), or (live) with `live: true`. */
export const DEV_TOOLS: DevTool[] = [
  { href: "/dev/prompt", label: "Prompt studio", tone: "prompt", desc: "The autoplan prompt as labelled parts: edit them, run it with the local Claude, see the plan it writes." },
  { href: "/dev/compare-models", label: "Compare AI models for autoplan", tone: "prompt", live: true, desc: "A plan for each made-up player from Claude and local Ollama models, priced as if through the API. Written with npm run compare-models." },
  { href: "/dev/examples", label: "Prompt examples", tone: "prompt", live: true, desc: "Every example the prompt carries, rendered as the player would see it." },
  { href: "/dev/stories", label: "Component stories", tone: "stories", live: true, desc: "Every exercise component in the set-ups the examples use, Storybook-style: controls from its documented props, or edit the JSON." },
  { href: "/dev/onboarding", label: "Onboarding coverage", tone: "stories", desc: "Which pages and exercise tools have level tags, a tour and hints, with the gaps marked. Preview a level." },
  { href: "/dev/structure", label: "Code structure", tone: "index", desc: "How src is built: packages by layer and what imports what, a page's render tree, and any file's imports, renders and extends." },
  { href: "/dev/data", label: "Data", tone: "data", live: true, desc: "Answers, plans, ratings and the AI's summaries in this browser." },
  { href: "/dev/notes", label: "Copy notes", tone: "notes", desc: "The notes made on any page with the Notes button, by page in sitemap order: copy, re-pin or clear them." },
  { href: "/dev/kickstarter", label: "Kickstarter", tone: "pitch", desc: "Paste an email thread with a music school; your AI extension drafts the founding-partner reply from the voice, the facts and the demo links. Also what one paying player costs a year on each AI model." },
];

/** The tools this build shows: every one in development, the `live` ones on the live site. */
export const shownTools = (local: boolean): DevTool[] => (local ? DEV_TOOLS : DEV_TOOLS.filter((t) => t.live));
