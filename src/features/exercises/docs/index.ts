import type { ComponentDoc } from "./extract";
import generated from "./docs.generated.json";

export type { ComponentDoc, PropDoc } from "./extract";

export const COMPONENT_DOCS: ComponentDoc[] = generated as ComponentDoc[];

export function docOf(name: string): ComponentDoc | undefined {
  return COMPONENT_DOCS.find((d) => d.name === name);
}

/** `name: first sentence (prop: type, ...)` */
export function shortDoc(d: ComponentDoc): string {
  const first = d.description.split(/(?<=\.)\s/)[0].replace(/\s+/g, " ");
  return `${d.name}: ${first} (${d.props.map((p) => `${p.name}: ${p.type}`).join(", ")})`;
}
