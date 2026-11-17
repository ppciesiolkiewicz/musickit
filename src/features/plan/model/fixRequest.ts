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
