import { jsonTokens, prettyJsonSegments, type JsonTokenKind } from "../model/prettyJson";

const TOKEN: Record<JsonTokenKind, string> = {
  key: "text-sky-300",
  string: "text-emerald-300",
  number: "text-amber-300",
  literal: "text-violet-300",
  punct: "text-slate-500",
  space: "",
};

/** Prompt text for reading: its JSON indented and coloured, the rest as it is. Goes inside a <pre>. */
export default function PrettyText({ text }: { text: string }) {
  return prettyJsonSegments(text).map((s, i) =>
    s.json ? jsonTokens(s.text).map((t, j) => <span key={`${i}.${j}`} className={TOKEN[t.kind]}>{t.text}</span>) : s.text,
  );
}
