import type { ParseResult } from "./config";

/** A message the player pastes back to their AI: the app checked the plan, these are the problems, send the whole plan again fixed. Empty when there is nothing to fix. */
export function fixRequest(warnings: string[]): string {
  if (!warnings.length) return "";
  return [
    "I pasted your 7-day plan into the app. It checked the plan and changed or dropped some things:",
    "",
    ...warnings.map((w) => `- ${w}`),
    "",
    "Please fix these and send the whole corrected plan again as one JSON code block, with nothing else changed and no other text.",
  ].join("\n");
}

/** What a browser AI reads back after sending a plan through `submit_practice_plan`: refused and why, or taken, with what to fix and send again. */
export function agentReply(result: ParseResult): string {
  if (!result.ok) return `The page could not read this as a plan: ${result.error} Send the whole plan again as one JSON object.`;
  const taken = `Plan "${result.config.title}" (${result.config.days.length} days) is in the page's reply box.`;
  if (!result.warnings.length) return `${taken} Nothing to fix. Tell the student to press "Build my plan".`;
  return [
    `${taken} The page changed or dropped some things:`,
    ...result.warnings.map((w) => `- ${w}`),
    "Fix these and send the whole plan again with submit_practice_plan, or, if they don't matter, tell the student to press \"Build my plan\".",
  ].join("\n");
}

/** What a browser AI reads back from `check_practice_plan`: what `submit_practice_plan` would say, with nothing put on the page. */
export function checkPlanReply(result: ParseResult): string {
  const checked = "Checked; nothing on the page changed.";
  if (!result.ok) return `${checked} The page could not read this as a plan: ${result.error} Fix it and check again.`;
  const read = `The page reads plan "${result.config.title}" (${result.config.days.length} days).`;
  if (!result.warnings.length) return `${checked} ${read} Nothing to fix. Send it with submit_practice_plan.`;
  return [`${checked} ${read} It would change or drop:`, ...result.warnings.map((w) => `- ${w}`), "Fix these and check the whole plan again."].join("\n");
}
