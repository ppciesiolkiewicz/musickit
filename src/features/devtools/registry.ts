/** Colour family a tool's nav tab and index card are drawn in; tools of one kind share one. */
export type DevTone = "index" | "prompt" | "stories" | "data" | "pitch";

/** One tool under /admin/dev or /admin/content. */
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

/**
 * The tools for writing and recording lessons, on /admin/content behind the content permission: the index and the tabs
 * there. A new one is an entry here and one page under src/app/admin/content. The block page (/admin/content/block) is
 * opened from Library and Learning path, so it is not listed.
 */
export const CONTENT_TOOLS: DevTool[] = [
  { href: "/admin/content/library", label: "Library", desc: "The plans and blocks agents read: coverage by step, each one drawn as the player sees it, with the versions it was written to." },
  { href: "/admin/content/path", label: "Learning path", desc: "The path the plan maker reads: each skill's steps across the levels, the steps in the order they need each other, the keys each level adds, with a student laid over it." },
  { href: "/admin/content/videos", label: "Tools videos", desc: "The recording plan: which videos to record, in what order, and what goes in each. Every tool and level with the video players see, or Missing, and how many seed exercises use it. Record a missing one, change which levels a video covers, edit or delete it." },
  { href: "/admin/content/stories", label: "Component stories", desc: "Every exercise component in the set-ups the examples use, Storybook-style: controls from its documented props, or edit the JSON." },
  { href: "/admin/content/onboarding", label: "Onboarding coverage", desc: "Which pages and exercise tools have level tags, a tour and hints, with the gaps marked. Preview a level." },
  { href: "/admin/content/riff", label: "Riff maker", desc: "Write a riff note by note in a key and scale: click the neck or type degrees, see the tab, switch strings, copy JSON or tab. Record a video take of the riff for players." },
  { href: "/admin/content/studio", label: "Video studio", desc: "A 16:9 frame with cameras, a screen share and theory widgets, to record a lesson. Add more than one camera, a phone over Continuity Camera too." },
  { href: "/admin/content/notes", label: "Copy notes", desc: "The notes made on any page with the Notes button, by page in sitemap order: copy, re-pin or clear them." },
];

/** The /admin/dev index, by kind; a new tool is one entry in its group here and one page under src/app/admin/dev. */
export const DEV_GROUPS: DevGroup[] = [
  {
    title: "AI plan",
    tone: "prompt",
    tools: [
      { href: "/admin/dev/prompt", label: "Prompt studio", desc: "The autoplan prompt as labelled parts: edit them, run it with the local Claude, see the plan it writes." },
      { href: "/admin/dev/compose", label: "Plan algorithm", desc: "How a day's plan is built, stage by stage, for a made-up player over the seed blocks: the steps of the day, the library, every pick with its reason, the keys. And its architecture: callers, inputs, the calls inside." },
      { href: "/admin/dev/questionnaire", label: "Questionnaire", desc: "Answer the first questionnaire and see what each answer does: topic rungs, area levels, the concepts the prompt offers and the starting outcome." },
      { href: "/admin/dev/costs", label: "AI costs", desc: "What autoplans cost us: a year on each plan, one paying player's year on each AI model, and cheaper models on OpenRouter." },
    ],
  },
  {
    title: "Sound",
    tone: "stories",
    tools: [
      { href: "/admin/dev/sampler", label: "Sampler", desc: "A sample library in this browser: generate sounds with ElevenLabs from a description, upload or drop audio, play, rename, find the note, delete." },
    ],
  },
  {
    title: "Player data",
    tone: "data",
    tools: [
      { href: "/admin/dev/data", label: "Data", desc: "Answers, plans, ratings and the AI's summaries in this browser." },
      { href: "/admin/dev/progress", label: "Progress", desc: "The player's progress outcome: its inputs, then per concept, topic and area, the streak days and time, as of any date." },
    ],
  },
  {
    title: "Code",
    tone: "index",
    tools: [
      { href: "/admin/dev/structure", label: "Code structure", desc: "How src is built: packages by layer and what imports what, a page's render tree, and any file's imports, renders and extends." },
      { href: "/admin/dev/api", label: "API routes", desc: "Every route under /api: its methods, the doc comment above each, whether it needs a login, and its file." },
    ],
  },
  {
    title: "Pitch",
    tone: "pitch",
    tools: [
      { href: "/admin/dev/kickstarter", label: "Kickstarter", desc: "Students: the offer to a person who practises on their own (the daily plan, the change, the exercises, the early price). Teachers: the brief for a founding-partner email, to copy into an AI chat with the school's thread." },
      { href: "/admin/dev/search", label: "Search research", desc: "Who ranks on Google for what guitarists, singers and teachers search, how hard each looks, the site traffic checked, and what to check next (NEW21)." },
    ],
  },
];

const tabTitle = (tools: DevTool[], area: string, page: string, detail?: string): string =>
  [detail, tools.find((t) => t.href === page)?.label ?? page, area].filter(Boolean).join(" · ");

/**
 * A /admin/dev page's tab title, most specific first so tabs can be told apart when cut short: "<detail> · <tool> · Dev".
 * `page` is a tool's href (its label is used) or a name for a page not on the index.
 */
export const devTitle = (page: string, detail?: string): string => tabTitle([...DEV_GROUPS.flatMap((g) => g.tools), ...CONTENT_TOOLS], "Dev", page, detail);

/** An /admin/content page's tab title, the same way: "<detail> · <tool> · Content". */
export const contentTitle = (page: string, detail?: string): string => tabTitle(CONTENT_TOOLS, "Content", page, detail);
