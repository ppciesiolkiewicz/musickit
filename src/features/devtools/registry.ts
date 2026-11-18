/** Colour family a tool's nav tab and index card are drawn in; tools of one kind share one. */
export type DevTone = "index" | "prompt" | "stories" | "data" | "pitch";

/** One local tool under /dev. */
export interface DevTool {
  href: string;
  label: string;
  desc: string;
}

/** Tools of one kind: a heading on the index, a cluster of tabs, one colour. */
export interface DevGroup {
  title: string;
  tone: DevTone;
  tools: DevTool[];
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

/** The /dev index, by kind; a new tool is one entry in its group here and one page under src/app/dev. */
export const DEV_GROUPS: DevGroup[] = [
  {
    title: "AI plan",
    tone: "prompt",
    tools: [
      { href: "/dev/prompt", label: "Prompt studio", desc: "The autoplan prompt as labelled parts: edit them, run it with the local Claude, see the plan it writes." },
      { href: "/dev/questionnaire", label: "Questionnaire", desc: "Answer the first questionnaire and see what each answer does: topic rungs, area levels, the concepts the prompt offers and the starting outcome." },
      { href: "/dev/costs", label: "AI costs", desc: "What autoplans cost us: a year on each plan, one paying player's year on each AI model, and cheaper models on OpenRouter." },
    ],
  },
  {
    title: "Content",
    tone: "stories",
    tools: [
      { href: "/dev/library", label: "Library", desc: "The plans and blocks agents read: coverage by step, each one drawn as the player sees it, with the versions it was written to." },
      { href: "/dev/path", label: "Learning path", desc: "The path as a diagram: an area's topics down, levels across, every concept with an arrow to what builds on it, and which have no example or course page." },
      { href: "/dev/stories", label: "Component stories", desc: "Every exercise component in the set-ups the examples use, Storybook-style: controls from its documented props, or edit the JSON." },
      { href: "/dev/onboarding", label: "Onboarding coverage", desc: "Which pages and exercise tools have level tags, a tour and hints, with the gaps marked. Preview a level." },
      { href: "/dev/notes", label: "Copy notes", desc: "The notes made on any page with the Notes button, by page in sitemap order: copy, re-pin or clear them." },
    ],
  },
  {
    title: "Player data",
    tone: "data",
    tools: [
      { href: "/dev/data", label: "Data", desc: "Answers, plans, ratings and the AI's summaries in this browser." },
      { href: "/dev/progress", label: "Progress", desc: "The player's progress outcome: its inputs, then per concept, topic and area, the streak days and time, as of any date." },
    ],
  },
  {
    title: "Code",
    tone: "index",
    tools: [
      { href: "/dev/structure", label: "Code structure", desc: "How src is built: packages by layer and what imports what, a page's render tree, and any file's imports, renders and extends." },
      { href: "/dev/api", label: "API routes", desc: "Every route under /api: its methods, the doc comment above each, whether it needs a login, and its file." },
    ],
  },
  {
    title: "Pitch",
    tone: "pitch",
    tools: [
      { href: "/dev/kickstarter", label: "Kickstarter", desc: "Students: the offer to a person who practises on their own (the daily plan, the change, the exercises, the early price). Teachers: the brief for a founding-partner email, to copy into an AI chat with the school's thread." },
    ],
  },
];
