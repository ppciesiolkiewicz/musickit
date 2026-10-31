/** One local tool under /dev. */
export interface DevTool {
  href: string;
  label: string;
  desc: string;
}

/** The /dev index; a new tool is one entry here and one page under src/app/dev. */
export const DEV_TOOLS: DevTool[] = [
  { href: "/dev/prompt", label: "Prompt studio", desc: "The autoplan prompt as labelled parts: edit them, run it with the local Claude, see the plan it writes." },
  { href: "/dev/examples", label: "Prompt examples", desc: "Every example the prompt carries, rendered as the player would see it." },
];
